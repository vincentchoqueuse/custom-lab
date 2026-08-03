// Lecture script. Auto-discovered by the registry.
export default [
  {
    id: 'invisible',
    title: 'Où est l\'impulsion ?',
    params: { shape: 'rect', N: 32, snr: 0.1, tau: 32, M: 800 },
    visible: ['snr'],
    notes: `SNR = 0.1 par échantillon (−10 dB) : l'impulsion orange est NOYÉE dans
r[n] — faire chercher la salle, personne ne la voit. Marteler R : rien.
Question : « l'information est-elle perdue ? » Non — on CONNAÎT la forme
qu'on cherche, et on ne l'a pas encore utilisée. Passer à la vue
suivante.`,
  },
  {
    id: 'pic',
    title: 'Le pic sort du bruit',
    params: { shape: 'rect', N: 32, snr: 0.1, tau: 32, M: 800 },
    view: 'correlator',
    visible: ['snr', 'tau'],
    notes: `Même signal, même bruit — mais corrélé avec la forme connue : le pic
est à τ, exactement (τ̂ violet sur τ jaune). Marteler R : le bruit de
sortie change, le pic tient. Bouger τ : le pic SUIT. Le corrélateur
concentre toute l'énergie de l'impulsion (E = N·SNR) sur UN retard,
pendant que le bruit ne s'additionne qu'en √N. Baisser le SNR jusqu'à
perdre le pic (~0.02) : la limite existe, mais elle est 15 dB plus bas
que l'œil.`,
  },
  {
    id: 'gain',
    title: '+3 dB par doublement',
    params: { shape: 'rect', N: 32, snr: 0.2, tau: 32, M: 2000 },
    view: 'processing',
    visible: ['N', 'shape'],
    notes: `SNR de sortie = N·SNR d'entrée : chaque doublement de N gagne 3 dB —
la droite en axe log-N, confirmée par le Monte Carlo (points orange).
Changer la forme (rect → demi-sinus → gaussienne) : RIEN ne bouge.
À énergie égale, la forme est indifférente : le filtre adapté n'exploite
que l'énergie et la connaissance de la forme, pas la forme elle-même.
C'est le radar, le GPS, et la raison des codes longs.`,
  },
];
// notes: Teacher Mode only. Never projected by default, never in the URL.
