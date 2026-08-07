import { int, select } from '../../../core/fields.js';
import { view, custom, line, vline } from '../../../core/views.js';

/** @type {import('../../../core/types').ExperimentManifest} */
export default {
  id: 'svd-compression',
  order: 2,
  // The noise image draws, the other three are formulas, so the dice and the
  // R key act on that one alone — and that effect is worth having: hammering
  // R shows that the flat spectrum is a property of noise rather than of THIS
  // noise. The declaration stays binary by contract, and rightly so: making a
  // capability conditional on a parameter would need infrastructure that
  // principle 7 refuses while a single experiment asks for it.
  random: true,
  title: 'Image compression by SVD',
  subtitle: 'An image is a matrix — and Eckart–Young says exactly what is lost',
  tags: ['SVD', 'compression', 'rank', 'Eckart–Young', 'Shepp–Logan', 'singular values'],

  doc: `The Shepp–Logan phantom — a formula, not a photograph: ten ellipses with
published parameters — rebuilt from its rank-1 layers. At k = 3 the oval
is recognizable; the details come back in order of importance, which is
not a figure of speech, the SVD ranked them. At k = 12 the statline reads
3084 numbers stored instead of 16 384, for a difference nobody sees from
four metres.

What decides is the spectrum of singular values, and the four images make
the argument. The phantom's collapse is what makes it compressible; the
rank-4 image's spectrum falls off a cliff after four values and four
layers are EXACT to 1e-14; white noise barely decays over forty layers,
so nothing is negligible and nothing is compressible — noise will never
be compressed by anyone, by any method. The checkerboard is the bet the
eye loses: edges everywhere, detail everywhere, and rank 2 — a separable
formula two layers reconstruct exactly. The eye judges apparent
complexity, not rank, and the two are unrelated.

The energy view states the theorem: the measured error ‖A − Aₖ‖² EQUALS
the sum of the discarded squared singular values — Eckart–Young again,
the same theorem as in the PCA experiment — so k can be chosen for a
target quality by reading the spectrum, before reconstructing anything.
An eigenvalue of a covariance is a squared singular value: two courses,
one theorem.`,


  params: {
    image: select('image', {
      description: 'image analysed (computed, never copied)',
      options: [
        { value: 'phantom', label: 'Shepp–Logan phantom' },
        { value: 'lowrank', label: 'rank 4 by construction' },
        { value: 'checker', label: 'checkerboard' },
        { value: 'noise', label: 'white noise' },
      ],
      default: 'phantom',
    }),
    k: int('k', {
      description: 'rank-1 layers kept',
      min: 1,
      max: 40,
      default: 12,
    }),
  },

  groups: [
    { title: 'Image', params: ['image'] },
    { title: 'Compression', params: ['k'] },
  ],

  views: [
    // The three images first: that is the experiment itself.
    custom('images', 'Original, rank k, residual', () => import('./views/Images.svelte')),

    // The singular spectrum, on a log axis: the ONLY thing that decides
    // whether an image compresses. Freezing (F) and then changing image
    // superimposes two spectra — the comparison is made by gesture rather
    // than by computing four decompositions at every step of the dial.
    view(
      'singular',
      'Singular values',
      line('singular', {
        color: '#0072BD',
        width: 2.4,
        label: 'σᵢ / σ₁',
        overlays: [vline('kLine', { color: '#EDB120', dashed: true, width: 1.6, label: 'k kept' })],
        axes: {
          x: { label: 'index i' },
          // FIXED domain, pinned to the compute's display floor: the freeze
          // gesture superimposes two images, so the two spectra must be read
          // on the same scale
          y: { label: 'σᵢ / σ₁', scale: 'log', domain: [1e-3, 1.5] },
        },
      })
    ),

    // And the accounting: what k buys and what it costs.
    view(
      'energy',
      'Energy kept',
      line('energy', {
        color: '#0072BD',
        width: 2.4,
        label: 'cumulative energy',
        overlays: [vline('kLine', { color: '#EDB120', dashed: true, width: 1.6, label: 'k' })],
        axes: { x: { label: 'layers kept k' }, y: { label: 'energy', unit: '%', domain: [0, 101] } },
      })
    ),
  ],
};
