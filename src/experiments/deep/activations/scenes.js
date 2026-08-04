// Lecture script — auto-discovered by the registry.
export default [
  {
    id: 'shape',
    title: 'Scène 1 · La courbe, et sa dérivée',
    view: 'transfer',
    params: { act: 'relu', signal: 'sine', gain: 1, bias: 0 },
    visible: ['act', 'bias'],
    notes: `Passer les six activations dans l'ordre et regarder DEUX courbes,
pas une : σ en bleu, σ′ en orange.

  identité   σ′ = 1 partout — et c'est justement le problème, voir scène 4
  ReLU       σ′ vaut 1 ou 0. Rien entre les deux.
  leaky      le 0 devient 0.01 : le neurone mort peut revenir
  tanh       σ′(0) = 1, puis s'effondre
  sigmoïde   σ′(0) = 0.25 AU MIEUX, 1.8·10⁻² à x = 4, 3.4·10⁻⁴ à x = 8

Le chiffre est dans la statline. Attention à ce qu'on en dit, parce que la
version courante est fausse : un seul étage saturé ne divise pas le gradient
par mille, il le divise par 57 à x = 4. Ce qui tue, c'est l'EMPILEMENT — dix
couches au mieux de leur forme multiplient le gradient par 0.25¹⁰ = 10⁻⁶.
Le « gradient qui disparaît » n'a donc rien de mystérieux : c'est une
multiplication répétée, et ReLU la remplace par 1.

Bouger le biais : la courbe glisse. C'est tout ce que fait un biais, et
c'est déjà beaucoup — il choisit OÙ dans la courbe le signal travaille.

Puis l'onglet « Dérivées comparées », qui met les cinq σ′ sur la même
figure : c'est de là qu'on choisit une activation. Éteindre les courbes une
à une au clic dans la légende pour les comparer deux à deux. Une seule
passe sous zéro, GELU — sa dérivée descend à −0.13, donc elle n'est pas
monotone, ce qui surprend et mérite d'être dit.`,
  },
  {
    id: 'harmonics',
    title: 'Scène 2 · Une non-linéarité crée des fréquences',
    view: 'spectrum',
    params: { act: 'relu', signal: 'sine', gain: 1, bias: 0 },
    visible: ['act', 'gain'],
    notes: `Une sinusoïde à 16 Hz entre. En sortie de ReLU : une raie continue,
le fondamental, et un peigne à 32, 64, 96 Hz — que personne n'a mis là.

C'est un redressement simple, et sa série de Fourier est connue depuis 1822 :
    continue = A/π,  fondamental = A/2,  harmonique 2k = 2A/(π(4k²−1))
Le harnais vérifie que les raies mesurées tombent dessus à 1e-12. Ce n'est
donc pas une illustration, c'est la formule.

Puis passer à tanh, et faire prédire AVANT : les harmoniques paires
disparaissent. Raison : tanh est IMPAIRE, et une fonction impaire d'une
sinusoïde ne peut contenir que des harmoniques impaires. La parité de la
fonction se lit directement sur le spectre.

Repasser à l'identité pour finir : le spectre de sortie est celui d'entrée,
raie pour raie. Une couche linéaire n'invente rien.`,
  },
  {
    id: 'imd',
    title: 'Scène 3 · Deux tons, et la raie qu’on ne peut pas filtrer',
    view: 'spectrum',
    params: { act: 'tanh', signal: 'two', gain: 2, bias: 0 },
    visible: ['gain', 'act'],
    notes: `Deux tons, 16 et 21 Hz. En sortie il y a bien plus que leurs
harmoniques : il y a des SOMMES et des DIFFÉRENCES. La plus gênante est
2f₁ − f₂ = 11 Hz — la statline la chiffre.

Pourquoi elle est gênante, et c'est le point de la scène : les harmoniques
sont loin, un filtre passe-bas les enlève. Celle-ci est ENTRE les deux tons,
dans la bande utile. Aucun filtre ne la retire sans retirer le signal.

C'est le fléau des amplificateurs, des convertisseurs et des étages RF, et
c'est aussi ce qu'un réseau de neurones fait volontairement à chaque couche :
mélanger des fréquences pour en fabriquer de nouvelles.

Monter g et regarder la raie grimper trois fois plus vite que le signal, en
dB. Mesuré : à g = 0.05 → 0.1, le fondamental monte de 1 (en log₂) et
l'intermodulation de 2.99. La loi du 3 pour 1 est donc exacte — EN PETIT
SIGNAL.

Puis pousser à g = 0.4 → 0.8 : la pente tombe à 2.41. Le régime cubique s'est
refermé, tanh comprime. Dire les deux : une loi asymptotique sans son domaine
de validité est une demi-vérité, et c'est précisément celle qu'on applique
ensuite hors domaine.`,
  },
  {
    id: 'why',
    title: 'Scène 4 · Pourquoi il en faut une',
    view: 'time',
    params: { act: 'identity', signal: 'square', gain: 1, bias: 0 },
    visible: ['act'],
    notes: `Activation « identité » : la sortie EST l'entrée. Le spectre aussi.

Poser la question qui ouvre l'expérience suivante :
« si toutes les activations étaient l'identité, que ferait un réseau de dix
couches ? »

Réponse : le produit de dix matrices, c'est-à-dire UNE matrice. Dix couches
linéaires ont exactement le pouvoir d'expression d'une seule — la profondeur
ne sert alors à rien du tout. C'est démontré à l'écran dans l'expérience
« Pouvoir d'expression », et c'est la raison d'être de tout ce fichier.`,
  },
];
// notes: Teacher Mode only. Never projected by default, never in the URL.
