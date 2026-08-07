import { float, int, log } from '../../../core/fields.js';
import { view, line, histogram, scatter, band, vline, hline } from '../../../core/views.js';

/** @type {import('../../../core/types').ExperimentManifest} */
export default {
  id: 'p-value',
  order: 7,
  random: true,
  title: 'The p-value',
  subtitle: 'What the most used number in science is — and what it is not',
  tags: ['hypothesis test', 'p-value', 'level', 'power', 'z-test'],

  doc: `A test asks one question of the data: are these N draws compatible with
μ = 0? The machinery is three moves — compress the sample into a statistic
T = √N·x̄/σ, place it on the distribution it would have IF the null were
true, and read the p-value as the area beyond it: the probability, under H₀,
of a result at least this extreme. The p-value is that area and nothing
else. It is not the probability that H₀ is true, and the second view is
built to break the habit of reading it as one.

That view repeats the whole experiment M times with δ = 0 — nothing going
on — and histograms the M p-values. They are UNIFORM: under the null the
p-value is a random variable that lands below 0.05 one time in twenty,
forever, by construction. A small p is therefore not proof; it is an event
whose rarity under H₀ is exactly its own value, and the level α is the rate
of false alarms one has agreed to live with. (Detection, one module over,
calls the same number P_FA.)

The third view prices significance in the currency it is actually bought
with: data. The rejection rate against N, measured and in closed form, rises
to 1 for ANY nonzero effect — at δ = 0.1 a large enough N makes p < 0.05
almost certain, though the effect is a tenth of a standard deviation and
matters to nobody. Statistical significance is not practical importance; it
is a statement about N as much as about μ. And the exact duality with the
experiment next door is worth carrying away: p < α exactly when μ₀ falls
outside the (1−α) confidence interval — the harness checks the equivalence
draw by draw, with zero mismatches allowed. σ is treated as known
throughout; the price of estimating it is the Student story, told there.`,

  params: {
    delta: float('δ', {
      description: 'true effect (μ − μ₀), in the data\'s own units',
      min: -2,
      max: 2,
      step: 0.05,
      default: 0.5,
      precision: 2,
    }),
    sigma: float('σ', {
      description: 'known standard deviation of one draw',
      min: 0.5,
      max: 3,
      step: 0.1,
      default: 1,
    }),
    N: int('N', { description: 'sample size of one experiment', min: 2, max: 500, default: 20 }),
    alpha: log('α', {
      description: 'level — the false-alarm rate agreed to in advance',
      min: 0.001,
      max: 0.2,
      default: 0.05,
      precision: 3,
    }),
    M: int('M', {
      description: 'replications of the whole experiment',
      min: 500,
      max: 20000,
      step: 500,
      default: 4000,
    }),
    // no seed here: injected by the core
  },

  groups: [
    { title: 'Truth', params: ['delta', 'sigma'] },
    { title: 'The test', params: ['N', 'alpha'] },
    { title: 'Replication', params: ['M'] },
  ],

  views: [
    view(
      'statistic',
      'The statistic, and the area that is p',
      line('nullDensity', {
        width: 2.2,
        label: 'density of T under H₀',
        overlays: [
          band('tailLeft', { color: '#D95319', opacity: 0.35 }),
          band('tailRight', { color: '#D95319', opacity: 0.35, label: 'p — the shaded area' }),
          vline('tObs', { color: '#D95319', width: 2, label: 't observed' }),
          vline('critLo', { color: '#EDB120', dashed: true }),
          vline('critHi', { color: '#EDB120', dashed: true, label: '±z at level α' }),
        ],
        axes: { x: 't', y: 'density under H₀' },
      })
    ),

    view(
      'calibration',
      'M p-values, as a histogram',
      histogram('pValues', {
        label: 'p over M replications',
        overlays: [
          hline(() => 1, { color: '#D95319', dashed: true, width: 1.8, label: 'uniform density' }),
          vline((p) => p.alpha, { color: '#EDB120', dashed: true, label: 'α' }),
        ],
        axes: { x: { label: 'p', domain: [0, 1] }, y: 'density' },
      })
    ),

    view(
      'power',
      'Rejection rate vs N',
      line('powerCurve', {
        width: 2.2,
        label: 'closed form',
        overlays: [
          scatter('powerMc', { color: '#D95319', size: 5.5, label: 'measured (400 reps)' }),
          hline((p) => p.alpha, { color: '#EDB120', dashed: true, label: 'α' }),
        ],
        axes: {
          x: { label: 'N', scale: 'log' },
          y: { label: 'rejection rate', domain: [0, 1] },
        },
      })
    ),
  ],
};
