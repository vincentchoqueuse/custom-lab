// Global reactive state (Svelte 5 runes) + state↔URL orchestration.
// The URL is the API: every state mutation goes through syncUrl (replaceState
// while dragging, pushState on release / discrete changes).

import { getExperiment, firstExperimentKey, defaultsFor } from './registry.js';
import { parseHash, decodeQuery, encodeHash } from './router.js';
import { coreActions } from './actions.js';

export const app = $state({
  expKey: null,
  params: {},
  view: null,
  preset: null,
  drawer: false,
  revealed: false, // revealHidden action state (per-scene black box)
  result: { status: 'idle', observables: null, message: '' },
  notice: '', // sticky lecture-guard message, cleared on next user change
  ui: {
    sidebar: true,
    theme: 'light',
    teacher: false,
    presentation: false,
    palette: false,
    inspector: false,
  },
});

let lastWritten = null;
let dragStartHash = null;

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
  const expKey = getExperiment(path) ? path : firstExperimentKey();
  if (!expKey) return;
  const m = getExperiment(expKey);
  const dec = decodeQuery(query, m);
  // Scene defaults to the first preset — the nominal lecture opening.
  const presetId = dec.preset ?? m.presets[0]?.id ?? null;
  const scene = m.presets.find((p) => p.id === presetId) ?? null;
  app.expKey = expKey;
  app.preset = presetId;
  app.params = { ...sceneBase(m, scene), ...dec.params };
  app.view = dec.view ?? scene?.view ?? m.views[0].id;
  app.drawer = dec.drawer ?? scene?.drawer ?? false;
  app.revealed = false;
  app.notice = '';
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

export function setView(id) {
  app.view = id;
  syncUrl(true);
}

export function setDrawer(open) {
  app.drawer = open;
  syncUrl(true);
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
};

export function runAction(id) {
  const a = coreActions[id];
  if (a) a.run(actionApi);
}
