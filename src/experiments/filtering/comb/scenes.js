// Lecture script — auto-discovered by the registry.
export default [
  {
    id: 'teeth',
    title: 'Scène 1 · Un écho fait un peigne',
    view: 'spectrum',
    params: { structure: 'ff', D: 40, g: 0.9, source: 'square', f0: 110 },
    visible: ['D', 'g'],
    notes: `Un seul écho (x + g·x[n−D]) et le spectre devient un peigne : dents
à k·Fs/D = k·200 Hz (+5.6 dB), creux entre (−20 dB à g = 0.9). Bouger D : les
dents se resserrent — l'espacement, c'est Fs/D, RIEN d'autre. Bouger g : la
profondeur. Deux paramètres, deux effets orthogonaux — le filtre le plus
lisible du cours.`,
  },
  {
    id: 'echo',
    title: "Scène 2 · L'écho récursif",
    view: 'impulse',
    params: { structure: 'ff', D: 40, g: 0.7, source: 'square', f0: 110 },
    visible: ['structure', 'g'],
    notes: `Réponse impulsionnelle de l'écho simple : DEUX pics. Basculer en
récursif : le train géométrique gᵏ — un écho de l'écho de l'écho (le harnais
vérifie h[kD] = gᵏ à la machine près). Monter g vers 0.95 : la traîne
s'éternise, les dents du peigne s'affinent en résonances. Teaser : pincez ce
filtre avec du bruit et vous avez une corde de guitare (Karplus-Strong).`,
  },
  {
    id: 'align',
    title: 'Scène 3 · Dents sur harmoniques',
    view: 'spectrum',
    params: { structure: 'fb', D: 32, g: 0.8, source: 'square', f0: 250 },
    visible: ['D', 'g'],
    notes: `f₀ = 250 Hz et Fs/D = 250 Hz : CHAQUE harmonique est assis sur une
dent — tout est amplifié de 14 dB d'un coup (statline). Geler (F), passer D à
35 : les harmoniques glissent dans les creux, le timbre se vide — c'est le
flanger. La question qui tue : « pourquoi l'effet dépend-il de f₀ alors que
le filtre n'a pas changé ? »`,
  },
  {
    id: 'sign',
    title: 'Scène 4 · Le peigne complémentaire',
    view: 'spectrum',
    params: { structure: 'ff', D: 40, g: 0.9, source: 'saw', f0: 110 },
    visible: ['g'],
    notes: `Glisser g de +0.9 à −0.9 : dents et creux S'ÉCHANGENT — les creux
viennent se poser sur k·Fs/D, et le continu est mangé (|H(0)| = 1−|g|).
Physique de l'écho inversé : à ces fréquences, l'écho revient en opposition
de phase. C'est le même déphasage qui creuse la réponse d'une salle près
d'un mur réfléchissant.`,
  },
];
