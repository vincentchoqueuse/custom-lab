<!--
  CUSTOM view — justification: a SIGNAL-FLOW GRAPH. Adders, gain triangles and
  delay blocks wired to each other are not a plot of anything: there is no
  abscissa, no ordinate and no data mark, so none of the generic types apply
  and none ever will. Shared by the whole filtering module from _lib/ rather
  than sitting in one experiment, because the point of the figure is that four
  different filters are the SAME diagram with different numbers in it.

  No scientific computation here. The coefficients arrive ready-made as
  observables; what this file does is arithmetic on pixels and nothing else.

  THE CONTRACT — an experiment that draws its structure emits:
      structB   the numerator coefficients, b[0…N], z⁻¹ ascending
      structA   the denominator, a[0…M] with a[0] = 1; [1] for an FIR
  and may emit
      structBulk   text, when one delay block stands for several (a comb's
                   z⁻ᴰ): the label written inside that block
-->
<script>
  import { FRAME, FONT_UI, FONT_MONO, strokeScale, typeScale } from '../../../../ui/plots/frame.js';

  let { observables: obs, pres = false, frame = FRAME } = $props();

  const W = $derived(frame.W);
  const H = $derived(frame.H);
  const k = $derived(strokeScale(pres));
  const kt = $derived(typeScale(pres));

  const b = $derived(Array.from(obs.structB?.value ?? [1]));
  const a = $derived(Array.from(obs.structA?.value ?? [1]));
  const bulk = $derived(obs.structBulk?.value ?? null);
  /** An FIR has no feedback, and the whole left half of the diagram vanishes
   *  with it — a drawn-but-empty feedback bus would teach that an FIR has one
   *  and it happens to be zero. */
  const recursive = $derived(a.length > 1);

  /** Stages of the delay chain: one per z⁻¹ the difference equation needs. */
  const K = $derived(Math.max(b.length, a.length) - 1);

  /** Which stages get a row. Past five the chain is elided in the middle: this
   *  is a SCHEMATIC — the room reads "a chain of delays, tapped at each step",
   *  and a hundred rows of it says nothing the first four do not. */
  const rows = $derived.by(() => {
    if (K <= 5) return Array.from({ length: K }, (_, i) => i + 1);
    return [1, 2, 3, 'gap', K];
  });

  const num = (v) =>
    v === undefined || v === null
      ? '0'
      : Math.abs(v) < 1e-12
        ? '0'
        : Math.abs(v) >= 1e4 || Math.abs(v) < 1e-3
          ? v.toExponential(1)
          : String(Number(v.toPrecision(3)));

  const sub = (i) => String(i).replace(/\d/g, (d) => '₀₁₂₃₄₅₆₇₈₉'[+d]);

  /* ---------------------------------------------------------------- layout */
  const cx = $derived(recursive ? W / 2 : W / 2 - 0.05 * W);
  // The bus offset is a FRACTION of the canvas, not 210 px: the phone frame is
  // 460 user units wide against the projector's 760 (ui/plots/frame.js), and a
  // fixed offset pushed the input arrow off the left edge there.
  const arm = $derived(Math.min(210, 0.28 * W));
  const xBusL = $derived(cx - arm);
  const xBusR = $derived(cx + arm);
  const lead = $derived(Math.min(90, xBusL - 14));
  const yTop = 56;
  const yBot = $derived(H - 56); // the caption lives under this
  const dy = $derived(Math.min(74, (yBot - yTop) / Math.max(rows.length, 1)));
  const yOf = (i) => yTop + (i + 1) * dy;

  /** What the structure COSTS per sample, which is the question the tab is
   *  there to answer. Counted on the non-zero coefficients, because a comb's
   *  forty z⁻¹ carry one multiplication and the diagram must not be read as
   *  forty. */
  const mults = $derived(
    b.filter((v) => v !== 0).length + a.slice(1).filter((v) => v !== 0).length
  );

  const R = 13; // adder radius
  const TRI = 15; // gain triangle half-height

  /** A gain triangle pointing towards `dir` (+1 right, −1 left), tip on the
   *  bus, with its coefficient written beside it. */
  const tri = (x, y, dir) =>
    `${x - dir * 26},${y - TRI} ${x - dir * 26},${y + TRI} ${x},${y}`;
</script>

