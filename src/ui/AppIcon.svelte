<script>
  // App icon: a white Gaussian bell on a dark rounded square — the project's
  // identity mark (sidebar brand, favicon). Always dark, per the shadcn
  // chrome; the faint outline keeps it visible on the dark sidebar too.
  let { size = 24 } = $props();
</script>

<svg width={size} height={size} viewBox="0 0 32 32" aria-hidden="true" style="flex-shrink: 0">
  <rect x="1" y="1" width="30" height="30" rx="8" fill="#18181b" stroke="#3f3f46" />
  <line x1="6" y1="23" x2="26" y2="23" stroke="#71717a" stroke-width="1.4" stroke-linecap="round" />
  <path
    d="M6 23c4 0 5.5-13 10-13s6 13 10 13"
    fill="none"
    stroke="#fafafa"
    stroke-width="2.2"
    stroke-linecap="round"
  />
</svg>
