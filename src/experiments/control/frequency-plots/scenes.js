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
];
// notes: Teacher Mode only. Never projected by default, never in the URL.
