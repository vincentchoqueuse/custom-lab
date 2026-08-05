<script>
  // PANELS STACKED OVER ONE ABSCISSA — the second shape a single cartesian
  // plot cannot express, after the equal-aspect plane. A complex signal in
  // time is the case that asked for it: one abscissa, two ordinates, and no
  // honest way to draw them on top of each other. Re x[n] above, Im x[n]
  // below, one time axis at the foot of the pair.
  //
  // The abscissa is computed ONCE here, from every panel's layers, and forced
  // on all of them. Panels that each scaled their own x would line up by
  // accident and stop lining up the day their supports differ — and two time
  // axes that silently disagree is worse than no stack at all.
  import { scaleLinear } from '../../core/scales.js';
  import { frameFor, strokeScale, typeScale } from './frame.js';
  import { app } from '../../core/store.svelte.js';
  import { axisSpec, resolveDomain, resolveLayers, xDomainOf } from './layers.js';
  import PlotPanel from './PlotPanel.svelte';

  let { spec, obs, params, pres = false, lock = false } = $props();

  const F = $derived(frameFor(app.ui.narrow));
  const k = $derived(strokeScale(pres));
  const kt = $derived(typeScale(pres));

  // Between two panels: room for the lower one's top tick label and no more.
  // It follows the canvas, or two panels on a phone are mostly gap.
  const gap = $derived(app.ui.narrow ? 22 : 30);
  const iw = $derived(F.iw);

  // ONE rule across every panel, at one instant. This is the whole reason the
  // abscissa is owned up here: two panels each tracking their own pointer would
  // agree to within a pixel and disagree in the reading, on the one figure
  // built to be read straight down.
  let cursorX = $state(null);
  $effect(() => {
    spec;
    cursorX = null;
  });
  const panelH = $derived((F.ih - gap * (spec.panels.length - 1)) / spec.panels.length);

  // The stack's own axes.x and overlays belong to the ABSCISSA, so every panel
  // gets them: a frame boundary or a prefix band marks a place in time, not a
  // place in one of the two parts of a number.
  const panelSpecs = $derived(
    spec.panels.map((p) => ({
      ...p,
      axes: { x: spec.axes?.x, y: p.axes?.y },
      overlays: [...(p.overlays ?? []), ...(spec.overlays ?? [])],
    }))
  );

  const xAxis = $derived(resolveDomain(axisSpec(spec.axes?.x), params));

  const xDomain = $derived.by(() => {
    const all = panelSpecs.flatMap((p) => resolveLayers(p, obs, params));
    const d = xDomainOf(all, xAxis);
    // nice() once, at the stack level rather than per panel — the panels must
    // agree, and rounding is a property of the shared axis
    if (Array.isArray(xAxis.domain) || xAxis.scale === 'log') return d;
    return scaleLinear().domain(d).nice().domain();
  });
</script>

<svg class="plot-svg" viewBox="0 0 {F.W} {F.H}" role="img">
  {#each panelSpecs as p, i (i)}
    <PlotPanel
      spec={p}
      {obs}
      {params}
      {pres}
      {lock}
      {k}
      {kt}
      left={F.M.left}
      top={F.M.top + i * (panelH + gap)}
      m={F.M}
      {iw}
      ih={panelH}
      xDomainForced={xDomain}
      {cursorX}
      dataX={cursorX}
      onhover={(v) => (cursorX = v)}
      showXTicks={i === panelSpecs.length - 1}
      showLegend={i === 0}
      uid={`stack-${i}`}
    />
  {/each}
</svg>
