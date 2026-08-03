// Le bloqueur d'ordre zéro : ce que l'échantillonnage-blocage coûte VRAIMENT
// à une boucle.
//
//   B₀(s) = (1 − e^{−sTe})/s        et donc, sur l'axe imaginaire,
//   B₀(jω) = Te · sinc(f·Te) · e^{−jωTe/2}
//
// Deux lectures, et la seconde est celle qui fait tout le cours :
//
//  1. LE MODULE est une sinc : plat en basse fréquence, −3.92 dB à Fe/2
//     (sinc(1/2) = 2/π, exactement), et NUL aux multiples de Fe. C'est
//     l'affaiblissement que le bloqueur inflige au signal utile.
//
//  2. LA PHASE EST −ωTe/2, EXACTEMENT ET POUR TOUT ω. Autrement dit un
//     bloqueur d'ordre zéro EST un retard pur d'UNE DEMI-PÉRIODE
//     D'ÉCHANTILLONNAGE — pas approximativement, pas « en basse
//     fréquence » : exactement, à toute fréquence. C'est un résultat que
//     l'on énonce souvent sans le montrer, et c'est pourtant celui qui
//     décide de la marge de phase d'une boucle échantillonnée.
//     (Le sinc change de signe après chaque zéro ; la phase du nombre
//     complexe y saute donc de 180°, ce qui est la même droite vue modulo
//     un demi-tour. La phase tracée ici est la DROITE, continue, parce que
//     c'est le retard qui a un sens physique, pas son repliement.)
//
// La vue temporelle est la preuve visuelle du point 2 : l'escalier ne suit
// pas le signal, il suit le signal RETARDÉ DE Te/2 — la courbe pointillée
// passe au milieu de chaque marche, par construction et non par hasard.
//
// La troisième vue chiffre la conséquence : à une pulsation de coupure
// donnée, le bloqueur mange ω_co·Te/2 radians de marge de phase. C'est le
// nombre qu'on utilise pour choisir Fe, et il ne dépend que du produit
// ω_co·Te.
// PURE, stateless, seeded — runs in a worker; deterministic at fixed seed.
import { sinc, toDb } from '../../../core/numeric.js';
import { bodeSweep } from '../_lib/bode.js';

const NT = 1200; // dense "analog" grid
const NW = 361;
const PERIODS = 4; // signal periods shown

/** B₀(jω)/Te = sinc(f·Te)·e^{−jωTe/2} — normalisé, donc 0 dB en continu. */
export function holdTransfer(w, Te) {
  const f = w / (2 * Math.PI);
  const s = sinc(f * Te); // sinc normalisé : sin(πx)/(πx)
  const a = (-w * Te) / 2;
  return [s * Math.cos(a), s * Math.sin(a)];
}

/**
 * @param {{fe: number, f0: number, wco: number, seed: number}} params
 * @returns {{observables: Object}}
 */
export function compute({ fe, f0, wco }) {
  const Te = 1 / fe;

  /* ---------- temporel : le signal, ses échantillons, l'escalier --------- */
  // et le MÊME signal retardé de Te/2, qui est ce que l'escalier suit
  const T = PERIODS / f0;
  const t = new Float64Array(NT);
  const signal = new Float64Array(NT);
  const held = new Float64Array(NT);
  const delayed = new Float64Array(NT);
  const x = (u) => Math.sin(2 * Math.PI * f0 * u);
  for (let i = 0; i < NT; i++) {
    const ti = (i * T) / (NT - 1);
    t[i] = ti;
    signal[i] = x(ti);
    held[i] = x(Math.floor(ti / Te) * Te); // bloqué sur la période courante
    delayed[i] = x(ti - Te / 2);
  }
  // les instants d'échantillonnage, marqués
  const nS = Math.floor(T / Te) + 1;
  const ts = new Float64Array(nS);
  const xs = new Float64Array(nS);
  for (let k = 0; k < nS; k++) {
    ts[k] = k * Te;
    xs[k] = x(ts[k]);
  }

  /* ---------- fréquentiel : le module en sinc, la phase en droite -------- */
  // La grille couvre 2.5 décades autour de Fe, donc les deux premiers zéros
  // et toute la bande utile. Le balayage partagé (_lib/bode.js) déplierait
  // la phase par atan2 ; ici la phase EST une droite en forme close, et
  // c'est cette droite qu'il faut montrer — le saut de 180° aux zéros du
  // sinc est un artefact du signe, pas un retard.
  const sweep = bodeSweep((w) => holdTransfer(w, Te), {
    center: 2 * Math.PI * fe,
    decades: 1.5,
    n: NW,
  });
  const phaseLine = new Float64Array(NW);
  const DEG = 180 / Math.PI;
  for (let i = 0; i < NW; i++) phaseLine[i] = -sweep.w[i] * (Te / 2) * DEG; // −ωTe/2

  /* ---------- la conséquence : la marge de phase mangée ------------------ */
  // à la pulsation de coupure choisie, le bloqueur retire ω_co·Te/2 radians
  const lostRad = (wco * Te) / 2;
  const lostDeg = (lostRad * 180) / Math.PI;
  // et la même chose balayée en Fe, pour montrer le compromis
  const nF = 240;
  const feAxis = new Float64Array(nF);
  const lostVsFe = new Float64Array(nF);
  const feLo = wco / (2 * Math.PI); // Fe = f_co : le pire cas raisonnable
  for (let i = 0; i < nF; i++) {
    const fi = feLo * 10 ** ((2 * i) / (nF - 1)); // deux décades au-dessus
    feAxis[i] = fi;
    lostVsFe[i] = (((wco / fi) * 180) / Math.PI) / 2;
  }

  return {
    observables: {
      // temporel
      held: { x: t, y: held },
      signal: { x: t, y: signal },
      delayed: { x: t, y: delayed },
      samples: { x: ts, y: xs },
      // fréquentiel
      gain: { x: sweep.w, y: sweep.gainDb },
      phase: { x: sweep.w, y: phaseLine },
      // le compromis
      lostVsFe: { x: feAxis, y: lostVsFe },
      // les repères et les nombres
      wNyquist: Math.PI * fe, // vline : Fe/2, où le sinc vaut 2/π
      wSample: 2 * Math.PI * fe, // vline : Fe, premier zéro
      halfPeriod: {
        value: Te / 2,
        meta: { label: 'retard équivalent Te/2', unit: 's', precision: 5 },
      },
      droopNyquist: {
        value: toDb(sinc(0.5)),
        meta: { label: '|B₀| à Fe/2', unit: 'dB', precision: 3 },
      },
      phaseNyquist: {
        value: -90,
        meta: { label: 'arg B₀ à Fe/2', unit: '°', precision: 1 },
      },
      lost: {
        value: lostDeg,
        meta: { label: 'marge de phase perdue', unit: '°', precision: 2 },
      },
      lostPoint: { x: Float64Array.from([fe]), y: Float64Array.from([lostDeg]) },
      ratio: {
        value: (2 * Math.PI * fe) / wco,
        meta: { label: 'Fe / f_co', precision: 1 },
      },
    },
  };
}
