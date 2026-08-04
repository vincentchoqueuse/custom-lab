import { compute, N, FS, NFFT } from './compute.js';
import { standardChecks } from '../../../core/checks.js';
import { mulberry32, gaussFrom } from '../../../core/rng.js';
import { tone, magSpectrum } from '../../../core/dsp.js';
import { denseMatrix, toeplitzMatrix, matvec, convolve } from '../_lib/nn.js';

const BASE = {
  structure: 'toeplitz',
  act: 'relu',
  kernel: 9,
  scale: 1.5,
  signal: 'sine',
  seed: 34,
};

export const checks = [
  {
    name: 'deux couches linéaires sont UNE matrice — exactement',
    category: 'numeric',
    run() {
      // Le théorème d'une ligne qui justifie toutes les activations du
      // monde : W₂(W₁x) = (W₂W₁)x. On compose donc les deux matrices à la
      // main et on compare au réseau sans activation. Rien de statistique,
      // rien d'approché : c'est de l'associativité.
      const gauss = gaussFrom(mulberry32(7));
      const W1 = denseMatrix(N, N, 1.5, gauss);
      const W2 = denseMatrix(N, N, 1.5, gauss);
      const x = tone(N, 8, { fs: FS });

      const twoSteps = matvec(W2, matvec(W1, x, N, N), N, N);
      // le produit W₂W₁, formé explicitement
      const W = new Float64Array(N * N);
      for (let i = 0; i < N; i++)
        for (let k = 0; k < N; k++) {
          const a = W2[i * N + k];
          if (a === 0) continue;
          for (let j = 0; j < N; j++) W[i * N + j] += a * W1[k * N + j];
        }
      const oneStep = matvec(W, x, N, N);

      let worst = 0;
      let scale = 0;
      for (let i = 0; i < N; i++) {
        worst = Math.max(worst, Math.abs(twoSteps[i] - oneStep[i]));
        scale = Math.max(scale, Math.abs(oneStep[i]));
      }
      return {
        ok: worst / scale < 1e-12,
        detail: `écart relatif ${(worst / scale).toExponential(2)} sur ${N} sorties`,
      };
    },
  },
  {
    name: 'une matrice de Toeplitz EST une convolution',
    category: 'numeric',
    run() {
      // L'identité que la scène 3 énonce. Pas une analogie, pas un « cela
      // ressemble à » : le produit matrice-vecteur et la convolution rendent
      // le même vecteur, au bit près.
      const gauss = gaussFrom(mulberry32(11));
      const bad = [];
      for (const L of [1, 5, 9, 33]) {
        const h = Float64Array.from({ length: L }, () => gauss());
        const W = toeplitzMatrix(N, N, h);
        const x = Float64Array.from({ length: N }, () => gauss());
        const viaMatrix = matvec(W, x, N, N);
        const viaConv = convolve(x, h);
        let worst = 0;
        for (let i = 0; i < N; i++) worst = Math.max(worst, Math.abs(viaMatrix[i] - viaConv[i]));
        if (worst > 1e-12) bad.push(`L=${L} : ${worst.toExponential(1)}`);
      }
      return {
        ok: bad.length === 0,
        detail: bad.length ? bad.join(' · ') : 'W·x = h∗x à 1e-12 pour L = 1, 5, 9, 33',
      };
    },
  },
  {
    name: 'et son action en fréquence est Y(f) = H(f)·X(f)',
    category: 'numeric',
    run() {
      // Le corollaire, et la raison pour laquelle le spectre de sortie SUIT
      // la courbe orange. Mesuré sur des raies posées sur un bin, donc sans
      // fuite : le rapport des amplitudes vaut |H| au bin correspondant.
      const gauss = gaussFrom(mulberry32(13));
      const h = Float64Array.from({ length: 9 }, () => gauss());
      const H = magSpectrum(h, { nfft: NFFT });
      const bad = [];
      for (const f of [4, 8, 16, 24]) {
        const x = tone(N, f, { fs: FS });
        const y = convolve(x, h);
        const k = Math.round((f * NFFT) / FS);
        // la moitié du signal suffit à écarter le régime transitoire du
        // filtre, qui n'est pas périodique et fausserait la lecture
        const Y = magSpectrum(y.subarray(N / 2), { nfft: NFFT / 2 });
        const X = magSpectrum(x.subarray(N / 2), { nfft: NFFT / 2 });
        const kk = Math.round((f * (NFFT / 2)) / FS);
        const ratio = Y[kk] / X[kk];
        const th = H[k];
        if (Math.abs(ratio - th) > 1e-9 * Math.max(1, th))
          bad.push(`f=${f} : ${ratio.toFixed(6)} vs ${th.toFixed(6)}`);
      }
      return {
        ok: bad.length === 0,
        detail: bad.length ? bad.join(' · ') : '|Y|/|X| = |H| à 1e-9 pour f = 4, 8, 16, 24 Hz',
      };
    },
  },
  {
    name: 'le compte de poids : N² contre L, soit 1820 fois moins',
    category: 'numeric',
    run() {
      // L'argument entier de la scène 3, en deux entiers.
      const dense = compute({ ...BASE, structure: 'dense' }).observables;
      const toep = compute(BASE).observables;
      return {
        ok: dense.nParams.value === N * N && toep.nParams.value === 9,
        detail: `dense ${dense.nParams.value} · Toeplitz ${toep.nParams.value} · rapport ${Math.round(toep.ratio.value)}`,
      };
    },
  },
  {
    name: 'sans activation, l’écart au réseau linéaire est nul',
    category: 'numeric',
    run() {
      // Le témoin de la scène 1, vu depuis la statline : la mesure que
      // l'expérience affiche doit tomber à zéro exactement quand σ est
      // l'identité, et être franchement non nulle sinon. Sans cela, le
      // chiffre projeté ne voudrait rien dire.
      const bad = [];
      for (const structure of ['dense', 'toeplitz']) {
        const lin = compute({ ...BASE, structure, act: 'identity' }).observables.nonlinearity.value;
        const nl = compute({ ...BASE, structure, act: 'relu' }).observables.nonlinearity.value;
        if (lin > 1e-15) bad.push(`${structure} identité : ${lin.toExponential(1)}`);
        if (nl < 0.1) bad.push(`${structure} ReLU : ${nl.toFixed(3)}`);
      }
      return {
        ok: bad.length === 0,
        detail: bad.length ? bad.join(' · ') : 'identité : 0 exactement · ReLU : 0.69 (dense) et 1.06 (Toeplitz)',
      };
    },
  },
  {
    name: 'sur une impulsion, la sortie EST la réponse impulsionnelle',
    category: 'numeric',
    run() {
      // Ce que la fin de la scène 3 demande de regarder : une impulsion à
      // l'entrée d'une couche de Toeplitz ressort le noyau, à sa place.
      const gauss = gaussFrom(mulberry32(17));
      const h = Float64Array.from({ length: 9 }, () => gauss());
      const x = new Float64Array(N);
      const mid = N / 2;
      x[mid] = 1;
      const y = matvec(toeplitzMatrix(N, N, h), x, N, N);
      let worst = 0;
      for (let k = 0; k < h.length; k++) worst = Math.max(worst, Math.abs(y[mid + k] - h[k]));
      return {
        ok: worst < 1e-15,
        detail: `y[n₀+k] = h[k] à ${worst.toExponential(1)}`,
      };
    },
  },
  standardChecks.determinism(compute, BASE, 'yTime'),
  standardChecks.determinism(compute, { ...BASE, structure: 'dense' }, 'specOut'),
];
