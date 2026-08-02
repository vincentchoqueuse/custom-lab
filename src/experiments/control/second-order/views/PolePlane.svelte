<!--
  CUSTOM view — justification: the pole plane needs an enforced equal-aspect
  scale (the ω₀ circle must be a circle, the damping angle must be honest);
  rendering lives in the generic ui/plots/IQPlane, this file only binds
  observables to its props.
-->
<script>
  import IQPlane from '../../../../ui/plots/IQPlane.svelte';

  let { observables: obs, params, pres = false } = $props();

  const clouds = $derived([
    { ...obs.circleGuide.value, color: 'var(--muted-fg)', r: 0.9, opacity: 0.45 },
  ]);

  const legend = [
    { label: 'pôles', color: '#D95319' },
    { label: 'cercle |s| = ω₀', color: '#a1a1aa' },
  ];
</script>

<IQPlane
  {clouds}
  markers={obs.poles.value}
  markerColor="#D95319"
  xLabel="Re(s)"
  yLabel="Im(s)"
  minHalf={Math.max(1.3 * params.w0, 1)}
  maxHalf={60}
  {legend}
  {pres}
/>
