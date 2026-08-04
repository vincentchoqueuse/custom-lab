// Lecture script — auto-discovered by the registry.
export default [
  {
    id: 'cloud',
    title: 'Scène 1 · Quatre dimensions, une photo',
    view: 'scores',
    params: { dataset: 'iris', standardize: false, k: 2, xComp: 1, yComp: 2 },
    visible: ['dataset', 'xComp'],
    notes: `150 iris, quatre mesures chacun : longueur et largeur de sépale,
longueur et largeur de pétale. Un nuage dans un espace à quatre dimensions,
que personne ne sait dessiner.

L'ACP cherche les directions le long desquelles ce nuage s'étale le plus, et
la figure montre la projection sur les deux premières. Ce n'est pas UNE
photo du nuage : c'est LA meilleure photo plane, au sens des moindres
carrés — et l'onglet « Erreur de reconstruction » le démontre.

Les trois espèces se séparent presque parfaitement, et personne ne les a
données à l'algorithme. L'ACP ne sait pas qu'il y a des espèces : elle a
cherché de la variance, et la structure biologique était dedans.

Basculer sur les manchots de Palmer (342 individus, mêmes quatre mesures,
CC0) : même exercice, autre bestiaire. La séparation y est moins nette sur
le jeu brut, et la scène 3 dira pourquoi.

Puis mettre l'abscisse sur CP3 et l'ordonnée sur CP4 : le nuage s'effondre
en une bouillie ronde. Ces deux composantes-là ne portent que 2.2 % de la
variance, et rien de reconnaissable. C'est ce que « garder deux
composantes » veut dire concrètement.`,
  },
  {
    id: 'scree',
    title: 'Scène 2 · Combien en garder',
    view: 'scree',
    params: { dataset: 'iris', standardize: false, k: 2, xComp: 1, yComp: 2 },
    visible: ['k', 'standardize'],
    notes: `L'éboulis. CP1 porte 92.46 % de la variance, CP2 5.31 %, et les
deux dernières 2.2 % à elles deux. La courbe orange cumule : à k = 2 on est
à 97.77 %.

Voilà pourquoi on garde deux composantes — pas parce que le plan est commode
à dessiner, mais parce que la troisième n'apporterait que 1.7 %.

Le décrochage entre CP1 et CP2 est le « coude » que tout le monde cherche
dans un éboulis. Ici il est franc. Dire aussi que ce n'est pas toujours le
cas : sur des données sans structure forte, l'éboulis descend en pente
douce et le choix de k redevient un jugement.`,
  },
  {
    id: 'standardize',
    title: 'Scène 3 · Le piège des unités',
    view: 'scree',
    params: { dataset: 'penguins', standardize: false, k: 2, xComp: 1, yComp: 2 },
    visible: ['standardize', 'dataset'],
    notes: `Les manchots de Palmer : 342 individus, quatre mesures — trois
longueurs en millimètres et une MASSE EN GRAMMES.

Regarder l'éboulis avant de dire quoi que ce soit. **99.99 %** sur la
première composante. Laisser la salle réagir : un tel chiffre a l'air d'un
triomphe.

C'en est un pour l'algorithme et une catastrophe pour l'analyse. La statline
dit ce que CP1 mesure : « masse ». Rien d'autre. La variance de la masse
vaut 643 000 g² contre 30 mm² pour la longueur du bec — on diagonalise la
covariance, donc la variable aux plus grands nombres rafle tout. Ce n'est
pas un résultat biologique, c'est un choix d'unité.

Cocher « standardiser » : on diagonalise alors la corrélation, les quatre
variables pèsent pareil. CP1 tombe à **68.84 %** et devient la LONGUEUR DE
NAGEOIRE — une grandeur qui, elle, sépare vraiment les espèces. Retourner à
l'onglet du nuage pour le voir.

Puis basculer sur l'iris, où le même phénomène existe en plus discret :
92.46 % non standardisé, CP1 presque uniquement la longueur de pétale ;
72.96 % standardisé. Le harnais y ajoute la preuve directe : passer la SEULE
largeur de sépale des centimètres aux millimètres change la réponse sur
covariance (92.46 → 84.64 %, et CP1 devient la largeur de sépale) et ne la
change PAS sur corrélation, à 1e-12 près.

La règle à retenir : variables de même nature et de même unité, covariance ;
variables hétérogènes, corrélation. Et dans le doute, montrer les deux — ce
que cette expérience permet en un clic.`,
  },
  {
    id: 'reconstruction',
    title: 'Scène 4 · Le théorème qu’on regarde',
    view: 'reconstruction',
    params: { dataset: 'iris', standardize: false, k: 2, xComp: 1, yComp: 2 },
    visible: ['k', 'standardize'],
    notes: `Deux courbes, et elles sont CONFONDUES.

La bleue est mesurée : on reconstruit les 150 fleurs à partir des k
premières composantes, et on regarde ce qu'on a perdu. L'orange est la somme
des valeurs propres qu'on a jetées.

Ce n'est ni une borne, ni une approximation, ni un hasard numérique : c'est
le théorème d'Eckart–Young (1936, la même année que l'article de Fisher).
Il dit que la projection sur les k premières composantes est LA meilleure
approximation de rang k, et que l'erreur vaut exactement ce qui reste. Le
harnais l'épingle à 1e-12, avec et sans standardisation.

C'est ce qui distingue l'ACP d'une heuristique : sa qualité se calcule
d'avance, sans rien reconstruire. Balayer k de 1 à 4 et regarder les deux
courbes descendre ensemble jusqu'à zéro exact.

Le lien à faire avec le reste du catalogue : c'est la MÊME décomposition
propre de covariance que dans « techniques hautes résolutions ». Là-bas les
grandes valeurs propres étaient le signal et les petites le bruit ; ici les
grandes sont ce qu'on garde et les petites ce qu'on jette. Une seule algèbre,
deux lectures — et c'est ce genre de pont qui fait qu'un cours tient.`,
  },
];
// notes: Teacher Mode only. Never projected by default, never in the URL.
