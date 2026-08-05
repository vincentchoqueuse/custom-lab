// A 2×2 MIMO link, and the three ways to undo it.
//
//   y = H x + n,   x = (x₁, x₂) drawn from a unit-energy constellation,
//                  n complex circular, E|nᵢ|² = N₀,  γ = Es/N₀
//
// Two symbols are sent AT THE SAME TIME on the same frequency, and each of the
// two antennas receives a mixture of both. Nothing is lost — there are two
// equations and two unknowns — but "solvable" and "solvable without paying for
// it" are different statements, and the whole experiment is that difference.
//
// THE CHANNEL IS BUILT SO THE PRICE HAS A CLOSED FORM. H = U·T with
//
//   T = [[1, ρ], [0, √(1−ρ²)]]        U a random 2×2 unitary
//
// U is unitary, so HᴴH = TᵀT = [[1, ρ], [ρ, 1]] EXACTLY, whatever the draw —
// the rotation mixes the antennas without touching the geometry that matters.
// Two consequences the room can check by hand:
//
//   [(HᴴH)⁻¹]ᵢᵢ = 1/(1−ρ²)      →  ZF effective SNR = γ·(1−ρ²)
//   κ(H) = √((1+ρ)/(1−ρ))
//
// So the loss of the zero-forcing receiver is exactly −10·log10(1−ρ²) dB, on
// both streams: 0 dB at ρ = 0, 7.2 dB at ρ = 0.9. And at ρ = 0 the two streams
// are two INDEPENDENT AWGN channels at the full SNR — the experiment next door,
// `comm/constellations`, twice over. That is the parallel this experiment is
// for, and it is an identity rather than a resemblance.
//
// The three receivers:
//   ZF    x̂ = H⁻¹y — kills the interference exactly, and amplifies the noise
//         by 1/(1−ρ²). Bias-free, and blind to the noise it is enhancing.
//   MMSE  x̂ = (HᴴH + N₀I)⁻¹Hᴴy — trades a little interference for less noise.
//         Biased; tends to ZF as γ → ∞ and to a matched filter as γ → 0.
//   ML    argmin over the M² hypotheses of ‖y − Hx‖² — optimal, and it never
//         leaves the received space: there IS no equalized constellation for
//         it, which is why it lives on the antenna view and not the stream one.
//
// PURE, stateless, seeded — runs in a worker; deterministic at fixed seed.
import { mulberry32, gaussFrom } from '../../../core/rng.js';
import { dbToLin, pairsToSeries } from '../../../core/numeric.js';
import { constellation, serTheory } from '../_lib/modulation.js';

const DB_GRID = Array.from({ length: 11 }, (_, i) => 2 * i); // 0…20 dB
const N_CURVE = 1500; // symbol pairs per Monte-Carlo point of the SER curve
const MAX_CLOUD = 1200; // points kept for display

/* ---------- 2×2 complex linear algebra, written out ---------------------- */
// Four numbers each; a generic solver would hide the one identity that matters,
// which is that the inverse of a 2×2 is a division by its determinant.

/** H = U·T: a random unitary times the correlation triangle. */
export function channel(rho, rng) {
  const s = Math.sqrt(Math.max(1 - rho * rho, 0));
  // U: rotation by θ and a phase on the second column — unitary for any θ, φ
  const th = 2 * Math.PI * rng();
  const ph = 2 * Math.PI * rng();
  const c = Math.cos(th);
  const sn = Math.sin(th);
  const cp = Math.cos(ph);
  const sp = Math.sin(ph);
  // U = [[c, −sn·e^{jφ}], [sn, c·e^{jφ}]]
  const Ur = [c, -sn * cp, sn, c * cp];
  const Ui = [0, -sn * sp, 0, c * sp];
  // T = [[1, ρ], [0, s]] (real)
  const Tr = [1, rho, 0, s];
  // H = U·T
  const Hr = [
    Ur[0] * Tr[0],
    Ur[0] * Tr[1] + Ur[1] * Tr[3],
    Ur[2] * Tr[0],
    Ur[2] * Tr[1] + Ur[3] * Tr[3],
  ];
  const Hi = [
    Ui[0] * Tr[0],
    Ui[0] * Tr[1] + Ui[1] * Tr[3],
    Ui[2] * Tr[0],
    Ui[2] * Tr[1] + Ui[3] * Tr[3],
  ];
  return { re: Hr, im: Hi };
}

