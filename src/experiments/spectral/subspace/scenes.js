// Lecture script — auto-discovered by the registry.
export default [
  {
    id: 'wall',
    title: 'Scène 1 · Le mur de Fourier',
    view: 'spectrum',
    params: { sources: 2, df: 0.5, snr: 25, N: 256, M: 32, d: 2 },
    visible: ['df', 'N'],
    notes: `Deux exponentielles séparées de 0.5 × Fs/N, dans du bruit à 25 dB.
Le périodogramme n'en montre qu'UNE, et les deux verticales jaunes
disent où elles sont vraiment.

Faire monter Δf jusqu'à 1 : à 1 × Fs/N la bosse se dédouble, tout juste.
Redescendre à 0.5, puis faire la question qui ouvre le chapitre :
« que faut-il changer pour les séparer ? » La salle répondra N —
allonger l'enregistrement. C'est vrai, et c'est cher : séparer 0.5 ×
Fs/N demande de doubler la durée d'acquisition.

Il existe une autre monnaie. Onglet suivant.`,
  },
  {
    id: 'eigen',
    title: 'Scène 2 · Compter les sources',
    view: 'eigen',
    params: { sources: 2, df: 0.5, snr: 25, N: 256, M: 32, d: 2 },
    visible: ['d', 'snr'],
    notes: `Les 20 valeurs propres de la covariance, décroissantes, en dB. La
structure saute aux yeux : quelques grandes, puis un plateau. Le
plateau EST le bruit — toutes ces valeurs propres valent σ², et la
ligne verte le confirme.

Le nombre de valeurs propres au-dessus du plateau est le nombre de
sources. C'est la seule information dont on dispose en pratique pour
choisir d, et la statline chiffre le saut à la coupure.

Faire descendre le SNR de 20 dB à 0, puis à −5 : le plateau remonte,
le saut se referme, et à un moment on ne peut plus compter. C'est le
SEUIL des méthodes à haute résolution — elles ne se dégradent pas
doucement, elles décrochent.

Remarque à faire remarquer : à Δf = 0.5, la SECONDE valeur propre
signal est déjà bien plus petite que la première. Deux raies très
proches ont des vecteurs directeurs presque colinéaires ; c'est
géométriquement la même difficulté que celle de Fourier, mais ici elle
se lit sur un nombre au lieu de se deviner sur une bosse.`,
  },
  {
    id: 'resolve',
    title: 'Scène 3 · Le modèle achète la résolution',
    view: 'pseudo',
    params: { sources: 2, df: 0.5, snr: 25, N: 256, M: 32, d: 2 },
    visible: ['df', 'snr'],
    notes: `Le même enregistrement, la même seconde de signal, le même bruit —
et deux pics là où le périodogramme n'en montrait qu'un.

Les trois estimateurs sont sur l'écran : la courbe MUSIC (balayée),
les points orange root-MUSIC et violets ESPRIT. Ces deux-là ne
balaient rien : ils résolvent une équation. Aucune grille, donc
aucune résolution limitée par un pas — la statline donne leur erreur
en hertz, et elle est de l'ordre du centième.

Descendre Δf et regarder jusqu'où ça tient — puis comprendre que la
réponse dépend de DEUX autres réglages, et que c'est là tout le sujet :
  Δf = 0.3 exige d'aller chercher 30 dB de SNR
  Δf = 0.2 en exige 40
  et à M = 12 au lieu de 32, même 0.5 ne passe plus.
Ces trois nombres sont mesurés, pas illustratifs. Le périodogramme,
lui, ne s'effondre jamais — il reste médiocre, quoi qu'on fasse.

C'est le marché : Fourier ne suppose rien et ne résout rien de mieux
que Fs/N ; MUSIC suppose « d exponentielles dans du bruit blanc » et
résout bien mieux TANT QUE le modèle est vrai.`,
  },
  {
    id: 'wrong-d',
    title: 'Scène 4 · Se tromper de d',
    view: 'pseudo',
    params: { sources: 3, df: 0.5, snr: 25, N: 256, M: 32, d: 3 },
    visible: ['d', 'sources'],
    notes: `Trois sources maintenant : les deux proches et une à l'écart. Avec
d = 3, les trois pics sont là.

Puis casser le modèle dans les deux sens, en faisant prédire AVANT.

  d = 2  → « laquelle disparaît ? » Une des deux proches : le
           sous-espace signal est trop petit pour les contenir toutes.
           C'est franc, et ça se voit sur la courbe.

  d = 5  → et là, une surprise qui vaut d'être vécue. La courbe MUSIC
           ne bouge presque pas ; les ondulations parasites restent
           cinquante décibels plus bas. Balayé, MUSIC est INDULGENT à
           une surestimation de d.
           Mais regarder les POINTS : root-MUSIC et ESPRIT rendent
           exactement d valeurs, donc cinq. Deux d'entre elles tombent
           là où il n'y a rien — mesuré à 443 et 839 Hz. Les tracer
           n'était pas un ornement : c'est ce qui rend l'erreur visible.

La leçon pratique est là : un pic bas se remarque, un CHIFFRE inventé
non — il a l'air d'un résultat. Et c'est pourquoi on ne choisit pas d
au jugé : revenir à l'onglet des valeurs propres et montrer que c'est
LÀ, et seulement là, qu'on pouvait le lire.`,
  },
];
// notes: Teacher Mode only. Never projected by default, never in the URL.
