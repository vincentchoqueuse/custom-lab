// Lecture script. Auto-discovered by the registry.
export default [
  {
    id: 'grille-fine',
    title: 'Scène 1 · La grille fine trouve tout',
    params: { f: 5, sigma: 0.3, step: 0.05 },
    view: 'cost',
    visible: ['step', 'sigma'],
    notes: `Les points violets sont les évaluations de J : la grille balaie TOUT,
aucun bassin ne lui échappe — au prix de ~380 évaluations (statline). Les creux
secondaires sont espacés de 1/T = 1 Hz. Question : « combien coûte un pas deux
fois plus fin ? et combien rapporte-t-il ? » — transition vers la scène 2.`,
  },
  {
    id: 'pas-trop-grand',
    title: 'Scène 2 · Le pas qui enjambe le bassin',
    params: { f: 5, sigma: 0.3, step: 1.3 },
    view: 'cost',
    visible: ['step'],
    notes: `Δf = 1.3 Hz > largeur du bassin (1/T = 1 Hz) : la grille peut passer
PAR-DESSUS le vrai minimum et f̂ atterrit ailleurs (statline : |f̂−f|).
Geler (F), réduire le pas jusqu'à raccrocher le bon creux. Règle : le pas doit
être petit devant 1/T. C'est le premier dimensionnement d'estimateur du cours.`,
  },
  {
    id: 'quantification',
    title: "Scène 3 · Sans bruit, l'erreur reste",
    params: { f: 5, sigma: 0, step: 0.4 },
    view: 'cost',
    visible: ['step', 'sigma'],
    notes: `σ = 0, aucun bruit — et pourtant |f̂−f| ≠ 0 : l'argmin ne peut pas
faire mieux que ±Δf/2 (quantification de la grille). Descendre Δf : l'erreur
suit. Teaser : même à Δf → 0, le bruit imposera SA limite — la borne de
Cramér-Rao (expérience dédiée). Et pour faire mieux qu'une grille à coût égal :
chapitre optimisation (descente de gradient).`,
  },
  {
    id: 'reconstruit',
    title: 'Scène 4 · Le signal reconstruit',
    params: { f: 5, sigma: 0.5, step: 0.05 },
    view: 'time',
    visible: ['sigma', 'f'],
    notes: `La sinusoïde orange (fréquence f̂) recolle aux points violets.
Marteler R : le bruit change, f̂ bouge à peine — l'estimation de fréquence
est étonnamment précise (la CRB décroît en 1/T³). Monter σ à 2 pour trouver
le point de décrochage.`,
  },
];
// notes: Teacher Mode only. Never projected by default, never in the URL.
