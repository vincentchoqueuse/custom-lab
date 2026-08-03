// Lecture script — auto-discovered by the registry.
export default [
  {
    id: 'slide',
    title: 'Scène 1 · Retourner, glisser, intégrer',
    params: { sig: 'gate', ker: 'gate', a: 1, b: 1, t: 0.4 },
    view: 'overlap',
    visible: ['t'],
    notes: `Écrire la formule au tableau AVANT d'ouvrir l'écran :
    y(t) = ∫ x(τ)·h(t − τ) dτ
Puis poser LA question qui bloque tout le monde : « sur quoi intègre-t-on ? »
Réponse : sur τ. Le t est FIGÉ pendant l'intégrale — il ne bouge qu'entre
deux intégrales. C'est pour ça que l'axe de cette vue est τ et pas t.
Trois courbes : x(τ) en violet, immobile. h(t − τ) en orange — h RETOURNÉE
(le signe moins) puis GLISSÉE de t. Leur produit en bleu, et l'aire bleue
sous ce produit EST y(t).
Maintenant glisser t, doucement. C'est l'animation, à la main. Faire dire à
voix haute ce qui se passe : la porte orange entre par la gauche, recouvre
de plus en plus, puis ressort.
Ne pas encore montrer la courbe du bas.`,
  },
  {
    id: 'triangle',
    title: 'Scène 2 · Deux portes donnent un TRIANGLE',
    params: { sig: 'gate', ker: 'gate', a: 1, b: 1, t: 1 },
    view: 'response',
    visible: ['t'],
    notes: `Faire prédire AVANT de montrer : « deux portes carrées — la sortie
sera carrée aussi, non ? » C'est la réponse spontanée, et elle est fausse.
Révéler la courbe : un triangle. Puis retourner sur l'onglet du calcul et
glisser t pour comprendre pourquoi, en nommant les quatre régimes que la
statline annonce :
 · t < 0 : aucun recouvrement, y = 0 ;
 · 0 < t < 1 : le recouvrement GRANDIT proportionnellement à t — la montée
   est donc une droite, pas une courbe ;
 · t = 1 : recouvrement maximal, sommet ;
 · t > 1 : le recouvrement diminue, et la descente est droite pour la même
   raison.
Le triangle n'est pas une forme choisie, c'est la géométrie du recouvrement
de deux rectangles. Le harnais vérifie la forme close au 1e-12.`,
  },
  {
    id: 'widths',
    title: 'Scène 3 · Les largeurs s’ajoutent, les aires se multiplient',
    params: { sig: 'gate', ker: 'gate', a: 2, b: 0.5, t: 1 },
    view: 'response',
    visible: ['a', 'b'],
    lock: true,
    notes: `Deux portes de largeurs DIFFÉRENTES : le triangle devient un
trapèze, de base a + b, de plateau |a − b| et de hauteur min(a, b).
Deux règles à faire découvrir en bougeant a et b :
 · la LARGEUR du support s'ajoute : supp(y) = supp(x) + supp(h). C'est la
   règle à retenir, et le tiroir l'affiche ;
 · l'AIRE, elle, se MULTIPLIE : ∫y = ∫x · ∫h (statline). Avec deux portes
   d'aire 1, l'aire du triangle vaut 1 — le faire vérifier.
Question pour finir : « et si je prends a = b ? » Le plateau |a − b| tombe
à zéro : le trapèze redevient le triangle de la scène précédente. Un cas
particulier, pas un cas à part.`,
  },
  {
    id: 'commute',
    title: 'Scène 4 · Qui retourne-t-on ? (ça ne change rien)',
    params: { sig: 'gate', ker: 'gate', a: 2, b: 0.5, t: 1 },
    view: 'overlap',
    visible: ['a', 'b'],
    notes: `Sur le dessin, ce n'est pas symétrique du tout : c'est h qu'on
retourne et qu'on glisse, x ne bouge jamais. On s'attend donc à ce que
l'ordre compte.
Le geste : échanger a et b (2 et 0.5 → 0.5 et 2). La vue du calcul change
COMPLÈTEMENT — ce n'est plus la même porte qui glisse. Puis aller sur la
courbe du bas : elle est identique.
x * h = h * x. Le harnais le vérifie à 1e-12 sur toute la courbe.
La morale : le retournement est un artifice de CALCUL, pas une propriété du
système. On retourne celle des deux qui rend le dessin plus simple.`,
  },
  {
    id: 'rc',
    title: 'Scène 5 · La même intégrale, c’est la charge d’un RC',
    params: { sig: 'gate', ker: 'exp', a: 1.5, b: 0.4, t: 1 },
    view: 'response',
    visible: ['t', 'b'],
    notes: `Changer h : une exponentielle e^(−t/b)/b, c'est-à-dire la réponse
impulsionnelle d'un RC de constante de temps b.
La sortie est ce que tout le monde a déjà tracé en TP : la charge en
1 − e^(−t/b) tant que l'impulsion dure, puis la décharge en e^(−(t−a)/b).
Le point à faire tomber : ce n'est pas une formule DE PLUS. C'est la même
intégrale que le triangle, avec un autre h. Retourner sur l'onglet du calcul
et glisser t : l'exponentielle retournée balaie la porte exactement comme la
porte le faisait.
Puis jouer avec b : b petit → la sortie recopie l'entrée (le RC suit) ;
b grand → elle l'intègre et la lisse (le RC est trop lent). Le filtre
passe-bas, vu dans le temps, avant d'en avoir tracé le Bode.`,
  },
];
// notes: Teacher Mode only. Never projected by default, never in the URL.
