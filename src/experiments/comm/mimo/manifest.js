import { float, int, select } from '../../../core/fields.js';
import { view, plane, line, scatter } from '../../../core/views.js';
import { basebandFigure } from '../_lib/baseband.js';

/** @type {import('../../../core/types').ExperimentManifest} */
export default {
  id: 'mimo',
  // After the channel has been met in time (the eye), in frequency (OFDM) and
  // adaptively (blind equalization), it is met in SPACE. Same link, fourth
  // dimension.
  order: 7,
  random: true, // symbols, noise and the channel's rotation are drawn
  title: 'MIMO 2×2 and its three receivers',
  subtitle: 'Two symbols at once — and what it costs to pull them apart',
  tags: ['MIMO', 'spatial multiplexing', 'ZF', 'MMSE', 'ML', 'conditioning'],

  params: {
    mod: select('modulation', {
      description: 'constellation sent on EACH of the two streams',
      options: [
        { value: 'qpsk', label: 'QPSK' },
        { value: '16qam', label: '16-QAM — 256 hypotheses' },
      ],
      default: 'qpsk',
    }),
    rho: float('ρ', {
      // THE knob. HᴴH = [[1, ρ], [ρ, 1]] by construction, so everything the
      // experiment shows has a closed form in ρ and nothing has to be believed.
      description: 'correlation between the two spatial channels',
      min: 0,
      max: 0.95,
      step: 0.05,
      default: 0.5,
      precision: 2,
    }),
    snr: float('SNR', {
      description: 'Es/N₀ per receive antenna',
      min: 0,
      max: 24,
      step: 1,
      default: 12,
      unit: 'dB',
      precision: 0,
    }),
    eq: select('equalizer', {
      // the two formulas used to live in the option labels, where they made
      // the pill a paragraph; the drawer is where a formula belongs
      description:
        'linear receiver drawn on the stream view — ZF is H⁻¹, MMSE is (HᴴH + N₀I)⁻¹Hᴴ. ML makes no cloud',
      options: [
        { value: 'zf', label: 'ZF' },
        { value: 'mmse', label: 'MMSE' },
      ],
      default: 'zf',
    }),
    N: int('N', { description: 'symbol pairs drawn', min: 200, max: 4000, step: 100, default: 1500 }),
    // seed injected by the core, because random: true
  },

  groups: [
    { title: 'Link', params: ['mod', 'snr', 'N'] },
    { title: 'Channel', params: ['rho'] },
    { title: 'Receiver', params: ['eq'] },
  ],

  derived: {
    // The two numbers the room should be able to compute before looking, and
    // then read off the statline.
    zfLoss: {
      label: 'ZF loss −10·log10(1−ρ²)',
      calc: (p) => `${(-10 * Math.log10(Math.max(1 - p.rho ** 2, 1e-12))).toFixed(2)} dB`,
    },
    hyp: {
      label: 'hypotheses ML searches',
      calc: (p) => `${(p.mod === '16qam' ? 16 : 4) ** 2}`,
    },
  },

  views: [
    // THE ONE LINE THAT SEPARATES THIS FROM THE AWGN LINK. Blue: the symbols
    // stream 1 was asked to carry. Orange: what antenna 1 measured — which is
    // h₁₁x₁ + h₁₂x₂ + n, a sum holding a WHOLE SECOND SYMBOL and not merely a
    // noisy copy of the first. Every receiver on the tabs that follow is an
    // answer to this picture, and the room should meet the question first.
    basebandFigure({
      txLabel: 'stream 1 sent x₁[n]',
      rxLabel: 'antenna 1 measured y₁[n]',
      symbol: 'y₁',
    }),

    // WHAT ARRIVES. Two antennas, two clouds, and neither is a constellation
    // any more: each is a mixture of both streams. The grey points are the M²
    // noiseless vectors H·x — the LATTICE, which is what ML matches against and
    // the reason it needs no inversion. This view is ML's home, because ML
    // never leaves the received space.
    plane('antennas', 'What the two antennas receive', {
      clouds: [
        { source: 'rx1', color: '#0072BD', r: 1.8, opacity: 0.4, max: 1200, label: 'antenna 1' },
        { source: 'rx2', color: '#D95319', r: 1.8, opacity: 0.4, max: 1200, label: 'antenna 2' },
      ],
      markers: { source: 'lattice1', color: '#18181b', label: 'the M² points H·x (antenna 1)' },
      axisLines: true,
      axes: { x: 'I', y: 'Q' },
    }),

    // AND WHAT A LINEAR RECEIVER MAKES OF IT. Two clouds again, but now on the
    // transmitted constellation — and this is the parallel the experiment is
    // for: what comes out of a linear MIMO receiver is an AWGN constellation at
    // a DEGRADED signal-to-noise ratio, and nothing else. The degradation is
    // −10·log10(1−ρ²) dB for ZF, exactly.
    plane('streams', 'The two streams, equalized', {
      clouds: [
        { source: 'eq1', color: '#0072BD', r: 1.8, opacity: 0.4, max: 1200, label: 'stream 1' },
        { source: 'eq2', color: '#D95319', r: 1.8, opacity: 0.4, max: 1200, label: 'stream 2' },
      ],
      markers: { source: 'ideal', color: '#EDB120', label: 'transmitted' },
      axisLines: true,
      minHalf: 1.6,
      maxHalf: 3,
      axes: { x: 'I', y: 'Q' },
    }),

    // THE INVOICE, as a curve. Three receivers, and two theoretical lines that
    // between them say everything: the single-antenna AWGN curve — the
    // experiment two tabs away in this same subject — and that SAME formula
    // evaluated at γ·(1−ρ²), which is where zero-forcing lands. ML sits near
    // the first, ZF on the second.
    view(
      'ser',
      'SER against SNR',
      line('serMl', {
        color: '#77AC30',
        width: 2.4,
        label: 'ML',
        overlays: [
          line('serMmse', { color: '#7E2F8E', width: 2, label: 'MMSE' }),
          line('serZf', { color: '#0072BD', width: 2, label: 'ZF' }),
          line('serAwgn', {
            color: '#a1a1aa',
            width: 1.8,
            dashed: true,
            label: 'one antenna, AWGN (theory)',
          }),
          line('serZfTheory', {
            color: '#D95319',
            width: 1.8,
            dashed: true,
            label: 'the same, at γ·(1−ρ²)',
          }),
        ],
        axes: {
          x: { label: 'Es/N₀', unit: 'dB' },
          y: { label: 'SER', scale: 'log', domain: [1e-5, 1] },
        },
      })
    ),
  ],
};
