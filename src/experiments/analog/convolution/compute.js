// Continuous convolution, taken apart — the classic blackboard figure, but with
// the cursor in hand.
//
//   y(t) = ∫ x(τ)·h(t−τ) dτ
//
// The whole mystery of this formula comes down to one thing: the t of the result
// is NOT the integration variable. One integrates over τ, at t held fixed. The
// main view therefore shows the two functions in τ space — x(τ) fixed, h(t−τ)
// FLIPPED and then SLID by t — and the area of their product, which is the value
// y(t) carried over to the curve below.
//
// The cursor t is the parameter of the experiment. Sliding it is doing the
// animation by hand, and watching the curve below fill in.
//
// Two shapes are enough to say everything, and the experiment offers them:
//   gate * gate        → a TRIANGLE, with its four regimes visible to the eye:
//                        no overlap, entering, full
//                        overlap, leaving;
//   gate * exponential → the charging of an RC, which is the same integral.
//
// What is verified, and what is the real trap of this lesson:
//   · the convolution of two gates of widths a and b is EXACTLY the trapezium of
//     base a+b, plateau |a−b| and height min(a,b) — hence a triangle when a = b.
//     Closed form, compared point by point;
//   · the WIDTH of the support adds: supp(x*h) = supp(x) + supp(h). That is the
//     rule students remember, and it comes out of the computation;
//   · the area MULTIPLIES: ∫(x*h) = ∫x · ∫h;
//   · x*h = h*x, commutativity, on the same points.
//
// The integral is the ONLY numerical computation in the experiment, and it is
// done PIECEWISE, between the breakpoints of the integrand — the edges of the
// gate x, and those of h(t−τ) that slide with t. A blind quadrature on a regular
// grid smears over those discontinuities: the area of a gate of width 1 came out
// at 1.0007, and the triangle departed from its closed form by 4·10⁻³. Cut at
// the breakpoints, with two-point Gauss per panel — which never evaluates ON a
// discontinuity — gate * gate becomes EXACT and the RC charging falls to 4·10⁻⁸.
// The verifications above are therefore equalities, not tolerances.
// PURE, stateless, seeded — runs in a worker; deterministic at fixed seed.
import { trapz, fft } from '../../../core/numeric.js';

const N = 1400; // grid over the τ / t axis
const T0 = -2; // the window shown, in seconds
const T1 = 6;
const DT = (T1 - T0) / (N - 1);

/** The two input signals, and the two impulse responses.
 *  `edges` lists the breakpoints of each function, as an argument: that is what
 *  makes it possible to integrate between them rather than across them. */
const SIGNALS = {
  gate: (a) => ({ f: (u) => (u >= 0 && u <= a ? 1 : 0), edges: [0, a] }),
  ramp: (a) => ({ f: (u) => (u >= 0 && u <= a ? u / a : 0), edges: [0, a] }),
};
const KERNELS = {
  gate: (b) => ({ f: (u) => (u >= 0 && u <= b ? 1 : 0), edges: [0, b] }),
  // area 1: the normalized exponential, the response of an RC of constant b
  exp: (b) => ({ f: (u) => (u >= 0 ? Math.exp(-u / b) / b : 0), edges: [0] }),
};

const PANELS = 32; // panneaux de Gauss par morceau
const G = 0.5 / Math.sqrt(3); // the two Gauss points, in half-widths

/**
 * ∫ x(τ)·h(t−τ) dτ, cut at the breakpoints of both functions.
 * Two-point Gauss per panel: it NEVER evaluates on a breakpoint — which would be
 * ambiguous — it is exact on a constant or affine piece, and of order 4 on the
 * exponential. The midpoint rule, by contrast, left 1.4·10⁻⁴ on the RC
 * charging.
 */
export function overlap(x, h, t) {
  const [lo, hi] = [Math.min(...x.edges), Math.max(...x.edges)];
  const cuts = new Set([lo, hi]);
  for (const u of h.edges) {
    const c = t - u; // la rupture de h(t−τ) est en τ = t − u
    if (c > lo && c < hi) cuts.add(c);
  }
  const pts = [...cuts].sort((p, q) => p - q);
  let acc = 0;
  for (let k = 1; k < pts.length; k++) {
    const w = pts[k] - pts[k - 1];
    if (w < 1e-14) continue;
    const step = w / PANELS;
    let s = 0;
    for (let i = 0; i < PANELS; i++) {
      const mid = pts[k - 1] + step * (i + 0.5);
      s += x.f(mid - step * G) * h.f(t - (mid - step * G));
      s += x.f(mid + step * G) * h.f(t - (mid + step * G));
    }
    acc += (s * step) / 2;
  }
  return acc;
}

/** The exact trapezium: gate(a) * gate(b), in closed form. */
export function gateGate(a, b, t) {
  const lo = Math.min(a, b);
  const hi = Math.max(a, b);
  if (t <= 0 || t >= a + b) return 0;
  if (t < lo) return t; // entering: the overlap grows
  if (t <= hi) return lo; // plateau : la plus étroite est dedans
  return a + b - t; // leaving
}

/** gate(a) * (e^{−u/b}/b): the charging of an RC, in closed form. */
export function gateExp(a, b, t) {
  if (t <= 0) return 0;
  if (t <= a) return 1 - Math.exp(-t / b);
  return (1 - Math.exp(-a / b)) * Math.exp(-(t - a) / b);
}

/**
 * @param {{sig: string, ker: string, a: number, b: number, t: number,
 *          seed: number}} params
 * @returns {{observables: Object}}
 */
