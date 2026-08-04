// L'algèbre des méthodes à haute résolution — le sous-espace bruit, et ce
// qu'on en tire.
//
// Tout part d'une matrice de covariance hermitienne M×M et de sa
// décomposition propre. C'est LA brique, et c'est aussi la seule chose
// qu'aucune petite bibliothèque JS ne sait faire : `ml-matrix` ne
// décompose que du réel, `mathjs` non plus et pèse sept fois plus lourd,
// et un portage WASM d'Eigen coûterait un mégaoctet contre la cible
// Safari 11 du build. Avec l'une ou l'autre il faudrait DE TOUTE FAÇON
// passer par le plongement ci-dessous — après quoi il ne reste qu'un
// Jacobi, soit une soixantaine de lignes qu'on peut vérifier ligne à
// ligne. On les écrit donc, et le harnais les épingle :
// R·v = λ·v à 1e-12, vecteurs orthonormés à 1e-12.
//
// Convention complexe : partout des paires de Float64Array {re, im}, jamais
// d'objets par élément — les boucles sont chaudes et le contrat du projet
// interdit les tableaux d'objets sur les chemins critiques.
//
// PURE : pas de DOM, pas d'état. Importable depuis compute.js et check.js.
//
// Le Jacobi symétrique réel qui sert de socle a rejoint core/linalg.js le
// jour où un second sujet en a eu besoin (filtrage adaptatif : le
// conditionnement de la matrice d'autocorrélation EST la vitesse de LMS).
// C'est la règle du projet : ce qui sert à UN sujet vit avec lui, ce qui
// sert à plusieurs monte dans le cœur.
import { jacobiSym } from '../../../core/linalg.js';

/**
 * Valeurs et vecteurs propres d'une matrice HERMITIENNE complexe M×M,
 * triés par valeur propre DÉCROISSANTE.
 *
 * Le plongement classique : A = X + jY hermitienne (X symétrique, Y
 * antisymétrique) devient
 *
 *     B = [ X  −Y ]   symétrique réelle 2M×2M
 *         [ Y   X ]
 *
 * dont chaque valeur propre de A apparaît DEUX fois, et dont un vecteur
 * propre (u ; w) donne le vecteur complexe u + j·w. On garde un couple sur
 * deux après tri — et le fait que les valeurs sortent bien appariées est
 * lui-même vérifié par le harnais, parce que c'est ce qui rend le
 * dédoublonnage légitime plutôt que optimiste.
 *
 * @param {Float64Array} re  M×M, partie réelle (symétrique)
 * @param {Float64Array} im  M×M, partie imaginaire (antisymétrique)
 * @returns {{values: Float64Array, re: Float64Array, im: Float64Array}}
 *          M valeurs décroissantes ; vecteurs en COLONNES, v_k[i] à [i*M+k]
 */
export function hermitianEig(re, im, M) {
  const n = 2 * M;
  const b = new Float64Array(n * n);
  for (let i = 0; i < M; i++) {
    for (let j = 0; j < M; j++) {
      b[i * n + j] = re[i * M + j];
      b[i * n + (j + M)] = -im[i * M + j];
      b[(i + M) * n + j] = im[i * M + j];
      b[(i + M) * n + (j + M)] = re[i * M + j];
    }
  }
  const { values, vectors } = jacobiSym(b, n);

  const idx = Array.from({ length: n }, (_, k) => k).sort((p, q) => values[q] - values[p]);
  // une valeur sur deux : les 2M valeurs sont M paires exactes
  const outV = new Float64Array(M);
  const outRe = new Float64Array(M * M);
  const outIm = new Float64Array(M * M);
  for (let k = 0; k < M; k++) {
    const c = idx[2 * k];
    outV[k] = values[c];
    let norm = 0;
    for (let i = 0; i < M; i++) {
      const u = vectors[i * n + c];
      const w = vectors[(i + M) * n + c];
      norm += u * u + w * w;
    }
    norm = Math.sqrt(norm) || 1;
    for (let i = 0; i < M; i++) {
      outRe[i * M + k] = vectors[i * n + c] / norm;
      outIm[i * M + k] = vectors[(i + M) * n + c] / norm;
    }
  }
  return { values: outV, re: outRe, im: outIm };
}

