# MV-P01 MicroViewer

A minimal KaTeX viewer with bracket pairing and hover highlighting.

## Prerequisites
- Node.js 18+

## Run Instructions
1. Install dependencies (none required beyond Node).
2. Start the static server:
   ```bash
   node drafts/microviewer/MV-P01/mv_p01_server.mjs
   ```
3. Open the viewer in a browser at [http://localhost:4001](http://localhost:4001).
4. Enter LaTeX in the input, click **Render**, and inspect bracket behaviour.

## Notes
- Uses KaTeX 0.16.11 via jsDelivr CDN.
- Hovering highlights the nearest token, while clicking highlights a matched bracket pair.
