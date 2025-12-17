# run-grasp.ps1  launch GRASP dev (Vite) on port 5173 and open /dev/step (PS 5.1)
$ErrorActionPreference = 'Stop'

Set-Location -Path 'D:\work\motor-git'

function Get-PnpmCmd {
  $cmd = $null
  try { $cmd = Get-Command 'pnpm.cmd' -ErrorAction SilentlyContinue } catch {}
  if ($cmd) { return $cmd.Source }
  try { $cmd = Get-Command 'pnpm' -ErrorAction SilentlyContinue } catch {}
  if ($cmd) { return $cmd.Source }
  $candidate = Join-Path $env:APPDATA 'npm\pnpm.cmd'
  if (Test-Path $candidate) { return $candidate }
  return $null
}

function Stop-Port([int]$Port) {
  try {
    $conns = Get-NetTCPConnection -LocalPort $Port -ErrorAction SilentlyContinue
    if ($conns) {
      $pids = $conns | Select-Object -ExpandProperty OwningProcess -Unique
      foreach ($pid in $pids) {
        try { Stop-Process -Id $pid -Force -ErrorAction SilentlyContinue } catch {}
      }
      Start-Sleep -Milliseconds 300
    }
  } catch {}
}

# 1) Найдём pnpm
$pnpmCmd = Get-PnpmCmd
if (-not $pnpmCmd) {
  Write-Host "pnpm not found. Run: corepack enable; corepack prepare pnpm@9.12.0 --activate" -ForegroundColor Red
  exit 1
}

# 2) Освободим порты 5173 и 4000 (чтобы не мешал legacy/demo)
Stop-Port 5173
Stop-Port 4000

# 3) Запустим Vite строго на 5173
Start-Process -FilePath $pnpmCmd `
  -ArgumentList @('--filter','@motor/web','dev','--','--port','5173') `
  -WorkingDirectory 'D:\work\motor-git' `
  -WindowStyle Normal

# 4) Ждём готовность 5173 (макс 45с)
$deadline = (Get-Date).AddSeconds(45)
$ready = $false
while ((Get-Date) -lt $deadline) {
  try {
    $ok = Test-NetConnection -ComputerName '127.0.0.1' -Port 5173 -WarningAction SilentlyContinue
    if ($ok.TcpTestSucceeded) { $ready = $true; break }
  } catch {}
  Start-Sleep -Milliseconds 500
}

# 5) Откроем ровно GRASP-маршрут (с query для анти-кэша)
$ts = [int][double]::Parse((Get-Date -UFormat %s))
Start-Process ("http://localhost:5173/dev/step?_={0}" -f $ts)

if ($ready) {
  Write-Host "GRASP UI on http://localhost:5173/dev/step" -ForegroundColor Green
} else {
  Write-Host "Server is starting; tab is open  refresh after a couple of seconds." -ForegroundColor Yellow
}