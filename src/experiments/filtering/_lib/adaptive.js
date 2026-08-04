// Le filtrage adaptatif : trois algorithmes, une seule question.
//
// Un système inconnu w* transforme une entrée u(n) en une sortie qu'on
// n'observe que bruitée, d(n) = w*ᵀu(n) + v(n). Le filtre adaptatif ne
// connaît que u et d, et doit retrouver w* en avançant — une itération par
// échantillon, sans jamais résoudre de système global.
//
//   LMS    ŵ ← ŵ + μ·e·u          le gradient stochastique, deux lignes,
//                                 une multiplication par coefficient
//   NLMS   ŵ ← ŵ + μ̃·e·u/‖u‖²     le même, avec le pas rendu sans unité :
//                                 μ̃ ∈ ]0, 2[ quelle que soit la puissance
//                                 d'entrée, ce qui est TOUTE la différence
//                                 en pratique
//   RLS    ŵ ← ŵ + k·e            les moindres carrés exacts à chaque
//                                 instant, L² opérations au lieu de L
//
// Le prix et le gain se lisent sur une seule grandeur : la matrice
// d'autocorrélation R de l'entrée. LMS suit ses valeurs propres — chaque
// mode converge à sa vitesse, donc le plus lent tient tout le monde, et le
// rapport λmax/λmin dit combien on attend. RLS blanchit implicitement par
// R⁻¹ et ne voit plus ce rapport du tout. C'est cela qu'on achète avec les
// L² multiplications.
//
// PURE : pas de DOM, pas d'état, générateur passé en argument. Importable
// depuis compute.js ET check.js.

import { jacobiSym } from '../../../core/numeric.js';

/**
 * Le système à identifier : une réponse impulsionnelle oscillante et
 * amortie, de norme 1 pour que la puissance du signal utile ne dépende pas
 * de L. Déterministe — ce n'est pas elle qu'on tire au sort.
 *
 * @param {number} L longueur
 * @param {number} variant 0 = le canal nominal, 1 = celui d'après le saut
 */
export function trueChannel(L, variant = 0) {
  const w = new Float64Array(L);
  let norm = 0;
  for (let k = 0; k < L; k++) {
    // le second canal n'est pas un bruit : c'est le MÊME système avec une
    // oscillation plus rapide et le premier coefficient inversé, de sorte
    // que le saut se voie sur le tracé des coefficients
    w[k] = variant === 0
      ? Math.cos(0.4 * Math.PI * k) * Math.exp(-0.25 * k)
      : -Math.cos(0.75 * Math.PI * k) * Math.exp(-0.2 * k);
    norm += w[k] * w[k];
  }
  norm = Math.sqrt(norm);
  for (let k = 0; k < L; k++) w[k] /= norm;
  return w;
}

/**
 * Entrée AR(1) de variance UNITÉ : u(n) = a·u(n−1) + √(1−a²)·g(n).
 *
 * Le facteur √(1−a²) n'est pas cosmétique — sans lui, colorer l'entrée en
 * augmenterait aussi la puissance, et le ralentissement de LMS qu'on veut
 * attribuer au conditionnement viendrait pour partie d'un pas devenu trop
 * grand. À variance fixée, il ne reste qu'une explication possible.
 */
export function ar1Input(N, a, gauss) {
  const u = new Float64Array(N);
  const s = Math.sqrt(1 - a * a);
  let prev = 0;
  for (let n = 0; n < N; n++) {
    prev = a * prev + s * gauss();
    u[n] = prev;
  }
  return u;
}

/** Autocorrélation EXACTE d'une AR(1) de variance 1 : R[i][j] = a^|i−j|. */
export function toeplitzAR1(a, L) {
  const R = new Float64Array(L * L);
  for (let i = 0; i < L; i++) for (let j = 0; j < L; j++) R[i * L + j] = a ** Math.abs(i - j);
  return R;
}

/** Valeurs propres extrêmes et conditionnement d'une matrice symétrique. */
export function eigSpread(R, L) {
  const eig = jacobiSym(Float64Array.from(R), L);
  let lo = Infinity;
  let hi = -Infinity;
  for (const v of eig.values) {
    if (v < lo) lo = v;
    if (v > hi) hi = v;
  }
  return { min: lo, max: hi, spread: hi / lo, vectors: eig.vectors, values: eig.values };
}

/**
 * La borne de stabilité de LMS en MOYENNE QUADRATIQUE : le plus grand pas
 * tel que Σ_i μλ_i/(1−μλ_i) < 2.
 *
 * Ce n'est pas la borne des livres. μ < 2/tr(R) assure la convergence de la
 * MOYENNE de ŵ, ce qui n'empêche pas sa variance d'exploser — et c'est bien
 * la variance qui décide, comme le montre la mesure : à L = 8, entrée
 * blanche, on diverge à 0.195 quand 2/tr(R) annonce 0.25 et que cette
 * borne-ci annonce 0.200.
 *
 * Elle suppose encore le régresseur indépendant du filtre, et cette
 * hypothèse casse quand l'entrée est corrélée : à a = 0.9 le seuil réel
 * tombe à 0.038 contre 0.104 annoncés. Une borne théorique optimiste d'un
 * facteur 2.7 est une chose que l'expérience doit MONTRER, pas cacher.
 */
