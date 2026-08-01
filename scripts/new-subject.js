#!/usr/bin/env node
// npm run new:subject — create a subject directory + its _subject.js.

import { mkdirSync, writeFileSync, existsSync } from 'node:fs';
import { join, resolve } from 'node:path';
import readline from 'node:readline/promises';

const EXP_ROOT = resolve(process.cwd(), 'src/experiments');

// Interactive on a TTY; consumes piped lines otherwise (scriptable/CI-safe).
async function makeAsker() {
  if (process.stdin.isTTY) {
    const rl = readline.createInterface({ input: process.stdin, output: process.stdout });
    return { ask: async (q) => (await rl.question(q)).trim(), close: () => rl.close() };
  }
  const raw = await new Promise((res) => {
    let data = '';
    process.stdin.on('data', (c) => (data += c));
    process.stdin.on('end', () => res(data));
  });
  const lines = raw.split('\n');
  let i = 0;
  return {
    ask: async (q) => {
      const v = (lines[i++] ?? '').trim();
      console.log(q + v);
      return v;
    },
    close: () => {},
  };
}

const { ask, close } = await makeAsker();
const id = await ask('Subject id (kebab-case): ');
const title = (await ask('Title (course language): ')) || id;
const order = parseInt(await ask('Order (default 99): '), 10) || 99;
close();

if (!/^[a-z][a-z0-9-]*$/.test(id)) {
  console.error('subject id must be kebab-case ([a-z0-9-])');
  process.exit(1);
}
const dir = join(EXP_ROOT, id);
if (existsSync(dir)) {
  console.error(`${dir} already exists`);
  process.exit(1);
}
mkdirSync(dir, { recursive: true });
writeFileSync(join(dir, '_subject.js'), `export default { title: '${title}', order: ${order} };\n`);
console.log(`created src/experiments/${id}/_subject.js — now add an experiment with npm run new:experiment`);
