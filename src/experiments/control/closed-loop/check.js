import { compute, closedParams, openLoop, closeIt, isoModulus } from './compute.js';
import { secondOrderStep as stepValue } from '../../../core/lti.js';
import { standardChecks, maxGap, range } from '../../../core/checks.js';

const BASE = { w0: 1, m: 0.5, K: 4, seed: 42 };
const obs = (p) => compute({ ...BASE, ...p }).observables;
const CASES = [
  { w0: 1, m: 0.5, K: 4 },
  { w0: 3, m: 0.2, K: 0.5 },
  { w0: 0.4, m: 1.3, K: 20 },
  { w0: 8, m: 0.05, K: 0.1 },
];

export const checks = [
  {
    name: 'la boucle fermée EST un second ordre : ω₀√(1+K), m/√(1+K), K/(1+K)',
    category: 'numeric',
    run() {
      // L'identité qui porte toute l'expérience : la réponse calculée en
      // bouclant doit être, point par point, celle d'un second ordre dont les
      // trois paramètres sont donnés en forme close.
      const gap = maxGap(CASES, ({ w0, m, K }) => {
        const o = obs({ w0, m, K });
        const bf = closedParams(K, m, w0);
        return maxGap(
          range(o.stepClosed.x.length),
          (i) => o.stepClosed.y[i],
          (i) => stepValue(bf.K, bf.m, bf.w0, o.stepClosed.x[i])
        );
      });
      return { ok: gap < 1e-13, detail: `écart max ${gap.toExponential(2)}` };
    },
  },
  {
    name: 'le retour proportionnel NE DÉPLACE PAS la partie réelle des pôles',
    category: 'numeric',
    run() {
      // m'ω₀' = (m/√(1+K))·(ω₀√(1+K)) = mω₀ : le coefficient en s est le même
      // des deux côtés. L'enveloppe décroît donc exactement aussi vite en
      // boucle fermée qu'en boucle ouverte — ce que personne ne prédit.
      const gap = maxGap(CASES, ({ w0, m, K }) => {
        const bf = closedParams(K, m, w0);
        const o = obs({ w0, m, K });
        return Math.max(Math.abs(bf.m * bf.w0 - m * w0), Math.abs(o.envelope.value - m * w0));
      });
      // et la pulsation propre, elle, monte bien de √(1+K)
      const grows = [0.1, 1, 4, 20].every((K, i, a) => {
        const v = closedParams(K, 0.5, 1).w0;
        return Math.abs(v - Math.sqrt(1 + K)) < 1e-13 && (i === 0 || v > closedParams(a[i - 1], 0.5, 1).w0);
      });
      return { ok: gap < 1e-13 && grows, detail: `écart max ${gap.toExponential(2)}, ω₀′ = ω₀√(1+K) croissante` };
    },
  },
  {
    name: "l'erreur statique vaut exactement 1/(1+K)",
    category: 'numeric',
    run() {
      const gap = maxGap(CASES, ({ w0, m, K }) => {
        const o = obs({ w0, m, K });
        // la valeur finale de la réponse indicielle bouclée, et le nombre annoncé
        const yInf = o.stepClosed.y[o.stepClosed.y.length - 1];
        return Math.max(
          Math.abs(o.staticError.value - 1 / (1 + K)),
          Math.abs(o.staticGain.value - K / (1 + K)),
          Math.abs(o.staticGain.value + o.staticError.value - 1),
          Math.abs(yInf - K / (1 + K)) // 9/(mω₀) : le régime est établi
        );
      });
      return { ok: gap < 2e-4, detail: `écart max ${gap.toExponential(2)}` };
    },
  },
  {
    name: 'Bode : la courbe fermée est bien L/(1+L), point par point',
    category: 'numeric',
    run() {
      const gap = maxGap(CASES, ({ w0, m, K }) => {
        const o = obs({ w0, m, K });
        return maxGap(
          range(o.gain.x.length),
          (i) => 10 ** (o.gainClosed.y[i] / 20),
          (i) => Math.hypot(...closeIt(openLoop(o.gain.x[i], { K, m, w0 })))
        );
      });
      return { ok: gap < 1e-13, detail: `écart max ${gap.toExponential(2)}` };
    },
  },
  {
    name: "l'abaque mesure la résonance que la forme close prédit",
    category: 'numeric',
    run() {
      // Le contour mis en avant vaut M_r = K′/(2m′√(1−m′²)), calculé sur la
      // boucle fermée. Deux affirmations EXACTES plutôt qu'une approchée : le maximum lu sur
      // la grille tracée ne peut pas être plus près que le pas de grille, ce
      // qui n'apprendrait rien. Ce qui est exact, c'est (a) que |T| évalué à
      // la pulsation de résonance en forme close vaut exactement M, et (b)
      // qu'aucun point tracé ne dépasse M — la tangence, pas la sécante.
      let worst = 0;
      let below = true;
      let touches = true;
      for (const { w0, m, K } of CASES) {
        const o = obs({ w0, m, K });
        if (!Number.isFinite(o.mrDb.value)) continue;
        const M = 10 ** (o.mrDb.value / 20);
        // (a) exact : |T(jω_r)| = M_r
        const atWr = Math.hypot(...closeIt(openLoop(o.wrOut.value, { K, m, w0 })));
        worst = Math.max(worst, Math.abs(atWr - M) / M);
        // (b) aucun point de la courbe fermée ne dépasse le contour, et le
        //     lieu de Black en approche un point à la résolution de la grille
        let closest = Infinity;
        for (let i = 0; i < o.gain.x.length; i++) {
          if (10 ** (o.gainClosed.y[i] / 20) > M * (1 + 1e-12)) below = false;
          const rs = isoModulus(M, o.black.x[i]);
          const here = 10 ** (o.black.y[i] / 20);
          if (rs.length) closest = Math.min(closest, Math.min(...rs.map((r) => Math.abs(r - here) / M)));
        }
        if (!(closest < 5e-3)) touches = false;
      }
      return {
        ok: worst < 1e-13 && below && touches,
        detail: `|T(jω_r)| = M_r à ${worst.toExponential(2)}, rien au-dessus, lieu tangent`,
      };
    },
  },
  {
    name: 'seuil de résonance : m/√(1+K) < 1/√2, et pas de pic au-dessus',
    category: 'numeric',
    run() {
      // Fermer la boucle DÉSAMORTIT : un procédé qui ne résonne pas peut se
      // mettre à résonner une fois bouclé.
      //   m/√(1+K) < 1/√2  ⟺  1 + K > 2m²  ⟺  K > 2m² − 1
      // Le seuil n'est positif que pour m > 1/√2, c'est-à-dire justement pour
      // les procédés qui ne résonnaient pas tout seuls.
      const gap = maxGap([0.75, 0.8, 0.9, 1.2], (m) => {
        const kCrit = 2 * m * m - 1;
        const below = obs({ m, K: kCrit * 0.95 });
        const above = obs({ m, K: kCrit * 1.05 });
        const exact = Math.abs(closedParams(kCrit, m, 1).m - Math.SQRT1_2);
        const right = Number.isNaN(below.mrDb.value) && Number.isFinite(above.mrDb.value);
        return Math.max(exact, right ? 0 : 1);
      });
      // et sous 1/√2 le procédé résonne déjà seul : aucun K ne peut l'éteindre
      const already = [0.2, 0.5, 0.7].every((m) =>
        [0.1, 1, 10].every((K) => Number.isFinite(obs({ m, K }).mrDb.value))
      );
      return {
        ok: gap < 1e-13 && already,
        detail: `seuil K = 2m²−1 exact (0.125 à m = 0.75, 0.62 à m = 0.9)`,
      };
    },
  },
  {
    name: 'les contours tracés vérifient |L/(1+L)| = M à la machine',
    category: 'numeric',
    run() {
      const gap = maxGap([-12, -6, -3, -1, 0, 1, 3, 6, 12], (db) => {
        const M = 10 ** (db / 20);
        let w = 0;
        for (let phi = -179.5; phi <= -0.5; phi += 0.5) {
          for (const r of isoModulus(M, phi)) {
            const a = (phi * Math.PI) / 180;
            const [re, im] = [r * Math.cos(a), r * Math.sin(a)];
            w = Math.max(w, Math.abs(Math.hypot(re, im) / Math.hypot(1 + re, im) - M));
          }
        }
        return w;
      });
      return { ok: gap < 1e-12, detail: `écart max ${gap.toExponential(2)}` };
    },
  },
  standardChecks.determinism(compute, BASE, 'stepClosed'),
];
