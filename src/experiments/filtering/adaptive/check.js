import { compute } from './compute.js';
import { standardChecks } from '../../../core/checks.js';
import { mulberry32, gaussFrom } from '../../../core/rng.js';
import {
  trueChannel,
  ar1Input,
  toeplitzAR1,
  eigSpread,
  quadForm,
  runAdaptive,
  posterioriError,
  msBound,
} from '../_lib/adaptive.js';

const BASE = {
  algo: 'lms',
  mu: 0.01,
  lambda: 1,
  L: 8,
  a: 0,
  snr: 20,
  n: 3000,
  track: false,
  seed: 34,
};

export const checks = [
  {
    name: 'NLMS à μ̃ = 1 annule EXACTEMENT l’erreur a posteriori',
    category: 'numeric',
    run() {
      // L'identité qui DÉFINIT NLMS, et la raison de la normalisation : le
      // pas est choisi pour que le filtre mis à jour explique exactement
      // l'échantillon qu'il vient de voir. Rien de statistique là-dedans —
      // c'est une projection orthogonale, donc c'est exact à la précision
      // machine, et à μ̃ = 2 l'erreur est exactement l'opposée de l'erreur
      // a priori (le pas double franchit la cible, symétriquement).
      const gauss = gaussFrom(mulberry32(7));
      const L = 6;
      let worst1 = 0;
      let worstSym = 0;
      for (let trial = 0; trial < 200; trial++) {
        const x = Float64Array.from({ length: L }, () => gauss());
        const w = Float64Array.from({ length: L }, () => gauss());
        const d = gauss();
        worst1 = Math.max(worst1, Math.abs(posterioriError({ x, d, w, mu: 1, L })));
        let y = 0;
        for (let k = 0; k < L; k++) y += w[k] * x[k];
        const ePrior = d - y;
        worstSym = Math.max(
          worstSym,
          Math.abs(posterioriError({ x, d, w, mu: 2, L }) + ePrior)
        );
      }
      return {
        ok: worst1 < 1e-12 && worstSym < 1e-12,
        detail: `μ̃=1 : |e⁺| ≤ ${worst1.toExponential(1)} · μ̃=2 : |e⁺+e| ≤ ${worstSym.toExponential(1)}`,
      };
    },
  },
  {
    name: 'RLS sans bruit retrouve le système en EXACTEMENT L itérations',
    category: 'numeric',
    run() {
      // RLS n'approche pas la solution des moindres carrés : il EST cette
      // solution, à chaque instant. Sans bruit et avec L équations
      // indépendantes, le système est déterminé — donc à l'itération L le
      // filtre vaut w*, à l'erreur d'arrondi et à la régularisation δ près.
      // Un algorithme de gradient, lui, n'y arrive jamais en temps fini.
      const L = 5;
      const N = 40;
      const gauss = gaussFrom(mulberry32(11));
      const u = ar1Input(N, 0, gauss);
      const wTrue = trueChannel(L, 0);
      const res = runAdaptive({
        algo: 'rls',
        mu: 0,
        lambda: 1,
        L,
        N,
        u,
        wTrue,
        sigmaV: 0,
        gauss: () => 0,
        keepPath: true,
        p0: 1e10, // δ = 1e-10 : « aucune information a priori », donc LS exacts
      });
      const errAt = (n) => {
        let s = 0;
        for (let k = 0; k < L; k++) s += (res.wPath[(n - 1) * L + k] - wTrue[k]) ** 2;
        return Math.sqrt(s);
      };
      // avant L, le système est sous-déterminé : l'erreur ne peut pas être nulle
      return {
        ok: errAt(L) < 1e-6 && errAt(L - 1) > 1e-3,
        detail: `n=L−1 : ${errAt(L - 1).toExponential(1)} · n=L : ${errAt(L).toExponential(1)}`,
      };
    },
  },
  {
    name: 'le pas critique est celui de la MOYENNE QUADRATIQUE, pas 2/tr(R)',
    category: 'numeric',
    run() {
      // μ < 2/tr(R) est la borne des livres : elle fait converger la MOYENNE
      // de ŵ, et pas sa variance. C'est la seconde qui décide. Le seuil de
      // divergence mesuré (dichotomie sur 3000 itérations) doit donc rester
      // sous 2/tr(R) et coller à la racine de Σ μλ/(1−μλ) = 2.
      const bad = [];
      const thr = (L, a) => {
        let lo = 1e-3;
        let hi = 2 / L;
        for (let i = 0; i < 16; i++) {
          const m = (lo + hi) / 2;
          const div = compute({ ...BASE, L, a, mu: m }).observables.state.value === '⚠ divergé';
          if (div) hi = m;
          else lo = m;
        }
        return lo;
      };
      const rows = [];
      for (const L of [4, 8, 16]) {
        const measured = thr(L, 0);
        const ms = msBound(eigSpread(toeplitzAR1(0, L), L).values);
        rows.push(`L=${L} : ${measured.toFixed(3)} vs ${ms.toFixed(3)}`);
        if (measured > 2 / L) bad.push(`L=${L} : diverge au-dessus de 2/tr(R)`);
        // 15 % : l'hypothèse d'indépendance est d'autant plus lâche que L
        // est petit (L = 4 arrive à 1.12) et, tout près du seuil, la
        // divergence est si lente que 3000 itérations ne suffisent pas
        // toujours à la déclarer — les deux biais vont dans le même sens.
        if (Math.abs(measured / ms - 1) > 0.15) bad.push(`L=${L} : ${(measured / ms).toFixed(2)}× la borne`);
      }
      return {
        ok: bad.length === 0,
        detail: bad.length ? bad.join(' · ') : `seuil mesuré vs borne quadratique — ${rows.join(' · ')}`,
      };
    },
  },
  {
    name: 'sur entrée colorée, la borne théorique devient franchement optimiste',
    category: 'numeric',
    run() {
      // Le corollaire, et il vaut d'être projeté : toutes ces bornes
      // supposent le régresseur indépendant du filtre. Corrélez l'entrée et
      // l'hypothèse casse — le pas critique tombe à moins de la moitié de
      // ce qu'annonce la théorie. Un réglage « dans les clous » y diverge.
      const L = 8;
      const a = 0.9;
      const ms = msBound(eigSpread(toeplitzAR1(a, L), L).values);
      let lo = 1e-3;
      let hi = 2 / L;
      for (let i = 0; i < 16; i++) {
        const m = (lo + hi) / 2;
        const div = compute({ ...BASE, L, a, mu: m }).observables.state.value === '⚠ divergé';
        if (div) hi = m;
        else lo = m;
      }
      return {
        ok: lo < 0.6 * ms,
        detail: `seuil réel ${lo.toFixed(4)} contre ${ms.toFixed(4)} annoncés (×${(ms / lo).toFixed(1)} d'optimisme)`,
      };
    },
  },
  {
    name: 'désajustement mesuré = μ·tr(R)/(2−μ·tr(R)), sur trois pas',
    category: 'statistical',
    run() {
      // La loi du marché vitesse/précision, celle que la scène 2 projette.
      // Tolérance à 12 % : la mesure est une moyenne d'ensemble sur 24
      // réalisations et 750 itérations corrélées, et la théorie elle-même
      // suppose l'indépendance du régresseur et du filtre. Les trois pas
      // doivent tomber dessus, pas seulement un.
      const bad = [];
      for (const mu of [0.005, 0.01, 0.02]) {
        const o = compute({ ...BASE, mu }).observables;
        const r = o.misMeas.value / o.misTheo.value;
        if (!(r > 0.88 && r < 1.12)) bad.push(`μ=${mu} : ${r.toFixed(3)}`);
      }
      return {
        ok: bad.length === 0,
        detail: bad.length ? bad.join(' · ') : 'mesuré/théorie ∈ [0.88, 1.12] pour μ = 0.005, 0.01, 0.02',
      };
    },
  },
  {
    name: 'NLMS : le désajustement porte la correction L/(L−2), pas l’asymptotique',
    category: 'statistical',
    run() {
      // μ̃/(2−μ̃) est le résultat des livres, et il est faux d'un facteur 2
      // à L = 4. Le facteur manquant est E[‖x‖²]·E[1/‖x‖²] = L/(L−2) pour
      // un régresseur blanc gaussien — mesuré ici de L = 4 à L = 16, où
      // l'asymptotique se tromperait de 100 %, 37 % et 18 %.
      const bad = [];
      for (const L of [4, 8, 16]) {
        const o = compute({ ...BASE, algo: 'nlms', mu: 0.5, L }).observables;
        const r = o.misMeas.value / o.misTheo.value;
        const naive = o.misMeas.value / (0.5 / 1.5);
        if (!(r > 0.9 && r < 1.1)) bad.push(`L=${L} : corrigé ${r.toFixed(3)}, brut ${naive.toFixed(2)}`);
      }
      return {
        ok: bad.length === 0,
        detail: bad.length ? bad.join(' · ') : 'mesuré/théorie ∈ [0.9, 1.1] pour L = 4, 8, 16',
      };
    },
  },
  {
    name: 'RLS ne subit pas le conditionnement, LMS le subit tout entier',
    category: 'statistical',
    run() {
      // LE résultat de l'expérience, et il ne s'illustre pas : il se
      // mesure. Colorer l'entrée à puissance constante multiplie le
      // conditionnement par 113 et le temps de convergence de LMS par
      // 3.5 ; RLS ne bouge pas d'une itération.
      const lmsW = compute({ ...BASE, a: 0 }).observables;
      const lmsC = compute({ ...BASE, a: 0.9 }).observables;
      const rlsW = compute({ ...BASE, algo: 'rls', a: 0 }).observables;
      const rlsC = compute({ ...BASE, algo: 'rls', a: 0.9 }).observables;
      const slow = lmsC.n3.value / lmsW.n3.value;
      const rlsRatio = rlsC.n3.value / rlsW.n3.value;
      return {
        ok:
          lmsC.spread.value > 50 &&
          Math.abs(lmsC.spread.value - rlsC.spread.value) < 1e-9 &&
          slow > 2.5 &&
          rlsRatio < 1.5,
        detail:
          `conditionnement ${lmsC.spread.value.toFixed(0)} · LMS ${lmsW.n3.value}→${lmsC.n3.value} ` +
          `(×${slow.toFixed(1)}) · RLS ${rlsW.n3.value}→${rlsC.n3.value}`,
      };
    },
  },
  {
    name: 'le conditionnement mesuré reste sous sa limite de Szegő et y monte',
    category: 'numeric',
    run() {
      // Les valeurs propres d'une Toeplitz sont encadrées par les extrêmes
      // de la densité spectrale qui l'engendre, et y tendent quand la
      // taille croît (Grenander–Szegő). Pour une AR(1) cela donne
      // λmax/λmin ≤ ((1+a)/(1−a))², atteint seulement à la limite : c'est
      // ce qui rend honnête la phrase « le conditionnement tend vers 361 »
      // des notes de la scène 3, où l'on n'en mesure que 113.
      const a = 0.9;
      const limit = ((1 + a) / (1 - a)) ** 2;
      const s = [4, 8, 16, 32].map((L) => eigSpread(toeplitzAR1(a, L), L).spread);
      const under = s.every((v) => v < limit);
      const growing = s.every((v, i) => i === 0 || v > s[i - 1]);
      return {
        ok: under && growing && s[s.length - 1] > 0.5 * limit,
        detail: `L=4…32 : ${s.map((v) => v.toFixed(0)).join(' < ')} < ${limit.toFixed(0)}`,
      };
    },
  },
  {
    name: 'l’entrée colorée garde EXACTEMENT sa puissance',
    category: 'statistical',
    run() {
      // Le détail sans lequel toute la scène 3 serait un artefact : si
      // colorer l'entrée en changeait aussi la puissance, le ralentissement
      // de LMS s'expliquerait par un pas devenu inadapté et non par le
      // conditionnement. Le facteur √(1−a²) est là pour ça — vérifié à
      // 4 écarts-types, SE = √(2/N) pour une variance empirique gaussienne.
      const N = 200000;
      const tol = 4 * Math.sqrt(2 / N);
      const bad = [];
      for (const a of [0, 0.5, 0.9, 0.95]) {
        const u = ar1Input(N, a, gaussFrom(mulberry32(3)));
        let p = 0;
        for (let i = 0; i < N; i++) p += (u[i] * u[i]) / N;
        if (Math.abs(p - 1) > tol) bad.push(`a=${a} : ${p.toFixed(4)}`);
      }
      return {
        ok: bad.length === 0,
        detail: bad.length ? bad.join(' · ') : `puissance = 1 ± ${tol.toFixed(4)} pour a = 0…0.95`,
      };
    },
  },
  {
    name: 'la puissance utile annoncée est bien w*ᵀRw*',
    category: 'statistical',
    run() {
      // Le SNR affiché doit être le vrai : la puissance du signal utile
      // n'est ‖w*‖² que sur une entrée blanche, et vaut w*ᵀRw* en général.
      // On compare la forme quadratique exacte à une mesure directe.
      const L = 8;
      const a = 0.9;
      const N = 200000;
      const w = trueChannel(L, 0);
      const exact = quadForm(toeplitzAR1(a, L), w, L);
      const u = ar1Input(N, a, gaussFrom(mulberry32(5)));
      let p = 0;
      for (let n = L; n < N; n++) {
        let y = 0;
        for (let k = 0; k < L; k++) y += w[k] * u[n - k];
        p += (y * y) / (N - L);
      }
      const tol = 4 * exact * Math.sqrt(2 / (N / L)); // échantillons corrélés sur L retards
      return {
        ok: Math.abs(p - exact) < tol,
        detail: `mesuré ${p.toFixed(4)} vs exact ${exact.toFixed(4)} (tol ${tol.toFixed(4)})`,
      };
    },
  },
  standardChecks.determinism(compute, BASE, 'learning'),
  standardChecks.determinism(compute, { ...BASE, algo: 'rls' }, 'excess'),
];
