import { float, int, select } from '../../../core/fields.js';
import { view, figure, line, scatter, stem, vline, hline, band } from '../../../core/views.js';
// le cadrage figé et la base du cadre, partagés avec le calcul : les
// rectangles de bruit descendent exactement jusqu'à cette base
import { fWindow, MODEL_FLOOR } from './frame.js';

/** L'axe des fréquences, FIGÉ, et le même sur les trois vues qui en portent
 *  un : le périodogramme, le spectre estimé et le pseudo-spectre se lisent
 *  l'un après l'autre, et un cadre qui bouge d'un onglet à l'autre — ou
 *  quand N change — fait croire à un déplacement des raies. Les bornes
 *  viennent de frame.js, partagées avec la grille de calcul. */
const F_AXIS = { label: 'f', unit: 'Hz', domain: fWindow };

/** Les fréquences vraies, en verticales — les mêmes sur les trois vues,
 *  déclarées une fois pour qu'elles ne puissent pas diverger. */
const TRUTH = [
  vline('fTrue1', { color: '#EDB120', dashed: true, width: 1.6, label: 'true frequencies' }),
  vline('fTrue2', { color: '#EDB120', dashed: true, width: 1.6 }),
  vline('fTrue3', { color: '#EDB120', dashed: true, width: 1.6 }),
];

