// View & plot/overlay factories, mirroring the field factories. The same plot
// factory works as main plot or as overlay, by position. Style keys are FLAT
// (color, dashed, width, opacity, label — no nested style object). Factories
// validate at load time and throw named errors; observable `source` names,
// unknowable at load time, are cross-checked against the first compute result
// in dev mode (crossCheckSources).

export class ViewError extends Error {
  constructor(message) {
    super(message);
    this.name = 'ViewError';
  }
}

const PLOT_TYPES = [
  'histogram',
  'line',
  'scatter',
  'bars',
  'stem',
  'vline',
  'hline',
  'density',
  'band',
];

/** vline/hline accept an observable/param name or a p => fn; others a name. */
const REF_TYPES = ['vline', 'hline'];

function validateAxis(axis, where) {
  if (axis == null || typeof axis === 'string') return;
  if (typeof axis !== 'object')
    throw new ViewError(`${where}: axis must be a string label or an object`);
  if (axis.scale != null && axis.scale !== 'linear' && axis.scale !== 'log')
    throw new ViewError(`${where}: axis scale must be 'linear' or 'log' (got '${axis.scale}')`);
  // An axis may legitimately measure nothing — the rug of a sample sits on a
  // line whose height has no meaning. Graduating it would suggest otherwise:
  // `ticks: false` removes the marks and keeps only the name, which then says
  // what the axis CARRIES rather than what it measures.
  if (axis.ticks != null && axis.ticks !== false)
    throw new ViewError(`${where}: axis ticks accepts only false (hide them)`);
  if (axis.domain != null) {
    // `p => [lo, hi]`: a fixed framing that depends on a configuration (an
    // extra source, further off, present or not). Its bounds are not knowable
    // at load time, like the source of a function vline — the shape is, and
    // that is what gets checked.
    if (typeof axis.domain === 'function') {
      if (axis.domain.length !== 1)
        throw new ViewError(`${where}: a function axis domain takes the params, as p => [min, max]`);
      return;
    }
    if (!Array.isArray(axis.domain) || axis.domain.length !== 2)
      throw new ViewError(`${where}: axis domain must be [min, max]`);
    // ONE bound only may be pinned, the other staying automatic: `null` says
    // "this one follows the data". The case that asked for it: a uniform
    // distribution on [0, θ], whose abscissa MUST start at 0, or the estimators
    // are not seen aiming at the edge of a support that starts there — but 2x̄
    // can exceed θ (up to 2θ at N = 2), and a pinned upper bound would simply
    // have cut it out of the frame.
    const [lo, hi] = axis.domain;
    const num = (v) => typeof v === 'number' && Number.isFinite(v);
    if (!(num(lo) || lo === null) || !(num(hi) || hi === null))
      throw new ViewError(`${where}: axis domain bounds must be numbers, or null for automatic`);
    if (lo === null && hi === null)
      throw new ViewError(`${where}: an axis domain of [null, null] is just the default — omit it`);
    if (num(lo) && num(hi) && !(lo < hi))
      throw new ViewError(`${where}: axis domain must be two numbers with min < max`);
    if (axis.scale === 'log' && num(lo) && lo <= 0)
      throw new ViewError(`${where}: log axis domain must be strictly positive`);
  }
}

