<script>
  import { onMount, untrack } from 'svelte';
  import {
    app,
    initFromHash,
    validationMessage,
    runAction,
    stepPreset,
    setDrawer,
    toggleSidebar,
    toggleAxisLock,
    toggleCrosshair,
    showAllSeries,
  } from './core/store.svelte.js';
  import { schedule, onResult } from './core/worker-host.js';
  import { normalizeAll } from './core/observables.js';
  import { readPref } from './core/prefs.js';
  import { crossCheckSources } from './core/views.js';
  import { manifest } from './core/store.svelte.js';
  import Sidebar from './ui/Sidebar.svelte';
  import Header from './ui/Header.svelte';
  import Workspace from './ui/Workspace.svelte';
  import DrawerParams from './ui/DrawerParams.svelte';
  import CommandPalette from './ui/CommandPalette.svelte';
  import InfoPanel from './ui/InfoPanel.svelte';
  import Landing from './ui/Landing.svelte';
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

  /* ---------- the viewport, watched once ---------------------------------- */
  // ONE listener for the whole application. The plot canvas depends on it, and
  // a component polling window.innerWidth on its own would not re-render when
  // the phone is rotated. The breakpoint is the CSS one: the sidebar becomes a
  // drawer and the tabs become a native picker at exactly the width where the
  // wide canvas stops being worth its shape.
  $effect(() => {
    const mq = window.matchMedia('(max-width: 860px)');
    const sync = () => (app.ui.narrow = mq.matches);
    sync();
    mq.addEventListener('change', sync);
    return () => mq.removeEventListener('change', sync);
  });

  /* ---------- cosmetic prefs (localStorage: never experiment state) ------- */

  function loadPrefs() {
    const theme = readPref('theme');
    if (theme === 'light' || theme === 'dark') app.ui.theme = theme;
    // no stored preference: start collapsed on narrow screens (tablet/phone)
    const sidebarPref = readPref('sidebar');
    app.ui.sidebar = sidebarPref !== null ? sidebarPref !== '0' : window.innerWidth > 900;
    app.ui.teacher = readPref('teacher') === '1';
    app.ui.bold = readPref('bold') === '1';
    app.ui.crosshair = readPref('crosshair') === '1';
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
    // Inside an iframe the instrument keeps its plot gestures (R, F, C, A,
    // the arrows) and gives up the app panels: no palette, no sidebar, no
    // drawer, no info dialog, no fullscreen — the host page owns the screen.
    if (app.embed && ['i', 'I', 'p', 'P', 'l', 'L'].includes(e.key)) return;
    if (app.embed && mod) return;
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
    // single-letter shortcuts are inert while a text field has focus — and on
    // the landing page, where there is no experiment for them to drive
    // (Escape still closes the palette).
    if (editing || mod || e.altKey) return;
    if (!app.expKey && e.key !== 'Escape') return;
    switch (e.key) {
      case 'c':
      case 'C':
        toggleCrosshair();
        break;
      case 'i':
      case 'I':
        app.ui.info = !app.ui.info;
        break;
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
      case 'a':
      case 'A':
        toggleAxisLock();
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
        else if (app.ui.info) app.ui.info = false;
        else if (app.ui.inspector) app.ui.inspector = false;
        else if (app.ghost) app.ghost = null; // clear the freeze ghost
        // last, and only if nothing else was waiting to be closed: Esc
        // returns the screen to its plain state, so it also switches back on
        // the curves hidden from the legend
        else showAllSeries();
        break;
    }
  }
</script>

<svelte:window onkeydown={onKeydown} />

<div
  class="app"
  class:presentation={app.ui.presentation}
  class:embed={app.embed}
  data-theme={app.ui.theme}
>
  {#if !app.embed}
    <Sidebar />
  {/if}
  <div class="main">
    {#if !app.embed}
      <Header />
    {/if}
    {#if app.expKey}
      <Workspace />
    {:else}
      <Landing />
    {/if}
  </div>
  {#if !app.embed}
    <DrawerParams />
  {/if}
  {#if app.ui.palette}
    <CommandPalette />
  {/if}
  {#if app.ui.info}
    <InfoPanel />
  {/if}
  {#if app.ui.inspector}
    <Inspector />
  {/if}
</div>
