// The figures a RESPONSE experiment draws, declared once for the whole
// catalogue — analog, digital and control alike.
//
// The observation this module is built on: the "réponse fréquentielle" of a
// filter and the "diagramme de Bode" of a system are THE SAME FIGURE. Same
// magnitude of the same transfer function against the same frequency axis;
// what differs is the letter on the abscissa (f in Hz, ω in rad/s), whether
// that axis is logarithmic, and whether the ordinate is in dB or in decades.
// A student who meets one and then the other should meet one figure twice,
// not two figures — so there is one builder, and the differences are options.
//
// core/bench.js already made the digital-filter experiments COMPUTE the same
// way (one sampling rate, one analysis window, one steady-state convention).
// This is the display half, widened: the same colours, the same axis labels
// and the same legend across every subject that draws a response.
//
// Each builder takes only what genuinely differs (the observable names, the
// experiment's own overlays, the axis presets); anything an experiment wants
// on top it passes in `overlays`, appended after the shared ones. A view
// whose SHAPE differs — the four SVF responses, the FIR gabarit, the
// digital-versus-analog comparison, a Nyquist locus — stays hand-written in
// its manifest: forcing dissimilar figures through one mould would cost more
// than it saves.
import { view, figure, figurePlane, line, stem, hline, ViewError } from './views.js';

/* ------------------------------------------------------------------ colours
   Named once so custom views can match the declarative ones. MATLAB palette,
   reserved for data marks (see CLAUDE.md). */
export const IN_COLOR = '#D95319'; // the input, dashed, in every time view
export const RESP_COLOR = '#D95319'; // |H(f)| over the spectra
export const SPEC_IN_COLOR = '#7E2F8E';
export const GAIN_COLOR = '#7E2F8E'; // |H| — the magnitude curve
export const PHASE_COLOR = '#77AC30'; // arg H — the phase curve
export const POLE_COLOR = '#D95319';
export const ZERO_COLOR = '#0072BD';
export const GUIDE_COLOR = '#a1a1aa'; // chrome-grey construction lines

/** Le style d'un trait de construction — copié dans sept manifestes avant
 *  d'atterrir ici. Un repère ne porte jamais de donnée : il est fin, gris et
 *  pointillé, partout, pour ne pas se disputer l'attention avec la courbe. */
export const GUIDE = Object.freeze({ color: GUIDE_COLOR, width: 1, dashed: true });

/** Un repère horizontal à une valeur FIXE : `at(-180, '−180°')`. Les trois
 *  quarts des hlines du catalogue sont de cette forme. */
export const at = (value, label) => hline(() => value, { ...GUIDE, label });

/** Le même, mais qui n'existe que pour certains paramètres : la valeur est
 *  NaN ailleurs, et un repère non fini n'est pas tracé. */
export const atIf = (fn, label) => hline(fn, { ...GUIDE, label });

/* ------------------------------------------------------- frequency abscissa
   The three abscissae the catalogue actually uses. Passing one of these,
   instead of retyping the axis object, is what keeps `ω` reading `ω` and `f`
   reading `f` in every experiment that draws a response. */
export const OMEGA = { label: 'ω', unit: 'rad/s', scale: 'log' };
export const HERTZ = { label: 'f', unit: 'Hz', scale: 'log' };
/** Linear hertz: a sampled spectrum is read up to f_s/2, not over decades. */
export const HERTZ_LIN = { label: 'f', unit: 'Hz' };

/**
 * Les options d'un builder sont une liste FERMÉE. Sans ça, une clé morte —
 * un `title:` laissé après un renommage, un `id:` qui ne veut plus rien dire —
 * est silencieusement ignorée, et le manifeste continue d'affirmer quelque
 * chose que le code ne fait plus. C'est arrivé dans neuf manifestes d'un
 * coup, dont un qui portait encore `title: 'Plan des pôles'` alors que ce nom
 * était précisément ce qu'on venait de supprimer du catalogue.
 */
function checkOpts(opts, allowed, where) {
  for (const k of Object.keys(opts ?? {}))
    if (!allowed.includes(k))
      throw new ViewError(`${where}: unknown option '${k}' (known: ${allowed.join(', ')})`);
}

/** dB or decades — the two ways a magnitude is drawn, as one option. */
function magnitudeAxis(y, yLabel, domain) {
  if (typeof y === 'object' && y !== null) return y; // full override
  const axis = { label: yLabel };
  if (y === 'log') axis.scale = 'log';
  else axis.unit = 'dB';
  if (domain) axis.domain = domain;
  return axis;
}

/**
 * |H| against frequency: Bode gain in automatique, réponse fréquentielle in
 * traitement du signal, spectre when the source is a signal — one figure.
 *   x       OMEGA | HERTZ | HERTZ_LIN, or any axis object
 *   y       'dB' (default) | 'log' (decades) | a full axis object
 *   domain  [min, max] on the ordinate, when the figure needs a fixed frame
 */