function makePlot(type, source, opts = {}) {
  const where = `${type}(${typeof source === 'function' ? 'fn' : `'${source}'`})`;
  if (typeof source === 'function') {
    if (!REF_TYPES.includes(type))
      throw new ViewError(`${where}: only vline/hline accept a function source`);
  } else if (typeof source !== 'string' || source.length === 0) {
    throw new ViewError(`${where}: source must be an observable name`);
  }
  if (opts.width != null && !(opts.width > 0))
    throw new ViewError(`${where}: width must be > 0`);
  if (opts.opacity != null && (opts.opacity < 0 || opts.opacity > 1))
    throw new ViewError(`${where}: opacity must be in [0, 1]`);
  // `offset` nudges a stem train sideways by a few PIXELS so that two signals
  // sampled at the same instants can be read apart. Bounded, because past a
  // few pixels it stops being a nudge and starts misplacing the sample.
  if (opts.offset != null) {
    if (type !== 'stem') throw new ViewError(`${where}: offset applies to stem only`);
    if (!(Math.abs(opts.offset) <= 6))
      throw new ViewError(`${where}: offset is a nudge of at most 6 px, got ${opts.offset}`);
  }
  if (opts.overlays != null) {
    if (!Array.isArray(opts.overlays))
      throw new ViewError(`${where}: overlays must be an array`);
    for (const o of opts.overlays) {
      if (o === null || typeof o !== 'object' || !PLOT_TYPES.includes(o.type))
        throw new ViewError(`${where}: overlays must be built with the plot factories`);
    }
  }
  if (opts.axes != null) {
    validateAxis(opts.axes.x, `${where} axes.x`);
    validateAxis(opts.axes.y, `${where} axes.y`);
  }
  // The legend sits at the top RIGHT by default, and that is the right corner
  // almost everywhere. Almost: when the layers crowd the right — three
  // estimators landing near the bound they estimate — it covers them.
  // `legend: 'left'` puts it opposite. A closed list, like the rest of the
  // vocabulary.
  if (opts.legend != null && opts.legend !== 'left' && opts.legend !== 'right')
    throw new ViewError(`${where}: legend accepts 'left' or 'right' (got '${opts.legend}')`);
  return { type, source, ...opts };
}

export const histogram = (source, opts) => makePlot('histogram', source, opts);
export const line = (source, opts) => makePlot('line', source, opts);
export const scatter = (source, opts) => makePlot('scatter', source, opts);
export const bars = (source, opts) => makePlot('bars', source, opts);
/** Stalk + marker from a baseline (MATLAB `stem`): THE discrete-signal plot —
 *  sampled signals, filter coefficients, impulse responses, line spectra. */
export const stem = (source, opts) => makePlot('stem', source, opts);
export const vline = (source, opts) => makePlot('vline', source, opts);
export const hline = (source, opts) => makePlot('hline', source, opts);
export const density = (source, opts) => makePlot('density', source, opts);
export const band = (source, opts) => makePlot('band', source, opts);

/** Declarative view: {type, source, overlays, axes} interpreted by ViewHost. */
export function view(id, title, spec) {
  if (typeof id !== 'string' || !id) throw new ViewError(`view: id is required`);
  if (typeof title !== 'string' || !title) throw new ViewError(`view '${id}': title is required`);
  if (spec === null || typeof spec !== 'object' || !PLOT_TYPES.includes(spec.type))
    throw new ViewError(`view '${id}': spec must be built with a plot factory`);
  return { id, title, kind: 'plot', spec, layout: 'plot' };
}

/**
 * A STANDARD figure (core/figures.js): the manifest NAMES the figure and the
 * registry stamps its id and its title — the subject's title, since the same
 * plot is honestly "Bode — gain" in control and "Frequency response" in
 * filtrage. `variant` picks another name from the figure's CLOSED list when an
 * experiment needs one its subject does not default to. No free text, ever:
 * a title you never type is a title you can never mistype.
 */
export function figure(key, spec, { variant } = {}) {
  if (typeof key !== 'string' || !key) throw new ViewError('figure: key is required');
  if (spec === null || typeof spec !== 'object' || !PLOT_TYPES.includes(spec.type))
    throw new ViewError(`figure '${key}': spec must be built with a plot factory`);
  return { figure: key, ...(variant ? { variant } : {}), kind: 'plot', spec, layout: 'plot' };
}

/**
 * PANELS STACKED OVER ONE ABSCISSA. A complex signal in time is the case that
 * asked for it: Re x[n] above, Im x[n] below, one time axis under the pair.
 * There is no honest way to put the two parts of a complex number on the same
 * ordinate — they are not two curves, they are two components of one — and a
 * modulus-and-phase pair would answer a different question.
 *
 *   stack('time', 'Signal in time', [
 *     stem('txI', { label: 'transmitted', axes: { y: 'Re' } }),
 *     stem('txQ', { axes: { y: 'Im' } }),
 *   ], { axes: { x: 'symbol n' } })
 *
 * The abscissa is declared ONCE, on the stack, and so are the overlays that
 * mark it: a frame boundary or a prefix band names a place in TIME, not a
 * place in one of the two parts. Panel overlays stay on their panel.
 */
