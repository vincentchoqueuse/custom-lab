// Auto-discovered by the registry. Defaults: view = first view, drawer = false.
export default [
  {
    id: 'shapes',
    title: 'Scène 1 · Les sept signaux, dans le temps',
    params: { signal: 'rect', T: 5, t0: 0 },
    view: 'time',
    visible: ['signal', 'T'],
    notes: `Parcourir le catalogue avant de parler de spectre : dérouler les sept
formes et les faire trier à voix haute. Trois familles apparaissent :
celles qui s'arrêtent (porte, triangle), celles qui décroissent sans
jamais s'annuler (gaussienne, exponentielles), celle qui traîne (sinc).
Question à poser AVANT de passer à l'onglet Spectre :
« laquelle a le spectre le plus étroit, à votre avis ? »
T règle la durée de toutes : le lien durée ↔ largeur se joue là.`,
  },
  {
    id: 'gate',
    title: 'Scène 2 · La porte et le sinus cardinal',
    params: { signal: 'rect', T: 5, t0: 0 },
    view: 'spectrum',
    visible: ['T'],
    notes: `La paire de base du cours. Le premier zéro est à 1/T : lire la valeur
dans la statline, puis la retrouver sur l'axe.
Question AVANT de bouger T : « si je double la durée de la porte,
que devient la largeur du lobe ? »
Réponse attendue fausse : "elle double". Elle est DIVISÉE par deux.`,
  },
  {
    id: 'scaling',
    title: 'Scène 3 · Comprimer dans le temps, étaler en fréquence',
    params: { signal: 'rect', T: 15, t0: 0 },
    view: 'spectrum',
    visible: ['T'],
    notes: `Verrouiller les axes (A) puis geler (F) à T = 15 ms, et descendre à 2 ms :
le lobe s'ouvre sous les yeux, le fantôme gris reste étroit.
Le produit T·B₃ affiché ne bouge pas d'un chiffre — c'est le théorème
de changement d'échelle, pas une coïncidence.`,
  },
  {
    id: 'gauss',
    title: 'Scène 4 · La gaussienne, point fixe de Fourier',
    params: { signal: 'gauss', T: 5, t0: 0 },
    view: 'spectrum',
    visible: ['signal', 'T'],
    notes: `Passer de la porte à la gaussienne et comparer les deux onglets
Signal / Spectre : même forme des deux côtés. Aucun lobe secondaire,
aucun zéro — c'est le seul signal du catalogue dans ce cas.
Enchaîner sur l'onglet dB : la gaussienne plonge, la porte traîne.`,
  },
  {
    id: 'delay',
    title: 'Scène 5 · Le retard ne se voit que dans la phase',
    params: { signal: 'rect', T: 5, t0: 0 },
    view: 'phase',
    visible: ['t0'],
    notes: `Bouger t₀ et regarder d'abord l'onglet Spectre : |X(f)| ne bouge pas
d'un pixel (c'est vérifié à l'identique dans le harnais numérique).
Revenir sur la phase : elle prend une pente −2πt₀, d'autant plus raide
que le retard est grand. Les dents de scie sont le repliement à ±π.
Morale : un spectre d'amplitude seul ne sait pas dire QUAND.`,
  },
  {
    id: 'sidelobes',
    title: 'Scène 6 · Les lobes secondaires, en dB',
    params: { signal: 'rect', T: 5, t0: 0 },
    view: 'db',
    visible: ['signal'],
    notes: `Alterner porte / triangle : −13.3 dB contre −26.5 dB, exactement le
double en dB puisque sinc² = sinc au carré.
C'est déjà tout le fenêtrage : adoucir les bords écrase les lobes.
Faire le lien avec l'expérience « Fenêtrage spectral ».`,
  },
  {
    id: 'rf',
    title: 'Scène 7 · Moduler, c’est déplacer le spectre',
    params: { signal: 'rf', T: 5, f0: 600, t0: 0 },
    view: 'spectrum',
    visible: ['f0', 'T'],
    notes: `La même porte, multipliée par un cosinus : le lobe est parti se poser
en ±f₀, moitié moins haut, même largeur 2/T.
Bouger f₀ : le motif se déplace sans se déformer.
Bouger T : la largeur change, la position non. Deux paramètres,
deux effets orthogonaux — c'est le théorème de modulation.`,
  },
];
