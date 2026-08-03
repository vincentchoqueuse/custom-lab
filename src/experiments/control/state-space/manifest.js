import { float, log, select } from '../../../core/fields.js';
import { view, figure, line, scatter } from '../../../core/views.js';
import { gainView, phaseView, polesView, GUIDE_COLOR } from '../../../core/response-views.js';

/** @type {import('../../../core/types').ExperimentManifest} */
export default {
  id: 'state-space',
  order: 6,
  title: "La représentation d'état",
  subtitle: "Trois écritures du même système — l'état change, le système non",
  tags: [
    "représentation d'état",
    'variables d’état',
    'forme compagne',
    'base modale',
    'changement de base',
    'valeurs propres',
    'invariance',
  ],

  params: {
    basis: select('base', {
      description: "la base dans laquelle l'état est écrit",
      options: [
        { value: 'companion', label: 'compagne — x = (y, ẏ)' },
        { value: 'modal', label: 'modale — A diagonale, les modes' },
        { value: 'physical', label: 'quelconque — une base sans signification' },
      ],
      default: 'companion',
    }),
    w0: log('ω₀', {
      description: 'pulsation propre',
      min: 0.2,
      max: 20,
      default: 2,
      unit: 'rad/s',
      precision: 2,
    }),
    m: float('m', {
      description: 'amortissement',
      min: 0.05,
      max: 2,
      step: 0.05,
      default: 0.4,
      precision: 2,
    }),
    K: float('K', { description: 'gain statique', min: 0.2, max: 3, step: 0.05, default: 1 }),
    // no seed here: injected by the core (unused: fully deterministic)
  },

  derived: {
    invariants: {
      label: 'invariants de A',
      calc: (p) =>
        `tr A = −2mω₀ = ${(-2 * p.m * p.w0).toFixed(3)} · det A = ω₀² = ${(p.w0 * p.w0).toFixed(3)}`,
    },
    poles: {
      label: 'pôles = valeurs propres',
      calc: (p) => {
        const s = p.m * p.w0;
        if (p.m < 1) {
          const wd = p.w0 * Math.sqrt(1 - p.m * p.m);
          return `−${s.toFixed(3)} ± j${wd.toFixed(3)} — les mêmes dans les trois bases`;
        }
        const r = p.w0 * Math.sqrt(p.m * p.m - 1);
        return `${(-s + r).toFixed(3)} et ${(-s - r).toFixed(3)} — les mêmes dans les trois bases`;
      },
    },
  },

  groups: [
    { title: "L'écriture", params: ['basis'] },
    { title: 'Le système', params: ['w0', 'm', 'K'] },
  ],

  // actions omitted → core default [randomizeSeed, freeze]

  views: [
    // La sortie SEULE. Elle est dessinée dans un cadre qui ne dépend que
    // d'elle, donc changer de base ne déplace pas un seul pixel — et c'est
    // exactement ce que la scène 2 demande de constater. Mettre les états
    // dans le même cadre aurait suffi à le démentir : leurs amplitudes
    // varient d'une base à l'autre, l'axe se serait réajusté, et la sortie
    // aurait « bougé » à l'écran sans avoir changé d'un chiffre.
    figure(
      'step',
      line('stepResponse', {
        width: 2.6,
        label: 'sortie y(t)',
        axes: { x: { label: 't', unit: 's' }, y: 'y(t)' },
      })
    ),

    // Les deux composantes de l'état, dans leur propre cadre. Là, tout change
    // avec la base — c'est le pendant de l'onglet précédent.
    view(
      'states',
      "Les deux états",
      line('state1', {
        color: '#D95319',
        width: 2.2,
        label: 'x₁',
        overlays: [line('state2', { color: '#77AC30', width: 2.2, label: 'x₂' })],
        axes: { x: { label: 't', unit: 's' }, y: 'x(t)' },
      })
    ),

    // Le plan de phase : la MÊME trajectoire, vue comme une courbe de l'état.
    // Pas de plane() ici — x₁ et x₂ n'ont ni la même unité ni la même échelle,
    // et forcer un repère orthonormé mentirait sur la géométrie.
    view(
      'trajectory',
      'Plan de phase',
      line('trajectory', {
        color: '#7E2F8E',
        width: 2.2,
        label: "trajectoire de l'état",
        overlays: [scatter('start', { color: '#EDB120', size: 9, label: 'départ' })],
        axes: { x: 'x₁', y: 'x₂' },
      })
    ),

    // Les valeurs propres de A. Elles ne bougent PAS quand la base change :
    // det(sI − T⁻¹AT) = det(sI − A), et ce sont les pôles du système.
    polesView({
      zeros: null,
      poleLabel: 'valeurs propres de A',
      minHalf: (p) => Math.max(1.3 * p.w0, 1),
      maxHalf: 60,
    }),

    // H(jω) = C(jωI − A)⁻¹B + D, reconstituée depuis les matrices — et
    // identique dans les trois bases, au bit près.
    gainView('gain', { label: '|C(jωI−A)⁻¹B + D|' }),

    phaseView('phase', { label: 'arg C(jωI−A)⁻¹B + D' }),
  ],
};
