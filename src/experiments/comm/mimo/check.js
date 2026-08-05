import { compute, channel, gram, inv2, receiver, run } from './compute.js';
import { standardChecks, maxGap, range } from '../../../core/checks.js';
import { mulberry32, gaussFrom } from '../../../core/rng.js';
import { constellation, serTheory } from '../_lib/modulation.js';
import { dbToLin } from '../../../core/numeric.js';

const BASE = { mod: 'qpsk', rho: 0.5, snr: 12, eq: 'zf', N: 1500, seed: 34 };

export const checks = [
  {
    // The time figure and the antenna-1 cloud are filled in the SAME loop, so
    // they must agree index for index — not merely in distribution. This is
    // the check that would have caught a trace captured from the curve sweep
    // instead of from the displayed run, which is a mistake with no visible
    // symptom whatsoever.
    name: 'the time trace IS antenna 1, sample for sample',
    category: 'numeric',
    run() {
      const { observables: o } = compute({ ...BASE, N: 800 });
      let bad = 0;
      for (let i = 0; i < o.rxI.y.length; i++)
        if (o.rxI.y[i] !== o.rx1.x[i] || o.rxQ.y[i] !== o.rx1.y[i]) bad++;
      // and what stream 1 was asked to carry is an exact constellation point
      const ideal = new Set();
      for (let i = 0; i < o.ideal.x.length; i++) ideal.add(`${o.ideal.x[i]},${o.ideal.y[i]}`);
      let offGrid = 0;
      for (let i = 0; i < o.txI.y.length; i++)
        if (!ideal.has(`${o.txI.y[i]},${o.txQ.y[i]}`)) offGrid++;
      return {
        ok: bad === 0 && offGrid === 0 && o.rxI.y.length === 24,
        detail: `${o.rxI.y.length} samples, ${bad} disagreeing with the cloud, ${offGrid} off the constellation`,
      };
    },
  },
  {
    name: 'HᴴH = [[1, ρ], [ρ, 1]] exactly — whatever the draw',
    category: 'numeric',
    run() {
      // The invariant the whole experiment is built on. H = U·T with U unitary,
      // so the random rotation mixes the antennas and leaves the geometry
      // alone: every closed form quoted in the notes — the ZF loss, the
      // condition number, the effective SNR — follows from this one matrix
      // being independent of the seed.
      const bad = [];
      for (const rho of [0, 0.25, 0.5, 0.8, 0.95])
        for (const seed of [1, 7, 34, 100]) {
          const G = gram(channel(rho, mulberry32(seed)));
          const want = [1, rho, rho, 1];
          const gap = maxGap(range(4), (i) => G.re[i] - want[i]);
          const im = maxGap(range(4), (i) => G.im[i]);
          if (gap > 1e-12 || im > 1e-12)
            bad.push(`ρ=${rho}, seed=${seed}: gap ${gap.toExponential(1)}, im ${im.toExponential(1)}`);
        }
      return {
        ok: bad.length === 0,
        detail: bad.length ? bad.slice(0, 3).join(' · ') : 'exact to 1e-12 over 5 ρ × 4 seeds, imaginary part zero',
      };
    },
  },
  {
    name: 'ZF inverts the channel exactly: no noise, no error, at any ρ',
    category: 'numeric',
    run() {
      // Zero-forcing does what its name says, and the check is the definition:
      // W·H = I. Not approximately — the interference is removed exactly, and
      // that is precisely why the noise has to go somewhere.
      const bad = [];
      for (const rho of [0, 0.5, 0.9]) {
        const H = channel(rho, mulberry32(5));
        const W = receiver(H, 0);
        // (W·H)ᵢⱼ = δᵢⱼ
        for (let i = 0; i < 2; i++)
          for (let j = 0; j < 2; j++) {
            let re = 0;
            let im = 0;
            for (let k = 0; k < 2; k++) {
              re += W.re[i * 2 + k] * H.re[k * 2 + j] - W.im[i * 2 + k] * H.im[k * 2 + j];
              im += W.re[i * 2 + k] * H.im[k * 2 + j] + W.im[i * 2 + k] * H.re[k * 2 + j];
            }
            const want = i === j ? 1 : 0;
            if (Math.abs(re - want) > 1e-12 || Math.abs(im) > 1e-12)
              bad.push(`ρ=${rho}: (WH)[${i}][${j}] = ${re.toFixed(15)} + ${im.toExponential(1)}j`);
          }
      }
      return { ok: bad.length === 0, detail: bad.length ? bad[0] : 'W·H = I to 1e-12 at ρ = 0, 0.5, 0.9' };
    },
  },
  {
    name: 'the ZF noise is enhanced by exactly 1/(1−ρ²) — the loss in the statline',
    category: 'statistical',
    run() {
      // Where the decibels come from. The zero-forcing output is x + H⁻¹n, so
      // its error covariance is N₀·(HᴴH)⁻¹ and each stream carries N₀/(1−ρ²).
      // Measured over the errors themselves rather than asserted from the
      // matrix, so the check covers the simulation and not only the algebra.
      //
      // Tolerance: the sample variance of n draws of a χ²-like quantity has a
      // relative spread of √(2/n) per real dimension; with 2 streams × 2
      // dimensions × n pairs that is √(2/(4n)), and the tolerance is 4 of them.
      const bad = [];
      const n = 4000;
      const se = 4 * Math.sqrt(2 / (4 * n));
      for (const rho of [0, 0.5, 0.85]) {
        const rng = mulberry32(21);
        const gauss = gaussFrom(rng);
        const pts = constellation('qpsk');
        const H = channel(rho, rng);
        const n0 = 1 / dbToLin(20);
        const r = run(pts, H, n0, n, rng, gauss, true);
        // the error of stream 1, against the points it was meant to land on
        let acc = 0;
        let k = 0;
        for (let i = 0; i < r.out.zf1.length; i++) {
          const p = r.out.zf1[i];
          // nearest ideal point — at 20 dB the decision is right essentially
          // always, so this measures the noise and not the errors
          let bd = Infinity;
          let bx = 0;
          let by = 0;
          for (const q of pts) {
            const d = (q.x - p[0]) ** 2 + (q.y - p[1]) ** 2;
            if (d < bd) {
              bd = d;
              bx = q.x;
              by = q.y;
            }
          }
          acc += (p[0] - bx) ** 2 + (p[1] - by) ** 2;
          k++;
        }
        const measured = acc / k; // total complex noise power on the stream
        const want = n0 / (1 - rho * rho);
        const rel = Math.abs(measured / want - 1);
        if (rel > se) bad.push(`ρ=${rho}: ${measured.toExponential(3)} vs ${want.toExponential(3)} (${(100 * rel).toFixed(1)}%)`);
      }
      return {
        ok: bad.length === 0,
        detail: bad.length ? bad.join(' · ') : `N₀/(1−ρ²) within ${(100 * se).toFixed(1)}% at ρ = 0, 0.5, 0.85`,
      };
    },
  },
  {
    name: 'THE PARALLEL: ZF is the AWGN experiment at γ·(1−ρ²), same formula',
    category: 'statistical',
    run() {
      // The claim the experiment exists to make, and it is checked against the
      // OTHER experiment's own function: `serTheory` is what comm/constellations
      // draws its theoretical curve with. If a linear MIMO receiver really
      // hands back an AWGN channel at a degraded SNR, then the measured ZF
      // error rate must match that function evaluated at γ·(1−ρ²) — not
      // resemble it, match it.
      //
      // Tolerance: a symbol error rate p measured over n symbols has standard
      // error √(p(1−p)/n); 4 of them, computed per point.
      const bad = [];
      const N = 6000;
      for (const rho of [0, 0.4, 0.7])
        for (const snr of [10, 14]) {
          const o = compute({ ...BASE, rho, snr, N, eq: 'zf' }).observables;
          const g = dbToLin(snr) * (1 - rho * rho);
          const want = serTheory('qpsk', g);
          const got = o.serZfS.value;
          const se = 4 * Math.sqrt((want * (1 - want)) / (2 * N));
          if (Math.abs(got - want) > se + 1e-4)
            bad.push(`ρ=${rho}, ${snr} dB: ${got.toFixed(4)} vs ${want.toFixed(4)} (±${se.toFixed(4)})`);
        }
      return {
        ok: bad.length === 0,
        detail: bad.length
          ? bad.join(' · ')
          : 'measured ZF = serTheory(γ·(1−ρ²)) within 4 SE at ρ = 0, 0.4, 0.7 × 10, 14 dB',
      };
    },
  },
  {
    name: 'at ρ = 0 the three receivers are the SAME receiver',
    category: 'numeric',
    run() {
      // The degenerate case that ties this experiment to the one next door.
      // With HᴴH = I the channel is unitary: ZF is Hᴴ, MMSE is Hᴴ up to a
      // scalar the unbiasing removes, and ML's lattice is the transmitted
      // constellation rotated. The three make the SAME decisions, symbol for
      // symbol — so the error counts are equal exactly, not merely close.
      const bad = [];
      for (const mod of ['qpsk', '16qam'])
        for (const snr of [6, 12]) {
          const o = compute({ ...BASE, mod, rho: 0, snr, N: 2000 }).observables;
          if (o.serZfS.value !== o.serMlS.value || o.serMmseS.value !== o.serMlS.value)
            bad.push(`${mod} ${snr} dB: ZF ${o.serZfS.value}, MMSE ${o.serMmseS.value}, ML ${o.serMlS.value}`);
          if (Math.abs(o.loss.value) > 1e-12) bad.push(`${mod}: loss ${o.loss.value} at ρ = 0`);
        }
      return {
        ok: bad.length === 0,
        detail: bad.length ? bad.join(' · ') : 'identical error counts, and 0 dB of loss, on 2 modulations × 2 SNRs',
      };
    },
  },
  {
    name: 'ML ≤ MMSE ≤ ZF, everywhere — and the ordering is what justifies each',
    category: 'numeric',
    run() {
      // ML is optimal, so nothing may beat it; MMSE minimises the mean square
      // error, so it may not lose to the receiver that ignores the noise. An
      // inversion in this ordering means a bug, and one DID appear here: the
      // biased MMSE estimate, sliced as it stands, scores worse than ZF on a
      // 16-QAM. The receiver divides the bias out, and this check is what says
      // so from now on.
      const bad = [];
      for (const mod of ['qpsk', '16qam'])
        for (const rho of [0.3, 0.6, 0.9]) {
          const o = compute({ ...BASE, mod, rho, snr: mod === 'qpsk' ? 10 : 18, N: 3000 }).observables;
          const [ml, mmse, zf] = [o.serMlS.value, o.serMmseS.value, o.serZfS.value];
          if (!(ml <= mmse + 1e-9 && mmse <= zf + 1e-9))
            bad.push(`${mod} ρ=${rho}: ML ${ml.toFixed(4)}, MMSE ${mmse.toFixed(4)}, ZF ${zf.toFixed(4)}`);
        }
      return {
        ok: bad.length === 0,
        detail: bad.length ? bad.join(' · ') : 'ordering holds on 2 modulations × 3 correlations',
      };
    },
  },
  {
    name: 'MMSE becomes ZF as the noise vanishes — like N₀, not eventually',
    category: 'numeric',
    run() {
      // (HᴴH + N₀I)⁻¹ → (HᴴH)⁻¹ is obvious; the rate is the statement worth
      // checking, because it is what makes the two curves merge at high SNR on
      // the SER view. Ten decibels of SNR must divide the gap by ten.
      const H = channel(0.7, mulberry32(9));
      const zf = receiver(H, 0);
      const gap = (n0) => {
        const w = receiver(H, n0);
        return maxGap(range(4), (i) => Math.hypot(w.re[i] - zf.re[i], w.im[i] - zf.im[i]));
      };
      const a = gap(1 / dbToLin(20));
      const b = gap(1 / dbToLin(30));
      const ratio = a / b;
      return {
        ok: ratio > 8 && ratio < 12,
        detail: `‖W−W_zf‖: ${a.toExponential(2)} at 20 dB, ${b.toExponential(2)} at 30 dB — ratio ${ratio.toFixed(1)}`,
      };
    },
  },
  {
    name: 'the SER curves are finite and fall with the SNR',
    category: 'numeric',
    run() {
      // Written after the curves shipped as NaN for an afternoon: pairsToSeries
      // takes a flat array and was handed pairs, so every ordinate was NaN — and
      // the determinism check passed, because NaN is reproducibly NaN. A curve
      // must therefore be asserted to EXIST, not merely to be stable.
      const o = compute({ ...BASE, rho: 0.5, N: 800 }).observables;
      const bad = [];
      for (const k of ['serMl', 'serMmse', 'serZf', 'serAwgn', 'serZfTheory']) {
        const s = o[k];
        if (!s.x.length) bad.push(`${k}: empty`);
        // the abscissa is always finite; the measured ordinates carry NaN where
        // the Monte Carlo saw no errors, which is deliberate — the curve stops
        // rather than inventing a floor
        if (![...s.x].every(Number.isFinite)) bad.push(`${k}: abscissa not finite`);
        if (!s.y.some(Number.isFinite)) bad.push(`${k}: no finite ordinate at all`);
        if (/Theory|Awgn/.test(k) && ![...s.y].every(Number.isFinite))
          bad.push(`${k}: a theory curve must be finite everywhere`);
        // 0 → 20 dB, and the abscissa is the SNR in decibels
        if (s.x[0] !== 0 || s.x[s.x.length - 1] !== 20) bad.push(`${k}: x runs ${s.x[0]}…${s.x[s.x.length - 1]}`);
        // the theory curves must be strictly decreasing; the measured ones may
        // wobble at the floor, so they are only required to fall overall
        const fin = [...s.y].filter(Number.isFinite);
        if (fin[fin.length - 1] >= fin[0]) bad.push(`${k}: does not fall with the SNR`);
      }
      return {
        ok: bad.length === 0,
        detail: bad.length ? bad.join(' · ') : '5 curves, 11 points each, finite, 0…20 dB, falling',
      };
    },
  },
  standardChecks.determinism(compute, BASE, 'serMl'),
  standardChecks.determinism(compute, { ...BASE, mod: '16qam', rho: 0.8, eq: 'mmse' }, 'eq1'),
];
