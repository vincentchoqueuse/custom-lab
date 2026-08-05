// Sparse recovery on an on-grid Fourier dictionary, by greedy pursuit.
//
// The model is the same linear regression as everywhere else in this subject —
// x = D·c + w — with one change that changes everything: the dictionary D has
// FAR MORE columns than the signal has samples, so the normal equations have no
// unique solution. What picks one is the assumption that c has only a few
// nonzero entries. The estimator is no longer a formula, it is a SEARCH.
//
// The dictionary is a pair of atoms per candidate frequency, cos and sin, since
// the phases are unknown:
//   c_l[i] = cos(2π g_l t_i),  s_l[i] = sin(2π g_l t_i),  g_l = l·FS/NFFT
// Two facts follow, and both are worth saying out loud in front of a room:
//
//   1. The correlation of the residual with the WHOLE dictionary at once is a
//      single zero-padded FFT. With g_l = l·FS/NFFT and t_i = i/FS the phase
//      2π g_l t_i is exactly 2π l i/NFFT, so ⟨r, c_l⟩ = Re R[l] and
//      ⟨r, s_l⟩ = −Im R[l] where R is the DFT of the zero-padded residual.
//      The greedy selection criterion |R[l]| IS the periodogram of the residual:
//      "take the tallest peak and subtract it" — which is CLEAN, the algorithm
//      radio astronomers wrote for the same reason.
//
//   2. MP and OMP differ in ONE line, and the difference is measurable rather
//      than stylistic. Both select the same way. MP then fits the new frequency
//      against the CURRENT residual; OMP refits ALL selected frequencies against
//      the ORIGINAL signal. So OMP's residual is orthogonal to every atom it has
//      chosen — its correlation curve carries an EXACT zero at each of them,
//      visible as a notch — and it can therefore never choose one twice. MP has
//      no such property and does re-select.
//
// What the experiment is really about is not that greedy works on-grid (it does,
// trivially) but the three ways the dictionary betrays the assumption:
// coherence between neighbouring atoms, a grid refined until the atoms become
// indistinguishable, and a true frequency that falls BETWEEN two atoms, at which
// point the signal is not sparse in this dictionary at all.
//
// PURE, stateless, seeded — runs in a worker; deterministic at fixed seed.
import { mulberry32, gaussFrom } from '../../../core/rng.js';
import { fft } from '../../../core/numeric.js';
import { ifft } from '../../../core/dsp.js';
import { solveLinearSystem } from '../../../core/linalg.js';

const FS = 128; // sampling rate (Hz)
const N = 128; // samples — one second, so the Fourier cell is exactly 1 Hz
const DF = FS / N; // Fourier resolution (Hz per cell)
const KMAX = 12; // iterations run, whatever the number of true lines
const FLOOR_DB = -60; // display floor for the spectrum views

// The true lines, in decreasing amplitude: greedy takes them in this order, and
// the room should be able to predict which one is picked next.
const AMP = [1, 0.7, 0.5, 0.4, 0.3];
const F_BASE = [20, null, 45, 12, 55]; // f2 is placed relative to f1 by `sep`

/** The K true frequencies (Hz), given the separation and the grid offset. */
export function trueFreqs(K, sep, offGrid, over) {
  const cell = DF / over; // spacing of the SEARCH grid, not of the DFT
  const f = [];
  for (let k = 0; k < K; k++) {
    const base = k === 1 ? F_BASE[0] + sep * DF : F_BASE[k];
    f.push(base + offGrid * cell);
  }
  return f;
}

/**
 * Correlation of a residual with the whole dictionary, in one zero-padded FFT.
 * Returns the two inner products per grid frequency plus their magnitude — the
 * periodogram of the residual, which is the selection criterion.
 */
export function correlate(r, nfft) {
  const re = new Float64Array(nfft);
  const im = new Float64Array(nfft);
  re.set(r);
  fft(re, im);
  const L = nfft / 2 + 1;
  const cc = new Float64Array(L); // ⟨r, cos⟩
  const cs = new Float64Array(L); // ⟨r, sin⟩
  const mag = new Float64Array(L);
  for (let l = 0; l < L; l++) {
    cc[l] = re[l];
    cs[l] = -im[l];
    mag[l] = Math.hypot(re[l], im[l]);
  }
  return { cc, cs, mag };
}

