<script>
  // The instrument's actions, on the same line as the representations and
  // flush right — the classic toolbar position. Icon + shortcut only: in a
  // lecture hall the icon is read at a glance and the letter is what the
  // hand actually presses; the words were the widest part and said the
  // least. The full label lives in the tooltip and the aria-label.
  import { app, maskedSet, manifestActions, runAction, setDrawer } from '../core/store.svelte.js';
  import { STR } from '../core/strings.js';
  import Icon from './Icon.svelte';

  const masked = $derived(maskedSet());
  const actions = $derived(
    manifestActions().filter((a) => a.id !== 'revealHidden' || masked.size > 0)
  );
  // a masked pill always deserves its reveal button, declared or not
  const allActions = $derived(
    masked.size > 0 && !actions.some((a) => a.id === 'revealHidden')
      ? [...actions, { id: 'revealHidden', icon: 'eye', label: STR.ACTION_REVEAL }]
      : actions
  );
  const hint = (a) => (a.shortcut ? `${a.label} (${a.shortcut})` : a.label);
</script>

<div class="actionbar">
  <!-- FIRST in the row, before the instrument's own actions: it answers
       "what am I looking at", which comes before "what can I do to it". Not a
       manifest action — every experiment has a title and an outline, so there
       is nothing to declare and nothing that could be forgotten. Hidden in an
       embed, like the drawer toggle below: the panels they open belong to the
       full app, and a button that opens nothing is worse than no button. -->
  {#if !app.embed}
    <button
      class="action-btn"
      class:on={app.ui.info}
      onclick={() => (app.ui.info = !app.ui.info)}
      title="{STR.ABOUT} (I)"
      aria-label="{STR.ABOUT} (I)"
    >
      <Icon name="info" size={14} />
      <kbd>I</kbd>
    </button>
  {/if}
  {#each allActions as a (a.id)}
    <button
      class="action-btn"
      class:on={a.id === 'freeze' && !!app.ghost}
      onclick={() => runAction(a.id)}
      title={hint(a)}
      aria-label={hint(a)}
    >
      <Icon name={a.icon} size={14} />
      {#if a.shortcut}<kbd>{a.shortcut}</kbd>{/if}
    </button>
  {/each}
  {#if !app.embed}
    <button
      class="action-btn"
      class:on={app.drawer}
      onclick={() => setDrawer(!app.drawer)}
      title="{STR.PARAMETERS} (P)"
      aria-label="{STR.PARAMETERS} (P)"
    >
      <Icon name="settings" size={14} />
      <kbd>P</kbd>
    </button>
  {/if}
</div>
