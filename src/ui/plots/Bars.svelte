<script>
  // Vertical bars for a series observable (bar width from point spacing).
  let { xs, ys, pts, spec = {}, h } = $props();

  const barW = $derived(
    pts.length > 1 ? Math.max(2, Math.abs(xs(pts[1].x) - xs(pts[0].x)) * 0.7) : 20
  );
  const y0 = $derived(Math.min(h, Math.max(0, ys(0))));
</script>

<g>
  {#each pts as p, i (i)}
    {#if Number.isFinite(xs(p.x)) && Number.isFinite(ys(p.y))}
      <rect
        x={xs(p.x) - barW / 2}
        y={Math.min(ys(p.y), y0)}
        width={barW}
        height={Math.abs(y0 - ys(p.y))}
        fill={spec.color ?? '#0072BD'}
        fill-opacity={spec.opacity ?? 0.85}
      />
    {/if}
  {/each}
</g>
