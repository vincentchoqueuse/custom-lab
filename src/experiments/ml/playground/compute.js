// THE PLAYGROUND — the most famous machine-learning applet on the internet,
// rebuilt on the catalogue's terms: four two-dimensional datasets, one hidden
// layer whose width is a pill, and the decision boundary watched folding as
// the epoch dial walks the training. The xor experiment proved the 1969 point
// on four points; this is the same network meeting DATA — a train/test split,
// a Bayes reference where one exists in closed form, and an overfitting story
// the loss curves tell on their own.
//
// Everything heavy is shared with xor (_lib/nn.js): the same trainGD, the same
// marching-squares boundary. What is new is only the data and the split.
// PURE, stateless, seeded — runs in a worker; deterministic at fixed seed.
import { mulberry32, gaussFrom } from '../../../core/rng.js';
import { ACTIVATIONS, trainGD, forward, contourLines } from '../_lib/nn.js';

const N_TRAIN = 100; // points per class in the training set
const N_TEST = 100; // per class, never shown to the descent
const EPOCHS = 3000;
const KEEP = 25; // weight snapshot every 25 epochs
const GRID = 81;
const RGRID = 45;
const LO = -1.7;
const HI = 1.7;

// The two blob centers — symmetric, so the Bayes risk of the blobs dataset is
// exactly Q(‖c₁ − c₀‖ / 2σ), which the harness uses as its reference.
export const BLOB_C = 1.1;
export const BLOB_D = 0.55;

/** One labelled point of the requested dataset. */
function draw(dataset, label, sigma, rng, gauss) {
  if (dataset === 'blobs') {
    const s = label ? 1 : -1;
    return [s * BLOB_C + sigma * gauss(), s * BLOB_D + sigma * gauss()];
  }
  if (dataset === 'circle') {
    // a core against a ring at radius 1.05 — no line separates them
    if (label === 0) {
      const s0 = 0.22 + 0.3 * sigma;
      return [s0 * gauss(), s0 * gauss()];
    }
    const th = 2 * Math.PI * rng();
    const r = 1.05 + 0.55 * sigma * gauss();
    return [r * Math.cos(th), r * Math.sin(th)];
  }
  if (dataset === 'xor') {
    // four blobs, label = the sign product: the 1969 problem, with spread
    const sx = rng() < 0.5 ? -1 : 1;
    const sy = label ? sx : -sx;
    return [sx * 0.8 + sigma * gauss(), sy * 0.8 + sigma * gauss()];
  }
  // two interleaved spiral arms, one full turn each — calibrated so that
  // H = 8 solves it on every probed seed and H = 2 on none (see check.js)
  const t = rng();
  const r = 0.16 + 1.24 * t;
  const th = label * Math.PI + 2 * Math.PI * t;
  return [r * Math.cos(th) + 0.55 * sigma * gauss(), r * Math.sin(th) + 0.55 * sigma * gauss()];
}

function makeSet(dataset, n, sigma, rng, gauss) {
  const X = [];
  const T = [];
  for (let c = 0; c <= 1; c++)
    for (let i = 0; i < n; i++) {
      X.push(draw(dataset, c, sigma, rng, gauss));
      T.push(c);
    }
  return { X, T };
}

/**
 * @param {{dataset: string, hidden: number, act: string, lr: number,
 *          epoch: number, sigma: number, seed: number}} params
 * @returns {{observables: Object}}
 */