/**
 * Covariance estimée d'un enregistrement complexe, par fenêtrage glissant
 * (matrice de Hankel) puis moyennage AVANT-ARRIÈRE.
 *
 * Le moyennage avant-arrière n'est pas un raffinement : sur un
 * enregistrement unique les L instantanés glissants sont corrélés, et sans
 * lui le rang du sous-espace signal est sous-estimé dès que deux sources
 * sont proches — MUSIC n'en verrait qu'une, pour une raison qui n'a rien à
 * voir avec la résolution qu'on cherche à démontrer.
 *
 * @param {Float64Array} xr, xi  l'enregistrement complexe
 * @param {number} M             ordre de la covariance
 */
export function covariance(xr, xi, M) {
  const N = xr.length;
  const L = N - M + 1;
  const re = new Float64Array(M * M);
  const im = new Float64Array(M * M);
  for (let l = 0; l < L; l++) {
    for (let i = 0; i < M; i++) {
      const ar = xr[l + i];
      const ai = xi[l + i];
      for (let j = 0; j < M; j++) {
        // R += x xᴴ  →  R[i][j] += x_i · conj(x_j)
        const br = xr[l + j];
        const bi = xi[l + j];
        re[i * M + j] += ar * br + ai * bi;
        im[i * M + j] += ai * br - ar * bi;
      }
    }
  }
  // arrière : R_b = J R* J, moyenné avec R
  const fr = new Float64Array(M * M);
  const fi = new Float64Array(M * M);
  for (let i = 0; i < M; i++) {
    for (let j = 0; j < M; j++) {
      const bi = (M - 1 - i) * M + (M - 1 - j);
      fr[i * M + j] = (re[i * M + j] + re[bi]) / (2 * L);
      fi[i * M + j] = (im[i * M + j] - im[bi]) / (2 * L);
    }
  }
  return { re: fr, im: fi, snapshots: L };
}

/**
 * Pseudo-spectre MUSIC : 1 / ‖Eₙᴴ a(f)‖², a(f) = [1, e^{j2πf}, …].
 * Ce n'est PAS une densité spectrale — c'est l'inverse d'une distance au
 * sous-espace bruit, et ses ordonnées n'ont pas d'unité physique. D'où le
 * nom, qu'il faut garder devant une salle.
 *
 * @param {{re, im}} vec   vecteurs propres (colonnes), M×M
 * @param {number} d       nombre de valeurs propres tenues pour signal
 * @param {Float64Array} f fréquences normalisées (cycles/échantillon)
 */
export function musicPseudo(vec, M, d, f) {
  const out = new Float64Array(f.length);
  for (let k = 0; k < f.length; k++) {
    const w = 2 * Math.PI * f[k];
    let acc = 0;
    for (let c = d; c < M; c++) {
      // ⟨v_c, a(f)⟩ = Σ_i conj(v_c[i]) e^{jωi}
      let sr = 0;
      let si = 0;
      for (let i = 0; i < M; i++) {
        const vr = vec.re[i * M + c];
        const vi = vec.im[i * M + c];
        const cs = Math.cos(w * i);
        const sn = Math.sin(w * i);
        sr += vr * cs + vi * sn;
        si += vr * sn - vi * cs;
      }
      acc += sr * sr + si * si;
    }
    out[k] = 1 / Math.max(acc, 1e-300);
  }
  return out;
}

