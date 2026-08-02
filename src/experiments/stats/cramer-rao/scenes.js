// Lecture script. Auto-discovered by the registry.
export default [
  {
    id: 'plancher',
    title: 'Le plancher',
    params: { mu: 2, sigma: 1.5, N: 20, M: 3000 },
    view: 'variance',
    visible: ['sigma'],
    notes: `La ligne jaune pointillée est σ²/N : AUCUN estimateur sans biais ne
peut descendre dessous — c'est un théorème, pas une observation.
x̄ (bleu) est POSÉ sur le plancher : il est efficace, inutile de
chercher mieux. La médiane (verte) est parallèle, π/2 au-dessus.
La mi-étendue (violette) DÉCROCHE : sa variance ne descend qu'en
1/ln N — collecter plus de données ne l'aide presque plus. Monter σ :
tout le plancher monte en σ².`,
  },
  {
    id: 'prix',
    title: 'Trois largeurs pour un même N',
    params: { mu: 2, sigma: 1.5, N: 50, M: 5000 },
    view: 'sampling',
    visible: ['N'],
    notes: `Le même budget de données, trois précisions. La courbe jaune est la
MEILLEURE distribution possible — N(μ, σ²/N), dictée par Cramér-Rao —
et l'histogramme de x̄ la remplit exactement. Question : « que jette la
médiane ? » — les valeurs, elle ne garde que les rangs. « Et la
mi-étendue ? » — tout sauf deux points, les pires (les extrêmes).
L'efficacité, c'est l'information de Fisher réellement consommée.`,
  },
  {
    id: 'efficacite',
    title: 'L\'efficacité, chiffrée',
    params: { mu: 2, sigma: 1.5, N: 100, M: 5000 },
    view: 'efficiency',
    visible: ['N', 'M'],
    notes: `CRB/Var : x̄ vaut 1 à tout N. La médiane converge vers 2/π ≈ 0.637
(ligne verte pointillée) : 36% de l'information jetée, POUR TOUJOURS —
mais c'est le prix de la robustesse (revoir la cible biais-variance).
La mi-étendue glisse vers 0. Lien MV : l'estimateur du maximum de
vraisemblance est asymptotiquement efficace — c'est LE théorème qui
justifie tout le chapitre maximum de vraisemblance.`,
  },
];
// notes: Teacher Mode only. Never projected by default, never in the URL.
