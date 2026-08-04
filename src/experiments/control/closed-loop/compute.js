// Closing the loop on a second-order plant with a proportional gain K, and
// reading the same operation four ways.
//
//   plant        G(s) = ω₀²/(s² + 2mω₀s + ω₀²)      DC gain 1
//   open loop    L(s) = K·G(s)
//   closed loop  T(s) = L/(1+L) = Kω₀²/(s² + 2mω₀s + ω₀²(1+K))
//
// EVERYTHING is in closed form, and three identities carry the lesson:
//
//  1. THE CLOSED LOOP IS STILL A SECOND ORDER, with
//        ω₀' = ω₀√(1+K)      m' = m/√(1+K)      gain statique K/(1+K)
//     Closing the loop speeds the system up and de-damps it — both at once, and
//     in a ratio set by the same √(1+K).
//
//  2. THE POLES KEEP THEIR REAL PART. The coefficient of s is 2mω₀ on both
//     sides, so m'ω₀' = mω₀: the envelope decays exactly as fast closed-loop as
//     open-loop. What changes is the damped natural frequency and hence the
//     OVERSHOOT, not the settling time. This is the thing nobody predicts
//     correctly, and it is exact: the harness verifies it to 1e-13.
//
//  3. THE STEADY-STATE ERROR IS 1/(1+K), exactly. Raising K reduces it, and pays
//     in overshoot: the trade-off of the course, on one slider.
//
// The Nichols chart (iso-gain contours |L/(1+L)| = M) belongs here: the contour
// the OPEN-LOOP Black locus touches gives the resonance of the CLOSED LOOP — and
// since the closed loop is a known second order, that graphical reading has an
// exact answer to compare it with. That is the whole interest: the chart is not
// decoration, it is a measurement, and it can be verified.
// PURE, stateless, seeded — runs in a worker; deterministic at fixed seed.
import { toDb } from '../../../core/numeric.js';
import { bodeSweep } from '../_lib/bode.js';
import { secondOrderStep as stepValue } from '../_lib/lti.js';

const NT = 700; // time samples
const NW = 361; // frequency grid
const DECADES = 2;

/** The closed-loop parameters, in closed form. */
export function closedParams(K, m, w0) {
  const root = Math.sqrt(1 + K);
  return { K: K / (1 + K), m: m / root, w0: w0 * root };
}

/** L(jω) = K·G(jω) comme [Re, Im]. */
export function openLoop(w, { K, m, w0 }) {
  const re = w0 * w0 - w * w;
  const im = 2 * m * w0 * w;
  const d = re * re + im * im;
  const n = K * w0 * w0;
  return [(n * re) / d, (-n * im) / d];
}

/** T = L/(1+L), à partir de L. */
export function closeIt([lr, li]) {
  const dr = 1 + lr;
  const d = dr * dr + li * li;
  return [(lr * dr + li * li) / d, (li * dr - lr * li) / d];
}

/* ------------------------------ l'abaque ---------------------------------
 * The iso-gain contours |L/(1+L)| = M, drawn on the Black plane. Solving the
 * identity for the open-loop magnitude at a given phase:
 *   r²(1−M²) − 2M² r cos φ − M² = 0
 *   ⇒ r = [M² cos φ ± M√(1 − M² sin²φ)] / (1 − M²)
 * which exists only where |sin φ| ≤ 1/M — hence the closed contours around
 * −180° for M > 1 and the open curves below for M < 1.
 * The phase of a second order only sweeps (−180°, 0°), so the chart is drawn
 * only there: the reachable half, and the frame stays that of the
 * lieu.
 */
const ISO_DB = [-12, -6, -3, -1, 0, 1, 3, 6, 12];
const ISO_CLIP_DB = 28;
const N_PHI = 481;

/** Modules de boucle ouverte situés sur |L/(1+L)| = M à la phase φ (degrés). */
export function isoModulus(M, phiDeg) {
  const c = Math.cos((phiDeg * Math.PI) / 180);
  const s = Math.sin((phiDeg * Math.PI) / 180);
  if (Math.abs(M - 1) < 1e-12) return c < 0 ? [-1 / (2 * c)] : []; // la médiatrice
  const disc = 1 - M * M * s * s;
  if (disc < 0) return [];
  const root = M * Math.sqrt(disc);
  const den = 1 - M * M;
  return [(M * M * c + root) / den, (M * M * c - root) / den].filter((r) => r > 0);
}

