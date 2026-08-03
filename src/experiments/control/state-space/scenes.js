// Lecture script — auto-discovered by the registry.
export default [
  {
    id: 'companion',
    title: 'Scène 1 · La forme compagne : x = (y, ẏ)',
    params: { basis: 'companion', K: 1, m: 0.4, w0: 2 },
    view: 'step',
    visible: ['m'],
    notes: `Partir de ce que les jeunes connaissent : l'équation différentielle
ÿ + 2mω₀ẏ + ω₀²y = Kω₀²u. Poser x₁ = y et x₂ = ẏ, et l'équation devient
deux équations du PREMIER ordre — c'est tout le tour de passe-passe.
Onglet 1 : la sortie. Onglet 2 : les deux composantes de l'état. Faire
nommer x₂ — c'est la vitesse, et elle s'annule exactement aux extremums de
y. Le faire vérifier à l'œil en passant d'un onglet à l'autre.
Bouger m : tout bouge ensemble, rien de surprenant.
La scène suivante change une seule chose — la BASE — et il faut que la
question soit déjà posée : « qu'est-ce qui va bouger ? »`,
  },
  {
    id: 'change',
    title: 'Scène 2 · Changer de base : la sortie ne bouge PAS',
    params: { basis: 'companion', K: 1, m: 0.4, w0: 2 },
    view: 'step',
    visible: ['basis'],
    notes: `LE geste de la séance. Rester sur l'onglet « Réponse indicielle » et passer
de la base compagne à la base modale, puis à la base quelconque.
La courbe ne bouge pas d'un pixel. Pas « presque » : le harnais vérifie
qu'elle est identique à 1e-12, et le tracé est dans un cadre qui ne dépend
que d'elle, donc rien ne peut masquer un mouvement.
Passer ensuite sur « Les deux états » et refaire le même tour : là, tout
change du tout au tout.
La phrase à faire sortir : L'ÉTAT EST UN CHOIX D'ÉCRITURE, LA SORTIE EST LE
SYSTÈME. On ne mesure jamais x, on mesure y.
Puis aller sur Plan de phase et refaire le tour des trois bases : la même
trajectoire, dessinée dans trois repères différents. C'est le même mouvement
filmé sous trois angles.`,
  },
  {
    id: 'modal',
    title: 'Scène 3 · La base modale : les modes découplés',
    params: { basis: 'modal', K: 1, m: 1.4, w0: 2 },
    view: 'step',
    visible: ['m', 'basis'],
    notes: `m = 1.4 : deux pôles RÉELS, et en base modale A devient
strictement diagonale — les deux états n'ont plus aucun terme croisé. Chacun
est une exponentielle pure qui décroît à sa propre vitesse, et la sortie
est leur somme.
C'est l'intérêt de la base modale : elle transforme un système couplé en
deux systèmes indépendants. Le faire lire sur les deux courbes d'état — deux
exponentielles, pas une oscillation.
Redescendre m sous 1 : les pôles redeviennent complexes, et la base modale
réelle prend la forme d'un bloc rotation-décroissance. Les deux états
oscillent alors en quadrature — ils sont le cosinus et le sinus du même
mode. Le harnais vérifie les deux formes.`,
  },
  {
    id: 'invariant',
    title: 'Scène 4 · Ce qui ne change jamais : les valeurs propres',
    params: { basis: 'companion', K: 1, m: 0.4, w0: 2 },
    view: 'poles',
    visible: ['basis', 'm'],
    notes: `Refaire le tour des trois bases sur cette vue : les deux points ne
bougent pas. Les valeurs propres de A sont INVARIANTES par changement de
base, parce que det(sI − T⁻¹AT) = det(sI − A).
Le tiroir affiche les deux invariants qui le garantissent : tr A = −2mω₀ et
det A = ω₀², identiques dans les trois écritures.
Et ces valeurs propres SONT les pôles : passer sur Bode — gain et Bode —
phase, qui sont reconstitués depuis les matrices par C(jωI−A)⁻¹B + D, et
retrouver exactement la réponse fréquentielle du second ordre du chapitre
précédent. Le harnais le vérifie au bit près, et pour n'importe quelle
matrice de passage — pas seulement les trois proposées.
Conclusion à écrire au tableau : une représentation d'état n'est pas LE
système, c'est UNE écriture du système. Ce qui est au système, ce sont les
valeurs propres, la fonction de transfert, la sortie.`,
  },
];
// notes: Teacher Mode only. Never projected by default, never in the URL.
