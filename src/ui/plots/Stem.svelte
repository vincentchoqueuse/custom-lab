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
  // A PIXEL nudge, for the one case a stem plot cannot otherwise show: two
  // discrete signals sampled at the same instants. Drawn in the same column
  // the stalks overlap exactly and the pair reads as a single muddy bar, so
  // the transmitted train steps a couple of pixels left and the received one
  // right — the classic side-by-side stem. It is display, not data: the
  // samples stay at the instants the compute gave them, and the offset
  // scales with presentation mode like every other stroke.
  const dx = $derived((spec.offset ?? 0) * k);
</script>

<g>
  {#each pts as p, i (i)}
    {#if Number.isFinite(xs(p.x)) && Number.isFinite(ys(p.y))}
      <line
        x1={xs(p.x) + dx}
        y1={y0}
        x2={xs(p.x) + dx}
        y2={ys(p.y)}
        stroke={color}
        stroke-width={w}
        stroke-opacity={opacity}
      />
      <circle cx={xs(p.x) + dx} cy={ys(p.y)} {r} fill={color} fill-opacity={opacity} />
    {/if}
  {/each}
</g>