/**
 * D·c — the synthesis, by ONE inverse FFT. The mirror of `correlate`: that one
 * is Dᵀ, this one is D, and neither ever forms the 128 × 258 matrix.
 *
 * A pair (a_l, b_l) is the complex number a_l − j b_l placed at bin l, halved
 * and mirrored onto bin nfft−l so the inverse transform comes back real:
 * S_l e^{jθ} + conj(S_l) e^{−jθ} = a_l cos θ + b_l sin θ, which is the atom
 * pair. DC and Nyquist stay empty — they are not in the dictionary.
 */
export function synthesize(a, b, nfft) {
  const L = nfft / 2 + 1;
  const re = new Float64Array(nfft);
  const im = new Float64Array(nfft);
  for (let l = 1; l < L - 1; l++) {
    re[l] = a[l] / 2;
    im[l] = -b[l] / 2;
    re[nfft - l] = a[l] / 2;
    im[nfft - l] = b[l] / 2;
  }
  ifft(re, im);
  const y = new Float64Array(N);
  for (let i = 0; i < N; i++) y[i] = nfft * re[i];
  return y;
}

/**
 * The OTHER road to the same objective: the convex relaxation.
 *
 *     min ½‖x − D c‖² + λ · Σ_l ‖(a_l, b_l)‖₂
 *
 * The penalty is on the pair and not on the two coefficients separately —
 * a group lasso — because a penalty applied to a and b independently would
 * depend on the PHASE of the line, which is not a physical quantity here. What
 * gets penalized is the amplitude, which is.
 *
 * Solved by FISTA. The gradient step needs the Lipschitz constant of DᵀD, and
 * for this dictionary it is not estimated but known:
 *
 *     D Dᵀ = (nfft/2)·I − ½(1·1ᵀ + v·vᵀ),     v_i = (−1)^i
 *
 * — the frame would be tight were DC and Nyquist in the dictionary at half
 * weight, and those are exactly the two atoms left out because their sine is
 * identically zero. The correction is negative semidefinite, so the largest
 * eigenvalue is exactly nfft/2 whatever the oversampling, and 1/L = 2/nfft is
 * the step the convergence proof certifies. The harness pins the identity, both
 * the exact rank-2 form and the eigenvalue that follows from it.
 *
 * That certified step is exposed as a MULTIPLE α, not frozen, because it is a
 * guarantee and not an optimum and the difference is worth showing: α = 1.5 is
 * measurably faster here, and somewhere just above that the guarantee stops
 * being optional. What does not change is the ANSWER — every α that converges
 * lands on the same solution, which is what convexity means and what the greedy
 * road cannot claim.
 *
 * The two algorithms then differ in kind, and both differences are visible:
 *   · greedy CHOOSES atoms and leaves their amplitudes alone; the lasso keeps
 *     every atom and SHRINKS them, so its amplitudes are biased low by λ.
 *   · greedy never revisits a choice; the lasso solves a convex problem and
 *     its solution does not depend on the order anything was found in.
 * @returns {{a, b, iters}} the pair coefficients over the whole grid
 */
