import { compute } from './compute.js';
import { standardChecks, maxGap, range } from '../../../core/checks.js';
import { mulberry32, gaussFrom } from '../../../core/rng.js';
import {
  covariance,
  hermitianEig,
  musicPseudo,
  rootMusic,
  esprit,
  lsAmplitudes,
} from '../_lib/subspace.js';

const FS = 1000;
const BASE = { sources: 2, df: 0.5, snr: 25, N: 256, M: 32, d: 2, estimator: 'esprit', seed: 34 };

/** Un enregistrement de d exponentielles complexes, sans bruit. */
const tones = (N, freqs) => {
  const xr = new Float64Array(N);
  const xi = new Float64Array(N);
  for (let n = 0; n < N; n++)
    for (const f of freqs) {
      const w = (2 * Math.PI * f * n) / FS;
      xr[n] += Math.cos(w);
      xi[n] += Math.sin(w);
    }
  return { xr, xi };
};

export const checks = [
  {
    name: 'décomposition propre : R·v = λ·v et vecteurs orthonormés',
    category: 'numeric',
    run() {
      // La brique dont tout dépend, épinglée par sa DÉFINITION plutôt que
      // par son résultat : sur des hermitiennes tirées au hasard, le couple
      // (λ, v) doit satisfaire l'équation aux valeurs propres, et la base
      // doit être orthonormée. Si l'un des deux lâche, MUSIC et ESPRIT
      // donneraient des nombres plausibles et faux.
      const g = gaussFrom(mulberry32(7));
      let worstEig = 0;
      let worstOrtho = 0;
      for (const M of [4, 8, 16]) {
        const re = new Float64Array(M * M);
        const im = new Float64Array(M * M);
        for (let i = 0; i < M; i++)
          for (let j = i; j < M; j++) {
            const a = g();
            const b = i === j ? 0 : g();
            re[i * M + j] = a;
            re[j * M + i] = a;
            im[i * M + j] = b;
            im[j * M + i] = -b;
          }
        const e = hermitianEig(re, im, M);
        for (let k = 0; k < M; k++)
          for (let i = 0; i < M; i++) {
            let sr = 0;
            let si = 0;
            for (let j = 0; j < M; j++) {
              const ar = re[i * M + j];
              const ai = im[i * M + j];
              const br = e.re[j * M + k];
              const bi = e.im[j * M + k];
              sr += ar * br - ai * bi;
              si += ar * bi + ai * br;
            }
            worstEig = Math.max(
              worstEig,
              Math.hypot(sr - e.values[k] * e.re[i * M + k], si - e.values[k] * e.im[i * M + k])
            );
          }
        for (let p = 0; p < M; p++)
          for (let q = 0; q < M; q++) {
            let sr = 0;
            let si = 0;
            for (let i = 0; i < M; i++) {
              const ar = e.re[i * M + p];
              const ai = e.im[i * M + p];
              const br = e.re[i * M + q];
              const bi = e.im[i * M + q];
              sr += ar * br + ai * bi;
              si += ar * bi - ai * br;
            }
            worstOrtho = Math.max(worstOrtho, Math.hypot(sr - (p === q ? 1 : 0), si));
          }
      }
      return {
        ok: worstEig < 1e-11 && worstOrtho < 1e-11,
        detail: `‖Rv−λv‖ ≤ ${worstEig.toExponential(2)}, ‖VᴴV−I‖ ≤ ${worstOrtho.toExponential(2)}`,
      };
    },
  },
  {
    name: 'sans bruit, le rang de la covariance EST le nombre de sources',
    category: 'numeric',
    run() {
      // La structure sur laquelle repose toute la méthode : d exponentielles
      // engendrent un sous-espace de dimension exactement d, donc M−d
      // valeurs propres RIGOUREUSEMENT nulles. C'est une identité, pas une
      // tendance — et c'est ce qui justifie de parler de « sous-espace bruit ».
      const bad = [];
      for (const freqs of [[200], [200, 240], [200, 201.2, 330]]) {
        const M = 20;
        const { xr, xi } = tones(512, freqs);
        const e = hermitianEig(...Object.values(covariance(xr, xi, M)).slice(0, 2), M);
        const top = e.values[0];
        let worst = 0;
        for (let k = freqs.length; k < M; k++) worst = Math.max(worst, Math.abs(e.values[k]) / top);
        if (worst > 1e-11) bad.push(`d=${freqs.length}: λ résiduelle ${worst.toExponential(2)}`);
      }
      return { ok: bad.length === 0, detail: bad.length ? bad.join(' · ') : 'λ_{d+1..M} = 0 à 1e-11 pour d = 1, 2, 3' };
    },
  },
  {
    name: 'sans bruit, ESPRIT rend les fréquences à la précision machine',
    category: 'numeric',
    run() {
      // ESPRIT ne balaie rien : sa précision n'est pas limitée par une
      // grille mais par le conditionnement. Sans bruit, l'erreur doit être
      // celle de l'arithmétique flottante, pas celle d'un pas.
      const M = 20;
      const worst = maxGap(
        [[200, 240], [200, 203.9], [200, 201.2, 330]],
        (freqs) => {
          const { xr, xi } = tones(512, freqs);
          const R = covariance(xr, xi, M);
          const e = hermitianEig(R.re, R.im, M);
          const f = esprit(e, M, freqs.length);
          let w = 0;
          for (const target of freqs) {
            let best = Infinity;
            for (const v of f) best = Math.min(best, Math.abs(v * FS - target));
            w = Math.max(w, best);
          }
          return w;
        },
        () => 0
      );
      return { ok: worst < 1e-8, detail: `erreur max ${worst.toExponential(2)} Hz` };
    },
  },
  {
    name: 'sans bruit, root-MUSIC atteint le plancher de sa racine double',
    category: 'numeric',
    run() {
      // Et pas la précision machine, POUR UNE RAISON : le polynôme de
      // root-MUSIC a des racines DOUBLES sur le cercle unité (z_k et son
      // conjugué-inverse coïncident quand |z| = 1). Sur une racine de
      // multiplicité m, l'itération de Durand–Kerner plafonne à ε^{1/m},
      // soit ≈ 1.5e-8 pour m = 2. Mesuré : quelques 1e-9 en fréquence
      // normalisée. Prendre 1e-15 ici serait exiger de l'algèbre ce qu'elle
      // ne peut pas donner ; prendre 1e-2 masquerait une vraie régression.
      const M = 20;
      const worst = maxGap(
        [[200, 240], [200, 203.9], [200, 201.2, 330]],
        (freqs) => {
          const { xr, xi } = tones(512, freqs);
          const R = covariance(xr, xi, M);
          const e = hermitianEig(R.re, R.im, M);
          const f = rootMusic(e, M, freqs.length);
          let w = 0;
          for (const target of freqs) {
            let best = Infinity;
            for (const v of f) best = Math.min(best, Math.abs(v * FS - target));
            w = Math.max(w, best);
          }
          return w;
        },
        () => 0
      );
      return { ok: worst < 1e-4, detail: `erreur max ${worst.toExponential(2)} Hz (plancher √ε de la racine double)` };
    },
  },
  {
    name: 'le pseudo-spectre culmine aux fréquences vraies',
    category: 'numeric',
    run() {
      // MUSIC balaie, donc sa précision EST celle de la grille : on lui
      // demande d'être juste à un pas près, pas mieux.
      const M = 20;
      const freqs = [200, 203.9];
      const { xr, xi } = tones(512, freqs);
      const R = covariance(xr, xi, M);
      const e = hermitianEig(R.re, R.im, M);
      const n = 4001;
      const grid = Float64Array.from({ length: n }, (_, k) => (180 + (40 * k) / (n - 1)) / FS);
      const ps = musicPseudo(e, M, 2, grid);
      const peaks = [];
      for (let k = 1; k < n - 1; k++)
        if (ps[k] > ps[k - 1] && ps[k] >= ps[k + 1] && ps[k] > 1e6) peaks.push(grid[k] * FS);
      const step = (40 / (n - 1)) * 1.001;
      const ok =
        peaks.length === 2 &&
        freqs.every((f) => peaks.some((p) => Math.abs(p - f) <= step));
      return { ok, detail: `${peaks.length} pics : ${peaks.map((p) => p.toFixed(3)).join(', ')} Hz (pas ${step.toFixed(4)})` };
    },
  },
  {
    name: 'LE propos : MUSIC sépare ce que le périodogramme fond en une bosse',
    category: 'numeric',
    run() {
      // La raison d'être de l'expérience, énoncée comme une vérification :
      // à 0.3 × Fs/N, le périodogramme n'a QU'UN maximum et le
      // pseudo-spectre en a DEUX, sur le même enregistrement bruité.
      const { observables: o } = compute({ ...BASE });
      const count = (s, thresh) => {
        let c = 0;
        for (let k = 1; k < s.y.length - 1; k++)
          if (s.y[k] > s.y[k - 1] && s.y[k] >= s.y[k + 1] && s.y[k] > thresh) c++;
        return c;
      };
      const nP = count(o.periodogram, -10);
      const nM = count(o.pseudo, -20);
      return {
        ok: nP === 1 && nM === 2,
        detail: `périodogramme ${nP} pic, pseudo-spectre ${nM} pics`,
      };
    },
  },
  {
    name: 'le plateau des valeurs propres est le vrai niveau de bruit 2σ²',
    category: 'statistical',
    run() {
      // Deux corrections de physique par rapport à ce que j'avais écrit.
      //
      // 1. Le niveau n'est pas σ² mais 2σ² : le bruit est complexe
      //    circulaire et porte σ² PAR QUADRATURE. Trois décibels d'écart,
      //    invisibles à l'œil sur un plateau et faux quand même.
      // 2. On ne peut pas exiger que CHAQUE valeur propre du plateau vaille
      //    2σ². Sur une covariance ESTIMÉE avec L instantanés, les valeurs
      //    propres du bruit s'étalent selon Marchenko–Pastur, entre
      //    (1±√(M/L))²·2σ² — soit ici −4.0 à +2.9 dB. Cet étalement est
      //    physique et se VOIT sur la vue ; c'est la MOYENNE du plateau qui
      //    vaut 2σ², avec une erreur-type de √(M/L)/√(M−d) ≈ 8 %.
      const { observables: o } = compute({ ...BASE });
      const M = o.eigenvalues.y.length;
      const L = o.snapshots.value;
      const plateau = Array.from(o.eigenvalues.y).slice(6); // franchement dans le bruit
      const mean = plateau.reduce((a, b) => a + b, 0) / plateau.length;
      const c = Math.sqrt(M / L);
      const edges = [10 * Math.log10((1 - c) ** 2), 10 * Math.log10((1 + c) ** 2)];
      const tol = 4 * (10 * Math.log10(1 + c / Math.sqrt(plateau.length)));
      const lo = Math.min(...plateau) - o.noiseLine;
      const hi = Math.max(...plateau) - o.noiseLine;
      return {
        ok: Math.abs(mean - o.noiseLine) < tol && lo > edges[0] - 1.5 && hi < edges[1] + 1.5,
        detail:
          `moyenne ${(mean - o.noiseLine).toFixed(2)} dB de 2σ² (tol ${tol.toFixed(2)}), ` +
          `étalement [${lo.toFixed(1)}, ${hi.toFixed(1)}] vs Marchenko–Pastur [${edges[0].toFixed(1)}, ${edges[1].toFixed(1)}]`,
      };
    },
  },
  {
    name: 'se tromper de d : par défaut une source disparaît, par excès on en invente',
    category: 'numeric',
    run() {
      // Deuxième correction de ma propre pédagogie par la mesure. J'avais
      // écrit que d trop grand faisait apparaître des « pics fantômes » sur
      // le pseudo-spectre. C'est faux ici : à d = 5 pour 3 sources, les
      // ondulations parasites restent 50 dB sous les vrais pics et le tracé
      // reste propre. MUSIC balayé est INDULGENT à une surestimation de d.
      //
      // Ce qui casse, et bien plus nettement, ce sont les estimateurs
      // PARAMÉTRIQUES : root-MUSIC et ESPRIT rendent exactement d nombres,
      // donc à d = 5 ils rendent cinq fréquences dont deux ne correspondent
      // à aucune source — mesuré à 443 et 839 Hz. Un chiffre inventé est
      // plus dangereux qu'un pic bas, parce qu'il a l'air d'un résultat.
      const peaks = (d) => {
        const { observables: o } = compute({ ...BASE, sources: 3, d, snr: 30 });
        let c = 0;
        for (let k = 1; k < o.pseudo.y.length - 1; k++)
          if (o.pseudo.y[k] > o.pseudo.y[k - 1] && o.pseudo.y[k] >= o.pseudo.y[k + 1] && o.pseudo.y[k] > -40)
            c++;
        return c;
      };
      const truth = [200, 200 + 0.5 * (1000 / BASE.N), 330];
      const spurious = (d) => {
        const { observables: o } = compute({ ...BASE, sources: 3, d, snr: 30 });
        const est = [...o.espritMarks.x];
        if (est.length !== d || est.some((v) => !Number.isFinite(v))) return -1;
        return est.filter((v) => Math.min(...truth.map((t) => Math.abs(v - t))) > 5).length;
      };
      const p2 = peaks(2);
      const p3 = peaks(3);
      const s3 = spurious(3);
      const s5 = spurious(5);
      return {
        ok: p2 < 3 && p3 === 3 && s3 === 0 && s5 >= 2,
        detail: `d=2 → ${p2} pics · d=3 → ${p3} pics, ${s3} estimation aberrante · d=5 → ${s5} aberrantes sur 5`,
      };
    },
  },
  {
    name: 'sans bruit, les moindres carrés rendent les amplitudes exactes',
    category: 'numeric',
    run() {
      // Une fois les fréquences connues, le modèle est LINÉAIRE : le moindres
      // carrés n'est donc pas une approximation mais une résolution, et sans
      // bruit il doit rendre l'amplitude au chiffre près et un résidu nul.
      // Si cette étape dérivait, tout le « spectre estimé » deviendrait un
      // dessin plausible et faux.
      const N = 256;
      const f = [200 / FS, 203.9 / FS, 330 / FS];
      const A = [1, 0.5, 0.25];
      const xr = new Float64Array(N);
      const xi = new Float64Array(N);
      for (let n = 0; n < N; n++)
        for (let k = 0; k < 3; k++) {
          const w = 2 * Math.PI * f[k] * n;
          xr[n] += A[k] * Math.cos(w);
          xi[n] += A[k] * Math.sin(w);
        }
      const ls = lsAmplitudes(xr, xi, Float64Array.from(f));
      const worst = maxGap(range(3), (k) => Math.sqrt(ls.power[k]), (k) => A[k]);
      return {
        ok: worst < 1e-9 && ls.noise < 1e-20,
        detail: `|ΔA| ≤ ${worst.toExponential(2)}, résidu ${ls.noise.toExponential(2)}`,
      };
    },
  },
  {
    name: 'deux estimations INDÉPENDANTES du bruit tombent sur le vrai niveau',
    category: 'statistical',
    run() {
      // Le résidu du modèle et la moyenne du plateau des valeurs propres ne
      // partagent aucun calcul : l'un vient d'un moindres carrés dans le
      // domaine temporel, l'autre d'une décomposition propre. Qu'ils
      // concordent, et concordent avec la vérité, est ce qui autorise à dire
      // que le modèle EXPLIQUE la mesure — et pas seulement qu'il a trouvé
      // des raies au bon endroit.
      //
      // Tolérance : l'erreur relative d'une puissance estimée sur N points
      // est ≈ 1/√N = 6 % à N = 256, soit 0.27 dB ; on prend 4 SE, arrondi
      // à 1.5 dB pour couvrir aussi la dispersion du plateau.
      const bad = [];
      for (const snr of [40, 25, 10]) {
        const { observables: o } = compute({ ...BASE, snr });
        const gapPair = Math.abs(o.noiseLs.value - o.noiseEigen.value);
        const gapTrue = Math.abs(o.noiseLs.value - o.noiseRef.value);
        if (gapPair > 1.5 || gapTrue > 1.5)
          bad.push(`SNR ${snr} : résidu ${o.noiseLs.value.toFixed(2)}, v.p. ${o.noiseEigen.value.toFixed(2)}, vrai ${o.noiseRef.value.toFixed(2)} dB`);
      }
      return {
        ok: bad.length === 0,
        detail: bad.length ? bad.join(' · ') : 'accord à 1.5 dB près à 40, 25 et 10 dB',
      };
    },
  },
  {
    name: 'quand le modèle est faux, le résidu le dit — il passe AU-DESSUS',
    category: 'numeric',
    run() {
      // La propriété qui rend la vue utile plutôt que décorative. Avec d trop
      // petit, une source entière tombe dans le résidu : l'estimation du
      // bruit ne peut alors plus être basse, et elle dépasse franchement le
      // vrai niveau. C'est un diagnostic, et il est gratuit.
      const ok3 = compute({ ...BASE, sources: 3, d: 3, snr: 30 }).observables;
      const bad3 = compute({ ...BASE, sources: 3, d: 1, snr: 30 }).observables;
      return {
        ok:
          Math.abs(ok3.noiseLs.value - ok3.noiseRef.value) < 1.5 &&
          bad3.noiseLs.value > ok3.noiseRef.value + 6,
        detail:
          `d juste : ${ok3.noiseLs.value.toFixed(2)} dB (vrai ${ok3.noiseRef.value.toFixed(2)}) · ` +
          `d = 1 : ${bad3.noiseLs.value.toFixed(2)} dB`,
      };
    },
  },
  standardChecks.determinism(compute, BASE, 'pseudo'),
  standardChecks.determinism(compute, BASE, 'eigenvalues'),
];
