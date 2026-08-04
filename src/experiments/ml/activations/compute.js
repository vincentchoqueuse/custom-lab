// What an activation does to a SIGNAL — and not merely to a number.
//
// A neural-network course introduces activations through their curve and stops
// there. For someone arriving from signal processing the essential is missing:
// an activation is a MEMORYLESS NONLINEARITY, so it creates frequencies that
// were not in the input. That is all it knows how to do, and it is exactly what
// makes a network more expressive than a matrix.
//
// Three readings, on the same two figures as everywhere else:
//
//   · THE CURVE, with its derivative. The derivative is no ornament: a sigmoid
//     saturates at 1/4 at best and at ~0 everywhere else, which is the
//     vanishing gradient, in one picture.
//   · THE TIME VIEW, where one sees clipping, rectifying, or nothing at all.
//   · THE SPECTRUM, where the price is read. An ODD nonlinearity (tanh,
//     identity) creates only odd harmonics; an arbitrary nonlinearity (ReLU,
//     sigmoid) creates even ones too AND a DC component. On two tones it also
//     creates intermodulation products at 2f₁ − f₂ — the spectral line that
//     lands INSIDE the useful band and that no filter can undo.
//
// The harness pins the exactly computable case: half-wave rectification of a
// sinusoid by ReLU has a closed-form Fourier series, known since 1822, and the
// measured lines must fall on it to 1e-12.
//
// PURE, stateless, seeded — runs in a worker; deterministic at fixed seed.
import { mulberry32, gaussFrom } from '../../../core/rng.js';
import { tone, timeAxis, magSpectrum, freqAxis, dbAmp, linspace } from '../../../core/dsp.js';
import { ACTIVATIONS, applyAct } from '../_lib/nn.js';

const FS = 1024; // Hz — a power of two: every harmonic lands on a bin
const N = 1024; // samples (1 s)
const F1 = 16; // Hz — bin 16, its harmonics at bins 32, 48, 64…
const F2 = 21; // Hz — the second tone, for the intermodulation
const N_PLOT = 256; // samples plotted (a quarter of a second)
const DB_FLOOR = -90;
const X_MAX = 4; // half-width of the transfer curve

/**
 * @param {{act: string, signal: string, gain: number, bias: number,
 *          seed: number}} params
 * @returns {{observables: Object}}
 */
export function compute({ act, signal, gain, bias, seed }) {
  const { f, df } = ACTIVATIONS[act];
  const gauss = gaussFrom(mulberry32(seed));

  /* ---------- the input --------------------------------------------------- */
  let x;
  if (signal === 'sine') x = tone(N, F1, { fs: FS });
  else if (signal === 'two') {
    const a = tone(N, F1, { fs: FS });
    const b = tone(N, F2, { fs: FS, amp: 0.7 });
    x = Float64Array.from(a, (v, i) => v + b[i]);
  } else if (signal === 'square') {
    x = Float64Array.from(tone(N, F1, { fs: FS }), (v) => Math.sign(v) || 1);
  } else {
    // white noise of power 1/2, that of a unit sinusoid: the two inputs then
    // compare at equal level
    x = Float64Array.from({ length: N }, () => gauss() / Math.SQRT2);
  }
  const xin = Float64Array.from(x, (v) => gain * v + bias);
  const y = applyAct(xin, act);

  /* ---------- the transfer curve and its derivative ----------------------- */
  const xs = linspace(-X_MAX, X_MAX, 401);
  const curve = Float64Array.from(xs, f);
  const deriv = Float64Array.from(xs, df);

  // The derivatives of ALL the activations, on one figure: this is the textbook
  // drawing, and the one that answers "which one to choose". One observable per
  // curve rather than a single trace cut by NaNs, because here each must carry
  // its name in the legend and be switchable off by click.
  const dOf = (name) => ({ x: xs, y: Float64Array.from(xs, ACTIVATIONS[name].df) });

  /* ---------- spectra ------------------------------------------------------ */
  const specIn = dbOf(magSpectrum(xin, { nfft: N }));
  const specOut = dbOf(magSpectrum(y, { nfft: N }));
  const fx = freqAxis(N, FS);

  // The lines are read AT THE BIN: F1 falls exactly on one by construction, so
  // no leakage, no window, and the levels are the true amplitudes.
  const magOut = magSpectrum(y, { nfft: N });
  const magIn = magSpectrum(xin, { nfft: N });
  const binOf = (fHz) => Math.round((fHz * N) / FS);
  const ampAt = (mag, fHz) => (2 * mag[binOf(fHz)]) / N; // peak amplitude
  const dcOf = (mag) => mag[0] / N;

  const fund = ampAt(magOut, F1);
  const fundIn = ampAt(magIn, F1);

  // Total harmonic distortion: the energy of everything that is neither DC nor
  // the fundamental, normalized by the fundamental. THE measure of "how many
  // frequencies the nonlinearity invented".
  let harm2 = 0;
  for (let k = 2; k * F1 < FS / 2; k++) harm2 += ampAt(magOut, k * F1) ** 2;
  const thd = fund > 1e-12 ? Math.sqrt(harm2) / fund : 0;

  // Third-order intermodulation (two tones): 2f₁ − f₂, the line that lands in
  // band and that no filter can remove.
  const imd = signal === 'two' ? ampAt(magOut, 2 * F1 - F2) : NaN;

  /* ---------- time plots ---------------------------------------------------- */
  const t = timeAxis(N_PLOT, FS);
  const ms = Float64Array.from(t, (v) => 1000 * v);

  return {
    observables: {
      transfer: { x: xs, y: curve },
      derivative: { x: xs, y: deriv },
      identity: { x: xs, y: xs },

      dRelu: dOf('relu'),
      dTanh: dOf('tanh'),
      dSigmoid: dOf('sigmoid'),
      dGelu: dOf('gelu'),
      dLeaky: dOf('leaky'),

      xTime: { x: ms, y: xin.subarray(0, N_PLOT) },
      yTime: { x: ms, y: y.subarray(0, N_PLOT) },

      specIn: { x: fx, y: specIn },
      specOut: { x: fx, y: specOut },

      gainFund: {
        value: fundIn > 1e-12 ? fund / fundIn : NaN,
        meta: { label: 'fundamental gain', precision: 3 },
      },
      dcOut: { value: dcOf(magOut), meta: { label: 'DC created', precision: 4 } },
      thd: { value: 100 * thd, meta: { label: 'harmonic distortion', unit: '%', precision: 2 } },
      imd3: { value: imd, meta: { label: 'intermodulation 2f₁−f₂', precision: 4 } },
      dMax: {
        value: Math.max(...deriv),
        meta: { label: 'maximum derivative', precision: 3 },
      },
      dEnd: {
        // The derivative at the edge of the plotted domain: THIS is what says
        // whether the gradient survives saturation. 1 for ReLU, 4e-4 for the
        // sigmoid at x = 4 — three and a half decades apart, and the whole
        // story of the vanishing gradient.
        value: df(X_MAX),
        meta: { label: `derivative at x = ${X_MAX}`, precision: 5 },
      },
    },
  };
}

const dbOf = (mag) => {
  const out = new Float64Array(mag.length);
  const peak = Math.max(...mag, 1e-300);
  for (let i = 0; i < mag.length; i++) out[i] = dbAmp(mag[i] / peak, DB_FLOOR);
  return out;
};

export { FS, N, F1, F2 };