export function lassoSolve(x, nfft, lambda, alpha = 1, maxIters = 200) {
  const L = nfft / 2 + 1;
  // The step is α/‖DᵀD‖ = α·2/nfft. α = 1 is the CERTIFIED value — the one the
  // convergence proof needs — and it is deliberately a knob rather than a
  // constant, because it is not the fastest one and a lecture should be able to
  // find that out. Measured on this problem: 61 iterations at α = 0.5, 29 at
  // α = 1, 17 at α = 1.5, and divergence past α ≈ 1.57 (≈ 1.94 with the restart
  // below). 1/L is a guarantee, not an optimum.
  const step = (alpha * 2) / nfft;
  const tau = lambda * step;
  const a = new Float64Array(L);
  const b = new Float64Array(L);
  let ya = new Float64Array(L);
  let yb = new Float64Array(L);
  let t = 1;
  let used = maxIters;
  let prevObj = Infinity;
  let diverged = false;
  const obj = [];

  for (let it = 0; it < maxIters; it++) {
    // gradient step at the momentum point: y + step·Dᵀ(x − D y)
    const r = synthesize(ya, yb, nfft);
    for (let i = 0; i < N; i++) r[i] = x[i] - r[i];
    const { cc, cs } = correlate(r, nfft);
    const na = new Float64Array(L);
    const nb = new Float64Array(L);
    for (let l = 1; l < L - 1; l++) {
      const ga = ya[l] + step * cc[l];
      const gb = yb[l] + step * cs[l];
      // prox of the group penalty: shrink the PAIR towards zero by tau, and
      // set it to exactly zero when it is shorter than that. This is what
      // makes the solution sparse rather than merely small.
      const m = Math.hypot(ga, gb);
      const s = m > tau ? 1 - tau / m : 0;
      na[l] = ga * s;
      nb[l] = gb * s;
    }
    // The objective, which is what tells convergence from divergence and what
    // the restart below watches.
    const fit = synthesize(na, nb, nfft);
    let f = 0;
    for (let i = 0; i < N; i++) f += (x[i] - fit[i]) ** 2;
    f /= 2;
    for (let l = 1; l < L - 1; l++) f += lambda * Math.hypot(na[l], nb[l]);
    obj.push(f);

    // A step above the stable range does not fail gracefully on its own — it
    // runs to Infinity and paints NaN across the plot. Caught here, the last
    // finite iterate is kept and the verdict says what happened, so pushing the
    // step past the edge is a demonstration and not a broken screen.
    if (!Number.isFinite(f) || f > 1e10) {
      diverged = true;
      used = it + 1;
      break;
    }

    // ADAPTIVE RESTART (O'Donoghue–Candès): FISTA's momentum overshoots and the
    // objective ripples; dropping the momentum whenever the objective goes UP
    // costs one comparison and is what makes the coherent ×8 grid solvable at
    // all — 271 iterations instead of never, within the same budget. It also
    // widens the stable step range, from α ≈ 1.57 to ≈ 1.94.
    if (f > prevObj) t = 1;
    prevObj = f;

    const tn = (1 + Math.sqrt(1 + 4 * t * t)) / 2;
    const w = (t - 1) / tn;
    ya = new Float64Array(L);
    yb = new Float64Array(L);
    let move = 0;
    for (let l = 1; l < L - 1; l++) {
      ya[l] = na[l] + w * (na[l] - a[l]);
      yb[l] = nb[l] + w * (nb[l] - b[l]);
      move = Math.max(move, Math.abs(na[l] - a[l]), Math.abs(nb[l] - b[l]));
      a[l] = na[l];
      b[l] = nb[l];
    }
    t = tn;
    // Early exit when the iterate has stopped moving. On a mildly coherent grid
    // this fires around 120 iterations at machine precision; on a ×8 grid it
    // never fires within the budget, and that is a fact about the PROBLEM — a
    // dictionary coherent enough to defeat the greedy also makes the convex
    // problem ill-conditioned. Nothing is hidden: the KKT ratio in the statline
    // says how converged the answer on screen actually is.
    if (move < 1e-12) {
      used = it + 1;
      break;
    }
  }
  return { a, b, iters: used, diverged, obj };
}

/** λ above which the lasso solution is EXACTLY zero: the largest group
 *  correlation with the data. Every λ in the app is a fraction of it, so the
 *  pill means the same thing whatever the amplitudes and the noise are. */
export function lambdaMax(x, nfft) {
  const { cc, cs } = correlate(x, nfft);
  let m = 0;
  for (let l = 1; l < nfft / 2; l++) m = Math.max(m, Math.hypot(cc[l], cs[l]));
  return m;
}

