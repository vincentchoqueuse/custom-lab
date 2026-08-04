// Ce qu'une activation fait à un SIGNAL — et pas seulement à un nombre.
//
// Un cours de réseaux présente les activations par leur courbe, et s'arrête
// là. Pour qui vient du traitement du signal il manque l'essentiel : une
// activation est une NON-LINÉARITÉ SANS MÉMOIRE, donc elle crée des
// fréquences qui n'étaient pas dans l'entrée. C'est tout ce qu'elle sait
// faire, et c'est exactement ce qui rend un réseau plus expressif qu'une
// matrice.
//
// Trois lectures, sur les mêmes deux figures que partout ailleurs :
//
//   · LA COURBE, avec sa dérivée. La dérivée n'est pas un ornement : une
//     sigmoïde sature à 1/4 au mieux et à ~0 partout ailleurs, ce qui est
//     le gradient qui disparaît, en une image.
//   · LE TEMPOREL, où l'on voit écrêter, redresser, ou ne rien faire.
//   · LE SPECTRE, où le prix se lit. Une non-linéarité IMPAIRE (tanh,
//     identité) ne crée que des harmoniques impaires ; une non-linéarité
//     quelconque (ReLU, sigmoïde) en crée aussi des paires ET une composante
//     continue. Sur deux tons, elle crée en plus des produits
//     d'intermodulation à 2f₁ − f₂ — la raie qui tombe DANS la bande utile
//     et qu'aucun filtre ne rattrape.
//
// Le harnais épingle le cas exactement calculable : le redressement simple
// d'une sinusoïde par ReLU a une série de Fourier fermée, connue depuis
// 1822, et les raies mesurées doivent tomber dessus à 1e-12.
//
// PURE, stateless, seeded — runs in a worker; deterministic at fixed seed.
import { mulberry32, gaussFrom } from '../../../core/rng.js';
import { tone, timeAxis, magSpectrum, freqAxis, dbAmp, linspace } from '../../../core/dsp.js';
import { ACTIVATIONS, applyAct } from '../_lib/nn.js';

const FS = 1024; // Hz — puissance de deux : toutes les harmoniques sur un bin
const N = 1024; // échantillons (1 s)
const F1 = 16; // Hz — bin 16, ses harmoniques aux bins 32, 48, 64…
const F2 = 21; // Hz — le second ton, pour l'intermodulation
const N_PLOT = 256; // échantillons tracés (un quart de seconde)
const DB_FLOOR = -90;
const X_MAX = 4; // demi-largeur de la courbe de transfert

/**
 * @param {{act: string, signal: string, gain: number, bias: number,
 *          seed: number}} params
 * @returns {{observables: Object}}
 */
