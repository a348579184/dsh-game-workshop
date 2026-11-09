import assert from 'node:assert/strict';
import { mkdir, mkdtemp, writeFile } from 'node:fs/promises';
import { resolve, join } from 'node:path';
import { pathToFileURL } from 'node:url';
import { chromium } from 'playwright';

if (!process.env.DSH_TEST_URL) throw new Error('Set DSH_TEST_URL to the authenticated URL printed by an isolated DSH web profile with the packed plugin installed.');
const target = new URL(process.env.DSH_TEST_URL);
if (!['127.0.0.1', 'localhost', '[::1]'].includes(target.hostname)) throw new Error('This test only runs against a local DSH test profile.');
const root = resolve('.test-artifacts');
await mkdir(root, { recursive: true });
const artifacts = await mkdtemp(join(root, 'ui-'));
const report = { startedAt: new Date().toISOString(), origin: target.origin, results: [], errors: [] };
const browser = await chromium.launch({ headless: true, ...(process.env.PLAYWRIGHT_CHROMIUM_EXECUTABLE ? { executablePath: process.env.PLAYWRIGHT_CHROMIUM_EXECUTABLE } : {}) });
report.browserVersion = browser.version();
const contexts = [];
const passed = name => { report.results.push({ name, passed: true }); console.log(`PASS ${name}`); };
async function newContext(options = {}) {
  const ctx = await browser.newContext({ viewport: { width: 1440, height: 1100 }, locale: 'zh-CN', acceptDownloads: true, ...options });
  contexts.push(ctx);
  ctx.on('page', page => page.on('pageerror', error => report.errors.push(error.message)));
  return ctx;
}
async function dismissOnboarding(page, english = false) {
  const preview = page.getByRole('button', { name: english ? 'Continue' : '继续', exact: true });
  if (await preview.isVisible()) await preview.click();
  const welcome = page.getByText(english ? 'Get started' : '开始使用', { exact: true });
  try { await welcome.waitFor({ state: 'visible', timeout: 2000 }); await page.keyboard.press('Escape'); await welcome.waitFor({ state: 'hidden' }); }
  catch (error) { if (await welcome.isVisible()) throw error; }
}
async function openWorkshop(page, english = false) {
  await page.goto(target.href, { waitUntil: 'networkidle', timeout: 45000 });
  await dismissOnboarding(page, english);
  await page.getByRole('button', { name: english ? 'Game workshop' : '游戏工坊', exact: true }).click();
  await page.getByTestId('start-game').waitFor();
}
async function start(page) {
  await page.getByTestId('start-game').click();
  const locator = page.frameLocator('[data-testid="game-frame"]');
  await locator.getByTestId('draw-button').waitFor();
  const frame = page.frames().find(frame => frame.url() === 'about:srcdoc');
  assert.ok(frame, 'A real game frame must exist');
  return { locator, frame };
}
async function state(frame) {
  return frame.evaluate(() => {
    const keys = Object.keys(localStorage).filter(key => key.startsWith('mistbound-v1-'));
    if (keys.length !== 1) throw new Error(`Expected one game save, got ${keys.length}`);
    return JSON.parse(localStorage.getItem(keys[0]));
  });
}
async function prepareParty(game) {
  let merges = game.locator.getByTestId('merge-button');
  while (await merges.count()) await merges.first().click();
  const current = await state(game.frame);
  for (const [item, beast] of [['fang', 'fox'], ['veil', 'turtle'], ['bell', 'deer'], ['crown', 'crane']]) {
    if (!current.ownedItems.includes(item)) continue;
    const id = current.cards.find(card => card.beast === beast).id;
    if (current.equipment[item] === id) continue;
    await game.locator.locator(`#select-${id}`).click();
    const equip = game.locator.getByTestId(`equip-${item}`);
    if (await equip.isVisible() && await equip.isEnabled()) await equip.click();
  }
  await game.locator.getByTestId('auto-party').click();
}
try {
  const context = await newContext({ permissions: ['clipboard-read', 'clipboard-write'] });
  const page = await context.newPage();
  await openWorkshop(page);
  assert.equal(await page.getByTestId('game-workshop-page').count(), 1);
  await page.getByRole('button', { name: '插件', exact: true }).click();
  await page.getByText('试玩原创卡牌《雾岭灵契》', { exact: false }).first().waitFor();
  await page.getByText('游戏工坊', { exact: true }).last().click();
  await page.getByText('共 4 个 · 1 运行中 · 3 已停用', { exact: true }).waitFor();
  assert.equal(await page.getByText('已关闭', { exact: true }).count(), 3);
  assert.ok(await page.locator('img').last().evaluate(image => image.complete && image.naturalWidth > 0));
  for (const id of ['game-workshop-unity', 'game-workshop-unreal', 'game-workshop-blender']) assert.equal(await page.getByText(id, { exact: true }).count(), 1);
  passed('Installed title/icon and three editor components actually disabled');
  await page.getByRole('button', { name: '游戏工坊', exact: true }).click();
  await page.getByTestId('start-game').waitFor();
  await page.screenshot({ path: join(artifacts, 'dsh-workshop-home.png'), fullPage: true });
  passed('Real DSH sidebar and workshop page');

  const prompt = page.getByTestId('creation-prompt');
  const original = await prompt.inputValue();
  const edited = original.replace('星海灵契', '林间灵契');
  await prompt.fill(edited);
  await page.getByTestId('copy-prompt').click();
  assert.equal(await page.evaluate(() => navigator.clipboard.readText()), edited);
  await prompt.fill(original);
  passed('Editable Chinese prompt copies exact text');

  const freshDownloadEvent = page.waitForEvent('download');
  await page.getByTestId('download-game').click();
  const freshDownload = await freshDownloadEvent;
  assert.ok(freshDownload.suggestedFilename().endsWith('.html'));
  const freshFile = join(artifacts, 'fresh-game.html');
  await freshDownload.saveAs(freshFile);
  passed('Parent HTML download');

  let game = await start(page);
  let current = await state(game.frame);
  assert.equal(current.gold, 90); assert.equal(current.cleared, 0); assert.equal(current.cards.length, 6);
  assert.equal(await game.locator.getByTestId('battle-2').isDisabled(), true);
  assert.equal(await game.locator.getByTestId('battle-3').isDisabled(), true);
  await game.locator.getByTestId('draw-button').click();
  current = await state(game.frame);
  assert.equal(current.cards.length, 7); assert.equal(current.gold, 78); assert.equal(current.draws, 1);
  passed('Seeded card draw charges twelve dew');

  await game.locator.getByTestId('merge-button').first().click();
  current = await state(game.frame);
  assert.equal(current.cards.length, 5); assert.equal(current.cards.find(card => card.id === 'c1').star, 2);
  passed('Starter three-identical-card merge');

  await game.locator.locator('#select-c4').click();
  await game.locator.getByTestId('equip-fang').click();
  current = await state(game.frame);
  assert.equal(current.equipment.fang, 'c4');
  assert.equal(await game.locator.getByTestId('card-c4').getByLabel('攻击 42', { exact: true }).count(), 1);
  passed('Equipment visibly increases attack');

  for (let chapter = 1; chapter <= 3; chapter++) {
    await prepareParty(game);
    if (chapter < 3) assert.equal(await game.locator.getByTestId(`battle-${chapter + 1}`).isDisabled(), true);
    await game.locator.getByTestId(`battle-${chapter}`).click();
    if (chapter === 1) {
      await game.frame.waitForFunction(() => document.querySelectorAll('.battle-log .log-ally').length > 0);
      assert.ok((await game.locator.getByTestId('battle-log').innerText()).includes('−'));
      passed('Automatic timed battle advances and records damage');
    }
    await game.locator.getByTestId('skip-battle').click();
    await game.locator.getByTestId('close-battle').click();
    current = await state(game.frame);
    assert.equal(current.lastBattle.won, true, `Chapter ${chapter} must be won`);
    assert.equal(current.cleared, chapter);
    passed(`Chapter ${chapter} wins and unlocks progression`);
  }
  const completed = await state(game.frame);
  await page.locator('.gw-page').evaluate(el => el.scrollTo(0, 0));
  await game.frame.waitForFunction(() => !document.getElementById('toast').classList.contains('visible'));
  await game.frame.evaluate(() => window.scrollTo({ top: 430, behavior: 'instant' }));
  await page.screenshot({ path: join(artifacts, 'dsh-workshop-playing.png'), fullPage: true, animations: 'disabled' });

  const savedDownloadEvent = page.waitForEvent('download');
  await game.locator.getByTestId('download-button').click();
  const savedFile = join(artifacts, 'completed-game.html');
  await (await savedDownloadEvent).saveAs(savedFile);
  passed('In-game HTML download embeds completed progress');

  await page.reload({ waitUntil: 'networkidle' });
  await dismissOnboarding(page);
  await page.getByRole('button', { name: '游戏工坊', exact: true }).click();
  game = await start(page);
  assert.deepEqual(await state(game.frame), completed);
  passed('DSH refresh restores exact save');

  await page.setViewportSize({ width: 390, height: 844 });
  await page.keyboard.press('Escape'); // close the host's responsive navigation drawer
  await page.waitForFunction(() => {
    const button = document.querySelector('button[aria-label="游戏工坊"]');
    return !button || button.getBoundingClientRect().right <= 0 || button.getBoundingClientRect().height === 0 || getComputedStyle(button).visibility === 'hidden';
  });
  await page.waitForFunction(() => document.querySelector('[data-testid="game-frame"]').getBoundingClientRect().width > 300);
  assert.ok(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth));
  assert.ok(await game.frame.evaluate(() => document.documentElement.scrollWidth <= innerWidth));
  await page.screenshot({ path: join(artifacts, 'mobile.png'), fullPage: true });
  passed('390px responsive parent and game have no horizontal overflow');

  const offline = await newContext();
  await offline.setOffline(true);
  const offlinePage = await offline.newPage();
  const requests = [];
  offlinePage.on('request', request => { if (/^https?:/u.test(request.url())) requests.push(request.url()); });
  await offlinePage.goto(pathToFileURL(freshFile).href);
  await offlinePage.getByTestId('draw-button').waitFor();
  assert.equal((await state(offlinePage)).cleared, 0);
  await offlinePage.getByTestId('draw-button').click();
  assert.equal((await state(offlinePage)).draws, 1);
  await offlinePage.reload();
  await offlinePage.getByTestId('draw-button').waitFor();
  assert.equal((await state(offlinePage)).draws, 1);
  assert.equal(requests.length, 0);
  passed('Downloaded file plays and restores progress with browser offline');

  const exported = await newContext();
  await exported.setOffline(true);
  const savedPage = await exported.newPage();
  await savedPage.goto(pathToFileURL(savedFile).href);
  await savedPage.getByTestId('draw-button').waitFor();
  assert.deepEqual(await state(savedPage), completed);
  await savedPage.getByTestId('reset-button').click();
  await savedPage.getByTestId('cancel-reset').click();
  assert.deepEqual(await state(savedPage), completed);
  await savedPage.getByTestId('reset-button').click();
  await savedPage.getByTestId('confirm-reset').click();
  assert.equal((await state(savedPage)).cleared, 0);
  passed('Embedded offline save and explicit reset confirmation');

  const english = await newContext({ locale: 'en-US', colorScheme: 'dark' });
  const englishPage = await english.newPage();
  await openWorkshop(englishPage, true);
  const englishGame = await start(englishPage);
  assert.ok((await englishGame.locator.locator('body').innerText()).includes('Spirit collection'));
  assert.ok((await englishGame.locator.locator('body').innerText()).includes('Mistbound Pacts'));
  await englishPage.screenshot({ path: join(artifacts, 'english-dark.png'), fullPage: true });
  passed('English locale and dark host theme');

  assert.deepEqual(report.errors, [], 'No uncaught page errors');
  passed('No uncaught browser errors');
  report.finishedAt = new Date().toISOString();
  report.passed = true;
} catch (error) {
  report.passed = false; report.failure = String(error.stack ?? error);
  throw error;
} finally {
  await writeFile(join(artifacts, 'report.json'), JSON.stringify(report, null, 2) + '\n');
  for (const context of contexts) await context.close();
  await browser.close();
  console.log(`Browser test artifacts: ${artifacts}`);
}
