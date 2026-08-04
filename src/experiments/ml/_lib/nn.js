// Les briques d'un réseau, écrites une fois pour les trois expériences du
// sujet. Rien de plus qu'une activation, un produit matrice-vecteur et une
// descente de gradient — et c'est précisément le propos : il n'y a rien de
// plus dans un réseau que ce que ce fichier contient.
//
// PURE, sans état, générateur passé en argument. Importable depuis
// compute.js ET check.js.

/**
 * Les activations, chacune avec sa dérivée — la dérivée n'est pas un
 * ornement : c'est elle qui décide si un réseau apprend, et la vue de
 * transfert la trace à côté de la fonction.
 *
 * `leaky` porte sa pente négative en dur (0.01), la valeur d'usage.
 */
export const ACTIVATIONS = {
  identity: { f: (x) => x, df: () => 1, odd: true },
  relu: { f: (x) => (x > 0 ? x : 0), df: (x) => (x > 0 ? 1 : 0), odd: false },
  leaky: { f: (x) => (x > 0 ? x : 0.01 * x), df: (x) => (x > 0 ? 1 : 0.01), odd: false },
  tanh: { f: Math.tanh, df: (x) => 1 - Math.tanh(x) ** 2, odd: true },
  sigmoid: {
    f: (x) => 1 / (1 + Math.exp(-x)),
    df: (x) => {
      const s = 1 / (1 + Math.exp(-x));
      return s * (1 - s);
    },
    odd: false,
  },
  // GELU dans sa forme exacte (et non l'approximation en tanh) : x·Φ(x).
  gelu: {
    f: (x) => x * 0.5 * (1 + erf(x / Math.SQRT2)),
    df: (x) =>
      0.5 * (1 + erf(x / Math.SQRT2)) + (x * Math.exp((-x * x) / 2)) / Math.sqrt(2 * Math.PI),
    odd: false,
  },
};

/** erf par l'approximation d'Abramowitz–Stegun 7.1.26 (7 chiffres). */
function erf(x) {
  const s = Math.sign(x);
  const a = Math.abs(x);
  const t = 1 / (1 + 0.3275911 * a);
  const y =
    1 -
    ((((1.061405429 * t - 1.453152027) * t + 1.421413741) * t - 0.284496736) * t + 0.254829592) *
      t *
      Math.exp(-a * a);
  return s * y;
}

/** σ appliquée terme à terme. */
export function applyAct(x, act) {
  const { f } = ACTIVATIONS[act];
  const y = new Float64Array(x.length);
  for (let i = 0; i < x.length; i++) y[i] = f(x[i]);
  return y;
}

/**
 * y = W·x, W étant donnée en ligne majeure (rows × cols).
 * Le produit matrice-vecteur : la seule opération d'une couche linéaire.
 */
export function matvec(W, x, rows, cols) {
  const y = new Float64Array(rows);
  for (let i = 0; i < rows; i++) {
    let s = 0;
    const off = i * cols;
    for (let j = 0; j < cols; j++) s += W[off + j] * x[j];
    y[i] = s;
  }
  return y;
}

/**
 * Une matrice DENSE aléatoire, entrées i.i.d. gaussiennes d'écart-type
 * scale/√cols — la normalisation « He/Glorot », qui garde la variance de
 * la sortie indépendante de la largeur. Sans elle, élargir le réseau
 * saturerait l'activation, et on attribuerait à la largeur un effet qui
 * n'est qu'un défaut d'échelle.
 */
export function denseMatrix(rows, cols, scale, gauss) {
  const W = new Float64Array(rows * cols);
  const s = scale / Math.sqrt(cols);
  for (let i = 0; i < W.length; i++) W[i] = s * gauss();
  return W;
}

/**
 * La MÊME couche, mais dont la matrice est de Toeplitz : W[i][j] ne dépend
 * que de i − j. Autrement dit un filtre RIF, autrement dit une convolution
 * — et l'expérience est là pour que cette phrase cesse d'être une analogie.
 *
 * Le noyau est causal de longueur `len`, et la matrice fait rows × cols :
 * W[i][j] = h[i − j] si 0 ≤ i − j < len, 0 sinon.
 */
export function toeplitzMatrix(rows, cols, kernel) {
  const W = new Float64Array(rows * cols);
  for (let i = 0; i < rows; i++)
    for (let j = 0; j < cols; j++) {
      const k = i - j;
      if (k >= 0 && k < kernel.length) W[i * cols + j] = kernel[k];
    }
  return W;
}

/** Convolution causale h*x, tronquée à la longueur de x. */
export function convolve(x, h) {
  const y = new Float64Array(x.length);
  for (let i = 0; i < x.length; i++) {
    let s = 0;
    for (let k = 0; k < h.length && k <= i; k++) s += h[k] * x[i - k];
    y[i] = s;
  }
  return y;
}

/**
 * Le réseau à UNE couche cachée, dans sa forme minimale :
 *     y(x) = w₂ᵀ σ(W₁x + b₁) + b₂
 * Rien d'autre. Les trois expériences du sujet n'en utilisent pas plus.
 */
export function forward(x, { W1, b1, w2, b2, act, hidden, inDim }) {
  const z = matvec(W1, x, hidden, inDim);
  for (let i = 0; i < hidden; i++) z[i] += b1[i];
  const h = applyAct(z, act);
  let y = b2;
  for (let i = 0; i < hidden; i++) y += w2[i] * h[i];
  return { y, h, z };
}

