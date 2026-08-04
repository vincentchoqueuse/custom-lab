// XOR — the counter-example that halted the field for fifteen years.
//
// Four points, two classes. (0,0) and (1,1) are 0; (0,1) and (1,0) are 1. No
// straight line separates the two classes: it is provable in two lines, and
// Minsky and Papert wrote it in 1969 — after which perceptron funding vanished
// until the 1980s.
//
// What the experiment shows, in order:
//
//   1. ONE linear neuron fails, and it fails in a PRECISE way: its optimum is
//      the CONSTANT solution y = 1/2, which leaves an error of 1/8. This is not
//      "it learns badly", it is "the optimum itself is bad" — and the optimum
//      is computed, not observed.
//   2. TWO hidden neurons suffice, and the solution can even be written by
//      hand: h₁ = OR, h₂ = AND, output = h₁ − h₂. The harness verifies that this
//      construction gives the exact truth table.
//   3. Gradient descent finds it on its own, and the EPOCH is a parameter: one
//      sweeps the training on a slider, watches the boundary fold, and the scene
//      stays reproducible through its URL.
//
// The boundary is drawn by marching squares on the network output, so it is the
// REAL boundary and not a guessed straight line.
//
// PURE, stateless, seeded — runs in a worker; deterministic at fixed seed.
import { mulberry32, gaussFrom } from '../../../core/rng.js';
import { linspace } from '../../../core/dsp.js';
import { ACTIVATIONS, trainGD, contourLines } from '../_lib/nn.js';

const X = [
  [0, 0],
  [0, 1],
  [1, 0],
  [1, 1],
];
const EPOCHS = 4000;
const KEEP = 10; // a snapshot of the weights every 10 epochs
const GRID = 81; // grid for the boundary
const RGRID = 45; // grid for the decision REGIONS (coloured points)
const LO = -0.35;
const HI = 1.35;

/** The four targets, for the requested truth table. */
function targets(problem) {
  if (problem === 'xor') return [0, 1, 1, 0];
  if (problem === 'or') return [0, 1, 1, 1];
  return [0, 0, 0, 1]; // and
}

/**
 * @param {{problem: string, hidden: number, act: string, lr: number,
 *          epoch: number, seed: number}} params
 * @returns {{observables: Object}}
 */
