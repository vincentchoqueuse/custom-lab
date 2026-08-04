import { float, int, log, bool, select } from '../../../core/fields.js';
import { view, plane, line, stem, vline, hline } from '../../../core/views.js';

/** @type {import('../../../core/types').ExperimentManifest} */
export default {
  id: 'adaptive',
  order: 6,
  random: true, // entrée aléatoire et bruit de mesure
  title: 'Adaptive filtering',
  subtitle: 'LMS, NLMS, RLS — speed, accuracy, complexity: pick two',
  tags: ['adaptive', 'LMS', 'NLMS', 'RLS', 'stochastic gradient', 'identification'],

  params: {
    algo: select('algorithme', {
      options: [
        { value: 'lms', label: 'LMS — stochastic gradient' },
        { value: 'nlms', label: 'NLMS — normalized step' },
        { value: 'rls', label: 'RLS — recursive least squares' },
      ],
      default: 'lms',
    }),
    mu: log('μ', {
      description: 'adaptation step (normalized, in ]0, 2[, for NLMS)',
      min: 1e-3,
      max: 1.5,
      default: 0.01,
      precision: 4,
      visibleIf: { algo: ['lms', 'nlms'] },
    }),
    lambda: float('λ', {
      description: 'forgetting factor — 1 means infinite memory',
      min: 0.95,
      max: 1,
      step: 0.001,
      default: 1,
      precision: 3,
      visibleIf: { algo: 'rls' },
    }),
    L: select('L', {
      description: 'filter length (and length of the system to identify)',
      options: [
        { value: 2, label: '2 (the weight plane is then exact)' },
        { value: 4, label: '4' },
        { value: 8, label: '8' },
        { value: 16, label: '16' },
      ],
      default: 8,
    }),
    a: float('a', {
      description: 'colour of the input — AR(1), at constant variance',
      min: 0,
      max: 0.95,
      step: 0.05,
      default: 0,
      precision: 2,
    }),
    snr: float('SNR', {
      description: 'measurement signal-to-noise ratio',
      min: 0,
      max: 40,
      step: 1,
      default: 20,
      unit: 'dB',
      precision: 0,
    }),
    n: int('n', {
      description: 'iteration observed — the dial that replaces an animation',
      min: 1,
      max: 3000,
      step: 1,
      default: 3000,
    }),
    track: bool('poursuite', {
      description: 'the system jumps at iteration 1500',
      default: false,
    }),
    // seed injecté par le cœur, parce que random: true
  },

  derived: {
    // Ce que la salle doit pouvoir vérifier de tête avant de bouger le pas.
    bound: { label: 'stability bound 2/tr(R)', calc: (p) => (2 / p.L).toFixed(4) },
    cond: {
      label: 'target conditioning (L → ∞)',
      calc: (p) => (((1 + p.a) / (1 - p.a)) ** 2).toFixed(1),
    },
  },

  groups: [
    { title: 'Algorithm', params: ['algo', 'mu', 'lambda', 'L'] },
    { title: 'Signal', params: ['a', 'snr', 'track'] },
    { title: 'Observation', params: ['n'] },
  ],

  // actions omises → défaut du cœur [randomizeSeed, freeze]

  views: [
    // L'ADAPTATION ELLE-MÊME, et c'est pour cela qu'elle passe en premier :
    // les L coefficients qui montent de zéro vers leurs valeurs vraies, et
    // qui ensuite dansent autour. Tout le reste de l'expérience est un
    // résumé de ce dessin — la courbe d'apprentissage en est la version
    // quadratique, le plan des poids la version géométrique à L = 2.
    // Un seul tracé pour les L trajectoires (coupé par des NaN), sans quoi
    // la légende compterait seize entrées qui ne diraient rien.
    view(
      'tracks',
      'Weights ŵ(n)',
      line('wRefs', {
        color: '#D95319',
        width: 1.4,
        dashed: true,
        label: 'true values w*ₖ',
        overlays: [line('wTracks', { color: '#0072BD', width: 1.4, label: 'ŵₖ(n)' })],
        axes: { x: { label: 'iteration' }, y: { label: 'coefficient' } },
      })
    ),

    // LA vue : le sujet de l'expérience EST la convergence, donc elle passe
    // devant. Deux courbes, et c'est leur écart qui instruit : l'EQM totale
    // (ce qu'on mesurerait vraiment, bruit compris) et l'excès w̃ᵀRw̃ (ce que
    // l'adaptation contrôle, sans le bruit). La première ne descend jamais
    // sous le plancher ; la seconde dit à quelle distance de w* on est.
    view(
      'learning',
      'Learning curve',
      line('learning', {
        color: '#0072BD',
        width: 1.6,
        label: 'MSE E[e²]',
        overlays: [
          line('excess', { color: '#D95319', width: 2, label: 'excess w̃ᵀRw̃' }),
          hline('floorDb', { color: '#EDB120', dashed: true, width: 1.6, label: 'floor σ²' }),
          hline('plateauDb', { color: '#77AC30', dashed: true, width: 1.6, label: 'plateau reached' }),
          vline('switchLine', { color: '#7E2F8E', width: 1.6, label: 'system jump' }),
          vline('nLine', { color: '#71717a', dashed: true, width: 1.2, label: 'iteration n' }),
        ],
        axes: {
          x: { label: 'iteration', scale: 'log' },
          y: { label: 'MSE', unit: 'dB', domain: [-45, 15] },
        },
      })
    ),

    // Ce que le filtre a appris, à l'itération n : la réponse impulsionnelle
    // estimée contre la vraie. C'est ici qu'on voit le filtre « se remplir »
    // coefficient par coefficient, et sauter quand le système saute.
    view(
      'coeffs',
      'Coefficients',
      stem('tapsTrue', {
        color: '#0072BD',
        size: 6,
        label: 'system w*',
        overlays: [stem('taps', { color: '#D95319', size: 4, label: 'filter ŵ(n)' })],
        axes: { x: { label: 'k' }, y: { label: 'coefficient' } },
      })
    ),

    // La géométrie, et la seule façon de VOIR pourquoi une entrée colorée
    // coûte : à L = 2, les iso-contours du coût sont les ellipses d'axes les
    // vecteurs propres de R, et la descente les traverse en zigzag quand
    // elles s'allongent. Un plan équi-aspect, sinon les ellipses mentiraient
    // sur leur allongement — c'est exactement le cas d'usage de `plane`.
    plane('weights', 'Plan des poids', {
      curves: [
        { source: 'contour1', color: '#71717a', width: 1, label: 'cost contour' },
        { source: 'contour2', color: '#71717a', width: 1 },
        { source: 'contour3', color: '#71717a', width: 1 },
        { source: 'wTrack', color: '#0072BD', width: 1.8, label: 'descent ŵ(0…n)' },
      ],
      clouds: [{ source: 'wStart', color: '#7E2F8E', r: 5, label: 'start ŵ = 0' }],
      markers: { source: 'wOpt', color: '#D95319', label: 'optimum w*' },
      axisLines: true,
      symmetric: false,
      axes: { x: 'w₀', y: 'w₁' },
    }),
  ],
};
