// Le socle commun des suites navigateur.
//
// `npm run check` prouve la SCIENCE et le vocabulaire, hors navigateur. Ce
// qu'il ne peut pas voir, c'est une vue qui ne dessine rien, une scène qui
// ouvre un onglet supprimé, un bouton qui déborde de l'écran ou une erreur
// console — c'est-à-dire précisément les pannes qui ne se manifestent qu'en
// cours. Ces suites-là couvrent ce trou, et rien d'autre : elles ne
// revérifient jamais un titre ou une identité que le harnais numérique
// tient déjà.
import { readdirSync, existsSync, readFileSync } from 'node:fs';
import { join, resolve } from 'node:path';
import { chromium } from 'playwright';

export const BASE = process.env.EXPE34_TEST_URL ?? 'http://localhost:4179';
const CHROMIUM = process.env.PLAYWRIGHT_CHROMIUM ?? '/opt/pw-browsers/chromium';

const green = (s) => `\x1b[32m${s}\x1b[0m`;
const red = (s) => `\x1b[31m${s}\x1b[0m`;
const dim = (s) => `\x1b[2m${s}\x1b[0m`;

/** La liste des expériences, lue sur le disque — jamais écrite à la main. */
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
        // la déclaration, telle qu'elle est écrite : la suite « randomness »
        // vérifie que l'UI lui obéit
        random: /^\s*random:\s*true\s*,/m.test(readFileSync(join(dir, 'manifest.js'), 'utf8')),
      });
    }
  }
  return out.sort((a, b) => a.key.localeCompare(b.key));
}

/**
 * Ouvre un navigateur, compte les assertions, ferme tout et rend le bilan.
 * Chaque suite est un `await run('nom', async (t, page) => { … })`.
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
    /** Va à un hash et laisse le worker finir. */
    async go(hash, settle = 700) {
      await page.goto(BASE + '/' + hash, { waitUntil: 'networkidle' });
      await page.waitForTimeout(settle);
    },
    /** Nombre de marques SVG dans la zone de tracé — 0 ou 1 = rien dessiné. */
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
    t('aucune erreur console', errors.length === 0, errors.slice(0, 3).join(' / '));
  } finally {
    await browser.close();
  }
  return { name, pass, failures };
}

export { green, red, dim };
