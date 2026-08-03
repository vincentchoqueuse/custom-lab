import { compute, realization, changeBasis, transferOf, eigen } from './compute.js';
import { standardChecks, maxGap, range } from '../../../core/checks.js';

const BASE = { basis: 'companion', K: 1, m: 0.4, w0: 2, seed: 42 };
const obs = (p) => compute({ ...BASE, ...p }).observables;
const BASES = ['companion', 'modal', 'physical'];
const CASES = [
  { K: 1, m: 0.4, w0: 2 },
  { K: 1.7, m: 0.9, w0: 0.5 },
  { K: 0.3, m: 1.6, w0: 8 }, // apériodique : pôles réels, base modale diagonale
  { K: 1, m: 0.05, w0: 3 },
];

export const checks = [
  {
    name: 'les trois bases donnent EXACTEMENT la même sortie',
    category: 'numeric',
    run() {
      // L'affirmation centrale : l'état est un choix d'écriture, la sortie est
      // le système. Aucun schéma d'intégration ici — tout est en forme close —
      // donc un écart ne pourrait pas être mis sur le dos du solveur.
      const gap = maxGap(CASES, (p) => {
        const ys = BASES.map((basis) => obs({ ...p, basis }).stepResponse.y);
        return maxGap(range(ys[0].length), (i) => Math.max(...ys.map((y) => y[i])), (i) =>
          Math.min(...ys.map((y) => y[i]))
        );
      });
      return { ok: gap < 1e-12, detail: `écart max ${gap.toExponential(2)}` };
    },
  },
  {
    name: "…et des ÉTATS différents : la trajectoire, elle, dépend de la base",
    category: 'numeric',
    run() {
      // le pendant du précédent, et il doit échouer dans l'autre sens : si
      // les états coïncidaient, l'expérience ne montrerait rien
      const differ = CASES.every((p) => {
        const a = obs({ ...p, basis: 'companion' }).state2.y;
        const b = obs({ ...p, basis: 'modal' }).state2.y;
        const c = obs({ ...p, basis: 'physical' }).state2.y;
        let ab = 0;
        let ac = 0;
        for (let i = 0; i < a.length; i++) {
          ab = Math.max(ab, Math.abs(a[i] - b[i]));
          ac = Math.max(ac, Math.abs(a[i] - c[i]));
        }
        return ab > 1e-3 && ac > 1e-3;
      });
      return { ok: differ, detail: "x₂ diffère entre les bases dans les quatre cas" };
    },
  },
  {
    name: 'H(jω) = C(jωI−A)⁻¹B + D vaut la forme close, dans les trois bases',
    category: 'numeric',
    run() {
      // la fonction de transfert reconstituée depuis les matrices doit être,
      // au bit près, celle du second ordre du chapitre précédent
      const gap = maxGap(CASES, ({ K, m, w0 }) => {
        let worst = 0;
        for (const basis of BASES) {
          const sys = realization(basis, { K, m, w0 });
          for (const w of [0.01, 0.3, 1, w0, 2 * w0, 37]) {
            const [hr, hi] = transferOf(sys, w);
            const re = w0 * w0 - w * w;
            const im = 2 * m * w0 * w;
            const d = re * re + im * im;
            const n = K * w0 * w0;
            worst = Math.max(worst, Math.abs(hr - (n * re) / d), Math.abs(hi + (n * im) / d));
          }
        }
        return worst;
      });
      return { ok: gap < 1e-12, detail: `écart max ${gap.toExponential(2)}` };
    },
  },
  {
    name: 'les valeurs propres de A sont les pôles, et ne bougent pas avec la base',
    category: 'numeric',
    run() {
      const gap = maxGap(CASES, ({ K, m, w0 }) => {
        const want =
          m < 1
            ? [-m * w0, w0 * Math.sqrt(1 - m * m)]
            : [-m * w0 + w0 * Math.sqrt(m * m - 1), 0];
        let worst = 0;
        for (const basis of BASES) {
          const ev = eigen(realization(basis, { K, m, w0 }).A);
          // la paire est non ordonnée : on compare le couple (Re, |Im|)
          const got = [ev[0][0], Math.abs(ev[0][1])];
          const alt = [ev[1][0], Math.abs(ev[1][1])];
          const d = Math.min(
            Math.max(Math.abs(got[0] - want[0]), Math.abs(got[1] - want[1])),
            Math.max(Math.abs(alt[0] - want[0]), Math.abs(alt[1] - want[1]))
          );
          worst = Math.max(worst, d);
        }
        return worst;
      });
      return { ok: gap < 1e-12, detail: `écart max ${gap.toExponential(2)}` };
    },
  },
  {
    name: 'tr A = −2mω₀ et det A = ω₀², dans les trois bases',
    category: 'numeric',
    run() {
      // les deux invariants de similitude d'une matrice 2×2 : ce sont eux qui
      // garantissent que le polynôme caractéristique — donc les pôles — ne
      // dépend pas de la base
      const gap = maxGap(CASES, ({ K, m, w0 }) => {
        let worst = 0;
        for (const basis of BASES) {
          const { A } = realization(basis, { K, m, w0 });
          worst = Math.max(
            worst,
            Math.abs(A[0][0] + A[1][1] + 2 * m * w0),
            Math.abs(A[0][0] * A[1][1] - A[0][1] * A[1][0] - w0 * w0)
          );
        }
        return worst;
      });
      return { ok: gap < 1e-12, detail: `écart max ${gap.toExponential(2)}` };
    },
  },
  {
    name: "un changement de base QUELCONQUE laisse H(jω) inchangée",
    category: 'numeric',
    run() {
      // pas seulement les trois bases proposées : n'importe quelle T
      // inversible. C'est la propriété, pas une coïncidence des trois choix.
      const sys = realization('companion', BASE);
      const gap = maxGap(
        [
          [[1, 0], [0, 1]],
          [[2, -1], [3, 5]],
          [[0, 1], [1, 0]],
          [[0.1, 4], [-7, 0.25]],
        ],
        (T) => {
          const moved = changeBasis(sys, T, ['a', 'b']);
          let worst = 0;
          for (const w of [0.05, 0.7, 2, 6, 40]) {
            const a = transferOf(sys, w);
            const b = transferOf(moved, w);
            worst = Math.max(worst, Math.abs(a[0] - b[0]), Math.abs(a[1] - b[1]));
          }
          return worst;
        }
      );
      return { ok: gap < 1e-11, detail: `écart max ${gap.toExponential(2)}` };
    },
  },
  {
    name: "la base modale découple vraiment : A y est diagonale (pôles réels)",
    category: 'numeric',
    run() {
      // m > 1 : deux pôles réels, donc A modale strictement diagonale. Sous
      // m = 1 les pôles sont complexes et la forme réelle équivalente est le
      // bloc [[−s, wd], [−wd, −s]] — antidiagonale, pas nulle : le vérifier
      // aussi, sinon la « base modale » ne voudrait rien dire.
      const diag = [1.4, 2, 1.05].every((m) => {
        const { A } = realization('modal', { K: 1, m, w0: 3 });
        return Math.abs(A[0][1]) < 1e-12 && Math.abs(A[1][0]) < 1e-12;
      });
      const block = [0.2, 0.6, 0.95].every((m) => {
        const { A } = realization('modal', { K: 1, m, w0: 3 });
        const wd = 3 * Math.sqrt(1 - m * m);
        return (
          Math.abs(A[0][0] + 3 * m) < 1e-12 &&
          Math.abs(A[1][1] + 3 * m) < 1e-12 &&
          Math.abs(A[0][1] - wd) < 1e-12 &&
          Math.abs(A[1][0] + wd) < 1e-12
        );
      });
      return { ok: diag && block, detail: 'diagonale si m > 1, bloc rotation-décroissance si m < 1' };
    },
  },
  standardChecks.determinism(compute, BASE, 'trajectory'),
];
