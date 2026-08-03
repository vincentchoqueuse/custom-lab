// Lecture script — auto-discovered by the registry.
export default [
  {
    id: 'tau',
    title: 'Scène 1 · τ, et rien d\'autre',
    params: { K: 1, tau: 1, tz: 0 },
    view: 'step',
    visible: ['tau'],
    notes: `Le premier ordre pur : une exponentielle, un seul paramètre de forme.
Faire les trois lectures graphiques du cours à voix haute :
 · à t = τ la sortie vaut 63 % de la valeur finale ;
 · à t = 3τ elle en vaut 95 % — c'est le temps de réponse à 5 %, celui
   qu'on annonce dans un cahier des charges (statline : 3τ à l'affichage) ;
 · la tangente à l'origine coupe la valeur finale exactement en t = τ.
Bouger τ : la courbe s'étire, les quatre repères la suivent sans effort.
Question : « et le gain K, ça change quoi à la vitesse ? » — rien du tout,
c'est ce qui rend τ intéressant.`,
  },
  {
    id: 'impulse',
    title: 'Scène 2 · L\'impulsionnelle, c\'est la dérivée',
    params: { K: 1, tau: 1, tz: 0 },
    view: 'impulse',
    visible: ['tau'],
    notes: `Même système, autre entrée : h(t) = (K/τ)·e^{−t/τ}, qui part de K/τ et
décroît avec la MÊME constante de temps.
Faire le lien explicitement : h est la dérivée de la réponse indicielle
(le harnais le vérifie numériquement). C'est pour ça que les deux courbes
partagent τ — et pourquoi un système lent est aussi un système « mou ».
L'aire sous h vaut K, le gain statique : intégrer une impulsion redonne
l'échelon.`,
  },
  {
    id: 'pole',
    title: 'Scène 3 · Un pôle, une vitesse',
    params: { K: 1, tau: 1, tz: 0 },
    view: 'poles',
    visible: ['tau'],
    notes: `Le pôle est en −1/τ, seul sur l'axe réel. Bouger τ et le regarder
glisser : plus il s'éloigne de l'axe imaginaire, plus le système est rapide.
Question à poser : « que se passerait-il s'il passait à DROITE de l'axe ? »
Réponse : e^{+t/|τ|}, la sortie diverge — c'est l'instabilité, et c'est tout
ce qu'il y a à retenir du demi-plan droit.
Revenir sur l'onglet indicielle pour associer position du pôle et allure.`,
  },
  {
    id: 'bode',
    title: 'Scène 4 · Le même système, vu en fréquence',
    params: { K: 1, tau: 1, tz: 0 },
    view: 'freq',
    visible: ['tau'],
    lock: true,
    notes: `Axes figés : bouger τ fait glisser la cassure sans que le cadre bouge.
La coupure est en ω = 1/τ, exactement le pôle changé de signe — même nombre,
deux lectures. Au-delà, la pente est de −20 dB par décade, toujours.
Onglet Phase : −45° pile à la coupure, −90° à l'infini.
Rapide dans le temps ⟺ large en fréquence : c'est le même compromis que la
troncature, vu depuis l'automatique.`,
  },
  {
    id: 'zero',
    title: 'Scène 5 · Un zéro, et la sortie saute',
    params: { K: 1, tau: 1, tz: 0.5 },
    view: 'step',
    visible: ['tz'],
    notes: `Les repères 63 %/τ et 95 %/3τ ont disparu, et c'est voulu : ils ne
valent que pour le premier ordre PUR. La tangente, elle, reste — son identité
survit au zéro.
Ajouter un zéro : la sortie ne part plus de zéro, elle SAUTE à K·τ_z/τ
(valeur initiale dans la statline). Le numérateur dérive l'entrée, et une
dérivée d'échelon, c'est une marche.
Monter τ_z au-delà de τ : le saut dépasse la valeur finale, puis on redescend
— l'avance de phase, celle qu'un correcteur PD fabrique exprès.
Aller voir l'impulsionnelle : le zéro y ajoute un Dirac, dont le poids est
affiché. Un système qui répond instantanément, c'est ça.`,
  },
  {
    id: 'nmp',
    title: 'Scène 6 · Phase non minimale : ça part à l\'envers',
    params: { K: 1, tau: 1, tz: -0.6 },
    view: 'step',
    visible: ['tz'],
    notes: `τ_z négatif : le zéro passe dans le demi-plan DROIT et la sortie commence
par partir du mauvais côté avant de revenir (dépassement inverse, en statline).
Ce n'est pas une curiosité : c'est le comportement d'un avion qui pique quand
on tire sur le manche, d'un réacteur nucléaire, d'un ballon d'eau chaude.
Question : « peut-on corriger ça en accélérant la boucle ? » Non — et c'est
la limite fondamentale que tout le cours d'asservissement va rencontrer.
Onglet Pôles : le zéro est visiblement à droite. Onglet Phase : elle plonge
vers −180° au lieu de −90°, alors que le gain, lui, ne dit rien.`,
  },
];
// notes: Teacher Mode only. Never projected by default, never in the URL.
