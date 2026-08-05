// THE INFO PANEL (I) — what the experiment is, and who wrote it.
//
// One assertion here matters more than the rest and is the reason the suite
// exists at all: TEACHER NOTES ARE PRIVATE. They are gestures written to
// oneself — "the wrong answer to expect is…", "have the room count the red
// intervals" — and a room reading them over the professor's shoulder has been
// handed the answer before the question. The rule predates this panel; the
// panel is simply where it could most easily have been lost, since a dialog
// opened in class is projected like everything else.
//
// The rest pins the promises a panel makes by existing: it opens and closes,
// the outline is the whole script and playing a line plays that scene.
import { run } from '../harness.mjs';

const DOC = 'estimation/confidence-intervals'; // carries a `doc`
const PLAIN = 'comm/mimo'; // carries none: the outline must stand alone

const panel = (page) =>
  page.evaluate(() => {
    const p = document.querySelector('.info-panel');
    if (!p) return null;
    return {
      title: p.querySelector('h2')?.textContent.trim(),
      doc: !!p.querySelector('.doc p'),
      scenes: [...p.querySelectorAll('.scene-row .title')].map((e) => e.textContent.trim()),
      current: p.querySelector('.scene-row.current .title')?.textContent.trim(),
      notes: p.querySelector('.notes')?.textContent.trim() ?? null,
      hint: !!p.querySelector('.notes-hidden'),
      foot: p.querySelector('.info-foot')?.textContent.replace(/\s+/g, ' ').trim(),
    };
  });

export default () =>
  run('info', async (t, page, h) => {
    await h.go('#/' + DOC);
    t('the banner above the plot is gone', !(await page.$('.teacher-banner')));
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

    /* ---------- teacher notes are private ------------------------------- */
    // THE assertion. Teacher Mode off: the notes must not be in the DOM at
    // all — not hidden by CSS, absent — because a projector shows the DOM.
    await h.go('#/' + DOC);
    await page.keyboard.press('i');
    await page.waitForTimeout(300);
    const off = await panel(page);
    t('with Teacher Mode off there are no notes', off?.notes === null);
    t('only a note that there are some', off?.hint === true);

    await page.keyboard.press('Escape');
    await page.waitForTimeout(200);
    await page.click('.sidebar button[title*="Teacher" i]');
    await page.waitForTimeout(250);
    await page.keyboard.press('i');
    await page.waitForTimeout(300);
    const on = await panel(page);
    t('with it on the notes are there', (on?.notes?.length ?? 0) > 20, `${on?.notes?.length} chars`);
    t('and the reminder is gone', on?.hint === false);
    await page.click('.sidebar button[title*="Teacher" i]').catch(() => {});

    /* ---------- an experiment with no description still says something --- */
    await h.go('#/' + PLAIN);
    await page.keyboard.press('i');
    await page.waitForTimeout(300);
    const plain = await panel(page);
    t('no description is not an empty panel', plain?.scenes.length > 1, `${plain?.scenes.length} scenes`);

    /* ---------- it closes ------------------------------------------------ */
    await page.keyboard.press('Escape');
    await page.waitForTimeout(250);
    t('Escape closes it', (await panel(page)) === null);

    await page.keyboard.press('i');
    await page.waitForTimeout(250);
    await h.go('#/' + DOC);
    t('and navigating elsewhere closes it too', (await panel(page)) === null);
  });
