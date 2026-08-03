import { float, int, select } from '../../../core/fields.js';
import { view, plane, line, scatter } from '../../../core/views.js';

/** @type {import('../../../core/types').ExperimentManifest} */
export default {
  id: 'constellations',
  order: 1,
  random: true,
  title: 'Constellations dans le bruit',
  subtitle: 'QPSK, 16-QAM… : décision au plus proche voisin et prix du débit',
  tags: ['modulation', 'QPSK', 'QAM', 'SER', 'AWGN', 'décision'],

  params: {
    mod: select('modulation', {
      description: 'constellation émise (énergie moyenne unité)',
      options: [
        { value: 'bpsk', label: 'BPSK (1 bit/symbole)' },
        { value: 'qpsk', label: 'QPSK (2 bits/symbole)' },
        { value: '8psk', label: '8-PSK (3 bits/symbole)' },
        { value: '16qam', label: '16-QAM (4 bits/symbole)' },
      ],
      default: 'qpsk',
    }),
    snrDb: float('SNR', {
      description: 'rapport signal à bruit par symbole Es/N₀',
      min: 0,
      max: 30,
      step: 0.5,
      default: 12,
      unit: 'dB',
      precision: 1,
    }),
    N: int('N', {
      description: 'nombre de symboles transmis',
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
    { title: 'Canal', params: ['snrDb', 'N'] },
  ],

  // actions omitted → core default [randomizeSeed, freeze]

  views: [
    // CUSTOM view: the I/Q plane needs an enforced EQUAL-ASPECT scale (PSK
    // circles must be circles) plus ML decision boundaries — no generic
    // 1D-oriented plot type fits. Same justification as GaussianPlane;
    // promotion candidate if a third equal-aspect view appears.
    plane('iq', 'Plan I/Q', {
      clouds: [
        { source: 'rxOk', color: '#0072BD', r: 1.7, opacity: 0.3, label: 'décidé juste' },
        { source: 'rxErr', color: '#D95319', r: 2.4, opacity: 0.85, label: 'erreur' },
      ],
      markers: { source: 'idealPoints', color: '#EDB120', label: 'symboles émis' },
      segments: 'boundaries',
    }),

    // The SER curve: theory vs Monte Carlo, log probability axis.
    view(
      'ser',
      'SER vs SNR',
      line('serTheoryCurve', {
        color: '#7E2F8E',
        width: 2.4,
        label: 'théorie',
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
