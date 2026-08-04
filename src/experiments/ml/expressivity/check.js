import { compute, N, FS, NFFT } from './compute.js';
import { standardChecks } from '../../../core/checks.js';
import { mulberry32, gaussFrom } from '../../../core/rng.js';
import { tone, magSpectrum } from '../../../core/dsp.js';
import { denseMatrix, toeplitzMatrix, matvec, convolve } from '../_lib/nn.js';

const BASE = {
  structure: 'toeplitz',
  act: 'relu',
  kernel: 9,
  scale: 1.5,
  signal: 'sine',
  seed: 34,
};

export const checks = [
  {
    name: 'two linear layers are ONE matrix — exactly',
    category: 'numeric',
    run() {
      // The one-line theorem that justifies every activation in the world:
      // W₂(W₁x) = (W₂W₁)x. So the two matrices are composed by hand and
      // compared with the activation-free network. Nothing statistical, nothing
      // approximate: this is associativity.
      const gauss = gaussFrom(mulberry32(7));
      const W1 = denseMatrix(N, N, 1.5, gauss);
      const W2 = denseMatrix(N, N, 1.5, gauss);
      const x = tone(N, 8, { fs: FS });

      const twoSteps = matvec(W2, matvec(W1, x, N, N), N, N);
      // the product W₂W₁, formed explicitly
      const W = new Float64Array(N * N);
      for (let i = 0; i < N; i++)
        for (let k = 0; k < N; k++) {
          const a = W2[i * N + k];
          if (a === 0) continue;
          for (let j = 0; j < N; j++) W[i * N + j] += a * W1[k * N + j];
        }
      const oneStep = matvec(W, x, N, N);

      let worst = 0;
      let scale = 0;
      for (let i = 0; i < N; i++) {
        worst = Math.max(worst, Math.abs(twoSteps[i] - oneStep[i]));
        scale = Math.max(scale, Math.abs(oneStep[i]));
      }
      return {
        ok: worst / scale < 1e-12,
        detail: `relative gap ${(worst / scale).toExponential(2)} over ${N} outputs`,
      };
    },
  },
  {
    name: 'a Toeplitz matrix IS a convolution',
    category: 'numeric',
    run() {
      // The identity scene 3 states. Not an analogy, not a "looks like": the
      // matrix–vector product and the convolution return the same vector, bit
      // for bit.
      const gauss = gaussFrom(mulberry32(11));
      const bad = [];
      for (const L of [1, 5, 9, 33]) {
        const h = Float64Array.from({ length: L }, () => gauss());
        const W = toeplitzMatrix(N, N, h);
        const x = Float64Array.from({ length: N }, () => gauss());
        const viaMatrix = matvec(W, x, N, N);
        const viaConv = convolve(x, h);
        let worst = 0;
        for (let i = 0; i < N; i++) worst = Math.max(worst, Math.abs(viaMatrix[i] - viaConv[i]));
        if (worst > 1e-12) bad.push(`L=${L}: ${worst.toExponential(1)}`);
      }
      return {
        ok: bad.length === 0,
        detail: bad.length ? bad.join(' · ') : 'W·x = h∗x to 1e-12 for L = 1, 5, 9, 33',
      };
    },
  },
  {
    name: 'and its action in frequency is Y(f) = H(f)·X(f)',
    category: 'numeric',
    run() {
      // The corollary, and the reason the output spectrum FOLLOWS the orange
      // curve. Measured on lines sitting on a bin, hence leakage-free: the ratio
      // of amplitudes is |H| at the matching bin.
      const gauss = gaussFrom(mulberry32(13));
      const h = Float64Array.from({ length: 9 }, () => gauss());
      const H = magSpectrum(h, { nfft: NFFT });
      const bad = [];
      for (const f of [4, 8, 16, 24]) {
        const x = tone(N, f, { fs: FS });
        const y = convolve(x, h);
        const k = Math.round((f * NFFT) / FS);
        // half the signal is enough to leave out the filter's transient, which
        // is not periodic and would skew the reading
        const Y = magSpectrum(y.subarray(N / 2), { nfft: NFFT / 2 });
        const X = magSpectrum(x.subarray(N / 2), { nfft: NFFT / 2 });
        const kk = Math.round((f * (NFFT / 2)) / FS);
        const ratio = Y[kk] / X[kk];
        const th = H[k];
        if (Math.abs(ratio - th) > 1e-9 * Math.max(1, th))
          bad.push(`f=${f}: ${ratio.toFixed(6)} vs ${th.toFixed(6)}`);
      }
      return {
        ok: bad.length === 0,
        detail: bad.length ? bad.join(' · ') : '|Y|/|X| = |H| to 1e-9 for f = 4, 8, 16, 24 Hz',
      };
    },
  },
  {
    name: 'the weight count: N² against L, 1820 times fewer',
    category: 'numeric',
    run() {
      // The whole argument of scene 3, in two integers.
      const dense = compute({ ...BASE, structure: 'dense' }).observables;
      const toep = compute(BASE).observables;
      return {
        ok: dense.nParams.value === N * N && toep.nParams.value === 9,
        detail: `dense ${dense.nParams.value} · Toeplitz ${toep.nParams.value} · ratio ${Math.round(toep.ratio.value)}`,
      };
    },
  },
  {
    name: 'without an activation, the gap to the linear network is zero',
    category: 'numeric',
    run() {
      // The control of scene 1, seen from the statline: the measure the
      // experiment displays must fall to zero exactly when σ is the identity,
      // and be plainly non-zero otherwise. Without that, the projected figure
      // would mean nothing.
      const bad = [];
      for (const structure of ['dense', 'toeplitz']) {
        const lin = compute({ ...BASE, structure, act: 'identity' }).observables.nonlinearity.value;
        const nl = compute({ ...BASE, structure, act: 'relu' }).observables.nonlinearity.value;
        if (lin > 1e-15) bad.push(`${structure} identity: ${lin.toExponential(1)}`);
        if (nl < 0.1) bad.push(`${structure} ReLU: ${nl.toFixed(3)}`);
      }
      return {
        ok: bad.length === 0,
        detail: bad.length ? bad.join(' · ') : 'identity: exactly 0 · ReLU: 0.69 (dense) and 1.06 (Toeplitz)',
      };
    },
  },
  {
    name: 'on an impulse, the output IS the impulse response',
    category: 'numeric',
    run() {
      // What the end of scene 3 asks one to look at: an impulse at the input of
      // a Toeplitz layer comes back out as the kernel, in its place.
      const gauss = gaussFrom(mulberry32(17));
      const h = Float64Array.from({ length: 9 }, () => gauss());
      const x = new Float64Array(N);
      const mid = N / 2;
      x[mid] = 1;
      const y = matvec(toeplitzMatrix(N, N, h), x, N, N);
      let worst = 0;
      for (let k = 0; k < h.length; k++) worst = Math.max(worst, Math.abs(y[mid + k] - h[k]));
      return {
        ok: worst < 1e-15,
        detail: `y[n₀+k] = h[k] to ${worst.toExponential(1)}`,
      };
    },
  },
  standardChecks.determinism(compute, BASE, 'yTime'),
  standardChecks.determinism(compute, { ...BASE, structure: 'dense' }, 'specOut'),
];
