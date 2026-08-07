import { int, float, bool } from '../../../core/fields.js';
import { view, line, histogram, density, vline, hline, figure } from '../../../core/views.js';

/** @type {import('../../../core/types').ExperimentManifest} */
export default {
  id: 'quantization',
  order: 3,
  random: true,
  title: 'Quantization',
  subtitle: 'The ADC staircase, its error, and the 6 dB per bit rule',
  tags: ['digital', 'ADC', 'quantization', 'SNR', 'dither'],

  doc: `A signal rounded to 2^b levels, and what the rounding costs. At b = 3 the
staircase is impossible to miss; at b = 8 it disappears into the line. The
error histogram sits on the uniform density over ±Δ/2 — the assumption
behind the familiar Δ²/12 — until b drops low enough that the error
acquires structure and stops being a noise at all: the uniform model is an
approximation, valid when Δ is small against the signal, and the experiment
shows where that condition stops being a formality.

The SNR view measures the law of the chapter: 6.02b + 1.76 + 20·log₁₀A.
Each bit buys 6 dB — and so does filling the range: an input at half
amplitude wastes exactly one bit, which is why getting the gain in front of
an ADC right is the entire art.

Dither is the counter-intuitive coda. At low resolution the error is a
periodic pattern locked to the signal — distortion, not noise — and adding
a small random signal before rounding dissolves it into white noise, at a
cost of about 3 dB. Redrawing tells the two apart: the undithered pattern
never changes, the dithered noise does. The trade is made in every audio
converter.`,


  params: {
    b: int('b', { description: 'number of bits', min: 1, max: 12, default: 8, unit: 'bits' }),
    A: float('A', {
      description: 'amplitude relative to full scale',
      min: 0.05,
      max: 1,
      step: 0.01,
      default: 0.9,
      precision: 2,
    }),
    f: float('f', {
      description: 'signal frequency',
      min: 1,
      max: 20,
      step: 0.1,
      default: 7.3,
      unit: 'Hz',
      precision: 1,
    }),
    dither: bool('dither', {
      description: 'uniform noise ±Δ/2 added BEFORE quantization',
      default: false,
    }),
  },

  views: [
    figure(
      'time',
      line('quantT', {
        width: 1.5,
        label: 'quantized',
        overlays: [line('cleanT', { color: '#D95319', dashed: true, label: 'signal' })],
        axes: { x: { label: 't', unit: 's' }, y: 'x' },
      })
    ),
    view(
      'error',
      'The error',
      line('errT', {
        overlays: [
          hline((p) => 1 / 2 ** p.b, { color: '#EDB120', dashed: true, label: '+Δ/2' }),
          hline((p) => -1 / 2 ** p.b, { color: '#EDB120', dashed: true, label: '−Δ/2' }),
        ],
        axes: { x: { label: 't', unit: 's' }, y: 'e = q(x) − x' },
      })
    ),
    view(
      'error-hist',
      'Distribution of the error',
      histogram('errorLsb', {
        overlays: [density('errPdfLsb', { label: 'uniform on [−½, ½]' })],
        // PINNED to the quantizer's own frame. In signal units the frame moved
        // with every bit added, so the one thing worth seeing — that the shape
        // does not change, only the width — was the one thing hidden.
        axes: { x: { label: 'error', unit: 'LSB', domain: [-0.5, 0.5] }, y: 'density' },
      })
    ),
    view(
      'snr',
      'SNR vs bits',
      line('snrCurve', {
        label: 'measured',
        overlays: [
          line('snrTh', { color: '#D95319', dashed: true, label: '6.02b + 1.76 + 20log₁₀A' }),
          vline('b', { color: '#EDB120', dashed: true, label: 'b' }),
        ],
        axes: { x: { label: 'b', unit: 'bits' }, y: { label: 'SNR', unit: 'dB' } },
      })
    ),
  ],
};
