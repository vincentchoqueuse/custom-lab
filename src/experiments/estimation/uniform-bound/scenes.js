// Lecture script. Auto-discovered by the registry.
export default [
  {
    id: 'candidats',
    title: 'Trois candidats pour θ',
    params: { theta: 5, N: 10, M: 3000 },
    visible: ['N'],
    notes: `Masquer d'abord la ligne jaune mentalement : on ne connaît PAS θ.
Question : « avec ces 10 points, quelle est votre estimation de la borne ? »
Les trois réflexes de la salle sortent toujours : le max (on ne peut pas
faire moins), 2 fois la moyenne (la moyenne vaut θ/2), et corriger le max.
Marteler R : le max (orange) est TOUJOURS à gauche de θ — il sous-estime
par construction. max+min (vert) dépasse θ environ une fois sur deux.`,
  },
  {
    id: 'biais',
    title: 'Le biais du max',
    params: { theta: 5, N: 10, M: 5000 },
    view: 'sampling',
    visible: ['N'],
    notes: `L'histogramme du max vit entièrement À GAUCHE de θ : biais = −θ/(N+1).
max+min est centré sur θ : E[min] = θ/(N+1) compense exactement le déficit
du max. 2x̄ est centré aussi, mais LARGE — regarder l'étalement violet.
Geler (F) à N = 10, monter N à 100 : les trois se resserrent, mais pas à
la même vitesse. Les histogrammes orange et vert deviennent des pics.`,
  },
  {
    id: 'vitesse',
    title: 'La vitesse : 1/N contre 1/√N',
    params: { theta: 5, N: 10, M: 5000 },
    view: 'rmse',
    visible: ['N', 'theta'],
    notes: `Échelle log-log : les pentes SONT les vitesses de convergence.
max et max+min : pente −1 (RMSE en 1/N). 2x̄ : pente −1/2 (CLT, 1/√N).
À N = 100, le max est ~7 fois plus précis que 2x̄ — le tableau de bord
du chapitre : exploiter la RÉGULARITÉ du support bat le théorème central
limite. Surprise à souligner : max et max+min ont le MÊME EQM —
2θ²/((N+1)(N+2)) — corriger le biais n'a rien coûté, mais rien gagné.`,
  },
];
// notes: Teacher Mode only. Never projected by default, never in the URL.
