// Analog modulations of a carrier fc = 1000 Hz by a cosine message at fm:
//   AM: s(t) = (1 + ka·cos(2πfm t)) · cos(2πfc t)
//       → carrier at 0 dB and two sidebands at 20·log10(ka/2)
//   FM: s(t) = cos(2πfc t + β·sin(2πfm t))
//       → Bessel lines: amplitude Jn(β) at fc + n·fm; the carrier VANISHES
//         at the zeros of J0 (β = 2.405, 5.520…) and Carson's rule
//         B ≈ 2(β+1)·fm captures ~98% of the power
// The record length (8192 samples at 8 kHz) makes fc and the default fm
// INTEGER numbers of cycles, so power identities hold to machine precision:
//   AM: mean s² = (1 + ka²/2)/2 exactly;  FM: mean s² = 1/2 exactly.
// The spectrum is Hann-windowed, normalized by the coherent gain (an
// unmodulated carrier reads 0 dB), and sliced around fc.
// PURE, stateless, seeded — runs in a worker; deterministic at fixed seed.
import { fft, toDb, windowValue } from '../../../core/numeric.js';

const FS = 8000; // sampling rate (Hz)
const NS = 8192; // record length (power of two, T = 1.024 s)
const FC = 1000; // carrier (Hz) — exactly 1024 cycles over the record
const DB_FLOOR = -70;

// Bessel Jn by ascending series (n ≤ ~30, x ≤ ~10: fully converged at 40
// terms). Kept local: first Bessel consumer in the catalog — promoted to
// core/numeric.js at the second one (repo rule).
function besselJ(n, x) {
  const h = x / 2;
  let term = 1;
  for (let i = 1; i <= n; i++) term *= h / i; // (x/2)^n / n!
  let sum = term;
  for (let k = 0; k < 40; k++) {
    term *= (-h * h) / ((k + 1) * (n + k + 1));
    sum += term;
  }
  return sum;
}

/**
 * @param {{mode: string, fm: number, ka: number, beta: number, seed: number}} params
 * @returns {{observables: Object}}
 */
export function compute({ mode, fm, ka, beta }) {
  const am = mode === 'am';

  const x = new Float64Array(NS);
  let meanPow = 0;
  for (let i = 0; i < NS; i++) {
    const t = i / FS;
    x[i] = am
      ? (1 + ka * Math.cos(2 * Math.PI * fm * t)) * Math.cos(2 * Math.PI * FC * t)
      : Math.cos(2 * Math.PI * FC * t + beta * Math.sin(2 * Math.PI * fm * t));
    meanPow += x[i] * x[i];
  }
  meanPow /= NS;

  // Hann-windowed spectrum, coherent-gain normalization (carrier alone = 0 dB)
  const re = new Float64Array(NS);
  const im = new Float64Array(NS);
  let sw = 0;
  for (let i = 0; i < NS; i++) {
    const w = windowValue('hann', i, NS);
    re[i] = x[i] * w;
    sw += w;
  }
  fft(re, im);
  const ref = sw / 2;
  const binHz = FS / NS;
  const nh = NS / 2;
  const mag = new Float64Array(nh + 1);
  for (let k = 0; k <= nh; k++) mag[k] = Math.hypot(re[k], im[k]);

  // display slice around the carrier, wide enough for the line comb
  const half = Math.max(300, Math.min(2600, (am ? 4 : beta + 5) * fm));
  const kLo = Math.max(0, Math.round((FC - half) / binHz));
  const kHi = Math.min(nh, Math.round((FC + half) / binHz));
  const sf = new Float64Array(kHi - kLo + 1);
  const sy = new Float64Array(kHi - kLo + 1);
  for (let k = kLo; k <= kHi; k++) {
    sf[k - kLo] = k * binHz;
    sy[k - kLo] = toDb(mag[k] / ref, DB_FLOOR);
  }

  // theoretical line comb (orange dots over the measured spectrum)
  const tx = [];
  const ty = [];
  const pushLine = (f, amp) => {
    const db = 20 * Math.log10(Math.abs(amp) + 1e-300);
    if (f > FC - half && f < FC + half && db > DB_FLOOR + 5) {
      tx.push(f);
      ty.push(db);
    }
  };
  if (am) {
    pushLine(FC, 1);
    pushLine(FC - fm, ka / 2);
    pushLine(FC + fm, ka / 2);
  } else {
    const K = Math.ceil(beta) + 8;
    for (let n = -K; n <= K; n++) pushLine(FC + n * fm, besselJ(Math.abs(n), beta));
  }

  // measured 98%-power bandwidth around fc (grown symmetrically bin by bin)
  let total = 0;
  for (let k = 0; k <= nh; k++) total += mag[k] * mag[k];
  const kc = Math.round(FC / binHz);
  let acc = mag[kc] * mag[kc];
  let r = 0;
  while (acc < 0.98 * total && r < nh) {
    r++;
    if (kc - r >= 0) acc += mag[kc - r] * mag[kc - r];
    if (kc + r <= nh) acc += mag[kc + r] * mag[kc + r];
  }
  const b98 = 2 * r * binHz;

  // time view: three message periods, full resolution, with the ±envelope
  const nt = Math.min(NS, Math.round((3 / fm) * FS));
  const zt = new Float64Array(nt);
  const zx = new Float64Array(nt);
  const eU = new Float64Array(nt);
  const eL = new Float64Array(nt);
  for (let i = 0; i < nt; i++) {
    const t = i / FS;
    zt[i] = t;
    zx[i] = x[i];
    const env = am ? 1 + ka * Math.cos(2 * Math.PI * fm * t) : 1;
    eU[i] = env;
    eL[i] = -env;
  }

  const carrierDb = toDb(mag[kc] / ref, DB_FLOOR);

  const scalars = am
    ? {
        carrierShare: {
          value: 100 / (1 + (ka * ka) / 2),
          meta: { label: 'puissance dans la porteuse', unit: '%', precision: 1 },
        },
      }
    : {
        carson: {
          value: 2 * (beta + 1) * fm,
          meta: { label: 'Carson 2(β+1)f_m', unit: 'Hz', precision: 0 },
        },
        b98m: { value: b98, meta: { label: 'B mesurée (98%)', unit: 'Hz', precision: 0 } },
      };

  return {
    observables: {
      sig: { x: zt, y: zx },
      envUp: { x: zt, y: eU },
      envDown: { x: zt, y: eL },
      spectrum: { x: sf, y: sy },
      theoryLines: { x: Float64Array.from(tx), y: Float64Array.from(ty) },
      meanPow, // checks (exact power identities)
      carrierDb, // checks (Bessel carrier level, extinction)
      ...scalars,
    },
  };
}
