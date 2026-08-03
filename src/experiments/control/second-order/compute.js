// The canonical second-order system H(s) = K·ω₀² / (s² + 2mω₀s + ω₀²),
// exact in all three regimes:
//   m < 1: y = K(1 − e^(−mω₀t)(cos ω_d t + m/√(1−m²)·sin ω_d t)), ω_d = ω₀√(1−m²)
//   m = 1: y = K(1 − (1 + ω₀t)e^(−ω₀t))
//   m > 1: two real poles −ω₀(m ∓ √(m²−1)), biexponential
// Impulse response, exact in the same three regimes (and the derivative of
// the step response, which the harness checks).
// Both closed forms live in _lib/lti.js: three other experiments read them,
// and an experiment must not be another one's library.
// Observables: the step response with its ±5% band and envelope, the impulse
// response, the poles, and Mr = K/(2m√(1−m²)) at ωr = ω₀√(1−2m²) when
// m < 1/√2.
// PURE, stateless, seeded — runs in a worker; deterministic at fixed seed.

const NG = 800; // time samples
import { bodeSweep, bodeObservables } from '../_lib/bode.js';
import { secondOrderStep as stepValue, secondOrderImpulse as impulseValue } from '../_lib/lti.js';
import { toDb } from '../../../core/numeric.js';

const NW = 61; // frequency grid: ±1.5 decades around ω₀ (center = ω₀ exact)
const EPS = 1e-6;

/**
 * @param {{K: number, m: number, w0: number, seed: number}} params
 * @returns {{observables: Object}}
 */
export function compute({ K, m, w0 }) {
  // window: six time constants of the slowest mode (residual < 0.3%),
  // floor of a few natural periods
  const rate = m < 1 ? m * w0 : w0 * (m - Math.sqrt(Math.max(m * m - 1, 0)) || 1);
  const T = Math.min(600 / w0, Math.max(6 / rate, 8 / w0));

  const t = new Float64Array(NG);
  const y = new Float64Array(NG);
  const h = new Float64Array(NG);
  const eHi = new Float64Array(NG);
  const eLo = new Float64Array(NG);
  let yMax = -Infinity;
  let tMax = 0;
  for (let i = 0; i < NG; i++) {
    t[i] = (i * T) / (NG - 1);
    y[i] = stepValue(K, m, w0, t[i]);
    h[i] = impulseValue(K, m, w0, t[i]);
    if (y[i] > yMax) {
      yMax = y[i];
      tMax = t[i];
    }
    if (m < 1 - EPS) {
      const e = (K * Math.exp(-m * w0 * t[i])) / Math.sqrt(1 - m * m);
      eHi[i] = K + e;
      eLo[i] = K - e;
    } else {
      eHi[i] = NaN;
      eLo[i] = NaN;
    }
  }

  // 5% settling time: last exit from the band, empirical on the fine grid
  let t5 = 0;
  for (let i = NG - 1; i >= 0; i--) {
    if (Math.abs(y[i] - K) > 0.05 * K) {
      t5 = i + 1 < NG ? t[i + 1] : T;
      break;
    }
  }

  const overshoot = Math.max(0, ((yMax - K) / K) * 100);
  const overshootTh = m < 1 - EPS ? 100 * Math.exp((-m * Math.PI) / Math.sqrt(1 - m * m)) : 0;

  let px;
  let py;
  if (m < 1) {
    px = [-m * w0, -m * w0];
    py = [w0 * Math.sqrt(1 - m * m), -w0 * Math.sqrt(1 - m * m)];
  } else {
    const s = Math.sqrt(m * m - 1);
    px = [-w0 * (m - s), -w0 * (m + s)];
    py = [0, 0];
  }
  // (the |s| = ω₀ guide circle is drawn by the plane view, not computed here)

  // |H(jω)| on a log grid centered exactly on ω₀
  // H(jω) = Kω₀²/(ω₀²−ω² + 2jmω₀ω), swept by _lib/bode.js — the same grid,
  // the same dB and the same unwrapped phase as everywhere else in the
  // subject. The phase is the half the experiment was missing: it passes
  // through −90° at ω₀ whatever m, and ends at −180°, which is exactly what
  // makes a second order able to destabilise a loop and a first order not.
  const bode = bodeSweep(
    (w) => {
      const re = w0 * w0 - w * w;
      const im = 2 * m * w0 * w;
      const d = re * re + im * im;
      const n = K * w0 * w0;
      return [(n * re) / d, (-n * im) / d];
    },
    { center: w0, decades: 1.5, n: NW }
  );
  const resonant = m < Math.SQRT1_2 - EPS;
  const wr = resonant ? w0 * Math.sqrt(1 - 2 * m * m) : NaN;
  const Mr = resonant ? K / (2 * m * Math.sqrt(1 - m * m)) : NaN;

  return {
    observables: {
      stepResponse: { x: t, y },
      impulseResponse: { x: t, y: h },
      envHi: { x: t, y: eHi },
      envLo: { x: t, y: eLo },
      poles: { x: Float64Array.from(px), y: Float64Array.from(py) },
      ...bodeObservables(bode),
      gainK: toDb(K), // hline: the static gain, in the plot's own dB unit
      wr,
      overshoot: {
        value: overshoot,
        meta: { label: 'dépassement', unit: '%', precision: 1 },
      },
      overshootTh: {
        value: overshootTh,
        meta: { label: 'théorie e^(−mπ/√(1−m²))', unit: '%', precision: 1 },
      },
      t5: { value: t5, meta: { label: 'temps de réponse à 5%', unit: 's', precision: 2 } },
      tPeak: { value: m < 1 - EPS ? tMax : NaN, meta: { label: 't du 1er max', unit: 's', precision: 2 } },
      Mr: { value: Mr, meta: { label: 'résonance Mr', precision: 2 } },
    },
  };
}
