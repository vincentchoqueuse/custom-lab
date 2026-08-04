// Lecture script — auto-discovered by the registry.
export default [
  {
    id: 'converge',
    title: 'Scène 1 · Un filtre qui apprend',
    view: 'learning',
    params: { algo: 'lms', mu: 0.01, lambda: 1, L: 8, a: 0, snr: 20, n: 3000, track: false },
    visible: ['mu', 'n'],
    notes: `Le montage : un système inconnu à 8 coefficients, une entrée blanche,
une sortie bruitée à 20 dB. Le filtre part de ZÉRO et ne voit jamais w*.

Balayer n de 1 à 3000 et regarder l'onglet Coefficients : le filtre se
remplit. Puis revenir ici et lire les deux courbes.

  bleue    l'EQM qu'on mesurerait vraiment — elle descend et s'arrête
  orange   l'excès w̃ᵀRw̃, la distance à w*, sans le bruit
  jaune    le plancher σ² : la bleue ne passera JAMAIS dessous

Question à poser avant de bouger μ :
« Si je double le pas, où va la courbe ? »
Deux réponses viendront, elles sont toutes les deux vraies et c'est le
sujet de la scène suivante.`,
  },
  {
    id: 'tradeoff',
    title: 'Scène 2 · Vite ou juste, il faut choisir',
    view: 'learning',
    params: { algo: 'lms', mu: 0.05, lambda: 1, L: 8, a: 0, snr: 20, n: 3000, track: false },
    visible: ['mu', 'snr'],
    notes: `μ = 0.05 : la descente est cinq fois plus rapide (41 itérations pour
arriver à 3 dB du palier, contre 206), et le palier est cinq fois plus
haut. C'est UNE loi, pas deux :

    désajustement = μ·tr(R) / (2 − μ·tr(R))

La statline donne les deux nombres, mesuré et théorique, et ils tombent
l'un sur l'autre à quelques pour-cent près. Le faire remarquer : c'est
une formule de cours qui se vérifie à l'écran, en direct.

Puis monter μ vers la divergence, et faire prédire OÙ elle arrive. La
salle proposera 2/tr(R) = 0.25, la borne des livres. C'est faux, et de
peu : ça part à 0.195. La borne des livres fait converger la MOYENNE de
ŵ ; c'est sa VARIANCE qui décide, et sa condition à elle est
Σ μλᵢ/(1−μλᵢ) < 2, soit 0.200 ici. La statline donne les deux.

Au-dessus, la courbe part en ligne droite vers le haut et le régime
affiche « divergé ». Un filtre adaptatif mal réglé ne se dégrade pas :
il explose.

Et le pire est pour la scène suivante : ces deux bornes supposent le
régresseur indépendant du filtre. Sur une entrée corrélée (a = 0.9) le
seuil réel tombe à 0.037 quand la théorie en annonce 0.104 — un réglage
« dans les clous » y diverge.

Le remède n'est pas de baisser μ — c'est de changer d'algorithme.
Passer en NLMS : le pas y est SANS UNITÉ, la borne vaut 2 quelle que
soit la puissance d'entrée. C'est pour ça que personne n'utilise LMS tel
quel en pratique.`,
  },
  {
    id: 'colored',
    title: 'Scène 3 · L’entrée colorée, ou ce que RLS achète',
    view: 'learning',
    params: { algo: 'lms', mu: 0.01, lambda: 1, L: 8, a: 0.9, snr: 20, n: 3000, track: false },
    visible: ['a', 'algo'],
    notes: `Même filtre, même pas, même bruit. Une seule chose a changé : l'entrée
est corrélée (a = 0.9), à puissance IDENTIQUE — le facteur √(1−a²) est là
pour ça, sinon on confondrait l'effet du conditionnement avec celui d'un
pas devenu trop grand.

LMS met 722 itérations à arriver à 3 dB du palier, contre 206 sur
l'entrée blanche : 3.5 fois plus lent, pour un signal de même
puissance. La statline dit pourquoi : conditionnement λmax/λmin = 113
(à L = 8 ; il tend vers ((1+a)/(1−a))² = 361 quand L grandit). Chaque
mode propre converge à sa propre vitesse, et le plus lent tient tout le
monde.

Aller voir le plan des poids avec L = 2 : les cercles sont devenus des
ellipses, et la descente zigzague au lieu de plonger. C'est la MÊME
information, en géométrie.

Puis basculer algo sur RLS, sans rien changer d'autre.
15 itérations. Exactement le même nombre que sur l'entrée blanche, avec
un conditionnement inchangé à 113.
RLS ne subit pas λmax/λmin parce qu'il inverse R au lieu de la suivre.
Le prix est dans le compteur d'opérations : L² au lieu de L. À L = 8 on
s'en moque ; sur un annuleur d'écho à 512 coefficients, c'est 262 144
multiplications par échantillon contre 512.`,
  },
  {
    id: 'track',
    title: 'Scène 4 · Poursuivre un système qui bouge',
    view: 'learning',
    params: { algo: 'rls', mu: 0.01, lambda: 1, L: 8, a: 0, snr: 20, n: 3000, track: true },
    visible: ['lambda', 'algo'],
    notes: `Le système change brutalement à l'itération 1500 (verticale violette).
C'est le cas réel : un locuteur bouge, un canal évolue, une pièce change.

Faire CONSTATER avant d'expliquer. Avec λ = 1, RLS est le meilleur des
trois AVANT le saut — excès à −44 dB, personne n'approche. Après le
saut il remonte à +4 dB, et 1500 itérations plus tard il est encore à
−1 dB. Il n'a pas rattrapé. Le meilleur algorithme de la scène
précédente est ici le pire, et de très loin.

La raison tient en un mot : λ = 1, c'est une mémoire INFINIE. RLS a
accumulé 1500 équations qui décrivent l'ancien système, et il lui faut
autant de temps pour les noyer sous les nouvelles.

Descendre λ à 0.99 : la mémoire devient d'environ 1/(1−λ) = 100
échantillons. L'excès repart de −34 dB et il est revenu à −34 dB dès
l'itération 2200. Le prix : le palier d'avant le saut est passé de −44 à
−34 dB, soit exactement le désajustement (1−λ)L/2 — encore le même
marché, sous un autre nom.

Puis repasser en LMS, μ = 0.01 : mêmes chiffres que RLS à λ = 0.99, à
0.2 dB près. Et pousser μ à 0.05 : le saut ne se voit presque plus
(−25.7 dB avant, −24.2 juste après), au prix d'un palier 8 dB plus haut.
« Le plus bête des trois est le meilleur quand le monde bouge » est une
phrase qui reste — et ici elle est mesurée.`,
  },
];
// notes: Teacher Mode only. Never projected by default, never in the URL.
