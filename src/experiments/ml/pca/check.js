import { compute, P } from './compute.js';
import { IRIS, IRIS_FEATURES, PENGUINS, PENGUIN_FEATURES } from '../_lib/datasets.js';
import { pca, reconstruct, colMeans, colSds } from '../_lib/pca.js';

const N = IRIS.length;
const NP = PENGUINS.length;

/** The requested dataset, flattened to n × 4. */
const flat = (rows = IRIS) => {
  const X = new Float64Array(rows.length * P);
  for (let i = 0; i < rows.length; i++)
    for (let j = 0; j < P; j++) X[i * P + j] = rows[i][j];
  return X;
};

export const checks = [
  {
    name: 'the dataset IS Fisher\u2019s — published means and standard deviations',
    category: 'numeric',
    run() {
      // A copied dataset is data like any other: it can be verified. These
      // numbers are the ones fifty years of literature report, and if the copy
      // drifted by one row they would move.
      const X = flat();
      const m = colMeans(X, N, P);
      const s = colSds(X, N, P, m);
      const mTh = [5.843, 3.057, 3.758, 1.199];
      const sTh = [0.828, 0.436, 1.765, 0.762];
      const bad = [];
      if (IRIS.length !== 150) bad.push(`${IRIS.length} rows`);
      const cls = [0, 0, 0];
      for (const r of IRIS) cls[r[4]]++;
      if (cls.join(',') !== '50,50,50') bad.push(`classes ${cls.join('/')}`);
      for (let j = 0; j < P; j++) {
        if (Math.abs(m[j] - mTh[j]) > 5e-4) bad.push(`mean ${j}: ${m[j].toFixed(4)}`);
        if (Math.abs(s[j] - sTh[j]) > 5e-4) bad.push(`sd ${j}: ${s[j].toFixed(4)}`);
      }
      return {
        ok: bad.length === 0,
        detail: bad.length ? bad.join(' · ') : '150 flowers, 50/50/50, published means and sds to 5e-4',
      };
    },
  },
  {
    name: 'the components are orthonormal',
    category: 'numeric',
    run() {
      // The property that makes the projection legitimate: the components form
      // an orthonormal basis, so projecting distorts no distance inside the
      // subspace that is kept.
      const bad = [];
      for (const standardize of [false, true]) {
        const { vectors } = pca(flat(), N, P, { standardize });
        for (let a = 0; a < P; a++)
          for (let b = 0; b < P; b++) {
            let d = 0;
            for (let j = 0; j < P; j++) d += vectors[j * P + a] * vectors[j * P + b];
            const target = a === b ? 1 : 0;
            if (Math.abs(d - target) > 1e-12) bad.push(`⟨v${a},v${b}⟩ = ${d}`);
          }
      }
      return { ok: bad.length === 0, detail: bad.length ? bad.join(' · ') : 'VᵀV = I to 1e-12' };
    },
  },
  {
    name: 'the sum of the eigenvalues IS the total variance',
    category: 'numeric',
    run() {
      // Nothing is lost: diagonalizing redistributes the variance among the
      // axes, it neither creates nor destroys any. That is the trace, exactly.
      const bad = [];
      for (const standardize of [false, true]) {
        const m = pca(flat(), N, P, { standardize });
        let trace = 0;
        for (let j = 0; j < P; j++) trace += m.cov[j * P + j];
        if (Math.abs(m.total - trace) > 1e-12) bad.push(`${m.total} vs ${trace}`);
      }
      return { ok: bad.length === 0, detail: bad.length ? bad.join(' · ') : 'Σλ = tr(C) to 1e-12' };
    },
  },
  {
    name: 'Eckart–Young: the error IS the sum of the discarded eigenvalues',
    category: 'numeric',
    run() {
      // The theorem that makes PCA the BEST linear compression, and the
      // reconstruction-error view shows it as two superposed curves. It is
      // neither a bound nor an approximation.
      const bad = [];
      for (const standardize of [false, true]) {
        const o = compute({ dataset: 'iris', standardize, k: 2, xComp: 1, yComp: 2 }).observables;
        for (let c = 0; c <= P; c++) {
          const gap = Math.abs(o.errMeas.y[c] - o.errTheo.y[c]);
          if (gap > 1e-12) bad.push(`k=${c}: ${gap.toExponential(1)}`);
        }
      }
      return {
        ok: bad.length === 0,
        detail: bad.length ? bad.join(' · ') : 'measured = theory to 1e-12, for k = 0…4, with and without standardization',
      };
    },
  },
  {
    name: 'keeping all four components reconstructs the data EXACTLY',
    category: 'numeric',
    run() {
      const X = flat();
      const m = pca(X, N, P, { standardize: false });
      const R = reconstruct(m, N, P, P);
      let worst = 0;
      for (let i = 0; i < N * P; i++) worst = Math.max(worst, Math.abs(R[i] - X[i]));
      return { ok: worst < 1e-12, detail: `max gap ${worst.toExponential(2)} cm` };
    },
  },
  {
    name: 'the explained variances are the published ones',
    category: 'numeric',
    run() {
      // Covariance: 92.46 / 5.31 / 1.71 / 0.52. Correlation: 72.96 / 22.85 /
      // 3.67 / 0.52. These eight numbers are in every textbook, and that is
      // what lets a reader check the experiment without trusting us.
      const bad = [];
      const want = {
        false: [92.46, 5.31, 1.71, 0.52],
        true: [72.96, 22.85, 3.67, 0.52],
      };
      const got = {};
      for (const standardize of [false, true]) {
        const o = compute({ dataset: 'iris', standardize, k: 2, xComp: 1, yComp: 2 }).observables;
        got[standardize] = [...o.scree.y].map((v) => +v.toFixed(2));
        want[standardize].forEach((w, i) => {
          if (Math.abs(o.scree.y[i] - w) > 0.01) bad.push(`${standardize} PC${i + 1}: ${o.scree.y[i].toFixed(2)} vs ${w}`);
        });
      }
      return {
        ok: bad.length === 0,
        detail: bad.length ? bad.join(' · ') : `covariance ${got.false.join('/')} · correlation ${got.true.join('/')}`,
      };
    },
  },
  {
    name: 'changing units changes the covariance PCA, and NOT the correlation one',
    category: 'numeric',
    run() {
      // THE criterion for choosing, made objective. One single variable moves
      // from centimetres to millimetres: on covariance the explained variance
      // swings (that variable crushes the others), on correlation it does not
      // budge by a thousandth. A method whose answer depends on units must be
      // used knowing it.
      const X = flat();
      const Y = Float64Array.from(X);
      for (let i = 0; i < N; i++) Y[i * P + 1] *= 10; // sepal width in mm
      const dom = (m) => {
        let b = 0;
        for (let j = 1; j < P; j++)
          if (Math.abs(m.vectors[j * P]) > Math.abs(m.vectors[b * P])) b = j;
        return b;
      };
      const covA = pca(X, N, P, { standardize: false });
      const covB = pca(Y, N, P, { standardize: false });
      const corA = pca(X, N, P, { standardize: true });
      const corB = pca(Y, N, P, { standardize: true });
      // The most telling fact is not the shift in percentage (92.46 → 84.64)
      // but the CHANGE OF DOMINANT VARIABLE: the same flower, the same
      // measurement, a millimetre instead of a centimetre, and the first
      // component is no longer the same quantity.
      return {
        ok:
          dom(covA) !== dom(covB) &&
          Math.abs(covA.ratio[0] - covB.ratio[0]) > 0.05 &&
          dom(corA) === dom(corB) &&
          Math.abs(corA.ratio[0] - corB.ratio[0]) < 1e-12,
        detail:
          `covariance: ${(100 * covA.ratio[0]).toFixed(2)} % "${IRIS_FEATURES[dom(covA)]}" → ` +
          `${(100 * covB.ratio[0]).toFixed(2)} % "${IRIS_FEATURES[dom(covB)]}" · ` +
          `correlation: unchanged to 1e-12, still "${IRIS_FEATURES[dom(corB)]}"`,
      };
    },
  },
  {
    name: 'without standardization, PC1 is almost petal length alone',
    category: 'numeric',
    run() {
      // The concrete fact behind the previous check: petal length carries a
      // variance of 3.1 cm² against 0.19 for sepal width, so it takes the first
      // component outright. After standardization the four variables weigh
      // comparably.
      const raw = pca(flat(), N, P, { standardize: false });
      const std = pca(flat(), N, P, { standardize: true });
      const l = (m, j) => Math.abs(m.vectors[j * P + 0]);
      return {
        ok: l(raw, 2) > 0.8 && l(std, 2) < 0.6,
        detail:
          `loading of "${IRIS_FEATURES[2]}" on PC1: ` +
          `${l(raw, 2).toFixed(3)} raw, ${l(std, 2).toFixed(3)} standardized`,
      };
    },
  },
  {
    name: 'the Palmer penguins are the published ones too',
    category: 'numeric',
    run() {
      // Second dataset, same requirement: 342 complete cases out of 344 (two
      // individuals have no measurement at all), 151 / 68 / 123 per species,
      // and the four published means. CC0, hence reusable unconditionally.
      const X = flat(PENGUINS);
      const m = colMeans(X, NP, P);
      const s = colSds(X, NP, P, m);
      const mTh = [43.92, 17.15, 200.92, 4201.75];
      const sTh = [5.46, 1.97, 14.06, 801.95];
      const bad = [];
      if (NP !== 342) bad.push(`${NP} rows`);
      const cls = [0, 0, 0];
      for (const r of PENGUINS) cls[r[4]]++;
      if (cls.join(',') !== '151,68,123') bad.push(`classes ${cls.join('/')}`);
      for (let j = 0; j < P; j++) {
        if (Math.abs(m[j] - mTh[j]) > 0.01) bad.push(`mean ${j}: ${m[j].toFixed(2)}`);
        if (Math.abs(s[j] - sTh[j]) > 0.01) bad.push(`sd ${j}: ${s[j].toFixed(2)}`);
      }
      return {
        ok: bad.length === 0,
        detail: bad.length
          ? bad.join(' · ')
          : '342 penguins, 151/68/123, published means 43.92/17.15/200.92/4201.75',
      };
    },
  },
  {
    name: 'on the penguins, the raw PCA is ONLY body mass — 99.99 %',
    category: 'numeric',
    run() {
      // The unit trap taken to caricature, and that is what makes this dataset
      // the best support for teaching it: the mass is in grams, so its variance
      // is 643 000 against 30 for bill length. The first component takes
      // everything, and it measures one single thing. Standardized, the same
      // dataset drops to 68.84 % and PC1 becomes flipper length — a
      // biologically more meaningful quantity.
      const raw = compute({ dataset: 'penguins', standardize: false, k: 2, xComp: 1, yComp: 2 })
        .observables;
      const std = compute({ dataset: 'penguins', standardize: true, k: 2, xComp: 1, yComp: 2 })
        .observables;
      return {
        ok:
          raw.pc1.value > 99.9 &&
          raw.dominant.value === PENGUIN_FEATURES[3] &&
          std.pc1.value < 75 &&
          std.dominant.value === PENGUIN_FEATURES[2],
        detail:
          `raw ${raw.pc1.value.toFixed(2)} % "${raw.dominant.value}" · ` +
          `standardized ${std.pc1.value.toFixed(2)} % "${std.dominant.value}"`,
      };
    },
  },
  {
    name: 'Eckart–Young holds on the penguins too',
    category: 'numeric',
    run() {
      // The theorem depends neither on the dataset nor on the units: it is
      // replayed here on data whose columns run from 15 to 6300, where a scale
      // error would show immediately.
      //
      // RELATIVE tolerance, and the dataset itself imposes it: the variance of
      // the mass is 643 000 g², so an absolute gap of 1e-10 is a relative gap of
      // 1e-15 there — machine precision. An absolute tolerance would have meant
      // nothing on squared grams, and that is the kind of detail that makes a
      // sound check read as a failure.
      const bad = [];
      let worst = 0;
      for (const standardize of [false, true]) {
        const o = compute({ dataset: 'penguins', standardize, k: 2, xComp: 1, yComp: 2 })
          .observables;
        for (let c = 0; c <= P; c++) {
          const scale = Math.max(Math.abs(o.errTheo.y[c]), 1e-12);
          const rel = Math.abs(o.errMeas.y[c] - o.errTheo.y[c]) / scale;
          worst = Math.max(worst, rel);
          if (rel > 1e-12) bad.push(`k=${c}: ${rel.toExponential(1)} relative`);
        }
      }
      return {
        ok: bad.length === 0,
        detail: bad.length
          ? bad.join(' · ')
          : `measured = theory to ${worst.toExponential(1)} relative, over the 342 penguins`,
      };
    },
  },
];
