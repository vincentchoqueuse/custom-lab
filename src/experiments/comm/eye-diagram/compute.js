// The eye diagram: M-PAM symbols shaped by a raised-cosine pulse (roll-off
// α, Nyquist: zero ISI at the sampling instants), sent through a 1st-order
// low-pass channel of normalized bandwidth B·T, plus receiver noise. All
// 2T-long slices of the waveform are overlaid (one series with NaN breaks —
// rendered by the generic Line): the eye. Observables also expose the
// underlying waveform, the values sampled at the nominal instants, and the
// worst-case vertical eye opening (min gap between adjacent level clusters).
// PURE, stateless, seeded — runs in a worker; deterministic at fixed seed.
import { mulberry32, gaussFrom } from '../../../core/rng.js';

const OS = 16; // samples per symbol period (T = 1)
const SPAN = 6; // raised-cosine truncation: ±SPAN symbol periods
const SHOW = 20; // symbols shown in the waveform view

const sinc = (x) => (x === 0 ? 1 : Math.sin(Math.PI * x) / (Math.PI * x));

/** Raised-cosine pulse, unit T, including its two removable singularities. */
function raisedCosine(t, alpha) {
  const d = 1 - (2 * alpha * t) ** 2;
  if (Math.abs(d) < 1e-9) return (Math.PI / 4) * sinc(1 / (2 * alpha));
  return (sinc(t) * Math.cos(Math.PI * alpha * t)) / d;
}

/**
 * @param {{levels: number, alpha: number, bt: number, sigma: number,
 *          Nsym: number, seed: number}} params
 * @returns {{observables: Object}}
 */
export function compute({ levels, alpha, bt, sigma, Nsym, seed }) {
  const rng = mulberry32(seed);
  const gauss = gaussFrom(rng);
  const amp = levels === 2 ? [-1, 1] : [-1, -1 / 3, 1 / 3, 1];

  // transmitted waveform: symbols at t = SPAN … SPAN+Nsym−1
  const total = (Nsym + 2 * SPAN) * OS;
  const x = new Float64Array(total);
  const sym = new Int32Array(Nsym);
  for (let key = 0; key < Nsym; key++) {
    sym[key] = Math.floor(rng() * levels);
    const a = amp[sym[key]];
    const center = (key + SPAN) * OS;
    for (let j = -SPAN * OS; j <= SPAN * OS; j++) {
      const idx = center + j;
      if (idx >= 0 && idx < total) x[idx] += a * raisedCosine(j / OS, alpha);
    }
  }

  // 1st-order low-pass channel of bandwidth B·T, then receiver noise
  const aCh = Math.exp((-2 * Math.PI * bt) / OS);
  const r = new Float64Array(total);
  let acc = 0;
  for (let i = 0; i < total; i++) {
    acc = aCh * acc + (1 - aCh) * x[i];
    r[i] = acc + sigma * gauss();
  }

  // the eye: every interior 2T slice, one series with NaN separators
  const kLo = SPAN;
  const kHi = SPAN + Nsym - 2;
  const nTraces = kHi - kLo;
  const perTrace = 2 * OS + 2; // 2T of points + NaN break
  const ex = new Float64Array(nTraces * perTrace);
  const ey = new Float64Array(nTraces * perTrace);
  let w = 0;
  for (let key = kLo; key < kHi; key++) {
    for (let j = 0; j <= 2 * OS; j++) {
      ex[w] = j / OS;
      ey[w] = r[key * OS + j];
      w++;
    }
    ex[w] = NaN;
    ey[w] = NaN;
    w++;
  }

  // nominal-instant samples, grouped by transmitted level for the opening
  const sv = new Float64Array(Nsym);
  const perLevel = Array.from({ length: levels }, () => ({ min: Infinity, max: -Infinity }));
  for (let key = 0; key < Nsym; key++) {
    const v = r[(key + SPAN) * OS];
    sv[key] = v;
    const g = perLevel[sym[key]];
    if (v < g.min) g.min = v;
    if (v > g.max) g.max = v;
  }
  let opening = Infinity;
  for (let l = 0; l + 1 < levels; l++) {
    if (perLevel[l].max > -Infinity && perLevel[l + 1].min < Infinity) {
      opening = Math.min(opening, perLevel[l + 1].min - perLevel[l].max);
    }
  }
  if (!Number.isFinite(opening)) opening = 0;

  // waveform excerpt with its decision-instant samples
  const nShow = Math.min(SHOW, Nsym) * OS + 1;
  const wt = new Float64Array(nShow);
  const wy = new Float64Array(nShow);
  for (let i = 0; i < nShow; i++) {
    wt[i] = i / OS;
    wy[i] = r[SPAN * OS + i];
  }
  const nPts = Math.min(SHOW, Nsym);
  const pt = new Float64Array(nPts);
  const py = new Float64Array(nPts);
  for (let key = 0; key < nPts; key++) {
    pt[key] = key;
    py[key] = sv[key];
  }

  return {
    observables: {
      eyeTraces: { x: ex, y: ey },
      waveform: { x: wt, y: wy },
      samplePoints: { x: pt, y: py },
      sampleValues: sv,
      opening: { value: opening, meta: { label: 'ouverture de l\'œil', precision: 2 } },
      traces: { value: nTraces, meta: { label: 'traces', precision: 0 } },
    },
  };
}
