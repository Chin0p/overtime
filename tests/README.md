# Tests

Run all tests: `node tests/run.mjs`  
Run some: `node tests/run.mjs engine` (any file whose name contains "engine").

They cover the calculation rules, the parsers, holidays, categories, the summary sort and the PDF text. They do not touch the screen.

- Every person and date in the tests is invented. Do not add a real attendance file here.
- `run.mjs` bundles each `*.test.ts` with esbuild (already part of Vite) and runs Node's built-in test runner on the result, so there is no new dependency and no change to `package.json`.
- `fixtures.ts` builds attendance rows for September 2026 (1 September is a Tuesday).
