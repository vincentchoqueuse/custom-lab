// THE LANDING SEARCH — the front door's first gesture.
//
// The landing page opens with the caret already in a search bar, so a visitor
// who knows one word is inside an experiment in two keystrokes. This suite
// pins the loop: focus on arrival, typing swaps the module grid for the hits,
// Enter opens the selected hit, a dead query says so, Escape restores the
// grid. The filter itself is shared with the ⌘K palette (core/registry.js),
// so the hits' correctness is one implementation asserted here once.
import { run } from '../harness.mjs';

export default () =>
  run('landing', async (t, page, h) => {
    await h.go('#/');
    t('the search bar is there', !!(await page.$('.landing .search input')));
    t(
      'and the caret starts in it',
      await page.evaluate(() => document.activeElement?.closest('.search') !== null)
    );

    await page.keyboard.type('kalman');
    await page.waitForTimeout(250);
    const hits = await page.$$eval('.landing .hit .hit-title', (n) =>
      n.map((x) => x.textContent.trim())
    );
    t('typing filters the catalogue', hits.length === 1 && hits[0] === 'The Kalman filter', hits.join(', '));
    t('the module grid stepped aside', !(await page.$('.landing .modules')));

    await page.keyboard.press('Enter');
    await page.waitForTimeout(900);
    t(
      'Enter opens the hit',
      (await page.evaluate(() => location.hash)).startsWith('#/regression/kalman-filter'),
      await page.evaluate(() => location.hash)
    );

    await h.go('#/');
    await page.keyboard.type('zzzz');
    await page.waitForTimeout(250);
    t('a dead query says so', !!(await page.$('.search-results .empty')));
    await page.keyboard.press('Escape');
    await page.waitForTimeout(250);
    t('Escape clears it and the grid returns', !!(await page.$('.landing .modules')));
  });
