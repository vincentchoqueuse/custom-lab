// The subject's images — COMPUTED, never copied.
//
// That is a choice, and it deserves explaining in class. The most famous test
// image in image processing, "Lena", is NOT free of rights: it is a Playboy
// photograph (1972), used for fifty years without clear permission, and dropped
// in 2019 by the IEEE and then by Nature. The other classics (Barbara,
// Mandrill, Peppers) carry statuses just as murky.
//
// The SHEPP–LOGAN phantom settles the question: it has been the standard test
// image of medical imaging since 1974, and it is not a photograph but a
// FORMULA — ten ellipses with published parameters. So it is not copied but
// recomputed, which makes it free by construction AND checkable by the harness.
// A copied dataset can be verified; a recomputed image can be proved.
//
// The so-called "modified" version (Toft, 1996): same ellipses, raised
// contrasts, because the original is too flat for a video projector.
//
// PURE, stateless, no DOM. Importable from compute.js AND check.js.

/**
 * The ten ellipses of the phantom: [intensity, semi-axis a, semi-axis b, centre
 * x, centre y, rotation in degrees], in the square [−1, 1]².
 * These twenty-four numbers are the ones from the literature.
 */
export const SHEPP_LOGAN_ELLIPSES = [
  [1.0, 0.69, 0.92, 0, 0, 0],
  [-0.8, 0.6624, 0.874, 0, -0.0184, 0],
  [-0.2, 0.11, 0.31, 0.22, 0, -18],
  [-0.2, 0.16, 0.41, -0.22, 0, 18],
  [0.1, 0.21, 0.25, 0, 0.35, 0],
  [0.1, 0.046, 0.046, 0, 0.1, 0],
  [0.1, 0.046, 0.046, 0, -0.1, 0],
  [0.1, 0.046, 0.023, -0.08, -0.605, 0],
  [0.1, 0.023, 0.023, 0, -0.606, 0],
  [0.1, 0.023, 0.046, 0.06, -0.605, 0],
];

/** The phantom, n × n, values in [0, 1]. */
export function sheppLogan(n) {
  const img = new Float64Array(n * n);
  for (let i = 0; i < n; i++) {
    // y decreases as the row index rises: image convention
    const y = 1 - (2 * (i + 0.5)) / n;
    for (let j = 0; j < n; j++) {
      const x = (2 * (j + 0.5)) / n - 1;
      let v = 0;
      for (const [A, a, b, x0, y0, deg] of SHEPP_LOGAN_ELLIPSES) {
        const th = (deg * Math.PI) / 180;
        const c = Math.cos(th);
        const s = Math.sin(th);
        const dx = x - x0;
        const dy = y - y0;
        const u = (dx * c + dy * s) / a;
        const w = (-dx * s + dy * c) / b;
        if (u * u + w * w <= 1) v += A;
      }
      img[i * n + j] = Math.min(1, Math.max(0, v));
    }
  }
  return img;
}

/**
 * An image of EXACTLY rank r, by construction. It exists to show the case where
 * the SVD wins everything: r non-zero singular values, and nothing after.
 *
 * (r − 1) outer products of sinusoids, and the constant that the normalization
 * adds as the r-th. That detail is not one: a global offset IS a rank-1 layer,
 * and forgetting it would deliver an image of rank r + 1 sold as rank r. The
 * harness measures it.
 */
export function lowRankImage(n, r) {
  const img = new Float64Array(n * n);
  for (let c = 1; c < r; c++) {
    for (let i = 0; i < n; i++) {
      const ui = Math.sin((Math.PI * c * (i + 0.5)) / n);
      for (let j = 0; j < n; j++) img[i * n + j] += (ui * Math.cos((Math.PI * c * (j + 0.5)) / n)) / c;
    }
  }
  return normalize01(img);
}

/**
 * A checkerboard — and the most useful counter-example of the session, because
 * it says the opposite of what is expected. Sharp edges everywhere, a very
 * "detailed" look, and a rank of… 2: a pixel value is
 * f(row) + g(column) − 2·f(row)·g(column), so the image is SEPARABLE. Two
 * layers reconstruct it exactly. The eye does not judge rank.
 */
export function checkerboard(n, cells) {
  const img = new Float64Array(n * n);
  const s = n / cells;
  for (let i = 0; i < n; i++)
    for (let j = 0; j < n; j++)
      img[i * n + j] = (Math.floor(i / s) + Math.floor(j / s)) % 2 ? 0.85 : 0.15;
  return img;
}

