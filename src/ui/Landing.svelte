<script>
  // THE FRONT DOOR — what an empty hash shows. Until this page existed, `#/`
  // silently redirected to the first experiment, so a visitor arriving cold
  // saw one statistics demo and no reason to believe there were sixty-six
  // more. The catalogue now introduces itself: what the instrument is, the
  // modules in their lecture order, and the promise behind the figures.
  //
  // Every number on this page is read from the registry at runtime — the
  // module count, the experiment count, the scene count. Nothing here can go
  // stale, because nothing here is written by hand.
  import { subjects } from '../core/registry.js';
  import { STR } from '../core/strings.js';
  import AppIcon from './AppIcon.svelte';
  import Icon from './Icon.svelte';

  const nExp = subjects.reduce((s, x) => s + x.experiments.length, 0);
  const nScenes = subjects.reduce(
    (s, x) => s + x.experiments.reduce((t, e) => t + e.presets.length, 0),
    0
  );
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
      <p class="verified">
        <Icon name="check" size={14} />Behind every figure sits a
        <span class="mono">check.js</span>: the science is verified against
        closed forms and statistical tolerances before anything deploys.
        <a href={STR.REPO_URL} target="_blank" rel="noopener">{STR.LANDING_REPO}</a>
      </p>
    </header>

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
  </div>
</div>
