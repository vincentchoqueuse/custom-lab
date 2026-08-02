// Lecture script. Auto-discovered by the registry.
export default [
  {
    id: 'principe',
    title: 'Le principe (N=20)',
    params: { N: 20 },
    visible: ['N'],
    notes: `Marteler R : les réalisations violettes changent, la pdf orange (estimée) bouge,
la bleue (vraie) reste. μ̂ et σ̂ se lisent en bas du graphique.
Question : « combien de réalisations pour que l'orange colle à la bleue ? »
Puis monter N au potard et regarder la courbe se stabiliser.`,
  },
  {
    id: 'variabilite',
    title: 'Peu de données (N=5)',
    params: { N: 5 },
    visible: ['N'],
    notes: `R en boucle : la pdf estimée danse — c'est la variance de l'estimateur.
Remarquer que σ̂ (MLE, division par N) sous-estime σ en moyenne.
Teaser : « diviser par N−1 ? C'est l'estimateur sans biais — la suite du cours. »`,
  },
  {
    id: 'vraisemblance',
    title: 'La log-vraisemblance',
    params: { N: 20 },
    view: 'loglik',
    visible: ['N'],
    notes: `La courbe ℓ(μ) est maximale en μ̂ (trait orange pointillé), pas en μ (trait bleu) :
l'estimateur maximise la vraisemblance des données observées, pas la vérité.
Augmenter N : la courbe se resserre autour de μ̂ — l'information de Fisher croît.`,
  },
];
// notes: Teacher Mode only. Never projected by default, never in the URL.