export function compute({ problem, hidden, act, lr, epoch, seed }) {
  const T = targets(problem);
  const gauss = gaussFrom(mulberry32(seed));
  const H = Math.max(1, Math.round(hidden));

  // Gaussian initialization with standard deviation 1/√2: large enough to leave
  // the symmetric plateau, small enough not to saturate tanh right away.
  const init = {
    W1: Float64Array.from({ length: H * 2 }, () => gauss() / Math.SQRT2),
    b1: Float64Array.from({ length: H }, () => gauss() / Math.SQRT2),
    w2: Float64Array.from({ length: H }, () => gauss() / Math.SQRT2),
    b2: gauss() / Math.SQRT2,
  };

  const run = trainGD({ X, T, hidden: H, act, epochs: EPOCHS, lr, init, keepEvery: KEEP });

  /* ---------- the state at the requested epoch ---------------------------- */
  const ep = Math.min(Math.max(Math.round(epoch), 0), EPOCHS);
  const slot = Math.min(Math.floor(ep / KEEP), Math.floor(EPOCHS / KEEP));
  const off = slot * run.pSize;
  const W1 = run.path.subarray(off, off + H * 2);
  const b1 = run.path.subarray(off + H * 2, off + H * 2 + H);
  const w2 = run.path.subarray(off + H * 2 + H, off + H * 2 + 2 * H);
  const b2 = run.path[off + run.pSize - 1];

  const { f } = ACTIVATIONS[act];
  const net = (x0, x1) => {
    let y = b2;
    for (let i = 0; i < H; i++) y += w2[i] * f(W1[i * 2] * x0 + W1[i * 2 + 1] * x1 + b1[i]);
    return y;
  };

  /* ---------- the boundary, by marching squares --------------------------- */
  const field = new Float64Array(GRID * GRID);
  for (let j = 0; j < GRID; j++)
    for (let i = 0; i < GRID; i++) {
      const x0 = LO + ((HI - LO) * i) / (GRID - 1);
      const x1 = LO + ((HI - LO) * j) / (GRID - 1);
      field[j * GRID + i] = net(x0, x1);
    }
  const boundary = contourLines(field, GRID, GRID, LO, HI, LO, HI, 0.5);

  // THE DECISION REGIONS, that is, the classification itself: sign(y − ½) on a
  // grid, one coloured point per class. This is the figure everyone knows, and
  // it says what a boundary alone does not — which side is which. The boundary
  // is still drawn on top, since it is exact up to the interpolation.
  const r0x = [];
  const r0y = [];
  const r1x = [];
  const r1y = [];
  for (let j = 0; j < RGRID; j++)
    for (let i = 0; i < RGRID; i++) {
      const x0 = LO + ((HI - LO) * i) / (RGRID - 1);
      const x1 = LO + ((HI - LO) * j) / (RGRID - 1);
      if (Math.sign(net(x0, x1) - 0.5) > 0) {
        r1x.push(x0);
        r1y.push(x1);
      } else {
        r0x.push(x0);
        r0y.push(x1);
      }
    }

  // The hidden neurons' lines: w·x + b = 0. That is what EACH neuron cuts, and
  // seeing the two lines makes the solution obvious. Each line is CLIPPED to the
  // box [LO, HI]²: without that a nearly horizontal line ran out to ±30 and
  // stretched the equal-aspect frame so far that the four points fitted on a
  // postage stamp.
  const hx = [];
  const hy = [];
  for (let i = 0; i < H; i++) {
    const [a, b] = [W1[i * 2], W1[i * 2 + 1]];
    const c = b1[i];
    const pts = [];
    const inBox = (v) => v >= LO - 1e-9 && v <= HI + 1e-9;
    if (Math.abs(b) > 1e-12) {
      for (const x of [LO, HI]) {
        const y = -(a * x + c) / b;
        if (inBox(y)) pts.push([x, y]);
      }
    }
    if (Math.abs(a) > 1e-12) {
      for (const y of [LO, HI]) {
        const x = -(b * y + c) / a;
        if (inBox(x)) pts.push([x, y]);
      }
    }
    if (pts.length >= 2) {
      hx.push(pts[0][0], pts[1][0], NaN);
      hy.push(pts[0][1], pts[1][1], NaN);
    }
  }

  /* ---------- the points, split by class ---------------------------------- */
  const cls = (v) => ({
    x: Float64Array.from(X.filter((_, i) => T[i] === v), (p) => p[0]),
    y: Float64Array.from(X.filter((_, i) => T[i] === v), (p) => p[1]),
  });

  /* ---------- the learning curve ------------------------------------------ */
  const eps = new Float64Array(EPOCHS + 1);
  for (let i = 0; i <= EPOCHS; i++) eps[i] = i;

  /* ---------- what the room has to read ----------------------------------- */
  // The decision IS the sign: class 1 if y > ½, 0 otherwise. Written that way
  // everywhere — statline, regions, error counter — so there is only one rule
  // to remember.
  const decide = (y) => (Math.sign(y - 0.5) > 0 ? 1 : 0);
  const outs = X.map((p) => net(p[0], p[1]));
  const wrong = outs.filter((y, i) => decide(y) !== T[i]).length;
  const table = X.map((p, i) => `${p[0]}${p[1]}→${outs[i].toFixed(2)}`).join(' ');

  return {
    observables: {
      learning: { x: eps, y: run.loss },
      epochLine: ep,
      // The floor of the linear model, drawn as a guide. It is 1/8 and not
      // 1/16: the displayed error is Σe²/(2n), so the constant solution
      // y = 1/2 — the linear optimum, proved in the harness — leaves
      // 4 × 0.25 / 8 = 0.125 there.
      lossFloor: 1 / 8,

      boundary,
      region0: { x: Float64Array.from(r0x), y: Float64Array.from(r0y) },
      region1: { x: Float64Array.from(r1x), y: Float64Array.from(r1y) },
      hiddenLines: { x: Float64Array.from(hx), y: Float64Array.from(hy) },
      class0: cls(0),
      class1: cls(1),

      lossNow: {
        value: run.loss[ep],
        meta: { label: 'error at epoch n', precision: 5 },
      },
      lossEnd: {
        value: run.loss[EPOCHS],
        meta: { label: 'final error', precision: 5 },
      },
      errors: { value: wrong, meta: { label: 'misclassified points', precision: 0 } },
      truth: { value: table, meta: { label: 'output' } },
      nWeights: {
        value: H * 2 + H + H + 1,
        meta: { label: 'network weights', precision: 0 },
      },
    },
  };
}

export { X, targets, EPOCHS, LO, HI };
