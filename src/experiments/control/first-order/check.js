import { compute, stepValue, impulseValue } from './compute.js';
import { standardChecks, maxGap, range } from '../../../core/checks.js';

const BASE = { K: 1, tau: 1, tz: 0, seed: 42 };
const obs = (p) => compute({ ...BASE, ...p }).observables;

export const checks = [
  {
    name: 'réponse indicielle : 63.2 % à t = τ, 95 % à 3τ, 99.3 % à 5τ',
    category: 'numeric',
    run() {
      // the three numbers said in every first-order lecture, checked exactly
      const K = 1.7;
      const tau = 0.4;
      const want = { 1: 1 - Math.exp(-1), 3: 1 - Math.exp(-3), 5: 1 - Math.exp(-5) };
      const gap = maxGap(
        Object.keys(want).map(Number),
        (n) => stepValue(K, tau, 0, n * tau) / K,
        (n) => want[n]
      );
      return { ok: gap < 1e-15, detail: `écart max ${gap.toExponential(2)}` };
    },
  },
  {
    name: 'la tangente à l\'origine coupe la valeur finale en t = τ, zéro ou pas',
    category: 'numeric',
    run() {
      // y(0) + y'(0)·τ = K holds for every τ_z — the graphical construction
      // survives the zero, which is why the tangent is drawn in all cases
      const gap = maxGap([-0.9, -0.3, 0, 0.4, 1.6], (tz) => {
        const K = 1.3;
        const tau = 0.7;
        const y0 = stepValue(K, tau, tz, 0);
        const slope = (K * (1 - tz / tau)) / tau;
        return y0 + slope * tau - K;
      });
      return { ok: gap < 1e-15, detail: `écart max ${gap.toExponential(2)}` };
    },
  },
  {
    name: 'h(t) est la dérivée de y(t) — deux formes closes, une identité',
    category: 'numeric',
    run() {
      // central difference on the step response against the closed-form
      // impulse response: independent derivations, same function
      const K = 0.8;
      const tau = 0.6;
      const tz = 0.25;
      const dt = 1e-6;
      const gap = maxGap(
        range(40, (i) => 0.02 + i * 0.06),
        (t) => (stepValue(K, tau, tz, t + dt) - stepValue(K, tau, tz, t - dt)) / (2 * dt),
        (t) => impulseValue(K, tau, tz, t)
      );
      return { ok: gap < 1e-8, detail: `écart max ${gap.toExponential(2)}` };
    },
  },
  {
    name: 'l\'aire sous h(t) vaut le gain statique K (τ_z = 0)',
    category: 'numeric',
    run() {
      // ∫₀^∞ (K/τ)e^{−t/τ} dt = K, by Simpson over 40τ
      const K = 1.4;
      const tau = 0.5;
      const n = 20000;
      const b = 40 * tau;
      const h = b / n;
      let s = 0;
      for (let i = 0; i <= n; i++) {
        const w = i === 0 || i === n ? 1 : i % 2 ? 4 : 2;
        s += w * impulseValue(K, tau, 0, i * h);
      }
      const area = (s * h) / 3;
      return { ok: Math.abs(area - K) < 1e-9, detail: `aire = ${area.toFixed(12)}` };
    },
  },
  {
    name: 'la valeur initiale vaut K·τ_z/τ, la finale vaut K',
    category: 'numeric',
    run() {
      // Theorems of the initial and final value, read on the drawn curve. The
      // window is six time constants, so the curve does not REACH K: what is
      // left is exactly K·|1 − τ_z/τ|·e^{−6}, computed rather than tolerated —
      // and a zero makes that residue bigger, which is why it cannot be a
      // fixed percentage.
      const K = 1.1;
      const tau = 0.9;
      let worst = 0;
      for (const tz of [-0.8, 0, 0.5, 1.9]) {
        const o = obs({ tz, K, tau });
        const last = o.stepResponse.y[o.stepResponse.y.length - 1];
        const residue = K * Math.abs(1 - tz / tau) * Math.exp(-6);
        worst = Math.max(
          worst,
          Math.abs(o.initial.value - (K * tz) / tau),
          Math.abs(Math.abs(last - K) - residue)
        );
      }
      return { ok: worst < 1e-12, detail: `écart max ${worst.toExponential(2)}` };
    },
  },
  {
    name: 'coupure à −3 dB exactement en ω = 1/τ (sans zéro)',
    category: 'numeric',
    run() {
      const gap = maxGap([0.2, 1, 3.5], (tau) => {
        const K = 1.2;
        const g = (K * Math.hypot(1, 0)) / Math.hypot(1, (1 / tau) * tau);
        return g - K / Math.SQRT2;
      });
      return { ok: gap < 1e-15, detail: `écart max ${gap.toExponential(2)}` };
    },
  },
  {
    name: 'la phase vaut −45° à la coupure et tend vers −90°',
    category: 'numeric',
    run() {
      const o = obs({ tau: 0.8 });
      const i = o.phase.x.findIndex((w) => w >= o.wc);
      const atCut = o.phase.y[i];
      const atInf = o.phase.y[o.phase.y.length - 1];
      return {
        ok: Math.abs(atCut + 45) < 0.5 && Math.abs(atInf + 90) < 0.5,
        detail: `${atCut.toFixed(3)}° à ω_c, ${atInf.toFixed(3)}° au bout`,
      };
    },
  },
  {
    name: 'phase non minimale : τ_z < 0 fait partir la sortie à l\'envers',
    category: 'numeric',
    run() {
      // the sign of y(0⁺) is the sign of τ_z, and nothing else decides it
      const neg = obs({ tz: -0.6 });
      const pos = obs({ tz: 0.6 });
      const zero = obs({ tz: 0 });
      const ok =
        neg.initial.value < 0 &&
        neg.undershoot.value < -1 &&
        pos.initial.value > 0 &&
        Math.abs(zero.initial.value) < 1e-15 &&
        zero.undershoot.value === 0;
      return {
        ok,
        detail: `y(0⁺) = ${neg.initial.value.toFixed(3)} (τ_z<0), ` +
          `${zero.initial.value.toFixed(3)} (τ_z=0), ${pos.initial.value.toFixed(3)} (τ_z>0)`,
      };
    },
  },
  {
    name: 'le gain ne distingue pas un zéro de son symétrique, la phase si',
    category: 'numeric',
    run() {
      // |H| is even in τ_z, arg H is not: the whole point of "non-minimum
      // phase" is that the magnitude response hides it
      const a = obs({ tz: 0.7 });
      const b = obs({ tz: -0.7 });
      const gGap = maxGap(range(a.gain.y.length), (i) => a.gain.y[i], (i) => b.gain.y[i]);
      const pGap = maxGap(range(a.phase.y.length), (i) => a.phase.y[i], (i) => b.phase.y[i]);
      // the identity is exact on the modulus; the curve is stored in dB, and
      // 20·log₁₀ of two bit-identical moduli still differs in the last ulp
      return {
        ok: gGap < 1e-12 && pGap > 90,
        detail: `gain identique à ${gGap.toExponential(1)}, phase écartée de ${pGap.toFixed(1)}°`,
      };
    },
  },
  {
    name: 'pôle en −1/τ, zéro en −1/τ_z (et aucun zéro si τ_z = 0)',
    category: 'numeric',
    run() {
      const a = obs({ tau: 0.35, tz: -0.5 });
      const b = obs({ tau: 0.35, tz: 0 });
      const ok =
        Math.abs(a.poles.x[0] + 1 / 0.35) < 1e-15 &&
        Math.abs(a.zeros.x[0] - 2) < 1e-15 && // −1/(−0.5) = +2, demi-plan droit
        a.zeros.x.length === 1 &&
        b.zeros.x.length === 0;
      return { ok, detail: `pôle ${a.poles.x[0].toFixed(6)}, zéro ${a.zeros.x[0].toFixed(6)}` };
    },
  },
  standardChecks.determinism(compute, { ...BASE, tz: -0.4 }, 'stepResponse'),
];
