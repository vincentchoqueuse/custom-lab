// THE AWGN LINK, END TO END: random bits → mapping (Gray or natural binary) →
// unit-energy constellation → complex AWGN → nearest-neighbour (ML) decision →
// demapping → bit errors.
//
// One experiment rather than two, because "constellations in noise" and "the
// BER chain" were the same simulation asked two questions. Splitting them cost
// a listener the one step that matters: a symbol error and a bit error are not
// the same event, and how far apart they are is decided by the MAPPING.
//
// Energy accounting, which is the other reason they belong together: Es = 1 =
// k·Eb with k = log2(M), so γs = k·γb and σ² = 1/(2γs) per dimension. A
// modulation comparison at equal Es/N₀ flatters the dense constellations; at
// equal Eb/N₀ it is honest, and that is the abscissa here.
//
// Closed forms (exact for BPSK/QPSK, tight approximations above):
//   SER   BPSK:   Q(√(2γs))            Gray BER  BPSK, QPSK:  Q(√(2γb))
//         QPSK:   2p − p², p = Q(√γs)            8-PSK:   (2/3)·Q(√(6γb)·sin(π/8))
//         8-PSK:  ≈ 2·Q(√(2γs)·sin(π/8))         16-QAM:  (3/4)·Q(√(0.8γb))
//         16-QAM: 1 − (1−p)², p = 1.5·Q(√(γs/5))
// With natural mapping no clean closed form exists — the Monte Carlo points
// detaching from the Gray theory curve ARE the lesson.
// PURE, stateless, seeded — runs in a worker; deterministic at fixed seed.
import { mulberry32, gaussFrom } from '../../../core/rng.js';
import { dbToLin, pairsToSeries } from '../../../core/numeric.js';
import { constellationMap, serTheory, berTheoryGray } from '../_lib/modulation.js';

const DB_GRID = Array.from({ length: 8 }, (_, i) => 2 * i); // 0…14 dB
const SYM_CURVE = 4000; // symbols per Monte Carlo point of the curves
// How many symbols the time figure shows. A stem plot is read one stalk at a
// time, so the count is set by the eye and not by the simulation: past ~30 the
// stalks touch and the picture stops being a signal and starts being a comb.
const N_TRACE = 24;

const popcount = (v) => {
  let c = 0;
  for (let x = v; x > 0; x >>= 1) c += x & 1;
  return c;
};

/** Exact ML decision boundaries as segments, drawn on the plane. */
export function boundaries(mod, ext) {
  if (mod === 'bpsk') return [{ x1: 0, y1: -ext, x2: 0, y2: ext }];
  if (mod === 'qpsk')
    return [
      { x1: 0, y1: -ext, x2: 0, y2: ext },
      { x1: -ext, y1: 0, x2: ext, y2: 0 },
    ];
  if (mod === '8psk') {
    return Array.from({ length: 8 }, (_, k) => {
      const a = Math.PI / 8 + (k * Math.PI) / 4;
      return { x1: 0, y1: 0, x2: ext * Math.cos(a), y2: ext * Math.sin(a) };
    });
  }
  const t = 2 / Math.sqrt(10); // 16-QAM thresholds at ±2/√10 and 0
  const segs = [];
  for (const v of [-t, 0, t]) {
    segs.push({ x1: v, y1: -ext, x2: v, y2: ext });
    segs.push({ x1: -ext, y1: v, x2: ext, y2: v });
  }
  return segs;
}

/**
 * Simulate n symbols at γb. Counts SYMBOL errors and BIT errors — the same run
 * answers both, which is the point: they are two readings of one event, not
 * two experiments.
 */
function simulate(map, n, gb, rng, gauss, keep, trace) {
  const { pts, pattern, k } = map;
  const sigma = Math.sqrt(1 / (2 * k * gb));
  let symErr = 0;
  let bitErr = 0;
  for (let i = 0; i < n; i++) {
    const s = Math.floor(rng() * pts.length);
    const rx = pts[s].x + sigma * gauss();
    const ry = pts[s].y + sigma * gauss();
    if (trace && i < trace.txI.length) {
      trace.txI[i] = pts[s].x;
      trace.txQ[i] = pts[s].y;
      trace.rxI[i] = rx;
      trace.rxQ[i] = ry;
    }
    let best = 0;
    let dBest = Infinity;
    for (let c = 0; c < pts.length; c++) {
      const d = (rx - pts[c].x) ** 2 + (ry - pts[c].y) ** 2;
      if (d < dBest) {
        dBest = d;
        best = c;
      }
    }
    // the cloud is split by what the symbol error COST in bits, which is the
    // whole visible difference between a Gray mapping and a natural one
    const nb = popcount(pattern[s] ^ pattern[best]);
    if (best !== s) symErr++;
    bitErr += nb;
    if (keep) (nb === 0 ? keep.ok : nb === 1 ? keep.e1 : keep.e2).push(rx, ry);
  }
  return { symErr, bitErr };
}

