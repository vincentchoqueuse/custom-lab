<script>
  // App icon: THE GR WAYMARK — a white rectangle over a red one, what is
  // painted on the rocks of the coastal path to say "this way". Except that
  // here the white bar is a signal, which is exactly what the name of the
  // application tells: a long route made of short, well-marked stages.
  //
  // The SAME drawing as the favicon in index.html, to the last stroke. They are
  // two separate files, and they diverged once — the favicon changed, this
  // component forgotten, so the logo on screen stayed put while the tab moved.
  // Any retouch happens on BOTH sides.
  //
  // Always dark, as the shadcn chrome requires; the discreet rim keeps it
  // visible on the dark sidebar too. Stays legible down to 16 px.
  let { size = 24 } = $props();
</script>

<svg width={size} height={size} viewBox="0 0 32 32" aria-hidden="true" style="flex-shrink: 0">
  <rect x="1" y="1" width="30" height="30" rx="8" fill="#18181b" stroke="#3f3f46" />
  <path
    d="M6 12.5c2.6 0 2.4-5.4 5-5.4s2.4 5.4 5 5.4 2.4-5.4 5-5.4 2.4 5.4 5 5.4"
    fill="none"
    stroke="#fafafa"
    stroke-width="2.6"
    stroke-linecap="round"
  />
  <rect x="6" y="18.5" width="20" height="6" rx="1.4" fill="#C8102E" />
</svg>
