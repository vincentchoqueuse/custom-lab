<script>
  // ViewHost interprets the active view: declarative {plot, overlays} specs go
  // through DeclarativePlot; custom views are lazy-loaded components receiving
  // {observables, params, pres} — and nothing else (no compute access).
  import { app, manifest } from '../core/store.svelte.js';
  import DeclarativePlot from './plots/DeclarativePlot.svelte';

  const m = $derived(manifest());
  const viewDef = $derived(m?.views.find((v) => v.id === app.view) ?? m?.views[0]);
  const obs = $derived(app.result.observables);
</script>

{#if viewDef && obs}
  {#if viewDef.kind === 'custom'}
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
    />
  {/if}
{/if}
