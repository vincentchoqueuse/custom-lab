<script>
  import { onMount, untrack } from 'svelte';
  import {
    app,
    initFromHash,
    validationMessage,
    runAction,
    stepPreset,
    setDrawer,
  } from './core/store.svelte.js';
  import { schedule, onResult } from './core/worker-host.js';
  import { normalizeAll } from './core/observables.js';
  import { readPref, writePref } from './core/prefs.js';
  import { crossCheckSources } from './core/views.js';
  import { manifest } from './core/store.svelte.js';
  import Sidebar from './ui/Sidebar.svelte';
  import Header from './ui/Header.svelte';
  import Workspace from './ui/Workspace.svelte';
  import DrawerParams from './ui/DrawerParams.svelte';
  import CommandPalette from './ui/CommandPalette.svelte';
  import Inspector from './ui/Inspector.svelte';

  const crossChecked = new Set();

  function handleResult(res) {
    if (res.status === 'ok') {
      if (res.expKey !== app.expKey) return; // result for a page we left
      app.result = { status: 'ok', observables: normalizeAll(res.observables), message: '' };
      if (import.meta.env.DEV && !crossChecked.has(res.expKey)) {
        crossChecked.add(res.expKey);
        crossCheckSources(manifest(), app.result.observables, app.params);
      }
    } else if (res.status === 'computing') {
      app.result = { ...app.result, status: 'computing' };
    } else if (res.status === 'error') {
      app.result = { ...app.result, status: 'error', message: res.message };
    } else if (res.status === 'aborted') {
      app.result = { ...app.result, status: 'aborted', message: res.message };
      app.notice = res.message;
      // Lecture guard: restore the last valid params so the lecture goes on.
      if (res.lastValidParams) Object.assign(app.params, res.lastValidParams);
    }
  }

  onMount(() => {
    loadPrefs();
    onResult(handleResult);
    initFromHash();
    const onFs = () => {
      if (!document.fullscreenElement) app.ui.presentation = false;
    };
    document.addEventListener('fullscreenchange', onFs);
    return () => document.removeEventListener('fullscreenchange', onFs);
  });

  // compute pipeline: any param/experiment change reschedules (30 Hz throttled)
  $effect(() => {
    const key = app.expKey;
    if (!key) return;
    const params = $state.snapshot(app.params);
    const invalid = validationMessage();
    if (invalid) {
      // An invalid state blocks computation (not input) and shows the message.
      // untrack: reading app.result here must not make this effect re-run on
      // its own write (infinite loop).
      const prev = untrack(() => app.result);
      app.result = { ...prev, status: 'invalid', message: invalid };
      return;
    }
    schedule(key, params);
  });

  /* ---------- cosmetic prefs (localStorage: never experiment state) ------- */

  function loadPrefs() {
    const theme = readPref('theme');
    if (theme === 'light' || theme === 'dark') app.ui.theme = theme;
    app.ui.sidebar = readPref('sidebar') !== '0';
    app.ui.teacher = readPref('teacher') === '1';
  }

  function toggleSidebar() {
    app.ui.sidebar = !app.ui.sidebar;
    writePref('sidebar', app.ui.sidebar ? '1' : '0');
  }

  async function togglePresentation() {
    if (!document.fullscreenElement) {
      try {
        await document.documentElement.requestFullscreen();
      } catch {
        /* fullscreen may be denied: scale anyway */
      }
      app.ui.presentation = true;
    } else {
      document.exitFullscreen?.();
      app.ui.presentation = false;
    }
  }

  /* ---------- keyboard (canonical table in CLAUDE.md) --------------------- */

  function onKeydown(e) {
    const t = e.target;
    const editing =
      t &&
      (t.tagName === 'INPUT' ||
        t.tagName === 'TEXTAREA' ||
        t.tagName === 'SELECT' ||
        t.isContentEditable);
    const mod = e.metaKey || e.ctrlKey;
    if (mod && (e.key === 'k' || e.key === 'K')) {
      e.preventDefault();
      app.ui.palette = !app.ui.palette;
      return;
    }
    if (mod && (e.key === 'b' || e.key === 'B')) {
      e.preventDefault();
      toggleSidebar();
      return;
    }
    // single-letter shortcuts are inert while a text field has focus
    if (editing || mod || e.altKey) return;
    switch (e.key) {
      case 'p':
      case 'P':
        setDrawer(!app.drawer);
        break;
      case 'r':
      case 'R':
        runAction('randomizeSeed');
        break;
      case 'f':
      case 'F':
        runAction('freeze');
        break;
      case 'l':
      case 'L':
        togglePresentation();
        break;
      case 'ArrowLeft':
        stepPreset(-1);
        break;
      case 'ArrowRight':
        stepPreset(1);
        break;
      case 'Escape':
        // popovers and the palette close themselves; fullscreen exits natively
        if (app.ui.palette) app.ui.palette = false;
        else if (app.ui.inspector) app.ui.inspector = false;
        else if (app.ghost) app.ghost = null; // clear the freeze ghost
        break;
    }
  }
</script>

<svelte:window onkeydown={onKeydown} />

<div
  class="app"
  class:presentation={app.ui.presentation}
  data-theme={app.ui.theme}
>
  <Sidebar />
  <div class="main">
    <Header onpresent={togglePresentation} />
    <Workspace />
  </div>
  <DrawerParams />
  {#if app.ui.palette}
    <CommandPalette />
  {/if}
  {#if app.ui.inspector}
    <Inspector />
  {/if}
</div>
