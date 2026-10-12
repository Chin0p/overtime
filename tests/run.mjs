// Runs every tests/*.test.ts file with Node's built-in test runner.
//
//   node tests/run.mjs            all tests
//   node tests/run.mjs engine     only files whose name contains "engine"
//
// Node cannot load the app's TypeScript directly (its imports have no .ts extension), so each test
// file is bundled with esbuild first. esbuild already ships with Vite, so nothing new is installed,
// and nothing here touches package.json, the lock file, Vite or the workflows.
import { build } from 'esbuild';
import { spawnSync } from 'node:child_process';
import { mkdtempSync, readdirSync } from 'node:fs';
import { tmpdir } from 'node:os';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const here = path.dirname(fileURLToPath(import.meta.url));
const filter = process.argv[2];
const sources = readdirSync(here)
  .filter((f) => f.endsWith('.test.ts') && (!filter || f.includes(filter)))
  .map((f) => path.join(here, f));

if (sources.length === 0) {
  console.error('No test files found.');
  process.exit(1);
}

const out = mkdtempSync(path.join(tmpdir(), 'ot-tests-'));
await build({
  entryPoints: sources,
  outdir: out,
  bundle: true,
  platform: 'node',
  format: 'esm',
  outExtension: { '.js': '.mjs' },
  logLevel: 'error',
});

const files = sources.map((f) => path.join(out, path.basename(f).replace(/\.ts$/, '.mjs')));
const result = spawnSync(process.execPath, ['--test', '--test-reporter=spec', ...files], { stdio: 'inherit' });
process.exit(result.status ?? 1);
