import { coeffs, float, select } from '../../../core/fields.js';
import { vline } from '../../../core/views.js';
import { timeView, impulseView, spectrumView } from '../../../core/response-views.js';

/** @type {import('../../../core/types').ExperimentManifest} */
export default {
  id: 'fir-taps',
  order: 1,
  title: 'The FIR filter',
  subtitle:
    'Type the coefficients: the time, impulse and frequency responses follow',
  tags: ['digital', 'FIR', 'moving average', 'convolution'],

  doc: `A handful of coefficients typed by hand, and everything a FIR can be. Four
values of 1/4 make the moving average — the most naive filter in the world,
with PERFECT zeros at k·Fs/L, and a DC gain H(0) = Σb that has to be 1,
which is why the coefficients are 1/L and not 1. A square wave in, something
rounder out: what disappeared is the corners, which is to say the high
harmonics.

The other classics each teach one thing. b = 0,0,0,1 does nothing but wait —
an all-pass with |H| = 1 everywhere, proof that the magnitude does not tell
the whole story: the phase exists. b = 1,−1 differences two samples, Σb = 0
annihilates DC, and |H| = 2·|sin(πf/Fs)| rises at 6 dB per octave — a
high-pass that amplifies noise. And 0.5,0,−0.5 puts zeros at DC and Fs/2
with a hump between: a band-pass in three coefficients.

The URL carries the coefficients (?b=0.25,0.25,0.25,0.25), so every set
invented at the bench is a shareable link. The FIR-by-windowing experiment
closes the loop: the systematic method does in one formula what is groped
for by hand here.`,


  params: {
    b: coeffs('b', {
      description: 'coefficients b₀…b_M (y[n] = Σ b_k·x[n−k])',
      default: [0.25, 0.25, 0.25, 0.25],
      maxLen: 12,
    }),
    source: select('source', {
      description: 'periodic input signal',
      options: [
        { value: 'square', label: 'square' },
        { value: 'saw', label: 'sawtooth' },
      ],
      default: 'square',
    }),
    f0: float('f₀', {
      description: 'fundamental of the signal',
      min: 50,
      max: 400,
      step: 1,
      default: 125,
      unit: 'Hz',
      precision: 0,
    }),
  },

  views: [
    timeView(),
    impulseView({ source: 'taps', x: 'k', y: 'b[k] = h[k]' }),
    spectrumView({
      overlays: [
        vline((p) => 8000 / p.b.length, {
          color: '#EDB120',
          dashed: true,
          label: 'Fs/L',
        }),
      ],
    }),
  ],
};