export function msBound(values) {
  const lMax = Math.max(...values);
  let lo = 0;
  let hi = 1 / lMax;
  for (let i = 0; i < 80; i++) {
    const m = (lo + hi) / 2;
    let s = 0;
    for (const l of values) s += (m * l) / (1 - m * l);
    if (s < 2) lo = m;
    else hi = m;
  }
  return lo;
}

/** xᵀRx — la puissance d'un filtre à l'entrée, exactement. */
export function quadForm(R, x, L) {
  let s = 0;
  for (let i = 0; i < L; i++) {
    let row = 0;
    for (let j = 0; j < L; j++) row += R[i * L + j] * x[j];
    s += x[i] * row;
  }
  return s;
}

/**
 * UNE réalisation de l'adaptation.
 *
 * Rend l'erreur instantanée au CARRÉ à chaque itération — c'est elle qu'on
 * moyenne sur des réalisations indépendantes pour obtenir une courbe
 * d'apprentissage. Une seule réalisation est illisible : e²(n) fluctue sur
 * deux décades autour de sa moyenne, et l'œil y voit une décroissance là
 * où il n'y en a pas encore.
 *
 * @param {object} o
 * @param {'lms'|'nlms'|'rls'} o.algo
 * @param {number} o.mu     pas (μ pour LMS, μ̃ normalisé pour NLMS)
 * @param {number} o.lambda facteur d'oubli (RLS)
 * @param {number} o.L      longueur du filtre
 * @param {number} o.N      nombre d'itérations
 * @param {Float64Array} o.u      entrée
 * @param {Float64Array} o.wTrue  système à identifier
 * @param {Float64Array} [o.wAfter] système après le saut (poursuite)
 * @param {number} [o.switchAt]   instant du saut, ou 0
 * @param {number} o.sigmaV       écart-type du bruit de mesure
 * @param {() => number} o.gauss
 * @param {boolean} [o.keepPath]  garder la trajectoire des coefficients
 * @param {Float64Array} [o.R]    autocorrélation L×L — si fournie, l'excès
 *   d'EQM w̃ᵀRw̃ est rendu à chaque itération
 * @returns {{e2: Float64Array, ex: Float64Array|null, wPath: Float64Array|null,
 *            wFinal: Float64Array, diverged: boolean}}
 */
