# Motor Repository Rules

- **Trunk**: `sandbox`. All feature work must branch from `sandbox` and return via
  pull request.
- **Package manager**: pnpm only. Use `pnpm -w install --frozen-lockfile` for
  all installs.
- **Node version**: `20.19.5` across local environments and CI.
- **Husky pre-push**: must run alias generation, `pnpm verify`,
  `pnpm -r test`, and `node scripts/forbidden-tokens.cjs`.
- **CI expectations**: install with the frozen workspace lockfile and run the
  same verification/test/token steps.
- **Artifacts**: never commit build output, `dist/`, or archives such as `.zip`.
  Publish distribution artifacts through Releases instead.
- **Sandbox hygiene**: do not commit directly to `sandbox`.
- **Selection invariant**: bracket-pair selections must round-trip through
  serialization without loss.
