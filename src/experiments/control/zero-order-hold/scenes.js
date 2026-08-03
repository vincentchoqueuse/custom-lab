// Lecture script — auto-discovered by the registry.
export default [
  {
    id: 'stairs',
    title: 'Scène 1 · L’escalier suit le signal RETARDÉ',
    params: { fe: 1000, f0: 120, wco: 2000 },
    view: 'time',
    visible: ['fe', 'f0'],
    notes: `Poser la question AVANT tout calcul : « l'escalier bleu suit-il la
courbe grise ? » La réponse spontanée est oui, à peu près.
Montrer alors la courbe orange en pointillé : c'est le MÊME signal, retardé
d'une demi-période d'échantillonnage. Elle passe au milieu de chaque marche.
L'escalier ne suit pas le signal — il suit le signal retardé de Te/2.
Descendre Fe pour rendre les marches énormes : l'orange reste au milieu.
Ce n'est pas une coïncidence de tracé, c'est un théorème, et les deux vues
suivantes le disent en fréquence. Le harnais le vérifie à 1e-14.
Question à garder pour la fin : « ce retard, il coûte quoi ? »`,
  },
  {
    id: 'sinc',
    title: 'Scène 2 · Le module : une sinc, −3.92 dB à Fe/2',
    params: { fe: 1000, f0: 120, wco: 2000 },
    view: 'gain',
    visible: ['fe'],
    lock: true,
    notes: `Le bloqueur n'est pas transparent : son module est une sinc.
 · plat en basse fréquence — un signal lent traverse sans dommage ;
 · −3.92 dB à Fe/2, et ce nombre est EXACT : sinc(1/2) = 2/π ;
 · nul à Fe, à 2Fe, à 3Fe — d'où les zéros de transmission.
Faire glisser Fe : toute la sinc se dilate, les repères jaune et orange
suivent. Le gabarit ne change pas de forme, seulement d'échelle — c'est une
fonction de f·Te et de rien d'autre.
Le −3.92 dB est ce qu'on paye en amplitude. La scène suivante montre qu'on
paye bien plus cher en phase.`,
  },
  {
    id: 'delay',
    title: 'Scène 3 · La phase est une DROITE — donc un retard pur',
    params: { fe: 1000, f0: 120, wco: 2000 },
    view: 'phase',
    visible: ['fe'],
    notes: `Voilà le résultat du chapitre. La phase n'est pas « à peu près »
linéaire en basse fréquence : elle EST la droite −ωTe/2, partout, exactement.
Or une phase proportionnelle à ω, c'est la définition d'un retard pur. Donc :
    UN BLOQUEUR D'ORDRE ZÉRO EST UN RETARD PUR DE Te/2.
Deux lectures immédiates sur le tracé, toutes deux exactes :
 · à Fe/2 la phase vaut −90° ;
 · à Fe elle vaut −180°.
Faire dire la conséquence avant de la montrer : un retard pur ne change pas
le module mais mange de la phase, donc il mange de la MARGE DE PHASE. Un
système parfaitement stable en continu peut devenir instable une fois
échantillonné, sans qu'aucun gain n'ait bougé.`,
  },
  {
    id: 'cost',
    title: 'Scène 4 · Combien ça coûte, et d’où sort « Fe ≥ 20 f_co »',
    params: { fe: 1000, f0: 120, wco: 2000 },
    view: 'cost',
    visible: ['wco', 'fe'],
    notes: `La marge mangée vaut ω_co·Te/2 = π·f_co/Fe radians. Elle ne dépend
que du RAPPORT entre la fréquence d'échantillonnage et la coupure de la
boucle — pas des unités, pas du procédé.
Le point jaune est la Fe choisie ; la statline donne le nombre.
Faire lire la courbe :
 · Fe = 2·f_co (la limite de Shannon !) → 90° perdus. La boucle est morte.
   Shannon suffit pour RECONSTRUIRE un signal, pas pour le COMMANDER ;
 · Fe = 10·f_co → 18°, encore trop pour une marge confortable ;
 · Fe = 20·f_co → 9°, et c'est exactement d'où vient la règle d'ingénieur.
Le faire vérifier : régler ω_co, puis chercher la Fe qui met le point sur le
trait des 10°. Le rapport trouvé sera toujours le même, quel que soit ω_co —
c'est le sens de « la règle est un rapport ».`,
  },
];
// notes: Teacher Mode only. Never projected by default, never in the URL.
