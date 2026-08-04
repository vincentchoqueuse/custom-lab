import { compute, spectrumOf, width3dB, windowedSamples } from './compute.js';
import { standardChecks, maxGap, range } from '../../../core/checks.js';

const FS = 8000;
const BASE = { sig: 'sine', win: 'rect', T: 40, f0: 300, k: 2000, tau: 15, tb: 30, seed: 34 };
const obs = (p) => compute({ ...BASE, ...p }).observables;

/**
 * Closed form of the truncated sine's transform: with a rectangular window of
 * N samples, X(f) = [D(f−f₀) − D(f+f₀)]/2j where D is the Dirichlet kernel
 * Σ e^{−j2πνn/Fs} = e^{−jπν(N−1)/Fs}·sin(πνN/Fs)/sin(πν/Fs). No approximation:
 * both terms are kept, so the identity holds everywhere, not just near f₀.
 */
function dirichletMag(f, f0, N) {
  const D = (nu) => {
    const a = (Math.PI * nu) / FS;
    const num = Math.abs(Math.sin(a * N)) < 1e-300 && Math.abs(Math.sin(a)) < 1e-12 ? N : null;
    const r = num ?? (Math.abs(Math.sin(a)) < 1e-12 ? N : Math.sin(a * N) / Math.sin(a));
    const ph = -Math.PI * nu * (N - 1) / FS;
    return [r * Math.cos(ph), r * Math.sin(ph)];
  };
  const [ar, ai] = D(f - f0);
  const [br, bi] = D(f + f0);
  // |(A − B)/(2j)| = |A − B|/2
  return Math.hypot(ar - br, ai - bi) / 2;
}

