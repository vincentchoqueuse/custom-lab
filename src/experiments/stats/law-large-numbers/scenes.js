// Lecture script. Auto-discovered by the registry.
export default [
  {
    id: 'convergence',
    title: 'Chaque trajectoire converge',
    params: { law: 'dice', n: 2000, K: 5 },
    visible: ['law', 'K'],
    notes: `K trajectoires de la moyenne de n dés : elles serpentent puis rentrent
TOUTES dans l'entonnoir jaune μ ± 2σ/√n (~95 % de chaque trajectoire).
Marteler R : nouvelles trajectoires, même destin. C'est la LGN — pas de hasard
sur la destination, seulement sur le chemin.
Lien avec le TCL : à n fixé, la dispersion verticale des trajectoires est
gaussienne — c'est l'expérience précédente vue de profil.`,
  },
  {
    id: 'lenteur',
    title: 'La convergence est lente (1/√n)',
    params: { law: 'dice', n: 10000, K: 5 },
    visible: ['n'],
    notes: `L'axe est LOGARITHMIQUE : l'entonnoir se resserre d'un facteur 10
tous les DEUX ordres de grandeur — un chiffre de précision en plus coûte
cent fois plus de tirages (1/√n).
Question : « combien de lancers pour trois décimales sur μ = 3.5 ? »
(≈ 3×10⁶ — hors de portée du slider, et c'est le message.)`,
  },
  {
    id: 'pile-ou-face',
    title: 'Pile ou face : la fréquence converge',
    params: { law: 'bernoulli', p: 0.5, n: 5000, K: 10 },
    visible: ['law', 'p'],
    notes: `La fréquence des « pile » converge vers p — l'expérience historique
(Buffon : 4040 lancers ; Pearson : 24 000). Ici : 10 trajectoires de 5000
lancers en un clic de R.
Baisser p à 0.05 : la convergence relative est bien plus lente — les
événements rares demandent beaucoup de données.`,
  },
];
// notes: Teacher Mode only. Never projected by default, never in the URL.
