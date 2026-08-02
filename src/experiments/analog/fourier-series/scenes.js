// Lecture script. Auto-discovered by the registry.
export default [
  {
    id: 'harmoniques',
    title: 'Un signal carré, harmonique par harmonique',
    params: { wave: 'square', N: 1, A: 1 },
    visible: ['N'],
    notes: `Partir de N = 1 : une simple sinusoïde de même fréquence.
Monter N cran par cran : 3, 5, 7 — chaque harmonique impaire creuse les
flancs. Question : « combien d'harmoniques pour un carré parfait ? »
Réponse : une infinité — et encore (voir scène Gibbs). Passer à la vue
Spectre : uniquement les rangs impairs, décroissance en 1/n.`,
  },
  {
    id: 'gibbs',
    title: 'Le phénomène de Gibbs',
    params: { wave: 'square', N: 10, A: 1 },
    visible: ['N'],
    notes: `Geler (F) à N = 10, puis pousser N à 60 : les oscillations se
resserrent contre la discontinuité mais le DÉPASSEMENT ne diminue pas —
la statline reste vers 9 % (8,95 % en théorie), quel que soit N.
Morale : la convergence est en moyenne quadratique, pas uniforme.
C'est LA raison des oscillations près des fronts dans tout système
à bande limitée (filtres raides, troncature spectrale).`,
  },
  {
    id: 'continuite',
    title: 'La continuité fait la vitesse',
    params: { wave: 'triangle', N: 3, A: 1 },
    visible: ['wave', 'N'],
    notes: `Triangle, N = 3 : déjà quasi parfait — coefficients en 1/n²,
car le signal est CONTINU. Basculer sur « carré » à N = 3 : médiocre.
Vue Erreur vs N (log-log) : pente −3/2 pour le triangle, −1/2 pour le
carré et la dent de scie. Règle à retenir : plus le signal est régulier,
plus son spectre décroît vite — la discontinuité se paie en harmoniques.`,
  },
];
// notes: Teacher Mode only. Never projected by default, never in the URL.
