// Au-delà de la résolution de Fourier — et à quel prix.
//
// Le périodogramme ne sépare pas deux raies plus proches que Fs/N. Ce n'est
// pas un défaut d'algorithme : c'est la conséquence d'une hypothèse
// MINIMALE, celle de ne rien supposer du signal. Les méthodes à haute
// résolution font l'inverse — elles POSTULENT un modèle, « d exponentielles
// complexes dans du bruit blanc » — et ce postulat achète une résolution
// que Fourier ne peut pas atteindre. Toute l'expérience tient dans le prix
// de ce marché.
//
// La covariance R = E[x xᴴ] d'un tel signal a une structure très
// particulière : ses M valeurs propres se séparent en d GRANDES (le
// sous-espace signal) et M−d égales à σ² (le sous-espace bruit). Les
// vecteurs propres du bruit sont orthogonaux à toutes les exponentielles
// présentes, ce qui donne trois estimateurs :
//
//   MUSIC        balaie 1/‖Eₙᴴa(f)‖² : là où a(f) tombe dans le signal, le
//                dénominateur s'annule et le pseudo-spectre explose.
//   root-MUSIC   annule le même dénominateur ALGÉBRIQUEMENT : les racines
//                d'un polynôme, donc aucune grille, donc aucune résolution
//                limitée par un pas de balayage.
//   ESPRIT       n'utilise même pas le bruit : la structure de décalage du
//                sous-espace signal donne les fréquences par une résolution
//                de système linéaire.
//
// Et le prix, qu'il faut montrer autant que le gain : il faut CONNAÎTRE d.
// Se tromper ne dégrade pas l'estimation, cela la casse — d trop petit et
// une source disparaît, d trop grand et des pics fantômes apparaissent. Le
// paramètre `d` est donc au premier plan, avec la vue des valeurs propres
// qui sert à le choisir.
//
// PURE, stateless, seeded — runs in a worker; deterministic at fixed seed.
import { noiseSigma } from '../../../core/dsp.js';
import { fft, toDb } from '../../../core/numeric.js';
import { mulberry32, gaussFrom } from '../../../core/rng.js';
import {
  covariance,
  hermitianEig,
  musicPseudo,
  rootMusic,
  esprit,
  lsAmplitudes,
} from '../_lib/subspace.js';
// le cadrage figé, partagé avec le manifeste (frame.js)
import { F_LO, F_HI, F_HI_FAR, MODEL_FLOOR } from './frame.js';

const FS = 1000; // Hz
const F1 = 200; // première raie (Hz)
const F3 = 330; // troisième raie, franchement à l'écart (Hz)
const NFFT = 4096; // grille du périodogramme de référence
const NGRID = 1500; // grille du pseudo-spectre
const DB_FLOOR = -80;

/**
 * @param {{N: number, M: number, d: number, sources: number, df: number,
 *          snr: number, seed: number}} params
 * @returns {{observables: Object}}
 */
