<script>
  // The Prompt Bar — where a chatbot puts its input box. Pills = the active
  // scene's priority params; clicking one opens a NON-modal popover above it
  // (the plot stays fully visible while dragging). Right side: the manifest's
  // actions, then the Parameters drawer toggle.
  import {
    app,
    manifest,
    visiblePills,
    maskedSet,
    manifestActions,
    runAction,
    setDrawer,
  } from '../core/store.svelte.js';
  import { STR } from '../core/strings.js';
  import { formatValue } from '../core/scales.js';
  import ParamControl from './ParamControl.svelte';
  import Icon from './Icon.svelte';

  const m = $derived(manifest());
  const pills = $derived(visiblePills());
  const masked = $derived(maskedSet());
  const actions = $derived(
    manifestActions().filter((a) => a.id !== 'revealHidden' || masked.size > 0)
  );
  const hasMasked = $derived(masked.size > 0);
  const allActions = $derived(
    hasMasked && !actions.some((a) => a.id === 'revealHidden')
      ? [...actions, { id: 'revealHidden', icon: 'eye', label: STR.ACTION_REVEAL }]
      : actions
  );

  let openKey = $state(null);
  let moreOpen = $state(false); // mobile "⋯" menu (secondary actions + Parameters)
  let barEl = $state(null);

  function pillText(key) {
    const spec = m.params[key];
    if (masked.has(key)) return `${spec.name} = ?`;
    if (spec.type === 'select') {
      const opt = spec.options.find((o) => o.value === app.params[key]);
      return `${spec.name} = ${opt?.label ?? app.params[key]}`;
    }
    const precision = spec.precision ?? (spec.type === 'int' ? 0 : undefined);
    const unit = spec.unit ? ` ${spec.unit}` : '';
    return `${spec.name} = ${formatValue(app.params[key], precision)}${unit}`;
  }

  function toggle(key) {
    if (masked.has(key)) return; // black box: no editing until revealed
    openKey = openKey === key ? null : key;
  }

  function onWindowPointerDown(e) {
    if ((openKey || moreOpen) && barEl && !barEl.contains(e.target)) {
      openKey = null;
      moreOpen = false;
    }
  }

  function onWindowKeydown(e) {
    if (e.key === 'Escape' && (openKey || moreOpen)) {
      openKey = null;
      moreOpen = false;
    }
  }

  function runFromMenu(id) {
    moreOpen = false;
    runAction(id);
  }
</script>

<svelte:window onpointerdown={onWindowPointerDown} onkeydown={onWindowKeydown} />

<div class="promptbar" bind:this={barEl}>
  <div class="pills">
    {#each pills as key (key)}
      <span class="pill-wrap">
        <button
          class="pill"
          class:open={openKey === key}
          onclick={() => toggle(key)}
          title={masked.has(key) ? STR.MASKED_HINT : (m.params[key].description ?? '')}
        >
          <span class="dim"><Icon name="sliders" size={13} /></span>
          {pillText(key)}
        </button>
        {#if openKey === key}
          <div class="popover" role="dialog">
            <ParamControl {key} spec={m.params[key]} />
          </div>
        {/if}
      </span>
    {/each}
  </div>
  <div class="actions actions-full">
    {#each allActions as a (a.id)}
      <button
        class="action-btn"
        class:on={a.id === 'freeze' && !!app.ghost}
        onclick={() => runAction(a.id)}
      >
        <Icon name={a.icon} size={14} />
        <span>{a.label}</span>
        {#if a.shortcut}<kbd>{a.shortcut}</kbd>{/if}
      </button>
    {/each}
    <button class="action-btn" onclick={() => setDrawer(!app.drawer)}>
      <Icon name="settings" size={14} />
      <span>{STR.PARAMETERS}</span>
      <kbd>P</kbd>
    </button>
  </div>
  <!-- mobile: the primary action stays under the thumb, the rest folds into
       a "⋯" menu (same non-modal, above-the-bar pattern as the popovers) -->
  <div class="actions actions-compact">
    {#if allActions.length > 0}
      <button
        class="action-btn icon-only"
        onclick={() => runAction(allActions[0].id)}
        title={allActions[0].label}
        aria-label={allActions[0].label}
      >
        <Icon name={allActions[0].icon} size={16} />
      </button>
    {/if}
    <span class="more-wrap">
      <button
        class="action-btn icon-only"
        class:on={moreOpen}
        onclick={() => (moreOpen = !moreOpen)}
        title={STR.MORE_ACTIONS}
        aria-label={STR.MORE_ACTIONS}
        aria-expanded={moreOpen}
      >
        <Icon name="more-horizontal" size={16} />
      </button>
      {#if moreOpen}
        <div class="more-menu" role="menu">
          {#each allActions.slice(1) as a (a.id)}
            <button
              class="more-item"
              class:on={a.id === 'freeze' && !!app.ghost}
              role="menuitem"
              onclick={() => runFromMenu(a.id)}
            >
              <Icon name={a.icon} size={15} />
              <span>{a.label}</span>
            </button>
          {/each}
          <button
            class="more-item"
            role="menuitem"
            onclick={() => {
              moreOpen = false;
              setDrawer(!app.drawer);
            }}
          >
            <Icon name="settings" size={15} />
            <span>{STR.PARAMETERS}</span>
          </button>
        </div>
      {/if}
    </span>
  </div>
</div>