/* ---------------------------------------------------------------------- */
/* Racines d'un polynôme à coefficients COMPLEXES — pour root-MUSIC        */
/* ---------------------------------------------------------------------- */
//
// `control/_lib/lti.js` a déjà un Durand–Kerner, mais à coefficients RÉELS :
// les pôles d'une fonction de transfert le sont. Le polynôme de root-MUSIC
// ne l'est pas (ses coefficients sont les diagonales d'une matrice
// hermitienne), donc c'est le même schéma sur un autre corps, pas le même
// code. Deux implémentations pour deux corps est le prix honnête ; à un
// troisième appelant, la version complexe monterait dans le cœur et
// absorberait l'autre.

/**
 * Racines complexes d'un polynôme à coefficients complexes, puissances
 * décroissantes, par Durand–Kerner. Points de départ FIXES : le calcul doit
 * être déterministe à paramètres égaux, c'est le contrat du projet.
 *
 * @param {Float64Array} cr, ci  coefficients, cr[0] = plus haut degré
 * @returns {{re: Float64Array, im: Float64Array}}
 */
export function polyRootsComplex(cr, ci) {
  const n = cr.length - 1;
  if (n < 1) return { re: new Float64Array(0), im: new Float64Array(0) };
  // unitaire
  const a0r = cr[0];
  const a0i = ci[0];
  const d0 = a0r * a0r + a0i * a0i;
  const ar = new Float64Array(n + 1);
  const ai = new Float64Array(n + 1);
  for (let k = 0; k <= n; k++) {
    ar[k] = (cr[k] * a0r + ci[k] * a0i) / d0;
    ai[k] = (ci[k] * a0r - cr[k] * a0i) / d0;
  }
  const evalAt = (zr, zi) => {
    let pr = 0;
    let pi = 0;
    for (let k = 0; k <= n; k++) {
      const t = pr * zr - pi * zi + ar[k];
      pi = pr * zi + pi * zr + ai[k];
      pr = t;
    }
    return [pr, pi];
  };
  // Rayon de départ : la borne de Cauchy, PLAFONNÉE. À grand degré elle
  // suffit à faire déborder l'évaluation de Horner (R^n), et root-MUSIC
  // travaille en degré 2(M−1) — 62 pour M = 32. Le plafond garde R^n dans
  // les doubles avec une marge de vingt ordres de grandeur.
  let R = 1;
  for (let k = 1; k <= n; k++) R = Math.max(R, Math.hypot(ar[k], ai[k]));
  R = Math.min(1 + R, 10 ** (288 / n));
  const zr = new Float64Array(n);
  const zi = new Float64Array(n);
  for (let k = 0; k < n; k++) {
    const th = (2 * Math.PI * k) / n + 0.4;
    zr[k] = 0.6 * R * Math.cos(th);
    zi[k] = 0.6 * R * Math.sin(th);
  }
  for (let it = 0; it < 500; it++) {
    let move = 0;
    for (let k = 0; k < n; k++) {
      // Correction de Weierstrass p(z_k) / Π_{j≠k}(z_k − z_j), DIVISÉE AU
      // FUR ET À MESURE et non formée en un produit puis divisée une fois.
      // Le produit de 61 facteurs atteignait 1e183, son module au carré
      // l'infini, et le quotient devenait NaN : root-MUSIC ne rendait plus
      // rien dès M = 32, alors que M = 28 passait. Diviser à chaque pas
      // garde les magnitudes bornées et ne change rien au résultat.
      let [qr, qi] = evalAt(zr[k], zi[k]);
      for (let j = 0; j < n; j++) {
        if (j === k) continue;
        const er = zr[k] - zr[j];
        const ei = zi[k] - zi[j];
        const m = er * er + ei * ei;
        if (!(m > 1e-300)) {
          qr = 0;
          qi = 0;
          break;
        }
        const t = (qr * er + qi * ei) / m;
        qi = (qi * er - qr * ei) / m;
        qr = t;
      }
      if (!Number.isFinite(qr) || !Number.isFinite(qi)) continue;
      zr[k] -= qr;
      zi[k] -= qi;
      move = Math.max(move, Math.hypot(qr, qi));
    }
    if (move < 1e-15) break;
  }
  return { re: zr, im: zi };
}

