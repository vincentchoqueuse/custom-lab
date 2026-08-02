<script>
  // QR of the current scene URL, rendered as our own SVG (Svelte owns the
  // DOM; theme-independent white card — a QR needs its contrast). Encoding
  // by qrcode-generator (MIT, zero-dependency reference implementation);
  // error-correction level M, version auto-sized to the URL length.
  import qrcode from 'qrcode-generator';

  let { text, size = 232 } = $props();

  const qr = $derived.by(() => {
    const q = qrcode(0, 'M');
    q.addData(text);
    q.make();
    const n = q.getModuleCount();
    let d = '';
    for (let r = 0; r < n; r++) {
      for (let c = 0; c < n; c++) {
        if (q.isDark(r, c)) d += `M${c} ${r}h1v1h-1z`;
      }
    }
    return { n, d };
  });
</script>

<svg
  width={size}
  height={size}
  viewBox="-2 -2 {qr.n + 4} {qr.n + 4}"
  shape-rendering="crispEdges"
  role="img"
  aria-label="QR code"
>
  <rect x="-2" y="-2" width={qr.n + 4} height={qr.n + 4} fill="#ffffff" />
  <path d={qr.d} fill="#000000" />
</svg>
