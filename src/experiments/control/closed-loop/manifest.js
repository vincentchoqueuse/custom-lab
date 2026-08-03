import { float, log } from '../../../core/fields.js';
import { view, figure, line, scatter, vline, hline } from '../../../core/views.js';
import { gainView, phaseView, GUIDE_COLOR } from '../../../core/response-views.js';

const GUIDE = { color: GUIDE_COLOR, width: 1, dashed: true };
const CLOSED = '#D95319'; // la boucle fermée, partout la même couleur

/** @type {import('../../../core/types').ExperimentManifest} */
export default {
  id: 'closed-loop',
  order: 4,
  title: 'Boucler un second ordre',
  subtitle: 'Un seul potard K — et le système change de vitesse, de dépassement et d’erreur',
  tags: [
    'boucle fermée',
    'retour unitaire',
    'gain proportionnel',
    'abaque de Nichols',
    'contours iso-gain',
    'erreur statique',
    'résonance',
  ],

  params: {
    K: log('K', {
      description: 'gain proportionnel de la boucle',
      min: 0.1,
      max: 30,
      default: 4,
      precision: 2,
    }),
    w0: log('ω₀', {
      description: 'pulsation propre du procédé',
      min: 0.2,
      max: 20,
      default: 1,
      unit: 'rad/s',
      precision: 2,
    }),
    m: float('m', {
      description: 'amortissement du procédé',
      min: 0.05,
      max: 2,
      step: 0.05,
      default: 0.5,
      precision: 2,
    }),
    // no seed here: injected by the core (unused: fully deterministic)
  },

  derived: {
    closed: {
      label: 'boucle fermée',
      calc: (p) => {
        const r = Math.sqrt(1 + p.K);
        return `ω₀√(1+K) = ${(p.w0 * r).toFixed(3)} · m/√(1+K) = ${(p.m / r).toFixed(3)}`;
      },
    },
    invariant: {
      label: 'mω₀ (inchangé)',
      calc: (p) => `${(p.m * p.w0).toFixed(3)} rad/s — même enveloppe en BO et en BF`,
    },
  },

  groups: [
    { title: 'La boucle', params: ['K'] },
    { title: 'Le procédé', params: ['w0', 'm'] },
  ],

  // actions omitted → core default [randomizeSeed, freeze]

  views: [
    // Le même échelon, envoyé aux deux systèmes. La boucle ouverte monte
    // jusqu'à K, la boucle fermée jusqu'à K/(1+K) : le retour RAMÈNE le gain
    // vers 1, et l'écart qui reste est l'erreur statique 1/(1+K).
    figure(
      'response',
      line('stepClosed', {
        color: CLOSED,
        width: 2.6,
        label: 'boucle fermée',
        overlays: [
          line('stepOpen', { width: 1.8, dashed: true, label: 'boucle ouverte' }),
          hline('setpoint', { color: '#EDB120', width: 1.6, dashed: true, label: 'consigne' }),
        ],
        axes: { x: { label: 't', unit: 's' }, y: 'y(t)' },
      })
    ),

    // Les deux diagrammes de Bode superposés : |L| traverse 0 dB, |T| part du
    // gain statique K/(1+K) et bosse d'autant plus que la boucle est serrée.
    gainView('gain', {
      label: 'boucle ouverte |L(jω)|',
      overlays: [
        line('gainClosed', { color: CLOSED, width: 2.4, label: 'boucle fermée' }),
        vline('wrOut', { color: '#EDB120', dashed: true, width: 1.6, label: 'ω_r' }),
        hline(() => 0, { ...GUIDE, label: '0 dB' }),
      ],
    }),

    phaseView('phase', {
      label: 'boucle ouverte arg L(jω)',
      overlays: [
        line('phaseClosed', { color: CLOSED, width: 2.4, label: 'boucle fermée' }),
        hline(() => -90, { ...GUIDE, label: '−90°' }),
        hline(() => -180, { ...GUIDE, label: '−180°' }),
      ],
    }),

    // L'abaque de Nichols, à sa place : le lieu de la BOUCLE OUVERTE sur les
    // contours iso-gain de la BOUCLE FERMÉE. Le contour mis en avant est
    // celui de la résonance calculée en forme close — la tangence est donc
    // une vérification, pas une estimation.
    // L'abaque est la source PRINCIPALE et le lieu une surcouche : les
    // couches se dessinent dans l'ordre déclaré, et une grille de lecture se
    // place SOUS la courbe qu'on lit dessus.
    view(
      'black',
      'Black — abaque',
      line('isoGain', {
        color: GUIDE_COLOR,
        width: 1,
        dashed: true,
        label: 'iso-gain BF',
        overlays: [
          line('isoPeak', { color: '#EDB120', width: 1.8, label: 'résonance BF' }),
          line('black', { color: '#0072BD', width: 2.6, label: 'lieu de L(jω)' }),
          scatter('criticalBlack', { color: GUIDE_COLOR, size: 6, label: 'point critique' }),
          hline(() => 0, { color: GUIDE_COLOR, width: 1 }),
          vline(() => -180, { ...GUIDE, label: '−180°' }),
        ],
        axes: {
          x: { label: 'arg L', unit: '°' },
          // cadre fixe : le lieu plonge vers −∞ dB quand ω → ∞, et le laisser
          // dicter l'échelle écraserait la seule bande où l'abaque se lit
          y: { label: '|L|', unit: 'dB', domain: [-30, 30] },
        },
      })
    ),
  ],
};
