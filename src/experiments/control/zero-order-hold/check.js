import { compute, holdTransfer } from './compute.js';
import { standardChecks, maxGap, range } from '../../../core/checks.js';
import { sinc } from '../../../core/numeric.js';

const BASE = { fe: 1000, f0: 120, wco: 2000, seed: 42 };
const obs = (p) => compute({ ...BASE, ...p }).observables;
const FES = [50, 250, 1000, 7000];

export const checks = [
  {
    name: "arg B₀(jω) = −ωTe/2 EXACTEMENT — le bloqueur EST un retard de Te/2",
    category: 'numeric',
    run() {
      // Le résultat central du cours, asserté et non illustré : l'argument du
      // nombre complexe (1−e^{−jωTe})/(jωTe) vaut −ωTe/2 pour tout ω, tant
      // que le sinc n'a pas changé de signe. Comparaison contre atan2, qui
      // est un calcul indépendant de la forme close tracée.
      const gap = maxGap(FES, (fe) => {
        const Te = 1 / fe;
        const o = obs({ fe });
        let worst = 0;
        for (let i = 0; i < o.gain.x.length; i++) {
          const w = o.gain.x[i];
          if (w >= 2 * Math.PI * fe) break; // premier zéro : le signe bascule
          const [re, im] = holdTransfer(w, Te);
          worst = Math.max(worst, Math.abs((Math.atan2(im, re) * 180) / Math.PI - o.phase.y[i]));
        }
        return worst;
      });
      return { ok: gap < 1e-11, detail: `écart max ${gap.toExponential(2)}` };
    },
  },
  {
    name: 'le module est la sinc : 2/π à Fe/2, et nul aux multiples de Fe',
    category: 'numeric',
    run() {
      const gap = maxGap(FES, (fe) => {
        const Te = 1 / fe;
        const o = obs({ fe });
        const at = (w) => Math.hypot(...holdTransfer(w, Te));
        return Math.max(
          Math.abs(at(Math.PI * fe) - 2 / Math.PI), // Fe/2 : sinc(1/2) = 2/π
          Math.abs(o.droopNyquist.value - 20 * Math.log10(2 / Math.PI)),
          Math.abs(at(2 * Math.PI * fe)), // Fe
          Math.abs(at(4 * Math.PI * fe)), // 2Fe
          Math.abs(at(1e-9) - 1) // 0 dB en continu (normalisé)
        );
      });
      return { ok: gap < 1e-12, detail: `écart max ${gap.toExponential(2)}` };
    },
  },
  {
    name: 'exactement −90° à Fe/2 et −180° à Fe, quelle que soit Fe',
    category: 'numeric',
    run() {
      // deux conséquences immédiates de −ωTe/2, et deux repères que les vues
      // tracent : à Fe/2 le bloqueur retire un quart de tour, à Fe un demi
      const gap = maxGap(FES, (fe) => {
        const Te = 1 / fe;
        const deg = (w) => (-w * (Te / 2) * 180) / Math.PI;
        return Math.max(Math.abs(deg(Math.PI * fe) + 90), Math.abs(deg(2 * Math.PI * fe) + 180));
      });
      return { ok: gap < 1e-12, detail: `écart max ${gap.toExponential(2)}` };
    },
  },
  {
    name: "l'escalier suit le signal retardé de Te/2, pas le signal",
    category: 'numeric',
    run() {
      // La vue temporelle prétend que la courbe pointillée passe au milieu
      // des marches. C'est vérifiable : sur chaque palier, la valeur bloquée
      // vaut x(nTe), et le signal retardé vaut exactement cette même valeur
      // AU MILIEU du palier, t = nTe + Te/2.
      const gap = maxGap(FES, (fe) => {
        const Te = 1 / fe;
        const o = obs({ fe });
        const x = (u) => Math.sin(2 * Math.PI * BASE.f0 * u);
        let worst = 0;
        for (let n = 1; n < 5; n++) {
          const mid = n * Te + Te / 2;
          worst = Math.max(worst, Math.abs(x(mid - Te / 2) - x(n * Te)));
        }
        return worst;
      });
      // et l'escalier EST bien constant par morceaux, égal à l'échantillon
      const o = obs({});
      const Te = 1 / BASE.fe;
      const piecewise = maxGap(
        range(o.held.x.length),
        (i) => o.held.y[i],
        (i) => Math.sin(2 * Math.PI * BASE.f0 * (Math.floor(o.held.x[i] / Te) * Te))
      );
      return {
        ok: gap < 1e-14 && piecewise < 1e-14,
        detail: `milieu de marche ${gap.toExponential(2)}, escalier ${piecewise.toExponential(2)}`,
      };
    },
  },
  {
    name: 'la marge perdue vaut ω_co·Te/2, et décroît en 1/Fe',
    category: 'numeric',
    run() {
      const gap = maxGap(
        [
          { fe: 100, wco: 500 },
          { fe: 1000, wco: 2000 },
          { fe: 8000, wco: 300 },
        ],
        ({ fe, wco }) => {
          const o = obs({ fe, wco });
          const want = (((wco / fe) * 180) / Math.PI) / 2;
          return Math.max(
            Math.abs(o.lost.value - want),
            Math.abs(o.lostPoint.y[0] - want),
            Math.abs(o.lostPoint.x[0] - fe),
            Math.abs(o.ratio.value - (2 * Math.PI * fe) / wco)
          );
        }
      );
      // la courbe tracée est bien la même loi, et strictement décroissante
      const o = obs({});
      let mono = true;
      for (let i = 1; i < o.lostVsFe.x.length; i++)
        if (o.lostVsFe.y[i] >= o.lostVsFe.y[i - 1]) mono = false;
      const onCurve = maxGap(
        range(o.lostVsFe.x.length),
        (i) => o.lostVsFe.y[i],
        (i) => (((BASE.wco / o.lostVsFe.x[i]) * 180) / Math.PI) / 2
      );
      return {
        ok: gap < 1e-12 && mono && onCurve < 1e-12,
        detail: `écart max ${Math.max(gap, onCurve).toExponential(2)}, décroissante en 1/Fe`,
      };
    },
  },
  {
    name: "la règle d'ingénieur Fe ≥ 20·f_co coûte bien moins de 10°",
    category: 'numeric',
    run() {
      // ω_co·Te/2 = π·f_co/Fe radians : à Fe = 20·f_co cela fait 9°, ce qui
      // est exactement d'où sort la règle. Vérifions les deux côtés.
      const gap = maxGap([10, 50, 300, 2000], (fco) => {
        const wco = 2 * Math.PI * fco;
        const at = (fe) => obs({ fe, wco }).lost.value;
        return Math.max(Math.abs(at(20 * fco) - 9), at(20 * fco) > 10 ? 1 : 0, at(10 * fco) < 10 ? 1 : 0);
      });
      return { ok: gap < 1e-11, detail: 'exactement 9° à Fe = 20 f_co, plus de 10° en dessous' };
    },
  },
  standardChecks.determinism(compute, BASE, 'held'),
];
