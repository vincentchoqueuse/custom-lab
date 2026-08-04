// Principal component analysis, on two classic public datasets: Fisher's iris
// (1936) and the Palmer penguins (2020).
//
// Four measurements per individual, hence a cloud in a four-dimensional space
// nobody can draw. PCA looks for the directions along which that cloud spreads
// the most, and returns them in decreasing order: projecting onto the first two
// gives the best possible flat photograph of the cloud — in the precise
// least-squares sense, not the figurative one.
//
// Three things the experiment makes visible that a table of numbers does not:
//
//   1. TWO components are enough. 97.8 % of the variance on raw iris, and the
//      three species separate by eye on a flat figure. This is the
//      "visualisation" use, the most common one.
//   2. STANDARDIZING OR NOT changes the answer, a great deal. Without it one
//      diagonalizes the covariance, so the variable carrying the largest
//      numbers dominates. On iris that is visible — PC1 is almost nothing but
//      petal length. On the penguins it is a caricature: body mass is in
//      GRAMS, its variance is 643 000 against 30 for bill length, and PC1
//      carries 99.99 % of the variance while being ONLY the mass. Standardized,
//      the same dataset gives 68.84 % and PC1 becomes flipper length. That is
//      the criterion for choosing, and it is objective: a method whose answer
//      changes when one switches from grams to kilograms must be used knowing
//      it.
//   3. THE RECONSTRUCTION ERROR has an exact value: the sum of the discarded
//      eigenvalues. Not a bound, not an approximation — the Eckart–Young
//      theorem, and the harness verifies it to 1e-12. PCA is therefore the BEST
//      linear compression, demonstrably.
//
// The link with the rest of the catalogue: this is the same eigendecomposition
// of a covariance as in high-resolution spectral analysis. There the large
// eigenvalues were the signal and the small ones the noise; here the large ones
// are what is kept and the small ones what is thrown away. Same algebra, two
// readings.
//
// PURE, stateless, DETERMINISTIC: no draw at all, hence no seed and no dice in
// the action bar.
import {
  IRIS,
  IRIS_FEATURES,
  IRIS_SPECIES,
  PENGUINS,
  PENGUIN_FEATURES,
  PENGUIN_SPECIES,
} from '../_lib/datasets.js';
import { pca, reconstruct, meanSquaredError } from '../_lib/pca.js';

const P = 4; // four measurements in both datasets, which makes them comparable

/** The two datasets, described the same way so the compute has a single path.
 *  The penguins carry a mass in GRAMS: that is what makes the unit trap
 *  overwhelming rather than subtle. */
const DATASETS = {
  iris: { rows: IRIS, features: IRIS_FEATURES, species: IRIS_SPECIES, unit: 'cm²' },
  penguins: {
    rows: PENGUINS,
    features: PENGUIN_FEATURES,
    species: PENGUIN_SPECIES,
    unit: 'mixed units²',
  },
};

/**
 * @param {{dataset: string, standardize: boolean, k: number,
 *          xComp: number, yComp: number}} params
 * @returns {{observables: Object}}
 */