/** The two atoms of grid frequency `g`, written into ca/sa. */
function atoms(g, ca, sa) {
  for (let i = 0; i < N; i++) {
    const w = (2 * Math.PI * g * i) / FS;
    ca[i] = Math.cos(w);
    sa[i] = Math.sin(w);
  }
}

/**
 * Least squares over a SET of frequencies: fits cos and sin at each, jointly,
 * against `x`. This is the whole difference between OMP and MP — MP never
 * revisits a coefficient, OMP re-solves this system at every iteration.
 * @returns {{coef: Float64Array, approx: Float64Array}} 2 coefficients per freq
 */
export function fitSet(x, freqs) {
  const p = 2 * freqs.length;
  const cols = [];
  for (const g of freqs) {
    const ca = new Float64Array(N);
    const sa = new Float64Array(N);
    atoms(g, ca, sa);
    cols.push(ca, sa);
  }
  // normal equations DᵀD c = Dᵀx — p ≤ 24 here, so a pivoted solve is plenty
  const A = [];
  const b = new Float64Array(p);
  for (let i = 0; i < p; i++) {
    const row = new Float64Array(p);
    for (let j = 0; j < p; j++) {
      let s = 0;
      for (let n = 0; n < N; n++) s += cols[i][n] * cols[j][n];
      row[j] = s;
    }
    A.push(row);
    let s = 0;
    for (let n = 0; n < N; n++) s += cols[i][n] * x[n];
    b[i] = s;
  }
  const coef = solveLinearSystem(A, b);
  const approx = new Float64Array(N);
  for (let i = 0; i < p; i++) for (let n = 0; n < N; n++) approx[n] += coef[i] * cols[i][n];
  return { coef, approx };
}

const energy = (a) => {
  let s = 0;
  for (let i = 0; i < a.length; i++) s += a[i] * a[i];
  return s;
};

/**
 * One greedy pursuit, MP or OMP, run for KMAX iterations.
 *
 * The selection is identical in both. The update is the whole difference:
 *   MP  — fit the NEW frequency against the current residual, once and for all
 *   OMP — refit EVERY selected frequency against the original signal
 * @returns per-iteration support, residual energy, and the orthogonality defect
 */
export function pursuit(x, nfft, orthogonal) {
  const L = nfft / 2 + 1;
  const support = []; // grid indices, in the order chosen
  const resE = [energy(x)];
  const orth = [0]; // max |⟨r, selected atom⟩|, normalized — 0 for OMP, by construction
  const snapshots = []; // the correlation curve SEEN at each iteration
  const recos = [new Float64Array(N)];
  let r = Float64Array.from(x);
  const picks = [];
  const norm = Math.sqrt(energy(x)) || 1;
  // The correlation computed after an update IS the one the next iteration
  // selects on, so it is carried rather than recomputed: one FFT per iteration
  // instead of two.
  let mag = correlate(r, nfft).mag;

  for (let it = 0; it < KMAX; it++) {
    snapshots.push(mag);
    // The selection runs over the atoms that EXIST. At l = 0 and at Nyquist the
    // sine atom is identically zero, so those two "frequencies" contribute one
    // column and not two, and their 2×2 Gram is singular. Rather than ridge the
    // solve to paper over it, they are simply not in the dictionary — the
    // correlation curve still shows the whole band, but nothing can be taken
    // there. (The signals here carry no DC, so this removes nothing real.)
    let best = 1;
    for (let l = 2; l < L - 1; l++) if (mag[l] > mag[best]) best = l;
    picks.push(best);
    support.push(best);

    if (orthogonal) {
      const freqs = [...new Set(support)].map((l) => (l * FS) / nfft);
      const { approx } = fitSet(x, freqs);
      for (let n = 0; n < N; n++) r[n] = x[n] - approx[n];
      recos.push(Float64Array.from(approx));
    } else {
      // MP: fit this frequency alone, against what is LEFT of the signal
      const g = (best * FS) / nfft;
      const { approx } = fitSet(r, [g]);
      const reco = Float64Array.from(recos[recos.length - 1]);
      for (let n = 0; n < N; n++) {
        r[n] -= approx[n];
        reco[n] += approx[n];
      }
      recos.push(reco);
    }

    // the orthogonality defect: how far the residual still correlates with what
    // has already been selected. OMP drives it to zero exactly; MP does not.
    mag = correlate(r, nfft).mag;
    let worst = 0;
    for (const l of support) worst = Math.max(worst, mag[l]);
    orth.push(worst / norm);
    resE.push(energy(r));
  }
  return { support, picks, resE, orth, snapshots, recos };
}

