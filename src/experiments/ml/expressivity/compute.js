// Le pouvoir d'expression, et ce qu'une STRUCTURE de matrice y change.
//
// Le réseau est le plus simple qui soit : un signal de N points entre, une
// couche linéaire le transforme, une activation le tord, une seconde couche
// linéaire le recombine. Les poids sont TIRÉS AU HASARD et jamais appris —
// c'est volontaire. Ce qu'on regarde ici n'est pas ce qu'un réseau apprend,
// c'est ce qu'il PEUT représenter avant même d'avoir appris quoi que ce soit.
//
// Deux choses se démontrent à l'écran :
//
//   1. SANS activation, deux couches n'en font qu'une. La sortie du réseau
//      W₂·(W₁x) est celle d'une SEULE matrice W₂W₁, à la précision machine —
//      donc empiler des couches linéaires n'achète rigoureusement rien. Le
//      harnais l'épingle à 1e-12, et c'est la justification de tout le reste.
//
//   2. La STRUCTURE de W₁ décide de ce que la couche sait faire.
//      · DENSE : N² poids indépendants. Chaque sortie mélange toutes les
//        entrées, donc la notion de « voisinage temporel » disparaît. Le
//        spectre de sortie n'a plus rien à voir avec celui d'entrée.
//      · TOEPLITZ : W[i][j] ne dépend que de i − j. C'est une convolution,
//        donc un FILTRE : L poids au lieu de N², et le spectre de sortie est
//        celui d'entrée MULTIPLIÉ par |H(f)|. La structure n'est pas une
//        économie de mémoire, c'est un a priori sur le monde — « ce qui
//        compte est local et invariant par translation » — et c'est très
//        exactement ce qu'est une couche de convolution.
//
// Le compteur de paramètres est dans la statline, parce que le rapport N²/L
// est l'argument entier : 16 384 contre 9 à N = 128.
//
// PURE, stateless, seeded — runs in a worker; deterministic at fixed seed.
import { mulberry32, gaussFrom } from '../../../core/rng.js';
import { tone, magSpectrum, freqAxis, dbAmp, timeAxis } from '../../../core/dsp.js';
import { denseMatrix, toeplitzMatrix, matvec, applyAct, ACTIVATIONS } from '../_lib/nn.js';

const N = 128; // longueur du signal (= largeur des couches)
const FS = 128; // Hz — un point par hertz, la lecture la plus simple
const NFFT = 128;
const DB_FLOOR = -60;

/**
 * @param {{structure: string, act: string, kernel: number, scale: number,
 *          signal: string, seed: number}} params
 * @returns {{observables: Object}}
 */
