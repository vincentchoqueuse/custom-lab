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
  import Crosshair from './Crosshair.svelte';

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
    // CROSSHAIR. The abscissa the pointer is on, in DATA units, owned by the
    // parent: a stack's panels must draw one rule at one instant, and a panel
    // that tracked its own would let the two drift apart by a pixel and make
    // the reading a lie. `onhover` reports; `cursorX` is what gets drawn.
    cursorX = null,
    onhover = null,
    // the raw pointer abscissa, printed under the rule
    dataX = null,
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

  /* ---------- crosshair ---------------------------------------------------- */

  // NEAREST SAMPLE per drawn series. Linear: the abscissa is not always sorted
  // (a scatter is not) and a series may carry NaN separators (the eye diagram
  // is one long broken path), so a bisection would be wrong on exactly the
  // views where it would be fastest. 40 000 points — the worst in the
  // catalogue — cost about a third of a millisecond per pointer move.
  const hits = $derived.by(() => {
    if (cursorX == null) return [];
    const out = [];
    for (const l of shown) {
      if (!l.pts || l.pts.length === 0) continue;
      let best = null;
      let bd = Infinity;
      for (const p of l.pts) {
        if (!Number.isFinite(p.x) || !Number.isFinite(p.y)) continue;
        const d = Math.abs(p.x - cursorX);
        if (d < bd) {
          bd = d;
          best = p;
        }
      }
      if (!best) continue;
      const px = xs(best.x);
      const py = ys(best.y);
      // a sample scaled outside the frame is clipped away for the curves, and
      // reading it here would put a dot on the axis with no curve under it
      if (!Number.isFinite(px) || !Number.isFinite(py) || py < 0 || py > ih) continue;
      out.push({ px, py, x: best.x, y: best.y, color: l.s.color ?? '#0072BD' });
    }
    return out;
  });

  // the rule stands on the sample it reads (see Crosshair), so everything the
  // crosshair draws shares one abscissa
  const snapX = $derived(hits.length ? hits[0].x : cursorX);
  const cursorPx = $derived(snapX == null ? null : xs(snapX));
  const cursorIn = $derived(
    cursorPx != null && Number.isFinite(cursorPx) && cursorPx >= 0 && cursorPx <= iw
  );

  /**
   * Pointer → data abscissa. `xs.invert` is pixel arithmetic, which is the one
   * computation a view is allowed.
   *
   * MOUSE AND PEN ONLY. Tracking a finger would need `touch-action: none` on
   * the plot, and the plot is most of a phone screen: the page would stop
   * scrolling under the reader's thumb. A phone reads the figure; a lecture
   * hall reads the values.
   */
  function track(e) {
    if (!onhover || e.pointerType === 'touch') return;
    const r = e.currentTarget.getBoundingClientRect();
    if (r.width === 0) return;
    onhover(xs.invert(((e.clientX - r.left) / r.width) * iw));
  }
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
  {#if cursorIn && hits.length}
    <Crosshair {hits} x={cursorPx} dataX={snapX} {ih} {iw} {kt} showAbscissa={showXTicks} />
  {/if}
  {#if onhover}
    <!-- the capture surface, over everything and drawing nothing: an SVG
         element only receives pointer events where it is painted, so a
         transparent fill is what makes the whole frame trackable -->
    <rect
      data-transient="capture"
      class="crosshair-capture"
      x="0"
      y="0"
      width={iw}
      height={ih}
      fill="transparent"
      onpointermove={track}
      onpointerleave={() => onhover(null)}
    />
  {/if}
  <!-- LAST, and that is not cosmetic: the capture surface above covers the
       whole inner frame, and the legend chips live inside it. Drawn before it
       they became unclickable — a chip that looks like a button and hides
       nothing is worse than no button, which is what the legend suite exists
       to say. Above the surface they keep their clicks, and the surface keeps
       the pointer everywhere else. -->
  {#if showLegend}
    <Legend entries={legend} {iw} {kt} side={spec.legend ?? 'right'} />
  {/if}
</g>

<style>
  .crosshair-capture {
    cursor: crosshair;
  }
</style>
