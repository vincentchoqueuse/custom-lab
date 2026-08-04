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
export function compute({ K, sep, offGrid, over, snr, algo, k, seed }) {
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
  const main = algo === 'mp' ? mp : omp;

  /* ---------- the periodogram, and the grid ------------------------------- */
  const gf = new Float64Array(L);
  for (let l = 0; l < L; l++) gf[l] = (l * FS) / nfft;
  const { mag: px } = correlate(x, nfft);
  const pkMax = Math.max(...px, 1e-300);
  const toDb = (v) => Math.max(20 * Math.log10(Math.max(v, 1e-300) / pkMax), FLOOR_DB);
  const pdb = Float64Array.from(px, toDb);

  // what the algorithm sees AT iteration kk, on the same dB scale
  const seen = kk < KMAX ? main.snapshots[kk] : main.snapshots[KMAX - 1];
  const seenDb = Float64Array.from(seen, toDb);
  const pickIdx = kk < KMAX ? main.picks[kk] : main.picks[KMAX - 1];

  /* ---------- the recovered lines at iteration kk ------------------------- */
  const chosen = main.support.slice(0, kk);
  const uniq = [...new Set(chosen)];
  const spikeF = new Float64Array(uniq.length);
  const spikeA = new Float64Array(uniq.length);
  if (uniq.length) {
    const { coef } = fitSet(
      x,
      uniq.map((l) => (l * FS) / nfft)
    );
    for (let j = 0; j < uniq.length; j++) {
      spikeF[j] = (uniq[j] * FS) / nfft;
      // The amplitude of the SINUSOID, not the two coefficients separately —
      // and put on the periodogram's own dB scale, where a line of amplitude A
      // peaks at A·N/2. The stems then land exactly on the peaks they explain,
      // which is the reading the view is for.
      spikeA[j] = toDb((Math.hypot(coef[2 * j], coef[2 * j + 1]) * N) / 2);
    }
  }

  /* ---------- residual energy vs iteration, both algorithms --------------- */
  const its = Float64Array.from({ length: KMAX + 1 }, (_, i) => i);
  const e0 = main.resE[0] || 1;
  const relDb = (e) => Math.max(10 * Math.log10(Math.max(e, 1e-300) / e0), -180);

  const reco = main.recos[kk];
  const dup = chosen.length - uniq.length;

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
      // a series of one point, not a record: a scatter overlay reads {x, y}
      pickMark: {
        x: Float64Array.of((pickIdx * FS) / nfft),
        y: Float64Array.of(toDb(seen[pickIdx])),
      },
      spikes: { x: spikeF, y: spikeA },
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
      resDb: relDb(main.resE[kk]),
      snrOut: {
        value: snrOut,
        meta: { label: 'SNR out', unit: 'dB', precision: 1 },
      },
      snrGain: {
        value: snrOut - snr,
        meta: { label: 'gain', unit: 'dB', precision: 1 },
      },
      orthDefect: {
        value: main.orth[kk],
        meta: { label: '⟂ defect', precision: 6 },
      },
      reselected: {
        value: dup,
        meta: { label: 're-selected', precision: 0 },
      },
      verdict: {
        value: verdictOf(algo, dup, main.orth[kk], offGrid),
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

function verdictOf(algo, dup, orth, offGrid) {
  if (algo !== 'mp' && orth > 1e-9) return 'not orthogonal — impossible for OMP';
  if (dup > 0) return `${dup} atom${dup > 1 ? 's' : ''} re-selected — MP only`;
  if (offGrid > 0.05) return 'off grid — the signal is not sparse here';
  return algo === 'mp' ? 'MP, no re-selection' : 'OMP, residual orthogonal';
}

export { N, FS, DF, KMAX, AMP };
