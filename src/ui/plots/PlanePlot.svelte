<script>
  // Interprets a declarative plane spec (core/views.js `plane`): resolves the
  // observables, generates the guide circle, builds the legend from the
  // labels, and hands ready-made props to the generic equal-aspect IQPlane.
  // The declarative counterpart of DeclarativePlot for the one shape a
  // cartesian plot cannot express — no scientific computation here either.
  import IQPlane from './IQPlane.svelte';

  let { spec, obs, params, pres = false } = $props();

  const val = (name) => obs?.[name]?.value;
  /** minHalf/maxHalf/circle.radius accept a number or p => number. */
  const num = (v) => (typeof v === 'function' ? v(params) : v);

  const circlePoints = (radius, n = 140) => {
    const x = new Float64Array(n);
    const y = new Float64Array(n);
    for (let i = 0; i < n; i++) {
      x[i] = radius * Math.cos((2 * Math.PI * i) / n);
      y[i] = radius * Math.sin((2 * Math.PI * i) / n);
    }
    return { x, y };
  };

  const clouds = $derived.by(() => {
    const out = [];
    if (spec.circle) {
      out.push({
        ...circlePoints(num(spec.circle.radius) ?? 1),
        color: spec.circle.color ?? 'var(--muted-fg)',
        r: 0.9,
        opacity: 0.45,
      });
    }
    for (const c of spec.clouds ?? []) {
      const v = val(c.source);
      if (v) out.push({ x: v.x, y: v.y, color: c.color, r: c.r, opacity: c.opacity, max: c.max });
    }
    return out;
  });

  const curves = $derived.by(() =>
    (spec.curves ?? [])
      .map((c) => ({ ...c, ...(val(c.source) ?? {}) }))
      .filter((c) => c.x)
  );

  const segments = $derived(
    typeof spec.segments === 'string' ? (val(spec.segments) ?? []) : (spec.segments ?? [])
  );

  const legend = $derived(
    [
      ...(spec.markers?.label ? [{ label: spec.markers.label, color: spec.markers.color }] : []),
      ...(spec.curves ?? [])
        .filter((c) => c.label)
        .map((c) => ({ label: c.label, color: c.color })),
      ...(spec.clouds ?? [])
        .filter((c) => c.label)
        .map((c) => ({ label: c.label, color: c.color })),
      ...(spec.circle?.label
        ? [{ label: spec.circle.label, color: spec.circle.color ?? '#a1a1aa' }]
        : []),
    ]
  );
</script>

<IQPlane
  {clouds}
  {curves}
  symmetric={spec.symmetric !== false}
  markers={spec.markers ? val(spec.markers.source) : null}
  markerColor={spec.markers?.color ?? '#EDB120'}
  labels={spec.markers?.labels ? val(spec.markers.labels) : null}
  {segments}
  minHalf={num(spec.minHalf) ?? 1.4}
  maxHalf={num(spec.maxHalf) ?? 3}
  xLabel={spec.axes?.x ?? 'I'}
  yLabel={spec.axes?.y ?? 'Q'}
  {legend}
  {pres}
/>
