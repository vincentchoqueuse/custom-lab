// Lecture script — auto-discovered by the registry.
export default [
  {
    id: 'moindres-carres',
    title: 'Scène 1 · Ce que « moindres carrés » veut dire',
    params: { a: 1.5, b: 1, sigma: 1, N: 20, spread: 3, outlier: 0 },
    view: 'fit',
    visible: ['sigma'],
    notes: `Les traits gris verticaux SONT la quantité minimisée : la somme de
leurs carrés, affichée dans la statline. Pas la distance à la droite, pas
l'écart horizontal — l'écart VERTICAL, parce que c'est y qu'on cherche à
prédire à partir de x.
Question à poser en montrant la droite jaune (la vraie) et la bleue
(l'ajustée) : « pourquoi ne se superposent-elles pas ? » — parce qu'on
n'observe pas la droite, on observe 20 points bruités.
Marteler R pour retirer : la bleue danse autour de la jaune. C'est déjà
la scène 3.`,
  },
  {
    id: 'residus',
    title: 'Scène 2 · Les résidus, seul diagnostic honnête',
    params: { a: 1.5, b: 1, sigma: 1, N: 40, spread: 3, outlier: 0 },
    view: 'residuals',
    visible: ['sigma', 'N'],
    notes: `Avec le bon modèle, les résidus n'ont AUCUNE structure : un nuage
informe autour de zéro. C'est ce qu'il faut regarder avant de croire un R².
Deux propriétés exactes, vérifiées par le harnais numérique : leur somme
est nulle, et leur produit scalaire avec x est nul. Autrement dit la droite
a extrait tout ce que x pouvait dire de y — ce qui reste lui est orthogonal.
Enchaîner sur « Régression polynomiale » : quand une COURBURE apparaît ici,
c'est que la droite ne suffit plus.`,
  },
  {
    id: 'levier',
    title: 'Scène 3 · Écarter les x vaut mieux qu\'en ajouter',
    params: { a: 1.5, b: 1, sigma: 1.5, N: 20, spread: 1, outlier: 0 },
    view: 'sampling',
    visible: ['spread', 'N'],
    lock: true,
    notes: `Quatre cents expériences répétées : l'histogramme est la loi de â.
Sa largeur théorique est σ/√Sxx, superposée en jaune — les deux se collent.
Question AVANT de bouger : « pour mieux estimer la pente, vaut-il mieux
doubler le nombre de points ou doubler l'étendue des x ? »
Réponse : doubler L divise l'écart-type par DEUX, doubler N seulement par
√2. Le faire, les deux repères de la statline le confirment.
C'est le plan d'expérience en une phrase : où l'on place les points compte
plus que combien on en place.`,
  },
  {
    id: 'aberrant',
    title: 'Scène 4 · Un seul point suffit à tout tordre',
    params: { a: 1.5, b: 1, sigma: 0.6, N: 20, spread: 3, outlier: 0 },
    view: 'fit',
    visible: ['outlier'],
    notes: `Geler (F) avec un ajustement propre, puis éloigner LE dernier point.
La droite bleue part le rejoindre : élever au carré, c'est donner à l'écart
le plus grand un poids écrasant. Le point est au bord, donc son levier est
maximal — la scène 3 explique pourquoi.
Regarder R² s'effondrer, et surtout l'onglet Résidus : un résidu géant
isolé, signature d'une donnée aberrante et pas d'un mauvais modèle.
Morale : les moindres carrés n'ont aucune défense contre une valeur fausse.
C'est la porte d'entrée des méthodes robustes.`,
  },
];
// notes: Teacher Mode only. Never projected by default, never in the URL.
