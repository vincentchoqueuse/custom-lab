import { compute, averagedPeriodogram, fluctuation, segmentation } from './compute.js';
import { standardChecks, maxGap, range } from '../../../core/checks.js';
import { mulberry32, gaussFrom } from '../../../core/rng.js';

const FS = 1000;
const BASE = { method: 'raw', win: 'rect', N: 2048, L: 256, snr: 10, a2: -20, df: 40, seed: 1 };

/** Bruit blanc pur d'écart-type σ — le seul signal dont on connaisse la DSP. */
const whiteNoise = (n, sigma, seed) => {
  const g = gaussFrom(mulberry32(seed));
  return Float64Array.from({ length: n }, () => sigma * g());
};

export const checks = [
  {
    name: 'normalisation densité : E[P] = σ²/Fs sur du bruit blanc',
    category: 'statistical',
    run() {
      // La normalisation |X|²/(Fs·Σw²) est choisie POUR que la moyenne du
      // périodogramme soit σ²/Fs, quelle que soit la fenêtre et quelle que
      // soit la longueur. On le vérifie sur les quatre fenêtres.
      // Chaque bin est σ⁴χ²₂/2 : écart-type relatif 1, donc la moyenne sur
      // M bins a une erreur-type de 1/√M. M ≈ 1024 → SE ≈ 3.1 %, tolérance 4 SE.
      const sigma = 0.7;
      const x = whiteNoise(4096, sigma, 11);
      const target = (sigma * sigma) / FS;
      const M = 2048;
      const tol = 4 / Math.sqrt(M);
      const worst = maxGap(
        ['rect', 'hann', 'hamming', 'blackman'],
        (win) => {
          const { f, psd } = averagedPeriodogram(x, 4096, 4096, win);
          return fluctuation(f, psd, 0).mean / target;
        },
        () => 1
      );
      return { ok: worst < tol, detail: `écart relatif max ${(worst * 100).toFixed(2)} % (tol ${(tol * 100).toFixed(2)} %)` };
    },
  },
  {
    name: "le périodogramme n'est PAS consistant : σ/moyenne ≈ 1 quel que soit N",
    category: 'statistical',
    run() {
      // Le résultat central de l'expérience, et le seul dont une régression
      // détruirait le propos. Sur du bruit blanc chaque bin suit σ⁴χ²₂/2,
      // dont l'écart-type ÉGALE la moyenne : le rapport vaut 1 pour tout N.
      // L'écart-type d'un rapport estimé sur M bins d'un χ²₂ vaut ≈ 1/√(2M) ;
      // pour le plus petit N (512 → M ≈ 256) cela fait 4.4 %, tolérance 4 SE.
      const sigma = 0.7;
      const worst = maxGap(
        [512, 1024, 2048, 4096, 8192],
        (n) => {
          const x = whiteNoise(n, sigma, 20 + n);
          const { f, psd } = averagedPeriodogram(x, n, n, 'rect');
          return fluctuation(f, psd, 0).ratio;
        },
        () => 1
      );
      const tol = 4 / Math.sqrt(2 * 256);
      return {
        ok: worst < tol,
        detail: `max|σ/moyenne − 1| = ${worst.toFixed(3)} sur N = 512…8192 (tol ${tol.toFixed(3)})`,
      };
    },
  },
  {
    name: 'moyenner K segments divise la fluctuation par √K',
    category: 'statistical',
    run() {
      // La loi que la vue « Fluctuation vs K » trace. Segments DISJOINTS,
      // donc indépendants, donc la moyenne de K périodogrammes suit un
      // χ²_{2K}/2K, de rapport écart-type/moyenne exactement 1/√K.
      // Erreur-type du rapport sur M bins : ≈ 1/√(2MK) — d'autant plus
      // serrée que K est grand, donc la tolérance est prise au pire cas.
      const sigma = 1.1;
      const x = whiteNoise(8192, sigma, 33);
      const rel = [];
      for (const K of [2, 4, 8, 16, 32]) {
        const L = 8192 / K;
        const { f, psd, segments } = averagedPeriodogram(x, L, L, 'rect');
        const r = fluctuation(f, psd, 0).ratio;
        rel.push(Math.abs(r * Math.sqrt(segments) - 1));
      }
      const worst = Math.max(...rel);
      const tol = 4 / Math.sqrt(2 * (8192 / 32 / 2)); // pire cas : M = L/2 = 128
      return {
        ok: worst < tol,
        detail: `max|σ/moy·√K − 1| = ${worst.toFixed(3)} sur K = 2…32 (tol ${tol.toFixed(3)})`,
      };
    },
  },
  {
    name: 'la segmentation compte juste : Welch obtient 2N/L − 1 segments, Bartlett N/L',
    category: 'numeric',
    run() {
      // Comptage exact, pas statistique : c'est la comptabilité qui décide
      // du gain de Welch, et une erreur d'un segment fausserait la loi
      // ci-dessus sans rien casser de visible.
      const x = whiteNoise(4096, 1, 5);
      const bad = [];
      for (const L of [64, 128, 256, 512, 1024]) {
        for (const [method, want] of [
          ['bartlett', 4096 / L],
          ['welch', (2 * 4096) / L - 1],
        ]) {
          const s = segmentation(method, 4096, L);
          const got = averagedPeriodogram(x, s.L, s.hop, 'hann').segments;
          if (got !== want) bad.push(`${method} L=${L}: ${got} ≠ ${want}`);
        }
      }
      return { ok: bad.length === 0, detail: bad.length ? bad.join(' · ') : 'exact pour L = 64…1024' };
    },
  },
  {
    name: 'sans bruit, la raie tombe exactement sur son bin',
    category: 'numeric',
    run() {
      // 150 Hz et 190 Hz à Fs = 1000 sur N = 2048 : 307.2 et 389.12 bins,
      // donc pas de bin exact — le maximum doit être le bin le plus proche,
      // et pas un voisin. Vérifie que l'axe des fréquences n'est pas décalé
      // d'un demi-bin, l'erreur classique et invisible à l'œil.
      const { observables: o } = compute({ ...BASE, snr: 200, a2: 0, df: 40 });
      const bin = FS / BASE.N;
      const peakNear = (fc) => {
        let best = -1;
        let bestV = -Infinity;
        for (let k = 0; k < o.psd.x.length; k++) {
          if (Math.abs(o.psd.x[k] - fc) > 5 * bin) continue;
          if (o.psd.y[k] > bestV) {
            bestV = o.psd.y[k];
            best = k;
          }
        }
        return o.psd.x[best];
      };
      const worst = maxGap([150, 190], peakNear, (fc) => fc);
      return { ok: worst <= bin, detail: `écart max ${worst.toFixed(3)} Hz ≤ 1 bin = ${bin.toFixed(3)} Hz` };
    },
  },
  {
    name: 'la fluctuation tracée est celle que la statline annonce',
    category: 'numeric',
    run() {
      // Le point K = 1 de la courbe et le nombre affiché doivent être le
      // MÊME calcul : la scène 5 affirme à voix haute que le périodogramme
      // brut est le cas dégénéré de Welch, et c'est vérifiable.
      const { observables: o } = compute({ ...BASE, method: 'raw' });
      const i = 0; // le premier point du balayage EST le périodogramme brut
      return {
        ok: Math.abs(o.fluctVsK.y[i] - o.stdRatio.value) < 1e-12 && o.fluctVsK.x[i] === 1,
        detail: `K=${o.fluctVsK.x[i]}, tracé ${o.fluctVsK.y[i].toFixed(6)} vs statline ${o.stdRatio.value.toFixed(6)}`,
      };
    },
  },
  {
    name: "variance vraie (Monte-Carlo) : la loi en 1/√K, et ce que le recouvrement coûte",
    category: 'statistical',
    run() {
      // Correction d'une affirmation que j'avais d'abord écrite de travers.
      // La vue « Fluctuation vs K » mesure la dispersion D'UN BIN À L'AUTRE :
      // c'est ce que l'œil voit comme de l'herbe, mais ce n'est PAS la
      // variance de l'estimateur à une fréquence donnée — une fenêtre qui
      // lisse corrèle les bins voisins et rabaisse ce nombre. La vraie
      // variance se mesure sur des RÉALISATIONS indépendantes, ici R = 200
      // graines, à f = 300 Hz (bande sans raie).
      //
      // Le résultat, qui est celui du cours et non un détail numérique :
      //   brut          σ/moy·√K ≈ 1     — pas consistant
      //   Bartlett      ≈ 1              — segments disjoints, donc indépendants
      //   Welch + Hann  ≈ 1              — le recouvrement est presque GRATUIT
      //   Welch + rect  ≥ 1.10           — il COÛTE 20 %
      // Autrement dit le recouvrement de Welch ne paie qu'avec une fenêtre
      // qui s'atténue sur les bords : c'est la raison d'être de cette
      // fenêtre, et sans elle deux segments voisins partagent la moitié de
      // leurs échantillons sans aucune atténuation.
      const R = 200;
      const N = 4096;
      const ratio = (method, win, L) => {
        const s = segmentation(method, N, L);
        const v = [];
        let K = 0;
        for (let r = 0; r < R; r++) {
          const { f, psd, segments } = averagedPeriodogram(whiteNoise(N, 1, 5000 + r), s.L, s.hop, win);
          K = segments;
          let k = 0;
          while (f[k] < 300) k++;
          v.push(psd[k]);
        }
        const m = v.reduce((a, b) => a + b, 0) / R;
        const sd = Math.sqrt(v.reduce((a, b) => a + (b - m) ** 2, 0) / R);
        return (sd / m) * Math.sqrt(K);
      };
      // erreur-type d'un écart-type estimé sur R réalisations : 1/√(2R) = 5 %,
      // tolérance 3 SE = 15 %
      const raw = ratio('raw', 'rect', N);
      const bart = ratio('bartlett', 'rect', 256);
      const wHann = ratio('welch', 'hann', 256);
      const wRect = ratio('welch', 'rect', 256);
      const near1 = (v) => Math.abs(v - 1) < 0.15;
      return {
        ok: near1(raw) && near1(bart) && near1(wHann) && wRect > 1.1,
        detail:
          `brut ${raw.toFixed(3)} · Bartlett ${bart.toFixed(3)} · ` +
          `Welch+Hann ${wHann.toFixed(3)} · Welch+rect ${wRect.toFixed(3)} (doit dépasser 1.10)`,
      };
    },
  },
  {
    name: 'la raie faible est exactement A₂ dB sous la forte',
    category: 'numeric',
    run() {
      // A₂ est un niveau en dB, donc un rapport de PUISSANCES : l'écart entre
      // les deux pics DOIT valoir A₂, pas 2·A₂. Sans bruit et sur des
      // segments longs, les deux pics sont propres et l'écart est exact à la
      // discrétisation du bin près.
      const worst = maxGap(
        [-5, -10, -20, -35, -50],
        (a2) => {
          const { observables: o } = compute({ ...BASE, snr: 200, a2, df: 40, N: 8192, win: 'hann' });
          // La PUISSANCE du lobe, pas la hauteur du pic : ni 150 ni 190 Hz
          // ne tombent sur un bin exact, et la perte de feston diffère de
          // l'un à l'autre. Sommer la densité sur le lobe l'annule, et
          // l'identité redevient exacte au lieu d'être « à 0.4 dB près ».
          const lobe = (fc) => {
            let p = 0;
            for (let k = 0; k < o.psd.x.length; k++)
              if (Math.abs(o.psd.x[k] - fc) <= 2) p += 10 ** (o.psd.y[k] / 10);
            return 10 * Math.log10(p);
          };
          return lobe(190) - lobe(150);
        },
        (a2) => a2
      );
      return { ok: worst < 0.05, detail: `écart max ${worst.toFixed(4)} dB sur A₂ = −5…−50 dB` };
    },
  },
  {
    name: 'la somme des fenêtres raconte les quatre cas, exactement',
    category: 'numeric',
    run() {
      // La vue « Découpage et recouvrement » repose entièrement sur cette
      // somme, et chacun des quatre cas est une identité EXACTE, pas une
      // tendance : c'est ce qui permet de l'affirmer devant une salle.
      //   rect  disjoint  → 1 partout
      //   rect  50 %      → 2 partout (chaque échantillon compté deux fois)
      //   Hann  50 %      → 1 partout (COLA : reconstruction parfaite)
      //   Hann  disjoint  → descend à ~0 entre les segments (bords jetés)
      const cases = [
        { method: 'bartlett', win: 'rect', min: 1, max: 1 },
        { method: 'welch', win: 'rect', min: 2, max: 2 },
        { method: 'welch', win: 'hann', min: 1, max: 1 },
      ];
      const bad = [];
      for (const c of cases) {
        const { observables: o } = compute({ ...BASE, method: c.method, win: c.win, N: 4096, L: 256 });
        // régime intérieur seulement : les bords extrêmes n'ont pas de voisin
        let lo = Infinity;
        let hi = -Infinity;
        for (let i = 256; i < o.windowSum.y.length - 256; i++) {
          lo = Math.min(lo, o.windowSum.y[i]);
          hi = Math.max(hi, o.windowSum.y[i]);
        }
        if (Math.abs(lo - c.min) > 1e-12 || Math.abs(hi - c.max) > 1e-12)
          bad.push(`${c.method}/${c.win}: [${lo.toFixed(6)}, ${hi.toFixed(6)}] ≠ [${c.min}, ${c.max}]`);
      }
      // et le cas qui MOTIVE le recouvrement : Hann disjoint jette les bords
      const { observables: h } = compute({ ...BASE, method: 'bartlett', win: 'hann', N: 4096, L: 256 });
      let lo = Infinity;
      for (let i = 256; i < h.windowSum.y.length - 256; i++) lo = Math.min(lo, h.windowSum.y[i]);
      if (lo > 1e-9) bad.push(`bartlett/hann: creux à ${lo.toFixed(6)}, attendu ~0`);
      return {
        ok: bad.length === 0,
        detail: bad.length ? bad.join(' · ') : 'rect/disjoint=1, rect/50 %=2, Hann/50 %=1, Hann/disjoint→0 (exact)',
      };
    },
  },
  standardChecks.determinism(compute, BASE, 'psd'),
  standardChecks.determinism(compute, BASE, 'signal'),
];
