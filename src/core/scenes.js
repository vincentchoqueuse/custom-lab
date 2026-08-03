// Le vocabulaire d'une SCÈNE, et sa validation — le pendant de
// core/figures.js pour l'autre moitié du contrat déclaratif.
//
// Une scène est de la donnée pure : sur les 198 scènes du catalogue, aucune
// ne contient de fonction. Toute sa forme est donc vérifiable, et elle l'est
// — parce que le seul défaut qu'une scène puisse avoir est une FAUTE DE
// FRAPPE, et qu'une faute de frappe silencieuse est la pire espèce.
// `visble: ['N']` ne faisait rien du tout, sans un mot, et on s'en
// apercevait devant les étudiants.
//
// Quatre choses sont vérifiées, toutes au chargement (et répétées par
// `npm run check`, donc avant même d'ouvrir un navigateur) :
//   · la clé existe, et porte le bon type ;
//   · la vue sur laquelle la scène s'ouvre existe ;
//   · les paramètres qu'elle règle existent ;
//   · les pills qu'elle montre ou masque existent.
//
// PURE : pas de DOM, pas d'état, pas de glob.

export class SceneError extends Error {
  constructor(message) {
    super(message);
    this.name = 'SceneError';
  }
}

/** La liste FERMÉE des clés d'une scène, avec le type attendu. */
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

const typeOf = (v) => (Array.isArray(v) ? 'array' : typeof v);

/**
 * @param {object} s        la scène telle qu'écrite dans scenes.js
 * @param {number} i        son rang, pour nommer une scène sans id
 * @param {{views: Array, params: object}} manifest
 * @param {string} key      'sujet/experience', pour le message d'erreur
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

  // `seed` is injected into every schema by the registry (determinism is a
  // contract requirement, not an experiment choice), so a scene may set it
  // even though no manifest declares it.
  const params = new Set([...Object.keys(manifest.params ?? {}), 'seed']);
  for (const list of ['visible', 'masked'])
    for (const p of s[list] ?? [])
      if (!params.has(p)) throw new SceneError(`${where}: ${list} names '${p}', which is not a param`);
  for (const p of Object.keys(s.params ?? {}))
    if (!params.has(p)) throw new SceneError(`${where}: sets '${p}', which is not a param`);
}
