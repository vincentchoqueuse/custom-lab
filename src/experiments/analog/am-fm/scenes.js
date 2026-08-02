// Lecture script — auto-discovered by the registry.
export default [
  {
    id: 'am-sidebands',
    title: 'Scène 1 · AM : le message est dans les bandes latérales',
    view: 'spectrum',
    params: { mode: 'am', fm: 62.5, ka: 0.5 },
    visible: ['ka', 'fm'],
    notes: `Trois raies : la porteuse à 0 dB et le message, DEUX fois, à ±f_m.
Monter k_a : seules les bandes latérales bougent (20·log10(k_a/2), les points
oranges le prédisent). Statline : à k_a = 0.5, ~89 % de la puissance part dans
la porteuse — qui ne transporte AUCUNE information. C'est le procès de l'AM.`,
  },
  {
    id: 'overmod',
    title: "Scène 2 · Surmodulation : l'enveloppe trahit",
    view: 'time',
    params: { mode: 'am', fm: 62.5, ka: 0.9 },
    visible: ['ka'],
    notes: `Geler (F) à k_a = 0.9 : l'enveloppe orange reproduit le message.
Passer k_a = 1.4 : les enveloppes se CROISENT — un détecteur d'enveloppe
(la diode du poste à galène) verrait |enveloppe| : le message est plié,
irrécupérable. Voilà pourquoi k_a ≤ 1, et pourquoi la radio AM sonne comme
elle sonne quand l'émetteur pousse.`,
  },
  {
    id: 'bessel',
    title: 'Scène 3 · FM : les raies de Bessel',
    view: 'spectrum',
    params: { mode: 'fm', fm: 62.5, beta: 0.5 },
    visible: ['beta', 'fm'],
    notes: `β petit : la FM ressemble à l'AM (porteuse + 2 raies). Monter β
lentement : les raies POUSSENT par paires, amplitudes J_n(β) (points oranges).
Le spectre s'élargit : Carson 2(β+1)f_m dans la statline, contre la largeur
98 % mesurée. Question : « la FM large bande, on paie quoi, on gagne quoi ? »`,
  },
  {
    id: 'extinction',
    title: 'Scène 4 · β = 2.405 : la porteuse disparaît',
    view: 'spectrum',
    params: { mode: 'fm', fm: 62.5, beta: 2.405 },
    visible: ['beta'],
    notes: `Premier zéro de J₀ : la porteuse s'éteint alors qu'on ne module QUE
la phase. Bouger β de ±0.2 autour de 2.405 pour la voir renaître. Historique :
c'est ainsi qu'on calibrait la déviation des émetteurs FM — on cherche
l'extinction au spectromètre, et Δf = 2.405·f_m exactement.`,
  },
];
