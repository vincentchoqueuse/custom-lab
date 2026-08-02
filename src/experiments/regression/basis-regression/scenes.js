// Lecture script. Auto-discovered by the registry.
export default [
  {
    id: 'bosses',
    title: 'Une somme de bosses',
    params: { basis: 'rbf', target: 'damped', M: 8, ell: 0.15, lambda: 1e-8, N: 60, sigma: 0.1 },
    view: 'basis',
    visible: ['ell', 'M'],
    notes: `Le modèle est LINÉAIRE — en les poids wⱼ, pas en x : mêmes moindres
carrés que la régression polynomiale, formule fermée, rien de neuf.
Mais regarder la vue : l'ajustement orange EST la somme des huit bosses
vertes. Bouger ℓ : trop large → les bosses se fondent, le fit est
rigide (sous-ajustement) ; trop étroit → des picots entre les points,
et ‖w‖ explose (statline) — c'est λ qui sauve la résolution (revoir
ridge !). Le bon ℓ se voit à l'œil : les bosses se recouvrent à moitié.`,
  },
  {
    id: 'creneau',
    title: 'Le créneau départage les bases',
    params: { basis: 'fourier', target: 'square', M: 19, ell: 0.05, lambda: 1e-8, N: 150, sigma: 0.02 },
    visible: ['basis', 'M'],
    notes: `La même cible, quatre philosophies. Fourier : les oscillations de
GIBBS — revoir l'expérience séries de Fourier, le dépassement ~9% est
LE MÊME, et le check le vérifie. Polynômes : catastrophe globale, un
polynôme ne sait pas être plat. RBF : propre, l'erreur reste locale.
Sigmoïdes avec M = 1 : UNE SEULE marche suffit — un neurone est un
détecteur de front. Moralité : la base doit ressembler au signal ;
c'est tout l'art (et le sens du mot « a priori »).`,
  },
  {
    id: 'train-test',
    title: 'La courbe qui vaut un chapitre de ML',
    params: { basis: 'rbf', target: 'damped', M: 8, ell: 0.12, lambda: 1e-8, N: 40, sigma: 0.15 },
    view: 'complexity',
    visible: ['M', 'sigma'],
    notes: `L'erreur d'APPRENTISSAGE (bleue) descend toujours : ajouter des
fonctions ne peut qu'aider à coller aux points déjà vus. L'erreur de
TEST (orange, données fraîches) fait un U : au creux, le bon M ; après,
le modèle apprend le bruit. Le plancher gris est σ² — on ne peut pas
faire mieux que le bruit. Marteler R : le creux bouge un peu, le
message jamais. C'est la même courbe en U que ridge (en λ) et que la
cible (en λ aussi) : TOUT le chapitre converge ici — et le machine
learning commence exactement à cette page.`,
  },
];
// notes: Teacher Mode only. Never projected by default, never in the URL.
