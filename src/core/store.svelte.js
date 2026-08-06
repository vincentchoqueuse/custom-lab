// Global reactive state (Svelte 5 runes) + state↔URL orchestration.
// The URL is the API: every state mutation goes through syncUrl (replaceState
// while dragging, pushState on release / discrete changes).

import { getExperiment, defaultsFor } from './registry.js';
import { parseHash, decodeQuery, encodeHash } from './router.js';
import { coreActions } from './actions.js';
import { writePref } from './prefs.js';

export const app = $state({
  expKey: null,
  // embed=1 in the query: chrome-less rendering for an iframe in a course
  // page. Set on navigation, preserved by syncUrl, never toggled from the UI.
  embed: false,
  params: {},
  view: null,
  preset: null,
  drawer: false,
  revealed: false, // revealHidden action state (per-scene black box)
  result: { status: 'idle', observables: null, message: '' },
  notice: '', // sticky lecture-guard message, cleared on next user change
  // freeze-frame ghost: SVG snapshot markup, or null. Display state ONLY —
  // never serialized in the URL (not link-reproducible, by design).
  ghost: null,
  // The READINGS at the moment of the freeze — the statline's half of the
  // ghost. A frozen picture answers "has the shape changed"; the room's next
  // question is always "by how much", and until now the old number was gone
  // the instant the slider moved. Same lifetime as the ghost, same rule:
  // display state, never in the URL. `{ observableName: value }`.
  ghostStats: null,
  // axis lock: while true, each declarative plot pins the domains it had when
  // it was switched on, so moving a parameter moves the CURVE, not the frame.
  // Display state ONLY — never in the URL, like the ghost.
  axisLock: false,
  // series hidden by a click on their legend chip. An array of LABELS, because
  // that is what the legend displays and therefore what the user clicks.
  // Display state ONLY — like the ghost and the axis lock: showing one curve
  // alone is a demonstration gesture, not a state to find again in a link.
  hidden: [],
  ui: {
    sidebar: true,
    theme: 'light',
    teacher: false,
    presentation: false,
    palette: false,
    inspector: false,
    info: false, // the panel describing the experiment (I)
    // The crosshair readout, OFF until asked for. It was pointer-only and
    // therefore invisible: nothing on screen said it existed, it does nothing
    // on the equal-aspect planes or in a custom view, and it ignored touch
    // entirely — three different ways to look broken. A switch says the
    // feature is there, says whether it is on, and is the user asking for it,
    // which is also what makes it safe to track a FINGER: capturing touch
    // stops the page scrolling under the plot, and that is a trade only
    // somebody who wants the readout should make.
    crosshair: false,
    settings: false,
    bold: false, // permanent thick-strokes preference (projection without fullscreen)
    // Viewport below the mobile breakpoint, which picks the plot canvas
    // (ui/plots/frame.js). A FACT about the device, not a preference: never in
    // localStorage, never in the URL, and held here rather than read from
    // `window` inside a plot, so that a figure stays a pure function of its
    // inputs — the freeze ghost and the SVG export both clone it.
    narrow: false,
  },
});

let lastWritten = null;
let dragStartHash = null;

// The ghost needs the rendered SVG at freeze time; DOM access belongs to the
// UI, so PlotFrame registers a capturer and the freeze action calls it.
let ghostCapturer = null;

export function registerGhostCapturer(fn) {
  ghostCapturer = fn;
}

/* ---------- derived accessors (plain functions: they read reactive state) */

export function manifest() {
  return app.expKey ? getExperiment(app.expKey) : null;
}

export function activeScene() {
  const m = manifest();
  return m?.presets.find((p) => p.id === app.preset) ?? null;
}

/** Prompt Bar pills: the active scene's `visible` params. */
export function visiblePills() {
  const m = manifest();
  if (!m) return [];
  const s = activeScene();
  const list = s?.visible?.length
    ? s.visible
    : m.presets[0]?.visible?.length
      ? m.presets[0].visible
      : Object.keys(m.params)
          .filter((k) => k !== 'seed' && m.params[k].type !== 'readonly')
          .slice(0, 3);
  return list.filter((k) => m.params[k]);
}