export const checks = [
  {
    name: 'truncated sinusoid: the spectrum IS the Dirichlet kernel',
    category: 'numeric',
    run() {
      const T = 12; // ms → N = 96 samples
      const { mag, binHz, n } = spectrumOf({ ...BASE, T }, T, 4096);
      const gap = maxGap(
        range(600, (i) => i + 60), // bins spanning ~30 Hz … 1.2 kHz
        (j) => mag[j],
        (j) => dirichletMag(j * binHz, BASE.f0, n)
      );
      return { ok: gap / n < 1e-12, detail: `écart max ${(gap / n).toExponential(2)}·N` };
    },
  },
  {
    name: 'Parseval through the zero-padded FFT',
    category: 'numeric',
    run() {
      const T = 17;
      const xw = windowedSamples({ ...BASE, win: 'hann', T }, T);
      const { re, im } = spectrumOf({ ...BASE, win: 'hann', T }, T, 8192);
      let et = 0;
      for (const v of xw) et += v * v;
      let ef = 0;
      for (let k = 0; k < re.length; k++) ef += re[k] * re[k] + im[k] * im[k];
      const rel = Math.abs(et - ef / re.length) / et;
      return { ok: rel < 1e-12, detail: `écart relatif ${rel.toExponential(2)}` };
    },
  },
  {
    name: 'bare truncation: T·B₃ = 0.886 as soon as the lobe is narrow against f₀',
    category: 'numeric',
    run() {
      // 0.8858 = twice the 0.4429 half-width of |sinc| — the same constant the
      // signal catalogue measures on the gate, seen from the other side.
      // Below ~10 ms the lobe is several hundred Hz wide and the image at −f₀
      // leans on it, which widens the measurement by a few percent: physics,
      // not a tolerance to loosen, so the identity is asserted where it holds.
      const gap = maxGap([20, 33, 55, 96, 150, 190], (T) => obs({ T }).tb3.value, () => 0.8858);
      return { ok: gap < 0.01, detail: `écart max ${gap.toFixed(5)}` };
    },
  },
  {
    name: 'the windows widen the lobe by the known factors',
    category: 'numeric',
    run() {
      // −3 dB main-lobe widths, in units of 1/T: rect 0.886, Hamming 1.30,
      // Hann 1.44, Blackman 1.64
      const want = { rect: 0.8858, hamming: 1.303, hann: 1.4406, blackman: 1.6429 };
      const gap = maxGap(
        Object.keys(want),
        (win) => obs({ win, T: 60 }).tb3.value / want[win] - 1
      );
      return { ok: gap < 0.02, detail: `écart relatif max ${(100 * gap).toFixed(2)} %` };
    },
  },
  {
    name: 'the width falls as 1/T: slope −1 on log–log axes',
    category: 'numeric',
    run() {
      const o = obs({ T: 40 });
      const x = o.widthVsT.x;
      const y = o.widthVsT.y;
      // fitted over the upper half of the sweep, for the same reason: at the
      // short-duration end the negative-frequency image inflates the width
      const slope = Math.log(y[29] / y[10]) / Math.log(x[29] / x[10]);
      return { ok: Math.abs(slope + 1) < 0.02, detail: `pente ${slope.toFixed(4)}` };
    },
  },
  {
    name: 'chirp: two regimes, a minimum between them (Gabor)',
    category: 'numeric',
    run() {
      // The claim is the SHAPE, not a closed form: the width falls as the
      // truncation lobe 0.886/T, rises as the swept band k·T, and the trough
      // between the two is the best duration. The −3 dB width of a swept band
      // sits a little under k·T (the edges roll off), hence the 15 % on that
      // asymptote against 3 % on the clean one.
      const k = 2000;
      const o = obs({ sig: 'chirp', win: 'rect', k });
      const x = o.widthVsT.x;
      const y = o.widthVsT.y;
      let iMin = -1;
      for (let i = 0; i < y.length; i++)
        if (Number.isFinite(y[i]) && (iMin < 0 || y[i] < y[iMin])) iMin = i;
      const interior = iMin > 1 && iMin < y.length - 2;
      const left = Math.abs(y[2] - 0.8858 / (x[2] / 1000)) / y[2]; // truncation arm
      const right = Math.abs(y[29] - k * (x[29] / 1000)) / y[29]; // sweep arm
      return {
        ok: interior && left < 0.03 && right < 0.15,
        detail:
          `creux à ${x[iMin].toFixed(1)} ms (k·T² = ${(k * (x[iMin] / 1000) ** 2).toFixed(1)}), ` +
          `bras 1/T ${(100 * left).toFixed(1)} %, bras k·T ${(100 * right).toFixed(1)} %`,
      };
    },
  },
  {
    name: 'damped sinusoid: the width saturates at 1/(πτ)',
    category: 'numeric',
    run() {
      // for T ≫ τ the record holds the whole decay: the line keeps the
      // Lorentzian width the signal gave itself, and no window narrows it
      const tau = 8; // ms
      const o = obs({ sig: 'damped', win: 'rect', tau, T: 200 });
      const want = 1000 / (Math.PI * tau); // Hz
      const rel = Math.abs(o.b3.value - want) / want;
      return {
        ok: rel < 0.05,
        detail: `mesurée ${o.b3.value.toFixed(2)} Hz, théorie ${want.toFixed(2)} Hz`,
      };
    },
  },
  {
    name: 'burst: past its duration, the width stops moving',
    category: 'numeric',
    run() {
      // past the burst the window only adds zeros — interpolation, not
      // resolution (and Hann would distort, hence the bare truncation here)
      const tb = 25;
      const a = obs({ sig: 'burst', win: 'rect', tb, T: 60 }).b3.value;
      const b = obs({ sig: 'burst', win: 'rect', tb, T: 200 }).b3.value;
      const want = 0.8858 * (1000 / tb);
      const ok = Math.abs(a - b) / a < 0.02 && Math.abs(a - want) / want < 0.05;
      return { ok, detail: `T=60 → ${a.toFixed(2)} Hz, T=200 → ${b.toFixed(2)} Hz, 0.886/T_salve = ${want.toFixed(2)} Hz` };
    },
  },
  {
    name: 'the signal does not depend on the observation duration',
    category: 'numeric',
    run() {
      // the first samples of a short record and of a long one are the same
      // signal: moving T moves the observation, never the physics
      const short = windowedSamples({ ...BASE, T: 20 }, 20);
      const long = windowedSamples({ ...BASE, T: 200 }, 200);
      const gap = maxGap(range(short.length), (i) => short[i], (i) => long[i]);
      return { ok: gap === 0, detail: `écart ${gap} sur ${short.length} échantillons` };
    },
  },
  standardChecks.determinism(compute, { ...BASE, sig: 'chirp' }, 'spectrum'),
];
