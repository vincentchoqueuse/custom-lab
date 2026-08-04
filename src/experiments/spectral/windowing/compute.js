// Spectral windowing and resolution: two sines (f1, and f2 = f1 + Δf at
// A2 dB) observed over N samples, windowed (rect / Hann / Hamming /
// Blackman, PERIODIC definitions so the DFT identities are exact),
// zero-padded and DFT'd. The spectrum is normalized by the window's
// coherent gain Σw/2, so a full-scale tone reads 0 dB regardless of the
// window. Exact identities used by check.js: Parseval through the
// zero-padded DFT, and periodic-Hann ENBW = 1.5 bins.
// PURE, stateless, seeded — runs in a worker; deterministic at fixed seed.
import { magSpectrum, magHalf, spectrumComplex } from '../../../core/dsp.js';
import { fft, toDb as coreToDb, windowValue } from '../../../core/numeric.js';

const FS = 1000; // sampling rate (Hz)
const PHI2 = 1.0; // second-tone phase (rad) — avoids coherent addition
const DB_FLOOR = -120;
const KPAD = 16; // fixed padding for the window-kernel view
const KBINS = 12; // kernel view span (bins of Fs/N)

/* ------------------------------------------------------------------------ */
/* La THÉORIE des lobes secondaires — calculée, jamais tabulée               */
/* ------------------------------------------------------------------------ */
//
// La hauteur du plus haut lobe secondaire est LE chiffre du cours : −13 dB
// pour la rectangulaire, −31 pour Hann, −43 pour Hamming, −58 pour
// Blackman. On peut l'écrire au tableau ; on peut aussi le calculer et le
// confronter à ce que l'écran montre, ce qui est l'objet de l'instrument.
//
// Les quatre fenêtres sont des SOMMES DE COSINUS, w[n] = Σ c_m cos(2πmn/N),
// et la TFtd d'un cosinus fenêtré est un noyau de Dirichlet décalé :
//
//   W(b) = Σ_m (c_m/2)·[D(b−m) + D(b+m)],  D(u) = A(u)·e^{−jπu(N−1)/N}
//   A(u) = sin(πu)/sin(πu/N),  A(0) = N
//
// avec b la fréquence EN BINS de Fs/N. La forme close vaut ce que vaut la
// somme directe (vérifié à 1e-16 sur les quatre fenêtres et N = 64…1024),
// mais elle coûte trois termes au lieu de N — ce qui compte, parce que le
// maximum est cherché par balayage puis raffiné, et qu'un curseur se
// déplace à 30 Hz.
//
// Le résultat DÉPEND DE N, et c'est une honnêteté que la table cache : les
// −42.7 dB de Hamming sont la limite N → ∞, et à N = 64 la fenêtre est
// trop courte pour les atteindre (−42.4). La théorie affichée est celle de
// la fenêtre réellement employée, pas d'une fenêtre idéale.
const WINDOW_COS = Object.freeze({
  rect: [1],
  hann: [0.5, -0.5],
  hamming: [0.54, -0.46],
  blackman: [0.42, -0.5, 0.08],
});

const dirichletAmp = (u, N) => {
  if (Math.abs(u) < 1e-12) return N;
  const d = Math.sin((Math.PI * u) / N);
  return Math.abs(d) < 1e-15 ? N : Math.sin(Math.PI * u) / d;
};

/** |W(b)| de la fenêtre, b en bins de Fs/N — TFtd exacte, en forme close. */
export function windowSpectrum(win, N, b) {
  const c = WINDOW_COS[win];
  let re = 0;
  let im = 0;
  for (let m = 0; m < c.length; m++) {
    const shifts = m === 0 ? [b] : [b - m, b + m];
    const gain = m === 0 ? c[0] : c[m] / 2;
    for (const u of shifts) {
      const g = gain * dirichletAmp(u, N);
      const ph = (-Math.PI * u * (N - 1)) / N;
      re += g * Math.cos(ph);
      im += g * Math.sin(ph);
    }
  }
  return Math.hypot(re, im);
}

/**
 * Hauteur théorique du plus haut lobe secondaire, en dB sous le lobe
 * principal, et sa position en bins. Balayage au 1/64 de bin au-delà du
 * premier zéro, puis section dorée sur le sommet trouvé : la valeur ne
 * dépend donc pas du pas de balayage, contrairement à ce que lit l'écran.
 */
export function theoreticalSidelobe(win, N, span = 16) {
  const w0 = windowSpectrum(win, N, 0);
  const step = 1 / 64;
  // sortir du lobe principal : jusqu'au premier minimum
  let prev = w0;
  let edge = step;
  for (let b = step; b < span; b += step) {
    const v = windowSpectrum(win, N, b);
    if (v > prev) break;
    prev = v;
    edge = b;
  }
  let best = 0;
  let bestB = edge;
  for (let b = edge; b < span; b += step) {
    const v = windowSpectrum(win, N, b);
    if (v > best) {
      best = v;
      bestB = b;
    }
  }
  let lo = bestB - step;
  let hi = bestB + step;
  const R = (Math.sqrt(5) - 1) / 2;
  for (let i = 0; i < 60; i++) {
    const c1 = hi - R * (hi - lo);
    const c2 = lo + R * (hi - lo);
    if (windowSpectrum(win, N, c1) > windowSpectrum(win, N, c2)) hi = c2;
    else lo = c1;
  }
  const b = (lo + hi) / 2;
  return { db: 20 * Math.log10(windowSpectrum(win, N, b) / w0), bin: b };
}

