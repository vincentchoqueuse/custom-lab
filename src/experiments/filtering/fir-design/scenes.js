// Lecture script — auto-discovered by the registry.
export default [
  {
    id: 'through',
    title: 'Scène 1 · Le signal entre, le signal sort',
    view: 'response',
    params: { fc: 1000, N: 21, win: 'hann' },
    visible: ['fc'],
    notes: `Le filtre à l'œuvre, avant toute théorie : un signal entre, sa version
filtrée sort — et sort EN RETARD, décalé de (N−1)/2 échantillons. Ce retard
n'est pas un défaut de réglage, il est la contrepartie de la causalité, et la
scène 5 le mesure.
Question à poser : « où est passé le contenu au-dessus de f_c ? »
Bouger f_c et regarder la sortie se lisser. Les onglets suivants montrent
d'où vient ce comportement : les coefficients, puis la réponse fréquentielle.`,
  },
  {
    id: 'truncate',
    title: "Scène 2 · Tronquer l'infini",
    view: 'impulse',
    params: { fc: 1000, N: 21, win: 'rect' },
    visible: ['N'],
    notes: `La réponse idéale (orange) est un sinc INFINI et non causal : on n'en
garde que N coefficients, recentrés en (N−1)/2 — le retard est né ici, avant
tout calcul. Monter N : les barres épousent de mieux en mieux le sinc.
Question : « que coûte chaque coefficient de plus ? » (une multiplication par
échantillon… et du retard — scène 4).`,
  },
  {
    id: 'gibbs',
    title: 'Scène 3 · Gibbs ne cède pas',
    view: 'response',
    params: { fc: 1000, N: 21, win: 'rect' },
    visible: ['N'],
    notes: `Troncature brute : le premier lobe en bande coupée est à −21 dB.
Geler (F), monter N de 21 à 101 : la transition RAIDIT… mais le lobe reste
à −21 dB — le phénomène de Gibbs ne cède pas au nombre de coefficients.
C'est l'échec instructif : ajouter du calcul ne suffit pas, il faut changer
de méthode.`,
  },
  {
    id: 'windows',
    title: 'Scène 4 · La fenêtre achète des décibels',
    view: 'response',
    params: { fc: 1000, N: 45, win: 'rect' },
    visible: ['win', 'N'],
    notes: `Même N, autre fenêtre : rect −21 dB → Hann −44 → Hamming −53 →
Blackman −74 (statline). Le prix : la transition s'élargit d'autant. C'est
EXACTEMENT le compromis de l'expérience « Fenêtrage spectral » — même
mathématique, appliquée cette fois à la synthèse. Choisir une fenêtre, c'est
choisir où mettre ses décibels.`,
  },
  {
    id: 'delay',
    title: 'Scène 5 · Propre, mais en retard',
    view: 'response',
    params: { fc: 500, N: 81, win: 'hamming' },
    visible: ['N'],
    notes: `Le carré entre, une version lissée sort — décalée d'EXACTEMENT
(N−1)/2 échantillons (statline : 5 ms à N = 81). Phase linéaire : toutes les
fréquences attendent le même temps, la forme est préservée. Descendre N : le
retard fond, le lissage aussi. Question de fin : « pourquoi un musicien
refuse-t-il un filtre de 4001 coefficients ? » (250 ms de latence…).`,
  },
];
