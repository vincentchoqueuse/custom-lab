// The three views every digital-filter experiment draws, declared once.
//
// core/bench.js already made the five experiments COMPUTE the same way (one
// sampling rate, one analysis window, one steady-state convention). This is
// the display half: they now DECLARE the same way too, so a student who
// moves from one demo to the next meets the same figure with the same
// colours, the same axes and the same legend — the input dashed in orange,
// the output solid in blue, the transfer function dashed on the spectra.
//
// Each builder takes only what genuinely differs (the observable names, the
// experiment's own overlays and axis labels); anything an experiment wants
// on top it passes in `overlays`, which is appended after the shared ones.
// A view whose SHAPE differs — the four SVF responses, the FIR gabarit, the
// digital-versus-analog comparison — stays hand-written in its manifest:
// forcing dissimilar figures through one mould would cost more than it saves.
import { view, line, stem } from './views.js';

const IN_COLOR = '#D95319'; // the input, dashed, in every time view
const RESP_COLOR = '#D95319'; // |H(f)| over the spectra
const SPEC_IN_COLOR = '#7E2F8E';

/**
 * A periodic signal through the filter: output solid, input dashed.
 * The observable names are the bench's own (`tIn` / `tOut`).
 */
export function timeView({ id = 'time', title = 'Réponse temporelle', overlays = [] } = {}) {
  return view(
    id,
    title,
    line('tOut', {
      width: 1.8,
      label: 'sortie',
      overlays: [line('tIn', { color: IN_COLOR, dashed: true, label: 'entrée' }), ...overlays],
      axes: { x: { label: 't', unit: 'ms' }, y: 'x(t)' },
    })
  );
}

/**
 * h[n] as a stem — the discrete-signal figure, never a continuous line.
 * `source` is the impulse-response observable, `y` its axis label.
 */
export function impulseView({
  id = 'impulse',
  title = 'Réponse impulsionnelle',
  source = 'impulse',
  label,
  y = 'h[n]',
  x = 'n',
  overlays = [],
} = {}) {
  return view(id, title, stem(source, { label, overlays, axes: { x, y } }));
}

/**
 * Input and output spectra with |H(f)| over them, in dB. `overlays` carries
 * whatever marker the experiment wants on top (its own cut-off, its tooth
 * spacing…), appended after the shared three.
 */
export function spectrumView({
  id = 'spectrum',
  title = 'Réponse fréquentielle',
  resp = 'resp',
  domain = [-80, 30],
  overlays = [],
} = {}) {
  return view(
    id,
    title,
    line('specOut', {
      width: 1.8,
      label: 'sortie',
      overlays: [
        line('specIn', { color: SPEC_IN_COLOR, opacity: 0.45, label: 'entrée' }),
        line(resp, { color: RESP_COLOR, dashed: true, label: '|H(f)|' }),
        ...overlays,
      ],
      axes: {
        x: { label: 'f', unit: 'Hz' },
        y: { label: 'amplitude', unit: 'dB', domain },
      },
    })
  );
}
