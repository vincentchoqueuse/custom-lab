<!--
  CUSTOM view — justification: the canonical 2×2 dartboard figure — four
  EQUAL-ASPECT targets sharing one scale, concentric rings, shot clouds and
  per-estimator biais²/variance/EQM annotations — fits no generic 1D plot
  type. Promoted to ui/plots/ if a second experiment needs it.
  No scientific computation here: shots and the EQM decomposition come
  ready-made from observables; only pixel scaling below.
-->
<script>
  import { FRAME, FONT_UI, FONT_MONO, strokeScale, typeScale } from '../../../../ui/plots/frame.js';

  let { observables: obs, params, pres = false } = $props();

  const { W, H } = FRAME;
  const k = $derived(strokeScale(pres));
  const kt = $derived(typeScale(pres));

  const COLORS = ['#0072BD', '#77AC30', '#D95319', '#7E2F8E'];
  const MAX_DOTS = 350; // drawn per target; stats use all M shots

  const clouds = $derived([
    obs.shotsMean.value,
    obs.shotsMedian.value,
    obs.shotsShrink.value,
    obs.shotsFirst.value,
  ]);
  const stats = $derived(obs.estStats.value);

  // one shared scale for the four targets (honest comparison): half-extent =
  // the largest shot distance to the true center, floored at 2σ
  const half = $derived.by(() => {
    let r2max = 0;
    for (const c of clouds) {
      for (let m = 0; m < c.x.length; m++) {
        const r2 = (c.x[m] - params.mu) ** 2 + (c.y[m] - params.mu) ** 2;
        if (r2 > r2max) r2max = r2;
      }
    }
    return Math.max(Math.sqrt(r2max) * 1.05, 2 * params.sigma);
  });

  // 2×2 layout: square panels, label strip under each; panels are
  // height-limited, so the wide column gap spends the horizontal slack and
  // keeps adjacent annotations from colliding
  const GAP = 92;
  const LABEL_H = 34;
  const panel = $derived(
    Math.min((W - 3 * GAP) / 2, (H - 2 * GAP / 2 - 2 * LABEL_H - 10) / 2)
  );
  const x0 = $derived((W - 2 * panel - GAP) / 2);
  const y0 = 8;

  function panelPos(e) {
    return {
      px: x0 + (e % 2) * (panel + GAP),
      py: y0 + Math.floor(e / 2) * (panel + LABEL_H + 12),
    };
  }

  // data → pixel inside a panel (equal aspect by construction)
  const toPx = $derived((v) => ((v - params.mu) / half) * (panel / 2));

  const fmt = (v) => v.toFixed(2);
</script>

<svg class="plot-svg" viewBox="0 0 {W} {H}" role="img">
  {#each clouds as cloud, e (e)}
    {@const { px, py } = panelPos(e)}
    {@const cx = px + panel / 2}
    {@const cy = py + panel / 2}
    <g>
      <clipPath id="target-{e}">
        <circle {cx} {cy} r={panel / 2} />
      </clipPath>
      <!-- rings -->
      {#each [1, 0.75, 0.5, 0.25] as f (f)}
        <circle
          {cx}
          {cy}
          r={(panel / 2) * f}
          fill={f === 1 ? 'var(--muted)' : 'none'}
          fill-opacity={f === 1 ? 0.35 : 0}
          stroke="var(--border)"
          stroke-width={1.1 * k}
        />
      {/each}
      <!-- true center: crosshair -->
      <line x1={cx - 6 * k} y1={cy} x2={cx + 6 * k} y2={cy} stroke="#EDB120" stroke-width={1.8 * k} />
      <line x1={cx} y1={cy - 6 * k} x2={cx} y2={cy + 6 * k} stroke="#EDB120" stroke-width={1.8 * k} />
      <!-- shots -->
      <g clip-path="url(#target-{e})">
        {#each { length: Math.min(cloud.x.length, MAX_DOTS) } as _, m (m)}
          <circle
            cx={cx + toPx(cloud.x[m])}
            cy={cy - toPx(cloud.y[m])}
            r={2 * k}
            fill={COLORS[e]}
            opacity="0.4"
          />
        {/each}
      </g>
      <!-- labels -->
      <text
        x={cx}
        y={py + panel + 15}
        text-anchor="middle"
        font-family={FONT_UI}
        font-size={12.5 * kt}
        font-weight="600"
        fill={COLORS[e]}
      >
        {stats[e].name}
      </text>
      <text
        x={cx}
        y={py + panel + 29}
        text-anchor="middle"
        font-family={FONT_MONO}
        font-size={9.5 * kt}
        fill="var(--muted-fg)"
      >
        biais² {fmt(stats[e].bias2)} · var {fmt(stats[e].variance)} · EQM {fmt(stats[e].mse)}
      </text>
    </g>
  {/each}
</svg>
