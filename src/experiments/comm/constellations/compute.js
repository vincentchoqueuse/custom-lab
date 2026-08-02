// Digital constellations in AWGN: N symbols drawn uniformly from a
// unit-average-energy constellation (BPSK, QPSK, 8-PSK, 16-QAM), complex
// noise of variance N0 = Es/snr (σ² = N0/2 per dimension), nearest-neighbor
// (ML) decision. Observables: the received cloud split into correct/wrong
// decisions, the ideal points, the exact ML decision boundaries, and the
// SER vs SNR curve (theory vs Monte Carlo). Theoretical SER, with
// γ = Es/N0 and p the per-dimension (or per-PAM) error:
//   BPSK:   Q(√(2γ))
//   QPSK:   2p − p²,  p = Q(√γ)
//   8-PSK:  ≈ 2·Q(√(2γ)·sin(π/8))          (tight for γ ≳ 5 dB)
//   16-QAM: 1 − (1−p)²,  p = (3/2)·Q(√(γ/5))
// PURE, stateless, seeded — runs in a worker; deterministic at fixed seed.
import { mulberry32, gaussFrom } from '../../../core/rng.js';
import { normalCdf } from '../../../core/numeric.js';

const DB_GRID = Array.from({ length: 11 }, (_, i) => 2 * i); // 0…20 dB
const N_CURVE = 6000; // symbols per Monte Carlo point of the SER curve

const Q = (x) => 1 - normalCdf(x);

/** Constellation points {x, y}, normalized to unit average energy. */
function constellation(mod) {
  if (mod === 'bpsk') return [{ x: -1, y: 0 }, { x: 1, y: 0 }];
  if (mod === 'qpsk') {
    const a = Math.SQRT1_2;
    return [-a, a].flatMap((x) => [-a, a].map((y) => ({ x, y })));
  }
  if (mod === '8psk') {
    return Array.from({ length: 8 }, (_, k) => ({
      x: Math.cos((k * Math.PI) / 4),
      y: Math.sin((k * Math.PI) / 4),
    }));
  }
  const lv = [-3, -1, 1, 3].map((v) => v / Math.sqrt(10)); // 16-QAM
  return lv.flatMap((x) => lv.map((y) => ({ x, y })));
}

/** Exact ML decision boundaries as segments (drawn by the custom view). */
function boundaries(mod, ext) {
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

function serTheory(mod, snr) {
  if (mod === 'bpsk') return Q(Math.sqrt(2 * snr));
  if (mod === 'qpsk') {
    const p = Q(Math.sqrt(snr));
    return 2 * p - p * p;
  }
  if (mod === '8psk') return 2 * Q(Math.sqrt(2 * snr) * Math.sin(Math.PI / 8));
  const p = 1.5 * Q(Math.sqrt(snr / 5));
  return 1 - (1 - p) ** 2;
}

/** Simulate n symbols at linear SNR γ; returns the error count (+ clouds). */
function simulate(pts, n, snr, rng, gauss, keep) {
  const sigma = Math.sqrt(1 / (2 * snr));
  let errors = 0;
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
    const ok = best === s;
    if (!ok) errors++;
    if (keep) (ok ? keep.ok : keep.err).push(rx, ry);
  }
  return errors;
}

/**
 * @param {{mod: string, snrDb: number, N: number, seed: number}} params
 * @returns {{observables: Object}}
 */
export function compute({ mod, snrDb, N, seed }) {
  const rng = mulberry32(seed);
  const gauss = gaussFrom(rng);
  const pts = constellation(mod);
  const snr = 10 ** (snrDb / 10);

  // main cloud at the pill's SNR
  const keep = { ok: [], err: [] };
  const errors = simulate(pts, N, snr, rng, gauss, keep);

  // SER vs SNR: theory on a fine grid, Monte Carlo on the dB grid
  const ft = new Float64Array(81);
  const fy = new Float64Array(81);
  for (let i = 0; i < 81; i++) {
    ft[i] = (20 * i) / 80;
    fy[i] = serTheory(mod, 10 ** (ft[i] / 10));
  }
  const mx = new Float64Array(DB_GRID.length);
  const my = new Float64Array(DB_GRID.length);
  for (let g = 0; g < DB_GRID.length; g++) {
    mx[g] = DB_GRID[g];
    my[g] = simulate(pts, N_CURVE, 10 ** (DB_GRID[g] / 10), rng, gauss, null) / N_CURVE;
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
      rxOk: toSeries(keep.ok),
      rxErr: toSeries(keep.err),
      idealPoints: {
        x: Float64Array.from(pts, (p) => p.x),
        y: Float64Array.from(pts, (p) => p.y),
      },
      boundaries: boundaries(mod, 3),
      serTheoryCurve: { x: ft, y: fy },
      serEmpCurve: { x: mx, y: my },
      serEmp: {
        value: errors / N,
        meta: { label: 'SER empirique', precision: 4 },
      },
      serTh: {
        value: serTheory(mod, snr),
        meta: { label: 'SER théorique', precision: 4 },
      },
      nErrors: { value: errors, meta: { label: 'erreurs', precision: 0 } },
    },
  };
}
