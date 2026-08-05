<!--
  CUSTOM view — justification: the pdf panel switches representation with the
  selected law (continuous: contiguous histogram bars + smooth theoretical
  curve; discrete: paired empirical/theoretical bars on the integer support).
  No single generic plot type covers both renderings; if a second experiment
  needs this, it gets promoted to a generic type in ui/plots/.
  No scientific computation here: densities, frequencies and pmf come
  ready-made from observables; only pixel scaling (core/scales.js) below.
-->
<script>
  import { scaleLinear, linePath } from '../../../../core/scales.js';
  import { FRAME, strokeScale, typeScale } from '../../../../ui/plots/frame.js';
  import { dataColor } from '../../../../core/palette.svelte.js';
  import Axes from '../../../../ui/plots/Axes.svelte';
  import Legend from '../../../../ui/plots/Legend.svelte';

  let { observables: obs, params, pres = false, frame = FRAME } = $props();

  // The canvas arrives as a prop rather than as an import: it is 16:9 on a
  // projector and 4:3 on a phone (ui/plots/frame.js), and a custom view has no
  // business knowing the store to draw on the same frame as everything else.
  const W = $derived(frame.W);
  const H = $derived(frame.H);
  const M = $derived(frame.M);
  const iw = $derived(frame.iw);
  const ih = $derived(frame.ih);
  const k = $derived(strokeScale(pres));
  const kt = $derived(typeScale(pres));

  const BLUE = $derived(dataColor('#0072BD')); // sampled
  const ORANGE = $derived(dataColor('#D95319')); // theoretical

  const discrete = $derived(obs.discrete.value === 1);
  const th = $derived(obs.theoreticalPdf.value);
  const emp = $derived(obs.empiricalPdf.value);
  const bw = $derived(obs.binWidth.value);

  const xDomain = $derived(
    discrete ? [-0.6, th.x[th.x.length - 1] + 0.6] : [th.x[0], th.x[th.x.length - 1]]
  );
  const yMax = $derived.by(() => {
    let m = 0;
    for (const v of th.y) m = Math.max(m, v);
    for (const v of emp.y) m = Math.max(m, v);
    return m || 1;
  });

  const xs = $derived(scaleLinear().domain(xDomain).range([0, iw]));
  const ys = $derived(scaleLinear().domain([0, yMax * 1.12]).range([ih, 0]));

  const curve = $derived(
    discrete
      ? null
      : linePath()
          .x((p) => xs(p.x))
          .y((p) => ys(p.y))(Array.from(th.x, (x, i) => ({ x, y: th.y[i] })))
  );

  // paired-bar geometry for discrete laws
  const pxUnit = $derived(xs(1) - xs(0));
  const barW = $derived(Math.min(22, Math.max(4, 0.32 * pxUnit)));

  const legend = $derived([
    { label: 'sampled', color: BLUE },
    { label: 'theory', color: ORANGE },
  ]);
</script>

<svg class="plot-svg" viewBox="0 0 {W} {H}" role="img">
  <g transform="translate({M.left},{M.top})">
    <Axes
      {xs}
      {ys}
      xAxis={{ label: 'x' }}
      yAxis={{ label: discrete ? 'probability' : 'density' }}
      w={iw}
      h={ih}
      {k}
      {kt}
      m={M}
    />

    {#if discrete}
      {#each th.x as kx, i (kx)}
        <rect
          x={xs(kx) - barW - 1}
          y={ys(emp.y[i])}
          width={barW}
          height={Math.max(0, ys(0) - ys(emp.y[i]))}
          fill={BLUE}
          fill-opacity="0.85"
        />
        <rect
          x={xs(kx) + 1}
          y={ys(th.y[i])}
          width={barW}
          height={Math.max(0, ys(0) - ys(th.y[i]))}
          fill={ORANGE}
          fill-opacity="0.85"
        />
      {/each}
    {:else}
      {#each emp.x as cx, i (i)}
        {#if emp.y[i] > 0}
          <rect
            x={xs(cx - bw / 2) + 0.5}
            y={ys(emp.y[i])}
            width={Math.max(0, xs(cx + bw / 2) - xs(cx - bw / 2) - 1)}
            height={Math.max(0, ys(0) - ys(emp.y[i]))}
            fill={BLUE}
            fill-opacity="0.75"
          />
        {/if}
      {/each}
      {#if curve}
        <path
          d={curve}
          fill="none"
          stroke={ORANGE}
          stroke-width={2.5 * k}
          stroke-linejoin="round"
        />
      {/if}
    {/if}

    <Legend entries={legend} {iw} {kt} />
  </g>
</svg>
