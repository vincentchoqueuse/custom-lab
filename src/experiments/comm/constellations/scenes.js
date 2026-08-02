// Lecture script. Auto-discovered by the registry.
export default [
  {
    id: 'qpsk',
    title: 'QPSK confortable',
    params: { mod: 'qpsk', snrDb: 15, N: 2000 },
    visible: ['snrDb'],
    notes: `Quatre nuages bien séparés autour des quatre symboles jaunes : à
15 dB, la décision au plus proche voisin (frontières pointillées = les
axes) ne se trompe jamais ou presque. Vocabulaire : symbole émis, bruit
complexe, région de décision. Baisser le SNR en direct : les nuages
gonflent, les premiers points orange (erreurs) franchissent les
frontières vers 6–7 dB. Marteler R : les erreurs changent de place,
leur NOMBRE est stable — c'est une probabilité, pas un accident.`,
  },
  {
    id: 'qam',
    title: '16-QAM : le prix des 4 bits',
    params: { mod: '16qam', snrDb: 15, N: 4000 },
    visible: ['mod', 'snrDb'],
    notes: `Même énergie moyenne, même bruit — mais 16 symboles au lieu de 4 :
les régions de décision rétrécissent, les erreurs orange apparaissent
déjà à 15 dB, là où la QPSK était limpide. Question : « quels symboles
se trompent le plus ? » — les 4 du centre (4 voisins), puis les bords
(3), les coins s'en sortent mieux (2). Doubler les bits par symbole se
paie en dB : geler (F) en QPSK, basculer en 16-QAM, comparer.`,
  },
  {
    id: 'ser',
    title: 'Les courbes en cascade',
    params: { mod: '16qam', snrDb: 12, N: 4000 },
    view: 'ser',
    visible: ['mod'],
    notes: `L'axe SER est LOGARITHMIQUE : chaque graduation est un facteur 10.
Les points Monte Carlo collent à la théorie jusqu'à ce que les erreurs
deviennent trop rares pour être comptées (c'est déjà une leçon : simuler
un SER de 1e-6 demande des millions de symboles). Basculer BPSK → QPSK →
8-PSK → 16-QAM : les courbes se décalent vers la droite. À SER = 1e-3,
lire l'écart QPSK ↔ 16-QAM : ≈ 7 dB — le prix, en puissance, du débit
doublé. Tout le dimensionnement d'une liaison tient dans cette lecture.`,
  },
];
// notes: Teacher Mode only. Never projected by default, never in the URL.
