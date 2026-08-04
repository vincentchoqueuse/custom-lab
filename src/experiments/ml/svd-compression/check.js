import { compute, N, RANK_MAX, SPEC_FLOOR } from './compute.js';
import manifest from './manifest.js';
import { standardChecks, maxAbsDiff } from '../../../core/checks.js';
import { svd, lowRank } from '../../../core/linalg.js';
import { sheppLogan, lowRankImage, checkerboard, toBmpDataUri } from '../_lib/images.js';

const IMAGES = ['phantom', 'lowrank', 'checker', 'noise'];
const at = (params) => compute({ image: 'phantom', k: 12, seed: 34, ...params }).observables;

/** The pixel of the phantom nearest the point (x, y) of the square [−1, 1]². */
const sample = (img, x, y) =>
  img[Math.floor(((1 - y) * N) / 2) * N + Math.floor(((x + 1) * N) / 2)];

/** base64 → bytes, written here to READ BACK what the encoder produced. */
function unbase64(s) {
  const A = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/';
  const clean = s.replace(/=+$/, '');
  const out = new Uint8Array((clean.length * 3) >> 2);
  let acc = 0;
  let bits = 0;
  let o = 0;
  for (const ch of clean) {
    acc = (acc << 6) | A.indexOf(ch);
    bits += 6;
    if (bits >= 8) {
      bits -= 8;
      out[o++] = (acc >> bits) & 255;
    }
  }
  return out;
}

