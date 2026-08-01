// Lecture script. Auto-discovered by the registry.
export default [
  {
    id: 'des',
    title: 'La moyenne de n dés',
    params: { law: 'dice', n: 1, M: 5000 },
    visible: ['law', 'n'],
    notes: `n=1 : un peigne plat à 6 dents — rien de gaussien.
Monter n en direct : 2 (triangle), 5 (cloche), 30 (gaussienne parfaite).
La courbe orange N(μ, σ²/n) a TOUJOURS la bonne moyenne et la bonne variance :
seule la FORME de l'histogramme la rejoint quand n croît. C'est ça, le TCL.`,
  },
  {
    id: 'asymetrique',
    title: 'Même une loi très asymétrique',
    params: { law: 'exponential', n: 1, M: 5000 },
    visible: ['law', 'n'],
    notes: `n=1 : l'exponentielle, brutalement asymétrique — la gaussienne est à côté.
n=5 : la bosse se recentre. n=30 : symétrique. n=100 : gaussienne.
Faire remarquer σ/√n dans le tiroir : la cloche se resserre en même temps.`,
  },
  {
    id: 'pile-ou-face',
    title: 'Pile ou face biaisé (p=0.1)',
    params: { law: 'bernoulli', p: 0.1, n: 100, M: 5000 },
    visible: ['law', 'n', 'p'],
    notes: `Des 0 et des 1, presque toujours 0 — et pourtant la moyenne de 100 lancers
est déjà gaussienne (Moivre-Laplace). Descendre n à 10 : la structure discrète
réapparaît (multiples de 1/10). La règle np(1−p) ≳ 10 se voit à l'œil.`,
  },
];
// notes: Teacher Mode only. Never projected by default, never in the URL.
