<script module>
  // One mask id per instance: the icon is rendered twice at once (the brand in
  // the open sidebar, the logo in the collapsed rail), and two <mask> sharing an
  // id is invalid markup that resolves to whichever came first. It works today
  // because both are identical — which is exactly the kind of luck that stops
  // being lucky after an edit.
  let plates = 0;
</script>

<script>
  // App icon: THE ENAMELLED ROUTE PLATE. A trail is numbered, and this one is
  // numbered 34 — the GR that runs the Breton coast. Whoever knows it reads the
  // nod; everyone else reads a sober plate. The reference is carried by the
  // numeral and by nothing else: no illustration on top of it.
  //
  // Digits RESERVED out of a solid ground rather than drawn on it — the French
  // road plate, and the reason this survives 16 px: what carries the shape is an
  // area of colour, not a stroke that thins away.
  //
  // A MASK, so the digits and the inner keyline are genuinely transparent. They
  // therefore show the sidebar behind them in the app and the tab strip behind
  // them in the browser, which is what lets the favicon carry the SAME drawing
  // (see index.html) instead of a second one — they diverged once, the favicon
  // changed and this component forgotten, so the logo on screen stayed put while
  // the tab moved. Any retouch happens on BOTH sides.
  //
  // `currentColor` for the ground, so the plate follows the sidebar text and
  // inverts with the theme on its own.
  let { size = 24 } = $props();
  const uid = `expe34-plate-${++plates}`;
</script>

<svg width={size} height={size} viewBox="0 0 32 32" aria-hidden="true" style="flex-shrink: 0">
  <defs>
    <mask id={uid}>
      <rect width="32" height="32" fill="#fff" />
      <rect
        x="3.3"
        y="3.3"
        width="25.4"
        height="25.4"
        rx="4.4"
        fill="none"
        stroke="#000"
        stroke-width="1.1"
      />
      <text
        x="16"
        y="21.3"
        text-anchor="middle"
        fill="#000"
        font-size="13.6"
        font-weight="600"
        letter-spacing="0.1"
        font-family="'IBM Plex Sans', system-ui, sans-serif">34</text
      >
    </mask>
  </defs>
  <rect
    x="0.6"
    y="0.6"
    width="30.8"
    height="30.8"
    rx="6.6"
    fill="currentColor"
    mask="url(#{uid})"
  />
</svg>
