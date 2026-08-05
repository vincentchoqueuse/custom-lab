<!--
  CUSTOM view — justification: a 2D plane with an enforced EQUAL-ASPECT scale
  (ellipse angles must be honest), closed iso-density ellipses, principal-axis
  segments, a regression line and a clipped point cloud fit no generic
  1D-oriented plot type. Promoted to ui/plots/ if a second experiment needs it.
  No scientific computation here: ellipses, axes and the regression line come
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

  // equal-aspect window centered on the 3σ ellipse
  const window_ = $derived.by(() => {
    const e = obs.ellipse3.value;
    let lo = Infinity;
    let hi = -Infinity;
    let loY = Infinity;
    let hiY = -Infinity;
    for (let i = 0; i < e.x.length; i++) {
      lo = Math.min(lo, e.x[i]);
      hi = Math.max(hi, e.x[i]);
      loY = Math.min(loY, e.y[i]);
      hiY = Math.max(hiY, e.y[i]);
    }
    const cx = (lo + hi) / 2;
    const cy = (loY + hiY) / 2;
    // same px-per-unit on both axes: pick the tighter scale, pad 10%
    const scale = Math.min(iw / ((hi - lo) * 1.1), ih / ((hiY - loY) * 1.1));
    return { cx, cy, halfX: iw / scale / 2, halfY: ih / scale / 2 };
  });

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

  function pathOf(name, close = false) {
    const v = obs[name].value;
    const pts = [];
    for (let i = 0; i < v.x.length; i++) pts.push({ x: v.x[i], y: v.y[i] });
    const d = linePath()
      .x((p) => xs(p.x))
      .y((p) => ys(p.y))(pts);
    return close && d ? d + 'Z' : d;
  }

  const cloud = $derived(obs.samples.value);

  const legend = [
    { label: 'draws', color: '#0072BD' },
    { label: 'iso-density 1·2·3σ', color: '#D95319' },
    { label: 'principal axes', color: '#7E2F8E' },
    { label: 'E[Y|X=x]', color: '#77AC30' },
  ];
</script>

<svg class="plot-svg" viewBox="0 0 {W} {H}" role="img">
  <defs>
    <clipPath id="g2d-clip">
      <rect x="0" y="0" width={iw} height={ih} />
    </clipPath>
  </defs>
  <g transform="translate({M.left},{M.top})">
    <Axes {xs} {ys} xAxis={{ label: 'x' }} yAxis={{ label: 'y' }} w={iw} h={ih} {k} {kt}
      m={M} />

    <g clip-path="url(#g2d-clip)">
      {#each cloud.x as px, i (i)}
        <circle
          cx={xs(px)}
          cy={ys(cloud.y[i])}
          r={2.2 * k}
          fill={dataColor("#0072BD")}
          fill-opacity="0.4"
        />
      {/each}

      <path d={pathOf('axisMajor')} stroke={dataColor("#7E2F8E")} stroke-width={1.8 * k} fill="none" />
      <path
        d={pathOf('axisMinor')}
        stroke={dataColor("#7E2F8E")}
        stroke-width={1.4 * k}
        stroke-dasharray="{4 * k} {4 * k}"
        fill="none"
        opacity="0.7"
      />
      <path
        d={pathOf('regLine')}
        stroke={dataColor("#77AC30")}
        stroke-width={2.2 * k}
        stroke-dasharray="{7 * k} {5 * k}"
        fill="none"
      />

      <path d={pathOf('ellipse1', true)} stroke={dataColor("#D95319")} stroke-width={2 * k} fill={dataColor("#D95319")} fill-opacity="0.05" />
      <path d={pathOf('ellipse2', true)} stroke={dataColor("#D95319")} stroke-width={1.7 * k} fill="none" opacity="0.8" />
      <path d={pathOf('ellipse3', true)} stroke={dataColor("#D95319")} stroke-width={1.4 * k} fill="none" opacity="0.6" />
    </g>

    <Legend entries={legend} {iw} {kt} />
  </g>
</svg>
