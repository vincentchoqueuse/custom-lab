import { float, select, coeffs } from '../../../core/fields.js';
import { view, line, hline } from '../../../core/views.js';

/** @type {import('../../../core/types').ExperimentManifest} */
export default {
  id: 'lti-response',
  order: 4,
  title: 'Réponse d\'un système LTI quelconque',
  subtitle: 'Tapez num et den, choisissez l\'entrée — échelon, rampe ou sinusoïde',
  tags: ['LTI', 'fonction de transfert', 'échelon', 'rampe', 'régime permanent'],

  params: {
    num: coeffs('num', {
      description: 'numérateur de H(s), puissances décroissantes',
      default: [1],
    }),
    den: coeffs('den', {
      description: 'dénominateur de H(s), puissances décroissantes',
      default: [1, 2, 1],
    }),
    input: select('entrée', {
      description: 'signal appliqué à t = 0',
      options: [
        { value: 'step', label: 'échelon' },
        { value: 'ramp', label: 'rampe unitaire' },
        { value: 'sine', label: 'sinusoïde' },
      ],
      default: 'step',
    }),
    f: float('f', {
      description: 'fréquence de la sinusoïde',
      min: 0.2,
      max: 2,
      step: 0.05,
      default: 0.5,
      unit: 'Hz',
      precision: 2,
      visibleIf: { input: 'sine' },
    }),
    // no seed here: injected by the core (unused: fully deterministic)
  },

  validate: [
    { when: (p) => Math.abs(p.den[0]) < 1e-12, message: 'den[0] ne peut pas être nul' },
    {
      when: (p) => p.num.length > p.den.length,
      message: 'Système non causal : deg(num) doit rester ≤ deg(den)',
    },
  ],

  derived: {
    ordre: { label: 'ordre du système', calc: (p) => p.den.length - 1 },
    type: {
      label: 'type (intégrateurs)',
      calc: (p) => {
        let t = 0;
        for (let i = p.den.length - 1; i >= 0 && p.den[i] === 0; i--) t++;
        return t;
      },
    },
  },

  groups: [
    { title: 'Système H(s)', params: ['num', 'den'] },
    { title: 'Entrée', params: ['input', 'f'] },
  ],

  // actions omitted → core default [randomizeSeed, freeze]

  views: [
    view(
      'response',
      'Réponse temporelle',
      line('output', {
        width: 2.4,
        label: 'sortie y(t)',
        overlays: [
          line('inputSignal', { color: '#a1a1aa', width: 1.6, dashed: true, label: 'entrée u(t)' }),
        ],
        axes: { x: { label: 't', unit: 's' }, y: 'y(t)' },
      })
    ),

    // tracking error: constant, vanishing or growing — the system's "type"
    view(
      'tracking',
      'Erreur de poursuite',
      line('trackError', {
        color: '#D95319',
        width: 2.2,
        label: 'e(t) = u − y',
        overlays: [hline(() => 0, { color: '#a1a1aa', width: 1, dashed: true })],
        axes: { x: { label: 't', unit: 's' }, y: 'e(t)' },
      })
    ),
  ],
};