export function stack(id, title, panels, opts = {}) {
  if (typeof id !== 'string' || !id) throw new ViewError('stack: id is required');
  if (typeof title !== 'string' || !title) throw new ViewError(`stack '${id}': title is required`);
  return { id, title, kind: 'stack', spec: stackSpec(panels, opts, `stack '${id}'`), layout: 'plot' };
}

/** The same, for a stack that IS one of the catalogue's standard figures. */
export function figureStack(key, panels, opts = {}, { variant } = {}) {
  if (typeof key !== 'string' || !key) throw new ViewError('figureStack: key is required');
  return {
    figure: key,
    ...(variant ? { variant } : {}),
    kind: 'stack',
    spec: stackSpec(panels, opts, `figureStack '${key}'`),
    layout: 'plot',
  };
}

function stackSpec(panels, opts, where) {
  if (!Array.isArray(panels) || panels.length < 2)
    throw new ViewError(`${where}: needs at least two panels — one panel is a plain view`);
  if (panels.length > 4)
    throw new ViewError(
      `${where}: ${panels.length} panels is past what a lecture hall can read — four is the ceiling`
    );
  for (const p of panels) {
    if (p === null || typeof p !== 'object' || !PLOT_TYPES.includes(p.type))
      throw new ViewError(`${where}: each panel must be built with a plot factory`);
    // The abscissa is SHARED and therefore declared once. A panel that set its
    // own would be silently overruled, which is exactly the class of quiet
    // divergence the closed vocabulary exists to make impossible.
    if (p.axes?.x != null)
      throw new ViewError(
        `${where}: a panel may not declare axes.x — the abscissa is shared, declare it on the stack`
      );
    validateAxis(p.axes?.y, `${where} panel axes.y`);
  }
  for (const o of opts.overlays ?? []) {
    if (o === null || typeof o !== 'object' || !PLOT_TYPES.includes(o.type))
      throw new ViewError(`${where}: overlays must be built with the plot factories`);
  }
  validateAxis(opts.axes?.x, `${where} axes.x`);
  if (opts.axes?.y != null)
    throw new ViewError(`${where}: each panel carries its own axes.y — the stack declares only x`);
  return { panels, axes: { x: opts.axes?.x }, overlays: opts.overlays ?? [] };
}

/** The same, for the equal-aspect plane (the pole map). */
export function figurePlane(key, spec = {}, { variant } = {}) {
  if (typeof key !== 'string' || !key) throw new ViewError('figurePlane: key is required');
  validatePlaneSpec(spec, `figurePlane '${key}'`);
  return { figure: key, ...(variant ? { variant } : {}), kind: 'plane', spec, layout: 'plot' };
}


/** The spec half of a plane, checked on its own so `plane` and `figurePlane`
 *  share one validation instead of one of them faking a view to borrow the
 *  other's. */
function validatePlaneSpec(spec, where) {
  for (const c of spec.clouds ?? []) {
    if (c === null || typeof c !== 'object' || typeof c.source !== 'string')
      throw new ViewError(`${where}: each cloud needs a { source } observable name`);
  }
  for (const c of spec.curves ?? []) {
    if (c === null || typeof c !== 'object' || typeof c.source !== 'string')
      throw new ViewError(`${where}: each curve needs a { source } observable name`);
  }
  if (spec.markers != null && typeof spec.markers.source !== 'string')
    throw new ViewError(`${where}: markers needs a { source } observable name`);
  if (spec.segments != null && typeof spec.segments !== 'string' && !Array.isArray(spec.segments))
    throw new ViewError(`${where}: segments must be an observable name or a literal array`);
  if (spec.circle != null && spec.circle.radius == null)
    throw new ViewError(`${where}: circle needs a radius (number or p => number)`);
  if (spec.axisLines != null && typeof spec.axisLines !== 'boolean')
    throw new ViewError(`${where}: axisLines must be a boolean`);
  for (const k of ['minHalf', 'maxHalf']) {
    const v = spec[k];
    if (v != null && typeof v !== 'number' && typeof v !== 'function')
      throw new ViewError(`${where}: ${k} must be a number or p => number`);
  }
}

