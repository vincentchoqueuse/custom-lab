// La compression d'image par SVD — et le même théorème que l'ACP, sur une
// image plutôt que sur un nuage de points.
//
// Une image en niveaux de gris EST une matrice. Sa décomposition en valeurs
// singulières l'écrit comme une somme de couches de rang 1, σᵢ·uᵢvᵢᵀ, rangées
// de la plus importante à la plus négligeable. Garder les k premières donne
// la MEILLEURE approximation de rang k qui existe — Eckart–Young, exactement
// le théorème de l'expérience précédente, à ceci près qu'on le voit ici avec
// les yeux au lieu de le lire sur une courbe.
//
// Ce que l'expérience fait comprendre, et qu'un cours d'algèbre ne dit pas :
//
//   1. LE GAIN N'EST PAS DANS L'ALGORITHME, IL EST DANS L'IMAGE. La SVD ne
//      compresse rien par elle-même ; elle exploite la décroissance des
//      valeurs singulières. Le fantôme décroît vite, le bruit pas du tout —
//      et le damier, qui a l'air d'être le cas difficile, est de rang 2,
//      parce qu'il est séparable. L'œil ne juge pas du rang, et c'est le
//      résultat qui surprend le plus une salle. Les quatre images sont là,
//      et la comparaison se fait au GEL (touche F) : on fige un spectre, on
//      change d'image, on superpose. C'est le geste que l'application offre
//      partout, et il évite de recalculer quatre décompositions à chaque
//      mouvement du potard — 2.8 s, soit deux fois le garde-fou de cours.
//   2. LE COÛT SE COMPTE. Stocker k couches demande k(m + n + 1) nombres au
//      lieu de m·n. À 128 × 128 et k = 20, c'est 5140 contre 16 384 : un
//      tiers. À k = 5, un douzième — et l'image est déjà reconnaissable.
//   3. L'ERREUR EST CONNUE D'AVANCE. ‖A − Aₖ‖²_F = Σ_{i≥k} σᵢ². On sait donc
//      ce que coûtera une compression AVANT de la faire, ce qui n'est vrai
//      d'aucune méthode heuristique.
//
// L'image n'est pas copiée mais CALCULÉE (voir _lib/images.js) : le fantôme
// de Shepp–Logan est une formule publiée depuis 1974, donc libre de droits
// par construction — contrairement à « Lena », qui ne l'a jamais été.
//
// PURE, stateless, seeded — runs in a worker; deterministic at fixed seed.
import { mulberry32 } from '../../../core/rng.js';
import { svd, lowRank } from '../../../core/linalg.js';
import {
  sheppLogan,
  lowRankImage,
  checkerboard,
  noiseImage,
  toBmpDataUri,
} from '../_lib/images.js';

const N = 128; // image carrée N × N — 110 ms de SVD, tenable en direct
const RANK_MAX = 40; // au-delà, l'œil ne distingue plus rien du tout
const SPEC_FLOOR = 1.2e-3; // plancher d'affichage du spectre (axe log, cf. plus bas)

/**
 * @param {{image: string, k: number, seed: number}} params
 * @returns {{observables: Object}}
 */
