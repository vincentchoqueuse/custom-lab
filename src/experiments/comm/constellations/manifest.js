import { float, int, select } from '../../../core/fields.js';
import { view, plane, line, scatter } from '../../../core/views.js';
import { basebandFigure } from '../_lib/baseband.js';

/** @type {import('../../../core/types').ExperimentManifest} */
export default {
  id: 'constellations',
  order: 1,
  random: true,
  title: 'Constellations in noise',
  subtitle: 'QPSK, 16-QAM…: nearest-neighbour decision and the price of rate',
  tags: ['modulation', 'QPSK', 'QAM', 'SER', 'AWGN', 'decision'],

  params: {
    mod: select('modulation', {
      description: 'transmitted constellation (unit average energy)',
      options: [
        { value: 'bpsk', label: 'BPSK (1 bit/symbol)' },
        { value: 'qpsk', label: 'QPSK (2 bits/symbol)' },
        { value: '8psk', label: '8-PSK (3 bits/symbol)' },
        { value: '16qam', label: '16-QAM (4 bits/symbol)' },
      ],
      default: 'qpsk',
    }),
    snrDb: float('SNR', {
      description: 'signal-to-noise ratio per symbol Es/N₀',
      min: 0,
      max: 30,
      step: 0.5,
      default: 12,
      unit: 'dB',
      precision: 1,
    }),
    N: int('N', {
      description: 'number of symbols transmitted',
      min: 100,
      max: 20000,
      step: 100,
      default: 2000,
    }),
    // no seed here: injected by the core
  },

  derived: {
    n0: { label: 'N₀ = Es/γ', calc: (p) => (10 ** (-p.snrDb / 10)).toExponential(2) },
  },

  groups: [
    { title: 'Modulation', params: ['mod'] },
    { title: 'Channel', params: ['snrDb', 'N'] },
  ],

  // actions omitted → core default [randomizeSeed, freeze]

  views: [
    // THE SIGNAL, BEFORE THE PICTURE OF IT. The plane below is where this
    // experiment is going, and it is also where a room quietly learns the
    // wrong thing: that a symbol is a dot. It is two real signals in
    // quadrature, and this is the figure that says so — the same 24 symbols
    // sent and received, real part above, imaginary part below. The cloud on
    // the next tab is these two panels with the time thrown away.
    basebandFigure({ txLabel: 'transmitted s[n]', rxLabel: 'received y[n]', symbol: 'y' }),

    // CUSTOM view: the I/Q plane needs an enforced EQUAL-ASPECT scale (PSK
    // circles must be circles) plus ML decision boundaries — no generic
    // 1D-oriented plot type fits. Same justification as GaussianPlane;
    // promotion candidate if a third equal-aspect view appears.
    plane('iq', 'I/Q plane', {
      clouds: [
        { source: 'rxOk', color: '#0072BD', r: 1.7, opacity: 0.3, label: 'decided correctly' },
        { source: 'rxErr', color: '#D95319', r: 2.4, opacity: 0.85, label: 'error' },
      ],
      markers: { source: 'idealPoints', color: '#EDB120', label: 'transmitted symbols' },
      segments: 'boundaries',
    }),

    // The SER curve: theory vs Monte Carlo, log probability axis.
    view(
      'ser',
      'SER vs SNR',
      line('serTheoryCurve', {
        color: '#7E2F8E',
        width: 2.4,
        label: 'theory',
        overlays: [
          scatter('serEmpCurve', { color: '#D95319', size: 5, label: 'Monte Carlo' }),
        ],
        axes: {
          x: { label: 'Es/N₀', unit: 'dB' },
          y: { label: 'SER', scale: 'log', domain: [1e-5, 1] },
        },
      })
    ),
  ],
};
