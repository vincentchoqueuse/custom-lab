// Un filtre qui s'ajuste tout seul — et ce que coûte chaque façon de le faire.
//
// Le montage est celui de l'IDENTIFICATION : un système inconnu w* reçoit
// une entrée u(n) et rend une sortie qu'on n'observe que bruitée. Le filtre
// adaptatif ne voit que u et d, et remonte à w* une itération à la fois.
// C'est le montage de l'annulation d'écho, du débruitage par référence et
// de l'égalisation — à un câblage près, toujours le même schéma.
//
// TROIS CHOSES SE LISENT ICI, et chacune a sa vue :
//   1. la courbe d'apprentissage descend jusqu'à un PALIER, jamais jusqu'à
//      zéro : le gradient est estimé sur un seul échantillon, donc il
//      fluctue, donc ŵ danse autour de w*. L'excès s'appelle le
//      désajustement et vaut μ·tr(R)/2 — il est PROPORTIONNEL au pas, quand
//      la vitesse de convergence l'est aussi. Tout le réglage est là.
//   2. le conditionnement de R fixe la vitesse de LMS et RIEN d'autre chez
//      RLS. Colorer l'entrée (a → 0.95) ralentit LMS d'un facteur qui se
//      mesure ; RLS ne bouge pas.
//   3. se tromper de pas ne dégrade pas : ça diverge. La borne est
//      μ < 2/tr(R), et on la franchit en direct.
//
// L'ITÉRATION EST UN PARAMÈTRE, ce qui évite tout moteur d'animation : la
// trajectoire complète est une fonction pure de (params, seed), on la
// calcule d'un coup et le potard `n` balaie dedans. La scène reste
// reproductible par son URL, gelable et exportable — ce qu'une animation
// qui joue toute seule n'est pas.
//
// PURE, stateless, seeded — runs in a worker; deterministic at fixed seed.
import { noiseSigma } from '../../../core/dsp.js';
import { mulberry32, gaussFrom } from '../../../core/rng.js';
import { toDb } from '../../../core/numeric.js';
import {
  trueChannel,
  ar1Input,
  toeplitzAR1,
  eigSpread,
  quadForm,
  runAdaptive,
  costContour,
  msBound,
} from '../_lib/adaptive.js';

const N_ITER = 3000; // itérations d'adaptation
const N_RUNS = 24; // réalisations moyennées pour la courbe d'apprentissage
const SWITCH_AT = 1500; // le canal saute à mi-parcours, en mode poursuite

/**
 * @param {{algo: string, mu: number, lambda: number, L: number, a: number,
 *          snr: number, n: number, track: boolean, seed: number}} params
 * @returns {{observables: Object}}
 */
