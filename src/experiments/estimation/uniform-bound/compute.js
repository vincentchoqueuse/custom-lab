// Three estimators of the right bound θ of X ~ U[0, θ] (left bound known 0):
//   θ̂₁ = max xᵢ        biased low:  E[θ̂₁] = Nθ/(N+1),  MSE = 2θ²/((N+1)(N+2))
//   θ̂₂ = max + min     unbiased (E[min] = θ/(N+1) compensates the max),
//                       and the SAME MSE = 2θ²/((N+1)(N+2)) as the max
//   θ̂₃ = 2 x̄          unbiased (method of moments), MSE = θ²/(3N)
// The punchline is the convergence RATE: order statistics give 1/N, the
// sample mean only 1/√N — support regularity beats the CLT.
// PURE, stateless, seeded — runs in a worker; deterministic at fixed seed.
import { mulberry32 } from '../../../core/rng.js';
import { mean } from '../../../core/numeric.js';

const N_GRID = [2, 3, 5, 8, 12, 20, 35, 60, 100, 200];

/**
 * @param {{theta: number, N: number, M: number, seed: number}} params
 * @returns {{observables: Object}}
 */
export function compute({ theta, N, M, seed }) {
  const rng = mulberry32(seed);

  // one experiment: N uniform draws → (max, min, mean); optionally keep them
  const drawStats = (n, keep) => {
    let mx = 0;
    let mn = theta;
    let sum = 0;
    for (let i = 0; i < n; i++) {
      const x = theta * rng();
      if (x > mx) mx = x;
      if (x < mn) mn = x;
      sum += x;
      if (keep) keep[i] = x;
    }
    return [mx, mx + mn, (2 * sum) / n];
  };

  // sampling distributions at the pill's N (rep 0 is the displayed sample)
  const sample = new Float64Array(N);
  const t1 = new Float64Array(M);
  const t2 = new Float64Array(M);
  const t3 = new Float64Array(M);
  for (let m = 0; m < M; m++) {
    const [e1, e2, e3] = drawStats(N, m === 0 ? sample : null);
    t1[m] = e1;
    t2[m] = e2;
    t3[m] = e3;
  }
  const rmseOf = (t) => {
    let acc = 0;
    for (let m = 0; m < M; m++) acc += (t[m] - theta) ** 2;
    return Math.sqrt(acc / M);
  };

  // empirical RMSE across sample sizes + exact theory curves
  const gx = new Float64Array(N_GRID.length);
  const r1 = new Float64Array(N_GRID.length);
  const r2 = new Float64Array(N_GRID.length);
  const r3 = new Float64Array(N_GRID.length);
  const rTh1 = new Float64Array(N_GRID.length);
  const rTh3 = new Float64Array(N_GRID.length);
  for (let g = 0; g < N_GRID.length; g++) {
    const n = N_GRID[g];
    let a1 = 0;
    let a2 = 0;
    let a3 = 0;
    for (let m = 0; m < M; m++) {
      const [e1, e2, e3] = drawStats(n, null);
      a1 += (e1 - theta) ** 2;
      a2 += (e2 - theta) ** 2;
      a3 += (e3 - theta) ** 2;
    }
    gx[g] = n;
    r1[g] = Math.sqrt(a1 / M);
    r2[g] = Math.sqrt(a2 / M);
    r3[g] = Math.sqrt(a3 / M);
    rTh1[g] = theta * Math.sqrt(2 / ((n + 1) * (n + 2)));
    rTh3[g] = theta / Math.sqrt(3 * n);
  }

  // L'ordonnée de cette vue ne mesure RIEN : les points sont posés sur une
  // seule ligne, à mi-hauteur, et c'est l'abscisse seule qui porte
  // l'information. C'était déjà le cas avant, mais avec un décalage vertical
  // ALÉATOIRE qui laissait croire à une seconde dimension. Une hauteur
  // constante le dit franchement, et l'axe est nommé par ce qu'il porte —
  // l'échantillon — plutôt que par une grandeur qui n'existe pas.
  const rugY = new Float64Array(N).fill(0.5);

  return {
    observables: {
      samplePoints: { x: sample, y: rugY },
      // rep-0 point estimates (vline sources; no meta → kept off the statline)
      est1: t1[0],
      est2: t2[0],
      est3: t3[0],
      t1,
      t2,
      t3,
      rmseN1: { x: gx, y: r1 },
      rmseN2: { x: gx, y: r2 },
      rmseN3: { x: gx, y: r3 },
      rmseTh1: { x: gx, y: rTh1 },
      rmseTh3: { x: gx, y: rTh3 },
      rmse1: { value: rmseOf(t1), meta: { label: 'RMSE max', precision: 3 } },
      rmse2: { value: rmseOf(t2), meta: { label: 'RMSE max+min', precision: 3 } },
      rmse3: { value: rmseOf(t3), meta: { label: 'RMSE 2x̄', precision: 3 } },
    },
  };
}
