// Resolving a declarative spec into drawable LAYERS, and the extent each one
// occupies. Pure functions, no Svelte, no DOM — pixel scaling is the only
// "computation" a view is allowed and this is where it starts.
//
// It lives outside the component because a STACK needs it twice over: two
// panels drawn one above the other share a single abscissa, and the only way
// to know that abscissa is to resolve BOTH panels' layers before either is
// rendered. The alternative — letting each panel scale its own x — lines the
// two frames up only by accident, and the day a stack holds a signal and its
// envelope on different supports the two time axes disagree silently. A
// shared abscissa is the whole point of stacking.

import { bin } from '../../core/scales.js';

/** An axis is a label, or an object; either way it resolves to an object. */
export const axisSpec = (a) =>
  typeof a === 'string' ? { label: a, scale: 'linear' } : { scale: 'linear', ...(a ?? {}) };

/** `domain` accepts p => [lo, hi]; downstream only ever sees an array. */
export const resolveDomain = (a, p) =>
  typeof a.domain === 'function' ? { ...a, domain: a.domain(p) } : a;

function seriesPoints(o) {
  if (!o) return [];
  const v = o.value;
  const pts = [];
  if (o.type === 'series') {
    for (let i = 0; i < v.x.length; i++) pts.push({ x: v.x[i], y: v.y[i] });
  } else if (o.type === 'vector') {
    for (let i = 0; i < v.length; i++) pts.push({ x: i, y: v[i] });
  }
  return pts;
}

/** vline/hline reference: p => fn, a param name, or a scalar observable. */
function refValue(src, obs, params) {
  if (typeof src === 'function') return src(params);
  if (params && src in params) return params[src];
  const o = obs?.[src];
  return typeof o?.value === 'number' ? o.value : undefined;
}

/** The spec and its overlays, resolved against the observables. */
export function resolveLayers(spec, obs, params) {
  const specs = [spec, ...(spec.overlays ?? [])];
  return specs.map((s) => {
    switch (s.type) {
      case 'histogram': {
        const raw = obs?.[s.source]?.value;
        const values = raw ? Array.from(raw) : [];
        const n = values.length || 1;
        const thresholds = Math.max(8, Math.round(Math.sqrt(n) * 1.4));
        const bins = bin().thresholds(thresholds)(values);
        // density normalization (layout, not statistics): overlays such as a
        // theoretical pdf share the same y scale
        const rects = bins
          .filter((b) => b.x1 > b.x0)
          .map((b) => ({ x0: b.x0, x1: b.x1, d: b.length / (n * (b.x1 - b.x0)) }));
        return { s, kind: 'histogram', rects };
      }
      case 'line':
      case 'density':
      case 'scatter':
      case 'bars':
      case 'stem':
        return { s, kind: s.type, pts: seriesPoints(obs?.[s.source]) };
      case 'band': {
        const v = obs?.[s.source]?.value ?? {};
        const pts = [];
        if (v.x && v.lo && v.hi)
          for (let i = 0; i < v.x.length; i++) pts.push({ x: v.x[i], lo: v.lo[i], hi: v.hi[i] });
        return { s, kind: 'band', pts };
      }
      case 'vline':
        return { s, kind: 'vline', v: refValue(s.source, obs, params) };
      case 'hline':
        return { s, kind: 'hline', v: refValue(s.source, obs, params) };
      default:
        return { s, kind: 'none' };
    }
  });
}

/** A `null` bound follows the data; the other, if it is a number, holds. */
const fixedEnds = (domain) => (Array.isArray(domain) ? domain : [null, null]);
const merge = (auto, domain) => {
  const [lo, hi] = fixedEnds(domain);
  return [lo ?? auto[0], hi ?? auto[1]];
};

