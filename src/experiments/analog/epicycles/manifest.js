import { float, int, select } from '../../../core/fields.js';
import { figure, plane, stem, scatter } from '../../../core/views.js';

/** @type {import('../../../core/types').ExperimentManifest} */
export default {
  id: 'epicycles',
  order: 4,
  title: 'Fourier epicycles',
  subtitle: 'A chain of spinning circles retraces any closed curve',
  tags: ['Fourier', 'complex series', 'epicycles', 'spectrum'],

  doc: `A closed contour is a periodic COMPLEX signal, and its Fourier series
Σ c_k·e^{i2πkt} is a machine: one circle per coefficient, radius |c_k|,
spinning at the integer frequency k, each riding the rim of the one before.
The pen at the end of the chain retraces the contour. The fourier-series
experiment built a waveform out of harmonics one quadrature at a time; this
is the same theorem with the two quadratures glued into one plane — and the
picture that made the theorem famous on the internet. The τ pill is the
animation, one frame per drag: the arm walks the tour and the trace grows
behind the pen.

The contours are chosen so the algebra is exact, not approximate. The star
r = 1 + 0.3·cos 5θ IS three circles — c₁, c₆ and c₋₄, nothing else — so at
K = 3 the statline reads 100 % of the energy and the drawing is the curve.
The heart is a trigonometric polynomial with eight known coefficients, drawn
exactly at K = 8. The square is the honest opposite: its corners need
infinitely many circles, the coefficients decay as 1/k², and its four-fold
symmetry z(t+¼) = i·z(t) forces c_k = 0 except at k ≡ 1 (mod 4) — the
spectrum view shows three lines out of four missing, a selection rule read
off a drawing.

The order pill asks the question the spectrum answers: given K circles,
which ones? Largest first is the greedy answer and captures the most energy;
lowest frequency first is the textbook truncation. On the heart at K = 3 the
two chains draw visibly different curves from the same budget — choosing
WHICH coefficients matter is a decision, and the sparse-recovery experiment
two modules over turns exactly that decision into a field.`,

  params: {
    shape: select('shape', {
      description: 'the closed contour to retrace',
      options: [
        { value: 'heart', label: 'a heart' },
        { value: 'star', label: 'a five-point star' },
        { value: 'square', label: 'a square' },
      ],
      default: 'heart',
    }),
    K: int('K', { description: 'circles in the chain', min: 1, max: 64, default: 8 }),
    tau: float('τ', {
      description: 'position of the pen along the tour',
      min: 0,
      max: 1,
      step: 0.002,
      default: 0.35,
      precision: 3,
    }),
    sort: select('order', {
      description: 'which K coefficients the chain is built from',
      options: [
        { value: 'mag', label: 'largest circles first' },
        { value: 'freq', label: 'low frequencies first' },
      ],
      default: 'mag',
    }),
  },

  views: [
    // The drawing leads, ahead of the subject's spectrum-second habit: the
    // machine IS this experiment's subject, and the spectrum explains it.
    plane('epicycles', 'The circles, drawing', {
      curves: [
        { source: 'contour', color: '#EDB120', width: 1.4, dashed: true },
        { source: 'circles', color: 'var(--muted-fg)', width: 0.9 },
        { source: 'arm', color: '#7E2F8E', width: 1.6 },
        { source: 'trace', color: '#0072BD', width: 2.4 },
      ],
      markers: { source: 'pen', color: '#D95319', label: 'the pen' },
      minHalf: 1.25,
      maxHalf: 1.45,
      axes: { x: 'x', y: 'y' },
    }),

    // the canonical spectrum figure: ?view=spectrum is the same figure here
    // as everywhere else in the subject — the doc says what to read off it
    figure(
      'spectrum',
      stem('spectrum', {
        label: '|c_k|',
        overlays: [scatter('selected', { color: '#D95319', size: 5.5, label: 'in the chain' })],
        axes: { x: 'k — turns per tour', y: '|c_k|' },
      })
    ),
  ],
};
