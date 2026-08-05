import { float, log, select } from '../../../core/fields.js';
import { vline } from '../../../core/views.js';
import { timeView, impulseView, spectrumView } from '../../../core/response-views.js';

/** @type {import('../../../core/types').ExperimentManifest} */
export default {
  id: 'svf',
  order: 3,
  title: 'The state-variable IIR filter',
  subtitle: 'A periodic signal sculpted — four filters for two multiplications',
  tags: ['digital', 'SVF', 'resonance', 'harmonics', 'synthesis'],

  params: {
    source: select('source', {
      description: 'periodic input signal',
      options: [
        { value: 'square', label: 'square' },
        { value: 'saw', label: 'sawtooth' },
      ],
      default: 'square',
    }),
    f0: float('f₀', {
      description: 'fundamental of the signal',
      min: 50,
      max: 400,
      step: 1,
      default: 110,
      unit: 'Hz',
      precision: 0,
    }),
    fc: log('f_c', {
      description: 'cutoff frequency of the SVF (Fs = 8 kHz)',
      min: 100,
      max: 1500,
      default: 500,
      unit: 'Hz',
      precision: 0,
    }),
    Q: log('Q', {
      description: 'resonance factor',
      min: 0.5,
      max: 20,
      default: 2,
      precision: 2,
    }),
    output: select('output', {
      description: 'output of the SVF (all four exist simultaneously)',
      options: [
        { value: 'lp', label: 'low-pass' },
        { value: 'bp', label: 'band-pass' },
        { value: 'hp', label: 'high-pass' },
        { value: 'notch', label: 'band-stop (notch)' },
      ],
      default: 'lp',
    }),
  },

  validate: [
    {
      // the REAL stability boundary of the Chamberlin structure: the poles
      // leave the unit circle when f1·(f1 + 2/Q) ≥ 4 — high fc + low Q
      when: (p) => {
        const f1 = 2 * Math.sin((Math.PI * p.fc) / 8000);
        return f1 * f1 + (2 * f1) / p.Q >= 3.92;
      },
      message: 'Chamberlin SVF unstable here: f₁·(f₁ + 2/Q) ≥ 4 — lower f_c or raise Q (its historical limit, solved by trapezoidal SVFs)',
    },
  ],

  views: [
    timeView(),
    impulseView({ label: 'h[n] — selected output' }),

    // The module's figure, and only it: the SELECTED response with the input
    // and output spectra under it. Four transfer functions in one frame was
    // this experiment's own invention, and it read as four filters rather than
    // as one structure with a switch — while every other filtering experiment
    // showed the signal going through. The four are still all computed, still
    // all available; the way to see them is the `output` pill, which is also
    // the honest gesture: the Chamberlin loop does not draw four curves, it
    // offers four taps of the same two multiplications.
    spectrumView({
      resp: 'respSel',
      domain: [-60, 30],
      overlays: [vline('fc', { color: '#EDB120', dashed: true, label: 'f_c' })],
    }),
  ],
};
