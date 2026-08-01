<script>
  // The plot card: SVG view + statline (key scalar observables, computation
  // status) + export (SVG source of truth, PNG 2×, PNG to clipboard).
  import { app } from '../core/store.svelte.js';
  import { STR } from '../core/strings.js';
  import { formatValue } from '../core/scales.js';
  import ViewHost from './ViewHost.svelte';

  let frameEl = $state(null);

  const obs = $derived(app.result.observables);
  const status = $derived(app.result.status);
  const scalars = $derived(
    obs
      ? Object.entries(obs).filter(([, o]) => o.type === 'scalar' && o.meta?.label)
      : []
  );

  function statText([, o]) {
    const unit = o.meta.unit ? ` ${o.meta.unit}` : '';
    return `${o.meta.label} = ${formatValue(o.value, o.meta.precision)}${unit}`;
  }

  /* ---------- export ------------------------------------------------------ */

  function svgSource() {
    const svg = frameEl?.querySelector('svg.plot-svg');
    if (!svg) return null;
    const vb = svg.viewBox.baseVal;
    const clone = svg.cloneNode(true);
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
      {scalars.map(statText).join('  ·  ')}
    </span>
    {#if status === 'computing'}
      <span class="status computing">{STR.COMPUTING}</span>
    {:else if status === 'aborted' || app.notice}
      <span class="status">{app.notice || app.result.message}</span>
    {/if}
    <span class="export">
      <button onclick={exportSvg} title="Export SVG">{STR.EXPORT_SVG}</button>
      <button onclick={exportPng} title="Export PNG 2×">{STR.EXPORT_PNG}</button>
      <button onclick={copyPng} title="Copy PNG to clipboard">{STR.COPY_PNG}</button>
    </span>
  </div>
</div>
