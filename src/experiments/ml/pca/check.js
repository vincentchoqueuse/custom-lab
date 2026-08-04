import { compute, P } from './compute.js';
import { IRIS, IRIS_FEATURES, PENGUINS, PENGUIN_FEATURES } from '../_lib/datasets.js';
import { pca, reconstruct, colMeans, colSds } from '../_lib/pca.js';

const N = IRIS.length;
const NP = PENGUINS.length;

/** Le jeu demandé, aplati en n × 4. */
const flat = (rows = IRIS) => {
  const X = new Float64Array(rows.length * P);
  for (let i = 0; i < rows.length; i++)
    for (let j = 0; j < P; j++) X[i * P + j] = rows[i][j];
  return X;
};

export const checks = [
  {
    name: 'le jeu de données EST celui de Fisher — moyennes et écarts-types publiés',
    category: 'numeric',
    run() {
      // Un jeu de données recopié est une donnée comme une autre : il se
      // vérifie. Ces six nombres sont ceux que cinquante ans de littérature
      // rapportent, et si la copie dérivait d'une ligne, ils bougeraient.
      const X = flat();
      const m = colMeans(X, N, P);
      const s = colSds(X, N, P, m);
      const mTh = [5.843, 3.057, 3.758, 1.199];
      const sTh = [0.828, 0.436, 1.765, 0.762];
      const bad = [];
      if (IRIS.length !== 150) bad.push(`${IRIS.length} lignes`);
      const cls = [0, 0, 0];
      for (const r of IRIS) cls[r[4]]++;
      if (cls.join(',') !== '50,50,50') bad.push(`classes ${cls.join('/')}`);
      for (let j = 0; j < P; j++) {
        if (Math.abs(m[j] - mTh[j]) > 5e-4) bad.push(`moyenne ${j} : ${m[j].toFixed(4)}`);
        if (Math.abs(s[j] - sTh[j]) > 5e-4) bad.push(`écart-type ${j} : ${s[j].toFixed(4)}`);
      }
      return {
        ok: bad.length === 0,
        detail: bad.length ? bad.join(' · ') : '150 fleurs, 50/50/50, moyennes et écarts-types publiés à 5e-4',
      };
    },
  },
  {
    name: 'les composantes sont orthonormées',
    category: 'numeric',
    run() {
      // La propriété qui rend la projection légitime : les composantes
      // forment une base orthonormée, donc projeter ne déforme aucune
      // distance dans le sous-espace gardé.
      const bad = [];
      for (const standardize of [false, true]) {
        const { vectors } = pca(flat(), N, P, { standardize });
        for (let a = 0; a < P; a++)
          for (let b = 0; b < P; b++) {
            let d = 0;
            for (let j = 0; j < P; j++) d += vectors[j * P + a] * vectors[j * P + b];
            const target = a === b ? 1 : 0;
            if (Math.abs(d - target) > 1e-12) bad.push(`⟨v${a},v${b}⟩ = ${d}`);
          }
      }
      return { ok: bad.length === 0, detail: bad.length ? bad.join(' · ') : 'VᵀV = I à 1e-12' };
    },
  },
  {
    name: 'la somme des valeurs propres EST la variance totale',
    category: 'numeric',
    run() {
      // Rien ne se perd : diagonaliser redistribue la variance entre les
      // axes, elle n'en crée ni n'en détruit. C'est la trace, et c'est exact.
      const bad = [];
      for (const standardize of [false, true]) {
        const m = pca(flat(), N, P, { standardize });
        let trace = 0;
        for (let j = 0; j < P; j++) trace += m.cov[j * P + j];
        if (Math.abs(m.total - trace) > 1e-12) bad.push(`${m.total} vs ${trace}`);
      }
      return { ok: bad.length === 0, detail: bad.length ? bad.join(' · ') : 'Σλ = tr(C) à 1e-12' };
    },
  },
  {
    name: 'Eckart–Young : l’erreur EST la somme des valeurs propres jetées',
    category: 'numeric',
    run() {
      // Le théorème qui fait de l'ACP la MEILLEURE compression linéaire, et
      // la vue « Erreur de reconstruction » le montre comme deux courbes
      // superposées. Ce n'est ni une borne ni une approximation.
      const bad = [];
      for (const standardize of [false, true]) {
        const o = compute({ dataset: 'iris', standardize, k: 2, xComp: 1, yComp: 2 }).observables;
        for (let c = 0; c <= P; c++) {
          const gap = Math.abs(o.errMeas.y[c] - o.errTheo.y[c]);
          if (gap > 1e-12) bad.push(`k=${c} : ${gap.toExponential(1)}`);
        }
      }
      return {
        ok: bad.length === 0,
        detail: bad.length ? bad.join(' · ') : 'mesuré = théorie à 1e-12, pour k = 0…4, avec et sans standardisation',
      };
    },
  },
  {
    name: 'garder les quatre composantes reconstruit EXACTEMENT les données',
    category: 'numeric',
    run() {
      const X = flat();
      const m = pca(X, N, P, { standardize: false });
      const R = reconstruct(m, N, P, P);
      let worst = 0;
      for (let i = 0; i < N * P; i++) worst = Math.max(worst, Math.abs(R[i] - X[i]));
      return { ok: worst < 1e-12, detail: `écart max ${worst.toExponential(2)} cm` };
    },
  },
  {
    name: 'les variances expliquées sont celles de la littérature',
    category: 'numeric',
    run() {
      // Covariance : 92.46 / 5.31 / 1.71 / 0.52. Corrélation : 72.96 /
      // 22.85 / 3.67 / 0.52. Ces huit nombres sont dans tous les manuels, et
      // c'est ce qui permet à un lecteur de vérifier l'expérience sans nous
      // faire confiance.
      const bad = [];
      const want = {
        false: [92.46, 5.31, 1.71, 0.52],
        true: [72.96, 22.85, 3.67, 0.52],
      };
      const got = {};
      for (const standardize of [false, true]) {
        const o = compute({ dataset: 'iris', standardize, k: 2, xComp: 1, yComp: 2 }).observables;
        got[standardize] = [...o.scree.y].map((v) => +v.toFixed(2));
        want[standardize].forEach((w, i) => {
          if (Math.abs(o.scree.y[i] - w) > 0.01) bad.push(`${standardize} CP${i + 1} : ${o.scree.y[i].toFixed(2)} vs ${w}`);
        });
      }
      return {
        ok: bad.length === 0,
        detail: bad.length ? bad.join(' · ') : `covariance ${got.false.join('/')} · corrélation ${got.true.join('/')}`,
      };
    },
  },
  {
    name: 'changer d’unité change l’ACP sur covariance, et PAS sur corrélation',
    category: 'numeric',
    run() {
      // LE critère de choix, rendu objectif. On passe une seule variable des
      // centimètres aux millimètres : sur covariance la variance expliquée
      // bascule (cette variable écrase les autres), sur corrélation elle ne
      // bouge pas d'un millième. Une méthode dont la réponse dépend des
      // unités doit être utilisée en le sachant.
      const X = flat();
      const Y = Float64Array.from(X);
      for (let i = 0; i < N; i++) Y[i * P + 1] *= 10; // largeur sépale en mm
      const dom = (m) => {
        let b = 0;
        for (let j = 1; j < P; j++)
          if (Math.abs(m.vectors[j * P]) > Math.abs(m.vectors[b * P])) b = j;
        return b;
      };
      const covA = pca(X, N, P, { standardize: false });
      const covB = pca(Y, N, P, { standardize: false });
      const corA = pca(X, N, P, { standardize: true });
      const corB = pca(Y, N, P, { standardize: true });
      // Le fait le plus parlant n'est pas le déplacement du pourcentage
      // (92.46 → 84.64) mais le CHANGEMENT DE VARIABLE DOMINANTE : la même
      // fleur, la même mesure, un millimètre au lieu d'un centimètre, et la
      // première composante n'est plus la même grandeur.
      return {
        ok:
          dom(covA) !== dom(covB) &&
          Math.abs(covA.ratio[0] - covB.ratio[0]) > 0.05 &&
          dom(corA) === dom(corB) &&
          Math.abs(corA.ratio[0] - corB.ratio[0]) < 1e-12,
        detail:
          `covariance : ${(100 * covA.ratio[0]).toFixed(2)} % « ${IRIS_FEATURES[dom(covA)]} » → ` +
          `${(100 * covB.ratio[0]).toFixed(2)} % « ${IRIS_FEATURES[dom(covB)]} » · ` +
          `corrélation : inchangée à 1e-12, toujours « ${IRIS_FEATURES[dom(corB)]} »`,
      };
    },
  },
  {
    name: 'sans standardisation, CP1 est presque la longueur de pétale seule',
    category: 'numeric',
    run() {
      // Le fait concret derrière le check précédent : la longueur de pétale
      // porte une variance de 3.1 cm² contre 0.19 pour la largeur de sépale,
      // donc elle rafle la première composante. Après standardisation, les
      // quatre variables pèsent comparablement.
      const raw = pca(flat(), N, P, { standardize: false });
      const std = pca(flat(), N, P, { standardize: true });
      const l = (m, j) => Math.abs(m.vectors[j * P + 0]);
      return {
        ok: l(raw, 2) > 0.8 && l(std, 2) < 0.6,
        detail:
          `saturation de « ${IRIS_FEATURES[2]} » sur CP1 : ` +
          `${l(raw, 2).toFixed(3)} brute, ${l(std, 2).toFixed(3)} standardisée`,
      };
    },
  },
  {
    name: 'les manchots de Palmer sont eux aussi ceux de la littérature',
    category: 'numeric',
    run() {
      // Second jeu, même exigence : 342 cas complets sur 344 (deux individus
      // n'ont aucune mesure), 151 / 68 / 123 par espèce, et les quatre
      // moyennes publiées. CC0, donc réutilisable sans condition.
      const X = flat(PENGUINS);
      const m = colMeans(X, NP, P);
      const s = colSds(X, NP, P, m);
      const mTh = [43.92, 17.15, 200.92, 4201.75];
      const sTh = [5.46, 1.97, 14.06, 801.95];
      const bad = [];
      if (NP !== 342) bad.push(`${NP} lignes`);
      const cls = [0, 0, 0];
      for (const r of PENGUINS) cls[r[4]]++;
      if (cls.join(',') !== '151,68,123') bad.push(`classes ${cls.join('/')}`);
      for (let j = 0; j < P; j++) {
        if (Math.abs(m[j] - mTh[j]) > 0.01) bad.push(`moyenne ${j} : ${m[j].toFixed(2)}`);
        if (Math.abs(s[j] - sTh[j]) > 0.01) bad.push(`écart-type ${j} : ${s[j].toFixed(2)}`);
      }
      return {
        ok: bad.length === 0,
        detail: bad.length
          ? bad.join(' · ')
          : '342 manchots, 151/68/123, moyennes 43.92/17.15/200.92/4201.75 publiées',
      };
    },
  },
  {
    name: 'sur les manchots, l’ACP brute n’est QUE la masse — 99.99 %',
    category: 'numeric',
    run() {
      // Le piège des unités poussé à la caricature, et c'est ce qui fait de
      // ce jeu le meilleur support pour l'enseigner : la masse est en
      // grammes, donc sa variance vaut 643 000 contre 30 pour la longueur de
      // bec. La première composante emporte tout, et elle ne mesure qu'une
      // chose. Standardisé, le même jeu descend à 68.84 % et CP1 devient la
      // longueur de nageoire — une grandeur biologiquement plus parlante.
      const raw = compute({ dataset: 'penguins', standardize: false, k: 2, xComp: 1, yComp: 2 })
        .observables;
      const std = compute({ dataset: 'penguins', standardize: true, k: 2, xComp: 1, yComp: 2 })
        .observables;
      return {
        ok:
          raw.pc1.value > 99.9 &&
          raw.dominant.value === PENGUIN_FEATURES[3] &&
          std.pc1.value < 75 &&
          std.dominant.value === PENGUIN_FEATURES[2],
        detail:
          `brut ${raw.pc1.value.toFixed(2)} % « ${raw.dominant.value} » · ` +
          `standardisé ${std.pc1.value.toFixed(2)} % « ${std.dominant.value} »`,
      };
    },
  },
  {
    name: 'Eckart–Young tient aussi sur les manchots',
    category: 'numeric',
    run() {
      // Le théorème ne dépend ni du jeu ni des unités : on le rejoue sur des
      // données dont les colonnes vont de 15 à 6300, où une erreur d'échelle
      // se verrait immédiatement.
      //
      // Tolérance RELATIVE, et c'est le jeu lui-même qui l'impose : la
      // variance de la masse vaut 643 000 g², donc un écart absolu de 1e-10
      // y est un écart relatif de 1e-15 — la précision machine. Une
      // tolérance absolue n'aurait rien voulu dire sur des grammes au carré,
      // et c'est le genre de détail qui fait passer un check pour un échec.
      const bad = [];
      let worst = 0;
      for (const standardize of [false, true]) {
        const o = compute({ dataset: 'penguins', standardize, k: 2, xComp: 1, yComp: 2 })
          .observables;
        for (let c = 0; c <= P; c++) {
          const scale = Math.max(Math.abs(o.errTheo.y[c]), 1e-12);
          const rel = Math.abs(o.errMeas.y[c] - o.errTheo.y[c]) / scale;
          worst = Math.max(worst, rel);
          if (rel > 1e-12) bad.push(`k=${c} : ${rel.toExponential(1)} en relatif`);
        }
      }
      return {
        ok: bad.length === 0,
        detail: bad.length
          ? bad.join(' · ')
          : `mesuré = théorie à ${worst.toExponential(1)} en relatif, sur les 342 manchots`,
      };
    },
  },
];
