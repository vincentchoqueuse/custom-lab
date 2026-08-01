<script>
  // One control per field-factory type, shared by the Prompt Bar popover and
  // the drawer. Drag semantics: replaceState while dragging, pushState on
  // release (beginDrag/endDrag) — the look→adjust→look loop is never
  // interrupted.
  import { app, setParam, beginDrag, endDrag } from '../core/store.svelte.js';
  import { formatValue } from '../core/scales.js';

  let { key, spec } = $props();

  const value = $derived(app.params[key]);
  const precision = $derived(
    spec.precision ?? (spec.type === 'int' || spec.type === 'seed' ? 0 : undefined)
  );

  const step = $derived(
    spec.step ?? (spec.type === 'int' || spec.type === 'seed' ? 1 : (spec.max - spec.min) / 100)
  );

  // log slider: the range input moves in log10 space
  const logMin = $derived(spec.type === 'log' ? Math.log10(spec.min) : 0);
  const logMax = $derived(spec.type === 'log' ? Math.log10(spec.max) : 1);

  function commit(v) {
    setParam(key, v, true);
  }

  function slide(v) {
    setParam(key, v, false);
  }

  function castNum(raw) {
    const v = spec.type === 'int' || spec.type === 'seed' ? parseInt(raw, 10) : parseFloat(raw);
    if (!Number.isFinite(v)) return null;
    return Math.min(spec.max ?? Infinity, Math.max(spec.min ?? -Infinity, v));
  }

  function onSlider(e, done) {
    const v = castNum(e.target.value);
    if (v === null) return;
    done ? (endDrag(), commit(v)) : slide(v);
  }

  function onLogSlider(e, done) {
    let v = 10 ** parseFloat(e.target.value);
    v = Math.min(spec.max, Math.max(spec.min, v));
    done ? (endDrag(), commit(v)) : slide(v);
  }

  function onNumber(e) {
    const v = castNum(e.target.value);
    if (v !== null) commit(v);
  }
</script>

<div class="param-control" title={spec.description ?? ''}>
  <div class="head">
    <span class="name">{spec.name}</span>
    {#if spec.unit}<span class="dim" style="color: var(--muted)">({spec.unit})</span>{/if}
    {#if spec.type !== 'readonly'}
      <span class="value">
        {formatValue(spec.type === 'readonly' ? undefined : value, precision)}{spec.unit
          ? ` ${spec.unit}`
          : ''}
      </span>
    {/if}
  </div>
  {#if spec.description}
    <div class="desc">{spec.description}</div>
  {/if}

  {#if spec.type === 'float' || spec.type === 'int'}
    <input
      type="range"
      min={spec.min}
      max={spec.max}
      {step}
      value={value}
      onpointerdown={beginDrag}
      oninput={(e) => onSlider(e, false)}
      onchange={(e) => onSlider(e, true)}
      aria-label={spec.name}
    />
  {:else if spec.type === 'log'}
    <input
      type="range"
      min={logMin}
      max={logMax}
      step={(logMax - logMin) / 200}
      value={Math.log10(Math.max(value, spec.min))}
      onpointerdown={beginDrag}
      oninput={(e) => onLogSlider(e, false)}
      onchange={(e) => onLogSlider(e, true)}
      aria-label={spec.name}
    />
  {:else if spec.type === 'seed'}
    <input type="number" min={spec.min} step="1" value={value} onchange={onNumber} />
  {:else if spec.type === 'bool'}
    <div class="choices">
      <button class:active={value === true} onclick={() => commit(true)}>true</button>
      <button class:active={value === false} onclick={() => commit(false)}>false</button>
    </div>
  {:else if spec.type === 'select'}
    <div class="choices">
      {#each spec.options as opt (String(opt.value))}
        <button class:active={value === opt.value} onclick={() => commit(opt.value)}>
          {opt.label}
        </button>
      {/each}
    </div>
  {:else if spec.type === 'readonly'}
    <span class="ro-value">{spec.calc ? formatValue(spec.calc(app.params), precision) : '—'}</span>
  {/if}
</div>
