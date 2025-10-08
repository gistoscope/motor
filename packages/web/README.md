# Web Sandbox Highlights

This workspace hosts the experimental math highlight layer demo that lives behind the `VITE_EXPERIMENTAL_M0` flag.

## Quick start

```bash
pnpm install
pnpm --filter web dev -- --host 0.0.0.0 --port 4173
```

Then visit [`http://localhost:4173/demo/highlight`](http://localhost:4173/demo/highlight) with `VITE_EXPERIMENTAL_M0=true` to preview the halo/tether interactions.

## Feature tour

- Dual-ring halos that sit outside glyph bounds so text remains legible.
- Cyan dotted tether connects paired brackets and breathes in sync with the halos.
- Animations respect `prefers-reduced-motion` and gracefully fade with a ~600 ms afterglow.
- Interactive demo cards cycle through curated spotlight states while hover/focus pulses remain available.
- Tiny HUD in the corner reflects the current experimental flag state so you always know when the layer is live.

The highlight system is implemented in `src/modules/highlight` and rendered via the `/demo/highlight` route.
