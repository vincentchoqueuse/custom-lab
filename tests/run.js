#!/usr/bin/env node
// npm run smoke — les suites navigateur, sur le bundle CONSTRUIT.
//
// Sur le bundle et pas sur le serveur de dev, parce que deux des pannes que
// ces suites ont attrapées ne se produisaient qu'après build : un motif
// `import.meta.glob` réécrit par le filtre de sujet, et une vue custom dont
// l'import dynamique ne se résolvait plus. Tester ce qu'on déploie est le
// seul test qui engage.
//
// Le serveur est démarré et arrêté ici : une suite ne doit jamais dépendre
// d'un `vite preview` qu'on aurait lancé à la main dans un autre terminal,
// sinon elle passe au vert contre un bundle vieux d'une heure.
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
    p.on('exit', (code) => (code === 0 ? ok() : ko(new Error(`${cmd} a rendu ${code}`))));
    p.on('error', ko);
  });

/** Attend que le serveur réponde, plutôt que de dormir un temps arbitraire. */
async function waitFor(url, ms = 30000) {
  const t0 = Date.now();
  for (;;) {
    try {
      const r = await fetch(url);
      if (r.ok) return;
    } catch {
      /* pas encore là */
    }
    if (Date.now() - t0 > ms) throw new Error(`${url} ne répond pas après ${ms} ms`);
    await new Promise((r) => setTimeout(r, 200));
  }
}

const skipBuild = process.argv.includes('--no-build');
if (!skipBuild) {
  console.log(bold('build'));
  await sh('npx', ['vite', 'build', '--logLevel', 'warn']);
} else if (!existsSync(resolve('dist/index.html'))) {
  console.error('--no-build, mais dist/ est vide : lancer npm run build d’abord');
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
    `\n${failed ? red(`${failed} échec(s)`) : green(`${total} assertions, 0 échec`)}\n`
  );
} finally {
  server.kill('SIGTERM');
}
process.exit(failed ? 1 : 0);
