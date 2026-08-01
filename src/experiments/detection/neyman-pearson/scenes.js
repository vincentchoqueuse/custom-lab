// Lecture script. Auto-discovered by the registry.
export default [
  {
    id: 'seuil',
    title: 'Le compromis du seuil',
    params: { snr: 1, pfa: 0.05, N: 10 },
    visible: ['pfa', 'snr'],
    notes: `Deux gaussiennes : la statistique T sous H₀ (bleu) et sous H₁ (orange).
Le seuil γ découpe P_FA (aire bleue à droite de γ) et P_D (aire orange).
Baisser P_FA au slider LOG : γ recule vers la droite, P_D s'effondre —
on ne choisit pas les deux. C'est tout Neyman-Pearson : fixer P_FA,
maximiser P_D. Monter le SNR : les bosses s'écartent, le dilemme s'adoucit.`,
  },
  {
    id: 'roc',
    title: 'La courbe ROC',
    params: { snr: 1, pfa: 0.05, N: 10, M: 10000 },
    view: 'roc',
    visible: ['snr', 'N'],
    notes: `Chaque valeur de γ est UN point ; la ROC est le lieu de tous les seuils.
Bouger P_FA : le point jaune glisse LE LONG de la courbe (même détecteur).
Monter SNR ou N : la courbe bombe vers le coin idéal (0, 1) — seul un
meilleur rapport signal à bruit change la courbe elle-même.
La diagonale pointillée : le détecteur pile-ou-face. Axe P_FA logarithmique :
le régime des fausses alarmes rares est là où vit la détection réelle.`,
  },
  {
    id: 'integration',
    title: 'Intégrer aide : P_D vs SNR',
    params: { snr: 0.5, pfa: 0.01, N: 10 },
    view: 'pd-vs-snr',
    visible: ['N', 'pfa'],
    notes: `À P_FA fixée, la courbe P_D(SNR) est une marche adoucie.
Doubler N : elle se décale de 3 dB vers la gauche (d² = N·SNR) —
intégrer deux fois plus longtemps vaut deux fois plus de puissance.
Plancher gris : à très bas SNR, P_D → P_FA (le détecteur devine).
Question : « pourquoi la pente est-elle si raide ? » — tout se joue
sur ~10 dB : en dessous on est aveugle, au-dessus c'est gagné.`,
  },
  {
    id: 'rare',
    title: 'Fausses alarmes rares (P_FA = 10⁻³)',
    params: { snr: 2, pfa: 1e-3, N: 10, M: 20000 },
    view: 'roc',
    visible: ['pfa', 'M'],
    notes: `P_FA = 10⁻³ et M = 20 000 tirages : on n'attend que ~20 fausses alarmes.
Marteler R : le point violet Monte Carlo danse fort en abscisse —
estimer un événement rare coûte cher en données (variance relative 1/√(M·P_FA)).
Descendre à 10⁻⁴ : le point violet peut disparaître (zéro fausse alarme
mesurée → hors de l'axe log). C'est LA raison d'être du slider logarithmique.`,
  },
];
// notes: Teacher Mode only. Never projected by default, never in the URL.
