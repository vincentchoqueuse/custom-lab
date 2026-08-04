import { compute, N, RANK_MAX, SPEC_FLOOR } from './compute.js';
import manifest from './manifest.js';
import { standardChecks, maxAbsDiff } from '../../../core/checks.js';
import { svd, lowRank } from '../../../core/linalg.js';
import { sheppLogan, lowRankImage, checkerboard, toBmpDataUri } from '../_lib/images.js';

const IMAGES = ['phantom', 'lowrank', 'checker', 'noise'];
const at = (params) => compute({ image: 'phantom', k: 12, seed: 34, ...params }).observables;

/** Le pixel du fantôme le plus proche du point (x, y) du carré [−1, 1]². */
const sample = (img, x, y) =>
  img[Math.floor(((1 - y) * N) / 2) * N + Math.floor(((x + 1) * N) / 2)];

/** base64 → octets, écrit ici pour RELIRE ce que l'encodeur a produit. */
function unbase64(s) {
  const A = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/';
  const clean = s.replace(/=+$/, '');
  const out = new Uint8Array((clean.length * 3) >> 2);
  let acc = 0;
  let bits = 0;
  let o = 0;
  for (const ch of clean) {
    acc = (acc << 6) | A.indexOf(ch);
    bits += 6;
    if (bits >= 8) {
      bits -= 8;
      out[o++] = (acc >> bits) & 255;
    }
  }
  return out;
}