/**
 * root-MUSIC : au lieu de balayer le pseudo-spectre, on ANNULE son
 * dénominateur. Le polynôme
 *
 *   Q(z) = Σ_k c_k z^{-k},   c_k = somme de la k-ième diagonale de EₙEₙᴴ
 *
 * a ses zéros exactement sur le cercle unité aux fréquences des sources
 * (sans bruit). On prend donc les d racines INTÉRIEURES les plus proches du
 * cercle : pas de grille, donc pas de résolution limitée par un pas de
 * balayage — l'estimation est continue, ce que MUSIC balayé ne peut pas être.
 *
 * @returns {Float64Array} d fréquences normalisées, croissantes
 */
export function rootMusic(vec, M, d) {
  // C = Eₙ Eₙᴴ, puis ses diagonales
  const cr = new Float64Array(M * M);
  const ci = new Float64Array(M * M);
  for (let i = 0; i < M; i++) {
    for (let j = 0; j < M; j++) {
      let sr = 0;
      let si = 0;
      for (let c = d; c < M; c++) {
        const ar = vec.re[i * M + c];
        const ai = vec.im[i * M + c];
        const br = vec.re[j * M + c];
        const bi = vec.im[j * M + c];
        sr += ar * br + ai * bi; // a · conj(b)
        si += ai * br - ar * bi;
      }
      cr[i * M + j] = sr;
      ci[i * M + j] = si;
    }
  }
  // coefficients du polynôme de degré 2(M−1) : k de −(M−1) à (M−1)
  const deg = 2 * (M - 1);
  const pr = new Float64Array(deg + 1);
  const pi = new Float64Array(deg + 1);
  for (let k = -(M - 1); k <= M - 1; k++) {
    let sr = 0;
    let si = 0;
    for (let i = 0; i < M; i++) {
      const j = i - k;
      if (j < 0 || j >= M) continue;
      sr += cr[i * M + j];
      si += ci[i * M + j];
    }
    // z^{-k} · z^{M-1} → puissance (M−1−k), rangée en degrés décroissants
    const p = deg - (M - 1 - k);
    pr[p] = sr;
    pi[p] = si;
  }
  const roots = polyRootsComplex(pr, pi);
  // Les racines viennent par couples conjugués-inverses (z, 1/z*), de MÊME
  // ANGLE : sur le cercle unité ces deux-là fusionnent en une racine
  // double, et l'itération place alors ses deux itérés du même côté aussi
  // souvent que d'un de chaque. Prendre « les d plus proches du cercle par
  // l'intérieur » consommait donc deux places pour une seule source, et une
  // source disparaissait — 1.2 Hz d'erreur au lieu de 1e-6.
  //
  // On regroupe donc par angle avant de choisir. Le seuil est très serré
  // (1e-6 en fréquence normalisée) parce que les deux membres d'un couple
  // ont rigoureusement le même angle, alors que deux sources distinctes,
  // même à 0.3 × Fs/N, en sont mille fois plus loin.
  const ANG_TOL = 1e-6;
  const cand = [];
  for (let k = 0; k < roots.re.length; k++) {
    const r = Math.hypot(roots.re[k], roots.im[k]);
    if (r > 1 + 1e-6) continue;
    let a = Math.atan2(roots.im[k], roots.re[k]) / (2 * Math.PI);
    if (a < 0) a += 1;
    const dist = Math.abs(1 - r);
    const hit = cand.find((c) => Math.abs(c.f - a) < ANG_TOL || Math.abs(c.f - a) > 1 - ANG_TOL);
    if (hit) {
      if (dist < hit.dist) {
        hit.dist = dist;
        hit.f = a;
      }
    } else cand.push({ f: a, dist });
  }
  cand.sort((p, q) => p.dist - q.dist);
  const f = cand
    .slice(0, d)
    .map((c) => c.f)
    .sort((p, q) => p - q);
  return Float64Array.from(f);
}

