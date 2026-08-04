<script>
  // Horizontal reference line (param, scalar observable, or p => fn).
  // Its name is carried by the legend (see VLine).

  let { ys, y, spec = {}, w, k = 1, kt = 1 } = $props();

  const color = $derived(spec.color ?? '#EDB120');
</script>

<!-- A reference line whose pixel position is not a number is not drawn:
     for one frame during an experiment or scene swap the scale can be
     built from a domain that does not exist yet. -->
{#if Number.isFinite(ys(y))}
<g>
  <line
    x1="0"
    x2={w}
    y1={ys(y)}
    y2={ys(y)}
    stroke={color}
    stroke-width={(spec.width ?? 1.8) * k}
    stroke-dasharray={spec.dashed ? `${5 * k} ${4 * k}` : null}
    opacity={spec.opacity ?? 1}
  />
</g>
{/if}
