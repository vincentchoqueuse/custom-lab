// Lecture script — auto-discovered by the registry.
export default [
  {
    id: 'staircase',
    title: "Scène 1 · L'escalier",
    params: { b: 3, A: 0.9, f: 7.3, dither: false },
    visible: ['b'],
    notes: `b = 3 : 8 niveaux, l'escalier saute aux yeux. Geler (F), monter b
à 8 : l'escalier disparaît dans le trait. Question : « chaque bit supplémentaire
gagne combien de dB de SNR ? » (réponse dans la statline — la faire deviner
avant).`,
  },
  {
    id: 'uniform-error',
    title: "Scène 2 · L'erreur est (presque) uniforme",
    view: 'error-hist',
    params: { b: 8, A: 0.9, f: 7.3, dither: false },
    visible: ['b'],
    notes: `À b = 8, l'histogramme colle à la densité uniforme ±Δ/2 : c'est
l'hypothèse qui donne Δ²/12. Descendre b à 2 : l'histogramme se structure —
l'erreur n'est plus un « bruit », elle est corrélée au signal. Le modèle
uniforme est une APPROXIMATION, valable quand Δ est petit devant le signal.`,
  },
  {
    id: 'six-db',
    title: 'Scène 3 · 6 dB par bit',
    view: 'snr',
    params: { b: 8, A: 0.9, f: 7.3, dither: false },
    visible: ['b', 'A'],
    notes: `La droite mesurée épouse 6.02b + 1.76 + 20log₁₀A. Geler (F), passer
A de 0.9 à 0.45 : la droite descend de 6 dB — un demi-échelle gaspille un bit.
Moralité de conception : un CAN se remplit (et c'est tout l'art du gain
d'entrée).`,
  },
  {
    id: 'dither',
    title: 'Scène 4 · Le dither, ou le bruit qui aide',
    view: 'error',
    params: { b: 3, A: 0.8, f: 7.3, dither: true },
    visible: ['b', 'dither'],
    notes: `À b = 3 sans dither, l'erreur est un motif périodique accroché au
signal (distorsion). Geler (F), activer le dither : le motif se dissout en
bruit blanc — au prix de ~3 dB de SNR. Marteler R : le motif sans dither ne
change pas, le bruit dithéré si. C'est le compromis de tout CAN audio.`,
  },
];
