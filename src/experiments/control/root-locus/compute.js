// THE ROOT LOCUS — where the closed-loop poles go as the gain runs from 0 to
// ∞. The characteristic polynomial of the unity-feedback loop around K·G is
// den(s) + K·num(s); its roots are computed at every K of a logarithmic sweep
// (polyRoots, _lib/lti.js) and CONTINUED from one K to the next by
// nearest-assignment matching, so each branch is a polyline and not a cloud —
// the locus is a set of paths, and drawing it as dots would hide exactly the
// thing it teaches, which is that the poles TRAVEL.
//
// The step response of the closed loop at the CURRENT K is simulated on the
// same contract as lti-response (_lib/sim.js), so the geometry tab and the
// time tab are two readings of one system.
// PURE, stateless — runs in a worker; deterministic (no draw: not random).
import { polyRoots } from '../_lib/lti.js';
import { simulate } from '../_lib/sim.js';

// The three teaching plants, chosen for their closed forms:
//   double  1/(s(s+2))            — branches meet at −1 (K = 1) and go vertical
//   triple  1/(s(s+1)(s+2))       — asymptotes at ±60°, jω crossing at K = 6
//   zero    (s+z)/(s(s+1)(s+2))   — Routh: stable for ALL K when z < 3, and
//                                   K_crit = 6/(z−3) when z > 3
function plant(sys, z) {
  if (sys === 'double') return { num: [1], den: [1, 2, 0] };
  if (sys === 'triple') return { num: [1], den: [1, 3, 2, 0] };
  return { num: [1, z], den: [1, 3, 2, 0] };
}

/** den + K·num, both descending, num padded to den's length. */
function charPoly(num, den, K) {
  const c = den.slice();
  const off = den.length - num.length;
  for (let i = 0; i < num.length; i++) c[off + i] += K * num[i];
  return c;
}

/**
 * Match the roots of one K to the branches of the previous K: try every
 * permutation (n ≤ 3, so at most 6) and keep the assignment of least total
 * distance. Greedy matching can swap two branches exactly at a breakaway,
 * which draws an X where the locus has a meeting.
 */
function permutations(n) {
  if (n === 1) return [[0]];
  if (n === 2)
    return [
      [0, 1],
      [1, 0],
    ];
  return [
    [0, 1, 2],
    [0, 2, 1],
    [1, 0, 2],
    [1, 2, 0],
    [2, 0, 1],
    [2, 1, 0],
  ];
}

/**
 * @param {{sys: string, K: number, z: number}} params
 * @returns {{observables: Object}}
 */
export function compute({ sys, K, z }) {
  const { num, den } = plant(sys, z);
  const n = den.length - 1;

  /* ---------- the locus: sweep K, continue the branches ------------------ */
  const NK = 420;
  const K_LO = 5e-3;
  const K_HI = 400;
  const perms = permutations(n);

  // branch b, step j → root (branches[b][j] = [re, im])
  const branches = Array.from({ length: n }, () => new Array(NK + 1));
  let prev = polyRoots(den); // K = 0: the open-loop poles start the branches
  for (let b = 0; b < n; b++) branches[b][0] = prev[b];

  for (let j = 1; j <= NK; j++) {
    const Kj = K_LO * Math.pow(K_HI / K_LO, (j - 1) / (NK - 1));
    const roots = polyRoots(charPoly(num, den, Kj));
    let best = null;
    let bestCost = Infinity;
    for (const p of perms) {
      let cost = 0;
      for (let b = 0; b < n; b++) {
        const r = roots[p[b]];
        cost += Math.hypot(r[0] - prev[b][0], r[1] - prev[b][1]);
      }
      if (cost < bestCost) {
        bestCost = cost;
        best = p;
      }
    }
    const matched = best.map((i) => roots[i]);
    for (let b = 0; b < n; b++) branches[b][j] = matched[b];
    prev = matched;
  }

  // one observable, NaN between branches: the plane's path breaks there
  const total = n * (NK + 2);
  const lx = new Float64Array(total);
  const ly = new Float64Array(total);
  let w = 0;
  for (let b = 0; b < n; b++) {
    for (let j = 0; j <= NK; j++) {
      lx[w] = branches[b][j][0];
      ly[w] = branches[b][j][1];
      w++;
    }
    lx[w] = NaN;
    ly[w] = NaN;
    w++;
  }

  /* ---------- the current K: poles, damping, verdict --------------------- */
  const now = polyRoots(charPoly(num, den, K));
  const maxRe = Math.max(...now.map((r) => r[0]));
  const verdict = maxRe > 1e-9 ? 'unstable' : maxRe < -1e-9 ? 'stable' : 'marginal';

  // dominant pair: the pole of largest real part; its damping is cos of the
  // angle to the negative real axis (1 for a real pole, 0 on the axis)
  const dom = now.reduce((a, r) => (r[0] > a[0] ? r : a));
  const mag = Math.hypot(dom[0], dom[1]);
  const damping = mag > 1e-12 ? Math.min(1, Math.max(-1, -dom[0] / mag)) : 1;

  const openPoles = polyRoots(den);
  const openZeros = num.length > 1 ? polyRoots(num) : [];

  /* ---------- the same system, in time ----------------------------------- */
  // closed loop: T(s) = K·num / (den + K·num), stepped from rest
  const cl = charPoly(num, den, K);
  const scaledNum = num.map((v) => K * v);
  const sim = simulate(scaledNum, cl, () => 1, { T: 12, h: 0.004, keep: 6 });
  const step = { x: sim.t, y: sim.y };

  const plane = (roots) => ({
    x: Float64Array.from(roots, (r) => r[0]),
    y: Float64Array.from(roots, (r) => r[1]),
  });

  // K_crit, where the locus crosses the axis — closed forms from Routh:
  // triple → 6; zero with z > 3 → 6/(z−3); the two other cases never cross
  const kCrit = sys === 'triple' ? 6 : sys === 'zero' && z > 3 ? 6 / (z - 3) : Infinity;

  return {
    observables: {
      branches: { x: lx, y: ly },
      openPoles: plane(openPoles),
      openZeros: plane(openZeros),
      nowPoles: plane(now),
      step,
      stability: { value: verdict, meta: { label: 'closed loop' } },
      damping: { value: damping, meta: { label: 'dominant damping', precision: 2 } },
      ...(Number.isFinite(kCrit)
        ? { kCrit: { value: kCrit, meta: { label: 'K crit', precision: 2 } } }
        : {}),
    },
  };
}
