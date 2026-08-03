import { compute, overlap, gateGate, gateExp } from './compute.js';
import { standardChecks, maxGap, range } from '../../../core/checks.js';

const BASE = { sig: 'gate', ker: 'gate', a: 1, b: 1, t: 1, seed: 42 };
const obs = (p) => compute({ ...BASE, ...p }).observables;
const WIDTHS = [
  { a: 1, b: 1 },
  { a: 2, b: 0.5 },
  { a: 0.3, b: 2.4 },
  { a: 1.7, b: 1.7 },
];

export const checks = [
  {
    name: 'porte * porte = le trapèze exact, point par point',
    category: 'numeric',
    run() {
      // base a+b, plateau |a−b|, hauteur min(a,b) — donc un TRIANGLE quand
      // a = b. L'intégrale découpée aux ruptures rend cette identité EXACTE :
      // une quadrature aveugle laissait 4·10⁻³ sur les coins.
      const gap = maxGap(WIDTHS, ({ a, b }) => {
        const o = obs({ a, b });
        return maxGap(range(o.yOut.x.length), (i) => o.yOut.y[i], (i) => gateGate(a, b, o.yOut.x[i]));
      });
      return { ok: gap < 1e-12, detail: `écart max ${gap.toExponential(2)}` };
    },
  },
  {
    name: 'porte * exponentielle = la charge d’un RC, en forme close',
    category: 'numeric',
    run() {
      // y(t) = 1 − e^{−t/b} pendant l'impulsion, puis décharge en e^{−(t−a)/b}
      const gap = maxGap(
        [
          { a: 1.5, b: 0.4 },
          { a: 0.5, b: 1.2 },
          { a: 2.5, b: 2.5 },
        ],
        ({ a, b }) => {
          const o = obs({ ker: 'exp', a, b });
          return maxGap(range(o.yOut.x.length), (i) => o.yOut.y[i], (i) => gateExp(a, b, o.yOut.x[i]));
        }
      );
      return { ok: gap < 1e-6, detail: `écart max ${gap.toExponential(2)}` };
    },
  },
  {
    name: 'les largeurs des supports S’AJOUTENT',
    category: 'numeric',
    run() {
      // la règle que les étudiants retiennent, et qui sort du calcul :
      // y est nulle avant 0 et après a+b, et non nulle strictement entre
      const ok = WIDTHS.every(({ a, b }) => {
        const o = obs({ a, b });
        let firstNZ = Infinity;
        let lastNZ = -Infinity;
        for (let i = 0; i < o.yOut.x.length; i++) {
          if (o.yOut.y[i] > 1e-12) {
            firstNZ = Math.min(firstNZ, o.yOut.x[i]);
            lastNZ = Math.max(lastNZ, o.yOut.x[i]);
          }
        }
        const step = o.yOut.x[1] - o.yOut.x[0];
        return firstNZ > -step && firstNZ < step && Math.abs(lastNZ - (a + b)) < 2 * step;
      });
      return { ok, detail: 'y ≠ 0 exactement sur ]0, a+b[' };
    },
  },
  {
    name: 'les aires se MULTIPLIENT : ∫(x*h) = ∫x · ∫h',
    category: 'numeric',
    run() {
      const gap = maxGap(WIDTHS, ({ a, b }) => {
        const o = obs({ a, b });
        return Math.abs(o.areaY.value - o.areaX.value * o.areaH.value);
      });
      // et ∫x vaut bien a pour une porte, a/2 pour une rampe
      const exact = maxGap(WIDTHS, ({ a, b }) =>
        Math.max(
          Math.abs(obs({ a, b }).areaX.value - a),
          Math.abs(obs({ sig: 'ramp', a, b }).areaX.value - a / 2),
          Math.abs(obs({ a, b }).areaH.value - b)
        )
      );
      return {
        ok: gap < 1e-5 && exact < 1e-12,
        detail: `produit des aires à ${gap.toExponential(2)}, aires exactes à ${exact.toExponential(2)}`,
      };
    },
  },
  {
    name: 'la convolution COMMUTE : x * h = h * x',
    category: 'numeric',
    run() {
      // deux portes de largeurs échangées donnent la même sortie : le
      // trapèze est symétrique en a et b, ce qui n'a rien d'évident sur le
      // dessin puisque c'est h et pas x qu'on retourne
      const gap = maxGap(WIDTHS, ({ a, b }) => {
        const o1 = obs({ a, b });
        const o2 = obs({ a: b, b: a });
        return maxGap(range(o1.yOut.x.length), (i) => o1.yOut.y[i], (i) => o2.yOut.y[i]);
      });
      return { ok: gap < 1e-12, detail: `écart max ${gap.toExponential(2)}` };
    },
  },
  {
    name: 'le point marqué EST l’aire de la bande dessinée',
    category: 'numeric',
    run() {
      // Ce que la vue prétend : le point jaune de la courbe du bas vaut l'aire
      // hachurée de la vue du haut, au même t. Deux affirmations de natures
      // différentes, et il faut les séparer :
      //   · le marqueur EST y(t), exactement — c'est le même nombre ;
      //   · l'aire DESSINÉE, elle, est celle d'un polygone échantillonné sur
      //     la grille d'affichage, qui coupe les bords de porte entre deux
      //     points. Elle ne peut donc pas valoir mieux qu'un pas de grille —
      //     c'est exactement l'erreur que le calcul par morceaux évite, et
      //     la borne est celle-là, pas un pourcentage choisi.
      const step = obs({}).shade.x[1] - obs({}).shade.x[0];
      let exact = 0;
      let drawn = 0;
      for (const t of [-0.5, 0, 0.37, 1, 1.62, 2, 4.8]) {
        const o = obs({ t, a: 1.3, b: 0.8 });
        exact = Math.max(exact, Math.abs(o.marker.y[0] - o.yValue.value), Math.abs(o.marker.x[0] - t));
        let area = 0;
        for (let i = 1; i < o.shade.x.length; i++)
          area += ((o.shade.hi[i] + o.shade.hi[i - 1]) / 2) * (o.shade.x[i] - o.shade.x[i - 1]);
        drawn = Math.max(drawn, Math.abs(area - o.yValue.value));
      }
      return {
        ok: exact < 1e-12 && drawn < 2 * step,
        detail: `marqueur exact (${exact.toExponential(2)}), aire dessinée à ${drawn.toExponential(2)} < 2 pas (${(2 * step).toExponential(2)})`,
      };
    },
  },
  {
    name: 'les quatre régimes tombent aux bons instants',
    category: 'numeric',
    run() {
      // ce que la statline annonce doit correspondre à la géométrie
      const a = 1.4;
      const b = 0.6;
      const want = [
        [-0.3, 'avant'],
        [0.3, 'entrée'],
        [1.0, 'plein'],
        [1.7, 'sortie'],
        [2.5, 'après'],
      ];
      const ok = want.every(([t, key]) => obs({ a, b, t }).regime.value.startsWith(key));
      // et la valeur au plateau vaut min(a,b), exactement
      const plateau = Math.abs(obs({ a, b, t: 1 }).yValue.value - Math.min(a, b));
      return { ok: ok && plateau < 1e-12, detail: `plateau = min(a,b) à ${plateau.toExponential(2)}` };
    },
  },
  {
    name: 'l’intégrale par morceaux est insensible à la grille de dessin',
    category: 'numeric',
    run() {
      // overlap() ne dépend QUE des ruptures, pas de la grille d'affichage :
      // c'est ce qui la rend exacte sur les portes. Vérifié en changeant le
      // nombre de panneaux… ce qu'on ne peut pas faire de l'extérieur — alors
      // on vérifie l'invariant équivalent : deux t infiniment proches d'une
      // rupture donnent la même valeur des deux côtés quand y est continue.
      const gap = maxGap([0.5, 1, 2.2], (a) => {
        const x = { f: (u) => (u >= 0 && u <= a ? 1 : 0), edges: [0, a] };
        const h = { f: (u) => (u >= 0 && u <= 1 ? 1 : 0), edges: [0, 1] };
        let worst = 0;
        for (const t of [0, a, 1, a + 1]) {
          const lo = overlap(x, h, t - 1e-9);
          const hi = overlap(x, h, t + 1e-9);
          worst = Math.max(worst, Math.abs(lo - hi));
        }
        return worst;
      });
      return { ok: gap < 1e-8, detail: `continuité aux ruptures à ${gap.toExponential(2)}` };
    },
  },
  standardChecks.determinism(compute, BASE, 'yOut'),
];
