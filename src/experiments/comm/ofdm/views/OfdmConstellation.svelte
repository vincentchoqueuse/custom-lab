<!--
  CUSTOM view — justification: the before/after-equalization constellation
  needs the enforced equal-aspect I/Q window; rendering lives in the
  generic ui/plots/IQPlane, this file only binds observables to its props.
-->
<script>
  import IQPlane from '../../../../ui/plots/IQPlane.svelte';

  let { observables: obs, params, pres = false } = $props();

  const clouds = $derived([
    { x: obs.rxRaw.value.x, y: obs.rxRaw.value.y, color: '#7E2F8E', r: 1.5, opacity: 0.18 },
    { x: obs.rxEq.value.x, y: obs.rxEq.value.y, color: '#0072BD', r: 1.7, opacity: 0.4 },
  ]);

  const legend = [
    { label: 'avant égalisation', color: '#7E2F8E' },
    { label: 'après ZF (1 coeff/porteuse)', color: '#0072BD' },
    { label: 'QPSK idéale', color: '#EDB120' },
  ];
</script>

<IQPlane
  {clouds}
  markers={obs.ideal.value}
  markerColor="#EDB120"
  minHalf={1.6}
  maxHalf={2.5}
  {legend}
  {pres}
/>
