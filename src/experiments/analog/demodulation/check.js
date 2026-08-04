import { compute, desa2, analytic, unwrap } from './compute.js';
import { standardChecks, maxGap, range } from '../../../core/checks.js';

const FS = 8000;
const BASE = { fc: 1000, ka: 0.5, fam: 40, fdev: 200, ffm: 25, snr: 40, seed: 34 };

/** Une sinusoïde pure de n échantillons. */
const tone = (n, A, f, phi = 0) =>
  Float64Array.from({ length: n }, (_, i) => A * Math.cos((2 * Math.PI * f * i) / FS + phi));

export const checks = [
  {
    name: 'DESA-2 is EXACT on a pure sinusoid — amplitude and frequency',
    category: 'numeric',
    run() {
      // Pas « précis », exact : sur x[n] = A·cos(Ωn+φ), les deux formules de
      // DESA-2 se réduisent algébriquement à A et Ω. C'est la propriété qui
      // justifie d'appeler Ψ un opérateur d'ÉNERGIE — il porte le produit
      // amplitude × fréquence, et deux applications suffisent à les séparer.
      let worstA = 0;
      let worstF = 0;
      for (const [A, f, phi] of [
        [1, 1000, 0],
        [0.4, 500, 0.7],
        [2.5, 1800, -1.2],
        [0.05, 120, 2.4],
      ]) {
        const x = tone(512, A, f, phi);
        const d = desa2(x);
        for (let i = 5; i < 512 - 5; i++) {
          worstA = Math.max(worstA, Math.abs(d.amp[i] - A));
          worstF = Math.max(worstF, Math.abs((d.omega[i] * FS) / (2 * Math.PI) - f));
        }
      }
      return {
        ok: worstA < 1e-11 && worstF < 1e-7,
        detail: `|ΔA| ≤ ${worstA.toExponential(2)}, |Δf| ≤ ${worstF.toExponential(2)} Hz`,
      };
    },
  },
  {
    name: 'DESA-2 folds above Fs/4, by exactly 2(f − Fs/4)',
    category: 'numeric',
    run() {
      // Le domaine de l'estimateur, démontré plutôt que constaté : Ω sort
      // d'un ½·arccos, donc Ω ≤ π/2, donc f ≤ Fs/4. Au-delà l'estimation
      // se replie comme un sous-échantillonnage — et le repliement est
      // EXACT, ce qui prouve que c'est bien la borne de l'arccos qui agit
      // et pas une dégradation vague. C'est le sujet de la scène 4.
      const worst = maxGap(
        [2100, 2500, 3000, 3500],
        (f) => {
          const d = desa2(tone(512, 1, f));
          let s = 0;
          let n = 0;
          for (let i = 5; i < 512 - 5; i++) {
            s += (d.omega[i] * FS) / (2 * Math.PI);
            n++;
          }
          return s / n;
        },
        (f) => FS / 2 - f // le replié
      );
      return { ok: worst < 1e-6, detail: `écart au repliement théorique : ${worst.toExponential(2)} Hz` };
    },
  },
  {
    name: 'Hilbert: |x + j·H{x}| = A on a pure sinusoid',
    category: 'numeric',
    run() {
      // Le signal analytique d'une sinusoïde est A·e^{jΩn} : son module est
      // constant, exactement. Vérifié hors des bords — la TFD traite
      // l'enregistrement comme périodique, et le raccord y crée une
      // discontinuité qui n'appartient pas au signal.
      let worst = 0;
      for (const [A, f] of [
        [1.3, 1000],
        [0.2, 250],
        [3, 3000],
      ]) {
        const n = 1024;
        const z = analytic(tone(n, A, f));
        for (let i = 48; i < n - 48; i++)
          worst = Math.max(worst, Math.abs(Math.hypot(z.re[i], z.im[i]) - A));
      }
      return { ok: worst < 1e-11, detail: `|ΔA| max ${worst.toExponential(2)}` };
    },
  },
  {
    name: 'Hilbert: exact on a DFT bin, and not elsewhere',
    category: 'numeric',
    run() {
      // Le domaine de Hilbert, symétrique de celui de DESA — et je l'avais
      // d'abord écrit de travers en le rangeant dans « les effets de bord ».
      // Ce n'est pas ça : la TFD traite l'enregistrement comme PÉRIODIQUE,
      // donc une sinusoïde qui ne boucle pas exactement sur N échantillons
      // crée une discontinuité de raccord, dont la fuite est GLOBALE et pas
      // confinée aux bords.
      //
      // Sur un bin (f multiple de Fs/N), la fréquence instantanée sort à
      // 1e-10 près. Hors bin, à 8.5 Hz près sur une porteuse de 1200 Hz —
      // et cela ne s'améliore pas en s'éloignant des bords. Le check dit
      // les deux, parce que n'affirmer que le premier serait choisir ses
      // fréquences pour se donner raison.
      const n = 1024;
      const bin = FS / n;
      const worstOf = (f) => {
        const z = analytic(tone(n, 1, f));
        const ph = Float64Array.from({ length: n }, (_, i) => Math.atan2(z.im[i], z.re[i]));
        const up = unwrap(ph);
        let w = 0;
        for (let i = 49; i < n - 49; i++)
          w = Math.max(w, Math.abs(((up[i + 1] - up[i - 1]) / 2) * (FS / (2 * Math.PI)) - f));
        return w;
      };
      const onBin = maxGap([1000, 1203.125, 1500, 2500], worstOf, () => 0);
      const offBin = worstOf(1200); // 153.6 bins
      return {
        ok: onBin < 1e-8 && offBin > 1 && offBin < 30,
        detail:
          `sur un bin ≤ ${onBin.toExponential(2)} Hz · hors bin (1200 Hz = ${(1200 / bin).toFixed(1)} bins) ` +
          `${offBin.toFixed(2)} Hz — la fuite du raccord périodique`,
      };
    },
  },
  {
    name: 'with no noise, the remaining error is COUPLING, not chance',
    category: 'numeric',
    run() {
      // Aucune des deux méthodes n'est exacte sur un signal AM ET FM
      // simultané : toutes deux supposent implicitement que l'enveloppe et
      // la phase varient lentement devant la porteuse. Le plancher doit
      // donc être petit mais NON NUL, et surtout DÉTERMINISTE — s'il
      // bougeait avec la graine, ce serait du bruit résiduel et le modèle
      // du signal serait faux.
      const a = compute({ ...BASE, snr: 200, seed: 1 }).observables;
      const b = compute({ ...BASE, snr: 200, seed: 999 }).observables;
      const same =
        Math.abs(a.errFreqTeager.value - b.errFreqTeager.value) < 1e-6 &&
        Math.abs(a.errAmpHilbert.value - b.errAmpHilbert.value) < 1e-9;
      const bounded =
        a.errAmpHilbert.value < 0.01 &&
        a.errAmpTeager.value < 0.01 &&
        a.errFreqHilbert.value < 6 &&
        a.errFreqTeager.value < 6 &&
        a.errFreqTeager.value > 0.5;
      return {
        ok: same && bounded,
        detail:
          `A : Hilbert ${a.errAmpHilbert.value.toExponential(2)}, Teager ${a.errAmpTeager.value.toExponential(2)} · ` +
          `f : ${a.errFreqHilbert.value.toFixed(2)} / ${a.errFreqTeager.value.toFixed(2)} Hz, indépendant de la graine`,
      };
    },
  },
  {
    name: 'under noise, Teager degrades two to three times faster',
    category: 'statistical',
    run() {
      // L'affirmation centrale de la scène 3, et elle est mesurée avant
      // d'être écrite. Ψ est un PRODUIT d'échantillons voisins : le bruit y
      // entre au carré sans aucun moyennage, alors que la FFT de Hilbert
      // moyenne sur tout l'enregistrement. Le rapport est pris sur trois
      // SNR et trois graines pour ne pas dépendre d'un tirage.
      const bad = [];
      for (const snr of [30, 20, 10]) {
        const ratios = [1, 2, 3].map((seed) => {
          const o = compute({ ...BASE, snr, seed }).observables;
          return o.errFreqTeager.value / o.errFreqHilbert.value;
        });
        const mean = ratios.reduce((a, b) => a + b, 0) / ratios.length;
        if (mean < 1.5) bad.push(`SNR ${snr} dB : rapport ${mean.toFixed(2)} < 1.5`);
      }
      return {
        ok: bad.length === 0,
        detail: bad.length ? bad.join(' · ') : 'Teager/Hilbert ≥ 1.5 à 30, 20 et 10 dB (3 graines)',
      };
    },
  },
  {
    name: 'Teager announces its own failure (arccos out of domain)',
    category: 'numeric',
    run() {
      // La propriété rare que la scène 3 met en avant : quand le modèle
      // sinusoïdal local ne tient plus, l'argument de l'arccos sort de
      // [−1, 1] et l'algorithme le SAIT. Ce compteur doit être nul quand
      // tout va bien et croître quand ça se dégrade — sinon la statline
      // afficherait un diagnostic qui n'en est pas un.
      const c = (snr) => compute({ ...BASE, snr }).observables.clipped.value;
      const clean = c(40);
      const mid = c(20);
      const bad = c(10);
      return {
        ok: clean === 0 && mid > 0 && bad > mid,
        detail: `40 dB → ${clean}, 20 dB → ${mid}, 10 dB → ${bad}`,
      };
    },
  },
  standardChecks.determinism(compute, BASE, 'envHilbert'),
  standardChecks.determinism(compute, BASE, 'freqTeager'),
];
