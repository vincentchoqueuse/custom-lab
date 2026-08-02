import { float, bool, select } from '../../../core/fields.js';
import { view, line, scatter, bars, vline } from '../../../core/views.js';

/** @type {import('../../../core/types').ExperimentManifest} */
export default {
  id: 'dac',
  title: 'Le CNA : suréchantillonnage et reconstruction',
  subtitle: "Zero-stuffing, filtre d'interpolation, escalier — et l'enveloppe en sinc",
  tags: ['numérique', 'analogique', 'CNA', 'DAC', 'suréchantillonnage', 'interpolation', 'ZOH'],

  params: {
    f0: float('f₀', {
      description: 'fréquence du signal (Fs = 8 kHz)',
      min: 100,
      max: 3500,
      step: 10,
      default: 1000,
      unit: 'Hz',
      precision: 0,
    }),
    L: select('L', {
      description: 'facteur de suréchantillonnage',
      options: [
        { value: 1, label: '×1' },
        { value: 2, label: '×2' },
        { value: 4, label: '×4' },
        { value: 8, label: '×8' },
      ],
      default: 4,
    }),
    digFilter: bool('filtre num.', {
      description: "filtre numérique d'interpolation (sinc fenêtré)",
      default: true,
    }),
  },

  views: [
    view(
      'time',
      "L'escalier du CNA",
      line('staircase', {
        width: 1.6,
        label: 'sortie CNA',
        overlays: [
          line('idealSig', { color: '#D95319', dashed: true, label: 'signal idéal' }),
          scatter('samples', { color: '#7E2F8E', size: 4, opacity: 0.9, label: 'échantillons Fs' }),
        ],
        axes: { x: { label: 't', unit: 'ms' }, y: 'x(t)' },
      })
    ),
    view(
      'digital',
      'Le domaine numérique',
      bars('upBars', {
        label: 'zero-stuffing ×L',
        overlays: [line('upLine', { color: '#D95319', width: 2, label: 'après filtre' })],
        axes: { x: { label: 't', unit: 'ms' }, y: 'x[k] à L·Fs' },
      })
    ),
    view(
      'spectrum',
      'Les images et le sinc',
      line('spectrum', {
        overlays: [
          line('sincEnv', { color: '#D95319', dashed: true, label: 'enveloppe sinc ZOH' }),
          vline((p) => p.L * 8000 - p.f0, { color: '#EDB120', dashed: true, label: 'image 1' }),
        ],
        axes: {
          x: { label: 'f', unit: 'Hz' },
          y: { label: '|X(f)|', unit: 'dB', domain: [-90, 5] },
        },
      })
    ),
  ],
};
