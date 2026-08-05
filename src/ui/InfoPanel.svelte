<script>
  // WHAT THIS EXPERIMENT IS — the panel behind the `i` button, and the one
  // place text about the experiment lives.
  //
  // It replaces the banner that used to sit above the plot. The banner cost
  // three lines of height on every scene of every lecture in order to show
  // notes that are read once, before a gesture — and it could hold nothing
  // longer, so the experiment itself had no description anywhere. A panel is
  // read when it is opened and costs nothing when it is not.
  //
  // FOUR THINGS, and only the first is optional:
  //   · the description, in prose, when the manifest carries one;
  //   · the LECTURE OUTLINE — every scene title, numbered, the current one
  //     marked, each one a button that plays it. The preset picker in the
  //     header shows the scenes one at a time through a slot; this shows the
  //     script whole, which is a different thing to know before a class;
  //   · the current scene's notes, in TEACHER MODE ONLY. That rule is older
  //     than this panel and does not bend for it: notes are gestures written
  //     to oneself, and a room reading "the wrong answer to expect is…" over
  //     the professor's shoulder has been given the answer;
  //   · who wrote it, and under what licence.
  //
  // A dialog and not a drawer, deliberately, and it does not contradict "never
  // a modal for parameters": that rule protects the look→adjust→look loop, and
  // nothing here adjusts anything. This is read, then dismissed.
  import { app, manifest, activeScene, applyPreset } from '../core/store.svelte.js';
  import { STR } from '../core/strings.js';
  import { CATALOGUE } from '../core/catalogue.js';
  import Icon from './Icon.svelte';

  const m = $derived(manifest());
  const scene = $derived(activeScene());
  const sceneIndex = $derived(m?.presets.findIndex((p) => p.id === app.preset) ?? -1);

  const close = () => (app.ui.info = false);

  // Focus moves into the dialog when it opens, or the Tab key stays behind it
  // and a screen reader never learns anything opened at all.
  let panelEl = $state(null);
  $effect(() => {
    panelEl?.focus();
  });

  function onkeydown(e) {
    if (e.key === 'Escape') {
      e.stopPropagation();
      close();
    }
  }

  // PROSE FLOWS, notes do not. A `doc` is written in a template literal and
  // therefore carries the source file's own wrapping at some eighty columns;
  // rendered as-is it breaks mid-sentence at a width that has nothing to do
  // with the panel's. Split on blank lines, and each paragraph wraps to the
  // reader's width. The scene notes keep their line breaks: they are written
  // as short instructions to oneself, one gesture per line, and reflowing them
  // into a block would lose exactly that.
  const paragraphs = $derived(
    (m?.doc ?? '')
      .split(/\n\s*\n/)
      .map((t) => t.replace(/\s*\n\s*/g, ' ').trim())
      .filter(Boolean)
  );

  function play(id) {
    applyPreset(id);
    close();
  }
</script>

<!-- svelte-ignore a11y_click_events_have_key_events, a11y_no_noninteractive_element_interactions -->
<div class="info-backdrop" onclick={close} role="presentation"></div>
<div
  class="info-panel"
  role="dialog"
  aria-modal="true"
  aria-label={m?.title ?? STR.ABOUT}
  tabindex="-1"
  bind:this={panelEl}
  {onkeydown}
>
  <header class="info-head">
    <div>
      <h2>{m?.title ?? ''}</h2>
      {#if m?.subtitle}<p class="sub">{m.subtitle}</p>{/if}
    </div>
    <button class="info-close" onclick={close} title="{STR.CLOSE} (Esc)" aria-label={STR.CLOSE}>
      <Icon name="x" size={16} />
    </button>
  </header>

  <div class="info-body">
    {#if paragraphs.length}
      <div class="doc">
        {#each paragraphs as para, i (i)}
          <p>{para}</p>
        {/each}
      </div>
    {:else}
      <!-- no invented prose: the outline below says more about an experiment
           than a paragraph written to fill a box would -->
      <p class="doc empty">{STR.NO_DESCRIPTION}</p>
    {/if}

    {#if m?.presets?.length}
      <h3>{STR.LECTURE_OUTLINE}</h3>
      <ol class="outline">
        {#each m.presets as p, i (p.id)}
          <li>
            <button class="scene-row" class:current={i === sceneIndex} onclick={() => play(p.id)}>
              <span class="idx">{i + 1}</span>
              <span class="title">{p.title}</span>
            </button>
          </li>
        {/each}
      </ol>
    {/if}

    {#if app.ui.teacher && scene?.notes}
      <h3 class="teacher-head">
        <Icon name="note" size={14} />
        {STR.TEACHER_NOTES} — {scene.title}
      </h3>
      <p class="notes">{scene.notes}</p>
    {:else if scene?.notes}
      <p class="notes-hidden">{STR.NOTES_BEHIND_TEACHER_MODE}</p>
    {/if}

    {#if m?.tags?.length}
      <ul class="tags">
        {#each m.tags as tag (tag)}
          <li>{tag}</li>
        {/each}
      </ul>
    {/if}
  </div>

  <footer class="info-foot">
    <span
      >{m?.author ?? CATALOGUE.author}{CATALOGUE.affiliation
        ? ` · ${CATALOGUE.affiliation}`
        : ''}{m?.date ? ` · ${m.date}` : ''}</span
    >
    <span class="licence">{CATALOGUE.licence}</span>
  </footer>
</div>