export function compute({ dataset, standardize, k, xComp, yComp }) {
  const D = DATASETS[dataset] ?? DATASETS.iris;
  const rows = D.rows;
  const N = rows.length;
  const X = new Float64Array(N * P);
  const label = new Uint8Array(N);
  for (let i = 0; i < N; i++) {
    for (let j = 0; j < P; j++) X[i * P + j] = rows[i][j];
    label[i] = rows[i][4];
  }

  const model = pca(X, N, P, { standardize });
  const kk = Math.min(Math.max(Math.round(k), 1), P);
  const cx = Math.min(Math.max(Math.round(xComp), 1), P) - 1;
  const cy = Math.min(Math.max(Math.round(yComp), 1), P) - 1;

  /* ---------- the projected cloud, one species per colour ----------------- */
  const cloud = (sp) => {
    const xs = [];
    const ys = [];
    for (let i = 0; i < N; i++)
      if (label[i] === sp) {
        xs.push(model.scores[i * P + cx]);
        ys.push(model.scores[i * P + cy]);
      }
    return { x: Float64Array.from(xs), y: Float64Array.from(ys) };
  };

  /* ---------- the scree plot ----------------------------------------------- */
  const comp = new Float64Array(P);
  const ratioPct = new Float64Array(P);
  const cumPct = new Float64Array(P);
  for (let c = 0; c < P; c++) {
    comp[c] = c + 1;
    ratioPct[c] = 100 * model.ratio[c];
    cumPct[c] = 100 * model.cumulative[c];
  }

  /* ---------- the loadings -------------------------------------------------- */
  // The contribution of each original variable to the two displayed components.
  // This is what makes it possible to SAY what a component measures, instead of
  // leaving it nameless.
  const varIdx = new Float64Array(P);
  const loadX = new Float64Array(P);
  const loadY = new Float64Array(P);
  for (let j = 0; j < P; j++) {
    varIdx[j] = j;
    loadX[j] = model.vectors[j * P + cx];
    loadY[j] = model.vectors[j * P + cy];
  }

  /* ---------- reconstruction: measured against exact theory --------------- */
  const errMeas = new Float64Array(P + 1);
  const errTheo = new Float64Array(P + 1);
  const kAxis = new Float64Array(P + 1);
  for (let c = 0; c <= P; c++) {
    kAxis[c] = c;
    const R = reconstruct(model, N, P, c);
    // on standardized data the error is measured in the scaled space —
    // otherwise one would be comparing centimetres with standard deviations
    let e = 0;
    for (let i = 0; i < N; i++)
      for (let j = 0; j < P; j++) e += ((R[i * P + j] - X[i * P + j]) / model.sds[j]) ** 2;
    errMeas[c] = e / N;
    // Eckart–Young: what remains is the sum of the discarded eigenvalues, up
    // to the factor (n−1)/n since the covariance is unbiased
    let t = 0;
    for (let c2 = c; c2 < P; c2++) t += model.values[c2];
    errTheo[c] = (t * (N - 1)) / N;
  }

  const recon = reconstruct(model, N, P, kk);
  const mseK = meanSquaredError(recon, X, N, P);

  return {
    observables: {
      // three classes in both datasets: the same three clouds, named after the
      // current dataset in the legend, through the manifest
      classA: cloud(0),
      classB: cloud(1),
      classC: cloud(2),

      scree: { x: comp, y: ratioPct },
      screeCum: { x: comp, y: cumPct },

      loadX: { x: varIdx, y: loadX },
      loadY: { x: varIdx, y: loadY },

      errMeas: { x: kAxis, y: errMeas },
      errTheo: { x: kAxis, y: errTheo },
      kLine: kk,

      pc1: {
        value: ratioPct[0],
        meta: { label: 'PC1 variance', unit: '%', precision: 2 },
      },
      pc12: {
        value: cumPct[1],
        meta: { label: 'PC1 + PC2', unit: '%', precision: 2 },
      },
      kept: {
        value: cumPct[kk - 1],
        meta: { label: `variance kept with k = ${kk}`, unit: '%', precision: 2 },
      },
      mse: {
        value: mseK,
        meta: { label: 'reconstruction error', unit: D.unit, precision: 4 },
      },
      dominant: {
        // What the first component really measures, named: the variable with
        // the strongest loading. On raw iris that is petal length, and it
        // changes with standardization.
        value: D.features[argMax(loadX)],
        meta: { label: 'PC1 dominated by' },
      },
      species: { value: D.species.join(', '), meta: { label: 'species' } },
      nRows: { value: N, meta: { label: 'individuals', precision: 0 } },
    },
  };
}

const argMax = (a) => {
  let b = 0;
  for (let i = 1; i < a.length; i++) if (Math.abs(a[i]) > Math.abs(a[b])) b = i;
  return b;
};

export { P, DATASETS };