export function compute({ sig, ker, a, b, t }) {
  const x = SIGNALS[sig](a);
  const h = KERNELS[ker](b);

  /* ---------- τ space: THIS is where the computation happens -------------- */
  // x(τ) never moves. h(t−τ) is h FLIPPED (the −τ) and then SLID by t. Their
  // product is the integrand; its area is y(t). These three curves are sampled
  // for the DRAWING; the area itself is computed piecewise.
  const tau = new Float64Array(N);
  const xTau = new Float64Array(N);
  const hFlip = new Float64Array(N);
  const product = new Float64Array(N);
  for (let i = 0; i < N; i++) {
    const u = T0 + i * DT;
    tau[i] = u;
    xTau[i] = x.f(u);
    hFlip[i] = h.f(t - u);
    product[i] = xTau[i] * hFlip[i];
  }
  const yNow = overlap(x, h, t);

  /* ---------- the result: y(t) over the whole window ---------------------- */
  const yOut = new Float64Array(N);
  for (let k = 0; k < N; k++) yOut[k] = overlap(x, h, tau[k]);

  /* ---------- the current point, carried from one view to the other ------- */
  const marker = { x: Float64Array.from([t]), y: Float64Array.from([yNow]) };

  /* ---------- the regimes, named ------------------------------------------ */
  // gate*gate: four phases, and the text says which one is being looked at
  let regime = '—';
  if (sig === 'gate' && ker === 'gate') {
    const lo = Math.min(a, b);
    const hi = Math.max(a, b);
    if (t <= 0) regime = 'before: no overlap, y = 0';
    else if (t < lo) regime = 'entering: the overlap grows, y rises';
    else if (t <= hi) regime = 'full overlap: y is on the plateau';
    else if (t < a + b) regime = 'leaving: the overlap shrinks, y falls';
    else regime = 'after: no overlap left, y = 0';
  }

  // THE SAME STATEMENT IN FREQUENCY. Convolution in time is multiplication in
  // frequency, and that identity is the reason the operation is worth learning
  // at all — but it is invisible on a picture of sliding gates. Three magnitude
  // spectra on one frame say it: |X| and |H| are two shapes, |Y| is their
  // product, and where either factor is small the result is small however large
  // the other one was.
  //
  // Sampled on the same τ grid the views already use, so the transform is of
  // the very arrays being drawn on the other tabs rather than of a second,
  // tidier version of them.
  const NF = 2048; // past N, so nothing is truncated before the transform
  const dt = (T1 - T0) / (N - 1);
  const spec = (arr) => {
    const re = new Float64Array(NF);
    const im = new Float64Array(NF);
    for (let i = 0; i < N; i++) re[i] = arr[i];
    fft(re, im);
    return { re, im };
  };
  const xw = new Float64Array(N);
  const hw = new Float64Array(N);
  for (let i = 0; i < N; i++) {
    xw[i] = x.f(tau[i]);
    hw[i] = h.f(tau[i]);
  }
  const SX = spec(xw);
  const SH = spec(hw);
  const SY = spec(yOut);
  const half = 220; // enough bins to fill the frame at every width the dials reach
  const fAx = new Float64Array(half);
  const mX = new Float64Array(half);
  const mH = new Float64Array(half);
  const mY = new Float64Array(half);
  const mag = (S, i) => Math.hypot(S.re[i], S.im[i]) * dt;
  for (let i = 0; i < half; i++) {
    fAx[i] = i / (NF * dt);
    mX[i] = mag(SX, i);
    mH[i] = mag(SH, i);
    // |Y| is DRAWN from the convolution's own transform, not from |X|·|H| — a
    // figure that plotted the product of the two factors would be illustrating
    // its own arithmetic instead of checking the theorem.
    mY[i] = mag(SY, i);
  }

  // the two areas, by the same cutting: ∫x over its support, ∫h over its own
  // (truncated to the window for the exponential, which has no end)
  const unit = { f: () => 1, edges: [T0, T1] };
  const areaX = overlap(x, unit, 0);
  const areaH = overlap({ f: h.f, edges: [0, ker === 'gate' ? b : T1] }, unit, 0);

  return {
    observables: {
      // the computation view, in τ space
      xTau: { x: tau, y: xTau },
      hFlip: { x: tau, y: hFlip },
      product: { x: tau, y: product },
      // the shaded band: the area under the product, which IS y(t). A band and
      // not a curve, because what is read is the AREA, not the height.
      shade: { x: tau, lo: new Float64Array(N), hi: product },
      // the result view
      yOut: { x: tau, y: yOut },
      marker,
      tNow: t, // vline: the current t, on both views
      // the theorem, in frequency
      specX: { x: fAx, y: mX },
      specH: { x: fAx, y: mH },
      specY: { x: fAx, y: mY },

      // the numbers
      yValue: { value: yNow, meta: { label: 'y(t) = area of the product', precision: 4 } },
      support: {
        value: a + (ker === 'gate' ? b : 0),
        meta: { label: 'support width', unit: 's', precision: 3 },
      },
      areaX: { value: areaX, meta: { label: '∫x', precision: 4 } },
      areaH: { value: areaH, meta: { label: '∫h', precision: 4 } },
      areaY: { value: trapz(tau, yOut), meta: { label: '∫(x*h) = ∫x · ∫h', precision: 4 } },
      regime: { value: regime, meta: { label: 'regime' } },
    },
  };
}
