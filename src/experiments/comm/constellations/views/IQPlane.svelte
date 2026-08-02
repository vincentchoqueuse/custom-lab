<!--
  CUSTOM view — justification: the I/Q plane needs an enforced equal-aspect
  scale plus an ML-boundary layer; rendering lives in the promoted generic
  ui/plots/IQPlane, this file only binds observables to its props.
-->
<script>
  import IQPlane from '../../../../ui/plots/IQPlane.svelte';

  let { observables: obs, params: _params, pres = false } = $props();

  const clouds = $derived([
    { ...obs.rxOk.value, color: '#0072BD', r: 1.7, opacity: 0.3 },
    { ...obs.rxErr.value, color: '#D95319', r: 2.4, opacity: 0.85 },
  ]);

  const legend = [
    { label: 'décidé juste', color: '#0072BD' },
    { label: 'erreur', color: '#D95319' },
    { label: 'symboles émis', color: '#EDB120' },
  ];
</script>

<IQPlane
  {clouds}
  markers={obs.idealPoints.value}
  segments={obs.boundaries.value}
  {legend}
  {pres}
/>
