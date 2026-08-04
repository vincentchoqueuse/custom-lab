// L'algèbre linéaire du catalogue — et RIEN DE PLUS que ce qu'il utilise.
//
// Ce module tient une frontière avec `numeric.js` (le scalaire : erf,
// Student, trapz, fft) et `dsp.js` (le signal) : ici, tout ce qui prend une
// matrice. Il a été ouvert le jour où trois sujets se sont mis à écrire les
// mêmes boucles — décomposition propre en spectral, en filtrage adaptatif
// et en ACP ; équations normales en régression polynomiale et en régression
// sur base ; produit matrice-vecteur en filtrage et en apprentissage.
//
// CE QU'IL NE CONTIENT PAS, VOLONTAIREMENT : LU, QR, Cholesky, déterminant,
// inverse. Aucune expérience ne les utilise, donc AUCUN CHECK ne les
// exercerait — et une décomposition fausse que personne ne teste est pire
// que pas de décomposition du tout, parce qu'on lui fait confiance le jour
// où on s'en sert. Le principe 7 du projet dit cela ; ce paragraphe est là
// pour qu'on s'en souvienne au moment de « compléter la boîte ».
//
// La SVD, elle, EST là — et la façon dont elle est arrivée est la règle en
// action : elle est entrée le jour où une expérience l'a exercée (la
// compression d'image), avec ses identités dans le harnais, et pas la
// veille « parce qu'une boîte d'algèbre linéaire a une SVD ».
//
// Convention : une matrice n × m est un `Float64Array` de n·m en LIGNE
// MAJEURE, A[i][j] = A[i * m + j]. Sauf `solveLinearSystem`, hérité, qui
// prend un tableau de tableaux — sa signature n'a pas bougé pour ne pas
// toucher aux quatre expériences qui l'appellent.
//
// PURE, sans état, sans DOM. Importable depuis compute.js ET check.js.

/**
 * y = A·x, A de rows × cols en ligne majeure.
 * L'opération d'une couche linéaire, et de tout produit scalaire répété.
 */
export function matvec(A, x, rows, cols) {
  const y = new Float64Array(rows);
  for (let i = 0; i < rows; i++) {
    let s = 0;
    const off = i * cols;
    for (let j = 0; j < cols; j++) s += A[off + j] * x[j];
    y[i] = s;
  }
  return y;
}

/**
 * xᵀAx — la forme quadratique. C'est une PUISSANCE quand A est une
 * covariance : celle d'un filtre à l'entrée, celle d'une erreur de
 * coefficients, celle d'une projection. Trois expériences la calculent,
 * chacune pour une raison différente, avec la même boucle.
 */
export function quadForm(A, x, n) {
  let s = 0;
  for (let i = 0; i < n; i++) {
    let row = 0;
    const off = i * n;
    for (let j = 0; j < n; j++) row += A[off + j] * x[j];
    s += x[i] * row;
  }
  return s;
}

/**
 * Résolution d'un système linéaire dense par élimination de Gauss avec
 * PIVOT PARTIEL. A et b sont MODIFIÉS.
 *
 * Le pivot n'est pas une précaution de style : sans lui, une matrice
 * parfaitement inversible dont le premier coefficient est petit donne un
 * résultat faux sans rien signaler. Convient jusqu'à une trentaine
 * d'inconnues, ce qui couvre tout le catalogue.
 *
 * @param {number[][]} A tableau de lignes
 * @param {number[]} b
 * @returns {number[]} la solution
 */
export function solveLinearSystem(A, b) {
  const n = b.length;
  for (let col = 0; col < n; col++) {
    let piv = col;
    for (let r = col + 1; r < n; r++) {
      if (Math.abs(A[r][col]) > Math.abs(A[piv][col])) piv = r;
    }
    if (A[piv][col] === 0) throw new Error('singular linear system');
    if (piv !== col) {
      [A[piv], A[col]] = [A[col], A[piv]];
      [b[piv], b[col]] = [b[col], b[piv]];
    }
    const p = A[col][col];
    for (let r = col + 1; r < n; r++) {
      const f = A[r][col] / p;
      if (f === 0) continue;
      for (let c = col; c < n; c++) A[r][c] -= f * A[col][c];
      b[r] -= f * b[col];
    }
  }
  const x = new Array(n).fill(0);
  for (let i = n - 1; i >= 0; i--) {
    let s = b[i];
    for (let j = i + 1; j < n; j++) s -= A[i][j] * x[j];
    x[i] = s / A[i][i];
  }
  return x;
}

