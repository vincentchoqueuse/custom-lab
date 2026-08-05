import {
  compute,
  drawSymbol,
  oversample,
  meanPower,
  paprAt,
  harmonic,
  ccdfTheory,
} from './compute.js';
import { standardChecks, maxAbsDiff, range } from '../../../core/checks.js';
import { mulberry32, gaussFrom } from '../../../core/rng.js';

const BASE = { N: 64, L: 4, mod: 'qpsk', M: 400, seed: 34 };

export const checks = [
  {
    // THE identity the whole experiment rests on, and the one that makes it
    // affordable: oversampling INTERPOLATES, it does not resample. Every
    // critically sampled value must reappear, bit for bit, among the
    // oversampled ones — which is what lets one transform answer every L at
    // once, and what makes "the peak between the samples" a statement about
    // the same signal rather than about two different draws.
    //
    // It pins the zero-padding layout AND the scaling together: put the zeros
    // anywhere but the middle, or normalize by √(LN) instead of √N, and this
    // fails immediately while every picture still looks plausible.
    name: 'oversampling interpolates: x_L[L·n] = x_1[n], exactly',
    category: 'numeric',
    run() {
      const rng = mulberry32(7);
      let worst = 0;
      for (const N of [16, 64, 256]) {
        const X = drawSymbol(N, '16qam', rng);
        const x1 = oversample(X.re, X.im, 1);
        for (const L of [2, 4, 8, 16]) {
          const xL = oversample(X.re, X.im, L);
          for (let n = 0; n < N; n++) {
            worst = Math.max(worst, Math.abs(xL.re[L * n] - x1.re[n]));
            worst = Math.max(worst, Math.abs(xL.im[L * n] - x1.im[n]));
          }
        }
      }
      return { ok: worst < 1e-12, detail: `max|x_L[Ln]−x_1[n]|=${worst.toExponential(2)}` };
    },
  },
  {
    // Parseval, and the reason the average power is read off the SPECTRUM: it
    // is the same number at every oversampling, so the PAPR's denominator
    // cannot drift with L. If it could, the whole comparison would be between
    // two differently normalized quantities and the gap would mean nothing.
    name: 'the average power is (1/N)Σ|X_k|², at every L',
    category: 'numeric',
    run() {
      const rng = mulberry32(11);
      let worst = 0;
      for (const N of [16, 64, 256])
        for (const mod of ['qpsk', '16qam']) {
          const X = drawSymbol(N, mod, rng);
          const pm = meanPower(X.re, X.im);
          for (const L of [1, 2, 4, 8]) {
            const x = oversample(X.re, X.im, L);
            let p = 0;
            for (let i = 0; i < x.re.length; i++) p += x.re[i] ** 2 + x.im[i] ** 2;
            worst = Math.max(worst, Math.abs(p / x.re.length - pm));
          }
        }
      return { ok: worst < 1e-12, detail: `max|P̄−(1/N)Σ|X|²|=${worst.toExponential(2)}` };
    },
  },
  {
    // MONOTONE IN L, per symbol, with no tolerance at all — the samples read at
    // L are a subset of those read at 2L, and a maximum over a larger set
    // cannot be smaller. This is the claim the first scene makes ("oversampling
    // never finds LESS than the IFFT did"), and it is a theorem, not a trend.
    name: 'PAPR never decreases with L — symbol by symbol',
    category: 'numeric',
    run() {
      const rng = mulberry32(13);
      let violations = 0;
      let gain = 0;
      for (let s = 0; s < 200; s++) {
        const X = drawSymbol(64, 'qpsk', rng);
        const pm = meanPower(X.re, X.im);
        const x = oversample(X.re, X.im, 16);
        // strides 16, 8, 4, 2, 1 read L = 1, 2, 4, 8, 16 off one transform
        let prev = -Infinity;
        for (const stride of [16, 8, 4, 2, 1]) {
          const v = paprAt(x.re, x.im, stride, pm);
          if (v < prev - 1e-12) violations++;
          prev = v;
        }
        gain = Math.max(gain, prev / paprAt(x.re, x.im, 16, pm));
      }
      return {
        ok: violations === 0,
        detail: `200 symbols, ${violations} violations, worst L=1 shortfall ${(10 * Math.log10(gain)).toFixed(2)} dB`,
      };
    },
  },
  {
    // The worst case is not a figure of speech: put every carrier in phase and
    // the time signal is a delta of height √N, giving PAPR = N exactly. It is
    // the grey line of the growth view, and it is checked so that the line and
    // the definition cannot part company.
    name: 'all carriers in phase gives PAPR = N, exactly',
    category: 'numeric',
    run() {
      let worst = 0;
      for (const N of [16, 64, 256]) {
        const re = new Float64Array(N).fill(1);
        const im = new Float64Array(N);
        const pm = meanPower(re, im); // = 1
        for (const L of [1, 4]) {
          const x = oversample(re, im, L);
          worst = Math.max(worst, Math.abs(paprAt(x.re, x.im, 1, pm) - N) / N);
        }
      }
      return { ok: worst < 1e-12, detail: `max relative error ${worst.toExponential(2)}` };
    },
  },
  {
    // The model's mean is the harmonic number, and the harmonic number is a sum
    // — not ln N + γ, which is where it is heading. The check pins the
    // implementation against the definition, and then against the asymptotic it
    // must approach but never equal: H_N − (ln N + γ) → 1/(2N).
    name: 'H_N is the sum, and approaches ln N + γ + 1/(2N)',
    category: 'numeric',
    run() {
      const GAMMA = 0.5772156649015329;
      const direct = (n) => range(n, (i) => 1 / (i + 1)).reduce((a, b) => a + b, 0);
      const exact = maxAbsDiff(
        [1, 2, 7, 64, 1024].map(harmonic),
        [1, 2, 7, 64, 1024].map(direct)
      );
      // the asymptotic error, which must fall like 1/(2N) and does
      const asym = [64, 256, 1024].map(
        (n) => Math.abs(harmonic(n) - (Math.log(n) + GAMMA)) * 2 * n
      );
      const near1 = Math.max(...asym.map((a) => Math.abs(a - 1)));
      return {
        ok: exact < 1e-12 && near1 < 0.02,
        detail: `|H−Σ|=${exact.toExponential(2)}, 2N·(H−ln N−γ)→${asym[2].toFixed(4)}`,
      };
    },
  },
  {
    // The CCDF the views draw is the distribution the mean check assumes. Its
    // two ends are exact: nothing is ever below zero, and everything is below
    // the worst case. A model that disagreed with its own support would sit
    // over the measurement looking convincing.
    name: 'the model CCDF runs from 1 to 0 and is monotone',
    category: 'numeric',
    run() {
      const bad = [];
      for (const n of [64, 179, 2867]) {
        if (Math.abs(ccdfTheory(0, n) - 1) > 1e-12) bad.push(`P(>0)≠1 at n=${n}`);
        if (ccdfTheory(80, n) > 1e-12) bad.push(`P(>80)≉0 at n=${n}`);
        let prev = 2;
        for (let i = 0; i <= 200; i++) {
          const v = ccdfTheory(i * 0.1, n);
          if (v > prev + 1e-15) bad.push(`rises at γ=${(i * 0.1).toFixed(1)}, n=${n}`);
          prev = v;
        }
      }
      return { ok: bad.length === 0, detail: bad.slice(0, 2).join(' · ') || 'monotone on three n' };
    },
  },
  {
    // THE SCIENCE, against the closed form — and against the model's OWN
    // assumption, which is the only way to pin the machinery without the
    // approximation getting in the way. Feed the subcarriers complex Gaussian
    // symbols, and the IFFT output is exactly complex Gaussian: no central
    // limit theorem is being invoked, the samples ARE the model, and the mean
    // PAPR must be H_N. Everything in the chain is under test at once —
    // the zero-padding, the scaling, the power denominator, the maximum, and
    // the harmonic number itself.
    //
    // The tolerance is derived. By Rényi's representation the maximum of N iid
    // Exp(1) is distributed as Σ_{k≤N} E_k/k, so its variance is Σ_{k≤N} 1/k²
    // — which tends to π²/6 and is NOT π²/6 minus that sum, a slip that made
    // this bound eight times too tight on the first attempt and turned a 1.4σ
    // agreement into an 11σ failure.
    name: 'with Gaussian subcarriers the mean PAPR is H_N (the model, exactly)',
    category: 'statistical',
    run() {
      const M = 4000;
      const bad = [];
      let worstZ = 0;
      for (const N of [64, 256]) {
        const gauss = gaussFrom(mulberry32(4242 + N));
        let acc = 0;
        for (let s = 0; s < M; s++) {
          const re = new Float64Array(N);
          const im = new Float64Array(N);
          for (let k = 0; k < N; k++) {
            re[k] = gauss() / Math.SQRT2;
            im[k] = gauss() / Math.SQRT2;
          }
          const x = oversample(re, im, 1);
          acc += paprAt(x.re, x.im, 1, meanPower(re, im));
        }
        let v = 0;
        for (let k = 1; k <= N; k++) v += 1 / k ** 2;
        const se = Math.sqrt(v / M);
        const z = Math.abs(acc / M - harmonic(N)) / se;
        worstZ = Math.max(worstZ, z);
        if (z > 4) bad.push(`N=${N}: ${(acc / M).toFixed(4)} vs ${harmonic(N).toFixed(4)} (${z.toFixed(1)}σ)`);
      }
      return { ok: bad.length === 0, detail: bad.join(' · ') || `worst deviation ${worstZ.toFixed(2)}σ` };
    },
  },
  {
    // AND WHAT THE CLT COSTS AT FINITE N, stated rather than hidden. A real
    // OFDM symbol carries a constellation, not Gaussian noise, and a sum of N
    // constant-modulus phasors is not Gaussian. The measured mean PAPR is
    // therefore ABOVE H_N — by 0.11 at N = 16, 0.06 at 64, 0.02 at 256 — and
    // the excess shrinks as N grows, which is the central limit theorem being
    // seen rather than assumed.
    //
    // This started life as a failing check with a tolerance one could have
    // widened. Measuring it instead — the model against itself, a Gaussian
    // input, a QPSK input and a 16-QAM input, forty thousand symbols each —
    // showed the machinery exact and the approximation biased, which is a
    // different fact and the one worth keeping. The bias is under 0.06 dB at
    // the N this experiment defaults to, so the drawn curves are unaffected.
    name: 'a real constellation sits ABOVE H_N, and converges to it',
    category: 'statistical',
    run() {
      // 20 000 symbols: at 4 000 the excess at N = 256 is 0.02 against a
      // standard error of 0.02, so the check could not have told the effect
      // from the noise and asserted a sign it had not measured.
      const M = 20000;
      const excess = [16, 64, 256].map((N) => {
        const rng = mulberry32(909 + N);
        let acc = 0;
        for (let s = 0; s < M; s++) {
          const X = drawSymbol(N, 'qpsk', rng);
          const x = oversample(X.re, X.im, 1);
          acc += paprAt(x.re, x.im, 1, meanPower(X.re, X.im));
        }
        return acc / M - harmonic(N);
      });
      // SE of a mean of M maxima: Σ1/k² per draw, at most π²/6.
      const se = Math.sqrt(1.6449 / M);
      // Two claims, both far outside the Monte-Carlo error, and no more than
      // the data supports: the constellation is above the model where the CLT
      // is weakest, and it has come closer by N = 256.
      const risesAbove = excess[0] > 4 * se;
      const converges = excess[0] - excess[2] > 4 * se * Math.SQRT2;
      return {
        ok: risesAbove && converges,
        detail:
          `excess over H_N: ${excess.map((e) => e.toFixed(3)).join(' → ')} ` +
          `at N = 16, 64, 256 (σ = ${se.toFixed(3)})`,
      };
    },
  },
  {
    // The curves the views draw must EXIST and be finite. A NaN reproduces
    // perfectly at a fixed seed, so the determinism check below is blind to it
    // — this is the lesson the MIMO experiment paid for once already.
    name: 'every drawn curve is finite, and ordered as the physics says',
    category: 'numeric',
    run() {
      const { observables: o } = compute({ ...BASE, N: 256 });
      const bad = [];
      for (const k of ['vsL', 'vsN', 'thN', 'thAlpha', 'worst', 'ccdf', 'envelope']) {
        const c = o[k];
        if (!c?.y?.length) bad.push(`${k} is empty`);
        else if (![...c.y].every(Number.isFinite)) bad.push(`${k} holds a non-finite value`);
      }
      // the worst case is above both models, everywhere, by construction
      for (let i = 0; i < o.worst.y.length; i++) {
        if (!(o.worst.y[i] > o.thAlpha.y[i] && o.thAlpha.y[i] > o.thN.y[i]))
          bad.push(`at N=${o.vsN.x[i]}: worst/fit/model out of order`);
      }
      // and the measured PAPR is never below what the IFFT alone reported
      if (o.hidden.value < -1e-9) bad.push(`oversampling reported ${o.hidden.value} dB less`);
      return {
        ok: bad.length === 0,
        detail: bad.slice(0, 2).join(' · ') || `7 curves finite, ${o.vsN.x.length} N points ordered`,
      };
    },
  },
  standardChecks.determinism(compute, { ...BASE, N: 128, M: 200 }, 'vsN'),
];
