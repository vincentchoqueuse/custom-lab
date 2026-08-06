<script module>
  // One mask id per instance: the icon is rendered twice at once (the brand in
  // the open sidebar, the logo in the collapsed rail), and two <mask> sharing an
  // id is invalid markup that resolves to whichever came first. It works today
  // because both are identical — which is exactly the kind of luck that stops
  // being lucky after an edit.
  let plates = 0;
</script>

<script>
  // App icon: THE FIGURE ON ITS AXIS. A Gaussian bell standing on its axis
  // line — not a decorative wave: the axis is what makes it a FIGURE, and
  // figures are what this instrument produces. The bell is the catalogue's
  // own opening curve (the first experiment draws it).
  //
  // Drawing RESERVED out of a solid plate rather than stroked on it: what
  // carries the shape is an area of colour, not a stroke that thins away —
  // the reason the mark survives 16 px in a browser tab.
  //
  // A MASK, so the curve and the axis are genuinely transparent. They show
  // the sidebar behind them in the app and the tab strip behind them in the
  // browser, which is what lets the favicon carry the SAME drawing (see
  // index.html) instead of a second one — the two diverged once, the favicon
  // changed and this component was forgotten, so the logo on screen stayed
  // put while the tab moved. Any retouch happens on BOTH sides.
  //
  // `currentColor` for the ground, so the plate follows the sidebar text and
  // inverts with the theme on its own.
  let { size = 24 } = $props();
  const uid = `pupitra-mark-${++plates}`;
</script>

<svg width={size} height={size} viewBox="0 0 32 32" aria-hidden="true" style="flex-shrink: 0">
  <defs>
    <mask id={uid}>
      <rect width="32" height="32" fill="#fff" />
      <line
        x1="6.4"
        y1="22.8"
        x2="25.6"
        y2="22.8"
        stroke="#000"
        stroke-width="1.7"
        stroke-linecap="round"
      />
      <path
        d="M 7.6 22.8 C 12.4 22.8 12.9 8.9 16 8.9 C 19.1 8.9 19.6 22.8 24.4 22.8"
        fill="none"
        stroke="#000"
        stroke-width="2.5"
        stroke-linecap="round"
      />
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
