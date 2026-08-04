import { compute, desa2, analytic, unwrap } from './compute.js';
import { standardChecks, maxGap, range } from '../../../core/checks.js';

const FS = 8000;
const BASE = { fc: 1000, ka: 0.5, fam: 40, fdev: 200, ffm: 25, snr: 40, seed: 34 };

/** Une sinusoïde pure de n échantillons. */
const tone = (n, A, f, phi = 0) =>
  Float64Array.from({ length: n }, (_, i) => A * Math.cos((2 * Math.PI * f * i) / FS + phi));

export const checks = [
  {
    name: 'DESA-2 is EXACT on a pure sinusoid — amplitude and frequency',
    category: 'numeric',
    run() {
      // Not "accurate", exact: on x[n] = A·cos(Ωn+φ), both DESA-2 formulas
      // reduce algebraically to A and Ω. That is the property which justifies
      // calling Ψ an ENERGY operator — it carries the product amplitude ×
      // frequency, and two applications suffice to separate them.
      let worstA = 0;
      let worstF = 0;
      for (const [A, f, phi] of [
        [1, 1000, 0],
        [0.4, 500, 0.7],
        [2.5, 1800, -1.2],
        [0.05, 120, 2.4],
      ]) {
        const x = tone(512, A, f, phi);
        const d = desa2(x);
        for (let i = 5; i < 512 - 5; i++) {
          worstA = Math.max(worstA, Math.abs(d.amp[i] - A));
          worstF = Math.max(worstF, Math.abs((d.omega[i] * FS) / (2 * Math.PI) - f));
        }
      }
      return {
        ok: worstA < 1e-11 && worstF < 1e-7,
        detail: `|ΔA| ≤ ${worstA.toExponential(2)}, |Δf| ≤ ${worstF.toExponential(2)} Hz`,
      };
    },
  },
  {
    name: 'DESA-2 folds above Fs/4, by exactly 2(f − Fs/4)',
    category: 'numeric',
    run() {
      // The domain of the estimator, proved rather than observed: Ω comes out of
      // a ½·arccos, so Ω ≤ π/2, so f ≤ Fs/4. Beyond that the estimate folds like
      // an undersampling — and the folding is EXACT, which proves it really is
      // the bound of the arccos at work and not some vague degradation. That is
      // the subject of scene 4.
      const worst = maxGap(
        [2100, 2500, 3000, 3500],
        (f) => {
          const d = desa2(tone(512, 1, f));
          let s = 0;
          let n = 0;
          for (let i = 5; i < 512 - 5; i++) {
            s += (d.omega[i] * FS) / (2 * Math.PI);
            n++;
          }
          return s / n;
        },
        (f) => FS / 2 - f // le replié
      );
      return { ok: worst < 1e-6, detail: `gap to the theoretical folding: ${worst.toExponential(2)} Hz` };
    },
  },
  {
    name: 'Hilbert: |x + j·H{x}| = A on a pure sinusoid',
    category: 'numeric',
    run() {
      // The analytic signal of a sinusoid is A·e^{jΩn}: its modulus is constant,
      // exactly. Verified away from the edges — the DFT treats the record as
      // periodic, and the wrap-around creates a discontinuity there that does not
      // belong to the signal.
      let worst = 0;
      for (const [A, f] of [
        [1.3, 1000],
        [0.2, 250],
        [3, 3000],
      ]) {
        const n = 1024;
        const z = analytic(tone(n, A, f));
        for (let i = 48; i < n - 48; i++)
          worst = Math.max(worst, Math.abs(Math.hypot(z.re[i], z.im[i]) - A));
      }
      return { ok: worst < 1e-11, detail: `|ΔA| max ${worst.toExponential(2)}` };
    },
  },
  {
    name: 'Hilbert: exact on a DFT bin, and not elsewhere',
    category: 'numeric',
    run() {
      // The domain of Hilbert, the mirror of DESA's — and it was first written
      // the wrong way round here, filed under "edge effects". It is not that: the
      // DFT treats the record as PERIODIC, so a sinusoid that does not loop
      // exactly over N samples creates a wrap-around discontinuity whose leakage
      // is GLOBAL and not confined to the edges.
      //
      // On a bin (f a multiple of Fs/N), the instantaneous frequency comes out
      // to within 1e-10. Off bin, to within 8.5 Hz on a 1200 Hz carrier — and
      // that does not improve by moving away from the edges. The check states
      // both, because asserting only the first would be choosing one's
      // frequencies to be right.
      const n = 1024;
      const bin = FS / n;
      const worstOf = (f) => {
        const z = analytic(tone(n, 1, f));
        const ph = Float64Array.from({ length: n }, (_, i) => Math.atan2(z.im[i], z.re[i]));
        const up = unwrap(ph);
        let w = 0;
        for (let i = 49; i < n - 49; i++)
          w = Math.max(w, Math.abs(((up[i + 1] - up[i - 1]) / 2) * (FS / (2 * Math.PI)) - f));
        return w;
      };
      const onBin = maxGap([1000, 1203.125, 1500, 2500], worstOf, () => 0);
      const offBin = worstOf(1200); // 153.6 bins
      return {
        ok: onBin < 1e-8 && offBin > 1 && offBin < 30,
        detail:
          `sur un bin ≤ ${onBin.toExponential(2)} Hz · hors bin (1200 Hz = ${(1200 / bin).toFixed(1)} bins) ` +
          `${offBin.toFixed(2)} Hz — la fuite du raccord périodique`,
      };
    },
  },
  {
    name: 'with no noise, the remaining error is COUPLING, not chance',
    category: 'numeric',
    run() {
      // Neither method is exact on a simultaneously AM AND FM signal: both
      // implicitly assume that the envelope and the phase vary slowly against
      // the carrier. The floor must therefore be small but NON-ZERO, and above
      // all DETERMINISTIC — if it moved with the seed, it would be residual
      // noise and the signal model would be wrong.
      const a = compute({ ...BASE, snr: 200, seed: 1 }).observables;
      const b = compute({ ...BASE, snr: 200, seed: 999 }).observables;
      const same =
        Math.abs(a.errFreqTeager.value - b.errFreqTeager.value) < 1e-6 &&
        Math.abs(a.errAmpHilbert.value - b.errAmpHilbert.value) < 1e-9;
      const bounded =
        a.errAmpHilbert.value < 0.01 &&
        a.errAmpTeager.value < 0.01 &&
        a.errFreqHilbert.value < 6 &&
        a.errFreqTeager.value < 6 &&
        a.errFreqTeager.value > 0.5;
      return {
        ok: same && bounded,
        detail:
          `A : Hilbert ${a.errAmpHilbert.value.toExponential(2)}, Teager ${a.errAmpTeager.value.toExponential(2)} · ` +
          `f : ${a.errFreqHilbert.value.toFixed(2)} / ${a.errFreqTeager.value.toFixed(2)} Hz, indépendant de la graine`,
      };
    },
  },
  {
    name: 'under noise, Teager degrades two to three times faster',
    category: 'statistical',
    run() {
      // The central claim of scene 3, and it is measured before being written.
      // Ψ is a PRODUCT of neighbouring samples: the noise enters it squared with
      // no averaging at all, whereas Hilbert's FFT averages over the whole
      // record. The ratio is taken over three SNRs and three seeds so as not to
      // depend on one draw.
      const bad = [];
      for (const snr of [30, 20, 10]) {
        const ratios = [1, 2, 3].map((seed) => {
          const o = compute({ ...BASE, snr, seed }).observables;
          return o.errFreqTeager.value / o.errFreqHilbert.value;
        });
        const mean = ratios.reduce((a, b) => a + b, 0) / ratios.length;
        if (mean < 1.5) bad.push(`SNR ${snr} dB : rapport ${mean.toFixed(2)} < 1.5`);
      }
      return {
        ok: bad.length === 0,
        detail: bad.length ? bad.join(' · ') : 'Teager/Hilbert ≥ 1.5 at 30, 20 and 10 dB (3 seeds)',
      };
    },
  },
  {
    name: 'Teager announces its own failure (arccos out of domain)',
    category: 'numeric',
    run() {
      // The rare property scene 3 brings forward: when the local sinusoidal
      // model no longer holds, the argument of the arccos leaves [−1, 1] and the
      // algorithm KNOWS it. This counter must be zero when all is well and grow
      // as things degrade — otherwise the statline would show a diagnostic that
      // is not one.
      const c = (snr) => compute({ ...BASE, snr }).observables.clipped.value;
      const clean = c(40);
      const mid = c(20);
      const bad = c(10);
      return {
        ok: clean === 0 && mid > 0 && bad > mid,
        detail: `40 dB → ${clean}, 20 dB → ${mid}, 10 dB → ${bad}`,
      };
    },
  },
  standardChecks.determinism(compute, BASE, 'envHilbert'),
  standardChecks.determinism(compute, BASE, 'freqTeager'),
];
