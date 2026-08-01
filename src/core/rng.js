// Seeded RNG — the ONLY allowed generator in the project. Never Math.random():
// determinism at fixed seed is a contract requirement (reproducible URLs).

/**
 * mulberry32 — small, fast, good-quality 32-bit seeded PRNG.
 * @param {number} seed
 * @returns {() => number} uniform in [0, 1)
 */
export function mulberry32(seed) {
  let a = seed >>> 0;
  return function () {
    a |= 0;
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

/**
 * Standard normal generator built on a uniform source (Marsaglia polar
 * method, spare value cached).
 * @param {() => number} rand — uniform source, e.g. mulberry32(seed)
 * @returns {() => number} N(0, 1) draws
 */
export function gaussFrom(rand) {
  let spare = null;
  return function () {
    if (spare !== null) {
      const v = spare;
      spare = null;
      return v;
    }
    let u, v, s;
    do {
      u = 2 * rand() - 1;
      v = 2 * rand() - 1;
      s = u * u + v * v;
    } while (s === 0 || s >= 1);
    const m = Math.sqrt((-2 * Math.log(s)) / s);
    spare = v * m;
    return u * m;
  };
}
