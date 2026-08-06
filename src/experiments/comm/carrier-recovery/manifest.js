import { float, int, log, select } from '../../../core/fields.js';
import { view, plane, line, scatter, hline, vline } from '../../../core/views.js';

/** @type {import('../../../core/types').ExperimentManifest} */
export default {
  id: 'carrier-recovery',
  // Second: the link is built in scene one of `constellations`, and this is the
  // assumption that experiment — and every other one in the subject — makes
  // without saying so.
  order: 2,
  random: true,
  title: 'Carrier recovery',
  subtitle: 'Costas, Viterbi & Viterbi, decision-directed — and the ambiguity none of them can lift',
  tags: ['synchronization', 'Costas', 'Viterbi & Viterbi', 'PLL', 'phase ambiguity', 'loop bandwidth'],
  doc: `Every other experiment in this subject assumes the receiver knows the
        transmitter's phase. It does not: the two oscillators are two crystals,
        so the constellation arrives turning.

        Three ways to stop it, and they are the three the field uses. Costas is
        a feedback loop reading a phase error without the data. Viterbi &
        Viterbi is feedforward: raise the sample to the Mth power, which strips
        the modulation because every constellation point lands on the same
        angle, average over a block, divide by M. Decision-directed uses the
        angle between what arrived and what was decided, and is the best of the
        three exactly when it is no longer needed.

        All three share one property, and it is a theorem rather than a defect:
        the detector cannot tell one constellation point from another, so its
        characteristic has period 2π/M and the loop locks to any of M phases.
        The answer to that is differential encoding, not a better loop.`,

  params: {
    mod: select('modulation', {
      description: 'M-PSK constellation — M sets the ambiguity',
      options: [
        { value: 'bpsk', label: 'BPSK — 2 points, 180° ambiguity' },
        { value: 'qpsk', label: 'QPSK — 4 points, 90°' },
        { value: '8psk', label: '8-PSK — 8 points, 45°' },
      ],
      default: 'qpsk',
    }),
    ebn0Db: float('Eb/N₀', {
      description: 'signal-to-noise ratio per bit',
      min: 0,
      max: 30,
      step: 0.5,
      default: 12,
      unit: 'dB',
      precision: 1,
    }),
    phi0: float('θ₀', {
      description: 'phase offset between the two oscillators',
      min: -180,
      max: 180,
      step: 5,
      default: 35,
      unit: '°',
      precision: 0,
    }),
    dfreq: float('Δf', {
      description: 'frequency offset, in thousandths of the symbol rate',
      min: 0,
      max: 1,
      step: 0.05,
      default: 0,
      unit: '‰',
      precision: 2,
    }),
    algo: select('method', {
      description: 'how the phase is recovered',
      options: [
        { value: 'costas', label: 'Costas — feedback, blind to the data' },
        { value: 'vv', label: 'Viterbi & Viterbi — feedforward, per block' },
        { value: 'dd', label: 'decision-directed — feedback, uses the decisions' },
      ],
      default: 'costas',
    }),
    blt: log('B_L·T', {
      description: 'loop bandwidth, normalised to the symbol rate',
      min: 1e-4,
      max: 0.05,
      default: 0.005,
      precision: 5,
      visibleIf: { algo: ['costas', 'dd'] },
    }),
    zeta: float('ζ', {
      description: 'loop damping',
      min: 0.3,
      max: 2,
      step: 0.05,
      default: 0.707,
      precision: 2,
      visibleIf: { algo: ['costas', 'dd'] },
    }),
    order: select('loop order', {
      description: 'how many integrators the loop filter has',
      options: [
        { value: 1, label: '1 — cannot track a frequency offset' },
        { value: 2, label: '2 — tracks it with no static error' },
      ],
      default: 2,
      visibleIf: { algo: ['costas', 'dd'] },
    }),
    block: int('L', {
      description: 'symbols averaged per Viterbi & Viterbi estimate',
      min: 4,
      max: 512,
      default: 64,
      visibleIf: { algo: 'vv' },
    }),
    N: int('N', { description: 'symbols transmitted', min: 500, max: 20000, step: 500, default: 6000 }),
    // seed injected by the core, because random: true
  },

  derived: {
    amb: { label: 'ambiguity 2π/M', calc: (p) => `${360 / 2 ** { bpsk: 1, qpsk: 2, '8psk': 3 }[p.mod]}°` },
    rhoL: {
      label: 'loop SNR ρ_L = (Es/N₀)/(2·B_L·T)',
      calc: (p) => {
        const k = { bpsk: 1, qpsk: 2, '8psk': 3 }[p.mod];
        return p.algo === 'vv'
          ? '—'
          : `${(10 * Math.log10((k * 10 ** (p.ebn0Db / 10)) / (2 * p.blt))).toFixed(1)} dB`;
      },
    },
  },

  groups: [
    { title: 'Link', params: ['mod', 'ebn0Db', 'N'] },
    { title: 'The offset', params: ['phi0', 'dfreq'] },
    { title: 'Synchronizer', params: ['algo', 'blt', 'zeta', 'order', 'block'] },
  ],

  views: [
    // The subject's own leading figure, and the one that says the problem in a
    // single glance: the grey cloud is a ring because the phase turns, the blue
    // one is the same symbols after correction.
    plane('constellation', 'The constellation', {
      clouds: [
        { source: 'received', color: '#a1a1aa', r: 1.8, opacity: 0.4, max: 1500, label: 'received' },
        { source: 'corrected', color: '#0072BD', r: 2.2, opacity: 0.75, max: 1500, label: 'after recovery' },
      ],
      markers: { source: 'ideal', color: '#EDB120', label: 'transmitted' },
      axisLines: true,
      axes: { x: 'I', y: 'Q' },
    }),

    view(
      'tracking',
      'Phase error',
      line('phaseErr', {
        color: '#0072BD',
        width: 1.4,
        label: 'θ̂ − θ, wrapped into one slot',
        overlays: [
          hline('zeroLine', { color: '#a1a1aa', width: 1.2, dashed: true }),
          hline('ambHi', { color: '#EDB120', dashed: true, width: 1.6, label: '±π/M — half an ambiguity slot' }),
          hline('ambLo', { color: '#EDB120', dashed: true, width: 1.6 }),
        ],
        axes: { x: 'symbol n', y: { label: 'phase error', unit: '°' } },
      })
    ),

    // THE figure of the experiment. Everything about ambiguity is the period of
    // this curve, and it is read off the picture rather than asserted.
    view(
      'scurve',
      'The detector characteristic',
      line('scurve', {
        color: '#7E2F8E',
        width: 2.4,
        label: 'S(φ) = E[error | phase error φ]',
        overlays: [
          hline('zeroLine', { color: '#a1a1aa', width: 1.2, dashed: true }),
          scatter('lockPoints', { color: '#EDB120', size: 8, label: 'the M stable lock points' }),
        ],
        axes: { x: { label: 'phase error φ', unit: 'rad' }, y: 'S(φ), normalised' },
      })
    ),

    view(
      'jitter',
      'Jitter vs loop bandwidth',
      line('jitterMeas', {
        color: '#0072BD',
        width: 2.4,
        label: 'measured, by re-running the loop',
        overlays: [
          line('jitterTheory', { color: '#D95319', width: 2, dashed: true, label: 'σ_φ = 1/√(2ρ_L)' }),
          vline('bltLine', { color: '#EDB120', dashed: true, width: 1.6, label: 'current B_L·T' }),
        ],
        axes: {
          x: { label: 'B_L·T', scale: 'log' },
          y: { label: 'RMS phase error', unit: '°', scale: 'log' },
        },
      })
    ),
  ],
};