<svg class="plot-svg" viewBox="0 0 {W} {H}" role="img">
  <g
    fill="none"
    stroke="#444"
    stroke-width={1.4 * k}
    stroke-linecap="round"
    font-family={FONT_UI}
  >
    <!-- ---------------------------------------------------------- the spine -->
    <!-- x[n] in, through the first adder, to the chain node w[n] -->
    {#if recursive}
      <line x1={xBusL - lead} y1={yTop} x2={xBusL - R} y2={yTop} marker-end="url(#arw)" />
      <circle cx={xBusL} cy={yTop} r={R} />
      <line x1={xBusL - 7} y1={yTop} x2={xBusL + 7} y2={yTop} />
      <line x1={xBusL} y1={yTop - 7} x2={xBusL} y2={yTop + 7} />
      <line x1={xBusL + R} y1={yTop} x2={cx} y2={yTop} />
    {:else}
      <line x1={cx - arm} y1={yTop} x2={cx} y2={yTop} marker-end="url(#arw)" />
    {/if}

    <!-- the output adder and y[n] out -->
    <circle cx={xBusR} cy={yTop} r={R} />
    <line x1={xBusR - 7} y1={yTop} x2={xBusR + 7} y2={yTop} />
    <line x1={xBusR} y1={yTop - 7} x2={xBusR} y2={yTop + 7} />
    <line x1={xBusR + R} y1={yTop} x2={Math.min(W - 12, xBusR + 90)} y2={yTop} marker-end="url(#arw)" />

    <!-- b₀: the direct path, chain node to output adder -->
    <line x1={cx} y1={yTop} x2={xBusR - R} y2={yTop} />
    <polygon points={tri(xBusR - R - 4, yTop, 1)} fill="#fff" />
    <text
      x={xBusR - R - 34}
      y={yTop - TRI - 8}
      text-anchor="middle"
      font-size={12 * kt}
      font-family={FONT_MONO}
      fill="#444"
      stroke="none">b₀ = {num(b[0])}</text
    >

    <!-- ------------------------------------------------------- the vertical
         buses: every tap climbs one of these into its adder -->
    {#if recursive}
      <line x1={xBusL} y1={yTop + R} x2={xBusL} y2={yOf(rows.length - 1)} />
    {/if}
    <line x1={xBusR} y1={yTop + R} x2={xBusR} y2={yOf(rows.length - 1)} />

    <!-- --------------------------------------------------- the delay chain -->
    {#each rows as r, i}
      {@const y = yOf(i)}
      {@const yPrev = i === 0 ? yTop : yOf(i - 1)}
      {#if r === 'gap'}
        <line x1={cx} y1={yPrev} x2={cx} y2={y} stroke-dasharray="4 6" />
        <text
          x={cx}
          y={(yPrev + y) / 2 + 5}
          text-anchor="middle"
          font-size={15 * kt}
          fill="#71717a"
          stroke="none">⋮</text
        >
        <text
          x={cx + 16}
          y={(yPrev + y) / 2 + 5}
          font-size={11 * kt}
          fill="#71717a"
          stroke="none">{K - 4} more stages</text
        >
      {:else}
        <!-- z⁻¹ block on the spine, and the TAP NODE below it: the branches
             leave the chain after the delay, not out of the middle of it -->
        <line x1={cx} y1={yPrev} x2={cx} y2={y - 39} />
        <line x1={cx} y1={y - 9} x2={cx} y2={y} />
        <rect x={cx - 26} y={y - 39} width="52" height="30" rx="4" fill="#fff" />
        <text
          x={cx}
          y={y - 19}
          text-anchor="middle"
          font-size={13 * kt}
          font-family={FONT_MONO}
          fill="#444"
          stroke="none">{bulk && K > 5 && r === K ? bulk : 'z⁻¹'}</text
        >

        <!-- feed-forward tap: node → triangle → output bus -->
        <line x1={cx + 26} y1={y} x2={xBusR - R - 4} y2={y} />
        <circle cx={cx} cy={y} r="3" fill="#444" stroke="none" />
        <polygon points={tri(xBusR - R - 4, y, 1)} fill="#fff" />
        <text
          x={xBusR - R - 34}
          y={y - TRI - 6}
          text-anchor="middle"
          font-size={12 * kt}
          font-family={FONT_MONO}
          fill="#444"
          stroke="none">b{sub(r)} = {num(b[r])}</text
        >

        <!-- feedback tap: node → triangle → input bus -->
        {#if recursive}
          <line x1={cx - 26} y1={y} x2={xBusL + R + 4} y2={y} />
          <polygon points={tri(xBusL + R + 4, y, -1)} fill="#fff" />
          <text
            x={xBusL + R + 8}
            y={y - TRI - 6}
            font-size={12 * kt}
            font-family={FONT_MONO}
            fill="#444"
            stroke="none">−a{sub(r)} = {num(-a[r])}</text
          >
        {/if}
      {/if}
    {/each}

    <!-- ------------------------------------------------------------- labels -->
    <text
      x={recursive ? xBusL - lead : cx - arm}
      y={yTop - 14}
      font-size={13 * kt}
      font-family={FONT_MONO}
      fill="#444"
      stroke="none">x[n]</text
    >
    <text
      x={Math.min(W - 46, xBusR + 26)}
      y={yTop - 14}
      font-size={13 * kt}
      font-family={FONT_MONO}
      fill="#444"
      stroke="none">y[n]</text
    >
    <text x={14} y={H - 12} font-size={12 * kt} fill="#71717a" stroke="none">
      {recursive
        ? `Direct form II — ${K} memories and ${mults} multiplications per sample, in a loop`
        : `Direct form — ${K} memories and ${mults} multiplications per sample; no loop, so an FIR cannot ring`}
    </text>
  </g>

  <defs>
    <marker id="arw" markerWidth="9" markerHeight="7" refX="8" refY="3.5" orient="auto">
      <polygon points="0,0 9,3.5 0,7" fill="#444" />
    </marker>
  </defs>
</svg>
