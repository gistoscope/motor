# @motor/cli

GRASP CLI for deterministic graph I/O and analysis.

## Install (dev)

Requires Node.js 20.x and pnpm 9.x.

```bash
pnpm -w install
pnpm --filter @motor/cli exec motor --version
```

The second command verifies that the CLI binary is available via pnpm workspace linking.

## Usage

```bash
motor --help | -h
motor --version | -v
motor help [command]
motor version

motor inspect [--in FILE] [--out FILE]
motor dot [--in FILE] [--name NAME|-n NAME] [--out FILE]
motor json [--in FILE] [--pretty N] [--out FILE]
motor validate [--in FILE]
motor stats [--in FILE] [--format text|json] [--out FILE]
motor gen --kind chain|cycle|star|grid|tree|bipartite [FLAGS] [--format json|dot|inspect] [--name NAME|-n NAME] [--out FILE]
```

All commands default to reading GraphJSON from `STDIN` unless `--in` is provided. When `--out` is supplied the command writes to the given file and keeps `STDOUT` empty (for predictable piping).

## Commands

| Command   | Description |
|-----------|-------------|
| `inspect` | Prints a stable, human-readable dump of the graph. |
| `dot`     | Emits deterministic Graphviz DOT output. |
| `json`    | Validates and normalizes GraphJSON. Optional `--pretty N` controls indentation (default `2`, accepts `0-10`). |
| `validate`| Validates GraphJSON and reports errors to `STDERR`. |
| `stats`   | Computes metrics: node/edge counts, in/out degree min/max, cycle flag, SCC count. |
| `gen`     | Generates deterministic synthetic graphs (chain, cycle, star, grid, tree, bipartite). |

Run `motor help <command>` to show per-command help text (flags, descriptions, exit behavior).

## Flags

### Global

| Flag              | Purpose |
|-------------------|---------|
| `--help`, `-h`    | Show help. With a command (e.g. `motor inspect --help`) prints command-specific help. |
| `--version`, `-v` | Print the CLI version from `package.json`. |
| `--in FILE`       | Read GraphJSON from file instead of `STDIN`. |
| `--out FILE`      | Write command output to file (adds trailing newline). |
| `--name NAME`, `-n NAME` | Graph name used for DOT output (default `G`). |

### Command-specific

| Command  | Flags |
|----------|-------|
| `json`   | `--pretty N` — control indentation (integer `0-10`). |
| `stats`  | `--format text|json` — choose text (default) or JSON metrics. |
| `gen`    | `--kind chain|cycle|star|grid|tree|bipartite` *(required)*, `--format json|dot|inspect` (default `json`), `--n N`, `--rows R`, `--cols C`, `--arity K`, `--depth D`, `--left L`, `--right R`, `--name NAME`, `--out FILE`. Each parameter must be a non-negative/positive integer as indicated by the command help. |

## Exit codes

| Code | Meaning |
|------|---------|
| `0`  | Success. For `validate`, indicates valid GraphJSON; for `gen`, indicates generation succeeded. |
| `1`  | User error (invalid input, failed validation, missing required flags, invalid GraphJSON, etc.). |

Commands that set `process.exitCode` instead of exiting immediately (e.g. `gen`, `validate`) still follow the above semantics. Error messages are written to `STDERR`.

## Examples

```bash
# Inspect a graph from a file
motor inspect --in graphs/sample.json

# Convert to DOT while renaming the graph
cat graphs/sample.json | motor dot --name SampleGraph

# Normalize GraphJSON and persist to a file
motor json --in graphs/sample.json --pretty 2 --out graphs/normalized.json

# Validate a stream (no output on success)
cat graphs/sample.json | motor validate

# Generate a chain, inspect it, and compute stats
motor gen --kind chain --n 5 --format inspect
motor gen --kind chain --n 5 --format json | motor stats --format json

# Generate a grid and emit DOT straight to a file
motor gen --kind grid --rows 3 --cols 4 --format dot --name Lattice --out grid.dot
```
