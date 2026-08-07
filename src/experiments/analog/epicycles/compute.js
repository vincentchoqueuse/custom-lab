// FOURIER EPICYCLES — the complex Fourier series, watched drawing. A closed
// contour z(t) is a periodic COMPLEX signal; its series Σ c_k·e^{i2πkt} is a
// chain of circles, each spinning at its own integer frequency, and the pen at
// the end of the chain retraces the contour. The fourier-series experiment
// builds a real waveform out of harmonics; this is the same theorem with the
// two quadratures glued into one plane — and the picture that made the theorem
// famous on the internet.
//
// The three contours are TRIGONOMETRIC POLYNOMIALS or piecewise-linear closed
// forms, chosen so the harness can pin the coefficients exactly: the star is
// e^{iθ} + 0.15e^{6iθ} + 0.15e^{−4iθ} (three circles, nothing else), the
// heart has eight known coefficients, the square obeys the four-fold selection
// rule c_k = 0 unless k ≡ 1 (mod 4) with a 1/k² decay.
//
// τ is where animation would be: sliding it walks the arm along the tour with
// the trace growing behind the pen — the film, one frame per drag position.
// PURE, stateless — deterministic (no draw: not random). Runs in a worker.
import { fft } from '../../../core/numeric.js';

const N = 1024; // contour samples (power of two, divisible by 4)
const TRACE = 480; // points of the drawn trace
const CIRCLE = 28; // points per epicycle circle

/** The contour z(t), t ∈ [0, 1) — closed, centered, roughly unit-sized. */
function contourPoint(shape, t) {
  const th = 2 * Math.PI * t;
  if (shape === 'heart') {
    // x = 16sin³θ = 12sinθ − 4sin3θ, y = 13cosθ − 5cos2θ − 2cos3θ − cos4θ,
    // scaled by 1/17: eight nonzero coefficients, all known in closed form
    const x = 12 * Math.sin(th) - 4 * Math.sin(3 * th);
    const y = 13 * Math.cos(th) - 5 * Math.cos(2 * th) - 2 * Math.cos(3 * th) - Math.cos(4 * th);
    return [x / 17, y / 17];
  }
  if (shape === 'star') {
    // r(θ) = 1 + 0.3·cos5θ, scaled: exactly c₁ = 0.85, c₆ = c₋₄ = 0.1275
    const r = 0.85 * (1 + 0.3 * Math.cos(5 * th));
    return [r * Math.cos(th), r * Math.sin(th)];
  }
  // square of half-side 1, perimeter walked at uniform speed from (1, −1):
  // z(t + 1/4) = i·z(t), so c_k = 0 unless k ≡ 1 (mod 4)
  const s = 4 * (t - Math.floor(t));
  const seg = Math.floor(s);
  const u = s - seg;
  if (seg === 0) return [1, -1 + 2 * u];
  if (seg === 1) return [1 - 2 * u, 1];
  if (seg === 2) return [-1, 1 - 2 * u];
  return [-1 + 2 * u, -1];
}

/**
 * @param {{shape: string, K: number, tau: number, sort: string}} params
 * @returns {{observables: Object}}
 */
