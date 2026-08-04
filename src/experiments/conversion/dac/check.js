import { compute, interpKernel, filterStream, FS } from './compute.js';
import { standardChecks, maxGap, range } from '../../../core/checks.js';
import { fft } from '../../../core/numeric.js';

// f0 = 1000 Hz tombe sur un bin de la grille : les niveaux se lisent sans
// fuite spectrale.
const BASE = { stage: 'filtered', L: 4, f0: 1000, half: 8 };

export const checks = [
  {
    name: 'le zéro-stuffing ne change RIEN au spectre — identité exacte',
    category: 'numeric',
    run() {
      // Le cœur de l'expérience, et la seule chose qu'il faut croire : insérer
      // L−1 zéros laisse la transformée identique, périodisée. Sur des DFT de
      // longueurs N et N·L, cela s'écrit X_up[k] = X[k mod N] — sans fenêtre,
      // sans tolérance, à la précision machine.
      const N = 64;
      const bad = [];
      for (const L of [2, 4, 8]) {
        const xr = new Float64Array(N);
        const xi = new Float64Array(N);
        for (let n = 0; n < N; n++) xr[n] = Math.sin((2 * Math.PI * 1000 * n) / FS);
        const ur = new Float64Array(N * L);
        const ui = new Float64Array(N * L);
        for (let n = 0; n < N; n++) ur[n * L] = xr[n];
        fft(xr, xi);
        fft(ur, ui);
        const worst = Math.max(
          ...range(N * L, (k) => Math.abs(Math.hypot(ur[k], ui[k]) - Math.hypot(xr[k % N], xi[k % N])))
        );
        if (worst > 1e-12) bad.push(`L=${L} : ${worst.toExponential(1)}`);
      }
      return {
        ok: bad.length === 0,
        detail: bad.length ? bad.join(' · ') : '|X_up[k]| = |X[k mod N]| à 1e-12 pour L = 2, 4, 8',
      };
    },
  },
  {
    name: 'le noyau vaut 1 au centre et 0 aux autres multiples de L',
    category: 'numeric',
    run() {
      // La propriété qui fait que l'interpolation ne DÉPLACE pas les données :
      // aux instants des échantillons d'origine, le filtre ne lit qu'eux.
      const bad = [];
      for (const L of [2, 4, 8]) {
        const half = 8 * L;
        const h = interpKernel(L, half);
        if (Math.abs(h[half] - 1) > 1e-15) bad.push(`L=${L} : centre ${h[half]}`);
        const worst = Math.max(
          ...range(2 * 8 + 1, (i) => (i === 8 ? 0 : Math.abs(h[half + (i - 8) * L])))
        );
        if (worst > 1e-15) bad.push(`L=${L} : zéros ${worst.toExponential(1)}`);
      }
      return {
        ok: bad.length === 0,
        detail: bad.length ? bad.join(' · ') : 'h(0) = 1 à 1e-15, h(mL) = 0 à 1e-15',
      };
    },
  },
  {
    name: 'le flux interpolé passe EXACTEMENT par les échantillons d’origine',
    category: 'numeric',
    run() {
      const { observables: o } = compute(BASE);
      return {
        ok: o.interpErr.value < 1e-12,
        detail: `écart max ${o.interpErr.value.toExponential(2)}`,
      };
    },
  },
  {
    name: 'le zéro-stuffing divise la puissance moyenne par exactement L',
    category: 'numeric',
    run() {
      // Le prix caché du premier geste, et la raison pour laquelle le filtre
      // porte un gain L : un échantillon sur L est non nul, donc la puissance
      // moyenne est divisée par L — exactement, pas approximativement.
      const N = 512;
      const bad = [];
      for (const L of [2, 4, 8]) {
        const x = new Float64Array(N);
        for (let n = 0; n < N; n++) x[n] = Math.sin((2 * Math.PI * 1000 * n) / FS);
        const up = new Float64Array(N * L);
        for (let n = 0; n < N; n++) up[n * L] = x[n];
        const p = (a) => a.reduce((s, v) => s + v * v, 0) / a.length;
        const ratio = p(x) / p(up);
        if (Math.abs(ratio - L) > 1e-12) bad.push(`L=${L} : ${ratio}`);
      }
      return {
        ok: bad.length === 0,
        detail: bad.length ? bad.join(' · ') : 'P(x)/P(x_up) = L à 1e-12 pour L = 2, 4, 8',
      };
    },
  },
  {
    name: 'le gain rendu par le filtre vaut EXACTEMENT 20·log₁₀(L)',
    category: 'numeric',
    run() {
      // Le corollaire du check précédent, lu sur la figure : le stuffing
      // avait divisé la puissance par L, le noyau de gain continu L la rend.
      // La raie utile ne « revient » donc pas à son niveau du flux à zéros —
      // elle passe 20·log10(L) au-dessus, et c'est ce qu'il faut dire.
      const bad = [];
      for (const L of [2, 4, 8]) {
        const v = compute({ ...BASE, L }).observables.bandLevel.value;
        const th = 20 * Math.log10(L);
        if (Math.abs(v - th) > 0.15) bad.push(`L=${L} : ${v.toFixed(2)} vs ${th.toFixed(2)}`);
      }
      return {
        ok: bad.length === 0,
        detail: bad.length ? bad.join(' · ') : '+6.02, +12.04, +18.06 dB pour L = 2, 4, 8 (±0.15)',
      };
    },
  },
  {
    name: 'un filtre trop court ne rejette rien — mais la réjection n’est PAS monotone',
    category: 'numeric',
    run() {
      // Ce que la scène 4 projette, et le piège qu'elle doit éviter. Allonger
      // le filtre améliore la réjection en TENDANCE, pas à chaque pas : la
      // fenêtre de Hann pose un plancher de lobes, et le motif d'ondulation
      // glisse quand M change — l'image à Fs − f₀ tombe donc tantôt dans un
      // creux, tantôt sur une bosse (−55 dB à M = 2, −44 à M = 4). Le check
      // épingle les deux bouts, qui eux ne trompent pas, ET la
      // non-monotonicité, pour qu'on ne la « corrige » pas un jour par erreur.
      const img = (half) => compute({ ...BASE, half }).observables.imgFilteredDb;
      const short = img(1);
      const long = img(16);
      const nonMono = img(4) > img(2);
      return {
        ok: short > -12 && long < -75 && nonMono,
        detail:
          `M=1 : ${short.toFixed(1)} dB (le filtre n'existe pas) · M=16 : ${long.toFixed(1)} dB · ` +
          `M=2 → 4 : ${img(2).toFixed(1)} → ${img(4).toFixed(1)} dB, l'ondulation glisse`,
      };
    },
  },
  {
    name: 'à l’étape 2 les images sont là, à l’étape 3 elles n’y sont plus',
    category: 'numeric',
    run() {
      // Ce que les deux dernières scènes montrent, en un seul nombre : sans
      // filtre l'image à Fs − f₀ est au niveau de la raie utile ; avec, elle
      // est enfouie.
      const stuffed = compute({ ...BASE, stage: 'stuffed' }).observables.imgStuffedDb;
      const filtered = compute(BASE).observables.imgFilteredDb;
      return {
        ok: stuffed > -3 && filtered < -45,
        detail: `étape 2 : ${stuffed.toFixed(1)} dB · étape 3 : ${filtered.toFixed(1)} dB`,
      };
    },
  },
  standardChecks.determinism(compute, BASE, 'spectrum'),
];
