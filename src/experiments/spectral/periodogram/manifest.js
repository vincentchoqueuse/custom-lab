import { float, select } from '../../../core/fields.js';
import { view, figure, line, vline, hline } from '../../../core/views.js';

/** @type {import('../../../core/types').ExperimentManifest} */
export default {
  id: 'periodogram',
  order: 3,
  random: true, // Gaussian noise: the experiment draws, so it has a seed
  title: 'The periodogram',
  subtitle: 'Estimating a spectrum in noise — and why a longer record is not enough',
  tags: ['PSD', 'periodogram', 'Welch', 'Bartlett', 'consistency', 'noise'],

  params: {
    method: select('method', {
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
    win: select('window', {
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
    // seed injected by the core, because random: true
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
    // The raw signal: NOTHING is visible in it, and that is the starting point.
    figure(
      'time',
      line('signal', {
        width: 1,
        label: 'x[n] = two lines + noise',
        axes: { x: { label: 't', unit: 's' }, y: 'x(t)' },
      })
    ),

    // The segmentation itself, as a separate view: the windows laid where they
    // fall, and THEIR SUM. This is the view that explains why the
    // deux autres donnent ce qu'elles donnent, et elle se lit en quatre
    // cases — rect/disjoint flat at 1, Hann/disjoint rippling down to 0 (the
    // edges are thrown away), Hann/50 % flat at 1 (COLA, perfect
    // reconstruction), rect/50 % flat at 2 (everything counted twice, hence
    // correlated segments). It therefore carries, on its own, the reason
    // Welch's window exists.
    view(
      'segments',
      'Segmentation and overlap',
      line('windowSum', {
        color: '#D95319',
        width: 2.6,
        label: 'sum of the windows',
        overlays: [
          // faded, and deliberately: it is there to recall that SOMETHING is
          // being cut up, not to be read on the ordinate. At full opacity it
          // crushed the windows, which are the subject.
          line('zoomSignal', {
            color: '#a1a1aa',
            width: 0.8,
            opacity: 0.3,
            label: 'signal (free scale)',
          }),
          // a single series, segments separated by NaNs: the generic plot
          // breaks the path, so no bespoke view
          line('segWindows', { color: '#0072BD', width: 1.6, label: 'windows' }),
          hline(() => 1, { color: '#a1a1aa', width: 1, dashed: true, label: '1' }),
        ],
        axes: { x: { label: 't', unit: 's' }, y: 'weight' },
      })
    ),

    // THE view. The raw periodogram stays in grey behind the chosen estimator:
    // "look at the noise floor, and at what Welch does to it" can only be said
    // while seeing both at once.
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

    // The lesson, as a straight line: averaging K segments divides the
    // fluctuation by √K, and the raw periodogram is the K = 1 point one stays at
    // as long as one does not average. Log-log, so the slope −1/2 can be read
    // with a ruler.
    view(
      'consistency',
      'Fluctuation vs K',
      line('fluctVsK', {
        width: 2.4,
        label: 'measured spread from bin to bin',
        // 1/√K is the law of INDEPENDENT segments. Bartlett follows it; Welch,
          // whose segments share half their samples, sits slightly ABOVE — and
          // that is verified rather than promised.
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
