<script>
  // ViewHost interprets the active view: declarative cartesian specs go
  // through DeclarativePlot, stacked panels through StackPlot, declarative
  // equal-aspect planes through PlanePlot; custom views are lazy-loaded
  // components receiving {observables, params, pres, frame} — and nothing else
  // (no compute access, and no store access: the canvas travels as a prop).
  import { app, manifest } from '../core/store.svelte.js';
  import { STR } from '../core/strings.js';
  import DeclarativePlot from './plots/DeclarativePlot.svelte';
  import PlanePlot from './plots/PlanePlot.svelte';
  import StackPlot from './plots/StackPlot.svelte';
  import { frameFor } from './plots/frame.js';

  const m = $derived(manifest());
  const viewDef = $derived(m?.views.find((v) => v.id === app.view) ?? m?.views[0]);
  const obs = $derived(app.result.observables);

  // A lazily-loaded view can fail to arrive (a chunk lost on a flaky wifi).
  // Without a catch branch that failure is silent and the plot area stays
  // blank for good; `attempt` re-enters the await, and `custom()` no longer
  // caches a rejected promise, so retrying really does fetch again.
  let attempt = $state(0);
</script>

{#if viewDef && obs}
  {#if viewDef.kind === 'plane'}
    <PlanePlot
      spec={viewDef.spec}
      {obs}
      params={app.params}
      pres={app.ui.presentation || app.ui.bold}
    />
  {:else if viewDef.kind === 'stack'}
    <StackPlot
      spec={viewDef.spec}
      {obs}
      params={app.params}
      pres={app.ui.presentation || app.ui.bold}
      lock={app.axisLock}
    />
  {:else if viewDef.kind === 'custom'}
    {#key attempt}
      {#await viewDef.load()}
        <div class="plot-placeholder">{STR.COMPUTING}</div>
      {:then mod}
        {@const Custom = mod.default}
        <!-- the canvas travels as a prop: a custom view must not have to know
             the store to draw on the same frame as everything else -->
        <Custom
          observables={obs}
          params={app.params}
          pres={app.ui.presentation || app.ui.bold}
          frame={frameFor(app.ui.narrow)}
        />
      {:catch}
        <div class="plot-placeholder">
          {STR.VIEW_LOAD_ERROR}
          <button class="retry" onclick={() => (attempt += 1)}>{STR.RETRY}</button>
        </div>
      {/await}
    {/key}
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

<style>
  .retry {
    margin-left: 0.6rem;
    padding: 0.15rem 0.6rem;
    font: inherit;
    color: var(--fg);
    background: var(--bg);
    border: 1px solid var(--border);
    border-radius: 6px;
    cursor: pointer;
  }
  .retry:hover {
    background: var(--muted);
  }
</style>
