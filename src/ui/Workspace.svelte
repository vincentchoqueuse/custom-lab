<script>
  import { app, manifest, currentHash } from '../core/store.svelte.js';
  import { STR } from '../core/strings.js';
  import Tabs from './Tabs.svelte';
  import ActionBar from './ActionBar.svelte';
  import PlotFrame from './PlotFrame.svelte';
  import PromptBar from './PromptBar.svelte';
  import AppIcon from './AppIcon.svelte';

  const m = $derived(manifest());
  // The embed's only way out: the SAME scene, in the full catalogue, in a new
  // tab. currentHash carries embed=1, so it is stripped here — the link's
  // whole point is to leave the frame.
  const fullUrl = $derived(currentHash().replace(/[?&]embed=1/, ''));
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
        {#if app.embed}
          <!-- the growth loop's return path: every iframe carries one quiet
               door back to the catalogue, YouTube-style -->
          <a class="embed-home" href={fullUrl} target="_blank" rel="noopener" title={STR.EMBED_OPEN}>
            <AppIcon size={15} /> {STR.APP_NAME}
          </a>
        {/if}
      </div>
      <PlotFrame />
    {/if}
  </div>
</div>
<PromptBar />
