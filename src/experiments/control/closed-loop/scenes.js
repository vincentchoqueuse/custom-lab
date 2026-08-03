// Lecture script — auto-discovered by the registry.
export default [
  {
    id: 'close',
    title: 'Scène 1 · Fermer la boucle, et voir ce qui change',
    params: { w0: 1, m: 0.5, K: 4 },
    view: 'response',
    visible: ['K'],
    notes: `Un seul potard : K. Partir de K = 0.1 (la boucle ne fait presque
rien) et monter lentement jusqu'à 4.
Question à poser AVANT de bouger : « qu'est-ce qui change quand je serre la
boucle ? » Récolter les réponses, puis montrer les trois :
 · la sortie se rapproche de la consigne — l'erreur qui reste vaut 1/(1+K),
   soit 20 % à K = 4 (statline) ;
 · le système DÉPASSE, de plus en plus ;
 · et — c'est là que ça coince — le temps d'établissement NE BOUGE PAS.
Geler (F) à K = 1 avant de monter : les deux courbes se recouvrent à la
même vitesse d'extinction. Le tiroir affiche mω₀, identique en BO et en BF.
La raison est algébrique : s² + 2mω₀s + ω₀²(1+K). Le K n'entre QUE dans le
terme constant, donc il déplace ω₀ et pas la partie réelle des pôles.`,
  },
  {
    id: 'faster',
    title: 'Scène 2 · Plus rapide et moins amorti, dans le même rapport',
    params: { w0: 1, m: 0.5, K: 4 },
    view: 'gain',
    visible: ['K'],
    lock: true,
    notes: `Le même geste, lu en fréquence. La courbe bleue est |L| = |K·G|,
la rouge est la boucle fermée |T|.
 · Aux basses fréquences T part de K/(1+K), donc de plus en plus près de
   0 dB : c'est l'erreur statique, vue de l'autre côté ;
 · la bande passante s'élargit — ω₀ devient ω₀√(1+K), soit ×2.24 à K = 4 ;
 · et une bosse apparaît, parce que m devient m/√(1+K).
Les deux effets viennent du MÊME √(1+K). Le faire dire : « on ne peut pas
accélérer sans désamortir, avec un simple gain. » C'est exactement pourquoi
le PID existe.
Passer sur Bode — phase : la phase de la boucle fermée est plus raide, et
c'est la même information.`,
  },
  {
    id: 'resonance',
    title: 'Scène 3 · Un procédé sage qui se met à résonner',
    params: { w0: 1, m: 0.8, K: 1 },
    view: 'gain',
    visible: ['K', 'm'],
    notes: `m = 0.8 > 1/√2 : le procédé SEUL ne résonne pas, la courbe bleue
n'a aucune bosse. Le faire constater d'abord.
Puis monter K. Le seuil est exact : la boucle fermée résonne dès que
m/√(1+K) < 1/√2, c'est-à-dire dès que K > 2m² − 1 = 0.28 ici.
La bosse rouge apparaît donc presque tout de suite, alors que le procédé
qu'on a bouclé était parfaitement calme. C'est la phrase à retenir :
« la résonance n'est pas une propriété du système, c'est une propriété de
la boucle. »`,
  },
  {
    id: 'abaque',
    title: 'Scène 4 · L’abaque : lire la boucle FERMÉE sur la boucle OUVERTE',
    params: { w0: 1, m: 0.5, K: 4 },
    view: 'black',
    visible: ['K'],
    notes: `On ne trace ici QUE la boucle ouverte — le lieu bleu, |L| en dB
contre arg L. Les contours gris sont l'abaque : tous les points du plan qui
donnent le même gain en boucle FERMÉE, |L/(1+L)| = M.
Le contour jaune est celui que le lieu TOUCHE. Sa valeur est la résonance de
la boucle fermée : 5.3 dB ici, et la statline l'affiche.
Le point à marteler : on n'a jamais tracé la boucle fermée sur cette vue.
On lit une propriété du système bouclé sur le dessin du système ouvert —
c'est exactement à ça que sert un abaque, et c'est pour ça qu'on l'utilisait
avant les ordinateurs.
Vérification honnête : revenir sur Bode — gain et lire la hauteur de la
bosse rouge. Même nombre. Le harnais vérifie l'égalité à 0.2 %.
Puis monter K : le lieu monte, la tangence saute de contour en contour, et
la résonance grimpe. Faire prédire le sens avant de bouger.`,
  },
];
// notes: Teacher Mode only. Never projected by default, never in the URL.
