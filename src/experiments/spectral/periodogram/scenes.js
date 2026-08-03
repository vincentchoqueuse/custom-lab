// Lecture script — auto-discovered by the registry.
export default [
  {
    id: 'grass',
    title: 'Scène 1 · L’herbe qui ne se couche jamais',
    view: 'spectrum',
    params: { method: 'raw', N: 512, L: 256, win: 'rect', snr: 10, a2: -20, df: 40 },
    visible: ['N', 'snr'],
    notes: `Le périodogramme brut d'un signal bruité. La raie forte sort, la
faible aussi, mais entre les deux : de l'herbe, sur 15 dB.

LA question, à poser AVANT de toucher à N :
« Je multiplie la longueur du signal par seize. L'herbe se couche ? »
Réponse attendue de la salle : oui, évidemment, plus de données =
moins de bruit. Geler (F), puis passer N de 512 à 8192.

L'herbe ne bouge pas d'un décibel. Il y a seize fois plus de points,
tous aussi bruités. Lire à voix haute la statline : « fluctuation
σ/moyenne » reste collée à 1.

C'est LE résultat du chapitre : le périodogramme n'est pas consistant.
Chaque point suit une loi du χ² à 2 degrés de liberté, dont l'écart-type
égale la moyenne — et ça ne dépend pas de N. Allonger l'enregistrement
affine la RÉSOLUTION, jamais la variance.`,
  },
  {
    id: 'welch',
    title: 'Scène 2 · Moyenner, et payer en résolution',
    view: 'spectrum',
    params: { method: 'welch', N: 2048, L: 256, win: 'hann', snr: 10, a2: -20, df: 40 },
    visible: ['method', 'L'],
    notes: `Mêmes données, autre lecture. Welch découpe l'enregistrement en
segments recouverts, fenêtre chacun, et moyenne les périodogrammes.
L'herbe se couche : σ/moyenne tombe vers 1/√K, et K est dans la statline.

Le prix se voit en glissant L de 1024 à 64 :
  L grand  → peu de segments, spectre fin mais toujours bruité
  L petit  → beaucoup de segments, spectre lisse mais raies élargies
Le produit ne s'améliore pas — on ne fait que choisir où mettre
l'information. C'est le même compromis que le fenêtrage, vu du côté
de la VARIANCE au lieu de la résolution.

Comparer method = Bartlett et Welch à L égal : Welch obtient presque
deux fois plus de segments des mêmes données.

Et LA question qui donne son sens à la fenêtre — passer Welch de Hann à
rectangulaire, à L égal. Le gain fond. Deux segments recouverts à 50 %
partagent la moitié de leurs échantillons : sans atténuation sur les
bords ils sont fortement corrélés, et moyenner des choses corrélées ne
divise pas la variance par leur nombre. Mesuré au harnais : Welch+Hann
tient la loi à 1.0, Welch+rectangulaire la rate de 20 %.
Le recouvrement de Welch ne paie qu'avec une fenêtre qui s'efface sur
les bords — c'est la raison d'être de cette fenêtre, pas un détail.`,
  },
  {
    id: 'buried',
    title: 'Scène 3 · Deux façons de perdre une raie',
    view: 'spectrum',
    params: { method: 'welch', N: 4096, L: 512, win: 'rect', snr: 10, a2: -35, df: 12 },
    visible: ['win', 'a2', 'df'],
    notes: `La raie faible (verte) est à −35 dB et à 12 Hz de la forte. Elle est
invisible — mais POURQUOI ? Deux causes, qu'il faut faire nommer
séparément par la salle avant de les traiter :

  1. elle est sous l'HERBE  → c'est la variance. Remède : moyenner.
     Baisser L, regarder l'herbe descendre.
  2. elle est sous les LOBES de la voisine → c'est la fuite. Aucun
     moyennage n'y fera rien : passer win de rectangulaire à Hann,
     puis Blackman, et la voir sortir d'un coup.

Le diagnostic est la compétence : moyenner un problème de fuite ne
sert à rien, changer de fenêtre pour un problème de variance non plus.`,
  },
  {
    id: 'law',
    title: 'Scène 4 · La pente −1/2',
    view: 'consistency',
    params: { method: 'welch', N: 4096, L: 256, win: 'hann', snr: 10, a2: -20, df: 40 },
    visible: ['method', 'N'],
    notes: `La même mesure, répétée pour des segments de plus en plus courts, en
log-log. La courbe bleue est la fluctuation mesurée, la pointillée est
1/√K. Elles se superposent sur deux décades.

À faire remarquer : le point tout à gauche, K = 1, EST le périodogramme
brut de la scène 1. Il n'est pas une méthode à part — c'est le cas
dégénéré de celle-ci, celui où l'on ne moyenne rien.

Basculer method entre Bartlett et Welch, et regarder par rapport à la
pointillée : Bartlett colle à 1/√K, Welch se tient légèrement AU-DESSUS.
Ce n'est pas un défaut de la mesure — 1/√K est la loi de segments
INDÉPENDANTS, et ceux de Welch partagent la moitié de leurs échantillons.
Ce que Welch gagne n'est donc pas de battre la loi, c'est d'atteindre un
K deux fois plus grand à longueur de segment — donc à résolution — égale.`,
  },
];
// notes: Teacher Mode only. Never projected by default, never in the URL.
