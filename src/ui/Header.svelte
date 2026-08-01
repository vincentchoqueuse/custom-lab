<script>
  import {
    app,
    manifest,
    activeScene,
    applyPreset,
    currentHash,
  } from '../core/store.svelte.js';
  import { subjects } from '../core/registry.js';
  import { STR } from '../core/strings.js';

  let { onpresent } = $props();

  const m = $derived(manifest());
  const scene = $derived(activeScene());
  const subjectTitle = $derived(
    subjects.find((s) => s.id === m?.subject)?.title ?? m?.subject ?? ''
  );

  let menuOpen = $state(false);
  let copied = $state(false);
  let pickerEl = $state(null);
  // derived from app state (not location.hash): stays live through
  // replaceState updates, which fire no hashchange event
  const hash = $derived(m ? currentHash() : '#/');

  function pick(id) {
    applyPreset(id);
    menuOpen = false;
  }

  async function copyUrl() {
    try {
      await navigator.clipboard.writeText(location.href);
      copied = true;
      setTimeout(() => (copied = false), 1200);
    } catch {}
  }

  function onWindowPointerDown(e) {
    if (menuOpen && pickerEl && !pickerEl.contains(e.target)) menuOpen = false;
  }

  function onWindowKeydown(e) {
    if (e.key === 'Escape' && menuOpen) menuOpen = false;
  }
</script>

<svelte:window onpointerdown={onWindowPointerDown} onkeydown={onWindowKeydown} />

<header class="header">
  <div class="left">
    <span class="crumb">
      {subjectTitle} / <strong>{m?.title ?? ''}</strong>
    </span>
  </div>

  <div class="preset-picker" bind:this={pickerEl}>
    {#if m?.presets.length}
      <button onclick={() => (menuOpen = !menuOpen)} aria-haspopup="listbox">
        <span>{scene?.title ?? STR.SCENE}</span>
        <span style="color: var(--muted)">▾</span>
      </button>
      {#if menuOpen}
        <div class="menu" role="listbox">
          {#each m.presets as p, i (p.id)}
            <button class:active={p.id === app.preset} onclick={() => pick(p.id)}>
              <span class="idx">{i + 1}</span>
              <span>{p.title}</span>
            </button>
          {/each}
        </div>
      {/if}
    {/if}
  </div>

  <div class="right">
    <button class="url-chip" onclick={copyUrl} title={STR.COPY_LINK}>
      {copied ? STR.COPIED : `🔗 ${hash || '#/'}`}
    </button>
    <button class="icon-btn" onclick={onpresent} title="{STR.PRESENTATION} (L)">⛶</button>
  </div>
</header>
