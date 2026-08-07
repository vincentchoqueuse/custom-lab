import { float, int, select } from '../../../core/fields.js';
import { view, figure, figureStack, line, scatter, stem, vline, hline, band } from '../../../core/views.js';
// the pinned framing and the base of the frame, shared with the computation:
// the noise rectangles reach exactly down to that base
import { fWindow, MODEL_FLOOR } from '../_lib/frame.js';

/** The frequency axis, PINNED, and the same on the three views that carry one:
 *  the periodogram, the estimated spectrum and the pseudo-spectrum are read one
 *  after another, and a frame that moves from tab to tab — or when N changes —
 *  makes the lines look as if they moved. The bounds come from frame.js, shared
 *  with the computation grid. */
const F_AXIS = { label: 'f', unit: 'Hz', domain: fWindow };

/** The true frequencies, as verticals — the same on all three views, declared
 *  once so that they cannot drift apart. */
const TRUTH = [
  vline('fTrue1', { color: '#EDB120', dashed: true, width: 1.6, label: 'true frequencies' }),
  vline('fTrue2', { color: '#EDB120', dashed: true, width: 1.6 }),
  vline('fTrue3', { color: '#EDB120', dashed: true, width: 1.6 }),
];

/** @type {import('../../../core/types').ExperimentManifest} */
export default {
  id: 'subspace',
  order: 4,
  random: true, // complex Gaussian noise
  title: 'High-resolution methods',
  subtitle: 'MUSIC, root-MUSIC, ESPRIT — what a model buys, and what it costs',
  tags: ['high resolution', 'MUSIC', 'ESPRIT', 'subspace', 'eigenvalues'],

  doc: `The record the periodogram gave up on: two lines 2 Hz apart — half a
Fourier limit — at 25 dB on 256 samples, one hump. Subspace methods
separate them by assuming what Fourier does not: that the signal IS d
exponentials in white noise.

The eigenvalues of the covariance are where the model meets the data: a few
large ones, then a plateau at σ², and the number above the plateau is the
number of sources — the only information available for choosing d. Lowering
the SNR raises the plateau until counting becomes impossible: high-
resolution methods do not degrade gently, they break. With d in hand, MUSIC
sweeps a pseudo-spectrum while root-MUSIC and ESPRIT sweep nothing — they
solve an equation and return numbers, gridless, with errors of the order of
a hundredth of a hertz. How far it holds is measured: Δf = 0.3 Fourier
limits needs 30 dB, 0.2 needs 40, and at M = 12 snapshots even 0.5 stops
working. The periodogram never collapses; it stays mediocre whatever is
done to it. That is the bargain in both directions.

Getting d wrong is the failure worth rehearsing. Underestimated, a source
disappears bluntly. Overestimated, swept MUSIC forgives — but root-MUSIC
and ESPRIT return exactly d numbers, and the invented ones can land outside
the frame where nothing shows them. An invented NUMBER looks like a result,
which is why d is read off the eigenvalues and never by eye. The model view
closes the loop without needing the truth: refitting amplitudes by least
squares, the residual estimates the noise floor, and a floor that rises
above its expected level says the model is wrong — which is exactly the
situation with a real signal, where the true curve does not exist.`,


  params: {
    df: float('Δf', {
      description: 'gap between the two lines, in units of the Fourier limit Fs/N',
      min: 0.05,
      max: 3,
      step: 0.05,
      // 0.5: the periodogram does not separate (it needs 1), MUSIC does from
      // 20 dB up — measured, not assumed. Going lower is possible and is the
      // subject of scene 3, but the SNR must then rise, which IS the point.
      default: 0.5,
      precision: 2,
    }),
    snr: float('SNR', {
      description: 'signal-to-noise ratio per line',
      min: -10,
      max: 50,
      step: 1,
      default: 25,
      unit: 'dB',
      precision: 0,
    }),
    d: int('d', {
      description: 'eigenvalues kept as SIGNAL — the parameter that has to be guessed',
      min: 1,
      max: 8,
      default: 2,
    }),
    sources: select('sources', {
      description: 'number of lines actually present',
      options: [
        { value: 2, label: '2 (two close lines)' },
        { value: 3, label: '3 — one further off' },
      ],
      default: 2,
    }),
    N: select('N', {
      description: 'record length (Fs = 1 kHz)',
      options: [
        { value: 128, label: '128' },
        { value: 256, label: '256' },
        { value: 512, label: '512' },
        { value: 1024, label: '1024' },
      ],
      default: 256,
    }),
    M: int('M', {
      description: 'covariance order — the number of eigenvectors available',
      min: 4,
      max: 32,
      // the resolution of MUSIC grows with M: at M = 12 it no longer separates
      // 0.5 × Fs/N, at M = 32 it does. That is the second lever of the bargain.
      default: 32,
    }),
    // seed injected by the core, because random: true
  },

  validate: [
    { when: (p) => p.d >= p.M, message: 'd must stay strictly below M' },
    { when: (p) => p.M > p.N / 2, message: 'M cannot exceed N/2 (not enough snapshots)' },
  ],

  derived: {
    fourierLimit: { label: 'Fourier limit Fs/N', calc: (p) => `${(1000 / p.N).toFixed(2)} Hz` },
    ecart: {
      label: 'requested gap',
      calc: (p) => `${((p.df * 1000) / p.N).toFixed(2)} Hz (${p.df}× the limit)`,
    },
  },

  groups: [
    { title: 'Signal', params: ['sources', 'df', 'snr', 'N'] },
    { title: 'Model', params: ['d', 'M'] },
  ],

  views: [
    // THE RECORD, before any opinion about what is in it. Two sinusoids in
    // noise look like nothing in time — which is exactly the point, and the
    // reason every other tab here exists. A room shown four estimates of a
    // spectrum without first seeing what they were estimated FROM has been
    // given four answers and no question.
    figureStack(
      'time',
      [
        line('sigI', { color: '#0072BD', width: 1.4, axes: { y: { label: 'Re x[n]' } } }),
        line('sigQ', { color: '#0072BD', width: 1.4, axes: { y: { label: 'Im x[n]' } } }),
      ],
      { axes: { x: { label: 'sample n' } } }
    ),

    // THE reference, and the starting point: the periodogram does not separate.
    // It is the same "Spectrum" as everywhere else in the subject, under the
    // same name, because it is exactly the same object.
    figure(
      'spectrum',
      line('periodogram', {
        width: 2,
        label: 'periodogram',
        overlays: TRUTH,
        axes: { x: F_AXIS, y: { label: '|X(f)|', unit: 'dB' } },
      })
    ),

    // The view used to CHOOSE d — and the only information available for doing
    // so in practice. The d that are kept are marked; the vertical is the
    // cutoff; the horizontal is the true σ², known here because the signal is
    // manufactured and never in real life.
    view(
      'eigen',
      'Eigenvalues',
      line('eigenvalues', {
        width: 2,
        label: 'λ_k (decreasing)',
        overlays: [
          scatter('eigenSelected', { color: '#D95319', size: 9, label: 'kept as signal' }),
          vline('dLine', { color: '#D95319', dashed: true, width: 1.6, label: 'cutoff d' }),
          // 2σ² and not σ²: the noise is circular complex, it carries σ² per
          // quadrature. The label therefore states the real level.
          hline('noiseLine', { color: '#77AC30', dashed: true, width: 1.6, label: 'noise 2σ² (true)' }),
        ],
        axes: { x: { label: 'k' }, y: { label: 'λ_k / λ₁', unit: 'dB' } },
      })
    ),

    // The result. The pseudo-spectrum is NOT a spectral density — it is the
    // inverse of a distance to the noise subspace, with no physical unit — and
    // the two grid-free estimators are laid on it as points: root-MUSIC and
    // ESPRIT give NUMBERS, not curves.
    view(
      'pseudo',
      'Pseudo-spectrum',
      line('pseudo', {
        width: 2.2,
        label: 'MUSIC',
        overlays: [
          ...TRUTH,
          scatter('rootMusicMarks', { color: '#D95319', size: 10, label: 'root-MUSIC' }),
          scatter('espritMarks', { color: '#7E2F8E', size: 10, label: 'ESPRIT' }),
        ],
        axes: { x: F_AXIS, y: { label: 'pseudo-spectrum', unit: 'dB' } },
      })
    ),
    // The MODEL, once complete. Subspace methods return frequencies and nothing
    // else; the amplitudes come from a least squares at the frequencies found,
    // and the noise variance from what is left. This is the view that says
    // whether the model EXPLAINS the measurement, and not merely whether it
    // found lines in the right place.
    //
    // THREE spectra in the SAME representation — stems for the sinusoids, a
    // line for the noise level — because it is that identity of form which
    // allows comparing them at a glance instead of translating mentally from one
    // drawing to another. The colours are those of the pseudo-spectrum: orange
    // root-MUSIC, purple ESPRIT, yellow the truth, from one view to the next
    // with nothing to relearn.
    //
    // In nominal conditions the three coincide, and that is THE result, not a
    // legibility defect. They separate exactly when the model stops explaining
    // the measurement.
    view(
      'model',
      'Estimated spectrum',
      stem('linesTrue', {
        color: '#EDB120',
        size: 7,
        baseline: -60,
        label: 'ground truth',
        overlays: [
          stem('linesRoot', { color: '#D95319', size: 4.5, baseline: -60, label: 'root-MUSIC' }),
          stem('linesEsprit', { color: '#7E2F8E', size: 4.5, baseline: -60, label: 'ESPRIT' }),
          // One FLOOR per spectrum, in its colour, and not a line: the noise is
          // a power spread over the whole band, and the lines rise above it.
          // That is the model "d exponentials PLUS white noise" drawn as it is
          // written, and it is also what makes a raised floor visible at a
          // glance. The upper edge is still drawn on top: a translucent wash
          // cannot be read to the decibel.
          band('bandTrue', { color: '#EDB120', opacity: 0.16, label: 'ground truth' }),
          band('bandRoot', { color: '#D95319', opacity: 0.16, label: 'root-MUSIC' }),
          band('bandEsprit', { color: '#7E2F8E', opacity: 0.16, label: 'ESPRIT' }),
          hline('nsTrue', { color: '#EDB120', width: 1.6, label: 'ground truth' }),
          hline('nsRoot', { color: '#D95319', dashed: true, width: 1.6, label: 'root-MUSIC' }),
          hline('nsEsprit', { color: '#7E2F8E', dashed: true, width: 1.6, label: 'ESPRIT' }),
        ],
        axes: { x: F_AXIS, y: { label: 'power', unit: 'dB', domain: [MODEL_FLOOR, 8] } },
      })
    ),
  ],
};
