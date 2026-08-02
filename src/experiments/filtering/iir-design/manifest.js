import { float, int, select } from '../../../core/fields.js';
import { view, custom, line, vline } from '../../../core/views.js';

/** @type {import('../../../core/types').ExperimentManifest} */
export default {
  id: 'iir-design',
  title: 'Filtres RII par discrétisation',
  subtitle: "Bilinéaire, pre-warping, invariance impulsionnelle — l'analogique passe au numérique",
  tags: ['numérique', 'RII', 'IIR', 'bilinéaire', 'invariance impulsionnelle', 'warping'],

  params: {
    method: select('méthode', {
      description: 'discrétisation du prototype analogique (Fs = 8 kHz)',
      options: [
        { value: 'bilinear', label: 'bilinéaire avec pre-warping' },
        { value: 'naive', label: 'bilinéaire sans pre-warping' },
        { value: 'impulse', label: 'invariance impulsionnelle' },
      ],
      default: 'bilinear',
    }),
    family: select('famille', {
      description: 'prototype analogique (tout-pôles)',
      options: [
        { value: 'butter', label: 'Butterworth' },
        { value: 'cheby1', label: 'Chebyshev 1' },
      ],
      default: 'butter',
    }),
    n: int('n', { description: 'ordre du prototype', min: 2, max: 8, default: 4 }),
    fc: float('f_c', {
      description: 'fréquence de coupure visée (à −A_max)',
      min: 200,
      max: 3500,
      step: 10,
      default: 1000,
      unit: 'Hz',
      precision: 0,
    }),
    Amax: float('A_max', {
      description: 'ondulation / niveau définissant la coupure',
      min: 0.1,
      max: 3,
      step: 0.1,
      default: 1,
      unit: 'dB',
      precision: 1,
    }),
  },

  groups: [
    { title: 'Prototype analogique', params: ['family', 'n', 'Amax'] },
    { title: 'Discrétisation', params: ['method', 'fc'] },
  ],

  views: [
    view(
      'response',
      'Numérique vs analogique',
      line('respDig', {
        width: 2,
        label: 'numérique',
        overlays: [
          line('respAna', { color: '#D95319', dashed: true, label: 'analogique' }),
          vline('fc', { color: '#EDB120', dashed: true, label: 'f_c visée' }),
        ],
        axes: {
          x: { label: 'f', unit: 'Hz' },
          y: { label: '|H|', unit: 'dB', domain: [-80, 5] },
        },
      })
    ),
    // CUSTOM view: equal-aspect z-plane — see views/ZPlane.svelte
    custom('zplane', 'Le plan z', () => import('./views/ZPlane.svelte')),
    view(
      'warp',
      'Le warping',
      line('warp', {
        width: 2,
        label: 'warping Ω(f) = 2Fs·tan(πf/Fs)',
        overlays: [
          line('warpIdent', { color: '#D95319', dashed: true, label: 'identité (2πf)' }),
          vline('fc', { color: '#EDB120', dashed: true, label: 'f_c' }),
        ],
        axes: {
          x: { label: 'f numérique', unit: 'Hz' },
          y: { label: 'f analogique équivalente', unit: 'Hz', domain: [0, 16000] },
        },
      })
    ),
  ],
};
