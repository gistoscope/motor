# @motor/micro-viewer

The micro viewer is a lightweight KaTeX playground used by Motor for quick visual experiments with delimiters.

## Getting started

```bash
pnpm -C packages/micro-viewer dev
```

This launches a static server on [http://localhost:4001](http://localhost:4001) that serves the KaTeX viewer.

## Testing

```bash
pnpm -C packages/micro-viewer test
```

Vitest runs in a [`happy-dom`](https://github.com/capricorn86/happy-dom) environment so that bracket analysis helpers can be exercised without a browser.
