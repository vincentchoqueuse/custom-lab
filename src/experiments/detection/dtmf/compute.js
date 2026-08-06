// DTMF — the detection subject applied to the thing it was invented for.
//
// A telephone key is TWO sinusoids at once, one from a low group and one from a
// high group, and the receiver's job is to say which of sixteen pairs arrived.
// Every piece of the three experiments before this one is in it:
//
//   · the projector onto {cos, sin} at a given tone IS the matched filter of
//     `matched-filter`, written for a signal whose PHASE is unknown;
//   · the modulus of the estimated amplitude IS the GLRT statistic of `glrt` —
//     amplitude and phase maximised out — so |â|² is a χ′²₂ and |â| is Rice
//     under H₁ and Rayleigh under H₀;
//   · choosing among sixteen keys is M-ary detection, and the score of a key is
//     the sum of the two energies its two tones carry.
//
// THE ESTIMATOR, and it is a projection and nothing else. For a tone f the
// basis is the two columns c[n] = cos(2πfn/Fs), s[n] = sin(2πfn/Fs), and the
// least-squares amplitude solves the 2×2 normal equations
//
//     [Σc²  Σcs] [α]   [Σxc]
//     [Σcs  Σs²] [β] = [Σxs]        â = √(α² + β²)
//
// The Gram matrix is inverted rather than assumed diagonal: over a window that
// is not a whole number of cycles the two columns are NOT orthogonal, and
// pretending they are is a bias that grows as the window shortens — which is
// exactly the regime a real detector works in.
//
// WHAT THE LAWS SAY, and the experiment measures both. Each coefficient is a
// projection of white noise onto a unit direction, so α and β are Gaussian of
// variance ≈ 2σ²/N. Therefore
//
//     tone absent :  |â| ~ Rayleigh(σ√(2/N)),   E|â| = σ√(π/N)
//     tone present:  |â| ~ Rice(A, σ√(2/N))
//
// and the whole design of a DTMF receiver is choosing N so that those two
// densities stop overlapping.
// PURE, stateless, seeded — runs in a worker; deterministic at fixed seed.
import { mulberry32, gaussFrom } from '../../../core/rng.js';

export const FS = 8000; // telephony
export const LOW = [697, 770, 852, 941];
export const HIGH = [1209, 1336, 1477, 1633];
export const KEYS = [
  ['1', '2', '3', 'A'],
  ['4', '5', '6', 'B'],
  ['7', '8', '9', 'C'],
  ['*', '0', '#', 'D'],
];
export const TONES = [...LOW, ...HIGH];

const NHIST = 44; // bins on the histogram
const NPDF = 200;
const NSHOW = 600; // samples drawn on the time view

/** Row and column of a key, from its label. */
export function keyIndex(key) {
  for (let r = 0; r < 4; r++) for (let c = 0; c < 4; c++) if (KEYS[r][c] === key) return { r, c };
  return { r: 0, c: 0 };
}

/**
 * The least-squares amplitude of a tone f in x, by the 2×2 projection.
 * Returns the modulus and the energy the projection carries.
 */
export function project(x, f, n0 = 0, n = x.length) {
  let cc = 0;
  let ss = 0;
  let cs = 0;
  let xc = 0;
  let xs = 0;
  const w = (2 * Math.PI * f) / FS;
  for (let i = 0; i < n; i++) {
    const c = Math.cos(w * (n0 + i));
    const s = Math.sin(w * (n0 + i));
    cc += c * c;
    ss += s * s;
    cs += c * s;
    xc += x[n0 + i] * c;
    xs += x[n0 + i] * s;
  }
  const det = cc * ss - cs * cs;
  if (Math.abs(det) < 1e-12) return { amp: 0, energy: 0, alpha: 0, beta: 0 };
  const alpha = (ss * xc - cs * xs) / det;
  const beta = (cc * xs - cs * xc) / det;
  return { amp: Math.hypot(alpha, beta), energy: alpha * xc + beta * xs, alpha, beta };
}

/** One burst: the two tones of `key`, at amplitude A, in noise of level sigma. */
export function burst({ key, n, amp, sigma, seed, phase = true }) {
  const { r, c } = keyIndex(key);
  const rng = mulberry32(seed);
  const gauss = gaussFrom(rng);
  const p1 = phase ? 2 * Math.PI * rng() : 0;
  const p2 = phase ? 2 * Math.PI * rng() : 0;
  const x = new Float64Array(n);
  const clean = new Float64Array(n);
  for (let i = 0; i < n; i++) {
    clean[i] =
      amp * Math.cos((2 * Math.PI * LOW[r] * i) / FS + p1) +
      amp * Math.cos((2 * Math.PI * HIGH[c] * i) / FS + p2);
    x[i] = clean[i] + sigma * gauss();
  }
  return { x, clean, r, c };
}

/** The eight amplitudes, and the 4×4 score of every key. */
export function analyse(x) {
  const amps = TONES.map((f) => project(x, f).amp);
  const score = new Float64Array(16);
  for (let r = 0; r < 4; r++)
    for (let c = 0; c < 4; c++) score[4 * r + c] = amps[r] ** 2 + amps[4 + c] ** 2;
  let best = 0;
  for (let i = 1; i < 16; i++) if (score[i] > score[best]) best = i;
  return { amps, score, best };
}

