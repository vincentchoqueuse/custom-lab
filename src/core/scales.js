// Thin wrapper re-exporting the project's configured d3 primitives.
// All ui/plots/ primitives AND custom views import from THIS module, never
// from d3 directly — one import point, one place to configure defaults, and
// pixel scaling remains the only "computation" allowed in a view.
// d3-selection (and any DOM-manipulating module) is excluded: Svelte owns the
// DOM (freeze-frame and SVG export depend on it).

export { scaleLinear, scaleLog } from 'd3-scale';
export { ticks, bin, extent, max, min, range } from 'd3-array';
export { line as linePath, area as areaPath } from 'd3-shape';
export { format } from 'd3-format';

import { format as d3format } from 'd3-format';

/** SI-prefix preset (1200 → 1.2k, 0.000001 → 1µ). */
export const formatSI = d3format('~s');

/**
 * Human-readable value formatting for pills, statline and inspector.
 * @param {*} v
 * @param {number} [precision] — fixed decimals when provided
 */
export function formatValue(v, precision) {
  if (v == null || Number.isNaN(v)) return '—';
  if (typeof v !== 'number') return String(v);
  if (!Number.isFinite(v)) return v > 0 ? '∞' : '−∞';
  if (precision != null) return v.toFixed(precision);
  return String(parseFloat(v.toPrecision(4)));
}
