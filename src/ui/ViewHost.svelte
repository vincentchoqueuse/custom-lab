<script>
  // ViewHost interprets the active view: declarative cartesian specs go
  // through DeclarativePlot, declarative equal-aspect planes through
  // PlanePlot; custom views are lazy-loaded components receiving
  // {observables, params, pres} — and nothing else (no compute access).
  import { app, manifest } from '../core/store.svelte.js';
  import DeclarativePlot from './plots/DeclarativePlot.svelte';
  import PlanePlot from './plots/PlanePlot.svelte';

  const m = $derived(manifest());
  const viewDef = $derived(m?.views.find((v) => v.id === app.view) ?? m?.views[0]);
  const obs = $derived(app.result.observables);
</script>

{#if viewDef && obs}
  {#if viewDef.kind === 'plane'}
    <PlanePlot
      spec={viewDef.spec}
      {obs}
      params={app.params}
      pres={app.ui.presentation || app.ui.bold}
    />
  {:else if viewDef.kind === 'custom'}
    {#await viewDef.load() then mod}
      {@const Custom = mod.default}
      <Custom observables={obs} params={app.params} pres={app.ui.presentation || app.ui.bold} />
    {/await}
  {:else}
    <DeclarativePlot
      spec={viewDef.spec}
      {obs}
      params={app.params}
      pres={app.ui.presentation || app.ui.bold}
      lock={app.axisLock}
    />
  {/if}
{/if}
