<script>
  // Interprets a declarative {type, source, overlays, axes} spec: resolves
  // observables, computes layout (d3 bins/scales via core/scales.js — pixel
  // scaling and binning only, never scientific computation) and composes the
  // generic SVG primitives.
  import { scaleLinear, scaleLog, bin } from '../../core/scales.js';
  import Axes from './Axes.svelte';
  import Histogram from './Histogram.svelte';
  import Line from './Line.svelte';
  import Scatter from './Scatter.svelte';
  import Bars from './Bars.svelte';
  import VLine from './VLine.svelte';
  import HLine from './HLine.svelte';
  import Density from './Density.svelte';
  import Band from './Band.svelte';

  let { spec, obs, params, pres = false } = $props();

  const W = 760;
  const H = 430;
  const M = { top: 20, right: 28, bottom: 48, left: 62 };
  const iw = W - M.left - M.right;
  const ih = H - M.top - M.bottom;

  // presentation mode: strokes ×1.6, type ×1.3
  const k = $derived(pres ? 1.6 : 1);
  const kt = $derived(pres ? 1.3 : 1);

  function axisSpec(a) {
    return typeof a === 'string' ? { label: a, scale: 'linear' } : { scale: 'linear', ...(a ?? {}) };
  }

  const xAxis = $derived(axisSpec(spec.axes?.x));
  const yAxis = $derived(axisSpec(spec.axes?.y));

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
  function refValue(src) {
    if (typeof src === 'function') return src(params);
    if (params && src in params) return params[src];
    const o = obs?.[src];
    return typeof o?.value === 'number' ? o.value : undefined;
  }

  const layers = $derived.by(() => {
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
          return { s, kind: s.type, pts: seriesPoints(obs?.[s.source]) };
        case 'band': {
          const v = obs?.[s.source]?.value ?? {};
          const pts = [];
          if (v.x && v.lo && v.hi)
            for (let i = 0; i < v.x.length; i++)
              pts.push({ x: v.x[i], lo: v.lo[i], hi: v.hi[i] });
          return { s, kind: 'band', pts };
        }
        case 'vline':
          return { s, kind: 'vline', v: refValue(s.source) };
        case 'hline':
          return { s, kind: 'hline', v: refValue(s.source) };
        default:
          return { s, kind: 'none' };
      }
    });
  });

  const xDomain = $derived.by(() => {
    if (Array.isArray(xAxis.domain)) return xAxis.domain;
    let lo = Infinity;
    let hi = -Infinity;
    for (const l of layers) {
      if (l.kind === 'histogram') {
        for (const r of l.rects) {
          lo = Math.min(lo, r.x0);
          hi = Math.max(hi, r.x1);
        }
      } else if (l.pts) {
        for (const p of l.pts) {
          if (Number.isFinite(p.x)) {
            lo = Math.min(lo, p.x);
            hi = Math.max(hi, p.x);
          }
        }
      } else if (l.kind === 'vline' && Number.isFinite(l.v)) {
        lo = Math.min(lo, l.v);
        hi = Math.max(hi, l.v);
      }
    }
    if (!Number.isFinite(lo)) return [0, 1];
    if (lo === hi) {
      lo -= 1;
      hi += 1;
    }
    return [lo, hi];
  });

  const yDomain = $derived.by(() => {
    if (Array.isArray(yAxis.domain)) return yAxis.domain;
    let lo = Infinity;
    let hi = -Infinity;
    for (const l of layers) {
      if (l.kind === 'histogram') {
        lo = Math.min(lo, 0);
        for (const r of l.rects) hi = Math.max(hi, r.d);
      } else if (l.kind === 'band') {
        for (const p of l.pts) {
          lo = Math.min(lo, p.lo);
          hi = Math.max(hi, p.hi);
        }
      } else if (l.pts) {
        if (l.kind === 'bars') lo = Math.min(lo, 0);
        for (const p of l.pts) {
          if (Number.isFinite(p.y)) {
            lo = Math.min(lo, p.y);
            hi = Math.max(hi, p.y);
          }
        }
      } else if (l.kind === 'hline' && Number.isFinite(l.v)) {
        lo = Math.min(lo, l.v);
        hi = Math.max(hi, l.v);
      }
    }
    if (!Number.isFinite(lo)) return [0, 1];
    if (lo === hi) {
      lo -= 1;
      hi += 1;
    }
    const pad = (hi - lo) * 0.06;
    return [lo === 0 && yAxis.scale !== 'log' ? 0 : lo - pad, hi + pad];
  });

  function mkScale(axis, domain, range) {
    const s = axis.scale === 'log' ? scaleLog() : scaleLinear();
    s.domain(domain).range(range);
    if (!Array.isArray(axis.domain)) s.nice();
    return s;
  }

  const xs = $derived(mkScale(xAxis, xDomain, [0, iw]));
  const ys = $derived(mkScale(yAxis, yDomain, [ih, 0]));
</script>

<svg class="plot-svg" viewBox="0 0 {W} {H}" role="img">
  <g transform="translate({M.left},{M.top})">
    <Axes {xs} {ys} {xAxis} {yAxis} w={iw} h={ih} {k} {kt} />
    {#each layers as l, i (i)}
      {#if l.kind === 'histogram'}
        <Histogram {xs} {ys} rects={l.rects} spec={l.s} />
      {:else if l.kind === 'line'}
        <Line {xs} {ys} pts={l.pts} spec={l.s} {k} />
      {:else if l.kind === 'density'}
        <Density {xs} {ys} pts={l.pts} spec={l.s} {k} h={ih} />
      {:else if l.kind === 'scatter'}
        <Scatter {xs} {ys} pts={l.pts} spec={l.s} {k} />
      {:else if l.kind === 'bars'}
        <Bars {xs} {ys} pts={l.pts} spec={l.s} h={ih} />
      {:else if l.kind === 'band'}
        <Band {xs} {ys} pts={l.pts} spec={l.s} />
      {:else if l.kind === 'vline' && Number.isFinite(l.v)}
        <VLine {xs} x={l.v} spec={l.s} h={ih} {k} {kt} />
      {:else if l.kind === 'hline' && Number.isFinite(l.v)}
        <HLine {ys} y={l.v} spec={l.s} w={iw} {k} {kt} />
      {/if}
    {/each}
  </g>
</svg>
