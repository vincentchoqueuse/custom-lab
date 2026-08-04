<script>
  // Legend chips (color swatch + label), top-right of the plot area. Shared
  // by DeclarativePlot (layers carrying a `label`), the plane views and
  // custom views.
  //
  // Clickable: a chip switches its curve off or back on. On a view that
  // stacks three estimators — the truth, Hilbert and Teager — "look at this
  // one alone" is the gesture a hand makes in front of the screen, and
  // nothing else replaces it. The state is DISPLAY state: never in the URL,
  // cleared when the view changes (store.svelte.js), like the freeze ghost
  // and the axis lock.
  //
  // A <g role="button"> rather than a <foreignObject> holding a real button:
  // the freeze ghost and the SVG export both rely on the plot being pure,
  // clonable SVG. The role and the tabindex buy the keyboard and the screen
  // reader without breaking that.
  import { FONT_UI } from './frame.js';
  import { dataColor } from '../../core/palette.svelte.js';
  import { app, toggleSeries } from '../../core/store.svelte.js';
  import { STR } from '../../core/strings.js';

  let { entries = [], iw, kt = 1, side = 'right' } = $props();

  // Anchoring: on the right the block is aligned with the right edge of the
  // frame and the labels are right-aligned; on the left everything is
  // mirrored. One position parameter, the rest of the drawing is identical.
  const left = $derived(side === 'left');
  // width of the block, shared by the background and the chip anchoring
  const bw = $derived(
    entries.length ? Math.max(...entries.map((e) => e.label.length * 6.6 * kt)) + 34 : 0
  );

  const press = (ev, label) => {
    if (ev.key === undefined || ev.key === 'Enter' || ev.key === ' ') {
      ev.preventDefault();
      toggleSeries(label);
    }
  };
</script>

{#if entries.length}
  <!-- A background, because the legend sits ON TOP OF the plot: since the
       reference lines carry their names here, it holds more entries, and a
       name crossing a curve of the same color stops being readable from the
       back of the room. The plot frame is light by contract (projector
       legibility), so a translucent white works in both themes. -->
  <rect
    x={left ? 4 : iw - 4 - bw}
    y={2 * kt}
    width={bw}
    height={(entries.length - 1) * 18 * kt + 18 * kt}
    rx={4}
    fill="#ffffff"
    opacity="0.72"
  />
{/if}

{#each entries as e, i (e.label)}
  {@const off = app.hidden.includes(e.label)}
  {@const w = Math.max(60, e.label.length * 6.6 * kt)}
  <g
    transform="translate({left ? bw + 4 : iw - 8},{12 + i * 18 * kt})"
    role="button"
    tabindex="0"
    aria-pressed={!off}
    aria-label="{e.label} — {STR.LEGEND_TOGGLE}"
    class="legend-chip"
    onclick={(ev) => press(ev, e.label)}
    onkeydown={(ev) => press(ev, e.label)}
  >
    <title>{e.label} — {STR.LEGEND_TOGGLE}</title>
    <!-- generous click target: the chip alone is 14 px wide and would be
         unaimable from a lectern, let alone with a finger -->
    <rect x={-w - 8} y={-11 * kt} width={w + 8} height={16 * kt} fill="transparent" />
    {#if e.dashed}
      <!-- a dashed chip for a dashed layer: this is what tells theory from
           measurement when the two carry the same color -->
      <line
        x1="-14"
        x2="0"
        y1="-1.5"
        y2="-1.5"
        stroke={off ? '#a1a1aa' : dataColor(e.color)}
        stroke-width="2.4"
        stroke-dasharray="4 3"
        opacity={off ? 0.85 : 1}
      />
    {:else}
      <!-- Switched off, the chip turns SOLID GRAY: a hollowed square read as
           a checkbox, hence as "not chosen yet", when it means "layer
           hidden". A gray chip says the same thing as the struck-through
           label, and says it in color — which is what carries at a
           distance. -->
      <rect
        x="-14"
        y="-4"
        width="14"
        height="5"
        rx="2"
        fill={off ? '#a1a1aa' : dataColor(e.color)}
        opacity={off ? 0.85 : 1}
      />
    {/if}
    <text
      x="-20"
      y="2"
      text-anchor="end"
      font-size={11.5 * kt}
      fill="#52525b"
      opacity={off ? 0.45 : 1}
      text-decoration={off ? 'line-through' : null}
      font-family={FONT_UI}>{e.label}</text
    >
  </g>
{/each}

<style>
  .legend-chip {
    cursor: pointer;
  }
  .legend-chip:focus-visible {
    outline: 2px solid var(--ring);
    outline-offset: 1px;
  }
</style>
