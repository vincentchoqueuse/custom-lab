<script>
  // Horizontal reference line (param, scalar observable, or p => fn).
  import { FONT_MONO } from './frame.js';

  let { ys, y, spec = {}, w, k = 1, kt = 1 } = $props();

  const color = $derived(spec.color ?? '#EDB120');
</script>

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
  {#if spec.label}
    <text
      x={w - 6}
      y={ys(y) - 6}
      text-anchor="end"
      font-size={12 * kt}
      fill={color}
      font-family={FONT_MONO}>{spec.label}</text
    >
  {/if}
</g>