export function compute({ image, k, seed }) {
  const rand = mulberry32(seed);
  const src =
    image === 'phantom'
      ? sheppLogan(N)
      : image === 'lowrank'
        ? lowRankImage(N, 4)
        : image === 'checker'
          ? checkerboard(N, 8)
          : noiseImage(N, rand);

  const model = modelFor(image, seed, src);
  const kk = Math.min(Math.max(Math.round(k), 1), N);
  const approx = lowRank(model, N, N, kk);

  /* ---------- ce que la compression coûte et ce qu'elle rend -------------- */
  // Stocker k couches : k vecteurs de m, k de n, k valeurs singulières.
  const stored = kk * (2 * N + 1);
  const full = N * N;

  // Erreur de Frobenius mesurée, et sa valeur EXACTE : la somme des carrés
  // des valeurs singulières jetées.
  let errMeasured = 0;
  for (let i = 0; i < full; i++) errMeasured += (approx[i] - src[i]) ** 2;
  let errTheory = 0;
  for (let i = kk; i < model.s.length; i++) errTheory += model.s[i] * model.s[i];

  // PSNR, la mesure d'usage en image : 10·log10(max²/EQM), max = 1 ici.
  const mse = errMeasured / full;
  const psnr = mse > 0 ? 10 * Math.log10(1 / mse) : Infinity;

  // Le spectre singulier de l'image COURANTE, normalisé à σ₁.
  //
  // Plancher d'AFFICHAGE, et il se choisit : l'axe est logarithmique, les
  // images de rang exact y valent zéro, et un zéro n'a pas de place sur un
  // axe log. Le tracer trois décades sous la plus petite valeur RÉELLE du
  // catalogue (2.2e-2, le bruit) le montre pour ce qu'il est — une falaise
  // suivie d'un plateau au plancher — sans écraser dans le haut du cadre
  // l'effondrement du fantôme, qui est le sujet de la figure. Le domaine de
  // l'axe est fixé au même endroit dans le manifeste, faute de quoi le geste
  // de GEL superposerait deux spectres à des échelles différentes.
  const idx = new Float64Array(RANK_MAX);
  const spec = new Float64Array(RANK_MAX);
  const top = Math.max(model.s[0], 1e-300);
  for (let i = 0; i < RANK_MAX; i++) {
    idx[i] = i + 1;
    spec[i] = Math.max(model.s[i] / top, SPEC_FLOOR);
  }

  /* ---------- l'énergie gardée, et l'erreur en fonction de k -------------- */
  const kAxis = new Float64Array(RANK_MAX + 1);
  const energy = new Float64Array(RANK_MAX + 1);
  const errK = new Float64Array(RANK_MAX + 1);
  let total = 0;
  for (const s of model.s) total += s * s;
  let acc = 0;
  for (let c = 0; c <= RANK_MAX; c++) {
    kAxis[c] = c;
    if (c > 0) acc += model.s[c - 1] * model.s[c - 1];
    energy[c] = (100 * acc) / total;
    errK[c] = Math.max(1 - acc / total, 1e-12);
  }

  return {
    observables: {
      original: { value: toBmpDataUri(src, N), meta: { label: 'original image' } },
      compressed: { value: toBmpDataUri(approx, N), meta: { label: 'rank k' } },
      // la différence, amplifiée : c'est LÀ que se voit ce que k a jeté
      residual: {
        value: toBmpDataUri(
          Float64Array.from(approx, (v, i) => 0.5 + 4 * (v - src[i])),
          N
        ),
        meta: { label: 'residual ×4' },
      },
      singular: { x: idx, y: spec },
      kLine: kk,

      energy: { x: kAxis, y: energy },
      errCurve: { x: kAxis, y: errK },

      // La statline tient sur UNE ligne et la tronque au-delà : ce qui s'y
      // affiche est donc un choix, et les libellés sont courts par
      // nécessité. Cinq lectures — ce que la compression coûte (nombres,
      // facteur), ce qu'elle rend (PSNR), et le théorème lui-même, mesuré
      // puis prédit, de part et d'autre du point médian.
      //
      // Trois quantités restent des observables SANS libellé, donc hors
      // statline : l'énergie gardée et l'erreur relative sont déjà des
      // courbes entières, et la taille pleine ne bouge jamais. Elles
      // servent à l'inspecteur et au harnais, qui les lisent par leur nom.
      kept: { value: energy[kk] },
      stored: { value: stored, meta: { label: 'numbers stored', precision: 0 } },
      fullSize: { value: full },
      ratio: { value: full / stored, meta: { label: 'factor', precision: 2 } },
      psnr: { value: psnr, meta: { label: 'PSNR', unit: 'dB', precision: 1 } },
      errMeas: { value: errMeasured, meta: { label: '‖A−Aₖ‖²', precision: 2 } },
      errTheo: { value: errTheory, meta: { label: 'theory', precision: 2 } },
    },
  };
}

/**
 * La SVD de l'image courante, calculée UNE FOIS par image.
 *
 * Elle ne dépend pas de k : seul le nombre de couches gardées change quand
 * on bouge le potard, et refaire la décomposition à chaque cran coûtait
 * 450 ms par cran. Mémoïsée, le premier affichage d'une image les paie, les
 * mouvements de k sont instantanés — et c'est ce potard-là qu'une salle
 * regarde bouger.
 *
 * Ce n'est pas un état qui change le résultat : `compute` reste fonction de
 * ses seuls arguments, ce que le check de déterminisme vérifie. C'est un
 * cache, au sens strict, et sa clé porte la graine parce que l'image de
 * bruit en dépend.
 *
 * Et il est BORNÉ, parce que cette clé-là est illimitée : chaque appui sur
 * R crée une graine, donc une image de bruit, donc un modèle de 260 ko.
 * Trente minutes de cours à marteler le dé rempliraient la mémoire du
 * worker. Six entrées suffisent aux quatre images plus les deux derniers
 * tirages, et la plus ancienne s'en va — un Map JavaScript conserve l'ordre
 * d'insertion, ce qui donne la file sans rien écrire de plus.
 */
const MODELS = new Map();
const CACHE_MAX = 6;
function modelFor(image, seed, src) {
  const key = `${image}:${image === 'noise' ? seed : 0}`;
  let m = MODELS.get(key);
  if (!m) {
    m = svd(src, N, N);
    MODELS.set(key, m);
    if (MODELS.size > CACHE_MAX) MODELS.delete(MODELS.keys().next().value);
  }
  return m;
}

export { N, RANK_MAX, SPEC_FLOOR };
