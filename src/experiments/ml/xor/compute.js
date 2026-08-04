// Le XOR — le contre-exemple qui a arrêté la recherche pendant quinze ans.
//
// Quatre points, deux classes. (0,0) et (1,1) valent 0 ; (0,1) et (1,0)
// valent 1. Aucune droite ne sépare les deux classes : c'est démontrable en
// deux lignes, et Minsky et Papert l'ont écrit en 1969 — après quoi les
// crédits du perceptron ont disparu jusqu'aux années 1980.
//
// Ce que l'expérience montre, dans l'ordre :
//
//   1. UN neurone linéaire échoue, et il échoue d'une façon PRÉCISE : son
//      optimum est la solution CONSTANTE y = 1/2, qui laisse une erreur de
//      1/8. Ce n'est pas « il apprend mal », c'est « l'optimum lui-même est
//      mauvais » — et l'optimum se calcule, il ne se constate pas.
//   2. DEUX neurones cachés suffisent, et on peut même écrire la solution à
//      la main : h₁ = OU, h₂ = ET, sortie = h₁ − h₂. Le harnais vérifie que
//      cette construction rend la table de vérité exacte.
//   3. La descente de gradient la retrouve seule, et l'ÉPOQUE est un
//      paramètre : on balaie l'apprentissage au potard, on voit la frontière
//      se plier, et la scène reste reproductible par son URL.
//
// La frontière est tracée par marching squares sur la sortie du réseau, donc
// c'est la VRAIE frontière et non une droite devinée.
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
const KEEP = 10; // une photo des poids toutes les 10 époques
const GRID = 81; // grille de la frontière
const RGRID = 45; // grille des RÉGIONS de décision (points coloriés)
const LO = -0.35;
const HI = 1.35;

/** Les quatre cibles, selon la table demandée. */
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

  // Initialisation gaussienne d'écart-type 1/√2 : assez grande pour sortir
  // du plateau symétrique, assez petite pour ne pas saturer tanh d'emblée.
  const init = {
    W1: Float64Array.from({ length: H * 2 }, () => gauss() / Math.SQRT2),
    b1: Float64Array.from({ length: H }, () => gauss() / Math.SQRT2),
    w2: Float64Array.from({ length: H }, () => gauss() / Math.SQRT2),
    b2: gauss() / Math.SQRT2,
  };

  const run = trainGD({ X, T, hidden: H, act, epochs: EPOCHS, lr, init, keepEvery: KEEP });

  /* ---------- l'état à l'époque demandée ---------------------------------- */
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

  /* ---------- la frontière, par marching squares -------------------------- */
  const field = new Float64Array(GRID * GRID);
  for (let j = 0; j < GRID; j++)
    for (let i = 0; i < GRID; i++) {
      const x0 = LO + ((HI - LO) * i) / (GRID - 1);
      const x1 = LO + ((HI - LO) * j) / (GRID - 1);
      field[j * GRID + i] = net(x0, x1);
    }
  const boundary = contourLines(field, GRID, GRID, LO, HI, LO, HI, 0.5);

  // LES RÉGIONS DE DÉCISION, c'est-à-dire la classification elle-même :
  // sign(y − ½) sur une grille, un point colorié par classe. C'est la figure
  // que tout le monde connaît, et elle dit ce qu'une frontière seule ne dit
  // pas — de quel côté est quoi. La frontière reste tracée par-dessus,
  // puisqu'elle est, elle, exacte à l'interpolation près.
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

  // Les droites des neurones cachés : w·x + b = 0. C'est ce que CHAQUE
  // neurone découpe, et voir les deux droites rend la solution évidente.
  // Chaque droite est DÉCOUPÉE sur la boîte [LO, HI]² : sans cela une droite
  // presque horizontale sortait à ±30 et étirait le cadre équi-aspect au
  // point que les quatre points tenaient dans un timbre.
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

  /* ---------- les points, séparés par classe ------------------------------ */
  const cls = (v) => ({
    x: Float64Array.from(X.filter((_, i) => T[i] === v), (p) => p[0]),
    y: Float64Array.from(X.filter((_, i) => T[i] === v), (p) => p[1]),
  });

  /* ---------- la courbe d'apprentissage ----------------------------------- */
  const eps = new Float64Array(EPOCHS + 1);
  for (let i = 0; i <= EPOCHS; i++) eps[i] = i;

  /* ---------- ce que la salle doit lire ----------------------------------- */
  // La décision EST le signe : classe 1 si y > ½, 0 sinon. Écrit ainsi
  // partout — statline, régions, compteur d'erreurs — pour qu'il n'y ait
  // qu'une seule règle à retenir.
  const decide = (y) => (Math.sign(y - 0.5) > 0 ? 1 : 0);
  const outs = X.map((p) => net(p[0], p[1]));
  const wrong = outs.filter((y, i) => decide(y) !== T[i]).length;
  const table = X.map((p, i) => `${p[0]}${p[1]}→${outs[i].toFixed(2)}`).join(' ');

  return {
    observables: {
      learning: { x: eps, y: run.loss },
      epochLine: ep,
      // Le plancher du modèle linéaire, tracé en repère. Il vaut 1/8 et non
      // 1/16 : l'erreur affichée est Σe²/(2n), donc la solution constante
      // y = 1/2 — l'optimum linéaire, démontré dans le harnais — y laisse
      // 4 × 0.25 / 8 = 0.125.
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
        meta: { label: 'erreur finale', precision: 5 },
      },
      errors: { value: wrong, meta: { label: 'misclassified points', precision: 0 } },
      truth: { value: table, meta: { label: 'sortie' } },
      nWeights: {
        value: H * 2 + H + H + 1,
        meta: { label: 'network weights', precision: 0 },
      },
    },
  };
}

export { X, targets, EPOCHS, LO, HI };
