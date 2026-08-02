// Lecture script. Auto-discovered by the registry.
export default [
  {
    id: 'principe',
    title: 'Le bon modèle (d=3)',
    params: { d: 3, N: 30, sigma: 0.3, lambda: 0.001 },
    visible: ['d', 'sigma'],
    notes: `Le vrai polynôme est de degré 3, on estime un degré 3 : tout va bien.
Marteler R : le bruit change, la courbe orange reste proche de la bleue.
Monter σ pour montrer la dégradation, puis passer à la vue Coefficients :
les barres orange (estimées) encadrent les points bleus (vrais).`,
  },
  {
    id: 'sous-ajustement',
    title: 'Sous-ajustement (d=1)',
    params: { d: 1, N: 30, sigma: 0.3, lambda: 0.001 },
    visible: ['d'],
    notes: `Une droite ne peut pas suivre une cubique : erreur de biais.
Question : « augmenter N va-t-il aider ? » Non — le modèle est trop pauvre,
les résidus restent structurés quel que soit N. Monter d en direct : 1 → 2 → 3.`,
  },
  {
    id: 'sur-ajustement',
    title: 'Sur-ajustement (d=9)',
    params: { d: 9, N: 15, sigma: 0.4, lambda: 0.001 },
    visible: ['d', 'N'],
    notes: `10 coefficients pour 15 points : le polynôme colle au bruit.
Marteler R : la courbe orange danse violemment — variance énorme.
Vue Coefficients : les aₖ estimés explosent alors que les vrais sont sages.
Puis monter N à 200 : le sur-ajustement se calme (mais d=3 reste meilleur).`,
  },
  {
    id: 'ridge',
    title: 'Ridge : dompter le degré 9',
    params: { d: 9, N: 15, sigma: 0.4, lambda: 0.001 },
    view: 'ridge',
    visible: ['lambda'],
    notes: `Même situation catastrophique (d=9, 15 points), mais un nouveau bouton : λ.
À λ = 0.001 la courbe verte (ridge) se confond avec l'orange (moindres carrés).
Geler (F), puis monter λ : la verte se calme et se rapproche de la bleue —
on PÉNALISE les grands coefficients : min ‖y−Xa‖² + λ‖a‖².
Marteler R à λ ≈ 10 : la verte danse beaucoup moins que l'orange.
Trop de λ : la courbe s'écrase — on a échangé de la variance contre du biais.`,
  },
  {
    id: 'compromis',
    title: 'Le compromis biais–variance',
    params: { d: 9, N: 15, sigma: 0.4, lambda: 1 },
    view: 'tradeoff',
    visible: ['lambda', 'd'],
    notes: `LA courbe du chapitre : EQM(λ) = biais²(λ) + variance(λ).
À gauche (λ→0) : sans biais mais variance énorme — les moindres carrés.
À droite : variance nulle mais biais énorme — l'estimateur constant.
Le minimum de l'EQM est STRICTEMENT entre les deux : le meilleur estimateur
est biaisé. Déplacer λ (la ligne jaune) et retrouver ce point à l'œil.
Question : « que devient la courbe si σ double ? » — la variance quadruple,
le minimum se déplace vers la droite : plus de bruit → plus de régularisation.`,
  },
];
// notes: Teacher Mode only. Never projected by default, never in the URL.
