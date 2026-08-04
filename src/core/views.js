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
  // Un axe peut légitimement ne rien mesurer — le rug d'un échantillon est
  // posé sur une ligne dont la hauteur n'a pas de sens. Le graduer laisserait
  // croire le contraire : `ticks: false` supprime les repères et ne garde que
  // le nom, qui dit alors ce que l'axe PORTE et non ce qu'il mesure.
  if (axis.ticks != null && axis.ticks !== false)
    throw new ViewError(`${where}: axis ticks accepts only false (hide them)`);
  if (axis.domain != null) {
    // `p => [lo, hi]` : un cadrage fixe qui dépend d'une configuration
    // (une source supplémentaire, à l'écart, présente ou non). Ses bornes
    // ne sont pas connaissables au chargement, comme la source d'un vline
    // fonction — la forme, elle, l'est, et c'est ce qu'on vérifie.
    if (typeof axis.domain === 'function') {
      if (axis.domain.length !== 1)
        throw new ViewError(`${where}: a function axis domain takes the params, as p => [min, max]`);
      return;
    }
    if (!Array.isArray(axis.domain) || axis.domain.length !== 2)
      throw new ViewError(`${where}: axis domain must be [min, max]`);
    // UNE SEULE borne peut être figée, l'autre restant automatique : `null`
    // dit « celle-ci suit les données ». Le cas qui l'a demandé : une loi
    // uniforme sur [0, θ]: l'abscisse DOIT partir de 0, sinon on ne voit pas
    // que les estimateurs visent le bord d'un support qui commence là — mais
    // 2x̄ peut dépasser θ (jusqu'à 2θ à N = 2), et une borne haute figée
    // l'aurait purement et simplement coupé du cadre.
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
  // La légende se pose en haut à DROITE par défaut, et c'est le bon coin
  // presque partout. Presque : quand les couches se pressent à droite — trois
  // estimateurs qui tombent près de la borne qu'ils estiment — elle leur
  // passe dessus. `legend: 'left'` la met en face. Liste fermée, comme le
  // reste du vocabulaire.
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
 * plot is honestly "Bode — gain" in automatique and "Réponse fréquentielle" in
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
    if (v.kind !== 'plot') continue;
    for (const s of [v.spec, ...(v.spec.overlays ?? [])]) {
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
