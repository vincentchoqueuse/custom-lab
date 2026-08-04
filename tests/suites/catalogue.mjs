// The whole catalogue, in the built bundle: every view of every experiment
// draws, every scene replays, and `?view=` makes the round trip.
//
// This is the suite that catches what no numerical verification can see: a view
// referencing a vanished observable (it renders an empty frame, not an error), a
// scene opening a deleted tab, a `?view=` pointing nowhere any more. All these
// failures look alike on screen — a missing plot — and none of them makes
// `npm run check` fail.
import { run, catalogue } from '../harness.mjs';

export default () =>
  run('catalogue', async (t, page, h) => {
    const keys = catalogue();
    let views = 0;
    let scenes = 0;

    for (const { key } of keys) {
      await h.go('#/' + key);
      const tabs = await h.tabs();
      const n = Math.max(tabs.length, 1);

      for (let i = 0; i < n; i++) {
        if (tabs.length) {
          await page.click(`.tabs button >> nth=${i}`);
          await page.waitForTimeout(600);
        }
        views++;
        const marks = await h.marks();
        const st = await h.statline();
        t(
          `${key} "${tabs[i] ?? '—'}" draws`,
          marks > 2 && !/⚠|abandon/i.test(st),
          `${marks} marks`
        );
        // the open tab must be the one the URL names: that is what makes a
        // lecture link reproducible
        const hash = await page.evaluate(() => location.hash);
        const id = hash.match(/[?&]view=([^&]*)/)?.[1];
        if (id) {
          await h.go(`#/${key}?view=${id}`);
          const active = await page.$$eval('.tabs button.active', (b) =>
            b.map((x) => x.textContent.trim())
          );
          t(`${key} ?view=${id} reopens the same tab`, active[0] === tabs[i], `→ ${active[0]}`);
        }
      }
    }

    for (const { key } of keys) {
      await h.go('#/' + key);
      if (!(await page.$('.preset-picker button'))) continue;
      await page.click('.preset-picker button');
      await page.waitForTimeout(250);
      const count = await page.$$eval('.preset-picker .menu button', (x) => x.length);
      await page.keyboard.press('Escape');
      for (let i = 0; i < count; i++) {
        await page.click('.preset-picker button');
        await page.waitForTimeout(200);
        await page.click(`.preset-picker .menu button >> nth=${i}`);
        await page.waitForTimeout(350);
        scenes++;
        const marks = await h.marks();
        const st = await h.statline();
        t(`${key} scene ${i + 1}/${count}`, marks > 2 && !/⚠|aborted/i.test(st), `${marks} marks`);
      }
    }
    console.log(`  ${keys.length} experiments · ${views} views · ${scenes} scenes`);
  });
