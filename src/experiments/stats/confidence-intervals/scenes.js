// Lecture script — the file reopened the night before class. Auto-discovered
// by the registry. Defaults: view = first view, drawer = false.
export default [
  {
    id: 'scene-1',
    title: 'Tout va bien (N=30)',
    params: { N: 30, conf: 0.95 },
    visible: ['N', 'conf'], // Prompt Bar pills
    masked: [], // black box: pill shows "?", revealHidden action
    notes: `Question à poser AVANT de bouger N :
« Si je passe N de 30 à 200, la couverture change-t-elle ? »
Réponse attendue fausse : "elle augmente". Montrer que seule la largeur diminue.`,
  },
  {
    id: 'scene-2',
    title: 'Niveau α = 0.20',
    params: { conf: 0.8 },
    visible: ['conf'],
    notes: `Faire compter les intervalles rouges à voix haute (~1 sur 5).`,
  },
];
// notes: Teacher Mode only. Never projected by default, never in the URL.