/** |FFT(x zero-padded to nfft)| — returns the magnitude of bins 0..nfft/2. */

const toDb = (m, ref) => coreToDb(m / ref, DB_FLOOR);

/**
 * @param {{N: number, pad: number, f1: number, df: number, a2: number,
 *          win: string, seed: number}} params
 * @returns {{observables: Object}}
 */
export function compute({ N, pad, f1, df, a2, win }) {
  const f2 = f1 + df;
  const A2 = 10 ** (a2 / 20);
  const nfft = N * pad;

  const w = new Float64Array(N);
  const xw = new Float64Array(N);
  let sw = 0;
  let sw2 = 0;
  let energy = 0;
  for (let n = 0; n < N; n++) {
    w[n] = windowValue(win, n, N);
    const x =
      Math.sin((2 * Math.PI * f1 * n) / FS) + A2 * Math.sin((2 * Math.PI * f2 * n) / FS + PHI2);
    xw[n] = x * w[n];
    sw += w[n];
    sw2 += w[n] * w[n];
    energy += xw[n] * xw[n];
  }
  const ref = sw / 2; // coherent gain: a full-scale sine peaks at 0 dB

  // xw porte déjà la fenêtre : le spectre ne doit pas en remettre une
  const { re, im } = spectrumComplex(xw, { nfft });
  const mag = magHalf(re, im);

  // Parseval through the zero-padded DFT (exact identity, checked)
  let specEnergy = 0;
  for (let k = 0; k < nfft; k++) specEnergy += re[k] * re[k] + im[k] * im[k];
  const parsevalGap = Math.abs(energy - specEnergy / nfft) / energy;

  // spectrum sliced around the two tones (features live at the bin scale,
  // invisible on a full 0..Fs/2 axis)
  const binHz = FS / nfft;
  const fLo = Math.max(0, f1 - 80);
  const fHi = Math.min(FS / 2, f2 + 80);
  const kLo = Math.max(0, Math.floor(fLo / binHz));
  const kHi = Math.min(nfft / 2, Math.ceil(fHi / binHz));
  const sf = new Float64Array(kHi - kLo + 1);
  const sy = new Float64Array(kHi - kLo + 1);
  let peakDb = DB_FLOOR;
  let peakF = 0;
  for (let k = kLo; k <= kHi; k++) {
    sf[k - kLo] = k * binHz;
    const db = toDb(mag[k], ref);
    sy[k - kLo] = db;
    if (db > peakDb) {
      peakDb = db;
      peakF = k * binHz;
    }
  }

  // window kernel |W(f)| at fixed fine padding, x in bins of Fs/N
  const kfft = N * KPAD;
  const km = magSpectrum(w, { nfft: kfft });
  const kMax = Math.min(kfft / 2, KBINS * KPAD);
  const kb = new Float64Array(kMax + 1);
  const ky = new Float64Array(kMax + 1);
  for (let k = 0; k <= kMax; k++) {
    kb[k] = k / KPAD;
    ky[k] = toDb(km[k], sw); // kernel normalized to 0 dB at f = 0
  }

  // measured highest sidelobe: past the first local minimum of the kernel
  let edge = 1;
  while (edge < kMax && km[edge + 1] < km[edge]) edge++;
  let sidelobe = DB_FLOOR;
  for (let k = edge; k <= kMax; k++) sidelobe = Math.max(sidelobe, ky[k]);

  // ce que la théorie dit du même chiffre, pour la fenêtre RÉELLEMENT
  // employée — et l'écart avec ce que le tracé montre, qui est celui du pas
  // de discrétisation : à 16× de bourrage le sommet du lobe n'est pas
  // échantillonné, la mesure passe donc légèrement EN DESSOUS de la théorie
  const th = theoreticalSidelobe(win, N);

  const enbw = (N * sw2) / (sw * sw);

  // windowed signal + envelope (time view)
  const ns = new Float64Array(N);
  const envU = new Float64Array(N);
  const envL = new Float64Array(N);
  for (let n = 0; n < N; n++) {
    ns[n] = n;
    envU[n] = (1 + A2) * w[n];
    envL[n] = -envU[n];
  }

  return {
    observables: {
      spectrum: { x: sf, y: sy },
      kernel: { x: kb, y: ky },
      signal: { x: ns, y: xw },
      envUp: { x: ns, y: envU },
      envDown: { x: ns, y: envL },
      f2, // second-tone frequency (vline)
      parsevalGap, // checks
      peakDb, // checks
      peakF, // checks
      enbw: { value: enbw, meta: { label: 'ENBW', unit: 'bins', precision: 3 } },
      sidelobe: {
        value: sidelobe,
        meta: { label: 'lobes secondaires (lu)', unit: 'dB', precision: 2 },
      },
      sidelobeTheory: {
        value: th.db,
        meta: { label: 'theory', unit: 'dB', precision: 2 },
      },
      sidelobeTheoryLine: th.db, // hline sur la vue du noyau
      sidelobeBinLine: th.bin, // vline : où la théorie place ce sommet
      sidelobeBin: {
        value: th.bin,
        meta: { label: 'at', unit: 'bins', precision: 3 },
      },
      sidelobeGap: {
        value: sidelobe - th.db,
        meta: { label: 'measured − theory', unit: 'dB', precision: 2 },
      },
      binWidth: {
        value: FS / N,
        meta: { label: 'largeur de raie Fs/N', unit: 'Hz', precision: 2 },
      },
    },
  };
}
