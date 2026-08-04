// Expressive power, and what a matrix STRUCTURE changes about it.
//
// The network is as simple as they come: a signal of N points goes in, a linear
// layer transforms it, an activation bends it, a second linear layer recombines
// it. The weights are DRAWN AT RANDOM and never learned — deliberately. What is
// looked at here is not what a network learns, it is what it CAN represent
// before having learned anything at all.
//
// Two things are demonstrated on screen:
//
//   1. WITHOUT an activation, two layers make one. The network output W₂·(W₁x)
//      is that of a SINGLE matrix W₂W₁, to machine precision — so stacking
//      linear layers buys strictly nothing. The harness pins it at 1e-12, and
//      that is the justification for everything else.
//
//   2. The STRUCTURE of W₁ decides what the layer can do.
//      · DENSE: N² independent weights. Every output mixes every input, so the
//        notion of "time neighbourhood" disappears. The output spectrum has
//        nothing left to do with the input one.
//      · TOEPLITZ: W[i][j] depends only on i − j. That is a convolution, hence a
//        FILTER: L weights instead of N², and the output spectrum is the input
//        one MULTIPLIED by |H(f)|. The structure is not a memory saving, it is a
//        prior about the world — "what matters is local and shift-invariant" —
//        and it is very exactly what a convolutional layer is.
//
// The parameter counter is in the statline, because the ratio N²/L is the whole
// argument: 16 384 against 9 at N = 128.
//
// PURE, stateless, seeded — runs in a worker; deterministic at fixed seed.
import { mulberry32, gaussFrom } from '../../../core/rng.js';
import { tone, magSpectrum, freqAxis, dbAmp, timeAxis } from '../../../core/dsp.js';
import { denseMatrix, toeplitzMatrix, matvec, applyAct, ACTIVATIONS } from '../_lib/nn.js';

const N = 128; // signal length (= layer width)
const FS = 128; // Hz — one point per hertz, the simplest reading
const NFFT = 128;
const DB_FLOOR = -60;

/**
 * @param {{structure: string, act: string, kernel: number, scale: number,
 *          signal: string, seed: number}} params
 * @returns {{observables: Object}}
 */
