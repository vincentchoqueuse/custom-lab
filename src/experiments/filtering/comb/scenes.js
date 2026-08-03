// Lecture script — auto-discovered by the registry.
export default [
  {
    id: 'through',
    title: 'Scène 1 · Le signal entre, les échos sortent',
    view: 'response',
    params: { structure: 'fb', D: 40, g: 0.9, source: 'square', f0: 110 },
    visible: ['D', 'g'],
    notes: `Le filtre récursif le plus simple qui soit : la sortie se rajoute à
elle-même, retardée de D échantillons. Un écho de l'écho de l'écho — d'où le
IIR : une entrée finie donne une sortie qui ne s'arrête jamais tout à fait.
Bouger g vers 0.95 : la traîne s'éternise. Bouger D : les répétitions se
rapprochent.
Question à poser AVANT de passer en fréquence : « un simple écho, ça s'entend
comment sur un spectre ? » Réponse attendue : « ça ne change rien ».
Les deux onglets suivants montrent que si — un peigne, dents à Fs/D.`,
  },
  {
    id: 'teeth',
    title: 'Scène 2 · L\'écho fait un peigne',
    view: 'gain',
    params: { structure: 'fb', D: 40, g: 0.9, source: 'square', f0: 110 },
    visible: ['D', 'g'],
    notes: `Le spectre devient un peigne : des RÉSONANCES à k·Fs/D = k·200 Hz, très
pointues (+20 dB à g = 0.9), et des creux doux entre elles (−5.6 dB).
Bouger D : les dents se resserrent — l'espacement, c'est Fs/D, RIEN d'autre.
Bouger g : la hauteur des résonances, 1/(1−g), qui explose quand g approche 1.
Deux paramètres, deux effets orthogonaux — le filtre le plus lisible du cours.
Basculer sur « écho simple » (RIF) : les mêmes 200 Hz, mais les rôles
s'échangent, +5.6 dB de dents contre −20 dB de creux. Le récursif creuse peu
et résonne fort ; le non récursif fait l'inverse.`,
  },
  {
    id: 'echo',
    title: 'Scène 3 · Deux pics, ou une infinité',
    view: 'impulse',
    params: { structure: 'fb', D: 40, g: 0.7, source: 'square', f0: 110 },
    visible: ['structure', 'g'],
    notes: `Réponse impulsionnelle du récursif : le train géométrique gᵏ, un pic
tous les D échantillons qui décroît sans jamais s'annuler (le harnais vérifie
h[kD] = gᵏ à la machine près). C'est ça, une réponse impulsionnelle INFINIE.
Basculer sur « écho simple » : il ne reste que DEUX pics. Toute la différence
entre RIF et IIR tient dans cette bascule, et elle se voit d'un coup d'œil.
Teaser : pincez le récursif avec du bruit et vous avez une corde de guitare
(Karplus-Strong).`,
  },
  {
    id: 'align',
    title: 'Scène 4 · Dents sur harmoniques',
    view: 'gain',
    params: { structure: 'fb', D: 32, g: 0.8, source: 'square', f0: 250 },
    visible: ['D', 'g'],
    notes: `f₀ = 250 Hz et Fs/D = 250 Hz : CHAQUE harmonique est assis sur une
résonance — tout est amplifié de 14 dB d'un coup (statline). Geler (F), passer
D à 35 : les harmoniques glissent dans les creux, le timbre se vide — c'est le
flanger. La question qui tue : « pourquoi l'effet dépend-il de f₀ alors que
le filtre n'a pas changé ? »`,
  },
  {
    id: 'sign',
    title: 'Scène 5 · Le peigne complémentaire',
    view: 'gain',
    params: { structure: 'fb', D: 40, g: 0.9, source: 'saw', f0: 110 },
    visible: ['g'],
    notes: `Glisser g de +0.9 à −0.9 : résonances et creux S'ÉCHANGENT — les
résonances se posent maintenant entre les k·Fs/D, et le continu est mangé
(|H(0)| = 1/(1+|g|), soit −5.6 dB).
Physique de l'écho inversé : à ces fréquences, l'écho revient en opposition
de phase. C'est le même déphasage qui creuse la réponse d'une salle près
d'un mur réfléchissant.`,
  },
];
