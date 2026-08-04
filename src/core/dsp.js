// La couche « appels » des computes — celle qui fait qu'un compute.js se lit
// comme une suite d'OPÉRATIONS NOMMÉES et non comme une suite de boucles.
//
// La règle de lecture qu'elle sert : dans un compute, on doit pouvoir suivre
// la science sans lire d'indices. Écrire
//
//     const x = tone(N, f0, { fs: FS });
//     const y = addNoise(x, noiseSigma(0.5, snrDb), gauss);
//     const S = dbAmp(magSpectrum(y, { nfft: NFFT, window: 'hann' }));
//
// dit exactement ce que la ligne fait ; les trois boucles équivalentes le
// disent aussi, mais après relecture. Le catalogue en comptait dix-neuf qui
// fabriquaient une sinusoïde à la main et neuf qui refaisaient le même
// spectre — autant d'endroits où une erreur d'indice ou de facteur peut se
// glisser sans que rien ne la signale.
//
// Ce module ne fait AUCUNE science : il ne contient que des opérations dont
// la définition est publique et vérifiable, et le harnais les épingle une
// fois pour toutes plutôt qu'une fois par expérience.
//
// PURE, sans état, sans DOM. Importable depuis compute.js ET check.js.

import { fft, toDb, windowValue } from './numeric.js';

/* ------------------------------------------------------------- grilles -- */

/** n points régulièrement espacés de a à b, bornes comprises (MATLAB). */
export function linspace(a, b, n) {
  const out = new Float64Array(n);
  if (n === 1) {
    out[0] = a;
    return out;
  }
  const step = (b - a) / (n - 1);
  for (let i = 0; i < n; i++) out[i] = a + i * step;
  return out;
}

/** Les instants d'échantillonnage : n points au pas 1/fs, à partir de 0. */
export function timeAxis(n, fs) {
  const t = new Float64Array(n);
  for (let i = 0; i < n; i++) t[i] = i / fs;
  return t;
}

/**
 * L'axe fréquentiel du DEMI-spectre, 0 à fs/2 inclus — nfft/2 + 1 points,
 * la convention de MATLAB. Le point de Nyquist est inclus parce qu'il
 * EXISTE : l'oublier laisse un trou d'un bin au bout de chaque tracé.
 */
export function freqAxis(nfft, fs) {
  const nh = nfft / 2;
  const f = new Float64Array(nh + 1);
  for (let k = 0; k <= nh; k++) f[k] = (k * fs) / nfft;
  return f;
}

/* ------------------------------------------------------------- signaux -- */

/**
 * Une sinusoïde. `phase` en radians, `amp` en amplitude crête.
 * @param {number} n nombre d'échantillons
 * @param {number} f fréquence (même unité que fs)
 * @param {{fs: number, amp?: number, phase?: number, cos?: boolean}} o
 */
export function tone(n, f, { fs, amp = 1, phase = 0, cos = false }) {
  const x = new Float64Array(n);
  const w = (2 * Math.PI * f) / fs;
  for (let i = 0; i < n; i++) x[i] = amp * (cos ? Math.cos(w * i + phase) : Math.sin(w * i + phase));
  return x;
}

/**
 * L'écart-type de bruit qui donne le SNR demandé face à une puissance de
 * signal connue. Écrit une fois ici parce que c'est UN endroit où se tromper
 * de facteur 2 ne se voit pas : σ² = P/10^(SNR/10), et une sinusoïde
 * d'amplitude A porte A²/2, pas A².
 */
export function noiseSigma(signalPower, snrDb) {
  return Math.sqrt(signalPower / 10 ** (snrDb / 10));
}

/** x + σ·g, dans un nouveau tableau. `gauss` vient de core/rng.js. */
export function addNoise(x, sigma, gauss) {
  const y = new Float64Array(x.length);
  for (let i = 0; i < x.length; i++) y[i] = x[i] + sigma * gauss();
  return y;
}

/** Puissance moyenne (1/N)·Σx². */
export function power(x) {
  let s = 0;
  for (let i = 0; i < x.length; i++) s += x[i] * x[i];
  return s / x.length;
}

/** a divisé par son maximum absolu — le tracé d'un spectre en relatif. */
export function normalizeMax(a) {
  let m = 0;
  for (let i = 0; i < a.length; i++) m = Math.max(m, Math.abs(a[i]));
  const out = new Float64Array(a.length);
  const s = m > 0 ? 1 / m : 1;
  for (let i = 0; i < a.length; i++) out[i] = a[i] * s;
  return out;
}

