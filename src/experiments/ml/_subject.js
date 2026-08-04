// Le sujet arrive APRÈS la régression et le filtrage, et c'est voulu : ni
// une ACP ni un réseau de neurones ne sont des objets nouveaux pour qui
// vient du signal. L'une est une décomposition propre de matrice de
// covariance — la même qu'en haute résolution ; l'autre est une composition
// de produits matrice-vecteur et d'une non-linéarité.
//
// Les expériences prennent donc l'angle du traitement du signal plutôt que
// celui de l'informatique : ce qu'une activation fait à un SPECTRE, ce
// qu'une matrice de Toeplitz est vraiment, ce qu'une valeur propre de
// covariance mesure, et pourquoi une couche cachée change la nature d'un
// problème.
//
// « Apprentissage automatique » et non « réseaux de neurones » : l'ACP n'en
// est pas un, et le sujet a vocation à accueillir aussi les k plus proches
// voisins, les SVM et les arbres, qui sont du même cours.
export default { title: 'Apprentissage automatique', order: 12 };
