<script>
  import { app, manifest, setView } from '../core/store.svelte.js';

  const m = $derived(manifest());
</script>

<div class="tabs" role="tablist">
  {#each m.views as v (v.id)}
    <button
      role="tab"
      aria-selected={app.view === v.id}
      class:active={app.view === v.id}
      onclick={() => setView(v.id)}
    >
      {v.title}
    </button>
  {/each}
</div>
