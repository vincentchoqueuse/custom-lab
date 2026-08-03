// Lecture script — auto-discovered by the registry.
export default [
  {
    id: 'samples',
    title: 'Scène 1 · Le signal et ses échantillons',
    params: { signal: 'gauss', fe: 600, tau: 5 },
    view: 'time',
    visible: ['fe'],
    notes: `Commencer par ce qu'on voit vraiment : une courbe, et des points
prélevés tous les Te = 1/Fe. Descendre Fe : les points s'espacent, la courbe
ne bouge pas. À 600 Hz on en a des dizaines par bosse, à 100 Hz une poignée.
Question à poser AVANT de passer à l'onglet suivant :
« ces points-là, qu'est-ce qu'ils savent du signal ? »
Toute l'expérience répond à cette question — en fréquence.`,
  },
  {
    id: 'copies',
    title: 'Scène 2 · Le spectre se recopie',
    params: { signal: 'gauss', fe: 600, tau: 5 },
    view: 'periodize',
    visible: ['fe'],
    notes: `Une gaussienne, échantillonnée à 600 Hz. Le spectre du signal
échantillonné (bleu) n'est pas X(f) : c'est X(f) PLUS ses copies décalées de
±Fe, ±2Fe (grises). À 600 Hz elles sont loin, la copie centrale est intacte.
Question avant de bouger : « que se passe-t-il si je descends Fe ? »
Réponse attendue fausse : « le spectre rétrécit ». Non : les copies se
rapprochent.`,
  },
  {
    id: 'overlap',
    title: 'Scène 3 · Elles se recouvrent : voilà le repliement',
    params: { signal: 'gauss', fe: 150, tau: 5 },
    view: 'periodize',
    visible: ['fe', 'tau'],
    notes: `Fe = 150 Hz : les copies mordent sur la centrale et S'AJOUTENT — la
bosse bleue est plus haute que l'orange (statline : ~80 % d'erreur dans la
bande). Le repliement n'est pas une déformation mystérieuse, c'est une SOMME.
Remonter Fe doucement et regarder les copies s'écarter jusqu'à ce que l'erreur
tombe. Élargir τ (signal plus étalé en temps → spectre plus étroit) marche
aussi : c'est le même compromis.`,
  },
  {
    id: 'bandlimited',
    title: 'Scène 4 · Le seul signal vraiment à bande limitée',
    params: { signal: 'sinc', fe: 300, tau: 5 },
    view: 'periodize',
    visible: ['fe', 'signal'],
    notes: `Le sinc a pour spectre un RECTANGLE : il s'arrête net à 1/2τ = 100 Hz.
Fe = 300 > 200 Hz : les copies ne se touchent pas du tout, l'erreur vaut
EXACTEMENT zéro (le harnais le vérifie). Descendre sous 200 Hz : elles se
chevauchent d'un coup. C'est Shannon, montré au lieu d'être récité — et le
sinc est le seul des quatre à y arriver, les autres ont des queues infinies.`,
  },
  {
    id: 'dtft',
    title: 'Scène 5 · Ce que les échantillons savent',
    params: { signal: 'triangle', fe: 250, tau: 5 },
    view: 'periodize',
    visible: ['signal', 'fe'],
    notes: `Les points verts sont calculés SANS jamais utiliser X(f) : c'est la
transformée des échantillons eux-mêmes, Σ x(nTe)·e^{−j2πfnTe}. Ils tombent
pile sur la somme des copies. C'est la formule de Poisson, et c'est tout le
théorème : échantillonner dans le temps = périodiser en fréquence.
Changer de signal en gardant Fe : la démonstration tient à chaque fois.`,
  },
];
