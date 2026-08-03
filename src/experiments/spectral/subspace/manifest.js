import { float, int, select } from '../../../core/fields.js';
import { view, figure, line, scatter, vline, hline } from '../../../core/views.js';

/** Les fréquences vraies, en verticales — les mêmes sur les trois vues,
 *  déclarées une fois pour qu'elles ne puissent pas diverger. */
const TRUTH = [
  vline('fTrue1', { color: '#EDB120', dashed: true, width: 1.6, label: 'vraies fréquences' }),
  vline('fTrue2', { color: '#EDB120', dashed: true, width: 1.6 }),
  vline('fTrue3', { color: '#EDB120', dashed: true, width: 1.6 }),
];

/** @type {import('../../../core/types').ExperimentManifest} */
export default {
  id: 'subspace',
  order: 4,
  random: true, // bruit gaussien complexe
  title: 'Techniques haute résolution',
  subtitle: 'MUSIC, root-MUSIC, ESPRIT — ce qu’un modèle achète, et ce qu’il coûte',
  tags: ['haute résolution', 'MUSIC', 'ESPRIT', 'sous-espace', 'valeurs propres'],

  params: {
    df: float('Δf', {
      description: 'écart des deux raies, en unités de la limite de Fourier Fs/N',
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
      description: 'rapport signal à bruit par raie',
      min: -10,
      max: 50,
      step: 1,
      default: 25,
      unit: 'dB',
      precision: 0,
    }),
    d: int('d', {
      description: 'valeurs propres retenues comme SIGNAL — le paramètre qu’il faut deviner',
      min: 1,
      max: 8,
      default: 2,
    }),
    sources: select('sources', {
      description: 'nombre de raies réellement présentes',
      options: [
        { value: 2, label: '2 (deux raies proches)' },
        { value: 3, label: '3 (+ une raie à l’écart)' },
      ],
      default: 2,
    }),
    N: select('N', {
      description: "longueur de l'enregistrement (Fs = 1 kHz)",
      options: [
        { value: 128, label: '128' },
        { value: 256, label: '256' },
        { value: 512, label: '512' },
        { value: 1024, label: '1024' },
      ],
      default: 256,
    }),
    M: int('M', {
      description: 'ordre de la covariance — le nombre de vecteurs propres disponibles',
      min: 4,
      max: 32,
      // la résolution de MUSIC croît avec M : à M = 12 il ne sépare plus
      // 0.5 × Fs/N, à M = 32 oui. C'est le second levier du marché.
      default: 32,
    }),
    // seed injecté par le cœur, parce que random: true
  },

  validate: [
    { when: (p) => p.d >= p.M, message: 'd doit rester strictement inférieur à M' },
    { when: (p) => p.M > p.N / 2, message: 'M ne peut pas dépasser N/2 (pas assez d’instantanés)' },
  ],

  derived: {
    limite: { label: 'limite de Fourier Fs/N', calc: (p) => `${(1000 / p.N).toFixed(2)} Hz` },
    ecart: {
      label: 'écart demandé',
      calc: (p) => `${((p.df * 1000) / p.N).toFixed(2)} Hz (${p.df}× la limite)`,
    },
  },

  groups: [
    { title: 'Signal', params: ['sources', 'df', 'snr', 'N'] },
    { title: 'Modèle', params: ['d', 'M'] },
  ],

  views: [
    // LA référence, et le point de départ : le périodogramme ne sépare pas.
    // C'est le même « Spectre » que partout ailleurs dans le sujet, sous le
    // même nom, parce que c'est exactement le même objet.
    figure(
      'spectrum',
      line('periodogram', {
        width: 2,
        label: 'périodogramme',
        overlays: TRUTH,
        axes: { x: { label: 'f', unit: 'Hz' }, y: { label: '|X(f)|', unit: 'dB' } },
      })
    ),

    // La vue qui sert à CHOISIR d — et la seule information dont on dispose
    // pour le faire en pratique. Les d retenues sont marquées ; la verticale
    // est la coupure ; l'horizontale est le vrai σ², que l'on connaît ici
    // parce qu'on fabrique le signal et jamais dans la vraie vie.
    view(
      'eigen',
      'Valeurs propres',
      line('eigenvalues', {
        width: 2,
        label: 'λ_k (décroissantes)',
        overlays: [
          scatter('eigenSelected', { color: '#D95319', size: 9, label: 'retenues comme signal' }),
          vline('dLine', { color: '#D95319', dashed: true, width: 1.6, label: 'coupure d' }),
          // 2σ² et non σ² : le bruit est complexe circulaire, il porte σ²
          // par quadrature. L'étiquette dit donc le niveau réel.
          hline('noiseLine', { color: '#77AC30', dashed: true, width: 1.6, label: 'bruit 2σ² (vrai)' }),
        ],
        axes: { x: { label: 'k' }, y: { label: 'λ_k / λ₁', unit: 'dB' } },
      })
    ),

    // Le résultat. Le pseudo-spectre n'est PAS une densité spectrale — c'est
    // l'inverse d'une distance au sous-espace bruit, sans unité physique —
    // et les deux estimateurs sans grille sont posés dessus comme des
    // points : root-MUSIC et ESPRIT donnent des NOMBRES, pas des courbes.
    view(
      'pseudo',
      'Pseudo-spectre',
      line('pseudo', {
        width: 2.2,
        label: 'MUSIC',
        overlays: [
          ...TRUTH,
          scatter('rootMusicMarks', { color: '#D95319', size: 10, label: 'root-MUSIC' }),
          scatter('espritMarks', { color: '#7E2F8E', size: 10, label: 'ESPRIT' }),
        ],
        axes: { x: { label: 'f', unit: 'Hz' }, y: { label: 'pseudo-spectre', unit: 'dB' } },
      })
    ),
  ],
};
