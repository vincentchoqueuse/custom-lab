// The common ground of the browser suites.
//
// `npm run check` proves the SCIENCE and the vocabulary, outside a browser.
// What it cannot see is a view that draws nothing, a scene that opens a deleted
// tab, a button that overflows the screen or a console error — which is to say
// exactly the failures that only show up in class. These suites cover that gap
// and nothing else: they never re-verify a title or an identity the numerical
// harness already holds.
import { readdirSync, existsSync, readFileSync } from 'node:fs';
import { join, resolve } from 'node:path';
import { chromium } from 'playwright';

export const BASE = process.env.PUPITRA_TEST_URL ?? 'http://localhost:4179';
const CHROMIUM = process.env.PLAYWRIGHT_CHROMIUM ?? '/opt/pw-browsers/chromium';

const green = (s) => `\x1b[32m${s}\x1b[0m`;
const red = (s) => `\x1b[31m${s}\x1b[0m`;
const dim = (s) => `\x1b[2m${s}\x1b[0m`;

/** The list of experiments, read from disk — never written by hand. */
export function catalogue() {
  const root = resolve(process.cwd(), 'src/experiments');
  const out = [];
  for (const sub of readdirSync(root, { withFileTypes: true })) {
    if (!sub.isDirectory()) continue;
    for (const exp of readdirSync(join(root, sub.name), { withFileTypes: true })) {
      if (!exp.isDirectory()) continue;
      const dir = join(root, sub.name, exp.name);
      if (!existsSync(join(dir, 'manifest.js'))) continue;
      out.push({
        key: `${sub.name}/${exp.name}`,
        subject: sub.name,
        dir,
        // the declaration as written: the `randomness` suite verifies that
        // the UI obeys it
        random: /^\s*random:\s*true\s*,/m.test(readFileSync(join(dir, 'manifest.js'), 'utf8')),
      });
    }
  }
  return out.sort((a, b) => a.key.localeCompare(b.key));
}

/**
 * Opens a browser, counts the assertions, closes everything and returns the
 * tally. Each suite is one `await run('name', async (t, page) => { … })`.
 */
export async function run(name, body, { viewport = { width: 1400, height: 950 } } = {}) {
  const browser = await chromium.launch({ executablePath: CHROMIUM });
  const page = await browser.newPage({ viewport });
  const errors = [];
  page.on('pageerror', (e) => errors.push(String(e)));
  page.on('console', (m) => m.type() === 'error' && errors.push(m.text()));

  let pass = 0;
  const failures = [];
  const t = (label, ok, info = '') => {
    if (ok) {
      pass++;
      if (process.env.V) console.log(`  ${green('✓')} ${label} ${dim(info)}`);
    } else {
      failures.push(`${label} ${info}`.trim());
      console.log(`  ${red('✗')} ${label} ${dim(info)}`);
    }
  };

  const helpers = {
    /** Goes to a hash and lets the worker finish. */
    async go(hash, settle = 700) {
      await page.goto(BASE + '/' + hash, { waitUntil: 'networkidle' });
      await page.waitForTimeout(settle);
    },
    /** Number of SVG marks in the plot area — 0 or 1 means nothing drawn. */
    marks: () =>
      page.$$eval(
        '.plot-area svg path, .plot-area svg circle, .plot-area svg line, .plot-area svg rect, .plot-area svg image',
        (n) => n.length
      ),
    statline: () => page.textContent('.statline'),
    tabs: () => page.$$eval('.tabs button', (n) => n.map((x) => x.textContent.trim())),
  };

  try {
    await body(t, page, helpers);
    t('no console error', errors.length === 0, errors.slice(0, 3).join(' / '));
  } finally {
    await browser.close();
  }
  return { name, pass, failures };
}

export { green, red, dim };
