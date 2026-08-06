// The vocabulary of a SCENE, and its validation — the counterpart of
// core/figures.js for the other half of the declarative contract.
//
// A scene is pure data: across the 198 scenes of the catalogue, not one holds
// a function. Its whole shape is therefore checkable, and it is checked —
// because the only defect a scene can have is a TYPO, and a silent typo is the
// worst kind.
// `visble: ['N']` did nothing at all, silently, and it was discovered in front
// of the students.
//
// Six things are checked, all at load time (and repeated by `npm run check`,
// so before a browser is even opened):
//   · the key exists, and carries the right type;
//   · the view the scene opens on exists;
//   · that view is STATED, once the experiment has more than two of them;
//   · the parameters it sets exist;
//   · the pills it shows or masks exist;
//   · no two scenes of one experiment answer to the same id.
//
// PURE: no DOM, no state, no glob.

export class SceneError extends Error {
  constructor(message) {
    super(message);
    this.name = 'SceneError';
  }
}

/** The CLOSED list of a scene's keys, with the expected type. */
export const SCENE_KEYS = Object.freeze({
  id: 'string',
  title: 'string',
  params: 'object',
  visible: 'array',
  masked: 'array',
  notes: 'string',
  view: 'string',
  drawer: 'boolean',
  lock: 'boolean',
});

/** The Prompt Bar holds only the active scene's `visible` params. */
const PILLS_MIN = 2;
const PILLS_MAX = 4;

const typeOf = (v) => (Array.isArray(v) ? 'array' : typeof v);

/**
 * @param {object} s        the scene as written in scenes.js
 * @param {number} i        its rank, to name a scene that has no id
 * @param {{views: Array, params: object}} manifest
 * @param {string} key      'subject/experiment', for the error message
 */
export function validateScene(s, i, manifest, key) {
  if (!s || typeof s !== 'object') throw new SceneError(`experiment '${key}': scene #${i} must be an object`);
  if (!s.id) throw new SceneError(`experiment '${key}': scene #${i} needs an id`);
  const where = `experiment '${key}', scene '${s.id}'`;

  for (const [k, v] of Object.entries(s)) {
    const want = SCENE_KEYS[k];
    if (!want)
      throw new SceneError(
        `${where}: unknown key '${k}' (known: ${Object.keys(SCENE_KEYS).join(', ')})`
      );
    if (typeOf(v) !== want)
      throw new SceneError(`${where}: key '${k}' must be a ${want}, got ${typeOf(v)}`);
  }

  const viewIds = new Set(manifest.views.map((v) => v.id));
  if (s.view && !viewIds.has(s.view))
    throw new SceneError(
      `${where}: opens on view '${s.view}', which does not exist (${[...viewIds].join(', ')})`
    );

  // Beyond two views, `view` stops being optional. The default — open on the
  // first one — is a fine convention for an experiment that has a main figure
  // and a companion, and a trap for one that has four: adding a view at the
  // FRONT then silently moves every scene that relied on the default, and the
  // scene lands on a figure its notes do not describe. That happened here, on
  // the OFDM experiment, when two time views were put ahead of the channel
  // one; nothing failed, the lecture just opened on the wrong picture. So a
  // scene of a 3-view experiment says where it opens, and reordering the tabs
  // becomes what it should be — a change to the tab grammar and to nothing
  // else.
  if (manifest.views.length >= 3 && !s.view)
    throw new SceneError(
      `${where}: must declare the view it opens on — the experiment has ` +
        `${manifest.views.length} views (${[...viewIds].join(', ')}), and beyond two ` +
        `the "first view" default silently follows any reordering`
    );

  // The registry injects `seed` into a RANDOM experiment's schema, so a
  // scene of one may set it without the manifest declaring it. A
  // deterministic experiment has no seed at all, and a scene naming one is
  // a leftover to be caught here rather than a value that quietly does
  // nothing.
  const params = new Set([
    ...Object.keys(manifest.params ?? {}),
    ...(manifest.random ? ['seed'] : []),
  ]);
  for (const list of ['visible', 'masked'])
    for (const p of s[list] ?? [])
      if (!params.has(p)) throw new SceneError(`${where}: ${list} names '${p}', which is not a param`);

  // HOW MANY PILLS A SCENE EXPOSES, and it is a range rather than a maximum.
  //
  // ONE is the interesting bound. A single pill is a slider, not a scene: the
  // room can turn it but cannot COMPARE, and comparison is what a demonstration
  // is for — the second pill is what lets someone ask "and if N were larger
  // while σ stays put?". A scene that honestly turns one dial still needs the
  // quantity the room will suspect of doing the work, so that holding it still
  // is visibly a choice. Seventy-one scenes were in that state.
  //
  // Past four the Prompt Bar stops being readable from the back of a room, and
  // the drawer (P) exists for everything else.
  const nPills = (s.visible ?? []).length;
  if (nPills < PILLS_MIN || nPills > PILLS_MAX)
    throw new SceneError(
      `${where}: ${nPills} pill${nPills === 1 ? '' : 's'} in visible — ` +
        `${PILLS_MIN} to ${PILLS_MAX}. ` +
        (nPills < PILLS_MIN
          ? 'One dial can be turned but not compared: add the parameter the room will want held fixed.'
          : 'Move the rest to the drawer.')
    );
  for (const p of Object.keys(s.params ?? {}))
    if (!params.has(p)) throw new SceneError(`${where}: sets '${p}', which is not a param`);
}


/**
 * The ids of an experiment's scenes are UNIQUE.
 *
 * They address a scene from the URL (`?preset=`) and they key the scene list in
 * the header, so a repeat is two different lectures under one name: the link
 * opens whichever the lookup finds first, and the picker — a keyed list —
 * throws outright. It cost a duplicate 'mixture' in the MIMO script, added
 * without noticing the one already there, and the symptom was a rendering error
 * three tabs away from the cause.
 *
 * Not a per-scene rule, which is why it is not in validateScene: a scene cannot
 * see its siblings, and this is a property of the SCRIPT.
 */
export function validateSceneIds(scenes, key) {
  const seen = new Set();
  for (const s of scenes ?? []) {
    if (!s?.id) continue; // validateScene reports a missing id
    if (seen.has(s.id))
      throw new SceneError(`experiment '${key}': two scenes answer to the id '${s.id}'`);
    seen.add(s.id);
  }
}
