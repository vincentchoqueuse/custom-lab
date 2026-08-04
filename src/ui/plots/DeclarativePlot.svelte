<script>
  // Interprets a declarative {type, source, overlays, axes} spec: resolves
  // observables, computes layout (d3 bins/scales via core/scales.js — pixel
  // scaling and binning only, never scientific computation) and composes the
  // generic SVG primitives.
  import { untrack } from 'svelte';
  import { scaleLinear, scaleLog, bin } from '../../core/scales.js';
  import { dataColor } from '../../core/palette.svelte.js';
  import { app } from '../../core/store.svelte.js';
  import { FRAME, strokeScale, typeScale } from './frame.js';
  import Axes from './Axes.svelte';
  import Legend from './Legend.svelte';
  import Histogram from './Histogram.svelte';
  import Line from './Line.svelte';
  import Scatter from './Scatter.svelte';
  import Bars from './Bars.svelte';
  import Stem from './Stem.svelte';
  import VLine from './VLine.svelte';
  import HLine from './HLine.svelte';
  import Density from './Density.svelte';
  import Band from './Band.svelte';

  let { spec, obs, params, pres = false, lock = false } = $props();

  const { W, H, M, iw, ih } = FRAME;
  const k = $derived(strokeScale(pres));
  const kt = $derived(typeScale(pres));

  function axisSpec(a) {
    return typeof a === 'string' ? { label: a, scale: 'linear' } : { scale: 'linear', ...(a ?? {}) };
  }

  // the primitives' fallback colors, resolved here so the palette remap
  // covers unspecified colors too
  const KIND_DEFAULTS = {
    density: '#D95319',
    vline: '#EDB120',
    hline: '#EDB120',
  };

  /** Spec with its (possibly defaulted) color remapped to the data palette. */
  const paint = (s, kind) => ({
    ...s,
    color: dataColor(s.color ?? KIND_DEFAULTS[kind] ?? '#0072BD'),
  });

  // `domain` accepts a FUNCTION of the params, the same grammar vline/hline
  // already take with `p => …`. It is resolved here, once: everything
  // downstream — auto-scaling, axis lock, Axes — only ever sees an array. An
  // experiment whose framing must stay fixed BUT depends on a configuration
  // (a third spectral line off to the side, present or not) then has to
  // choose neither a jumping frame nor a line out of shot.
  const resolveDomain = (a, p) =>
    typeof a.domain === 'function' ? { ...a, domain: a.domain(p) } : a;

  const xAxis = $derived(resolveDomain(axisSpec(spec.axes?.x), params));
  const yAxis = $derived(resolveDomain(axisSpec(spec.axes?.y), params));

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
        case 'stem':
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

  /** A `null` bound follows the data; the other, if it is a number, holds. */
  const fixedEnds = (domain) => (Array.isArray(domain) ? domain : [null, null]);
  const merge = (auto, domain) => {
    const [lo, hi] = fixedEnds(domain);
    return [lo ?? auto[0], hi ?? auto[1]];
  };

  const xDomainAuto = $derived.by(() => {
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
  });

  const yDomainAuto = $derived.by(() => {
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
    // BOTH ends must exist: a layer that contributed only one usable edge
    // would otherwise build a scale with an infinite bound, and every
    // pixel computed from it would be NaN.
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
  });

  // Axis lock: the frame is pinned to the domains it had when the lock was
  // switched on, so moving a parameter afterwards moves the CURVE and not the
  // frame — without it the auto-scaling hides the very effect being shown.
  let held = $state(null);
  $effect(() => {
    if (!lock) {
      held = null;
      return;
    }
    if (!held) held = { x: untrack(() => xDomainAuto), y: untrack(() => yDomainAuto) };
  });

  const xDomain = $derived(held?.x ?? xDomainAuto);
  const yDomain = $derived(held?.y ?? yDomainAuto);

  function mkScale(axis, domain, range) {
    const isLog = axis.scale === 'log';
    const s = isLog ? scaleLog() : scaleLinear();
    s.domain(domain).range(range);
    // `nice()` rounds a domain outward to whole tick steps — a good idea on a
    // linear axis (round numbers, at most one step of slack), a bad one on a
    // log axis, where the step is a DECADE: a curve spanning 0.4…40 would be
    // framed 0.1…100 and left floating in the middle of an empty plot. Log
    // axes therefore keep the domain the data asked for (already padded
    // multiplicatively upstream), and d3 still labels the decades inside it.
    if (!Array.isArray(axis.domain) && !isLog) s.nice();
    return s;
  }

  const xs = $derived(mkScale(xAxis, xDomain, [0, iw]));
  const ys = $derived(mkScale(yAxis, yDomain, [ih, 0]));

  // EVERY labelled layer gets a chip, reference lines included. They used to
  // write their name at the top of the stroke: readable for an isolated
  // threshold, unreadable as soon as three estimators land in the same place
  // — the names overlap each other and overlap the legend. One place to read
  // a layer's name, and the strokes become switchable by click like the
  // curves.
  //
  // Deduplicated by label: one and the same quantity may be drawn by two
  // layers — the spectral lines as stems AND its noise floor as a line, same
  // name, same color (spectral/subspace). That is ONE legend entry, and the
  // chip switches off both, since `hidden` keys on the label.
  //
  // A layer that resolved to NO point is a layer the current params do not
  // have — it is not advertised, same rule as a non-finite vline.
  const DEFAULT_COLORS = { density: '#D95319' };
  // Layers switched off from the legend are not rendered at all — not merely
  // made transparent. That is what makes the SVG export and the freeze ghost
  // carry EXACTLY what the room sees, since both clone the DOM. Only
  // labelled layers are concerned: a layer without a label has no chip, so
  // there is nothing to click.
  const shown = $derived(layers.filter((l) => !l.s.label || !app.hidden.includes(l.s.label)));

  const legend = $derived.by(() => {
    const out = [];
    const seen = new Set();
    for (const l of layers) {
      if (!l.s.label || l.kind === 'none') continue;
      if (l.pts && l.pts.length === 0) continue;
      // une ligne de repère hors domaine n'est pas tracée : ne pas l'annoncer
      if ((l.kind === 'vline' || l.kind === 'hline') && !Number.isFinite(l.v)) continue;
      if (seen.has(l.s.label)) continue;
      seen.add(l.s.label);
      out.push({
        label: l.s.label,
        color: l.s.color ?? DEFAULT_COLORS[l.kind] ?? (l.kind === 'vline' || l.kind === 'hline' ? '#EDB120' : '#0072BD'),
        dashed: !!l.s.dashed,
      });
    }
    return out;
  });
