<script>
  // Scene notes for the professor. Never projected by default (Teacher Mode
  // opt-in), never in the URL.
  import { app, activeScene } from '../core/store.svelte.js';

  const scene = $derived(activeScene());
</script>

{#if app.ui.teacher && scene?.notes}
  <div class="teacher-banner">
    <span>🗒</span>
    <p class="notes">{scene.notes}</p>
  </div>
{/if}
