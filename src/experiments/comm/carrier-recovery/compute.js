// Carrier recovery — the assumption every other experiment in this subject
// makes silently.
//
// `constellations` draws its clouds around the right points, `blind-equalization`
// undoes a channel "up to a rotation", `ofdm` equalizes carrier by carrier: all
// three assume the receiver knows the transmitter's phase. It does not. The
// oscillators are two different crystals, so what arrives is
//
//     r[n] = s[n]·e^{j(2π·Δf·n + θ₀)} + w[n]      (Δf in ‰ of the symbol rate)
//
// and the constellation TURNS. Three ways to stop it, and they are the three
// the field actually uses:
//
//   COSTAS      a feedback loop on a phase error read WITHOUT the data —
//               for M-PSK the polarity form, whose detector characteristic is
//               a sine of period 2π/M
//   V&V         Viterbi & Viterbi: raise r to the Mth power, which strips the
//               modulation, average over a block, divide the angle by M.
//               Feedforward, no loop, no acquisition — and no memory either
//   DECISION    once the decisions are good, the phase error is the angle
//               between what arrived and what was decided. The best of the
//               three when it works, useless before it does
//
// THE RESULT THAT MATTERS, and it is the same for all three: the detector
// cannot tell one constellation point from another, so its characteristic has
// period 2π/M and it locks to any of M phases. That is not a defect to fix —
// it is a theorem about a modulation that is symmetric under rotation, and the
// answer to it is differential encoding, one subject further on.
//
// The loop filter is the standard proportional-plus-integral second order,
// normalised by its loop bandwidth B_L·T and damping ζ (Gardner's form), with
// the first-order version available so the room can watch it fail: a
// first-order loop has a STATIC phase error proportional to the frequency
// offset, a second-order one has none, and both statements are exact.
//
// PURE, stateless, seeded — runs in a worker; deterministic at fixed seed.
import { mulberry32, gaussFrom } from '../../../core/rng.js';
import { constellation, BITS_PER_SYMBOL } from '../_lib/modulation.js';

const NSC = 501; // points on the S-curve
const NJIT = 9; // loop bandwidths on the jitter sweep
const NCLOUD = 1500; // symbols drawn on the plane

/** Wrap to (−π, π]. */
export const wrap = (a) => a - 2 * Math.PI * Math.round(a / (2 * Math.PI));

/** M for an M-PSK — the order of the rotational symmetry, and of the ambiguity. */
export const orderOf = (mod) => 2 ** BITS_PER_SYMBOL[mod];

/**
 * The phase-error detector. Every one of these returns an estimate of the
 * error between the phase of `r` and the phase the receiver believes in — and
 * every one of them is blind to which constellation point was sent, which is
 * exactly why they are all periodic in 2π/M.
 */
export function detect(algo, ri, rq, mod, pts) {
  if (algo === 'costas') {
    // polarity-type Costas, the M-PSK generalisation of sign(I)·Q − sign(Q)·I:
    // the error is the sine of M times the phase error, read without knowing
    // the symbol
    const M = orderOf(mod);
    if (mod === 'bpsk') return (ri >= 0 ? 1 : -1) * rq;
    return -Math.sin(M * Math.atan2(rq, ri)) * Math.hypot(ri, rq) ** 2;
  }
  // decision-directed: the angle between what arrived and the nearest point
  let best = 0;
  let bd = Infinity;
  for (let k = 0; k < pts.length; k++) {
    const d = (ri - pts[k].x) ** 2 + (rq - pts[k].y) ** 2;
    if (d < bd) {
      bd = d;
      best = k;
    }
  }
  // Im{ r · conj(ŝ) } — the cross product, which IS |r||ŝ|·sin(error)
  return rq * pts[best].x - ri * pts[best].y;
}