export function compute({ N, M, d, sources, df, snr, seed }) {
  const gauss = gaussFrom(mulberry32(seed));

  // L'écart est exprimé en unités de la LIMITE DE FOURIER Fs/N : c'est le
  // seul réglage qui garde son sens quand on change N, et il met le propos
  // dans le paramètre lui-même — à 1 le périodogramme sépare tout juste, en
  // dessous il ne peut plus, quoi qu'on fasse.
  const fourier = FS / N;
  const f2 = F1 + df * fourier;
  const freqs = sources === 3 ? [F1, f2, F3] : [F1, f2];

  // Bruit blanc complexe CIRCULAIRE : σ² par quadrature, donc 2σ² au total.
  // La puissance de référence passée à noiseSigma est donc 0.5 et non 1,
  // pour une raie de puissance unité — c'est le facteur 2 qu'on ne voit pas
  // passer quand la conversion est écrite à la main.
  const sigma = noiseSigma(0.5, snr);
  const xr = new Float64Array(N);
  const xi = new Float64Array(N);
  for (let n = 0; n < N; n++) {
    for (const f of freqs) {
      const w = (2 * Math.PI * f * n) / FS;
      xr[n] += Math.cos(w);
      xi[n] += Math.sin(w);
    }
    xr[n] += sigma * gauss();
    xi[n] += sigma * gauss();
  }

  /* ---------- la référence : le périodogramme ---------------------------- */
  const pr = new Float64Array(NFFT);
  const pi = new Float64Array(NFFT);
  pr.set(xr.subarray(0, Math.min(N, NFFT)));
  pi.set(xi.subarray(0, Math.min(N, NFFT)));
  fft(pr, pi);
  const fLo = F_LO;
  const fHi = sources === 3 ? F_HI_FAR : F_HI;
  const pf = [];
  const py = [];
  let pMax = 0;
  const mags = new Float64Array(NFFT);
  for (let k = 0; k < NFFT; k++) {
    mags[k] = pr[k] * pr[k] + pi[k] * pi[k];
    if (mags[k] > pMax) pMax = mags[k];
  }
  for (let k = 0; k < NFFT; k++) {
    const f = (k * FS) / NFFT;
    if (f < fLo || f > fHi) continue;
    pf.push(f);
    py.push(toDb(Math.sqrt(mags[k] / pMax), DB_FLOOR));
  }

  /* ---------- la covariance et son spectre propre ------------------------ */
  const Meff = Math.min(M, Math.floor(N / 2));
  const R = covariance(xr, xi, Meff);
  const eig = hermitianEig(R.re, R.im, Meff);
  const dEff = Math.min(d, Meff - 1);

  const evIdx = new Float64Array(Meff);
  const evDb = new Float64Array(Meff);
  const top = Math.max(eig.values[0], 1e-300);
  for (let k = 0; k < Meff; k++) {
    evIdx[k] = k + 1;
    evDb[k] = toDb(Math.sqrt(Math.max(eig.values[k], 0) / top), DB_FLOOR);
  }
  // les d retenues comme signal, en surbrillance
  const selIdx = new Float64Array(dEff);
  const selDb = new Float64Array(dEff);
  for (let k = 0; k < dEff; k++) {
    selIdx[k] = k + 1;
    selDb[k] = evDb[k];
  }
  // le niveau de bruit théorique σ², et le saut mesuré à la coupure
  // 2σ² et non σ² : le bruit est complexe circulaire et porte σ² PAR
  // QUADRATURE, donc une puissance totale de 2σ². C'est le niveau auquel le
  // plateau se tient, et le check l'épingle contre la moyenne du plateau.
  const noisePow = 2 * sigma * sigma;
  const noiseDb = toDb(Math.sqrt(Math.max(noisePow, 1e-300) / top), DB_FLOOR);
  const gapDb = dEff < Meff ? evDb[dEff - 1] - evDb[dEff] : NaN;

  /* ---------- MUSIC, root-MUSIC, ESPRIT ---------------------------------- */
  const grid = new Float64Array(NGRID);
  for (let k = 0; k < NGRID; k++) grid[k] = (fLo + ((fHi - fLo) * k) / (NGRID - 1)) / FS;
  const ps = musicPseudo(eig, Meff, dEff, grid);
  let psMax = 0;
  for (let k = 0; k < NGRID; k++) if (ps[k] > psMax) psMax = ps[k];
  const gf = new Float64Array(NGRID);
  const gy = new Float64Array(NGRID);
  for (let k = 0; k < NGRID; k++) {
    gf[k] = grid[k] * FS;
    gy[k] = toDb(Math.sqrt(ps[k] / psMax), DB_FLOOR);
  }

  const rm = rootMusic(eig, Meff, dEff);
  const es = esprit(eig, Meff, dEff);
  const toHz = (a) => Float64Array.from(a, (v) => v * FS);
  const rmHz = toHz(rm);
  const esHz = toHz(es);

  // Les estimations, posées sur le pseudo-spectre à hauteur fixe : ce sont
  // des NOMBRES, pas des courbes, et les voir tomber (ou non) sur les
  // verticales de vérité est toute la lecture de la vue.
  const marks = (hz, y) => ({
    x: Float64Array.from(hz),
    y: Float64Array.from(hz, () => y),
  });

  /* ---------- le MODÈLE complet : fréquences + amplitudes + bruit -------- */
  // Les méthodes à sous-espace rendent des FRÉQUENCES et rien d'autre. Tant
  // qu'on s'arrête là, on sait où sont les raies sans savoir ce qu'elles
  // valent — on ne peut donc ni reconstruire le signal, ni dire si le modèle
  // explique ce qu'on a mesuré. Les fréquences une fois connues, le modèle
  // devient LINÉAIRE en ses amplitudes, et un moindres carrés d × d les rend.
  // Les DEUX estimateurs, pas un choisi : la vue les montre côte à côte
  // avec la vérité, dans la même représentation, et c'est cette identité de
  // forme qui permet de les comparer d'un regard plutôt que de traduire
  // mentalement d'un dessin à l'autre.
  const lsRoot = lsAmplitudes(xr, xi, rm);
  const lsEsprit = lsAmplitudes(xr, xi, es);

  // Deux estimations INDÉPENDANTES de la variance du bruit, qui doivent
  // tomber d'accord : le résidu du modèle ‖x − Va‖²/N, et la moyenne du
  // plateau des valeurs propres. Deux chemins qui concordent valent mieux
  // qu'un chemin qu'on croit sur parole — le harnais vérifie l'accord.
  let plateau = 0;
  let nPlateau = 0;
  for (let k = dEff; k < Meff; k++) {
    plateau += eig.values[k];
    nPlateau++;
  }
  plateau = nPlateau ? plateau / nPlateau : NaN;

  const dbP = (v) => (v > 0 ? 10 * Math.log10(v) : DB_FLOOR);
  const MODEL_FLOOR = -60; // plancher de la vue « spectre estimé »

  // TROIS spectres, tous dans la MÊME représentation : des raies (stem) pour
  // les sinusoïdes, une ligne pour le niveau de bruit. Un spectre de raies
  // est discret — un trait continu prétendrait qu'il se passe quelque chose
  // entre elles — et donner à la vérité la forme des estimations est ce qui
  // permet de les comparer d'un regard. Quand tout va bien les trois se
  // confondent : c'est le résultat, pas un défaut de lisibilité.
  const lineSpec = (hz, power) => ({
    x: Float64Array.from(hz),
    y: Float64Array.from(power, (pw) => Math.max(dbP(pw), MODEL_FLOOR)),
  });
  const linesTrue = lineSpec(freqs, freqs.map(() => 1)); // amplitude 1 → 0 dB
  const linesRoot = lineSpec(Array.from(rm, (f) => f * FS), lsRoot.power);
  const linesEsprit = lineSpec(Array.from(es, (f) => f * FS), lsEsprit.power);

  /** pire écart d'amplitude, en dB, sur les raies effectivement appariées */
  const ampErrOf = (hz, power) => {
    let worst = 0;
    for (let k = 0; k < hz.length; k++) {
      const near = Math.min(...freqs.map((f) => Math.abs(hz[k] * FS - f)));
      if (near < 5) worst = Math.max(worst, Math.abs(dbP(power[k])));
    }
    return worst;
  };

  /** Le socle de bruit en rectangle : de la base du cadre jusqu'au niveau. */
  const noiseBand = (levelDb) => ({
    x: Float64Array.of(fLo, fHi),
    lo: Float64Array.of(MODEL_FLOOR, MODEL_FLOOR),
    hi: Float64Array.of(levelDb, levelDb),
  });

  /** plus grande erreur d'appariement, en Hz, entre estimations et vérité */
  const worstErr = (hz) => {
    if (hz.length === 0) return NaN;
    let worst = 0;
    for (const f of freqs.slice(0, dEff)) {
      let best = Infinity;
      for (const g of hz) best = Math.min(best, Math.abs(g - f));
      worst = Math.max(worst, best);
    }
    return worst;
  };

  /**
   * L'erreur QUE L'APPARIEMENT NE VOIT PAS : pour chaque estimation, la
   * distance à la vraie fréquence la plus proche. `worstErr` regarde si
   * chaque vraie raie a été trouvée ; celle-ci regarde si une fréquence a
   * été INVENTÉE, ce qui est le mode de panne d'un d trop grand.
   *
   * Elle a remplacé une preuve visuelle : le cadrage étant maintenant figé,
   * une raie fantôme à 840 Hz sort du cadre au lieu de l'étirer. Un chiffre
   * qui reste au centième de hertz tant que le modèle est juste et saute à
   * plusieurs centaines dès qu'il ne l'est plus dit la même chose, et le
   * dit même quand la salle ne regarde pas au bon endroit.
   */
  const strayHz = (hz) => {
    let worst = 0;
    for (const g of hz) {
      let best = Infinity;
      for (const f of freqs) best = Math.min(best, Math.abs(g - f));
      worst = Math.max(worst, best);
    }
    return hz.length ? worst : NaN;
  };

  return {
    observables: {
      periodogram: { x: Float64Array.from(pf), y: Float64Array.from(py) },
      eigenvalues: { x: evIdx, y: evDb },
      eigenSelected: { x: selIdx, y: selDb },
      pseudo: { x: gf, y: gy },
      rootMusicMarks: marks(rmHz, -3),
      espritMarks: marks(esHz, -8),
      // les fréquences vraies, en verticales sur les trois vues
      fTrue1: F1,
      fTrue2: f2,
      fTrue3: sources === 3 ? F3 : NaN,
      noiseLine: noiseDb,
      dLine: dEff + 0.5, // verticale : la coupure signal / bruit
      fourierLimit: {
        value: fourier,
        meta: { label: 'limite de Fourier Fs/N', unit: 'Hz', precision: 2 },
      },
      spacing: {
        value: f2 - F1,
        meta: { label: 'écart des deux raies', unit: 'Hz', precision: 2 },
      },
      snapshots: { value: R.snapshots, meta: { label: 'instantanés' } },
      eigenGap: {
        value: gapDb,
        meta: { label: 'saut à la coupure', unit: 'dB', precision: 1 },
      },
      errRoot: {
        value: worstErr(rmHz),
        meta: { label: 'erreur root-MUSIC', unit: 'Hz', precision: 3 },
      },
      errEsprit: {
        value: worstErr(esHz),
        meta: { label: 'erreur ESPRIT', unit: 'Hz', precision: 3 },
      },
      strayRoot: {
        value: strayHz(rmHz),
        meta: { label: 'invention root-MUSIC', unit: 'Hz', precision: 2 },
      },
      strayEsprit: {
        value: strayHz(esHz),
        meta: { label: 'invention ESPRIT', unit: 'Hz', precision: 2 },
      },
      // les trois spectres, même forme : raies + niveau de bruit
      linesTrue,
      linesRoot,
      linesEsprit,
      nsTrue: dbP(2 * sigma * sigma),
      nsRoot: dbP(lsRoot.noise),
      nsEsprit: dbP(lsEsprit.noise),
      // Le bruit est une puissance ÉTALÉE sur toute la bande, pas une valeur
      // à une fréquence : un rectangle le dit, une ligne ne le dit pas. Les
      // raies montent au-dessus d'un socle, et c'est exactement le modèle
      // « d exponentielles PLUS du bruit blanc » qu'on est en train de
      // valider. Le bord supérieur reste tracé par-dessus, parce qu'un
      // aplat translucide ne se lit pas au décibel près.
      bandTrue: noiseBand(dbP(2 * sigma * sigma)),
      bandRoot: noiseBand(dbP(lsRoot.noise)),
      bandEsprit: noiseBand(dbP(lsEsprit.noise)),
      modelFloor: MODEL_FLOOR,
      noiseRoot: {
        value: dbP(lsRoot.noise),
        meta: { label: 'bruit — root-MUSIC', unit: 'dB', precision: 2 },
      },
      noiseEsprit: {
        value: dbP(lsEsprit.noise),
        meta: { label: 'bruit — ESPRIT', unit: 'dB', precision: 2 },
      },
      noiseEigen: {
        value: dbP(plateau),
        meta: { label: 'bruit — valeurs propres', unit: 'dB', precision: 2 },
      },
      noiseRef: {
        value: dbP(2 * sigma * sigma),
        meta: { label: 'bruit vrai', unit: 'dB', precision: 2 },
      },
      ampErrRoot: {
        value: ampErrOf(rm, lsRoot.power),
        meta: { label: 'erreur d’amplitude — root-MUSIC', unit: 'dB', precision: 2 },
      },
      ampErrEsprit: {
        value: ampErrOf(es, lsEsprit.power),
        meta: { label: 'erreur d’amplitude — ESPRIT', unit: 'dB', precision: 2 },
      },
      model: {
        value:
          dEff === sources
            ? `d = ${dEff} = nombre de sources`
            : dEff < sources
              ? `d = ${dEff} < ${sources} sources : il en manque une`
              : `d = ${dEff} > ${sources} sources : pics fantômes`,
        meta: { label: 'modèle' },
      },
    },
  };
}
