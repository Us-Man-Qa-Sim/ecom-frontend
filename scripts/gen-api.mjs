// Typed API client source (API-1).
//
//   npm run gen:api           fetch the gateway's spec, save it as openapi.json,
//                             and regenerate src/lib/api/schema.d.ts from it
//   npm run gen:api:check     CI: fail if schema.d.ts does not match openapi.json
//                             (needs no gateway)
//   npm run gen:api:check -- --live
//                             also fail if the running gateway's spec differs
//                             from openapi.json
//
// Both files are committed. A gateway change shows up as a diff of openapi.json.
import { execFileSync } from 'node:child_process';
import { existsSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';

for (const file of ['.env.local', '.env']) {
  if (existsSync(file)) process.loadEnvFile(file);
}

const SPEC = 'openapi.json';
const TYPES = 'src/lib/api/schema.d.ts';
const specUrl = `${process.env.API_INTERNAL_URL ?? 'http://localhost:3000'}/docs-json`;
const check = process.argv.includes('--check');
const live = process.argv.includes('--live');

const read = (path) => readFileSync(path, 'utf8').replace(/\r\n/g, '\n');

async function fetchSpec() {
  let response;
  try {
    response = await fetch(specUrl, { signal: AbortSignal.timeout(10_000) });
  } catch (error) {
    throw new Error(`Cannot reach ${specUrl}. Is the backend stack running?`, { cause: error });
  }
  if (!response.ok) throw new Error(`${specUrl} answered ${response.status}`);
  return `${JSON.stringify(await response.json(), null, 2)}\n`;
}

function generateTypes(output) {
  // The generator's CLI, run with node directly (no shell, same on every OS).
  const cli = join('node_modules', 'openapi-typescript', 'bin', 'cli.js');
  execFileSync(process.execPath, [cli, SPEC, '-o', output], {
    stdio: ['ignore', 'ignore', 'inherit'],
  });
}

if (!check) {
  writeFileSync(SPEC, await fetchSpec());
  generateTypes(TYPES);
  console.log(`Wrote ${SPEC} and ${TYPES} from ${specUrl}`);
} else {
  const problems = [];

  const tempDir = mkdtempSync(join(tmpdir(), 'gen-api-'));
  try {
    const output = join(tempDir, 'schema.d.ts');
    generateTypes(output);
    if (read(output) !== read(TYPES)) {
      problems.push(`${TYPES} does not match ${SPEC}.`);
    }
  } finally {
    rmSync(tempDir, { recursive: true, force: true });
  }

  if (live && (await fetchSpec()) !== read(SPEC)) {
    problems.push(`${SPEC} does not match the spec at ${specUrl}.`);
  }

  if (problems.length > 0) {
    console.error(`${problems.join('\n')}\nRun "npm run gen:api" and commit the result.`);
    process.exit(1);
  }
  console.log(`${TYPES} is up to date${live ? ' with the running gateway' : ` with ${SPEC}`}.`);
}
