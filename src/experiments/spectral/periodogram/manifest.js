import { float, select } from '../../../core/fields.js';
import { view, figure, line, vline, hline } from '../../../core/views.js';

/** @type {import('../../../core/types').ExperimentManifest} */
export default {
  id: 'periodogram',
  order: 3,
  random: true, // du bruit gaussien : l'expérience tire, donc elle a un seed
  title: 'Le périodogramme',
  subtitle: 'Estimer un spectre dans du bruit — et pourquoi allonger le signal ne suffit pas',
  tags: ['DSP', 'périodogramme', 'Welch', 'Bartlett', 'consistance', 'bruit'],

  params: {
    method: select('méthode', {
      description: "estimateur de densité spectrale",
      options: [
        { value: 'raw', label: 'périodogramme brut' },
        { value: 'bartlett', label: 'Bartlett — segments disjoints' },
        { value: 'welch', label: 'Welch — 50 % de recouvrement' },
      ],
      default: 'raw',
    }),
    N: select('N', {
      description: "longueur de l'enregistrement (Fs = 1 kHz)",
      options: [
        { value: 512, label: '512' },
        { value: 1024, label: '1024' },
        { value: 2048, label: '2048' },
        { value: 4096, label: '4096' },
        { value: 8192, label: '8192' },
      ],
      default: 2048,
    }),
    L: select('L', {
      description: 'longueur de segment — LE compromis variance / résolution',
      options: [
        { value: 64, label: '64' },
        { value: 128, label: '128' },
        { value: 256, label: '256' },
        { value: 512, label: '512' },
        { value: 1024, label: '1024' },
      ],
      default: 256,
      visibleIf: { method: ['bartlett', 'welch'] },
    }),
    win: select('fenêtre', {
      description: 'fenêtre appliquée à chaque segment',
      options: [
        { value: 'rect', label: 'rectangulaire' },
        { value: 'hann', label: 'Hann' },
        { value: 'hamming', label: 'Hamming' },
        { value: 'blackman', label: 'Blackman' },
      ],
      default: 'rect',
    }),
    snr: float('SNR', {
      description: 'rapport signal à bruit de la raie forte',
      min: -20,
      max: 40,
      step: 1,
      default: 10,
      unit: 'dB',
      precision: 0,
    }),
    a2: float('A₂', {
      description: 'niveau de la raie faible, celle qu’on cherche',
      min: -60,
      max: 0,
      step: 1,
      default: -20,
      unit: 'dB',
      precision: 0,
    }),
    df: float('Δf', {
      description: 'écart entre les deux raies (la forte est à 150 Hz)',
      min: 5,
      max: 200,
      step: 1,
      default: 40,
      unit: 'Hz',
      precision: 0,
    }),
    // seed injecté par le cœur, parce que random: true
  },

  validate: [
    {
      when: (p) => p.method !== 'raw' && p.L > p.N,
      message: 'Le segment ne peut pas être plus long que l’enregistrement (L ≤ N)',
    },
  ],

  derived: {
    duree: { label: "durée de l'enregistrement", calc: (p) => `${(p.N / 1000).toFixed(3)} s` },
    resolution: {
      label: 'Δf du périodogramme brut',
      calc: (p) => `${(1000 / p.N).toFixed(2)} Hz`,
    },
  },

  groups: [
    { title: 'Signal', params: ['snr', 'a2', 'df', 'N'] },
    { title: 'Estimateur', params: ['method', 'L', 'win'] },
  ],

  views: [
    // Le signal brut : on n'y voit RIEN, et c'est le point de départ.
    figure(
      'time',
      line('signal', {
        width: 1,
        label: 'x[n] = deux raies + bruit',
        axes: { x: { label: 't', unit: 's' }, y: 'x(t)' },
      })
    ),

    // LA vue. Le périodogramme brut reste en gris derrière l'estimateur
    // choisi : « regardez l'herbe, et regardez ce que Welch en fait » ne se
    // dit qu'en voyant les deux en même temps.
    figure(
      'spectrum',
      line('psd', {
        width: 2,
        label: 'estimation',
        overlays: [
          line('psdRaw', { color: '#a1a1aa', width: 0.9, label: 'périodogramme brut' }),
          hline('noiseFloor', { color: '#D95319', dashed: true, width: 1.8, label: 'σ²/Fs — le vrai niveau' }),
          vline('f1', { color: '#EDB120', dashed: true, width: 1.6, label: 'f₁' }),
          vline('f2', { color: '#77AC30', dashed: true, width: 1.6, label: 'f₂' }),
        ],
        axes: {
          x: { label: 'f', unit: 'Hz' },
          y: { label: 'DSP', unit: 'dB/Hz' },
        },
      })
    ),

    // La leçon, en droite : moyenner K segments divise la fluctuation par
    // √K, et le périodogramme brut est le point K = 1 où l'on reste tant
    // qu'on ne moyenne pas. Log-log, donc pente −1/2 lisible à la règle.
    view(
      'consistency',
      'Fluctuation vs K',
      line('fluctVsK', {
        width: 2.4,
        label: 'dispersion mesurée d’un bin à l’autre',
        // 1/√K est la loi des segments INDÉPENDANTS. Bartlett la suit ; Welch,
          // dont les segments partagent la moitié de leurs échantillons, se tient
          // légèrement AU-DESSUS — et c'est vérifié plutôt que promis.
          overlays: [
            line('fluctTheory', {
              color: '#D95319',
              dashed: true,
              width: 1.8,
              label: '1/√K — segments indépendants',
            }),
          ],
        axes: {
          x: { label: 'K — segments moyennés', scale: 'log' },
          y: { label: 'σ / moyenne, d’un bin à l’autre', scale: 'log' },
        },
      })
    ),
  ],
};
