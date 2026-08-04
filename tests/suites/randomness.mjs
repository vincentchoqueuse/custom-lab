// `random: true` governs the interface, in both directions.
//
// `npm run check` proves the declaration matches the generator; it cannot see
// whether the INTERFACE obeys it. An experiment that draws nothing must have no
// dice, no seed field and no `?seed=`, and the R key must be inert there — or
// the dice promises something it cannot keep, twenty-three times over in the
// catalogue.
import { run, catalogue } from '../harness.mjs';

export default () =>
  run('randomness', async (t, page, h) => {
    for (const { key, random } of catalogue()) {
      await h.go(`#/${key}?drawer=1`, 450);
      const seen = await page.evaluate(() => ({
        dice: !!document.querySelector(
          '.actionbar [aria-label*="Draw" i], .actionbar [title*="Draw" i]'
        ),
        field: /seed/i.test(document.querySelector('.drawer')?.textContent ?? ''),
      }));
      t(`${key} · dice ${random ? 'present' : 'absent'}`, seen.dice === random);
      t(`${key} · seed field ${random ? 'present' : 'absent'}`, seen.field === random);

      // R must move the URL if and only if the experiment draws
      await h.go('#/' + key, 400);
      const before = await page.evaluate(() => location.hash);
      await page.click('.plot-card');
      await page.keyboard.press('r');
      await page.waitForTimeout(450);
      const after = await page.evaluate(() => location.hash);
      t(`${key} · R ${random ? 'draws' : 'inert'}`, (before !== after) === random, `${before} → ${after}`);
    }
  });
