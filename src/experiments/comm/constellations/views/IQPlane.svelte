<!--
  CUSTOM view — justification: the I/Q plane needs an enforced EQUAL-ASPECT
  scale (the 8-PSK circle must be a circle, QAM cells must be squares) plus
  the ML decision boundaries as a segment layer — no generic 1D-oriented
  plot type fits. Same pattern as gaussian-2d's GaussianPlane; promotion to
  ui/plots/ is the move if a third equal-aspect view appears.
  No scientific computation here: clouds, ideal points and boundaries come
  ready-made from observables; only pixel scaling below.
-->
<script>
  import { scaleLinear } from '../../../../core/scales.js';
  import { FRAME, strokeScale, typeScale } from '../../../../ui/plots/frame.js';
  import Axes from '../../../../ui/plots/Axes.svelte';
  import Legend from '../../../../ui/plots/Legend.svelte';

  let { observables: obs, params, pres = false } = $props();

  const { W, H, M, iw, ih } = FRAME;
  const k = $derived(strokeScale(pres));
  const kt = $derived(typeScale(pres));

  const MAX_DOTS = 3000; // drawn per cloud; the SER uses all N symbols

  const okCloud = $derived(obs.rxOk.value);
  const errCloud = $derived(obs.rxErr.value);
  const ideal = $derived(obs.idealPoints.value);
  const segs = $derived(obs.boundaries.value);

  // equal-aspect window: square data extent stretched to the frame's aspect
  const window_ = $derived.by(() => {
    let h = 1.4;
    for (const c of [okCloud, errCloud]) {
      for (let i = 0; i < c.x.length; i++) {
        h = Math.max(h, Math.abs(c.x[i]), Math.abs(c.y[i]));
      }
    }
    h = Math.min(h * 1.05, 3);
    const scale = Math.min(iw, ih) / (2 * h); // px per data unit, both axes
    return { halfX: iw / scale / 2, halfY: ih / scale / 2 };
  });

  const xs = $derived(scaleLinear().domain([-window_.halfX, window_.halfX]).range([0, iw]));
  const ys = $derived(scaleLinear().domain([-window_.halfY, window_.halfY]).range([ih, 0]));

  const legend = [
    { label: 'décidé juste', color: '#0072BD' },
    { label: 'erreur', color: '#D95319' },
    { label: 'symboles émis', color: '#EDB120' },
  ];
</script>

<svg class="plot-svg" viewBox="0 0 {W} {H}" role="img">
  <defs>
    <clipPath id="iq-clip">
      <rect x="0" y="0" width={iw} height={ih} />
    </clipPath>
  </defs>
  <g transform="translate({M.left},{M.top})">
    <Axes {xs} {ys} xAxis={{ label: 'I' }} yAxis={{ label: 'Q' }} w={iw} h={ih} {k} {kt} />

    <g clip-path="url(#iq-clip)">
      <!-- ML decision boundaries -->
      {#each segs as s, i (i)}
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

      <!-- received symbols: correct then errors on top -->
      {#each { length: Math.min(okCloud.x.length, MAX_DOTS) } as _, i (i)}
        <circle cx={xs(okCloud.x[i])} cy={ys(okCloud.y[i])} r={1.7 * k} fill="#0072BD" opacity="0.3" />
      {/each}
      {#each { length: Math.min(errCloud.x.length, MAX_DOTS) } as _, i (i)}
        <circle cx={xs(errCloud.x[i])} cy={ys(errCloud.y[i])} r={2.4 * k} fill="#D95319" opacity="0.85" />
      {/each}

      <!-- ideal constellation points -->
      {#each { length: ideal.x.length } as _, i (i)}
        <circle
          cx={xs(ideal.x[i])}
          cy={ys(ideal.y[i])}
          r={4.2 * k}
          fill="#EDB120"
          stroke="var(--background)"
          stroke-width={1.6 * k}
        />
      {/each}
    </g>

    <Legend entries={legend} {iw} {kt} />
  </g>
</svg>
