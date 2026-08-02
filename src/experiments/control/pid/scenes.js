// Lecture script. Auto-discovered by the registry.
export default [
  {
    id: 'p-seul',
    title: 'P seul : vite, mais à côté',
    params: { Kp: 3, Ki: 0, Kd: 0, sigma: 0 },
    visible: ['Kp'],
    notes: `Ki = Kd = 0. La sortie monte… et s'arrête SOUS la consigne : erreur
statique 1/(1+Kp) — le tiroir affiche la valeur exacte, la statline la
mesure. Monter Kp : l'erreur diminue mais n'atteint JAMAIS zéro, et les
oscillations enflent. À t = 10, la perturbation de charge décale tout :
P la subit, définitivement. Question : « pourquoi P ne peut-il pas
finir le travail ? » — à erreur nulle, u = 0 : plus personne ne pousse.`,
  },
  {
    id: 'integrale',
    title: 'I efface tout',
    params: { Kp: 3, Ki: 1.5, Kd: 0, sigma: 0 },
    visible: ['Ki'],
    notes: `Geler (F) la courbe P seul, ajouter Ki : l'erreur statique DISPARAÎT —
l'intégrateur accumule jusqu'à ce que l'erreur soit exactement nulle.
Et à t = 10, regarder la perturbation : encaissée puis EFFACÉE, la
sortie revient sur la consigne. C'est la vraie raison d'être du terme I
(le régime permanent, pas la vitesse). Trop de Ki : l'accumulation
sur-vire, les oscillations reviennent — l'intégrale est une mémoire,
et la mémoire a de l'inertie.`,
  },
  {
    id: 'derivee',
    title: 'D calme — et amplifie le bruit',
    params: { Kp: 6, Ki: 1.5, Kd: 1.5, sigma: 0 },
    visible: ['Kd', 'sigma'],
    notes: `Kp poussé à 6 : ça oscille. Monter Kd : la dérivée freine AVANT
l'impact — le dépassement fond (statline). Puis le revers : mettre
σ = 0.02 de bruit de mesure et ouvrir la vue Commande. Avec Kd, u
devient une scie folle (σ(u) dans la statline) : la dérivée amplifie
le bruit d'un facteur ~Kd/τf. Marteler R : le bruit change, la scie
reste. C'est pourquoi D est filtré, réduit, ou absent (PI) dans 90%
des boucles industrielles.`,
  },
];
// notes: Teacher Mode only. Never projected by default, never in the URL.
