<script>
  // Vertical reference line (param, scalar observable, or p => fn).
  // Son nom est porté par la légende, comme celui de toute autre couche :
  // écrit au sommet du trait, il devenait illisible dès que deux repères
  // tombaient au même endroit.

  let { xs, x, spec = {}, h, k = 1, kt = 1 } = $props();

  const color = $derived(spec.color ?? '#EDB120');
</script>

<!-- A reference line whose pixel position is not a number is not drawn:
     for one frame during an experiment or scene swap the scale can be
     built from a domain that does not exist yet. -->
{#if Number.isFinite(xs(x))}
<g>
  <line
    x1={xs(x)}
    x2={xs(x)}
    y1="0"
    y2={h}
    stroke={color}
    stroke-width={(spec.width ?? 1.8) * k}
    stroke-dasharray={spec.dashed ? `${5 * k} ${4 * k}` : null}
    opacity={spec.opacity ?? 1}
  />
</g>
{/if}
