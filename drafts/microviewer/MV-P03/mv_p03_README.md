# MV-P03 — Promotion Helper for Micro Viewer

This drop provides a PowerShell helper script plus canonical reference files for the Micro Viewer package.

## Promote the MV-P01 pass into `packages/micro-viewer`

Run the script from the repository root:

```powershell
pwsh drafts/microviewer/MV-P03/mv_p03_promote_mv_p01.ps1
```

The script will:

1. Validate that the MV-P01 public assets exist under `drafts/microviewer/MV-P01/public/`.
2. Create the canonical target directories under `packages/micro-viewer/` when necessary.
3. Copy and rename the pass-tagged assets into their canonical filenames.
4. Emit a summary table showing the source and destination of each promoted asset.
5. Print the full canonical files and a tree of `packages/micro-viewer/` for quick inspection.

Failures are reported with a non-zero exit code so the script is safe to integrate into CI. The script may be rerun; it will simply overwrite the canonical files with the MV-P01 assets.

## Canonical Reference Files

The `canonical/` folder contains a snapshot of the expected canonical files produced by the MV-P01 pass. These serve as reference templates when verifying promotions or when rebuilding the package from scratch.

```
canonical/
  mv_p03_server.mjs
  public/
    mv_p03_index.html
    mv_p03_style.css
    mv_p03_app.js
```

Each file is annotated with comments so you can see the responsibilities of the server, HTML shell, stylesheet, and client script at a glance.
