// The oversampling DAC, the classic chain played in full:
//   x[n] at Fs → zero-stuffing ×L → digital interpolation FIR (windowed
//   sinc, cutoff Fs/2) → zero-order hold at L·Fs → the analog staircase
// Three facts the views make visible and the checks prove:
//   · the windowed-sinc kernel is EXACTLY 1 at its center and 0 at the
//     other multiples of L, so the interpolated stream passes through the
//     original samples to machine precision;
//   · the ZOH multiplies the spectrum by sinc(f/(L·Fs)): images sit at
//     k·L·Fs ± f0 under that envelope, and the baseband suffers the sinc
//     droop 20·log10|sinc(f0/(L·Fs))| — which oversampling erases;
//   · without the digital filter the stuffed images at k·Fs ± f0 remain
//     at nearly full level: the analog filter alone cannot save a DAC.
// The "analog" signal is simulated on a dense grid at 64·Fs.
// PURE, stateless, seeded — runs in a worker; deterministic at fixed seed.
import { fft, sinc } from '../../../core/numeric.js';

const FS = 8000; // base sample rate (Hz)
const N0 = 160; // base samples simulated (20 ms)
const DENSE = 64; // dense "analog" ticks per base sample (512 kHz)
const NFFT = 8192; // spectrum window (16 ms → 62.5 Hz bins)
const DB_FLOOR = -90;

/**
 * @param {{f0: number, L: number, digFilter: boolean, seed: number}} params
 * @returns {{observables: Object}}
 */
export function compute({ f0, L, digFilter }) {
  const nUp = N0 * L; // high-rate length
  const hold = DENSE / L; // dense ticks per high-rate sample

  // base samples and zero-stuffed stream
  const x = new Float64Array(N0);
  for (let n = 0; n < N0; n++) x[n] = Math.sin((2 * Math.PI * f0 * n) / FS);
  const up = new Float64Array(nUp);
  for (let n = 0; n < N0; n++) up[n * L] = x[n];

  // windowed-sinc interpolation FIR: 1 at center, 0 at other multiples of L
  const half = 8 * L;
  const taps = 2 * half + 1;
  const h = new Float64Array(taps);
  for (let k = 0; k < taps; k++) {
    const m = k - half;
    h[k] = sinc(m / L) * (0.5 + 0.5 * Math.cos((Math.PI * m) / (half + 1)));
  }

  // interpolated high-rate stream (delay-compensated linear convolution)
  const yUp = new Float64Array(nUp);
  if (digFilter) {
    for (let n = 0; n < nUp; n++) {
      let acc = 0;
      const kMin = Math.max(0, n + half - nUp + 1);
      const kMax = Math.min(taps - 1, n + half);
      for (let k = kMin; k <= kMax; k++) acc += h[k] * up[n + half - k];
      yUp[n] = acc;
    }
  } else {
    yUp.set(up);
  }

  // zero-order hold onto the dense "analog" grid
  const nDense = nUp * hold;
  const a = new Float64Array(nDense);
  for (let n = 0; n < nUp; n++) a.fill(yUp[n], n * hold, (n + 1) * hold);

  /* ---------- time view: ~4 periods from the middle of the record -------- */
  const tSpan = Math.min(0.005, 4 / f0); // seconds
  const nShow = Math.round(tSpan * FS * DENSE);
  const i0 = Math.round(nDense / 2 / hold) * hold; // start on a hold boundary
  const dt = new Float64Array(nShow);
  const stair = new Float64Array(nShow);
  const ideal = new Float64Array(nShow);
  for (let i = 0; i < nShow; i++) {
    const t = (i0 + i) / (FS * DENSE);
    dt[i] = t * 1000;
    stair[i] = a[i0 + i];
    ideal[i] = Math.sin(2 * Math.PI * f0 * t);
  }
  const sN = Math.ceil(tSpan * FS);
  const st = new Float64Array(sN);
  const sv = new Float64Array(sN);
  const n0Base = i0 / DENSE;
  for (let n = 0; n < sN; n++) {
    st[n] = ((n0Base + n) / FS) * 1000;
    sv[n] = x[n0Base + n];
  }

  /* ---------- digital-domain view: 2 base periods of the high-rate stream */
  const upSpan = Math.min(2 * Math.round((FS / f0) * L), nUp / 2);
  const u0 = Math.round(nUp / 4);
  const ut = new Float64Array(upSpan);
  const uBars = new Float64Array(upSpan);
  const uLine = new Float64Array(upSpan);
  for (let i = 0; i < upSpan; i++) {
    ut[i] = ((u0 + i) / (FS * L)) * 1000;
    uBars[i] = up[u0 + i];
    uLine[i] = yUp[u0 + i];
  }

  /* ---------- spectrum of the analog staircase (Hann window) ------------- */
  const re = new Float64Array(NFFT);
  const im = new Float64Array(NFFT);
  const w0 = Math.round((nDense - NFFT) / 2);
  let sw = 0;
  for (let i = 0; i < NFFT; i++) {
    const wv = 0.5 - 0.5 * Math.cos((2 * Math.PI * i) / NFFT);
    re[i] = a[w0 + i] * wv;
    sw += wv;
  }
  fft(re, im);
  const ref = sw / 2; // a unit sine reads 0 dB
  const binHz = (FS * DENSE) / NFFT;
  const fMax = Math.min(L * FS + 1.6 * FS, (FS * DENSE) / 2);
  const kMax = Math.floor(fMax / binHz);
  const sf = new Float64Array(kMax + 1);
  const sy = new Float64Array(kMax + 1);
  const env = new Float64Array(kMax + 1);
  for (let k = 0; k <= kMax; k++) {
    sf[k] = k * binHz;
    const m = Math.hypot(re[k], im[k]) / ref;
    sy[k] = Math.max(DB_FLOOR, 20 * Math.log10(m + 1e-300));
    env[k] = Math.max(DB_FLOOR, 20 * Math.log10(Math.abs(sinc(sf[k] / (L * FS))) + 1e-300));
  }

  /** Spectrum level (dB) at the bin nearest f. */
  const levelAt = (f) => sy[Math.round(f / binHz)];
  const baseDb = levelAt(f0);
  const img1F = L * FS - f0;
  const img1Db = levelAt(img1F) - baseDb;
  const imgFsDb = levelAt(FS - f0) - baseDb; // stuffed image (digital-filter story)
  const droopTh = 20 * Math.log10(Math.abs(sinc(f0 / (L * FS))));

  return {
    observables: {
      staircase: { x: dt, y: stair },
      idealSig: { x: dt, y: ideal },
      samples: { x: st, y: sv },
      upBars: { x: ut, y: uBars },
      upLine: { x: ut, y: uLine },
      spectrum: { x: sf, y: sy },
      sincEnv: { x: sf, y: env },
      baseDb, // checks: absolute baseband level ≈ droop
      imgFsDb, // checks: stuffed image at Fs − f0, relative
      droopMeas: {
        value: baseDb,
        meta: { label: 'droop mesuré', unit: 'dB', precision: 2 },
      },
      droopTh: {
        value: droopTh,
        meta: { label: 'sinc(f₀/LFs)', unit: 'dB', precision: 2 },
      },
      img1: {
        value: img1F / 1000,
        meta: { label: 'image 1 à L·Fs−f₀', unit: 'kHz', precision: 1 },
      },
      img1Db: {
        value: img1Db,
        meta: { label: 'niveau image 1', unit: 'dB', precision: 1 },
      },
    },
  };
}
