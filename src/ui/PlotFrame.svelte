<script>
  // The plot card: SVG view + statline (key scalar observables, computation
  // status) + export (SVG source of truth, PNG 2×, PNG to clipboard).
  import { onMount } from 'svelte';
  import { app, registerGhostCapturer, toggleAxisLock } from '../core/store.svelte.js';
  import { STR } from '../core/strings.js';
  import { formatValue } from '../core/scales.js';
  import ViewHost from './ViewHost.svelte';
  import Icon from './Icon.svelte';

  let frameEl = $state(null);

  // the LIVE svg is a direct child of .plot-area (the ghost's clone is not)
  const liveSvg = () => frameEl?.querySelector('.plot-area > svg.plot-svg');

  /**
   * The crosshair and its capture surface are marked `data-transient` and are
   * removed from every CLONE — the SVG export, the PNG, the freeze ghost.
   *
   * They read the plot; they are not part of it. And `F` is a keyboard
   * shortcut, so it fires perfectly happily while the pointer is sitting on
   * the curve: without this, the ghost would carry a rule and a readout from
   * the moment it was taken, and every later comparison would be made against
   * a picture with a stray line in it.
   */
  function stripTransient(node) {
    for (const el of node.querySelectorAll('[data-transient]')) el.remove();
    return node;
  }

  onMount(() => {
    // freeze-frame: hand the store a way to snapshot the rendered SVG —
    // works for any view, declarative or custom, without touching them
    registerGhostCapturer(() => {
      const svg = liveSvg();
      return svg ? stripTransient(svg.cloneNode(true)).outerHTML : null;
    });
  });

  const obs = $derived(app.result.observables);
  const status = $derived(app.result.status);
  // scalars AND text: a regime name is a reading like any other
  const scalars = $derived(
    obs
      ? Object.entries(obs).filter(
          ([, o]) => (o.type === 'scalar' || o.type === 'text') && o.meta?.label
        )
      : []
  );

  /** The value as the room reads it — no label, no unit. */
  function shown(o, v) {
    return o.type === 'text' ? String(v) : formatValue(v, o.meta.precision);
  }

  // FROZEN, the statline reads `coverage = 0.948 → 0.812`.
  //
  // Freezing pins the picture and asks "has the shape changed"; the next
  // question a room asks is always "by how much", and the old number had gone
  // the instant the slider moved. The before-value is shown only when it
  // DIFFERS as displayed — comparing the formatted strings, not the floats, so
  // a change below the reading's own precision does not produce an arrow
  // between two identical numbers.
  const readings = $derived(
    scalars.map(([key, o]) => {
      const now = shown(o, o.value);
      const raw = app.ghostStats?.[key];
      const before = raw === undefined ? null : shown(o, raw);
      return {
        key,
        label: o.meta.label,
        sep: o.type === 'text' ? ' : ' : ' = ',
        unit: o.type === 'text' || !o.meta.unit ? '' : ` ${o.meta.unit}`,
        now,
        before: before !== null && before !== now ? before : null,
      };
    })
  );

  /* ---------- export ------------------------------------------------------ */

  function svgSource() {
    const svg = liveSvg();
    if (!svg) return null;
    const vb = svg.viewBox.baseVal;
    const clone = svg.cloneNode(true);
    stripTransient(clone);
    clone.setAttribute('xmlns', 'http://www.w3.org/2000/svg');
    clone.setAttribute('width', vb.width);
    clone.setAttribute('height', vb.height);
    const bg = document.createElementNS('http://www.w3.org/2000/svg', 'rect');
    bg.setAttribute('width', vb.width);
    bg.setAttribute('height', vb.height);
    bg.setAttribute('fill', '#ffffff');
    clone.insertBefore(bg, clone.firstChild);
    return { text: new XMLSerializer().serializeToString(clone), w: vb.width, h: vb.height };
  }

  function baseName() {
    return `${(app.expKey ?? 'plot').replace('/', '-')}-${app.view ?? 'view'}`;
  }

  function download(name, blob) {
    const a = document.createElement('a');
    a.href = URL.createObjectURL(blob);
    a.download = name;
    a.click();
    URL.revokeObjectURL(a.href);
  }

  function exportSvg() {
    const src = svgSource();
    if (!src) return;
    download(`${baseName()}.svg`, new Blob([src.text], { type: 'image/svg+xml' }));
  }

  async function toPngBlob(scale = 2) {
    const src = svgSource();
    if (!src) return null;
    const url = URL.createObjectURL(new Blob([src.text], { type: 'image/svg+xml' }));
    try {
      const img = new Image();
      await new Promise((res, rej) => {
        img.onload = res;
        img.onerror = rej;
        img.src = url;
      });
      const canvas = document.createElement('canvas');
      canvas.width = src.w * scale;
      canvas.height = src.h * scale;
      canvas.getContext('2d').drawImage(img, 0, 0, canvas.width, canvas.height);
      return await new Promise((res) => canvas.toBlob(res, 'image/png'));
    } finally {
      URL.revokeObjectURL(url);
    }
  }

  async function exportPng() {
    const blob = await toPngBlob(2);
    if (blob) download(`${baseName()}.png`, blob);
  }

  async function copyPng() {
    try {
      const blob = await toPngBlob(2);
      if (blob) await navigator.clipboard.write([new ClipboardItem({ 'image/png': blob })]);
    } catch {
      /* clipboard image support varies; export buttons remain */
    }
  }
</script>

<div class="plot-card" bind:this={frameEl}>
  <div class="plot-area">
    {#if app.ghost}
      <!-- freeze-frame ghost: grayed dashed snapshot UNDER the live plot -->
      <div class="plot-ghost" aria-hidden="true">{@html app.ghost}</div>
    {/if}
    {#if obs}
      <ViewHost />
    {:else if status === 'error' || status === 'invalid'}
      <div class="plot-placeholder">{app.result.message}</div>
    {:else}
      <div class="plot-placeholder">{STR.COMPUTING}</div>
    {/if}
    {#if obs && (status === 'error' || status === 'invalid')}
      <div class="plot-veil">{app.result.message}</div>
    {/if}
  </div>
  <div class="statline">
    <span class="stats mono">
      {#each readings as r, i (r.key)}
        {#if i > 0}<span class="dot">·</span>{/if}<span class="reading"
          >{r.label}{r.sep}{#if r.before}<span class="was">{r.before}</span><span class="arrow"
              >→</span
            >{/if}{r.now}{r.unit}</span
        >
      {/each}
    </span>
    {#if app.ghost}
      <span class="frozen-chip"><Icon name="snowflake" size={12} /> {STR.FROZEN}</span>
    {/if}
    {#if status === 'computing'}
      <span class="status computing">{STR.COMPUTING}</span>
    {:else if status === 'aborted' || app.notice}
      <span class="status">{app.notice || app.result.message}</span>
    {/if}
    <span class="export">
      <button class:on={app.axisLock} onclick={toggleAxisLock} title={STR.LOCK_AXES}>
        <Icon name="lock" size={11} /> {STR.AXES}
      </button>
      <button onclick={exportSvg} title="Export SVG">{STR.EXPORT_SVG}</button>
      <button onclick={exportPng} title="Export PNG 2×">{STR.EXPORT_PNG}</button>
      <button onclick={copyPng} title="Copy PNG to clipboard">{STR.COPY_PNG}</button>
    </span>
  </div>
</div>
