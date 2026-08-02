// Field factories (Django-style). Factories return the plain param objects the
// registry consumes, validate at load time and throw named errors — a typo
// fails at first `npm run dev`, never silently in class.
//
// Three separate semantic keys, never concatenated in one string:
//   name        — displayed symbol ('f', 'φ', 'N'); first positional argument,
//                 defaults to the param key (filled in by the registry)
//   description — what it is ('fréquence', 'phase'); feeds the tooltip and the
//                 drawer's secondary text
//   unit        — 'Hz', 'rad', 'dB'
// Pills render `name = value unit`. Every param has a `default` (the URL
// contract and resetDefaults require it) — except `readonly`, which is
// display-only and never serialized.

export class FieldError extends Error {
  constructor(message) {
    super(message);
    this.name = 'FieldError';
  }
}

/** Allow both float('f', {…}) and float({…}) — name defaults to the param key. */
function splitArgs(name, opts) {
  if (name !== null && typeof name === 'object') return [undefined, name];
  return [name, opts ?? {}];
}

function label(type, f) {
  return `${type} '${f.name ?? '(unnamed)'}'`;
}

function checkNumeric(type, f) {
  if (f.min == null || f.max == null)
    throw new FieldError(`${label(type, f)}: min and max are required`);
  if (!(f.min < f.max))
    throw new FieldError(`${label(type, f)}: min (${f.min}) must be < max (${f.max})`);
  if (f.default == null)
    throw new FieldError(`${label(type, f)}: default is required`);
  if (f.default < f.min || f.default > f.max)
    throw new FieldError(
      `${label(type, f)}: default (${f.default}) out of bounds [${f.min}, ${f.max}]`
    );
  if (f.step != null && !(f.step > 0))
    throw new FieldError(`${label(type, f)}: step must be > 0`);
  if (f.step != null && f.step > f.max - f.min)
    throw new FieldError(`${label(type, f)}: step (${f.step}) larger than the [min, max] span`);
}

export function float(name, opts) {
  const [n, o] = splitArgs(name, opts);
  const f = { type: 'float', name: n, ...o };
  checkNumeric('float', f);
  return f;
}

export function int(name, opts) {
  const [n, o] = splitArgs(name, opts);
  const f = { type: 'int', step: 1, name: n, ...o };
  checkNumeric('int', f);
  if (!Number.isInteger(f.default))
    throw new FieldError(`${label('int', f)}: default must be an integer`);
  return f;
}

/**
 * Logarithmic slider — MANDATORY for any parameter spanning several orders of
 * magnitude (SNR in dB, probabilities 1e-6…1e-1).
 */
export function log(name, opts) {
  const [n, o] = splitArgs(name, opts);
  const f = { type: 'log', name: n, ...o };
  checkNumeric('log', f);
  if (!(f.min > 0))
    throw new FieldError(`${label('log', f)}: min must be > 0 on a log scale`);
  return f;
}

/**
 * Numeric list (e.g. transfer-function coefficients), edited as a
 * comma-separated string, serialized as `k=1,2,1` in the URL (readable by
 * construction). `default` is a non-empty array of finite numbers, at most
 * `maxLen` (default 8) entries.
 */
export function coeffs(name, opts) {
  const [n, o] = splitArgs(name, opts);
  const f = { type: 'coeffs', maxLen: 8, name: n, ...o };
  if (!Array.isArray(f.default) || f.default.length === 0)
    throw new FieldError(`${label('coeffs', f)}: default must be a non-empty array`);
  if (f.default.length > f.maxLen)
    throw new FieldError(`${label('coeffs', f)}: default longer than maxLen (${f.maxLen})`);
  if (!f.default.every((v) => Number.isFinite(v)))
    throw new FieldError(`${label('coeffs', f)}: default must contain finite numbers`);
  return f;
}

export function bool(name, opts) {
  const [n, o] = splitArgs(name, opts);
  const f = { type: 'bool', name: n, ...o };
  if (typeof f.default !== 'boolean')
    throw new FieldError(`${label('bool', f)}: default must be a boolean`);
  return f;
}

export function select(name, opts) {
  const [n, o] = splitArgs(name, opts);
  const f = { type: 'select', name: n, ...o };
  if (!Array.isArray(f.options) || f.options.length === 0)
    throw new FieldError(`${label('select', f)}: non-empty options array is required`);
  for (const opt of f.options) {
    if (opt === null || typeof opt !== 'object' || !('value' in opt) || !('label' in opt))
      throw new FieldError(`${label('select', f)}: each option needs {value, label}`);
  }
  if (!('default' in f)) throw new FieldError(`${label('select', f)}: default is required`);
  if (!f.options.some((opt) => opt.value === f.default))
    throw new FieldError(`${label('select', f)}: default not present in options`);
  return f;
}

/**
 * Display-only field (drawer). No default, never serialized in the URL, never
 * sent to compute. Optional `calc: p => …` for simple UI-side arithmetic
 * (e.g. degrees of freedom ν = N − 1) — never serious statistics.
 */
export function readonly(name, opts) {
  const [n, o] = splitArgs(name, opts);
  const f = { type: 'readonly', name: n, ...o };
  if (f.calc != null && typeof f.calc !== 'function')
    throw new FieldError(`${label('readonly', f)}: calc must be a function`);
  return f;
}

/**
 * The injected seed param (core default — applied by the registry to every
 * schema). Determinism is a contract requirement, not an experiment choice.
 */
export function seedField() {
  return {
    type: 'seed',
    name: 'seed',
    description: 'random seed',
    min: 0,
    max: 2147483647,
    step: 1,
    default: 42,
  };
}
