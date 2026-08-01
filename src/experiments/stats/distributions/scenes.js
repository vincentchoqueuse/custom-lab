// Lecture script. Auto-discovered by the registry.
export default [
  {
    id: 'histogramme',
    title: "L'histogramme converge (gaussienne)",
    params: { law: 'gaussian', N: 100 },
    visible: ['law', 'N'],
    notes: `À N=100, marteler R : l'histogramme bleu tremble autour de la pdf orange.
Monter N au potard (jusqu'à 10 000) : il épouse la courbe — loi des grands nombres.
Comparer x̄ / E[X] et s² / Var(X) en bas du graphique à chaque tirage.
Changer de loi dans la pill pour montrer que le phénomène est universel.`,
  },
  {
    id: 'discret',
    title: 'Lois discrètes (Poisson)',
    params: { law: 'poisson', N: 500 },
    visible: ['law', 'lambda'],
    notes: `Barres bleues (fréquences observées) contre barres oranges (probabilités).
Question : « pourquoi les barres bleues ne collent-elles jamais exactement ? »
Passer à la binomiale avec n grand et p petit, puis revenir à Poisson :
même silhouette — c'est la limite binomiale → Poisson (np = λ).`,
  },
  {
    id: 'repartition',
    title: 'La fonction de répartition',
    params: { law: 'exponential', N: 100 },
    view: 'cdf',
    visible: ['law', 'N'],
    notes: `L'escalier bleu (empirique) contre la courbe orange : chaque marche vaut 1/N.
Descendre N à 10 pour voir les marches, monter à 10 000 pour les faire disparaître.
Passer sur une loi discrète : la CDF théorique devient elle-même un escalier.`,
  },
];
// notes: Teacher Mode only. Never projected by default, never in the URL.
