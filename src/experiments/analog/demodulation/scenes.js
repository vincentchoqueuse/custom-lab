// Lecture script — auto-discovered by the registry.
export default [
  {
    id: 'envelope',
    title: 'Scène 1 · Deux informations dans une seule courbe',
    view: 'time',
    params: { fc: 1000, ka: 0.5, fam: 40, fdev: 200, ffm: 25, snr: 40 },
    visible: ['ka', 'snr'],
    notes: `Le signal gris est modulé EN AMPLITUDE ET EN FRÉQUENCE en même
temps. La courbe jaune est l'enveloppe vraie — celle qu'on cherche.
Les deux estimations se posent dessus et on ne les distingue pas.

Poser la question de méthode avant celle de résultat :
« ces deux courbes viennent de deux calculs qui n'ont rien en commun. »

  HILBERT est GLOBAL : une FFT sur tout l'enregistrement, on annule les
  fréquences négatives, et A = |x + j·H{x}|. La valeur à l'instant t
  dépend de TOUS les échantillons, y compris ceux d'après. Aucune
  démodulation en temps réel là-dedans.

  TEAGER est LOCAL : Ψ(x)[n] = x[n]² − x[n+1]·x[n−1]. Trois échantillons,
  deux multiplications, et ce nombre vaut déjà A²sin²Ω. Pas de
  transformée, pas de retard, un coût par point indépendant de la
  longueur du signal.

Monter k_a jusqu'à 0.9 : les deux suivent. Le résultat est le même, le
prix ne l'est pas — et c'est ce qui se paie dans la scène 3.`,
  },
  {
    id: 'frequency',
    title: 'Scène 2 · Et la fréquence, dans la même courbe',
    view: 'freq',
    params: { fc: 1000, ka: 0.5, fam: 40, fdev: 200, ffm: 25, snr: 40 },
    visible: ['fdev', 'ffm'],
    notes: `La seconde information, extraite du MÊME signal. La fréquence
instantanée oscille entre 800 et 1200 Hz, et les deux méthodes la
suivent.

Hilbert dérive la phase déroulée — donc il faut d'abord dérouler, et un
saut mal déroulé se voit immédiatement. Teager ne déroule rien : il lit
Ω directement dans un rapport d'énergies.

Monter Δf et f_FM : les deux tiennent tant qu'on reste dans le domaine.
La ligne verte, elle, annonce ce qui se passe quand on en sort — c'est
la scène 4.

Sans bruit, aucune des deux n'est exacte sur ce signal : 2.1 Hz d'erreur
pour Teager, 3.4 Hz pour Hilbert (statline). Ce n'est pas du bruit, c'est
le COUPLAGE — l'amplitude et la fréquence bougent ensemble, et les deux
méthodes supposent implicitement qu'elles bougent lentement l'une par
rapport à la porteuse.`,
  },
  {
    id: 'noise',
    title: 'Scène 3 · Le prix de la localité',
    view: 'freq',
    params: { fc: 1000, ka: 0.5, fam: 40, fdev: 200, ffm: 25, snr: 20 },
    visible: ['snr'],
    notes: `Faire prédire avant de descendre le SNR : « laquelle des deux va
lâcher en premier ? »

Puis descendre, et lire la statline. Les erreurs RMS en fréquence,
mesurées :
    SNR 40 dB → Hilbert 8.9 Hz,  Teager 17.6 Hz
    SNR 30 dB → Hilbert 26 Hz,   Teager 59 Hz
    SNR 20 dB → Hilbert 84 Hz,   Teager 266 Hz
    SNR 10 dB → Hilbert 287 Hz,  Teager 548 Hz

Teager décroche deux à trois fois plus vite. La raison est dans sa
définition : Ψ est un PRODUIT d'échantillons voisins, donc le bruit y
entre au carré, et rien ne le moyenne. Hilbert fait une FFT, et une FFT
EST un moyennage sur tout l'enregistrement. La localité qui rendait
Teager gratuit est exactement ce qui le rend fragile.

Et une chose rare, à montrer : Teager ANNONCE sa propre défaillance. La
statline compte les « arccos hors domaine » — 0 jusqu'à 30 dB, 42 à
20 dB, 233 à 10 dB. Quand l'argument de l'arccos sort de [−1, 1], le
modèle sinusoïdal local n'est plus tenable, et l'algorithme le sait.`,
  },
  {
    id: 'fold',
    title: 'Scène 4 · Là où Teager se replie',
    view: 'freq',
    params: { fc: 1800, ka: 0.5, fam: 40, fdev: 400, ffm: 25, snr: 50 },
    visible: ['fc', 'fdev'],
    notes: `Bruit quasi nul, et pourtant la courbe orange fait n'importe quoi
au-dessus de la ligne verte — pendant que la bleue suit parfaitement.
Ce n'est donc pas une question de bruit.

DESA-2 obtient la pulsation par Ω = ½·arccos(…). L'arccos rend [0, π],
donc Ω ne peut PAS dépasser π/2, donc f ne peut pas dépasser Fs/4 =
2000 Hz. Au-delà, l'estimation se replie exactement comme un
sous-échantillonnage : le harnais vérifie que l'erreur vaut exactement
2(f − Fs/4).

La porteuse est montée à 1800 Hz pour cette scène, et l'excursion vaut
400 : la fréquence instantanée balaie donc 1400 → 2200 Hz et traverse la
ligne verte par le haut, en restant franchement positive. (Descendre la
porteuse au lieu de la monter ferait passer f_i sous zéro, où le signal
analytique n'a plus de sens et où les DEUX méthodes déraillent — un
autre problème, qu'on ne veut pas mélanger à celui-ci.)

Faire glisser f_c de 1800 à 1400 et regarder la courbe orange revenir se
coller sur la jaune dès qu'elle repasse tout entière sous la ligne.

La morale n'est pas « Teager est moins bon ». C'est qu'un estimateur a
un DOMAINE, que ce domaine se démontre en deux lignes à partir de sa
formule, et qu'on ne s'en aperçoit jamais en lisant seulement le
résultat.

Hilbert a le sien, et il est moins visible donc plus traître : la TFD
traite l'enregistrement comme PÉRIODIQUE. Une porteuse qui ne boucle pas
exactement sur les N échantillons crée une discontinuité de raccord dont
la fuite est GLOBALE — pas confinée aux bords. Mesuré par le harnais :
exact à 1e-10 quand la porteuse tombe sur un bin de la TFD, 8.5 Hz
d'erreur quand elle tombe à 153.6 bins. Rien dans la courbe ne le dit ;
seul le calcul le dit.`,
  },
];
// notes: Teacher Mode only. Never projected by default, never in the URL.
