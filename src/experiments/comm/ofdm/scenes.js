// Lecture script — auto-discovered by the registry.
export default [
  {
    id: 'selective',
    title: 'Scène 1 · Le canal creuse des trous',
    params: { Nc: 64, L: 6, cp: 8, snr: 15, M: 50 },
    visible: ['L'],
    notes: `Six trajets, et le spectre du canal devient un paysage : des crêtes
et des ÉVANOUISSEMENTS à −20, −30 dB. Marteler R : chaque tirage donne un autre
canal, mais toujours des trous. Question : « une porteuse au fond d'un trou,
que peut-elle transmettre ? » — rien, et aucune égalisation ne l'en sortira.
Descendre L à 1 : le canal redevient plat. La sélectivité vient des ÉCHOS.`,
  },
  {
    id: 'one-tap',
    title: 'Scène 2 · Le miracle de la FFT',
    view: 'constellation',
    params: { Nc: 64, L: 6, cp: 8, snr: 20, M: 50 },
    visible: ['snr', 'L'],
    notes: `Avant égalisation (violet) : un nuage tordu, chaque porteuse tournée
et comprimée par SON H_k. Après (bleu) : UNE division par porteuse — un seul
coefficient ! — et la QPSK réapparaît. C'est le théorème central : avec le
préfixe, la convolution devient circulaire et la FFT DIAGONALISE le canal.
L'égaliseur de 60 coefficients du single-carrier est devenu 64 divisions.`,
  },
  {
    id: 'prefix',
    title: 'Scène 3 · Saboter le préfixe',
    view: 'constellation',
    params: { Nc: 64, L: 6, cp: 8, snr: 25, M: 50, seed: 5 },
    visible: ['cp'],
    notes: `SNR = 25 dB, tout va bien. Geler (F), puis descendre L_cp de 8 à 0 :
des points s'échappent ALORS QUE le bruit n'a pas bougé — l'ISI du symbole
précédent fuit dans la fenêtre FFT, et l'égalisation ZF l'AMPLIFIE sur les
porteuses évanouies (statline : BER ≈ 1.7 %, une porteuse à ~40 %). Monter le
SNR à 30 : rien ne s'arrange — plancher d'erreur. Marteler R : la sévérité
dépend du canal tiré (l'ISI tue par les évanouissements). Le tiroir Parameters
affiche « préfixe suffisant ? NON ». Les échantillons « gaspillés » du préfixe
sont le prix de la diagonalisation.`,
  },
  {
    id: 'fades',
    title: 'Scène 4 · Les erreurs habitent les trous',
    view: 'ber',
    params: { Nc: 64, L: 6, cp: 8, snr: 12, M: 200 },
    visible: ['snr', 'M'],
    notes: `Le BER porteuse par porteuse (points) sur la théorie ZF
Q(√(|H_k|²·SNR)) (orange). Mettre côte à côte avec l'onglet Canal : les pics
d'erreurs sont EXACTEMENT les évanouissements. Ouverture : c'est pour ça que
l'OFDM ne vit jamais seul — entrelacement + codage (voir Hamming et décodage
souple) répartissent l'information entre bonnes et mauvaises porteuses.`,
  },
];