/** Gram matrix HᴴH of a 2×2, as {re, im} in row-major order. */
export function gram(H) {
  const [a, b, c, d] = H.re;
  const [ai, bi, ci, di] = H.im;
  // (HᴴH)_{jk} = Σ_i conj(H_ij)·H_ik — the columns of H, each as (re, im) of
  // its two entries
  const col = [
    [a, ai, c, ci], // column 0: (H_00, H_10)
    [b, bi, d, di], // column 1
  ];
  const dot = (u, v) => {
    // ⟨u, v⟩ = conj(u)·v, summed over the two rows
    const re = u[0] * v[0] + u[1] * v[1] + u[2] * v[2] + u[3] * v[3];
    const im = u[0] * v[1] - u[1] * v[0] + u[2] * v[3] - u[3] * v[2];
    return [re, im];
  };
  const g00 = dot(col[0], col[0]);
  const g01 = dot(col[0], col[1]);
  const g11 = dot(col[1], col[1]);
  return { re: [g00[0], g01[0], g01[0], g11[0]], im: [g00[1], g01[1], -g01[1], g11[1]] };
}

/** Inverse of a 2×2 complex matrix, by the determinant. */
export function inv2(M) {
  const [a, b, c, d] = M.re;
  const [ai, bi, ci, di] = M.im;
  // det = ad − bc, complex
  const detr = a * d - ai * di - (b * c - bi * ci);
  const deti = a * di + ai * d - (b * ci + bi * c);
  const n = detr * detr + deti * deti;
  const div = (xr, xi) => [(xr * detr + xi * deti) / n, (xi * detr - xr * deti) / n];
  const [p, pi] = div(d, di);
  const [q, qi] = div(-b, -bi);
  const [r, ri] = div(-c, -ci);
  const [s, si] = div(a, ai);
  return { re: [p, q, r, s], im: [pi, qi, ri, si] };
}

/** M·v for a 2×2 complex matrix and a 2-vector. */
function apply(M, vr, vi) {
  const [a, b, c, d] = M.re;
  const [ai, bi, ci, di] = M.im;
  return [
    a * vr[0] - ai * vi[0] + b * vr[1] - bi * vi[1],
    a * vi[0] + ai * vr[0] + b * vi[1] + bi * vr[1],
    c * vr[0] - ci * vi[0] + d * vr[1] - di * vi[1],
    c * vi[0] + ci * vr[0] + d * vi[1] + di * vr[1],
  ];
}

/** The linear receiver's matrix. ZF is MMSE at N₀ = 0, and the code says so. */
export function receiver(H, n0) {
  const G = gram(H);
  const R = { re: [...G.re], im: [...G.im] };
  R.re[0] += n0;
  R.re[3] += n0;
  const Ri = inv2(R);
  // W = (HᴴH + N₀I)⁻¹·Hᴴ
  const Hh = { re: [H.re[0], H.re[2], H.re[1], H.re[3]], im: [-H.im[0], -H.im[2], -H.im[1], -H.im[3]] };
  const mul = (A, B) => {
    const out = { re: new Array(4), im: new Array(4) };
    for (let i = 0; i < 2; i++)
      for (let j = 0; j < 2; j++) {
        let re = 0;
        let im = 0;
        for (let k = 0; k < 2; k++) {
          const ar = A.re[i * 2 + k];
          const aim = A.im[i * 2 + k];
          const br = B.re[k * 2 + j];
          const bim = B.im[k * 2 + j];
          re += ar * br - aim * bim;
          im += ar * bim + aim * br;
        }
        out.re[i * 2 + j] = re;
        out.im[i * 2 + j] = im;
      }
    return out;
  };
  return mul(Ri, Hh);
}

/** Nearest point of the constellation, and its index. */
function decide(pts, xr, xi) {
  let best = 0;
  let bd = Infinity;
  for (let k = 0; k < pts.length; k++) {
    const d = (pts[k].x - xr) ** 2 + (pts[k].y - xi) ** 2;
    if (d < bd) {
      bd = d;
      best = k;
    }
  }
  return best;
}

/**
 * One Monte-Carlo run at linear SNR γ. Returns the symbol-error counts of the
 * three receivers, and — when asked — the clouds to draw.
 */
