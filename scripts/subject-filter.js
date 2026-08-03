// Build one subject instead of the whole catalogue.
//
//   npm run build                              → les 52 expériences
//   EXPE34_SUBJECT=control npm run build    → l'automatique seule
//
// Pourquoi un plugin et pas une condition dans le code : `import.meta.glob`
// exige un motif LITTÉRAL, évalué par Vite avant que la moindre ligne ne
// tourne. On ne peut donc pas filtrer à l'exécution sans avoir déjà tout
// embarqué — c'est exactement le problème qu'on cherche à résoudre. Le seul
// endroit où le motif peut changer, c'est à la compilation, ici.
//
// Ce qui rend ce filtre HONNÊTE, c'est que les modules propres à un sujet
// vivent chez lui (`experiments/<sujet>/_lib/`). Tant que `bode.js` était
// dans `core/`, un build « automatique » aurait quand même embarqué
// `codes.js` et `modulation.js` : le core est toujours entier, seul le
// catalogue se réduit.
//
// Le sujet demandé est vérifié contre le disque : une faute de frappe
// produirait sinon un build vide, ce qui ne se voit qu'au lancement.
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

  // les quatre globs du projet : manifestes, scènes, sujets, et celui du worker
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
