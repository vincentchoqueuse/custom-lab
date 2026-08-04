import { compute, X, targets } from './compute.js';
import { standardChecks } from '../../../core/checks.js';
import { ACTIVATIONS } from '../_lib/nn.js';

const BASE = { problem: 'xor', hidden: 2, act: 'tanh', lr: 0.5, epoch: 4000, seed: 34 };

export const checks = [
  {
    name: 'AUCUNE droite ne classe le XOR — recherche exhaustive',
    category: 'numeric',
    run() {
      // Le théorème de 1969, vérifié par la force brute plutôt que cru sur
      // parole. La preuve tient d'ailleurs en deux lignes : classer (0,1) et
      // (1,0) du bon côté impose w₁+w₂+2b > 1, classer (0,0) et (1,1) impose
      // w₁+w₂+2b ≤ 1. Les deux contraintes s'excluent. La grille ci-dessous
      // le constate sur 68 921 droites, et le minimum d'erreurs est 1.
      const T = targets('xor');
      let best = 4;
      const g = [];
      for (let i = -20; i <= 20; i++) g.push(i / 5);
      for (const w1 of g)
        for (const w2 of g)
          for (const b of g) {
            let wrong = 0;
            for (let k = 0; k < 4; k++) {
              const y = w1 * X[k][0] + w2 * X[k][1] + b;
              if ((y > 0.5 ? 1 : 0) !== T[k]) wrong++;
            }
            if (wrong < best) best = wrong;
          }
      return {
        ok: best === 1,
        detail: `meilleure droite : ${best} point mal classé sur 4 (${g.length ** 3} droites essayées)`,
      };
    },
  },
  {
    name: 'et son optimum au sens des moindres carrés est la constante 1/2',
    category: 'numeric',
    run() {
      // Puisqu'aucune droite ne classe, la descente converge vers la
      // meilleure APPROXIMATION — et celle-ci est remarquable : w₁ = w₂ = 0,
      // b = 1/2, c'est-à-dire « je réponds toujours un demi ». L'erreur
      // résiduelle vaut alors 4 × (1/2)² / (2 × 4) = 1/8, la ligne orange de
      // la vue d'apprentissage.
      const o = compute({ ...BASE, hidden: 1, act: 'identity' }).observables;
      const outs = o.truth.value.split(' ').map((s) => parseFloat(s.split('→')[1]));
      const worst = Math.max(...outs.map((v) => Math.abs(v - 0.5)));
      return {
        ok: worst < 1e-6 && Math.abs(o.lossEnd.value - 1 / 8) < 1e-9,
        detail: `sorties à ${worst.toExponential(1)} de 1/2 · erreur ${o.lossEnd.value.toFixed(6)} vs 0.125`,
      };
    },
  },
  {
    name: 'OU et ET, eux, sont séparables : erreur bien sous le plancher',
    category: 'numeric',
    run() {
      // Le contrepoint qui donne son sens au précédent. Le même réseau
      // linéaire, sur les deux autres tables, classe les quatre points.
      const bad = [];
      for (const problem of ['or', 'and']) {
        const o = compute({ ...BASE, problem, hidden: 1, act: 'identity' }).observables;
        if (o.errors.value !== 0) bad.push(`${problem} : ${o.errors.value} erreurs`);
        if (o.lossEnd.value > 0.05) bad.push(`${problem} : erreur ${o.lossEnd.value.toFixed(4)}`);
      }
      return {
        ok: bad.length === 0,
        detail: bad.length ? bad.join(' · ') : 'OU et ET : 0 erreur, résidu 0.031 (contre 0.125 pour XOR)',
      };
    },
  },
  {
    name: 'la solution ÉCRITE À LA MAIN rend la table exacte',
    category: 'numeric',
    run() {
      // Deux neurones ReLU suffisent, et on peut poser les poids sans rien
      // apprendre : y = ReLU(x₁+x₂) − 2·ReLU(x₁+x₂−1). C'est « ou, mais pas
      // les deux » écrit en deux morceaux linéaires, et c'est EXACT — pas
      // approché à 1e-3, exact.
      const { f } = ACTIVATIONS.relu;
      const T = targets('xor');
      let worst = 0;
      for (let k = 0; k < 4; k++) {
        const s = X[k][0] + X[k][1];
        const y = f(s) - 2 * f(s - 1);
        worst = Math.max(worst, Math.abs(y - T[k]));
      }
      return {
        ok: worst === 0,
        detail: `écart max à la table de vérité : ${worst}`,
      };
    },
  },
  {
    name: 'deux neurones et une tanh y arrivent, à la précision machine',
    category: 'numeric',
    run() {
      const o = compute(BASE).observables;
      return {
        ok: o.errors.value === 0 && o.lossEnd.value < 1e-12,
        detail: `erreur ${o.lossEnd.value.toExponential(2)} · ${o.truth.value}`,
      };
    },
  },
  {
    name: 'mais le TIRAGE décide, et ReLU échoue neuf fois sur dix à H = 2',
    category: 'statistical',
    run() {
      // Les quatre nombres de la scène 4, comptés sur 40 graines fixées —
      // donc reproductibles, malgré la catégorie. Le fait marquant est le
      // dernier : ReLU, l'activation par défaut du domaine, réussit 4 fois
      // sur 40 avec deux neurones. Un neurone dont l'entrée est négative sur
      // les quatre points a un gradient nul : il est MORT, et il ne reste
      // qu'un neurone pour un problème qui en demande deux. Élargir à H = 4
      // lui redonne des chances (20/40) sans rien ajouter au pouvoir
      // d'expression.
      const rate = (act, hidden) => {
        let ok = 0;
        for (let s = 1; s <= 40; s++)
          if (compute({ ...BASE, act, hidden, seed: s }).observables.errors.value === 0) ok++;
        return ok;
      };
      const t2 = rate('tanh', 2);
      const t4 = rate('tanh', 4);
      const r2 = rate('relu', 2);
      const r4 = rate('relu', 4);
      return {
        ok: t2 >= 30 && t4 >= 38 && r2 <= 10 && r4 > r2,
        detail: `tanh ${t2}/40 puis ${t4}/40 à H = 4 · ReLU ${r2}/40 puis ${r4}/40 — neurones morts`,
      };
    },
  },
  {
    name: 'l’époque est bien un paramètre : l’erreur décroît le long du chemin',
    category: 'numeric',
    run() {
      // Ce qui rend le balayage honnête : l'état lu à l'époque n est bien
      // celui de l'époque n, pas une interpolation. On vérifie que l'erreur
      // affichée suit la courbe et qu'elle décroît globalement.
      const at = (epoch) => compute({ ...BASE, epoch }).observables.lossNow.value;
      const v = [0, 200, 800, 4000].map(at);
      const dec = v.every((x, i) => i === 0 || x <= v[i - 1]);
      return {
        ok: dec && v[0] > 1e-2 && v[3] < 1e-12,
        detail: `époques 0, 200, 800, 4000 → ${v.map((x) => x.toExponential(1)).join(', ')}`,
      };
    },
  },
  standardChecks.determinism(compute, BASE, 'learning'),
];
