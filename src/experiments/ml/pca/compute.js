// L'analyse en composantes principales, sur deux jeux publics classiques :
// l'iris de Fisher (1936) et les manchots de Palmer (2020).
//
// Quatre mesures par individu, donc un nuage dans un espace à quatre
// dimensions que personne ne sait dessiner. L'ACP cherche les directions le
// long desquelles ce nuage s'étale le plus, et les rend par ordre
// décroissant : projeter sur les deux premières donne la meilleure photo
// plane possible du nuage — au sens précis des moindres carrés, pas au sens
// figuré.
//
// Trois choses que l'expérience rend visibles, et qu'un tableau de chiffres
// ne rend pas :
//
//   1. DEUX composantes suffisent. 97.8 % de la variance sur l'iris brut, et
//      les trois espèces se séparent à l'œil sur une figure plane. C'est
//      l'usage « visualisation », le plus courant.
//   2. STANDARDISER OU NON change la réponse, et beaucoup. Sans, on
//      diagonalise la covariance, donc la variable aux plus grands nombres
//      domine. Sur l'iris c'est visible — CP1 est presque uniquement la
//      longueur de pétale. Sur les manchots c'est une caricature : la masse
//      est en GRAMMES, sa variance vaut 643 000 contre 30 pour la longueur
//      du bec, et CP1 emporte 99.99 % de la variance en n'étant QUE la
//      masse. Standardisé, le même jeu rend 68.84 % et CP1 devient la
//      longueur de nageoire. C'est le critère de choix, et il est objectif :
//      une méthode dont la réponse change quand on passe des grammes aux
//      kilogrammes doit être employée en le sachant.
//   3. L'ERREUR DE RECONSTRUCTION a une valeur exacte : la somme des valeurs
//      propres jetées. Ce n'est pas une borne ni une approximation, c'est le
//      théorème d'Eckart–Young, et le harnais le vérifie à 1e-12. L'ACP est
//      donc la MEILLEURE compression linéaire, démontrablement.
//
// Le lien à faire avec le reste du catalogue : c'est la même décomposition
// propre de covariance que dans « techniques haute résolution ». Là-bas les
// grandes valeurs propres étaient le signal et les petites le bruit ; ici
// les grandes sont ce qu'on garde et les petites ce qu'on jette. Même
// algèbre, deux lectures.
//
// PURE, stateless, DÉTERMINISTE : aucun tirage, donc pas de graine et pas de
// dé dans la barre d'actions.
import {
  IRIS,
  IRIS_FEATURES,
  IRIS_SPECIES,
  PENGUINS,
  PENGUIN_FEATURES,
  PENGUIN_SPECIES,
} from '../_lib/datasets.js';
import { pca, reconstruct, meanSquaredError } from '../_lib/pca.js';

const P = 4; // quatre mesures dans les deux jeux, ce qui les rend comparables

/** Les deux jeux, décrits de la même façon pour que le compute n'ait qu'un
 *  chemin. Les manchots portent une masse en GRAMMES : c'est ce qui rend le
 *  piège des unités écrasant plutôt que discret. */
const DATASETS = {
  iris: { rows: IRIS, features: IRIS_FEATURES, species: IRIS_SPECIES, unit: 'cm²' },
  penguins: {
    rows: PENGUINS,
    features: PENGUIN_FEATURES,
    species: PENGUIN_SPECIES,
    unit: 'unités mixtes²',
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

  /* ---------- le nuage projeté, une espèce par couleur -------------------- */
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

  /* ---------- l'éboulis (scree) ------------------------------------------- */
  const comp = new Float64Array(P);
  const ratioPct = new Float64Array(P);
  const cumPct = new Float64Array(P);
  for (let c = 0; c < P; c++) {
    comp[c] = c + 1;
    ratioPct[c] = 100 * model.ratio[c];
    cumPct[c] = 100 * model.cumulative[c];
  }

  /* ---------- les saturations (loadings) ---------------------------------- */
  // La contribution de chaque variable d'origine aux deux composantes
  // affichées. C'est ce qui permet de DIRE ce qu'une composante mesure, au
  // lieu de la laisser sans nom.
  const varIdx = new Float64Array(P);
  const loadX = new Float64Array(P);
  const loadY = new Float64Array(P);
  for (let j = 0; j < P; j++) {
    varIdx[j] = j;
    loadX[j] = model.vectors[j * P + cx];
    loadY[j] = model.vectors[j * P + cy];
  }

  /* ---------- reconstruction : mesuré contre théorie exacte --------------- */
  const errMeas = new Float64Array(P + 1);
  const errTheo = new Float64Array(P + 1);
  const kAxis = new Float64Array(P + 1);
  for (let c = 0; c <= P; c++) {
    kAxis[c] = c;
    const R = reconstruct(model, N, P, c);
    // sur données standardisées, l'erreur se mesure dans l'espace réduit —
    // sinon on comparerait des centimètres à des écarts-types
    let e = 0;
    for (let i = 0; i < N; i++)
      for (let j = 0; j < P; j++) e += ((R[i * P + j] - X[i * P + j]) / model.sds[j]) ** 2;
    errMeas[c] = e / N;
    // Eckart–Young : ce qui reste est la somme des valeurs propres jetées,
    // au facteur (n−1)/n près puisque la covariance est non biaisée
    let t = 0;
    for (let c2 = c; c2 < P; c2++) t += model.values[c2];
    errTheo[c] = (t * (N - 1)) / N;
  }

  const recon = reconstruct(model, N, P, kk);
  const mseK = meanSquaredError(recon, X, N, P);

  return {
    observables: {
      // trois classes dans les deux jeux : les mêmes trois nuages, nommés
      // par le jeu courant dans la légende via le manifeste
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
        meta: { label: 'variance CP1', unit: '%', precision: 2 },
      },
      pc12: {
        value: cumPct[1],
        meta: { label: 'CP1 + CP2', unit: '%', precision: 2 },
      },
      kept: {
        value: cumPct[kk - 1],
        meta: { label: `variance gardée avec k = ${kk}`, unit: '%', precision: 2 },
      },
      mse: {
        value: mseK,
        meta: { label: 'erreur de reconstruction', unit: D.unit, precision: 4 },
      },
      dominant: {
        // Ce que la première composante mesure vraiment, nommé : la variable
        // dont la saturation est la plus forte. Sur l'iris brut c'est la
        // longueur de pétale, et ça change avec la standardisation.
        value: D.features[argMax(loadX)],
        meta: { label: 'CP1 dominated by' },
      },
      species: { value: D.species.join(', '), meta: { label: 'species' } },
      nRows: { value: N, meta: { label: 'individus', precision: 0 } },
    },
  };
}

const argMax = (a) => {
  let b = 0;
  for (let i = 1; i < a.length; i++) if (Math.abs(a[i]) > Math.abs(a[b])) b = i;
  return b;
};

export { P, DATASETS };