/**
 * ESPRIT : la structure de décalage du sous-espace SIGNAL suffit, sans
 * jamais former de spectre. Si Eₛ engendre le signal, ses deux
 * sous-matrices décalées d'une ligne vérifient E₁ Ψ = E₂, et les valeurs
 * propres de Ψ sont les e^{j2πf_k}. Aucune grille, aucun balayage : la
 * fréquence sort d'une résolution de système linéaire.
 *
 * Ψ est résolu au sens des moindres carrés par équations normales, et ses
 * valeurs propres sont obtenues en forme close pour d ≤ 2 (le cas du cours)
 * et par itération QR élémentaire au-delà.
 *
 * @returns {Float64Array} d fréquences normalisées, croissantes
 */
export function esprit(vec, M, d) {
  const m = M - 1;
  // E1 = lignes 0..M-2 des d premières colonnes, E2 = lignes 1..M-1
  const g = (rowOff, i, c) => [vec.re[(i + rowOff) * M + c], vec.im[(i + rowOff) * M + c]];
  // A = E1ᴴE1 (d×d), B = E1ᴴE2 (d×d)
  const Ar = new Float64Array(d * d);
  const Ai = new Float64Array(d * d);
  const Br = new Float64Array(d * d);
  const Bi = new Float64Array(d * d);
  for (let p = 0; p < d; p++) {
    for (let q = 0; q < d; q++) {
      let ar = 0;
      let ai = 0;
      let br = 0;
      let bi = 0;
      for (let i = 0; i < m; i++) {
        const [ur, ui] = g(0, i, p);
        const [vr, vi] = g(0, i, q);
        const [wr, wi] = g(1, i, q);
        ar += ur * vr + ui * vi; // conj(u)·v
        ai += ur * vi - ui * vr;
        br += ur * wr + ui * wi;
        bi += ur * wi - ui * wr;
      }
      Ar[p * d + q] = ar;
      Ai[p * d + q] = ai;
      Br[p * d + q] = br;
      Bi[p * d + q] = bi;
    }
  }
  // Ψ = A⁻¹B, par élimination de Gauss complexe (d ≤ 4)
  const psi = solveComplex(Ar, Ai, Br, Bi, d);
  const ev = eigComplexSmall(psi.re, psi.im, d);
  const f = [];
  for (let k = 0; k < d; k++) {
    let v = Math.atan2(ev.im[k], ev.re[k]) / (2 * Math.PI);
    f.push(v < 0 ? v + 1 : v);
  }
  f.sort((p, q) => p - q);
  return Float64Array.from(f);
}

/** A X = B, complexe, par élimination de Gauss avec pivot partiel. */
export function solveComplex(ar, ai, br, bi, n) {
  const A = { re: Float64Array.from(ar), im: Float64Array.from(ai) };
  const X = { re: Float64Array.from(br), im: Float64Array.from(bi) };
  for (let col = 0; col < n; col++) {
    let piv = col;
    let best = -1;
    for (let r = col; r < n; r++) {
      const m = Math.hypot(A.re[r * n + col], A.im[r * n + col]);
      if (m > best) {
        best = m;
        piv = r;
      }
    }
    if (piv !== col) {
      for (let c = 0; c < n; c++) {
        for (const T of [A, X]) {
          const t1 = T.re[col * n + c];
          T.re[col * n + c] = T.re[piv * n + c];
          T.re[piv * n + c] = t1;
          const t2 = T.im[col * n + c];
          T.im[col * n + c] = T.im[piv * n + c];
          T.im[piv * n + c] = t2;
        }
      }
    }
    const dr = A.re[col * n + col];
    const di = A.im[col * n + col];
    const dd = dr * dr + di * di || 1e-300;
    for (let c = 0; c < n; c++) {
      for (const T of [A, X]) {
        const xr = T.re[col * n + c];
        const xi = T.im[col * n + c];
        T.re[col * n + c] = (xr * dr + xi * di) / dd;
        T.im[col * n + c] = (xi * dr - xr * di) / dd;
      }
    }
    for (let r = 0; r < n; r++) {
      if (r === col) continue;
      const fr = A.re[r * n + col];
      const fi = A.im[r * n + col];
      if (fr === 0 && fi === 0) continue;
      for (let c = 0; c < n; c++) {
        for (const T of [A, X]) {
          const pr2 = fr * T.re[col * n + c] - fi * T.im[col * n + c];
          const pi2 = fr * T.im[col * n + c] + fi * T.re[col * n + c];
          T.re[r * n + c] -= pr2;
          T.im[r * n + c] -= pi2;
        }
      }
    }
  }
  return X;
}