/* ---------------------------------------------------------- transformée -- */

/**
 * TFD inverse, en place, exactement l'inverse de `fft` (aucune convention
 * cachée : ifft(fft(x)) === x). Le tour du conjugué était réécrit dans deux
 * expériences, avec deux normalisations différentes.
 */
export function ifft(re, im) {
  const n = re.length;
  for (let i = 0; i < n; i++) im[i] = -im[i];
  fft(re, im);
  for (let i = 0; i < n; i++) {
    re[i] /= n;
    im[i] = -im[i] / n;
  }
}

/**
 * Le module du DEMI-spectre : fenêtrage, zéro-padding, |X(k)| pour k de 0 à
 * nfft/2 inclus.
 *
 * La fenêtre porte sur les ÉCHANTILLONS, pas sur nfft — fenêtrer le
 * zéro-padding reviendrait à multiplier le signal par le début d'une fenêtre
 * bien plus longue, donc à le déformer. C'est l'erreur que la signature rend
 * impossible.
 *
 * @param {ArrayLike<number>} x
 * @param {{nfft?: number, window?: string, symmetric?: boolean}} o
 */
export function magSpectrum(x, opts = {}) {
  const { re, im } = spectrumComplex(x, opts);
  return magHalf(re, im);
}

/**
 * Le module du demi-spectre d'une transformée DÉJÀ calculée. Sans elle, une
 * expérience qui a besoin du spectre complexe ET de son module transformait
 * deux fois — ce qui ne se voit pas, sinon au chronomètre.
 */
export function magHalf(re, im) {
  const nh = re.length / 2;
  const mag = new Float64Array(nh + 1);
  for (let k = 0; k <= nh; k++) mag[k] = Math.hypot(re[k], im[k]);
  return mag;
}

/**
 * La transformée COMPLÈTE, fenêtrée et zéro-paddée — dont `magSpectrum`
 * n'est que le module. Elle existe parce que Parseval se vérifie sur le
 * spectre entier, pas sur sa moitié : une expérience qui contrôle son
 * énergie a besoin des deux moitiés, et n'a pas à refaire le fenêtrage
 * pour autant.
 */
export function spectrumComplex(
  x,
  { nfft = nextPow2(x.length), window = 'rect', symmetric = false } = {}
) {
  const n = Math.min(x.length, nfft);
  const re = new Float64Array(nfft);
  const im = new Float64Array(nfft);
  for (let i = 0; i < n; i++) re[i] = x[i] * windowValue(window, i, n, symmetric);
  fft(re, im);
  return { re, im };
}

/** La plus petite puissance de deux ≥ n. */
export function nextPow2(n) {
  let p = 1;
  while (p < n) p <<= 1;
  return p;
}

/* ------------------------------------------------------------ décibels -- */

/**
 * dB d'une AMPLITUDE : 20·log10. Alias explicite de `toDb`, pour que le
 * facteur soit dans le NOM de la fonction et non dans la tête de celui qui
 * relit.
 */
export const dbAmp = toDb;

/**
 * dB d'une PUISSANCE : 10·log10.
 *
 * Elle existe parce que son absence a coûté un bug réel : une densité
 * spectrale de puissance passée dans `toDb` sort DEUX FOIS trop grande en
 * dB, et le tracé reste parfaitement plausible — il ne devient faux que
 * quand on lit une valeur. Deux fonctions nommées valent mieux qu'un
 * commentaire.
 */
export function dbPower(p, floor = -Infinity) {
  return Math.max(floor, 10 * Math.log10(p + 1e-300));
}

/** Le vecteur entier en dB d'amplitude, avec plancher. */
export function dbAmpAll(a, floor = -Infinity) {
  const out = new Float64Array(a.length);
  for (let i = 0; i < a.length; i++) out[i] = toDb(a[i], floor);
  return out;
}

/**
 * Le plus haut point du spectre autour d'une fréquence donnée — la lecture
 * « combien vaut la raie à f₀ », sans supposer qu'elle tombe pile sur un bin.
 * @param {ArrayLike<number>} mag demi-spectre
 * @param {number} f fréquence cherchée
 * @param {{fs: number, nfft: number, width?: number}} o `width` en bins
 */
export function peakNear(mag, f, { fs, nfft, width = 6 }) {
  const c = Math.round((f * nfft) / fs);
  let m = -Infinity;
  for (let k = Math.max(0, c - width); k <= Math.min(mag.length - 1, c + width); k++)
    m = Math.max(m, mag[k]);
  return m;
}
