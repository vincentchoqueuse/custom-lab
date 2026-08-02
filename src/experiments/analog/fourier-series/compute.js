// Fourier series of the classic waveforms, with exact analytic coefficients:
//   square   (odd, ±A):  bₙ = 4A/(πn),          n odd     — discontinuous, 1/n
//   triangle (peak A):   bₙ = 8A/(π²n²)·(−1)^((n−1)/2), n odd — continuous, 1/n²
//   sawtooth (−A…A):     bₙ = 2A/(πn)·(−1)^(n+1)          — discontinuous, 1/n
// Observables: ideal signal vs truncated reconstruction (Gibbs!), amplitude
// spectrum, RMS truncation error vs N (log-log: continuity sets the slope),
// plus the Gibbs overshoot. Time sampling is offset by half a step so no
// sample falls exactly on a discontinuity.
// PURE, stateless, seeded — runs in a worker; deterministic at fixed seed.

const NG = 800; // time samples over two periods (T = 1)
const N_CAP = 2000; // series length treated as "exact" for tail energies
const N_ERR = 60; // errorVsN grid: 1 … N_ERR

function coefficient(wave, A, n) {
  if (wave === 'square') return n % 2 === 1 ? (4 * A) / (Math.PI * n) : 0;
  if (wave === 'triangle')
    return n % 2 === 1 ? ((8 * A) / (Math.PI * Math.PI * n * n)) * (-1) ** ((n - 1) / 2) : 0;
  return ((2 * A) / (Math.PI * n)) * (-1) ** (n + 1); // sawtooth
}

function idealValue(wave, A, t) {
  const s = Math.sin(2 * Math.PI * t);
  if (wave === 'square') return A * Math.sign(s);
  if (wave === 'triangle') return ((2 * A) / Math.PI) * Math.asin(s);
  return 2 * A * (t - Math.floor(t + 0.5)); // sawtooth
}

/**
 * @param {{wave: string, N: number, A: number, seed: number}} params
 * @returns {{observables: Object}}
 */
export function compute({ wave, N, A, seed: _seed }) {
  const b = new Float64Array(N + 1);
  for (let n = 1; n <= N; n++) b[n] = coefficient(wave, A, n);

  // ideal signal and truncated sum over two periods, half-step offset
  const t = new Float64Array(NG);
  const ideal = new Float64Array(NG);
  const rec = new Float64Array(NG);
  let sse = 0;
  let peak = -Infinity;
  for (let i = 0; i < NG; i++) {
    const ti = ((i + 0.5) * 2) / NG;
    t[i] = ti;
    ideal[i] = idealValue(wave, A, ti);
    let s = 0;
    for (let n = 1; n <= N; n++) s += b[n] * Math.sin(2 * Math.PI * n * ti);
    rec[i] = s;
    sse += (s - ideal[i]) ** 2;
    if (s > peak) peak = s;
  }
  const rmsError = Math.sqrt(sse / NG);
  // Gibbs convention: overshoot as a fraction of the JUMP (2A for square and
  // sawtooth) — the textbook ≈ 8.95% figure
  const overshoot = (peak - A) / (2 * A);

  // amplitude spectrum of the kept harmonics
  const sn = new Float64Array(N);
  const sv = new Float64Array(N);
  for (let n = 1; n <= N; n++) {
    sn[n - 1] = n;
    sv[n - 1] = Math.abs(b[n]);
  }

  // RMS truncation error vs N via Parseval: err(N)² = Σ_{n>N} bₙ²/2,
  // accumulated from the top down with the series truncated at N_CAP
  let acc = 0;
  const errN = new Float64Array(N_ERR);
  const gx = new Float64Array(N_ERR);
  for (let n = N_CAP; n > N_ERR; n--) acc += coefficient(wave, A, n) ** 2 / 2;
  for (let n = N_ERR; n >= 1; n--) {
    gx[n - 1] = n;
    errN[n - 1] = Math.sqrt(acc);
    acc += coefficient(wave, A, n) ** 2 / 2;
  }

  return {
    observables: {
      ideal: { x: t, y: ideal },
      reconstruction: { x: t, y: rec },
      spectrum: { x: sn, y: sv },
      errorVsN: { x: gx, y: errN },
      currentN: N,
      rmsError: { value: rmsError, meta: { label: 'erreur RMS', precision: 4 } },
      overshoot: {
        value: 100 * overshoot,
        meta: { label: 'dépassement', unit: '%', precision: 1 },
      },
    },
  };
}
