// Channel coding, the honest way: BPSK with hard decision is a binary
// symmetric channel of crossover p = Q(√(2·R·γb)) — the rate R = k/n taxes
// the energy per transmitted bit (Ec = R·Eb). Two codes:
//   Hamming (7,4): parities p1=d1⊕d2⊕d4, p2=d1⊕d3⊕d4, p3=d2⊕d3⊕d4;
//                  syndrome decoding corrects any single error per block
//   répétition ×3: majority vote, R = 1/3 — famously NEVER beats uncoded
//                  BPSK in Eb/N0 terms with hard decision
// The post-decoding BER "theory" is EXACT: all 2ⁿ error patterns of a block
// are enumerated once (linear code → zero-codeword analysis), each decoded,
// and the message-error count is weighted by p^w(1−p)^(n−w).
// PURE, stateless, seeded — runs in a worker; deterministic at fixed seed.
import { mulberry32 } from '../../../core/rng.js';
import { normalCdf } from '../../../core/numeric.js';

const DB_GRID = Array.from({ length: 9 }, (_, i) => 1.5 * i); // 0…12 dB
const BLOCKS_CURVE = 3000; // blocks per Monte Carlo point of the BER curve
const SHOW_BLOCKS = 60; // blocks displayed in the frame view

const Q = (x) => 1 - normalCdf(x);

/** Hamming (7,4): block layout [d1 d2 d3 d4 p1 p2 p3]. */
const hamming74 = {
  n: 7,
  k: 4,
  decode(r) {
    const s1 = r[4] ^ r[0] ^ r[1] ^ r[3];
    const s2 = r[5] ^ r[0] ^ r[2] ^ r[3];
    const s3 = r[6] ^ r[1] ^ r[2] ^ r[3];
    // syndrome → flipped position (columns of H), 0-based; −1 = no error
    const pos = [-1, 4, 5, 0, 6, 1, 2, 3][s1 + 2 * s2 + 4 * s3];
    const out = r.slice(0, 4);
    if (pos >= 0 && pos < 4) out[pos] ^= 1;
    return out;
  },
};

/** Repetition ×3: one message bit per block, majority vote. */
const repetition3 = {
  n: 3,
  k: 1,
  decode(r) {
    return [r[0] + r[1] + r[2] >= 2 ? 1 : 0];
  },
};

/**
 * Exact enumeration of the 2ⁿ error patterns: message errors per pattern
 * (linear code → analyzed on the all-zero codeword) and per-weight average.
 */
function enumeratePatterns(code) {
  const { n, k } = code;
  const perPattern = new Float64Array(1 << n);
  const weight = new Uint8Array(1 << n);
  const betaSum = new Float64Array(n + 1);
  const betaCnt = new Float64Array(n + 1);
  for (let m = 0; m < 1 << n; m++) {
    const r = Array.from({ length: n }, (_, j) => (m >> j) & 1);
    let w = 0;
    for (let j = 0; j < n; j++) w += r[j];
    const out = code.decode(r);
    let errs = 0;
    for (let j = 0; j < k; j++) errs += out[j];
    perPattern[m] = errs;
    weight[m] = w;
    betaSum[w] += errs;
    betaCnt[w] += 1;
  }
  const beta = new Float64Array(n + 1);
  for (let w = 0; w <= n; w++) beta[w] = betaSum[w] / betaCnt[w];
  return { perPattern, weight, beta };
}

/** Exact post-decoding BER on a BSC(p), from the pattern enumeration. */
function berExact(code, enumr, p) {
  const { n, k } = code;
  let acc = 0;
  for (let m = 0; m < 1 << n; m++) {
    const w = enumr.weight[m];
    acc += enumr.perPattern[m] * p ** w * (1 - p) ** (n - w);
  }
  return acc / k;
}

/**
 * @param {{code: string, ebn0Db: number, Nbits: number, seed: number}} params
 * @returns {{observables: Object}}
 */
