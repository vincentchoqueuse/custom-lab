// La convolution continue, décomposée — la figure classique du tableau, mais
// dont on tient le curseur.
//
//   y(t) = ∫ x(τ)·h(t−τ) dτ
//
// Tout le mystère de cette formule tient dans une chose : le t du résultat
// n'est PAS la variable d'intégration. On intègre sur τ, à t figé. La vue
// principale montre donc les deux fonctions dans l'espace des τ — x(τ) fixe,
// h(t−τ) RETOURNÉE puis GLISSÉE de t — et l'aire de leur produit, qui est
// la valeur y(t) qu'on reporte sur la courbe du bas.
//
// Le curseur t est le paramètre de l'expérience. Le faire glisser, c'est
// faire l'animation à la main, et voir la courbe du bas se remplir.
//
// Deux fenêtres suffisent à tout dire, et l'expérience les propose :
//   porte * porte      → un TRIANGLE, avec ses quatre régimes visibles à
//                        l'œil : pas de recouvrement, entrée, plein
//                        recouvrement, sortie ;
//   porte * exponentielle → la charge d'un RC, qui est la même intégrale.
//
// Ce qui est vérifié, et qui est le vrai piège de cette leçon :
//   · la convolution de deux portes de largeurs a et b est EXACTEMENT le
//     trapèze de base a+b, de plateau |a−b| et de hauteur min(a,b) — donc un
//     triangle quand a = b. Forme close, comparée point par point ;
//   · la LARGEUR du support s'ajoute : supp(x*h) = supp(x) + supp(h). C'est
//     la règle que les étudiants retiennent, et elle sort du calcul ;
//   · l'aire se MULTIPLIE : ∫(x*h) = ∫x · ∫h ;
//   · x*h = h*x, la commutativité, sur les mêmes points.
//
// L'intégrale est le SEUL calcul numérique de l'expérience, et elle est faite
// PAR MORCEAUX, entre les ruptures de l'intégrande — les bords de la porte
// x, et ceux de h(t−τ) qui glissent avec t. Une quadrature aveugle sur une
// grille régulière bave sur ces discontinuités : l'aire d'une porte de
// largeur 1 y valait 1.0007, et le triangle s'écartait de 4·10⁻³ de sa forme
// close. Découpée aux ruptures, avec Gauss à deux points par panneau — qui
// n'évalue jamais SUR une discontinuité — porte * porte devient EXACTE et la
// charge du RC tombe à 4·10⁻⁸. Les vérifications ci-dessus sont donc des
// égalités, pas des tolérances.
// PURE, stateless, seeded — runs in a worker; deterministic at fixed seed.
import { trapz } from '../../../core/numeric.js';

const N = 1400; // grid over the τ / t axis
const T0 = -2; // the window shown, in seconds
const T1 = 6;
const DT = (T1 - T0) / (N - 1);

/** Les deux signaux d'entrée, et les deux réponses impulsionnelles.
 *  `edges` liste les ruptures de chaque fonction, en argument : c'est ce qui
 *  permet d'intégrer entre elles au lieu de passer dessus. */
const SIGNALS = {
  gate: (a) => ({ f: (u) => (u >= 0 && u <= a ? 1 : 0), edges: [0, a] }),
  ramp: (a) => ({ f: (u) => (u >= 0 && u <= a ? u / a : 0), edges: [0, a] }),
};
const KERNELS = {
  gate: (b) => ({ f: (u) => (u >= 0 && u <= b ? 1 : 0), edges: [0, b] }),
  // aire 1 : l'exponentielle normalisée, la réponse d'un RC de constante b
  exp: (b) => ({ f: (u) => (u >= 0 ? Math.exp(-u / b) / b : 0), edges: [0] }),
};

const PANELS = 32; // panneaux de Gauss par morceau
const G = 0.5 / Math.sqrt(3); // les deux points de Gauss, en demi-largeur

/**
 * ∫ x(τ)·h(t−τ) dτ, découpée aux ruptures des deux fonctions.
 * Gauss à deux points par panneau : il n'évalue JAMAIS sur une rupture — ce
 * qui serait ambigu — il est exact sur un morceau constant ou affine, et
 * d'ordre 4 sur l'exponentielle. La règle du point milieu, elle, laissait
 * 1.4·10⁻⁴ sur la charge du RC.
 */
export function overlap(x, h, t) {
  const [lo, hi] = [Math.min(...x.edges), Math.max(...x.edges)];
  const cuts = new Set([lo, hi]);
  for (const u of h.edges) {
    const c = t - u; // la rupture de h(t−τ) est en τ = t − u
    if (c > lo && c < hi) cuts.add(c);
  }
  const pts = [...cuts].sort((p, q) => p - q);
  let acc = 0;
  for (let k = 1; k < pts.length; k++) {
    const w = pts[k] - pts[k - 1];
    if (w < 1e-14) continue;
    const step = w / PANELS;
    let s = 0;
    for (let i = 0; i < PANELS; i++) {
      const mid = pts[k - 1] + step * (i + 0.5);
      s += x.f(mid - step * G) * h.f(t - (mid - step * G));
      s += x.f(mid + step * G) * h.f(t - (mid + step * G));
    }
    acc += (s * step) / 2;
  }
  return acc;
}

