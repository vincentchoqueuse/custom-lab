<script>
  // App icon: the lectern — a slanted panel on its foot, carrying the figure.
  // The name made a mark: a pupitre is what you play from, and what it holds
  // up is the plot. Always dark, per the shadcn chrome; the faint outline
  // keeps it visible on the dark sidebar too. Stays legible down to 16 px.
  let { size = 24 } = $props();
</script>

<svg width={size} height={size} viewBox="0 0 32 32" aria-hidden="true" style="flex-shrink: 0">
  <rect x="1" y="1" width="30" height="30" rx="8" fill="#18181b" stroke="#3f3f46" />
  <path
    d="M6.5 20.5 L10 9.5 L26 9.5 L22.5 20.5 Z"
    fill="none"
    stroke="#71717a"
    stroke-width="1.6"
    stroke-linejoin="round"
  />
  <path
    d="M10.5 17.6c2.6 0 2.4-6.2 5-6.2s2.4 6.2 5 6.2"
    fill="none"
    stroke="#fafafa"
    stroke-width="2.1"
    stroke-linecap="round"
  />
  <line
    x1="14.5"
    y1="23.5"
    x2="19"
    y2="23.5"
    stroke="#71717a"
    stroke-width="1.8"
    stroke-linecap="round"
  />
</svg>
