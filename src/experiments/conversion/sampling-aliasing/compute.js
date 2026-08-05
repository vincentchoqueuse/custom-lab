// Sampling and aliasing: a continuous source (sinusoid, or a square wave
// whose harmonics fold one by one) sampled at Fs, reconstructed by ideal
// low-pass (sinc) interpolation over the band [−Fs/2, Fs/2].
//   folded frequency: r = f mod Fs, f_app = min(r, Fs − r)
// Views feed on: the continuous signal vs its samples and reconstruction,
// the true line spectrum vs the folded one, and the folding diagram
// f_app(f) — the sawtooth that explains the wagon-wheel effect.
// PURE, stateless, seeded — runs in a worker; deterministic at fixed seed.
import { sinc } from '../../../core/numeric.js';

const NG = 1200; // dense grid for the "continuous" signal and reconstruction
const H_MAX = 12; // square-wave harmonics kept in the spectrum view
const F_SPEC = 250; // Hz — spectrum harmonic cap

/** Fold a frequency into the first Nyquist zone [0, Fs/2]. */
function fold(f, Fs) {
  const r = ((f % Fs) + Fs) % Fs;
  return Math.min(r, Fs - r);
}

/** Harmonic lines {f, a} of the source (sinusoid: one line at f). */
function harmonics(source, f) {
  if (source === 'sine') return [{ f, a: 1 }];
  const out = [];
  for (let n = 1; out.length < H_MAX && n * f <= F_SPEC; n += 2) {
    out.push({ f: n * f, a: 4 / (Math.PI * n) });
  }
  return out;
}

function sourceValue(source, f, t) {
  if (source === 'sine') return Math.sin(2 * Math.PI * f * t);
  return Math.sign(Math.sin(2 * Math.PI * f * t)) || 1;
}

/**
 * @param {{source: string, f: number, Fs: number, seed: number}} params
 * @returns {{observables: Object}}
 */
export function compute({ source, f, Fs }) {
  // window: four periods of the source, clamped for readability
  const T = Math.min(2, Math.max(0.1, 4 / f));

  // continuous signal on the dense grid
  const gt = new Float64Array(NG);
  const gx = new Float64Array(NG);
  for (let i = 0; i < NG; i++) {
    gt[i] = (i * T) / (NG - 1);
    gx[i] = sourceValue(source, f, gt[i]);
  }

  // samples at Fs
  const n = Math.max(2, Math.floor(T * Fs) + 1);
  const st = new Float64Array(n);
  const sx = new Float64Array(n);
  for (let k = 0; k < n; k++) {
    st[k] = k / Fs;
    sx[k] = sourceValue(source, f, st[k]);
  }

  // ideal low-pass reconstruction from the samples (band [−Fs/2, Fs/2])
  const rx = new Float64Array(NG);
  for (let i = 0; i < NG; i++) {
    let acc = 0;
    for (let k = 0; k < n; k++) acc += sx[k] * sinc(Fs * (gt[i] - st[k]));
    rx[i] = acc;
  }

  // line spectra: true harmonics, and their folded images in [0, Fs/2]
  const lines = harmonics(source, f);
  const specF = Float64Array.from(lines, (l) => l.f);
  const specA = Float64Array.from(lines, (l) => l.a);
  const aliasF = Float64Array.from(lines, (l) => fold(l.f, Fs));
  const fApp = fold(f, Fs);

  // folding diagram f_app(f) at the current Fs, plus the no-aliasing diagonal
  const NF = 241;
  const ff = new Float64Array(NF);
  const fa = new Float64Array(NF);
  for (let i = 0; i < NF; i++) {
    ff[i] = (i * 45) / (NF - 1);
    fa[i] = fold(ff[i], Fs);
  }

  return {
    observables: {
      continuous: { x: gt, y: gx },
      sampled: { x: st, y: sx },
      reconstructed: { x: gt, y: rx },
      specTrue: { x: specF, y: specA },
      specAlias: { x: aliasF, y: specA },
      foldCurve: { x: ff, y: fa },
      diagonal: { x: ff, y: Float64Array.from(ff) },
      currentPoint: { x: Float64Array.from([f]), y: Float64Array.from([fApp]) },
      fApp: {
        value: fApp,
        meta: { label: 'apparent f (fundamental)', unit: 'Hz', precision: 1 },
      },
      nSamples: { value: n, meta: { label: 'samples', precision: 0 } },
    },
  };
}
