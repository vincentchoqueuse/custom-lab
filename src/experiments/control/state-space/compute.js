// La représentation d'état, et la seule question qui compte : qu'est-ce qui
// est le SYSTÈME, et qu'est-ce qui n'est que la façon de l'écrire ?
//
//   ẋ = A x + B u        x ∈ ℝ²   l'ÉTAT
//   y  = C x + D u                la SORTIE
//
// Le procédé est un second ordre — le même que partout ailleurs dans le
// sujet — mais écrit trois fois, dans trois bases différentes :
//
//   compagne   la forme des manuels, celle qu'on obtient d'une équation
//              différentielle : x = (y, ẏ)
//   modale     A diagonale (ou blocs 2×2 réels) : les états sont les MODES,
//              découplés, chacun évoluant seul
//   physique   une base quelconque, obtenue par un changement de base T
//              choisi sans signification particulière
//
// Ce que l'expérience montre, et que le harnais démontre :
//
//  1. LES TROIS DONNENT LA MÊME SORTIE, à 1e-12 près. La trajectoire de
//     l'ÉTAT, elle, est complètement différente d'une base à l'autre.
//     L'état n'est pas observable de l'extérieur ; il est un choix.
//
//  2. LES VALEURS PROPRES DE A SONT LES PÔLES, et elles sont INVARIANTES
//     par changement de base : det(sI − A) ne dépend pas de T, puisque
//     T⁻¹AT a le même polynôme caractéristique. Les pôles sont au système,
//     la base est à celui qui écrit.
//
//  3. LA FONCTION DE TRANSFERT C(sI−A)⁻¹B + D EST LA MÊME dans les trois
//     bases, et c'est exactement la même que celle du second ordre du
//     chapitre précédent. Vérifié point par point sur tout le Bode.
//
// Rien n'est intégré numériquement : la réponse indicielle du second ordre
// est en forme close (réutilisée de `second-order`), et l'état s'en déduit
// analytiquement dans chaque base. Aucun schéma d'intégration ne peut donc
// être accusé si les trois courbes divergent — elles ne divergent pas.
// PURE, stateless, seeded — runs in a worker; deterministic at fixed seed.
import { bodeSweep } from '../../../core/bode.js';
import { stepValue, impulseValue } from '../second-order/compute.js';

const NT = 700;
const NW = 361;

/** Les trois écritures du même second ordre K·ω₀²/(s²+2mω₀s+ω₀²). */
export function realization(basis, { K, m, w0 }) {
  if (basis === 'modal') {
    // base modale : A porte les pôles. Pour m < 1 les pôles sont complexes
    // conjugués et la forme réelle équivalente est le bloc rotation-décroissance
    const s = m * w0;
    if (m < 1) {
      const wd = w0 * Math.sqrt(1 - m * m);
      return {
        A: [[-s, wd], [-wd, -s]],
        B: [0, 1],
        C: [(K * w0 * w0) / wd, 0],
        D: 0,
        label: ['mode (réel)', 'mode (imag)'],
      };
    }
    const r = w0 * Math.sqrt(m * m - 1);
    const p1 = -s + r;
    const p2 = -s - r;
    return {
      A: [[p1, 0], [0, p2]],
      B: [1, 1],
      C: [(K * w0 * w0) / (p1 - p2), (-K * w0 * w0) / (p1 - p2)],
      D: 0,
      label: ['mode 1', 'mode 2'],
    };
  }
  if (basis === 'physical') {
    // une base quelconque : la compagne vue à travers T = [[1,1],[0,2]]
    const c = realization('companion', { K, m, w0 });
    return changeBasis(c, [[1, 1], [0, 2]], ['x̃₁', 'x̃₂']);
  }
  // compagne : x = (y, ẏ), la forme qui sort d'une équation différentielle
  return {
    A: [[0, 1], [-w0 * w0, -2 * m * w0]],
    B: [0, K * w0 * w0],
    C: [1, 0],
    D: 0,
    label: ['y', 'ẏ'],
  };
}

/** z = T⁻¹x : (A,B,C,D) → (T⁻¹AT, T⁻¹B, CT, D). */
export function changeBasis({ A, B, C, D }, T, label) {
  const det = T[0][0] * T[1][1] - T[0][1] * T[1][0];
  const Ti = [
    [T[1][1] / det, -T[0][1] / det],
    [-T[1][0] / det, T[0][0] / det],
  ];
  const mul = (P, Q) => [
    [P[0][0] * Q[0][0] + P[0][1] * Q[1][0], P[0][0] * Q[0][1] + P[0][1] * Q[1][1]],
    [P[1][0] * Q[0][0] + P[1][1] * Q[1][0], P[1][0] * Q[0][1] + P[1][1] * Q[1][1]],
  ];
  const mv = (P, v) => [P[0][0] * v[0] + P[0][1] * v[1], P[1][0] * v[0] + P[1][1] * v[1]];
  const vm = (v, P) => [v[0] * P[0][0] + v[1] * P[1][0], v[0] * P[0][1] + v[1] * P[1][1]];
  return { A: mul(Ti, mul(A, T)), B: mv(Ti, B), C: vm(C, T), D, label };
}

