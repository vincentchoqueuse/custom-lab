// Single source of truth for state↔URL. The URL is the API: one link = one
// reproducible lecture scene. Format:
//   #/{subject}/{experiment}?param1=…&view=…&drawer=1&preset=scene-2
// Rules:
//   - minimal serialization: only values differing from the active scene's
//     base (manifest defaults + scene params) appear;
//   - strict casting on decode per manifest type — an out-of-bounds or
//     unparsable value silently falls back to the default (a hand-edited URL
//     must never produce an invalid state or a crash);
//   - readable format: no escaping needed by construction, commas for lists.

/** @returns {{path: string, query: Object<string, string>}} */
export function parseHash(hash) {
  const h = (hash || '').replace(/^#\/?/, '');
  const qi = h.indexOf('?');
  const path = (qi < 0 ? h : h.slice(0, qi)).replace(/\/+$/, '');
  const query = {};
  if (qi >= 0) {
    for (const pair of h.slice(qi + 1).split('&')) {
      if (!pair) continue;
      const eq = pair.indexOf('=');
      const k = decodeURIComponent(eq < 0 ? pair : pair.slice(0, eq));
      query[k] = eq < 0 ? '' : decodeURIComponent(pair.slice(eq + 1));
    }
  }
  return { path, query };
}

/**
 * Strict cast of one raw URL string according to the param spec.
 * @returns {*} the typed value, or undefined when invalid (→ default).
 */
export function castParam(spec, str) {
  switch (spec.type) {
    case 'int':
    case 'seed': {
      const v = parseInt(str, 10);
      if (!Number.isFinite(v)) return undefined;
      if (spec.min != null && v < spec.min) return undefined;
      if (spec.max != null && v > spec.max) return undefined;
      return v;
    }
    case 'bool':
      return str === 'true' ? true : str === 'false' ? false : undefined;
    case 'select': {
      const opt = spec.options.find((o) => String(o.value) === str);
      return opt ? opt.value : undefined;
    }
    case 'readonly':
      return undefined;
    default: {
      // float, log
      const v = parseFloat(str);
      if (!Number.isFinite(v)) return undefined;
      if (spec.min != null && v < spec.min) return undefined;
      if (spec.max != null && v > spec.max) return undefined;
      return v;
    }
  }
}

/**
 * Decode a parsed query against a manifest. Only valid values are returned;
 * anything else is absent (silent fallback to defaults).
 */
export function decodeQuery(query, manifest) {
  const out = { params: {} };
  if (query.preset && manifest.presets.some((p) => p.id === query.preset))
    out.preset = query.preset;
  if (query.view && manifest.views.some((v) => v.id === query.view)) out.view = query.view;
  if (query.drawer === '1' || query.drawer === '0') out.drawer = query.drawer === '1';
  for (const [k, spec] of Object.entries(manifest.params)) {
    if (!(k in query)) continue;
    const v = castParam(spec, query[k]);
    if (v !== undefined) out.params[k] = v;
  }
  return out;
}

/** Trim float noise (0.30000000000000004 → 0.3) while staying exact enough. */
function formatParam(v) {
  return typeof v === 'number' ? String(parseFloat(v.toPrecision(8))) : String(v);
}

/**
 * Encode the current state as a hash, minimally.
 * @param {string} expKey
 * @param {object} o — {params, base, paramSpecs, view, defaultView,
 *                      preset, defaultPreset, drawer, defaultDrawer}
 */
export function encodeHash(expKey, o) {
  const parts = [];
  if (o.preset && o.preset !== o.defaultPreset) parts.push(`preset=${o.preset}`);
  for (const [k, spec] of Object.entries(o.paramSpecs)) {
    if (spec.type === 'readonly') continue;
    const v = o.params[k];
    if (v === undefined || v === o.base[k]) continue;
    parts.push(`${k}=${formatParam(v)}`);
  }
  if (o.view && o.view !== o.defaultView) parts.push(`view=${o.view}`);
  if ((o.drawer ?? false) !== (o.defaultDrawer ?? false))
    parts.push(`drawer=${o.drawer ? 1 : 0}`);
  return `#/${expKey}${parts.length ? '?' + parts.join('&') : ''}`;
}
