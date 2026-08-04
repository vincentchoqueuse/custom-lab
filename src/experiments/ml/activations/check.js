import { compute, FS, N, F1 } from './compute.js';
import { standardChecks } from '../../../core/checks.js';
import { ACTIVATIONS } from '../_lib/nn.js';
import { tone, magSpectrum } from '../../../core/dsp.js';

const BASE = { act: 'relu', signal: 'sine', gain: 1, bias: 0, seed: 34 };

/** Peak amplitude of the line at the bin of f, for an input already on a bin. */
const ampAt = (mag, f) => (2 * mag[Math.round((f * N) / FS)]) / N;

export const checks = [
  {
    name: 'ReLU on a sinusoid: the fundamental is EXACTLY A/2',
    category: 'numeric',
    run() {
      // Half-wave rectification has a closed-form Fourier series. Its
      // fundamental is A/2, and it is the ONLY term aliasing does not touch:
      // the harmonics created above Nyquist fold back onto even bins (see the
      // next check), never onto this one — that would take an odd-order
      // harmonic, and a rectifier produces none above the fundamental.
      const bad = [];
      for (const A of [0.5, 1, 2]) {
        const x = tone(N, F1, { fs: FS, amp: A });
        const y = Float64Array.from(x, (v) => (v > 0 ? v : 0));
        const m = ampAt(magSpectrum(y, { nfft: N }), F1);
        if (Math.abs(m - A / 2) > 1e-12) bad.push(`A=${A}: ${m} vs ${A / 2}`);
      }
      return {
        ok: bad.length === 0,
        detail: bad.length ? bad.join(' · ') : 'A/2 to 1e-12 for A = 0.5, 1, 2',
      };
    },
  },
  {
    name: 'and the even harmonics follow 2A/(π(4k²−1)) — up to the aliasing',
    category: 'numeric',
    run() {
      // The exact series of the rectifier: DC A/π, then 2A/(π(4k²−1)) at order
      // 2k. It NEVER stops — so part of the lines are born above Nyquist and
      // fold back into the band. That is measurable: the gap to theory is of
      // order 1e-4, not 1e-15, and it is the aliasing, not a computation error.
      // A discrete-time nonlinearity ALWAYS aliases; this check is here to say
      // so.
      const x = tone(N, F1, { fs: FS });
      const mag = magSpectrum(Float64Array.from(x, (v) => (v > 0 ? v : 0)), { nfft: N });
      const rows = [];
      let worst = 0;
      for (const k of [1, 2, 3, 4]) {
        const th = 2 / (Math.PI * (4 * k * k - 1));
        const me = ampAt(mag, 2 * k * F1);
        worst = Math.max(worst, Math.abs(me - th));
        rows.push(`H${2 * k}: ${me.toFixed(5)}/${th.toFixed(5)}`);
      }
      const dc = mag[0] / N;
      worst = Math.max(worst, Math.abs(dc - 1 / Math.PI));
      return {
        ok: worst < 1e-3 && worst > 1e-9,
        detail: `DC ${dc.toFixed(5)}/${(1 / Math.PI).toFixed(5)} · ${rows.join(' ')} · max gap ${worst.toExponential(1)} (aliasing)`,
      };
    },
  },
  {
    name: 'an ODD activation creates no even harmonic',
    category: 'numeric',
    run() {
      // The parity of σ reads directly off the spectrum, and it is exact: σ odd
      // ⇒ σ(sin) odd ⇒ odd orders only. No statistical tolerance here, this is a
      // symmetry.
      const x = tone(N, F1, { fs: FS, amp: 1.5 });
      const bad = [];
      for (const act of ['identity', 'tanh']) {
        const { f } = ACTIVATIONS[act];
        const mag = magSpectrum(Float64Array.from(x, f), { nfft: N });
        for (const k of [2, 4, 6]) {
          const a = ampAt(mag, k * F1);
          if (a > 1e-12) bad.push(`${act} H${k} = ${a.toExponential(1)}`);
        }
        if (mag[0] / N > 1e-12) bad.push(`${act} DC = ${(mag[0] / N).toExponential(1)}`);
      }
      return {
        ok: bad.length === 0,
        detail: bad.length ? bad.join(' · ') : 'identity and tanh: even orders and DC < 1e-12',
      };
    },
  },
  {
    name: 'a LINEAR layer invents nothing: zero distortion',
    category: 'numeric',
    run() {
      // The counterpoint, and the reason scene 4 exists: without an activation
      // the output spectrum is the input one, line for line.
      const o = compute({ ...BASE, act: 'identity' }).observables;
      return {
        ok: o.thd.value < 1e-9 && Math.abs(o.gainFund.value - 1) < 1e-12,
        detail: `THD ${o.thd.value.toExponential(2)} % · gain ${o.gainFund.value}`,
      };
    },
  },
  {
    name: 'the derivatives take their known values at 0',
    category: 'numeric',
    run() {
      // The four numbers scene 1 projects. σ′(0) decides the learning speed at
      // the start, and the sigmoid caps at 1/4 — that is where the factor which
      // collapses with depth comes from.
      const g = (a) => ACTIVATIONS[a].df(0);
      const bad = [];
      if (Math.abs(g('sigmoid') - 0.25) > 1e-12) bad.push(`sigmoid ${g('sigmoid')}`);
      if (Math.abs(g('tanh') - 1) > 1e-12) bad.push(`tanh ${g('tanh')}`);
      if (Math.abs(g('identity') - 1) > 1e-12) bad.push(`identity ${g('identity')}`);
      if (Math.abs(g('gelu') - 0.5) > 1e-7) bad.push(`GELU ${g('gelu')}`);
      if (Math.abs(ACTIVATIONS.gelu.f(0)) > 1e-12) bad.push(`GELU(0) ${ACTIVATIONS.gelu.f(0)}`);
      return {
        ok: bad.length === 0,
        detail: bad.length ? bad.join(' · ') : "σ′(0) = 0.25 (sigmoid), 1 (tanh, identity), 0.5 (GELU)",
      };
    },
  },
  {
    name: 'saturation smothers the gradient, and the figure is measured',
    category: 'numeric',
    run() {
      // The numbers scene 1 projects, pinned here so they cannot drift in the
      // notes: the derivative of the sigmoid is 0.25 at best, 1.77e-2 at x = 4
      // and 3.35e-4 at x = 8. ReLU gives 1 wherever it gives anything. The ratio
      // at x = 4 is 57, not a thousand — the collapse comes from STACKING
      // layers, not from a single stage, and that is what must be said.
      const sig = (x) => ACTIVATIONS.sigmoid.df(x);
      const bad = [];
      if (ACTIVATIONS.relu.df(4) !== 1) bad.push('ReLU′(4) ≠ 1');
      if (Math.abs(sig(0) - 0.25) > 1e-12) bad.push(`σ′(0) = ${sig(0)}`);
      if (Math.abs(sig(4) - 0.0176627) > 1e-6) bad.push(`σ′(4) = ${sig(4).toExponential(3)}`);
      if (Math.abs(sig(8) - 3.3524e-4) > 1e-8) bad.push(`σ′(8) = ${sig(8).toExponential(3)}`);
      return {
        ok: bad.length === 0,
        detail: bad.length
          ? bad.join(' · ')
          : `σ′ sigmoid: 0.25 at 0, 1.77e-2 at 4, 3.35e-4 at 8 — ×57 then ×746 below ReLU`,
      };
    },
  },
  {
    name: 'two tones: the intermodulation grows three times faster than the signal',
    category: 'numeric',
    run() {
      // The 3-for-1 law: doubling the input raises the fundamental by 6 dB and
      // the 2f₁−f₂ line by 18. It is true in SMALL SIGNAL, and the check
      // verifies both halves of that sentence — 2.99 at g = 0.05→0.1, only 2.41
      // at 0.4→0.8, where the compression of tanh has already eaten the cubic
      // regime. An asymptotic law without its domain of validity is a
      // half-truth, and it is the kind of half-truth a student then applies out
      // of domain.
      const at = (gain) => {
        const o = compute({ ...BASE, act: 'tanh', signal: 'two', gain }).observables;
        return { f: o.gainFund.value * gain, i: o.imd3.value };
      };
      const slope = (g1, g2) => {
        const a = at(g1);
        const b = at(g2);
        return [Math.log2(b.f / a.f), Math.log2(b.i / a.i)];
      };
      const [sf, si] = slope(0.05, 0.1);
      const [, siBig] = slope(0.4, 0.8);
      return {
        ok: Math.abs(sf - 1) < 0.03 && Math.abs(si - 3) < 0.05 && siBig < 2.6,
        detail: `small signal: fundamental ${sf.toFixed(2)}, IMD ${si.toFixed(2)} · large signal: IMD ${siBig.toFixed(2)} (the cubic regime closes)`,
      };
    },
  },
  standardChecks.determinism(compute, { ...BASE, signal: 'noise' }, 'yTime'),
];