</script>

<svg class="plot-svg" viewBox="0 0 {W} {H}" role="img">
  <defs>
    <!-- data layers are clipped to the inner frame: with an explicit axis
         domain (e.g. BER floors at 1e-5) curves would otherwise overflow
         past the axes — custom views already clip, this brings the
         declarative path in line -->
    <clipPath id="dp-clip">
      <rect x="0" y="0" width={iw} height={ih} />
    </clipPath>
  </defs>
  <g transform="translate({M.left},{M.top})">
    <Axes {xs} {ys} {xAxis} {yAxis} w={iw} h={ih} {k} {kt} />
    <g clip-path="url(#dp-clip)">
    {#each shown as l, i (i)}
      {#if l.kind === 'histogram'}
        <Histogram {xs} {ys} rects={l.rects} spec={paint(l.s, l.kind)} />
      {:else if l.kind === 'line'}
        <Line {xs} {ys} pts={l.pts} spec={paint(l.s, l.kind)} {k} />
      {:else if l.kind === 'density'}
        <Density {xs} {ys} pts={l.pts} spec={paint(l.s, l.kind)} {k} h={ih} />
      {:else if l.kind === 'scatter'}
        <Scatter {xs} {ys} pts={l.pts} spec={paint(l.s, l.kind)} {k} />
      {:else if l.kind === 'bars'}
        <Bars {xs} {ys} pts={l.pts} spec={paint(l.s, l.kind)} h={ih} />
      {:else if l.kind === 'stem'}
        <Stem {xs} {ys} pts={l.pts} spec={paint(l.s, l.kind)} h={ih} {k} />
      {:else if l.kind === 'band'}
        <Band {xs} {ys} pts={l.pts} spec={paint(l.s, l.kind)} />
      {:else if l.kind === 'vline' && Number.isFinite(l.v)}
        <VLine {xs} x={l.v} spec={paint(l.s, l.kind)} h={ih} {k} {kt} />
      {:else if l.kind === 'hline' && Number.isFinite(l.v)}
        <HLine {ys} y={l.v} spec={paint(l.s, l.kind)} w={iw} {k} {kt} />
      {/if}
    {/each}
    </g>
    <Legend entries={legend} {iw} {kt} side={spec.legend ?? 'right'} />
  </g>
</svg>
