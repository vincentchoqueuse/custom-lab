// THE FIGURE A COMMUNICATIONS EXPERIMENT OPENS ON — the signal in time, and
// the fact, stated before anything else, that it is COMPLEX.
//
// Every constellation in this subject is a plane of complex numbers, and a
// room that meets the plane first comes away believing a symbol is a point on
// a picture. It is a pair of real signals travelling on two carriers in
// quadrature, and there is exactly one figure that says so: the real part in
// time, the imaginary part in time, one abscissa under the two. Stems and not
// a line, because at symbol rate there IS no value between two samples and a
// line would claim one.
//
// The transmitted signal and the received one, on the same axes, in every
// experiment: the whole subject is the story of what the channel did between
// the two, and the answer is legible before a single equalizer is named.
//
// THE CONTRACT. A comm compute that draws a complex baseband signal emits
// four series over the same abscissa:
//
//     txI, txQ   what was sent      { x: n, y: value }
//     rxI, rxQ   what came back     { x: n, y: value }
//
// An experiment that PROCESSES what came back — an equalizer, a matched filter
// — passes a third pair through `after`, on the same abscissa. Without it, a
// room looking at a receiver's time figure cannot tell whether the orange
// train is the channel's output or the processing's, which is the one
// distinction the experiment exists to draw.
//
// Four names, used identically across the subject, so that the figure is
// declared once here and never retyped — and so that a listener moving from
// the constellation experiment to OFDM finds the same picture in the same
// place, under the same URL segment.

import { figureStack, stem, line } from '../../../core/views.js';

const TX = '#0072BD'; // blue: what was sent — the reference, everywhere
const RX = '#D95319'; // orange: what came back
const AFTER = '#77AC30'; // green: what the receiver made of it

/**
 * The standard `time` figure of the subject: Re above, Im below, transmitted
 * and received on both.
 *
 * @param {object}   [o]
 * @param {string}   [o.x]         abscissa label — 'symbol n' by default
 * @param {string}   [o.txLabel]   legend name of the transmitted signal
 * @param {string}   [o.rxLabel]   legend name of the received signal
 * @param {string}   [o.symbol]    the letter the ordinates are named after
 * @param {boolean}  [o.continuous] draw lines instead of stems — for a signal
 *                                 that is sampled far above symbol rate (a
 *                                 shaped waveform, an OFDM frame), where a
 *                                 stem per sample is a black comb and the
 *                                 line claims nothing untrue
 * @param {Array}    [o.overlays]  marks on the shared abscissa (frame
 *                                 boundaries, a prefix band) — drawn on both
 *                                 panels, because they name a place in time
 * @param {?object}  [o.after]     a third pair — {i, q, label} — for what the
 *                                 receiver made of the received signal
 */
export function basebandFigure({
  x = 'symbol n',
  txLabel = 'transmitted',
  rxLabel = 'received',
  symbol = 'x',
  continuous = false,
  overlays = [],
  after = null,
} = {}) {
  const draw = continuous ? line : stem;
  // ONE ABSCISSA, SHARED. Both signals live at the same instants and are drawn
  // at them: a sideways nudge made the two stem trains easier to tell apart and
  // put the transmitted symbol somewhere it was not, which on a figure whose
  // whole subject is "at this instant, this was sent and that arrived" is the
  // one thing it may not do. The received train is drawn thinner and on top, so
  // the reference shows on both sides of it.
  const part = (tx, rx, af, label) =>
    draw(tx, {
      color: TX,
      width: continuous ? 1.8 : 3.2,
      size: 4,
      label: txLabel,
      overlays: [
        draw(rx, { color: RX, width: continuous ? 1.5 : 1.4, size: 2.8, label: rxLabel }),
        ...(af
          ? [draw(af, { color: AFTER, width: continuous ? 1.5 : 1.4, size: 2.8, label: after.label })]
          : []),
      ],
      axes: { y: { label } },
    });

  return figureStack(
    'time',
    [
      part('txI', 'rxI', after?.i, `Re ${symbol}[n]`),
      part('txQ', 'rxQ', after?.q, `Im ${symbol}[n]`),
    ],
    { axes: { x: { label: x } }, overlays }
  );
}
