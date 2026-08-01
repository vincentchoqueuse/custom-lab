// Lecture script. Auto-discovered by the registry.
export default [
  {
    id: 'principe',
    title: 'Le bon modèle (d=3)',
    params: { d: 3, N: 30, sigma: 0.3 },
    visible: ['d', 'sigma'],
    notes: `Le vrai polynôme est de degré 3, on estime un degré 3 : tout va bien.
Marteler R : le bruit change, la courbe orange reste proche de la bleue.
Monter σ pour montrer la dégradation, puis passer à la vue Coefficients :
les barres orange (estimées) encadrent les points bleus (vrais).`,
  },
  {
    id: 'sous-ajustement',
    title: 'Sous-ajustement (d=1)',
    params: { d: 1, N: 30, sigma: 0.3 },
    visible: ['d'],
    notes: `Une droite ne peut pas suivre une cubique : erreur de biais.
Question : « augmenter N va-t-il aider ? » Non — le modèle est trop pauvre,
les résidus restent structurés quel que soit N. Monter d en direct : 1 → 2 → 3.`,
  },
  {
    id: 'sur-ajustement',
    title: 'Sur-ajustement (d=9)',
    params: { d: 9, N: 15, sigma: 0.4 },
    visible: ['d', 'N'],
    notes: `10 coefficients pour 15 points : le polynôme colle au bruit.
Marteler R : la courbe orange danse violemment — variance énorme.
Vue Coefficients : les aₖ estimés explosent alors que les vrais sont sages.
Puis monter N à 200 : le sur-ajustement se calme (mais d=3 reste meilleur).`,
  },
];
// notes: Teacher Mode only. Never projected by default, never in the URL.
