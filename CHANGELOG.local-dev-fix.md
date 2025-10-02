# Local Dev Fix: TSA alias & exports
- Add '@motor/tsa' alias to Vite and Vitest configs.
- Re-export TSA utilities ('normalizeSigns', 'reduceFraction') from '@motor/tsa' public index.
- Prevents 'Failed to resolve import "@motor/tsa"' at /dev/step in local dev on Windows.