/**
 * Valeurs propres d'une petite matrice complexe n×n (n ≤ 4).
 * n = 1 trivial, n = 2 en forme close par la quadratique, au-delà par
 * itération de la puissance sur les racines du polynôme caractéristique
 * obtenu par Leverrier — la taille est celle du nombre de sources d'un
 * cours, pas celle d'un solveur général.
 */
export function eigComplexSmall(mr, mi, n) {
  if (n === 1) return { re: Float64Array.from([mr[0]]), im: Float64Array.from([mi[0]]) };
  if (n === 2) {
    // λ² − tr·λ + det = 0
    const tr = [mr[0] + mr[3], mi[0] + mi[3]];
    const det = [
      mr[0] * mr[3] - mi[0] * mi[3] - (mr[1] * mr[2] - mi[1] * mi[2]),
      mr[0] * mi[3] + mi[0] * mr[3] - (mr[1] * mi[2] + mi[1] * mr[2]),
    ];
    const dr = tr[0] * tr[0] - tr[1] * tr[1] - 4 * det[0];
    const di = 2 * tr[0] * tr[1] - 4 * det[1];
    const mod = Math.hypot(dr, di);
    const sr = Math.sqrt(Math.max((mod + dr) / 2, 0));
    const si = Math.sign(di || 1) * Math.sqrt(Math.max((mod - dr) / 2, 0));
    return {
      re: Float64Array.from([(tr[0] + sr) / 2, (tr[0] - sr) / 2]),
      im: Float64Array.from([(tr[1] + si) / 2, (tr[1] - si) / 2]),
    };
  }
  // n ≥ 3 : polynôme caractéristique par Faddeev–LeVerrier, puis racines
  const I = (k) => k;
  const size = n * n;
  let Mr = Float64Array.from(mr);
  let Mi = Float64Array.from(mi);
  const cr = new Float64Array(n + 1);
  const ci = new Float64Array(n + 1);
  cr[0] = 1;
  let Ar = new Float64Array(size);
  let Ai = new Float64Array(size);
  for (let k = 1; k <= n; k++) {
    if (k === 1) {
      Ar = Float64Array.from(mr);
      Ai = Float64Array.from(mi);
    } else {
      const Nr = new Float64Array(size);
      const Ni = new Float64Array(size);
      for (let i = 0; i < n; i++)
        for (let j = 0; j < n; j++) {
          let sr = 0;
          let si = 0;
          for (let l = 0; l < n; l++) {
            const xr = Mr[i * n + l];
            const xi = Mi[i * n + l];
            const yr = Ar[l * n + j];
            const yi = Ai[l * n + j];
            sr += xr * yr - xi * yi;
            si += xr * yi + xi * yr;
          }
          Nr[i * n + j] = sr;
          Ni[i * n + j] = si;
        }
      Ar = Nr;
      Ai = Ni;
    }
    let trr = 0;
    let tri = 0;
    for (let i = 0; i < n; i++) {
      trr += Ar[i * n + i];
      tri += Ai[i * n + i];
    }
    cr[I(k)] = -trr / k;
    ci[I(k)] = -tri / k;
    for (let i = 0; i < n; i++) {
      Ar[i * n + i] += cr[I(k)];
      Ai[i * n + i] += ci[I(k)];
    }
  }
  return polyRootsComplex(cr, ci);
}