/**
 * Noise: the counter-example. No structure, so nothing to compress.
 *
 * A UNIFORM draw on [0, 1], and not a renormalized Gaussian: the latter fills
 * the range poorly (±4σ mapped into [0, 1], so a standard deviation of 1/8
 * around a mean of 0.5), so much so that its first layer — the DC component —
 * takes 95 % of the energy on its own. The energy curve then claimed that noise
 * compresses better than a phantom, which is true of the MEAN and of nothing
 * else, and it wrecked the demonstration. The uniform draw brings that share
 * down to 75 % and makes the comparison honest.
 */
export function noiseImage(n, rand) {
  const img = new Float64Array(n * n);
  for (let i = 0; i < img.length; i++) img[i] = rand();
  return img;
}

/** Maps an array into [0, 1] by a shift and a scale. */
export function normalize01(a) {
  let lo = Infinity;
  let hi = -Infinity;
  for (const v of a) {
    if (v < lo) lo = v;
    if (v > hi) hi = v;
  }
  const d = hi - lo || 1;
  const out = new Float64Array(a.length);
  for (let i = 0; i < a.length; i++) out[i] = (a[i] - lo) / d;
  return out;
}

/* ---------------------------------------------------------- BMP output -- */

// An 8-bit greyscale BMP, encoded by hand and returned as a `data:` URI.
//
// Why BMP and not PNG: PNG needs a deflate and a CRC, some hundred lines that
// would have to be verified, where BMP is a header followed by raw bytes. Why
// not a canvas: the worker has no DOM, the harness runs in Node, and the view
// must stay pure clonable SVG — which is what freeze and export depend on. A
// `data:` string crosses all of that assuming nothing.

const B64 = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/';

/** base64 written here rather than through btoa or Buffer: the same code must
 *  run inside a worker AND inside Node, with no branch on the host. */
function base64(bytes) {
  let out = '';
  for (let i = 0; i < bytes.length; i += 3) {
    const a = bytes[i];
    const b = i + 1 < bytes.length ? bytes[i + 1] : 0;
    const c = i + 2 < bytes.length ? bytes[i + 2] : 0;
    out += B64[a >> 2] + B64[((a & 3) << 4) | (b >> 4)];
    out += i + 1 < bytes.length ? B64[((b & 15) << 2) | (c >> 6)] : '=';
    out += i + 2 < bytes.length ? B64[c & 63] : '=';
  }
  return out;
}

/**
 * An n × n image of [0, 1] values as `data:image/bmp;base64,…`.
 * A BMP is read from the BOTTOM up: the rows are written in reverse, failing
 * which the image appears upside down — the classic mistake with this format.
 */
export function toBmpDataUri(img, n) {
  const rowSize = (n + 3) & ~3; // rows aligned on 4 bytes
  const pixOffset = 14 + 40 + 256 * 4;
  const size = pixOffset + rowSize * n;
  const b = new Uint8Array(size);
  const u16 = (o, v) => {
    b[o] = v & 255;
    b[o + 1] = (v >> 8) & 255;
  };
  const u32 = (o, v) => {
    b[o] = v & 255;
    b[o + 1] = (v >> 8) & 255;
    b[o + 2] = (v >> 16) & 255;
    b[o + 3] = (v >>> 24) & 255;
  };
  b[0] = 66; // 'B'
  b[1] = 77; // 'M'
  u32(2, size);
  u32(10, pixOffset);
  u32(14, 40); // size of the DIB header
  u32(18, n);
  u32(22, n);
  u16(26, 1); // planes
  u16(28, 8); // bits per pixel
  u32(34, rowSize * n);
  u32(46, 256); // palette colours
  for (let k = 0; k < 256; k++) {
    const o = 54 + k * 4;
    b[o] = k;
    b[o + 1] = k;
    b[o + 2] = k;
  }
  for (let i = 0; i < n; i++) {
    const src = (n - 1 - i) * n; // bottom to top
    const dst = pixOffset + i * rowSize;
    for (let j = 0; j < n; j++) {
      const v = img[src + j];
      b[dst + j] = Math.max(0, Math.min(255, Math.round(255 * v)));
    }
  }
  return 'data:image/bmp;base64,' + base64(b);
}
