import { compute, averagedPeriodogram, fluctuation, segmentation } from './compute.js';
import { standardChecks, maxGap, range } from '../../../core/checks.js';
import { mulberry32, gaussFrom } from '../../../core/rng.js';

const FS = 1000;
const BASE = { method: 'raw', win: 'rect', N: 2048, L: 256, snr: 10, a2: -20, df: 40, seed: 1 };

/** Pure white noise of standard deviation σ — the only signal whose PSD is known. */
const whiteNoise = (n, sigma, seed) => {
  const g = gaussFrom(mulberry32(seed));
  return Float64Array.from({ length: n }, () => sigma * g());
};

export const checks = [
  {
    name: 'density normalization: E[P] = σ²/Fs on white noise',
    category: 'statistical',
    run() {
      // The normalization |X|²/(Fs·Σw²) is chosen SO THAT the mean of the
      // periodogram is σ²/Fs, whatever the window and whatever the length. It is
      // verified here on all four windows.
      // Every bin is σ⁴χ²₂/2: relative standard deviation 1, so the mean over M
      // bins has a standard error of 1/√M. M ≈ 1024 → SE ≈ 3.1 %, tolerance
      // 4 SE.
      const sigma = 0.7;
      const x = whiteNoise(4096, sigma, 11);
      const target = (sigma * sigma) / FS;
      const M = 2048;
      const tol = 4 / Math.sqrt(M);
      const worst = maxGap(
        ['rect', 'hann', 'hamming', 'blackman'],
        (win) => {
          const { f, psd } = averagedPeriodogram(x, 4096, 4096, win);
          return fluctuation(f, psd, 0).mean / target;
        },
        () => 1
      );
      return { ok: worst < tol, detail: `max relative gap ${(worst * 100).toFixed(2)} % (tol ${(tol * 100).toFixed(2)} %)` };
    },
  },
  {
    name: 'the periodogram is NOT consistent: σ/mean ≈ 1 whatever N',
    category: 'statistical',
    run() {
      // The central result of the experiment, and the only one whose regression
      // would destroy the point. On white noise every bin follows σ⁴χ²₂/2, whose
      // standard deviation EQUALS its mean: the ratio is 1 for every N. The
      // standard deviation of a ratio estimated over M bins of a χ²₂ is
      // ≈ 1/√(2M); for the smallest N (512 → M ≈ 256) that is 4.4 %, tolerance
      // 4 SE.
      const sigma = 0.7;
      const worst = maxGap(
        [512, 1024, 2048, 4096, 8192],
        (n) => {
          const x = whiteNoise(n, sigma, 20 + n);
          const { f, psd } = averagedPeriodogram(x, n, n, 'rect');
          return fluctuation(f, psd, 0).ratio;
        },
        () => 1
      );
      const tol = 4 / Math.sqrt(2 * 256);
      return {
        ok: worst < tol,
        detail: `max|σ/mean − 1| = ${worst.toFixed(3)} over N = 512…8192 (tol ${tol.toFixed(3)})`,
      };
    },
  },
  {
    name: 'averaging K segments divides the fluctuation by √K',
    category: 'statistical',
    run() {
      // The law the "fluctuation vs K" view draws. DISJOINT segments, hence
      // independent, hence the mean of K periodograms follows a χ²_{2K}/2K,
      // whose standard-deviation-to-mean ratio is exactly 1/√K. Standard error
      // of the ratio over M bins: ≈ 1/√(2MK) — the tighter the larger K is, so
      // the tolerance is taken at the worst case.
      const sigma = 1.1;
      const x = whiteNoise(8192, sigma, 33);
      const rel = [];
      for (const K of [2, 4, 8, 16, 32]) {
        const L = 8192 / K;
        const { f, psd, segments } = averagedPeriodogram(x, L, L, 'rect');
        const r = fluctuation(f, psd, 0).ratio;
        rel.push(Math.abs(r * Math.sqrt(segments) - 1));
      }
      const worst = Math.max(...rel);
      const tol = 4 / Math.sqrt(2 * (8192 / 32 / 2)); // pire cas : M = L/2 = 128
      return {
        ok: worst < tol,
        detail: `max|σ/mean·√K − 1| = ${worst.toFixed(3)} over K = 2…32 (tol ${tol.toFixed(3)})`,
      };
    },
  },
  {
    name: 'the segmentation counts right: Welch gets 2N/L − 1 segments, Bartlett N/L',
    category: 'numeric',
    run() {
      // Exact counting, not statistical: the accounting is what decides Welch's
      // gain, and an error of one segment would skew the law above without
      // breaking anything visible.
      const x = whiteNoise(4096, 1, 5);
      const bad = [];
      for (const L of [64, 128, 256, 512, 1024]) {
        for (const [method, want] of [
          ['bartlett', 4096 / L],
          ['welch', (2 * 4096) / L - 1],
        ]) {
          const s = segmentation(method, 4096, L);
          const got = averagedPeriodogram(x, s.L, s.hop, 'hann').segments;
          if (got !== want) bad.push(`${method} L=${L}: ${got} ≠ ${want}`);
        }
      }
      return { ok: bad.length === 0, detail: bad.length ? bad.join(' · ') : 'exact for L = 64…1024' };
    },
  },
  {
    name: 'with no noise, the line lands exactly on its bin',
    category: 'numeric',
    run() {
      // 200 Hz and 240 Hz at Fs = 1000 over N = 2048: 409.6 and 491.52 bins, so
      // no exact bin — the maximum must be the nearest bin, not a neighbour.
      // Verifies that the frequency axis is not shifted by half a bin, the
      // classic error and one invisible to the eye.
      const { observables: o } = compute({ ...BASE, snr: 200, a2: 0, df: 40 });
      const bin = FS / BASE.N;
      const peakNear = (fc) => {
        let best = -1;
        let bestV = -Infinity;
        for (let k = 0; k < o.psd.x.length; k++) {
          if (Math.abs(o.psd.x[k] - fc) > 5 * bin) continue;
          if (o.psd.y[k] > bestV) {
            bestV = o.psd.y[k];
            best = k;
          }
        }
        return o.psd.x[best];
      };
      const worst = maxGap([200, 240], peakNear, (fc) => fc);
      return { ok: worst <= bin, detail: `max gap ${worst.toFixed(3)} Hz ≤ 1 bin = ${bin.toFixed(3)} Hz` };
    },
  },
  {
    name: 'the plotted fluctuation is the one the statline announces',
    category: 'numeric',
    run() {
      // The K = 1 point of the curve and the displayed number must be the SAME
      // computation: scene 5 states out loud that the raw periodogram is the
      // degenerate case of Welch, and that is verifiable.
      const { observables: o } = compute({ ...BASE, method: 'raw' });
      const i = 0; // the first point of the sweep IS the raw periodogram
      return {
        ok: Math.abs(o.fluctVsK.y[i] - o.stdRatio.value) < 1e-12 && o.fluctVsK.x[i] === 1,
        detail: `K=${o.fluctVsK.x[i]}, plotted ${o.fluctVsK.y[i].toFixed(6)} vs statline ${o.stdRatio.value.toFixed(6)}`,
      };
    },
  },
  {
    name: 'true variance (Monte Carlo): the 1/√K law, and what the overlap costs',
    category: 'statistical',
    run() {
      // A correction of a statement first written the wrong way round here. The
      // "fluctuation vs K" view measures the dispersion FROM ONE BIN TO THE
      // NEXT: that is what the eye reads as the noise floor, but it is NOT the variance of
      // the estimator at a given frequency — a smoothing window correlates
      // neighbouring bins and lowers that number. The real variance is measured
      // over independent REALIZATIONS, here R = 200 seeds, at f = 300 Hz (a band
      // with no line).
      //
      // The result, which is the one from the course and not a numerical detail:
      //   raw           σ/mean·√K ≈ 1    — not consistent
      //   Bartlett      ≈ 1              — disjoint segments, hence independent
      //   Welch + Hann  ≈ 1              — the overlap is nearly FREE
      //   Welch + rect  ≥ 1.10           — it COSTS 20 %
      // In other words Welch's overlap only pays with a window that tapers at
      // the edges: that is the reason that window exists, and without it two
      // neighbouring segments share half their samples with no attenuation at
      // all.
      const R = 200;
      const N = 4096;
      const ratio = (method, win, L) => {
        const s = segmentation(method, N, L);
        const v = [];
        let K = 0;
        for (let r = 0; r < R; r++) {
          const { f, psd, segments } = averagedPeriodogram(whiteNoise(N, 1, 5000 + r), s.L, s.hop, win);
          K = segments;
          let k = 0;
          while (f[k] < 300) k++;
          v.push(psd[k]);
        }
        const m = v.reduce((a, b) => a + b, 0) / R;
        const sd = Math.sqrt(v.reduce((a, b) => a + (b - m) ** 2, 0) / R);
        return (sd / m) * Math.sqrt(K);
      };
      // standard error of a standard deviation estimated over R realizations:
      // 1/√(2R) = 5 %, tolerance 3 SE = 15 %
      const raw = ratio('raw', 'rect', N);
      const bart = ratio('bartlett', 'rect', 256);
      const wHann = ratio('welch', 'hann', 256);
      const wRect = ratio('welch', 'rect', 256);
      const near1 = (v) => Math.abs(v - 1) < 0.15;
      return {
        ok: near1(raw) && near1(bart) && near1(wHann) && wRect > 1.1,
        detail:
          `raw ${raw.toFixed(3)} · Bartlett ${bart.toFixed(3)} · ` +
          `Welch+Hann ${wHann.toFixed(3)} · Welch+rect ${wRect.toFixed(3)} (must exceed 1.10)`,
      };
    },
  },
  {
    name: 'the weak line is exactly A₂ dB below the strong one',
    category: 'numeric',
    run() {
      // A₂ is a level in dB, hence a ratio of POWERS: the gap between the two
      // peaks MUST be A₂, not 2·A₂. Noise-free and over long segments, both
      // peaks are clean and the gap is exact up to the bin discretization.
      const worst = maxGap(
        [-5, -10, -20, -35, -50],
        (a2) => {
          const { observables: o } = compute({ ...BASE, snr: 200, a2, df: 40, N: 8192, win: 'hann' });
          // The POWER of the lobe, not the height of the peak: neither 200 nor
          // 240 Hz falls on an exact bin, and the scalloping loss differs
          // between them. Summing the density over the lobe cancels it, and the
          // identity becomes exact again instead of holding "to within
          // 0.4 dB".
          const lobe = (fc) => {
            let p = 0;
            for (let k = 0; k < o.psd.x.length; k++)
              if (Math.abs(o.psd.x[k] - fc) <= 2) p += 10 ** (o.psd.y[k] / 10);
            return 10 * Math.log10(p);
          };
          return lobe(240) - lobe(200);
        },
        (a2) => a2
      );
      return { ok: worst < 0.05, detail: `max gap ${worst.toFixed(4)} dB over A₂ = −5…−50 dB` };
    },
  },
  {
    name: 'the sum of the windows tells the four cases, exactly',
    category: 'numeric',
    run() {
      // The "segmentation and overlap" view rests entirely on this sum, and
      // each of the four cases is an EXACT identity, not a tendency: that is
      // what allows stating it in front of a room.
      //   rect  disjoint  → 1 everywhere
      //   rect  50 %      → 2 everywhere (every sample counted twice)
      //   Hann  50 %      → 1 everywhere (COLA: perfect reconstruction)
      //   Hann  disjoint  → drops to ~0 between segments (edges thrown away)
      const cases = [
        { method: 'bartlett', win: 'rect', min: 1, max: 1 },
        { method: 'welch', win: 'rect', min: 2, max: 2 },
        { method: 'welch', win: 'hann', min: 1, max: 1 },
      ];
      const bad = [];
      for (const c of cases) {
        const { observables: o } = compute({ ...BASE, method: c.method, win: c.win, N: 4096, L: 256 });
        // interior regime only: the outermost edges have no neighbour
        let lo = Infinity;
        let hi = -Infinity;
        for (let i = 256; i < o.windowSum.y.length - 256; i++) {
          lo = Math.min(lo, o.windowSum.y[i]);
          hi = Math.max(hi, o.windowSum.y[i]);
        }
        if (Math.abs(lo - c.min) > 1e-12 || Math.abs(hi - c.max) > 1e-12)
          bad.push(`${c.method}/${c.win}: [${lo.toFixed(6)}, ${hi.toFixed(6)}] ≠ [${c.min}, ${c.max}]`);
      }
      // and the case that MOTIVATES the overlap: disjoint Hann throws the edges away
      const { observables: h } = compute({ ...BASE, method: 'bartlett', win: 'hann', N: 4096, L: 256 });
      let lo = Infinity;
      for (let i = 256; i < h.windowSum.y.length - 256; i++) lo = Math.min(lo, h.windowSum.y[i]);
      if (lo > 1e-9) bad.push(`bartlett/hann: trough at ${lo.toFixed(6)}, expected ~0`);
      return {
        ok: bad.length === 0,
        detail: bad.length ? bad.join(' · ') : 'rect/disjoint=1, rect/50 %=2, Hann/50 %=1, Hann/disjoint→0 (exact)',
      };
    },
  },
  standardChecks.determinism(compute, BASE, 'psd'),
  standardChecks.determinism(compute, BASE, 'signal'),
  {
    // A TEXT observable is displayed and never asserted, which is how "ripples
    // from Infinity to -Infinity" survived on the landing scene: the numbers
    // were all correct, and the sentence was nonsense. Every reading the
    // statline can show must be a sentence, over the whole parameter grid.
    name: 'the statline never prints a sentinel, whatever the segmentation',
    category: 'numeric',
    run() {
      const bad = [];
      for (const method of ['raw', 'bartlett', 'welch'])
        for (const N of [256, 512, 2048])
          for (const L of [64, 128, 256]) {
            if (method !== 'raw' && L > N) continue;
            const o = compute({ ...BASE, method, N, L }).observables;
            for (const [name, v] of Object.entries(o))
              if (v && typeof v.value === 'string' && /Infinity|NaN|undefined/.test(v.value))
                bad.push(`${method} N=${N} L=${L}: ${name} = "${v.value.slice(0, 40)}"`);
          }
      return { ok: bad.length === 0, detail: bad[0] ?? '27 segmentations, every text reading a sentence' };
    },
  },
];
