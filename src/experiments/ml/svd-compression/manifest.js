import { int, select } from '../../../core/fields.js';
import { view, custom, line, vline } from '../../../core/views.js';

/** @type {import('../../../core/types').ExperimentManifest} */
export default {
  id: 'svd-compression',
  order: 2,
  // L'image de bruit tire, les trois autres sont des formules. Le dé et la
  // touche R n'ont donc d'effet que sur elle — et cet effet-là vaut la
  // peine : marteler R montre que le spectre plat n'est pas une propriété
  // de CE bruit mais du bruit. La déclaration reste binaire par contrat, et
  // c'est bien : une capacité conditionnelle au paramètre demanderait une
  // infrastructure que le principe 7 refuse tant qu'une seule expérience la
  // réclame.
  random: true,
  title: 'Compression d’image par SVD',
  subtitle: 'Une image est une matrice — et Eckart–Young dit exactement ce qu’on perd',
  tags: ['SVD', 'compression', 'rang', 'Eckart–Young', 'Shepp–Logan', 'valeurs singulières'],

  params: {
    image: select('image', {
      description: 'image analysée (calculée, jamais copiée)',
      options: [
        { value: 'phantom', label: 'fantôme de Shepp–Logan' },
        { value: 'lowrank', label: 'rang 4 par construction' },
        { value: 'checker', label: 'damier' },
        { value: 'noise', label: 'bruit blanc' },
      ],
      default: 'phantom',
    }),
    k: int('k', {
      description: 'couches de rang 1 conservées',
      min: 1,
      max: 40,
      default: 12,
    }),
  },

  groups: [
    { title: 'Image', params: ['image'] },
    { title: 'Compression', params: ['k'] },
  ],

  views: [
    // Les trois images d'abord : c'est l'expérience elle-même.
    custom('images', 'Origine, rang k, résidu', () => import('./views/Images.svelte')),

    // Le spectre singulier, en log : la SEULE chose qui décide si une image
    // se compresse. Geler (F) puis changer d'image superpose les spectres —
    // c'est la comparaison, et elle se fait au geste plutôt qu'en calculant
    // quatre décompositions à chaque cran du potard.
    view(
      'singular',
      'Valeurs singulières',
      line('singular', {
        color: '#0072BD',
        width: 2.4,
        label: 'σᵢ / σ₁',
        overlays: [vline('kLine', { color: '#EDB120', dashed: true, width: 1.6, label: 'k gardées' })],
        axes: {
          x: { label: 'indice i' },
          // domaine FIXE, et fixé au plancher d'affichage du compute :
          // le geste de gel superpose deux images, donc les deux spectres
          // doivent être lus sur la même échelle
          y: { label: 'σᵢ / σ₁', scale: 'log', domain: [1e-3, 1.5] },
        },
      })
    ),

    // Et la comptabilité : ce que k achète et ce qu'il coûte.
    view(
      'energy',
      'Énergie gardée',
      line('energy', {
        color: '#0072BD',
        width: 2.4,
        label: 'énergie cumulée',
        overlays: [vline('kLine', { color: '#EDB120', dashed: true, width: 1.6, label: 'k' })],
        axes: { x: { label: 'couches gardées k' }, y: { label: 'énergie', unit: '%', domain: [0, 101] } },
      })
    ),
  ],
};
