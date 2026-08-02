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
    view: 'tracking',
    visible: ['den', 'num'],
    notes: `Gain statique 1 : la sortie finit par suivre la rampe… avec un RETARD
constant — e_∞ = 2 s pour 1/(s+1)², soit la SOMME des constantes de
temps. Vérifier en direct : den = 1,3,3,1 (trois pôles en −1) →
e_∞ = 3. Ajouter un zéro, num = 1,1 → e_∞ retombe à 2 : les zéros
font de l'AVANCE de phase, littéralement. Casser le gain statique
(den = 1,2,2) : l'erreur ne converge plus — elle croît en (1−H(0))·t.
La rampe est un chronomètre : elle mesure le retard équivalent du
système.`,
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
];
// notes: Teacher Mode only. Never projected by default, never in the URL.
