import { float, select } from '../../../core/fields.js';
import { view, figure, line, vline, hline } from '../../../core/views.js';

/** @type {import('../../../core/types').ExperimentManifest} */
export default {
  id: 'periodogram',
  order: 3,
  random: true, // du bruit gaussien : l'expérience tire, donc elle a un seed
  title: 'The periodogram',
  subtitle: 'Estimating a spectrum in noise — and why a longer record is not enough',
  tags: ['PSD', 'periodogram', 'Welch', 'Bartlett', 'consistency', 'noise'],

  params: {
    method: select('méthode', {
      description: 'power spectral density estimator',
      options: [
        { value: 'raw', label: 'raw periodogram' },
        { value: 'bartlett', label: 'Bartlett — disjoint segments' },
        { value: 'welch', label: 'Welch — 50 % overlap' },
      ],
      default: 'raw',
    }),
    N: select('N', {
      description: 'record length (Fs = 1 kHz)',
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
      description: 'segment length — THE variance against resolution trade-off',
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
      description: 'window applied to each segment',
      options: [
        { value: 'rect', label: 'rectangular' },
        { value: 'hann', label: 'Hann' },
        { value: 'hamming', label: 'Hamming' },
        { value: 'blackman', label: 'Blackman' },
      ],
      default: 'rect',
    }),
    snr: float('SNR', {
      description: 'signal-to-noise ratio of the strong line',
      min: -20,
      max: 40,
      step: 1,
      default: 10,
      unit: 'dB',
      precision: 0,
    }),
    a2: float('A₂', {
      description: 'level of the weak line, the one being looked for',
      min: -60,
      max: 0,
      step: 1,
      default: -20,
      unit: 'dB',
      precision: 0,
    }),
    df: float('Δf', {
      description: 'gap between the two lines (the strong one is at 150 Hz)',
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
      message: 'A segment cannot be longer than the record (L ≤ N)',
    },
  ],

  derived: {
    duration: { label: 'record duration', calc: (p) => `${(p.N / 1000).toFixed(3)} s` },
    resolution: {
      label: 'Δf of the raw periodogram',
      calc: (p) => `${(1000 / p.N).toFixed(2)} Hz`,
    },
  },

  groups: [
    { title: 'Signal', params: ['snr', 'a2', 'df', 'N'] },
    { title: 'Estimator', params: ['method', 'L', 'win'] },
  ],

  views: [
    // Le signal brut : on n'y voit RIEN, et c'est le point de départ.
    figure(
      'time',
      line('signal', {
        width: 1,
        label: 'x[n] = two lines + noise',
        axes: { x: { label: 't', unit: 's' }, y: 'x(t)' },
      })
    ),

    // Le découpage lui-même, en vue séparée : les fenêtres posées là où
    // elles tombent, et LEUR SOMME. C'est la vue qui explique pourquoi les
    // deux autres donnent ce qu'elles donnent, et elle se lit en quatre
    // cas — rect/disjoint plate à 1, Hann/disjoint qui ondule jusqu'à 0
    // (les bords sont jetés), Hann/50 % plate à 1 (COLA, reconstruction
    // parfaite), rect/50 % plate à 2 (tout compté deux fois, d'où des
    // segments corrélés). Elle porte donc, à elle seule, la raison d'être
    // de la fenêtre de Welch.
    view(
      'segments',
      'Segmentation and overlap',
      line('windowSum', {
        color: '#D95319',
        width: 2.6,
        label: 'sum of the windows',
        overlays: [
          // estompé, et volontairement : il est là pour rappeler qu'on
          // découpe QUELQUE CHOSE, pas pour être lu en ordonnée. À pleine
          // opacité il écrasait les fenêtres, qui sont le sujet.
          line('zoomSignal', {
            color: '#a1a1aa',
            width: 0.8,
            opacity: 0.3,
            label: 'signal (free scale)',
          }),
          // une seule série, segments séparés par des NaN : le tracé
          // générique casse le chemin, donc pas de vue sur mesure
          line('segWindows', { color: '#0072BD', width: 1.6, label: 'windows' }),
          hline(() => 1, { color: '#a1a1aa', width: 1, dashed: true, label: '1' }),
        ],
        axes: { x: { label: 't', unit: 's' }, y: 'weight' },
      })
    ),

    // LA vue. Le périodogramme brut reste en gris derrière l'estimateur
    // choisi : « regardez l'herbe, et regardez ce que Welch en fait » ne se
    // dit qu'en voyant les deux en même temps.
    figure(
      'spectrum',
      line('psd', {
        width: 2,
        label: 'estimate',
        overlays: [
          line('psdRaw', { color: '#a1a1aa', width: 0.9, label: 'raw periodogram' }),
          hline('noiseFloor', { color: '#D95319', dashed: true, width: 1.8, label: 'σ²/Fs — the true level' }),
          vline('f1', { color: '#EDB120', dashed: true, width: 1.6, label: 'f₁' }),
          vline('f2', { color: '#77AC30', dashed: true, width: 1.6, label: 'f₂' }),
        ],
        axes: {
          x: { label: 'f', unit: 'Hz' },
          y: { label: 'PSD', unit: 'dB/Hz' },
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
        label: 'measured spread from bin to bin',
        // 1/√K est la loi des segments INDÉPENDANTS. Bartlett la suit ; Welch,
          // dont les segments partagent la moitié de leurs échantillons, se tient
          // légèrement AU-DESSUS — et c'est vérifié plutôt que promis.
          overlays: [
            line('fluctTheory', {
              color: '#D95319',
              dashed: true,
              width: 1.8,
              label: '1/√K — independent segments',
            }),
          ],
        axes: {
          x: { label: 'K — segments averaged', scale: 'log' },
          y: { label: 'σ / mean, bin to bin', scale: 'log' },
        },
      })
    ),
  ],
};
