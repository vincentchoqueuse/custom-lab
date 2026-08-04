// Démoduler : retrouver A(t) et f(t) dans x(t) = A(t)·cos(φ(t)).
//
// Le signal est modulé EN AMPLITUDE ET EN FRÉQUENCE en même temps, ce qui
// est le cas intéressant : chaque méthode doit séparer deux informations
// mélangées dans une seule courbe. Deux méthodes, aussi différentes qu'on
// peut l'être :
//
//   HILBERT est GLOBAL. On fabrique le signal analytique z = x + j·H{x} en
//   annulant les fréquences négatives du spectre, puis A = |z| et
//   f = (1/2π)·dφ/dt. Il faut donc une FFT sur tout l'enregistrement : le
//   résultat à l'instant t dépend de TOUS les échantillons, y compris ceux
//   qui viennent après. Aucune démodulation en temps réel là-dedans.
//
//   TEAGER–KAISER est LOCAL. L'opérateur Ψ(x)[n] = x[n]² − x[n+1]·x[n−1]
//   vaut A²sin²Ω sur une sinusoïde : trois échantillons, deux
//   multiplications, et il porte déjà le produit amplitude × fréquence. Le
//   couple (A, Ω) s'en extrait par DESA-2, encore trois échantillons. Pas
//   de transformée, pas de retard, un coût par point qui ne dépend pas de
//   la longueur du signal.
//
// L'algorithme DESA-2, avec y[n] = x[n+1] − x[n−1] :
//
//   Ω[n] = ½·arccos( 1 − Ψ(y)[n] / (2·Ψ(x)[n]) )
//   A[n] = 2·Ψ(x)[n] / √(Ψ(y)[n])
//
// et sur une sinusoïde pure ces deux formules sont EXACTES, pas
// approchées — c'est la première vérification du harnais.
//
// Le prix de la localité se paie sur le bruit, et c'est tout l'objet des
// scènes : Ψ est un produit d'échantillons voisins, donc le bruit y entre
// au carré et sans aucun moyennage. Hilbert, lui, fait une FFT, qui EST un
// moyennage sur tout l'enregistrement. Les chiffres sont dans les notes,
// mesurés et non supposés.
//
// PURE, stateless, seeded — runs in a worker; deterministic at fixed seed.
import { ifft, noiseSigma } from '../../../core/dsp.js';
import { fft } from '../../../core/numeric.js';
import { mulberry32, gaussFrom } from '../../../core/rng.js';

const FS = 8000; // Hz
const N = 1024; // échantillons — 128 ms, et une puissance de deux pour la FFT

const EDGE = 48; // échantillons ignorés aux deux bords (voir plus bas)

/**
 * Signal analytique par la FFT : on annule les fréquences négatives et on
 * double les positives. Exact au sens de la TFD, avec la réserve d'usage —
 * l'enregistrement est traité comme PÉRIODIQUE, donc les deux bords sont
 * pollués par la discontinuité de raccord. On les écarte de la lecture
 * plutôt que de les fenêtrer : fenêtrer changerait l'amplitude, qui est
 * précisément ce qu'on cherche à mesurer.
 */
export function analytic(x) {
  const n = x.length;
  const re = Float64Array.from(x);
  const im = new Float64Array(n);
  fft(re, im);
  const half = n / 2;
  for (let k = 1; k < half; k++) {
    re[k] *= 2;
    im[k] *= 2;
  }
  for (let k = half + 1; k < n; k++) {
    re[k] = 0;
    im[k] = 0;
  }
  ifft(re, im);
  return { re, im };
}

/** Ψ(x)[n] = x[n]² − x[n+1]·x[n−1] — l'opérateur d'énergie de Teager. */
export function teager(x) {
  const n = x.length;
  const p = new Float64Array(n);
  for (let i = 1; i < n - 1; i++) p[i] = x[i] * x[i] - x[i + 1] * x[i - 1];
  p[0] = p[1];
  p[n - 1] = p[n - 2];
  return p;
}

/**
 * DESA-2 : amplitude et pulsation instantanées, à partir de Ψ seul.
 * Exact sur une sinusoïde pure — vérifié à 1e-12 par le harnais.
 *
 * L'argument de l'arccos est BORNÉ à [−1, 1]. Ce n'est pas une précaution
 * cosmétique : sous le bruit, Ψ(y)/(2Ψ(x)) sort régulièrement de
 * l'intervalle, et c'est exactement la manière dont Teager décroche. On
 * compte ces sorties et on les affiche, plutôt que de les faire disparaître.
 */
export function desa2(x) {
  const n = x.length;
  const y = new Float64Array(n);
  for (let i = 1; i < n - 1; i++) y[i] = x[i + 1] - x[i - 1];
  const px = teager(x);
  const py = teager(y);
  const omega = new Float64Array(n);
  const amp = new Float64Array(n);
  let clipped = 0;
  for (let i = 0; i < n; i++) {
    const denom = 2 * px[i];
    let c = Math.abs(denom) > 1e-300 ? 1 - py[i] / denom : 1;
    if (c > 1 || c < -1) {
      clipped++;
      c = Math.max(-1, Math.min(1, c));
    }
    omega[i] = 0.5 * Math.acos(c);
    const s = Math.sqrt(Math.max(py[i], 0));
    amp[i] = s > 1e-300 ? (2 * Math.max(px[i], 0)) / s : 0;
  }
  return { omega, amp, clipped };
}

/** Déroulement de phase : les sauts de plus de π sont des tours, pas des sauts. */
export function unwrap(p) {
  const out = Float64Array.from(p);
  let off = 0;
  for (let i = 1; i < out.length; i++) {
    let d = p[i] - p[i - 1];
    while (d > Math.PI) {
      off -= 2 * Math.PI;
      d -= 2 * Math.PI;
    }
    while (d < -Math.PI) {
      off += 2 * Math.PI;
      d += 2 * Math.PI;
    }
    out[i] = p[i] + off;
  }
  return out;
}

