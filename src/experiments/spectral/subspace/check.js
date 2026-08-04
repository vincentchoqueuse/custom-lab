import { compute } from './compute.js';
import { F_LO, F_HI, F_HI_FAR } from './frame.js';
import { standardChecks, maxGap, range } from '../../../core/checks.js';
import { mulberry32, gaussFrom } from '../../../core/rng.js';
import {
  covariance,
  hermitianEig,
  musicPseudo,
  rootMusic,
  esprit,
  lsAmplitudes,
} from '../_lib/subspace.js';

const FS = 1000;
const BASE = { sources: 2, df: 0.5, snr: 25, N: 256, M: 32, d: 2, seed: 34 };

/** A record of d complex exponentials, noise-free. */
const tones = (N, freqs) => {
  const xr = new Float64Array(N);
  const xi = new Float64Array(N);
  for (let n = 0; n < N; n++)
    for (const f of freqs) {
      const w = (2 * Math.PI * f * n) / FS;
      xr[n] += Math.cos(w);
      xi[n] += Math.sin(w);
    }
  return { xr, xi };
};

export const checks = [
  {
    name: 'eigendecomposition: R·v = λ·v with orthonormal vectors',
    category: 'numeric',
    run() {
      // The building block everything depends on, pinned by its DEFINITION
      // rather than by its result: on randomly drawn Hermitian matrices, the
      // pair (λ, v) must satisfy the eigenvalue equation, and the basis must be
      // orthonormal. If either gives way, MUSIC and ESPRIT would return
      // plausible and wrong numbers.
      const g = gaussFrom(mulberry32(7));
      let worstEig = 0;
      let worstOrtho = 0;
      for (const M of [4, 8, 16]) {
        const re = new Float64Array(M * M);
        const im = new Float64Array(M * M);
        for (let i = 0; i < M; i++)
          for (let j = i; j < M; j++) {
            const a = g();
            const b = i === j ? 0 : g();
            re[i * M + j] = a;
            re[j * M + i] = a;
            im[i * M + j] = b;
            im[j * M + i] = -b;
          }
        const e = hermitianEig(re, im, M);
        for (let k = 0; k < M; k++)
          for (let i = 0; i < M; i++) {
            let sr = 0;
            let si = 0;
            for (let j = 0; j < M; j++) {
              const ar = re[i * M + j];
              const ai = im[i * M + j];
              const br = e.re[j * M + k];
              const bi = e.im[j * M + k];
              sr += ar * br - ai * bi;
              si += ar * bi + ai * br;
            }
            worstEig = Math.max(
              worstEig,
              Math.hypot(sr - e.values[k] * e.re[i * M + k], si - e.values[k] * e.im[i * M + k])
            );
          }
        for (let p = 0; p < M; p++)
          for (let q = 0; q < M; q++) {
            let sr = 0;
            let si = 0;
            for (let i = 0; i < M; i++) {
              const ar = e.re[i * M + p];
              const ai = e.im[i * M + p];
              const br = e.re[i * M + q];
              const bi = e.im[i * M + q];
              sr += ar * br + ai * bi;
              si += ar * bi - ai * br;
            }
            worstOrtho = Math.max(worstOrtho, Math.hypot(sr - (p === q ? 1 : 0), si));
          }
      }
      return {
        ok: worstEig < 1e-11 && worstOrtho < 1e-11,
        detail: `‖Rv−λv‖ ≤ ${worstEig.toExponential(2)}, ‖VᴴV−I‖ ≤ ${worstOrtho.toExponential(2)}`,
      };
    },
  },
  {
    name: 'with no noise, the rank of the covariance IS the number of sources',
    category: 'numeric',
    run() {
      // The structure the whole method rests on: d exponentials span a subspace
      // of dimension exactly d, hence M−d STRICTLY zero eigenvalues. That is an
      // identity, not a tendency — and it is what justifies speaking of a "noise
      // subspace".
      const bad = [];
      for (const freqs of [[200], [200, 240], [200, 201.2, 330]]) {
        const M = 20;
        const { xr, xi } = tones(512, freqs);
        const e = hermitianEig(...Object.values(covariance(xr, xi, M)).slice(0, 2), M);
        const top = e.values[0];
        let worst = 0;
        for (let k = freqs.length; k < M; k++) worst = Math.max(worst, Math.abs(e.values[k]) / top);
        if (worst > 1e-11) bad.push(`d=${freqs.length}: residual λ ${worst.toExponential(2)}`);
      }
      return { ok: bad.length === 0, detail: bad.length ? bad.join(' · ') : 'λ_{d+1..M} = 0 to 1e-11 for d = 1, 2, 3' };
    },
  },
  {
    name: 'with no noise, ESPRIT returns the frequencies to machine precision',
    category: 'numeric',
    run() {
      // ESPRIT sweeps nothing: its precision is limited not by a grid but by
      // the conditioning. Noise-free, the error must be that of floating-point
      // arithmetic, not that of a step.
      const M = 20;
      const worst = maxGap(
        [[200, 240], [200, 203.9], [200, 201.2, 330]],
        (freqs) => {
          const { xr, xi } = tones(512, freqs);
          const R = covariance(xr, xi, M);
          const e = hermitianEig(R.re, R.im, M);
          const f = esprit(e, M, freqs.length);
          let w = 0;
          for (const target of freqs) {
            let best = Infinity;
            for (const v of f) best = Math.min(best, Math.abs(v * FS - target));
            w = Math.max(w, best);
          }
          return w;
        },
        () => 0
      );
      return { ok: worst < 1e-8, detail: `max error ${worst.toExponential(2)} Hz` };
    },
  },
  {
    name: 'with no noise, root-MUSIC reaches the floor of its double root',
    category: 'numeric',
    run() {
      // And not machine precision, FOR A REASON: the root-MUSIC polynomial has
      // DOUBLE roots on the unit circle (z_k and its conjugate inverse coincide
      // when |z| = 1). On a root of multiplicity m, the Durand–Kerner iteration
      // caps at ε^{1/m}, so ≈ 1.5e-8 for m = 2. Measured: a few 1e-9 in
      // normalized frequency. Taking 1e-15 here would demand of the algebra what
      // it cannot give; taking 1e-2 would mask a real regression.
      const M = 20;
      const worst = maxGap(
        [[200, 240], [200, 203.9], [200, 201.2, 330]],
        (freqs) => {
          const { xr, xi } = tones(512, freqs);
          const R = covariance(xr, xi, M);
          const e = hermitianEig(R.re, R.im, M);
          const f = rootMusic(e, M, freqs.length);
          let w = 0;
          for (const target of freqs) {
            let best = Infinity;
            for (const v of f) best = Math.min(best, Math.abs(v * FS - target));
            w = Math.max(w, best);
          }
          return w;
        },
        () => 0
      );
      return { ok: worst < 1e-4, detail: `max error ${worst.toExponential(2)} Hz (√ε floor of the double root)` };
    },
  },
  {
    name: 'the pseudo-spectrum peaks at the true frequencies',
    category: 'numeric',
    run() {
      // MUSIC sweeps, so its precision IS that of the grid: it is asked to be
      // right to within one step, no better.
      const M = 20;
      const freqs = [200, 203.9];
      const { xr, xi } = tones(512, freqs);
      const R = covariance(xr, xi, M);
      const e = hermitianEig(R.re, R.im, M);
      const n = 4001;
      const grid = Float64Array.from({ length: n }, (_, k) => (180 + (40 * k) / (n - 1)) / FS);
      const ps = musicPseudo(e, M, 2, grid);
      const peaks = [];
      for (let k = 1; k < n - 1; k++)
        if (ps[k] > ps[k - 1] && ps[k] >= ps[k + 1] && ps[k] > 1e6) peaks.push(grid[k] * FS);
      const step = (40 / (n - 1)) * 1.001;
      const ok =
        peaks.length === 2 &&
        freqs.every((f) => peaks.some((p) => Math.abs(p - f) <= step));
      return { ok, detail: `${peaks.length} peaks: ${peaks.map((p) => p.toFixed(3)).join(', ')} Hz (step ${step.toFixed(4)})` };
    },
  },
  {
    name: 'THE point: MUSIC separates what the periodogram merges into one hump',
    category: 'numeric',
    run() {
      // The reason the experiment exists, stated as a verification: at
      // 0.3 × Fs/N the periodogram has ONLY ONE maximum and the pseudo-spectrum
      // has TWO, on the same noisy record.
      const { observables: o } = compute({ ...BASE });
      const count = (s, thresh) => {
        let c = 0;
        for (let k = 1; k < s.y.length - 1; k++)
          if (s.y[k] > s.y[k - 1] && s.y[k] >= s.y[k + 1] && s.y[k] > thresh) c++;
        return c;
      };
      const nP = count(o.periodogram, -10);
      const nM = count(o.pseudo, -20);
      return {
        ok: nP === 1 && nM === 2,
        detail: `periodogram ${nP} peak, pseudo-spectrum ${nM} peaks`,
      };
    },
  },
  {
    name: 'the eigenvalue plateau is the true noise level 2σ²',
    category: 'statistical',
    run() {
      // Two corrections of physics against what was first written here.
      //
      // 1. The level is not σ² but 2σ²: the noise is circular complex and
      //    carries σ² PER QUADRATURE. Three decibels apart, invisible to the
      //    eye on a plateau and wrong all the same.
      // 2. One cannot demand that EVERY eigenvalue of the plateau equal 2σ². On
      //    a covariance ESTIMATED from L snapshots, the noise eigenvalues spread
      //    according to Marchenko–Pastur, between (1±√(M/L))²·2σ² — here −4.0 to
      //    +2.9 dB. That spread is physical and SHOWS on the view; it is the
      //    MEAN of the plateau that equals 2σ², with a standard error of
      //    √(M/L)/√(M−d) ≈ 8 %.
      const { observables: o } = compute({ ...BASE });
      const M = o.eigenvalues.y.length;
      const L = o.snapshots.value;
      const plateau = Array.from(o.eigenvalues.y).slice(6); // plainly inside the noise
      const mean = plateau.reduce((a, b) => a + b, 0) / plateau.length;
      const c = Math.sqrt(M / L);
      const edges = [10 * Math.log10((1 - c) ** 2), 10 * Math.log10((1 + c) ** 2)];
      const tol = 4 * (10 * Math.log10(1 + c / Math.sqrt(plateau.length)));
      const lo = Math.min(...plateau) - o.noiseLine;
      const hi = Math.max(...plateau) - o.noiseLine;
      return {
        ok: Math.abs(mean - o.noiseLine) < tol && lo > edges[0] - 1.5 && hi < edges[1] + 1.5,
        detail:
          `mean ${(mean - o.noiseLine).toFixed(2)} dB from 2σ² (tol ${tol.toFixed(2)}), ` +
          `spread [${lo.toFixed(1)}, ${hi.toFixed(1)}] vs Marchenko–Pastur [${edges[0].toFixed(1)}, ${edges[1].toFixed(1)}]`,
      };
    },
  },
  {
    name: 'getting d wrong: too small loses a source, too large invents one',
    category: 'numeric',
    run() {
      // A second correction of the intended pedagogy by measurement. It was
      // written that a d too large made "phantom peaks" appear on the
      // pseudo-spectrum. That is false here: at d = 5 for 3 sources, the spurious
      // ripples stay 50 dB below the real peaks and the trace stays clean. Swept
      // MUSIC is FORGIVING of an overestimated d.
      //
      // What breaks, and far more plainly, are the PARAMETRIC estimators:
      // root-MUSIC and ESPRIT return exactly d numbers, so at d = 5 they return
      // five frequencies of which two match no source — measured at 443 and
      // 839 Hz. An invented figure is more dangerous than a low peak, because it
      // looks like a result.
      const peaks = (d) => {
        const { observables: o } = compute({ ...BASE, sources: 3, d, snr: 30 });
        let c = 0;
        for (let k = 1; k < o.pseudo.y.length - 1; k++)
          if (o.pseudo.y[k] > o.pseudo.y[k - 1] && o.pseudo.y[k] >= o.pseudo.y[k + 1] && o.pseudo.y[k] > -40)
            c++;
        return c;
      };
      const truth = [200, 200 + 0.5 * (1000 / BASE.N), 330];
      const spurious = (d) => {
        const { observables: o } = compute({ ...BASE, sources: 3, d, snr: 30 });
        const est = [...o.espritMarks.x];
        if (est.length !== d || est.some((v) => !Number.isFinite(v))) return -1;
        return est.filter((v) => Math.min(...truth.map((t) => Math.abs(v - t))) > 5).length;
      };
      const p2 = peaks(2);
      const p3 = peaks(3);
      const s3 = spurious(3);
      const s5 = spurious(5);
      return {
        ok: p2 < 3 && p3 === 3 && s3 === 0 && s5 >= 2,
        detail: `d=2 → ${p2} peaks · d=3 → ${p3} peaks, ${s3} spurious estimate · d=5 → ${s5} spurious out of 5`,
      };
    },
  },
  {
    name: 'with no noise, least squares returns the exact amplitudes',
    category: 'numeric',
    run() {
      // Once the frequencies are known the model is LINEAR: the least squares is
      // therefore not an approximation but a solution, and noise-free it must
      // return the amplitude to the digit and a zero residual. If this step
      // drifted, the whole "estimated spectrum" would become a plausible and
      // wrong drawing.
      const N = 256;
      const f = [200 / FS, 203.9 / FS, 330 / FS];
      const A = [1, 0.5, 0.25];
      const xr = new Float64Array(N);
      const xi = new Float64Array(N);
      for (let n = 0; n < N; n++)
        for (let k = 0; k < 3; k++) {
          const w = 2 * Math.PI * f[k] * n;
          xr[n] += A[k] * Math.cos(w);
          xi[n] += A[k] * Math.sin(w);
        }
      const ls = lsAmplitudes(xr, xi, Float64Array.from(f));
      const worst = maxGap(range(3), (k) => Math.sqrt(ls.power[k]), (k) => A[k]);
      return {
        ok: worst < 1e-9 && ls.noise < 1e-20,
        detail: `|ΔA| ≤ ${worst.toExponential(2)}, residual ${ls.noise.toExponential(2)}`,
      };
    },
  },
  {
    name: 'two INDEPENDENT noise estimates land on the true level',
    category: 'statistical',
    run() {
      // The model residual and the mean of the eigenvalue plateau share no
      // computation: one comes from a least squares in the time domain, the
      // other from an eigendecomposition. That they agree, and agree with the
      // truth, is what allows saying the model EXPLAINS the measurement — and
      // not merely that it found lines in the right place.
      //
      // Tolerance: the relative error of a power estimated over N points is
      // ≈ 1/√N = 6 % at N = 256, so 0.27 dB; 4 SE are taken, rounded to 1.5 dB
      // to cover the spread of the plateau as well.
      const bad = [];
      for (const snr of [40, 25, 10]) {
        const { observables: o } = compute({ ...BASE, snr });
        // BOTH residuals (one per estimator) and the plateau, against the truth
        for (const [name, v] of [
          ['root-MUSIC', o.noiseRoot.value],
          ['ESPRIT', o.noiseEsprit.value],
          ['eigenvalues', o.noiseEigen.value],
        ]) {
          if (Math.abs(v - o.noiseRef.value) > 1.5)
            bad.push(`SNR ${snr}, ${name}: ${v.toFixed(2)} vs true ${o.noiseRef.value.toFixed(2)} dB`);
        }
      }
      return {
        ok: bad.length === 0,
        detail: bad.length ? bad.join(' · ') : 'agreement within 1.5 dB at 40, 25 and 10 dB',
      };
    },
  },
  {
    name: 'when the model is wrong, the residual says so — it goes ABOVE',
    category: 'numeric',
    run() {
      // The property that makes the view useful rather than decorative. With d
      // too small an entire source falls into the residual: the noise estimate
      // then cannot be low, and it plainly exceeds the true level. That is a
      // diagnostic, and it comes free.
      const ok3 = compute({ ...BASE, sources: 3, d: 3, snr: 30 }).observables;
      const bad3 = compute({ ...BASE, sources: 3, d: 1, snr: 30 }).observables;
      return {
        ok:
          Math.abs(ok3.noiseEsprit.value - ok3.noiseRef.value) < 1.5 &&
          bad3.noiseEsprit.value > ok3.noiseRef.value + 6 &&
          bad3.noiseRoot.value > ok3.noiseRef.value + 6,
        detail:
          `d right: ${ok3.noiseEsprit.value.toFixed(2)} dB (true ${ok3.noiseRef.value.toFixed(2)}) · ` +
          `d = 1: ESPRIT ${bad3.noiseEsprit.value.toFixed(2)}, root-MUSIC ${bad3.noiseRoot.value.toFixed(2)} dB`,
      };
    },
  },
  {
    name: 'the frequency framing no longer depends on N or Δf',
    category: 'numeric',
    run() {
      // The frame is pinned SO THAT the resolution can be seen to move: if the
      // window followed the Fourier limit, doubling N would bring the two lines
      // closer and tighten the frame by as much — they would stay the same
      // distance apart on screen and the experiment would show nothing. Both
      // computation grids therefore carry the bounds from frame.js, the very
      // ones the manifest gives the axis.
      const bad = [];
      for (const N of [128, 256, 512, 1024])
        for (const df of [0.05, 0.5, 3]) {
          const o = compute({ ...BASE, N, df }).observables;
          const px = o.periodogram.x;
          const gx = o.pseudo.x;
          const span = (a) => [a[0], a[a.length - 1]];
          const [pLo, pHi] = span(px);
          const [gLo, gHi] = span(gx);
          // the periodogram lives on the FFT grid: its ends fall within the
          // first step of 1000/4096 Hz after the bounds
          const step = 1000 / 4096;
          if (pLo < F_LO || pLo > F_LO + step || pHi > F_HI || pHi < F_HI - step)
            bad.push(`N=${N} df=${df} periodogram ${pLo.toFixed(1)}…${pHi.toFixed(1)}`);
          if (Math.abs(gLo - F_LO) > 1e-9 || Math.abs(gHi - F_HI) > 1e-9)
            bad.push(`N=${N} df=${df} pseudo-spectrum ${gLo.toFixed(1)}…${gHi.toFixed(1)}`);
        }
      // and the window widens — once only, on the three-source configuration —
      // to make room for the line off to the side
      const far = compute({ ...BASE, sources: 3, d: 3 }).observables.pseudo.x;
      if (Math.abs(far[far.length - 1] - F_HI_FAR) > 1e-9)
        bad.push(`3 sources: ${far[far.length - 1].toFixed(1)} instead of ${F_HI_FAR}`);
      return {
        ok: bad.length === 0,
        detail: bad.length ? bad.join(' · ') : `${F_LO}–${F_HI} Hz over 12 settings, ${F_HI_FAR} at 3 sources`,
      };
    },
  },
  {
    name: 'an invented frequency gets a number, even outside the frame',
    category: 'numeric',
    run() {
      // With the frame pinned, a phantom line at 840 Hz no longer stretches the
      // axis: it leaves the field, and this figure is what denounces it. It must
      // stay at the level of the estimation error while d is right, and jump by
      // several hundred hertz as soon as it is not.
      const ok = compute({ ...BASE, sources: 3, d: 3 }).observables;
      const over = compute({ ...BASE, sources: 3, d: 5 }).observables;
      return {
        ok:
          ok.strayRoot.value < 1 &&
          ok.strayEsprit.value < 1 &&
          over.strayRoot.value > 100 &&
          over.strayEsprit.value > 100,
        detail:
          `d right: ${ok.strayRoot.value.toFixed(2)} Hz · ` +
          `d = 5: root ${over.strayRoot.value.toFixed(1)}, ESPRIT ${over.strayEsprit.value.toFixed(1)} Hz`,
      };
    },
  },
  standardChecks.determinism(compute, BASE, 'pseudo'),
  standardChecks.determinism(compute, BASE, 'eigenvalues'),
];