/** @type {import('../../../core/types').ExperimentManifest} */
export default {
  id: 'subspace',
  order: 4,
  random: true, // bruit gaussien complexe
  title: 'High-resolution methods',
  subtitle: 'MUSIC, root-MUSIC, ESPRIT — what a model buys, and what it costs',
  tags: ['high resolution', 'MUSIC', 'ESPRIT', 'subspace', 'eigenvalues'],

  params: {
    df: float('Δf', {
      description: 'gap between the two lines, in units of the Fourier limit Fs/N',
      min: 0.05,
      max: 3,
      step: 0.05,
      // 0.5 : le périodogramme ne sépare pas (il lui faut 1), MUSIC oui à
      // partir de 20 dB — mesuré, pas supposé. Descendre plus bas est
      // possible et c'est l'objet de la scène 3, mais il faut alors monter
      // le SNR, ce qui EST le propos.
      default: 0.5,
      precision: 2,
    }),
    snr: float('SNR', {
      description: 'signal-to-noise ratio per line',
      min: -10,
      max: 50,
      step: 1,
      default: 25,
      unit: 'dB',
      precision: 0,
    }),
    d: int('d', {
      description: 'eigenvalues kept as SIGNAL — the parameter that has to be guessed',
      min: 1,
      max: 8,
      default: 2,
    }),
    sources: select('sources', {
      description: 'number of lines actually present',
      options: [
        { value: 2, label: '2 (two close lines)' },
        { value: 3, label: '3 (+ one line further off)' },
      ],
      default: 2,
    }),
    N: select('N', {
      description: 'record length (Fs = 1 kHz)',
      options: [
        { value: 128, label: '128' },
        { value: 256, label: '256' },
        { value: 512, label: '512' },
        { value: 1024, label: '1024' },
      ],
      default: 256,
    }),
    M: int('M', {
      description: 'covariance order — the number of eigenvectors available',
      min: 4,
      max: 32,
      // la résolution de MUSIC croît avec M : à M = 12 il ne sépare plus
      // 0.5 × Fs/N, à M = 32 oui. C'est le second levier du marché.
      default: 32,
    }),
    // seed injecté par le cœur, parce que random: true
  },

  validate: [
    { when: (p) => p.d >= p.M, message: 'd must stay strictly below M' },
    { when: (p) => p.M > p.N / 2, message: 'M cannot exceed N/2 (not enough snapshots)' },
  ],

  derived: {
    fourierLimit: { label: 'Fourier limit Fs/N', calc: (p) => `${(1000 / p.N).toFixed(2)} Hz` },
    ecart: {
      label: 'requested gap',
      calc: (p) => `${((p.df * 1000) / p.N).toFixed(2)} Hz (${p.df}× the limit)`,
    },
  },

  groups: [
    { title: 'Signal', params: ['sources', 'df', 'snr', 'N'] },
    { title: 'Model', params: ['d', 'M'] },
  ],

  views: [
    // LA référence, et le point de départ : le périodogramme ne sépare pas.
    // C'est le même « Spectre » que partout ailleurs dans le sujet, sous le
    // même nom, parce que c'est exactement le même objet.
    figure(
      'spectrum',
      line('periodogram', {
        width: 2,
        label: 'periodogram',
        overlays: TRUTH,
        axes: { x: F_AXIS, y: { label: '|X(f)|', unit: 'dB' } },
      })
    ),

    // La vue qui sert à CHOISIR d — et la seule information dont on dispose
    // pour le faire en pratique. Les d retenues sont marquées ; la verticale
    // est la coupure ; l'horizontale est le vrai σ², que l'on connaît ici
    // parce qu'on fabrique le signal et jamais dans la vraie vie.
    view(
      'eigen',
      'Eigenvalues',
      line('eigenvalues', {
        width: 2,
        label: 'λ_k (decreasing)',
        overlays: [
          scatter('eigenSelected', { color: '#D95319', size: 9, label: 'kept as signal' }),
          vline('dLine', { color: '#D95319', dashed: true, width: 1.6, label: 'cutoff d' }),
          // 2σ² et non σ² : le bruit est complexe circulaire, il porte σ²
          // par quadrature. L'étiquette dit donc le niveau réel.
          hline('noiseLine', { color: '#77AC30', dashed: true, width: 1.6, label: 'noise 2σ² (true)' }),
        ],
        axes: { x: { label: 'k' }, y: { label: 'λ_k / λ₁', unit: 'dB' } },
      })
    ),

    // Le MODÈLE, une fois complet. Les méthodes à sous-espace rendent des
    // fréquences et rien d'autre ; les amplitudes viennent d'un moindres
    // carrés aux fréquences trouvées, et la variance du bruit de ce qui
    // reste. C'est cette vue qui dit si le modèle EXPLIQUE la mesure, et
    // pas seulement s'il a trouvé des raies au bon endroit.
    //
    // TROIS spectres dans la MÊME représentation — des raies pour les
    // sinusoïdes, une ligne pour le niveau de bruit — parce que c'est cette
    // identité de forme qui permet de les comparer d'un regard au lieu de
    // traduire mentalement d'un dessin à l'autre. Les couleurs sont celles
    // du pseudo-spectre : orange root-MUSIC, violet ESPRIT, jaune la vérité,
    // d'une vue à l'autre sans réapprentissage.
    //
    // En régime nominal les trois se confondent, et c'est LE résultat, pas
    // un défaut de lisibilité. Ils se séparent exactement quand le modèle
    // cesse d'expliquer la mesure.
    view(
      'model',
      'Estimated spectrum',
      stem('linesTrue', {
        color: '#EDB120',
        size: 7,
        baseline: -60,
        label: 'ground truth',
        overlays: [
          stem('linesRoot', { color: '#D95319', size: 4.5, baseline: -60, label: 'root-MUSIC' }),
          stem('linesEsprit', { color: '#7E2F8E', size: 4.5, baseline: -60, label: 'ESPRIT' }),
          // Un SOCLE par spectre, dans sa couleur, et pas une ligne : le
          // bruit est une puissance étalée sur toute la bande, les raies
          // montent au-dessus de lui. C'est le modèle « d exponentielles
          // PLUS du bruit blanc » dessiné tel qu'il est écrit, et c'est
          // aussi ce qui rend visible d'un coup d'œil qu'un socle est
          // remonté. Le bord supérieur reste tracé par-dessus : un aplat
          // translucide ne se lit pas au décibel près.
          band('bandTrue', { color: '#EDB120', opacity: 0.16, label: 'ground truth' }),
          band('bandRoot', { color: '#D95319', opacity: 0.16, label: 'root-MUSIC' }),
          band('bandEsprit', { color: '#7E2F8E', opacity: 0.16, label: 'ESPRIT' }),
          hline('nsTrue', { color: '#EDB120', width: 1.6, label: 'ground truth' }),
          hline('nsRoot', { color: '#D95319', dashed: true, width: 1.6, label: 'root-MUSIC' }),
          hline('nsEsprit', { color: '#7E2F8E', dashed: true, width: 1.6, label: 'ESPRIT' }),
        ],
        axes: { x: F_AXIS, y: { label: 'power', unit: 'dB', domain: [MODEL_FLOOR, 8] } },
      })
    ),

    // Le résultat. Le pseudo-spectre n'est PAS une densité spectrale — c'est
    // l'inverse d'une distance au sous-espace bruit, sans unité physique —
    // et les deux estimateurs sans grille sont posés dessus comme des
    // points : root-MUSIC et ESPRIT donnent des NOMBRES, pas des courbes.
    view(
      'pseudo',
      'Pseudo-spectrum',
      line('pseudo', {
        width: 2.2,
        label: 'MUSIC',
        overlays: [
          ...TRUTH,
          scatter('rootMusicMarks', { color: '#D95319', size: 10, label: 'root-MUSIC' }),
          scatter('espritMarks', { color: '#7E2F8E', size: 10, label: 'ESPRIT' }),
        ],
        axes: { x: F_AXIS, y: { label: 'pseudo-spectrum', unit: 'dB' } },
      })
    ),
  ],
};
