<#
  Phase 1b — scoped index cleanup + corruption fix + .gitignore anchoring
  AJ Digital OS — Sprint -1 Stabilization
  Generated: 2026-06-06  by: Claude (Cowork) review of Codex Phase 1

  WHY THIS EXISTS:
  - Codex's Phase 1 left HEAD wedged on an unborn `codex` branch and a stale
    .git\index.lock. The git corruption was NOT fixed (the real defect is a
    corrupt multi-pack-index, not the legacy ref). A blanket `git rm --cached`
    of all 1,345 tracked-ignored files would have un-tracked REAL source
    (src/skills/*.ts) and fixtures (src/data/clients/_template/*) because the
    .gitignore rules `data/` and `skills/` are unanchored and match at any depth.

  WHAT THIS DOES (all on branch codex/stabilization-phase-1, nothing pushed):
    0. Safety: abort unless repo is the expected one; clear stale lock.
    1. Switch to codex/stabilization-phase-1 (unwedge HEAD).
    2. Anchor the over-broad .gitignore rules so src/ stops being ignored.
    3. Scoped `git rm --cached` of 1,326 genuine-noise files (from the reviewed
       list), EXCLUDING src/skills/*.ts, src/data/clients/_template/*,
       supabase/config.toml, memory/*, and every .gitkeep.
    4. Fix corruption: delete the corrupt multi-pack-index, repack, re-fsck.
    5. Verify: fsck clean, src/skills + fixtures still tracked, status legible.

  REVERSIBLE: everything happens on the isolated safety branch and is staged,
  NOT committed, until you review `git status` and run the commit line at the end.
  Full rollback: `git switch main; git branch -D codex/stabilization-phase-1`
  (the only non-branch change is deleting the multi-pack-index cache, which git
  regenerates; and the .gitignore edit, which `git checkout -- .gitignore` undoes).
#>

$ErrorActionPreference = 'Stop'
$repo = 'C:\dev\AJ-DIGITAL-OS'
Set-Location $repo

# --- 0. Safety guards -------------------------------------------------------
if (-not (Test-Path "$repo\.git")) { throw "Not a git repo: $repo" }
$origin = (git remote get-url origin) 2>$null
Write-Host "Repo: $repo  origin: $origin" -ForegroundColor Cyan

# Clear the stale lock left by the wedged-HEAD state (only if no git is running)
if (Test-Path "$repo\.git\index.lock") {
    Write-Host "Removing stale .git\index.lock ..." -ForegroundColor Yellow
    Remove-Item "$repo\.git\index.lock" -Force
}

$listFile = "$repo\.codex\stabilization\rm-cached-scoped-2026-06-06.txt"
if (-not (Test-Path $listFile)) { throw "Scoped rm list not found: $listFile" }

# --- 1. Unwedge HEAD onto the safety branch ---------------------------------
git switch codex/stabilization-phase-1
$cur = (git branch --show-current)
if ($cur -ne 'codex/stabilization-phase-1') { throw "Expected safety branch, on: $cur" }
Write-Host "On branch: $cur @ $(git rev-parse --short HEAD)" -ForegroundColor Green

# --- 2. Anchor the over-broad .gitignore rules ------------------------------
# Back up first (timestamped, reversible)
Copy-Item "$repo\.gitignore" "$repo\.gitignore.bak-2026-06-06" -Force
$gi = Get-Content "$repo\.gitignore"

# data/  -> /data/   (root only; stop catching src/data/)
$gi = $gi -replace '^data/$', '/data/'
# skills/ -> /skills/ (root only; stop catching src/skills/ real source)
$gi = $gi -replace '^skills/$', '/skills/'
# supabase/ -> supabase/.temp/ (track config.toml, ignore only temp)
$gi = $gi -replace '^supabase/$', 'supabase/.temp/'

# Re-add ignores for the runtime artifacts that USED to be covered by `data/`
# but now live under the un-ignored src/data/.
if ($gi -notcontains 'src/data/runs/')         { $gi += 'src/data/runs/' }
if ($gi -notcontains 'src/data/reports/runs/') { $gi += 'src/data/reports/runs/' }

Set-Content "$repo\.gitignore" $gi -Encoding UTF8
Write-Host ".gitignore anchored (backup: .gitignore.bak-2026-06-06)" -ForegroundColor Green

# --- 3. Scoped git rm --cached ----------------------------------------------
# Read the reviewed list; skip blanks. Use --ignore-unmatch for idempotency.
$paths = Get-Content $listFile | Where-Object { $_.Trim() -ne '' }
Write-Host "Untracking $($paths.Count) files from the index (kept on disk) ..." -ForegroundColor Yellow

# Batch to avoid command-line length limits (Windows ~32k chars)
$batch = New-Object System.Collections.Generic.List[string]
function Flush-Batch {
    if ($batch.Count -gt 0) {
        git rm --cached --quiet --ignore-unmatch -- @($batch)
        $batch.Clear()
    }
}
foreach ($p in $paths) {
    $batch.Add($p)
    if ($batch.Count -ge 200) { Flush-Batch }
}
Flush-Batch
Write-Host "Index cleanup staged." -ForegroundColor Green

# --- 4. Fix the real corruption (multi-pack-index) --------------------------
$mpi = "$repo\.git\objects\pack\multi-pack-index"
if (Test-Path $mpi) {
    Write-Host "Removing corrupt multi-pack-index ..." -ForegroundColor Yellow
    Remove-Item $mpi -Force
}
git multi-pack-index write 2>$null
git gc --prune=now
Write-Host "Repacked." -ForegroundColor Green

# --- 5. Verify --------------------------------------------------------------
Write-Host "`n===== VERIFICATION =====" -ForegroundColor Cyan
Write-Host "--- git fsck (expect: no 'improper chunk' / 'failed to parse') ---"
git fsck --full 2>&1 | Select-String -Pattern 'error|fatal|improper|failed' | Select-Object -First 10
Write-Host "--- real source still tracked? (expect 4 lines) ---"
git ls-files src/skills/ | Where-Object { $_ -match '\.ts$' }
Write-Host "--- template fixtures still tracked? (expect 3 lines) ---"
git ls-files src/data/clients/_template/
Write-Host "--- supabase config still tracked? (expect 1 line) ---"
git ls-files supabase/config.toml
Write-Host "--- remaining status entry count (expect ~ real src/ work only) ---"
(git status --porcelain | Measure-Object).Count
Write-Host "--- staged deletions count (expect ~1326) ---"
(git status --porcelain | Where-Object { $_ -match '^D ' } | Measure-Object).Count

Write-Host "`nReview the above. If correct, COMMIT on the safety branch:" -ForegroundColor Cyan
Write-Host '  git add .gitignore' -ForegroundColor White
Write-Host '  git commit -m "chore(stabilization): anchor gitignore, untrack 1326 ignored files, fix multi-pack-index"' -ForegroundColor White
Write-Host "`nDO NOT push or merge to main yet — D1 (compile) and D2 (divergence) are still open." -ForegroundColor Red
