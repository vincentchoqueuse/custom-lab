// Lecture script — auto-discovered by the registry.
export default [
  {
    id: 'linear',
    title: 'Scène 1 · Deux couches linéaires n’en font qu’une',
    view: 'time',
    params: { structure: 'dense', act: 'identity', kernel: 9, scale: 1.5, signal: 'sine' },
    visible: ['act', 'structure'],
    notes: `Activation « identité ». La courbe bleue (le réseau) et la grise
tiretée (le même réseau sans activation) sont CONFONDUES — évidemment, c'est
le même calcul.

Mais dire pourquoi ça compte : W₂(W₁x) = (W₂W₁)x. Le produit de deux
matrices est une matrice. Empiler dix couches linéaires donne donc
exactement le pouvoir d'expression d'UNE couche linéaire — pas un iota de
plus, pour dix fois le calcul. Le harnais le vérifie à 1e-12.

C'est la raison d'être de l'activation, et elle tient en une ligne
d'algèbre. Passer σ à ReLU : les deux courbes se séparent, et la statline
chiffre l'écart.`,
  },
  {
    id: 'dense',
    title: 'Scène 2 · Dense : 16 384 poids, et plus aucune structure',
    view: 'spectrum',
    params: { structure: 'dense', act: 'relu', kernel: 9, scale: 1.5, signal: 'sine' },
    visible: ['structure', 'signal'],
    notes: `Une matrice dense 128 × 128 : 16 384 poids indépendants, tirés au
hasard. Une sinusoïde pure entre.

En sortie : un spectre plat. Toutes les fréquences, aucune raie. C'est
normal — chaque sortie est une combinaison de TOUTES les entrées avec des
poids sans rapport entre eux, donc la notion de voisinage temporel a été
détruite. Le réseau peut tout représenter, et ne suppose rien.

Aller voir l'onglet « Deux lignes de W₁ » : deux lignes de la matrice n'ont
rien en commun. Chacune est un dessin à part entière, appris séparément.`,
  },
  {
    id: 'toeplitz',
    title: 'Scène 3 · Toeplitz : 9 poids, et c’est un filtre',
    view: 'rows',
    params: { structure: 'toeplitz', act: 'relu', kernel: 9, scale: 1.5, signal: 'sine' },
    visible: ['structure', 'kernel'],
    notes: `Basculer sur Toeplitz et rester sur cette vue AVANT de parler de
spectre. Les deux lignes sont maintenant la MÊME, décalée de 56 crans.

Voilà ce que veut dire « partage de poids » : au lieu de 128 lignes
indépendantes, une seule forme, répétée à toutes les positions. 9 poids au
lieu de 16 384 — la statline donne le rapport, 1820.

Et ce n'est pas une économie de mémoire, c'est une HYPOTHÈSE sur le monde :
« ce qui compte est local, et ne dépend pas de l'endroit où ça arrive ».
C'est exactement l'hypothèse d'un filtre, et exactement celle d'une couche
de convolution.

Puis l'onglet Spectre : le spectre de sortie est celui d'entrée multiplié
par |H(f)|, la réponse du noyau, tracée en orange. La couche ne mélange plus
les fréquences, elle les PONDÈRE. Le harnais vérifie l'identité
Y(f) = H(f)·X(f) à 1e-12.

Entrée « impulsion » pour finir : la sortie EST la réponse impulsionnelle,
donc le noyau lui-même. Un réseau de convolution ne fait rien d'autre que
d'apprendre des réponses impulsionnelles.`,
  },
  {
    id: 'width',
    title: 'Scène 4 · Le noyau qui grandit',
    view: 'spectrum',
    params: { structure: 'toeplitz', act: 'relu', kernel: 1, scale: 1.5, signal: 'noise' },
    visible: ['kernel', 'act'],
    notes: `L = 1 : le noyau est un seul poids. La couche multiplie par une
constante, |H(f)| est plat, et le réseau ne peut RIEN faire de fréquentiel.
Une convolution 1×1 ne mélange pas les voisins, elle mélange les canaux —
c'est d'ailleurs à ça qu'elle sert dans les vraies architectures.

Monter L : 3, 9, 17, 33. La réponse orange se structure, des creux
apparaissent, et le spectre de sortie les suit. Le nombre de poids passe de
1 à 33 — contre 16 384 pour la dense, toujours.

La question qui vaut la séance : « puisque la dense contient toutes les
Toeplitz, pourquoi ne pas toujours prendre dense ? »

Parce que ce que la structure retire, c'est la liberté d'apprendre
n'importe quoi — donc aussi celle de se tromper. Avec 16 384 poids et cent
exemples, le réseau apprend les exemples par cœur. Avec 9, il ne peut
apprendre qu'un filtre, et un filtre est ce qu'on voulait. Contraindre le
modèle, c'est lui transmettre ce qu'on sait déjà.`,
  },
];
// notes: Teacher Mode only. Never projected by default, never in the URL.
