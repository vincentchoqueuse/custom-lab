// Automatic experiment discovery via import.meta.glob — the core knows no
// experiment by name, and adding one never modifies the core. The registry
// applies the core defaults (convention over configuration), which are part
// of the core contract:
//   - `seed` param injected into every schema
//   - `type: 'float'` implicit param type, `name` defaults to the param key
//   - `actions` defaults to ['randomizeSeed', 'freeze', 'resetDefaults']
//   - `groups` absent → one flat group (params AND, in the sidebar, the
//     experiments of a subject: an optional `group` key on a manifest files
//     it under a display heading, `groups` in _subject.js fixes their order)
//   - `scenes.js` auto-discovered and merged as `presets`; in a scene, `view`
//     defaults to the first view, `drawer` to false, `masked`/`visible` to []

import { seedField } from './fields.js';

export class RegistryError extends Error {
  constructor(message) {
    super(message);
    this.name = 'RegistryError';
  }
}

const DEFAULT_ACTIONS = ['randomizeSeed', 'freeze', 'resetDefaults'];

const manifestModules = import.meta.glob('../experiments/*/*/manifest.js', { eager: true });
const sceneModules = import.meta.glob('../experiments/*/*/scenes.js', { eager: true });
const subjectModules = import.meta.glob('../experiments/*/_subject.js', { eager: true });

function pathKey(path) {
  const m = path.match(/experiments\/([^/]+)\/([^/]+)\//);
  return m ? { subject: m[1], key: `${m[1]}/${m[2]}` } : null;
}

function normalizeParams(raw, key) {
  const params = {};
  for (const [k, p] of Object.entries(raw ?? {})) {
    if (p === null || typeof p !== 'object')
      throw new RegistryError(`experiment '${key}': param '${k}' must be an object`);
    params[k] = { ...p };
    if (!params[k].type) params[k].type = 'float';
    if (params[k].name == null) params[k].name = k;
  }
  if (!params.seed) params.seed = seedField();
  return params;
}

function normalizeScenes(raw, manifest, key) {
  const firstView = manifest.views[0].id;
  return (raw ?? []).map((s, i) => {
    if (!s.id) throw new RegistryError(`experiment '${key}': scene #${i} needs an id`);
    return {
      title: s.id,
      params: {},
      visible: [],
      masked: [],
      notes: '',
      view: firstView,
      drawer: false,
      ...s,
    };
  });
}

const experimentMap = new Map();
const subjectMap = new Map();

for (const [path, mod] of Object.entries(manifestModules)) {
  const loc = pathKey(path);
  if (!loc) continue;
  const src = mod.default;
  if (!src?.id) throw new RegistryError(`manifest at '${path}' has no id`);
  if (!Array.isArray(src.views) || src.views.length === 0)
    throw new RegistryError(`experiment '${loc.key}': at least one view is required`);

  const scenesPath = path.replace(/manifest\.js$/, 'scenes.js');
  const params = normalizeParams(src.params, loc.key);
  const manifest = {
    subtitle: '',
    tags: [],
    validate: [],
    derived: {},
    ...src,
    key: loc.key,
    subject: loc.subject,
    params,
    actions: src.actions ?? DEFAULT_ACTIONS,
    groups:
      src.groups ??
      [{ title: null, params: Object.keys(params).filter((k) => k !== 'seed') }],
  };
  manifest.presets = normalizeScenes(sceneModules[scenesPath]?.default, manifest, loc.key);
  experimentMap.set(loc.key, manifest);

  if (!subjectMap.has(loc.subject)) {
    const meta = subjectModules[`../experiments/${loc.subject}/_subject.js`]?.default ?? {};
    subjectMap.set(loc.subject, {
      id: loc.subject,
      title: meta.title ?? loc.subject,
      order: meta.order ?? 99,
      groupOrder: meta.groups ?? [],
      experiments: [],
    });
  }
  subjectMap.get(loc.subject).experiments.push(manifest);
}

/**
 * Display groups inside a subject: declared order first (from _subject.js),
 * then any others in first-seen order; ungrouped experiments open the list
 * under a headingless group. A subject where nobody declares a `group`
 * yields exactly one flat group — the sidebar then renders as before.
 */
function buildGroups(subject) {
  const titles = [];
  for (const t of subject.groupOrder) {
    if (subject.experiments.some((e) => e.group === t)) titles.push(t);
  }
  for (const e of subject.experiments) {
    if (e.group && !titles.includes(e.group)) titles.push(e.group);
  }
  const loose = subject.experiments.filter((e) => !e.group);
  const groups = titles.map((title) => ({
    title,
    experiments: subject.experiments.filter((e) => e.group === title),
  }));
  if (loose.length || groups.length === 0) groups.unshift({ title: null, experiments: loose });
  return groups;
}

/** Subjects sorted by order, each with its experiments (sidebar tree). */
export const subjects = [...subjectMap.values()].sort((a, b) => a.order - b.order);
for (const s of subjects) {
  s.experiments.sort((a, b) => a.title.localeCompare(b.title));
  s.groups = buildGroups(s);
}

/** @param {string} key — 'subject/experiment' */
export function getExperiment(key) {
  return experimentMap.get(key) ?? null;
}

export function firstExperimentKey() {
  return subjects[0]?.experiments[0]?.key ?? null;
}

/** All experiments, flat (command palette). */
export function allExperiments() {
  return [...experimentMap.values()];
}

/** Manifest defaults — readonly params carry no value and are skipped. */
export function defaultsFor(manifest) {
  const out = {};
  for (const [k, p] of Object.entries(manifest.params)) {
    if (p.type === 'readonly') continue;
    out[k] = p.default;
  }
  return out;
}
