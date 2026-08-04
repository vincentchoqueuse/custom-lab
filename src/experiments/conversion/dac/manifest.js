import { float, int, select } from '../../../core/fields.js';
import { figure, line, stem, vline } from '../../../core/views.js';

/** @type {import('../../../core/types').ExperimentManifest} */
export default {
  id: 'dac',
  order: 4,
  title: 'Upsampling and interpolation',
  subtitle: 'Zeros, then a filter — and what each step does to the spectrum',
  tags: ['digital', 'upsampling', 'interpolation', 'zero stuffing', 'images', 'DAC'],

  params: {
    // L'ÉTAPE est un paramètre, pas un onglet : les deux figures restent les
    // mêmes et c'est la chaîne qui avance dessus. Une scène s'ouvre donc à
    // l'étape où le cours en est, et son URL la porte.
    stage: select('étape', {
      description: 'stage reached in the chain',
      options: [
        { value: 'samples', label: '1 — the samples, at Fs' },
        { value: 'stuffed', label: '2 — after zero stuffing, at L·Fs' },
        { value: 'filtered', label: '3 — after the interpolation filter' },
      ],
      default: 'samples',
    }),
    L: select('L', {
      description: 'upsampling factor',
      options: [
        { value: 2, label: '×2' },
        { value: 4, label: '×4' },
        { value: 8, label: '×8' },
      ],
      default: 4,
    }),
    f0: float('f₀', {
      description: 'signal frequency (Fs = 8 kHz)',
      min: 100,
      max: 3500,
      step: 10,
      default: 1000,
      unit: 'Hz',
      precision: 0,
    }),
    half: int('M', {
      description: 'half-length of the filter, in periods of Fs',
      min: 1,
      max: 16,
      default: 8,
    }),
  },

  groups: [
    { title: 'Chain', params: ['stage', 'L'] },
    { title: 'Signal', params: ['f0'] },
    { title: 'Interpolation filter', params: ['half'] },
  ],

  // actions omises → l'expérience ne tire rien : pas de dé, seulement freeze

  views: [
    // Le temporel d'abord — c'est là que le GESTE se voit : des zéros
    // apparaissent entre les échantillons, puis se remplissent.
    figure(
      'time',
      stem('stems', {
        color: '#0072BD',
        size: 3.4,
        label: 'current stream',
        overlays: [
          line('ideal', { color: '#a1a1aa', width: 1.2, label: 'continuous signal' }),
          line('filtered', { color: '#D95319', width: 2, label: 'after the filter' }),
        ],
        axes: { x: { label: 't', unit: 'ms' }, y: 'x' },
      })
    ),

    // Et le spectre, qui raconte l'autre moitié : le zéro-stuffing n'y change
    // RIEN — il élargit la bande, ce qui fait entrer les copies. Le filtre,
    // lui, les efface.
    figure(
      'spectrum',
      line('spectrum', {
        color: '#0072BD',
        width: 1.6,
        label: 'current stream',
        overlays: [
          line('response', { color: '#D95319', width: 1.8, label: '|H(f)| of the filter' }),
          vline('nyquistBase', { color: '#EDB120', width: 1.6, label: 'Fs/2 — useful band' }),
        ],
        axes: {
          x: { label: 'f', unit: 'Hz' },
          y: { label: '|X(f)|', unit: 'dB', domain: [-90, 5] },
        },
      })
    ),
  ],
};
