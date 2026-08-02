<!--
  CUSTOM view — justification: the pole-zero map needs an enforced
  equal-aspect s-plane (Butterworth's circle must be a circle, the jω-axis
  zeros must sit visibly ON the axis). Rendering lives in the generic
  ui/plots/IQPlane; this file only binds observables to its props.
-->
<script>
  import IQPlane from '../../../../ui/plots/IQPlane.svelte';

  let { observables: obs, params, pres = false } = $props();

  // poles as an opaque cloud (×-less, but color-coded), zeros as hollow-look
  // blue dots on the jω axis; the |s| = ωp guide circle for scale
  const guide = $derived.by(() => {
    const n = 120;
    const x = new Float64Array(n);
    const y = new Float64Array(n);
    for (let i = 0; i < n; i++) {
      x[i] = Math.cos((2 * Math.PI * i) / n);
      y[i] = Math.sin((2 * Math.PI * i) / n);
    }
    return { x, y };
  });

  const clouds = $derived([
    { ...guide, color: 'var(--muted-fg)', r: 0.9, opacity: 0.45 },
    { x: obs.zerosX.value, y: obs.zerosY.value, color: '#0072BD', r: 4, opacity: 0.95 },
  ]);

  const markers = $derived({ x: obs.polesX.value, y: obs.polesY.value });

  const legend = [
    { label: 'pôles', color: '#D95319' },
    { label: 'zéros (sur jω)', color: '#0072BD' },
    { label: 'cercle |s| = ωp', color: '#a1a1aa' },
  ];
</script>

<IQPlane
  {clouds}
  {markers}
  markerColor="#D95319"
  xLabel="Re(s)/ωp"
  yLabel="Im(s)/ωp"
  minHalf={1.4}
  maxHalf={5}
  segments={[{ x1: 0, y1: -5, x2: 0, y2: 5 }]}
  {legend}
  {pres}
/>
