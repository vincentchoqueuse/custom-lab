<!--
  CUSTOM view — justification: the M stacked horizontal CI segments with
  per-interval hit/miss coloring fit no generic plot type (histogram/line/
  scatter/bars). If this pattern repeats in another experiment it gets
  promoted to a generic type in ui/plots/ per project rule.
  No scientific computation here: intervals come ready-made from observables;
  only pixel scaling (core/scales.js) happens below.
-->
<script>
  import { scaleLinear } from '../../../../core/scales.js';
  import { FRAME, strokeScale, typeScale, FONT_MONO } from '../../../../ui/plots/frame.js';
  import { dataColor } from '../../../../core/palette.svelte.js';
  import Axes from '../../../../ui/plots/Axes.svelte';

  let { observables, params, pres = false } = $props();

  const { W, H, M, iw, ih } = FRAME;
  const k = $derived(strokeScale(pres));
  const kt = $derived(typeScale(pres));

  const intervals = $derived(observables?.intervals?.value ?? []);
  const mu = $derived(params.mu);

  const xs = $derived.by(() => {
    let lo = mu;
    let hi = mu;
    for (const it of intervals) {
      lo = Math.min(lo, it.lo);
      hi = Math.max(hi, it.hi);
    }
    if (lo === hi) {
      lo -= 1;
      hi += 1;
    }
    return scaleLinear().domain([lo, hi]).range([0, iw]).nice();
  });

  const ys = $derived(
    scaleLinear()
      .domain([-0.5, Math.max(intervals.length - 0.5, 0.5)])
      .range([ih, 0])
  );
</script>

<svg class="plot-svg" viewBox="0 0 {W} {H}" role="img">
  <g transform="translate({M.left},{M.top})">
    <Axes
      {xs}
      {ys}
      xAxis={{ label: 'x' }}
      yAxis={{ label: 'sample m' }}
      w={iw}
      h={ih}
      {k}
      {kt}
    />
    {#each intervals as it, m (m)}
      <line
        x1={xs(it.lo)}
        x2={xs(it.hi)}
        y1={ys(m)}
        y2={ys(m)}
        stroke={dataColor(it.ok ? '#0072BD' : '#D95319')}
        stroke-width={Math.max(1.4, Math.min(5, (ih / Math.max(intervals.length, 1)) * 0.45)) * k}
        stroke-linecap="round"
        opacity="0.9"
      />
    {/each}
    <line
      x1={xs(mu)}
      x2={xs(mu)}
      y1="0"
      y2={ih}
      stroke={dataColor("#EDB120")}
      stroke-width={1.8 * k}
      stroke-dasharray="{5 * k} {4 * k}"
    />
    <text
      x={xs(mu) + 6}
      y={14 * kt}
      font-size={12 * kt}
      fill={dataColor("#EDB120")}
      font-family={FONT_MONO}>μ</text
    >
  </g>
</svg>
