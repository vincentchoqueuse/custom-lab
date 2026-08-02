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
  import QrCode from './QrCode.svelte';

  let { onpresent } = $props();

  const m = $derived(manifest());
  const scene = $derived(activeScene());
  const subjectTitle = $derived(
    subjects.find((s) => s.id === m?.subject)?.title ?? m?.subject ?? ''
  );

  let menuOpen = $state(false);
  let qrOpen = $state(false);
  let copied = $state(false);
  let pickerEl = $state(null);
  let qrEl = $state(null);

  // live through replaceState updates (no hashchange event while dragging)
  const hash = $derived(m ? currentHash() : '#/');
  const href = $derived(
    typeof location === 'undefined' ? hash : location.origin + location.pathname + hash
  );

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
    if (qrOpen && qrEl && !qrEl.contains(e.target)) qrOpen = false;
  }

  function onWindowKeydown(e) {
    if (e.key === 'Escape') {
      menuOpen = false;
      qrOpen = false;
    }
  }
</script>

<svelte:window onpointerdown={onWindowPointerDown} onkeydown={onWindowKeydown} />

<header class="header">
  <div class="left">
    {#if !app.ui.sidebar}
      <!-- mobile only (CSS): on desktop the collapsed rail carries the toggle -->
      <button class="icon-btn side-open" onclick={toggleSidebar} title="{STR.COLLAPSE_SIDEBAR} (⌘B)">
        <Icon name="panel-left" size={15} />
      </button>
    {/if}
    <span class="crumb">
      {subjectTitle} / <strong>{m?.title ?? ''}</strong>
    </span>
  </div>

  <div class="right">
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
    <button class="icon-btn copy-btn" onclick={copyUrl} title={STR.COPY_LINK}>
      <Icon name={copied ? 'check' : 'link'} size={15} />
    </button>
    <!-- QR of the scene URL — stays available in presentation mode, where a
         lecture hall scans it from the projector -->
    <div class="qr-anchor" bind:this={qrEl}>
      <button class="icon-btn" class:on={qrOpen} onclick={() => (qrOpen = !qrOpen)} title={STR.QR_CODE}>
        <Icon name="qr-code" size={15} />
      </button>
      {#if qrOpen}
        <div class="qr-popover" role="dialog" aria-label={STR.QR_CODE}>
          <QrCode text={href} size={236} />
          <span class="qr-url mono">{hash}</span>
        </div>
      {/if}
    </div>
    <a class="icon-btn" href={STR.REPO_URL} target="_blank" rel="noopener" title={STR.GITHUB}>
      <Icon name="github" size={15} />
    </a>
    <button class="icon-btn" onclick={onpresent} title="{STR.PRESENTATION} (L)">
      <Icon name="maximize" size={15} />
    </button>
  </div>
</header>
