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

/**
 * `decodeURIComponent` THROWS on a truncated escape ('%E0%A4%A'), and a link cut
 * short by a chat client or a slide is exactly the case the contract above
 * promises to survive. The raw text is the honest fallback: a param that then
 * fails its cast falls back to its default, which is the intended behaviour
 * rather than a white screen.
 */
function decodeSafe(s) {
  try {
    return decodeURIComponent(s);
  } catch {
    return s;
  }
}

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
      const k = decodeSafe(eq < 0 ? pair : pair.slice(0, eq));
      query[k] = eq < 0 ? '' : decodeSafe(pair.slice(eq + 1));
    }
  }
  return { path, query };
}

/**
 * A number, or undefined — STRICTLY.
 *
 * `parseFloat` and `parseInt` stop at the first character they cannot read, so
 * '12abc' came back as 12 and '0x10' as 0. Both are IN BOUNDS, so nothing
 * downstream objected: the URL said one thing and the plot showed another,
 * silently. A σ of 0 read from '0x10' is a flat curve with no explanation.
 *
 * Only decimal syntax is a number here — sign, digits, fraction, exponent.
 * Everything else falls back to the default, which is what the contract at the
 * top of this file promises. Exponent notation stays in: `?snr=1e-3` is a value
 * a lecturer types.
 */
const DECIMAL = /^[+-]?(?:\d+(?:\.\d*)?|\.\d+)(?:[eE][+-]?\d+)?$/;

function toNumber(str) {
  const s = String(str).trim();
  return DECIMAL.test(s) ? Number(s) : undefined;
}

/**
 * Strict cast of one raw URL string according to the param spec.
 * @returns {*} the typed value, or undefined when invalid (→ default).
 */
export function castParam(spec, str) {
  switch (spec.type) {
    case 'int':
    case 'seed': {
      const v = toNumber(str);
      // '30.7' is a number and not an int: the URL asks for something the
      // param cannot hold, so the default wins rather than a silent trunca-
      // tion to 30.
      if (v === undefined || !Number.isInteger(v)) return undefined;
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
    case 'coeffs': {
      const parts = String(str).split(',').map(toNumber);
      if (parts.length > (spec.maxLen ?? 8)) return undefined;
      if (parts.some((v) => v === undefined)) return undefined;
      return parts;
    }
    case 'readonly':
      return undefined;
    default: {
      // float, log
      const v = toNumber(str);
      if (v === undefined) return undefined;
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
  if (Array.isArray(v)) return v.map(formatParam).join(',');
  return typeof v === 'number' ? String(parseFloat(v.toPrecision(8))) : String(v);
}

/** Value equality for minimal serialization (coeffs arrays compare by content). */
function sameValue(a, b) {
  if (Array.isArray(a) && Array.isArray(b)) {
    return a.length === b.length && a.every((v, i) => v === b[i]);
  }
  return a === b;
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
    if (v === undefined || sameValue(v, o.base[k])) continue;
    parts.push(`${k}=${formatParam(v)}`);
  }
  if (o.view && o.view !== o.defaultView) parts.push(`view=${o.view}`);
  if ((o.drawer ?? false) !== (o.defaultDrawer ?? false))
    parts.push(`drawer=${o.drawer ? 1 : 0}`);
  return `#/${expKey}${parts.length ? '?' + parts.join('&') : ''}`;
}
