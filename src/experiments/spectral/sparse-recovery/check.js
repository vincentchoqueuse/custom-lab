import {
  compute,
  pursuit,
  correlate,
  fitSet,
  trueFreqs,
  neighbourCoherence,
  synthesize,
  lassoSolve,
  lambdaMax,
  FS,
  KMAX,
} from './compute.js';
import { standardChecks, maxGap, range } from '../../../core/checks.js';
import { mulberry32, gaussFrom } from '../../../core/rng.js';

// The record length is a parameter now, so the checks pin their own — 256, the
// default, and the one spectral/subspace uses.
const N = 256;
const BASE = {
  sources: 2,
  df: 1.5,
  offGrid: 0,
  N,
  over: 2,
  snr: 30,
  algo: 'omp',
  k: 2,
  lam: 0.1,
  alpha: 1,
  seed: 34,
};
// Two lines that fall exactly on the Fourier grid of N = 256 at Fs = 1000, plus
// one plainly off to the side: bins 51, 55 and 84.
const CELL = FS / N;
const F = [51 * CELL, 55 * CELL, 84 * CELL];
const AMP = [1, 1, 1];

/** A noiseless on-grid signal, built here so the checks do not depend on the
 *  compute's own plumbing: K lines at exact grid frequencies of the ×`over`
 *  dictionary, decreasing amplitudes, arbitrary phases. */
function signal(freqs, amps, phases) {
  const x = new Float64Array(N);
  for (let i = 0; i < N; i++) {
    let v = 0;
    for (let j = 0; j < freqs.length; j++)
      v += amps[j] * Math.cos((2 * Math.PI * freqs[j] * i) / FS + phases[j]);
    x[i] = v;
  }
  return x;
}

const energy = (a) => a.reduce((s, v) => s + v * v, 0);

