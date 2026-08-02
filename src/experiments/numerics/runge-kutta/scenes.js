// Lecture script. Auto-discovered by the registry.
export default [
  {
    id: 'euler-gonfle',
    title: 'Euler invente de l\'énergie',
    params: { system: 'pendulum', h: 0.1, theta0: 2.5 },
    visible: ['h'],
    notes: `Pendule à grande amplitude, h = 0.1 s : Euler (orange) INVENTE de
l'énergie à chaque pas — jusqu'à faire PASSER LE PENDULE PAR-DESSUS
son sommet : θ dévale, le mouvement devient une rotation continue.
Le vrai pendule oscille (bleu) ; RK4 (violet pointillé) le suit
exactement AU MÊME PAS. Vue Énergie : la droite orange en axe log =
croissance exponentielle. Baisser h : Euler se calme mais dérive
toujours — c'est structurel : chaque pas sort par la tangente, vers
l'extérieur d'une orbite convexe. La simulation a changé la NATURE
du mouvement, pas juste sa précision.`,
  },
  {
    id: 'ordre',
    title: 'La pente est l\'ordre',
    params: { system: 'linear', h: 0.1 },
    view: 'order',
    visible: ['system'],
    notes: `Log-log : diviser h par 10 gagne un facteur 10 pour Euler (pente 1),
100 pour RK2 (pente 2), 10 000 pour RK4 (pente 4). Le vrai comparatif
est À COÛT ÉGAL : RK4 paie 4 évaluations par pas (tiroir) — mais à
h = 0.16 il bat déjà Euler à h = 0.005, pour 8 fois moins de calcul.
La morale tient en une phrase : mieux vaut un pas intelligent que
mille pas naïfs. C'est RK4/5 qui tourne dans scipy et LTspice.`,
  },
  {
    id: 'second-ordre',
    title: 'Simuler le second ordre',
    params: { system: 'linear', h: 0.3 },
    visible: ['h'],
    notes: `Le système de l'expérience « Réponse d'un second ordre » (m = 0.2,
ω₀ = 2), maintenant SIMULÉ au lieu d'être résolu. À h = 0.3 s, Euler
déforme la pseudo-période et l'amortissement ; pousser h vers 0.4 :
il devient instable alors que le système réel est stable — la
simulation peut mentir sur la STABILITÉ elle-même. RK4 reste fidèle.
Boucle bouclée : quand la forme exacte n'existe pas (pendule, non-
linéaire), l'intégrateur est tout ce qu'on a — d'où l'ordre.`,
  },
];
// notes: Teacher Mode only. Never projected by default, never in the URL.
