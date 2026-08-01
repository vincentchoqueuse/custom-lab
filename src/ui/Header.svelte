<script>
  import {
    app,
    manifest,
    activeScene,
    applyPreset,
    currentHash,
    toggleSidebar,
  } from '../core/store.svelte.js';
  import { subjects } from '../core/registry.js';
  import { STR } from '../core/strings.js';
  import Icon from './Icon.svelte';

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
    {#if !app.ui.sidebar}
      <button class="icon-btn" onclick={toggleSidebar} title="{STR.COLLAPSE_SIDEBAR} (⌘B)">
        <Icon name="panel-left" size={15} />
      </button>
    {/if}
    <span class="crumb">
      {subjectTitle} / <strong>{m?.title ?? ''}</strong>
    </span>
  </div>

  <div class="preset-picker" bind:this={pickerEl}>
    {#if m?.presets.length}
      <button onclick={() => (menuOpen = !menuOpen)} aria-haspopup="listbox">
        <span>{scene?.title ?? STR.SCENE}</span>
        <Icon name="chevron-down" size={14} />
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
      <Icon name={copied ? 'check' : 'link'} size={13} />
      <span class="txt">{copied ? STR.COPIED : hash || '#/'}</span>
    </button>
    <a class="icon-btn" href={STR.REPO_URL} target="_blank" rel="noopener" title={STR.GITHUB}>
      <Icon name="github" size={15} />
    </a>
    <button class="icon-btn" onclick={onpresent} title="{STR.PRESENTATION} (L)">
      <Icon name="maximize" size={15} />
    </button>
  </div>
</header>
