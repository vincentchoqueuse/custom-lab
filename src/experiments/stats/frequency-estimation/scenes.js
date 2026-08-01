// Lecture script. Auto-discovered by the registry.
export default [
  {
    id: 'bassin',
    title: 'Bien initialisé (f₀ proche)',
    params: { f: 5, f0: 5.2, sigma: 0.3 },
    view: 'cost',
    visible: ['f0', 'sigma'],
    notes: `f₀ est dans le bassin du minimum global : les trois méthodes tombent
d'accord (statline). Suivre les points violets (gradient, prudent) et jaunes
(Newton, deux-trois bonds) qui descendent LE LONG de la courbe J(f).
Pousser f₀ à 5.3 : Newton décroche AVANT le gradient (il exige J'' > 0 —
son bassin est deux fois plus étroit). Les creux sont espacés de 1/T = 1 Hz.`,
  },
  {
    id: 'piege',
    title: 'Le piège des minima locaux',
    params: { f: 5, f0: 9, sigma: 0.3 },
    view: 'cost',
    visible: ['f0'],
    notes: `f₀ = 9 Hz : gradient et Newton convergent… vers le MAUVAIS creux —
J n'est pas convexe, ils n'explorent que leur bassin. La grille (verte)
s'en moque : elle balaie tout, au prix de centaines d'évaluations.
Faire glisser f₀ lentement vers 5 : montrer le saut de bassin en bassin.
Morale : initialisation ≈ connaissance a priori.`,
  },
  {
    id: 'reconstruit',
    title: 'Le signal reconstruit',
    params: { f: 5, f0: 5.2, sigma: 0.5 },
    view: 'signal',
    visible: ['sigma', 'f'],
    notes: `La sinusoïde orange (fréquence f̂ de la grille) recolle aux points violets.
Marteler R : le bruit change, f̂ bouge à peine — l'estimation de fréquence
est étonnamment précise (teaser : la borne de Cramér-Rao décroît en 1/T³).
Monter σ à 2 pour trouver le point de décrochage.`,
  },
];
// notes: Teacher Mode only. Never projected by default, never in the URL.