export const checks = [
  {
    name: 'le fantôme EST la formule publiée — six niveaux de gris, aux bons endroits',
    category: 'numeric',
    run() {
      // Une image RECALCULÉE se démontre là où une image recopiée se
      // vérifierait au mieux. Les dix ellipses de Shepp–Logan (1974,
      // contrastes de Toft) ne peuvent produire que six niveaux : le fond
      // (0), le crâne (1), le cerveau (1 − 0.8 = 0.2), les ventricules
      // (0.2 − 0.2 = 0), les inclusions (0.2 + 0.1 = 0.3), et les deux
      // recouvrements (0.1 et 0.4). Aucun autre. Si un paramètre dérivait
      // d'une décimale, un septième niveau apparaîtrait.
      const img = sheppLogan(N);
      const levels = [...new Set(Array.from(img, (v) => +v.toFixed(9)))].sort((a, b) => a - b);
      const want = [0, 0.1, 0.2, 0.3, 0.4, 1];
      const points = [
        ['fond', 0.95, 0.95, 0],
        ['crâne', 0, 0.9, 1],
        ['cerveau', 0, -0.4, 0.2],
        ['ventricule gauche', -0.22, 0, 0],
        ['ventricule droit', 0.22, 0, 0],
        ['inclusion basse', 0, -0.605, 0.3],
      ];
      const bad = [];
      if (levels.length !== 6 || maxAbsDiff(levels, want) > 1e-9)
        bad.push(`niveaux ${levels.join('/')}`);
      for (const [name, x, y, v] of points) {
        const got = sample(img, x, y);
        if (Math.abs(got - v) > 1e-12) bad.push(`${name} : ${got.toFixed(4)} au lieu de ${v}`);
      }
      return {
        ok: bad.length === 0,
        detail: bad.length ? bad.join(' · ') : 'niveaux 0/0.1/0.2/0.3/0.4/1 et six points anatomiques exacts',
      };
    },
  },
  {
    name: 'A = U·diag(σ)·Vᵀ — la décomposition reconstruit l’image exactement',
    category: 'numeric',
    run() {
      // La propriété de base, et le seul check qui garantit que tout le
      // reste parle bien de l'image affichée. Attention à la tolérance : la
      // SVD passe ici par les valeurs propres de AᵀA, ce qui CARRE le
      // conditionnement et coûte la moitié des chiffres significatifs. On
      // attend donc ~1e-14 sur une image d'ordre 1, pas 1e-16.
      const bad = [];
      for (const [name, img] of [
        ['fantôme', sheppLogan(N)],
        ['rang 4', lowRankImage(N, 4)],
        ['damier', checkerboard(N, 8)],
      ]) {
        const model = svd(img, N, N);
        const back = lowRank(model, N, N, N);
        const worst = maxAbsDiff(back, img);
        if (worst > 1e-11) bad.push(`${name} : ${worst.toExponential(1)}`);
      }
      return { ok: bad.length === 0, detail: bad.length ? bad.join(' · ') : 'écart max < 1e-11 sur trois images' };
    },
  },
  {
    name: 'les couches sont orthonormées : UᵀU = VᵀV = I',
    category: 'numeric',
    run() {
      // Ce qui fait que les σ² S'ADDITIONNENT : les couches sont orthogonales
      // deux à deux, donc l'énergie de la somme est la somme des énergies.
      // Sans cela, « garder 96 % de l'énergie » ne voudrait rien dire.
      const model = svd(sheppLogan(N), N, N);
      const r = model.s.length;
      const K = 40;
      let worst = 0;
      for (const M of [model.u, model.v])
        for (let a = 0; a < K; a++)
          for (let b = 0; b < K; b++) {
            let d = 0;
            for (let i = 0; i < N; i++) d += M[i * r + a] * M[i * r + b];
            worst = Math.max(worst, Math.abs(d - (a === b ? 1 : 0)));
          }
      return { ok: worst < 1e-9, detail: `écart max à l’identité ${worst.toExponential(2)} sur 40 couches` };
    },
  },
  {
    name: 'Eckart–Young : ‖A − Aₖ‖² EST la somme des σᵢ² jetées, sur les quatre images',
    category: 'numeric',
    run() {
      // Le théorème de la séance, et le même que dans l'expérience d'ACP :
      // l'erreur d'une compression se connaît AVANT de la calculer. La
      // statline affiche les deux nombres côte à côte ; ici on vérifie
      // qu'ils sont égaux, et pas seulement proches.
      //
      // Tolérance relative à ‖A‖², et c'est le harnais qui a imposé ce
      // choix : rapporter l'écart à l'erreur elle-même échoue sur le damier
      // et sur le rang 4, où l'erreur est nulle en théorie ET en pratique.
      // Ce qui y reste des deux côtés est le plancher numérique du passage
      // par AᵀA (√ε ≈ 1e-8 par valeur singulière), donc deux zéros bruités
      // dont le rapport ne veut rien dire. L'énergie de l'image est la seule
      // échelle qui ait un sens sur les quatre.
      const bad = [];
      let worst = 0;
      for (const image of IMAGES) {
        // ‖A‖² : errTheo(1) est la somme des σᵢ² jetées à k = 1, et
        // errCurve(1) la même chose rapportée au total.
        const o1 = at({ image, k: 1 });
        const total = o1.errTheo.value / o1.errCurve.y[1];
        for (const k of [1, 2, 4, 8, 20, 40]) {
          const o = at({ image, k });
          const rel = Math.abs(o.errMeas.value - o.errTheo.value) / total;
          worst = Math.max(worst, rel);
          if (rel > 1e-9) bad.push(`${image} k=${k} : ${rel.toExponential(1)}`);
        }
      }
      return {
        ok: bad.length === 0,
        detail: bad.length ? bad.join(' · ') : `mesuré = théorie à ${worst.toExponential(1)} de ‖A‖², 4 images × 6 valeurs de k`,
      };
    },
  },
  {
    name: 'l’image « rang 4 » est de rang 4 — pas 3, pas 5',
    category: 'numeric',
    run() {
      // Le cas où la SVD gagne tout, et un piège que le harnais a déjà
      // attrapé une fois : normaliser dans [0, 1] ajoute une CONSTANTE,
      // donc une couche de rang 1 de plus. Trois sinusoïdes plus le décalage
      // font quatre, et c'est ce qu'on épingle ici — quatrième valeur
      // franchement non nulle, cinquième au plancher numérique (√ε ≈ 1e-8,
      // le prix du passage par AᵀA).
      const psnr = at({ image: 'lowrank', k: 4 }).psnr.value;
      // les σ BRUTES, pas la série affichée : celle-ci est plafonnée au
      // plancher de l'axe log, qui ne dit plus rien du zéro qu'il recouvre
      const { s, rank } = svd(lowRankImage(N, 4), N, N);
      const r = (i) => s[i] / s[0];
      return {
        ok: r(3) > 1e-2 && r(4) < 1e-7 && psnr > 200 && rank === 4,
        detail: `rang numérique ${rank} · σ₄/σ₁ = ${r(3).toExponential(2)}, σ₅/σ₁ = ${r(4).toExponential(2)}, PSNR à k = 4 : ${psnr.toFixed(0)} dB`,
      };
    },
  },
  {
    name: 'le damier a l’air compliqué et il est de rang 2',
    category: 'numeric',
    run() {
      // Le résultat contre-intuitif de la séance, et la raison d'être de
      // cette image dans le catalogue. Un damier est SÉPARABLE :
      // p(i,j) = f(i) + g(j) − 2f(i)g(j), donc deux couches suffisent —
      // exactement, pas approximativement. L'œil juge de la complexité
      // apparente, jamais du rang.
      const o = at({ image: 'checker', k: 2 });
      const img = checkerboard(N, 8);
      const model = svd(img, N, N);
      const s = (i) => model.s[i] / model.s[0];
      const worst = maxAbsDiff(lowRank(model, N, N, 2), img);
      return {
        ok: model.rank === 2 && s(1) > 0.5 && s(2) < 1e-7 && worst < 1e-11 && o.kept.value > 99.999,
        detail:
          `rang numérique ${model.rank} · σ₂/σ₁ = ${s(1).toFixed(3)}, σ₃/σ₁ = ${s(2).toExponential(2)} · ` +
          `reconstruction à k = 2 exacte à ${worst.toExponential(1)}`,
      };
    },
  },
  {
    name: 'le spectre décide : le fantôme s’effondre, le bruit ne décroît pas',
    category: 'statistical',
    run() {
      // LA raison pour laquelle une image se compresse et une autre non, et
      // elle est dans l'image, pas dans l'algorithme. Sur les quarante
      // couches affichées, le fantôme perd un facteur 20 et le bruit un
      // facteur 1.7 — donc chez lui aucune couche n'est négligeable, et
      // aucune méthode ne le compressera jamais.
      const drop = (image) => {
        const s = at({ image }).singular.y;
        return s[1] / s[RANK_MAX - 1];
      };
      const ph = drop('phantom');
      const nz = drop('noise');
      const oPh = at({ image: 'phantom', k: 12 });
      const oNz = at({ image: 'noise', k: 12 });
      // et les deux conséquences visibles en salle : l'image reconstruite et
      // la courbe d'énergie doivent classer les deux images dans le MÊME
      // ordre que le spectre, sans quoi la démonstration se contredit.
      return {
        ok:
          ph > 10 &&
          nz < 2 &&
          oPh.psnr.value > oNz.psnr.value + 5 &&
          oPh.kept.value > oNz.kept.value,
        detail:
          `σ₂/σ₄₀ : ${ph.toFixed(1)} sur le fantôme, ${nz.toFixed(2)} sur le bruit · ` +
          `à k = 12, PSNR ${oPh.psnr.value.toFixed(1)} contre ${oNz.psnr.value.toFixed(1)} dB ` +
          `et énergie ${oPh.kept.value.toFixed(1)} contre ${oNz.kept.value.toFixed(1)} %`,
      };
    },
  },
  {
    name: 'le spectre affiché tient dans le cadre, plancher compris',
    category: 'numeric',
    run() {
      // Deux constantes doivent s'accorder : le plancher que le compute
      // applique au spectre et le domaine de l'axe log du manifeste. Si
      // elles divergent, une image de rang exact trace une ligne HORS du
      // cadre — invisible, et personne ne le remarque avant l'amphi. On les
      // épingle donc l'une à l'autre plutôt que de les tenir de tête.
      const [lo, hi] = manifest.views.find((v) => v.id === 'singular').spec.axes.y.domain;
      const bad = [];
      if (!(SPEC_FLOOR > lo && SPEC_FLOOR < 10 * lo))
        bad.push(`plancher ${SPEC_FLOOR} hors du bas de l’axe ${lo}`);
      for (const image of IMAGES) {
        const y = at({ image }).singular.y;
        for (let i = 0; i < RANK_MAX; i++)
          if (y[i] < lo || y[i] > hi) bad.push(`${image} σ${i + 1} = ${y[i].toExponential(2)}`);
      }
      return {
        ok: bad.length === 0,
        detail: bad.length ? bad.join(' · ') : `40 valeurs × 4 images dans [${lo}, ${hi}], plancher à ${SPEC_FLOOR}`,
      };
    },
  },
  {
    name: 'la comptabilité du stockage : k(2N+1) nombres au lieu de N²',
    category: 'numeric',
    run() {
      // Le chiffre qu'on fait lire à la salle. Il n'a rien d'approché :
      // k couches, c'est k vecteurs de N, k autres de N, et k valeurs
      // singulières. Le facteur de compression en découle, et il devient
      // défavorable au-delà de k = N/2 — ce que la formule dit et que
      // personne ne devine.
      const bad = [];
      for (const k of [1, 5, 12, 20, 40]) {
        const o = at({ k });
        const want = k * (2 * N + 1);
        if (o.stored.value !== want) bad.push(`k=${k} : ${o.stored.value} au lieu de ${want}`);
        if (Math.abs(o.ratio.value - (N * N) / want) > 1e-12) bad.push(`k=${k} : facteur faux`);
        if (o.fullSize.value !== N * N) bad.push(`taille pleine ${o.fullSize.value}`);
      }
      const o12 = at({ k: 12 });
      return {
        ok: bad.length === 0,
        detail: bad.length
          ? bad.join(' · ')
          : `à k = 12 : ${o12.stored.value} nombres contre ${o12.fullSize.value}, facteur ${o12.ratio.value.toFixed(2)}`,
      };
    },
  },
  {
    name: 'l’énergie cumulée croît de 0 à 100 % et vaut 1 − ‖A−Aₖ‖²/‖A‖²',
    category: 'numeric',
    run() {
      // La courbe de la troisième vue, et ce qu'elle promet : lire k pour
      // une qualité visée SANS reconstruire. Elle doit donc partir de 0,
      // arriver à 100, ne jamais redescendre, et être exactement le
      // complément de l'erreur relative.
      const bad = [];
      for (const image of IMAGES) {
        const o = at({ image });
        const e = o.energy.y;
        const c = o.errCurve.y;
        if (Math.abs(e[0]) > 1e-12) bad.push(`${image} : e(0) = ${e[0]}`);
        for (let k = 1; k <= RANK_MAX; k++) {
          if (e[k] < e[k - 1] - 1e-12) bad.push(`${image} : décroissance en k=${k}`);
          const sum = e[k] / 100 + c[k];
          if (Math.abs(sum - 1) > 1e-9 && c[k] > 1e-11) bad.push(`${image} k=${k} : ${sum}`);
        }
        if (e[RANK_MAX] > 100 + 1e-9) bad.push(`${image} : ${e[RANK_MAX]} %`);
      }
      const full = at({ image: 'lowrank' }).energy.y[RANK_MAX];
      return {
        ok: bad.length === 0,
        detail: bad.length ? bad.join(' · ') : `croissante, complémentaire de l’erreur relative, et 100 % atteint sur le rang 4 (${full.toFixed(4)} %)`,
      };
    },
  },
  {
    name: 'l’encodeur BMP rend les pixels qu’on lui donne',
    category: 'numeric',
    run() {
      // Les trois vignettes passent par un BMP écrit à la main : si
      // l'en-tête ou l'ordre des lignes dérive, la salle voit une image
      // retournée ou rien du tout, et aucun autre check ne s'en apercevrait.
      // On relit donc les octets produits — en-tête, palette, et le pixel
      // de chaque coin, sachant que le BMP se lit du BAS vers le haut.
      const img = sheppLogan(N);
      const uri = toBmpDataUri(img, N);
      const b = unbase64(uri.slice(uri.indexOf(',') + 1));
      const rowSize = (N + 3) & ~3;
      const off = 14 + 40 + 256 * 4;
      const u32 = (o) => b[o] | (b[o + 1] << 8) | (b[o + 2] << 16) | (b[o + 3] << 24);
      const bad = [];
      if (b[0] !== 66 || b[1] !== 77) bad.push('signature');
      if (u32(2) !== off + rowSize * N) bad.push(`taille ${u32(2)}`);
      if (u32(18) !== N || u32(22) !== N) bad.push('dimensions');
      if (b[28] !== 8) bad.push('profondeur');
      let worst = 0;
      for (let i = 0; i < N; i++)
        for (let j = 0; j < N; j++) {
          const got = b[off + (N - 1 - i) * rowSize + j];
          worst = Math.max(worst, Math.abs(got - Math.round(255 * img[i * N + j])));
        }
      if (worst > 0) bad.push(`pixels : écart ${worst}`);
      return {
        ok: bad.length === 0,
        detail: bad.length ? bad.join(' · ') : `${b.length} octets relus, 16 384 pixels identiques, lignes bas-vers-haut`,
      };
    },
  },
  {
    name: 'une image ne se décompose qu’une fois — le potard k reste instantané',
    category: 'performance',
    run() {
      // Le garde-fou de cours est à 1.5 s et une décomposition 128 × 128 en
      // coûte 450. Bouger k ne doit donc PAS redécomposer : seul le nombre
      // de couches gardées change. C'est un rapport qu'on mesure, pas une
      // durée absolue — la machine de l'amphi n'est pas celle de l'intégration.
      const seed = 991; // une graine inutilisée ailleurs : le cache est froid
      const t0 = performance.now();
      at({ image: 'noise', seed, k: 5 });
      const cold = performance.now() - t0;
      const t1 = performance.now();
      for (let k = 6; k <= 15; k++) at({ image: 'noise', seed, k });
      const warm = (performance.now() - t1) / 10;
      return {
        ok: warm * 5 < cold,
        detail: `décomposition ${cold.toFixed(0)} ms, puis ${warm.toFixed(1)} ms par cran de k`,
      };
    },
  },
  standardChecks.determinism(compute, { image: 'noise', k: 12, seed: 7 }, 'singular'),
];
