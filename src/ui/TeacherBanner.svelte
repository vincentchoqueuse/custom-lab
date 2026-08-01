<script>
  // Scene notes for the professor. Never projected by default (Teacher Mode
  // opt-in), never in the URL.
  import { app, activeScene } from '../core/store.svelte.js';
  import Icon from './Icon.svelte';

  const scene = $derived(activeScene());
</script>

{#if app.ui.teacher && scene?.notes}
  <div class="teacher-banner">
    <Icon name="note" size={15} />
    <p class="notes">{scene.notes}</p>
  </div>
{/if}
