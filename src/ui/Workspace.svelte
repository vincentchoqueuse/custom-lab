<script>
  import { app, manifest, activeScene } from '../core/store.svelte.js';
  import Tabs from './Tabs.svelte';
  import TeacherBanner from './TeacherBanner.svelte';
  import PlotFrame from './PlotFrame.svelte';
  import PromptBar from './PromptBar.svelte';

  const m = $derived(manifest());
</script>

<div class="workspace">
  <div class="workspace-inner">
    <TeacherBanner />
    {#if m && m.views.length > 1}
      <Tabs />
    {/if}
    {#if m}
      <PlotFrame />
    {/if}
  </div>
</div>
<PromptBar />
