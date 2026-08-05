import { compute } from './compute.js';
import { standardChecks } from '../../../core/checks.js';

const BASE = { Nc: 64, L: 6, cp: 8, snr: 15, M: 50, seed: 5 };

export const checks = [
  {
    name: 'channel normalization and Parseval: Σ|h|² = 1 = (1/Nc)·Σ|H_k|²',
    category: 'numeric',
    run() {
      const { observables: o } = compute(BASE);
      const g1 = Math.abs(o.hEnergy - 1);
      const g2 = Math.abs(o.parseval - 1);
      return {
        ok: g1 < 1e-12 && g2 < 1e-9,
        detail: `|Σ|h|²−1|=${g1.toExponential(1)}, |Parseval−1|=${g2.toExponential(1)}`,
      };
    },
  },
  {
    name: 'sufficient prefix diagonalizes the channel: error-free without noise',
    category: 'numeric',
    run() {
      // snr = 200 dB ≈ noiseless: with cp ≥ L−1 the one-tap ZF must recover
      // every bit through a 6-tap channel — circular convolution is exact
      const { observables: o } = compute({ ...BASE, snr: 200 });
      return { ok: o.berMeas.value === 0, detail: `BER=${o.berMeas.value} through L=6 taps` };
    },
  },
  {
    name: 'missing prefix leaves an error floor no SNR can fix',
    category: 'numeric',
    run() {
      const { observables: o } = compute({ ...BASE, cp: 0, snr: 200 });
      return {
        ok: o.berMeas.value > 0.005,
        detail: `BER=${o.berMeas.value.toFixed(4)} at 200 dB SNR (ISI floor)`,
      };
    },
  },
  {
    name: 'flat channel (L = 1): measured BER matches Q(√SNR)',
    category: 'statistical',
    run() {
      // n = 2·Nc·M bits; tolerance 4·SE with SE from the binomial variance
      // at the theoretical p (computed in-run as berSe)
      const { observables: o } = compute({ ...BASE, L: 1, snr: 7, M: 200 });
      const gap = Math.abs(o.berMeas.value - o.berThAvg.value);
      return {
        ok: gap < 4 * o.berSe + 1e-12,
        detail: `meas=${o.berMeas.value.toFixed(4)} th=${o.berThAvg.value.toFixed(4)} (tol ${(4 * o.berSe).toFixed(4)})`,
      };
    },
  },
  {
    name: 'selective channel: mean BER within 4 SE of the per-carrier ZF theory',
    category: 'statistical',
    run() {
      // the strongest statement of the experiment: averaging Q(√(|H_k|²·SNR))
      // over the ACTUAL fades predicts the measured mean BER
      const { observables: o } = compute({ ...BASE, snr: 10, M: 200 });
      const gap = Math.abs(o.berMeas.value - o.berThAvg.value);
      return {
        ok: gap < 4 * o.berSe,
        detail: `meas=${o.berMeas.value.toFixed(4)} th=${o.berThAvg.value.toFixed(4)} (tol ${(4 * o.berSe).toFixed(4)})`,
      };
    },
  },
  {
    name: 'the prefix IS the tail of the block — bit for bit, and only that',
    category: 'numeric',
    run() {
      // What the first view claims, and it is a copy rather than a computation:
      // the L_cp samples at the head of a symbol are the LAST L_cp of the useful
      // block. Not approximately — the same doubles. Checked over both drawn
      // symbols and over several prefix lengths, because a copy that were merely
      // close would mean an index was wrong somewhere.
      const bad = [];
      for (const cp of [2, 8, 16]) {
        const o = compute({ Nc: 64, L: 6, cp, snr: 30, M: 4, seed: 11 }).observables;
        const S = 64 + cp;
        // BOTH PARTS. The frame is complex and the figure now says so, so the
        // copy is asserted on Re and on Im: an index right in one and wrong in
        // the other would draw a prefix that matches its tail in the top panel
        // and not in the bottom one, which is precisely the defect a room
        // would spot before the check did.
        for (const part of ['txI', 'txQ'])
          for (let m = 0; m < 2; m++)
            for (let n = 0; n < cp; n++) {
              const head = o[part].y[m * S + n];
              const tail = o[part].y[m * S + cp + 64 - cp + n];
              if (head !== tail)
                bad.push(`${part}, cp=${cp}, symbol ${m}, sample ${n}: ${head} ≠ ${tail}`);
            }
        // and the bands drawn over them cover exactly those samples
        if (o.cpBand.x[0] !== 0 || o.cpBand.x[1] !== cp) bad.push(`cp=${cp}: prefix band misplaced`);
        if (o.cpBand.x[1] - o.cpBand.x[0] !== cp) bad.push(`cp=${cp}: prefix band wrong width`);
        // the frame verticals are the "découpage": one per symbol, S apart
        if (o.frame0 !== 0 || o.frame1 !== S) bad.push(`cp=${cp}: frame marks at ${o.frame0}, ${o.frame1}`);
      }
      return {
        ok: bad.length === 0,
        detail: bad.length
          ? bad.slice(0, 3).join(' · ')
          : 'identical at L_cp = 2, 8 and 16, both symbols, Re and Im',
      };
    },
  },
  {
    name: 'the FFT window is clean exactly when the memory fits in the prefix',
    category: 'numeric',
    run() {
      // The geometric statement the second view draws, checked as geometry: the
      // smeared region is L−1 samples long at the head of each symbol, and the
      // FFT window starts at L_cp. The window is therefore clean if and only if
      // L−1 ≤ L_cp — which is the same inequality the error floor obeys, and
      // the reason the two views belong side by side.
      const bad = [];
      for (const [L, cp] of [
        [6, 8],
        [6, 5],
        [1, 0],
        [9, 8],
      ]) {
        const o = compute({ Nc: 64, L, cp, snr: 30, M: 4, seed: 3 }).observables;
        const memory = L - 1;
        // the transient ends L−1 after each frame start, and the prefix band
        // ends at L_cp: the whole reading is which of the two comes first
        if (o.trans0 !== memory) bad.push(`L=${L}: transient ends at ${o.trans0}, expected ${memory}`);
        if (o.trans1 - o.trans0 !== 64 + cp) bad.push(`L=${L}: the two transients are not one symbol apart`);
        if (o.cpBandRx.x[1] - o.cpBandRx.x[0] !== cp) bad.push(`cp=${cp}: prefix band wrong width`);
        // and the eye's verdict — transient line inside the orange — must be
        // the same statement as the inequality the statline prints
        const insideByEye = o.trans0 <= o.cpBandRx.x[1];
        if (insideByEye !== memory <= cp) bad.push(`L=${L}, cp=${cp}: the picture and the inequality disagree`);
        // the verdict in the statline must agree with the inequality
        const says = /absorbed/.test(o.absorbed.value);
        if (says !== memory <= cp) bad.push(`L=${L}, cp=${cp}: statline says ${o.absorbed.value}`);
      }
      return {
        ok: bad.length === 0,
        detail: bad.length ? bad.join(' · ') : 'smeared = L−1, window at L_cp, verdict = (L−1 ≤ L_cp), on 4 settings',
      };
    },
  },
  standardChecks.determinism(compute, BASE, 'berMeasured'),
];
