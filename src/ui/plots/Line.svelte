<script>
  // Polyline through a series observable (path string from d3 via scales.js).
  import { linePath } from '../../core/scales.js';

  let { xs, ys, pts, spec = {}, k = 1 } = $props();

  const d = $derived(
    linePath()
      .x((p) => xs(p.x))
      .y((p) => ys(p.y))
      .defined((p) => Number.isFinite(xs(p.x)) && Number.isFinite(ys(p.y)))(pts)
  );
</script>

{#if d}
  <path
    {d}
    fill="none"
    stroke={spec.color ?? '#0072BD'}
    stroke-width={(spec.width ?? 2) * k}
    stroke-dasharray={spec.dashed ? `${6 * k} ${5 * k}` : null}
    opacity={spec.opacity ?? 1}
    stroke-linejoin="round"
    stroke-linecap="round"
  />
{/if}
