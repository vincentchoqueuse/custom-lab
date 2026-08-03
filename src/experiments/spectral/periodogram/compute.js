// Estimer un spectre à partir d'un enregistrement BRUITÉ — et découvrir que
// la méthode évidente ne marche pas.
//
// Le périodogramme P(f) = |X(f)|²/(Fs·Σw²) est l'estimateur naturel de la
// densité spectrale de puissance. Il a une propriété que tout le monde
// suppose et que personne ne vérifie :
//
//   IL N'EST PAS CONSISTANT. Sa variance NE DÉCROÎT PAS avec N.
//
// Sur du bruit blanc, chaque point du périodogramme suit une loi
// σ⁴·χ²₂/2 : son écart-type ÉGALE sa moyenne, quel que soit le nombre
// d'échantillons. Multiplier N par seize divise la largeur des raies par
// seize et ne calme pas l'herbe d'un décibel — on obtient seize fois plus
// de points, tout aussi bruités. C'est le résultat contre-intuitif de tout
// le chapitre, et il se voit en une seconde : `stdRatio` reste collé à 1.
//
// Ce qui marche, c'est de MOYENNER des périodogrammes indépendants, en
// payant la résolution :
//
//   BARTLETT  K segments disjoints de longueur L, moyennés.
//             Variance / K, résolution Fs/L au lieu de Fs/N.
//   WELCH     mêmes segments, recouverts à 50 % et fenêtrés. À longueur de
//             segment égale on en obtient presque deux fois plus, donc
//             moins de variance pour la même résolution — le recouvrement
//             récupère l'information que la fenêtre atténue sur les bords.
//
// Le signal est deux sinusoïdes dans du bruit : une forte, et une FAIBLE
// que l'on cherche. Elle se perd de deux façons distinctes, et il faut les
// nommer séparément en cours — sous l'herbe du bruit (c'est la variance,
// que Welch soigne) ou sous les lobes secondaires de la voisine (c'est la
// fuite, que seule la fenêtre soigne).
//
// PURE, stateless, seeded — runs in a worker; deterministic at fixed seed.
import { fft, windowValue, dbToLin } from '../../../core/numeric.js';
import { mulberry32, gaussFrom } from '../../../core/rng.js';

const FS = 1000; // Hz
const F1 = 150; // raie forte (Hz)
const DB_FLOOR = -120;
// La raie forte est à 150 Hz et l'écart maximal est de 200 Hz : au-dessus de
// 400 Hz il n'y a jamais de raie, quelle que soit la scène. C'est là qu'on
// mesure la fluctuation de l'estimateur.
const MEAS_LO = 400;

/**
 * dB d'une PUISSANCE : 10·log10, pas 20.
 *
 * `core/numeric.js` expose `toDb`, qui vaut 20·log10 — la convention des
 * AMPLITUDES, correcte partout ailleurs dans le catalogue parce qu'on l'y
 * applique à des modules |X|. Une densité spectrale est déjà une puissance :
 * l'y passer doublait tous les décibels de l'expérience en silence, et
 * l'écart entre les deux raies affichait 2·A₂ au lieu de A₂. Le check
 * « la raie faible est exactement A₂ dB sous la forte » existe pour que
 * cela ne puisse pas repasser.
 */
const powerDb = (v) => Math.max(DB_FLOOR, 10 * Math.log10(v + 1e-300));

/**
 * Périodogramme moyenné d'un enregistrement.
 *
 * Normalisation DENSITÉ : P = |X|² / (Fs · Σw²). C'est celle qui rend
 * E[P] = σ²/Fs sur du bruit blanc de variance σ², indépendamment de la
 * fenêtre et de la longueur — donc celle dont on peut vérifier la valeur
 * exacte plutôt que la forme.
 *
 * @param {Float64Array} x  l'enregistrement
 * @param {number} L        longueur de segment (puissance de 2)
 * @param {number} hop      décalage entre segments (L = disjoint, L/2 = 50 %)
 * @param {string} win      fenêtre appliquée à chaque segment
 * @returns {{f: Float64Array, psd: Float64Array, segments: number}}
 */
export function averagedPeriodogram(x, L, hop, win) {
  const rows = L / 2 + 1;
  const psd = new Float64Array(rows);
  const w = new Float64Array(L);
  let wSum2 = 0;
  for (let n = 0; n < L; n++) {
    w[n] = windowValue(win, n, L);
    wSum2 += w[n] * w[n];
  }
  const re = new Float64Array(L);
  const im = new Float64Array(L);
  let segments = 0;
  for (let start = 0; start + L <= x.length; start += hop) {
    for (let n = 0; n < L; n++) {
      re[n] = x[start + n] * w[n];
      im[n] = 0;
    }
    fft(re, im);
    for (let k = 0; k < rows; k++) psd[k] += re[k] * re[k] + im[k] * im[k];
    segments++;
  }
  const norm = FS * wSum2 * segments;
  for (let k = 0; k < rows; k++) psd[k] /= norm;
  const f = new Float64Array(rows);
  for (let k = 0; k < rows; k++) f[k] = (k * FS) / L;
  return { f, psd, segments };
}

/** Longueur de segment et décalage effectifs de chaque méthode. */
export function segmentation(method, N, L) {
  if (method === 'raw') return { L: N, hop: N };
  const eff = Math.min(L, N);
  return { L: eff, hop: method === 'welch' ? eff / 2 : eff };
}

