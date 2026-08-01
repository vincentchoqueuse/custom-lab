<script>
  // Shaded band between lo/hi bounds ({x, lo, hi} observable).
  import { areaPath } from '../../core/scales.js';

  let { xs, ys, pts, spec = {} } = $props();

  const d = $derived(
    areaPath()
      .x((p) => xs(p.x))
      .y0((p) => ys(p.lo))
      .y1((p) => ys(p.hi))
      .defined(
        (p) =>
          Number.isFinite(xs(p.x)) && Number.isFinite(ys(p.lo)) && Number.isFinite(ys(p.hi))
      )(pts)
  );
</script>

{#if d}
  <path {d} fill={spec.color ?? '#0072BD'} fill-opacity={spec.opacity ?? 0.15} />
{/if}
