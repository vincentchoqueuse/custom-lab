// Automatic experiment discovery via import.meta.glob — the core knows no
// experiment by name, and adding one never modifies the core. The registry
// applies the core defaults (convention over configuration), which are part
// of the core contract:
//   - `seed` param injected into the schema of an experiment that DECLARES
//     `random: true` — and only there. Half the catalogue draws nothing at
//     all (a Bode plot, a convolution, a pole map), and a dice button that
//     provably cannot change the picture is a promise the instrument does
//     not keep. `npm run check` proves each declaration against the import
//     graph, so neither direction can be got wrong.
//   - `type: 'float'` implicit param type, `name` defaults to the param key
//   - `actions` defaults to ['randomizeSeed', 'freeze'] for a random
//     experiment, ['freeze'] for a deterministic one
//   - `groups` absent → one flat group
//   - `scenes.js` auto-discovered and merged as `presets`; in a scene, `view`
//     defaults to the first view, `drawer` to false, `masked`/`visible` to []
//   - STANDARD FIGURES (core/figures.js) are resolved here: a view declared
//     with the `figure` factory gets its global id and its SUBJECT's title,
//     so the catalogue cannot drift into naming one plot two ways. The rule
//     is enforced both ways — see normalizeViews.

import { CATALOGUE } from './catalogue.js';
import { seedField } from './fields.js';
import { normalizeViews } from './figures.js';
import { validateScene, validateSceneIds } from './scenes.js';

export class RegistryError extends Error {
  constructor(message) {
    super(message);
    this.name = 'RegistryError';
  }
}

// resetDefaults stays in the action registry (a manifest may still declare
// it) but is out of the default toolbar: in a lecture the scene picker is
// the reset, and the button only crowded the three that matter.
const DEFAULT_ACTIONS = ['randomizeSeed', 'freeze'];
const DEFAULT_ACTIONS_DETERMINISTIC = ['freeze'];

const manifestModules = import.meta.glob('../experiments/*/*/manifest.js', { eager: true });
const sceneModules = import.meta.glob('../experiments/*/*/scenes.js', { eager: true });
const subjectModules = import.meta.glob('../experiments/*/_subject.js', { eager: true });

function pathKey(path) {
  const m = path.match(/experiments\/([^/]+)\/([^/]+)\//);
  return m ? { subject: m[1], key: `${m[1]}/${m[2]}` } : null;
}

function normalizeParams(raw, key, random) {
  const params = {};
  for (const [k, p] of Object.entries(raw ?? {})) {
    if (p === null || typeof p !== 'object')
      throw new RegistryError(`experiment '${key}': param '${k}' must be an object`);
    params[k] = { ...p };
    if (!params[k].type) params[k].type = 'float';
    if (params[k].name == null) params[k].name = k;
  }
  // Determinism is still a contract requirement — compute is pure and
  // reproducible either way. What is declared here is whether the experiment
  // draws at all: no draw, no seed, and nothing in the UI that pretends
  // otherwise.
  if (random && !params.seed) params.seed = seedField();
  if (!random && params.seed)
    throw new RegistryError(
      `experiment '${key}': declares a 'seed' param without 'random: true'. ` +
        `Add random: true, or drop the seed.`
    );
  return params;
}

function normalizeScenes(raw, manifest, key) {
  const firstView = manifest.views[0].id;
  validateSceneIds(raw, key);
  return (raw ?? []).map((s, i) => {
    validateScene(s, i, manifest, key);
    return {
      title: s.id,
      params: {},
      visible: [],
      masked: [],
      notes: '',
      view: firstView,
      drawer: false,
      lock: false, // pin the axes on arrival: for the scenes whose whole point
      //              is that the CURVE moves and the frame does not
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
  if (src.random != null && typeof src.random !== 'boolean')
    throw new RegistryError(`experiment '${loc.key}': 'random' must be a boolean`);
  const random = src.random === true;
  const params = normalizeParams(src.params, loc.key, random);
  const subjectMeta = subjectModules[`../experiments/${loc.subject}/_subject.js`]?.default ?? {};
  const views = normalizeViews(src.views, subjectMeta, loc.key);
  const manifest = {
    subtitle: '',
    tags: [],
    // What the experiment IS, in prose, for the panel that describes it (I).
    // Absent is a legitimate answer: the panel then stands on the subtitle,
    // the tags and the lecture outline, which every experiment has by
    // construction. An empty description is better than an invented one.
    doc: '',
    // Attribution. The catalogue's author is declared once (core/catalogue.js)
    // and only an experiment written by somebody else says so.
    author: CATALOGUE.author,
    // Optional, and absent by default. A demo does not go stale — a confidence
    // interval from two years ago is not out of date — so a date is written
    // only where it says something, and shown only where it is written.
    date: '',
    validate: [],
    derived: {},
    ...src,
    key: loc.key,
    subject: loc.subject,
    views,
    params,
    random,
    actions: src.actions ?? (random ? DEFAULT_ACTIONS : DEFAULT_ACTIONS_DETERMINISTIC),
    groups:
      src.groups ??
      [{ title: null, params: Object.keys(params).filter((k) => k !== 'seed') }],
  };
  manifest.presets = normalizeScenes(sceneModules[scenesPath]?.default, manifest, loc.key);
  experimentMap.set(loc.key, manifest);

  if (!subjectMap.has(loc.subject)) {
    subjectMap.set(loc.subject, {
      id: loc.subject,
      title: subjectMeta.title ?? loc.subject,
      order: subjectMeta.order ?? 99,
      experiments: [],
    });
  }
  subjectMap.get(loc.subject).experiments.push(manifest);
}

/**
 * Subjects sorted by order, each with its experiments (sidebar tree).
 * Inside a subject the manifests are ranked by their own `order` — the
 * lecture progression, not the alphabet: a catalogue of demos read in the
 * order the course meets them. An experiment that declares none lands at the
 * end, alphabetically, so adding one still requires touching nothing else.
 */
export const subjects = [...subjectMap.values()].sort((a, b) => a.order - b.order);
for (const s of subjects)
  s.experiments.sort(
    (a, b) => (a.order ?? 99) - (b.order ?? 99) || a.title.localeCompare(b.title)
  );

/** @param {string} key — 'subject/experiment' */
export function getExperiment(key) {
  return experimentMap.get(key) ?? null;
}


/** All experiments, flat, in sidebar order (command palette). */
export function allExperiments() {
  return subjects.flatMap((s) => s.experiments);
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
