// THE P-VALUE — the z-test of H₀: μ = 0 against μ ≠ 0, σ known, taken apart.
//
// One honest experiment: N draws, x̄, the statistic T = √N·x̄/σ, and
// p = 2·Q(|t|) — the probability, UNDER H₀, of a statistic at least this far
// out. Then the part no single experiment can show: M replications of the
// whole procedure, to watch the distribution OF the p-value itself, and the
// rejection rate as a function of N against its closed form.
//
// The replications draw x̄ DIRECTLY as one Gaussian N(δ, σ²/N) per repetition
// rather than N draws each: x̄ is sufficient here, the distribution is exactly
// the same, and M×N draws become M. (σ is treated as known on purpose — the
// price of estimating it is the Student story, told next door by the
// confidence-intervals experiment.)
// PURE, stateless, seeded — runs in a worker; deterministic at fixed seed.
import { mulberry32, gaussFrom } from '../../../core/rng.js';
import { normalPdf, normalQuantile, qfunc } from '../../../core/numeric.js';

const T_SPAN = 4.5; // the statistic axis, in null standard deviations

/** Two-sided p of an observed statistic under N(0, 1). */
const pOf = (t) => 2 * qfunc(Math.abs(t));

/** Closed-form power of the two-sided z-test at level α, effect δ, size N. */
function powerTheory(delta, sigma, N, alpha) {
  const zA = normalQuantile(1 - alpha / 2);
  const shift = (delta * Math.sqrt(N)) / sigma;
  return qfunc(zA - shift) + qfunc(zA + shift);
}

/**
 * @param {{delta: number, sigma: number, N: number, alpha: number, M: number,
 *          seed: number}} params
 * @returns {{observables: Object}}
 */
export function compute({ delta, sigma, N, alpha, M, seed }) {
  const gauss = gaussFrom(mulberry32(seed));

  /* ---------- one experiment: the sample behind the number --------------- */
  let sum = 0;
  for (let i = 0; i < N; i++) sum += delta + sigma * gauss();
  const xbar = sum / N;
  const tObs = (Math.sqrt(N) * xbar) / sigma;
  const pObs = pOf(tObs);
  const zA = normalQuantile(1 - alpha / 2);

  /* ---------- the null density, and the area that IS the p --------------- */
  const NG = 361;
  const gx = new Float64Array(NG);
  const gy = new Float64Array(NG);
  for (let i = 0; i < NG; i++) {
    gx[i] = -T_SPAN + (2 * T_SPAN * i) / (NG - 1);
    gy[i] = normalPdf(gx[i]);
  }
  // the two shaded tails beyond ±|t|: their area is exactly pObs
  const tail = (lo, hi) => {
    const n = 80;
    const x = new Float64Array(n);
    const hiY = new Float64Array(n);
    for (let i = 0; i < n; i++) {
      x[i] = lo + ((hi - lo) * i) / (n - 1);
      hiY[i] = normalPdf(x[i]);
    }
    return { x, lo: new Float64Array(n), hi: hiY };
  };
  const cut = Math.min(Math.abs(tObs), T_SPAN);
  const tailRight = tail(cut, T_SPAN);
  const tailLeft = tail(-T_SPAN, -cut);

  /* ---------- M replications: the p-value as a random variable ----------- */
  const pValues = new Float64Array(M);
  let below = 0;
  for (let m = 0; m < M; m++) {
    const t = (delta * Math.sqrt(N)) / sigma + gauss();
    pValues[m] = pOf(t);
    if (pValues[m] < alpha) below++;
  }

  /* ---------- rejection rate vs N: closed form, and the measurement ------ */
  const NS = 60;
  const nx = new Float64Array(NS);
  const ny = new Float64Array(NS);
  for (let i = 0; i < NS; i++) {
    nx[i] = Math.round(2 * Math.pow(250, i / (NS - 1)));
    ny[i] = powerTheory(delta, sigma, nx[i], alpha);
  }
  const N_MC = [2, 3, 5, 8, 12, 20, 30, 50, 80, 120, 200, 320, 500];
  const REPS = 400;
  const mx = new Float64Array(N_MC.length);
  const my = new Float64Array(N_MC.length);
  for (let k = 0; k < N_MC.length; k++) {
    const shift = (delta * Math.sqrt(N_MC[k])) / sigma;
    let rej = 0;
    for (let r = 0; r < REPS; r++) if (Math.abs(shift + gauss()) > zA) rej++;
    mx[k] = N_MC[k];
    my[k] = rej / REPS;
  }

  const verdict = pObs < alpha ? 'reject H₀' : 'no evidence against H₀';

  return {
    observables: {
      nullDensity: { x: gx, y: gy },
      tailLeft,
      tailRight,
      tObs: { value: tObs, meta: { label: 't', precision: 2 } },
      pObs: { value: pObs, meta: { label: 'p', precision: 4 } },
      verdict: { value: verdict, meta: { label: 'at level α' } },
      critLo: -zA, // bare scalars: vline sources, invisible in the statline
      critHi: zA,
      xbar: { value: xbar, meta: { label: 'x̄', precision: 3 } },
      pValues,
      fracBelow: {
        value: below / M,
        meta: { label: 'share p < α', precision: 3 },
      },
      powerCurve: { x: nx, y: ny },
      powerMc: { x: mx, y: my },
    },
  };
}
