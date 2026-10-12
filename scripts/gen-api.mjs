// Generates src/lib/api/schema.d.ts from the gateway's OpenAPI spec (API-1).
//   npm run gen:api          write the file
//   npm run gen:api:check    fail if the committed file is out of date (CI)
import { execFileSync } from 'node:child_process';
import { existsSync, mkdtempSync, readFileSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';

for (const file of ['.env.local', '.env']) {
  if (existsSync(file)) process.loadEnvFile(file);
}

const target = 'src/lib/api/schema.d.ts';
const source = `${process.env.API_INTERNAL_URL ?? 'http://localhost:3000'}/docs-json`;
const check = process.argv.includes('--check');

const tempDir = check ? mkdtempSync(join(tmpdir(), 'gen-api-')) : undefined;
const output = tempDir ? join(tempDir, 'schema.d.ts') : target;

try {
  execFileSync('npx', ['openapi-typescript', source, '-o', output], {
    stdio: 'inherit',
    shell: process.platform === 'win32',
  });

  if (check) {
    const normalize = (path) => readFileSync(path, 'utf8').replace(/\r\n/g, '\n');
    if (normalize(output) !== normalize(target)) {
      console.error(`\n${target} is out of date. Run "npm run gen:api" and commit the result.`);
      process.exitCode = 1;
    } else {
      console.log(`${target} is up to date.`);
    }
  }
} finally {
  if (tempDir) rmSync(tempDir, { recursive: true, force: true });
}