/** Currently masked params (black box), empty once revealed. */
export function maskedSet() {
  const s = activeScene();
  return new Set(app.revealed ? [] : (s?.masked ?? []));
}

/** First failing validate rule message, or null. Blocks computation, not input. */
export function validationMessage() {
  const m = manifest();
  if (!m?.validate?.length) return null;
  for (const rule of m.validate) {
    try {
      if (rule.when(app.params)) return rule.message;
    } catch {
      // a broken rule never blocks the lecture
    }
  }
  return null;
}

/** Manifest actions resolved against the core registry (unknown ids skipped). */
export function manifestActions() {
  const m = manifest();
  return (m?.actions ?? []).map((id) => coreActions[id]).filter(Boolean);
}

/* ---------- state application -------------------------------------------- */

/** Base values for the active scene: manifest defaults + scene params. */
function sceneBase(m, scene) {
  return { ...defaultsFor(m), ...(scene?.params ?? {}) };
}

export function currentHash() {
  const m = manifest();
  if (!m) return '#/';
  const scene = activeScene();
  return encodeHash(app.expKey, {
    embed: app.embed,
    params: app.params,
    base: sceneBase(m, scene),
    paramSpecs: m.params,
    view: app.view,
    defaultView: scene?.view ?? m.views[0].id,
    preset: app.preset,
    defaultPreset: m.presets[0]?.id ?? null,
    drawer: app.drawer,
    defaultDrawer: scene?.drawer ?? false,
  });
}

export function syncUrl(push = true) {
  const hash = currentHash();
  if (hash === location.hash) return;
  lastWritten = hash;
  if (push) location.hash = hash;
  else history.replaceState(null, '', hash);
}

/** Decode the current hash into full app state (deep-link restore). */
function handleHash() {
  if (location.hash === lastWritten) return;
  const { path, query } = parseHash(location.hash);
  // THE LANDING PAGE. An empty path used to redirect to the first experiment,
  // which hid the catalogue behind one statistics demo; an unknown path used
  // to do the same, which sent a broken shared link somewhere arbitrary. Both
  // now land on the catalogue itself — the honest fallback, since it lets the
  // reader choose instead of choosing for them.
  const expKey = getExperiment(path) ? path : null;
  if (!expKey) {
    app.expKey = null;
    app.embed = false;
    app.preset = null;
    app.ui.info = false;
    app.ghost = null;
    app.ghostStats = null;
    app.hidden = [];
    app.notice = '';
    app.result = { status: 'idle', observables: null, message: '' };
    return;
  }
  const m = getExperiment(expKey);
  const dec = decodeQuery(query, m);
  // Scene defaults to the first preset — the nominal lecture opening.
  const presetId = dec.preset ?? m.presets[0]?.id ?? null;
  const scene = m.presets.find((p) => p.id === presetId) ?? null;
  app.expKey = expKey;
  app.embed = dec.embed ?? false;
  app.preset = presetId;
  app.params = { ...sceneBase(m, scene), ...dec.params };
  app.view = dec.view ?? scene?.view ?? m.views[0].id;
  app.drawer = dec.drawer ?? scene?.drawer ?? false;
  app.revealed = false;
  app.notice = '';
  app.ghost = null;
  app.ghostStats = null;
  // The info panel describes THIS experiment; arriving at another one with a
  // wall of text over its plot is not what clicking a sidebar entry asked for.
  // In-app param changes never reach here (syncUrl short-circuits), so this
  // closes it on navigation and on nothing else.
  app.ui.info = false;
  app.axisLock = scene?.lock ?? false;
  app.hidden = [];
  app.result = { status: 'idle', observables: null, message: '' };
  syncUrl(false); // normalize whatever was typed by hand
}

export function initFromHash() {
  handleHash();
  window.addEventListener('hashchange', handleHash);
}

/* ---------- mutations ----------------------------------------------------- */

export function navigate(expKey) {
  lastWritten = null;
  location.hash = `#/${expKey}`;
}

export function setParam(key, value, push = true) {
  app.params[key] = value;
  app.notice = '';
  syncUrl(push);
}

/** replaceState while dragging, one pushState entry on release. */
export function beginDrag() {
  if (dragStartHash === null) dragStartHash = location.hash;
}

