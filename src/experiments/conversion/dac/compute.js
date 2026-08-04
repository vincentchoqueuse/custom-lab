// Le suréchantillonnage, étape par étape — et ce que chacune fait au spectre.
//
// La chaîne tient en trois gestes, et l'expérience les fait avancer un par un
// sur LES MÊMES DEUX FIGURES : le temporel et le spectre. Voir bouger deux
// dessins qu'on connaît déjà vaut mieux que découvrir six dessins nouveaux —
// et l'étape étant un PARAMÈTRE, chaque scène s'ouvre là où le cours en est,
// avec son URL.
//
//   1. LES ÉCHANTILLONS, à Fs. Leur spectre est périodique de période Fs, et
//      on ne le représente donc que sur [0, Fs/2] : au-delà, il n'y a rien à
//      dire d'un signal cadencé à Fs.
//   2. LE ZÉRO-STUFFING : on insère L−1 zéros entre les échantillons. Et le
//      spectre NE CHANGE PAS — X_up(f) = X(f), exactement, à la précision
//      machine. C'est le cœur de l'expérience, et ça surprend toujours. Ce
//      qui change est la fréquence d'échantillonnage, donc la BANDE qu'on
//      regarde : les copies qui vivaient hors bande sont maintenant dedans,
//      et on les appelle des images.
//      Le prix se lit sur l'amplitude : un échantillon sur L est non nul,
//      donc la puissance moyenne est divisée par L — le filtre suivant devra
//      avoir un gain L pour la rendre.
//   3. LE FILTRE D'INTERPOLATION, sinc fenêtré de coupure Fs/2 et de gain L.
//      Il efface les images et rend l'amplitude. Son noyau vaut EXACTEMENT 1
//      au centre et 0 aux autres multiples de L : le flux interpolé passe
//      donc par les échantillons d'origine sans les déplacer, ce que le
//      harnais épingle à 1e-12.
//
// Pas de bloqueur d'ordre zéro ici : c'est l'étage ANALOGIQUE du CNA, une
// autre histoire (son enveloppe en sinc, son affaissement en bord de bande),
// et la mêler à celle-ci brouillait les deux.
//
// PURE, stateless — runs in a worker; entièrement déterministe (pas de tirage).
import { fft, sinc } from '../../../core/numeric.js';
import { magSpectrum, freqAxis, dbAmpAll, peakNear, tone } from '../../../core/dsp.js';

const FS = 8000; // fréquence d'échantillonnage de départ (Hz)
const N_PLOT = 24; // échantillons de base tracés (3 ms)
const N_SPEC = 256; // échantillons de base analysés
const NFFT = 8192;
const DB_FLOOR = -90;

/**
 * Noyau d'interpolation : sinc fenêtré. Trois propriétés dont dépend toute
 * la chaîne — vaut 1 en 0, 0 aux autres multiples de L, gain continu L.
 */
export function interpKernel(L, half) {
  const taps = 2 * half + 1;
  const h = new Float64Array(taps);
  for (let k = 0; k < taps; k++) {
    const m = k - half;
    h[k] = sinc(m / L) * (0.5 + 0.5 * Math.cos((Math.PI * m) / (half + 1)));
  }
  return h;
}

/** Convolution linéaire, retard de groupe compensé. */
export function filterStream(up, h, half) {
  const n = up.length;
  const taps = h.length;
  const y = new Float64Array(n);
  for (let i = 0; i < n; i++) {
    let acc = 0;
    const kMin = Math.max(0, i + half - n + 1);
    const kMax = Math.min(taps - 1, i + half);
    for (let k = kMin; k <= kMax; k++) acc += h[k] * up[i + half - k];
    y[i] = acc;
  }
  return y;
}

/** |X(f)| en dB sur la grille NFFT, fenêtre de Hann, normalisé par `norm`. */
const spectrumDb = (sig, norm) =>
  dbAmpAll(
    magSpectrum(sig, { nfft: NFFT, window: 'hann' }).map((m) => m / norm),
    DB_FLOOR
  );

/**
 * @param {{f0: number, L: number, stage: string, half: number}} params
 * @returns {{observables: Object}}
 */