export function run(pts, H, n0, n, rng, gauss, keep) {
  const W = { zf: receiver(H, 0), mmse: receiver(H, n0) };
  // THE MMSE BIAS, removed. (W·H)ᵢᵢ is the gain the receiver applies to its own
  // stream, and for MMSE it is strictly below 1: the estimate is shrunk toward
  // the origin, which is what minimising a mean SQUARE does. Left in place it
  // pushes points across decision boundaries and makes MMSE score WORSE than ZF
  // on a 16-QAM — a real effect, and an artefact of slicing a biased estimate
  // rather than a property of the method. Every textbook receiver divides it
  // out before deciding, and so does this one.
  const gains = {};
  for (const name of ['zf', 'mmse']) {
    const g = [];
    for (let i = 0; i < 2; i++) {
      let re = 0;
      let im = 0;
      for (let k = 0; k < 2; k++) {
        const ar = W[name].re[i * 2 + k];
        const ai = W[name].im[i * 2 + k];
        const br = H.re[k * 2 + i];
        const bi = H.im[k * 2 + i];
        re += ar * br - ai * bi;
        im += ar * bi + ai * br;
      }
      g.push([re, im]);
    }
    gains[name] = g;
  }
  const unbias = (g, xr, xi) => {
    const n2 = g[0] * g[0] + g[1] * g[1] || 1;
    return [(xr * g[0] + xi * g[1]) / n2, (xi * g[0] - xr * g[1]) / n2];
  };
  const sig = Math.sqrt(n0 / 2); // per dimension
  const M = pts.length;
  const err = { zf: 0, mmse: 0, ml: 0 };
  const out = keep
    ? { y1: [], y2: [], mlOk: [], zf1: [], zf2: [], mmse1: [], mmse2: [] }
    : null;

  // THE LATTICE: the M² noiseless received vectors, H·x for every hypothesis.
  // It does not depend on the symbol, so it is built ONCE — written the obvious
  // way, the detector rebuilt all sixteen of them for every symbol it decided,
  // which is the whole cost of the experiment and none of its meaning.
  const K = M * M;
  const lat = new Float64Array(4 * K); // (y₁re, y₁im, y₂re, y₂im) per hypothesis
  const latA = new Int32Array(K);
  const latB = new Int32Array(K);
  for (let a = 0, k = 0; a < M; a++)
    for (let b = 0; b < M; b++, k++) {
      const v = apply(H, [pts[a].x, pts[b].x], [pts[a].y, pts[b].y]);
      lat[4 * k] = v[0];
      lat[4 * k + 1] = v[1];
      lat[4 * k + 2] = v[2];
      lat[4 * k + 3] = v[3];
      latA[k] = a;
      latB[k] = b;
    }

  for (let t = 0; t < n; t++) {
    const a = Math.floor(rng() * M) % M;
    const b = Math.floor(rng() * M) % M;
    const xr = [pts[a].x, pts[b].x];
    const xi = [pts[a].y, pts[b].y];
    const v = apply(H, xr, xi);
    const yr = [v[0] + sig * gauss(), v[2] + sig * gauss()];
    const yi = [v[1] + sig * gauss(), v[3] + sig * gauss()];

    // the two linear receivers
    for (const name of ['zf', 'mmse']) {
      const raw = apply(W[name], yr, yi);
      const u1 = unbias(gains[name][0], raw[0], raw[1]);
      const u2 = unbias(gains[name][1], raw[2], raw[3]);
      const e = [u1[0], u1[1], u2[0], u2[1]];
      const d1 = decide(pts, e[0], e[1]);
      const d2 = decide(pts, e[2], e[3]);
      if (d1 !== a) err[name]++;
      if (d2 !== b) err[name]++;
      if (keep && out[`${name}1`].length < MAX_CLOUD) {
        out[`${name}1`].push([e[0], e[1]]);
        out[`${name}2`].push([e[2], e[3]]);
      }
    }

    // ML: the nearest lattice point, in the RECEIVED space. No inversion, no
    // equalized constellation — a distance to M² candidates, and that is the
    // whole algorithm.
    let best = 0;
    let bd = Infinity;
    for (let k = 0; k < K; k++) {
      const d =
        (yr[0] - lat[4 * k]) ** 2 +
        (yi[0] - lat[4 * k + 1]) ** 2 +
        (yr[1] - lat[4 * k + 2]) ** 2 +
        (yi[1] - lat[4 * k + 3]) ** 2;
      if (d < bd) {
        bd = d;
        best = k;
      }
    }
    const bi = latA[best];
    const bj = latB[best];
    if (bi !== a) err.ml++;
    if (bj !== b) err.ml++;

    if (keep && out.y1.length < MAX_CLOUD) {
      out.y1.push([yr[0], yi[0]]);
      out.y2.push([yr[1], yi[1]]);
      out.mlOk.push(bi === a && bj === b);
    }
  }
  return { err, n: 2 * n, out, lat, K };
}

