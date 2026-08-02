// Lecture script — auto-discovered by the registry.
export default [
  {
    id: 'sculpt',
    title: 'Scène 1 · Sculpter les harmoniques',
    view: 'spectrum',
    params: { source: 'square', f0: 110, fc: 500, Q: 2, output: 'lp' },
    visible: ['fc', 'output'],
    notes: `Le carré est un peigne d'harmoniques impairs (violet). Le passe-bas
les fait fondre au-delà de f_c : le peigne bleu ÉPOUSE la courbe |H| orange —
la sortie, c'est l'entrée × le filtre, harmonique par harmonique (le harnais
le vérifie à 1e-6). Basculer sur le temporel : le carré s'est arrondi.
Descendre f_c sous 330 Hz : il ne reste que la fondamentale — un sinus.`,
  },
  {
    id: 'resonance',
    title: 'Scène 2 · La résonance chante',
    view: 'spectrum',
    params: { source: 'saw', f0: 110, fc: 550, Q: 12, output: 'lp' },
    visible: ['fc', 'Q'],
    notes: `Q = 12 : une bosse de +20 dB à f_c. L'harmonique qui passe dessous
est PROJETÉ en avant — glisser f_c lentement de 300 à 1200 Hz : la bosse
balaie les harmoniques un à un. C'est exactement le geste du filtre d'un
synthétiseur (le « wah » : f_c qui bouge, rien d'autre). Vue temporelle :
la sonnerie (ringing) à f_c s'installe dans la forme d'onde.`,
  },
  {
    id: 'four',
    title: 'Scène 3 · Quatre filtres pour deux multiplications',
    view: 'outputs',
    params: { source: 'square', f0: 110, fc: 600, Q: 2, output: 'lp' },
    visible: ['Q', 'fc'],
    notes: `La structure de Chamberlin : DEUX multiplications par échantillon,
et les quatre sorties existent simultanément — passe-bas, passe-bande,
passe-haut, notch. Monter Q : les quatre réponses se cambrent ensemble autour
du même f_c (mêmes pôles, numérateurs différents). C'est pour ça que le SVF
règne sur les synthétiseurs depuis les années 80.`,
  },
  {
    id: 'notch',
    title: 'Scène 4 · Le notch chirurgical',
    view: 'spectrum',
    params: { source: 'square', f0: 110, fc: 330, Q: 8, output: 'notch' },
    visible: ['fc', 'Q'],
    notes: `f_c posé sur l'harmonique 3 (330 Hz) : il DISPARAÎT — le zéro du
notch tombe exactement à f_c (propriété du choix f₁ = 2·sin(πf_c/Fs),
vérifiée par le harnais). Vue temporelle : le carré est à peine altéré —
un harmonique ne pèse presque rien dans la forme. Monter Q : l'encoche
s'affine, les voisins respirent. C'est le filtre anti-50 Hz de tout
instrument de mesure.`,
  },
];