export function compute({ shape, K, tau, sort }) {
  /* ---------- the series: one FFT of the sampled contour ------------------ */
  const re = new Float64Array(N);
  const im = new Float64Array(N);
  for (let n = 0; n < N; n++) {
    const [x, y] = contourPoint(shape, n / N);
    re[n] = x;
    im[n] = y;
  }
  const cx = new Float64Array(N);
  const cy = new Float64Array(N);
  const contour = { x: Float64Array.from(re), y: Float64Array.from(im) };
  cx.set(re);
  cy.set(im);
  fft(cx, cy);
  // c_k = FFT[k]/N, bin k > N/2 meaning frequency k − N
  const cRe = (k) => cx[(k + N) % N] / N;
  const cIm = (k) => cy[(k + N) % N] / N;
  const mag = (k) => Math.hypot(cRe(k), cIm(k));

  /* ---------- which K circles, in which order ----------------------------- */
  // the candidates are every nonzero frequency (DC is the anchor, not a
  // circle); 'mag' takes the largest circles first, 'freq' the slowest —
  // both restricted to coefficients that exist, so a zero never wastes a slot
  const KMAX = 200;
  const cand = [];
  for (let k = 1; k <= KMAX; k++) {
    if (mag(k) > 1e-9) cand.push(k);
    if (mag(-k) > 1e-9) cand.push(-k);
  }
  cand.sort(sort === 'mag' ? (a, b) => mag(b) - mag(a) || Math.abs(a) - Math.abs(b) : (a, b) => Math.abs(a) - Math.abs(b) || b - a);
  const kept = cand.slice(0, Math.min(K, cand.length));

  /* ---------- the partial sum, and the trace up to τ ---------------------- */
  const zAt = (t) => {
    let x = cRe(0);
    let y = cIm(0);
    for (const k of kept) {
      const ph = 2 * Math.PI * k * t;
      const c = Math.cos(ph);
      const s = Math.sin(ph);
      x += cRe(k) * c - cIm(k) * s;
      y += cRe(k) * s + cIm(k) * c;
    }
    return [x, y];
  };
  const tx = new Float64Array(TRACE);
  const ty = new Float64Array(TRACE);
  for (let i = 0; i < TRACE; i++) {
    const [x, y] = zAt((tau * i) / (TRACE - 1));
    tx[i] = x;
    ty[i] = y;
  }

  /* ---------- the chain of circles at the instant τ ----------------------- */
  const circX = [];
  const circY = [];
  const armX = [cRe(0)];
  const armY = [cIm(0)];
  let px = cRe(0);
  let py = cIm(0);
  for (const k of kept) {
    const r = mag(k);
    if (r > 2e-3) {
      for (let j = 0; j <= CIRCLE; j++) {
        const a = (2 * Math.PI * j) / CIRCLE;
        circX.push(px + r * Math.cos(a));
        circY.push(py + r * Math.sin(a));
      }
      circX.push(NaN);
      circY.push(NaN);
    }
    const ph = 2 * Math.PI * k * tau;
    const c = Math.cos(ph);
    const s = Math.sin(ph);
    const nx = px + cRe(k) * c - cIm(k) * s;
    const ny = py + cRe(k) * s + cIm(k) * c;
    px = nx;
    py = ny;
    armX.push(px);
    armY.push(py);
  }

  /* ---------- what the budget bought -------------------------------------- */
  let total = 0;
  for (let k = 1; k <= N / 2; k++) total += mag(k) ** 2 + mag(-k) ** 2;
  let captured = 0;
  for (const k of kept) captured += mag(k) ** 2;
  // RMS distance between the K-term curve and the contour, over the full tour
  let se = 0;
  for (let n = 0; n < N; n += 4) {
    const [x, y] = zAt(n / N);
    se += (x - contour.x[n]) ** 2 + (y - contour.y[n]) ** 2;
  }
  const rms = Math.sqrt(se / (N / 4));

  /* ---------- the spectrum view ------------------------------------------- */
  const KS = 24;
  const sk = new Float64Array(2 * KS + 1);
  const sm = new Float64Array(2 * KS + 1);
  const keptSet = new Set(kept);
  const selX = [];
  const selY = [];
  for (let k = -KS; k <= KS; k++) {
    sk[k + KS] = k;
    sm[k + KS] = k === 0 ? 0 : mag(k);
    if (keptSet.has(k)) {
      selX.push(k);
      selY.push(mag(k));
    }
  }

  return {
    observables: {
      contour,
      trace: { x: tx, y: ty },
      circles: { x: Float64Array.from(circX), y: Float64Array.from(circY) },
      arm: { x: Float64Array.from(armX), y: Float64Array.from(armY) },
      pen: { x: Float64Array.from([px]), y: Float64Array.from([py]) },
      spectrum: { x: sk, y: sm },
      selected: { x: Float64Array.from(selX), y: Float64Array.from(selY) },
      captured: {
        value: (100 * captured) / total,
        meta: { label: 'energy captured', unit: '%', precision: 2 },
      },
      rmsError: { value: rms, meta: { label: 'RMS distance', precision: 4 } },
    },
  };
}