export function compute({ algo, mu, lambda, L, a, snr, n, track, seed }) {
  const wTrue = trueChannel(L, 0);
  const wAfter = track ? trueChannel(L, 1) : null;
  const R = toeplitzAR1(a, L);
  const { spread, max: lMax, values: eigVals } = eigSpread(R, L);

  // Puissance du signal utile, EXACTEMENT : w*ᵀRw*. Le bruit s'en déduit,
  // de sorte que le SNR affiché soit le vrai et pas une approximation
  // « ‖w*‖² = 1 donc puissance 1 », qui serait fausse dès que l'entrée est
  // colorée.
  const sigPow = quadForm(R, wTrue, L);
  const sigmaV = noiseSigma(sigPow, snr);
  const noisePow = sigmaV * sigmaV;

  // La courbe d'apprentissage est une MOYENNE D'ENSEMBLE : e²(n) d'une
  // seule réalisation fluctue sur deux décades et l'œil y lit une
  // décroissance qui n'a pas eu lieu. La réalisation 0 sert, elle, aux vues
  // qui montrent un filtre PARTICULIER (coefficients, trajectoire) — c'est
  // le même partage que dans les expériences d'estimation.
  const mse = new Float64Array(N_ITER);
  const exc = new Float64Array(N_ITER);
  let wPath = null;
  let wFinal = null;
  let diverged = false;
  for (let r = 0; r < N_RUNS; r++) {
    const gauss = gaussFrom(mulberry32(seed + r * 7919));
    const u = ar1Input(N_ITER, a, gauss);
    const res = runAdaptive({
      algo,
      mu,
      lambda,
      L,
      N: N_ITER,
      u,
      wTrue,
      wAfter,
      switchAt: track ? SWITCH_AT : 0,
      sigmaV,
      gauss,
      keepPath: r === 0,
      R,
    });
    for (let i = 0; i < N_ITER; i++) {
      mse[i] += res.e2[i] / N_RUNS;
      exc[i] += res.ex[i] / N_RUNS;
    }
    if (r === 0) {
      wPath = res.wPath;
      wFinal = res.wFinal;
    }
    diverged = diverged || res.diverged;
  }

  const mseDb = new Float64Array(N_ITER);
  const excDb = new Float64Array(N_ITER);
  const iters = new Float64Array(N_ITER);
  for (let i = 0; i < N_ITER; i++) {
    iters[i] = i + 1;
    mseDb[i] = toDb(Math.sqrt(Math.max(mse[i], 1e-30)));
    excDb[i] = toDb(Math.sqrt(Math.max(exc[i], 1e-30)));
  }
  const floorDb = toDb(Math.sqrt(noisePow));

  /* ---------- ce que la courbe dit, en chiffres ---------------------------- */
  // Le palier : la moyenne du dernier quart, avant le saut s'il y en a un.
  const from = track ? Math.floor(SWITCH_AT * 0.75) : Math.floor(N_ITER * 0.75);
  const to = track ? SWITCH_AT : N_ITER;
  let plateau = 0;
  let plateauEx = 0;
  for (let i = from; i < to; i++) {
    plateau += mse[i] / (to - from);
    plateauEx += exc[i] / (to - from);
  }
  // Le palier n'en est un que s'il ne descend plus. À très petit pas —
  // ou à fort conditionnement — 3000 itérations ne suffisent pas, et le
  // « désajustement » lu serait celui d'une convergence encore en cours.
  // On compare donc les deux moitiés de la fenêtre : tant qu'elles
  // diffèrent, la statline affiche « — » plutôt qu'un nombre faux.
  const mid = Math.floor((from + to) / 2);
  let exEarly = 0;
  let exLate = 0;
  for (let i = from; i < mid; i++) exEarly += exc[i] / (mid - from);
  for (let i = mid; i < to; i++) exLate += exc[i] / (to - mid);
  const settled = exEarly < 1.2 * exLate;
  // Désajustement : l'excès d'EQM rapporté au plancher. Sa théorie tient en
  // une ligne, d'où l'intérêt — encore faut-il le MESURER juste. Lu sur
  // e², il faudrait extraire quelques pour-cent d'excès de la variance du
  // bruit lui-même : au pas nominal la lecture se trompe alors d'un facteur
  // 1.5, ce qui est pire que ne rien afficher. Lu sur w̃ᵀRw̃, le bruit
  // n'entre pas et la mesure tombe sur la théorie (vérifié par le harnais).
  // Divergé, il n'y a plus de palier : ni le mesuré ni la théorie n'ont de
  // sens (la formule passerait même NÉGATIVE, μ·tr(R) dépassant 2), et la
  // statline doit dire « — » plutôt que d'afficher un nombre qui ne veut
  // rien dire à côté du mot « divergé ».
  const misMeas = diverged || !settled ? NaN : plateauEx / noisePow;
  const trR = L; // tr(R) = L·σ_u² et σ_u² = 1 par construction
  const misTheo =
    algo === 'lms'
      ? (mu * trR) / (2 - mu * trR)
      : algo === 'nlms'
        ? // μ̃/(2−μ̃) est un ASYMPTOTIQUE EN L, pas une formule fausse : il
          // sort de l'approximation E[x xᵀ/‖x‖²] ≈ I/L, vraie quand L est
          // grand, et les ouvrages l'énoncent comme telle. Ce qui serait
          // faux est de l'appliquer tel quel à L = 4, où il manque d'un
          // facteur 2. Le terme que l'approximation jette vaut exactement
          // E[‖x‖²]·E[1/‖x‖²] = L/(L−2) pour un régresseur blanc gaussien,
          // puisque E[1/χ²_L] = 1/(L−2).
          //
          // Mesuré en run long (N = 60 000, 24 réalisations, μ̃ = 0.5), le
          // rapport au résultat asymptotique vaut 1.978, 1.321, 1.137 et
          // 1.061 pour L = 4, 8, 16 et 32 — soit L/(L−2) à 1 % près. Ce
          // n'est donc pas un artefact de fenêtre de mesure, et rien n'est
          // converti en décibels ici : le désajustement est un rapport de
          // puissances.
          //
          // À L = 2 la correction DIVERGE, E[1/χ²₂] étant infinie, et la
          // statline affiche « — » plutôt qu'un nombre : c'est une
          // propriété de NLMS, pas un trou dans le calcul.
          L > 2
          ? ((mu / (2 - mu)) * L) / (L - 2)
          : NaN
        : lambda < 1
          ? ((1 - lambda) * L) / 2
          : 0;

  // Vitesse : la première itération où la courbe passe à 3 dB du palier.
  // Mesurée sur la courbe moyennée, donc reproductible.
  const target = plateau * 2;
  let n3 = NaN;
  for (let i = 0; i < to; i++)
    if (mse[i] <= target) {
      n3 = i + 1;
      break;
    }

  /* ---------- les coefficients à l'itération choisie ----------------------- */
  const nIdx = Math.min(Math.max(Math.round(n), 1), N_ITER) - 1;
  const taps = new Float64Array(L);
  const tapsTrue = new Float64Array(L);
  const idx = new Float64Array(L);
  for (let k = 0; k < L; k++) {
    idx[k] = k;
    taps[k] = wPath[nIdx * L + k];
    tapsTrue[k] = (track && nIdx >= SWITCH_AT ? wAfter : wTrue)[k];
  }
  let wErr = 0;
  for (let k = 0; k < L; k++) wErr += (taps[k] - tapsTrue[k]) ** 2;
  wErr = Math.sqrt(wErr);

  /* ---------- les poids en fonction du temps ------------------------------ */
  // Les L trajectoires ŵₖ(n) et les L valeurs vraies, en DEUX observables et
  // pas 2L : un seul tracé, coupé par des NaN, que le tracé générique
  // interrompt à chaque coupure. C'est la vue qui montre l'adaptation elle-
  // même — le filtre qui se remplit coefficient par coefficient — quand la
  // courbe d'apprentissage n'en montre que le résumé quadratique.
  const dec = Math.max(1, Math.floor((nIdx + 1) / 500));
  const perTrack = Math.floor(nIdx / dec) + 1;
  const trackLen = (perTrack + 1) * L;
  const wtX = new Float64Array(trackLen);
  const wtY = new Float64Array(trackLen);
  const wrX = new Float64Array(3 * L);
  const wrY = new Float64Array(3 * L);
  for (let k = 0; k < L; k++) {
    const base = k * (perTrack + 1);
    for (let i = 0; i < perTrack; i++) {
      wtX[base + i] = i * dec + 1;
      wtY[base + i] = wPath[i * dec * L + k];
    }
    wtX[base + perTrack] = NaN; // la coupure entre deux coefficients
    wtY[base + perTrack] = NaN;
    // la valeur vraie, en segment horizontal sur toute la durée
    wrX[k * 3] = 1;
    wrY[k * 3] = tapsTrue[k];
    wrX[k * 3 + 1] = nIdx + 1;
    wrY[k * 3 + 1] = tapsTrue[k];
    wrX[k * 3 + 2] = NaN;
    wrY[k * 3 + 2] = NaN;
  }

  /* ---------- la descente dans le plan des poids -------------------------- */
  // Deux coefficients suffisent à voir la géométrie, et c'est la seule
  // façon de VOIR pourquoi le conditionnement coûte : à L = 2 le tracé est
  // la surface d'erreur elle-même. Au-delà, c'est la projection sur les
  // deux premiers axes — encore lisible, mais les iso-contours n'auraient
  // plus de sens et ne sont donc pas dessinés du tout.
  const stride = Math.max(1, Math.floor((nIdx + 1) / 600));
  const pts = Math.floor(nIdx / stride) + 1;
  const px = new Float64Array(pts);
  const py = new Float64Array(pts);
  for (let i = 0; i < pts; i++) {
    px[i] = wPath[i * stride * L];
    py[i] = wPath[i * stride * L + 1];
  }
  const wStart = { x: Float64Array.of(0), y: Float64Array.of(0) };
  const wOpt = { x: Float64Array.of(tapsTrue[0]), y: Float64Array.of(tapsTrue[1]) };
  const empty = { x: new Float64Array(0), y: new Float64Array(0) };
  // Trois niveaux, en fractions du coût au point de DÉPART ŵ = 0, qui vaut
  // exactement (0−w*)ᵀR(0−w*) = w*ᵀRw*. Volontairement bien en dessous : un
  // contour passant par le départ étirerait le cadre sur toute la longueur
  // de l'ellipse — quatre fois la distance à l'optimum quand l'entrée est
  // colorée — et le zigzag qu'on vient regarder tiendrait dans dix pixels.
  // L'allongement des ellipses reste parfaitement lisible à ces niveaux.
  const c0 = L === 2 ? quadForm(R, tapsTrue, 2) : 0;
  const contours =
    L === 2
      ? [0.06, 0.18, 0.4].map((f) => costContour(R, tapsTrue, f * c0))
      : [empty, empty, empty];

  return {
    observables: {
      // la courbe d'apprentissage, et ce qu'elle vise
      learning: { x: iters, y: mseDb },
      floorDb,
      plateauDb: toDb(Math.sqrt(Math.max(plateau, 1e-30))),
      switchLine: track ? SWITCH_AT : NaN,
      nLine: nIdx + 1,

      // les poids en fonction du temps : L trajectoires en un seul tracé
      wTracks: { x: wtX, y: wtY },
      wRefs: { x: wrX, y: wrY },

      // les coefficients à l'itération n
      tapsTrue: { x: idx, y: tapsTrue },
      taps: { x: idx, y: taps },

      // le plan des poids
      wTrack: { x: px, y: py },
      wStart,
      wOpt,
      contour1: contours[0],
      contour2: contours[1],
      contour3: contours[2],

      spread: {
        value: spread,
        meta: { label: 'conditionnement λmax/λmin', precision: 1 },
      },
      lambdaMax: { value: lMax, meta: { label: 'λmax', precision: 2 } },
      muMax: {
        // La borne des livres — NÉCESSAIRE seulement : elle fait converger
        // la moyenne de ŵ, pas sa variance. Le pas réel de divergence est
        // toujours en dessous, et la scène 2 le fait constater.
        value: 2 / L,
        meta: { label: 'borne en moyenne 2/tr(R)', precision: 4 },
      },
      muMs: {
        // Celle qui prédit : Σ μλ/(1−μλ) = 2. Elle tombe sur le seuil mesuré
        // à 3 % près sur entrée blanche, et devient optimiste d'un facteur
        // 2.7 à a = 0.9 — l'hypothèse d'indépendance y casse.
        value: msBound(eigVals),
        meta: { label: 'borne quadratique', precision: 4 },
      },
      misMeas: { value: misMeas, meta: { label: 'désajustement mesuré', precision: 3 } },
      misTheo: {
        value: diverged || !(misTheo >= 0) ? NaN : misTheo,
        meta: { label: 'théorie', precision: 3 },
      },
      n3: { value: n3, meta: { label: 'itérations pour −3 dB du palier', precision: 0 } },
      wErrObs: { value: wErr, meta: { label: '‖ŵ(n) − w*‖', precision: 4 } },
      state: {
        value: diverged ? '⚠ divergé' : settled ? 'palier atteint' : 'convergence en cours',
        meta: { label: 'régime' },
      },
      excess: { x: iters, y: excDb },
    },
  };
}
