<script>
  // Interprets a declarative plane spec (core/views.js `plane`): resolves the
  // observables, generates the guide circle, builds the legend from the
  // labels, and hands ready-made props to the generic equal-aspect IQPlane.
  // The declarative counterpart of DeclarativePlot for the one shape a
  // cartesian plot cannot express — no scientific computation here either.
  import IQPlane from './IQPlane.svelte';
  import { app } from '../../core/store.svelte.js';

  let { spec, obs, params, pres = false } = $props();

  const val = (name) => obs?.[name]?.value;
  /** minHalf/maxHalf/circle.radius accept a number or p => number. */
  const num = (v) => (typeof v === 'function' ? v(params) : v);
  /** A window bound is evaluated against the CURRENT params, which for one
   *  frame during an experiment or scene swap may still be the previous
   *  ones — `1.5 / p.tau` with no tau gives NaN, and a NaN half-window turns
   *  every axis tick into `x="NaN"`. Fall back to the default rather than
   *  render a broken frame. */
  const bound = (v, fallback) => {
    const n = num(v);
    return Number.isFinite(n) && n > 0 ? n : fallback;
  };

  const circlePoints = (radius, n = 140) => {
    const x = new Float64Array(n);
    const y = new Float64Array(n);
    for (let i = 0; i < n; i++) {
      x[i] = radius * Math.cos((2 * Math.PI * i) / n);
      y[i] = radius * Math.sin((2 * Math.PI * i) / n);
    }
    return { x, y };
  };

  /** A p => number radius may return NaN: the circle then has no meaning for
   *  the current params and is simply not drawn, legend included — the same
   *  rule vline/hline follow in the cartesian plots. */
  // a circle switched off becomes a non-finite radius, which IQPlane already
  // declines to draw — the path was there, it just had to be taken
  const circleR = $derived(
    off(spec.circle?.label) ? NaN : (num(spec.circle?.radius) ?? (spec.circle ? 1 : NaN))
  );

  const clouds = $derived.by(() => {
    const out = [];
    if (Number.isFinite(circleR)) {
      out.push({
        ...circlePoints(circleR),
        color: spec.circle.color ?? 'var(--muted-fg)',
        r: 0.9,
        opacity: 0.45,
      });
    }
    for (const c of spec.clouds ?? []) {
      if (off(c.label)) continue;
      const v = val(c.source);
      if (drawn(v))
        out.push({ x: v.x, y: v.y, color: c.color, r: c.r, opacity: c.opacity, max: c.max });
    }
    return out;
  });

  /** An observable that resolves to no point at all is a layer the current
   *  params do not have (a system with no zeros, an abaque that only means
   *  something for an open loop). It is dropped from the drawing AND from the
   *  legend — an entry pointing at nothing is worse than no entry. */
  const drawn = (v) => v?.x?.length > 0;

  /** Switched off from the legend? The plane must obey the same click as a
   *  cartesian plot: a clickable chip that hides nothing would be a lying
   *  button, and that is worse than no button at all. */
  const off = (label) => !!label && app.hidden.includes(label);

  const curves = $derived.by(() =>
    (spec.curves ?? [])
      .filter((c) => !off(c.label))
      .map((c) => ({ ...c, ...(val(c.source) ?? {}) }))
      .filter(drawn)
  );

  const segments = $derived(
    typeof spec.segments === 'string' ? (val(spec.segments) ?? []) : (spec.segments ?? [])
  );

  const legend = $derived(
    [
      ...(spec.markers?.label ? [{ label: spec.markers.label, color: spec.markers.color }] : []),
      ...(spec.curves ?? [])
        .filter((c) => c.label && drawn(val(c.source)))
        .map((c) => ({ label: c.label, color: c.color })),
      ...(spec.clouds ?? [])
        .filter((c) => c.label && drawn(val(c.source)))
        .map((c) => ({ label: c.label, color: c.color })),
      ...(spec.circle?.label && Number.isFinite(circleR)
        ? [{ label: spec.circle.label, color: spec.circle.color ?? '#a1a1aa' }]
        : []),
    ]
  );
</script>

<IQPlane
  {clouds}
  {curves}
  symmetric={spec.symmetric !== false}
  markers={spec.markers && !off(spec.markers.label) ? val(spec.markers.source) : null}
  markerColor={spec.markers?.color ?? '#EDB120'}
  labels={spec.markers?.labels ? val(spec.markers.labels) : null}
  {segments}
  axisLines={spec.axisLines === true}
  minHalf={bound(spec.minHalf, 1.4)}
  maxHalf={bound(spec.maxHalf, 3)}
  xLabel={spec.axes?.x ?? 'I'}
  yLabel={spec.axes?.y ?? 'Q'}
  {legend}
  {pres}
/>
