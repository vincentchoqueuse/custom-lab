// Canonical linear block codes shared by the coding experiments — pure,
// worker-safe, importable from compute.js and check.js (same policy as
// numeric.js). Bits are plain 0/1 arrays; block layout is systematic
// (message first, parities last).

/** Hamming (7,4): p1 = d1⊕d2⊕d4, p2 = d1⊕d3⊕d4, p3 = d2⊕d3⊕d4. */
export const hamming74 = {
  n: 7,
  k: 4,
  encode(d) {
    return [d[0], d[1], d[2], d[3], d[0] ^ d[1] ^ d[3], d[0] ^ d[2] ^ d[3], d[1] ^ d[2] ^ d[3]];
  },
  decodeHard(r) {
    const s1 = r[4] ^ r[0] ^ r[1] ^ r[3];
    const s2 = r[5] ^ r[0] ^ r[2] ^ r[3];
    const s3 = r[6] ^ r[1] ^ r[2] ^ r[3];
    // syndrome → flipped position (columns of H), 0-based; −1 = no error
    const pos = [-1, 4, 5, 0, 6, 1, 2, 3][s1 + 2 * s2 + 4 * s3];
    const out = r.slice(0, 4);
    if (pos >= 0 && pos < 4) out[pos] ^= 1;
    return out;
  },
};

/** Repetition ×3: one message bit per block, majority vote. */
export const repetition3 = {
  n: 3,
  k: 1,
  encode(d) {
    return [d[0], d[0], d[0]];
  },
  decodeHard(r) {
    return [r[0] + r[1] + r[2] >= 2 ? 1 : 0];
  },
};

/** All 2ᵏ codewords with their messages (for ML/soft decoding). */
export function codewordTable(code) {
  const list = [];
  for (let m = 0; m < 1 << code.k; m++) {
    const msg = Array.from({ length: code.k }, (_, j) => (m >> j) & 1);
    list.push({ msg, cw: code.encode(msg) });
  }
  return list;
}

/**
 * Exact enumeration of the 2ⁿ hard-decision error patterns: message-error
 * count per pattern (linear code → all-zero-codeword analysis) and the
 * per-weight average β(w).
 */
export function enumerateHard(code) {
  const { n, k } = code;
  const perPattern = new Float64Array(1 << n);
  const weight = new Uint8Array(1 << n);
  const betaSum = new Float64Array(n + 1);
  const betaCnt = new Float64Array(n + 1);
  for (let m = 0; m < 1 << n; m++) {
    const r = Array.from({ length: n }, (_, j) => (m >> j) & 1);
    let w = 0;
    for (let j = 0; j < n; j++) w += r[j];
    const out = code.decodeHard(r);
    let errs = 0;
    for (let j = 0; j < k; j++) errs += out[j];
    perPattern[m] = errs;
    weight[m] = w;
    betaSum[w] += errs;
    betaCnt[w] += 1;
  }
  const beta = new Float64Array(n + 1);
  for (let w = 0; w <= n; w++) beta[w] = betaSum[w] / betaCnt[w];
  return { perPattern, weight, beta };
}

/** Exact post-decoding BER on a BSC(p), from the pattern enumeration. */
export function berHardExact(code, enumr, p) {
  const { n, k } = code;
  let acc = 0;
  for (let m = 0; m < 1 << n; m++) {
    const w = enumr.weight[m];
    acc += enumr.perPattern[m] * p ** w * (1 - p) ** (n - w);
  }
  return acc / k;
}