export const checks = [
  {
    name: 'the selection criterion IS the periodogram — correlation by FFT = by hand',
    category: 'numeric',
    run() {
      // The claim the whole compute rests on: with g_l = l·FS/NFFT the inner
      // products with the two atoms of every grid frequency are the real and
      // imaginary parts of ONE zero-padded DFT. Checked against the definition,
      // atom by atom, summed in the dumbest possible way.
      const nfft = 4 * N;
      const rng = mulberry32(7);
      const r = Float64Array.from(range(N), () => 2 * rng() - 1);
      const { cc, cs } = correlate(r, nfft);
      const worst = maxGap(range(nfft / 2 + 1), (l) => {
        const g = (l * FS) / nfft;
        let a = 0;
        let b = 0;
        for (let i = 0; i < N; i++) {
          const w = (2 * Math.PI * g * i) / FS;
          a += r[i] * Math.cos(w);
          b += r[i] * Math.sin(w);
        }
        return Math.max(Math.abs(a - cc[l]), Math.abs(b - cs[l]));
      });
      return { ok: worst < 1e-10, detail: `max gap FFT vs definition = ${worst.toExponential(2)}` };
    },
  },
  {
    name: 'OMP: the residual is orthogonal to every atom chosen — exactly',
    category: 'numeric',
    run() {
      // The O of OMP, as a number rather than a claim. After each iteration the
      // correlation of the residual with an already-selected atom must be zero,
      // and this is what forbids OMP from ever choosing one twice.
      const nfft = 2 * N;
      const freqs = [F[0], F[1], F[2]];
      const x = signal(freqs, AMP, [0.3, 1.1, 2.7]);
      const p = pursuit(x, nfft, true);
      const worst = Math.max(...p.orth);

      // "OMP never chooses the same atom twice" is a consequence of the zero,
      // and it therefore holds exactly as long as there IS a residual to
      // correlate. Past exact recovery the residual is machine zero, the
      // correlation curve is rounding noise, and the argmax legitimately picks
      // anything — including something already selected. The claim is bounded
      // by the arithmetic, so the check is too: it looks at the steps where the
      // residual still carries a millionth of the signal's energy.
      const live = p.resE.findIndex((e) => e < p.resE[0] * 1e-12);
      const upTo = live < 0 ? KMAX : live;
      const dup = upTo - new Set(p.support.slice(0, upTo)).size;
      return {
        ok: worst < 1e-9 && dup === 0 && upTo >= 3,
        detail:
          `max |⟨r, chosen⟩|/‖x‖ = ${worst.toExponential(2)} over ${KMAX} iterations · ` +
          `${dup} duplicate in the ${upTo} steps before exact recovery`,
      };
    },
  },
  {
    name: 'Pythagoras holds for OMP and FAILS for MP — the two are not the same algorithm',
    category: 'numeric',
    run() {
      // ‖x‖² = ‖approx‖² + ‖r‖² is exactly the statement that the projection is
      // orthogonal. It is therefore an identity for OMP and NOT for MP, and
      // asserting both directions is what makes this a check rather than a
      // demonstration: if MP satisfied it too, the experiment would have nothing
      // to show.
      const nfft = 2 * N;
      const freqs = [20, 20.5, 45]; // deliberately coherent: 20.5 sits between two ×2 atoms
      const x = signal(freqs, AMP, [0.3, 1.1, 2.7]);
      const e0 = energy(x);
      const bad = [];

      const omp = pursuit(x, nfft, true);
      const uniq = [...new Set(omp.support)].map((l) => (l * FS) / nfft);
      const { approx } = fitSet(x, uniq);
      const r = Float64Array.from(x, (v, i) => v - approx[i]);
      const gap = Math.abs(e0 - (energy(approx) + energy(r))) / e0;
      if (gap > 1e-12) bad.push(`OMP splits the energy to ${gap.toExponential(2)}`);

      // MP: its own running reconstruction, and the defect is the cross term
      const mp = pursuit(x, nfft, false);
      const mr = mp.recos[KMAX];
      const mres = Float64Array.from(x, (v, i) => v - mr[i]);
      const mgap = Math.abs(e0 - (energy(mr) + energy(mres))) / e0;
      if (mgap < 1e-6) bad.push(`MP splits the energy too (${mgap.toExponential(2)}) — no contrast`);

      return {
        ok: bad.length === 0,
        detail: bad.length
          ? bad.join(' · ')
          : `OMP exact to ${gap.toExponential(2)}, MP off by ${(100 * mgap).toFixed(1)}%`,
      };
    },
  },
  {
    name: "OMP's residual is the least-squares residual on its own support",
    category: 'numeric',
    run() {
      // What "orthogonal" buys, stated as the thing it is worth: at every step
      // OMP's residual is not merely small, it is the SMALLEST achievable on the
      // atoms it has selected. Compared against a direct solve on the same
      // support, so the check does not simply re-run the same code path.
      const nfft = 2 * N;
      const x = signal([F[0], F[1], F[2]], AMP, [0.9, 0.2, 1.4]);
      const p = pursuit(x, nfft, true);
      const bad = [];
      for (let it = 1; it <= 6; it++) {
        const sup = [...new Set(p.support.slice(0, it))].map((l) => (l * FS) / nfft);
        const { approx } = fitSet(x, sup);
        const direct = energy(Float64Array.from(x, (v, i) => v - approx[i]));
        const rel = Math.abs(direct - p.resE[it]) / (energy(x) || 1);
        if (rel > 1e-12) bad.push(`step ${it}: ${rel.toExponential(2)}`);
      }
      return {
        ok: bad.length === 0,
        detail: bad.length ? bad.join(' · ') : 'matches a direct LS solve at steps 1…6, to 1e-12',
      };
    },
  },
  {
    name: 'exact recovery: on grid and noiseless, K lines are found in K iterations',
    category: 'numeric',
    run() {
      // The nominal claim, and the tolerance is 1e-20 on an ENERGY ratio — this
      // is exact arithmetic, not a statistical statement. Both the support and
      // the amplitudes must land: recovering the right frequencies with the
      // wrong amplitudes would be a coincidence, not a solution.
      const nfft = 2 * N;
      const freqs = [F[0], F[1], F[2]];
      const x = signal(freqs, AMP, [0.3, 1.1, 2.7]);
      const p = pursuit(x, nfft, true);
      const got = p.support
        .slice(0, 3)
        .map((l) => (l * FS) / nfft)
        .sort((a, b) => a - b);
      const supOk = maxGap(range(3), (j) => got[j] - freqs[j]) < 1e-12;
      const rel = p.resE[3] / p.resE[0];
      const { coef } = fitSet(x, got);
      // the atoms come back sorted, so amplitudes are compared in that order
      const want = [AMP[0], AMP[1], AMP[2]];
      const ampGap = maxGap(range(3), (j) => Math.hypot(coef[2 * j], coef[2 * j + 1]) - want[j]);
      return {
        ok: supOk && rel < 1e-20 && ampGap < 1e-10,
        detail: `support exact · residual/‖x‖² = ${rel.toExponential(1)} · max amplitude error = ${ampGap.toExponential(1)}`,
      };
    },
  },
  {
    name: 'the residual never grows, for either algorithm',
    category: 'numeric',
    run() {
      // A greedy step can be a poor choice; it can never be a harmful one. Both
      // pursuits subtract a least-squares fit, so the residual energy is
      // monotone by construction — and a violation would mean a sign or an
      // index error, which is exactly the bug this catches.
      const nfft = 4 * N;
      const x = signal([F[0], F[0] + 0.75 * CELL, F[2], 30 * CELL], [1, 1, 1, 1], [0.5, 2.1, 1.7, 0.9]);
      const bad = [];
      for (const [name, orth] of [
        ['OMP', true],
        ['MP', false],
      ]) {
        const p = pursuit(x, nfft, orth);
        for (let i = 1; i <= KMAX; i++)
          if (p.resE[i] > p.resE[i - 1] * (1 + 1e-12))
            bad.push(`${name} step ${i}: ${p.resE[i - 1]} → ${p.resE[i]}`);
      }
      return { ok: bad.length === 0, detail: bad.length ? bad.join(' · ') : 'monotone over 12 steps, both' };
    },
  },
  {
    name: 'coherence: 0 between adjacent Fourier cells, → 1 as the grid is refined',
    category: 'numeric',
    run() {
      // Scene 3 rests on this number, so it is pinned against the closed form it
      // comes from. Two atoms one FULL Fourier cell apart are orthogonal — that
      // is what makes the DFT a basis — and refining the grid by `over` brings
      // neighbouring atoms to a coherence that tends to 1. The middle values are
      // the Dirichlet kernel, checked against its own definition by direct
      // summation.
      const bad = [];
      if (neighbourCoherence(CELL, N) > 1e-12) bad.push(`adjacent cells not orthogonal`);
      const seq = [1, 2, 4, 8].map((o) => neighbourCoherence(CELL / o, N));
      for (let i = 1; i < seq.length; i++)
        if (seq[i] <= seq[i - 1]) bad.push(`coherence not increasing: ${seq}`);
      if (seq[3] < 0.9) bad.push(`coherence at ×8 only ${seq[3].toFixed(3)}`);
      // And against the definition, summed by hand. The quantity is the MODULUS
      // of Σ e^{j2πδi/FS} — the two atoms of a frequency span a plane, and what
      // measures how alike two neighbouring frequencies are is the modulus of
      // that sum, not its real part: the real part carries a phase that depends
      // on where the pair sits, and would make the "coherence" depend on the
      // absolute frequency, which it does not.
      const delta = CELL / 4;
      let sr = 0;
      let si = 0;
      for (let i = 0; i < N; i++) {
        sr += Math.cos((2 * Math.PI * delta * i) / FS);
        si += Math.sin((2 * Math.PI * delta * i) / FS);
      }
      const gap = Math.abs(Math.hypot(sr, si) / N - neighbourCoherence(delta, N));
      if (gap > 1e-12) bad.push(`closed form off by ${gap.toExponential(2)}`);
      return {
        ok: bad.length === 0,
        detail: bad.length
          ? bad.join(' · ')
          : `0 at ×1, then ${seq
              .slice(1)
              .map((v) => v.toFixed(3))
              .join(' → ')} at ×2, ×4, ×8`,
      };
    },
  },
  {
    name: 'off the grid the signal stops being sparse — measured, not asserted',
    category: 'numeric',
    run() {
      // Scene 4's claim. On grid, three iterations take the residual essentially
      // to zero; half a cell off, the same three iterations leave a residual
      // orders of magnitude larger, because the true line is spread over the
      // whole dictionary instead of sitting in one column.
      const on = compute({ ...BASE, snr: 60, offGrid: 0, k: 2 }).observables;
      const off = compute({ ...BASE, snr: 60, offGrid: 0.5, k: 2 }).observables;
      return {
        ok: off.resDb > on.resDb + 20,
        detail: `residual after 3 steps: ${on.resDb.toFixed(1)} dB on grid, ${off.resDb.toFixed(1)} dB at δ = ½`,
      };
    },
  },
  {
    name: 'MP re-selects atoms where OMP cannot — on a coherent dictionary',
    category: 'numeric',
    run() {
      // The visible half of the orthogonality, and the one the room is asked to
      // predict in scene 2. On a fine grid with a line between two atoms, MP
      // keeps coming back to repair its own earlier fits; OMP's zeros forbid it.
      const nfft = 8 * N;
      const x = signal([F[0] + 0.31 * CELL, 70 * CELL, F[2]], AMP, [0.4, 1.9, 2.2]);
      const mp = pursuit(x, nfft, false);
      const omp = pursuit(x, nfft, true);
      const dupMp = mp.support.length - new Set(mp.support).size;
      const dupOmp = omp.support.length - new Set(omp.support).size;
      return {
        ok: dupMp > 0 && dupOmp === 0,
        detail: `MP re-selected ${dupMp} of ${KMAX} · OMP ${dupOmp}`,
      };
    },
  },
  {
    name: 'denoising: the error keeps exactly 2k/N of the noise — the closed form',
    category: 'statistical',
    run() {
      // What the sparsity BUYS, and it is not a slogan. On grid, the clean
      // signal lies in the span of the selected atoms, so the reconstruction is
      //     P(x) = P(clean) + P(w) = clean + P(w)
      // and the error is nothing but the noise projected onto a 2k-dimensional
      // subspace. A white noise projected onto 2k dimensions keeps 2k of its N
      // degrees of freedom, so
      //     E‖error‖² = 2k·σ²        →  SNR gain = 10·log10(N/2k) ≈ 13.3 dB
      //
      // The check is on the ENERGY and not on the decibels, deliberately: dB is
      // a log, the average of a log is not the log of an average, and averaging
      // the per-run gain gives 14.3 dB against the 13.3 the law predicts — a
      // Jensen bias, not a broken law. The linear identity is exact in
      // expectation and is the one worth pinning.
      //
      // Tolerance: ‖P(w)‖²/σ² is χ² with 2k degrees of freedom, so one run has
      // a relative spread of √(2/2k) and the mean of n has that over √n. At
      // k = 2 and n = 60 it is 0.091, and the tolerance is 4 of them.
      const n = 60;
      const k = 2;
      const se = Math.sqrt(2 / (2 * k)) / Math.sqrt(n);
      let err = 0;
      let s2 = 0;
      let wrongSupport = 0;
      for (let seed = 1; seed <= n; seed++) {
        const o = compute({ ...BASE, snr: 20, k, seed }).observables;
        err += energy(Float64Array.from(o.clean.y, (v, i) => v - o.reco.y[i]));
        s2 += o.sigma * o.sigma;
        // the law assumes the support is right; if it were not, the error would
        // carry a bias term and the identity would not be the one being tested
        const want = trueFreqs(2, BASE.df, 0, N, BASE.over);
        const got = [...o.spikes.x].sort((a, b) => a - b);
        if (got.length !== 2 || maxGap(range(2), (j) => got[j] - want[j]) > 1e-9) wrongSupport++;
      }
      const ratio = err / n / (2 * k * (s2 / n));
      return {
        ok: Math.abs(ratio - 1) < 4 * se && wrongSupport === 0,
        detail:
          `E‖error‖² / 2kσ² = ${ratio.toFixed(4)} (1 ± ${(4 * se).toFixed(3)}) over ${n} draws · ` +
          `support exact ${n - wrongSupport}/${n}`,
      };
    },
  },
  {
    name: 'DDᵀ = (nfft/2)·I − ½(11ᵀ + vvᵀ) — so the FISTA step is a closed form',
    category: 'numeric',
    run() {
      // The fact the convex solver rests on, in the form it actually takes.
      //
      // This check was first written asserting a TIGHT frame, DDᵀ = (nfft/2)·I,
      // and it failed by about 8 — which was the check being wrong, not the
      // solver. Summing cos(2πl(i−j)/nfft) over the FULL bin range gives
      // nfft·δ_ij; the dictionary here runs over the half spectrum WITHOUT DC
      // and Nyquist, whose sine atom is identically zero, and folding the two
      // halves leaves exactly
      //     DDᵀ = (nfft/2)·I − ½(1·1ᵀ + v·vᵀ),   v_i = (−1)^i
      // The two missing atoms are precisely the correction. It is negative
      // semidefinite, so ‖DDᵀ‖ = nfft/2 stands and the step 2/nfft is right —
      // which is why the solver was correct while the claim about it was not.
      const bad = [];
      for (const over of [1, 2, 4, 8]) {
        const nfft = over * N;
        const rng = mulberry32(11 + over);
        const r = Float64Array.from(range(N), () => 2 * rng() - 1);
        const { cc, cs } = correlate(r, nfft);
        const L = nfft / 2 + 1;
        const a = new Float64Array(L);
        const b = new Float64Array(L);
        for (let l = 1; l < L - 1; l++) {
          a[l] = cc[l];
          b[l] = cs[l];
        }
        const back = synthesize(a, b, nfft, N);
        // the two rank-one corrections, from the atoms left out
        let s1 = 0;
        let sv = 0;
        for (let i = 0; i < N; i++) {
          s1 += r[i];
          sv += (i % 2 ? -1 : 1) * r[i];
        }
        const worst = maxGap(
          range(N),
          (i) => back[i] - ((nfft / 2) * r[i] - (s1 + (i % 2 ? -1 : 1) * sv) / 2)
        );
        if (worst > 1e-9) bad.push(`×${over}: off by ${worst.toExponential(2)}`);
      }

      // and the eigenvalue that follows, by power iteration on DDᵀ
      const nfft = 4 * N;
      let v = Float64Array.from(range(N), (i) => Math.sin(i * 2.7) + 0.3);
      let lam = 0;
      for (let it = 0; it < 120; it++) {
        const { cc, cs } = correlate(v, nfft);
        const a = new Float64Array(nfft / 2 + 1);
        const b = new Float64Array(nfft / 2 + 1);
        for (let l = 1; l < nfft / 2; l++) {
          a[l] = cc[l];
          b[l] = cs[l];
        }
        const w = synthesize(a, b, nfft, N);
        lam = Math.sqrt(energy(w));
        v = Float64Array.from(w, (u) => u / lam);
      }
      if (Math.abs(lam - nfft / 2) > 1e-6) bad.push(`‖DDᵀ‖ = ${lam}, expected ${nfft / 2}`);

      return {
        ok: bad.length === 0,
        detail: bad.length
          ? bad.join(' · ')
          : `exact at ×1, ×2, ×4, ×8 (1e-9) · ‖DDᵀ‖ = ${lam.toFixed(6)} = nfft/2`,
      };
    },
  },
  {
    name: 'lasso: λ ≥ λmax gives EXACTLY zero, and just below it does not',
    category: 'numeric',
    run() {
      // The one point of the whole regularization path that is known in closed
      // form: c = 0 is optimal precisely when every group correlation with the
      // data is under λ, so λmax = max_l ‖(Dᵀx)_l‖ is the exact threshold. Both
      // sides are asserted — a solver that returned zero everywhere would pass
      // the first half on its own.
      const nfft = 2 * N;
      const x = signal([F[0], F[1], F[2]], AMP, [0.3, 1.1, 2.7]);
      const lmax = lambdaMax(x, nfft);
      const nnz = (lam) => {
        const { a, b } = lassoSolve(x, nfft, lam * lmax);
        let n = 0;
        for (let l = 0; l < a.length; l++) if (Math.hypot(a[l], b[l]) > 0) n++;
        return n;
      };
      const above = nnz(1.001);
      const at = nnz(1);
      const below = nnz(0.98);
      return {
        ok: above === 0 && at === 0 && below > 0,
        detail: `nonzeros: ${above} at 1.001·λmax, ${at} at λmax, ${below} at 0.98·λmax`,
      };
    },
  },
  {
    name: 'lasso on an orthogonal dictionary IS block soft-thresholding — closed form',
    category: 'numeric',
    run() {
      // At ×1 the atom pairs sit on Fourier bins, so they are mutually
      // orthogonal and DᵀD = (N/2)·I. The lasso then has a closed-form solution
      // — shrink each pair's amplitude by 2λ/N and clip at zero — and FISTA must
      // land on it to machine precision. This is the check that says the solver
      // solves the problem it claims to, rather than something nearby.
      const nfft = N; // ×1: an orthogonal basis
      const x = signal([F[0], F[1], F[2]], AMP, [0.3, 1.1, 2.7]);
      const lmax = lambdaMax(x, nfft);
      const bad = [];
      for (const frac of [0.05, 0.3, 0.7]) {
        const lambda = frac * lmax;
        const { a, b } = lassoSolve(x, nfft, lambda, 1, 4000);
        const { cc, cs } = correlate(x, nfft);
        const worst = maxGap(range(nfft / 2 + 1), (l) => {
          if (l === 0 || l === nfft / 2) return 0;
          // the exact minimizer: (2/N)·Dᵀx shrunk by 2λ/N
          const m = Math.hypot(cc[l], cs[l]);
          const s = m > lambda ? (1 - lambda / m) * (2 / N) : 0;
          return Math.max(Math.abs(a[l] - cc[l] * s), Math.abs(b[l] - cs[l] * s));
        });
        if (worst > 1e-10) bad.push(`λ/λmax=${frac}: ${worst.toExponential(2)}`);
      }
      return {
        ok: bad.length === 0,
        detail: bad.length ? bad.join(' · ') : 'FISTA = soft threshold to 1e-10 at λ/λmax = 0.05, 0.3, 0.7',
      };
    },
  },
  {
    name: 'lasso: the KKT cap holds, and the amplitudes are biased low by exactly 2λ/N',
    category: 'numeric',
    run() {
      // Two halves of the same statement, and together they are the scene.
      //
      // KKT: at the solution the correlation of the residual may not exceed λ
      // ANYWHERE — that is what the horizontal line on the third view draws, and
      // the greedy's notches are its counterpart.
      //
      // The bias: on an orthogonal active set the shrinkage is not approximately
      // but EXACTLY 2λ/N in amplitude, which is why the recovered lines come out
      // short and why a least-squares refit on the same support puts them back.
      // The three true frequencies here are integer Fourier bins, so they are
      // mutually orthogonal and the closed form applies.
      const nfft = 2 * N;
      const x = signal([F[0], F[1], F[2]], AMP, [0.3, 1.1, 2.7]);
      const lmax = lambdaMax(x, nfft);
      const lambda = 0.2 * lmax;
      const { a, b } = lassoSolve(x, nfft, lambda, 1, 4000);
      const reco = synthesize(a, b, nfft, N);
      const { mag } = correlate(
        Float64Array.from(x, (v, i) => v - reco[i]),
        nfft
      );
      let cap = 0;
      for (let l = 1; l < nfft / 2; l++) cap = Math.max(cap, mag[l]);
      const bad = [];
      if (cap > lambda * (1 + 1e-8)) bad.push(`KKT violated: ${(cap / lambda).toFixed(6)}·λ`);

      const shrink = (2 * lambda) / N;
      const got = [];
      for (let l = 1; l < nfft / 2; l++) {
        const A = Math.hypot(a[l], b[l]);
        if (A > 1e-9) got.push([(l * FS) / nfft, A]);
      }
      if (got.length !== 3) bad.push(`${got.length} nonzero lines, expected 3`);
      else {
        got.sort((p, q) => p[0] - q[0]);
        const worst = maxGap(range(3), (j) => got[j][1] - (AMP[j] - shrink));
        if (worst > 1e-9) bad.push(`amplitude ≠ A − 2λ/N by ${worst.toExponential(2)}`);
      }
      return {
        ok: bad.length === 0,
        detail: bad.length
          ? bad.join(' · ')
          : `KKT: max|⟨r,d⟩| = ${(cap / lambda).toFixed(6)}·λ · amplitudes = A − 2λ/N (${shrink.toFixed(4)}) to 1e-9`,
      };
    },
  },
  {
    name: 'the bias is real and debiasing removes it — greedy pays neither',
    category: 'numeric',
    run() {
      // Why the room should care, in decibels rather than in principle. At the
      // same support, the lasso's shrunk amplitudes cost real reconstruction
      // quality; a least-squares refit on that support recovers it; and OMP,
      // which never shrinks anything, never paid it in the first place.
      const p = { ...BASE, snr: 20, over: 2 };
      const lasso = compute({ ...p, algo: 'lasso', lam: 0.2 }).observables;
      const omp = compute({ ...p, algo: 'omp', k: 2 }).observables;
      // same three lines found by both
      const lf = [...lasso.spikes.x].sort((u, v) => u - v);
      const of = [...omp.spikes.x].sort((u, v) => u - v);
      const sameSupport =
        lf.length === of.length &&
        lf.length > 0 &&
        maxGap(range(lf.length), (j) => lf[j] - of[j]) < 1e-9;
      // the shrunk stems sit BELOW the debiased ones, everywhere
      let below = true;
      for (let j = 0; j < lasso.spikes.y.length; j++)
        if (lasso.spikes.y[j] >= lasso.debiased.y[j] - 1e-9) below = false;
      return {
        ok: sameSupport && below && omp.snrOut.value > lasso.snrOut.value + 5,
        detail:
          `${lf.length} lines, the same for both${below ? ', every lasso stem below its refit' : ''} · ` +
          `SNR out: OMP ${omp.snrOut.value.toFixed(1)} dB vs lasso ${lasso.snrOut.value.toFixed(1)} dB`,
      };
    },
  },
  {
    name: 'every step that converges reaches the SAME solution — that is convexity',
    category: 'numeric',
    run() {
      // The property that separates the two roads, stated as an identity rather
      // than as a preference. The convex problem has one minimizer, so the step
      // size changes only how LONG the solver takes to arrive; the answer is
      // the same to machine precision whether the step is a quarter of the
      // certified one or half again bigger.
      //
      // Greedy owes nothing of the sort: its answer is the path it happened to
      // take, which is exactly why a coherent dictionary can ruin it.
      const nfft = 2 * N;
      const x = signal([F[0], F[1], F[2]], AMP, [0.3, 1.1, 2.7]);
      const lambda = 0.15 * lambdaMax(x, nfft);
      const ref = lassoSolve(x, nfft, lambda, 1, 4000);
      const bad = [];
      const iters = [];
      for (const alpha of [0.25, 0.5, 1, 1.5]) {
        const s = lassoSolve(x, nfft, lambda, alpha, 4000);
        iters.push(`α=${alpha}: ${s.iters}`);
        if (s.diverged) bad.push(`α=${alpha} diverged`);
        const gap = maxGap(range(ref.a.length), (l) =>
          Math.max(Math.abs(s.a[l] - ref.a[l]), Math.abs(s.b[l] - ref.b[l]))
        );
        if (gap > 1e-10) bad.push(`α=${alpha}: solution differs by ${gap.toExponential(2)}`);
      }
      return {
        ok: bad.length === 0,
        detail: bad.length ? bad.join(' · ') : `identical to 1e-10 · ${iters.join(', ')}`,
      };
    },
  },
  {
    name: 'the certified step converges, and there IS an edge above it',
    category: 'numeric',
    run() {
      // Why the step is a knob and not a constant. α = 1 is 1/‖DᵀD‖, the value
      // the convergence proof requires — so it must never diverge. But it is a
      // guarantee, not an optimum: a larger step is measurably faster here,
      // until an edge past which the iteration blows up. Both halves are
      // asserted, because a solver that converged for every α would mean the
      // step had no effect and the scene nothing to show.
      const nfft = 2 * N;
      const x = signal([F[0], F[1], F[2]], AMP, [0.3, 1.1, 2.7]);
      const lambda = 0.1 * lambdaMax(x, nfft);
      const at = (alpha) => lassoSolve(x, nfft, lambda, alpha, 400);
      const bad = [];
      const one = at(1);
      if (one.diverged) bad.push('α = 1 diverged — the certified step must not');
      const fast = at(1.5);
      if (fast.diverged || fast.iters >= one.iters) bad.push(`α = 1.5 not faster (${fast.iters} vs ${one.iters})`);
      // the edge: measured at α ≈ 1.94 with the adaptive restart in place
      const over = at(2.2);
      if (!over.diverged) bad.push('α = 2.2 did not diverge — no edge');
      return {
        ok: bad.length === 0,
        detail: bad.length
          ? bad.join(' · ')
          : `α=1: ${one.iters} steps · α=1.5: ${fast.iters} · α=2.2 diverges after ${over.iters}`,
      };
    },
  },
  {
    name: 'a diverging step is REPORTED, never rendered as NaN',
    category: 'numeric',
    run() {
      // The lecture guard, at the experiment's own level. Pushing the step past
      // the edge in front of a room must produce a sentence, not a plot full of
      // holes: the solver keeps its last finite iterate and the verdict says
      // what happened. Every observable that reaches a view is checked finite.
      const o = compute({ ...BASE, algo: 'lasso', alpha: 2.5 }).observables;
      const finite = (s) => [...s.x, ...s.y].every(Number.isFinite);
      const bad = [];
      for (const key of ['reco', 'periodogram', 'correlation', 'spikes'])
        if (!finite(o[key])) bad.push(`${key} carries NaN`);
      if (!/DIVERGED/.test(o.verdict.value)) bad.push(`verdict says "${o.verdict.value}"`);
      return {
        ok: bad.length === 0,
        detail: bad.length ? bad.join(' · ') : `all series finite · "${o.verdict.value}"`,
      };
    },
  },
  {
    name: 'the greedy does NOT beat the Fourier limit — the invoice for not knowing d',
    category: 'statistical',
    run() {
      // THE reason this experiment sits after the high-resolution methods.
      //
      // spectral/subspace separates two lines half a Fourier limit apart, at
      // this very SNR, because it is HANDED d = 2. Take that postulate away and
      // the resolution falls back to Fourier: measured over twelve draws, the
      // greedy recovers both lines exactly 0 times out of 12 at Δf = 0.5, and
      // 12 out of 12 at Δf = 1.5. The claim of scene 4 is this table.
      //
      // Statistical because it counts successes over draws, but the two ends
      // are not close calls — 0/12 and 12/12 — so no tolerance is needed beyond
      // requiring the ends themselves.
      const trials = 12;
      const rate = (df) => {
        let ok = 0;
        for (let seed = 1; seed <= trials; seed++) {
          const o = compute({ ...BASE, df, snr: 25, k: 2, seed }).observables;
          const want = trueFreqs(2, df, 0, N, BASE.over);
          const got = [...o.spikes.x].sort((a, b) => a - b);
          if (got.length === 2 && maxGap(range(2), (j) => got[j] - want[j]) < 1e-9) ok++;
        }
        return ok;
      };
      const half = rate(0.5);
      const one = rate(1);
      const oneAndHalf = rate(1.5);
      return {
        ok: half === 0 && oneAndHalf === trials && one <= oneAndHalf,
        detail:
          `both lines exact: ${half}/${trials} at Δf = 0.5 (where MUSIC separates), ` +
          `${one}/${trials} at 1.0, ${oneAndHalf}/${trials} at 1.5`,
      };
    },
  },
  standardChecks.determinism(compute, BASE, 'correlation'),
  standardChecks.determinism(compute, { ...BASE, algo: 'mp', over: 4, k: 6 }, 'resMp'),
];
