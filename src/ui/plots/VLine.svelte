<script>
  // Vertical reference line (param, scalar observable, or p => fn).
  import { FONT_MONO } from './frame.js';

  let { xs, x, spec = {}, h, k = 1, kt = 1 } = $props();

  const color = $derived(spec.color ?? '#EDB120');
</script>

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
  {#if spec.label}
    <text
      x={xs(x) + 6}
      y={14 * kt}
      font-size={12 * kt}
      fill={color}
      font-family={FONT_MONO}>{spec.label}</text
    >
  {/if}
</g>
