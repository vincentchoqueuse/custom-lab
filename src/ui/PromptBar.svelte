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
    if (openKey && barEl && !barEl.contains(e.target)) openKey = null;
  }

  function onWindowKeydown(e) {
    if (e.key === 'Escape' && openKey) openKey = null;
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
  <div class="actions">
    {#each allActions as a (a.id)}
      <button
        class="action-btn"
        class:primary={a.id === 'randomizeSeed'}
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
</div>