export const checks = [
  {
    name: 'the phantom IS the published formula — six grey levels, in the right places',
    category: 'numeric',
    run() {
      // A RECOMPUTED image can be proved where a copied one could at best be
      // verified. The ten Shepp–Logan ellipses (1974, Toft contrasts) can only
      // produce six levels: the background (0), the skull (1), the brain
      // (1 − 0.8 = 0.2), the ventricles (0.2 − 0.2 = 0), the inclusions
      // (0.2 + 0.1 = 0.3), and the two overlaps (0.1 and 0.4). No other. If one
      // parameter drifted by a decimal, a seventh level would appear.
      const img = sheppLogan(N);
      const levels = [...new Set(Array.from(img, (v) => +v.toFixed(9)))].sort((a, b) => a - b);
      const want = [0, 0.1, 0.2, 0.3, 0.4, 1];
      const points = [
        ['background', 0.95, 0.95, 0],
        ['skull', 0, 0.9, 1],
        ['brain', 0, -0.4, 0.2],
        ['left ventricle', -0.22, 0, 0],
        ['right ventricle', 0.22, 0, 0],
        ['lower inclusion', 0, -0.605, 0.3],
      ];
      const bad = [];
      if (levels.length !== 6 || maxAbsDiff(levels, want) > 1e-9)
        bad.push(`levels ${levels.join('/')}`);
      for (const [name, x, y, v] of points) {
        const got = sample(img, x, y);
        if (Math.abs(got - v) > 1e-12) bad.push(`${name}: ${got.toFixed(4)} instead of ${v}`);
      }
      return {
        ok: bad.length === 0,
        detail: bad.length ? bad.join(' · ') : 'levels 0/0.1/0.2/0.3/0.4/1 and six exact anatomical points',
      };
    },
  },
  {
    name: 'A = U·diag(σ)·Vᵀ — the decomposition reconstructs the image exactly',
    category: 'numeric',
    run() {
      // The basic property, and the only check that guarantees everything else
      // is really talking about the displayed image. Mind the tolerance: the
      // SVD here goes through the eigenvalues of AᵀA, which SQUARES the
      // condition number and costs half the significant digits. Expect ~1e-14
      // on an image of order 1, not 1e-16.
      const bad = [];
      for (const [name, img] of [
        ['phantom', sheppLogan(N)],
        ['rank 4', lowRankImage(N, 4)],
        ['checkerboard', checkerboard(N, 8)],
      ]) {
        const model = svd(img, N, N);
        const back = lowRank(model, N, N, N);
        const worst = maxAbsDiff(back, img);
        if (worst > 1e-11) bad.push(`${name}: ${worst.toExponential(1)}`);
      }
      return { ok: bad.length === 0, detail: bad.length ? bad.join(' · ') : 'max gap < 1e-11 over three images' };
    },
  },
  {
    name: 'the layers are orthonormal: UᵀU = VᵀV = I',
    category: 'numeric',
    run() {
      // What makes the σ² ADD UP: the layers are pairwise orthogonal, so the
      // energy of the sum is the sum of the energies. Without that, "keeping
      // 96 % of the energy" would mean nothing.
      const model = svd(sheppLogan(N), N, N);
      const r = model.s.length;
      const K = 40;
      let worst = 0;
      for (const M of [model.u, model.v])
        for (let a = 0; a < K; a++)
          for (let b = 0; b < K; b++) {
            let d = 0;
            for (let i = 0; i < N; i++) d += M[i * r + a] * M[i * r + b];
            worst = Math.max(worst, Math.abs(d - (a === b ? 1 : 0)));
          }
      return { ok: worst < 1e-9, detail: `max gap to the identity ${worst.toExponential(2)} over 40 layers` };
    },
  },
  {
    name: 'Eckart–Young: ‖A − Aₖ‖² IS the sum of the discarded σᵢ², on all four images',
    category: 'numeric',
    run() {
      // The theorem of the session, the same one as in the PCA experiment: the
      // error of a compression is known BEFORE computing it. The statline shows
      // the two numbers side by side; here we verify that they are equal, and
      // not merely close.
      //
      // Tolerance relative to ‖A‖², and the harness is what imposed that choice:
      // normalizing the gap by the error itself fails on the checkerboard and on
      // the rank-4 image, where the error is zero in theory AND in practice.
      // What remains on both sides there is the numerical floor of the route
      // through AᵀA (√ε ≈ 1e-8 per singular value), hence two noisy zeros whose
      // ratio means nothing. The energy of the image is the only scale that
      // makes sense across all four.
      const bad = [];
      let worst = 0;
      for (const image of IMAGES) {
        // ‖A‖²: errTheo(1) is the sum of the σᵢ² discarded at k = 1, and
        // errCurve(1) the same thing normalized by the total.
        const o1 = at({ image, k: 1 });
        const total = o1.errTheo.value / o1.errCurve.y[1];
        for (const k of [1, 2, 4, 8, 20, 40]) {
          const o = at({ image, k });
          const rel = Math.abs(o.errMeas.value - o.errTheo.value) / total;
          worst = Math.max(worst, rel);
          if (rel > 1e-9) bad.push(`${image} k=${k}: ${rel.toExponential(1)}`);
        }
      }
      return {
        ok: bad.length === 0,
        detail: bad.length ? bad.join(' · ') : `measured = theory to ${worst.toExponential(1)} of ‖A‖², 4 images × 6 values of k`,
      };
    },
  },
  {
    name: 'the "rank 4" image has rank 4 — not 3, not 5',
    category: 'numeric',
    run() {
      // The case where the SVD wins everything, and a trap the harness has
      // already caught once: normalizing into [0, 1] adds a CONSTANT, hence one
      // more rank-1 layer. Three sinusoids plus the offset make four, and that
      // is what is pinned here — fourth value plainly non-zero, fifth at the
      // numerical floor (√ε ≈ 1e-8, the price of the route through AᵀA).
      const psnr = at({ image: 'lowrank', k: 4 }).psnr.value;
      // the RAW σ, not the displayed series: that one is clamped at the floor
      // of the log axis, which no longer says anything about the zero it covers
      const { s, rank } = svd(lowRankImage(N, 4), N, N);
      const r = (i) => s[i] / s[0];
      return {
        ok: r(3) > 1e-2 && r(4) < 1e-7 && psnr > 200 && rank === 4,
        detail: `numerical rank ${rank} · σ₄/σ₁ = ${r(3).toExponential(2)}, σ₅/σ₁ = ${r(4).toExponential(2)}, PSNR at k = 4: ${psnr.toFixed(0)} dB`,
      };
    },
  },
  {
    name: 'the checkerboard looks complicated and has rank 2',
    category: 'numeric',
    run() {
      // The counter-intuitive result of the session, and the reason this image
      // is in the catalogue. A checkerboard is SEPARABLE:
      // p(i,j) = f(i) + g(j) − 2f(i)g(j), so two layers suffice — exactly, not
      // approximately. The eye judges apparent complexity, never rank.
      const o = at({ image: 'checker', k: 2 });
      const img = checkerboard(N, 8);
      const model = svd(img, N, N);
      const s = (i) => model.s[i] / model.s[0];
      const worst = maxAbsDiff(lowRank(model, N, N, 2), img);
      return {
        ok: model.rank === 2 && s(1) > 0.5 && s(2) < 1e-7 && worst < 1e-11 && o.kept.value > 99.999,
        detail:
          `numerical rank ${model.rank} · σ₂/σ₁ = ${s(1).toFixed(3)}, σ₃/σ₁ = ${s(2).toExponential(2)} · ` +
          `reconstruction at k = 2 exact to ${worst.toExponential(1)}`,
      };
    },
  },
  {
    name: 'the spectrum decides: the phantom collapses, the noise does not decay',
    category: 'statistical',
    run() {
      // THE reason one image compresses and another does not, and it lies in
      // the image, not in the algorithm. Over the forty displayed layers the
      // phantom loses a factor 20 and the noise a factor 1.7 — so for the noise
      // no layer is negligible, and no method will ever compress it.
      const drop = (image) => {
        const s = at({ image }).singular.y;
        return s[1] / s[RANK_MAX - 1];
      };
      const ph = drop('phantom');
      const nz = drop('noise');
      const oPh = at({ image: 'phantom', k: 12 });
      const oNz = at({ image: 'noise', k: 12 });
      // and the two consequences visible in the room: the reconstructed image
      // and the energy curve must rank the two images in the SAME order as the
      // spectrum, failing which the demonstration contradicts itself.
      return {
        ok:
          ph > 10 &&
          nz < 2 &&
          oPh.psnr.value > oNz.psnr.value + 5 &&
          oPh.kept.value > oNz.kept.value,
        detail:
          `σ₂/σ₄₀: ${ph.toFixed(1)} on the phantom, ${nz.toFixed(2)} on the noise · ` +
          `at k = 12, PSNR ${oPh.psnr.value.toFixed(1)} against ${oNz.psnr.value.toFixed(1)} dB ` +
          `and energy ${oPh.kept.value.toFixed(1)} against ${oNz.kept.value.toFixed(1)} %`,
      };
    },
  },
  {
    name: 'the displayed spectrum fits inside the frame, floor included',
    category: 'numeric',
    run() {
      // Two constants must agree: the floor the compute applies to the spectrum
      // and the domain of the manifest's log axis. If they drift apart, an
      // exact-rank image draws a line OUTSIDE the frame — invisible, and nobody
      // notices before the lecture hall. They are pinned to each other here
      // rather than held in the head.
      const [lo, hi] = manifest.views.find((v) => v.id === 'singular').spec.axes.y.domain;
      const bad = [];
      if (!(SPEC_FLOOR > lo && SPEC_FLOOR < 10 * lo))
        bad.push(`floor ${SPEC_FLOOR} away from the bottom of the axis ${lo}`);
      for (const image of IMAGES) {
        const y = at({ image }).singular.y;
        for (let i = 0; i < RANK_MAX; i++)
          if (y[i] < lo || y[i] > hi) bad.push(`${image} σ${i + 1} = ${y[i].toExponential(2)}`);
      }
      return {
        ok: bad.length === 0,
        detail: bad.length ? bad.join(' · ') : `40 values × 4 images inside [${lo}, ${hi}], floor at ${SPEC_FLOOR}`,
      };
    },
  },
  {
    name: 'the storage accounting: k(2N+1) numbers instead of N²',
    category: 'numeric',
    run() {
      // The figure the room is asked to read. There is nothing approximate
      // about it: k layers means k vectors of length N, k more of length N, and
      // k singular values. The compression factor follows, and it turns
      // unfavourable beyond k = N/2 — which the formula says and nobody
      // guesses.
      const bad = [];
      for (const k of [1, 5, 12, 20, 40]) {
        const o = at({ k });
        const want = k * (2 * N + 1);
        if (o.stored.value !== want) bad.push(`k=${k}: ${o.stored.value} instead of ${want}`);
        if (Math.abs(o.ratio.value - (N * N) / want) > 1e-12) bad.push(`k=${k}: wrong factor`);
        if (o.fullSize.value !== N * N) bad.push(`full size ${o.fullSize.value}`);
      }
      const o12 = at({ k: 12 });
      return {
        ok: bad.length === 0,
        detail: bad.length
          ? bad.join(' · ')
          : `at k = 12: ${o12.stored.value} numbers against ${o12.fullSize.value}, factor ${o12.ratio.value.toFixed(2)}`,
      };
    },
  },
  {
    name: 'the cumulative energy rises from 0 to 100 % and equals 1 − ‖A−Aₖ‖²/‖A‖²',
    category: 'numeric',
    run() {
      // The curve of the third view, and what it promises: reading off k for a
      // target quality WITHOUT reconstructing. It must therefore start at 0,
      // reach 100, never come back down, and be exactly the complement of the
      // relative error.
      const bad = [];
      for (const image of IMAGES) {
        const o = at({ image });
        const e = o.energy.y;
        const c = o.errCurve.y;
        if (Math.abs(e[0]) > 1e-12) bad.push(`${image}: e(0) = ${e[0]}`);
        for (let k = 1; k <= RANK_MAX; k++) {
          if (e[k] < e[k - 1] - 1e-12) bad.push(`${image}: decreases at k=${k}`);
          const sum = e[k] / 100 + c[k];
          if (Math.abs(sum - 1) > 1e-9 && c[k] > 1e-11) bad.push(`${image} k=${k}: ${sum}`);
        }
        if (e[RANK_MAX] > 100 + 1e-9) bad.push(`${image}: ${e[RANK_MAX]} %`);
      }
      const full = at({ image: 'lowrank' }).energy.y[RANK_MAX];
      return {
        ok: bad.length === 0,
        detail: bad.length ? bad.join(' · ') : `increasing, complementary to the relative error, and 100 % reached on the rank-4 image (${full.toFixed(4)} %)`,
      };
    },
  },
  {
    name: 'the BMP encoder gives back the pixels it was handed',
    category: 'numeric',
    run() {
      // The three thumbnails go through a hand-written BMP: if the header or
      // the row order drifts, the room sees an upside-down image or nothing at
      // all, and no other check would notice. So the produced bytes are read
      // back — header, palette, and every pixel, knowing that a BMP is read from
      // the BOTTOM up.
      const img = sheppLogan(N);
      const uri = toBmpDataUri(img, N);
      const b = unbase64(uri.slice(uri.indexOf(',') + 1));
      const rowSize = (N + 3) & ~3;
      const off = 14 + 40 + 256 * 4;
      const u32 = (o) => b[o] | (b[o + 1] << 8) | (b[o + 2] << 16) | (b[o + 3] << 24);
      const bad = [];
      if (b[0] !== 66 || b[1] !== 77) bad.push('signature');
      if (u32(2) !== off + rowSize * N) bad.push(`size ${u32(2)}`);
      if (u32(18) !== N || u32(22) !== N) bad.push('dimensions');
      if (b[28] !== 8) bad.push('bit depth');
      let worst = 0;
      for (let i = 0; i < N; i++)
        for (let j = 0; j < N; j++) {
          const got = b[off + (N - 1 - i) * rowSize + j];
          worst = Math.max(worst, Math.abs(got - Math.round(255 * img[i * N + j])));
        }
      if (worst > 0) bad.push(`pixels: gap ${worst}`);
      return {
        ok: bad.length === 0,
        detail: bad.length ? bad.join(' · ') : `${b.length} bytes read back, 16 384 identical pixels, rows bottom-to-top`,
      };
    },
  },
  {
    name: 'an image is decomposed only once — the k slider stays instantaneous',
    category: 'performance',
    run() {
      // The lecture guard sits at 1.5 s and a 128 × 128 decomposition costs
      // 450 ms. Moving k must therefore NOT redecompose: only the number of
      // layers kept changes. What is measured is a ratio, not an absolute
      // duration — the lecture-hall machine is not the CI one.
      const seed = 991; // a seed unused elsewhere: the cache is cold
      const t0 = performance.now();
      at({ image: 'noise', seed, k: 5 });
      const cold = performance.now() - t0;
      const t1 = performance.now();
      for (let k = 6; k <= 15; k++) at({ image: 'noise', seed, k });
      const warm = (performance.now() - t1) / 10;
      return {
        ok: warm * 5 < cold,
        detail: `decomposition ${cold.toFixed(0)} ms, then ${warm.toFixed(1)} ms per notch of k`,
      };
    },
  },
  standardChecks.determinism(compute, { image: 'noise', k: 12, seed: 7 }, 'singular'),
];