/**
 * Amplitudes complexes au sens des MOINDRES CARRÉS, aux fréquences données.
 *
 * Une fois les fréquences connues, le modèle devient LINÉAIRE en ses
 * amplitudes : x ≈ V a, avec V[n][k] = e^{j2πf_k n}. Les équations normales
 * (VᴴV) a = Vᴴx sont un système d × d — d étant le nombre de sources, deux
 * ou trois en cours — donc l'élimination de Gauss complexe déjà écrite pour
 * ESPRIT suffit, sans rien de nouveau.
 *
 * C'est ce qui ferme la boucle : les méthodes à sous-espace rendent des
 * FRÉQUENCES et rien d'autre. Sans cette étape on sait où sont les raies et
 * pas ce qu'elles valent, et on ne peut donc ni reconstruire le signal, ni
 * dire si le modèle explique ce qu'on a mesuré.
 *
 * La puissance résiduelle ‖x − Va‖²/N est rendue avec : c'est l'estimation
 * de la variance du bruit qui découle du modèle, indépendante de celle que
 * donne le plateau des valeurs propres. Les deux doivent tomber d'accord, et
 * le harnais le vérifie — deux chemins qui concordent valent mieux qu'un
 * chemin qu'on croit sur parole.
 *
 * @param {Float64Array} xr, xi  l'enregistrement complexe
 * @param {Float64Array} freqs   fréquences normalisées (cycles/échantillon)
 * @returns {{re: Float64Array, im: Float64Array, power: Float64Array,
 *            noise: number, residual: number}}
 */
export function lsAmplitudes(xr, xi, freqs) {
  const N = xr.length;
  const d = freqs.length;
  if (d === 0) return { re: new Float64Array(0), im: new Float64Array(0), power: new Float64Array(0), noise: NaN, residual: NaN };

  // VᴴV (d×d) et Vᴴx (d), formés sans jamais matérialiser V (N×d)
  const Ar = new Float64Array(d * d);
  const Ai = new Float64Array(d * d);
  const br = new Float64Array(d * d); // colonne 0 = Vᴴx, le reste à zéro
  const bi = new Float64Array(d * d);
  for (let p = 0; p < d; p++) {
    for (let q = 0; q < d; q++) {
      let sr = 0;
      let si = 0;
      const dw = 2 * Math.PI * (freqs[q] - freqs[p]);
      for (let n = 0; n < N; n++) {
        sr += Math.cos(dw * n);
        si += Math.sin(dw * n);
      }
      Ar[p * d + q] = sr;
      Ai[p * d + q] = si;
    }
    let sr = 0;
    let si = 0;
    const w = 2 * Math.PI * freqs[p];
    for (let n = 0; n < N; n++) {
      const c = Math.cos(w * n);
      const s = Math.sin(w * n);
      // conj(e^{jwn}) · x[n]
      sr += c * xr[n] + s * xi[n];
      si += c * xi[n] - s * xr[n];
    }
    br[p * d] = sr;
    bi[p * d] = si;
  }
  const sol = solveComplex(Ar, Ai, br, bi, d);
  const ar = new Float64Array(d);
  const ai = new Float64Array(d);
  const power = new Float64Array(d);
  for (let k = 0; k < d; k++) {
    ar[k] = sol.re[k * d];
    ai[k] = sol.im[k * d];
    power[k] = ar[k] * ar[k] + ai[k] * ai[k];
  }

  // résidu : ce que le modèle n'explique pas
  let res = 0;
  for (let n = 0; n < N; n++) {
    let mr = 0;
    let mi = 0;
    for (let k = 0; k < d; k++) {
      const w = 2 * Math.PI * freqs[k] * n;
      const c = Math.cos(w);
      const s = Math.sin(w);
      mr += ar[k] * c - ai[k] * s;
      mi += ar[k] * s + ai[k] * c;
    }
    const er = xr[n] - mr;
    const ei = xi[n] - mi;
    res += er * er + ei * ei;
  }
  return { re: ar, im: ai, power, noise: res / N, residual: res };
}