/**
 * @param {{mod: string, mapping: string, ebn0Db: number, N: number,
 *          seed: number}} params
 * @returns {{observables: Object}}
 */
export function compute({ mod, mapping, ebn0Db, N, seed }) {
  const rng = mulberry32(seed);
  const gauss = gaussFrom(rng);
  const map = constellationMap(mod, mapping);
  const gb = dbToLin(ebn0Db);
  const k = map.k;

  // main run at the pill's Eb/N0, plus the first N_TRACE symbols in ORDER for
  // the time figure — the cloud has no time in it
  const keep = { ok: [], e1: [], e2: [] };
  const nT = Math.min(N_TRACE, N);
  const trace = {
    txI: new Float64Array(nT),
    txQ: new Float64Array(nT),
    rxI: new Float64Array(nT),
    rxQ: new Float64Array(nT),
  };
  const { symErr, bitErr } = simulate(map, N, gb, rng, gauss, keep, trace);
  const idx = Float64Array.from({ length: nT }, (_, i) => i);

  // The waterfall, on ONE abscissa: theory on a fine grid, Monte Carlo on the
  // dB grid, symbols and bits together. Reading them apart is what the
  // experiment is for — at high SNR and Gray mapping the two curves are a
  // factor k apart and nothing else, because a symbol error then costs one bit.
  const ft = new Float64Array(57);
  const fber = new Float64Array(57);
  const fser = new Float64Array(57);
  for (let i = 0; i < 57; i++) {
    ft[i] = (14 * i) / 56;
    const g = dbToLin(ft[i]);
    fber[i] = berTheoryGray(mod, g);
    fser[i] = serTheory(mod, k * g); // γs = k·γb
  }
  const mx = new Float64Array(DB_GRID.length);
  const mber = new Float64Array(DB_GRID.length);
  const mser = new Float64Array(DB_GRID.length);
  for (let g = 0; g < DB_GRID.length; g++) {
    const r = simulate(map, SYM_CURVE, dbToLin(DB_GRID[g]), rng, gauss, null, null);
    mx[g] = DB_GRID[g];
    mber[g] = r.bitErr / (SYM_CURVE * k);
    mser[g] = r.symErr / SYM_CURVE;
  }

  const bitsOf = (v) => v.toString(2).padStart(k, '0');

  return {
    observables: {
      /* --- the signal in time: two real signals, before any picture of them --- */
      txI: { x: idx, y: trace.txI },
      txQ: { x: idx, y: trace.txQ },
      rxI: { x: idx, y: trace.rxI },
      rxQ: { x: idx, y: trace.rxQ },

      /* --- the plane: what arrived, what it cost, and where the lines are --- */
      rxOk: pairsToSeries(keep.ok),
      rxErr1: pairsToSeries(keep.e1),
      rxErrMulti: pairsToSeries(keep.e2),
      idealPoints: {
        x: Float64Array.from(map.pts, (p) => p.x),
        y: Float64Array.from(map.pts, (p) => p.y),
      },
      bitLabels: map.pattern.map(bitsOf),
      boundaries: boundaries(mod, 3),

      /* --- the waterfall: symbols and bits on one honest abscissa --- */
      berTheoryCurve: { x: ft, y: fber },
      berEmpCurve: { x: mx, y: mber },
      serTheoryCurve: { x: ft, y: fser },
      serEmpCurve: { x: mx, y: mser },

      /* --- the readings --- */
      berEmp: { value: bitErr / (N * k), meta: { label: 'BER', precision: 4 } },
      berTh: {
        value: berTheoryGray(mod, gb),
        meta: { label: 'BER theory (Gray)', precision: 4 },
      },
      serEmp: { value: symErr / N, meta: { label: 'SER', precision: 4 } },
      serTh: {
        value: serTheory(mod, k * gb),
        meta: { label: 'SER theory', precision: 4 },
      },
      nErrors: { value: symErr, meta: { label: 'symbol errors', precision: 0 } },
    },
  };
}
