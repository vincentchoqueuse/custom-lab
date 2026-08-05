// Uniform quantization of a sine on b bits (midrise, full scale ±1):
//   Δ = 2/2^b,   q(x) = Δ·(⌊x/Δ⌋ + ½)  clipped to ±(1 − Δ/2)
// The error e = q(x) − x is bounded by Δ/2 (exact, checked); its power is
// ≈ Δ²/12 when the "uniform white error" model holds, giving the classic
//   SNR = 6.02·b + 1.76 + 20·log10(A)  dB   (sine of amplitude A·FS)
// A bits sweep at the current amplitude measures that line. Optional
// non-subtractive RPDF dither (uniform ±Δ/2 BEFORE quantization, seeded):
// it whitens the error at low b — for the price of ~3 dB of extra noise —
// and makes E[e] = 0 exactly (first-moment property of RPDF dither).
// PURE, stateless, seeded — runs in a worker; deterministic at fixed seed.
import { mulberry32 } from '../../../core/rng.js';

const FS = 1000; // sampling rate (Hz)
const T = 2; // duration (s)
const N = FS * T;
const NSHOW = 500; // samples shown by the time/error views (0.5 s)
const B_MAX = 14; // bits sweep upper end

/** Midrise quantizer on [−1, 1] with step delta. */
function quantize(v, delta) {
  const q = delta * (Math.floor(v / delta) + 0.5);
  const top = 1 - delta / 2;
  return q > top ? top : q < -top ? -top : q;
}

/**
 * @param {{b: number, A: number, f: number, dither: boolean, seed: number}} params
 * @returns {{observables: Object}}
 */
export function compute({ b, A, f, dither, seed }) {
  const rng = mulberry32(seed);

  // one base uniform stream in ±0.5, scaled by the current Δ — the bits
  // sweep reuses the same draws so the curve is comparable across b
  const u = new Float64Array(N);
  for (let i = 0; i < N; i++) u[i] = dither ? rng() - 0.5 : 0;

  const x = new Float64Array(N);
  for (let i = 0; i < N; i++) x[i] = A * Math.sin((2 * Math.PI * f * i) / FS);

  /** Error power (and error vector when wanted) at bb bits. */
  function pass(bb, wantVectors) {
    const delta = 2 / 2 ** bb;
    const xq = wantVectors ? new Float64Array(N) : null;
    const e = wantVectors ? new Float64Array(N) : null;
    let p = 0;
    let sum = 0;
    let maxAbs = 0;
    for (let i = 0; i < N; i++) {
      const q = quantize(x[i] + u[i] * delta, delta);
      const err = q - x[i];
      p += err * err;
      sum += err;
      if (Math.abs(err) > maxAbs) maxAbs = Math.abs(err);
      if (wantVectors) {
        xq[i] = q;
        e[i] = err;
      }
    }
    return { delta, xq, e, power: p / N, mean: sum / N, maxAbs };
  }

  const cur = pass(b, true);
  const snrOf = (power) => 10 * Math.log10(A * A / 2 / power);

  // SNR vs bits, measured and theory, at the current amplitude
  const bitsAxis = new Float64Array(B_MAX);
  const snrMeasCurve = new Float64Array(B_MAX);
  const snrThCurve = new Float64Array(B_MAX);
  for (let bb = 1; bb <= B_MAX; bb++) {
    bitsAxis[bb - 1] = bb;
    snrMeasCurve[bb - 1] = snrOf(pass(bb, false).power);
    snrThCurve[bb - 1] = 6.02 * bb + 1.76 + 20 * Math.log10(A);
  }

  const ts = new Float64Array(NSHOW);
  for (let i = 0; i < NSHOW; i++) ts[i] = i / FS;

  // theoretical error density: uniform on ±Δ/2 (drawn as a step)
  const h = 1 / cur.delta;
  const d2 = cur.delta / 2;

  return {
    observables: {
      cleanT: { x: ts, y: x.subarray(0, NSHOW) },
      quantT: { x: ts, y: cur.xq.subarray(0, NSHOW) },
      errT: { x: ts, y: cur.e.subarray(0, NSHOW) },
      error: cur.e, // full record, in signal units (checks)
      // The SAME record in units of the quantization step, which is the only
      // frame the distribution has a fixed shape in: whatever the resolution,
      // a midrise error lives on [−½, +½] LSB and is uniform there. In signal
      // units the histogram rescales with every bit added and the room cannot
      // see that the SHAPE never changes — which is the whole claim.
      errorLsb: Float64Array.from(cur.e, (v) => v / cur.delta),
      errPdf: { x: [-d2, -d2, d2, d2], y: [0, h, h, 0] },
      // the same density on the LSB frame: unit width, unit height, at every
      // resolution — which is what makes the overlay a statement rather than a
      // coincidence
      errPdfLsb: { x: [-0.5, -0.5, 0.5, 0.5], y: [0, 1, 1, 0] },
      snrCurve: { x: bitsAxis, y: snrMeasCurve },
      snrTh: { x: bitsAxis, y: snrThCurve },
      errPower: cur.power, // checks
      errMean: cur.mean, // checks
      maxErr: cur.maxAbs, // checks
      snrMeas: { value: snrOf(cur.power), meta: { label: 'measured SNR', unit: 'dB', precision: 1 } },
      snrTheory: {
        value: 6.02 * b + 1.76 + 20 * Math.log10(A),
        meta: { label: '6.02b + 1.76 + 20log₁₀A', unit: 'dB', precision: 1 },
      },
      delta: { value: cur.delta, meta: { label: 'Δ', precision: 4 } },
    },
  };
}
