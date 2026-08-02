<!--
  Generic equal-aspect I/Q plane (promoted from comm/constellations after a
  second experiment needed it, per the custom-pattern-repeated-twice rule).
  Renders, in order: boundary segments, point clouds, marker points, and
  optional per-marker text labels — all in one shared equal-aspect window
  (circles stay circles). Receives ready-made data via props; pixel scaling
  only, no scientific computation.
-->
<script>
  import { scaleLinear } from '../../core/scales.js';
  import { FRAME, FONT_MONO, strokeScale, typeScale } from './frame.js';
  import Axes from './Axes.svelte';
  import Legend from './Legend.svelte';

  let {
    clouds = [], // [{x, y, color, r, opacity, max}] drawn in order
    markers = null, // {x, y} ideal points
    markerColor = '#EDB120',
    labels = null, // string[] per marker, drawn under each point
    segments = [], // [{x1, y1, x2, y2}] dashed boundary lines
    minHalf = 1.4,
    maxHalf = 3,
    xLabel = 'I',
    yLabel = 'Q',
    legend = [],
    pres = false,
  } = $props();

  const { W, H, M, iw, ih } = FRAME;
  const k = $derived(strokeScale(pres));
  const kt = $derived(typeScale(pres));

  // equal-aspect window: square data extent stretched to the frame's aspect
  const window_ = $derived.by(() => {
    let h = minHalf;
    for (const c of clouds) {
      for (let i = 0; i < c.x.length; i++) {
        h = Math.max(h, Math.abs(c.x[i]), Math.abs(c.y[i]));
      }
    }
    h = Math.min(h * 1.05, maxHalf);
    const scale = Math.min(iw, ih) / (2 * h); // px per data unit, both axes
    return { halfX: iw / scale / 2, halfY: ih / scale / 2 };
  });

  const xs = $derived(scaleLinear().domain([-window_.halfX, window_.halfX]).range([0, iw]));
  const ys = $derived(scaleLinear().domain([-window_.halfY, window_.halfY]).range([ih, 0]));
</script>

<svg class="plot-svg" viewBox="0 0 {W} {H}" role="img">
  <defs>
    <clipPath id="iq-clip">
      <rect x="0" y="0" width={iw} height={ih} />
    </clipPath>
  </defs>
  <g transform="translate({M.left},{M.top})">
    <Axes {xs} {ys} xAxis={{ label: xLabel }} yAxis={{ label: yLabel }} w={iw} h={ih} {k} {kt} />

    <g clip-path="url(#iq-clip)">
      {#each segments as s, i (i)}
        <line
          x1={xs(s.x1)}
          y1={ys(s.y1)}
          x2={xs(s.x2)}
          y2={ys(s.y2)}
          stroke="var(--muted-fg)"
          stroke-width={1.1 * k}
          stroke-dasharray="{5 * k} {4 * k}"
          opacity="0.55"
        />
      {/each}

      {#each clouds as c, ci (ci)}
        {#each { length: Math.min(c.x.length, c.max ?? 3000) } as _, i (i)}
          <circle cx={xs(c.x[i])} cy={ys(c.y[i])} r={(c.r ?? 1.7) * k} fill={c.color} opacity={c.opacity ?? 0.3} />
        {/each}
      {/each}

      {#if markers}
        {#each { length: markers.x.length } as _, i (i)}
          <circle
            cx={xs(markers.x[i])}
            cy={ys(markers.y[i])}
            r={4.2 * k}
            fill={markerColor}
            stroke="var(--background)"
            stroke-width={1.6 * k}
          />
          {#if labels}
            <text
              x={xs(markers.x[i])}
              y={ys(markers.y[i]) + 16 * kt}
              text-anchor="middle"
              font-family={FONT_MONO}
              font-size={10.5 * kt}
              font-weight="600"
              fill="var(--foreground)"
            >
              {labels[i]}
            </text>
          {/if}
        {/each}
      {/if}
    </g>

    <Legend entries={legend} {iw} {kt} />
  </g>
</svg>
