<script>
  // ONE cartesian panel: axes, layers, legend, inside a <g> at a given place
  // on the canvas. It is what DeclarativePlot draws (a single panel filling
  // the frame) and what StackPlot draws several of (panels sharing one
  // abscissa). The resolution of the spec into layers and extents lives in
  // ./layers.js, so the stack can compute the shared abscissa before any
  // panel is rendered.
  import { untrack } from 'svelte';
  import { scaleLinear, scaleLog } from '../../core/scales.js';
  import { dataColor } from '../../core/palette.svelte.js';
  import { app } from '../../core/store.svelte.js';
  import { axisSpec, resolveDomain, resolveLayers, xDomainOf, yDomainOf, legendOf } from './layers.js';
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

  let {
    spec,
    obs,
    params,
    pres = false,
    lock = false,
    k = 1,
    kt = 1,
    // where and how big, so a stack can place several panels on one canvas
    left,
    top,
    iw,
    ih,
    // a stack forces its shared abscissa on every panel; alone, the panel
    // computes its own
    xDomainForced = null,
    // in a stack only the bottom panel graduates the abscissa, and only the
    // top one carries the legend — the same names repeated under every panel
    // would be noise
    showXTicks = true,
    showLegend = true,
    // unique per panel: two clip paths on one canvas may not share an id
    uid,
    // the frame's margin, so the axis names are placed from it
    m,
  } = $props();

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

  const xAxis = $derived(resolveDomain(axisSpec(spec.axes?.x), params));
  const yAxis = $derived(resolveDomain(axisSpec(spec.axes?.y), params));
  const xAxisDrawn = $derived(showXTicks ? xAxis : { ...xAxis, ticks: false, label: undefined });

  const layers = $derived(resolveLayers(spec, obs, params));

  const xDomainAuto = $derived(xDomainForced ?? xDomainOf(layers, xAxis));
  const yDomainAuto = $derived(yDomainOf(layers, yAxis));

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
    //
    // A FORCED domain is never nice()d either: the stack computed it once for
    // every panel, and a panel that rounded it on its own would step out of
    // line with the others — which is the one thing a shared abscissa exists
    // to prevent.
    if (!Array.isArray(axis.domain) && !isLog && !xDomainForced) s.nice();
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
  // Layers switched off from the legend are not rendered at all — not merely
  // made transparent. That is what makes the SVG export and the freeze ghost
  // carry EXACTLY what the room sees, since both clone the DOM. Only
  // labelled layers are concerned: a layer without a label has no chip, so
  // there is nothing to click.
  const shown = $derived(layers.filter((l) => !l.s.label || !app.hidden.includes(l.s.label)));
  const legend = $derived(legendOf(layers));
</script>

<defs>
  <!-- data layers are clipped to the inner frame: with an explicit axis
       domain (e.g. BER floors at 1e-5) curves would otherwise overflow
       past the axes — custom views already clip, this brings the
       declarative path in line -->
  <clipPath id="dp-clip-{uid}">
    <rect x="0" y="0" width={iw} height={ih} />
  </clipPath>
</defs>
<g transform="translate({left},{top})">
  <Axes {xs} {ys} xAxis={xAxisDrawn} {yAxis} w={iw} h={ih} {k} {kt} {m} />
  <g clip-path="url(#dp-clip-{uid})">
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
  {#if showLegend}
    <Legend entries={legend} {iw} {kt} side={spec.legend ?? 'right'} />
  {/if}
</g>
