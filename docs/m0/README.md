# Motor Documentation

## CI Notes

We set `ROLLUP_SKIP_NODEJS_NATIVE=true` in our CI workflows to avoid issues installing Rollup's optional native binary on shared CI providers.

## OSS-1: atoms & SPE-lite (string grammar)

The `@motor/tsa` package now includes the first rational one-step atoms along with a deterministic chooser. Atoms operate on the Stage-0 string grammar and return structured `Result` objects so they can be composed without throwing exceptions. The chooser (`chooseFirstStep`) ranks candidates with the SPE-lite priority order and always reports the rationale for deterministic debugging.

The `/dev/step` development view renders the working expression above the editor, matching the new atoms. The KaTeX-style display spans the full width, the input sits directly beneath it, and the textarea can be resized vertically. Apply (`Enter`) runs the first-step chooser, Esc clears the editor, and either the transformed expression or the failure reasons appear below the display.

Remember that the route remains gated behind `VITE_EXPERIMENTAL_M0`.

## Local Dev

Local Dev - Vite uses aliases to monorepo source; optimizeDeps excludes @motor/* packages.
