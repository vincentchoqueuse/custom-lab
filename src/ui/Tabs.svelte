<script>
  // The representations, in two shapes for two screens.
  //
  // On a desktop or a projector: a segmented control, every view visible at
  // once — which is what a lecture wants, since the room sees that there ARE
  // four readings before the professor opens any of them.
  //
  // On a phone: a native <select>. Six tabs the length of "Impulse
  // response" do not fit in 380 px; they overflow the bar or wrap it
  // onto three lines and eat the plot. A native select beats a hand-built
  // dropdown here — it opens the platform's own picker (the iOS wheel, the
  // Android sheet), it is keyboard- and screen-reader-accessible for free, and
  // it cannot be dismissed into a broken state mid-lecture.
  //
  // Both are in the DOM and CSS shows exactly one: no JS media query, so no
  // flash of the wrong control and nothing to keep in sync on resize.
  import { app, manifest, setView } from '../core/store.svelte.js';
  import { STR } from '../core/strings.js';

  const m = $derived(manifest());
  // the title the picker is CURRENTLY showing — see the sizer below
  const current = $derived(m.views.find((v) => v.id === app.view) ?? m.views[0]);
</script>

<div class="tabs" role="tablist">
  {#each m.views as v (v.id)}
    <button
      role="tab"
      aria-selected={app.view === v.id}
      class:active={app.view === v.id}
      onclick={() => setView(v.id)}
    >
      {v.title}
    </button>
  {/each}
</div>

<div class="tabs-select">
  <!-- A <select> is sized by its LONGEST option, never by the one it shows:
       "Signal temporel" was rendered in a box wide enough for "Ce que ça
       coûte à la boucle", so the picker ate the bar and the actions got the
       scraps. This ghost carries the CURRENT title and gives the control its
       width; the select is laid over it. Ellipsis when the room runs out. -->
  <span class="tabs-sizer" aria-hidden="true">{current?.title ?? ''}</span>
  <select
    aria-label={STR.VIEW_PICKER}
    value={app.view}
    onchange={(e) => setView(e.currentTarget.value)}
  >
    {#each m.views as v (v.id)}
      <option value={v.id}>{v.title}</option>
    {/each}
  </select>
  <svg viewBox="0 0 24 24" width="16" height="16" aria-hidden="true">
    <path
      d="M6 9l6 6 6-6"
      fill="none"
      stroke="currentColor"
      stroke-width="2"
      stroke-linecap="round"
      stroke-linejoin="round"
    />
  </svg>
</div>
