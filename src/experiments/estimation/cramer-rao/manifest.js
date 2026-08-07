import { float, int } from '../../../core/fields.js';
import { view, histogram, line, density, band, vline, hline, figure } from '../../../core/views.js';

/** @type {import('../../../core/types').ExperimentManifest} */
export default {
  id: 'cramer-rao',
  order: 5,
  random: true,
  title: 'The Cramér–Rao bound',
  subtitle:
    'Estimating μ from N Gaussian draws: no estimator gets below σ²/N',
  tags: ['Cramér–Rao', 'Fisher information', 'efficiency', 'estimator'],

  doc: `N values are drawn from N(μ, σ²) with σ known, and μ is to be estimated.
Three recipes turn the draws into a μ̂ — the mean, the median, and the
midrange, the midpoint of the smallest and largest value — and the question
is how precise an estimator is allowed to be. The dashed line at σ²/N is the
Cramér–Rao bound: no unbiased estimator can go below it. That is a theorem,
not an observation about this particular figure.

The mean sits exactly on the floor — it is efficient, and looking for
something better is wasted effort. The median runs parallel to it, a factor
π/2 above; the ratio view puts its efficiency at 2/π ≈ 0.637, meaning 36 %
of the Fisher information is discarded, permanently rather than at small
samples only — the price of its robustness. The midrange bends away from
both, its variance falling only as 1/ln N, so collecting more data barely
helps it. What each estimator throws away is the useful reading: the median
keeps only the ranks, the midrange keeps only the two worst points.

Two numbers on this screen are routinely confused. N is the sample size
inside one experiment and is what the variance depends on; M is how many
times the experiment is repeated and only sets how well that variance is
MEASURED — raising M smooths the curves without moving them. The link
forward is the theorem that closes the chapter: the maximum likelihood
estimator is asymptotically efficient, which is to say it eventually reaches
this floor.`,


  params: {
    mu: float('μ', {
      description: 'THE parameter to estimate — true population mean',
      min: 0,
      max: 5,
      step: 0.1,
      default: 2,
    }),
    sigma: float('σ', {
      description: 'true standard deviation, assumed KNOWN (only μ is estimated)',
      min: 0.5,
      max: 3,
      step: 0.1,
      default: 1.5,
    }),
    N: int('N', {
      // N and M are the two numbers this experiment lives on and the two a
      // reader mixes up. N is INSIDE one experiment; M is HOW MANY experiments.
      description: 'sample size — draws X₁…X_N inside ONE experiment',
      min: 2,
      max: 200,
      default: 20,
    }),
    M: int('M', {
      description: 'repetitions — how many times that experiment is redone, to measure the spread',
      min: 100,
      max: 10000,
      step: 100,
      default: 3000,
    }),
    // no seed here: injected by the core
  },

  derived: {
    model: {
      label: 'model',
      calc: (p) => `X ~ N(μ = ${p.mu}, σ² = ${(p.sigma ** 2).toFixed(2)}) — μ is estimated`,
    },
    fisher: { label: 'information I(μ) = N/σ²', calc: (p) => (p.N / p.sigma ** 2).toFixed(3) },
    effMedTh: { label: 'asymptotic efficiency of the median: 2/π', calc: () => (2 / Math.PI).toFixed(3) },
  },

  groups: [
    { title: 'Population', params: ['mu', 'sigma'] },
    { title: 'Repeated sampling', params: ['N', 'M'] },
  ],

  // actions omitted → core default [randomizeSeed, freeze]

  derived: {
    // Said in a sentence, because "N draws, M times" is the whole distinction
    // and neither symbol says it on its own.
    budget: {
      label: 'what is drawn',
      calc: (p) =>
        `${p.M} experiments of ${p.N} draws — ${(p.M * p.N).toLocaleString('en-US')} numbers, ` +
        `${p.M} estimates of μ`,
    },
  },

  views: [
    // ONE RECORD, GROWING — the estimator at work, before any talk of variance.
    // The other tabs are statements about M repetitions; this is a single
    // experiment watched while its sample size increases, which is what a
    // measurement actually looks like. The three curves are three readings of
    // the SAME record, so their separation is a property of the estimators and
    // not of three different draws.
    //
    // The band is the Cramér–Rao bound wearing the units of the estimate: ±√(σ²/n)
    // is where the best possible unbiased estimator would still be at that n.
    // The mean's curve lives inside it and the midrange's wanders out — which is
    // the whole experiment, said once, before a single variance is computed.
    view(
      'realization',
      'One record, growing',
      band('crbBand', {
        color: '#0072BD',
        opacity: 0.14,
        label: 'μ ± √(σ²/N) — the bound',
        overlays: [
          hline('muLine', { color: '#18181b', width: 1.4, label: 'μ' }),
          line('runMean', { color: '#0072BD', width: 2.2, label: 'x̄' }),
          line('runMedian', { color: '#D95319', width: 1.8, label: 'median' }),
          line('runMidrange', { color: '#7E2F8E', width: 1.8, label: 'midrange' }),
        ],
        axes: {
          x: { label: 'N — draws seen so far' },
          y: { label: 'estimate of μ' },
        },
      })
    ),


    // the floor: empirical variances against σ²/N in log-log
    view(
      'variance',
      'Variance of μ̂ vs N',
      line('varMean', {
        width: 2.2,
        label: 'μ̂ = x̄ (mean)',
        overlays: [
          line('varMedian', { color: '#77AC30', width: 2.2, label: 'μ̂ = median' }),
          line('varMidrange', { color: '#7E2F8E', width: 2.2, label: 'μ̂ = midrange' }),
          line('crbLine', { color: '#EDB120', width: 2, dashed: true, label: 'CRB = σ²/N' }),
        ],
        axes: { x: { label: 'N', scale: 'log' }, y: { label: 'Var(μ̂)', scale: 'log' } },
      })
    ),

    // three widths at the same N, against the best-possible density
    figure(
      'sampling',
      histogram('dMean', {
        color: '#0072BD',
        opacity: 0.55,
        label: 'μ̂ = x̄ (mean)',
        overlays: [
          histogram('dMedian', { color: '#77AC30', opacity: 0.45, label: 'μ̂ = median' }),
          histogram('dMidrange', { color: '#7E2F8E', opacity: 0.35, label: 'μ̂ = midrange' }),
          density('bestPdf', { color: '#EDB120', width: 2.2, label: 'N(μ, σ²/N) — the distribution of the best μ̂' }),
          vline((p) => p.mu, { color: '#EDB120', dashed: true, width: 1.6 }),
        ],
        axes: { x: 'μ̂', y: 'density' },
      })
    ),

    // efficiency CRB/Var: 1 for the mean, 2/π for the median, → 0 beyond
    view(
      'efficiency',
      'Efficiency of μ̂ vs N',
      line('effMean', {
        width: 2.2,
        label: 'μ̂ = x̄ (mean)',
        overlays: [
          line('effMedian', { color: '#77AC30', width: 2.2, label: 'μ̂ = median' }),
          line('effMidrange', { color: '#7E2F8E', width: 2.2, label: 'μ̂ = midrange' }),
          hline(() => 1, { color: '#EDB120', dashed: true, width: 1.6, label: 'efficient (reaches the bound)' }),
          hline(() => 2 / Math.PI, { color: '#77AC30', dashed: true, width: 1.3, label: '2/π' }),
        ],
        axes: { x: { label: 'N', scale: 'log' }, y: { label: 'CRB / Var(μ̂)', domain: [0, 1.15] } },
      })
    ),
  ],
};
