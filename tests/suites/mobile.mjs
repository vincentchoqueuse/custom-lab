// A phone screen, at the widths that actually exist.
//
// The defect this suite exists to catch: at 320 px the box holding the ☰ that
// opens the sidebar measured ZERO pixels wide, because a neighbouring group
// refused to shrink. Nothing in the code announced it, and on a desktop screen
// everything was fine.
//
// Hence the shape of the assertions: not "does this look right" but a
// MEASUREMENT — width of the toggle, horizontal overflow, height of the view
// bar, width of the picker against the width its own label needs.
import { run } from '../harness.mjs';

const DEVICES = [
  { name: 'Galaxy Fold', width: 320 },
  { name: 'iPhone SE', width: 375 },
  { name: 'iPhone 13', width: 390 },
  { name: 'Pixel 5', width: 393 },
];

// an experiment with long tab titles: that is where the room runs out
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
            // what the current label ASKS for, with no width constraint
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

          t('the ☰ is visible', m.togW > 10, `${Math.round(m.togW)} px`);
          t('no horizontal overflow', m.scrollW <= m.innerW, `${m.scrollW}/${m.innerW}`);
          t('no button off screen', m.offscreen === 0, `${m.offscreen}`);
          t('segmented tabs hidden', !m.tabsVisible);
          t('the native picker is there', m.selW > 0, `${Math.round(m.selW)} px`);
          t(
            'the picker is no wider than its label asks for',
            m.selW <= Math.ceil(m.need) + 2,
            `${Math.round(m.selW)} ≤ ${Math.round(m.need)}`
          );
          t('the view bar fits on one line', m.barH > 0 && m.barH < 52, `h=${Math.round(m.barH)}`);
          t('the scene title is truncated, not stacked', m.pickW > 40, `${Math.round(m.pickW)} px`);
          t('the plot keeps its height', (await h.marks()) > 2);

          // the picker really does change view
          await page.selectOption('.tabs-select select', { index: 1 });
          await page.waitForTimeout(650);
          t('selecting changes the view', /view=/.test(await page.evaluate(() => location.hash)));
        },
        { viewport: { width: d.width, height: 720 } }
      )
    )
  );
