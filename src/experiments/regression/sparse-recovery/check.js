import {
  compute,
  pursuit,
  correlate,
  fitSet,
  trueFreqs,
  neighbourCoherence,
  N,
  FS,
  DF,
  KMAX,
  AMP,
} from './compute.js';
import { standardChecks, maxGap, range } from '../../../core/checks.js';
import { mulberry32, gaussFrom } from '../../../core/rng.js';

const BASE = {
  K: 3,
  sep: 3,
  offGrid: 0,
  over: 2,
  snr: 30,
  algo: 'omp',
  k: 3,
  seed: 34,
};

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
      const freqs = [20, 23, 45];
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
      const x = signal([20, 23, 45], AMP, [0.9, 0.2, 1.4]);
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
      const freqs = [20, 23, 45];
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
      const x = signal([20, 20.75, 45, 12], AMP, [0.5, 2.1, 1.7, 0.9]);
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
      if (neighbourCoherence(DF) > 1e-12) bad.push(`adjacent cells not orthogonal`);
      const seq = [1, 2, 4, 8].map((o) => neighbourCoherence(DF / o));
      for (let i = 1; i < seq.length; i++)
        if (seq[i] <= seq[i - 1]) bad.push(`coherence not increasing: ${seq}`);
      if (seq[3] < 0.9) bad.push(`coherence at ×8 only ${seq[3].toFixed(3)}`);
      // And against the definition, summed by hand. The quantity is the MODULUS
      // of Σ e^{j2πδi/FS} — the two atoms of a frequency span a plane, and what
      // measures how alike two neighbouring frequencies are is the modulus of
      // that sum, not its real part: the real part carries a phase that depends
      // on where the pair sits, and would make the "coherence" depend on the
      // absolute frequency, which it does not.
      const delta = DF / 4;
      let sr = 0;
      let si = 0;
      for (let i = 0; i < N; i++) {
        sr += Math.cos((2 * Math.PI * delta * i) / FS);
        si += Math.sin((2 * Math.PI * delta * i) / FS);
      }
      const gap = Math.abs(Math.hypot(sr, si) / N - neighbourCoherence(delta));
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
      const on = compute({ ...BASE, snr: 60, offGrid: 0, k: 3 }).observables;
      const off = compute({ ...BASE, snr: 60, offGrid: 0.5, k: 3 }).observables;
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
      const x = signal([20.31, 33, 45], AMP, [0.4, 1.9, 2.2]);
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
      // Tolerance: ‖P(w)‖²/σ² is χ² with 2k = 6 degrees of freedom, so one run
      // has a relative spread of √(2/6) = 0.577 and the mean of n has
      // 0.577/√n. At n = 60 that is 0.075, and the tolerance is 4 of them.
      const n = 60;
      const k = 3;
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
        const got = [...o.spikes.x].sort((a, b) => a - b);
        if (maxGap(range(3), (j) => got[j] - [20, 23, 45][j]) > 1e-9) wrongSupport++;
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
  standardChecks.determinism(compute, BASE, 'correlation'),
  standardChecks.determinism(compute, { ...BASE, algo: 'mp', over: 4, k: 6 }, 'resMp'),
];
