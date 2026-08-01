<script>
  // Density-normalized histogram bars (bins prepared by DeclarativePlot).
  let { xs, ys, rects, spec = {} } = $props();

  const color = $derived(spec.color ?? '#0072BD');
  const opacity = $derived(spec.opacity ?? 0.85);
</script>

<g>
  {#each rects as r, i (i)}
    <rect
      x={xs(r.x0) + 0.5}
      y={ys(r.d)}
      width={Math.max(0, xs(r.x1) - xs(r.x0) - 1)}
      height={Math.max(0, ys(0) - ys(r.d))}
      fill={color}
      fill-opacity={opacity}
    />
  {/each}
</g>
