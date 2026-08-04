import { compute, theoreticalSidelobe, windowSpectrum } from './compute.js';
import { standardChecks, maxGap } from '../../../core/checks.js';
import { windowValue } from '../../../core/numeric.js';

const BASE = { N: 256, pad: 4, f1: 200, df: 15, a2: -20, win: 'rect', seed: 1 };

export const checks = [
  {
    name: 'Parseval holds through the zero-padded DFT',
    category: 'numeric',
    run() {
      const { observables: o } = compute({ ...BASE, win: 'hann' });
      return {
        ok: o.parsevalGap < 1e-9,
        detail: `relative gap=${o.parsevalGap.toExponential(2)}`,
      };
    },
  },
  {
    name: 'periodic Hann ENBW = 1.5 bins (exact identity)',
    category: 'numeric',
    run() {
      // periodic Hann: Σw = N/2 and Σw² = 3N/8 exactly, so ENBW = 1.5
      const { observables: o } = compute({ ...BASE, win: 'hann' });
      const gap = Math.abs(o.enbw.value - 1.5);
      return { ok: gap < 1e-12, detail: `ENBW=${o.enbw.value} (gap ${gap.toExponential(1)})` };
    },
  },
  {
    name: 'rect first sidelobe at −13.26 dB (Dirichlet kernel)',
    category: 'numeric',
    run() {
      const { observables: o } = compute({ ...BASE, win: 'rect' });
      return {
        ok: Math.abs(o.sidelobe.value - -13.26) < 0.15,
        detail: `measured=${o.sidelobe.value.toFixed(2)} dB`,
      };
    },
  },
  {
    name: 'Hann highest sidelobe at −31.5 dB',
    category: 'numeric',
    run() {
      const { observables: o } = compute({ ...BASE, win: 'hann' });
      return {
        ok: Math.abs(o.sidelobe.value - -31.5) < 0.3,
        detail: `measured=${o.sidelobe.value.toFixed(2)} dB`,
      };
    },
  },
  {
    name: 'an on-bin full-scale tone reads 0 dB at its exact frequency',
    category: 'numeric',
    run() {
      // f1 = 250 Hz sits exactly on bin 256 of Nfft = 1024 (Fs = 1000);
      // normalization by the coherent gain Σw/2 puts its peak at 0 dB (the
      // −80 dB second tone and the negative-frequency image only perturb at
      // the ~0.01 dB level)
      const { observables: o } = compute({ ...BASE, f1: 250, a2: -80 });
      const okDb = Math.abs(o.peakDb) < 0.05;
      const okF = Math.abs(o.peakF - 250) < 1000 / 1024 / 2;
      return {
        ok: okDb && okF,
        detail: `peak=${o.peakDb.toFixed(4)} dB at ${o.peakF.toFixed(3)} Hz`,
      };
    },
  },
  standardChecks.determinism(compute, BASE, 'spectrum'),
  {
    name: 'sidelobes: the computed theory matches the literature',
    category: 'numeric',
    run() {
      // Les quatre chiffres du cours (Harris 1978), retrouvés par le calcul
      // en forme close et non recopiés dans compute.js. À N = 1024 la
      // fenêtre est assez longue pour que la valeur asymptotique soit
      // atteinte, donc la comparaison est légitime à 0.02 dB.
      const lit = { rect: -13.26, hann: -31.47, hamming: -42.68, blackman: -58.11 };
      const worst = maxGap(
        Object.keys(lit),
        (win) => theoreticalSidelobe(win, 1024).db,
        (win) => lit[win]
      );
      const got = Object.keys(lit)
        .map((w) => `${w} ${theoreticalSidelobe(w, 1024).db.toFixed(2)}`)
        .join(', ');
      return { ok: worst < 0.02, detail: `${got} — écart max ${worst.toFixed(3)} dB` };
    },
  },
  {
    name: 'the closed form equals the direct sum (1e-14)',
    category: 'numeric',
    run() {
      // La forme close n'est pas une approximation : c'est la même TFtd,
      // réarrangée en noyaux de Dirichlet décalés. Si elle dérivait, la
      // « théorie » affichée serait une fiction — donc on l'épingle contre
      // la définition, sur les quatre fenêtres et trois longueurs.
      let worst = 0;
      for (const win of ['rect', 'hann', 'hamming', 'blackman']) {
        for (const N of [64, 256, 1024]) {
          const w = Float64Array.from({ length: N }, (_, n) => windowValue(win, n, N));
          for (let b = 0; b <= 12; b += 0.25) {
            let re = 0;
            let im = 0;
            for (let n = 0; n < N; n++) {
              const th = (2 * Math.PI * b * n) / N;
              re += w[n] * Math.cos(th);
              im -= w[n] * Math.sin(th);
            }
            worst = Math.max(worst, Math.abs(windowSpectrum(win, N, b) - Math.hypot(re, im)) / N);
          }
        }
      }
      return { ok: worst < 1e-14, detail: `max|Δ|/N = ${worst.toExponential(2)}` };
    },
  },
  {
    name: 'the plot reads the right lobe: below theory, and by less and less',
    category: 'numeric',
    run() {
      // La grille du tracé (16× de bourrage) ne tombe pas sur le sommet du
      // lobe : la lecture est donc TOUJOURS sous la théorie, et l'écart se
      // resserre quand la fenêtre s'allonge. Une lecture AU-DESSUS
      // signalerait un bug de normalisation ou de recherche du lobe.
      const bad = [];
      for (const win of ['rect', 'hann', 'hamming', 'blackman']) {
        const gaps = [64, 256, 1024].map((N) => {
          const { observables: o } = compute({ ...BASE, win, N });
          return o.sidelobeGap.value;
        });
        if (gaps.some((g) => g > 1e-9)) bad.push(`${win}: lu au-dessus de la théorie (${gaps.map((g) => g.toFixed(3))})`);
        if (Math.abs(gaps[2]) > 0.35) bad.push(`${win}: écart ${gaps[2].toFixed(3)} dB encore grand à N=1024`);
      }
      return { ok: bad.length === 0, detail: bad.length ? bad.join(' · ') : 'lu ≤ théorie sur les 4 fenêtres, resserré à N = 1024' };
    },
  },
];
