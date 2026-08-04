// Les images du sujet — CALCULÉES, jamais copiées.
//
// C'est un choix, et il vaut d'être expliqué en cours. L'image de test la
// plus célèbre du traitement d'image, « Lena », n'est PAS libre de droits :
// c'est une photographie de Playboy (1972), utilisée pendant cinquante ans
// sans autorisation claire, et écartée depuis 2019 par l'IEEE puis par
// Nature. Les autres classiques (Barbara, Mandrill, Peppers) traînent des
// statuts tout aussi flous.
//
// Le fantôme de SHEPP–LOGAN règle la question : c'est l'image de test
// standard de l'imagerie médicale depuis 1974, et elle n'est pas une photo
// mais une FORMULE — dix ellipses aux paramètres publiés. On ne la copie
// donc pas, on la recalcule, ce qui la rend libre par construction ET
// vérifiable par le harnais. Un jeu de données recopié se vérifie ; une
// image recalculée se démontre.
//
// Version dite « modifiée » (Toft, 1996) : mêmes ellipses, contrastes
// relevés, parce que l'originale est trop peu contrastée pour un
// vidéoprojecteur.
//
// PURE, sans état, sans DOM. Importable depuis compute.js ET check.js.

/**
 * Les dix ellipses du fantôme : [intensité, demi-axe a, demi-axe b,
 * centre x, centre y, rotation en degrés], dans le carré [−1, 1]².
 * Ces vingt-quatre nombres sont ceux de la littérature.
 */
export const SHEPP_LOGAN_ELLIPSES = [
  [1.0, 0.69, 0.92, 0, 0, 0],
  [-0.8, 0.6624, 0.874, 0, -0.0184, 0],
  [-0.2, 0.11, 0.31, 0.22, 0, -18],
  [-0.2, 0.16, 0.41, -0.22, 0, 18],
  [0.1, 0.21, 0.25, 0, 0.35, 0],
  [0.1, 0.046, 0.046, 0, 0.1, 0],
  [0.1, 0.046, 0.046, 0, -0.1, 0],
  [0.1, 0.046, 0.023, -0.08, -0.605, 0],
  [0.1, 0.023, 0.023, 0, -0.606, 0],
  [0.1, 0.023, 0.046, 0.06, -0.605, 0],
];

/** Le fantôme, n × n, valeurs dans [0, 1]. */
export function sheppLogan(n) {
  const img = new Float64Array(n * n);
  for (let i = 0; i < n; i++) {
    // y descend quand la ligne monte : convention image
    const y = 1 - (2 * (i + 0.5)) / n;
    for (let j = 0; j < n; j++) {
      const x = (2 * (j + 0.5)) / n - 1;
      let v = 0;
      for (const [A, a, b, x0, y0, deg] of SHEPP_LOGAN_ELLIPSES) {
        const th = (deg * Math.PI) / 180;
        const c = Math.cos(th);
        const s = Math.sin(th);
        const dx = x - x0;
        const dy = y - y0;
        const u = (dx * c + dy * s) / a;
        const w = (-dx * s + dy * c) / b;
        if (u * u + w * w <= 1) v += A;
      }
      img[i * n + j] = Math.min(1, Math.max(0, v));
    }
  }
  return img;
}

/**
 * Une image EXACTEMENT de rang r, par construction. Elle existe pour montrer
 * le cas où la SVD gagne tout : r valeurs singulières non nulles, et rien
 * après.
 *
 * (r − 1) produits extérieurs de sinusoïdes, et la constante que la
 * normalisation ajoute pour la r-ième. Ce détail n'en est pas un : un
 * décalage global EST une couche de rang 1, et l'oublier livrerait une image
 * de rang r + 1 vendue pour du rang r. Le harnais le mesure.
 */
export function lowRankImage(n, r) {
  const img = new Float64Array(n * n);
  for (let c = 1; c < r; c++) {
    for (let i = 0; i < n; i++) {
      const ui = Math.sin((Math.PI * c * (i + 0.5)) / n);
      for (let j = 0; j < n; j++) img[i * n + j] += (ui * Math.cos((Math.PI * c * (j + 0.5)) / n)) / c;
    }
  }
  return normalize01(img);
}

/**
 * Un damier — et le contre-exemple le plus utile de la séance, parce qu'il
 * dit le contraire de ce qu'on attend. Des bords francs partout, l'air très
 * « détaillé », et un rang de… 2 : la valeur d'un pixel s'écrit
 * f(ligne) + g(colonne) − 2·f(ligne)·g(colonne), donc l'image est SÉPARABLE.
 * Deux couches la reconstruisent exactement. L'œil ne juge pas du rang.
 */
