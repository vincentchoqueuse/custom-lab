// Lecture script — auto-discovered by the registry.
export default [
  {
    id: 'at-work',
    title: 'Scène 1 · Le filtre au travail',
    params: { sigw: 0.1, sigv: 1, N: 120 },
    visible: ['sigv', 'sigw'],
    notes: `Marteler R : les mesures violettes changent, l'estimée orange reste
dans son tube ±3σ — et le tube, lui, ne bouge pas (il ne dépend pas des données).
Question : « d'où le filtre sait-il de combien il se trompe SANS connaître x ? »`,
  },
  {
    id: 'good-sensor',
    title: 'Scène 2 · Capteur excellent, modèle incertain',
    params: { sigw: 0.5, sigv: 0.05, N: 120 },
    visible: ['sigv', 'sigw'],
    notes: `Geler (F), puis passer sur cette scène : l'estimée colle aux mesures.
Ouvrir l'onglet Gain : K∞ ≈ 1 — le filtre croit son capteur, pas son modèle.
Question avant de montrer : « vers quoi doit tendre K ici ? »`,
  },
  {
    id: 'good-model',
    title: 'Scène 3 · Capteur médiocre, modèle sûr',
    params: { sigw: 0.01, sigv: 3, N: 120 },
    visible: ['sigv', 'sigw'],
    notes: `L'inverse : K∞ ≈ 0, le filtre lisse fort et traîne derrière les
virages. Faire le lien : K est le curseur confiance-capteur / confiance-modèle,
et c'est Riccati qui le règle, pas nous.`,
  },
  {
    id: 'consistency',
    title: 'Scène 4 · Le filtre se connaît',
    view: 'consistency',
    params: { sigw: 0.1, sigv: 1, N: 500 },
    visible: ['N'],
    notes: `L'erreur réelle x̂ − x (inconnue en pratique !) vit dans le tube ±3σ
que le filtre a prédit tout seul. Faire compter les points dehors : ~1 sur 370.
C'est la propriété qui rend Kalman utilisable : il fournit l'estimée ET sa barre
d'erreur.`,
  },
];
