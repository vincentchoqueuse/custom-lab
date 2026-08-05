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

  // The crosshair abscissa lives here rather than in the panel, for the same
  // reason it does in a stack: one plot, one rule. Purely transient — it exists
  // while a pointer is over the frame and no longer, so it needs no place in
  // the URL and no line in the Esc chain.
  let cursorX = $state(null);
  // a view change reuses this component with a new spec; a rule left over from
  // the previous figure would point at nothing
  $effect(() => {
    spec;
    cursorX = null;
  });
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
    {cursorX}
    dataX={cursorX}
    onhover={(v) => (cursorX = v)}
  />
</svg>
