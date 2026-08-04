// L'analyse en composantes principales, réduite à ce qu'elle est : la
// décomposition propre d'une matrice de covariance.
//
// C'est exactement la brique du sujet « techniques haute résolution », où
// les valeurs propres d'une covariance séparaient le signal du bruit. Ici
// elles séparent ce qui varie de ce qui ne varie pas — même algèbre, autre
// lecture. Le Jacobi symétrique vient du cœur, puisqu'il sert maintenant à
// trois sujets.
//
// PURE, sans état, sans DOM. Importable depuis compute.js ET check.js.

import { jacobiSym } from '../../../core/linalg.js';

/** Moyenne de chaque colonne. */
export function colMeans(X, n, p) {
  const m = new Float64Array(p);
  for (let i = 0; i < n; i++) for (let j = 0; j < p; j++) m[j] += X[i * p + j] / n;
  return m;
}

/** Écart-type (non biaisé) de chaque colonne. */
export function colSds(X, n, p, means = colMeans(X, n, p)) {
  const s = new Float64Array(p);
  for (let i = 0; i < n; i++)
    for (let j = 0; j < p; j++) s[j] += (X[i * p + j] - means[j]) ** 2 / (n - 1);
  for (let j = 0; j < p; j++) s[j] = Math.sqrt(s[j]);
  return s;
}

/**
 * L'ACP complète.
 *
 * `standardize` choisit entre les DEUX ACP, et ce n'est pas un détail de
 * réglage : sans standardisation on diagonalise la COVARIANCE, donc la
 * variable qui porte les plus grands nombres domine — sur l'iris, la
 * longueur de pétale a une variance de 3.1 cm² contre 0.19 pour la largeur
 * de sépale, et la première composante n'est presque qu'elle. Avec
 * standardisation on diagonalise la CORRÉLATION, et les quatre variables
 * pèsent pareil. Changer d'unité (des centimètres aux millimètres)
 * changerait le premier résultat et pas le second.
 *
 * @param {Float64Array|number[]} X données n × p en ligne majeure
 * @returns {{values, vectors, means, sds, scores, ratio, cumulative, total}}
 *   `vectors` en COLONNES (v_k[j] = vectors[j*p + k]), valeurs décroissantes.
 */
export function pca(X, n, p, { standardize = false } = {}) {
  const data = Float64Array.from(X);
  const means = colMeans(data, n, p);
  const sds = standardize ? colSds(data, n, p, means) : new Float64Array(p).fill(1);

  // centrage (et réduction si demandée)
  const Z = new Float64Array(n * p);
  for (let i = 0; i < n; i++)
    for (let j = 0; j < p; j++) Z[i * p + j] = (data[i * p + j] - means[j]) / sds[j];

  // covariance (ou corrélation) — symétrique par construction
  const C = new Float64Array(p * p);
  for (let a = 0; a < p; a++)
    for (let b = a; b < p; b++) {
      let s = 0;
      for (let i = 0; i < n; i++) s += Z[i * p + a] * Z[i * p + b];
      s /= n - 1;
      C[a * p + b] = s;
      C[b * p + a] = s;
    }

  const eig = jacobiSym(Float64Array.from(C), p);

  // tri décroissant, et SIGNE FIXÉ : un vecteur propre est défini au signe
  // près, donc sans convention le nuage se retourne d'un calcul à l'autre.
  // On impose « la composante de plus grand module est positive », qui est
  // la convention la plus répandue et la seule qui rende les figures
  // reproductibles d'une exécution à l'autre.
  const order = Array.from({ length: p }, (_, k) => k).sort(
    (a, b) => eig.values[b] - eig.values[a]
  );
  const values = new Float64Array(p);
  const vectors = new Float64Array(p * p);
  for (let k = 0; k < p; k++) {
    const src = order[k];
    values[k] = eig.values[src];
    let big = 0;
    for (let j = 1; j < p; j++)
      if (Math.abs(eig.vectors[j * p + src]) > Math.abs(eig.vectors[big * p + src])) big = j;
    const sign = eig.vectors[big * p + src] >= 0 ? 1 : -1;
    for (let j = 0; j < p; j++) vectors[j * p + k] = sign * eig.vectors[j * p + src];
  }

  // les scores : les données projetées sur les composantes
  const scores = new Float64Array(n * p);
  for (let i = 0; i < n; i++)
    for (let k = 0; k < p; k++) {
      let s = 0;
      for (let j = 0; j < p; j++) s += Z[i * p + j] * vectors[j * p + k];
      scores[i * p + k] = s;
    }

  let total = 0;
  for (let k = 0; k < p; k++) total += values[k];
  const ratio = new Float64Array(p);
  const cumulative = new Float64Array(p);
  let acc = 0;
  for (let k = 0; k < p; k++) {
    ratio[k] = values[k] / total;
    acc += ratio[k];
    cumulative[k] = acc;
  }

  return { values, vectors, means, sds, scores, ratio, cumulative, total, centered: Z, cov: C };
}

/**
 * Reconstruction à partir des k premières composantes, dans les unités
 * d'origine. C'est l'usage « compression » de l'ACP, et l'erreur qu'elle
 * laisse a une valeur EXACTE : la somme des valeurs propres jetées
 * (Eckart–Young). Le harnais l'épingle.
 */
export function reconstruct(model, n, p, k) {
  const { vectors, scores, means, sds } = model;
  const out = new Float64Array(n * p);
  for (let i = 0; i < n; i++)
    for (let j = 0; j < p; j++) {
      let s = 0;
      for (let c = 0; c < k; c++) s += scores[i * p + c] * vectors[j * p + c];
      out[i * p + j] = s * sds[j] + means[j];
    }
  return out;
}

/** Erreur quadratique moyenne PAR INDIVIDU entre deux tableaux n × p. */
export function meanSquaredError(A, B, n, p) {
  let s = 0;
  for (let i = 0; i < n * p; i++) s += (A[i] - B[i]) ** 2;
  return s / n;
}