export function compute({ structure, act, kernel, scale, signal, seed }) {
  const gauss = gaussFrom(mulberry32(seed));

  /* ---------- l'entrée ---------------------------------------------------- */
  let x;
  if (signal === 'sine') x = tone(N, 8, { fs: FS });
  else if (signal === 'two') {
    const a = tone(N, 6, { fs: FS });
    const b = tone(N, 20, { fs: FS, amp: 0.8 });
    x = Float64Array.from(a, (v, i) => v + b[i]);
  } else if (signal === 'pulse') {
    x = new Float64Array(N);
    x[N / 2] = 1; // l'impulsion : sa sortie EST la réponse impulsionnelle
  } else {
    x = Float64Array.from({ length: N }, () => gauss());
  }

  /* ---------- la première couche ------------------------------------------ */
  // Le noyau du cas Toeplitz : un filtre RIF aléatoire de `kernel` points.
  // On le tire AVANT la matrice dense pour que les deux structures partagent
  // la même graine de départ — comparer deux tirages différents ne dirait
  // rien de la structure.
  const h = new Float64Array(kernel);
  for (let k = 0; k < kernel; k++) h[k] = (scale * gauss()) / Math.sqrt(kernel);

  const W1 =
    structure === 'dense' ? denseMatrix(N, N, scale, gauss) : toeplitzMatrix(N, N, h);
  const nParams = structure === 'dense' ? N * N : kernel;

  const z = matvec(W1, x, N, N);
  const a1 = applyAct(z, act);

  // Seconde couche : la même structure, pour que le réseau reste homogène.
  const h2 = new Float64Array(kernel);
  for (let k = 0; k < kernel; k++) h2[k] = (scale * gauss()) / Math.sqrt(kernel);
  const W2 =
    structure === 'dense' ? denseMatrix(N, N, scale, gauss) : toeplitzMatrix(N, N, h2);
  const y = matvec(W2, a1, N, N);

  /* ---------- le témoin : le MÊME réseau sans activation ------------------ */
  // C'est la démonstration 1. Deux couches linéaires composées, c'est une
  // matrice — et la sortie ci-dessous est identique à celle d'une seule
  // couche W₂W₁, ce que le harnais vérifie.
  const yLin = matvec(W2, z, N, N);

  /* ---------- tracés ------------------------------------------------------ */
  const t = timeAxis(N, FS);
  const ms = Float64Array.from(t, (v) => 1000 * v);
  const fx = freqAxis(NFFT, FS);
  const norm = (mag) => {
    const peak = Math.max(...mag, 1e-300);
    const out = new Float64Array(mag.length);
    for (let i = 0; i < mag.length; i++) out[i] = dbAmp(mag[i] / peak, DB_FLOOR);
    return out;
  };

  // La réponse en fréquence du noyau, seule courbe qui a un sens dans le cas
  // Toeplitz — et aucun dans le cas dense, où elle n'est donc pas tracée.
  const respDb =
    structure === 'toeplitz' ? norm(magSpectrum(h, { nfft: NFFT })) : new Float64Array(0);
  const respX = structure === 'toeplitz' ? fx : new Float64Array(0);

  // La première LIGNE de W₁ : c'est le dessin qui explique tout. Dense, elle
  // est un bruit sans structure ; Toeplitz, elle est le noyau, décalé — et
  // toutes les autres lignes sont la même, décalée d'un cran.
  const rowIdx = new Float64Array(N);
  const row = new Float64Array(N);
  const rowMid = new Float64Array(N);
  const mid = Math.floor(N / 2);
  for (let j = 0; j < N; j++) {
    rowIdx[j] = j;
    row[j] = W1[8 * N + j];
    rowMid[j] = W1[mid * N + j];
  }

  /* ---------- ce qui se lit en chiffres ----------------------------------- */
  // L'écart entre le réseau avec et sans activation : nul si σ = identité,
  // et c'est la mesure du « pouvoir » que l'activation ajoute.
  let dev = 0;
  let ref = 0;
  for (let i = 0; i < N; i++) {
    dev += (y[i] - yLin[i]) ** 2;
    ref += yLin[i] * yLin[i];
  }
  const nonlin = Math.sqrt(dev / Math.max(ref, 1e-300));

  // Le rang de la couche, mesuré par la plus simple des sondes : le nombre
  // de fréquences que la sortie contient là où l'entrée n'en avait pas.
  const magIn = magSpectrum(x, { nfft: NFFT });
  const magOut = magSpectrum(y, { nfft: NFFT });
  const inPeak = Math.max(...magIn, 1e-300);
  const outPeak = Math.max(...magOut, 1e-300);
  let created = 0;
  for (let k = 1; k < magIn.length; k++)
    if (magIn[k] / inPeak < 0.01 && magOut[k] / outPeak > 0.05) created++;

  return {
    observables: {
      xTime: { x: ms, y: x },
      yTime: { x: ms, y },
      yLinTime: { x: ms, y: yLin },

      specIn: { x: fx, y: norm(magIn) },
      specOut: { x: fx, y: norm(magOut) },
      response: { x: respX, y: respDb },

      rowIdx,
      row: { x: rowIdx, y: row },
      rowMid: { x: rowIdx, y: rowMid },

      nParams: {
        // precision: 0 — sans elle la statline arrondit à quatre chiffres
        // significatifs et 16384 s'affiche 16380, ce qui ruine exactement
        // l'argument que ce nombre porte.
        value: nParams,
        meta: { label: 'poids de la couche', precision: 0 },
      },
      nDense: {
        value: N * N,
        meta: { label: 'poids si dense', precision: 0 },
      },
      ratio: {
        value: (N * N) / nParams,
        meta: { label: 'rapport dense / structuré', precision: 0 },
      },
      nonlinearity: {
        value: nonlin,
        meta: { label: 'écart au réseau linéaire', precision: 4 },
      },
      created: {
        value: created,
        meta: { label: 'fréquences créées', precision: 0 },
      },
    },
  };
}

export { N, FS, NFFT };
