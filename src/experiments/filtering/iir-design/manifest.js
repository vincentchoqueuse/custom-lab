import { float, int, select } from '../../../core/fields.js';
import { view, plane, line, vline } from '../../../core/views.js';

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
    plane('zplane', 'Le plan z', {
      clouds: [{ source: 'zeros', color: '#0072BD', r: 4, opacity: 0.95, label: 'zéros' }],
      markers: { source: 'poles', color: '#D95319', label: 'pôles' },
      circle: { radius: 1, label: 'cercle unité (stabilité)' },
      segments: [
        { x1: -1.6, y1: 0, x2: 1.6, y2: 0 },
        { x1: 0, y1: -1.6, x2: 0, y2: 1.6 },
      ],
      axes: { x: 'Re(z)', y: 'Im(z)' },
      minHalf: 1.25,
      maxHalf: 1.6,
    }),
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