/**
 * @param {{K: number, sep: number, offGrid: number, over: number, snr: number,
 *          algo: string, k: number, seed: number}} params
 */
export function compute({ K, sep, offGrid, over, snr, algo, k, lam, alpha, seed }) {
  const rng = mulberry32(seed);
  const gauss = gaussFrom(rng);
  const nfft = over * N;
  const L = nfft / 2 + 1;

  /* ---------- the signal -------------------------------------------------- */
  const freqs = trueFreqs(K, sep, offGrid, over);
  const phases = freqs.map(() => 2 * Math.PI * rng());
  const t = new Float64Array(N);
  const clean = new Float64Array(N);
  for (let i = 0; i < N; i++) {
    t[i] = i / FS;
    let v = 0;
    for (let j = 0; j < K; j++) v += AMP[j] * Math.cos(2 * Math.PI * freqs[j] * t[i] + phases[j]);
    clean[i] = v;
  }
  // SNR is defined on the signal power, so the same dB means the same thing
  // whatever K and the amplitudes are
  const sigma = Math.sqrt(energy(clean) / N / Math.pow(10, snr / 10));
  const x = new Float64Array(N);
  for (let i = 0; i < N; i++) x[i] = clean[i] + sigma * gauss();

  /* ---------- the two pursuits ------------------------------------------- */
  const omp = pursuit(x, nfft, true);
  const mp = pursuit(x, nfft, false);
  const kk = Math.min(k, KMAX);
  const isLasso = algo === 'lasso';
  const main = algo === 'mp' ? mp : omp;

  /* ---------- and the convex road, when it is the one being read ---------- */
  // Only solved when selected: FISTA is by far the most expensive thing here,
  // and the three greedy scenes must stay draggable.
  const lMax = lambdaMax(x, nfft);
  const lambda = lam * lMax;
  const sol = isLasso ? lassoSolve(x, nfft, lambda, alpha) : null;
  const lassoReco = sol ? synthesize(sol.a, sol.b, nfft) : null;

  /* ---------- the periodogram, and the grid ------------------------------- */
  const gf = new Float64Array(L);
  for (let l = 0; l < L; l++) gf[l] = (l * FS) / nfft;
  const { mag: px } = correlate(x, nfft);
  const pkMax = Math.max(...px, 1e-300);
  const toDb = (v) => Math.max(20 * Math.log10(Math.max(v, 1e-300) / pkMax), FLOOR_DB);
  const pdb = Float64Array.from(px, toDb);

  // what the greedy sees AT iteration kk, on the same dB scale
  const seen = kk < KMAX ? main.snapshots[kk] : main.snapshots[KMAX - 1];
  const pickIdx = kk < KMAX ? main.picks[kk] : main.picks[KMAX - 1];

  /* ---------- the recovered lines ---------------------------------------- */
  // A sinusoid of amplitude A peaks at A·N/2 in the periodogram, so putting the
  // amplitudes on that scale makes the stems land exactly on the peaks they
  // explain — which is the reading both frequency views are for.
  const ampDb = (A) => toDb((A * N) / 2);
  const chosen = main.support.slice(0, kk);
  const uniq = isLasso ? [] : [...new Set(chosen)];
  let spikeF = new Float64Array(0);
  let spikeA = new Float64Array(0);
  // the lasso's SECOND set of stems: the same support, refitted by plain least
  // squares. The gap between the two is the shrinkage, and closing it is what
  // "debiasing the lasso" means in one gesture.
  let debiasF = new Float64Array(0);
  let debiasA = new Float64Array(0);

  if (isLasso) {
    const active = [];
    for (let l = 1; l < L - 1; l++) {
      const A = Math.hypot(sol.a[l], sol.b[l]);
      if (A > 1e-9) active.push([l, A]);
    }
    spikeF = Float64Array.from(active, ([l]) => (l * FS) / nfft);
    spikeA = Float64Array.from(active, ([, A]) => ampDb(A));
    // The refit is only drawn while the support is small enough for the core's
    // pivoted solve to stay in its documented range (≤ ~30 unknowns, so ≤ 12
    // lines). Past that the lasso has stopped being sparse anyway, which is the
    // reading the scene wants at small λ.
    if (active.length && active.length <= 12) {
      const { coef } = fitSet(
        x,
        active.map(([l]) => (l * FS) / nfft)
      );
      debiasF = Float64Array.from(spikeF);
      debiasA = Float64Array.from(active, (_, j) => ampDb(Math.hypot(coef[2 * j], coef[2 * j + 1])));
    }
  } else if (uniq.length) {
    const { coef } = fitSet(
      x,
      uniq.map((l) => (l * FS) / nfft)
    );
    spikeF = Float64Array.from(uniq, (l) => (l * FS) / nfft);
    spikeA = Float64Array.from(uniq, (_, j) => ampDb(Math.hypot(coef[2 * j], coef[2 * j + 1])));
  }

  /* ---------- residual energy vs iteration, both algorithms --------------- */
  const its = Float64Array.from({ length: KMAX + 1 }, (_, i) => i);
  const e0 = main.resE[0] || 1;
  const relDb = (e) => Math.max(10 * Math.log10(Math.max(e, 1e-300) / e0), -180);

  const reco = isLasso ? lassoReco : main.recos[kk];
  const dup = chosen.length - uniq.length;

  /* ---------- what each optimality condition LOOKS like ------------------- */
  // Both algorithms stop for a reason, and both reasons are the same curve read
  // differently. OMP: the correlation is exactly ZERO at every chosen atom (a
  // notch). Lasso: the correlation is CAPPED at λ everywhere, with equality on
  // the support — that is the KKT condition, and drawing λ as a horizontal line
  // turns it into something a room can check by eye.
  let seenDb;
  let kkt = 0;
  if (isLasso) {
    const lres = Float64Array.from(x, (v, i) => v - lassoReco[i]);
    const { mag } = correlate(lres, nfft);
    seenDb = Float64Array.from(mag, toDb);
    for (let l = 1; l < L - 1; l++) kkt = Math.max(kkt, mag[l]);
    kkt = lambda > 0 ? kkt / lambda : 0;
  } else {
    seenDb = Float64Array.from(seen, toDb);
  }

  // WHAT THE SPARSITY BUYS, in decibels. The reconstruction is compared with the
  // CLEAN signal, never with the data: a fit that reproduced the data would have
  // reproduced the noise with it, which is the failure this measures rather than
  // hides. Keeping 2k of the 128 degrees of freedom keeps only 2k/N of the noise
  // energy in expectation, so the output SNR should beat the input by about
  // 10·log10(N/2k) — 13 dB at k = 3, and that is a closed form, not a hope.
  const errE = energy(Float64Array.from(clean, (v, i) => v - reco[i]));
  const snrOut = 10 * Math.log10(energy(clean) / Math.max(errE, 1e-300));

  return {
    observables: {
      signal: { x: t, y: x },
      clean: { x: t, y: clean },
      reco: { x: t, y: reco },
      periodogram: { x: gf, y: pdb },
      correlation: { x: gf, y: seenDb },
      // a series of one point, not a record: a scatter overlay reads {x, y}.
      // The lasso takes no single atom, so the marker is empty there and the
      // λ line takes its place.
      pickMark: isLasso
        ? { x: new Float64Array(0), y: new Float64Array(0) }
        : { x: Float64Array.of((pickIdx * FS) / nfft), y: Float64Array.of(toDb(seen[pickIdx])) },
      lambdaLine: isLasso ? toDb(lambda) : NaN,
      spikes: { x: spikeF, y: spikeA },
      debiased: { x: debiasF, y: debiasA },
      resOmp: { x: its, y: Float64Array.from(omp.resE, relDb) },
      resMp: { x: its, y: Float64Array.from(mp.resE, relDb) },

      fTrue1: freqs[0],
      fTrue2: K > 1 ? freqs[1] : NaN,
      fTrue3: K > 2 ? freqs[2] : NaN,
      fTrue4: K > 3 ? freqs[3] : NaN,
      fTrue5: K > 4 ? freqs[4] : NaN,

      // Bare scalars: no meta.label, so they stay out of the statline, which
      // only has room for what a lecture actually reads. The size of the
      // dictionary is already spelled out in the drawer by `shape`, and the
      // residual is the whole subject of the fourth view.
      atomsCount: L,
      sigma, // the noise level actually used — the harness checks a law against it
      coherence: {
        // |⟨d_l, d_{l+1}⟩| between neighbouring atoms of the search grid: the
        // number that says how hard the problem is. It goes UP as the grid is
        // refined, which is the point of scene 4.
        value: neighbourCoherence(FS / nfft),
        meta: { label: 'coherence', precision: 3 },
      },
      resDb: relDb(isLasso ? energy(Float64Array.from(x, (v, i) => v - lassoReco[i])) : main.resE[kk]),
      snrOut: {
        value: snrOut,
        meta: { label: 'SNR out', unit: 'dB', precision: 1 },
      },
      snrGain: {
        value: snrOut - snr,
        meta: { label: 'gain', unit: 'dB', precision: 1 },
      },
      // The two algorithms' optimality conditions, side by side in the same
      // slot: the greedy shows how far its residual still leans on what it
      // chose, the lasso shows how far the KKT cap is respected (≤ 1 means the
      // solution is optimal; above 1 means FISTA has not finished).
      orthDefect: isLasso
        ? { value: kkt, meta: { label: 'KKT ≤ 1', precision: 3 } }
        : { value: main.orth[kk], meta: { label: '⟂ defect', precision: 6 } },
      reselected: isLasso
        ? { value: spikeF.length, meta: { label: 'nonzero lines', precision: 0 } }
        : { value: dup, meta: { label: 're-selected', precision: 0 } },
      verdict: {
        value: verdictOf(algo, dup, isLasso ? kkt : main.orth[kk], offGrid, spikeF.length, sol?.iters, sol?.diverged),
        meta: { label: 'state' },
      },
    },
  };
}

