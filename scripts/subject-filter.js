// Build one subject instead of the whole catalogue.
//
//   npm run build                           → the whole catalogue
//   EXPE34_SUBJECT=control npm run build    → control alone
//
// Why a plugin and not a condition in the code: `import.meta.glob` requires a
// LITERAL pattern, evaluated by Vite before a single line runs. One therefore
// cannot filter at runtime without having already bundled everything — which is
// exactly the problem being solved. The only place the pattern can change is at
// build time, here.
//
// What makes this filter HONEST is that the modules belonging to one subject
// live with it (`experiments/<subject>/_lib/`). As long as `bode.js` sat in
// `core/`, a "control" build would still have bundled `codes.js` and
// `modulation.js`: the core is always whole, only the catalogue shrinks.
//
// The requested subject is checked against the disk: a typo would otherwise
// produce an empty build, which only shows on launch.
import { existsSync, readdirSync } from 'node:fs';
import { resolve } from 'node:path';

const ROOT = resolve(process.cwd(), 'src/experiments');

export function subjectFilter() {
  const subject = process.env.EXPE34_SUBJECT?.trim();
  if (!subject) return { name: 'expe34-subject-filter' };

  const known = readdirSync(ROOT, { withFileTypes: true })
    .filter((e) => e.isDirectory() && existsSync(resolve(ROOT, e.name, '_subject.js')))
    .map((e) => e.name);
  if (!known.includes(subject))
    throw new Error(
      `EXPE34_SUBJECT='${subject}' is not a subject (known: ${known.join(', ')})`
    );

  // the project's four globs: manifests, scenes, subjects, and the worker's
  const PATTERNS = [
    ['../experiments/*/*/manifest.js', `../experiments/${subject}/*/manifest.js`],
    ['../experiments/*/*/scenes.js', `../experiments/${subject}/*/scenes.js`],
    ['../experiments/*/_subject.js', `../experiments/${subject}/_subject.js`],
    ['../experiments/*/*/compute.js', `../experiments/${subject}/*/compute.js`],
  ];

  return {
    name: 'expe34-subject-filter',
    enforce: 'pre',
    transform(code, id) {
      if (!id.includes('/src/core/') || !code.includes('import.meta.glob')) return null;
      let out = code;
      for (const [from, to] of PATTERNS) out = out.split(`'${from}'`).join(`'${to}'`);
      return out === code ? null : { code: out, map: null };
    },
    buildStart() {
      this.info?.(`building the '${subject}' subject only`);
    },
  };
}
