import { log } from '../../../core/fields.js';
import { view, figure, line, scatter, vline, hline } from '../../../core/views.js';
import { at, gainView, phaseView, GUIDE, GUIDE_COLOR } from '../../../core/response-views.js';

/** Les deux pulsations repères, identiques sur les deux moitiés du Bode. */
const MARKS = [
  vline('wNyquist', { color: '#EDB120', dashed: true, width: 1.6, label: 'Fe/2' }),
  vline('wSample', { color: '#D95319', dashed: true, width: 1.6, label: 'Fe' }),
];

/** @type {import('../../../core/types').ExperimentManifest} */
export default {
  id: 'zero-order-hold',
  order: 5,
  title: "Le bloqueur d'ordre zéro",
  subtitle: 'Un escalier, une sinc — et surtout un retard pur de Te/2',
  tags: [
    'bloqueur',
    'BOZ',
    'ordre zéro',
    'échantillonnage',
    'retard pur',
    'sinc',
    'marge de phase',
    'commande échantillonnée',
  ],

  params: {
    fe: log('Fe', {
      description: "fréquence d'échantillonnage",
      min: 20,
      max: 20000,
      default: 1000,
      unit: 'Hz',
      precision: 0,
    }),
    f0: log('f₀', {
      description: 'fréquence du signal montré dans la vue temporelle',
      min: 5,
      max: 2000,
      default: 120,
      unit: 'Hz',
      precision: 0,
    }),
    wco: log('ω_co', {
      description: 'pulsation de coupure de la boucle — celle où la marge se lit',
      min: 10,
      max: 20000,
      default: 2000,
      unit: 'rad/s',
      precision: 0,
    }),
    // no seed here: injected by the core (unused: fully deterministic)
  },

  derived: {
    delay: {
      label: 'retard équivalent',
      calc: (p) => `Te/2 = ${((1000 / p.fe) / 2).toFixed(4)} ms`,
    },
    margin: {
      label: 'marge mangée à ω_co',
      calc: (p) => {
        const deg = ((p.wco / p.fe) * 180) / Math.PI / 2;
        return `${deg.toFixed(2)}° — Fe/f_co = ${((2 * Math.PI * p.fe) / p.wco).toFixed(1)}`;
      },
    },
  },

  groups: [
    { title: 'Le bloqueur', params: ['fe'] },
    { title: 'Ce qu\'on lui envoie', params: ['f0'] },
    { title: 'La boucle', params: ['wco'] },
  ],

  // actions omitted → core default [randomizeSeed, freeze]

  views: [
    // La preuve visuelle du résultat de phase : l'escalier ne suit pas le
    // signal, il suit le signal RETARDÉ DE Te/2 — la courbe pointillée passe
    // au milieu de chaque marche. Ce n'est pas une coïncidence de tracé,
    // c'est arg B₀(jω) = −ωTe/2, vu dans le temps.
    figure(
      'time',
      line('held', {
        color: '#0072BD',
        width: 2.4,
        label: 'sortie bloquée',
        overlays: [
          line('signal', { color: GUIDE_COLOR, width: 1.6, label: 'signal x(t)' }),
          line('delayed', { color: '#D95319', width: 2, dashed: true, label: 'x(t − Te/2)' }),
          scatter('samples', { color: '#EDB120', size: 6, label: 'échantillons' }),
        ],
        axes: { x: { label: 't', unit: 's' }, y: 'x(t)' },
      })
    ),

    // Le module : une sinc. Plat en bas, −3.92 dB à Fe/2 (= 2/π, exactement),
    // nul aux multiples de Fe.
    gainView('gain', {
      label: '|B₀(jω)| / Te',
      domain: [-40, 3],
      overlays: [
        ...MARKS,
        hline('droopNyquist', { ...GUIDE, label: '−3.92 dB' }),
        hline(() => 0, { color: GUIDE_COLOR, width: 1 }),
      ],
    }),

    // La phase : une DROITE. C'est tout le message — un bloqueur d'ordre zéro
    // est un retard pur de Te/2, exactement, à toute fréquence.
    phaseView('phase', {
      label: 'arg B₀(jω) = −ωTe/2',
      overlays: [
        ...MARKS,
        hline('phaseNyquist', { ...GUIDE, label: '−90° à Fe/2' }),
        at(-180, '−180° à Fe'),
      ],
    }),

    // La conséquence, chiffrée : combien de marge de phase le bloqueur coûte
    // à une boucle dont la coupure est ω_co, selon la fréquence
    // d'échantillonnage choisie. La règle d'ingénieur « Fe ≥ 20 f_co » se lit
    // directement dessus — c'est là qu'on repasse sous 10°.
    view(
      'cost',
      'Ce que ça coûte à la boucle',
      line('lostVsFe', {
        color: '#7E2F8E',
        width: 2.4,
        label: 'marge perdue',
        overlays: [
          scatter('lostPoint', { color: '#EDB120', size: 9, label: 'Fe choisie' }),
          at(10, '10°'),
          at(45, '45°'),
        ],
        axes: {
          x: { label: 'Fe', unit: 'Hz', scale: 'log' },
          y: { label: 'marge perdue', unit: '°', scale: 'log' },
        },
      })
    ),
  ],
};