/** The abscissa the layers occupy, honouring a pinned bound on either end. */
export function xDomainOf(layers, xAxis) {
  const [fLo, fHi] = fixedEnds(xAxis.domain);
  if (fLo != null && fHi != null) return xAxis.domain;
  // a log scale cannot include 0: non-positive values are excluded from the
  // domain (they are unplottable on that axis anyway)
  const isLog = xAxis.scale === 'log';
  const usable = (v) => Number.isFinite(v) && (!isLog || v > 0);
  let lo = Infinity;
  let hi = -Infinity;
  for (const l of layers) {
    if (l.kind === 'histogram') {
      for (const r of l.rects) {
        if (usable(r.x0)) lo = Math.min(lo, r.x0);
        if (usable(r.x1)) hi = Math.max(hi, r.x1);
      }
    } else if (l.pts) {
      for (const p of l.pts) {
        if (usable(p.x)) {
          lo = Math.min(lo, p.x);
          hi = Math.max(hi, p.x);
        }
      }
    } else if (l.kind === 'vline' && usable(l.v)) {
      lo = Math.min(lo, l.v);
      hi = Math.max(hi, l.v);
    }
  }
  // BOTH ends must exist: a layer that contributed only one usable edge
  // would otherwise build a scale with an infinite bound, and every
  // pixel computed from it would be NaN.
  if (!Number.isFinite(lo) || !Number.isFinite(hi))
    return merge(isLog ? [0.1, 10] : [0, 1], xAxis.domain);
  if (lo === hi) {
    if (isLog) return merge([lo / 2, hi * 2], xAxis.domain);
    lo -= 1;
    hi += 1;
  }
  return merge([lo, hi], xAxis.domain);
}

/** The ordinate the layers occupy, padded, honouring a pinned bound. */
export function yDomainOf(layers, yAxis) {
  const [fLo, fHi] = fixedEnds(yAxis.domain);
  if (fLo != null && fHi != null) return yAxis.domain;
  // a log scale cannot include 0: non-positive values are excluded, and
  // padding is multiplicative (additive padding would push lo below zero)
  const isLog = yAxis.scale === 'log';
  const usable = (v) => Number.isFinite(v) && (!isLog || v > 0);
  let lo = Infinity;
  let hi = -Infinity;
  for (const l of layers) {
    if (l.kind === 'histogram') {
      if (!isLog) lo = Math.min(lo, 0);
      for (const r of l.rects) if (usable(r.d)) hi = Math.max(hi, r.d);
    } else if (l.kind === 'band') {
      for (const p of l.pts) {
        if (usable(p.lo)) lo = Math.min(lo, p.lo);
        if (usable(p.hi)) hi = Math.max(hi, p.hi);
      }
    } else if (l.pts) {
      // bars and stems are drawn from a baseline: the frame must show it
      if ((l.kind === 'bars' || l.kind === 'stem') && !isLog) lo = Math.min(lo, 0);
      for (const p of l.pts) {
        if (usable(p.y)) {
          lo = Math.min(lo, p.y);
          hi = Math.max(hi, p.y);
        }
      }
    } else if (l.kind === 'hline' && usable(l.v)) {
      lo = Math.min(lo, l.v);
      hi = Math.max(hi, l.v);
    }
  }
  if (!Number.isFinite(lo) || !Number.isFinite(hi))
    return merge(isLog ? [0.1, 10] : [0, 1], yAxis.domain);
  if (lo === hi) {
    if (isLog) return merge([lo / 2, hi * 2], yAxis.domain);
    lo -= 1;
    hi += 1;
  }
  if (isLog) return merge([lo / 1.15, hi * 1.15], yAxis.domain);
  const pad = (hi - lo) * 0.06;
  return merge([lo === 0 ? 0 : lo - pad, hi + pad], yAxis.domain);
}

/**
 * The legend entries a set of layers advertises.
 *
 * Deduplicated by label: one and the same quantity may be drawn by two
 * layers — the spectral lines as stems AND its noise floor as a line, same
 * name, same color (spectral/subspace). That is ONE legend entry, and the
 * chip switches off both, since `hidden` keys on the label.
 *
 * A layer that resolved to NO point is a layer the current params do not
 * have — it is not advertised, same rule as a non-finite vline.
 */
const DEFAULT_COLORS = { density: '#D95319' };
export function legendOf(layers) {
  const out = [];
  const seen = new Set();
  for (const l of layers) {
    if (!l.s.label || l.kind === 'none') continue;
    if (l.pts && l.pts.length === 0) continue;
    // a reference line outside the domain is not drawn: do not advertise it
    if ((l.kind === 'vline' || l.kind === 'hline') && !Number.isFinite(l.v)) continue;
    if (seen.has(l.s.label)) continue;
    seen.add(l.s.label);
    out.push({
      label: l.s.label,
      color:
        l.s.color ??
        DEFAULT_COLORS[l.kind] ??
        (l.kind === 'vline' || l.kind === 'hline' ? '#EDB120' : '#0072BD'),
      dashed: !!l.s.dashed,
    });
  }
  return out;
}