export function compute({ code: codeName, ebn0Db, Nbits, seed }) {
  const rng = mulberry32(seed);
  const code = codeName === 'hamming74' ? hamming74 : repetition3;
  const { n, k } = code;
  const R = k / n;
  const enumr = enumeratePatterns(code);

  const pOf = (gb, rate) => Q(Math.sqrt(2 * rate * gb));
  const gb = 10 ** (ebn0Db / 10);
  const p = pOf(gb, R);

  // Monte Carlo on the equivalent BSC: linear code → send the zero codeword
  const simulate = (nBlocks, pc, keep) => {
    let bitErr = 0;
    const r = new Array(n);
    for (let b = 0; b < nBlocks; b++) {
      let w = 0;
      for (let j = 0; j < n; j++) {
        r[j] = rng() < pc ? 1 : 0;
        if (r[j] && keep && b < SHOW_BLOCKS) keep.ch.push(b + 1, j + 1);
        w += r[j];
      }
      if (w === 0) continue; // no channel error → no decoding error
      const out = code.decode(r);
      for (let j = 0; j < k; j++) {
        if (out[j]) {
          bitErr++;
          if (keep && b < SHOW_BLOCKS) keep.res.push(b + 1, j + 1);
        }
      }
    }
    return bitErr;
  };

  // main run at the pill's Eb/N0
  const nBlocks = Math.max(1, Math.floor(Nbits / k));
  const keep = { ch: [], res: [] };
  const bitErr = simulate(nBlocks, p, keep);

  // uncoded baseline at the same Eb/N0 (same message-bit count)
  let uncodedErr = 0;
  const pU = pOf(gb, 1);
  for (let i = 0; i < Nbits; i++) if (rng() < pU) uncodedErr++;

  // BER vs Eb/N0: exact theory (fine grid) + Monte Carlo (dB grid)
  const NF = 49;
  const ft = new Float64Array(NF);
  const fyU = new Float64Array(NF);
  const fyC = new Float64Array(NF);
  for (let i = 0; i < NF; i++) {
    ft[i] = (12 * i) / (NF - 1);
    const g = 10 ** (ft[i] / 10);
    fyU[i] = pOf(g, 1);
    fyC[i] = berExact(code, enumr, pOf(g, R));
  }
  const mx = new Float64Array(DB_GRID.length);
  const my = new Float64Array(DB_GRID.length);
  for (let g = 0; g < DB_GRID.length; g++) {
    mx[g] = DB_GRID[g];
    my[g] =
      simulate(BLOCKS_CURVE, pOf(10 ** (DB_GRID[g] / 10), R), null) / (BLOCKS_CURVE * k);
  }

  const toSeries = (arr) => {
    const m = arr.length / 2;
    const x = new Float64Array(m);
    const y = new Float64Array(m);
    for (let i = 0; i < m; i++) {
      x[i] = arr[2 * i];
      y[i] = arr[2 * i + 1];
    }
    return { x, y };
  };

  return {
    observables: {
      channelErrors: toSeries(keep.ch),
      residualErrors: toSeries(keep.res),
      berUncodedTh: { x: ft, y: fyU },
      berCodedTh: { x: ft, y: fyC },
      berCodedMc: { x: mx, y: my },
      betaByWeight: {
        x: Float64Array.from({ length: n + 1 }, (_, w) => w),
        y: enumr.beta,
      },
      pCh: { value: p, meta: { label: 'BER canal', precision: 4 } },
      berOut: {
        value: bitErr / (nBlocks * k),
        meta: { label: 'BER décodé', precision: 5 },
      },
      berOutTh: {
        value: berExact(code, enumr, p),
        meta: { label: 'théorie exacte', precision: 5 },
      },
      berUncoded: {
        value: uncodedErr / Nbits,
        meta: { label: 'BER sans codage', precision: 5 },
      },
    },
  };
}
