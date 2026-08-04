import { float, int, select } from '../../../core/fields.js';
import { figure, line, stem, vline } from '../../../core/views.js';

/** @type {import('../../../core/types').ExperimentManifest} */
export default {
  id: 'dac',
  order: 4,
  title: 'Suréchantillonnage et interpolation',
  subtitle: 'Des zéros, puis un filtre — et ce que chaque geste fait au spectre',
  tags: ['numérique', 'suréchantillonnage', 'interpolation', 'zéro-stuffing', 'images', 'CNA'],

  params: {
    // L'ÉTAPE est un paramètre, pas un onglet : les deux figures restent les
    // mêmes et c'est la chaîne qui avance dessus. Une scène s'ouvre donc à
    // l'étape où le cours en est, et son URL la porte.
    stage: select('étape', {
      description: 'où l’on en est dans la chaîne',
      options: [
        { value: 'samples', label: '1 — les échantillons, à Fs' },
        { value: 'stuffed', label: '2 — après zéro-stuffing, à L·Fs' },
        { value: 'filtered', label: '3 — après le filtre d’interpolation' },
      ],
      default: 'samples',
    }),
    L: select('L', {
      description: 'facteur de suréchantillonnage',
      options: [
        { value: 2, label: '×2' },
        { value: 4, label: '×4' },
        { value: 8, label: '×8' },
      ],
      default: 4,
    }),
    f0: float('f₀', {
      description: 'fréquence du signal (Fs = 8 kHz)',
      min: 100,
      max: 3500,
      step: 10,
      default: 1000,
      unit: 'Hz',
      precision: 0,
    }),
    half: int('M', {
      description: 'demi-longueur du filtre, en périodes de Fs',
      min: 1,
      max: 16,
      default: 8,
    }),
  },

  groups: [
    { title: 'Chaîne', params: ['stage', 'L'] },
    { title: 'Signal', params: ['f0'] },
    { title: 'Filtre d’interpolation', params: ['half'] },
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
        label: 'flux courant',
        overlays: [
          line('ideal', { color: '#a1a1aa', width: 1.2, label: 'signal continu' }),
          line('filtered', { color: '#D95319', width: 2, label: 'après filtre' }),
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
        label: 'flux courant',
        overlays: [
          line('response', { color: '#D95319', width: 1.8, label: '|H(f)| du filtre' }),
          vline('nyquistBase', { color: '#EDB120', width: 1.6, label: 'Fs/2 — bande utile' }),
        ],
        axes: {
          x: { label: 'f', unit: 'Hz' },
          y: { label: '|X(f)|', unit: 'dB', domain: [-90, 5] },
        },
      })
    ),
  ],
};
