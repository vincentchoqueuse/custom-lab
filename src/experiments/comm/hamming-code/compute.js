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
import { qfunc, dbToLin, pairsToSeries } from '../../../core/numeric.js';
import { hamming74, repetition3, enumerateHard, berHardExact } from '../../../core/codes.js';

const DB_GRID = Array.from({ length: 9 }, (_, i) => 1.5 * i); // 0…12 dB
const BLOCKS_CURVE = 3000; // blocks per Monte Carlo point of the BER curve
const SHOW_BLOCKS = 60; // blocks displayed in the frame view


/**
 * @param {{code: string, ebn0Db: number, Nbits: number, seed: number}} params
 * @returns {{observables: Object}}
 */
export function compute({ code: codeName, ebn0Db, Nbits, seed }) {
  const rng = mulberry32(seed);
  const code = codeName === 'hamming74' ? hamming74 : repetition3;
  const { n, k } = code;
  const R = k / n;
  const enumr = enumerateHard(code);

  const pOf = (gb, rate) => qfunc(Math.sqrt(2 * rate * gb));
  const gb = dbToLin(ebn0Db);
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
      const out = code.decodeHard(r);
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
    const g = dbToLin(ft[i]);
    fyU[i] = pOf(g, 1);
    fyC[i] = berHardExact(code, enumr, pOf(g, R));
  }
  const mx = new Float64Array(DB_GRID.length);
  const my = new Float64Array(DB_GRID.length);
  for (let g = 0; g < DB_GRID.length; g++) {
    mx[g] = DB_GRID[g];
    my[g] =
      simulate(BLOCKS_CURVE, pOf(dbToLin(DB_GRID[g]), R), null) / (BLOCKS_CURVE * k);
  }


  return {
    observables: {
      channelErrors: pairsToSeries(keep.ch),
      residualErrors: pairsToSeries(keep.res),
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
        value: berHardExact(code, enumr, p),
        meta: { label: 'théorie exacte', precision: 5 },
      },
      berUncoded: {
        value: uncodedErr / Nbits,
        meta: { label: 'BER sans codage', precision: 5 },
      },
    },
  };
}
