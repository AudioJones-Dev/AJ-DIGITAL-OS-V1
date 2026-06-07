// GitHub Action: parse Task:/Task-Status: trailers from pushed commits and
// patch the matching Notion task page. Node 20+ (global fetch). No dependencies.
import fs from 'node:fs';
import { execFileSync } from 'node:child_process';

const TOKEN = process.env.NOTION_TOKEN;
if (!TOKEN) { console.log('NOTION_TOKEN not set — skipping Notion sync.'); process.exit(0); }

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
  return task && status ? { task: task.trim(), status: status.trim() } : null;
}

async function patch(id, status) {
  const properties = { Status: { select: { name: status } } };
  if (status === 'Done') properties['Next?'] = { checkbox: false };
  const r = await fetch('https://api.notion.com/v1/pages/' + id.replace(/-/g, ''), {
    method: 'PATCH',
    headers: { Authorization: 'Bearer ' + TOKEN, 'Notion-Version': '2022-06-28', 'Content-Type': 'application/json' },
    body: JSON.stringify({ properties }),
  });
  return r.ok ? { ok: true } : { ok: false, status: r.status, body: await r.text() };
}

const commits = pushedCommits();
let n = 0;
for (const c of commits) {
  const tr = parseTrailers(c.msg);
  if (!tr) continue;
  const m = matchTitle(tr.task);
  if (!m) { console.log(`· no roadmap match for "${tr.task}" (${c.sha.slice(0, 7)})`); continue; }
  const res = await patch(m.id, tr.status);
  console.log(`${res.ok ? '✓' : '✗'} ${m.title} -> ${tr.status} (${c.sha.slice(0, 7)})${res.ok ? '' : ' ' + JSON.stringify(res)}`);
  n++;
}
console.log(`Notion task sync: ${n} task event(s) from ${commits.length} commit(s).`);