export function checkerboard(n, cells) {
  const img = new Float64Array(n * n);
  const s = n / cells;
  for (let i = 0; i < n; i++)
    for (let j = 0; j < n; j++)
      img[i * n + j] = (Math.floor(i / s) + Math.floor(j / s)) % 2 ? 0.85 : 0.15;
  return img;
}

/**
 * Du bruit : le contre-exemple. Aucune structure, donc rien à compresser.
 *
 * Tirage UNIFORME sur [0, 1], et pas un gaussien renormalisé : ce dernier
 * occupe mal la dynamique (± 4σ ramenés dans [0, 1], donc un écart-type de
 * 1/8 autour d'une moyenne de 0.5), si bien que sa première couche — la
 * composante continue — emporte à elle seule 95 % de l'énergie. La courbe
 * d'énergie disait alors qu'un bruit se compresse mieux qu'un fantôme, ce
 * qui est vrai de la MOYENNE et de rien d'autre, et ruinait la démonstration.
 * L'uniforme descend cette part à 75 % et rend la comparaison honnête.
 */
export function noiseImage(n, rand) {
  const img = new Float64Array(n * n);
  for (let i = 0; i < img.length; i++) img[i] = rand();
  return img;
}

/** Ramène un tableau dans [0, 1] par translation et échelle. */
export function normalize01(a) {
  let lo = Infinity;
  let hi = -Infinity;
  for (const v of a) {
    if (v < lo) lo = v;
    if (v > hi) hi = v;
  }
  const d = hi - lo || 1;
  const out = new Float64Array(a.length);
  for (let i = 0; i < a.length; i++) out[i] = (a[i] - lo) / d;
  return out;
}

/* ------------------------------------------------------- affichage BMP -- */

// Un BMP 8 bits en niveaux de gris, encodé à la main et rendu en `data:` URI.
//
// Pourquoi BMP et pas PNG : le PNG demande un deflate et un CRC, soit une
// centaine de lignes qu'il faudrait vérifier, quand le BMP est un en-tête
// suivi des octets bruts. Pourquoi pas un canvas : le worker n'a pas le DOM,
// le harnais tourne dans Node, et la vue doit rester du SVG pur clonable —
// c'est ce dont dépendent le gel et l'export. Une chaîne `data:` traverse
// tout cela sans rien supposer.

const B64 = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/';

/** base64 écrit ici plutôt que via btoa ou Buffer : le même code doit
 *  tourner dans un worker ET dans Node, sans branche selon l'hôte. */
function base64(bytes) {
  let out = '';
  for (let i = 0; i < bytes.length; i += 3) {
    const a = bytes[i];
    const b = i + 1 < bytes.length ? bytes[i + 1] : 0;
    const c = i + 2 < bytes.length ? bytes[i + 2] : 0;
    out += B64[a >> 2] + B64[((a & 3) << 4) | (b >> 4)];
    out += i + 1 < bytes.length ? B64[((b & 15) << 2) | (c >> 6)] : '=';
    out += i + 2 < bytes.length ? B64[c & 63] : '=';
  }
  return out;
}

/**
 * Une image n × n de [0, 1] en `data:image/bmp;base64,…`.
 * Le BMP se lit du BAS vers le haut : les lignes sont écrites à l'envers,
 * faute de quoi l'image apparaît retournée — l'erreur classique du format.
 */
export function toBmpDataUri(img, n) {
  const rowSize = (n + 3) & ~3; // lignes alignées sur 4 octets
  const pixOffset = 14 + 40 + 256 * 4;
  const size = pixOffset + rowSize * n;
  const b = new Uint8Array(size);
  const u16 = (o, v) => {
    b[o] = v & 255;
    b[o + 1] = (v >> 8) & 255;
  };
  const u32 = (o, v) => {
    b[o] = v & 255;
    b[o + 1] = (v >> 8) & 255;
    b[o + 2] = (v >> 16) & 255;
    b[o + 3] = (v >>> 24) & 255;
  };
  b[0] = 66; // 'B'
  b[1] = 77; // 'M'
  u32(2, size);
  u32(10, pixOffset);
  u32(14, 40); // taille de l'en-tête DIB
  u32(18, n);
  u32(22, n);
  u16(26, 1); // plans
  u16(28, 8); // bits par pixel
  u32(34, rowSize * n);
  u32(46, 256); // couleurs de la palette
  for (let k = 0; k < 256; k++) {
    const o = 54 + k * 4;
    b[o] = k;
    b[o + 1] = k;
    b[o + 2] = k;
  }
  for (let i = 0; i < n; i++) {
    const src = (n - 1 - i) * n; // bas vers haut
    const dst = pixOffset + i * rowSize;
    for (let j = 0; j < n; j++) {
      const v = img[src + j];
      b[dst + j] = Math.max(0, Math.min(255, Math.round(255 * v)));
    }
  }
  return 'data:image/bmp;base64,' + base64(b);
}
