// Boucler un second ordre avec un gain proportionnel K, et lire la même
// opération de quatre façons.
//
//   procédé      G(s) = ω₀²/(s² + 2mω₀s + ω₀²)      gain statique 1
//   boucle ouv.  L(s) = K·G(s)
//   boucle fer.  T(s) = L/(1+L) = Kω₀²/(s² + 2mω₀s + ω₀²(1+K))
//
// TOUT est en forme close, et trois identités portent la leçon :
//
//  1. LA BOUCLE FERMÉE EST ENCORE UN SECOND ORDRE, avec
//        ω₀' = ω₀√(1+K)      m' = m/√(1+K)      gain statique K/(1+K)
//     Fermer la boucle accélère le système et le désamortit — les deux
//     ensemble, et dans un rapport fixé par le même √(1+K).
//
//  2. LES PÔLES GARDENT LEUR PARTIE RÉELLE. Le coefficient en s vaut 2mω₀
//     des deux côtés, donc m'ω₀' = mω₀ : l'enveloppe décroît exactement
//     aussi vite en boucle fermée qu'en boucle ouverte. Ce qui change, c'est
//     la pulsation propre amortie et donc le DÉPASSEMENT, pas le temps
//     d'établissement. C'est la chose que personne ne prédit correctement,
//     et elle est exacte : le harnais la vérifie à 1e-13.
//
//  3. L'ERREUR STATIQUE VAUT 1/(1+K), exactement. Monter K la réduit, et
//     paye en dépassement : le compromis du cours, en un potard.
//
// L'abaque de Nichols (contours iso-gain |L/(1+L)| = M) est ici à sa place :
// le contour que le lieu de Black de la BOUCLE OUVERTE touche donne la
// résonance de la BOUCLE FERMÉE — et comme la boucle fermée est un second
// ordre connu, cette lecture graphique a une réponse exacte à laquelle la
// comparer. C'est tout l'intérêt : l'abaque n'est pas une décoration, c'est
// une mesure, et on peut la vérifier.
// PURE, stateless, seeded — runs in a worker; deterministic at fixed seed.
import { toDb } from '../../../core/numeric.js';
import { bodeSweep } from '../_lib/bode.js';
import { secondOrderStep as stepValue } from '../_lib/lti.js';

const NT = 700; // time samples
const NW = 361; // frequency grid
const DECADES = 2;

/** Les paramètres de la boucle fermée, en forme close. */
export function closedParams(K, m, w0) {
  const root = Math.sqrt(1 + K);
  return { K: K / (1 + K), m: m / root, w0: w0 * root };
}

/** L(jω) = K·G(jω) comme [Re, Im]. */
export function openLoop(w, { K, m, w0 }) {
  const re = w0 * w0 - w * w;
  const im = 2 * m * w0 * w;
  const d = re * re + im * im;
  const n = K * w0 * w0;
  return [(n * re) / d, (-n * im) / d];
}

/** T = L/(1+L), à partir de L. */
export function closeIt([lr, li]) {
  const dr = 1 + lr;
  const d = dr * dr + li * li;
  return [(lr * dr + li * li) / d, (li * dr - lr * li) / d];
}

/* ------------------------------ l'abaque ---------------------------------
 * Les contours iso-gain |L/(1+L)| = M, tracés sur le plan de Black. Résoudre
 * l'identité pour le module de boucle ouverte à une phase donnée :
 *   r²(1−M²) − 2M² r cos φ − M² = 0
 *   ⇒ r = [M² cos φ ± M√(1 − M² sin²φ)] / (1 − M²)
 * qui n'existe que là où |sin φ| ≤ 1/M — d'où les contours fermés autour de
 * −180° pour M > 1 et les courbes ouvertes en dessous pour M < 1.
 * La phase d'un second ordre ne parcourt que (−180°, 0°), donc l'abaque
 * n'est tracée que là : la moitié atteignable, et le cadre reste celui du
 * lieu.
 */
const ISO_DB = [-12, -6, -3, -1, 0, 1, 3, 6, 12];
const ISO_CLIP_DB = 28;
const N_PHI = 481;

/** Modules de boucle ouverte situés sur |L/(1+L)| = M à la phase φ (degrés). */
export function isoModulus(M, phiDeg) {
  const c = Math.cos((phiDeg * Math.PI) / 180);
  const s = Math.sin((phiDeg * Math.PI) / 180);
  if (Math.abs(M - 1) < 1e-12) return c < 0 ? [-1 / (2 * c)] : []; // la médiatrice
  const disc = 1 - M * M * s * s;
  if (disc < 0) return [];
  const root = M * Math.sqrt(disc);
  const den = 1 - M * M;
  return [(M * M * c + root) / den, (M * M * c - root) / den].filter((r) => r > 0);
}

