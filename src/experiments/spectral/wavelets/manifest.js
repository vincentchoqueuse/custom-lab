import { int, select } from '../../../core/fields.js';
import { figure, view, stack, line, stem, scatter, vline } from '../../../core/views.js';

/** @type {import('../../../core/types').ExperimentManifest} */
export default {
  id: 'wavelets',
  order: 7,
  title: 'The wavelet transform',
  subtitle: 'Resolution that adapts to scale — and sparsity that belongs to the pair',
  tags: ['wavelet', 'DWT', 'Haar', 'Daubechies', 'compression', 'sparsity'],

  doc: `The spectrogram left the chapter on Gabor's impasse: one window for the
whole signal, choose where to be good. The wavelet pyramid is the historical
answer. Instead of one resolution it takes all of them at once — short
wavelets for clicks, long ones for tones — and the pyramid view reads an
event straight down through the scales at its own instant: the click of the
burst signal lights a handful of fine-scale stems exactly where it happened,
while the steady tone lives untouched in the coarse panel. What the
spectrogram smeared across a whole window, the pyramid points at.

The basis is orthonormal, so nothing here is approximate. Reconstruction is
exact to machine precision; Parseval holds coefficient for coefficient; and
a K-term compression has an error known BEFORE reconstructing — the discarded
energy, the same closed-form statement as Eckart–Young in the SVD experiment.
On Donoho's blocks under Haar the numbers are extreme: a piecewise-constant
signal concentrates in a few dozen coefficients, and the harness bounds the
count by the number of jumps. Daubechies-4 buys the smooth counterpart: its
two vanishing moments annihilate a straight line outright — the ramp's
interior details are zero to 1e-16, not small — at the price of a wider
support. (The wrap column both wavelets keep on the ramp is the
periodization's honest bill, the same one the DFT charges a signal that does
not close on its window.)

The decay view is the invoice of the whole spectral module, and the reason
this experiment closes it. The same signal is expanded in the wavelet basis
and in the orthonormal Fourier basis, both sorted by magnitude: on the
blocks, the wavelet curve plunges and Fourier crawls; on a pure sinusoid the
duel inverts exactly — two Fourier coefficients say everything and Haar
needs hundreds. Sparsity was never a property of the signal. It is a
property of the pair (signal, basis), and the sparse-recovery experiment two
tabs back built an estimator on precisely that sentence.`,

  params: {
    signal: select('signal', {
      description: 'the signal under the pyramid',
      options: [
        { value: 'burst', label: 'tone + click' },
        { value: 'blocks', label: 'Donoho blocks' },
        { value: 'sine', label: 'pure sinusoid' },
        { value: 'ramp', label: 'linear ramp' },
      ],
      default: 'burst',
    }),
    wavelet: select('wavelet', {
      description: 'the analyzing family',
      options: [
        { value: 'haar', label: 'Haar' },
        { value: 'db4', label: 'Daubechies-4' },
      ],
      default: 'haar',
    }),
    K: int('K', {
      description: 'coefficients kept by the compression, largest first',
      min: 1,
      max: 256,
      default: 24,
    }),
  },

  groups: [
    { title: 'Analysis', params: ['signal', 'wavelet'] },
    { title: 'Compression', params: ['K'] },
  ],

  views: [
    figure(
      'time',
      line('signalXY', {
        width: 2,
        label: 'x(t)',
        axes: { x: { label: 't', unit: 's' }, y: 'x(t)' },
      })
    ),

    // THE PYRAMID — the figure this experiment exists for, and exactly what
    // the stack was built for: one shared abscissa, an event read vertically
    // through the scales. Stems, never lines: a detail level is a sampled
    // object, and its emptiness (a ramp under db4) must read as absence.
    stack(
      'pyramid',
      'The pyramid: three scales and a residue',
      [
        stem('d1', { axes: { y: 'd₁' } }),
        stem('d2', { axes: { y: 'd₂' } }),
        stem('d3', { axes: { y: 'd₃' } }),
        stem('a3', { color: '#D95319', axes: { y: 'a₃' } }),
      ],
      { axes: { x: { label: 't', unit: 's' } } }
    ),

    view(
      'compression',
      'K coefficients out of 512',
      line('signalXY', {
        color: '#EDB120',
        width: 1.4,
        dashed: true,
        label: 'x(t)',
        overlays: [line('reconXY', { color: '#0072BD', width: 2.2, label: 'rebuilt from K' })],
        axes: { x: { label: 't', unit: 's' }, y: 'x(t)' },
      })
    ),

    view(
      'decay',
      'The duel: this basis against Fourier',
      line('decayWavelet', {
        width: 2.2,
        label: 'wavelet, sorted',
        overlays: [
          line('decayFourier', { color: '#D95319', width: 2.2, label: 'Fourier, sorted' }),
          vline('kNow', { color: '#EDB120', dashed: true, label: 'K' }),
        ],
        axes: {
          x: 'rank',
          y: { label: '|coefficient|', scale: 'log', domain: [1e-6, null] },
        },
      })
    ),
  ],
};
