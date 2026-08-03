// Lecture script — auto-discovered by the registry.
export default [
  {
    id: 'cut',
    title: 'Scène 1 · Ce que la fenêtre jette',
    params: { sig: 'sine', T: 40, win: 'rect', f0: 300 },
    view: 'time',
    visible: ['T'],
    notes: `La figure de base : en gris le signal, qui continue ; en bleu ce qui
est réellement transformé ; le trait jaune marque l'instant où l'on coupe.
Bouger T et faire dire à voix haute ce qui change : le signal ne change PAS,
seule l'observation change.
Question à poser AVANT l'onglet Spectre :
« la sinusoïde n'a qu'une seule fréquence. Le spectre de ce que j'ai gardé
aura-t-il une seule raie ? »`,
  },
  {
    id: 'lobe',
    title: 'Scène 2 · Une raie devient un lobe de largeur 1/T',
    params: { sig: 'sine', T: 40, win: 'rect', f0: 300 },
    view: 'spectrum',
    visible: ['T'],
    lock: true,
    notes: `Réponse à la question précédente : non. Couper dans le temps, c'est
multiplier par une fenêtre, donc CONVOLUER le spectre par celui de la fenêtre.
La raie s'étale sur ≈ 1/T (statline : largeur à −3 dB, et 1/T à côté).
Axes figés : diviser T par deux et regarder le lobe doubler sans que le cadre
bouge. Le produit T·B₃ affiché reste à 0.886 — c'est la même constante que la
porte du catalogue de signaux, vue de l'autre côté.`,
  },
  {
    id: 'window',
    title: 'Scène 3 · La forme de la coupure fixe les jupes',
    params: { sig: 'sine', T: 40, win: 'rect', f0: 300 },
    view: 'spectrum',
    visible: ['win'],
    lock: true,
    notes: `À durée CONSTANTE, passer rectangulaire → Hann → Blackman.
Les lobes secondaires s'effondrent (−13 dB, −31 dB, −58 dB) mais le lobe
principal s'élargit : on n'achète de la dynamique qu'en payant de la
résolution. Il n'y a pas de fenêtre « meilleure », il y a la question posée.
Enchaîner sur « Fenêtrage spectral » pour le cas où deux raies voisines
doivent être séparées.`,
  },
  {
    id: 'law',
    title: 'Scène 4 · La loi en 1/T, mesurée',
    params: { sig: 'sine', T: 40, win: 'rect', f0: 300 },
    view: 'width',
    visible: ['T', 'win'],
    notes: `Log-log : une droite de pente −1 exactement. Ce n'est pas un ajustement,
c'est la largeur mesurée sur le spectre calculé, pour trente durées.
Changer de fenêtre : la droite se translate vers le haut sans changer de pente
— la forme change la constante, jamais la loi.
Le trait jaune repère la durée courante ; la déplacer fait glisser le point le
long de la droite.`,
  },
  {
    id: 'gabor',
    title: 'Scène 5 · Le chirp : plus long n\'est plus mieux',
    params: { sig: 'chirp', T: 20, win: 'hann', f0: 300, k: 2000 },
    view: 'width',
    visible: ['T', 'k'],
    notes: `Le chirp balaie k Hz par seconde. Observer plus longtemps affine la
résolution (1/T) mais laisse entrer une bande plus large (k·T) : la courbe n'est
plus une droite, c'est un V, et le creux est la MEILLEURE durée possible.
Faire lire les deux branches : à gauche la pente −1 de la troncature, à droite
la pente +1 du balayage. Le produit k·T² affiché dans le tiroir dit dans quel
régime on est — très petit à gauche, très grand à droite, de l'ordre de
quelques unités au creux.
C'est le compromis de Gabor, mesuré au lieu d'être récité, et c'est exactement
le choix de fenêtre du spectrogramme. Bouger k : le creux se déplace.`,
  },
  {
    id: 'damped',
    title: 'Scène 6 · Quand le signal, lui, s\'est déjà tu',
    params: { sig: 'damped', T: 20, win: 'rect', f0: 300, tau: 15 },
    view: 'width',
    visible: ['T', 'tau'],
    notes: `Sinusoïde amortie : tant que T < τ on coupe, et la largeur suit 1/T.
Au-delà, la courbe s'aplatit — on n'observe plus que du silence, et la raie
garde la largeur naturelle 1/(πτ) que le signal s'est donnée tout seul.
Morale : allonger la fenêtre n'améliore la résolution que si le signal est
encore là. Même leçon avec « salve » : passé la durée de la salve, on ajoute
des zéros, ce qui interpole le spectre sans rien résoudre.`,
  },
];
// notes: Teacher Mode only. Never projected by default, never in the URL.
