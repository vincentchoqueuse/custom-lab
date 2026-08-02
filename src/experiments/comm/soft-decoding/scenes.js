// Lecture script. Auto-discovered by the registry.
export default [
  {
    id: 'confiance',
    title: 'La confiance jetée à la poubelle',
    params: { code: 'hamming74', ebn0Db: 3, Nbits: 40000 },
    visible: ['ebn0Db'],
    notes: `Un échantillon reçu à +0.05 vote « 0 »… sans conviction. La décision
dure garde le vote et JETTE la conviction ; le décodeur souple correle
les 7 valeurs reçues avec les 16 mots de code possibles et garde tout.
À l'écran : mêmes trames, même bruit, deux décodeurs. Les gros points
orange (échecs du dur) sans point violet dessus = réparés par le
souple. Marteler R : le violet est TOUJOURS inclus dans l'orange, ou
presque — le souple domine trame par trame, pas seulement en moyenne.`,
  },
  {
    id: 'deux-db',
    title: 'Deux décibels gratuits',
    params: { code: 'hamming74', ebn0Db: 5, Nbits: 40000 },
    view: 'ber',
    visible: ['ebn0Db'],
    notes: `Lire l'écart HORIZONTAL entre la courbe orange (dur, exacte) et les
points violets (souple) : ≈ 2 dB à BER = 10⁻⁴ — même code, mêmes bits
émis, même énergie ; seul le récepteur change. La borne de l'union
(pointillés) colle aux points dès 4-5 dB : à haut SNR, l'erreur va vers
le mot de code VOISIN (distance 3), et la borne ne compte que ça.
2 dB gratuits : c'est pour ça qu'aucun récepteur moderne ne décide dur.`,
  },
  {
    id: 'repetition',
    title: 'La répétition rachetée',
    params: { code: 'repetition3', ebn0Db: 4, Nbits: 40000 },
    view: 'ber',
    visible: ['code'],
    notes: `Le retour de la fausse bonne idée : en dur, la répétition ×3 perdait
partout. En souple, moyenner les 3 échantillons = additionner 3 tiers
d'énergie = récupérer TOUTE l'énergie : les points violets tombent
EXACTEMENT sur la courbe sans-codage — ni mieux, ni pire, Q(√(2γb)).
C'est le filtre adapté (revoir cette expérience !) déguisé en code.
Moralité finale du chapitre : la répétition souple ne gagne rien, le
Hamming souple gagne 2 dB — la structure ET la confiance, il faut les
deux.`,
  },
];
// notes: Teacher Mode only. Never projected by default, never in the URL.
