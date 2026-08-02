<script>
  import { app, toggleSidebar } from '../core/store.svelte.js';
  import { subjects } from '../core/registry.js';
  import { STR } from '../core/strings.js';
  import { writePref } from '../core/prefs.js';
  import Icon from './Icon.svelte';
  import AppIcon from './AppIcon.svelte';

  let collapsed = $state({});

  function toggleSubject(id) {
    collapsed[id] = !collapsed[id];
  }

  function toggleTheme() {
    app.ui.theme = app.ui.theme === 'light' ? 'dark' : 'light';
    writePref('theme', app.ui.theme);
  }

  function toggleTeacher() {
    app.ui.teacher = !app.ui.teacher;
    writePref('teacher', app.ui.teacher ? '1' : '0');
  }
</script>

<aside class="sidebar" class:collapsed={!app.ui.sidebar}>
  {#if app.ui.sidebar}
    <div class="side-top">
      <div class="brand"><AppIcon size={24} /> {STR.APP_NAME}</div>
      <button class="side-toggle" onclick={toggleSidebar} title="{STR.COLLAPSE_SIDEBAR} (⌘B)">
        <Icon name="panel-left" size={16} />
      </button>
    </div>
    <button class="search-btn" onclick={() => (app.ui.palette = true)}>
      <span class="lbl"><Icon name="search" size={15} /> {STR.SEARCH}</span>
      <kbd>⌘K</kbd>
    </button>
    <nav>
      {#each subjects as subject (subject.id)}
        <button class="subject-title" onclick={() => toggleSubject(subject.id)}>
          <span>{subject.title}</span>
          <span class="chev">
            <Icon name={collapsed[subject.id] ? 'plus' : 'minus'} size={13} stroke={2.5} />
          </span>
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
  {:else}
    <!-- collapsed rail, ChatGPT style: logo (→ expand icon on hover) + icon
         shortcuts; the experiment tree only exists expanded -->
    <div class="rail">
      <button class="rail-btn rail-brand" onclick={toggleSidebar} title="{STR.COLLAPSE_SIDEBAR} (⌘B)">
        <span class="logo"><AppIcon size={24} /></span>
        <span class="expand"><Icon name="panel-left" size={16} /></span>
      </button>
      <button class="rail-btn" onclick={() => (app.ui.palette = true)} title="{STR.SEARCH} (⌘K)">
        <Icon name="search" size={15} />
      </button>
      <div class="rail-spacer"></div>
      <button class="rail-btn" onclick={toggleTheme} title={STR.THEME}>
        <Icon name={app.ui.theme === 'light' ? 'moon' : 'sun'} size={15} />
      </button>
      <button class="rail-btn" class:on={app.ui.teacher} onclick={toggleTeacher} title={STR.TEACHER_MODE}>
        <Icon name="note" size={15} />
      </button>
      <button
        class="rail-btn"
        class:on={app.ui.inspector}
        onclick={() => (app.ui.inspector = !app.ui.inspector)}
        title={STR.INSPECTOR}
      >
        <Icon name="braces" size={15} />
      </button>
    </div>
  {/if}
</aside>