/** The loop filter's two gains, from B_L·T and ζ (Gardner's normalisation). */
export function loopGains(blt, zeta, order) {
  const t = blt / (zeta + 1 / (4 * zeta));
  const d = 1 + 2 * zeta * t + t * t;
  return order === 1 ? { k1: 4 * zeta * t / d, k2: 0 } : { k1: (4 * zeta * t) / d, k2: (4 * t * t) / d };
}

/** One run of the link and of the selected synchronizer. */
export function run(params) {
  const { mod, ebn0Db, dfreq, phi0, algo, blt, zeta, order, block, N, seed } = params;
  const pts = constellation(mod);
  const M = pts.length;
  const k = BITS_PER_SYMBOL[mod];
  const rng = mulberry32(seed);
  const gauss = gaussFrom(rng);
  // unit-energy symbols in AWGN: Es/N0 = k·Eb/N0, and each quadrature carries
  // half the noise
  const sigma = Math.sqrt(1 / (2 * k * 10 ** (ebn0Db / 10)));

  const si = new Float64Array(N);
  const sq = new Float64Array(N);
  const ri = new Float64Array(N);
  const rq = new Float64Array(N);
  const truth = new Float64Array(N);
  for (let n = 0; n < N; n++) {
    const p = pts[Math.floor(rng() * M)];
    si[n] = p.x;
    sq[n] = p.y;
    const th = 2 * Math.PI * dfreq * 1e-3 * n + (phi0 * Math.PI) / 180;
    truth[n] = th;
    ri[n] = (p.x * Math.cos(th) - p.y * Math.sin(th)) + sigma * gauss();
    rq[n] = (p.x * Math.sin(th) + p.y * Math.cos(th)) + sigma * gauss();
  }

  const est = new Float64Array(N); // θ̂[n]
  const yi = new Float64Array(N); // the corrected symbols
  const yq = new Float64Array(N);

  if (algo === 'vv') {
    // Viterbi & Viterbi: no loop. r^M strips the modulation because every
    // constellation point maps to the SAME angle; average over a block and
    // divide by M. The division is where the ambiguity is born, in one line.
    const L = Math.max(2, Math.min(block, N));
    // The constellation's OWN Mth-power angle, removed. Raising a QPSK point
    // at π/4 to the fourth power gives π, and dividing by M hands back π/4 —
    // a fixed 45° that has nothing to do with the channel. Without this the
    // estimator is biased by exactly half an ambiguity slot, which reads as a
    // synchronizer that does not work at all.
    const off = wrap(M * Math.atan2(pts[0].y, pts[0].x)) / M;
    for (let b = 0; b < N; b += L) {
      const hi = Math.min(b + L, N);
      let ai = 0;
      let aq = 0;
      for (let n = b; n < hi; n++) {
        const mag = Math.hypot(ri[n], rq[n]);
        const ang = M * Math.atan2(rq[n], ri[n]);
        ai += mag * Math.cos(ang);
        aq += mag * Math.sin(ang);
      }
      const th = Math.atan2(aq, ai) / M - off;
      for (let n = b; n < hi; n++) est[n] = th;
    }
  } else {
    const { k1, k2 } = loopGains(blt, zeta, order);
    let th = 0;
    let acc = 0;
    for (let n = 0; n < N; n++) {
      est[n] = th;
      const c = Math.cos(-th);
      const s = Math.sin(-th);
      const di = ri[n] * c - rq[n] * s;
      const dq = ri[n] * s + rq[n] * c;
      const e = detect(algo, di, dq, mod, pts);
      acc += k2 * e;
      th += k1 * e + acc;
    }
  }

  for (let n = 0; n < N; n++) {
    const c = Math.cos(-est[n]);
    const s = Math.sin(-est[n]);
    yi[n] = ri[n] * c - rq[n] * s;
    yq[n] = ri[n] * s + rq[n] * c;
  }
  return { si, sq, ri, rq, yi, yq, est, truth, pts, M, sigma };
}

