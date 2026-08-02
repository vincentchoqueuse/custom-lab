// Lecture script — auto-discovered by the registry.
export default [
  {
    id: 'two-tones',
    title: 'Scène 1 · Deux raies, une largeur',
    params: { win: 'rect', df: 15, a2: 0, N: 256, pad: 1, f1: 200 },
    visible: ['df', 'N'],
    notes: `Deux sinusoïdes de même amplitude, bien séparées. Question :
« pourquoi les raies ont-elles une LARGEUR, alors que le signal est deux
fréquences pures ? » — parce qu'on n'observe que N échantillons. La largeur,
c'est Fs/N (statline) : passer N de 256 à 1024 et regarder les raies maigrir.`,
  },
  {
    id: 'zero-padding',
    title: 'Scène 2 · Le zéro-padding ne résout rien',
    params: { win: 'rect', df: 3, a2: 0, N: 256, pad: 1, f1: 200 },
    visible: ['pad', 'df', 'N'],
    notes: `Δf = 3 Hz < Fs/N = 3.9 Hz : UNE seule bosse. Prédiction à main levée :
« si je zéro-padde ×16, je vois deux raies ? » Geler (F), passer ×16 : la courbe
est plus lisse… et toujours une bosse. Le padding interpole, il n'invente pas
d'information. Ce qui résout : N (passer à 1024 sépare).`,
  },
  {
    id: 'hidden-tone',
    title: 'Scène 3 · La raie cachée sous les lobes',
    params: { win: 'rect', df: 25, a2: -45, N: 256, pad: 4, f1: 200 },
    visible: ['win', 'a2'],
    notes: `Une seconde raie à −45 dB : invisible — noyée sous les lobes
secondaires de la fenêtre rectangulaire (−13 dB). Geler (F), passer à Hann
(−31 dB) : elle émerge à peine. Blackman (−58 dB) : la voilà. La fenêtre choisit
ce que vous avez le DROIT de voir.`,
  },
  {
    id: 'tradeoff',
    title: 'Scène 4 · Résolution contre dynamique',
    params: { win: 'hann', df: 6, a2: 0, N: 256, pad: 4, f1: 200 },
    visible: ['win', 'df'],
    notes: `Le prix de Hann : son lobe principal est 2× plus large. Δf = 6 Hz,
deux raies égales : rectangulaire les sépare, Hann les fond en une. Ouvrir
l'onglet « La fenêtre au microscope » : lobe principal large + lobes secondaires
bas, ou l'inverse — jamais les deux. Tout le fenêtrage est ce compromis.`,
  },
];
