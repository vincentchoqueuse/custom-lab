// Lecture script. Auto-discovered by the registry.
// PLAN — context 1 · problem 2 · method 3
// (the three beats, and the shapes that escape them: lecture-scenes skill)
export default [
  {
    id: 'candidates',
    title: 'Three candidates for θ',
    view: 'realization',
    params: { theta: 5, N: 10, M: 3000 },
    visible: ['N', 'theta'],
    notes: `The yellow line should be ignored for a moment: θ is not known, and
the question is what estimate these ten points support. A room reliably produces
the same three answers — the maximum, because nothing smaller can be right;
twice the sample mean, because the mean of U[0, θ] is θ/2; and some correction
applied to the maximum.

Pressing R repeatedly shows what separates them. The maximum, in orange, is
always to the left of θ, since no sample can exceed the bound it came from. The
max+min estimator, in green, lands above θ about half the time.`,
  },
  {
    id: 'bias',
    title: 'The bias of the maximum',
    params: { theta: 5, N: 10, M: 5000 },
    view: 'sampling',
    visible: ['N', 'theta'],
    notes: `The histogram of the maximum lies entirely to the left of θ, with a
bias of exactly −θ/(N+1). Adding the minimum corrects it exactly, because
E[min] = θ/(N+1) makes up the same deficit. The estimator 2x̄ is centered too,
but its purple spread is much wider than either.

Freezing at N = 10 and raising N to 100 tightens all three, and not at the same
rate — the orange and green histograms become spikes while the purple one is
still a distribution.`,
  },
  {
    id: 'rate',
    title: 'The rate: 1/N against 1/√N',
    params: { theta: 5, N: 10, M: 5000 },
    view: 'rmse',
    visible: ['N', 'theta'],
    notes: `On log–log axes the slopes are the convergence rates. The maximum and
max+min fall with slope −1, so their error goes as 1/N; 2x̄ falls with slope
−1/2, the usual 1/√N of the central limit theorem. At N = 100 the maximum is
about seven times more precise, which is the headline of the chapter:
exploiting the regularity of the support beats averaging.

One detail is worth stating because it surprises — the maximum and max+min have
the SAME mean squared error, 2θ²/((N+1)(N+2)). Correcting the bias cost nothing
here, and gained nothing either.`,
  },
];
// notes: Teacher Mode only. Never projected by default, never in the URL.
