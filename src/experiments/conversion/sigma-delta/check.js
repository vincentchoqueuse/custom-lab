import { compute, modulate, ntfTaps, ntfMag, quantize } from './compute.js';
import { standardChecks, maxGap, range } from '../../../core/checks.js';

const BASE = { bits: 1, order: 1, osr: 64, amp: 0.4, fin: 0.4 };
const obs = (p) => compute({ ...BASE, ...p }).observables;

export const checks = [
  {
    // The identity the whole design rests on, and it holds at ANY resolution
    // because it is algebra and not statistics: in error-feedback form the
    // output is the input plus the quantization error filtered by the NTF,
    // sample by sample.
    name: 'y − x IS e convolved with the NTF, exactly',
    category: 'numeric',
    run() {
      const worst = maxGap([[1, 1], [1, 2], [4, 1], [8, 2]], ([b, L]) => {
        const t = ntfTaps(L);
        const n = 4000;
        const x = new Float64Array(n);
        for (let i = 0; i < n; i++) x[i] = 0.4 * Math.sin((2 * Math.PI * 7 * i) / n);
        const { y, e } = modulate(x, b, L);
        let g = 0;
        for (let i = L; i < n; i++) {
          let c = 0;
          for (let k = 0; k <= L; k++) c += t[k] * e[i - k];
          g = Math.max(g, Math.abs(y[i] - x[i] - c));
        }
        return g;
      });
      return { ok: worst < 1e-12, detail: `worst sample-by-sample gap ${worst.toExponential(2)}` };
    },
  },
  {
    // The NTF's taps are the binomial coefficients of (1 − z⁻¹)^L, and its
    // magnitude is |2 sin(πf)|^L — the two ways of writing the same polynomial,
    // checked against each other rather than each against itself.
    name: 'the taps and |2 sin(πf)|^L are the same polynomial',
    category: 'numeric',
    run() {
      const worst = maxGap([1, 2, 3, 5], (L) => {
        const t = ntfTaps(L);
        return maxGap(range(40), (i) => {
          const f = (0.5 * (i + 0.5)) / 40;
          let re = 0;
          let im = 0;
          for (let k = 0; k <= L; k++) {
            re += t[k] * Math.cos(2 * Math.PI * f * k);
            im -= t[k] * Math.sin(2 * Math.PI * f * k);
          }
          return Math.abs(Math.hypot(re, im) - ntfMag(f, L));
        });
      });
      // and the zero at DC is exact, which is what "no noise at DC" means
      const dc = maxGap([1, 2, 3, 5], (L) => {
        let s = 0;
        for (const v of ntfTaps(L)) s += v;
        return Math.abs(s);
      });
      return {
        ok: worst < 1e-13 && dc < 1e-13,
        detail: `taps vs closed form ${worst.toExponential(2)} · NTF(0) = ${dc.toExponential(2)}`,
      };
    },
  },
  {
    // THE INVOICE, as the exact combinatorial identity it is: with a white
    // error the output noise power is σ_e²·Σt², and Σt² for (1 − z⁻¹)^L is
    // C(2L, L). Checked at four and eight bits, where the error IS close to
    // white — the next check is about where that stops being true.
    name: 'the total noise is C(2L, L) times the quantizer’s, when e is white',
    category: 'statistical',
    run() {
      const bad = [];
      // EIGHT bits and six, not four: at four bits with a first-order NTF the
      // error is already visibly not white and the ratio comes out 1.77. That
      // is not a tolerance to widen, it is the same finding as the next check
      // arriving earlier than expected — the white-error model degrades with
      // the resolution, and it degrades faster at first order because there
      // are fewer past errors mixing into each new one.
      for (const [b, L, want] of [[8, 1, 2], [6, 1, 2], [8, 2, 6], [6, 2, 6]]) {
        const r = obs({ bits: b, order: L, osr: 32 }).totalRatio;
        // the ratio of two power estimates over ~8000 samples: a few per cent
        if (Math.abs(r / want - 1) > 0.06) bad.push(`b=${b} L=${L}: ${r.toFixed(3)} vs ${want}`);
      }
      return { ok: bad.length === 0, detail: bad.join(' · ') || 'C(2,1)=2 and C(4,2)=6, to 6 %' };
    },
  },
  {
    // WHERE THE LINEAR MODEL STOPS. At one bit the quantization error is
    // produced by the signal and correlated with it, so the power identity
    // above fails — measurably, and in the direction the theory cannot
    // predict. Asserting that it fails is the honest check; asserting that it
    // holds would be asserting a lie the whole field knows about.
    name: 'at one bit the white-error model is measurably false',
    category: 'statistical',
    run() {
      const r1 = obs({ bits: 1, order: 1, osr: 32 }).totalRatio;
      const r8 = obs({ bits: 8, order: 1, osr: 32 }).totalRatio;
      return {
        ok: Math.abs(r8 - 2) < 0.12 && Math.abs(r1 - 2) > 0.3,
        detail: `8 bits: ${r8.toFixed(3)} (≈ 2) · 1 bit: ${r1.toFixed(3)} (not 2)`,
      };
    },
  },
  {
    // The exchange rate the experiment exists for, measured on the curve the
    // third tab draws: (20L + 10) dB per octave. Read over the middle of the
    // range, where there are enough in-band bins to measure a floor and the
    // modulator is not yet limited by the analysis window.
    name: 'the SQNR gains 20L + 10 dB per octave of oversampling',
    category: 'statistical',
    run() {
      const bad = [];
      for (const [L, want] of [[1, 9.03], [2, 15.05]]) {
        const c = obs({ bits: 4, order: L }).sqnrCurve;
        // least-squares slope over log2(OSR) = 2…6, in dB per octave
        const n = 5;
        let sx = 0;
        let sy = 0;
        let sxy = 0;
        let sxx = 0;
        for (let i = 0; i < n; i++) {
          sx += c.x[i];
          sy += c.y[i];
          sxy += c.x[i] * c.y[i];
          sxx += c.x[i] * c.x[i];
        }
        const slope = (n * sxy - sx * sy) / (n * sxx - sx * sx);
        if (Math.abs(slope - want) > 1.5) bad.push(`L=${L}: ${slope.toFixed(2)} vs ${want}`);
      }
      return { ok: bad.length === 0, detail: bad.join(' · ') || 'both slopes within 1.5 dB/octave' };
    },
  },
  {
    // A one-bit quantizer is a comparator and a b-bit one is a ladder: the
    // levels have to be where the arithmetic says they are, or every decibel
    // above is measured against the wrong staircase.
    name: 'the quantizer has the levels it claims',
    category: 'numeric',
    run() {
      const one = maxGap([-0.9, -1e-9, 0, 0.3], (v) => Math.abs(quantize(v, 1) - (v >= 0 ? 1 : -1)));
      let worst = -Infinity;
      for (const b of [2, 4, 8]) {
        const step = 2 / (2 ** b - 1);
        for (let i = 0; i < 200; i++) {
          const v = -1 + (2 * i) / 199;
          const q = quantize(v, b);
          worst = Math.max(worst, Math.abs(q - v) - step / 2 - 1e-12);
        }
      }
      return { ok: one === 0 && worst < 0, detail: `1 bit exact · b bits within Δ/2 (worst slack ${worst.toExponential(2)})` };
    },
  },
  standardChecks.determinism(compute, BASE, 'specOut'),
];
