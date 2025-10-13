# @motor/grasp

`@motor/grasp` provides the foundational types and controller plumbing for
selection-aware tooling in Motor. The package focuses on the invariant that
selection ranges preserve bracket pairs across hosts and surfaces.

## Getting started

```sh
pnpm -w install --frozen-lockfile
pnpm --filter @motor/grasp build
```

## Concepts

- **NodeId** – a branded string identifier for host nodes.
- **Range** – an anchor/focus pair with validated offsets.
- **Selection** – an immutable list of ranges respecting bracket-pair
  invariants.
- **HostAdapter** – the bridge for reading and writing host selections.
- **GraspController** – a lightweight coordinator for selection flows.

## Testing

```sh
pnpm --filter @motor/grasp test
```
