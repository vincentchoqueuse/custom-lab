// The full BER chain: random bits → mapping (Gray or natural binary) →
// unit-energy constellation → complex AWGN → nearest-neighbor decision →
// demapping → bit errors. Energy accounting: Es = 1 = k·Eb with
// k = log2(M), so γs = k·γb and σ² = 1/(2γs) per dimension.
// Gray-mapping BER references (tight approximations, exact for BPSK/QPSK):
//   BPSK, QPSK:  Q(√(2γb))
//   8-PSK:       (2/3)·Q(√(6γb)·sin(π/8))
//   16-QAM:      (3/4)·Q(√(0.8·γb))
// With natural mapping no clean closed form exists — the Monte Carlo points
// detaching from the Gray theory curve ARE the lesson.
// PURE, stateless, seeded — runs in a worker; deterministic at fixed seed.
import { mulberry32, gaussFrom } from '../../../core/rng.js';
import { normalCdf } from '../../../core/numeric.js';

const DB_GRID = Array.from({ length: 8 }, (_, i) => 2 * i); // 0…14 dB
const SYM_CURVE = 4000; // symbols per Monte Carlo point of the BER curve

const Q = (x) => 1 - normalCdf(x);
const gray = (i) => i ^ (i >> 1);
const popcount = (v) => {
  let c = 0;
  for (let x = v; x > 0; x >>= 1) c += x & 1;
  return c;
};

/**
 * Constellation with its bit mapping: points (unit average energy), the bit
 * pattern carried by each point, and the bits-per-symbol count k.
 */
function makeMap(mod, mapping) {
  const g = mapping === 'gray';
  if (mod === 'bpsk') {
    return { pts: [{ x: -1, y: 0 }, { x: 1, y: 0 }], pattern: [0, 1], k: 1 };
  }
  if (mod === 'qpsk' || mod === '8psk') {
    const m = mod === 'qpsk' ? 4 : 8;
    const pts = Array.from({ length: m }, (_, i) => ({
      x: Math.cos((2 * Math.PI * i) / m + Math.PI / m),
      y: Math.sin((2 * Math.PI * i) / m + Math.PI / m),
    }));
    const pattern = Array.from({ length: m }, (_, i) => (g ? gray(i) : i));
    return { pts, pattern, k: Math.log2(m) };
  }
  // 16-QAM: independent 2-bit mapping per axis, levels [−3,−1,1,3]/√10
  const lv = [-3, -1, 1, 3].map((v) => v / Math.sqrt(10));
  const pts = [];
  const pattern = [];
  for (let i = 0; i < 4; i++) {
    for (let j = 0; j < 4; j++) {
      pts.push({ x: lv[i], y: lv[j] });
      const bi = g ? gray(i) : i;
      const bj = g ? gray(j) : j;
      pattern.push((bi << 2) | bj);
    }
  }
  return { pts, pattern, k: 4 };
}

function berTheoryGray(mod, gb) {
  if (mod === 'bpsk' || mod === 'qpsk') return Q(Math.sqrt(2 * gb));
  if (mod === '8psk') return (2 / 3) * Q(Math.sqrt(6 * gb) * Math.sin(Math.PI / 8));
  return 0.75 * Q(Math.sqrt(0.8 * gb));
}

/** Simulate n symbols at γb; counts symbol/bit errors (+ clouds if kept). */
function simulate(map, n, gb, rng, gauss, keep) {
  const { pts, pattern, k } = map;
  const sigma = Math.sqrt(1 / (2 * k * gb));
  let symErr = 0;
  let bitErr = 0;
  for (let i = 0; i < n; i++) {
    const s = Math.floor(rng() * pts.length);
    const rx = pts[s].x + sigma * gauss();
    const ry = pts[s].y + sigma * gauss();
    let best = 0;
    let dBest = Infinity;
    for (let c = 0; c < pts.length; c++) {
      const d = (rx - pts[c].x) ** 2 + (ry - pts[c].y) ** 2;
      if (d < dBest) {
        dBest = d;
        best = c;
      }
    }
    const nb = popcount(pattern[s] ^ pattern[best]);
    if (best !== s) symErr++;
    bitErr += nb;
    if (keep) (nb === 0 ? keep.ok : nb === 1 ? keep.e1 : keep.e2).push(rx, ry);
  }
  return { symErr, bitErr };
}

/**
 * @param {{mod: string, mapping: string, ebn0Db: number, Nbits: number,
 *          seed: number}} params
 * @returns {{observables: Object}}
 */
export function compute({ mod, mapping, ebn0Db, Nbits, seed }) {
  const rng = mulberry32(seed);
  const gauss = gaussFrom(rng);
  const map = makeMap(mod, mapping);
  const gb = 10 ** (ebn0Db / 10);
  const nSym = Math.max(1, Math.floor(Nbits / map.k));

  // main run at the pill's Eb/N0
  const keep = { ok: [], e1: [], e2: [] };
  const { symErr, bitErr } = simulate(map, nSym, gb, rng, gauss, keep);

  // BER vs Eb/N0: Gray theory on a fine grid, Monte Carlo on the dB grid
  const ft = new Float64Array(57);
  const fy = new Float64Array(57);
  for (let i = 0; i < 57; i++) {
    ft[i] = (14 * i) / 56;
    fy[i] = berTheoryGray(mod, 10 ** (ft[i] / 10));
  }
  const mx = new Float64Array(DB_GRID.length);
  const my = new Float64Array(DB_GRID.length);
  for (let g = 0; g < DB_GRID.length; g++) {
    const r = simulate(map, SYM_CURVE, 10 ** (DB_GRID[g] / 10), rng, gauss, null);
    mx[g] = DB_GRID[g];
    my[g] = r.bitErr / (SYM_CURVE * map.k);
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
  const bitsOf = (v) => v.toString(2).padStart(map.k, '0');

  return {
    observables: {
      rxOk: toSeries(keep.ok),
      rxErr1: toSeries(keep.e1),
      rxErrMulti: toSeries(keep.e2),
      idealPoints: {
        x: Float64Array.from(map.pts, (p) => p.x),
        y: Float64Array.from(map.pts, (p) => p.y),
      },
      bitLabels: map.pattern.map(bitsOf),
      berTheoryCurve: { x: ft, y: fy },
      berEmpCurve: { x: mx, y: my },
      berEmp: {
        value: bitErr / (nSym * map.k),
        meta: { label: 'BER', precision: 4 },
      },
      berTh: {
        value: berTheoryGray(mod, gb),
        meta: { label: 'BER théorie (Gray)', precision: 4 },
      },
      serEmp: {
        value: symErr / nSym,
        meta: { label: 'SER', precision: 4 },
      },
    },
  };
}
