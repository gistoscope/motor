#!/usr/bin/env pwsh
<#!
.SYNOPSIS
    Promote MV-P01 public assets into the canonical micro-viewer package paths.
.DESCRIPTION
    Copies the latest MV-P01 pass-tagged files into `packages/micro-viewer/`.
    The script is idempotent and prints a summary table, the canonical file
    contents, and the resulting directory tree.
!>

[CmdletBinding()]
param()

Set-StrictMode -Version Latest
$ErrorActionPreference = 'Stop'

function Write-Section {
    param(
        [Parameter(Mandatory)]
        [string] $Title
    )

    Write-Host "\n=== $Title ===" -ForegroundColor Cyan
}

function Show-Tree {
    param(
        [Parameter(Mandatory)]
        [string] $Path,
        [string] $Prefix = ''
    )

    $items = Get-ChildItem -LiteralPath $Path -Force | Sort-Object {
        if ($_.PSIsContainer) { 0 } else { 1 }
    }, Name

    for ($index = 0; $index -lt $items.Count; $index++) {
        $item = $items[$index]
        $isLast = $index -eq ($items.Count - 1)
        $connector = if ($isLast) { '└── ' } else { '├── ' }
        Write-Host "$Prefix$connector$($item.Name)"
        if ($item.PSIsContainer) {
            $childPrefix = $Prefix + (if ($isLast) { '    ' } else { '│   ' })
            Show-Tree -Path $item.FullName -Prefix $childPrefix
        }
    }
}

try {
    $repoRoot = (Resolve-Path (Join-Path $PSScriptRoot '../..')).Path
    $sourceDir = Join-Path $repoRoot 'drafts/microviewer/MV-P01/public'
    $targetDir = Join-Path $repoRoot 'packages/micro-viewer'
    $targetPublicDir = Join-Path $targetDir 'public'

    if (-not (Test-Path -LiteralPath $sourceDir)) {
        throw "Source directory not found: $sourceDir"
    }

    New-Item -ItemType Directory -Force -Path $targetDir | Out-Null
    New-Item -ItemType Directory -Force -Path $targetPublicDir | Out-Null

    $fileMap = [ordered]@{
        'mv_p01_server.mjs' = Join-Path $targetDir 'server.mjs'
        'mv_p01_index.html' = Join-Path $targetPublicDir 'index.html'
        'mv_p01_style.css'  = Join-Path $targetPublicDir 'style.css'
        'mv_p01_app.js'     = Join-Path $targetPublicDir 'app.js'
    }

    $operations = @()

    foreach ($entry in $fileMap.GetEnumerator()) {
        $sourcePath = Join-Path $sourceDir $entry.Key
        $destinationPath = $entry.Value

        if (-not (Test-Path -LiteralPath $sourcePath)) {
            throw "Missing source file: $sourcePath"
        }

        $status = if (Test-Path -LiteralPath $destinationPath) { 'Overwritten' } else { 'Created' }
        Copy-Item -LiteralPath $sourcePath -Destination $destinationPath -Force

        $operations += [PSCustomObject]@{
            Source      = $sourcePath.Replace($repoRoot, '.').Replace('\', '/')
            Destination = $destinationPath.Replace($repoRoot, '.').Replace('\', '/')
            Status      = $status
        }
    }

    Write-Section 'Promotion Summary'
    $operations | Format-Table -AutoSize | Out-String | Write-Host

    Write-Section 'Canonical File Contents'
    foreach ($entry in $fileMap.GetEnumerator()) {
        $destinationPath = $entry.Value
        Write-Host "--- $(Resolve-Path $destinationPath) ---" -ForegroundColor Yellow
        Get-Content -LiteralPath $destinationPath
        Write-Host
    }

    Write-Section 'packages/micro-viewer Tree'
    $rootItem = Get-Item -LiteralPath $targetDir
    Write-Host $rootItem.FullName
    Show-Tree -Path $targetDir

    exit 0
}
catch {
    Write-Error $_
    exit 1
}
