<!--
  CUSTOM view — justification: iso-contour segment soup + three iterate
  polylines with per-iterate dots + start/optimum markers on an EQUAL-ASPECT
  window fit no generic 1D plot type. No scientific computation: contours
  and trajectories come ready-made from observables; pixel mapping only.
-->
<script>
  import { scaleLinear } from '../../../../core/scales.js';
  import { FRAME, strokeScale, typeScale } from '../../../../ui/plots/frame.js';
  import { dataColor } from '../../../../core/palette.svelte.js';
  import Axes from '../../../../ui/plots/Axes.svelte';
  import Legend from '../../../../ui/plots/Legend.svelte';

  let { observables: obs, params: _params, pres = false, frame = FRAME } = $props();

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

  const TRAJS = [
    { key: 'trajGradient', color: '#0072BD', label: 'gradient' },
    { key: 'trajMomentum', color: '#77AC30', label: 'momentum' },
    { key: 'trajNewton', color: '#D95319', label: 'Newton' },
  ];

  // EQUAL-ASPECT WINDOW OVER THE LANDSCAPE'S OWN DOMAIN — the rectangle the
  // contours were sampled on, which the compute states. It used to be the
  // bounding box of the drawn SEGMENTS, and that is a different thing: when a
  // level's ellipse ran wider than the sampled box, all that reached the view
  // were its top and bottom caps, and the window was then fitted to those two
  // caps. The frame was decided by the least meaningful part of the picture.
  //
  // Expanding to equal aspect, never shrinking: the domain must stay wholly
  // visible, since it is where the function was evaluated.
  const window_ = $derived.by(() => {
    const [x0, x1, y0, y1] = obs.window.value;
    const scale = Math.min(iw / (x1 - x0), ih / (y1 - y0));
    return {
      cx: (x0 + x1) / 2,
      cy: (y0 + y1) / 2,
      halfX: iw / scale / 2,
      halfY: ih / scale / 2,
    };
  });

  const xs = $derived(
    scaleLinear().domain([window_.cx - window_.halfX, window_.cx + window_.halfX]).range([0, iw])
  );
  const ys = $derived(
    scaleLinear().domain([window_.cy - window_.halfY, window_.cy + window_.halfY]).range([ih, 0])
  );

  // one path string for all contour segments
  const contourPath = $derived.by(() => {
    const s = obs.contourSegs.value;
    let d = '';
    for (let i = 0; i < s.length; i += 4) {
      d += `M${xs(s[i]).toFixed(1)} ${ys(s[i + 1]).toFixed(1)}L${xs(s[i + 2]).toFixed(1)} ${ys(s[i + 3]).toFixed(1)}`;
    }
    return d;
  });

  function polyline(key) {
    const t = obs[key].value;
    let d = '';
    for (let i = 0; i < t.x.length; i++) {
      const px = xs(t.x[i]);
      const py = ys(t.y[i]);
      if (!Number.isFinite(px) || !Number.isFinite(py)) continue;
      d += (d ? 'L' : 'M') + px.toFixed(1) + ' ' + py.toFixed(1);
    }
    return d;
  }

  const legend = $derived([
    ...TRAJS.map((t) => ({ label: t.label, color: t.color })),
    { label: 'optimum', color: '#EDB120' },
  ]);
</script>

<svg class="plot-svg" viewBox="0 0 {W} {H}" role="img">
  <defs>
    <clipPath id="cd-clip">
      <rect x="0" y="0" width={iw} height={ih} />
    </clipPath>
  </defs>
  <g transform="translate({M.left},{M.top})">
    <Axes {xs} {ys} xAxis={{ label: 'x' }} yAxis={{ label: 'y' }} w={iw} h={ih} {k} {kt}
      m={M} />

    <g clip-path="url(#cd-clip)">
      <path d={contourPath} stroke="var(--muted-fg)" stroke-width={0.9 * k} fill="none" opacity="0.45" />

      {#each TRAJS as t (t.key)}
        <path d={polyline(t.key)} stroke={dataColor(t.color)} stroke-width={2 * k} fill="none" opacity="0.9" />
        {#each { length: obs[t.key].value.x.length } as _, i (i)}
          <circle
            cx={xs(obs[t.key].value.x[i])}
            cy={ys(obs[t.key].value.y[i])}
            r={2.2 * k}
            fill={dataColor(t.color)}
            opacity="0.75"
          />
        {/each}
      {/each}

      <!-- start and optimum markers -->
      <circle
        cx={xs(obs.startPoint.value.x[0])}
        cy={ys(obs.startPoint.value.y[0])}
        r={4.5 * k}
        fill="var(--foreground)"
        stroke="var(--background)"
        stroke-width={1.5 * k}
      />
      <g stroke="#EDB120" stroke-width={2.4 * k}>
        <line
          x1={xs(obs.optimum.value.x[0]) - 6 * k}
          y1={ys(obs.optimum.value.y[0])}
          x2={xs(obs.optimum.value.x[0]) + 6 * k}
          y2={ys(obs.optimum.value.y[0])}
        />
        <line
          x1={xs(obs.optimum.value.x[0])}
          y1={ys(obs.optimum.value.y[0]) - 6 * k}
          x2={xs(obs.optimum.value.x[0])}
          y2={ys(obs.optimum.value.y[0]) + 6 * k}
        />
      </g>
    </g>

    <Legend entries={legend} {iw} {kt} />
  </g>
</svg>
