// Lecture script. Auto-discovered by the registry.
export default [
  {
    id: 'echelon',
    title: 'Tapez votre système',
    params: { num: [1], den: [1, 2, 1], input: 'step' },
    visible: ['num', 'den', 'input'],
    notes: `Les pills num et den sont ÉDITABLES : cliquer, taper les coefficients
en puissances décroissantes de s. Partir de 1/(s+1)² puis improviser
avec la salle : « donnez-moi un système » — den = 1,0.4,1 (ça sonne),
den = 1,3,3,1 (troisième ordre), num = 1,1 (un zéro qui donne du
dépassement). Le lien URL capture le système : distribuer le même H(s)
à toute la salle en un lien. La valeur finale (statline) = gain
statique num(0)/den(0) si le système est stable.`,
  },
  {
    id: 'rampe',
    title: 'La rampe mesure le retard',
    params: { num: [1], den: [1, 2, 1], input: 'ramp' },
    visible: ['den', 'num'],
    notes: `Gain statique 1 : la sortie finit par suivre la rampe… avec un RETARD
constant. Ce retard, c'est l'ÉCART VERTICAL entre la courbe grise
(l'entrée) et la courbe bleue (la sortie) une fois le transitoire
passé — le faire montrer du doigt : e_∞ = 2 s pour 1/(s+1)², soit la
SOMME des constantes de temps. Vérifier en direct : den = 1,3,3,1
(trois pôles en −1) → l'écart passe à 3. Ajouter un zéro, num = 1,1 →
il retombe à 2 : les zéros font de l'AVANCE de phase, littéralement.
Casser le gain statique (den = 1,2,2) : l'écart ne se stabilise plus,
il s'ouvre en (1−H(0))·t. La rampe est un chronomètre.`,
  },
  {
    id: 'sinus',
    title: 'La définition vivante de H(jω)',
    params: { num: [1], den: [1, 2, 1], input: 'sine', f: 0.5 },
    visible: ['f'],
    notes: `Après le transitoire, la sortie est une sinusoïde de MÊME fréquence,
d'amplitude |H(jω)| et déphasée de arg H(jω) — comparer dans la
statline le gain mesuré (ajusté sur les 2 dernières périodes) et
|H(jω)| calculé : ils coïncident à 3 décimales. Monter f : le gain
fond, la phase plonge — le diagramme de Bode point par point, à la
main. C'est LA définition de la réponse fréquentielle, vécue avant
d'être tracée.`,
  },
  {
    id: 'poles',
    title: 'Les pôles décident, le temps obéit',
    params: { num: [1], den: [1, 2, 1], input: 'step' },
    view: 'poles',
    visible: ['den'],
    notes: `Le même système, lu à l'endroit où tout se joue. Demander AVANT de
toucher à quoi que ce soit : « je fais glisser un pôle vers la droite —
que devient la réponse indicielle ? »
Puis le faire, en trois coups de den :
  1,2,1   → pôle double en −1, réponse propre et lente
  1,0.4,1 → pôles complexes près de l'axe, ça oscille (onglet impulse)
  1,-1,1  → pôles à DROITE : la statline dit « instable » et la réponse
            part avant même qu'on ait fini la phrase.
Le passage à droite est visible sur le plan une seconde avant de
l'être sur le temporel : c'est tout l'intérêt d'avoir les deux
lectures du MÊME système sous deux onglets voisins.`,
  },
];
// notes: Teacher Mode only. Never projected by default, never in the URL.
