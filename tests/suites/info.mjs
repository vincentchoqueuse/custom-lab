// THE INFO PANEL (I) — what the experiment is, and who wrote it.
//
// The panel carries the description, the lecture outline and the attribution,
// and nothing else. It used to also gate per-scene teacher notes behind a
// Teacher Mode switch; the notes were rewritten into the public docs and the
// mechanism removed, and this suite asserts the removal stuck: no switch, no
// notes block, in any state.
//
// The rest pins the promises a panel makes by existing: it opens and closes,
// the outline is the whole script and playing a line plays that scene.
import { run } from '../harness.mjs';

const DOC = 'estimation/confidence-intervals';
const DOC2 = 'comm/mimo'; // a second data point: the whole catalogue carries docs

const panel = (page) =>
  page.evaluate(() => {
    const p = document.querySelector('.info-panel');
    if (!p) return null;
    return {
      title: p.querySelector('h2')?.textContent.trim(),
      doc: !!p.querySelector('.doc p'),
      scenes: [...p.querySelectorAll('.scene-row .title')].map((e) => e.textContent.trim()),
      current: p.querySelector('.scene-row.current .title')?.textContent.trim(),
      paragraphs: p.querySelectorAll('.doc p').length,
      foot: p.querySelector('.info-foot')?.textContent.replace(/\s+/g, ' ').trim(),
    };
  });

export default () =>
  run('info', async (t, page, h) => {
    await h.go('#/' + DOC);
    t('the banner above the plot is gone', !(await page.$('.teacher-banner')));
    // the source link sits with the application's switches, not with the
    // header's sharing buttons — and exactly once
    t(
      'the GitHub link is in the sidebar',
      (await page.$$eval('a[href*="github.com"]', (a) => a.length)) >= 1 &&
        !(await page.$('.header a[href*="github.com"]')),
      `${await page.$$eval('.sidebar a[href*="github.com"]', (a) => a.length)} in the sidebar`
    );
    t('and no panel until it is asked for', (await panel(page)) === null);

    await page.keyboard.press('i');
    await page.waitForTimeout(300);
    const p = await panel(page);
    t('I opens it', p !== null);
    t('titled with the experiment', p?.title === 'Confidence intervals', p?.title);
    t('carrying its description', p?.doc === true);
    t('and its attribution', /Choqueuse/.test(p?.foot ?? '') && /AGPL/.test(p?.foot ?? ''), p?.foot);

    /* ---------- the outline is the script ------------------------------- */
    t('every scene is listed', p.scenes.length > 0, `${p.scenes.length} scenes`);
    t('and the current one is marked', p.current === p.scenes[0], `${p.current}`);

    // playing a line plays that scene AND gets out of the way
    if (p.scenes.length > 1) {
      await page.click('.scene-row >> nth=1');
      await page.waitForTimeout(500);
      t('clicking a line closes the panel', (await panel(page)) === null);
      const picked = await page.textContent('.preset-picker button');
      t('and plays that scene', picked.includes(p.scenes[1]), picked.trim());
    }

    /* ---------- teacher notes are gone, mechanism and all ---------------- */
    // The notes became the docs; the private channel was retired. Nothing of
    // it may survive in the DOM — no switch, no notes block, no reminder.
    await h.go('#/' + DOC);
    await page.keyboard.press('i');
    await page.waitForTimeout(300);
    t('no Teacher Mode switch anywhere', !(await page.$('.teacher-switch')));
    t('no notes block anywhere', !(await page.$('.info-body .notes, .info-body .notes-hidden')));

    /* ---------- the doc is real prose, not a token --------------------- */
    const rich = await panel(page);
    t('the description flows as paragraphs', (rich?.paragraphs ?? 0) >= 2, `${rich?.paragraphs} paragraphs`);
    await h.go('#/' + DOC2);
    await page.keyboard.press('i');
    await page.waitForTimeout(300);
    const second = await panel(page);
    t('a second experiment carries one too', (second?.paragraphs ?? 0) >= 2, `${second?.paragraphs} paragraphs`);

    /* ---------- it closes ------------------------------------------------ */
    await page.keyboard.press('Escape');
    await page.waitForTimeout(250);
    t('Escape closes it', (await panel(page)) === null);

    await page.keyboard.press('i');
    await page.waitForTimeout(250);
    await h.go('#/' + DOC);
    t('and navigating elsewhere closes it too', (await panel(page)) === null);
  });
