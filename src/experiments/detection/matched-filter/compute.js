// The matched filter / correlation receiver: a known pulse s of length N,
// buried at delay τ in white Gaussian noise (σ = 1), recovered by
// correlating the received signal with the pulse template:
//   y[k] = Σᵢ r[k+i]·s[i]
// The clean output peaks at k = τ with value E = Σ s² (the pulse energy),
// and the output SNR is E/σ² = N·SNR_in whatever the pulse shape — the
// processing gain 10·log₁₀(N), verified by Monte Carlo across N.
// PURE, stateless, seeded — runs in a worker; deterministic at fixed seed.
import { mulberry32, gaussFrom } from '../../../core/rng.js';

const N_GRID = [4, 8, 16, 32, 64, 128]; // processing-gain sweep

/** Unit-shape pulse of length n, scaled to energy n·snr (σ = 1). */
function makePulse(shape, n, snr) {
  const u = new Float64Array(n);
  for (let i = 0; i < n; i++) {
    if (shape === 'rect') u[i] = 1;
    else if (shape === 'halfsine') u[i] = Math.sin((Math.PI * (i + 0.5)) / n);
    else u[i] = Math.exp(-0.5 * ((i - (n - 1) / 2) / (n / 5)) ** 2); // gaussian
  }
  let e = 0;
  for (let i = 0; i < n; i++) e += u[i] * u[i];
  const scale = Math.sqrt((n * snr) / e);
  for (let i = 0; i < n; i++) u[i] *= scale;
  return u; // energy = n·snr exactly
}

/**
 * @param {{shape: string, N: number, snr: number, tau: number, M: number,
 *          seed: number}} params
 * @returns {{observables: Object}}
 */
export function compute({ shape, N, snr, tau, M, seed }) {
  const gauss = gaussFrom(mulberry32(seed));
  const s = makePulse(shape, N, snr);
  const E = N * snr; // pulse energy by construction
  const L = 3 * N; // observation window

  // received signal: noise + pulse at delay τ
  const idx = new Float64Array(L);
  const r = new Float64Array(L);
  const clean = new Float64Array(L);
  for (let i = 0; i < L; i++) {
    idx[i] = i;
    r[i] = gauss();
  }
  for (let i = 0; i < N; i++) {
    if (tau + i < L) {
      r[tau + i] += s[i];
      clean[tau + i] = s[i];
    }
  }

  // correlation output over all admissible lags, noisy and clean
  const K = L - N + 1;
  const lag = new Float64Array(K);
  const y = new Float64Array(K);
  const yc = new Float64Array(K);
  let tauHat = 0;
  for (let k = 0; k < K; k++) {
    lag[k] = k;
    let a = 0;
    let c = 0;
    for (let i = 0; i < N; i++) {
      a += r[k + i] * s[i];
      c += clean[k + i] * s[i];
    }
    y[k] = a;
    yc[k] = c;
    if (y[k] > y[tauHat]) tauHat = k;
  }

  // processing gain vs N: empirical output SNR (mean²/var of the statistic
  // at the true delay, fresh noise each repetition) against the theory N·snr
  const gN = new Float64Array(N_GRID.length);
  const gTh = new Float64Array(N_GRID.length);
  const gEmp = new Float64Array(N_GRID.length);
  for (let g = 0; g < N_GRID.length; g++) {
    const n = N_GRID[g];
    const sg = makePulse(shape, n, snr);
    let sum = 0;
    let sumSq = 0;
    for (let m = 0; m < M; m++) {
      let t = 0;
      for (let i = 0; i < n; i++) t += (sg[i] + gauss()) * sg[i];
      sum += t;
      sumSq += t * t;
    }
    const meanT = sum / M;
    const varT = Math.max(sumSq / M - meanT * meanT, 1e-12);
    gN[g] = n;
    gTh[g] = 10 * Math.log10(n * snr);
    gEmp[g] = 10 * Math.log10((meanT * meanT) / varT);
  }

  return {
    observables: {
      received: { x: idx, y: r },
      pulseClean: { x: idx, y: clean },
      corrNoisy: { x: lag, y },
      corrClean: { x: lag, y: yc },
      tauHat: { value: tauHat, meta: { label: 'τ̂', precision: 0 } },
      gainTheory: { x: gN, y: gTh },
      gainEmp: { x: gN, y: gEmp },
      snrOutDb: {
        value: 10 * Math.log10(E),
        meta: { label: 'SNR sortie', unit: 'dB', precision: 1 },
      },
      snrInDb: {
        value: 10 * Math.log10(snr),
        meta: { label: 'SNR entrée', unit: 'dB', precision: 1 },
      },
    },
  };
}
