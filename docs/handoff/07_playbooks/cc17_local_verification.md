# CC17 PR Verification Playbook (PowerShell)

This playbook automates the **Codex Challenge 17 (CC17)** acceptance run on
Windows. It discovers the remote PR branch, checks it out locally, restores
workspace dependencies, and executes the targeted and full regression tests
required before merging.

> **Scope:** Windows + PowerShell 5/7 with `pnpm` available via Corepack.
>
> **Goal:** Produce the same green signal as the Codex Cloud validation job.

## Script

```powershell
$ErrorActionPreference = 'Stop'
Set-Location 'D:\work\motor-git'

# 1) Refresh remotes
git fetch origin

# 2) Gather every remote branch
$headsRaw = git ls-remote --heads origin
if (-not $headsRaw) { throw "Не удалось получить список веток с origin." }
$heads = @()
foreach ($line in $headsRaw) {
  $parts = $line -split "`t"
  if ($parts.Count -ge 2) {
    $name = $parts[1] -replace '^refs/heads/', ''
    $heads += $name
  }
}

# 3) Try to auto-detect the CC17 branch (flag/alias/cc17 patterns)
$guesses = $heads | Where-Object {
  ($_ -match 'flag' -and $_ -match 'alias') -or ($_ -match '^cc17') -or ($_ -match '/cc17')
}

$remoteBranch = $null
if ($guesses.Count -eq 1) {
  $remoteBranch = $guesses[0]
  Write-Host "Автовыбор ветки PR: $remoteBranch" -ForegroundColor Cyan
} elseif ($guesses.Count -gt 1) {
  Write-Host "Найдено несколько кандидатов:" -ForegroundColor Yellow
  $i = 0
  foreach ($g in $guesses) { Write-Host ("[{0}] {1}" -f $i, $g); $i++ }
  $idx = Read-Host "Введите номер нужной ветки"
  if ($idx -as [int] -and $idx -ge 0 -and $idx -lt $guesses.Count) {
    $remoteBranch = $guesses[$idx]
  }
}

# 4) Fallback: ask for the exact branch name from the PR
if (-not $remoteBranch) {
  Write-Host "`nНе нашёл однозначную ветку CC17." -ForegroundColor Yellow
  Write-Host "Открой PR CC17 в GitHub и скопируй имя его ветки (пример: codex/add-e2e-tests-for-cli-flag-aliases)." -ForegroundColor Yellow
  $remoteBranch = Read-Host "Вставь точное имя ветки PR"
  if (-not $remoteBranch) { throw "Ветка PR не указана." }
}
if (-not ($heads -contains $remoteBranch)) {
  throw "На origin нет ветки '$remoteBranch'. Проверь имя в PR."
}

# 5) Check out the PR locally and install dependencies
git checkout -B cc17-local ("origin/" + $remoteBranch)
pnpm install

# 6) Focused run for the new test only
$testPath = 'packages/tests/src/cli.flags.aliases.test.ts'
if (-not (Test-Path $testPath)) {
  Write-Host "Ветка '$remoteBranch' не содержит $testPath. Запущу полный тест-ран для явной диагностики." -ForegroundColor Yellow
  pnpm -w test
} else {
  pnpm --filter @motor/tests test -- src/cli.flags.aliases.test.ts
  # 7) Full repo sanity checks
  node scripts/repo-guard.mjs
  node scripts/verify-no-web.mjs; $v=$LASTEXITCODE; Write-Host "verify-no-web exit code: $v"
  pnpm -w test
}

Write-Host "`nCC17 локально проверен — если всё зелёное, можно мерджить." -ForegroundColor Green
```

## Usage Notes

- Adjust `Set-Location` to your local clone path.
- The heuristic in step 3 biases toward branches that mention `flag`, `alias`,
  or `cc17`. If the guess is wrong, paste the branch name manually.
- The script prefers a **targeted test run** before the full regression to
  highlight failures in the new `cli.flags.aliases` suite quickly.
- `node scripts/verify-no-web.mjs` exits with `1` if any web-only code sneaks
  into shared packages. The exit code is echoed for visibility.
- Merge only after every command returns successfully.
