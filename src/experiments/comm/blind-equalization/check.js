import { compute, dispersionR2, costFloor, carrier, combined, isiOf, N } from './compute.js';
import { standardChecks, maxGap, range } from '../../../core/checks.js';
import { constellation } from '../_lib/modulation.js';

const BASE = {
  mod: 'qpsk',
  h: [1, 0.5, -0.2],
  phi: 0,
  snr: 25,
  L: 11,
  mu: 0.002,
  n: N,
  seed: 34,
};

export const checks = [
  {
    // THE ALIGNMENT OF THE TIME FIGURE, pinned against the one channel whose
    // answer is known: a single unit tap and no carrier offset, where what
    // arrives IS what was sent. Anything else — an index taken before the
    // equalizer's window, a slice off by the channel length — still draws two
    // plausible stem trains, one smeared, and quietly shows two different
    // symbols side by side. Only an identity channel can tell.
    name: 'time figure: through h = [1], what arrives is what was sent',
    category: 'numeric',
    run() {
      const { observables: o } = compute({ ...BASE, h: [1], phi: 0, snr: 60 });
      let worst = 0;
      for (let i = 0; i < o.txI.y.length; i++) {
        worst = Math.max(worst, Math.abs(o.rxI.y[i] - o.txI.y[i]));
        worst = Math.max(worst, Math.abs(o.rxQ.y[i] - o.txQ.y[i]));
      }
      // σ per quadrature at 60 dB on a unit-gain channel is √(1/10⁶/2) ≈ 7·10⁻⁴;
      // 6σ is the bound a correct alignment cannot cross and a wrong one
      // clears by two orders of magnitude (the symbols differ by ~1.4)
      return { ok: worst < 6 * Math.sqrt(0.5e-6), detail: `max|rx−tx|=${worst.toExponential(2)}` };
    },
  },
  {
    // And the received stems ARE the cloud on the constellation tab, read at
    // the same instants — the two tabs must show one signal.
    name: 'time figure: the received stems are the constellation, sample for sample',
    category: 'numeric',
    run() {
      const { observables: o } = compute({ ...BASE });
      let bad = 0;
      for (let i = 0; i < o.rxI.y.length; i++)
        if (o.rxI.y[i] !== o.received.x[i] || o.rxQ.y[i] !== o.received.y[i]) bad++;
      return { ok: bad === 0, detail: `${o.rxI.y.length} samples, ${bad} disagreeing` };
    },
  },
  {
    name: 'R₂ = 1 for every PSK, and exactly 1.32 for the 16-QAM',
    category: 'numeric',
    run() {
      // The constant the whole algorithm aims at, and it is not a tabulated
      // number: R₂ = E|s|⁴/E|s|² is enumerated over a unit-energy
      // constellation. A PSK has |s| = 1, so every moment is 1 and R₂ is 1. The
      // 16-QAM on levels ±1, ±3 over √10 gives E|s|⁴ = 1.32 exactly — the
      // fraction is 33/25, so 1e-15 is the right tolerance, not 1e-3.
      const want = { qpsk: 1, '8psk': 1, '16qam': 1.32 };
      const bad = [];
      for (const [mod, w] of Object.entries(want)) {
        const got = dispersionR2(mod);
        if (Math.abs(got - w) > 1e-15) bad.push(`${mod}: ${got}`);
      }
      return {
        ok: bad.length === 0,
        detail: bad.length ? bad.join(' · ') : 'R₂ = 1, 1, 1.32 to 1e-15',
      };
    },
  },
  {
    name: 'the cost floor splits into spread + offset — 0 on PSK, 0.4224 on 16-QAM',
    category: 'numeric',
    run() {
      // THE identity of the experiment. A perfect equalizer delivers y = s, so
      // the cost it still pays is E[(|s|²−R₂)²].
      //
      // Written here as the harness first refused it: that quantity is NOT the
      // variance of |s|². It is the second moment about R₂, and R₂ = E|s|⁴/E|s|²
      // is 1.32 on the 16-QAM while E|s|² is 1. The exact decomposition is
      //
      //     E[(|s|²−R₂)²] = Var(|s|²) + (E|s|² − R₂)²
      //
      // — 0.32 + 0.1024 = 0.4224 — a spread term plus an offset term, both zero
      // exactly when the modulus is constant. That is the constant-modulus
      // CONDITION written as a number rather than asserted as a preference.
      const bad = [];
      for (const [mod, w] of Object.entries({ qpsk: 0, '8psk': 0, '16qam': 0.4224 })) {
        const got = costFloor(mod);
        if (Math.abs(got - w) > 1e-15) bad.push(`${mod}: ${got}`);
        // and the decomposition, straight from the definition
        const pts = constellation(mod);
        const r2 = dispersionR2(mod);
        const m2 = pts.map((p) => p.x * p.x + p.y * p.y);
        const mean = (a) => a.reduce((s, v) => s + v, 0) / a.length;
        const spread = mean(m2.map((v) => v * v)) - mean(m2) ** 2;
        const offset = (mean(m2) - r2) ** 2;
        if (Math.abs(got - (spread + offset)) > 1e-15)
          bad.push(`${mod}: ${got} ≠ ${spread} + ${offset}`);
      }
      return {
        ok: bad.length === 0,
        detail: bad.length
          ? bad.join(' · ')
          : 'floor = spread + offset: 0, 0 and 0.32 + 0.1024 = 0.4224, to 1e-15',
      };
    },
  },
  {
    name: 'the cost is INVARIANT to a rotation of the equalizer — exactly',
    category: 'numeric',
    run() {
      // Why the algorithm cannot recover the phase, proved rather than shown:
      // J depends on |y| and |w·e^{jφ}·x| = |w·x|, so rotating an equalizer
      // costs nothing at all. Every rotated solution is the same minimum, and
      // there is no gradient anywhere along that circle.
      //
      // Verified on the actual cost, on a real received sequence, not on the
      // formula: an arbitrary w, an arbitrary x, and a sweep of φ.
      const pts = constellation('qpsk');
      const r2 = dispersionR2('qpsk');
      const L = 7;
      const wr = Float64Array.from(range(L), (k) => Math.cos(0.7 * k) * 0.6);
      const wi = Float64Array.from(range(L), (k) => Math.sin(1.3 * k) * 0.4);
      const M = 400;
      const xre = Float64Array.from(range(M + L), (i) => pts[i % 4].x + 0.05 * Math.cos(i));
      const xim = Float64Array.from(range(M + L), (i) => pts[i % 4].y + 0.05 * Math.sin(i));

      const cost = (ar, ai) => {
        let j = 0;
        for (let i = 0; i < M; i++) {
          let yr = 0;
          let yi = 0;
          for (let k = 0; k < L; k++) {
            const a = xre[i + L - 1 - k];
            const b = xim[i + L - 1 - k];
            yr += ar[k] * a - ai[k] * b;
            yi += ar[k] * b + ai[k] * a;
          }
          j += (yr * yr + yi * yi - r2) ** 2 / M;
        }
        return j;
      };

      const ref = cost(wr, wi);
      const worst = maxGap(
        [0, 17, 45, 90, 137, 180, 271],
        (deg) => {
          const a = (deg * Math.PI) / 180;
          const c = Math.cos(a);
          const s = Math.sin(a);
          const rr = Float64Array.from(range(L), (k) => wr[k] * c - wi[k] * s);
          const ri = Float64Array.from(range(L), (k) => wr[k] * s + wi[k] * c);
          return cost(rr, ri);
        },
        () => ref
      );
      return {
        ok: worst < 1e-12,
        detail: `max|J(w·e^{jφ}) − J(w)| = ${worst.toExponential(2)} over 7 angles`,
      };
    },
  },
  {
    name: 'a zero-forcing equalizer leaves no ISI, whatever the carrier phase',
    category: 'numeric',
    run() {
      // The measure the third view reads must mean what it claims. A channel
      // composed with its exact inverse is a pure delay, so the residual ISI is
      // zero — and it stays zero when the whole thing is rotated, since a
      // rotation multiplies every tap by the same unit number.
      // The inverse of an FIR channel is IIR, so it can only be truncated: the
      // residue decays like the slowest root of h, ≈ 0.763 per tap here, and the
      // ISI (a ratio of POWERS) therefore falls like 0.763^{2L}. At L = 24 that
      // leaves ~1.3e-6, which is truncation and not a defect — 48 taps put it
      // below 1e-9, and the tolerance is set from that law rather than guessed.
      const taps = [1, 0.5, -0.2];
      const L = 48;
      const wr = new Float64Array(L);
      wr[0] = 1 / taps[0];
      for (let k = 1; k < L; k++) {
        let a = 0;
        for (let i = 1; i < taps.length && i <= k; i++) a += taps[i] * wr[k - i];
        wr[k] = -a / taps[0];
      }
      const wi = new Float64Array(L);
      const bad = [];
      for (const phi of [0, 33, -80]) {
        const ch = carrier(taps, phi);
        const c = combined(ch.re, ch.im, wr, wi);
        const isi = isiOf(c.re, c.im);
        if (isi > 1e-9) bad.push(`φ=${phi}: ISI ${isi.toExponential(1)}`);
      }
      return {
        ok: bad.length === 0,
        detail: bad.length ? bad.join(' · ') : 'ISI < 1e-9 at φ = 0, 33 and −80° (48 taps)',
      };
    },
  },
  {
    name: 'blind convergence: the CMA undoes the channel with no reference at all',
    category: 'numeric',
    run() {
      // The claim of the experiment, measured. Deterministic at a fixed seed, so
      // this is an exact statement about a reproducible run and not a tendency:
      // the residual ISI must fall by more than an order of magnitude between
      // the centre spike and the converged equalizer.
      const start = compute({ ...BASE, n: 0 }).observables;
      const end = compute(BASE).observables;
      return {
        ok: end.isi.value < 0.05 && end.isi.value < start.isi.value / 10,
        detail:
          `ISI ${start.isi.value.toFixed(3)} → ${end.isi.value.toFixed(4)} ` +
          `(cost ${start.cost.y[0].toFixed(3)} → ${end.cost.y[N - 1].toFixed(4)})`,
      };
    },
  },
  {
    name: 'the residual rotation follows the carrier, and the ISI ignores it',
    category: 'numeric',
    run() {
      // The two halves of the phase ambiguity, and they must BOTH hold: the
      // constellation comes out turned by exactly the angle the receiver did not
      // know, and the quality of the equalization does not depend on that angle.
      // If only the first held, the rotation would be a defect; because the
      // second holds too, it is an invariance.
      const bad = [];
      const isi = [];
      for (const phi of [0, 35, 70, -50]) {
        const o = compute({ ...BASE, phi }).observables;
        if (Math.abs(o.phase.value - phi) > 2)
          bad.push(`φ=${phi}: rotation ${o.phase.value.toFixed(1)}°`);
        isi.push(o.isi.value);
      }
      const spread = Math.max(...isi) - Math.min(...isi);
      if (spread > 1e-3) bad.push(`ISI spread ${spread.toExponential(1)}`);
      return {
        ok: bad.length === 0,
        detail: bad.length
          ? bad.join(' · ')
          : `rotation = φ ± 2° at 0, 35, 70, −50° · ISI ${isi[0].toFixed(4)} ± ${spread.toExponential(1)}`,
      };
    },
  },
  {
    name: 'on 16-QAM the cost stops ABOVE its floor, and the floor is the reason',
    category: 'numeric',
    run() {
      // The scene-3 claim, verified end to end. On a PSK the cost goes far below
      // what the 16-QAM can ever reach; on the 16-QAM it settles above a floor
      // that no step size can cross, since the floor comes from the
      // constellation and not from the algorithm.
      // Sharpened once the learning curve was averaged properly: the 16-QAM
      // cost does not merely stay ABOVE its floor, it converges ONTO it — 0.4244
      // against 0.4224, within a percent. That is the strong form of the claim,
      // and the one worth defending: the floor is where the algorithm ends up,
      // not a bound it happens to respect.
      const psk = compute(BASE).observables;
      const qam = compute({ ...BASE, mod: '16qam', snr: 30 }).observables;
      const floor = qam.floor.value;
      return {
        ok:
          psk.floor.value === 0 &&
          psk.cost.y[N - 1] < 0.1 &&
          qam.cost.y[N - 1] > floor &&
          qam.cost.y[N - 1] < floor * 1.05,
        detail:
          `QPSK: floor 0, cost ${psk.cost.y[N - 1].toFixed(4)} · ` +
          `16-QAM: floor ${floor.toFixed(4)}, cost ${qam.cost.y[N - 1].toFixed(4)}`,
      };
    },
  },
  standardChecks.determinism(compute, BASE, 'cost'),
  standardChecks.determinism(compute, { ...BASE, mod: '16qam' }, 'cloud'),
];
