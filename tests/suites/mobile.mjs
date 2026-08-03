// L'écran d'un téléphone, aux largeurs qui existent vraiment.
//
// Le défaut que cette suite existe pour attraper : à 320 px, la boîte qui
// contient le ☰ ouvrant la barre latérale a été mesurée à ZÉRO pixel de
// large, parce qu'un groupe voisin refusait de rétrécir. Rien dans le code
// ne l'annonçait, et sur un écran de bureau tout allait bien.
//
// D'où la forme des assertions : on ne regarde pas « est-ce que ça a l'air
// correct », on MESURE — largeur du toggle, débordement horizontal, hauteur
// de la barre de vues, largeur du sélecteur contre celle dont son libellé a
// besoin.
import { run } from '../harness.mjs';

const DEVICES = [
  { name: 'Galaxy Fold', width: 320 },
  { name: 'iPhone SE', width: 375 },
  { name: 'iPhone 13', width: 390 },
  { name: 'Pixel 5', width: 393 },
];

// une expérience à onglets longs : c'est là que la place manque
const KEY = 'control/lti-response';

export default () =>
  Promise.all(
    DEVICES.map((d) =>
      run(
        `mobile ${d.name} (${d.width})`,
        async (t, page, h) => {
          await h.go(`#/${KEY}`);
          const m = await page.evaluate(() => {
            const box = (s) => document.querySelector(s)?.getBoundingClientRect();
            const head = box('.header');
            const tog = box('.header .side-open');
            const sel = box('.tabs-select select');
            const bar = box('.viewbar');
            const pick = box('.preset-picker > button');
            const sizer = document.querySelector('.tabs-sizer');
            // ce que le libellé courant DEMANDE, sans contrainte de largeur
            let need = 0;
            if (sizer) {
              const probe = sizer.cloneNode(true);
              probe.style.maxWidth = 'none';
              probe.style.position = 'absolute';
              document.body.appendChild(probe);
              need = probe.getBoundingClientRect().width;
              probe.remove();
            }
            const offscreen = [...document.querySelectorAll('.header button, .header a')].filter(
              (e) => {
                const r = e.getBoundingClientRect();
                return r.width > 0 && (r.left < -1 || r.right > innerWidth + 1);
              }
            ).length;
            return {
              scrollW: document.documentElement.scrollWidth,
              innerW: innerWidth,
              headH: head?.height ?? 0,
              togW: tog?.width ?? 0,
              selW: sel?.width ?? 0,
              need,
              barH: bar?.height ?? 0,
              pickW: pick?.width ?? 0,
              tabsVisible: !!document.querySelector('.tabs')?.getBoundingClientRect().width,
              offscreen,
            };
          });

          t('le ☰ est visible', m.togW > 10, `${Math.round(m.togW)} px`);
          t('aucun débordement horizontal', m.scrollW <= m.innerW, `${m.scrollW}/${m.innerW}`);
          t('aucun bouton hors écran', m.offscreen === 0, `${m.offscreen}`);
          t('onglets segmentés masqués', !m.tabsVisible);
          t('le sélecteur natif est là', m.selW > 0, `${Math.round(m.selW)} px`);
          t(
            'le sélecteur ne dépasse pas ce que son libellé demande',
            m.selW <= Math.ceil(m.need) + 2,
            `${Math.round(m.selW)} ≤ ${Math.round(m.need)}`
          );
          t('la barre de vues tient sur une ligne', m.barH > 0 && m.barH < 52, `h=${Math.round(m.barH)}`);
          t('le titre de scène est tronqué, pas empilé', m.pickW > 40, `${Math.round(m.pickW)} px`);
          t('le graphe garde de la hauteur', (await h.marks()) > 2);

          // le sélecteur change bien de vue
          await page.selectOption('.tabs-select select', { index: 1 });
          await page.waitForTimeout(650);
          t('sélectionner change la vue', /view=/.test(await page.evaluate(() => location.hash)));
        },
        { viewport: { width: d.width, height: 720 } }
      )
    )
  );
