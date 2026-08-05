<script>
  // A single declarative {type, source, overlays, axes} spec, filling the
  // frame. Everything it draws is PlotPanel; what is left here is the canvas.
  import { frameFor, strokeScale, typeScale } from './frame.js';
  import { app } from '../../core/store.svelte.js';
  import PlotPanel from './PlotPanel.svelte';

  let { spec, obs, params, pres = false, lock = false } = $props();

  // 16:9 on a projector, 4:3 on a phone — see frame.js
  const F = $derived(frameFor(app.ui.narrow));
  const k = $derived(strokeScale(pres));
  const kt = $derived(typeScale(pres));
</script>

<svg class="plot-svg" viewBox="0 0 {F.W} {F.H}" role="img">
  <PlotPanel
    {spec}
    {obs}
    {params}
    {pres}
    {lock}
    {k}
    {kt}
    left={F.M.left}
    top={F.M.top}
    m={F.M}
    iw={F.iw}
    ih={F.ih}
    uid="single"
  />
</svg>
