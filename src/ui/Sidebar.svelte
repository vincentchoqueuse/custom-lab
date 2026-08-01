<script>
  import { app } from '../core/store.svelte.js';
  import { subjects } from '../core/registry.js';
  import { STR } from '../core/strings.js';
  import Icon from './Icon.svelte';

  let collapsed = $state({});

  function toggleSubject(id) {
    collapsed[id] = !collapsed[id];
  }

  function toggleTheme() {
    app.ui.theme = app.ui.theme === 'light' ? 'dark' : 'light';
    try {
      localStorage.setItem('enib-lab:theme', app.ui.theme);
    } catch {}
  }

  function toggleTeacher() {
    app.ui.teacher = !app.ui.teacher;
    try {
      localStorage.setItem('enib-lab:teacher', app.ui.teacher ? '1' : '0');
    } catch {}
  }
</script>

<aside class="sidebar" class:collapsed={!app.ui.sidebar}>
  <div class="brand">{STR.APP_NAME}</div>
  <button class="search-btn" onclick={() => (app.ui.palette = true)}>
    <span class="lbl"><Icon name="search" size={15} /> {STR.SEARCH}</span>
    <kbd>⌘K</kbd>
  </button>
  <nav>
    {#each subjects as subject (subject.id)}
      <button class="subject-title" onclick={() => toggleSubject(subject.id)}>
        <span>{subject.title}</span>
        <span>{collapsed[subject.id] ? '▸' : '▾'}</span>
      </button>
      {#if !collapsed[subject.id]}
        {#each subject.experiments as exp (exp.key)}
          <a
            class="exp-link"
            class:active={app.expKey === exp.key}
            href={`#/${exp.key}`}
            title={exp.subtitle}
          >
            {exp.title}
          </a>
        {/each}
      {/if}
    {/each}
  </nav>
  <footer>
    <button onclick={toggleTheme} title={STR.THEME}>
      <Icon name={app.ui.theme === 'light' ? 'moon' : 'sun'} size={15} />
    </button>
    <button class:on={app.ui.teacher} onclick={toggleTeacher} title={STR.TEACHER_MODE}>
      <Icon name="note" size={15} />
    </button>
    <button
      class:on={app.ui.inspector}
      onclick={() => (app.ui.inspector = !app.ui.inspector)}
      title={STR.INSPECTOR}
    >
      <Icon name="braces" size={15} />
    </button>
  </footer>
</aside>
