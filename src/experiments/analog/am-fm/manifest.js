import { float, select } from '../../../core/fields.js';
import { view, line, scatter, figure } from '../../../core/views.js';

/** @type {import('../../../core/types').ExperimentManifest} */
export default {
  id: 'am-fm',
  order: 5,
  title: 'AM and FM modulation',
  subtitle: 'Sidebands, Bessel lines and the Carson rule',
  tags: ['analog', 'AM', 'FM', 'Bessel', 'Carson', 'modulation'],

  params: {
    mode: select('mode', {
      description: 'modulation type (1 kHz carrier)',
      options: [
        { value: 'am', label: 'AM' },
        { value: 'fm', label: 'FM' },
      ],
      default: 'am',
    }),
    fm: float('f_m', {
      description: 'message frequency',
      min: 20,
      max: 200,
      step: 0.5,
      default: 62.5,
      unit: 'Hz',
      precision: 1,
    }),
    ka: float('k_a', {
      description: 'AM modulation index (overmodulation above 1)',
      min: 0,
      max: 1.5,
      step: 0.05,
      default: 0.5,
      precision: 2,
      visibleIf: { mode: 'am' },
    }),
    beta: float('β', {
      description: 'FM modulation index (carrier null at 2.405)',
      min: 0.1,
      max: 8,
      step: 0.005,
      default: 1,
      precision: 3,
      visibleIf: { mode: 'fm' },
    }),
  },

  views: [
    figure(
      'time',
      line('sig', {
        overlays: [
          line('envUp', { color: '#D95319', dashed: true, label: 'envelope' }),
          line('envDown', { color: '#D95319', dashed: true }),
        ],
        axes: { x: { label: 't', unit: 's' }, y: 's(t)' },
      })
    ),
    figure(
      'spectrum',
      line('spectrum', {
        label: 'measured',
        overlays: [scatter('theoryLines', { color: '#D95319', size: 3.5, label: 'theory' })],
        axes: {
          x: { label: 'f', unit: 'Hz' },
          y: { label: '|S(f)|', unit: 'dB', domain: [-70, 5] },
        },
      })
    ),
  ],
};
