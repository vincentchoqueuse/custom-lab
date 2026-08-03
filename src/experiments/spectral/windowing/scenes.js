// Lecture script — auto-discovered by the registry.
export default [
  {
    id: 'one-tone',
    title: 'Scène 1 · Une seule sinusoïde',
    view: 'spectrum',
    // the second tone is pushed 80 dB down: the picture is one line, and
    // nothing else, before anything is compared to anything
    params: { win: 'rect', df: 15, a2: -80, N: 256, pad: 1, f1: 200 },
    visible: ['N', 'f1', 'pad', 'a2'],
    notes: `Une sinusoïde à 200 Hz, rien d'autre. Le spectre n'est pas un trait :
c'est un pic AVEC une largeur et des pieds qui traînent. Question à poser
d'abord : « le signal est une fréquence pure, pourquoi le spectre ne l'est-il
pas ? » — parce qu'on n'observe que N échantillons, jamais l'infini.
Passer N de 256 à 1024 : le pic maigrit (largeur = Fs/N, dans la statline).
Bouger f₁ : le pic se déplace, sa forme ne change pas. Une fois ce dessin
compris, tout le reste de l'expérience en découle.`,
  },
  {
    id: 'two-tones',
    title: 'Scène 2 · Deux raies, une largeur',
    view: 'spectrum',
    params: { win: 'rect', df: 15, a2: 0, N: 256, pad: 1, f1: 200 },
    visible: ['df', 'N', 'pad', 'a2'],
    notes: `Deux sinusoïdes de même amplitude, bien séparées. Question :
« pourquoi les raies ont-elles une LARGEUR, alors que le signal est deux
fréquences pures ? » — parce qu'on n'observe que N échantillons. La largeur,
c'est Fs/N (statline) : passer N de 256 à 1024 et regarder les raies maigrir.`,
  },
  {
    id: 'zero-padding',
    title: 'Scène 3 · Le zero-padding ne résout rien',
    view: 'spectrum',
    params: { win: 'rect', df: 3, a2: 0, N: 256, pad: 1, f1: 200 },
    visible: ['pad', 'df', 'a2'],
    notes: `Δf = 3 Hz < Fs/N = 3.9 Hz : UNE seule bosse. Prédiction à main levée :
« si je fais un zero-padding ×16, je vois deux raies ? » Geler (F), passer ×16 : la courbe
est plus lisse… et toujours une bosse. Le zero-padding interpole, il n'invente pas
d'information. Ce qui résout : N (passer à 1024 sépare).`,
  },
  {
    id: 'hidden-tone',
    title: 'Scène 4 · La raie cachée sous les lobes',
    view: 'spectrum',
    params: { win: 'rect', df: 25, a2: -45, N: 256, pad: 4, f1: 200 },
    visible: ['win', 'a2', 'pad'],
    notes: `Une seconde raie à −45 dB : invisible — noyée sous les lobes
secondaires de la fenêtre rectangulaire (−13 dB). Geler (F), passer à Hann
(−31 dB) : elle émerge à peine. Blackman (−58 dB) : la voilà. La fenêtre choisit
ce que vous avez le DROIT de voir.`,
  },
  {
    id: 'tradeoff',
    title: 'Scène 5 · Résolution contre dynamique',
    view: 'spectrum',
    params: { win: 'hann', df: 6, a2: 0, N: 256, pad: 4, f1: 200 },
    visible: ['win', 'df', 'pad', 'a2'],
    notes: `Le prix de Hann : son lobe principal est 2× plus large. Δf = 6 Hz,
deux raies égales : rectangulaire les sépare, Hann les fond en une. Ouvrir
l'onglet « La fenêtre au microscope » : lobe principal large + lobes secondaires
bas, ou l'inverse — jamais les deux. Tout le fenêtrage est ce compromis.`,
  },
];