/**
 * Declarative EQUAL-ASPECT plane (I/Q, poles, z-plane): the one view shape
 * that a cartesian plot cannot express, since circles must stay circles.
 * Everything is resolved against the observables by ui/plots/PlanePlot:
 *   curves:   [{source, color, width, dashed, label}]   polylines
 *   clouds:   [{source, color, r, opacity, max, label}]  point sets
 *   markers:  {source, color, labels, label}             emphasized points
 *   segments: an observable name or a literal [{x1,y1,x2,y2}]
 *   circle:   {radius: number | p => n, color, label}    guide circle
 *   minHalf/maxHalf: number or p => number               window bounds
 *   axisLines: true                                      draw the origin cross
 *   symmetric: false                                     frame the data,
 *     not the origin (a Nyquist locus lives under the real axis)
 *   axes:     {x, y} labels
 * The legend is built from the labels, as in the cartesian plots.
 */
export function plane(id, title, spec = {}) {
  if (typeof id !== 'string' || !id) throw new ViewError('plane: id is required');
  if (typeof title !== 'string' || !title) throw new ViewError(`plane '${id}': title is required`);
  validatePlaneSpec(spec, `plane '${id}'`);
  return { id, title, kind: 'plane', spec, layout: 'plot' };
}

/** Custom view — must be justified in a manifest comment (declarative first). */
export function custom(id, title, loader) {
  if (typeof id !== 'string' || !id) throw new ViewError(`custom: id is required`);
  if (typeof title !== 'string' || !title)
    throw new ViewError(`custom '${id}': title is required`);
  if (typeof loader !== 'function')
    throw new ViewError(`custom '${id}': loader must be () => import(…)`);
  // The resolved module is cached, a FAILED load is not: a chunk that missed
  // (flaky network on a lecture-hall wifi) must be retryable, otherwise the
  // view stays blank until the page is reloaded.
  let cached = null;
  return {
    id,
    title,
    kind: 'custom',
    load: () =>
      (cached ??= loader().catch((err) => {
        cached = null;
        throw err;
      })),
  };
}

/**
 * Dev-mode cross-check: a view referencing a missing observable warns
 * immediately instead of rendering an empty plot. Called once per experiment
 * on the first compute result.
 */
export function crossCheckSources(manifest, observables, params) {
  for (const v of manifest.views) {
    if (v.kind === 'plane') {
      const names = [
        ...(v.spec.clouds ?? []).map((c) => c.source),
        ...(v.spec.curves ?? []).map((c) => c.source),
        v.spec.markers?.source,
        v.spec.markers?.labels,
        typeof v.spec.segments === 'string' ? v.spec.segments : null,
      ].filter(Boolean);
      for (const src of names) {
        if (!(src in observables)) {
          console.warn(
            `[views] experiment '${manifest.id}', view '${v.id}': ` +
              `source '${src}' matches no observable`
          );
        }
      }
      continue;
    }
    if (v.kind !== 'plot' && v.kind !== 'stack') continue;
    const roots =
      v.kind === 'stack'
        ? v.spec.panels.flatMap((p) => [p, ...(p.overlays ?? [])]).concat(v.spec.overlays ?? [])
        : [v.spec, ...(v.spec.overlays ?? [])];
    for (const s of roots) {
      const src = s.source;
      if (typeof src !== 'string') continue;
      if (!(src in observables) && !(params && src in params)) {
        console.warn(
          `[views] experiment '${manifest.id}', view '${v.id}': ` +
            `source '${src}' matches no observable or param`
        );
      }
    }
  }
}
