// Lecture script — auto-discovered by the registry.
export default [
  {
    id: 'through',
    title: 'Scène 1 · Le signal entre, le signal sort',
    view: 'time',
    params: { source: 'square', f0: 110, fc: 500, Q: 2, output: 'lp' },
    visible: ['fc', 'output'],
    notes: `Deux multiplications par échantillon, et le carré s'arrondit. Bouger f_c
et regarder la sortie changer de forme en direct ; changer de sortie (passe-bas,
passe-haut, passe-bande, notch) sans rien recalculer d'autre — c'est TOUT
l'intérêt de la structure à variables d'état.
Question à poser avant de changer d'onglet : « quelle sortie donne un signal
qui ressemble encore à un carré ? » Le passe-haut : il garde les angles et
jette la pente.`,
  },
  {
    id: 'sculpt',
    title: 'Scène 2 · Sculpter les harmoniques',
    view: 'outputs',
    params: { source: 'square', f0: 110, fc: 500, Q: 2, output: 'lp' },
    visible: ['fc', 'output'],
    notes: `Lire la courbe passe-bas : elle vaut 1 jusqu'à f_c puis s'effondre.
Le carré d'entrée est un peigne d'harmoniques impairs à 110, 330, 550, 770 Hz ;
chacun est MULTIPLIÉ par la valeur de la courbe à sa fréquence — c'est tout ce
que fait un filtre, harmonique par harmonique (le harnais le vérifie à 1e-6).
Faire l'exercice à voix haute : à f_c = 500 Hz, lesquels survivent ?
Puis revenir au temporel pour voir le carré arrondi que ça donne. Descendre
f_c sous 330 Hz : il ne reste que la fondamentale — un sinus.`,
  },
  {
    id: 'resonance',
    title: 'Scène 3 · La résonance chante',
    view: 'outputs',
    params: { source: 'saw', f0: 110, fc: 550, Q: 12, output: 'lp' },
    visible: ['fc', 'Q'],
    notes: `Q = 12 : une bosse de +20 dB à f_c. L'harmonique qui passe dessous
est PROJETÉ en avant — glisser f_c lentement de 300 à 1200 Hz : la bosse
balaie les harmoniques un à un. C'est exactement le geste du filtre d'un
synthétiseur (le « wah » : f_c qui bouge, rien d'autre). Revenir au temporel :
le ringing à f_c s'installe dans la forme d'onde, et l'impulsionnelle montre
la même chose — une oscillation qui met d'autant plus longtemps à mourir que
Q est grand.`,
  },
  {
    id: 'four',
    title: 'Scène 4 · Quatre filtres pour deux multiplications',
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
    title: 'Scène 5 · Le notch chirurgical',
    view: 'outputs',
    params: { source: 'square', f0: 110, fc: 330, Q: 8, output: 'notch' },
    visible: ['fc', 'Q'],
    notes: `Courbe notch : une encoche qui plonge exactement à f_c (propriété du
choix f₁ = 2·sin(πf_c/Fs), vérifiée par le harnais). Posée sur 330 Hz, elle
tombe pile sur l'harmonique 3 du carré, qui DISPARAÎT.
Vue temporelle : le carré est à peine altéré —
un harmonique ne pèse presque rien dans la forme. Monter Q : l'encoche
s'affine, les voisins respirent. C'est le filtre anti-50 Hz de tout
instrument de mesure.`,
  },
];
