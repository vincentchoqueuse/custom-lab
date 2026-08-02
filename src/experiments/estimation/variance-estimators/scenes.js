// Lecture script. Auto-discovered by the registry.
export default [
  {
    id: 'biais',
    title: 'Le biais de σ̂² (÷N)',
    params: { N: 5, M: 2000 },
    visible: ['N'],
    notes: `M = 2000 expériences, chacune estime σ² avec N = 5 points.
L'histogramme orange (division par N) est décalé À GAUCHE de σ² :
sa moyenne vaut σ²(N−1)/N — il sous-estime systématiquement.
Le bleu (÷N−1) est centré sur σ². Marteler R : le décalage ne part jamais.
Question : « pourquoi ÷N sous-estime-t-il ? » — x̄ colle mieux aux données
que μ : les écarts à x̄ sont trop petits, il manque un degré de liberté.`,
  },
  {
    id: 'evanouissement',
    title: 'Le biais s\'évanouit en 1/N',
    params: { N: 5, M: 5000 },
    view: 'bias',
    visible: ['sigma'],
    notes: `Le biais empirique de σ̂² (orange) suit la courbe théorique −σ²/N
(pointillée) ; celui de s² reste collé à zéro à toute taille N.
Axe log : à N = 100 le débat ÷N contre ÷(N−1) ne se voit plus.
Monter σ : le biais est en −σ²/N, il quadruple quand σ double.`,
  },
  {
    id: 'prix',
    title: 'Le prix à payer : la dispersion',
    params: { N: 5, M: 20000 },
    visible: ['N', 'M'],
    notes: `Regarder la LARGEUR des histogrammes : les deux estimateurs fluctuent
énormément à N = 5 — être sans biais ne veut pas dire être précis.
Monter N : les deux distributions se resserrent (en σ⁴·2/(N−1)) et se
confondent. Morale : à petit N le vrai problème n'est pas le biais,
c'est la variance — et il n'y a pas de bouton pour la supprimer.`,
  },
];
// notes: Teacher Mode only. Never projected by default, never in the URL.
