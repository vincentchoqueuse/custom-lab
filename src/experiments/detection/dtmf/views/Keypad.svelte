<!--
  CUSTOM view — justification: a labelled 4×4 KEYPAD whose cells are shaded by
  their score. There is no abscissa and no ordinate: the two axes are the low
  and high tone groups, the cells are keys, and what is read is which one is
  brightest. No generic plot type expresses that, and none should.

  No scientific computation here: the sixteen scores arrive ready-made from the
  observables, and this file does arithmetic on pixels and on a colour ramp.
-->
<script>
  import { FRAME, FONT_UI, FONT_MONO, strokeScale, typeScale } from '../../../../ui/plots/frame.js';

  let { observables: obs, pres = false, frame = FRAME } = $props();

  const W = $derived(frame.W);
  const H = $derived(frame.H);
  const k = $derived(strokeScale(pres));
  const kt = $derived(typeScale(pres));

  const LOW = [697, 770, 852, 941];
  const HIGH = [1209, 1336, 1477, 1633];
  const KEYS = [
    ['1', '2', '3', 'A'],
    ['4', '5', '6', 'B'],
    ['7', '8', '9', 'C'],
    ['*', '0', '#', 'D'],
  ];

  const grid = $derived(Array.from(obs.grid?.value ?? new Float64Array(16)));
  const peak = $derived(obs.gridPeak?.value ?? 1);
  const trueCell = $derived(obs.trueCell?.value ?? -1);
  const bestCell = $derived(obs.bestCell?.value ?? -1);

  /* ------------------------------------------------------------------ layout
     Square cells, centred, with room on the left for the low-group labels and
     under for the high-group ones. */
  const PAD_L = 96;
  const PAD_B = 46;
  const PAD_T = 30;
  const cell = $derived(Math.min((W - PAD_L - 40) / 4, (H - PAD_T - PAD_B) / 4));
  const x0 = $derived(PAD_L + (W - PAD_L - 40 - 4 * cell) / 2);
  const y0 = $derived(PAD_T + (H - PAD_T - PAD_B - 4 * cell) / 2);

  /** The ramp: the catalogue's data blue, from paper to full. A single hue,
   *  because what is read here is ONE quantity and a rainbow would invent
   *  categories the data does not have. */
  const shade = (v) => {
    const t = Math.max(0, Math.min(1, v / (peak || 1)));
    const e = t ** 0.6; // gamma, so the runners-up stay visible
    return `rgb(${Math.round(255 - 255 * e * 0.86)}, ${Math.round(255 - 255 * e * 0.55)}, ${Math.round(255 - 255 * e * 0.26)})`;
  };
</script>

<svg class="plot-svg" viewBox="0 0 {W} {H}" role="img">
  <g font-family={FONT_UI}>
    {#each KEYS as row, r (r)}
      {#each row as label, c (c)}
        {@const i = 4 * r + c}
        {@const bright = grid[i] / (peak || 1) > 0.55}
        <rect
          x={x0 + c * cell}
          y={y0 + r * cell}
          width={cell - 4}
          height={cell - 4}
          rx="8"
          fill={shade(grid[i])}
          stroke={i === bestCell ? '#D95319' : 'var(--border)'}
          stroke-width={(i === bestCell ? 3.2 : 1) * k}
        />
        <text
          x={x0 + c * cell + (cell - 4) / 2}
          y={y0 + r * cell + (cell - 4) / 2 + 7}
          text-anchor="middle"
          font-size={22 * kt}
          font-weight="600"
          fill={bright ? '#fff' : '#18181b'}>{label}</text
        >
        <!-- the score, so the figure carries a number and not only a shade -->
        <text
          x={x0 + c * cell + (cell - 4) / 2}
          y={y0 + r * cell + cell - 16}
          text-anchor="middle"
          font-size={10 * kt}
          font-family={FONT_MONO}
          fill={bright ? 'rgba(255,255,255,0.85)' : '#71717a'}
          >{grid[i].toFixed(2)}</text
        >
        <!-- the key that was actually sent, marked and not shaded: the reader
             has to be able to see a WRONG decision, which a figure that only
             highlights the winner cannot show -->
        {#if i === trueCell}
          <circle
            cx={x0 + c * cell + 13}
            cy={y0 + r * cell + 13}
            r={5 * k}
            fill="none"
            stroke="#EDB120"
            stroke-width={2.4 * k}
          />
        {/if}
      {/each}
      <text
        x={x0 - 12}
        y={y0 + r * cell + (cell - 4) / 2 + 5}
        text-anchor="end"
        font-size={13 * kt}
        font-family={FONT_MONO}
        fill="var(--muted-fg)">{LOW[r]} Hz</text
      >
    {/each}
    {#each HIGH as f, c (c)}
      <text
        x={x0 + c * cell + (cell - 4) / 2}
        y={y0 + 4 * cell + 18}
        text-anchor="middle"
        font-size={13 * kt}
        font-family={FONT_MONO}
        fill="var(--muted-fg)">{f} Hz</text
      >
    {/each}
    <text x={14} y={20} font-size={12 * kt} fill="var(--muted-fg)">
      score = |â_low|² + |â_high|² · circle: the key sent · outline: the key decided
    </text>
  </g>
</svg>
