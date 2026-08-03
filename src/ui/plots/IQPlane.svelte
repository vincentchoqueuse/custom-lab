<!--
  Generic equal-aspect plane (promoted from comm/constellations after a
  second experiment needed it, per the custom-pattern-repeated-twice rule).
  Renders, in order: boundary segments, CURVES, point clouds, marker points,
  and optional per-marker text labels — all in one shared equal-aspect window
  (circles stay circles, and a Nyquist half-circle looks like one).
  The window is centred on the origin by default, which is what a
  constellation and a pole map want; `symmetric = false` frames the data
  where it actually lies, which is what a Nyquist locus wants — it lives
  entirely under the real axis and would otherwise waste half the plot. Receives ready-made data via props; pixel scaling
  only, no scientific computation.
-->
<script>
  import { scaleLinear } from '../../core/scales.js';
  import { dataColor } from '../../core/palette.svelte.js';
  import { FRAME, FONT_MONO, strokeScale, typeScale } from './frame.js';
  import Axes from './Axes.svelte';
  import Legend from './Legend.svelte';

  let {
    clouds = [], // [{x, y, color, r, opacity, max}] drawn in order
    curves = [], // [{x, y, color, width, dashed}] polylines, drawn under the clouds
    symmetric = true, // false: frame the data instead of the origin
    markers = null, // {x, y} ideal points
    markerColor = '#EDB120',
    labels = null, // string[] per marker, drawn under each point
    segments = [], // [{x1, y1, x2, y2}] dashed boundary lines
    axisLines = false, // draw the x = 0 / y = 0 cross through the origin
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

  // equal-aspect window: a square data extent stretched to the frame's aspect,
  // so one data unit is the same number of pixels on both axes
  const window_ = $derived.by(() => {
    let x0 = Infinity;
    let x1 = -Infinity;
    let y0 = Infinity;
    let y1 = -Infinity;
    const eat = (X, Y) => {
      for (let i = 0; i < X.length; i++) {
        if (!Number.isFinite(X[i]) || !Number.isFinite(Y[i])) continue;
        x0 = Math.min(x0, X[i]);
        x1 = Math.max(x1, X[i]);
        y0 = Math.min(y0, Y[i]);
        y1 = Math.max(y1, Y[i]);
      }
    };
    for (const c of clouds) eat(c.x, c.y);
    for (const c of curves) eat(c.x, c.y);
    if (markers) eat(markers.x, markers.y);
    if (!Number.isFinite(x0)) return { halfX: minHalf, halfY: minHalf, cx: 0, cy: 0 };

    const cx = symmetric ? 0 : (x0 + x1) / 2;
    const cy = symmetric ? 0 : (y0 + y1) / 2;
    const reach = symmetric
      ? Math.max(Math.abs(x0), Math.abs(x1), Math.abs(y0), Math.abs(y1))
      : Math.max((x1 - x0) / 2, (y1 - y0) / 2);
    const h = Math.min(Math.max(reach, minHalf) * 1.06, maxHalf);
    if (!(h > 0)) return { halfX: minHalf, halfY: minHalf, cx: 0, cy: 0 }; // never a NaN frame
    const scale = Math.min(iw, ih) / (2 * h); // px per data unit, both axes
    return { halfX: iw / scale / 2, halfY: ih / scale / 2, cx, cy };
  });

  const path = (c) => {
    let d = '';
    let pen = false;
    for (let i = 0; i < c.x.length; i++) {
      if (!Number.isFinite(c.x[i]) || !Number.isFinite(c.y[i])) {
        pen = false;
        continue;
      }
      d += `${pen ? 'L' : 'M'}${xs(c.x[i]).toFixed(2)} ${ys(c.y[i]).toFixed(2)}`;
      pen = true;
    }
    return d;
  };

  const xs = $derived(
    scaleLinear()
      .domain([window_.cx - window_.halfX, window_.cx + window_.halfX])
      .range([0, iw])
  );
  const ys = $derived(
    scaleLinear()
      .domain([window_.cy - window_.halfY, window_.cy + window_.halfY])
      .range([ih, 0])
  );
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
      <!-- The cross through the origin. On a pole map it is not decoration:
           Re(s) = 0 is the line the whole subject is about, and "le pôle passe
           à droite" is a great deal easier to say when the right is drawn.
           Under everything else, and only when the plane asks for it. -->
      {#if axisLines}
        <line
          x1={xs(0)}
          y1="0"
          x2={xs(0)}
          y2={ih}
          stroke="var(--muted-fg)"
          stroke-width={1.1 * k}
          opacity="0.5"
        />
        <line
          x1="0"
          y1={ys(0)}
          x2={iw}
          y2={ys(0)}
          stroke="var(--muted-fg)"
          stroke-width={1.1 * k}
          opacity="0.5"
        />
      {/if}

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

      {#each curves as c, i (i)}
        <path
          d={path(c)}
          fill="none"
          stroke={dataColor(c.color ?? '#0072BD')}
          stroke-width={(c.width ?? 2) * k}
          stroke-dasharray={c.dashed ? `${6 * k} ${5 * k}` : null}
          stroke-linejoin="round"
        />
      {/each}

      {#each clouds as c, ci (ci)}
        {#each { length: Math.min(c.x.length, c.max ?? 3000) } as _, i (i)}
          {#if Number.isFinite(c.x[i]) && Number.isFinite(c.y[i])}
            <circle cx={xs(c.x[i])} cy={ys(c.y[i])} r={(c.r ?? 1.7) * k} fill={dataColor(c.color)} opacity={c.opacity ?? 0.3} />
          {/if}
        {/each}
      {/each}

      {#if markers}
        {#each { length: markers.x.length } as _, i (i)}
          {#if Number.isFinite(markers.x[i]) && Number.isFinite(markers.y[i])}
          <circle
            cx={xs(markers.x[i])}
            cy={ys(markers.y[i])}
            r={4.2 * k}
            fill={dataColor(markerColor)}
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
          {/if}
        {/each}
      {/if}
    </g>

    <Legend entries={legend} {iw} {kt} />
  </g>
</svg>