/** Rayleigh and Rice, the two laws the modulus obeys. */
export const rayleighPdf = (x, s) => (x <= 0 ? 0 : (x / (s * s)) * Math.exp(-(x * x) / (2 * s * s)));
export function ricePdf(x, v, s) {
  if (x <= 0) return 0;
  // I₀ by its series, which converges fast at the arguments this experiment
  // reaches and needs no table
  const z = (x * v) / (s * s);
  let i0 = 1;
  let t = 1;
  for (let k = 1; k < 60; k++) {
    t *= (z * z) / (4 * k * k);
    i0 += t;
    if (t < 1e-16 * i0) break;
  }
  return (x / (s * s)) * Math.exp(-(x * x + v * v) / (2 * s * s)) * i0;
}

/**
 * @param {{key: string, ms: number, snrDb: number, M: number, seed: number}} params
 * @returns {{observables: Object}}
 */
export function compute({ key, ms, snrDb, M, seed }) {
  const n = Math.max(8, Math.round((ms * FS) / 1000));
  const amp = 1;
  // SNR per tone: A²/2 against σ², which is the convention the statline reports
  const sigma = Math.sqrt(amp * amp / 2 / 10 ** (snrDb / 10));
  const { x, clean, r, c } = burst({ key, n, amp, sigma, seed });
  const { amps, score, best } = analyse(x);

  /* ---------- the time view ------------------------------------------------ */
  const nShow = Math.min(NSHOW, n);
  const tt = new Float64Array(nShow);
  const tx = new Float64Array(nShow);
  const tc = new Float64Array(nShow);
  for (let i = 0; i < nShow; i++) {
    tt[i] = (i / FS) * 1000;
    tx[i] = x[i];
    tc[i] = clean[i];
  }

  /* ---------- the eight amplitudes ---------------------------------------- */
  const ax = Float64Array.from(TONES);
  const ay = Float64Array.from(amps);
  // the two that were sent, so the room can see which stems SHOULD be tall
  const px = Float64Array.from([LOW[r], HIGH[c]]);
  const py = Float64Array.from([amps[r], amps[4 + c]]);
  // the level a tone that is ABSENT reaches on average: E|â| = σ√(π/N)
  const floor = sigma * Math.sqrt(Math.PI / n);

  /* ---------- the keypad --------------------------------------------------- */
  // the 4×4 grid, its labels and the winning cell — consumed by the custom view
  const grid = Float64Array.from(score);
  let peak = 0;
  for (let i = 0; i < 16; i++) peak = Math.max(peak, score[i]);

  /* ---------- the two laws, measured over M bursts ------------------------- */
  const s = sigma * Math.sqrt(2 / n); // the scale of both laws
  const on = new Float64Array(M);
  const off = new Float64Array(M);
  // an absent tone: the low-group tone of ANOTHER row, chosen as far as the
  // grid allows so its leakage from the present one is smallest
  const rOff = (r + 2) % 4;
  for (let m = 0; m < M; m++) {
    const b = burst({ key, n, amp, sigma, seed: seed + 1 + m });
    on[m] = project(b.x, LOW[r]).amp;
    off[m] = project(b.x, LOW[rOff]).amp;
  }
  const hiEdge = Math.max(1.4 * amp, 6 * s);
  const hx = new Float64Array(NHIST);
  const hOn = new Float64Array(NHIST);
  const hOff = new Float64Array(NHIST);
  const bw = hiEdge / NHIST;
  for (let i = 0; i < NHIST; i++) hx[i] = (i + 0.5) * bw;
  for (let m = 0; m < M; m++) {
    const i = Math.floor(on[m] / bw);
    const j = Math.floor(off[m] / bw);
    if (i >= 0 && i < NHIST) hOn[i] += 1 / (M * bw);
    if (j >= 0 && j < NHIST) hOff[j] += 1 / (M * bw);
  }
  const px2 = new Float64Array(NPDF);
  const pRay = new Float64Array(NPDF);
  const pRice = new Float64Array(NPDF);
  for (let i = 0; i < NPDF; i++) {
    const v = (hiEdge * (i + 0.5)) / NPDF;
    px2[i] = v;
    pRay[i] = rayleighPdf(v, s);
    pRice[i] = ricePdf(v, amp, s);
  }

  /* ---------- how often the key is right ----------------------------------- */
  let right = 0;
  for (let m = 0; m < M; m++) {
    const b = burst({ key, n, amp, sigma, seed: seed + 5000 + m });
    if (analyse(b.x).best === 4 * r + c) right++;
  }

  return {
    observables: {
      tNoisy: { x: tt, y: tx },
      tClean: { x: tt, y: tc },

      amplitudes: { x: ax, y: ay },
      sentTones: { x: px, y: py },
      floorLine: floor,

      grid, // 16 scores, row-major — the keypad view
      gridPeak: peak,
      trueCell: 4 * r + c,
      bestCell: best,

      histOn: { x: hx, y: hOn },
      histOff: { x: hx, y: hOff },
      pdfRice: { x: px2, y: pRice },
      pdfRayleigh: { x: px2, y: pRay },
      threshold: 0.5 * amp,

      samples: { value: n, meta: { label: 'samples in the window', precision: 0 } },
      floorMeta: {
        value: floor,
        meta: { label: 'E|â| when the tone is absent = σ√(π/N)', precision: 4 },
      },
      decided: {
        value: KEYS[Math.floor(best / 4)][best % 4],
        meta: { label: 'key decided' },
      },
      success: { value: right / M, meta: { label: 'right, over M bursts', precision: 4 } },
      margin: {
        value: 20 * Math.log10(Math.min(amps[r], amps[4 + c]) / Math.max(floor, 1e-12)),
        meta: { label: 'weakest tone over the floor', unit: 'dB', precision: 1 },
      },
    },
  };
}
