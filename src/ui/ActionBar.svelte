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
</div>
