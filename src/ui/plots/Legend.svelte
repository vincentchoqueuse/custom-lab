<script>
  // Legend chips (color swatch + label), top-right of the plot area. Shared
  // by DeclarativePlot (layers carrying a `label`) and custom views.
  import { FONT_UI } from './frame.js';

  let { entries = [], iw, kt = 1 } = $props();
</script>

{#each entries as e, i (e.label)}
  <g transform="translate({iw - 8},{12 + i * 18 * kt})">
    <rect x="-14" y="-4" width="14" height="5" rx="2" fill={e.color} />
    <text
      x="-20"
      y="2"
      text-anchor="end"
      font-size={11.5 * kt}
      fill="#52525b"
      font-family={FONT_UI}>{e.label}</text
    >
  </g>
{/each}
