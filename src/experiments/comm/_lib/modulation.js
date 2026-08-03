// Canonical digital constellations shared by the comm experiments — pure,
// worker-safe, importable from compute.js and check.js (same policy as
// numeric.js and codes.js). All constellations have unit average energy.
// PSK points are laid on the ring in ORDER (angle offset π/m), so ring
// adjacency is index adjacency — what Gray mapping relies on.
import { qfunc } from '../../../core/numeric.js';

export const BITS_PER_SYMBOL = { bpsk: 1, qpsk: 2, '8psk': 3, '16qam': 4 };

const gray = (i) => i ^ (i >> 1);

/** Constellation points {x, y} (unit average energy), in mapping order. */
export function constellation(mod) {
  if (mod === 'bpsk') return [{ x: -1, y: 0 }, { x: 1, y: 0 }];
  if (mod === 'qpsk' || mod === '8psk') {
    const m = mod === 'qpsk' ? 4 : 8;
    return Array.from({ length: m }, (_, i) => ({
      x: Math.cos((2 * Math.PI * i) / m + Math.PI / m),
      y: Math.sin((2 * Math.PI * i) / m + Math.PI / m),
    }));
  }
  const lv = [-3, -1, 1, 3].map((v) => v / Math.sqrt(10)); // 16-QAM
  return lv.flatMap((x) => lv.map((y) => ({ x, y })));
}

/**
 * Constellation with its bit mapping: points, the bit pattern carried by
 * each point, and k = bits/symbol. mapping: 'gray' (ring/per-axis Gray) or
 * 'natural' (plain binary order).
 */
export function constellationMap(mod, mapping) {
  const g = mapping === 'gray';
  const pts = constellation(mod);
  const k = BITS_PER_SYMBOL[mod];
  if (mod === '16qam') {
    // independent 2-bit mapping per axis (points are in lv-major order)
    const pattern = [];
    for (let i = 0; i < 4; i++) {
      for (let j = 0; j < 4; j++) {
        const bi = g ? gray(i) : i;
        const bj = g ? gray(j) : j;
        pattern.push((bi << 2) | bj);
      }
    }
    return { pts, pattern, k };
  }
  const pattern = pts.map((_, i) => (g ? gray(i) : i));
  return { pts, pattern, k };
}

/** Symbol-error rate closed forms (tight approximation for 8-PSK), γ = Es/N0. */
export function serTheory(mod, snr) {
  if (mod === 'bpsk') return qfunc(Math.sqrt(2 * snr));
  if (mod === 'qpsk') {
    const p = qfunc(Math.sqrt(snr));
    return 2 * p - p * p;
  }
  if (mod === '8psk') return 2 * qfunc(Math.sqrt(2 * snr) * Math.sin(Math.PI / 8));
  const p = 1.5 * qfunc(Math.sqrt(snr / 5)); // 16-QAM
  return 1 - (1 - p) ** 2;
}

/** Gray-mapping BER references (exact for BPSK/QPSK), γb = Eb/N0. */
export function berTheoryGray(mod, gb) {
  if (mod === 'bpsk' || mod === 'qpsk') return qfunc(Math.sqrt(2 * gb));
  if (mod === '8psk') return (2 / 3) * qfunc(Math.sqrt(6 * gb) * Math.sin(Math.PI / 8));
  return 0.75 * qfunc(Math.sqrt(0.8 * gb)); // 16-QAM
}
