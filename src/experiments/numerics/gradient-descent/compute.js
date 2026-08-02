// Descent algorithms on a 2D landscape, three trajectories on the SAME
// function from the SAME start:
//   gradient à pas fixe   xₖ₊₁ = xₖ − α∇f        (rate max(|1−α|,|1−ακ|)²)
//   momentum              v ← βv − α∇f, x ← x+v
//   Newton                x ← x − H⁻¹∇f          (one step on a quadratic)
// Landscapes: an ill-conditioned quadratic f = (x² + κy²)/2 (the zigzag
// valley) and Rosenbrock f = (1−x)² + 100(y−x²)² (the banana). Iso-contours
// are extracted by marching squares in compute (views never compute) as
// segment lists; f(xₖ)−f* feeds the semi-log convergence view.
// PURE, stateless, seeded — runs in a worker; deterministic at fixed seed.

const GRID = 91; // marching-squares resolution
const N_LEVELS = 8;

const FUNCTIONS = {
  quad: {
    domain: { x0: -2, x1: 2, y0: -2, y1: 2 },
    start: [1.8, 1.4],
    optimum: [0, 0],
    fMin: 0,
    f: (k, x, y) => (x * x + k * y * y) / 2,
    grad: (k, x, y) => [x, k * y],
    hess: (k) => [1, 0, 0, k],
  },
  rosenbrock: {
    domain: { x0: -2, x1: 2, y0: -1, y1: 3 },
    start: [-1.2, 1],
    optimum: [1, 1],
    fMin: 0,
    f: (_k, x, y) => (1 - x) ** 2 + 100 * (y - x * x) ** 2,
    grad: (_k, x, y) => [
      -2 * (1 - x) - 400 * x * (y - x * x),
      200 * (y - x * x),
    ],
    hess: (_k, x, y) => [2 - 400 * (y - 3 * x * x), -400 * x, -400 * x, 200],
  },
};

/** Marching squares: iso-segments of f at the given levels, flat arrays. */
function contours(def, k, levels) {
  const { x0, x1, y0, y1 } = def.domain;
  const v = new Float64Array(GRID * GRID);
  const gx = (i) => x0 + ((x1 - x0) * i) / (GRID - 1);
  const gy = (j) => y0 + ((y1 - y0) * j) / (GRID - 1);
  for (let j = 0; j < GRID; j++) {
    for (let i = 0; i < GRID; i++) v[j * GRID + i] = def.f(k, gx(i), gy(j));
  }
  const segs = [];
  const lerp = (a, b, va, vb, l) => a + ((l - va) / (vb - va)) * (b - a);
  for (const l of levels) {
    for (let j = 0; j < GRID - 1; j++) {
      for (let i = 0; i < GRID - 1; i++) {
        const v00 = v[j * GRID + i];
        const v10 = v[j * GRID + i + 1];
        const v01 = v[(j + 1) * GRID + i];
        const v11 = v[(j + 1) * GRID + i + 1];
        // crossing points on the four cell edges
        const pts = [];
        if (v00 < l !== v10 < l) pts.push([lerp(gx(i), gx(i + 1), v00, v10, l), gy(j)]);
        if (v01 < l !== v11 < l) pts.push([lerp(gx(i), gx(i + 1), v01, v11, l), gy(j + 1)]);
        if (v00 < l !== v01 < l) pts.push([gx(i), lerp(gy(j), gy(j + 1), v00, v01, l)]);
        if (v10 < l !== v11 < l) pts.push([gx(i + 1), lerp(gy(j), gy(j + 1), v10, v11, l)]);
        if (pts.length === 2) segs.push(pts[0][0], pts[0][1], pts[1][0], pts[1][1]);
        // (the rare ambiguous 4-point saddle cell is skipped: guide lines only)
      }
    }
  }
  return Float64Array.from(segs);
}

/**
 * @param {{fn: string, kappa: number, alpha: number, beta: number, N: number,
 *          seed: number}} params
 * @returns {{observables: Object}}
 */
export function compute({ fn, kappa, alpha, beta, N }) {
  const def = FUNCTIONS[fn];
  const k = kappa;
  const CLAMP = 1e6; // keep diverging trajectories finite

  const run = (stepper) => {
    const px = new Float64Array(N + 1);
    const py = new Float64Array(N + 1);
    const gap = new Float64Array(N + 1);
    let [x, y] = def.start;
    const state = { v: [0, 0] };
    for (let i = 0; i <= N; i++) {
      px[i] = x;
      py[i] = y;
      gap[i] = Math.max(def.f(k, x, y) - def.fMin, 1e-16);
      if (i === N) break;
      [x, y] = stepper(x, y, state);
      if (!Number.isFinite(x) || Math.abs(x) > CLAMP) x = Math.sign(x || 1) * CLAMP;
      if (!Number.isFinite(y) || Math.abs(y) > CLAMP) y = Math.sign(y || 1) * CLAMP;
    }
    return { px, py, gap };
  };

  const gradient = run((x, y) => {
    const g = def.grad(k, x, y);
    return [x - alpha * g[0], y - alpha * g[1]];
  });
  const momentum = run((x, y, s) => {
    const g = def.grad(k, x, y);
    s.v = [beta * s.v[0] - alpha * g[0], beta * s.v[1] - alpha * g[1]];
    return [x + s.v[0], y + s.v[1]];
  });
  const newton = run((x, y) => {
    const g = def.grad(k, x, y);
    const [a, b, c, d] = def.hess(k, x, y);
    const det = a * d - b * c;
    if (Math.abs(det) < 1e-12) return [x - alpha * g[0], y - alpha * g[1]];
    return [x - (d * g[0] - b * g[1]) / det, y - (a * g[1] - c * g[0]) / det];
  });

  // iso-levels: geometric ladder under the value at the start corner region
  const { x1, y1 } = def.domain;
  const fHi = def.f(k, x1, def.domain.y0) * 0.9;
  const levels = Array.from({ length: N_LEVELS }, (_, j) => fHi / 4 ** j);

  const iters = Float64Array.from({ length: N + 1 }, (_, i) => i);

  return {
    observables: {
      contourSegs: contours(def, k, levels),
      trajGradient: { x: gradient.px, y: gradient.py },
      trajMomentum: { x: momentum.px, y: momentum.py },
      trajNewton: { x: newton.px, y: newton.py },
      startPoint: { x: Float64Array.from([def.start[0]]), y: Float64Array.from([def.start[1]]) },
      optimum: { x: Float64Array.from([def.optimum[0]]), y: Float64Array.from([def.optimum[1]]) },
      gapGradient: { x: iters, y: gradient.gap },
      gapMomentum: { x: iters, y: momentum.gap },
      gapNewton: { x: iters, y: newton.gap },
      finalGradient: {
        value: gradient.gap[N],
        meta: { label: 'gradient : f−f*', precision: 6 },
      },
      finalNewton: {
        value: newton.gap[N],
        meta: { label: 'Newton : f−f*', precision: 6 },
      },
    },
  };
}
