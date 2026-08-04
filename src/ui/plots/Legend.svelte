<script>
  // Legend chips (color swatch + label), top-right of the plot area. Shared
  // by DeclarativePlot (layers carrying a `label`), the plane views and
  // custom views.
  //
  // Cliquables : une pastille éteint ou rallume sa courbe. Sur une vue qui
  // superpose trois estimateurs — la vérité, Hilbert et Teager — « regardez
  // celle-ci toute seule » est le geste qu'on fait avec la main devant
  // l'écran, et qui ne se fait pas autrement. L'état est de l'AFFICHAGE :
  // jamais dans l'URL, remis à zéro quand la vue change (store.svelte.js),
  // comme le fantôme du gel et le verrou d'axes.
  //
  // Un <g role="button"> plutôt qu'un <foreignObject> contenant un vrai
  // bouton : le fantôme du gel et l'export SVG reposent tous deux sur le
  // fait que le graphe est du SVG pur et clonable. Le rôle et le tabindex
  // donnent le clavier et le lecteur d'écran sans casser cela.
  import { FONT_UI } from './frame.js';
  import { dataColor } from '../../core/palette.svelte.js';
  import { app, toggleSeries } from '../../core/store.svelte.js';
  import { STR } from '../../core/strings.js';

  let { entries = [], iw, kt = 1 } = $props();

  const press = (ev, label) => {
    if (ev.key === undefined || ev.key === 'Enter' || ev.key === ' ') {
      ev.preventDefault();
      toggleSeries(label);
    }
  };
</script>

{#if entries.length}
  <!-- Un fond, parce que la légende est POSÉE SUR le tracé : depuis que les
       lignes de repère y portent leur nom, elle en compte plus, et un nom
       qui traverse une courbe de la même couleur ne se lit plus depuis le
       fond de la salle. Le cadre du graphe est clair par contrat
       (lisibilité au vidéoprojecteur), donc un blanc translucide y tient
       dans les deux thèmes. -->
  {@const bw = Math.max(...entries.map((e) => e.label.length * 6.6 * kt)) + 34}
  <rect
    x={iw - 4 - bw}
    y={2 * kt}
    width={bw}
    height={(entries.length - 1) * 18 * kt + 18 * kt}
    rx={4}
    fill="#ffffff"
    opacity="0.72"
  />
{/if}

{#each entries as e, i (e.label)}
  {@const off = app.hidden.includes(e.label)}
  {@const w = Math.max(60, e.label.length * 6.6 * kt)}
  <g
    transform="translate({iw - 8},{12 + i * 18 * kt})"
    role="button"
    tabindex="0"
    aria-pressed={!off}
    aria-label="{e.label} — {STR.LEGEND_TOGGLE}"
    class="legend-chip"
    onclick={(ev) => press(ev, e.label)}
    onkeydown={(ev) => press(ev, e.label)}
  >
    <title>{e.label} — {STR.LEGEND_TOGGLE}</title>
    <!-- cible de clic généreuse : la pastille seule fait 14 px de large et
         serait invisable depuis un pupitre, a fortiori au doigt -->
    <rect x={-w - 8} y={-11 * kt} width={w + 8} height={16 * kt} fill="transparent" />
    {#if e.dashed}
      <!-- une pastille tiretée pour une couche tiretée : c'est ce qui
           distingue la théorie de la mesure quand les deux portent la
           même couleur -->
      <line
        x1="-14"
        x2="0"
        y1="-1.5"
        y2="-1.5"
        stroke={off ? '#a1a1aa' : dataColor(e.color)}
        stroke-width="2.4"
        stroke-dasharray="4 3"
        opacity={off ? 0.85 : 1}
      />
    {:else}
      <!-- Éteinte, la pastille passe au GRIS PLEIN : un carré vidé se lisait
           comme une case à cocher, donc comme « pas encore choisi », quand
           il veut dire « couche masquée ». Une pastille grise dit la même
           chose que le libellé barré, et le dit à la couleur — ce qui se
           voit de loin. -->
      <rect
        x="-14"
        y="-4"
        width="14"
        height="5"
        rx="2"
        fill={off ? '#a1a1aa' : dataColor(e.color)}
        opacity={off ? 0.85 : 1}
      />
    {/if}
    <text
      x="-20"
      y="2"
      text-anchor="end"
      font-size={11.5 * kt}
      fill="#52525b"
      opacity={off ? 0.45 : 1}
      text-decoration={off ? 'line-through' : null}
      font-family={FONT_UI}>{e.label}</text
    >
  </g>
{/each}

<style>
  .legend-chip {
    cursor: pointer;
  }
  .legend-chip:focus-visible {
    outline: 2px solid var(--ring);
    outline-offset: 1px;
  }
</style>
