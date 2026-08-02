<!--
  CUSTOM view — justification: the z-plane needs an enforced equal-aspect
  frame (the unit circle — the stability boundary — must be a circle).
  Rendering lives in the generic ui/plots/IQPlane; this file only binds
  observables to its props.
-->
<script>
  import IQPlane from '../../../../ui/plots/IQPlane.svelte';

  let { observables: obs, params, pres = false } = $props();

  const circle = $derived.by(() => {
    const n = 140;
    const x = new Float64Array(n);
    const y = new Float64Array(n);
    for (let i = 0; i < n; i++) {
      x[i] = Math.cos((2 * Math.PI * i) / n);
      y[i] = Math.sin((2 * Math.PI * i) / n);
    }
    return { x, y };
  });

  const clouds = $derived([
    { ...circle, color: 'var(--muted-fg)', r: 0.9, opacity: 0.5 },
    { x: obs.zerosX.value, y: obs.zerosY.value, color: '#0072BD', r: 4, opacity: 0.95 },
  ]);

  const legend = [
    { label: 'pôles', color: '#D95319' },
    { label: 'zéros', color: '#0072BD' },
    { label: 'cercle unité (stabilité)', color: '#a1a1aa' },
  ];
</script>

<IQPlane
  {clouds}
  markers={{ x: obs.polesX.value, y: obs.polesY.value }}
  markerColor="#D95319"
  xLabel="Re(z)"
  yLabel="Im(z)"
  minHalf={1.25}
  maxHalf={1.6}
  segments={[
    { x1: -1.6, y1: 0, x2: 1.6, y2: 0 },
    { x1: 0, y1: -1.6, x2: 0, y2: 1.6 },
  ]}
  {legend}
  {pres}
/>
