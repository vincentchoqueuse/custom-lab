// Lecture script. Auto-discovered by the registry.
export default [
  {
    id: 'shannon-ok',
    title: 'Tout va bien (f ≪ fe/2)',
    params: { source: 'sine', f: 5, fe: 50 },
    visible: ['f', 'fe'],
    notes: `5 Hz échantillonné à 50 Hz : la courbe orange (reconstruite par sinc à
partir des SEULS points violets) recouvre exactement la bleue. Message :
sous fe/2, les échantillons contiennent TOUT — Shannon n'est pas une
approximation. Monter f doucement vers 20 Hz : ça tient toujours, même
avec à peine plus de 2 points par période (l'œil n'y croit pas, la
reconstruction si).`,
  },
  {
    id: 'roue',
    title: 'Le repliement : la roue de diligence',
    params: { source: 'sine', f: 45, fe: 50 },
    visible: ['f'],
    notes: `45 Hz échantillonné à 50 Hz : les échantillons dessinent un 5 Hz —
et la reconstruction le confirme (statline : f apparente = 5 Hz).
Geler (F) à f = 5, puis passer f à 45 : LES MÊMES POINTS. Deux signaux
différents, échantillons identiques — l'information est perdue.
C'est la roue de diligence des westerns et le moiré des caméras.
Vue Fréquence apparente : f rebondit sur fe/2 comme sur un mur.`,
  },
  {
    id: 'harmoniques',
    title: 'Un carré qui se replie',
    params: { source: 'square', f: 15, fe: 50 },
    view: 'spectrum',
    visible: ['f', 'fe'],
    notes: `Le carré à 15 Hz a ses harmoniques à 45, 75, 105 Hz… toutes au-delà
de fe/2 = 25 Hz. Vue Spectre : les raies bleues (vraies) se replient en
orange À L'INTÉRIEUR de [0, 25] — 45 → 5 Hz, 75 → 25 Hz, 105 → 5 Hz.
Vue Temporel : le signal reconstruit n'est plus un carré, il est
contaminé par ses propres harmoniques repliées. Morale : on filtre
AVANT d'échantillonner (filtre anti-repliement), jamais après.`,
  },
];
// notes: Teacher Mode only. Never projected by default, never in the URL.
