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
  import Axes from '../../../../ui/plots/Axes.svelte';

  let { observables: obs, params, pres = false } = $props();

  const W = 760;
  const H = 430;
  const M = { top: 20, right: 28, bottom: 48, left: 62 };
  const iw = W - M.left - M.right;
  const ih = H - M.top - M.bottom;
  const k = $derived(pres ? 1.6 : 1);
  const kt = $derived(pres ? 1.3 : 1);

  const BLUE = '#0072BD'; // empirical
  const ORANGE = '#D95319'; // theoretical

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
    { label: 'empirique', color: BLUE },
    { label: 'théorique', color: ORANGE },
  ]);
</script>

<svg class="plot-svg" viewBox="0 0 {W} {H}" role="img">
  <g transform="translate({M.left},{M.top})">
    <Axes
      {xs}
      {ys}
      xAxis={{ label: 'x' }}
      yAxis={{ label: discrete ? 'probabilité' : 'densité' }}
      w={iw}
      h={ih}
      {k}
      {kt}
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

    {#each legend as e, i (e.label)}
      <g transform="translate({iw - 8},{12 + i * 18 * kt})">
        <rect x="-14" y="-4" width="14" height="5" rx="2" fill={e.color} />
        <text
          x="-20"
          y="2"
          text-anchor="end"
          font-size={11.5 * kt}
          fill="#52525b"
          font-family="IBM Plex Sans, system-ui, sans-serif">{e.label}</text
        >
      </g>
    {/each}
  </g>
</svg>
