<script>
  // Generic axes + grid. Accepts linear or log scales from core/scales.js —
  // log axes get decade ticks (minor labels blanked by d3's tickFormat).
  import { format } from '../../core/scales.js';
  import { FONT_MONO, FONT_UI } from './frame.js';

  let { xs, ys, xAxis = {}, yAxis = {}, w, h, k = 1, kt = 1 } = $props();

  // A tick whose pixel position is not a number is not drawn. This is not
  // paranoia: for one frame during an experiment or scene swap a scale can be
  // built from a domain that does not exist yet, and an SVG attribute of
  // "NaN" is an error the browser logs — never something a lecture should
  // produce on the console.
  const placeable = (scale, t) => Number.isFinite(scale(t));
  const xTicks = $derived(
    xAxis?.ticks === false ? [] : (xs.ticks ? xs.ticks(6) : []).filter((t) => placeable(xs, t))
  );
  const yTicks = $derived(
    yAxis?.ticks === false ? [] : (ys.ticks ? ys.ticks(5) : []).filter((t) => placeable(ys, t))
  );
  const xFmt = $derived(xAxis.format ? format(xAxis.format) : xs.tickFormat(6));
  const yFmt = $derived(yAxis.format ? format(yAxis.format) : ys.tickFormat(5));

  function axisLabel(a) {
    return a.label ? `${a.label}${a.unit ? ` (${a.unit})` : ''}` : '';
  }
</script>

<g>
  {#each yTicks as t (t)}
    <line x1="0" x2={w} y1={ys(t)} y2={ys(t)} stroke="#000" stroke-opacity="0.06" />
  {/each}
  <line x1="0" x2={w} y1={h} y2={h} stroke="#444" stroke-width={k} />
  <line x1="0" x2="0" y1="0" y2={h} stroke="#444" stroke-width={k} />

  {#each xTicks as t (t)}
    <line x1={xs(t)} x2={xs(t)} y1={h} y2={h + 5} stroke="#444" stroke-width={k} />
    {#if String(xFmt(t)) !== ''}
      <text
        x={xs(t)}
        y={h + 20 * kt}
        text-anchor="middle"
        font-size={11.5 * kt}
        fill="#555"
        font-family={FONT_MONO}>{xFmt(t)}</text
      >
    {/if}
  {/each}

  {#each yTicks as t (t)}
    <line x1="-5" x2="0" y1={ys(t)} y2={ys(t)} stroke="#444" stroke-width={k} />
    {#if String(yFmt(t)) !== ''}
      <text
        x="-9"
        y={ys(t) + 4}
        text-anchor="end"
        font-size={11.5 * kt}
        fill="#555"
        font-family={FONT_MONO}>{yFmt(t)}</text
      >
    {/if}
  {/each}

  {#if axisLabel(xAxis)}
    <text
      x={w / 2}
      y={h + 40 * kt}
      text-anchor="middle"
      font-size={13 * kt}
      fill="#333"
      font-family={FONT_UI}>{axisLabel(xAxis)}</text
    >
  {/if}
  {#if axisLabel(yAxis)}
    <text
      transform="rotate(-90)"
      x={-h / 2}
      y={-46}
      text-anchor="middle"
      font-size={13 * kt}
      fill="#333"
      font-family={FONT_UI}>{axisLabel(yAxis)}</text
    >
  {/if}
</g>
