<script>
  // THE VALUE UNDER THE POINTER — a rule at the abscissa the hand is on, a dot
  // on every series at its nearest sample, and the numbers written beside them.
  //
  // The question a room asks most often about a curve is "and at 3 Hz, what is
  // it?", and until this existed the answer was to squint at pixels. It is
  // pure reading: no compute, no manifest, no state that outlives the pointer.
  //
  // The rule SNAPS to the sample it is reading. A rule standing where the hand
  // is, with dots on the samples beside it and a third number under it, gives
  // three different abscissas for one reading; snapped, the rule, the dots and
  // the number are one place. On a dense curve it follows the pointer to
  // within a pixel and nobody notices; on a stem plot of 24 symbols it jumps
  // from symbol to symbol, which is the truth — a sampled signal has no value
  // between two samples, and that is the same reason this catalogue draws
  // stems for one and never a line.
  //
  // Transient by construction: `data-transient` marks it, and the SVG export
  // and the freeze ghost — both DOM clones — strip it, so a crosshair on
  // screen when `F` is pressed never ends up baked into the ghost.
  import { format } from '../../core/scales.js';
  import { dataColor } from '../../core/palette.svelte.js';
  import { FONT_MONO } from './frame.js';

  let { hits = [], x, dataX, ih, iw, kt = 1, showAbscissa = true } = $props();

  // 4 significant digits, trailing zeros trimmed: a readout is read, not
  // computed with, and an axis tick format would round 1.03 to 1.
  const fmt = format('.4~g');

  const size = $derived(10.5 * kt);
  // labels go left of the rule once it is past two thirds, or they run off
  const flip = $derived(x > iw * 0.66);

  // Two series that meet — a measurement on top of its theory, which is the
  // best thing that can happen on these plots — put their two numbers in the
  // same place and neither is readable. Ordered top to bottom and pushed
  // apart to one line's height, they stay two numbers.
  const placed = $derived.by(() => {
    const gap = size + 3;
    const rows = [...hits].map((h, i) => ({ ...h, i })).sort((a, b) => a.py - b.py);
    let last = -Infinity;
    for (const r of rows) {
      r.ty = Math.max(r.py - 6, last + gap);
      last = r.ty;
    }
    return rows;
  });
</script>

<g data-transient="crosshair" pointer-events="none">
  <line
    x1={x}
    y1="0"
    x2={x}
    y2={ih}
    stroke="var(--foreground)"
    stroke-width={1.1 * kt}
    stroke-opacity="0.45"
  />
  {#each placed as h (h.i)}
    <circle cx={h.px} cy={h.py} r={3.6 * kt} fill={dataColor(h.color)} stroke="#fff" stroke-width="1.2" />
    <text
      x={flip ? x - 8 : x + 8}
      y={h.ty}
      text-anchor={flip ? 'end' : 'start'}
      font-size={size}
      font-family={FONT_MONO}
      fill={dataColor(h.color)}
      stroke="#fff"
      stroke-width="3"
      paint-order="stroke"
      stroke-linejoin="round">{fmt(h.y)}</text
    >
  {/each}
  <!-- The abscissa, on the axis, over a ground of its own: it lands on the tick
       labels and has to stay readable there. ONCE per figure — a stack shares
       one abscissa, and a copy floating in the middle of the upper panel says
       the two panels are two plots. -->
  {#if showAbscissa}
  <rect
    x={x - 26 * kt}
    y={ih + 3}
    width={52 * kt}
    height={15 * kt}
    rx={3}
    fill="var(--background)"
    stroke="var(--border)"
    stroke-width="0.8"
  />
  <text
    {x}
    y={ih + 14 * kt}
    text-anchor="middle"
    font-size={size}
    font-family={FONT_MONO}
    fill="var(--foreground)">{fmt(dataX)}</text
  >
  {/if}
</g>