export function runAdaptive({
  algo,
  mu,
  lambda = 1,
  L,
  N,
  u,
  wTrue,
  wAfter = null,
  switchAt = 0,
  sigmaV,
  gauss,
  keepPath = false,
  R = null,
  p0 = 1e4,
}) {
  const w = new Float64Array(L); // ŵ(0) = 0 : on ne suppose rien
  const x = new Float64Array(L); // le régresseur, du plus récent au plus vieux
  const e2 = new Float64Array(N);
  const wPath = keepPath ? new Float64Array(N * L) : null;
  // L'EXCÈS d'EQM, w̃ᵀRw̃ : la seule grandeur du montage qui mesure
  // l'adaptation SANS le bruit de mesure. e²(n) contient σ² plus quelques
  // pour-cent d'excès, et estimer ces quelques pour-cent à travers la
  // variance de σ² demanderait des dizaines de milliers d'itérations — au
  // pas nominal, la lecture faite sur e² se trompe d'un facteur 1.5. Ici le
  // bruit n'entre pas : ŵ est ce qu'il est, et son écart à w* se calcule.
  const ex = R ? new Float64Array(N) : null;
  const wErrVec = R ? new Float64Array(L) : null;

  // RLS : P = δ⁻¹I. δ = 1/p0 est la régularisation de départ — « aucune
  // information a priori » quand elle tend vers zéro, ce qui rend les L
  // premières itérations équivalentes à une résolution exacte du système.
  // La valeur par défaut reste modérée (δ = 1e-4) pour que les toutes
  // premières itérations ne soient pas numériquement folles à l'écran ; le
  // harnais, lui, la pousse à 1e-10 pour épingler l'identité EXACTE.
  const P = algo === 'rls' ? new Float64Array(L * L) : null;
  const Px = algo === 'rls' ? new Float64Array(L) : null;
  const kg = algo === 'rls' ? new Float64Array(L) : null;
  if (P) for (let i = 0; i < L; i++) P[i * L + i] = p0;

  let diverged = false;

  for (let n = 0; n < N; n++) {
    // régresseur : u(n), u(n−1), … (zéros avant le début, comme un vrai
    // filtre qui démarre)
    for (let k = 0; k < L; k++) x[k] = n - k >= 0 ? u[n - k] : 0;

    const wRef = wAfter && switchAt && n >= switchAt ? wAfter : wTrue;
    let d = 0;
    for (let k = 0; k < L; k++) d += wRef[k] * x[k];
    d += sigmaV * gauss();

    let y = 0;
    for (let k = 0; k < L; k++) y += w[k] * x[k];
    const e = d - y;
    e2[n] = e * e;

    if (!Number.isFinite(e) || e2[n] > 1e12) {
      // Une divergence est un RÉSULTAT (μ au-dessus de la borne), pas une
      // panne : on la note, on gèle la courbe à une valeur énorme mais
      // finie, et le tracé reste lisible au lieu de disparaître.
      diverged = true;
      for (let m = n; m < N; m++) e2[m] = 1e12;
      if (ex) for (let m = n; m < N; m++) ex[m] = 1e12;
      if (wPath) for (let m = n; m < N; m++) for (let k = 0; k < L; k++) wPath[m * L + k] = w[k];
      break;
    }

    if (algo === 'lms') {
      for (let k = 0; k < L; k++) w[k] += mu * e * x[k];
    } else if (algo === 'nlms') {
      let nx = 1e-8;
      for (let k = 0; k < L; k++) nx += x[k] * x[k];
      const g = (mu * e) / nx;
      for (let k = 0; k < L; k++) w[k] += g * x[k];
    } else {
      // P·x, puis le gain de Kalman k = Px / (λ + xᵀPx)
      let xpx = 0;
      for (let i = 0; i < L; i++) {
        let s = 0;
        for (let j = 0; j < L; j++) s += P[i * L + j] * x[j];
        Px[i] = s;
        xpx += x[i] * s;
      }
      const den = lambda + xpx;
      for (let i = 0; i < L; i++) kg[i] = Px[i] / den;
      for (let i = 0; i < L; i++) w[i] += kg[i] * e;
      // P ← (P − k·(Px)ᵀ)/λ — symétrisée en fin de mise à jour, sans quoi
      // l'arrondi la fait dériver vers une matrice non symétrique et
      // l'algorithme finit par exploser après quelques milliers d'itérations
      for (let i = 0; i < L; i++)
        for (let j = 0; j < L; j++) P[i * L + j] = (P[i * L + j] - kg[i] * Px[j]) / lambda;
      for (let i = 0; i < L; i++)
        for (let j = i + 1; j < L; j++) {
          const s = 0.5 * (P[i * L + j] + P[j * L + i]);
          P[i * L + j] = s;
          P[j * L + i] = s;
        }
    }

    if (wPath) for (let k = 0; k < L; k++) wPath[n * L + k] = w[k];
    if (ex) {
      for (let k = 0; k < L; k++) wErrVec[k] = w[k] - wRef[k];
      ex[n] = quadForm(R, wErrVec, L);
    }
  }

  return { e2, ex, wPath, wFinal: w, diverged };
}

/**
 * L'erreur a posteriori : ce que le filtre AURAIT donné sur le même
 * échantillon, une fois la mise à jour faite. C'est la grandeur qui définit
 * NLMS — à μ̃ = 1 elle est exactement nulle, et le harnais l'épingle.
 */
export function posterioriError({ x, d, w, mu, L }) {
  let y = 0;
  for (let k = 0; k < L; k++) y += w[k] * x[k];
  const e = d - y;
  let nx = 0;
  for (let k = 0; k < L; k++) nx += x[k] * x[k];
  const wNew = Float64Array.from(w);
  for (let k = 0; k < L; k++) wNew[k] += ((mu * e) / nx) * x[k];
  let yNew = 0;
  for (let k = 0; k < L; k++) yNew += wNew[k] * x[k];
  return d - yNew;
}

/**
 * Iso-contours de la surface d'erreur, pour L = 2 : J(w) = σ² + (w−w*)ᵀR(w−w*)
 * est un paraboloïde, donc ses niveaux sont des ELLIPSES d'axes les vecteurs
 * propres de R et de demi-longueurs √(c/λ). C'est la figure qui explique
 * tout le reste : à entrée blanche R = I, les ellipses sont des cercles et
 * le gradient pointe vers le fond ; colorée, elles s'allongent dans le
 * rapport λmax/λmin et la descente zigzague au lieu de descendre.
 *
 * Calculé ICI et pas dans la vue : une vue ne fait pas de science.
 */
export function costContour(R, wTrue, level, points = 128) {
  const { values, vectors } = eigSpread(R, 2);
  const x = new Float64Array(points + 1);
  const y = new Float64Array(points + 1);
  for (let i = 0; i <= points; i++) {
    const t = (2 * Math.PI * i) / points;
    const r0 = Math.sqrt(level / Math.max(values[0], 1e-12)) * Math.cos(t);
    const r1 = Math.sqrt(level / Math.max(values[1], 1e-12)) * Math.sin(t);
    // retour dans la base des coefficients : w = w* + Q·r
    x[i] = wTrue[0] + vectors[0] * r0 + vectors[1] * r1;
    y[i] = wTrue[1] + vectors[2] * r0 + vectors[3] * r1;
  }
  return { x, y };
}
