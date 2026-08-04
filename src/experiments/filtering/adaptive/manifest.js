import { float, int, log, bool, select } from '../../../core/fields.js';
import { view, plane, line, stem, vline, hline } from '../../../core/views.js';

/** @type {import('../../../core/types').ExperimentManifest} */
export default {
  id: 'adaptive',
  order: 6,
  random: true, // entrée aléatoire et bruit de mesure
  title: 'Filtrage adaptatif',
  subtitle: 'LMS, NLMS, RLS — vitesse, précision, complexité : on en choisit deux',
  tags: ['adaptatif', 'LMS', 'NLMS', 'RLS', 'gradient stochastique', 'identification'],

  params: {
    algo: select('algorithme', {
      options: [
        { value: 'lms', label: 'LMS — gradient stochastique' },
        { value: 'nlms', label: 'NLMS — pas normalisé' },
        { value: 'rls', label: 'RLS — moindres carrés récursifs' },
      ],
      default: 'lms',
    }),
    mu: log('μ', {
      description: 'pas d’adaptation (normalisé, dans ]0, 2[, pour NLMS)',
      min: 1e-3,
      max: 1.5,
      default: 0.01,
      precision: 4,
      visibleIf: { algo: ['lms', 'nlms'] },
    }),
    lambda: float('λ', {
      description: 'facteur d’oubli — 1 = mémoire infinie',
      min: 0.95,
      max: 1,
      step: 0.001,
      default: 1,
      precision: 3,
      visibleIf: { algo: 'rls' },
    }),
    L: select('L', {
      description: 'longueur du filtre (et du système à identifier)',
      options: [
        { value: 2, label: '2 (le plan des poids est alors exact)' },
        { value: 4, label: '4' },
        { value: 8, label: '8' },
        { value: 16, label: '16' },
      ],
      default: 8,
    }),
    a: float('a', {
      description: 'couleur de l’entrée — AR(1), à variance constante',
      min: 0,
      max: 0.95,
      step: 0.05,
      default: 0,
      precision: 2,
    }),
    snr: float('SNR', {
      description: 'rapport signal à bruit de mesure',
      min: 0,
      max: 40,
      step: 1,
      default: 20,
      unit: 'dB',
      precision: 0,
    }),
    n: int('n', {
      description: 'itération observée — le potard qui remplace une animation',
      min: 1,
      max: 3000,
      step: 1,
      default: 3000,
    }),
    track: bool('poursuite', {
      description: 'le système saute à l’itération 1500',
      default: false,
    }),
    // seed injecté par le cœur, parce que random: true
  },

  derived: {
    // Ce que la salle doit pouvoir vérifier de tête avant de bouger le pas.
    bound: { label: 'borne de stabilité 2/tr(R)', calc: (p) => (2 / p.L).toFixed(4) },
    cond: {
      label: 'conditionnement visé (L → ∞)',
      calc: (p) => (((1 + p.a) / (1 - p.a)) ** 2).toFixed(1),
    },
  },

  groups: [
    { title: 'Algorithme', params: ['algo', 'mu', 'lambda', 'L'] },
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
      'Poids ŵ(n)',
      line('wRefs', {
        color: '#D95319',
        width: 1.4,
        dashed: true,
        label: 'valeurs vraies w*ₖ',
        overlays: [line('wTracks', { color: '#0072BD', width: 1.4, label: 'ŵₖ(n)' })],
        axes: { x: { label: 'itération' }, y: { label: 'coefficient' } },
      })
    ),

    // LA vue : le sujet de l'expérience EST la convergence, donc elle passe
    // devant. Deux courbes, et c'est leur écart qui instruit : l'EQM totale
    // (ce qu'on mesurerait vraiment, bruit compris) et l'excès w̃ᵀRw̃ (ce que
    // l'adaptation contrôle, sans le bruit). La première ne descend jamais
    // sous le plancher ; la seconde dit à quelle distance de w* on est.
    view(
      'learning',
      'Courbe d’apprentissage',
      line('learning', {
        color: '#0072BD',
        width: 1.6,
        label: 'EQM E[e²]',
        overlays: [
          line('excess', { color: '#D95319', width: 2, label: 'excès w̃ᵀRw̃' }),
          hline('floorDb', { color: '#EDB120', dashed: true, width: 1.6, label: 'plancher σ²' }),
          hline('plateauDb', { color: '#77AC30', dashed: true, width: 1.6, label: 'palier atteint' }),
          vline('switchLine', { color: '#7E2F8E', width: 1.6, label: 'saut du système' }),
          vline('nLine', { color: '#71717a', dashed: true, width: 1.2, label: 'itération n' }),
        ],
        axes: {
          x: { label: 'itération', scale: 'log' },
          y: { label: 'EQM', unit: 'dB', domain: [-45, 15] },
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
        label: 'système w*',
        overlays: [stem('taps', { color: '#D95319', size: 4, label: 'filtre ŵ(n)' })],
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
        { source: 'contour1', color: '#71717a', width: 1, label: 'iso-coût' },
        { source: 'contour2', color: '#71717a', width: 1 },
        { source: 'contour3', color: '#71717a', width: 1 },
        { source: 'wTrack', color: '#0072BD', width: 1.8, label: 'descente ŵ(0…n)' },
      ],
      clouds: [{ source: 'wStart', color: '#7E2F8E', r: 5, label: 'départ ŵ = 0' }],
      markers: { source: 'wOpt', color: '#D95319', label: 'optimum w*' },
      axisLines: true,
      symmetric: false,
      axes: { x: 'w₀', y: 'w₁' },
    }),
  ],
};
