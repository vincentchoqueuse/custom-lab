<script>
  // A single declarative {type, source, overlays, axes} spec, filling the
  // frame. Everything it draws is PlotPanel; what is left here is the canvas.
  import { FRAME, strokeScale, typeScale } from './frame.js';
  import PlotPanel from './PlotPanel.svelte';

  let { spec, obs, params, pres = false, lock = false } = $props();

  const { W, H, M, iw, ih } = FRAME;
  const k = $derived(strokeScale(pres));
  const kt = $derived(typeScale(pres));
</script>

<svg class="plot-svg" viewBox="0 0 {W} {H}" role="img">
  <PlotPanel
    {spec}
    {obs}
    {params}
    {pres}
    {lock}
    {k}
    {kt}
    left={M.left}
    top={M.top}
    {iw}
    {ih}
    uid="single"
  />
</svg>