export function compute({ f0, L, stage, half }) {
  const nSpec = N_SPEC * L;
  const nPlot = N_PLOT * L;
  const halfTaps = Math.max(1, Math.round(half) * L);

  const x = tone(N_SPEC, f0, { fs: FS });

  const up = new Float64Array(nSpec);
  for (let n = 0; n < N_SPEC; n++) up[n * L] = x[n];

  const h = interpKernel(L, halfTaps);
  const yUp = filterStream(up, h, halfTaps);

  /* ---------- temporel ---------------------------------------------------- */
  // Abscisse en millisecondes, la MÊME aux trois étapes : c'est ce qui fait
  // voir que le signal ne bouge pas et que seule la grille se resserre.
  const msBase = new Float64Array(N_PLOT);
  const vBase = new Float64Array(N_PLOT);
  for (let n = 0; n < N_PLOT; n++) {
    msBase[n] = (1000 * n) / FS;
    vBase[n] = x[n];
  }
  const msUp = new Float64Array(nPlot);
  const vStuffed = new Float64Array(nPlot);
  const vFiltered = new Float64Array(nPlot);
  for (let i = 0; i < nPlot; i++) {
    msUp[i] = (1000 * i) / (FS * L);
    vStuffed[i] = up[i];
    vFiltered[i] = yUp[i];
  }
  const nDense = nPlot * 8;
  const msDense = new Float64Array(nDense);
  const vDense = new Float64Array(nDense);
  for (let i = 0; i < nDense; i++) {
    const t = i / (FS * L * 8);
    msDense[i] = 1000 * t;
    vDense[i] = Math.sin(2 * Math.PI * f0 * t);
  }

  const empty = { x: new Float64Array(0), y: new Float64Array(0) };
  const stemsX = stage === 'samples' ? msBase : msUp;
  const stemsY = stage === 'samples' ? vBase : stage === 'stuffed' ? vStuffed : vFiltered;

  /* ---------- spectre ----------------------------------------------------- */
  // Normalisation commune : le sommet du spectre AVANT filtrage. Les trois
  // étapes se lisent donc sur la même échelle, et la remontée d'amplitude
  // apportée par le gain L du filtre se voit au lieu d'être masquée par un
  // recadrage automatique.
  const ref = spectrumDb(up, 1);
  let peak = -Infinity;
  for (let k = 0; k <= NFFT / 2; k++) peak = Math.max(peak, ref[k]);
  const norm = 10 ** (peak / 20);

  const specStuffed = spectrumDb(up, norm);
  const specFiltered = spectrumDb(yUp, norm);

  const fx = freqAxis(NFFT, FS * L);

  // Étape 1 : le tracé s'arrête à Fs/2. Un NaN coupe la courbe — pas besoin
  // d'une vue de plus ni d'une couche conditionnelle.
  const specNow = new Float64Array(NFFT / 2 + 1);
  for (let k = 0; k <= NFFT / 2; k++) {
    const val = stage === 'filtered' ? specFiltered[k] : specStuffed[k];
    specNow[k] = stage === 'samples' && fx[k] > FS / 2 ? NaN : val;
  }

  // la réponse du filtre, même grille, gain ramené à 0 dB dans la bande
  const hRe = new Float64Array(NFFT);
  const hIm = new Float64Array(NFFT);
  for (let k = 0; k < h.length; k++) hRe[k] = h[k] / L;
  fft(hRe, hIm);
  const respDb = new Float64Array(NFFT / 2 + 1);
  for (let k = 0; k <= NFFT / 2; k++) respDb[k] = dbAmpAll([Math.hypot(hRe[k], hIm[k])], DB_FLOOR)[0];

  /* ---------- ce que la salle doit pouvoir lire --------------------------- */
  const levelAt = (spec, f) => peakNear(spec, f, { fs: FS * L, nfft: NFFT, width: 8 });
  const imageF = FS - f0; // la première image née du zéro-stuffing
  const imageStuffed = levelAt(specStuffed, imageF);
  const imageFiltered = levelAt(specFiltered, imageF);
  const bandFiltered = levelAt(specFiltered, f0);

  let worst = 0;
  for (let n = 0; n < N_SPEC; n++) {
    const i = n * L;
    if (i < yUp.length) worst = Math.max(worst, Math.abs(yUp[i] - x[n]));
  }

  return {
    observables: {
      stems: { x: stemsX, y: stemsY },
      baseSamples: { x: msBase, y: vBase },
      ideal: { x: msDense, y: vDense },
      filtered: stage === 'filtered' ? { x: msUp, y: vFiltered } : empty,

      spectrum: { x: fx, y: specNow },
      response: stage === 'filtered' ? { x: fx, y: respDb } : empty,
      nyquistBase: FS / 2,

      imageLevel: {
        value: stage === 'samples' ? NaN : stage === 'filtered' ? imageFiltered : imageStuffed,
        meta: { label: 'image at Fs − f₀', unit: 'dB', precision: 1 },
      },
      bandLevel: {
        // Le gain rendu par le filtre, en dB au-dessus du flux à zéros. Il
        // vaut 20·log10(L) et pas 0 : le stuffing avait divisé la puissance
        // par L, le noyau de gain continu L la rend. C'est le même fait que
        // le check « puissance ÷ L », lu sur la figure au lieu du tableau.
        value: stage === 'filtered' ? bandFiltered : 0,
        meta: { label: 'gain rendu (= 20·log₁₀ L)', unit: 'dB', precision: 2 },
      },
      rejection: {
        value: stage === 'filtered' ? imageStuffed - imageFiltered : NaN,
        meta: { label: 'filter rejection', unit: 'dB', precision: 1 },
      },
      interpErr: {
        value: stage === 'filtered' ? worst : NaN,
        meta: { label: 'gap to the original samples', precision: 6 },
      },
      nTaps: { value: h.length, meta: { label: 'coefficients' } },
      // niveaux bruts, pour le harnais
      imgStuffedDb: imageStuffed,
      imgFilteredDb: imageFiltered,
    },
  };
}

export { FS, N_SPEC, NFFT };
