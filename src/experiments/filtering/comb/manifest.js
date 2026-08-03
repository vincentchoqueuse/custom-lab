import { float, int, select } from '../../../core/fields.js';
import { vline } from '../../../core/views.js';
import { timeView, impulseView, spectrumView } from '../../../core/response-views.js';

/** @type {import('../../../core/types').ExperimentManifest} */
export default {
  id: 'comb',
  order: 2,
  title: 'Filtre IIR en peigne',
  subtitle: 'Un écho dans le temps, un peigne en fréquence — D règle les dents, g leur profondeur',
  tags: ['numérique', 'comb', 'écho', 'flanger', 'Karplus-Strong'],

  params: {
    structure: select('structure', {
      description: 'écho simple (RIF) ou récursif (IIR)',
      options: [
        { value: 'ff', label: 'écho simple : y = x + g·x[n−D]' },
        { value: 'fb', label: 'écho récursif : y = x + g·y[n−D]' },
      ],
      default: 'fb',
    }),
    D: int('D', {
      description: 'retard en échantillons (dents espacées de Fs/D, Fs = 8 kHz)',
      min: 8,
      max: 160,
      default: 40,
    }),
    g: float('g', {
      description: "gain de l'écho (négatif : dents et creux s'échangent)",
      min: -0.95,
      max: 0.95,
      step: 0.01,
      default: 0.7,
      precision: 2,
    }),
    source: select('source', {
      description: "signal périodique d'entrée",
      options: [
        { value: 'square', label: 'carré' },
        { value: 'saw', label: 'dent de scie' },
      ],
      default: 'square',
    }),
    f0: float('f₀', {
      description: 'fondamentale du signal',
      min: 50,
      max: 400,
      step: 1,
      default: 110,
      unit: 'Hz',
      precision: 0,
    }),
  },

  groups: [
    { title: 'Filtre', params: ['structure', 'D', 'g'] },
    { title: 'Signal', params: ['source', 'f0'] },
  ],

  views: [
    timeView(),
    impulseView(),
    spectrumView({
      overlays: [vline((p) => 8000 / p.D, { color: '#EDB120', dashed: true, label: 'Fs/D' })],
    }),
  ],
};
