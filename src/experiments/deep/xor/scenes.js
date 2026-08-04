// Lecture script — auto-discovered by the registry.
export default [
  {
    id: 'perceptron',
    title: 'Scène 1 · Une droite ne peut pas',
    view: 'plane',
    params: { problem: 'xor', hidden: 1, act: 'identity', lr: 0.5, epoch: 4000 },
    visible: ['problem', 'hidden'],
    notes: `Quatre points, deux classes. Demander à la salle, AVANT de lancer
quoi que ce soit : « tracez au tableau la droite qui sépare les orange des
bleus ». Laisser chercher trente secondes. Il n'y en a pas.

Le réseau à un neurone linéaire a convergé, et sa frontière n'apparaît même
pas : sa sortie est constante à 1/2, donc elle ne traverse jamais le seuil.
L'erreur finale vaut 1/8 = 0.125, et c'est l'OPTIMUM — pas un échec de la
descente. Le harnais le démontre : la meilleure droite au sens des moindres
carrés est la constante 1/2, et aucune droite au monde ne classe les quatre
points correctement (recherche exhaustive dans le harnais également).

Basculer la table sur OU, puis sur ET : la frontière apparaît, l'erreur
tombe. Ces deux-là sont séparables, XOR ne l'est pas. C'est cette différence
que Minsky et Papert publient en 1969, et le financement du perceptron
s'arrête pendant quinze ans.`,
  },
  {
    id: 'two',
    title: 'Scène 2 · Deux neurones, et c’est réglé',
    view: 'plane',
    params: { problem: 'xor', hidden: 2, act: 'tanh', lr: 0.5, epoch: 4000 },
    visible: ['hidden', 'epoch'],
    notes: `H = 2, activation tanh. La frontière n'est plus une droite : c'est
une bande, et elle sépare.

Regarder les deux droites grises : ce sont les neurones cachés, chacun
traçant SA droite. Aucune ne sépare le XOR à elle seule — mais leur
combinaison, oui. C'est ça, une couche cachée : découper le plan en morceaux,
puis recombiner.

La solution s'écrit d'ailleurs à la main : h₁ = OU, h₂ = ET, sortie = h₁ − h₂.
« Ou, mais pas les deux » — la définition du XOR, en une soustraction. Le
harnais vérifie que cette construction rend la table exacte.

Puis balayer l'époque n de 0 à 4000 et regarder la frontière se plier. Au
début elle est droite : le réseau commence linéaire, et c'est la
non-linéarité qui le fait sortir de là.`,
  },
  {
    id: 'plateau',
    title: 'Scène 3 · Le plateau, et pourquoi il fait peur',
    view: 'learning',
    params: { problem: 'xor', hidden: 2, act: 'tanh', lr: 0.15, epoch: 4000 },
    visible: ['lr', 'epoch'],
    notes: `La courbe ne descend pas tout de suite. Elle reste collée à la
ligne orange — le plancher 1/16 du modèle linéaire — pendant des centaines
d'époques, puis décroche.

C'est un PLATEAU, et il faut le nommer : le réseau a d'abord appris ce qu'un
modèle linéaire aurait appris, c'est-à-dire la moyenne. Tant qu'il y est, le
gradient est presque nul et rien ne semble se passer. Puis la symétrie se
brise et l'erreur s'effondre de plusieurs décades.

Quelqu'un qui aurait arrêté l'apprentissage à l'époque 200 aurait conclu que
« ça ne marche pas ». C'est l'erreur la plus commune de tout le domaine.

Monter η à 1 : le décrochage arrive bien plus tôt. Le pousser à 5 :
l'apprentissage devient erratique, la courbe remonte par endroits. Le même
compromis vitesse/stabilité que dans le filtrage adaptatif, à la même page
du même livre.`,
  },
  {
    id: 'seed',
    title: 'Scène 4 · Le hasard de départ décide',
    view: 'learning',
    params: { problem: 'xor', hidden: 2, act: 'tanh', lr: 0.5, epoch: 4000 },
    visible: ['hidden', 'act'],
    notes: `Marteler la touche R : chaque tirage d'initialisation donne une courbe
différente. Sortie du plateau à l'époque 39 pour l'un, 1077 pour l'autre, et
certains n'en sortent pas.

Ce n'est pas un défaut de l'implémentation, c'est une propriété du problème :
la surface d'erreur d'un réseau n'est pas convexe, et deux poids initiaux
voisins tombent dans deux vallées différentes. Un réseau qui « n'apprend
pas » a parfois simplement mal commencé.

Les chiffres, mesurés sur 40 tirages et vérifiés par le harnais :

    tanh  H = 2  →  34/40 réussissent
    tanh  H = 4  →  40/40
    ReLU  H = 2  →   4/40
    ReLU  H = 4  →  20/40

Deux leçons, et la seconde surprend toujours.

La première : élargir aide. Deux neurones SUFFISENT — mais quatre ne servent
pas à représenter davantage, ils servent à offrir plus de CHEMINS vers la
solution. C'est une des raisons pour lesquelles les grands réseaux
s'entraînent mieux que les petits, et elle n'a rien d'intuitif.

La seconde : ReLU, l'activation par défaut de tout le domaine, échoue ici
neuf fois sur dix à H = 2. Un neurone ReLU dont l'entrée est négative pour
les quatre points a un gradient nul — il est MORT, définitivement, et il ne
reste qu'un neurone pour un problème qui en demande deux. Le faire constater
avant de l'expliquer : « l'activation la plus utilisée au monde est la pire
sur cet exemple » est une phrase qui réveille un amphi.`,
  },
];
// notes: Teacher Mode only. Never projected by default, never in the URL.
