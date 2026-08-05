<script>
  import { manifest } from '../core/store.svelte.js';
  import Tabs from './Tabs.svelte';
  import ActionBar from './ActionBar.svelte';
  import PlotFrame from './PlotFrame.svelte';
  import PromptBar from './PromptBar.svelte';

  const m = $derived(manifest());
</script>

<div class="workspace">
  <div class="workspace-inner">
    {#if m}
      <!-- one line: the representations on the left, the actions flush right -->
      <div class="viewbar">
        {#if m.views.length > 1}
          <Tabs />
        {/if}
        <ActionBar />
      </div>
      <PlotFrame />
    {/if}
  </div>
</div>
<PromptBar />
