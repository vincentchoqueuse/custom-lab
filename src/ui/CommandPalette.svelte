<script>
  // Command Palette (⌘K): experiment search. Phase-1 scope: fuzzy-ish filter
  // over title/subtitle/tags/subject, keyboard navigation, Enter to open.
  import { app, navigate } from '../core/store.svelte.js';
  import { searchExperiments, subjectTitle } from '../core/registry.js';
  import { STR } from '../core/strings.js';

  let query = $state('');
  let selected = $state(0);
  let inputEl = $state(null);

  const results = $derived(searchExperiments(query));

  $effect(() => {
    inputEl?.focus();
  });

  $effect(() => {
    query; // reset selection when the filter changes
    selected = 0;
  });

  function close() {
    app.ui.palette = false;
  }

  function open(exp) {
    close();
    navigate(exp.key);
  }

  function onKeydown(e) {
    if (e.key === 'Escape') {
      e.stopPropagation();
      close();
    } else if (e.key === 'ArrowDown') {
      e.preventDefault();
      selected = Math.min(results.length - 1, selected + 1);
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      selected = Math.max(0, selected - 1);
    } else if (e.key === 'Enter' && results[selected]) {
      open(results[selected]);
    }
  }
</script>

<div
  class="palette-backdrop"
  onpointerdown={(e) => e.target === e.currentTarget && close()}
>
  <div class="palette" role="dialog" aria-label={STR.SEARCH}>
    <input
      bind:this={inputEl}
      bind:value={query}
      placeholder={STR.SEARCH_PLACEHOLDER}
      onkeydown={onKeydown}
    />
    <div class="results">
      {#each results as exp, i (exp.key)}
        <button class:selected={i === selected} onclick={() => open(exp)}>
          <span class="subj">{subjectTitle(exp.subject)}</span>
          <span>{exp.title}</span>
        </button>
      {:else}
        <div class="empty">{STR.NO_RESULTS}</div>
      {/each}
    </div>
  </div>
</div>