/** Polylignes séparées par des NaN : un contour par niveau, en (φ°, dB). */
function abaque(levelsDb) {
  const x = [];
  const y = [];
  for (const db of levelsDb) {
    const M = 10 ** (db / 20);
    const lo = [];
    const hi = [];
    for (let i = 0; i < N_PHI; i++) {
      const phi = -179.99 + (179.98 * i) / (N_PHI - 1);
      const rs = isoModulus(M, phi);
      if (rs.length) lo.push([phi, rs[0]]);
      if (rs.length === 2) hi.push([phi, rs[1]]);
    }
    for (const [phi, r] of [...lo, ...hi.reverse()]) {
      const db2 = toDb(r);
      const inside = Math.abs(db2) <= ISO_CLIP_DB;
      x.push(inside ? phi : NaN);
      y.push(inside ? db2 : NaN);
    }
    x.push(NaN);
    y.push(NaN);
  }
  return { x: Float64Array.from(x), y: Float64Array.from(y) };
}

/**
 * @param {{w0: number, m: number, K: number, seed: number}} params
 * @returns {{observables: Object}}
 */
export function compute({ w0, m, K }) {
  const bf = closedParams(K, m, w0);

  /* ---------- temporel : le même échelon, deux systèmes ------------------- */
  // m'ω₀' = mω₀ : les deux enveloppes décroissent à la même vitesse, donc une
  // seule durée d'observation suffit aux deux — ce qui est déjà la leçon.
  const T = 9 / (m * w0);
  const t = new Float64Array(NT);
  const yOpen = new Float64Array(NT);
  const yClosed = new Float64Array(NT);
  let peakOpen = 0;
  let peakClosed = 0;
  for (let i = 0; i < NT; i++) {
    t[i] = (i * T) / (NT - 1);
    yOpen[i] = stepValue(K, m, w0, t[i]);
    yClosed[i] = stepValue(bf.K, bf.m, bf.w0, t[i]);
    peakOpen = Math.max(peakOpen, yOpen[i]);
    peakClosed = Math.max(peakClosed, yClosed[i]);
  }

  /* ---------- fréquentiel : la boucle ouverte ET la boucle fermée --------- */
  const L = bodeSweep((w) => openLoop(w, { K, m, w0 }), { center: w0, decades: DECADES, n: NW });
  const Tf = bodeSweep((w) => closeIt(openLoop(w, { K, m, w0 })), {
    center: w0,
    decades: DECADES,
    n: NW,
  });

  /* ---------- l'abaque, et la résonance qu'elle mesure -------------------- */
  // La boucle fermée étant un second ordre connu, sa résonance a une forme
  // close : elle n'est PAS lue sur la courbe, elle est calculée — et le
  // contour mis en avant est celui-là. La tangence devient donc une
  // vérification visuelle d'un nombre exact, pas une estimation.
  const resonant = bf.m < Math.SQRT1_2 - 1e-12;
  const mr = resonant ? bf.K / (2 * bf.m * Math.sqrt(1 - bf.m * bf.m)) : NaN;
  const mrDb = resonant ? toDb(mr) : NaN;
  const wr = resonant ? bf.w0 * Math.sqrt(1 - 2 * bf.m * bf.m) : NaN;

  const overshoot = bf.m < 1 ? 100 * Math.exp((-bf.m * Math.PI) / Math.sqrt(1 - bf.m * bf.m)) : 0;

  return {
    observables: {
      // temporel
      stepOpen: { x: t, y: yOpen },
      stepClosed: { x: t, y: yClosed },
      // fréquentiel : deux courbes par diagramme
      gain: { x: L.w, y: L.gainDb },
      gainClosed: { x: Tf.w, y: Tf.gainDb },
      phase: { x: L.w, y: L.phaseDeg },
      phaseClosed: { x: Tf.w, y: Tf.phaseDeg },
      // Black : le lieu de la BOUCLE OUVERTE, sur l'abaque
      black: { x: L.phaseDeg, y: L.gainDb },
      isoGain: abaque(ISO_DB),
      isoPeak: resonant ? abaque([mrDb]) : { x: new Float64Array(0), y: new Float64Array(0) },
      criticalBlack: { x: Float64Array.from([-180]), y: Float64Array.from([0]) },
      // les nombres de la boucle fermée, tous en forme close
      w0bf: { value: bf.w0, meta: { label: "ω₀ en boucle fermée", unit: 'rad/s', precision: 3 } },
      mbf: { value: bf.m, meta: { label: 'm en boucle fermée', precision: 3 } },
      staticGain: { value: bf.K, meta: { label: 'gain statique BF', precision: 4 } },
      staticError: { value: 1 / (1 + K), meta: { label: 'erreur statique 1/(1+K)', precision: 4 } },
      overshoot: { value: overshoot, meta: { label: 'dépassement BF', unit: '%', precision: 1 } },
      mrDb: { value: mrDb, meta: { label: 'résonance BF', unit: 'dB', precision: 2 } },
      wrOut: { value: wr, meta: { label: 'ω de résonance BF', unit: 'rad/s', precision: 3 } },
      envelope: {
        value: m * w0,
        meta: { label: 'mω₀ — identique en BO et en BF', unit: 'rad/s', precision: 3 },
      },
      setpoint: 1, // hline : la consigne
    },
  };
}
