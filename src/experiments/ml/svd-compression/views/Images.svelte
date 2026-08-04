<!--
  CUSTOM view — justification : une IMAGE RASTER n'est aucun des types
  génériques du catalogue, et ne le sera pas tant qu'une seule expérience en
  affiche. Trois vignettes côte à côte, l'origine, l'approximation de rang k
  et le résidu amplifié — c'est la comparaison qui enseigne, et elle ne se
  fait qu'en les mettant l'une à côté de l'autre.

  Reste du SVG PUR : un <image> avec un `data:` URI est un nœud SVG comme un
  autre, donc le gel (F) et l'export le clonent sans rien de particulier.
  Aucun canvas, aucune manipulation du DOM — c'est ce dont dépendent les deux.

  Aucun calcul scientifique ici : les trois URI arrivent toutes faites des
  observables, et il ne reste que du placement en pixels.
  Promue dans ui/plots/ si une deuxième expérience affiche une image.
-->
<script>
  import { FRAME, FONT_UI, typeScale } from '../../../../ui/plots/frame.js';

  let { observables: obs, params, pres = false } = $props();

  const { W, H } = FRAME;
  const kt = $derived(typeScale(pres));

  const tiles = $derived([
    { uri: obs.original?.value, label: 'origine' },
    { uri: obs.compressed?.value, label: `rang k = ${params.k}` },
    { uri: obs.residual?.value, label: 'résidu ×4' },
  ]);

  // trois vignettes carrées, réparties sur la largeur du cadre
  const gap = 26;
  const side = $derived(Math.min((W - 4 * gap) / 3, H - 90));
  const x0 = $derived((W - (3 * side + 2 * gap)) / 2);
  const y0 = $derived((H - side) / 2 - 6);
</script>

<svg class="plot-svg" viewBox="0 0 {W} {H}" role="img">
  {#each tiles as t, i}
    {#if t.uri}
      <!-- image-rendering: pixelated — une compression se juge sur les
           PIXELS, et un lissage du navigateur maquillerait justement ce que
           l'expérience demande de regarder -->
      <image
        href={t.uri}
        x={x0 + i * (side + gap)}
        y={y0}
        width={side}
        height={side}
        style="image-rendering: pixelated"
        preserveAspectRatio="none"
      />
      <rect
        x={x0 + i * (side + gap)}
        y={y0}
        width={side}
        height={side}
        fill="none"
        stroke="#e4e4e7"
      />
      <text
        x={x0 + i * (side + gap) + side / 2}
        y={y0 + side + 22 * kt}
        text-anchor="middle"
        font-size={12.5 * kt}
        fill="#52525b"
        font-family={FONT_UI}>{t.label}</text
      >
    {/if}
  {/each}
</svg>
