// The harness of the pyramid: an orthonormal basis makes every claim an
// identity, and the checks demand identities — reconstruction, Parseval, the
// vanishing moments, the compression error known in advance, and the duel
// that swaps winners between the blocks and the sinusoid.
import { compute } from './compute.js';
import { standardChecks, maxAbsDiff } from '../../../core/checks.js';
import { dwt, idwt } from '../_lib/wavelets.js';

const P = (over = {}) => ({ signal: 'burst', wavelet: 'haar', K: 24, ...over });

export const checks = [
  {
    name: 'perfect reconstruction: K = 512 rebuilds every signal exactly, both wavelets',
    category: 'numeric',
    run() {
      let worst = 0;
      for (const wavelet of ['haar', 'db4'])
        for (const signal of ['burst', 'blocks', 'sine', 'ramp']) {
          const { observables: o } = compute(P({ signal, wavelet, K: 512 }));
          worst = Math.max(worst, maxAbsDiff(o.reconXY.y, o.signalXY.y));
        }
      return { ok: worst < 1e-12, detail: `max|Δ|=${worst.toExponential(1)}` };
    },
  },
  {
    name: 'Parseval: coefficient energy equals signal energy, both wavelets',
    category: 'numeric',
    run() {
      let worst = 0;
      for (const wavelet of ['haar', 'db4']) {
        const x = compute(P({ wavelet })).observables.signalXY.y;
        const { approx, details } = dwt(Float64Array.from(x), 3, wavelet);
        const eX = x.reduce((a, b) => a + b * b, 0);
        const eC =
          approx.reduce((a, b) => a + b * b, 0) +
          details.reduce((s, d) => s + d.reduce((a, b) => a + b * b, 0), 0);
        worst = Math.max(worst, Math.abs(eC - eX) / eX);
      }
      return { ok: worst < 1e-12, detail: `rel err=${worst.toExponential(1)}` };
    },
  },
  {
    name: 'db4 annihilates the ramp: interior details are ZERO, not small',
    category: 'numeric',
    run() {
      // two vanishing moments kill any straight line; only the wavelets whose
      // periodized support crosses the wrap see the boundary jump — they are
      // the honest bill of periodization, and they are excluded by support
      const { observables: o } = compute(P({ signal: 'ramp', wavelet: 'db4' }));
      let worst = 0;
      for (const [d, span] of [
        [o.d1, 4],
        [o.d2, 8],
      ]) {
        const n = d.y.length;
        for (let k = 0; k < n; k++) {
          const start = (512 / n) * k; // first sample the wavelet touches
          if (start + span < 512) worst = Math.max(worst, Math.abs(d.y[k]));
        }
      }
      return { ok: worst < 1e-13, detail: `max interior |d|=${worst.toExponential(1)}` };
    },
  },
  {
    name: 'Haar on the blocks: nonzero details bounded by the jumps, level by level',
    category: 'numeric',
    run() {
      // a Haar detail is nonzero only where its support straddles a jump, and
      // each of the 11 breakpoints (+ the wrap) straddles at most one support
      // per level — an aligned jump can even hide from a level entirely
      const { observables: o } = compute(P({ signal: 'blocks', wavelet: 'haar' }));
      const counts = [o.d1, o.d2, o.d3].map((d) => d.y.filter((v) => Math.abs(v) > 1e-9).length);
      const ok = counts.every((c) => c <= 12);
      return { ok, detail: `nnz per level: ${counts.join(', ')} (≤ 12)` };
    },
  },
  {
    name: 'the compression error is known before reconstructing: RMS² = discarded energy / N',
    category: 'numeric',
    run() {
      // orthonormality makes the K-term error a closed form — the module's
      // Eckart–Young. Verified through the full pipeline at three K.
      let worst = 0;
      for (const K of [8, 40, 120]) {
        const { observables: o } = compute(P({ signal: 'blocks', K }));
        const x = o.signalXY.y;
        const { approx, details } = dwt(Float64Array.from(x), 3, 'haar');
        const mags = [
          ...approx.map((v) => Math.abs(v)),
          ...details.flatMap((d) => [...d].map((v) => Math.abs(v))),
        ].sort((a, b) => b - a);
        let discarded = 0;
        for (let i = K; i < mags.length; i++) discarded += mags[i] ** 2;
        worst = Math.max(worst, Math.abs(o.rmsErr.value ** 2 - discarded / 512));
      }
      return { ok: worst < 1e-12, detail: `max|Δ|=${worst.toExponential(1)}` };
    },
  },
  {
    name: 'the duel swaps winners: wavelets win the blocks, Fourier wins the sinusoid',
    category: 'numeric',
    run() {
      // sparsity is a property of the PAIR: K₉₅ must invert between the two
      // signals — and on a bin-centered sinusoid Fourier needs exactly 2
      const b = compute(P({ signal: 'blocks', wavelet: 'haar' })).observables;
      const s = compute(P({ signal: 'sine', wavelet: 'haar' })).observables;
      const ok = b.k95w.value < b.k95f.value && s.k95f.value === 2 && s.k95w.value > 20;
      return {
        ok,
        detail: `blocks ${b.k95w.value} vs ${b.k95f.value} · sine ${s.k95w.value} vs ${s.k95f.value}`,
      };
    },
  },
  {
    name: 'the pyramid points at the click: fine-scale energy concentrates at t = 0.62',
    category: 'numeric',
    run() {
      // localization, quantified as CONCENTRATION: energy density inside
      // ±25 ms of the click against density outside. Not a raw share — Haar's
      // frequency selectivity is poor, so the steady tone leaks a fifth of
      // d₁'s energy across the whole record; the click still packs its energy
      // ~66× denser than that background, and that ratio is the claim.
      const { observables: o } = compute(P({ signal: 'burst' }));
      let inside = 0;
      let total = 0;
      let nIn = 0;
      for (let k = 0; k < o.d1.y.length; k++) {
        const e = o.d1.y[k] ** 2;
        total += e;
        if (Math.abs(o.d1.x[k] - 0.62) < 0.025) {
          inside += e;
          nIn++;
        }
      }
      const n = o.d1.y.length;
      const ratio = inside / nIn / ((total - inside) / (n - nIn));
      return { ok: ratio > 20, detail: `density ratio = ${ratio.toFixed(0)}×` };
    },
  },
  standardChecks.determinism(compute, P(), 'reconXY'),
];