/**
 * @param {{fc: number, ka: number, fam: number, fdev: number, ffm: number,
 *          snr: number, seed: number}} params
 * @returns {{observables: Object}}
 */
export function compute({ fc, ka, fam, fdev, ffm, snr, seed }) {
  const FC = fc;
  const gauss = gaussFrom(mulberry32(seed));

  /* ---------- le signal déterministe, puis le bruit ---------------------- */
  const t = new Float64Array(N);
  const clean = new Float64Array(N);
  const x = new Float64Array(N);
  const aTrue = new Float64Array(N);
  const fTrue = new Float64Array(N);
  // puissance du signal : ⟨A²⟩/2 = (1 + ka²/2)/2
  const sigPow = (1 + (ka * ka) / 2) / 2;
  const sigma = noiseSigma(sigPow, snr);
  for (let i = 0; i < N; i++) {
    const ti = i / FS;
    t[i] = ti * 1000; // ms
    const A = 1 + ka * Math.cos(2 * Math.PI * fam * ti);
    // φ(t) = 2π f_c t + (Δf/f_fm)·sin(2π f_fm t) ⇒ f_i = f_c + Δf·cos(2π f_fm t)
    const phi = 2 * Math.PI * FC * ti + (fdev / ffm) * Math.sin(2 * Math.PI * ffm * ti);
    aTrue[i] = A;
    fTrue[i] = FC + fdev * Math.cos(2 * Math.PI * ffm * ti);
    clean[i] = A * Math.cos(phi);
    x[i] = clean[i] + sigma * gauss();
  }

  /* ---------- Hilbert : global ------------------------------------------- */
  const z = analytic(x);
  const aHil = new Float64Array(N);
  const ph = new Float64Array(N);
  for (let i = 0; i < N; i++) {
    aHil[i] = Math.hypot(z.re[i], z.im[i]);
    ph[i] = Math.atan2(z.im[i], z.re[i]);
  }
  const up = unwrap(ph);
  const fHil = new Float64Array(N);
  for (let i = 1; i < N - 1; i++) fHil[i] = ((up[i + 1] - up[i - 1]) / 2) * (FS / (2 * Math.PI));
  fHil[0] = fHil[1];
  fHil[N - 1] = fHil[N - 2];

  /* ---------- Teager–Kaiser : local -------------------------------------- */
  const d2 = desa2(x);
  const fTea = new Float64Array(N);
  for (let i = 0; i < N; i++) fTea[i] = (d2.omega[i] * FS) / (2 * Math.PI);

  /* ---------- ce que ça donne, en chiffres ------------------------------- */
  // Les EDGE premiers et derniers échantillons sont écartés : Hilbert y
  // souffre du raccord périodique et Teager y manque de voisins. Les
  // comparer sur la même plage est la seule façon honnête de les comparer.
  const rms = (a, b) => {
    let s = 0;
    let n = 0;
    for (let i = EDGE; i < N - EDGE; i++) {
      const e = a[i] - b[i];
      s += e * e;
      n++;
    }
    return Math.sqrt(s / n);
  };
  const errAH = rms(aHil, aTrue);
  const errAT = rms(d2.amp, aTrue);
  const errFH = rms(fHil, fTrue);
  const errFT = rms(fTea, fTrue);

  const cut = (a) => a.subarray(EDGE, N - EDGE);
  const tc = cut(t);

  /* ---------- le spectre, pour situer le signal -------------------------- */
  const sre = Float64Array.from(x);
  const sim = new Float64Array(N);
  fft(sre, sim);
  const nf = N / 2 + 1;
  const sf = new Float64Array(nf);
  const sy = new Float64Array(nf);
  let smax = 1e-300;
  for (let k = 0; k < nf; k++) {
    const m = Math.hypot(sre[k], sim[k]);
    if (m > smax) smax = m;
  }
  for (let k = 0; k < nf; k++) {
    sf[k] = (k * FS) / N;
    sy[k] = 20 * Math.log10(Math.max(Math.hypot(sre[k], sim[k]) / smax, 1e-6));
  }

  return {
    observables: {
      signal: { x: tc, y: cut(x) },
      envTrue: { x: tc, y: cut(aTrue) },
      envHilbert: { x: tc, y: cut(aHil) },
      envTeager: { x: tc, y: cut(d2.amp) },
      freqTrue: { x: tc, y: cut(fTrue) },
      freqHilbert: { x: tc, y: cut(fHil) },
      freqTeager: { x: tc, y: cut(fTea) },
      spectrum: { x: sf, y: sy },
      fCarrier: FC, // vline : la porteuse
      errAmpHilbert: {
        value: errAH,
        meta: { label: 'erreur A — Hilbert', precision: 4 },
      },
      errAmpTeager: {
        value: errAT,
        meta: { label: 'erreur A — Teager', precision: 4 },
      },
      errFreqHilbert: {
        value: errFH,
        meta: { label: 'erreur f — Hilbert', unit: 'Hz', precision: 2 },
      },
      errFreqTeager: {
        value: errFT,
        meta: { label: 'erreur f — Teager', unit: 'Hz', precision: 2 },
      },
      clipped: {
        value: d2.clipped,
        meta: { label: 'arccos hors domaine (Teager)' },
      },
      verdict: {
        value:
          errFT < errFH
            ? 'Teager suit mieux la fréquence'
            : errFT < 4 * errFH
              ? 'les deux tiennent'
              : 'Teager a décroché, Hilbert tient',
        meta: { label: 'comparaison' },
      },
    },
  };
}