/**
 * @param {{mod: string, rho: number, snr: number, N: number, eq: string,
 *          seed: number}} params
 */
export function compute({ mod, rho, snr, N, eq, seed }) {
  const rng = mulberry32(seed);
  const gauss = gaussFrom(rng);
  const pts = constellation(mod);
  const H = channel(rho, rng);
  const gamma = dbToLin(snr);
  const n0 = 1 / gamma;

  const r = run(pts, H, n0, N, rng, gauss, true);

  /* ---------- the closed forms this channel was built to have ------------- */
  const G = gram(H);
  const one = 1 - rho * rho;
  const zfLossDb = -10 * Math.log10(Math.max(one, 1e-300));
  const kappa = Math.sqrt((1 + Math.abs(rho)) / Math.max(1 - Math.abs(rho), 1e-300));
  // the effective SNR the zero-forcing streams actually see
  const gammaZf = gamma * one;

  /* ---------- SER against SNR, the three receivers and the AWGN line ------ */
  const curve = { zf: [], mmse: [], ml: [] };
  const awgn = [];
  const zfTheory = [];
  for (const db of DB_GRID) {
    const g = dbToLin(db);
    const c = run(pts, H, 1 / g, N_CURVE, rng, gauss, false);
    // pairsToSeries takes a FLAT [x₀, y₀, x₁, y₁, …]; pushing pairs instead
    // silently produced a curve of NaN that the determinism check happily
    // called reproducible.
    //
    // NaN where the Monte Carlo counted NO errors, so the measured curve STOPS
    // instead of diving to an invented floor. A simulation of n symbols cannot
    // speak below 1/n, and drawing a cliff there says something about the
    // sample size while looking like something about the receiver.
    for (const k of ['zf', 'mmse', 'ml'])
      curve[k].push(db, c.err[k] > 0 ? c.err[k] / c.n : NaN);
    // THE PARALLEL: the single-antenna AWGN curve of comm/constellations, and
    // the same formula evaluated at the DEGRADED SNR the zero-forcer leaves.
    awgn.push(db, Math.max(serTheory(mod, g), 1e-6));
    zfTheory.push(db, Math.max(serTheory(mod, g * one), 1e-6));
  }

  const ser = (k) => r.err[k] / r.n;
  const cloud = (a) => ({
    x: Float64Array.from(a, (p) => p[0]),
    y: Float64Array.from(a, (p) => p[1]),
  });
  const st = eq === 'zf' ? 'zf' : 'mmse';

  return {
    observables: {
      /* --- what the two antennas receive: two mixtures, and ML's lattice --- */
      rx1: cloud(r.out.y1),
      rx2: cloud(r.out.y2),
      // the lattice as ANTENNA 1 sees it: the M² points ML matches against
      lattice1: {
        x: Float64Array.from({ length: r.K }, (_, k) => r.lat[4 * k]),
        y: Float64Array.from({ length: r.K }, (_, k) => r.lat[4 * k + 1]),
      },

      /* --- and what a LINEAR receiver makes of them --- */
      eq1: cloud(r.out[`${st}1`]),
      eq2: cloud(r.out[`${st}2`]),
      ideal: {
        x: Float64Array.from(pts, (p) => p.x),
        y: Float64Array.from(pts, (p) => p.y),
      },

      serZf: pairsToSeries(curve.zf),
      serMmse: pairsToSeries(curve.mmse),
      serMl: pairsToSeries(curve.ml),
      serAwgn: pairsToSeries(awgn),
      serZfTheory: pairsToSeries(zfTheory),

      // exposed for the harness: the invariant the whole design rests on
      gramRe: Float64Array.from(G.re),
      gramIm: Float64Array.from(G.im),
      gammaZf,

      kappa: { value: kappa, meta: { label: 'κ(H)', precision: 2 } },
      loss: { value: zfLossDb, meta: { label: 'ZF loss', unit: 'dB', precision: 2 } },
      serMlS: { value: ser('ml'), meta: { label: 'SER ML', precision: 4 } },
      serMmseS: { value: ser('mmse'), meta: { label: 'MMSE', precision: 4 } },
      serZfS: { value: ser('zf'), meta: { label: 'ZF', precision: 4 } },
    },
  };
}

export { DB_GRID, N_CURVE };
