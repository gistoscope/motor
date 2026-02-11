# Microviewer MV-P02

This build extends MV-P01 by adding a diagnostics surface and a bundled self-test harness.

## Layout
- `public/mv_p02_index.html` — production viewer with diagnostics and quick self-test button.
- `public/mv_p02_dev-tests.html` — in-browser regression harness.
- `public/mv_p02_app.js` — shared rendering + bracket pairing utilities.
- `public/mv_p02_tests.js` — scripted tests for dev harness.
- `public/mv_p02_style.css` — shared styling.

## Diagnostics
The primary viewer exposes the following fields:
- **tokCount** — number of character tokens analysed for the active expression.
- **pairCount** — number of bracket pairs returned by `buildPairs()`.
- **lastTargetId** — DOM token id from the most recent click.

A "Run quick self-test" button executes `mvP02.runQuickSelfTest()` over all curated expressions. Results are reported inline and failures are logged to the console.

## Self-tests
Open `public/mv_p02_dev-tests.html` to execute the regression harness. It will:
1. Render all curated expressions with the production viewer logic.
2. Assert that every balanced expression yields `pairCount > 0` and matches the expected pair count.
3. Simulate a click on every bracket token and verify that exactly two nodes receive the highlight class.
4. Produce an in-page PASS/FAIL tally (no external dependencies).

`buildPairs()` reports timing information via `console.log` to help track performance regressions.
