<script>
  // Stem plot (MATLAB `stem`): a vertical stalk from the baseline to each
  // value, capped by a marker. THE figure for a discrete-time signal or a
  // coefficient sequence — a continuous line would claim values between the
  // samples that do not exist, and a bare cloud of dots loses the baseline.
  let { xs, ys, pts, spec = {}, h, k = 1 } = $props();

  // a log axis has no zero: the stalks then stand on the bottom of the frame
  const y0 = $derived.by(() => {
    const b = ys(spec.baseline ?? 0);
    return Number.isFinite(b) ? Math.min(h, Math.max(0, b)) : h;
  });
  const r = $derived((spec.size ?? 2.6) * k);
  const w = $derived((spec.width ?? 1.2) * k);
  const color = $derived(spec.color ?? '#0072BD');
  const opacity = $derived(spec.opacity ?? 0.9);
</script>

<g>
  {#each pts as p, i (i)}
    {#if Number.isFinite(xs(p.x)) && Number.isFinite(ys(p.y))}
      <line
        x1={xs(p.x)}
        y1={y0}
        x2={xs(p.x)}
        y2={ys(p.y)}
        stroke={color}
        stroke-width={w}
        stroke-opacity={opacity}
      />
      <circle cx={xs(p.x)} cy={ys(p.y)} {r} fill={color} fill-opacity={opacity} />
    {/if}
  {/each}
</g>
