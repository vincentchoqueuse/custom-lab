#!/usr/bin/env node
// npm run smoke — the browser suites, run against the BUILT bundle.
//
// Against the bundle and not the dev server, because two of the failures these
// suites have caught only happened after a build: an `import.meta.glob` pattern
// rewritten by the subject filter, and a custom view whose dynamic import no
// longer resolved. Testing what gets deployed is the only test that commits to
// anything.
//
// The server is started and stopped here: a suite must never depend on a
// `vite preview` launched by hand in another terminal, or it goes green against
// a bundle an hour old.
import { spawn } from 'node:child_process';
import { existsSync } from 'node:fs';
import { resolve } from 'node:path';
import { readdirSync } from 'node:fs';
import { pathToFileURL } from 'node:url';

const PORT = 4179;
const bold = (s) => `\x1b[1m${s}\x1b[0m`;
const green = (s) => `\x1b[32m${s}\x1b[0m`;
const red = (s) => `\x1b[31m${s}\x1b[0m`;
const dim = (s) => `\x1b[2m${s}\x1b[0m`;

const sh = (cmd, args, opts = {}) =>
  new Promise((ok, ko) => {
    const p = spawn(cmd, args, { stdio: 'inherit', shell: false, ...opts });
    p.on('exit', (code) => (code === 0 ? ok() : ko(new Error(`${cmd} exited with ${code}`))));
    p.on('error', ko);
  });

/** Waits for the server to answer, rather than sleeping an arbitrary time. */
async function waitFor(url, ms = 30000) {
  const t0 = Date.now();
  for (;;) {
    try {
      const r = await fetch(url);
      if (r.ok) return;
    } catch {
      /* not up yet */
    }
    if (Date.now() - t0 > ms) throw new Error(`${url} did not answer within ${ms} ms`);
    await new Promise((r) => setTimeout(r, 200));
  }
}

const skipBuild = process.argv.includes('--no-build');
if (!skipBuild) {
  console.log(bold('build'));
  await sh('npx', ['vite', 'build', '--logLevel', 'warn']);
} else if (!existsSync(resolve('dist/index.html'))) {
  console.error('--no-build, but dist/ is empty: run npm run build first');
  process.exit(1);
}

console.log(bold(`\npreview :${PORT}`));
const server = spawn('npx', ['vite', 'preview', '--port', String(PORT), '--strictPort'], {
  stdio: 'ignore',
});
let failed = 0;
try {
  await waitFor(`http://localhost:${PORT}/`);

  const dir = resolve('tests/suites');
  const only = process.argv.find((a) => a.startsWith('--only='))?.slice(7);
  const files = readdirSync(dir)
    .filter((f) => f.endsWith('.mjs'))
    .filter((f) => !only || f.startsWith(only))
    .sort();

  let total = 0;
  for (const f of files) {
    const mod = await import(pathToFileURL(resolve(dir, f)).href);
    console.log(bold(`\n${f.replace('.mjs', '')}`));
    const res = await mod.default();
    for (const r of [].concat(res)) {
      total += r.pass;
      failed += r.failures.length;
      const mark = r.failures.length ? red('✗') : green('✓');
      console.log(`  ${mark} ${r.name} ${dim(`${r.pass} assertions`)}`);
    }
  }
  console.log(
    `\n${failed ? red(`${failed} failure(s)`) : green(`${total} assertions, 0 failures`)}\n`
  );
} finally {
  server.kill('SIGTERM');
}
process.exit(failed ? 1 : 0);