export function compute({ act, signal, gain, bias, seed }) {
  const { f, df } = ACTIVATIONS[act];
  const gauss = gaussFrom(mulberry32(seed));

  /* ---------- l'entrée ---------------------------------------------------- */
  let x;
  if (signal === 'sine') x = tone(N, F1, { fs: FS });
  else if (signal === 'two') {
    const a = tone(N, F1, { fs: FS });
    const b = tone(N, F2, { fs: FS, amp: 0.7 });
    x = Float64Array.from(a, (v, i) => v + b[i]);
  } else if (signal === 'square') {
    x = Float64Array.from(tone(N, F1, { fs: FS }), (v) => Math.sign(v) || 1);
  } else {
    // bruit blanc de puissance 1/2, celle d'une sinusoïde unité : les deux
    // entrées se comparent alors à niveau égal
    x = Float64Array.from({ length: N }, () => gauss() / Math.SQRT2);
  }
  const xin = Float64Array.from(x, (v) => gain * v + bias);
  const y = applyAct(xin, act);

  /* ---------- la courbe de transfert et sa dérivée ------------------------ */
  const xs = linspace(-X_MAX, X_MAX, 401);
  const curve = Float64Array.from(xs, f);
  const deriv = Float64Array.from(xs, df);

  // Les dérivées de TOUTES les activations, sur la même figure : c'est le
  // dessin des manuels, et c'est celui qui répond à « laquelle choisir ».
  // Un observable par courbe plutôt qu'un tracé coupé par des NaN, parce
  // qu'ici chacune doit porter son nom dans la légende et pouvoir être
  // éteinte au clic.
  const dOf = (name) => ({ x: xs, y: Float64Array.from(xs, ACTIVATIONS[name].df) });

  /* ---------- spectres ---------------------------------------------------- */
  const specIn = dbOf(magSpectrum(xin, { nfft: N }));
  const specOut = dbOf(magSpectrum(y, { nfft: N }));
  const fx = freqAxis(N, FS);

  // Les raies se lisent AU BIN : F1 tombe pile dessus par construction, donc
  // aucune fuite, aucune fenêtre, et les niveaux sont les vraies amplitudes.
  const magOut = magSpectrum(y, { nfft: N });
  const magIn = magSpectrum(xin, { nfft: N });
  const binOf = (fHz) => Math.round((fHz * N) / FS);
  const ampAt = (mag, fHz) => (2 * mag[binOf(fHz)]) / N; // amplitude crête
  const dcOf = (mag) => mag[0] / N;

  const fund = ampAt(magOut, F1);
  const fundIn = ampAt(magIn, F1);

  // Distorsion harmonique totale : l'énergie de tout ce qui n'est ni la
  // continue ni le fondamental, rapportée au fondamental. C'est LA mesure
  // de « combien de fréquences la non-linéarité a inventées ».
  let harm2 = 0;
  for (let k = 2; k * F1 < FS / 2; k++) harm2 += ampAt(magOut, k * F1) ** 2;
  const thd = fund > 1e-12 ? Math.sqrt(harm2) / fund : 0;

  // Intermodulation d'ordre 3 (deux tons) : 2f₁ − f₂, la raie qui tombe
  // dans la bande et qu'aucun filtre ne peut retirer.
  const imd = signal === 'two' ? ampAt(magOut, 2 * F1 - F2) : NaN;

  /* ---------- tracés temporels -------------------------------------------- */
  const t = timeAxis(N_PLOT, FS);
  const ms = Float64Array.from(t, (v) => 1000 * v);

  return {
    observables: {
      transfer: { x: xs, y: curve },
      derivative: { x: xs, y: deriv },
      identity: { x: xs, y: xs },

      dRelu: dOf('relu'),
      dTanh: dOf('tanh'),
      dSigmoid: dOf('sigmoid'),
      dGelu: dOf('gelu'),
      dLeaky: dOf('leaky'),

      xTime: { x: ms, y: xin.subarray(0, N_PLOT) },
      yTime: { x: ms, y: y.subarray(0, N_PLOT) },

      specIn: { x: fx, y: specIn },
      specOut: { x: fx, y: specOut },

      gainFund: {
        value: fundIn > 1e-12 ? fund / fundIn : NaN,
        meta: { label: 'gain du fondamental', precision: 3 },
      },
      dcOut: { value: dcOf(magOut), meta: { label: 'DC created', precision: 4 } },
      thd: { value: 100 * thd, meta: { label: 'distorsion harmonique', unit: '%', precision: 2 } },
      imd3: { value: imd, meta: { label: 'intermodulation 2f₁−f₂', precision: 4 } },
      dMax: {
        value: Math.max(...deriv),
        meta: { label: 'maximum derivative', precision: 3 },
      },
      dEnd: {
        // La dérivée au bord du domaine tracé : c'est ELLE qui dit si le
        // gradient survit à la saturation. 1 pour ReLU, 4e-4 pour la
        // sigmoïde à x = 4 — trois décades et demie d'écart, et toute
        // l'histoire du gradient qui disparaît.
        value: df(X_MAX),
        meta: { label: `dérivée en x = ${X_MAX}`, precision: 5 },
      },
    },
  };
}

const dbOf = (mag) => {
  const out = new Float64Array(mag.length);
  const peak = Math.max(...mag, 1e-300);
  for (let i = 0; i < mag.length; i++) out[i] = dbAmp(mag[i] / peak, DB_FLOOR);
  return out;
};

export { FS, N, F1, F2 };
