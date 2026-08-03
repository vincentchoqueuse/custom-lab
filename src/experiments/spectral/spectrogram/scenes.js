// Lecture script — auto-discovered by the registry.
export default [
  {
    id: 'gabor',
    title: 'Scène 1 · Le compromis de Gabor',
    params: { source: 'chirp', f1: 900, N: 256, win: 'hann', tcut: 1 },
    visible: ['N'],
    notes: `Un chirp, une diagonale. Geler (F) à N = 64 : le temps est net, la
fréquence baveuse. Passer N = 1024 : l'inverse. Statline : Δf·Δt = 1, toujours
— on ne choisit pas d'être bon partout, on choisit OÙ être bon. C'est le
principe d'incertitude, version traitement du signal.`,
  },
  {
    id: 'tones',
    title: 'Scène 2 · Deux notes, combien de temps pour les distinguer ?',
    params: { source: 'tones', df: 15, N: 64, win: 'hann', tcut: 1 },
    visible: ['N', 'df'],
    notes: `Deux tons à 15 Hz d'écart, fenêtre courte : UNE bande. Question à la
salle : « il faut écouter combien de temps pour entendre deux notes ? »
Réponse : ~1/Δf. Monter N jusqu'à la séparation (N = 256 : Δf devient 7.8 Hz).
L'oreille fait exactement ce calcul.`,
  },
  {
    id: 'aliasing',
    title: 'Scène 3 · Le rebond sur Nyquist',
    params: { source: 'chirp', f1: 2800, N: 256, win: 'hann', tcut: 1 },
    visible: ['f1'],
    notes: `Prédiction AVANT de monter f₁ : « le chirp monte, que fait la crête
en atteignant 1000 Hz ? » Elle REBONDIT — repliement en zigzag, la signature
visuelle du théorème d'échantillonnage. Relier à l'expérience Échantillonnage :
même phénomène, vu cette fois dans le plan temps-fréquence.`,
  },
  {
    id: 'am',
    title: 'Scène 4 · Deux descriptions du même signal',
    params: { source: 'am', fm: 8, N: 128, win: 'hann', tcut: 1 },
    visible: ['N', 'fm'],
    notes: `AM à f_m = 8 Hz. Fenêtre courte (N = 128, Δt = 64 ms) : on VOIT le
battement — des colonnes qui pulsent. Geler (F), passer N = 1024 (Δt = 512 ms,
Δf = 2 Hz) : le battement disparaît, remplacé par TROIS raies — porteuse et
bandes latérales à ±f_m. Aucune des deux images n'est fausse : c'est la même
physique, projetée sur deux résolutions.`,
  },
  {
    id: 'fm',
    title: 'Scène 5 · Deux crêtes qui se croisent',
    params: { source: 'fm', f1: 900, fmod: 1, fdev: 150, N: 256, win: 'hann', tcut: 0.5 },
    visible: ['fmod', 'fdev'],
    notes: `Un chirp ET une sinusoïde dont la fréquence oscille lentement : une
droite qui monte, une sinusoïde qui ondule autour de 500 Hz, et elles se
croisent. Aucun spectre ne peut montrer ça — c'est exactement pour cette
image que le spectrogramme existe.
Monter f_mod : l'ondulation se resserre, puis se BROUILLE — la fréquence
change trop vite pour la fenêtre. Descendre N à 64 : la crête FM redevient
nette et la ligne du chirp s'épaissit. C'est Gabor, avec deux signaux qui
demandent des réglages opposés dans la même image.
Élargir Δ : l'excursion grandit jusqu'à toucher le chirp.`,
  },
];
