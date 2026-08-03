// Observable typing: every displayable quantity produced by compute() is a
// named observable whose type is inferred by default; an optional {value, meta}
// wrapper resolves ambiguities and adds richness (label, unit, precision).

/**
 * @param {*} value
 * @returns {'scalar'|'text'|'vector'|'series'|'records'|'unknown'}
 */
export function inferType(value) {
  if (value == null) return 'unknown';
  if (typeof value === 'number') return 'scalar';
  // A named quantity is not always a number: a regime ("plein recouvrement"),
  // a verdict, the names of the two state components. They belong in the
  // statline like any other reading — and were silently dropped as 'unknown'
  // until an experiment noticed one of them never appeared.
  if (typeof value === 'string') return 'text';
  if (ArrayBuffer.isView(value)) return 'vector';
  if (Array.isArray(value)) {
    if (value.length && typeof value[0] === 'object' && value[0] !== null) return 'records';
    return 'vector';
  }
  if (typeof value === 'object') {
    if ('x' in value && 'y' in value) return 'series';
    return 'unknown';
  }
  return 'unknown';
}

/** Detect the optional {value, meta} wrapper (never confused with a series). */
function isWrapped(raw) {
  return (
    raw !== null &&
    typeof raw === 'object' &&
    !ArrayBuffer.isView(raw) &&
    !Array.isArray(raw) &&
    'value' in raw &&
    !('x' in raw)
  );
}

/**
 * @param {*} raw — as returned by compute()
 * @returns {{value: *, meta: object, type: string}}
 */
export function normalize(raw) {
  if (isWrapped(raw)) {
    return { value: raw.value, meta: raw.meta ?? {}, type: inferType(raw.value) };
  }
  return { value: raw, meta: {}, type: inferType(raw) };
}

/**
 * Normalize a whole compute() result — the shape all views, statline,
 * inspector and export code consumes.
 * @param {Object<string, *>} observables
 */
export function normalizeAll(observables) {
  const out = {};
  for (const [name, raw] of Object.entries(observables ?? {})) out[name] = normalize(raw);
  return out;
}
