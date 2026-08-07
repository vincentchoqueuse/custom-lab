import { int, log, select } from '../../../core/fields.js';
import { view, line, scatter, vline } from '../../../core/views.js';

/** @type {import('../../../core/types').ExperimentManifest} */
export default {
  id: 'matched-filter',
  order: 2,
  random: true,
  title: 'The matched filter',
  subtitle: 'Correlate with what you are looking for: the peak rises out of the noise, gain 10·log₁₀(N)',
  tags: ['matched filter', 'correlation', 'SNR', 'processing gain', 'radar'],

  doc: `One pulse in noise, its shape, width and amplitude known exactly — only its
position is not. At mild SNR anyone can point at it. At −10 dB per sample the
pulse is invisible, and pressing the dice changes nothing about that; the
question the chapter opens on is whether the information is therefore lost.

It is not, because the knowledge of the shape has not been used yet. The
correlator concentrates the whole energy of the pulse, N·SNR, onto a single
lag, while the noise only adds up as √N: the peak stands at τ some 15 dB
below what the eye could do, and the purple estimate sits on the yellow
truth. Lowering the SNR until the peak too is lost, around 0.02, shows that
the limit is real — just much further down.

The processing-gain view states the law: the output SNR is N times the input
SNR, so every doubling of the observation buys 3 dB — a straight line on a
logarithmic N axis, confirmed by Monte Carlo. And at equal energy the pulse
shape moves nothing at all: the matched filter exploits the energy and the
fact that the shape is known, never the shape itself. This is radar, GPS,
and the reason spreading codes are long.`,


  params: {
    shape: select('pulse', {
      description: 'shape of the known pulse',
      options: [
        { value: 'rect', label: 'rectangular' },
        { value: 'halfsine', label: 'half sine' },
        { value: 'gauss', label: 'Gaussian' },
      ],
      default: 'rect',
    }),
    N: int('N', { description: 'pulse length', min: 4, max: 128, default: 32, unit: 'samples' }),
    snr: log('SNR', {
      description: 'signal-to-noise ratio per sample (linear)',
      min: 0.01,
      max: 10,
      default: 0.2,
    }),
    tau: int('τ', { description: 'delay of the pulse', min: 0, max: 256, default: 32, unit: 'samples' }),
    M: int('M', {
      description: 'Monte Carlo draws (Gain view)',
      min: 100,
      max: 5000,
      step: 100,
      default: 800,
    }),
    // no seed here: injected by the core
  },

  validate: [
    { when: (p) => p.tau > 2 * p.N, message: 'τ must stay ≤ 2N (the window is 3N samples)' },
  ],

  derived: {
    gainDb: { label: 'gain = 10·log₁₀(N)', calc: (p) => `${(10 * Math.log10(p.N)).toFixed(1)} dB` },
  },

  groups: [
    { title: 'Pulse', params: ['shape', 'N'] },
    { title: 'Channel', params: ['snr', 'tau'] },
    { title: 'Monte Carlo', params: ['M'] },
  ],

  // actions omitted → core default [randomizeSeed, freeze]

  views: [
    // the pulse is invisible in the raw signal — that is the whole point
    view(
      'signals',
      'Received signal',
      line('received', {
        width: 1.4,
        label: 'r[n] (received)',
        overlays: [line('pulseClean', { color: '#D95319', width: 2.2, label: 's[n−τ] (ground truth)' })],
        axes: { x: 'n', y: 'amplitude' },
      })
    ),

    // the correlator output: the peak rises exactly at τ
    view(
      'correlator',
      'Correlator output',
      line('corrNoisy', {
        width: 2,
        label: 'y[k] (noisy)',
        overlays: [
          line('corrClean', { color: '#D95319', width: 2, dashed: true, label: 'noiseless' }),
          vline((p) => p.tau, { color: '#EDB120', dashed: true, width: 2, label: 'τ' }),
          vline('tauHat', { color: '#7E2F8E', width: 1.8, label: 'τ̂' }),
        ],
        axes: { x: 'lag k', y: 'y[k]' },
      })
    ),

    // the processing gain: +3 dB per doubling of N, whatever the shape
    view(
      'processing',
      'Processing gain',
      line('gainTheory', {
        color: '#7E2F8E',
        width: 2.4,
        label: '10·log₁₀(N·SNR)',
        overlays: [scatter('gainEmp', { color: '#D95319', size: 5, label: 'Monte Carlo' })],
        axes: { x: { label: 'N', scale: 'log' }, y: { label: 'output SNR', unit: 'dB' } },
      })
    ),
  ],
};