/** Polylignes séparées par des NaN : un contour par niveau, en (φ°, dB). */
function abaque(levelsDb) {
  const x = [];
  const y = [];
  for (const db of levelsDb) {
    const M = 10 ** (db / 20);
    const lo = [];
    const hi = [];
    for (let i = 0; i < N_PHI; i++) {
      const phi = -179.99 + (179.98 * i) / (N_PHI - 1);
      const rs = isoModulus(M, phi);
      if (rs.length) lo.push([phi, rs[0]]);
      if (rs.length === 2) hi.push([phi, rs[1]]);
    }
    for (const [phi, r] of [...lo, ...hi.reverse()]) {
      const db2 = toDb(r);
      const inside = Math.abs(db2) <= ISO_CLIP_DB;
      x.push(inside ? phi : NaN);
      y.push(inside ? db2 : NaN);
    }
    x.push(NaN);
    y.push(NaN);
  }
  return { x: Float64Array.from(x), y: Float64Array.from(y) };
}

/**
 * @param {{w0: number, m: number, K: number, seed: number}} params
 * @returns {{observables: Object}}
 */
export function compute({ w0, m, K }) {
  const bf = closedParams(K, m, w0);

  /* ---------- temporel : le même échelon, deux systèmes ------------------- */
  // m'ω₀' = mω₀: both envelopes decay at the same speed, so a single observation
  // window suffices for both — which is already the lesson.
  const T = 9 / (m * w0);
  const t = new Float64Array(NT);
  const yOpen = new Float64Array(NT);
  const yClosed = new Float64Array(NT);
  let peakOpen = 0;
  let peakClosed = 0;
  for (let i = 0; i < NT; i++) {
    t[i] = (i * T) / (NT - 1);
    yOpen[i] = stepValue(K, m, w0, t[i]);
    yClosed[i] = stepValue(bf.K, bf.m, bf.w0, t[i]);
    peakOpen = Math.max(peakOpen, yOpen[i]);
    peakClosed = Math.max(peakClosed, yClosed[i]);
  }

  /* ---------- fréquentiel : la boucle ouverte ET la boucle fermée --------- */
  const L = bodeSweep((w) => openLoop(w, { K, m, w0 }), { center: w0, decades: DECADES, n: NW });
  const Tf = bodeSweep((w) => closeIt(openLoop(w, { K, m, w0 })), {
    center: w0,
    decades: DECADES,
    n: NW,
  });

  /* ---------- l'abaque, et la résonance qu'elle mesure -------------------- */
  // The closed loop being a known second order, its resonance has a closed form:
  // it is NOT read off the curve, it is computed — and the highlighted contour is
  // that one. The tangency therefore becomes a visual verification of an exact
  // number, not an estimate.
  const resonant = bf.m < Math.SQRT1_2 - 1e-12;
  const mr = resonant ? bf.K / (2 * bf.m * Math.sqrt(1 - bf.m * bf.m)) : NaN;
  const mrDb = resonant ? toDb(mr) : NaN;
  const wr = resonant ? bf.w0 * Math.sqrt(1 - 2 * bf.m * bf.m) : NaN;

  const overshoot = bf.m < 1 ? 100 * Math.exp((-bf.m * Math.PI) / Math.sqrt(1 - bf.m * bf.m)) : 0;

  return {
    observables: {
      // time domain
      stepOpen: { x: t, y: yOpen },
      stepClosed: { x: t, y: yClosed },
      // frequency domain: two curves per diagram
      gain: { x: L.w, y: L.gainDb },
      gainClosed: { x: Tf.w, y: Tf.gainDb },
      phase: { x: L.w, y: L.phaseDeg },
      phaseClosed: { x: Tf.w, y: Tf.phaseDeg },
      // Black: the OPEN-LOOP locus, on the chart
      black: { x: L.phaseDeg, y: L.gainDb },
      isoGain: abaque(ISO_DB),
      isoPeak: resonant ? abaque([mrDb]) : { x: new Float64Array(0), y: new Float64Array(0) },
      criticalBlack: { x: Float64Array.from([-180]), y: Float64Array.from([0]) },
      // the closed-loop numbers, all in closed form
      w0bf: { value: bf.w0, meta: { label: 'closed-loop ω₀', unit: 'rad/s', precision: 3 } },
      mbf: { value: bf.m, meta: { label: 'closed-loop m', precision: 3 } },
      staticGain: { value: bf.K, meta: { label: 'closed-loop DC gain', precision: 4 } },
      staticError: { value: 1 / (1 + K), meta: { label: 'steady-state error 1/(1+K)', precision: 4 } },
      overshoot: { value: overshoot, meta: { label: 'closed-loop overshoot', unit: '%', precision: 1 } },
      mrDb: { value: mrDb, meta: { label: 'closed-loop resonance', unit: 'dB', precision: 2 } },
      wrOut: { value: wr, meta: { label: 'closed-loop resonance ω', unit: 'rad/s', precision: 3 } },
      envelope: {
        value: m * w0,
        meta: { label: 'mω₀ — the same open- and closed-loop', unit: 'rad/s', precision: 3 },
      },
      setpoint: 1, // hline: the setpoint
    },
  };
}
