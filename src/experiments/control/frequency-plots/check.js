import { compute, transfer, naturalW } from './compute.js';
import { standardChecks, maxGap, range } from '../../../core/checks.js';

const BASE = { sys: 'first', K: 1, tau: 1, w0: 1, m: 0.3, wc: 1, seed: 42 };
const obs = (p) => compute({ ...BASE, ...p }).observables;

export const checks = [
  {
    name: 'les trois diagrammes tracent le MÊME nombre complexe',
    category: 'numeric',
    run() {
      // The whole point of the experiment, as an identity: the Nyquist point,
      // the Bode pair and the Black point must be three readings of one H(jω).
      let worst = 0;
      for (const p of [{}, { sys: 'second', m: 0.3 }, { sys: 'second', m: 1.4 }]) {
        const o = obs(p);
        worst = Math.max(
          worst,
          maxGap(
            range(o.gain.x.length),
            (i) => Math.hypot(o.locus.x[i], o.locus.y[i]),
            (i) => 10 ** (o.gain.y[i] / 20)
          ),
          // Black IS the Bode pair, axes exchanged
          maxGap(range(o.gain.x.length), (i) => o.black.x[i], (i) => o.phase.y[i]),
          maxGap(range(o.gain.x.length), (i) => o.black.y[i], (i) => o.gain.y[i]),
          // and the phase is the argument of the Nyquist point
          maxGap(
            range(o.gain.x.length),
            (i) => (Math.atan2(o.locus.y[i], o.locus.x[i]) * 180) / Math.PI,
            (i) => o.phase.y[i]
          )
        );
      }
      return { ok: worst < 1e-12, detail: `écart max ${worst.toExponential(2)}` };
    },
  },
  {
    name: 'le curseur pointe exactement H(jω_c) sur les quatre vues',
    category: 'numeric',
    run() {
      const gap = maxGap([0.05, 0.4, 1, 3.7, 40], (wc) => {
        const p = { ...BASE, sys: 'second', m: 0.45, wc };
        const o = compute(p).observables;
        const [re, im] = transfer('second', wc, p);
        return Math.max(
          Math.abs(o.cursorPt.x[0] - re),
          Math.abs(o.cursorPt.y[0] - im),
          Math.abs(o.cursorBlack.y[0] - 20 * Math.log10(Math.hypot(re, im))),
          Math.abs(o.cursorBlack.x[0] - (Math.atan2(im, re) * 180) / Math.PI)
        );
      });
      return { ok: gap < 1e-12, detail: `écart max ${gap.toExponential(2)}` };
    },
  },
  {
    name: 'premier ordre : le lieu de Nyquist EST un demi-cercle',
    category: 'numeric',
    run() {
      // |H − K/2| = K/2 for every ω — the geometric fact scene 2 claims
      const K = 1.7;
      const o = obs({ K, tau: 0.4 });
      const gap = maxGap(
        range(o.locus.x.length),
        (i) => Math.hypot(o.locus.x[i] - K / 2, o.locus.y[i]),
        () => K / 2
      );
      return { ok: gap < 1e-15, detail: `écart max au cercle ${gap.toExponential(2)}` };
    },
  },
  {
    name: 'premier ordre : −3.01 dB et −45° exactement à ω = 1/τ',
    category: 'numeric',
    run() {
      const gap = maxGap([0.08, 0.5, 1, 3.3], (tau) => {
        const o = obs({ tau, wc: 1 / tau, K: 1 });
        return Math.max(
          Math.abs(o.cGainDb.value - 20 * Math.log10(1 / Math.SQRT2)),
          Math.abs(o.cPhase.value + 45)
        );
      });
      return { ok: gap < 1e-13, detail: `écart max ${gap.toExponential(2)}` };
    },
  },
  {
    name: 'second ordre : exactement −90° à ω₀, quel que soit m',
    category: 'numeric',
    run() {
      // H(jω₀) = K/(2jm): purely imaginary, whatever the damping
      const gap = maxGap([0.08, 0.3, 0.707, 1.4, 2], (m) => {
        const o = obs({ sys: 'second', m, w0: 2.5, wc: 2.5, K: 1.3 });
        return Math.max(
          Math.abs(o.cPhase.value + 90),
          Math.abs(o.cMod.value - 1.3 / (2 * m)) / (1.3 / (2 * m))
        );
      });
      return { ok: gap < 1e-13, detail: `écart max ${gap.toExponential(2)}` };
    },
  },
  {
    name: 'résonance : seuil exact à m = 1/√2, pic M_r et ω_r en forme close',
    category: 'numeric',
    run() {
      // below the threshold the peak exists and matches K/(2m√(1−m²)) at
      // ω₀√(1−2m²); above it, there is no peak at all
      const gap = maxGap([0.1, 0.3, 0.5, 0.7], (m) => {
        const o = obs({ sys: 'second', m, w0: 1.6, K: 1 });
        const wantW = 1.6 * Math.sqrt(1 - 2 * m * m);
        const wantDb = 20 * Math.log10(1 / (2 * m * Math.sqrt(1 - m * m)));
        return Math.max(Math.abs(o.wrOut.value - wantW), Math.abs(o.mrDb.value - wantDb));
      });
      const none = [0.71, 1, 1.8].every((m) => Number.isNaN(obs({ sys: 'second', m }).mrDb.value));
      return { ok: gap < 1e-13 && none, detail: `écart max ${gap.toExponential(2)}, pas de pic au-dessus de 1/√2` };
    },
  },
  {
    name: 'la bosse de Bode est bien au maximum mesuré du gain',
    category: 'numeric',
    run() {
      // the closed-form ω_r must land on the argmax of the drawn curve, to
      // within the log grid's own step
      const m = 0.25;
      const o = obs({ sys: 'second', m, w0: 1 });
      let iMax = 0;
      for (let i = 1; i < o.gain.y.length; i++) if (o.gain.y[i] > o.gain.y[iMax]) iMax = i;
      const step = o.gain.x[1] / o.gain.x[0];
      const ratio = o.gain.x[iMax] / o.wrOut.value;
      return {
        ok: ratio > 1 / step && ratio < step,
        detail: `argmax à ${o.gain.x[iMax].toFixed(4)}, ω_r = ${o.wrOut.value.toFixed(4)} (pas de grille ${step.toFixed(4)})`,
      };
    },
  },
  {
    name: 'la grille est centrée sur la pulsation naturelle du système',
    category: 'numeric',
    run() {
      const gap = maxGap(
        [
          { sys: 'first', tau: 0.3 },
          { sys: 'first', tau: 2.5 },
          { sys: 'second', w0: 0.7 },
          { sys: 'second', w0: 12 },
        ],
        (p) => {
          const o = obs(p);
          const mid = o.gain.x[(o.gain.x.length - 1) / 2];
          return Math.abs(mid - naturalW(p.sys ?? 'first', { ...BASE, ...p })) ;
        }
      );
      return { ok: gap < 1e-12, detail: `écart max ${gap.toExponential(2)}` };
    },
  },
  standardChecks.determinism(compute, { ...BASE, sys: 'second' }, 'locus'),
];
