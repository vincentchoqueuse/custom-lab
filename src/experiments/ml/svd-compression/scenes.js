// Lecture script — auto-discovered by the registry.
export default [
  {
    id: 'phantom',
    title: 'Scène 1 · Une image est une matrice',
    view: 'images',
    params: { image: 'phantom', k: 3 },
    visible: ['k'],
    notes: `Le fantôme de Shepp–Logan, l'image de test de l'imagerie médicale
depuis 1974. 128 × 128 pixels, donc une matrice 128 × 128 : 16 384 nombres.

k = 3 : trois couches de rang 1. On reconnaît déjà l'ovale. Monter k
lentement — 5, 8, 12, 20 — et regarder les détails apparaître dans l'ordre
de leur importance, ce qui n'est pas une façon de parler : la SVD les a
CLASSÉS.

La troisième vignette est le résidu, amplifié quatre fois. C'est ce que k
a jeté, et c'est là que se lit ce que la compression coûte : d'abord des
bords, puis les petites ellipses, puis plus rien de reconnaissable.

Le chiffre à faire lire dans la statline : à k = 12, on stocke 3084 nombres
au lieu de 16 384. Cinq fois moins, pour une image dont la salle ne voit
plus la différence à quatre mètres.

Un mot sur l'image elle-même, qui vaut d'être dit : ce n'est pas une photo,
c'est une FORMULE — dix ellipses aux paramètres publiés. Elle est donc libre
de droits par construction, contrairement à « Lena », l'image de test la
plus utilisée du domaine, qui ne l'a jamais été et que l'IEEE a écartée en
2019.`,
  },
  {
    id: 'spectrum',
    title: 'Scène 2 · Ce qui décide, c’est le spectre',
    view: 'singular',
    params: { image: 'phantom', k: 12 },
    visible: ['image', 'k'],
    notes: `Les valeurs singulières, en échelle log, normalisées à la première.

Elles s'effondrent : la vingtième vaut moins d'un centième de la première.
C'est CELA qui rend la compression possible, et rien d'autre — la SVD ne
compresse pas, elle exploite une décroissance qui était déjà dans l'image.

La démonstration se fait au GEL. Geler (F) sur le fantôme, puis passer sur
« rang 4 par construction » : le spectre tombe à la verticale après la
quatrième valeur — quatre couches, et l'image est EXACTE, à 1e-14. Le
harnais l'épingle.

Puis « bruit blanc », toujours superposé au fantôme gelé : sur les quarante
premières couches, le spectre ne décroît que d'un facteur 1.7, quand celui
du fantôme perd un facteur 20. Aucune couche n'est négligeable, donc rien
n'est compressible. C'est le résultat le plus important de la séance, et il
est contre-intuitif pour qui croit qu'un algorithme « compresse » : du
bruit, personne ne le compressera jamais, quelle que soit la méthode.

Marteler R sur le bruit — c'est la seule des quatre images qui tire, donc
la seule sur laquelle le dé fasse quelque chose. Le tirage change, le
plateau ne bouge pas : ce n'est pas une propriété de CE bruit-là.

Garder le damier pour la fin, et faire PARIER la salle avant de l'afficher :
des bords partout, du détail partout, ce sera le cas difficile. Il est de
rang 2. La valeur d'un pixel s'écrit f(ligne) + g(colonne) −
2·f(ligne)·g(colonne) : l'image est séparable, deux couches la
reconstruisent exactement, à 1e-14. La morale vaut le détour — l'œil juge
de la complexité apparente, pas du rang, et ce sont deux choses sans
rapport.`,
  },
  {
    id: 'exact',
    title: 'Scène 3 · L’erreur est connue d’avance',
    view: 'energy',
    params: { image: 'phantom', k: 12 },
    visible: ['k', 'image'],
    notes: `La courbe d'énergie cumulée, et deux nombres dans la statline qui
sont EXACTEMENT égaux : l'erreur mesurée ‖A − Aₖ‖² et la somme des carrés
des valeurs singulières jetées.

Ce n'est ni une borne ni une approximation : c'est Eckart–Young, le même
théorème que dans l'expérience d'ACP, à ceci près qu'on le voit ici sur une
image. Il dit deux choses :

  · aucune matrice de rang k n'approche A mieux que Aₖ ;
  · et l'erreur qu'elle laissera se calcule AVANT de la calculer.

La seconde est celle qui compte en pratique : on peut choisir k pour une
qualité visée sans jamais reconstruire, en lisant simplement le spectre.
Faire la démonstration : viser 99 % d'énergie sur le fantôme, lire k sur la
courbe, aller sur l'onglet des images et vérifier.

Le rapprochement à faire à voix haute : l'ACP cherchait les directions d'un
nuage, la SVD cherche les couches d'une image, et c'est la MÊME
décomposition. Une valeur propre de covariance est un carré de valeur
singulière. Deux cours, un théorème.`,
  },
];
// notes: Teacher Mode only. Never projected by default, never in the URL.