/**
 * Valeurs et vecteurs propres d'une matrice SYMÉTRIQUE RÉELLE n×n, par
 * rotations de Jacobi cycliques.
 *
 * Jacobi et pas QR : les matrices que le projet décompose sont petites
 * (n ≤ 64 — une covariance de sous-espace, une autocorrélation de filtre
 * adaptatif, une matrice de corrélation d'ACP), la convergence est garantie
 * sans décalage ni cas particulier, et surtout le résultat est exact au sens
 * où on peut le vérifier : l'orthogonalité est maintenue par construction,
 * puisqu'on n'applique que des rotations.
 *
 * @param {Float64Array} a  n×n en ligne majeure — MODIFIÉE en place
 * @returns {{values: Float64Array, vectors: Float64Array}} vecteurs en
 *          COLONNES : v_k[i] = vectors[i*n + k]
 */
export function jacobiSym(a, n) {
  const v = new Float64Array(n * n);
  for (let i = 0; i < n; i++) v[i * n + i] = 1;

  for (let sweep = 0; sweep < 100; sweep++) {
    let off = 0;
    for (let p = 0; p < n; p++)
      for (let q = p + 1; q < n; q++) off += a[p * n + q] * a[p * n + q];
    if (off < 1e-30) break;

    for (let p = 0; p < n - 1; p++) {
      for (let q = p + 1; q < n; q++) {
        const apq = a[p * n + q];
        if (Math.abs(apq) < 1e-300) continue;
        const theta = (a[q * n + q] - a[p * n + p]) / (2 * apq);
        const t = Math.sign(theta || 1) / (Math.abs(theta) + Math.sqrt(theta * theta + 1));
        const c = 1 / Math.sqrt(t * t + 1);
        const s = t * c;
        for (let k = 0; k < n; k++) {
          const akp = a[k * n + p];
          const akq = a[k * n + q];
          a[k * n + p] = c * akp - s * akq;
          a[k * n + q] = s * akp + c * akq;
        }
        for (let k = 0; k < n; k++) {
          const apk = a[p * n + k];
          const aqk = a[q * n + k];
          a[p * n + k] = c * apk - s * aqk;
          a[q * n + k] = s * apk + c * aqk;
        }
        for (let k = 0; k < n; k++) {
          const vkp = v[k * n + p];
          const vkq = v[k * n + q];
          v[k * n + p] = c * vkp - s * vkq;
          v[k * n + q] = s * vkp + c * vkq;
        }
      }
    }
  }
  const values = new Float64Array(n);
  for (let i = 0; i < n; i++) values[i] = a[i * n + i];
  return { values, vectors: v };
}

/**
 * Les ÉQUATIONS NORMALES d'un ajustement linéaire, accumulées en une passe :
 * AᵀA et Aᵀy, sans jamais former A.
 *
 * `row(i, out)` remplit `out` avec la i-ème ligne de la matrice de
 * conception — les puissances de x pour une régression polynomiale, les
 * fonctions de base pour une régression sur base, les exponentielles pour
 * une estimation d'amplitudes. C'est le seul endroit où les trois diffèrent,
 * et c'est pour cela qu'il est passé en argument.
 *
 * Ne jamais former A explicitement n'est pas une optimisation : c'est ce qui
 * permet d'ajuster sur dix mille points sans allouer dix mille lignes.
 *
 * @returns {{AtA: number[][], Aty: number[]}}
 */
export function normalEquations(n, cols, row, y) {
  const AtA = Array.from({ length: cols }, () => new Array(cols).fill(0));
  const Aty = new Array(cols).fill(0);
  const r = new Array(cols);
  for (let i = 0; i < n; i++) {
    row(i, r);
    const yi = typeof y === 'function' ? y(i) : y[i];
    for (let j = 0; j < cols; j++) {
      Aty[j] += yi * r[j];
      for (let l = j; l < cols; l++) AtA[j][l] += r[j] * r[l];
    }
  }
  for (let j = 0; j < cols; j++) for (let l = 0; l < j; l++) AtA[j][l] = AtA[l][j];
  return { AtA, Aty };
}

/**
 * Résout (AᵀA + λD)·w = Aᵀy sans modifier les entrées. λ = 0 rend les
 * moindres carrés ordinaires, et le harnais vérifie cette continuité.
 *
 * `skipFirst` laisse le terme constant HORS de la pénalité, ce qui est la
 * convention en régression : pénaliser l'ordonnée à l'origine reviendrait à
 * préférer les modèles qui passent près de zéro, ce qui n'a aucun sens
 * physique et dépend de l'endroit où l'on a placé l'origine.
 */
export function ridgeSolve(AtA, Aty, lambda, { skipFirst = false } = {}) {
  const A = AtA.map((r, j) => {
    const copy = Array.from(r);
    if (!skipFirst || j > 0) copy[j] += lambda;
    return copy;
  });
  return solveLinearSystem(A, Array.from(Aty));
}