/**
 * Descente de gradient COMPLÈTE (batch) sur l'erreur quadratique, pour un
 * réseau 2 → H → 1. Rend la trajectoire entière : l'époque devient un
 * paramètre de l'expérience, donc une scène s'ouvre à l'état où le cours en
 * est, sans moteur d'animation et sans rien perdre de la reproductibilité.
 *
 * @returns {{loss: Float64Array, path: Float64Array, params: object}}
 *   `path` contient les paramètres à chaque époque (aplatis), `params` ceux
 *   de la dernière.
 */
export function trainGD({ X, T, hidden, act, epochs, lr, init, keepEvery = 1 }) {
  const inDim = X[0].length;
  const n = X.length;
  const { f, df } = ACTIVATIONS[act];
  const W1 = Float64Array.from(init.W1);
  const b1 = Float64Array.from(init.b1);
  const w2 = Float64Array.from(init.w2);
  let b2 = init.b2;

  const loss = new Float64Array(epochs + 1);
  const nKept = Math.floor(epochs / keepEvery) + 1;
  const pSize = hidden * inDim + hidden + hidden + 1;
  const path = new Float64Array(nKept * pSize);

  const snapshot = (slot) => {
    const off = slot * pSize;
    path.set(W1, off);
    path.set(b1, off + hidden * inDim);
    path.set(w2, off + hidden * inDim + hidden);
    path[off + pSize - 1] = b2;
  };

  for (let ep = 0; ep <= epochs; ep++) {
    const gW1 = new Float64Array(hidden * inDim);
    const gb1 = new Float64Array(hidden);
    const gw2 = new Float64Array(hidden);
    let gb2 = 0;
    let l = 0;

    for (let s = 0; s < n; s++) {
      const x = X[s];
      // avant
      const z = new Float64Array(hidden);
      const h = new Float64Array(hidden);
      let y = b2;
      for (let i = 0; i < hidden; i++) {
        let a = b1[i];
        for (let j = 0; j < inDim; j++) a += W1[i * inDim + j] * x[j];
        z[i] = a;
        h[i] = f(a);
        y += w2[i] * h[i];
      }
      const e = y - T[s];
      l += (e * e) / (2 * n);
      // arrière
      gb2 += e / n;
      for (let i = 0; i < hidden; i++) {
        gw2[i] += (e * h[i]) / n;
        const d = ((e * w2[i]) / n) * df(z[i]);
        gb1[i] += d;
        for (let j = 0; j < inDim; j++) gW1[i * inDim + j] += d * x[j];
      }
    }
    loss[ep] = l;
    if (ep % keepEvery === 0) snapshot(ep / keepEvery);
    if (ep === epochs) break;

    for (let i = 0; i < W1.length; i++) W1[i] -= lr * gW1[i];
    for (let i = 0; i < hidden; i++) {
      b1[i] -= lr * gb1[i];
      w2[i] -= lr * gw2[i];
    }
    b2 -= lr * gb2;
  }

  return { loss, path, pSize, keepEvery, params: { W1, b1, w2, b2 } };
}

/**
 * Les iso-contours d'un champ scalaire par MARCHING SQUARES — la frontière
 * de décision, tracée comme une courbe et non devinée sur un nuage.
 * Rendue en segments concaténés, séparés par des NaN : un seul observable,
 * que le tracé générique coupe tout seul.
 *
 * @param {Float64Array} field grille (ny × nx) en ligne majeure
 */
export function contourLines(field, nx, ny, x0, x1, y0, y1, level) {
  const xs = [];
  const ys = [];
  const at = (i, j) => field[j * nx + i];
  const px = (i) => x0 + ((x1 - x0) * i) / (nx - 1);
  const py = (j) => y0 + ((y1 - y0) * j) / (ny - 1);
  // Interpolation linéaire sur l'arête : c'est ce qui rend la courbe lisse
  // au lieu d'escalier, et c'est la seule « science » du procédé.
  const lerp = (a, b, va, vb) => a + ((b - a) * (level - va)) / (vb - va);

  for (let j = 0; j < ny - 1; j++) {
    for (let i = 0; i < nx - 1; i++) {
      const v = [at(i, j), at(i + 1, j), at(i + 1, j + 1), at(i, j + 1)];
      const idx = (v[0] > level ? 1 : 0) | (v[1] > level ? 2 : 0) | (v[2] > level ? 4 : 0) | (v[3] > level ? 8 : 0);
      if (idx === 0 || idx === 15) continue;
      const pts = [];
      // arêtes : bas, droite, haut, gauche
      if ((v[0] > level) !== (v[1] > level))
        pts.push([lerp(px(i), px(i + 1), v[0], v[1]), py(j)]);
      if ((v[1] > level) !== (v[2] > level))
        pts.push([px(i + 1), lerp(py(j), py(j + 1), v[1], v[2])]);
      if ((v[2] > level) !== (v[3] > level))
        pts.push([lerp(px(i + 1), px(i), v[2], v[3]), py(j + 1)]);
      if ((v[3] > level) !== (v[0] > level))
        pts.push([px(i), lerp(py(j + 1), py(j), v[3], v[0])]);
      for (let k = 0; k + 1 < pts.length; k += 2) {
        xs.push(pts[k][0], pts[k + 1][0], NaN);
        ys.push(pts[k][1], pts[k + 1][1], NaN);
      }
    }
  }
  return { x: Float64Array.from(xs), y: Float64Array.from(ys) };
}
