// Lecture script — auto-discovered by the registry.
export default [
  {
    id: 'families',
    title: 'Scène 1 · Un gabarit, quatre familles',
    params: { family: 'butter', fp: 1000, fstop: 2000, Amax: 1, Amin: 40 },
    visible: ['family'],
    notes: `Le gabarit est fixé (1 dB / 40 dB / octave de transition). Faire
défiler les familles en lisant l'ordre dans la statline : Butterworth 8,
Chebyshev 5, elliptique 4. L'ordre, c'est des ampli-op, des condensateurs, du
coût. Question : « alors pourquoi Butterworth est-il partout ? » — garder la
réponse pour la scène 4.`,
  },
  {
    id: 'tighten',
    title: 'Scène 2 · Resserrer le gabarit',
    params: { family: 'ellip', fp: 1000, fstop: 1400, Amax: 0.5, Amin: 60 },
    visible: ['fstop', 'Amin'],
    notes: `Transition à 1.4× et 60 dB : l'elliptique tient en n = 6. Geler (F),
passer f_a à 1200 Hz : n = 8. Chaque décibel de gabarit se paie en ordre — et
la validation bloque quand le gabarit devient déraisonnable. Ouvrir le tiroir
Parameters pour montrer la sélectivité dérivée.`,
  },
  {
    id: 'geometry',
    title: 'Scène 3 · La géométrie des familles',
    view: 'poles',
    params: { family: 'butter', fp: 1000, fstop: 2000, Amax: 1, Amin: 40 },
    visible: ['family'],
    notes: `Butterworth : pôles sur un CERCLE. Chebyshev 1 : le cercle s'aplatit
en ellipse. Chebyshev 2 et elliptique : des ZÉROS apparaissent sur l'axe jω —
ce sont eux qui creusent la bande d'arrêt (les encoches de la réponse). Moins
de pôles, mieux placés, plus des zéros : c'est toute l'histoire du design.`,
  },
  {
    id: 'price',
    title: 'Scène 4 · Le prix de la sélectivité',
    view: 'delay',
    params: { family: 'butter', fp: 1000, fstop: 2000, Amax: 1, Amin: 40 },
    visible: ['family'],
    notes: `Réponse à la question de la scène 1. Geler (F) le retard de groupe
de Butterworth : presque plat. Passer à l'elliptique : le retard s'envole près
de f_p — les composantes proches du bord arrivent EN RETARD (distorsion de
phase, ruine des transitoires). La sélectivité se paie en phase. Bonus :
l'Inspector exporte les coefficients num/den (prototype normalisé ET rad/s)
pour Micro-Cap, SPICE ou un TP.`,
  },
];
