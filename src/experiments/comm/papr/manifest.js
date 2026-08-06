import { float, int, select } from '../../../core/fields.js';
import { view, line, stem, scatter, vline, hline } from '../../../core/views.js';

/** @type {import('../../../core/types').ExperimentManifest} */
export default {
  id: 'papr',
  order: 5, // straight after OFDM: the price of the modulation it just built
  random: true, // the subcarrier symbols are drawn
  title: 'PAPR and the sampling rate',
  subtitle: 'Why an OFDM peak is bigger than the IFFT says, and how it grows with N',
  tags: ['OFDM', 'PAPR', 'oversampling', 'amplifier', 'CCDF', 'harmonic number'],

  doc: `OFDM adds N independently modulated carriers. Most of the time they
interfere every which way and the envelope looks like noise; now and then they
line up and it spikes. The peak-to-average power ratio is what the amplifier
has to survive, and it is the reason an OFDM transmitter needs an expensive
one.

The question this experiment is built around is not "how large is the PAPR" but
"how would you measure it". The IFFT hands you N samples per symbol; the signal
that leaves the antenna is continuous, and its peak generally falls BETWEEN two
of those samples. Read the PAPR off the critically sampled sequence and it comes
out short — by nearly 2 dB at N = 64 — so a link budget built on that number is
short by exactly that much. Oversampling by L, which is a zero-padding of the
spectrum and a longer IFFT, recovers the peaks and then saturates: past L = 4
the answer moves by about a tenth of a decibel, and that is the working rule.

The model is worth stating because it is exact rather than asymptotic. For N
large the central limit theorem makes each sample a complex Gaussian, so its
power is exponential, and the critically sampled PAPR is the maximum of N
independent exponentials: its distribution is (1 − e^{−γ})^N and its mean is
the Nth harmonic number, H_N = 1 + 1/2 + … + 1/N. Oversampled, the samples are
correlated and no closed form exists; the standard fit keeps the same
expression with an effective 2.8 N samples, and it is drawn here as a fit, which
the measurement is free to disagree with.

What that model says is the thing to leave the room with. The typical PAPR grows
like ln N; the worst case grows like N. At N = 1024 those are 8.9 dB and 30.1 dB
— a factor of a hundred and thirty in the power a designer would provision for.
PAPR is a tail problem, and treating it as a worst-case one builds an amplifier
nobody can afford.`,

  params: {
    N: select('N', {
      description: 'subcarriers',
      options: [
        { value: 64, label: '64 — 802.11a' },
        { value: 128, label: '128' },
        { value: 256, label: '256' },
        { value: 512, label: '512' },
        { value: 1024, label: '1024 — LTE 20 MHz' },
      ],
      default: 64,
    }),
    L: select('L', {
      description: 'oversampling factor the PAPR is read at',
      options: [
        { value: 1, label: '1 — IFFT only' },
        { value: 2, label: '2' },
        { value: 4, label: '4 — ≈ continuous' },
        { value: 8, label: '8' },
      ],
      default: 4,
    }),
    mod: select('modulation', {
      description: 'constellation on every subcarrier',
      options: [
        { value: 'qpsk', label: 'QPSK' },
        { value: '16qam', label: '16-QAM' },
      ],
      default: 'qpsk',
    }),
    gamma: float('γ', {
      // A LINEAR ratio and not a decibel, for the same reason the two figures
      // are: the number an amplifier is specified against is "six times the
      // average power", and a designer who reads 7.8 dB has to convert before
      // the sentence means anything.
      description: 'the threshold: how many times the average power the amplifier can pass',
      min: 1.5,
      max: 16,
      step: 0.25,
      default: 5,
      unit: '×',
      precision: 2,
    }),
    M: int('M', {
      description: 'OFDM symbols drawn',
      min: 100,
      max: 3000,
      step: 100,
      default: 600,
    }),
    // seed injected by the core, because random: true
  },

  validate: [
    // The transform is the whole cost, and it is M symbols of L·N points. The
    // ceiling is set so the worst corner of the box still redraws inside the
    // drag budget rather than inside the worker timeout.
    {
      when: (p) => p.M * p.L * p.N > 3e6,
      message: 'M × L × N too large to stay responsive — lower M, or read at a smaller L',
    },
  ],

  groups: [
    { title: 'Signal', params: ['N', 'mod'] },
    { title: 'Measurement', params: ['L', 'M'] },
    { title: 'Specification', params: ['gamma'] },
  ],

  derived: {
    // The two numbers the last view is about, computable in the head from N
    // alone — and three orders of magnitude apart.
    spread: {
      label: 'typical vs worst',
      calc: (p) =>
        `about ${(Math.log(p.N) + 0.5772).toFixed(1)}× the average power, against ${p.N}× if every ` +
        `carrier lined up — which is why PAPR is a tail problem and not a worst-case one`,
    },
  },

  views: [
    // TEMPORAL FIRST, as everywhere in the subject — and here the temporal view
    // IS the argument. The line is the envelope at ×32, standing in for the
    // continuous signal; the stems are what the IFFT actually produced. The two
    // horizontals are the two PAPRs over the whole symbol, so the GAP between
    // them is, in decibels, exactly what the critical rate fails to see.
    view(
      'envelope',
      'One symbol, around its peak',
      line('envelope', {
        color: '#a1a1aa',
        width: 1.6,
        label: 'envelope (×32)',
        overlays: [
          stem('critSamples', {
            color: '#0072BD',
            width: 2,
            size: 3.6,
            // the stems stand on the floor of the frame, not on an arbitrary
            // level part-way up it — a dB plot of a power has deep nulls, and a
            // stem hanging DOWNWARD from mid-frame reads as a negative sample
            baseline: 0,
            label: 'IFFT samples (L = 1)',
          }),
          scatter('overSamples', { color: '#D95319', size: 3, label: 'samples at L' }),
          hline('truePeak', {
            color: '#D95319',
            dashed: true,
            width: 1.8,
            label: 'peak, oversampled',
          }),
          hline('critPeak', {
            color: '#0072BD',
            dashed: true,
            width: 1.8,
            label: 'peak the IFFT sees',
          }),
          // the pill's threshold, on the figure it is a threshold FOR: the
          // envelope crosses it or it does not, and that is the whole question
          hline('gammaLine', { color: '#77AC30', width: 2.2, label: 'γ — what the amplifier passes' }),
        ],
        axes: {
          x: { label: 'time', unit: 'sample periods' },
          // LINEAR, in units of the symbol's own average power. In decibels a
          // peak six times the mean reads "7.8", which is a number nobody
          // flinches at; linear it is a spike six times the height of
          // everything around it, which is the problem the amplifier has.
          y: { label: 'instantaneous power / average', unit: '×', domain: [0, null] },
        },
      })
    ),

    // THE WHOLE DISTRIBUTION, which is what a designer actually buys against: a
    // clipping probability, not a mean. Logarithmic ordinate, floored at 1/M —
    // below that the curve would be reporting the absence of evidence.
    view(
      'ccdf',
      'How often the peak is exceeded',
      line('ccdf', {
        color: '#0072BD',
        width: 2.4,
        label: 'measured, at L',
        overlays: [
          line('ccdfModelN', {
            color: '#7E2F8E',
            width: 2,
            dashed: true,
            label: '(1−e^{−γ})^N — the L = 1 model',
          }),
          line('ccdfModelAlpha', {
            color: '#D95319',
            width: 2,
            dashed: true,
            label: 'the same at 2.8 N — the fit',
          }),
          vline('gammaLine', { color: '#77AC30', width: 2.2, label: 'γ' }),
        ],
        axes: {
          x: { label: 'γ', unit: '×' },
          // The ABSCISSA is linear, because γ is a ratio and the pill sets it
          // as one; the ORDINATE stays logarithmic, because a clipping
          // probability is bought at one symbol in a thousand and a linear
          // axis puts that on the floor. Different axes, different jobs.
          y: { label: 'P(PAPR > γ)', scale: 'log', domain: [1e-4, 1] },
        },
      })
    ),
  ],
};
