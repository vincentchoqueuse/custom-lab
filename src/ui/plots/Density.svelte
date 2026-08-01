<script>
  // Smooth density curve: stroked line + faint area fill down to the x axis.
  import { linePath, areaPath } from '../../core/scales.js';

  let { xs, ys, pts, spec = {}, k = 1, h } = $props();

  const color = $derived(spec.color ?? '#D95319');
  const stroke = $derived(
    linePath()
      .x((p) => xs(p.x))
      .y((p) => ys(p.y))
      .defined((p) => Number.isFinite(xs(p.x)) && Number.isFinite(ys(p.y)))(pts)
  );
  const fill = $derived(
    areaPath()
      .x((p) => xs(p.x))
      .y0(h)
      .y1((p) => ys(p.y))
      .defined((p) => Number.isFinite(xs(p.x)) && Number.isFinite(ys(p.y)))(pts)
  );
</script>

{#if fill}
  <path d={fill} fill={color} fill-opacity="0.07" />
{/if}
{#if stroke}
  <path
    d={stroke}
    fill="none"
    stroke={color}
    stroke-width={(spec.width ?? 2) * k}
    stroke-dasharray={spec.dashed ? `${6 * k} ${5 * k}` : null}
    opacity={spec.opacity ?? 1}
    stroke-linejoin="round"
  />
{/if}