/**
 * The DETECTOR CHARACTERISTIC — the S-curve. E[e | phase error φ], averaged
 * over the symbols and over the noise, which is what a loop actually sees.
 * Everything the experiment teaches about ambiguity is the period of this.
 */
export function sCurve(algo, mod, ebn0Db, seed = 7, reps = 400) {
  const pts = constellation(mod);
  const M = pts.length;
  const k = BITS_PER_SYMBOL[mod];
  const rng = mulberry32(seed);
  const gauss = gaussFrom(rng);
  const sigma = Math.sqrt(1 / (2 * k * 10 ** (ebn0Db / 10)));
  const px = new Float64Array(NSC);
  const py = new Float64Array(NSC);
  // the same symbols and the same noise at every φ, so the curve is a function
  // of φ and not of the draw
  const idx = Int32Array.from({ length: reps }, () => Math.floor(rng() * M));
  const ni = Float64Array.from({ length: reps }, () => sigma * gauss());
  const nq = Float64Array.from({ length: reps }, () => sigma * gauss());
  for (let i = 0; i < NSC; i++) {
    const phi = -Math.PI + (2 * Math.PI * i) / (NSC - 1);
    px[i] = phi;
    let acc = 0;
    for (let m = 0; m < reps; m++) {
      const p = pts[idx[m]];
      const a = p.x * Math.cos(phi) - p.y * Math.sin(phi) + ni[m];
      const b = p.x * Math.sin(phi) + p.y * Math.cos(phi) + nq[m];
      acc += detect(algo, a, b, mod, pts);
    }
    py[i] = acc / reps;
  }
  return { x: px, y: py };
}

/**
 * @param {{mod: string, ebn0Db: number, dfreq: number, phi0: number,
 *          algo: string, blt: number, zeta: number, order: number,
 *          block: number, N: number, seed: number}} params
 * @returns {{observables: Object}}
 */
