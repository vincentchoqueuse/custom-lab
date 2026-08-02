<!--
  CUSTOM view — justification: equal-aspect I/Q plane with per-symbol bit
  labels and error clouds split by bit cost; rendering lives in the generic
  ui/plots/IQPlane, this file only binds observables to its props.
-->
<script>
  import IQPlane from '../../../../ui/plots/IQPlane.svelte';

  let { observables: obs, params: _params, pres = false } = $props();

  const clouds = $derived([
    { ...obs.rxOk.value, color: '#0072BD', r: 1.6, opacity: 0.22, max: 2500 },
    { ...obs.rxErr1.value, color: '#EDB120', r: 2.4, opacity: 0.85 },
    { ...obs.rxErrMulti.value, color: '#D95319', r: 2.8, opacity: 0.95 },
  ]);

  const legend = [
    { label: 'décidé juste', color: '#0072BD' },
    { label: 'erreur à 1 bit', color: '#EDB120' },
    { label: 'erreur multi-bits', color: '#D95319' },
  ];
</script>

<IQPlane
  {clouds}
  markers={obs.idealPoints.value}
  markerColor="var(--muted-fg)"
  labels={obs.bitLabels.value}
  {legend}
  {pres}
/>