/**
 * DÉCOMPOSITION EN VALEURS SINGULIÈRES d'une matrice m × n réelle :
 * A = U·diag(σ)·Vᵀ, σ décroissantes.
 *
 * Elle entre ici le jour où une expérience l'exerce — la compression
 * d'image — et pas avant, conformément à l'en-tête de ce module.
 *
 * Voie choisie : diagonaliser AᵀA (symétrique, n × n) par le Jacobi
 * ci-dessus, d'où V et σ² ; puis U = A·V/σ. C'est la construction du cours,
 * elle tient en quinze lignes, et son défaut est connu et documenté : les
 * PETITES valeurs singulières y perdent en précision relative, puisqu'on
 * passe par leur carré (σ ≈ √ε·σmax est le plancher). Pour une compression
 * qui garde les grandes et jette les petites, c'est sans conséquence — et
 * le harnais borne l'erreur de reconstruction complète à 1e-10, ce qui le
 * prouve plutôt que de le supposer.
 *
 * Les colonnes de U correspondant à une valeur singulière nulle ne sont pas
 * complétées en base orthonormée : elles restent nulles. Une reconstruction
 * ne les utilise jamais, et prétendre les avoir calculées serait mentir.
 *
 * @param {Float64Array} A m × n en ligne majeure (non modifiée)
 * @returns {{u: Float64Array, s: Float64Array, v: Float64Array, rank: number}}
 *   u est m × r, v est n × r, tous deux en ligne majeure, r = min(m, n).
 */
export function svd(A, m, n) {
  const r = Math.min(m, n);

  // AᵀA, symétrique n × n
  const AtA = new Float64Array(n * n);
  for (let a = 0; a < n; a++)
    for (let b = a; b < n; b++) {
      let acc = 0;
      for (let i = 0; i < m; i++) acc += A[i * n + a] * A[i * n + b];
      AtA[a * n + b] = acc;
      AtA[b * n + a] = acc;
    }

  const eig = jacobiSym(AtA, n);
  const order = Array.from({ length: n }, (_, k) => k).sort(
    (a, b) => eig.values[b] - eig.values[a]
  );

  const s = new Float64Array(r);
  const v = new Float64Array(n * r);
  for (let k = 0; k < r; k++) {
    const src = order[k];
    s[k] = Math.sqrt(Math.max(eig.values[src], 0));
    for (let j = 0; j < n; j++) v[j * r + k] = eig.vectors[j * n + src];
  }

  // Le rang NUMÉRIQUE, et son seuil est celui de cette voie-ci : passer par
  // AᵀA fait perdre la moitié des chiffres, donc une valeur singulière
  // vraiment nulle ressort autour de √ε·σmax et non de ε·σmax. Compter avec
  // le seuil habituel (ε) donnerait 65 au lieu de 4 sur une image
  // construite de rang 4 — un chiffre faux, et le harnais le vérifie.
  const rankTol = Math.max(m, n) * Math.sqrt(Number.EPSILON) * (s[0] || 1);
  let rank = 0;
  for (let k = 0; k < r; k++) if (s[k] > rankTol) rank++;

  // U = A·V/σ, colonne par colonne ; σ nulle ⇒ colonne laissée à zéro
  const u = new Float64Array(m * r);
  const tol = 1e-12 * (s[0] || 1);
  for (let k = 0; k < r; k++) {
    if (s[k] <= tol) continue;
    const inv = 1 / s[k];
    for (let i = 0; i < m; i++) {
      let acc = 0;
      const off = i * n;
      for (let j = 0; j < n; j++) acc += A[off + j] * v[j * r + k];
      u[i * r + k] = acc * inv;
    }
  }
  return { u, s, v, rank };
}

/**
 * La meilleure approximation de rang k : Aₖ = Σ_{i<k} σᵢ·uᵢvᵢᵀ.
 *
 * « Meilleure » n'est pas une façon de parler — Eckart–Young dit que
 * ‖A − Aₖ‖²_F = Σ_{i≥k} σᵢ², et qu'aucune matrice de rang k ne fait mieux.
 * C'est le même théorème que celui de l'ACP, sur la même page.
 */
export function lowRank(model, m, n, k) {
  const { u, s, v } = model;
  const r = s.length;
  const out = new Float64Array(m * n);
  const kk = Math.min(k, r);
  for (let c = 0; c < kk; c++) {
    const sc = s[c];
    if (sc === 0) continue;
    for (let i = 0; i < m; i++) {
      const ui = sc * u[i * r + c];
      if (ui === 0) continue;
      const off = i * n;
      for (let j = 0; j < n; j++) out[off + j] += ui * v[j * r + c];
    }
  }
  return out;
}
