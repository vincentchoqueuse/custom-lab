// Lecture script — auto-discovered by the registry.
export default [
  {
    id: 'samples',
    title: 'Scène 1 · Ce qu’on a : des échantillons',
    params: { stage: 'samples', L: 4, f0: 1000, half: 8 },
    visible: ['f0'],
    notes: `Une sinusoïde à 1 kHz, échantillonnée à 8 kHz. Rien d'autre pour
l'instant : des nombres, tous les 0.125 ms.

Aller voir le spectre. La courbe s'arrête à Fs/2 = 4 kHz, et ce n'est pas un
oubli : d'un signal cadencé à 8 kHz, on ne sait RIEN au-delà de 4 kHz. C'est
là toute la bande utile.

Question à poser avant d'avancer : « je veux le même signal cadencé quatre
fois plus vite. Que dois-je calculer ? » La salle proposera d'interpoler, de
répéter, de moyenner. La réponse tient en deux gestes, et le premier ne
calcule rien du tout.`,
  },
  {
    id: 'stuffing',
    title: 'Scène 2 · Des zéros — et le spectre ne bouge pas',
    params: { stage: 'stuffed', L: 4, f0: 1000, half: 8 },
    visible: ['L', 'stage'],
    notes: `Premier geste : on insère L−1 ZÉROS entre les échantillons. Aucun
calcul, aucune information ajoutée. Le temporel montre une chenille de pics
séparés par du vide.

Puis le spectre, et c'est LE moment de la séance. Faire prédire d'abord :
« qu'est-ce que des zéros font à un spectre ? »

Rien. X_up(f) = X(f), exactement — le harnais le vérifie à 1e-12. Ce qui a
changé, c'est la BANDE : on regarde maintenant jusqu'à L·Fs/2 = 16 kHz au
lieu de 4. Les copies du spectre, qui existaient depuis toujours à k·Fs ± f₀,
étaient hors cadre ; elles sont maintenant DEDANS. On les appelle des images,
et il y en a exactement L−1 nouvelles.

Le détail qui compte : un échantillon sur L est non nul, donc la puissance
moyenne a été divisée par L. Le filtre devra la rendre.`,
  },
  {
    id: 'filter',
    title: 'Scène 3 · Le filtre efface les images',
    params: { stage: 'filtered', L: 4, f0: 1000, half: 8 },
    visible: ['stage', 'L'],
    notes: `Second geste : un passe-bas de coupure Fs/2 et de gain L. Sa réponse
est tracée en orange par-dessus le spectre — on VOIT ce qu'il garde et ce
qu'il coupe.

Les images tombent de 62 dB (statline). Et le temporel se remplit : les zéros
deviennent une sinusoïde.

DEUX points à faire remarquer, aucun des deux évident :

  · la courbe interpolée passe EXACTEMENT par les échantillons d'origine —
    8e-18 à la statline. Ce n'est pas une coïncidence mais la propriété du
    noyau, qui vaut 1 au centre et 0 à tous les autres multiples de L. On n'a
    pas approché les données, on les a gardées.

  · la raie utile est remontée de 12 dB, soit 20·log10(L). C'est la puissance
    que le stuffing avait divisée par L et que le gain du filtre rend. Faire
    le lien avec la scène précédente : ces deux nombres sont le même fait.

Faire l'aller-retour étape 2 / étape 3 deux ou trois fois. Toute la chaîne
est là.`,
  },
  {
    id: 'short',
    title: 'Scène 4 · Un filtre trop court',
    params: { stage: 'filtered', L: 4, f0: 1000, half: 1 },
    visible: ['half', 'L'],
    notes: `M = 1 : neuf coefficients. L'image est à −7 dB — elle est encore
LÀ, presque intacte, et on la voit sur la figure. Le filtre n'existe pas.

Remonter M et regarder. Mais attention à ce qu'on annonce, parce que la
mesure contredit l'intuition : ce n'est PAS monotone.

    M = 1  → −7 dB      M = 2  → −55 dB
    M = 4  → −44 dB     M = 8  → −62 dB      M = 16 → −80 dB

M = 4 est moins bon que M = 2. Ce n'est pas un défaut du calcul : la fenêtre
de Hann pose un plancher de lobes, et le motif d'ondulation de la bande
d'arrêt GLISSE quand la longueur change. L'image tombe donc tantôt dans un
creux, tantôt sur une bosse. La tendance est bonne, chaque pas ne l'est pas.

C'est un bon moment pour dire ce qu'on ne dit jamais assez : « plus long,
donc meilleur » est vrai en moyenne et faux en particulier, et c'est
exactement pour cela qu'on mesure au lieu de raisonner.

La question qui termine bien : « pourquoi ne pas prendre M = 100 ? » — parce
que ce filtre tourne à L·Fs, donc L fois par échantillon d'entrée. Le
suréchantillonnage n'est pas gratuit ; il est simplement BEAUCOUP moins cher
qu'un filtre analogique de même raideur.`,
  },
];
// notes: Teacher Mode only. Never projected by default, never in the URL.
