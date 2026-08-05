<!--
  CUSTOM view — justification: a RASTER IMAGE is none of the catalogue's
  generic types, and will not be one while a single experiment displays any.
  Three thumbnails side by side — the original, the rank-k approximation and
  the amplified residual — the comparison is what teaches, and it only happens
  by putting them next to each other.

  It stays PURE SVG: an <image> with a `data:` URI is an SVG node like any
  other, so freeze (F) and export clone it with nothing special. No canvas, no
  DOM manipulation — which is exactly what those two depend on.

  No scientific computation here: the three URIs arrive ready-made from the
  observables, and all that is left is pixel placement.
  Promoted to ui/plots/ if a second experiment displays an image.
-->
<script>
  import { FRAME, FONT_UI, typeScale } from '../../../../ui/plots/frame.js';

  let { observables: obs, params, pres = false, frame = FRAME } = $props();

  // The canvas arrives as a prop rather than as an import: it is 16:9 on a
  // projector and 4:3 on a phone (ui/plots/frame.js), and a custom view has no
  // business knowing the store to draw on the same frame as everything else.
  const W = $derived(frame.W);
  const H = $derived(frame.H);
  const kt = $derived(typeScale(pres));

  const tiles = $derived([
    { uri: obs.original?.value, label: 'original' },
    { uri: obs.compressed?.value, label: `rank k = ${params.k}` },
    { uri: obs.residual?.value, label: 'residual ×4' },
  ]);

  // three square thumbnails, spread across the width of the frame
  const gap = 26;
  const side = $derived(Math.min((W - 4 * gap) / 3, H - 90));
  const x0 = $derived((W - (3 * side + 2 * gap)) / 2);
  const y0 = $derived((H - side) / 2 - 6);
</script>

<svg class="plot-svg" viewBox="0 0 {W} {H}" role="img">
  {#each tiles as t, i}
    {#if t.uri}
      <!-- image-rendering: pixelated — a compression is judged on the PIXELS,
           and browser smoothing would paper over exactly what the experiment
           asks one to look at -->
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
