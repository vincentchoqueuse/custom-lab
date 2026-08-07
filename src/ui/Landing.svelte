<script>
  // THE FRONT DOOR — what an empty hash shows. Until this page existed, `#/`
  // silently redirected to the first experiment, so a visitor arriving cold
  // saw one statistics demo and no reason to believe there were sixty-six
  // more. The catalogue now introduces itself: what the instrument is, the
  // modules in their lecture order, and the promise behind the figures.
  //
  // THE SEARCH BAR IS THE FIRST GESTURE, chatbot-style: the page lands with
  // the caret already in it, so a visitor who knows one word — "Kalman",
  // "OFDM", "noise" — types it, hits Enter, and is inside an experiment
  // before reading anything. It is the same filter as the ⌘K palette
  // (core/registry.js), worn as a hero input instead of an overlay: the
  // palette answers a keystroke mid-lecture, this answers a cold arrival.
  // Typing swaps the module grid for the hits; clearing brings it back.
  //
  // Every number on this page is read from the registry at runtime — the
  // module count, the experiment count, the scene count. Nothing here can go
  // stale, because nothing here is written by hand.
  import { subjects, searchExperiments, subjectTitle } from '../core/registry.js';
  import { app, navigate } from '../core/store.svelte.js';
  import { STR } from '../core/strings.js';
  import AppIcon from './AppIcon.svelte';
  import Icon from './Icon.svelte';

  const nExp = subjects.reduce((s, x) => s + x.experiments.length, 0);
  const nScenes = subjects.reduce(
    (s, x) => s + x.experiments.reduce((t, e) => t + e.presets.length, 0),
    0
  );

  let query = $state('');
  let selected = $state(0);
  let inputEl = $state(null);

  const searching = $derived(query.trim().length > 0);
  const results = $derived(searchExperiments(query));

  // The caret starts in the bar — except on a phone, where autofocus would
  // pop the keyboard over the page before the visitor asked for it.
  $effect(() => {
    if (!app.ui.narrow) inputEl?.focus();
  });

  $effect(() => {
    query; // reset the selection when the filter changes
    selected = 0;
  });

  function onKeydown(e) {
    if (e.key === 'ArrowDown') {
      e.preventDefault();
      selected = Math.min(results.length - 1, selected + 1);
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      selected = Math.max(0, selected - 1);
    } else if (e.key === 'Enter' && searching && results[selected]) {
      navigate(results[selected].key);
    } else if (e.key === 'Escape' && query) {
      // Esc clears the query and keeps the caret; the app-level Esc chain
      // only sees the key once the bar has nothing left to clear.
      e.stopPropagation();
      query = '';
    }
  }
</script>

<div class="landing">
  <div class="landing-inner">
    <header class="hero">
      <div class="brandline"><AppIcon size={34} /><h1>{STR.APP_NAME}</h1></div>
      <p class="lede">
        A live demonstration instrument for lecture halls: {nExp} interactive
        experiments across {subjects.length} modules, in {nScenes} scripted
        lecture scenes — projectable, drivable from the keyboard, and
        reproducible from a URL.
      </p>

      <div class="search" role="search">
        <Icon name="search" size={16} />
        <input
          bind:this={inputEl}
          bind:value={query}
          placeholder={STR.LANDING_SEARCH}
          aria-label={STR.SEARCH}
          onkeydown={onKeydown}
        />
        {#if query}
          <button
            class="clear"
            onclick={() => {
              query = '';
              inputEl?.focus();
            }}
            aria-label={STR.CLEAR_SEARCH}
          >
            <Icon name="x" size={14} />
          </button>
        {/if}
      </div>

      <p class="verified">
        <Icon name="check" size={14} />Behind every figure sits a
        <span class="mono">check.js</span>: the science is verified against
        closed forms and statistical tolerances before anything deploys.
        <a href={STR.REPO_URL} target="_blank" rel="noopener">{STR.LANDING_REPO}</a>
      </p>
    </header>

    {#if searching}
      <div class="search-results">
        {#each results as exp, i (exp.key)}
          <a
            class="hit"
            class:selected={i === selected}
            href={`#/${exp.key}`}
            onmouseenter={() => (selected = i)}
          >
            <span class="hit-line">
              <span class="hit-title">{exp.title}</span>
              <span class="hit-subj">{subjectTitle(exp.subject)}</span>
            </span>
            <span class="hit-sub">{exp.subtitle}</span>
          </a>
        {:else}
          <div class="empty">{STR.NO_RESULTS}</div>
        {/each}
      </div>
    {:else}
      <div class="modules">
        {#each subjects as subject (subject.id)}
          <section class="module">
            <h2>
              <Icon name="folder" size={14} stroke={1.8} />
              {subject.title}
              <span class="count">({subject.experiments.length})</span>
            </h2>
            <ul>
              {#each subject.experiments as exp (exp.key)}
                <li>
                  <a href={`#/${exp.key}`} title={exp.subtitle}>{exp.title}</a>
                </li>
              {/each}
            </ul>
          </section>
        {/each}
      </div>

      <footer class="landing-foot">
        {STR.LANDING_HINT}
      </footer>
    {/if}
  </div>
</div>
