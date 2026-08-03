// Lecture script — auto-discovered by the registry.
export default [
  {
    id: 'first',
    title: 'Scène 1 · Un premier ordre, lu quatre fois',
    params: { sys: 'first', K: 1, tau: 1, wc: 1 },
    view: 'gain',
    visible: ['wc'],
    notes: `Poser la règle du jeu : les quatre onglets tracent LE MÊME nombre
complexe H(jω). Rien d'autre ne change entre eux que la façon de le regarder.
Placer ω_c sur 1 rad/s = 1/τ et faire lire les deux valeurs de la statline :
−3.01 dB et −45°. Puis faire retrouver ces deux mêmes nombres :
 · sur Bode gain, la hauteur du trait jaune ;
 · sur Bode phase, sa hauteur là aussi ;
 · sur Nyquist, la longueur du segment origine→point jaune et son angle ;
 · sur Black, l'abscisse et l'ordonnée du point jaune.
Quatre lectures, deux nombres. Ensuite seulement, glisser ω_c et regarder le
point jaune courir sur les quatre courbes en même temps.`,
  },
  {
    id: 'halfcircle',
    title: 'Scène 2 · Le premier ordre EST un demi-cercle',
    params: { sys: 'first', K: 1, tau: 1, wc: 1 },
    view: 'nyquist',
    visible: ['wc', 'K'],
    notes: `Le lieu de Nyquist d'un premier ordre est un demi-cercle exact, de
centre K/2 sur l'axe réel et de rayon K/2 — le harnais le vérifie à 1e-15.
Le faire constater : à ω = 0 on part de K sur l'axe réel, à ω → ∞ on arrive
à l'origine, et ω_c = 1/τ est pile au SOMMET, à −45°.
Question : « pourquoi la phase ne descend-elle jamais sous −90° ? » Parce que
le demi-cercle reste dans le quadrant inférieur droit — la géométrie répond
avant le calcul. Bouger K : le cercle grandit, les angles ne changent pas.`,
  },
  {
    id: 'damped',
    title: 'Scène 3 · Second ordre amorti (m = 1.2)',
    params: { sys: 'second', K: 1, w0: 1, m: 1.2, wc: 1 },
    view: 'gain',
    visible: ['m', 'wc'],
    notes: `m = 1.2 > 0.707 : aucune bosse. Le gain descend sagement, la phase
va jusqu'à −180° (deux pôles, deux fois −90°), le lieu de Nyquist fait un
demi-tour complet et Black descend en diagonale.
Poser ω_c sur ω₀ = 1 rad/s : la statline affiche exactement −90° — c'est
toujours vrai à ω₀, quel que soit m, et le harnais le vérifie.
Garder cette image en tête : la scène suivante ne change QUE m.`,
  },
  {
    id: 'resonant',
    title: 'Scène 4 · Second ordre résonant (m = 0.3)',
    params: { sys: 'second', K: 1, w0: 1, m: 0.3, wc: 1 },
    view: 'gain',
    visible: ['m', 'wc'],
    lock: true,
    notes: `Même système, m descendu à 0.3. La bosse apparaît : +4.85 dB à
ω_r = ω₀√(1−2m²) = 0.91 rad/s (trait orange, valeurs en statline).
Faire le tour des trois autres vues avec ω_c posé sur ω_r :
 · Nyquist : le lieu S'ENFLE, le point jaune s'éloigne de l'origine ;
 · Black : une NEZ apparaît vers la gauche, c'est la même bosse couchée.
Puis remonter m lentement vers 0.707 et faire annoncer le moment où la bosse
disparaît. Le seuil est exact, pas approximatif : au-dessus de 1/√2 il n'y a
plus de maximum, et le tiroir l'affiche.
La question qui reste : « le temporel, lui, dépasse dès m < 1 — pourquoi deux
seuils différents ? » (à traiter avec l'expérience Réponse d'un second ordre).`,
  },
  {
    id: 'margins',
    title: 'Scène 5 · Les marges, lues sur les trois diagrammes',
    params: { sys: 'openloop', K: 1, tau: 1, wc: 0.78 },
    view: 'gain',
    visible: ['K', 'wc'],
    notes: `Enfin un système où le point −1 sert à quelque chose. Un premier ou
un second ordre stables ont des marges INFINIES : leur phase n'atteint jamais
−180°. La boucle ouverte K/(jω(1+jωτ)(1+jωτ/5)), elle, y arrive à une
pulsation finie, et les deux marges existent.
Deux traits verticaux sont tracés sur les deux Bode :
 · violet ω à 0 dB = 0.78 rad/s — c'est LÀ qu'on lit la marge de phase, sur
   le diagramme de phase : l'écart jusqu'à −180°, ici 43.2° ;
 · orange ω à −180° = 2.24 rad/s — c'est LÀ qu'on lit la marge de gain, sur
   le diagramme de gain : l'écart jusqu'à 0 dB, ici 15.6 dB.
Deux traits, deux écarts, deux nombres — et la statline les affiche.
Puis passer à Nyquist, où les deux mêmes nombres sont deux constructions :
 · marge de gain : la courbe coupe l'axe réel négatif en −1/6 ≈ −0.167 ; il
   reste un facteur 6 avant d'atteindre −1, et 20·log₁₀(6) = 15.6 dB ;
 · marge de phase : là où la courbe sort du cercle unité (tracé), l'angle qui
   reste jusqu'à la demi-droite −180°, soit 43.2°.
Et sur Black : la marge de phase est l'écart HORIZONTAL au point critique, la
marge de gain l'écart VERTICAL. Le point critique est le même partout, les
marges aussi — seuls les axes ont tourné.`,
  },
  {
    id: 'unstable',
    title: 'Scène 6 · Monter K jusqu\'à faire diverger la boucle',
    params: { sys: 'openloop', K: 1, tau: 1, wc: 2.24 },
    view: 'nyquist',
    visible: ['K'],
    notes: `Une seule commande : K. Geler (F) à K = 1, puis monter.
Poser la question AVANT : « qu'est-ce qui bouge quand j'augmente K ? »
Réponse à obtenir : le lieu GRANDIT (homothétie de centre origine), le point
−1 ne bouge pas — c'est toute l'idée du critère de Nyquist.
ω à −180° = √5/τ ne dépend PAS de K : le lieu coupe toujours l'axe réel au
même endroit sur la courbe, mais de plus en plus loin de l'origine.
Faire monter K jusqu'à 6 : le lieu passe EXACTEMENT par −1, les deux marges
tombent à zéro en même temps (statline), le tiroir affiche « instable ».
K_crit = (τ₁+τ₂)/(τ₁τ₂) = 6/τ, exact, vérifié par le harnais.
Au-delà, les marges deviennent négatives : la boucle fermée diverge. Le faire
constater sur Black aussi — la courbe passe à gauche du point critique.
Dernier geste : redescendre τ à 0.5 et faire prédire K_crit avant de le lire.`,
  },
  {
    id: 'abaque',
    title: 'Scène 7 · L\'abaque : lire la boucle FERMÉE sur le lieu OUVERT',
    params: { sys: 'openloop', K: 1, tau: 1, wc: 0.8 },
    view: 'black',
    visible: ['K', 'wc'],
    notes: `La question que les jeunes posent toujours : « on trace la boucle
ouverte, mais ce qui m'intéresse c'est la boucle fermée ». L'abaque répond.
Les contours gris sont la famille |H/(1+H)| = M : tous les points du plan qui
donnent le MÊME gain en boucle fermée. Sur Black c'est l'abaque de Nichols,
sur Nyquist ce sont les cercles de Hall — une seule famille, deux dessins,
exactement comme H(jω) lui-même.
Le contour jaune est celui que le lieu TOUCHE : la tangence donne la
résonance en boucle fermée, ici 2.67 dB (statline). Le faire pointer du
doigt avant de lire le chiffre.
Puis monter K doucement. Le lieu glisse vers le point critique, la tangence
saute de contour en contour, et la résonance grimpe : 2.7 dB à K = 1,
11.7 dB à K = 3, 23.7 dB à K = 5. La question à poser à ce moment-là :
« et si je continue ? » — le contour tangent se resserre autour du point
critique jusqu'à ce qu'il n'y ait plus rien à toucher. À K = 6 le lieu passe
PAR le point critique : la résonance devient infinie, l'app cesse d'afficher
un chiffre, et c'est exactement ce que veut dire « instable ».
Les marges disent la même chose autrement : plus la marge de phase est
faible, plus la résonance est forte. Deux lectures, un seul phénomène.`,
  },
];
// notes: Teacher Mode only. Never projected by default, never in the URL.