/** Le trapèze exact : porte(a) * porte(b), en forme close. */
export function gateGate(a, b, t) {
  const lo = Math.min(a, b);
  const hi = Math.max(a, b);
  if (t <= 0 || t >= a + b) return 0;
  if (t < lo) return t; // entrée : recouvrement croissant
  if (t <= hi) return lo; // plateau : la plus étroite est dedans
  return a + b - t; // sortie
}

/** porte(a) * (e^{−u/b}/b) : la charge d'un RC, en forme close. */
export function gateExp(a, b, t) {
  if (t <= 0) return 0;
  if (t <= a) return 1 - Math.exp(-t / b);
  return (1 - Math.exp(-a / b)) * Math.exp(-(t - a) / b);
}

/**
 * @param {{sig: string, ker: string, a: number, b: number, t: number,
 *          seed: number}} params
 * @returns {{observables: Object}}
 */
export function compute({ sig, ker, a, b, t }) {
  const x = SIGNALS[sig](a);
  const h = KERNELS[ker](b);

  /* ---------- l'espace des τ : c'est LÀ que le calcul se fait ------------- */
  // x(τ) ne bouge jamais. h(t−τ) est h RETOURNÉE (le −τ) puis GLISSÉE de t.
  // Leur produit est l'intégrande ; son aire est y(t). Ces trois courbes sont
  // échantillonnées pour le DESSIN ; l'aire, elle, est calculée par morceaux.
  const tau = new Float64Array(N);
  const xTau = new Float64Array(N);
  const hFlip = new Float64Array(N);
  const product = new Float64Array(N);
  for (let i = 0; i < N; i++) {
    const u = T0 + i * DT;
    tau[i] = u;
    xTau[i] = x.f(u);
    hFlip[i] = h.f(t - u);
    product[i] = xTau[i] * hFlip[i];
  }
  const yNow = overlap(x, h, t);

  /* ---------- le résultat : y(t) sur toute la fenêtre --------------------- */
  const yOut = new Float64Array(N);
  for (let k = 0; k < N; k++) yOut[k] = overlap(x, h, tau[k]);

  /* ---------- le point courant, reporté d'une vue à l'autre --------------- */
  const marker = { x: Float64Array.from([t]), y: Float64Array.from([yNow]) };

  /* ---------- les régimes, nommés ---------------------------------------- */
  // porte*porte : quatre phases, et le texte dit laquelle on regarde
  let regime = '—';
  if (sig === 'gate' && ker === 'gate') {
    const lo = Math.min(a, b);
    const hi = Math.max(a, b);
    if (t <= 0) regime = 'before: no overlap, y = 0';
    else if (t < lo) regime = 'entering: the overlap grows, y rises';
    else if (t <= hi) regime = 'full overlap: y is on the plateau';
    else if (t < a + b) regime = 'leaving: the overlap shrinks, y falls';
    else regime = 'after: no overlap left, y = 0';
  }

  // les deux aires, par le même découpage : ∫x sur son support, ∫h sur le
  // sien (tronqué à la fenêtre pour l'exponentielle, qui n'en a pas de fin)
  const unit = { f: () => 1, edges: [T0, T1] };
  const areaX = overlap(x, unit, 0);
  const areaH = overlap({ f: h.f, edges: [0, ker === 'gate' ? b : T1] }, unit, 0);

  return {
    observables: {
      // la vue du calcul, dans l'espace des τ
      xTau: { x: tau, y: xTau },
      hFlip: { x: tau, y: hFlip },
      product: { x: tau, y: product },
      // la bande hachurée : l'aire sous le produit, qui EST y(t). Une bande
      // et non une courbe, parce que c'est l'AIRE qu'on lit, pas la hauteur.
      shade: { x: tau, lo: new Float64Array(N), hi: product },
      // la vue du résultat
      yOut: { x: tau, y: yOut },
      marker,
      tNow: t, // vline : le t courant, sur les deux vues
      // les nombres
      yValue: { value: yNow, meta: { label: 'y(t) = aire du produit', precision: 4 } },
      support: {
        value: a + (ker === 'gate' ? b : 0),
        meta: { label: 'support width', unit: 's', precision: 3 },
      },
      areaX: { value: areaX, meta: { label: '∫x', precision: 4 } },
      areaH: { value: areaH, meta: { label: '∫h', precision: 4 } },
      areaY: { value: trapz(tau, yOut), meta: { label: '∫(x*h) = ∫x · ∫h', precision: 4 } },
      regime: { value: regime, meta: { label: 'regime' } },
    },
  };
}