/**
 * Fluctuation relative de l'estimateur, mesurée SUR UNE BANDE SANS RAIE.
 * C'est le nombre qui porte toute la leçon : ≈ 1 pour le périodogramme brut
 * quel que soit N, ≈ 1/√K après moyennage de K segments.
 *
 * La bande, et pas une garde de quelques bins autour des raies : une garde
 * en BINS rétrécit en hertz quand N grandit, si bien que la fuite de la raie
 * forte rentrait dans la mesure et faisait dériver le nombre de 1.03 à 2.05
 * quand on allongeait l'enregistrement — exactement la conclusion inverse de
 * celle que l'expérience enseigne, et pour une raison qui n'avait rien à voir
 * avec l'estimateur. Mesuré sur [MEAS_LO, Fs/2], où aucune raie ne peut
 * tomber, le résultat recoupe une référence bruit-seul à 2 % près sur toute
 * la plage des paramètres, fenêtre rectangulaire et SNR de 40 dB compris.
 */
export function fluctuation(f, psd, fLo = MEAS_LO) {
  let s = 0;
  let s2 = 0;
  let n = 0;
  for (let k = 1; k < f.length - 1; k++) {
    if (f[k] < fLo) continue;
    s += psd[k];
    s2 += psd[k] * psd[k];
    n++;
  }
  if (n < 2) return { mean: NaN, ratio: NaN, n };
  const mean = s / n;
  const varr = Math.max(s2 / n - mean * mean, 0);
  return { mean, ratio: Math.sqrt(varr) / mean, n };
}

/**
 * @param {{method: string, win: string, N: number, L: number, snr: number,
 *          a2: number, df: number, seed: number}} params
 * @returns {{observables: Object}}
 */
export function compute({ method, win, N, L, snr, a2, df, seed }) {
  const gauss = gaussFrom(mulberry32(seed));

  // σ est fixé par le SNR de la raie FORTE : puissance A₁²/2 = 0.5
  const sigma = Math.sqrt(0.5 / dbToLin(snr));
  const f2 = F1 + df;
  // A₂ est un niveau en dB, donc un rapport de PUISSANCES : l'amplitude est
  // la racine. dbToLin rend 10^(dB/10), une puissance — s'en servir tel quel
  // comme amplitude descendait la raie de 2·A₂ dB au lieu de A₂, et à −20 dB
  // elle sortait à 0.6 dB du plancher au lieu de 20 dB au-dessous de sa
  // voisine. Le check « la raie faible est A₂ dB sous la forte » l'épingle.
  const a2Lin = Math.sqrt(dbToLin(a2));

  const t = new Float64Array(N);
  const x = new Float64Array(N);
  for (let i = 0; i < N; i++) {
    t[i] = i / FS;
    x[i] =
      Math.sin(2 * Math.PI * F1 * t[i]) +
      a2Lin * Math.sin(2 * Math.PI * f2 * t[i]) +
      sigma * gauss();
  }

  /* ---------- l'estimateur choisi, et le périodogramme brut derrière ----- */
  const seg = segmentation(method, N, L);
  const est = averagedPeriodogram(x, seg.L, seg.hop, win);
  // toujours calculé, toujours tracé en gris : c'est le point de comparaison,
  // et « regardez ce que Welch fait à cette herbe » ne se dit qu'en la voyant
  const raw = averagedPeriodogram(x, N, N, win);

  const noiseLevel = (sigma * sigma) / FS; // E[P] sur du bruit blanc
  const fl = fluctuation(est.f, est.psd);
  const flRaw = fluctuation(raw.f, raw.psd);

  const toDbArr = (a) => Float64Array.from(a, powerDb);

  /* ---------- la loi en 1/√K, balayée ----------------------------------- */
  // La même mesure répétée pour des segments de plus en plus courts : c'est
  // la vue qui transforme « la moyenne réduit la variance » en une droite
  // de pente −1/2 sur un log-log.
  const ks = [];
  const ratios = [];
  const theory = [];
  for (let Ls = N; Ls >= 32; Ls /= 2) {
    const s = segmentation(method === 'raw' ? 'bartlett' : method, N, Ls);
    const e = averagedPeriodogram(x, s.L, s.hop, win);
    if (e.segments < 1) continue;
    const r = fluctuation(e.f, e.psd);
    if (!Number.isFinite(r.ratio) || r.n < 8) continue;
    ks.push(e.segments);
    ratios.push(r.ratio);
    theory.push(1 / Math.sqrt(e.segments));
  }
  const order = ks.map((_, i) => i).sort((i, j) => ks[i] - ks[j]);

  return {
    observables: {
      signal: { x: t, y: x },
      psd: { x: est.f, y: toDbArr(est.psd) },
      psdRaw: { x: raw.f, y: toDbArr(raw.psd) },
      noiseFloor: powerDb(noiseLevel), // hline : le vrai niveau σ²/Fs
      f1: F1, // vline : la raie forte
      f2, // vline : la raie faible, celle qu'on cherche
      fluctVsK: {
        x: Float64Array.from(order, (i) => ks[i]),
        y: Float64Array.from(order, (i) => ratios[i]),
      },
      fluctTheory: {
        x: Float64Array.from(order, (i) => ks[i]),
        y: Float64Array.from(order, (i) => theory[i]),
      },
      segments: { value: est.segments, meta: { label: 'segments moyennés K' } },
      fRes: {
        value: FS / seg.L,
        meta: { label: 'résolution Fs/L', unit: 'Hz', precision: 2 },
      },
      stdRatio: {
        value: fl.ratio,
        meta: { label: 'fluctuation d’un bin à l’autre', precision: 3 },
      },
      stdRatioRaw: {
        value: flRaw.ratio,
        meta: { label: 'la même, sans moyenner', precision: 3 },
      },
      verdict: {
        value:
          est.segments === 1
            ? 'non consistant : σ/moyenne ≈ 1 quel que soit N'
            : `variance divisée par ≈ ${est.segments}`,
        meta: { label: 'estimateur' },
      },
    },
  };
}
