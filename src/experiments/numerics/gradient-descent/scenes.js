// Lecture script. Auto-discovered by the registry.
export default [
  {
    id: 'zigzag',
    title: 'La vallée et le zigzag',
    params: { fn: 'quad', kappa: 10, alpha: 0.18, beta: 0.9, N: 30 },
    visible: ['alpha', 'kappa'],
    notes: `κ = 10 : les ellipses sont 10 fois plus raides en y qu'en x. Le
gradient (bleu) descend PERPENDICULAIREMENT aux lignes de niveau — il
zigzague dans la vallée au lieu de la remonter. Newton (orange) tord la
direction par H⁻¹ et saute au fond EN UN COUP (c'est exact sur une
quadratique). Monter κ à 100 : le bleu fait du surplace, l'orange s'en
moque. Monter α au-delà de 2/κ (tiroir) : divergence en direct.
Le momentum (vert) lisse le zigzag — l'inertie moyenne les allers-
retours.`,
  },
  {
    id: 'taux',
    title: 'La pente EST le conditionnement',
    params: { fn: 'quad', kappa: 30, alpha: 0.064, beta: 0.9, N: 60 },
    view: 'convergence',
    visible: ['kappa', 'alpha'],
    notes: `Axe log : le gradient est une DROITE — convergence linéaire, raison
((κ−1)/(κ+1))² au pas optimal α = 2/(κ+1) (tiroir : la valeur est
affichée). Newton : quelques points puis le plancher machine — la
convergence quadratique double les décimales à chaque itération.
Question : « pourquoi ne pas toujours prendre Newton ? » — H⁻¹ coûte
O(n³) et n vaut 10⁹ dans un réseau de neurones. D'où le momentum :
presque le taux de Newton, au prix du gradient.`,
  },
  {
    id: 'banane',
    title: 'Rosenbrock, la vallée courbée',
    params: { fn: 'rosenbrock', alpha: 0.0015, beta: 0.9, N: 100 },
    visible: ['fn', 'alpha'],
    notes: `Le paysage réel n'est pas quadratique : la vallée de Rosenbrock est
COURBÉE, et son fond est presque plat. Le gradient (α minuscule, sinon
explosion : la courbure vaut ~1000 au bord) rampe le long de la banane.
Newton suit la courbure et arrive en quelques itérations. Vue
Convergence : le gradient stagne des dizaines d'itérations — c'est le
quotidien de l'optimisation, et la raison d'être de tout le zoo
d'algorithmes (BFGS, Adam…) entre ces deux extrêmes.`,
  },
];
// notes: Teacher Mode only. Never projected by default, never in the URL.
