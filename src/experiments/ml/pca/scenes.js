// Lecture script — auto-discovered by the registry.
export default [
  {
    id: 'cloud',
    title: 'Scene 1 · Four dimensions, one photograph',
    view: 'scores',
    params: { dataset: 'iris', standardize: false, k: 2, xComp: 1, yComp: 2 },
    visible: ['dataset', 'xComp'],
    notes: `A hundred and fifty irises, four measurements each: sepal length and
width, petal length and width. A cloud in a four-dimensional space that nobody
can draw.

PCA looks for the directions along which that cloud spreads most, and the
figure shows the projection onto the first two. This is not A photograph of the
cloud, it is THE best flat photograph of it in the least-squares sense, which
the reconstruction tab demonstrates rather than asserts.

The three species separate almost perfectly, and nobody gave them to the
algorithm. PCA does not know that species exist: it looked for variance, and
the biological structure was in there.

Switching to the Palmer penguins — 342 individuals, the same four measurements,
CC0 — repeats the exercise on another bestiary. The separation is less clean on
the raw data, and the third scene explains why.

Putting CP3 on the horizontal axis and CP4 on the vertical one collapses the
cloud into a round blur. Those two components carry 2.2 % of the variance
between them and nothing recognizable, which is what "keeping two components"
means concretely.`,
  },
  {
    id: 'scree',
    title: 'Scene 2 · How many to keep',
    view: 'scree',
    params: { dataset: 'iris', standardize: false, k: 2, xComp: 1, yComp: 2 },
    visible: ['k', 'standardize'],
    notes: `The scree plot. CP1 carries 92.46 % of the variance, CP2 5.31 %, and
the last two 2.2 % between them. The orange curve accumulates: at k = 2 the
total is 97.77 %.

That is why two components are kept — not because a plane is convenient to
draw, but because the third would add 1.7 %.

The drop between CP1 and CP2 is the "elbow" everyone looks for in a scree plot,
and here it is unmistakable. It is worth saying that this is not always so: on
data without strong structure the scree falls gently and the choice of k
becomes a judgement again.`,
  },
  {
    id: 'standardize',
    title: 'Scene 3 · The trap of units',
    view: 'scree',
    params: { dataset: 'penguins', standardize: false, k: 2, xComp: 1, yComp: 2 },
    visible: ['standardize', 'dataset'],
    notes: `The Palmer penguins: 342 individuals and four measurements — three
lengths in millimetres and one MASS IN GRAMS.

The scree plot is worth showing before saying anything: 99.99 % on the first
component. A number like that looks like a triumph, and the room should be
allowed to react to it.

It is a triumph for the algorithm and a disaster for the analysis. The statline
says what CP1 measures: mass, and nothing else. The variance of the mass is
643 000 g² against 30 mm² for the bill length, and since the covariance is what
is being diagonalized, the variable carrying the largest numbers takes
everything. That is a choice of unit, not a biological result.

Ticking "standardize" diagonalizes the correlation instead, giving the four
variables equal weight. CP1 falls to 68.84 % and becomes FLIPPER LENGTH — a
quantity that genuinely separates the species, as the cloud view then shows.

The same phenomenon exists on the irises, more discreetly: 92.46 % unstandardized
with CP1 almost entirely petal length, 72.96 % standardized. The harness adds
the direct proof: taking the sepal width ALONE from centimetres to millimetres
changes the answer on covariance — 92.46 % to 84.64 %, with CP1 becoming sepal
width — and does not change it on correlation, to 1e-12.

The rule worth keeping: variables of the same nature and unit, covariance;
heterogeneous variables, correlation. And when in doubt, show both, which this
experiment allows in one click.`,
  },
  {
    id: 'reconstruction',
    title: 'Scene 4 · The theorem, watched',
    view: 'reconstruction',
    params: { dataset: 'iris', standardize: false, k: 2, xComp: 1, yComp: 2 },
    visible: ['k', 'standardize'],
    notes: `Two curves, and they coincide.

The blue one is measured: the 150 flowers are reconstructed from the first k
components and what was lost is computed. The orange one is the sum of the
eigenvalues that were discarded.

This is neither a bound, nor an approximation, nor a numerical coincidence: it
is the Eckart–Young theorem of 1936, the same year as Fisher's paper. It says
that projecting onto the first k components is THE best rank-k approximation,
and that the error is exactly what remains. The harness pins it to 1e-12, with
and without standardization.

That is what distinguishes PCA from a heuristic — its quality can be computed
in advance, without reconstructing anything. Sweeping k from 1 to 4 brings both
curves down together to exactly zero.

The connection to make with the rest of the catalogue: this is the SAME
eigendecomposition of a covariance matrix as in the high-resolution methods.
There the large eigenvalues were signal and the small ones noise; here the
large ones are what is kept and the small ones what is thrown away. One
algebra, two readings — and bridges like this one are what make a course hold
together.`,
  },
];
// notes: Teacher Mode only. Never projected by default, never in the URL.
