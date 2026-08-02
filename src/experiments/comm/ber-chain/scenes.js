// Lecture script. Auto-discovered by the registry.
export default [
  {
    id: 'eb-honnete',
    title: 'Eb/N₀ : la comparaison honnête',
    params: { mod: 'qpsk', mapping: 'gray', ebn0Db: 6, Nbits: 20000 },
    view: 'ber',
    visible: ['mod', 'ebn0Db'],
    notes: `Pourquoi Eb/N₀ et pas Es/N₀ ? Parce qu'on paie l'énergie PAR BIT
transporté. Basculer BPSK → QPSK : les courbes BER se SUPERPOSENT —
la QPSK transporte deux bits pour le même Eb/N₀, cadeau apparent…
en réalité deux BPSK orthogonales (I et Q). C'est LE résultat qui
surprend : à énergie par bit égale, doubler le débit de la BPSK est
gratuit. 8-PSK et 16-QAM, elles, paient — les voisins se rapprochent
plus vite que k n'augmente.`,
  },
  {
    id: 'gray',
    title: 'Gray contre binaire naturel',
    params: { mod: '16qam', mapping: 'gray', ebn0Db: 8, Nbits: 40000 },
    visible: ['mapping'],
    notes: `Vue Constellation : en Gray, tous les voisins diffèrent d'UN bit —
lire les étiquettes. Une erreur de symbole (quasi toujours vers un
voisin) coûte donc un seul bit : les erreurs sont jaunes. Basculer en
binaire naturel : des voisins à 2 bits apparaissent (lire 0111↔1000
sur un axe), les erreurs ROUGES surgissent — même SER, plus de bits
faux. Vue BER : les points Monte Carlo décollent de la courbe théorique
Gray. Le mapping est gratuit en énergie et rapporte des dB : toujours
prendre Gray.`,
  },
  {
    id: 'cascade',
    title: 'Lire la cascade',
    params: { mod: '16qam', mapping: 'gray', ebn0Db: 10, Nbits: 40000 },
    view: 'ber',
    visible: ['mod', 'ebn0Db'],
    notes: `Lecture d'ingénieur sur l'axe log : à BER = 10⁻³, relever l'Eb/N₀
requis pour chaque modulation — BPSK/QPSK ≈ 6.8 dB, 8-PSK ≈ +3.5 dB,
16-QAM ≈ +3.3 dB. Chaque bit par symbole supplémentaire se paie en
puissance, mais économise de la bande : le compromis débit-puissance-
bande, tout le métier tient là. Question finale : « comment descendre
SOUS ces courbes ? » — le codage correcteur, chapitre suivant.`,
  },
];
// notes: Teacher Mode only. Never projected by default, never in the URL.
