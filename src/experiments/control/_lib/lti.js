// Les réponses temporelles en forme close des systèmes canoniques — la
// moitié TEMPORELLE de ce que _lib/bode.js fait en fréquence.
//
// Elles vivaient dans `control/second-order/compute.js`, et trois autres
// expériences avaient fini par importer ce fichier : une expérience était
// devenue la bibliothèque d'une autre, et on ne pouvait plus toucher au
// second ordre sans risquer d'en casser deux. Une expérience se lit toute
// seule ; ce qu'elle partage monte ici.
//
// Toutes ces fonctions sont des FORMES CLOSES, jamais une intégration
// numérique : c'est ce qui permet aux harnais de comparer une réponse
// calculée autrement (bouclage, changement de base) à une référence exacte,
// sans pouvoir accuser un schéma d'intégration en cas d'écart.
//
// PURE : pas de DOM, pas d'état. Importable depuis compute.js et check.js.

import { polyEvalComplex } from '../../../core/numeric.js';

const EPS = 1e-6; // la largeur de la zone traitée comme critique (m = 1)

/**
 * Réponse indicielle de K·ω₀²/(s² + 2mω₀s + ω₀²), exacte dans les trois
 * régimes :
 *   m < 1  y = K(1 − e^{−mω₀t}(cos ω_d t + m/√(1−m²)·sin ω_d t)), ω_d = ω₀√(1−m²)
 *   m = 1  y = K(1 − (1 + ω₀t)e^{−ω₀t})
 *   m > 1  deux pôles réels −ω₀(m ∓ √(m²−1)), bi-exponentielle
 */
export function secondOrderStep(K, m, w0, t) {
  if (Math.abs(m - 1) < EPS) return K * (1 - (1 + w0 * t) * Math.exp(-w0 * t));
  if (m < 1) {
    const wd = w0 * Math.sqrt(1 - m * m);
    const e = Math.exp(-m * w0 * t);
    return K * (1 - e * (Math.cos(wd * t) + (m / Math.sqrt(1 - m * m)) * Math.sin(wd * t)));
  }
  const s = Math.sqrt(m * m - 1);
  const r1 = -w0 * (m - s);
  const r2 = -w0 * (m + s);
  return K * (1 - (r2 * Math.exp(r1 * t) - r1 * Math.exp(r2 * t)) / (r2 - r1));
}

/**
 * Réponse impulsionnelle du même système — c'est la dérivée de la
 * précédente, et les harnais le vérifient :
 *   m < 1  h = Kω₀²/ω_d · e^{−mω₀t}·sin(ω_d t)
 *   m = 1  h = Kω₀²·t·e^{−ω₀t}
 *   m > 1  h = Kω₀²(e^{r₁t} − e^{r₂t})/(r₁ − r₂)
 */
export function secondOrderImpulse(K, m, w0, t) {
  if (Math.abs(m - 1) < EPS) return K * w0 * w0 * t * Math.exp(-w0 * t);
  if (m < 1) {
    const wd = w0 * Math.sqrt(1 - m * m);
    return ((K * w0 * w0) / wd) * Math.exp(-m * w0 * t) * Math.sin(wd * t);
  }
  const s = Math.sqrt(m * m - 1);
  const r1 = -w0 * (m - s);
  const r2 = -w0 * (m + s);
  return (K * w0 * w0 * (Math.exp(r1 * t) - Math.exp(r2 * t))) / (r1 - r2);
}

/** Les deux pôles de ce même second ordre, comme [[Re, Im], [Re, Im]]. */
export function secondOrderPoles(m, w0) {
  if (m < 1) {
    const wd = w0 * Math.sqrt(1 - m * m);
    return [
      [-m * w0, wd],
      [-m * w0, -wd],
    ];
  }
  const s = w0 * Math.sqrt(m * m - 1);
  return [
    [-m * w0 + s, 0],
    [-m * w0 - s, 0],
  ];
}

/**
 * Réponse indicielle du premier ordre K(1 + τ_z s)/(1 + τs) :
 *   y(t) = K[1 − (1 − τ_z/τ)·e^{−t/τ}]
 * τ_z = 0 donne l'exponentielle pure ; τ_z < 0 la phase non minimale.
 */
export function firstOrderStep(K, tau, tz, t) {
  return K * (1 - (1 - tz / tau) * Math.exp(-t / tau));
}