/** H(jω) = C(jωI − A)⁻¹B + D, en complexes 2×2 — aucune inversion générique. */
export function transferOf({ A, B, C, D }, w) {
  // (jωI − A) = [[jω−a11, −a12], [−a21, jω−a22]]
  const re = [
    [-A[0][0], -A[0][1]],
    [-A[1][0], -A[1][1]],
  ];
  const im = [
    [w, 0],
    [0, w],
  ];
  // déterminant complexe
  const dr = re[0][0] * re[1][1] - im[0][0] * im[1][1] - (re[0][1] * re[1][0] - im[0][1] * im[1][0]);
  const di = re[0][0] * im[1][1] + im[0][0] * re[1][1] - (re[0][1] * im[1][0] + im[0][1] * re[1][0]);
  // adjointe : [[d22, −d12], [−d21, d11]]
  const adjRe = [
    [re[1][1], -re[0][1]],
    [-re[1][0], re[0][0]],
  ];
  const adjIm = [
    [im[1][1], -im[0][1]],
    [-im[1][0], im[0][0]],
  ];
  // C·adj·B, puis division par le déterminant
  let nr = 0;
  let ni = 0;
  for (let i = 0; i < 2; i++)
    for (let j = 0; j < 2; j++) {
      nr += C[i] * adjRe[i][j] * B[j];
      ni += C[i] * adjIm[i][j] * B[j];
    }
  const d = dr * dr + di * di;
  return [(nr * dr + ni * di) / d + D, (ni * dr - nr * di) / d];
}

/** Les valeurs propres de A — les pôles, invariants par changement de base. */
export function eigen(A) {
  const tr = A[0][0] + A[1][1];
  const det = A[0][0] * A[1][1] - A[0][1] * A[1][0];
  const disc = tr * tr - 4 * det;
  if (disc >= 0) {
    const r = Math.sqrt(disc);
    return [
      [(tr + r) / 2, 0],
      [(tr - r) / 2, 0],
    ];
  }
  const r = Math.sqrt(-disc);
  return [
    [tr / 2, r / 2],
    [tr / 2, -r / 2],
  ];
}

/**
 * @param {{basis: string, K: number, m: number, w0: number, seed: number}} params
 * @returns {{observables: Object}}
 */
export function compute({ basis, K, m, w0 }) {
  const sys = realization(basis, { K, m, w0 });

  /* ---------- temporel : la sortie, et les DEUX états ---------------------- */
  // La sortie est la forme close du second ordre. Les états sont obtenus
  // analytiquement dans la base compagne (y et ẏ), puis transportés dans la
  // base demandée — donc sans intégration, et sans dérive possible.
  const T = 9 / (m * w0);
  const t = new Float64Array(NT);
  const y = new Float64Array(NT);
  const x1 = new Float64Array(NT);
  const x2 = new Float64Array(NT);
  for (let i = 0; i < NT; i++) {
    const ti = (i * T) / (NT - 1);
    t[i] = ti;
    y[i] = stepValue(K, m, w0, ti);
    // dans la base compagne : x = (y, ẏ), et ẏ pour un échelon EST h(t)
    const xc = [y[i], impulseValue(K, m, w0, ti)];
    const z = stateIn(basis, xc, { K, m, w0 });
    x1[i] = z[0];
    x2[i] = z[1];
  }

  /* ---------- le plan de phase : la trajectoire de l'état ----------------- */
  // la même trajectoire que ci-dessus, tracée x₂ contre x₁

  /* ---------- fréquentiel : H(jω) reconstituée depuis (A,B,C,D) ----------- */
  const sweep = bodeSweep((w) => transferOf(sys, w), { center: w0, decades: 1.5, n: NW });

  /* ---------- les pôles = les valeurs propres de A ------------------------ */
  const ev = eigen(sys.A);
  const poles = { x: Float64Array.from(ev.map((e) => e[0])), y: Float64Array.from(ev.map((e) => e[1])) };

  return {
    observables: {
      stepResponse: { x: t, y },
      state1: { x: t, y: x1 },
      state2: { x: t, y: x2 },
      trajectory: { x: x1, y: x2 },
      start: { x: Float64Array.from([x1[0]]), y: Float64Array.from([x2[0]]) },
      poles,
      gain: { x: sweep.w, y: sweep.gainDb },
      phase: { x: sweep.w, y: sweep.phaseDeg },
      trace: { value: sys.A[0][0] + sys.A[1][1], meta: { label: 'tr A = −2mω₀', precision: 4 } },
      determinant: {
        value: sys.A[0][0] * sys.A[1][1] - sys.A[0][1] * sys.A[1][0],
        meta: { label: 'det A = ω₀²', precision: 4 },
      },
      poleRe: { value: ev[0][0], meta: { label: 'Re(pôle)', precision: 4 } },
      poleIm: { value: Math.abs(ev[0][1]), meta: { label: '|Im(pôle)|', precision: 4 } },
      names: {
        value: sys.label.join(' · '),
        meta: { label: "les deux composantes de l'état" },
      },
    },
  };
}

/** L'état de la base compagne, exprimé dans la base demandée. */
function stateIn(basis, xc, p) {
  if (basis === 'companion') return xc;
  if (basis === 'physical') {
    // z = T⁻¹x avec T = [[1,1],[0,2]]  ⇒  T⁻¹ = [[1,−1/2],[0,1/2]]
    return [xc[0] - xc[1] / 2, xc[1] / 2];
  }
  // base modale : z tel que x = M z, avec M la matrice des vecteurs propres
  const { m, w0 } = p;
  if (m < 1) {
    const s = m * w0;
    const wd = w0 * Math.sqrt(1 - m * m);
    // x₁ = z₁, x₂ = ẏ = −s·z₁ + wd·z₂  ⇒  z₂ = (x₂ + s·x₁)/wd
    return [xc[0], (xc[1] + s * xc[0]) / wd];
  }
  const r = w0 * Math.sqrt(m * m - 1);
  const p1 = -m * w0 + r;
  const p2 = -m * w0 - r;
  // x₁ = z₁ + z₂, x₂ = p1·z₁ + p2·z₂
  const det = p2 - p1;
  return [(p2 * xc[0] - xc[1]) / det, (xc[1] - p1 * xc[0]) / det];
}
