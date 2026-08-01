<script>
  // Developer panel: raw observables of the current experiment — name, type,
  // dimensions, value preview, JSON download. A debugging tool for experiment
  // authors, not shown in class.
  import { app } from '../core/store.svelte.js';
  import { STR } from '../core/strings.js';
  import { formatValue } from '../core/scales.js';

  const entries = $derived(Object.entries(app.result.observables ?? {}));

  function dims(o) {
    switch (o.type) {
      case 'vector':
        return `[${o.value.length}]`;
      case 'series':
        return `x[${o.value.x.length}] y[${o.value.y.length}]`;
      case 'records':
        return `[${o.value.length}]`;
      default:
        return '';
    }
  }

  function preview(o) {
    const fmt = (v) => formatValue(v, o.meta.precision ?? 4);
    switch (o.type) {
      case 'scalar':
        return fmt(o.value);
      case 'vector':
        return Array.from(o.value.slice(0, 4), fmt).join(', ') + (o.value.length > 4 ? ', …' : '');
      case 'series':
        return `y: ${Array.from(o.value.y.slice(0, 3), fmt).join(', ')}…`;
      case 'records':
        return JSON.stringify(o.value[0] ?? {}).slice(0, 48);
      default:
        return '?';
    }
  }

  function jsonable(v) {
    if (ArrayBuffer.isView(v)) return Array.from(v);
    if (v !== null && typeof v === 'object' && 'x' in v && 'y' in v)
      return { x: jsonable(v.x), y: jsonable(v.y) };
    return v;
  }

  function downloadObs(name, o) {
    const blob = new Blob(
      [JSON.stringify({ name, type: o.type, meta: o.meta, value: jsonable(o.value) }, null, 2)],
      { type: 'application/json' }
    );
    const a = document.createElement('a');
    a.href = URL.createObjectURL(blob);
    a.download = `${name}.json`;
    a.click();
    URL.revokeObjectURL(a.href);
  }
</script>

<div class="inspector" role="dialog" aria-label={STR.INSPECTOR}>
  <h2>
    <span>{STR.OBSERVABLES}</span>
    <button onclick={() => (app.ui.inspector = false)} title={STR.CLOSE}>✕</button>
  </h2>
  {#each entries as [name, o] (name)}
    <div class="obs-row">
      <span>{name}</span>
      <span class="obs-type">{o.type}{dims(o)}</span>
      <span class="obs-preview">{preview(o)}</span>
      <button onclick={() => downloadObs(name, o)} title={STR.DOWNLOAD}>⬇</button>
    </div>
  {/each}
</div>
