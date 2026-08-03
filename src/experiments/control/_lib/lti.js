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
