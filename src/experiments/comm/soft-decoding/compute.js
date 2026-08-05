// Soft versus hard decoding, paired on the SAME noise: BPSK over AWGN with
// the rate tax (γc = R·γb per coded bit), each block decoded twice —
//   hard:  threshold each sample, then syndrome / majority (_lib/codes.js)
//   soft:  ML over the 2ᵏ codewords, argmax of the correlation Σ yᵢ(1−2cᵢ)
// The hard curve is the exact enumeration; the soft reference is the union
// bound Pb ≲ Σ_{c≠0} (w_msg/k)·Q(√(2γc·w(c))), tight at high SNR.
// Two famous results live here: soft repetition ×3 recovers ALL the rate
// loss (averaging = matched filter → exactly the uncoded BER), and soft
// Hamming buys ≈ 2 dB over hard for free.
// PURE, stateless, seeded — runs in a worker; deterministic at fixed seed.
import { mulberry32, gaussFrom } from '../../../core/rng.js';
import { qfunc, dbToLin, pairsToSeries } from '../../../core/numeric.js';
import {
  hamming74,
  repetition3,
  codewordTable,
  enumerateHard,
  berHardExact,
} from '../_lib/codes.js';

const DB_GRID = Array.from({ length: 9 }, (_, i) => i); // 0…8 dB
const BLOCKS_CURVE = 4000; // blocks per Monte Carlo point of the BER curve
const SHOW_BLOCKS = 60; // blocks displayed in the frame view


/**
 * @param {{code: string, ebn0Db: number, Nbits: number, seed: number}} params
 * @returns {{observables: Object}}
 */
export function compute({ code: codeName, ebn0Db, Nbits, seed }) {
  const rng = mulberry32(seed);
  const gauss = gaussFrom(rng);
  const code = codeName === 'hamming74' ? hamming74 : repetition3;
  const { n, k } = code;
  const R = k / n;
  const table = codewordTable(code);
  const enumr = enumerateHard(code);
  // BPSK signs of every codeword, precomputed once
  const signs = table.map((c) => c.cw.map((b) => 1 - 2 * b));

  const gb = dbToLin(ebn0Db);
  const sigmaOf = (g) => Math.sqrt(1 / (2 * R * g));

  // one block on the all-zero codeword (linear code + ML → representative):
  // received yᵢ = +1 + noise, decoded both ways on the SAME samples
  const y = new Float64Array(n);
  const simulate = (nBlocks, sigma, keep) => {
    let hardErr = 0;
    let softErr = 0;
    const r = new Array(n);
    for (let b = 0; b < nBlocks; b++) {
      for (let j = 0; j < n; j++) {
        y[j] = 1 + sigma * gauss();
        r[j] = y[j] < 0 ? 1 : 0;
        if (r[j] && keep && b < SHOW_BLOCKS) keep.ch.push(b + 1, j + 1);
      }
      const outH = code.decodeHard(r);
      for (let j = 0; j < k; j++) {
        if (outH[j]) {
          hardErr++;
          if (keep && b < SHOW_BLOCKS) keep.hard.push(b + 1, j + 1);
        }
      }
      let best = 0;
      let cBest = -Infinity;
      for (let c = 0; c < signs.length; c++) {
        let corr = 0;
        for (let j = 0; j < n; j++) corr += y[j] * signs[c][j];
        if (corr > cBest) {
          cBest = corr;
          best = c;
        }
      }
      for (let j = 0; j < k; j++) {
        if (table[best].msg[j]) {
          softErr++;
          if (keep && b < SHOW_BLOCKS) keep.soft.push(b + 1, j + 1);
        }
      }
    }
    return { hardErr, softErr };
  };

  // main run at the pill's Eb/N0
  const nBlocks = Math.max(1, Math.floor(Nbits / k));
  const keep = { ch: [], hard: [], soft: [] };
  const main = simulate(nBlocks, sigmaOf(gb), keep);

  // curves: uncoded + exact hard (fine grid), union bound soft, MC soft
  const NF = 49;
  const ft = new Float64Array(NF);
  const fyU = new Float64Array(NF);
  const fyH = new Float64Array(NF);
  const fyS = new Float64Array(NF);
  for (let i = 0; i < NF; i++) {
    ft[i] = (8 * i) / (NF - 1);
    const g = dbToLin(ft[i]);
    fyU[i] = qfunc(Math.sqrt(2 * g));
    fyH[i] = berHardExact(code, enumr, qfunc(Math.sqrt(2 * R * g)));
    let ub = 0;
    for (const { msg, cw } of table) {
      const w = cw.reduce((a, b) => a + b, 0);
      if (w === 0) continue;
      const wm = msg.reduce((a, b) => a + b, 0);
      ub += (wm / k) * qfunc(Math.sqrt(2 * R * g * w));
    }
    fyS[i] = ub;
  }
  const mx = new Float64Array(DB_GRID.length);
  const my = new Float64Array(DB_GRID.length);
  for (let g = 0; g < DB_GRID.length; g++) {
    mx[g] = DB_GRID[g];
    my[g] =
      simulate(BLOCKS_CURVE, sigmaOf(dbToLin(DB_GRID[g])), null).softErr /
      (BLOCKS_CURVE * k);
  }


  return {
    observables: {
      channelErrors: pairsToSeries(keep.ch),
      hardResidual: pairsToSeries(keep.hard),
      softResidual: pairsToSeries(keep.soft),
      berUncodedTh: { x: ft, y: fyU },
      berHardTh: { x: ft, y: fyH },
      berSoftUb: { x: ft, y: fyS },
      berSoftMc: { x: mx, y: my },
      berHard: {
        value: main.hardErr / (nBlocks * k),
        meta: { label: 'hard-decision BER', precision: 5 },
      },
      berSoft: {
        value: main.softErr / (nBlocks * k),
        meta: { label: 'soft-decision BER', precision: 5 },
      },
      pCh: {
        value: qfunc(Math.sqrt(2 * R * gb)),
        meta: { label: 'channel p', precision: 4 },
      },
    },
  };
}