export function compute({ structure, act, kernel, scale, signal, seed }) {
  const gauss = gaussFrom(mulberry32(seed));

  /* ---------- the input --------------------------------------------------- */
  let x;
  if (signal === 'sine') x = tone(N, 8, { fs: FS });
  else if (signal === 'two') {
    const a = tone(N, 6, { fs: FS });
    const b = tone(N, 20, { fs: FS, amp: 0.8 });
    x = Float64Array.from(a, (v, i) => v + b[i]);
  } else if (signal === 'pulse') {
    x = new Float64Array(N);
    x[N / 2] = 1; // the impulse: its output IS the impulse response
  } else {
    x = Float64Array.from({ length: N }, () => gauss());
  }

  /* ---------- the first layer ---------------------------------------------- */
  // The kernel of the Toeplitz case: a random FIR filter of `kernel` points.
  // It is drawn BEFORE the dense matrix so that both structures share the same
  // starting seed — comparing two different draws would say nothing about the
  // structure.
  const h = new Float64Array(kernel);
  for (let k = 0; k < kernel; k++) h[k] = (scale * gauss()) / Math.sqrt(kernel);

  const W1 =
    structure === 'dense' ? denseMatrix(N, N, scale, gauss) : toeplitzMatrix(N, N, h);
  const nParams = structure === 'dense' ? N * N : kernel;

  const z = matvec(W1, x, N, N);
  const a1 = applyAct(z, act);

  // Second layer: the same structure, so the network stays homogeneous.
  const h2 = new Float64Array(kernel);
  for (let k = 0; k < kernel; k++) h2[k] = (scale * gauss()) / Math.sqrt(kernel);
  const W2 =
    structure === 'dense' ? denseMatrix(N, N, scale, gauss) : toeplitzMatrix(N, N, h2);
  const y = matvec(W2, a1, N, N);

  /* ---------- the control: the SAME network without an activation --------- */
  // This is demonstration 1. Two composed linear layers are one matrix — and the
  // output below is identical to that of a single layer W₂W₁, which the harness
  // verifies.
  const yLin = matvec(W2, z, N, N);

  /* ---------- plots -------------------------------------------------------- */
  const t = timeAxis(N, FS);
  const ms = Float64Array.from(t, (v) => 1000 * v);
  const fx = freqAxis(NFFT, FS);
  const norm = (mag) => {
    const peak = Math.max(...mag, 1e-300);
    const out = new Float64Array(mag.length);
    for (let i = 0; i < mag.length; i++) out[i] = dbAmp(mag[i] / peak, DB_FLOOR);
    return out;
  };

  // The frequency response of the kernel, the only curve that means anything in
  // the Toeplitz case — and nothing in the dense one, where it is not drawn.
  const respDb =
    structure === 'toeplitz' ? norm(magSpectrum(h, { nfft: NFFT })) : new Float64Array(0);
  const respX = structure === 'toeplitz' ? fx : new Float64Array(0);

  // The first ROW of W₁: this is the drawing that explains everything. Dense, it
  // is structureless noise; Toeplitz, it is the kernel, shifted — and every
  // other row is the same one, shifted by one notch.
  const rowIdx = new Float64Array(N);
  const row = new Float64Array(N);
  const rowMid = new Float64Array(N);
  const mid = Math.floor(N / 2);
  for (let j = 0; j < N; j++) {
    rowIdx[j] = j;
    row[j] = W1[8 * N + j];
    rowMid[j] = W1[mid * N + j];
  }

  /* ---------- what is read as numbers ------------------------------------- */
  // The gap between the network with and without the activation: zero if
  // σ = identity, and it measures the "power" the activation adds.
  let dev = 0;
  let ref = 0;
  for (let i = 0; i < N; i++) {
    dev += (y[i] - yLin[i]) ** 2;
    ref += yLin[i] * yLin[i];
  }
  const nonlin = Math.sqrt(dev / Math.max(ref, 1e-300));

  // The reach of the layer, measured by the simplest probe there is: the number
  // of frequencies the output holds where the input had none.
  const magIn = magSpectrum(x, { nfft: NFFT });
  const magOut = magSpectrum(y, { nfft: NFFT });
  const inPeak = Math.max(...magIn, 1e-300);
  const outPeak = Math.max(...magOut, 1e-300);
  let created = 0;
  for (let k = 1; k < magIn.length; k++)
    if (magIn[k] / inPeak < 0.01 && magOut[k] / outPeak > 0.05) created++;

  return {
    observables: {
      xTime: { x: ms, y: x },
      yTime: { x: ms, y },
      yLinTime: { x: ms, y: yLin },

      specIn: { x: fx, y: norm(magIn) },
      specOut: { x: fx, y: norm(magOut) },
      response: { x: respX, y: respDb },

      rowIdx,
      row: { x: rowIdx, y: row },
      rowMid: { x: rowIdx, y: rowMid },

      nParams: {
        // precision: 0 — without it the statline rounds to four significant
        // digits and 16384 shows as 16380, which wrecks exactly the argument
        // this number carries.
        value: nParams,
        meta: { label: 'weights in the layer', precision: 0 },
      },
      nDense: {
        value: N * N,
        meta: { label: 'weights if dense', precision: 0 },
      },
      ratio: {
        value: (N * N) / nParams,
        meta: { label: 'dense / structured ratio', precision: 0 },
      },
      nonlinearity: {
        value: nonlin,
        meta: { label: 'gap to the linear network', precision: 4 },
      },
      created: {
        value: created,
        meta: { label: 'frequencies created', precision: 0 },
      },
    },
  };
}

export { N, FS, NFFT };
