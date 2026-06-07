// GitHub Action: parse Task:/Task-Status:/Task-Note: trailers from pushed commits
// and update the matching Notion task page (status) and/or append a comment to its
// activity log. Node 20+ (global fetch). No dependencies.
import fs from 'node:fs';
import { execFileSync } from 'node:child_process';

const TOKEN = process.env.NOTION_TOKEN;
if (!TOKEN) { console.log('NOTION_TOKEN not set — skipping Notion sync.'); process.exit(0); }
const V = '2022-06-28';
const H = { Authorization: 'Bearer ' + TOKEN, 'Notion-Version': V, 'Content-Type': 'application/json' };

const map = JSON.parse(fs.readFileSync(new URL('./notion-task-map.json', import.meta.url), 'utf8'));
const norm = (s) => (s || '').toLowerCase().replace(/[^a-z0-9]+/g, ' ').trim();
const entries = Object.entries(map).map(([title, id]) => ({ title, id, n: norm(title) }));

function matchTitle(name) {
  const n = norm(name); let best = null, score = 0;
  for (const e of entries) {
    let s = 0;
    if (e.n === n) s = 100;
    else if (e.n.includes(n) || n.includes(e.n)) s = 60;
    else { const a = new Set(n.split(' ')), b = new Set(e.n.split(' ')); s = [...a].filter((w) => b.has(w)).length / Math.max(a.size, 1) * 40; }
    if (s > score) { score = s; best = e; }
  }
  return score >= 30 ? best : null;
}

function pushedCommits() {
  const before = process.env.BEFORE_SHA || '';
  const after = process.env.AFTER_SHA || 'HEAD';
  const isZero = /^0+$/.test(before);
  try {
    const args = (before && !isZero)
      ? ['log', '--no-merges', '--format=%H%x1f%B%x1e', `${before}..${after}`]
      : ['log', '--no-merges', '--format=%H%x1f%B%x1e', '-1', after];
    const out = execFileSync('git', args, { encoding: 'utf8' });
    return out.split('\x1e').map((s) => s.trim()).filter(Boolean).map((block) => {
      const i = block.indexOf('\x1f');
      return { sha: block.slice(0, i).trim(), msg: block.slice(i + 1) };
    });
  } catch { return []; }
}

function parseTrailers(msg) {
  const task = (msg.match(/^[ \t]*Task:[ \t]*(.+)$/im) || [])[1];
  const status = (msg.match(/^[ \t]*Task-Status:[ \t]*(.+)$/im) || [])[1];
  const note = (msg.match(/^[ \t]*Task-Note:[ \t]*(.+)$/im) || [])[1];
  if (!task || (!status && !note)) return null;
  return { task: task.trim(), status: status && status.trim(), note: note && note.trim() };
}

async function patchStatus(id, status) {
  const properties = { Status: { select: { name: status } } };
  if (status === 'Done') properties['Next?'] = { checkbox: false };
  const r = await fetch('https://api.notion.com/v1/pages/' + id.replace(/-/g, ''), { method: 'PATCH', headers: H, body: JSON.stringify({ properties }) });
  return r.ok ? { ok: true } : { ok: false, status: r.status };
}

async function appendLog(id, text) {
  const r = await fetch('https://api.notion.com/v1/blocks/' + id.replace(/-/g, '') + '/children', {
    method: 'PATCH', headers: H,
    body: JSON.stringify({ children: [{ object: 'block', type: 'bulleted_list_item', bulleted_list_item: { rich_text: [{ type: 'text', text: { content: String(text).slice(0, 1900) } }] } }] }),
  });
  return r.ok ? { ok: true } : { ok: false, status: r.status };
}

const commits = pushedCommits();
let n = 0;
for (const c of commits) {
  const tr = parseTrailers(c.msg);
  if (!tr) continue;
  const m = matchTitle(tr.task);
  if (!m) { console.log(`· no roadmap match for "${tr.task}" (${c.sha.slice(0, 7)})`); continue; }
  if (tr.status) { const r = await patchStatus(m.id, tr.status); console.log(`${r.ok ? '✓' : '✗'} status ${m.title} -> ${tr.status} (${c.sha.slice(0, 7)})`); }
  if (tr.note) { const r = await appendLog(m.id, `${c.sha.slice(0, 7)} · ${tr.status || 'note'}: ${tr.note}`); console.log(`${r.ok ? '✓' : '✗'} note  ${m.title} (${c.sha.slice(0, 7)})`); }
  n++;
}
console.log(`Notion task sync: ${n} task event(s) from ${commits.length} commit(s).`);