export function endDrag() {
  if (dragStartHash === null) return;
  const target = currentHash();
  if (target !== dragStartHash) {
    history.replaceState(null, '', dragStartHash);
    lastWritten = target;
    location.hash = target;
  }
  dragStartHash = null;
}

/** One click applies the full scene (params, view, pills, drawer, notes). */
export function applyPreset(id, push = true) {
  const m = manifest();
  const scene = m?.presets.find((p) => p.id === id);
  if (!scene) return;
  app.preset = id;
  app.params = sceneBase(m, scene);
  app.view = scene.view;
  app.drawer = scene.drawer;
  app.axisLock = scene.lock; // display state, like the ghost — never in the URL
  app.hidden = [];
  app.revealed = false;
  app.notice = '';
  syncUrl(push);
}

/** ←/→: the preset list IS the lecture script (clamped, not cyclic). */
export function stepPreset(dir) {
  const m = manifest();
  if (!m?.presets.length) return;
  const i = m.presets.findIndex((p) => p.id === app.preset);
  const j = Math.max(0, Math.min(m.presets.length - 1, i < 0 ? 0 : i + dir));
  if (i !== j) applyPreset(m.presets[j].id);
}

export function toggleAxisLock() {
  app.axisLock = !app.axisLock;
}

/**
 * Hide or show a series from its legend chip.
 *
 * By LABEL and not by index: two curves carrying the same name are the same
 * quantity, and switching them off together is what is wanted. It is also what
 * keeps the gesture stable when a layer disappears because the current
 * parameters do not produce it.
 */
export function toggleSeries(label) {
  app.hidden = app.hidden.includes(label)
    ? app.hidden.filter((l) => l !== label)
    : [...app.hidden, label];
}

/** Show everything again — called when the view changes, and by Esc. */
export function showAllSeries() {
  if (app.hidden.length) app.hidden = [];
}

export function setView(id) {
  app.view = id;
  app.ghost = null; // a ghost from another view would be a misleading overlay
  app.ghostStats = null;
  app.axisLock = false; // another view's frame means nothing here
  app.hidden = []; // another view's labels have nothing to hide here
  syncUrl(true);
}

export function setDrawer(open) {
  app.drawer = open;
  syncUrl(true);
}

/** Collapse/expand the sidebar (⌘B, sidebar and header toggle buttons). */
export function toggleSidebar() {
  app.ui.sidebar = !app.ui.sidebar;
  writePref('sidebar', app.ui.sidebar ? '1' : '0');
}

/* ---------- actions ------------------------------------------------------- */

const actionApi = {
  params: () => app.params,
  setParam: (k, v) => setParam(k, v, true),
  resetDefaults: () => {
    const m = manifest();
    app.params = sceneBase(m, activeScene());
    app.notice = '';
    syncUrl(true);
  },
  reveal: () => {
    app.revealed = true;
  },
  toggleFreeze: () => {
    if (app.ghost) {
      app.ghost = null;
      app.ghostStats = null;
      return;
    }
    app.ghost = ghostCapturer?.() ?? null;
    // The numbers are snapshotted HERE and not by the capturer: they are
    // already in the store, and reading them from the DOM would freeze the
    // formatting rather than the value.
    app.ghostStats = app.ghost ? snapshotReadings() : null;
  },
};

/** The scalar and text readings, by observable name — what the statline shows. */
function snapshotReadings() {
  const out = {};
  for (const [k, o] of Object.entries(app.result.observables ?? {}))
    if ((o.type === 'scalar' || o.type === 'text') && o.meta?.label) out[k] = o.value;
  return out;
}

export function toggleTeacher() {
  app.ui.teacher = !app.ui.teacher;
  writePref('teacher', app.ui.teacher ? '1' : '0');
}

export function toggleCrosshair() {
  app.ui.crosshair = !app.ui.crosshair;
  writePref('crosshair', app.ui.crosshair ? '1' : '0');
}

export function runAction(id) {
  // An experiment that declares no seed has no randomizeSeed button — and
  // must not answer R either, or the shortcut would silently bump a param
  // that does not exist. The view bar and the keyboard obey the same list.
  const m = manifest();
  if (!m?.actions?.includes(id)) return;
  const a = coreActions[id];
  if (a) a.run(actionApi);
}
