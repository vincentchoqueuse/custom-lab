// Lecture script. Auto-discovered by the registry.
export default [
  {
    id: 'correlation',
    title: 'ρ incline le nuage',
    params: { rho: 0.6, N: 500 },
    visible: ['rho', 'N'],
    notes: `Faire glisser ρ de −0.95 à 0.95 : le nuage s'écrase le long d'une droite,
les ellipses (lignes de niveau EXACTES de la pdf) suivent.
ρ = 0 : ellipses alignées avec les axes — indépendance (cas gaussien !).
Marteler R : le nuage change, les ellipses ne bougent pas — modèle vs données.
1σ, 2σ, 3σ contiennent ≈ 39 %, 86 %, 99 % des points.`,
  },
  {
    id: 'regression',
    title: 'Régression ≠ axe principal',
    params: { rho: 0.6, sigmax: 1.5, sigmay: 1.5, N: 1000 },
    visible: ['rho'],
    notes: `Deux droites dans le nuage : le grand axe (violet) et E[Y|X=x] (verte).
La verte est PLUS PLATE — c'est la régression vers la moyenne :
à X extrême, Y retombe vers μᵧ. Question : « quand coïncident-elles ? »
(|ρ| → 1). Baisser ρ : la verte s'aplatit vers l'horizontale, pas le grand axe.`,
  },
  {
    id: 'marginales',
    title: 'Les marginales ignorent ρ',
    params: { rho: 0.9, sigmax: 1.5, sigmay: 1 },
    view: 'marginals',
    visible: ['rho'],
    notes: `Bouger ρ de −0.95 à 0.95 : RIEN ne bouge. Toute la dépendance est dans
la loi jointe, invisible depuis les marginales.
Revenir à la vue Nuage pour le contraste, puis poser la question :
« deux marginales gaussiennes suffisent-elles à définir la loi jointe ? » Non.`,
  },
];
// notes: Teacher Mode only. Never projected by default, never in the URL.
