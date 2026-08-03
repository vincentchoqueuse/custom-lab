// Lecture script. Auto-discovered by the registry.
export default [
  {
    id: 'harmoniques',
    title: 'Scène 1 · Un signal carré, harmonique par harmonique',
    params: { wave: 'square', N: 1, A: 1 },
    visible: ['N'],
    notes: `Partir de N = 1 : une simple sinusoïde de même fréquence.
Monter N cran par cran : 3, 5, 7 — chaque harmonique impaire creuse les
flancs. Question : « combien d'harmoniques pour un carré parfait ? »
Réponse : une infinité — et encore (voir scène Gibbs). Passer à la vue
Spectre : uniquement les rangs impairs, décroissance en 1/n.`,
  },
  {
    id: 'gibbs',
    title: 'Scène 2 · Le phénomène de Gibbs',
    params: { wave: 'square', N: 10, A: 1 },
    visible: ['N'],
    lock: true,
    notes: `Les axes sont figés d'entrée : le cadre ne bougera pas, seule la
courbe bouge. Geler (F) à N = 10, puis pousser N à 60 : les oscillations se
resserrent contre la discontinuité mais le DÉPASSEMENT ne diminue pas —
la statline reste vers 9 % (8,95 % en théorie), quel que soit N.
Morale : la convergence est en moyenne quadratique, pas uniforme.
C'est LA raison des oscillations près des fronts dans tout système
à bande limitée (filtres raides, troncature spectrale).`,
  },
  {
    id: 'continuite',
    title: 'Scène 3 · La continuité fait la vitesse',
    params: { wave: 'triangle', N: 3, A: 1 },
    visible: ['wave', 'N'],
    notes: `Triangle, N = 3 : déjà quasi parfait — coefficients en 1/n²,
car le signal est CONTINU. Basculer sur « carré » à N = 3 : médiocre.
Vue Erreur vs N (log-log) : pente −3/2 pour le triangle, −1/2 pour le
carré et la dent de scie. Règle à retenir : plus le signal est régulier,
plus son spectre décroît vite — la discontinuité se paie en harmoniques.`,
  },
  {
    id: 'pulse',
    title: 'Scène 4 · Le train d\'impulsions et son enveloppe en sinc',
    params: { wave: 'pulse', N: 40, A: 1, alpha: 0.25 },
    view: 'spectrum',
    visible: ['alpha'],
    lock: true,
    notes: `Le signal qui montre D'OÙ viennent les coefficients : les raies
ÉCHANTILLONNENT une enveloppe (courbe orange), et cette enveloppe est un
sinus cardinal, 2Aα·sinc(nα).
Repérer les rangs manquants : α = 0.25 → zéros en n = 4, 8, 12… soit k/α,
valeur affichée dans le tiroir. Diminuer α : les zéros s'écartent, il faut
de plus en plus d'harmoniques — une impulsion brève coûte de la bande.
Question : « à quel α le spectre est-il le plus étalé ? »`,
  },
  {
    id: 'duty-half',
    title: 'Scène 5 · α = 1/2 : le carré réapparaît',
    params: { wave: 'pulse', N: 40, A: 1, alpha: 0.5 },
    view: 'spectrum',
    visible: ['alpha'],
    notes: `Amener α à 0.50 exactement : tous les rangs PAIRS tombent à zéro et
il ne reste que les impairs en 1/n — le spectre du carré, à un facteur deux
près (l'impulsion oscille de A, le carré de 2A) et à la valeur moyenne près,
la raie n = 0 qui vaut Aα.
Le carré n'est pas un signal à part : c'est le train d'impulsions au rapport
cyclique un demi. Repartir de 0.5 vers 0.1 pour voir les rangs pairs
ressusciter un à un.`,
  },
];
// notes: Teacher Mode only. Never projected by default, never in the URL.