/** Partie continue de h(t) du premier ordre (le Dirac K·τ_z/τ est à part). */
export function firstOrderImpulse(K, tau, tz, t) {
  return ((K * (1 - tz / tau)) / tau) * Math.exp(-t / tau);
}

/* ------------------------------------------------------------------------ */
/* Racines d'un polynôme — les pôles et les zéros d'un système QUELCONQUE    */
/* ------------------------------------------------------------------------ */

/**
 * Racines complexes d'un polynôme à coefficients réels donnés en puissances
 * DÉCROISSANTES, par l'itération de Durand–Kerner (Weierstrass) :
 *
 *   z_k ← z_k − p(z_k) / Π_{j≠k} (z_k − z_j)
 *
 * C'est la méthode de Newton appliquée simultanément aux n racines, le
 * dénominateur jouant le rôle de la dérivée déflatée. Elle tient en trente
 * lignes, ne demande aucune algèbre linéaire (pas de matrice compagne, pas
 * de QR) et converge quadratiquement sur les racines simples — largement
 * assez pour les ordres 1 à 6 qu'on tape en cours.
 *
 * Deux précautions qui ne sont pas cosmétiques :
 *
 *  - les racines NULLES sont épluchées à la main (zéros de queue). Sur une
 *    racine multiple la convergence retombe au premier ordre et la précision
 *    plafonne à ε^{1/m} ; un intégrateur double, s² en facteur, donnerait
 *    deux points à 1e-8 de l'origine au lieu d'un pôle double net. Ici ils
 *    sont exacts par construction.
 *  - les points de départ sont FIXES (spirale de rayon Cauchy), jamais
 *    tirés au hasard : le calcul doit être déterministe à paramètres égaux,
 *    c'est le contrat du projet.
 *
 * @param {number[]} coeffs puissances décroissantes, coeffs[0] = terme de
 *                          plus haut degré
 * @returns {number[][]} [[Re, Im], …], de longueur deg(p)
 */
export function polyRoots(coeffs) {
  const c = Array.from(coeffs, Number);
  while (c.length > 1 && c[0] === 0) c.shift(); // un zéro de tête n'est pas un degré
  const out = [];
  while (c.length > 1 && c[c.length - 1] === 0) {
    c.pop();
    out.push([0, 0]); // racine à l'origine, exacte
  }
  const n = c.length - 1;
  if (n <= 0) return out;

  const a = c.map((v) => v / c[0]); // unitaire
  // borne de Cauchy : toutes les racines sont dans |z| ≤ 1 + max|a_i|
  let R = 1;
  for (let i = 1; i <= n; i++) R = Math.max(R, Math.abs(a[i]));
  R = 1 + R;

  const zr = new Float64Array(n);
  const zi = new Float64Array(n);
  for (let k = 0; k < n; k++) {
    const th = (2 * Math.PI * k) / n + 0.4; // 0.4 rad : jamais sur l'axe réel
    zr[k] = 0.6 * R * Math.cos(th);
    zi[k] = 0.6 * R * Math.sin(th);
  }

  for (let it = 0; it < 500; it++) {
    let move = 0;
    for (let k = 0; k < n; k++) {
      const [pr, pi] = polyEvalComplex(a, zr[k], zi[k]);
      let dr = 1;
      let di = 0;
      for (let j = 0; j < n; j++) {
        if (j === k) continue;
        const er = zr[k] - zr[j];
        const ei = zi[k] - zi[j];
        const t = dr * er - di * ei;
        di = dr * ei + di * er;
        dr = t;
      }
      const m = dr * dr + di * di;
      if (!(m > 1e-300)) continue; // deux itérés confondus : on passe ce tour
      const qr = (pr * dr + pi * di) / m;
      const qi = (pi * dr - pr * di) / m;
      zr[k] -= qr;
      zi[k] -= qi;
      move = Math.max(move, Math.hypot(qr, qi));
    }
    if (move < 1e-14) break;
  }

  // Un polynôme réel a des racines réelles ou conjuguées deux à deux ; une
  // racine réelle multiple sort de l'itération avec une partie imaginaire
  // résiduelle (le plafond ε^{1/m} ci-dessus). La remettre à zéro dit la
  // vérité — un pôle double en −1 est réel — au lieu de dessiner deux points
  // décollés de l'axe.
  for (let k = 0; k < n; k++) {
    const scale = Math.max(1, Math.abs(zr[k]));
    out.push([zr[k], Math.abs(zi[k]) < 1e-6 * scale ? 0 : zi[k]]);
  }
  return out;
}
