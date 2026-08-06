// Lecture script. Auto-discovered by the registry.
// PLAN — problem 1 · method 2-3. NO CONTEXT SCENE: it opens on the bias itself.
// (the three beats, and the shapes that escape them: lecture-scenes skill)
export default [
  {
    id: 'bias',
    title: 'The bias of σ̂² (÷N)',
    params: { N: 5, M: 2000 },
    visible: ['N', 'sigma'],
    notes: `Two thousand experiments, each estimating σ² from five points. The
orange histogram, which divides by N, sits to the left of σ²: its mean is
σ²(N−1)/N, so it underestimates every time on average rather than occasionally.
The blue one, dividing by N−1, is centered on σ². Pressing R never removes the
shift, which is what distinguishes a bias from bad luck.

Why ÷N underestimates is worth asking rather than asserting: x̄ fits the data
better than μ does, so the deviations measured from it are too small. One degree
of freedom has already been spent.`,
  },
  {
    id: 'vanishing',
    title: 'The bias vanishes as 1/N',
    params: { N: 5, M: 5000 },
    view: 'bias',
    visible: ['sigma', 'N'],
    notes: `The empirical bias of σ̂² follows the theoretical curve −σ²/N, and
the bias of s² stays on zero at every sample size. On a logarithmic axis the
argument settles itself: by N = 100 the difference between ÷N and ÷(N−1) is no
longer visible.

Raising σ is a reminder that the bias is −σ²/N and not a fixed quantity — it
quadruples when σ doubles.`,
  },
  {
    id: 'price',
    title: 'What it costs: the spread',
    params: { N: 5, M: 20000 },
    visible: ['N', 'M'],
    notes: `The width of the histograms deserves as much attention as their
position. At N = 5 both estimators fluctuate enormously, which says plainly that
being unbiased is not the same as being accurate.

Raising N tightens both, as σ⁴·2/(N−1), and brings them together. The moral is
worth stating as such: at small N the real problem is not the bias but the
variance, and there is no button that removes it.`,
  },
];
// notes: Teacher Mode only. Never projected by default, never in the URL.
