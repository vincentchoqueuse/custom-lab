// Lecture script. Auto-discovered by the registry.
export default [
  {
    id: 'translation',
    title: 'Translater : b (a = 1)',
    params: { law: 'gaussian', a: 1, b: 2 },
    visible: ['b', 'law'],
    notes: `a = 1 : bouger b déplace la courbe orange EN BLOC.
Regarder le statline : E[Y] = E[X] + b suit, Var(Y) ne bouge PAS.
Question : « pourquoi la variance est-elle insensible à b ? »
(la variance mesure l'écart à la moyenne — qui se translate avec).`,
  },
  {
    id: 'dilatation',
    title: 'Dilater : a (b = 0)',
    params: { law: 'gaussian', a: 2, b: 0 },
    visible: ['a'],
    notes: `Monter a : la courbe s'élargit ET s'aplatit — l'aire reste 1.
Var(Y) = a²·Var(X) : passer a de 1 à 2 quadruple la variance (statline).
Question piège : « et E[Y] ? » — nulle tant que E[X] = 0 et b = 0.
Avec la loi uniforme, l'effet plateau se voit encore mieux.`,
  },
  {
    id: 'miroir',
    title: 'Retourner : a < 0',
    params: { law: 'exponential', a: -1, b: 0 },
    visible: ['a', 'law'],
    notes: `a = −1 sur une exponentielle : la densité se retourne en miroir,
E[Y] = −1. La formule f_Y(y) = f_X((y−b)/a)/|a| exige |a|, pas a —
c'est exactement ce que montre cette scène.
Vue « Histogramme de Y » : les réalisations transformées tombent dessus.`,
  },
];
// notes: Teacher Mode only. Never projected by default, never in the URL.