export function compute({ dataset, hidden, act, lr, epoch, sigma, seed }) {
  const rng = mulberry32(seed);
  const gauss = gaussFrom(rng);
  const H = Math.max(1, Math.round(hidden));

  const train = makeSet(dataset, N_TRAIN, sigma, rng, gauss);
  const test = makeSet(dataset, N_TEST, sigma, rng, gauss);

  // The first layer starts WIDE (σ = 1.5), not at xor's timid 1/√2: on real
  // data the small symmetric start never leaves the mean plateau — measured,
  // the spiral sat at 50 % accuracy at any lr until the hidden lines began
  // spread out enough to cut the plane in different places.
  const init = {
    W1: Float64Array.from({ length: H * 2 }, () => 1.5 * gauss()),
    b1: Float64Array.from({ length: H }, () => 1.5 * gauss()),
    w2: Float64Array.from({ length: H }, () => gauss() / Math.SQRT2),
    b2: gauss() / Math.SQRT2,
  };
  const run = trainGD({ X: train.X, T: train.T, hidden: H, act, epochs: EPOCHS, lr, init, keepEvery: KEEP });

  /* ---------- the state at the requested epoch ---------------------------- */
  const ep = Math.min(Math.max(Math.round(epoch), 0), EPOCHS);
  const slot = Math.min(Math.floor(ep / KEEP), Math.floor(EPOCHS / KEEP));
  const at = (s) => {
    const off = s * run.pSize;
    return {
      W1: run.path.subarray(off, off + H * 2),
      b1: run.path.subarray(off + H * 2, off + H * 2 + H),
      w2: run.path.subarray(off + H * 2 + H, off + H * 2 + 2 * H),
      b2: run.path[off + run.pSize - 1],
      act,
      hidden: H,
      inDim: 2,
    };
  };
  const now = at(slot);
  const net = (x0, x1) => forward([x0, x1], now).y;

  /* ---------- boundary and regions, exactly as xor draws them ------------- */
  const field = new Float64Array(GRID * GRID);
  for (let j = 0; j < GRID; j++)
    for (let i = 0; i < GRID; i++)
      field[j * GRID + i] = net(LO + ((HI - LO) * i) / (GRID - 1), LO + ((HI - LO) * j) / (GRID - 1));
  const boundary = contourLines(field, GRID, GRID, LO, HI, LO, HI, 0.5);

  const r0x = [];
  const r0y = [];
  const r1x = [];
  const r1y = [];
  for (let j = 0; j < RGRID; j++)
    for (let i = 0; i < RGRID; i++) {
      const x0 = LO + ((HI - LO) * i) / (RGRID - 1);
      const x1 = LO + ((HI - LO) * j) / (RGRID - 1);
      const one = net(x0, x1) > 0.5;
      (one ? r1x : r0x).push(x0);
      (one ? r1y : r0y).push(x1);
    }

  /* ---------- the two loss curves, train against test --------------------- */
  // the train curve falls out of trainGD; the test curve replays every kept
  // snapshot on data the descent never saw — the gap between them IS the
  // overfitting, and it is measured, not asserted
  const nSlots = Math.floor(EPOCHS / KEEP) + 1;
  const exT = new Float64Array(nSlots);
  const trainCurve = new Float64Array(nSlots);
  const testCurve = new Float64Array(nSlots);
  for (let s = 0; s < nSlots; s++) {
    exT[s] = s * KEEP;
    trainCurve[s] = run.loss[s * KEEP];
    const w = at(s);
    let l = 0;
    for (let i = 0; i < test.X.length; i++) {
      const e = forward(test.X[i], w).y - test.T[i];
      l += (e * e) / (2 * test.X.length);
    }
    testCurve[s] = l;
  }

  const accOn = ({ X, T }) => {
    let good = 0;
    for (let i = 0; i < X.length; i++) if ((forward(X[i], now).y > 0.5 ? 1 : 0) === T[i]) good++;
    return good / X.length;
  };

  const split = ({ X, T }, label) => ({
    x: Float64Array.from(X.filter((_, i) => T[i] === label), (p) => p[0]),
    y: Float64Array.from(X.filter((_, i) => T[i] === label), (p) => p[1]),
  });

  return {
    observables: {
      train0: split(train, 0),
      train1: split(train, 1),
      test0: split(test, 0),
      test1: split(test, 1),
      region0: { x: Float64Array.from(r0x), y: Float64Array.from(r0y) },
      region1: { x: Float64Array.from(r1x), y: Float64Array.from(r1y) },
      boundary,
      trainCurve: { x: exT, y: trainCurve },
      testCurve: { x: exT, y: testCurve },
      epochNow: ep, // vline on the learning view
      accTrain: { value: accOn(train), meta: { label: 'train accuracy', precision: 3 } },
      accTest: { value: accOn(test), meta: { label: 'test accuracy', precision: 3 } },
    },
  };
}
