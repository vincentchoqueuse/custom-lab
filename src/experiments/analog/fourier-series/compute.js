// Fourier series of the classic waveforms, with exact analytic coefficients.
// Three odd signals (sine series, no mean) and one even signal with a mean —
// the pulse train, which is the one that shows WHERE the coefficients come
// from, since its envelope is a visible sinc:
//   carré    (odd, ±A):   bₙ = 4A/(πn),                    n odd  — 1/n
//   triangle (peak A):    bₙ = 8A/(π²n²)·(−1)^((n−1)/2),   n odd  — 1/n²
//   dent de scie (−A…A):  bₙ = 2A/(πn)·(−1)^(n+1)                 — 1/n
//   train d'impulsions:   a₀ = Aα,  aₙ = 2Aα·sinc(nα) = 2A·sin(πnα)/(πn)
// The pulse train is centred on t = 0 (even), duty cycle α: its harmonics
// SAMPLE the sinc envelope 2Aα·sinc(να), and vanish at every ν = k/α. At
// α = 0.5 the even ranks die and the square wave reappears, half as tall
// (the pulse swings A where the square swings 2A).
// Observables: ideal signal vs truncated reconstruction (Gibbs!), amplitude
// spectrum and its envelope, RMS truncation error vs N (log-log: continuity
// sets the slope), plus the Gibbs overshoot as a fraction of the peak-to-peak
// swing. Time sampling is offset by half a step so no sample falls exactly on
// a discontinuity.
// PURE, stateless, seeded — runs in a worker; deterministic at fixed seed.

const NG = 800; // time samples over two periods (T = 1)
const N_CAP = 2000; // series length treated as "exact" for tail energies
const N_ERR = 60; // errorVsN grid: 1 … N_ERR
const N_ENV = 400; // envelope grid

/** Harmonic n as {a, b}: a on the cosines, b on the sines. */
function coefficients(wave, A, alpha, n) {
  if (wave === 'square') return { a: 0, b: n % 2 === 1 ? (4 * A) / (Math.PI * n) : 0 };
  if (wave === 'triangle')
    return {
      a: 0,
      b: n % 2 === 1 ? ((8 * A) / (Math.PI * Math.PI * n * n)) * (-1) ** ((n - 1) / 2) : 0,
    };
  if (wave === 'sawtooth') return { a: 0, b: ((2 * A) / (Math.PI * n)) * (-1) ** (n + 1) };
  return { a: (2 * A * Math.sin(Math.PI * n * alpha)) / (Math.PI * n), b: 0 }; // pulse
}

/** a₀ — only the pulse train has a mean. */
const meanOf = (wave, A, alpha) => (wave === 'pulse' ? A * alpha : 0);

/** Envelope the harmonic amplitudes sample — the decay rate, made visible. */
function envelopeAt(wave, A, alpha, v) {
  if (wave === 'square') return (4 * A) / (Math.PI * v);
  if (wave === 'triangle') return (8 * A) / (Math.PI * Math.PI * v * v);
  if (wave === 'sawtooth') return (2 * A) / (Math.PI * v);
  return (2 * A * Math.abs(Math.sin(Math.PI * v * alpha))) / (Math.PI * v); // pulse
}

function idealValue(wave, A, alpha, t) {
  const s = Math.sin(2 * Math.PI * t);
  if (wave === 'square') return A * Math.sign(s);
  if (wave === 'triangle') return ((2 * A) / Math.PI) * Math.asin(s);
  if (wave === 'sawtooth') return 2 * A * (t - Math.floor(t + 0.5));
  return Math.abs(t - Math.round(t)) < alpha / 2 ? A : 0; // pulse, centred on t = 0
}

/** Peak-to-peak swing — the reference the Gibbs overshoot is quoted against. */
const swingOf = (wave, A) => (wave === 'pulse' ? A : 2 * A);

/**
 * @param {{wave: string, N: number, A: number, alpha: number, seed: number}} params
 * @returns {{observables: Object}}
 */
export function compute({ wave, N, A, alpha }) {
  const a = new Float64Array(N + 1);
  const b = new Float64Array(N + 1);
  a[0] = meanOf(wave, A, alpha);
  for (let n = 1; n <= N; n++) {
    const c = coefficients(wave, A, alpha, n);
    a[n] = c.a;
    b[n] = c.b;
  }

  // ideal signal and truncated sum over two periods, half-step offset
  const t = new Float64Array(NG);
  const ideal = new Float64Array(NG);
  const rec = new Float64Array(NG);
  let sse = 0;
  let peak = -Infinity;
  for (let i = 0; i < NG; i++) {
    const ti = ((i + 0.5) * 2) / NG;
    t[i] = ti;
    ideal[i] = idealValue(wave, A, alpha, ti);
    let s = a[0];
    for (let n = 1; n <= N; n++)
      s += a[n] * Math.cos(2 * Math.PI * n * ti) + b[n] * Math.sin(2 * Math.PI * n * ti);
    rec[i] = s;
    sse += (s - ideal[i]) ** 2;
    if (s > peak) peak = s;
  }
  const rmsError = Math.sqrt(sse / NG);
  // Gibbs convention: overshoot as a fraction of the peak-to-peak swing —
  // the textbook ≈ 8.95% figure, and the same number for every discontinuity
  const overshoot = (peak - A) / swingOf(wave, A);

  // amplitude spectrum of the kept harmonics (n = 0 carries the mean)
  const sn = new Float64Array(N + 1);
  const sv = new Float64Array(N + 1);
  for (let n = 0; n <= N; n++) {
    sn[n] = n;
    sv[n] = n === 0 ? Math.abs(a[0]) : Math.hypot(a[n], b[n]);
  }

  // the envelope the harmonics sample, drawn between rank 1 and rank N
  const ev = new Float64Array(N_ENV);
  const ex = new Float64Array(N_ENV);
  const vMax = Math.max(N, 2);
  for (let i = 0; i < N_ENV; i++) {
    ex[i] = 1 + ((vMax - 1) * i) / (N_ENV - 1);
    ev[i] = envelopeAt(wave, A, alpha, ex[i]);
  }

  // RMS truncation error vs N via Parseval: err(N)² = Σ_{n>N} (aₙ²+bₙ²)/2,
  // accumulated from the top down with the series truncated at N_CAP (the
  // mean is never truncated, so it never enters the tail)
  let acc = 0;
  const errN = new Float64Array(N_ERR);
  const gx = new Float64Array(N_ERR);
  const power = (n) => {
    const c = coefficients(wave, A, alpha, n);
    return (c.a * c.a + c.b * c.b) / 2;
  };
  for (let n = N_CAP; n > N_ERR; n--) acc += power(n);
  for (let n = N_ERR; n >= 1; n--) {
    gx[n - 1] = n;
    errN[n - 1] = Math.sqrt(acc);
    acc += power(n);
  }

  return {
    observables: {
      ideal: { x: t, y: ideal },
      reconstruction: { x: t, y: rec },
      spectrum: { x: sn, y: sv },
      envelope: { x: ex, y: ev },
      errorVsN: { x: gx, y: errN },
      currentN: N,
      dc: { value: a[0], meta: { label: 'valeur moyenne a₀', precision: 3 } },
      rmsError: { value: rmsError, meta: { label: 'RMS error', precision: 4 } },
      overshoot: {
        value: 100 * overshoot,
        meta: { label: 'overshoot', unit: '%', precision: 1 },
      },
    },
  };
}

// Exported for check.js: the harness integrates the very coefficients the
// experiment draws, instead of restating their formulas.
export { coefficients, meanOf, idealValue };