const GAIN_OPTS = ['key', 'variant', 'x', 'y', 'yLabel', 'domain', 'label', 'color', 'width', 'overlays'];

export function gainView(source, opts = {}) {
  checkOpts(opts, GAIN_OPTS, 'gainView');
  const {
    // the figure — its id and its per-subject title come from core/figures.js;
    // `variant` picks another name from that figure's closed list
    key = 'gain',
    variant,
    x = OMEGA,
    y = 'dB',
    yLabel = '|H|',
    domain,
    label = '|H(jω)|',
    color = GAIN_COLOR,
    width = 2.4,
    overlays = [],
  } = opts;
  return figure(
    key,
    line(source, {
      color,
      width,
      label,
      overlays,
      axes: { x, y: magnitudeAxis(y, yLabel, domain) },
    }),
    { variant }
  );
}

/**
 * arg H against the same abscissa — the other half of a Bode plot, and the
 * half an experiment may legitimately not have.
 */
const PHASE_OPTS = ['key', 'variant', 'x', 'domain', 'label', 'color', 'width', 'overlays'];

export function phaseView(source, opts = {}) {
  checkOpts(opts, PHASE_OPTS, 'phaseView');
  const {
    key = 'phase',
    variant,
    x = OMEGA,
    domain,
    label = 'arg H(jω)',
    color = PHASE_COLOR,
    width = 2.4,
    overlays = [],
  } = opts;
  return figure(
    key,
    line(source, {
      color,
      width,
      label,
      overlays,
      axes: { x, y: { label: 'arg H', unit: '°', ...(domain ? { domain } : {}) } },
    }),
    { variant }
  );
}

/**
 * The pole–zero map, equal aspect: poles as emphasised markers, zeros as a
 * cloud, on the s-plane or the z-plane. `zeros: null` for a system that has
 * none — an absent cloud beats an empty legend entry.
 */
const POLES_OPTS = ['poles', 'zeros', 'poleLabel', 'zeroLabel', 'variable', 'axes', 'circle', 'segments', 'minHalf', 'maxHalf'];

export function polesView(opts = {}) {
  checkOpts(opts, POLES_OPTS, 'polesView');
  const {
    poles = 'poles',
    zeros = 'zeros',
    poleLabel = 'pôles',
    zeroLabel = 'zéros',
    variable = 's',
    axes,
    circle,
    segments,
    minHalf,
    maxHalf,
  } = opts;
  return figurePlane('poles', {
    markers: { source: poles, color: POLE_COLOR, label: poleLabel },
    ...(zeros
      ? { clouds: [{ source: zeros, color: ZERO_COLOR, r: 4.5, opacity: 1, label: zeroLabel }] }
      : {}),
    ...(circle ? { circle: { color: GUIDE_COLOR, ...circle } } : {}),
    ...(segments ? { segments } : {}),
    axes: axes ?? { x: `Re(${variable})`, y: `Im(${variable})` },
    ...(minHalf != null ? { minHalf } : {}),
    ...(maxHalf != null ? { maxHalf } : {}),
  });
}

/**
 * A periodic signal through the filter: output solid, input dashed.
 * The observable names are the bench's own (`tIn` / `tOut`).
 */
export function timeView(opts = {}) {
  checkOpts(opts, ['key', 'overlays'], 'timeView');
  const { key = 'response', overlays = [] } = opts;
  return figure(
    key,
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
export function impulseView(opts = {}) {
  checkOpts(opts, ['source', 'label', 'y', 'x', 'overlays'], 'impulseView');
  const { source = 'impulse', label, y = 'h[n]', x = 'n', overlays = [] } = opts;
  return figure('impulse', stem(source, { label, overlays, axes: { x, y } }));
}

/**
 * Input and output spectra with |H(f)| over them, in dB. This IS `gainView`
 * on a linear hertz axis — the identity this module exists to make visible:
 * a sampled spectrum and a Bode gain differ by their abscissa, nothing else.
 * `overlays` carries whatever marker the experiment wants on top (its own
 * cut-off, its tooth spacing…), appended after the shared three.
 */
export function spectrumView(opts = {}) {
  checkOpts(opts, ['key', 'resp', 'domain', 'overlays'], 'spectrumView');
  const { key = 'gain', resp = 'resp', domain = [-80, 30], overlays = [] } = opts;
  return gainView('specOut', {
    key,
    x: HERTZ_LIN,
    yLabel: 'amplitude',
    domain,
    label: 'sortie',
    color: undefined, // the default data colour, as for every output curve
    width: 1.8,
    overlays: [
      line('specIn', { color: SPEC_IN_COLOR, opacity: 0.45, label: 'entrée' }),
      line(resp, { color: RESP_COLOR, dashed: true, label: '|H(f)|' }),
      ...overlays,
    ],
  });
}
