// Lecture script. Auto-discovered by the registry.
export default [
  {
    id: 'vocabulaire',
    title: 'Quatre tireurs, un vocabulaire',
    params: { mu: 2, sigma: 1.5, N: 5, lambda: 0.8, M: 400 },
    visible: ['N'],
    notes: `Quatre estimateurs du même centre, mêmes données. Faire nommer AVANT
d'expliquer : x̄ est centré et groupé ; la médiane est centrée, un peu
plus lâche ; λx̄ est DÉCENTRÉ mais très groupé ; x₁ est centré et
catastrophiquement dispersé. Vocabulaire : centré = sans biais,
groupé = faible variance. Question piège : « lequel préférez-vous ? »
— regarder les EQM sous les cibles avant de répondre.`,
  },
  {
    id: 'biais-utile',
    title: 'Le biais qui fait gagner',
    params: { mu: 2, sigma: 1.5, N: 5, lambda: 0.8, M: 1000 },
    visible: ['lambda', 'N'],
    notes: `À N = 5, comparer EQM(λx̄) et EQM(x̄) sous les cibles : le tireur
décentré GAGNE. Geler (F), passer λ à 1 : λx̄ redevient x̄ — l'EQM
remonte. Le biais est un levier : on échange du centrage contre du
groupement. Puis monter N à 100 : l'avantage disparaît — avec beaucoup
d'information, le rétrécissement ne paie plus.`,
  },
  {
    id: 'u-final',
    title: 'La courbe en U, en formule fermée',
    params: { mu: 2, sigma: 1.5, N: 5, lambda: 0.8, M: 1000 },
    view: 'tradeoff',
    visible: ['lambda', 'N'],
    notes: `EQM(λ) = 2(1−λ)²μ² + 2λ²σ²/N — tout est exact ici, pas de Monte
Carlo. Le minimum λ* = μ²/(μ²+σ²/N) est STRICTEMENT inférieur à 1 :
l'estimateur optimal est toujours (un peu) biaisé. Déplacer λ sur sa
ligne jaune jusqu'à λ* (ligne verte). Monter N : λ* → 1. C'est la même
courbe en U que ridge dans la régression polynomiale — même idée,
habillage différent.`,
  },
];
// notes: Teacher Mode only. Never projected by default, never in the URL.