export function compute(params) {
  const { mod, ebn0Db, algo, blt, zeta, order, block, N, dfreq } = params;
  const r = run(params);
  const M = r.M;
  const amb = (2 * Math.PI) / M;

  /* ---------- the phase error, wrapped into one ambiguity slot ------------ */
  // Wrapped to ±π/M and NOT to ±π: a loop locked to a neighbouring point is
  // locked, and an unwrapped error would draw that as a permanent failure.
  const nn = new Float64Array(N);
  const err = new Float64Array(N);
  for (let n = 0; n < N; n++) {
    nn[n] = n;
    const e = r.est[n] - r.truth[n];
    err[n] = (e - amb * Math.round(e / amb)) * (180 / Math.PI);
  }

  /* ---------- the two clouds --------------------------------------------- */
  const c = Math.min(NCLOUD, N);
  const from = N - c;
  const rxI = new Float64Array(c);
  const rxQ = new Float64Array(c);
  const okI = new Float64Array(c);
  const okQ = new Float64Array(c);
  for (let i = 0; i < c; i++) {
    rxI[i] = r.ri[from + i];
    rxQ[i] = r.rq[from + i];
    okI[i] = r.yi[from + i];
    okQ[i] = r.yq[from + i];
  }

  /* ---------- the S-curve ------------------------------------------------- */
  const sc = sCurve(algo === 'vv' ? 'dd' : algo, mod, ebn0Db);
  // normalised, because what is read here is the SHAPE and the period
  let peak = 0;
  for (let i = 0; i < sc.y.length; i++) peak = Math.max(peak, Math.abs(sc.y[i]));
  for (let i = 0; i < sc.y.length; i++) sc.y[i] /= peak || 1;
  // the M stable lock points: the zeros with positive slope
  const lockX = new Float64Array(M);
  const lockY = new Float64Array(M);
  for (let m = 0; m < M; m++) lockX[m] = wrap(-Math.PI + amb / 2 + m * amb + amb / 2);

  /* ---------- jitter against the loop bandwidth --------------------------- */
  // measured on the tail of the trajectory, with the loop re-run at each B_L·T
  const jx = new Float64Array(NJIT);
  const jy = new Float64Array(NJIT);
  const jth = new Float64Array(NJIT);
  const k = BITS_PER_SYMBOL[mod];
  const es = 10 ** (ebn0Db / 10) * k; // Es/N0
  for (let i = 0; i < NJIT; i++) {
    const b = 10 ** (-4 + (2.3 * i) / (NJIT - 1));
    jx[i] = b;
    // started AT the right phase, with no offset to acquire: what is measured
    // here is jitter, and a loop still crawling in from 35° would report its
    // acquisition transient instead — which at B_L·T = 1e-4 is most of the
    // record and turns the law upside down.
    const rr = run({ ...params, blt: b, algo: algo === 'vv' ? 'dd' : algo, dfreq: 0, phi0: 0 });
    let s = 0;
    let cnt = 0;
    for (let n = Math.floor(N / 2); n < N; n++) {
      const e = rr.est[n] - rr.truth[n];
      const w = e - amb * Math.round(e / amb);
      s += w * w;
      cnt++;
    }
    jy[i] = (Math.sqrt(s / cnt) * 180) / Math.PI;
    // σ²_φ = 1/(2ρ_L) with ρ_L = (Es/N0)/(2·B_L·T): the loop SNR, and the law
    // every loop-bandwidth choice in the field is made from
    jth[i] = (Math.sqrt(1 / (2 * (es / (2 * b)))) * 180) / Math.PI;
  }

  /* ---------- the numbers ------------------------------------------------- */
  const tail = Math.floor(N / 2);
  let rms = 0;
  for (let n = tail; n < N; n++) rms += ((err[n] * Math.PI) / 180) ** 2;
  rms = Math.sqrt(rms / (N - tail));
  let mean = 0;
  for (let n = tail; n < N; n++) mean += err[n];
  mean /= N - tail;

  return {
    observables: {
      received: { x: rxI, y: rxQ },
      corrected: { x: okI, y: okQ },
      ideal: { x: Float64Array.from(r.pts, (p) => p.x), y: Float64Array.from(r.pts, (p) => p.y) },

      phaseErr: { x: nn, y: err },
      ambHi: amb * (90 / Math.PI), // ±half an ambiguity slot, in degrees
      ambLo: -amb * (90 / Math.PI),
      zeroLine: 0,

      scurve: sc,
      lockPoints: { x: lockX, y: lockY },
      ambTick: amb,

      jitterMeas: { x: jx, y: jy },
      jitterTheory: { x: jx, y: jth },
      bltLine: blt,

      ambiguity: {
        value: (360 / M).toFixed(0) === '360' ? 360 : 360 / M,
        meta: { label: 'phase ambiguity 2π/M', unit: '°', precision: 0 },
      },
      rmsErr: { value: (rms * 180) / Math.PI, meta: { label: 'RMS phase error', unit: '°', precision: 2 } },
      biasErr: { value: mean, meta: { label: 'static error', unit: '°', precision: 3 } },
      loopOrder: {
        // The static error of a first-order loop is PROPORTIONAL to the
        // frequency offset — 2π·Δf/(K1·Kd), with Kd the detector's own slope,
        // which depends on the modulation and the SNR and is not worth
        // predicting. What IS worth checking is the proportionality, and that
        // a second-order loop has no static error at all: those two statements
        // need no gain and the harness pins both.
        value: algo === 'vv' ? 'feedforward — no loop, no static error' : `order ${order}`,
        meta: { label: 'loop' },
      },
      verdict: {
        value:
          algo === 'vv'
            ? `feedforward: one estimate per block of ${block}, no acquisition and no memory`
            : rms * (180 / Math.PI) < 5
              ? 'locked'
              : 'not locked — widen the loop or raise the SNR',
        meta: { label: 'state' },
      },
    },
  };
}