/**
 * |⟨d(f), d(f+δ)⟩| / ‖d‖² between two neighbouring atoms of the grid — the
 * Dirichlet kernel, in closed form. One number for "how much do two adjacent
 * columns of the dictionary look alike"; at δ = the Fourier cell it is 0, and it
 * tends to 1 as the grid is refined.
 */
export function neighbourCoherence(delta) {
  const a = (Math.PI * delta * N) / FS;
  if (Math.abs(Math.sin(a / N)) < 1e-15) return 1;
  return Math.abs(Math.sin(a) / (N * Math.sin(a / N)));
}

function verdictOf(algo, dup, orth, offGrid, nnz, iters, diverged) {
  if (algo === 'lasso') {
    if (diverged) return `DIVERGED after ${iters} steps — the step is above the stable range`;
    if (orth > 1.01) return `${iters} steps, KKT still ${orth.toFixed(2)}·λ — not converged`;
    if (nnz === 0) return 'λ above λmax — the solution is exactly zero';
    return `${nnz} line${nnz > 1 ? 's' : ''} in ${iters} FISTA steps, shrunk by λ`;
  }
  if (algo !== 'mp' && orth > 1e-9) return 'not orthogonal — impossible for OMP';
  if (dup > 0) return `${dup} atom${dup > 1 ? 's' : ''} re-selected — MP only`;
  if (offGrid > 0.05) return 'off grid — the signal is not sparse here';
  return algo === 'mp' ? 'MP, no re-selection' : 'OMP, residual orthogonal';
}

export { N, FS, DF, KMAX, AMP };
