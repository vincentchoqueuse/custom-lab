// Lecture script — auto-discovered by the registry.
// Each scene IS a classic FIR, typed as coefficients: the URL carries them
// (?b=0.25,0.25,0.25,0.25), so any variation a student invents is a link.
export default [
  {
    id: 'through',
    title: 'Scène 1 · Le signal entre, le signal sort',
    view: 'response',
    params: { b: [0.25, 0.25, 0.25, 0.25], source: 'square', f0: 125 },
    visible: ['source', 'f0'],
    notes: `Commencer par ce que fait le filtre, avant de dire comment il le fait :
un carré entre (orange), quelque chose de plus rond sort (bleu). Quatre
coefficients égaux à 1/4, rien d'autre.
Question à poser AVANT de changer d'onglet : « qu'est-ce qui a disparu ? »
Les angles — c'est-à-dire les harmoniques élevés. Les trois onglets suivants
répondent chacun à leur façon : les coefficients, puis le spectre.
Changer de source ou de f₀ : la sortie suit, le filtre ne change pas.`,
  },
  {
    id: 'moving-average',
    title: 'Scène 2 · La moyenne glissante',
    view: 'gain',
    params: { b: [0.25, 0.25, 0.25, 0.25], source: 'square', f0: 125 },
    visible: ['b'],
    notes: `Quatre coefficients égaux à 1/4 : le filtre le plus naïf du monde —
et il a des ZÉROS PARFAITS à k·Fs/L = 2, 4, 6 kHz (le harnais le vérifie à
1e-15). Taper 0.125 huit fois : les zéros se resserrent, la coupure descend.
Question : « pourquoi 1/L et pas 1 ? » — regarder H(0) = Σb dans la statline,
c'est le gain continu, il doit valoir 1.`,
  },
  {
    id: 'delay',
    title: 'Scène 3 · Le retard pur',
    view: 'response',
    params: { b: [0, 0, 0, 1], source: 'square', f0: 125 },
    visible: ['b'],
    notes: `b = 0,0,0,1 : le filtre ne fait RIEN… sauf attendre. La sortie est
l'entrée décalée de 3 échantillons, bit pour bit (vérifié). Onglet fréquentiel :
|H| = 1 partout — un passe-tout. Moralité : le module ne dit pas tout, la phase
existe. Rajouter des zéros devant pour allonger l'attente.`,
  },
  {
    id: 'difference',
    title: 'Scène 4 · Le différentiateur',
    view: 'gain',
    params: { b: [1, -1], source: 'saw', f0: 125 },
    visible: ['b'],
    notes: `b = 1,−1 : la différence de deux échantillons. Σb = 0 → le continu
est ANNULÉ, et |H(f)| = 2·|sin(πf/Fs)| monte avec la fréquence : un passe-haut
qui amplifie le bruit (+6 dB par octave). Geler (F), essayer 1,0,−1 (dérivée
centrée) : même annulation du continu, mais un zéro apparaît aussi à Fs/2.`,
  },
  {
    id: 'design',
    title: 'Scène 5 · Fabriquer un passe-bande à la main',
    view: 'gain',
    params: { b: [0.5, 0, -0.5], source: 'square', f0: 125 },
    visible: ['b', 'f0'],
    notes: `0.5,0,−0.5 : zéros au continu ET à Fs/2, une bosse au milieu — un
passe-bande à trois coefficients. Faire proposer des jeux par la salle et les
tester en direct (le lien URL porte les coefficients : chaque essai est
partageable). Puis comparer avec l'expérience « RIF par fenêtrage » : la
méthode systématique fait en une formule ce qu'on tâtonne ici à la main.`,
  },
];
