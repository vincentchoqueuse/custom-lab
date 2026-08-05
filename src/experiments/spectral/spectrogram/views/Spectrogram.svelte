<!--
  CUSTOM view — justification: a time-frequency MATRIX fits no generic SVG
  plot type, and rows×cols rects would melt the DOM. The map is rasterized
  on an offscreen canvas and embedded as an SVG <image> data URI, so the
  SVG stays a pure function of state: freeze-frame ghost, SVG/PNG export
  and presentation scaling all keep working untouched.
  No scientific computation here: the dB matrix comes ready-made from the
  observables; only pixel mapping and colors happen below.
-->
<script>
  import { scaleLinear } from '../../../../core/scales.js';
  import { FRAME, strokeScale, typeScale, FONT_MONO } from '../../../../ui/plots/frame.js';
  import { dataColor } from '../../../../core/palette.svelte.js';
  import Axes from '../../../../ui/plots/Axes.svelte';

  let { observables, params, pres = false, frame = FRAME } = $props();

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

  const sp = $derived(observables?.spectro?.value);
  const tcut = $derived(params.tcut);

  // viridis (fixed sequential ramp: perceptually uniform, colorblind-safe,
  // readable on a projector — independent of the categorical data palette)
  const STOPS = [
    [68, 1, 84],
    [71, 44, 122],
    [59, 81, 139],
    [44, 113, 142],
    [33, 144, 141],
    [39, 173, 129],
    [92, 200, 99],
    [170, 220, 50],
    [253, 231, 37],
  ];
  const DB_FLOOR = -80;

  function ramp(t) {
    const u = Math.min(0.9999, Math.max(0, t)) * (STOPS.length - 1);
    const i = Math.floor(u);
    const f = u - i;
    const a = STOPS[i];
    const b = STOPS[i + 1];
    return [a[0] + f * (b[0] - a[0]), a[1] + f * (b[1] - a[1]), a[2] + f * (b[2] - a[2])];
  }

  /** Rasterize the dB matrix (column-major, row 0 = f = 0) at native size. */
  function rasterize(s) {
    const cnv = document.createElement('canvas');
    cnv.width = s.cols;
    cnv.height = s.rows;
    const ctx = cnv.getContext('2d');
    const img = ctx.createImageData(s.cols, s.rows);
    for (let r = 0; r < s.rows; r++) {
      const row = s.rows - 1 - r; // canvas y = 0 is the TOP (f = fMax)
      for (let c = 0; c < s.cols; c++) {
        const db = s.data[c * s.rows + row];
        const [cr, cg, cb] = ramp((db - DB_FLOOR) / -DB_FLOOR);
        const o = (r * s.cols + c) * 4;
        img.data[o] = cr;
        img.data[o + 1] = cg;
        img.data[o + 2] = cb;
        img.data[o + 3] = 255;
      }
    }
    ctx.putImageData(img, 0, 0);
    return cnv.toDataURL('image/png');
  }

  const uri = $derived(sp ? rasterize(sp) : null);
  const xs = $derived(scaleLinear().domain([sp?.tMin ?? 0, sp?.tMax ?? 1]).range([0, iw]));
  const ys = $derived(scaleLinear().domain([0, sp?.fMax ?? 1]).range([ih, 0]));
</script>

<svg class="plot-svg" viewBox="0 0 {W} {H}" role="img">
  <g transform="translate({M.left},{M.top})">
    {#if uri}
      <image
        x="0"
        y="0"
        width={iw}
        height={ih}
        href={uri}
        preserveAspectRatio="none"
      />
    {/if}
    <Axes
      {xs}
      {ys}
      xAxis={{ label: 't', unit: 's' }}
      yAxis={{ label: 'f', unit: 'Hz' }}
      w={iw}
      h={ih}
      {k}
      {kt}
      m={M}
    />
    {#if Number.isFinite(tcut)}
      <line
        x1={xs(tcut)}
        x2={xs(tcut)}
        y1="0"
        y2={ih}
        stroke={dataColor('#EDB120')}
        stroke-width={1.6 * k}
        stroke-dasharray="{5 * k} {4 * k}"
        opacity="0.9"
      />
      <text
        x={xs(tcut) + 6}
        y={14 * kt}
        font-size={12 * kt}
        fill={dataColor('#EDB120')}
        font-family={FONT_MONO}>t</text
      >
    {/if}
    <text
      x={iw - 4}
      y={14 * kt}
      text-anchor="end"
      font-size={11 * kt}
      fill="#fff"
      opacity="0.85"
      font-family={FONT_MONO}>0 … −80 dB</text
    >
  </g>
</svg>
