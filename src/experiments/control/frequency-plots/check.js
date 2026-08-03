import {
  compute,
  transfer,
  naturalW,
  phaseOf,
  isoModulus,
  w180Of,
  modAt180,
  TAU_RATIO,
} from './compute.js';
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
      for (const p of [
        {},
        { sys: 'second', m: 0.3 },
        { sys: 'second', m: 1.4 },
        { sys: 'openloop' },
        { sys: 'openloop', K: 9 },
      ]) {
        const o = obs(p);
        // the open loop's Nyquist locus is cut outside the reading disc, so
        // the identity is asserted on the points that ARE drawn
        const drawn = range(o.gain.x.length).filter((i) => Number.isFinite(o.locus.x[i]));
        worst = Math.max(
          worst,
          maxGap(
            drawn,
            (i) => Math.hypot(o.locus.x[i], o.locus.y[i]),
            (i) => 10 ** (o.gain.y[i] / 20)
          ),
          // Black IS the Bode pair, axes exchanged
          maxGap(range(o.gain.x.length), (i) => o.black.x[i], (i) => o.phase.y[i]),
          maxGap(range(o.gain.x.length), (i) => o.black.y[i], (i) => o.gain.y[i]),
          // and the phase is the argument of the Nyquist point — modulo 360°,
          // because the plotted phase is CONTINUOUS (it runs to −270° on the
          // open loop) while atan2 folds into (−180°, 180°]
          maxGap(drawn, (i) => {
            const a = (Math.atan2(o.locus.y[i], o.locus.x[i]) * 180) / Math.PI - o.phase.y[i];
            return (((a + 180) % 360) + 360) % 360;
          }, () => 180)
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
  {
    name: 'boucle ouverte : ω₁₈₀ et la marge de gain en forme close',
    category: 'numeric',
    run() {
      // arctan(τ₁ω) + arctan(τ₂ω) = 90° ⟺ ω = 1/√(τ₁τ₂) = √5/τ, and there
      // |H| collapses to K·τ₁τ₂/(τ₁+τ₂) = Kτ/6. Both are independent checks of
      // the same algebra: the phase must actually BE −180° there.
      const gap = maxGap(
        [
          { tau: 0.2, K: 0.5 },
          { tau: 1, K: 1 },
          { tau: 1, K: 9 },
          { tau: 3.5, K: 22 },
        ],
        ({ tau, K }) => {
          const o = obs({ sys: 'openloop', tau, K });
          const w = w180Of(tau);
          return Math.max(
            Math.abs(o.w180Out.value - w),
            Math.abs(o.w180Out.value - Math.sqrt(TAU_RATIO) / tau),
            Math.abs(phaseOf('openloop', w, { tau }) + 180),
            Math.abs(Math.hypot(...transfer('openloop', w, { K, tau })) - modAt180(K, tau)),
            Math.abs(o.gainMargin.value + 20 * Math.log10((K * tau) / 6))
          );
        }
      );
      return { ok: gap < 1e-12, detail: `écart max ${gap.toExponential(2)}` };
    },
  },
  {
    name: 'boucle ouverte : la marge de phase se lit bien à |H| = 1',
    category: 'numeric',
    run() {
      // ω à 0 dB has no closed form (it is bisected); what CAN be asserted is
      // that |H| is exactly 1 there, and that the margin is the gap the phase
      // curve leaves to −180° at that very pulsation.
      const gap = maxGap(
        [
          { tau: 0.2, K: 0.5 },
          { tau: 1, K: 1 },
          { tau: 1, K: 9 },
          { tau: 3.5, K: 22 },
        ],
        ({ tau, K }) => {
          const o = obs({ sys: 'openloop', tau, K });
          const wco = o.wcoOut.value;
          return Math.max(
            Math.abs(Math.hypot(...transfer('openloop', wco, { K, tau })) - 1),
            Math.abs(o.phaseMargin.value - (180 + phaseOf('openloop', wco, { tau })))
          );
        }
      );
      return { ok: gap < 1e-11, detail: `écart max ${gap.toExponential(2)}` };
    },
  },
  {
    name: 'boucle ouverte : les deux marges s\'annulent ENSEMBLE à K = 6/τ',
    category: 'numeric',
    run() {
      // the scene's punchline, as an identity: at K critique the locus passes
      // exactly through −1, so ω à 0 dB = ω à −180° and both margins are zero
      const gap = maxGap([0.15, 0.6, 1, 4], (tau) => {
        const kc = (TAU_RATIO + 1) / tau;
        const o = obs({ sys: 'openloop', tau, K: kc });
        return Math.max(
          Math.abs(o.kCrit.value - kc),
          Math.abs(o.kCrit.value - 6 / tau),
          Math.abs(o.gainMargin.value),
          Math.abs(o.phaseMargin.value),
          Math.abs(o.wcoOut.value - o.w180Out.value)
        );
      });
      // and the sign flips on the right side of K critique
      const below = obs({ sys: 'openloop', tau: 1, K: 5.9 });
      const above = obs({ sys: 'openloop', tau: 1, K: 6.1 });
      const signs =
        below.gainMargin.value > 0 &&
        below.phaseMargin.value > 0 &&
        above.gainMargin.value < 0 &&
        above.phaseMargin.value < 0;
      return {
        ok: gap < 1e-9 && signs,
        detail: `écart max ${gap.toExponential(2)}, marges positives sous K_crit et négatives au-dessus`,
      };
    },
  },
  {
    name: 'ω₁₈₀ ne dépend pas de K — seul le lieu grandit',
    category: 'numeric',
    run() {
      // The whole Nyquist criterion in one line: K is a homothety of centre
      // origin — H_K(jω) = K·H_1(jω) at EVERY ω, so the phase is untouched and
      // ω à −180° with it; only the distance to the fixed −1 point changes.
      // Compared at equal ω, not index by index: the plotted grid is framed by
      // gain, so it slides when K does.
      const tau = 0.8;
      const wc = 1.3;
      const ref = obs({ sys: 'openloop', tau, K: 1, wc });
      const ws = range(40).map((i) => 0.01 * 10 ** (i / 10));
      const gap = maxGap([0.3, 2, 7, 25], (K) => {
        const o = obs({ sys: 'openloop', tau, K, wc });
        const homothety = maxGap(
          ws,
          (w) => Math.hypot(...transfer('openloop', w, { K, tau })),
          (w) => K * Math.hypot(...transfer('openloop', w, { K: 1, tau }))
        );
        return Math.max(
          Math.abs(o.w180Out.value - ref.w180Out.value),
          Math.abs(o.cPhase.value - ref.cPhase.value), // the phase ignores K
          Math.abs(o.cMod.value - K * ref.cMod.value), // the modulus scales by K
          homothety
        );
      });
      return { ok: gap < 1e-12, detail: `écart max ${gap.toExponential(2)}` };
    },
  },
  {
    name: 'premier et second ordre : pas de marges (la phase ne coupe jamais −180°)',
    category: 'numeric',
    run() {
      // the reason the open loop had to be added at all: a stable first or
      // second order has infinite margins, so the −1 point is decorative
      const none = [{ sys: 'first' }, { sys: 'second', m: 0.3 }, { sys: 'second', m: 1.4 }].every(
        (p) => {
          const o = obs(p);
          return (
            Number.isNaN(o.phaseMargin.value) &&
            Number.isNaN(o.gainMargin.value) &&
            Number.isNaN(o.kCrit.value) &&
            o.phase.y.every((v) => v > -180 - 1e-9)
          );
        }
      );
      return { ok: none, detail: 'marges NaN et phase ≥ −180° pour les ordres 1 et 2' };
    },
  },
  {
    name: 'boucle ouverte : la fenêtre tracée est bornée en gain et en module',
    category: 'numeric',
    run() {
      // the framing IS a numerical property: the grid ends at exactly +30 and
      // −40 dB, and the Nyquist locus is cut at |H| = 3 — no point beyond,
      // every point below kept, so the −1 point never gets pushed off frame
      let worstEnds = 0;
      let cut = true;
      for (const { tau, K } of [
        { tau: 0.2, K: 0.5 },
        { tau: 1, K: 1 },
        { tau: 1, K: 9 },
        { tau: 3.5, K: 22 },
      ]) {
        const o = obs({ sys: 'openloop', tau, K });
        const n = o.gain.y.length - 1;
        worstEnds = Math.max(worstEnds, Math.abs(o.gain.y[0] - 30), Math.abs(o.gain.y[n] + 40));
        for (let i = 0; i <= n; i++) {
          const mod = 10 ** (o.gain.y[i] / 20);
          const drawn = Number.isFinite(o.locus.x[i]);
          if (drawn !== mod <= 3) cut = false;
        }
      }
      return {
        ok: worstEnds < 1e-9 && cut,
        detail: `bornes ±${worstEnds.toExponential(2)} dB, coupure exactement à |H| = 3`,
      };
    },
  },
  {
    name: 'abaque : tout point tracé vérifie |H/(1+H)| = M, sur Black et sur Nyquist',
    category: 'numeric',
    run() {
      // The contours have a DEFINING identity, so it is asserted on the drawn
      // points themselves rather than on the formula that produced them: every
      // point of the iso-gain family must give exactly its own closed-loop
      // modulus, whether it was built as a Nichols contour (φ, dB) or as a
      // Hall circle (Re, Im).
      const closedOf = (re, im) => Math.hypot(re, im) / Math.hypot(1 + re, im);
      let worst = 0;
      for (const db of [-12, -6, -3, -1, 0, 1, 3, 6, 12]) {
        const M = 10 ** (db / 20);
        // Nichols: the modulus solved at a given open-loop phase
        for (let i = -270; i <= -90; i += 1) {
          for (const r of isoModulus(M, i)) {
            const a = (i * Math.PI) / 180;
            worst = Math.max(worst, Math.abs(closedOf(r * Math.cos(a), r * Math.sin(a)) - M));
          }
        }
        // Hall: the circle of centre −M²/(M²−1) and radius M/|M²−1|, and the
        // bisector Re = −1/2 that M = 1 degenerates into
        if (Math.abs(M - 1) > 1e-12) {
          const cx = -(M * M) / (M * M - 1);
          const rr = M / Math.abs(M * M - 1);
          for (let i = 0; i < 120; i++) {
            const a = (2 * Math.PI * i) / 120;
            worst = Math.max(worst, Math.abs(closedOf(cx + rr * Math.cos(a), rr * Math.sin(a)) - M));
          }
        } else {
          for (const im of [-3, -1, 0, 0.5, 2]) worst = Math.max(worst, Math.abs(closedOf(-0.5, im) - 1));
        }
      }
      return { ok: worst < 1e-12, detail: `écart max ${worst.toExponential(2)}` };
    },
  },
  {
    name: 'abaque : le contour mis en avant est bien TANGENT au lieu ouvert',
    category: 'numeric',
    run() {
      // the reading the scene asks for: the highlighted level is the maximum
      // of |T| over the band, so no plotted point of the locus may exceed it,
      // and the tangency pulsation must reach it exactly
      const gap = maxGap(
        [
          { tau: 1, K: 0.5 },
          { tau: 1, K: 1 },
          { tau: 0.3, K: 4 },
          { tau: 2, K: 2 },
        ],
        ({ tau, K }) => {
          const o = obs({ sys: 'openloop', tau, K });
          const M = 10 ** (o.mrClosed.value / 20);
          const at = (w) => {
            const [re, im] = transfer('openloop', w, { K, tau });
            return Math.hypot(re, im) / Math.hypot(1 + re, im);
          };
          let over = 0;
          for (let i = 0; i < o.gain.x.length; i++) over = Math.max(over, at(o.gain.x[i]) - M);
          // the contour passes exactly through the tangency point
          const wr = o.wrClosed.value;
          const contour = isoModulus(M, phaseOf('openloop', wr, { tau }));
          const here = Math.hypot(...transfer('openloop', wr, { K, tau }));
          const onIt = Math.min(...contour.map((r) => Math.abs(r - here)));
          return Math.max(over, Math.abs(at(wr) - M), onIt);
        }
      );
      return { ok: gap < 1e-6, detail: `écart max ${gap.toExponential(2)}` };
    },
  },
  {
    name: 'abaque : rien de tracé hors boucle ouverte, ni au-delà de K critique',
    category: 'numeric',
    run() {
      // an empty series is how a layer says "these params do not have me":
      // the fixed orders have no loop to close, and past K critique a
      // "resonance" would be a number that reads like physics and is not one
      const empty = (o, k) => o[k].x.length === 0;
      const fixed = [{ sys: 'first' }, { sys: 'second', m: 0.3 }].every((p) => {
        const o = obs(p);
        return (
          ['isoGain', 'isoPeak', 'hallGain', 'hallPeak'].every((k) => empty(o, k)) &&
          Number.isNaN(o.mrClosed.value)
        );
      });
      const unstable = [6, 6.5, 20].every((K) => {
        const o = obs({ sys: 'openloop', tau: 1, K });
        return (
          empty(o, 'isoPeak') &&
          empty(o, 'hallPeak') &&
          Number.isNaN(o.mrClosed.value) &&
          !empty(o, 'isoGain') // the grid itself stays: it is what K crosses
        );
      });
      // and below K critique the resonance IS reported, and grows with K
      const peaks = [1, 3, 5, 5.9].map((K) => obs({ sys: 'openloop', tau: 1, K }).mrClosed.value);
      const grows = peaks.every((v, i) => Number.isFinite(v) && (i === 0 || v > peaks[i - 1]));
      return {
        ok: fixed && unstable && grows,
        detail: `M_r = ${peaks.map((v) => v.toFixed(1)).join(' → ')} dB de K = 1 à 5.9`,
      };
    },
  },
  standardChecks.determinism(compute, { ...BASE, sys: 'second' }, 'locus'),
  standardChecks.determinism(compute, { ...BASE, sys: 'openloop' }, 'gain'),
];
