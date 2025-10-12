# @motor/spark

A minimal headless spark engine that translates high level commands into
deterministic events. The package exposes a simple finite state machine
implemented in TypeScript and ships compiled ESM artifacts for NodeNext
consumers.

## Usage

```ts
import { createSpark } from '@motor/spark';

const spark = createSpark();
const [selection] = spark.dispatch({ type: 'select', selection: 'alpha' });
```

Run `pnpm test` to execute the Vitest scenario and `pnpm build` to produce the
TypeScript declarations and JavaScript output.
