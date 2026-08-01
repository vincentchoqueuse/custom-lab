<script>
  // Point cloud for a series observable.
  let { xs, ys, pts, spec = {}, k = 1 } = $props();
</script>

<g>
  {#each pts as p, i (i)}
    {#if Number.isFinite(xs(p.x)) && Number.isFinite(ys(p.y))}
      <circle
        cx={xs(p.x)}
        cy={ys(p.y)}
        r={(spec.size ?? 3) * k}
        fill={spec.color ?? '#0072BD'}
        fill-opacity={spec.opacity ?? 0.8}
      />
    {/if}
  {/each}
</g>
