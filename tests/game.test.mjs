import test from 'node:test';
import assert from 'node:assert/strict';
import vm from 'node:vm';
import { createGameEngine, createInitialState, drawCard, mergeCards, mergeGroups, equipItem, cardStats, startBattle, deserializeState } from '../game/engine.js';
import { renderGame } from '../game/render.js';
import { beastArt } from '../game/art.js';

function mergeAll(engine, state) {
  let groups = engine.mergeGroups(state);
  while (groups.length) { state = engine.mergeCards(state, groups[0].ids); groups = engine.mergeGroups(state); }
  return state;
}
function prepare(engine, state) {
  state = mergeAll(engine, state);
  for (const [item, beast] of [['fang', 'fox'], ['veil', 'turtle'], ['bell', 'deer'], ['crown', 'crane']]) {
    if (state.ownedItems.includes(item)) state = engine.equipItem(state, item, state.cards.find(c => c.beast === beast).id);
  }
  return engine.autoParty(state);
}
function bootHTML(options, stored, embedded = null, unavailable = false) {
  const html = renderGame(options), script = html.match(/<script>([\s\S]*?)<\/script>/)[1];
  const elements = new Map(); const storage = new Map();
  const engine = createGameEngine(options); if (stored !== undefined) storage.set(engine.gameId, stored);
  for (const id of ['game-root', 'battle-root', 'modal', 'toast', 'mist-save']) elements.set(id, {
    innerHTML: '', textContent: id === 'mist-save' ? embedded || 'null' : '', handlers: {}, classList: { add() {}, remove() {} },
    addEventListener(event, callback) { this.handlers[event] = callback; }, showModal() { this.open = true; }, close() { this.open = false; }
  });
  const context = { console, setTimeout: () => 1, clearTimeout() {}, matchMedia: () => ({ matches: true }), document: { getElementById: id => elements.get(id) || null, addEventListener() {} }, localStorage: { getItem(key) { if (unavailable) throw new Error('disabled'); return storage.get(key) || null; }, setItem(key, value) { if (unavailable) throw new Error('disabled'); storage.set(key, value); } }, window: {} };
  vm.runInNewContext(script, context, { timeout: 3000 });
  const click = (action, data = {}, dialog = false) => elements.get(dialog ? 'modal' : 'game-root').handlers.click({ target: { closest: () => ({ dataset: dialog ? { dialog: action, ...data } : { action, ...data }, disabled: false }) } });
  return { html, context, elements, storage, engine, click, getState: () => JSON.parse(storage.get(engine.gameId)) };
}

test('six original beasts, four relics, and a useful duplicate starter', () => {
  const e = createGameEngine(), s = e.createInitialState();
  assert.equal(e.beasts.length, 6); assert.equal(e.items.length, 4); assert.equal(e.stages.length, 3);
  assert.equal(s.cards.length, 6); assert.equal(s.party.length, 4); assert.equal(s.gold, 90);
  assert.deepEqual(e.mergeGroups(s), [{ beast: 'deer', star: 1, ids: ['c1', 'c2', 'c3'], count: 3 }]);
  assert.equal(new Set(e.beasts.map(b => beastArt(b.id, b.color))).size, 6);
});

test('draws are seeded, pure, cost exactly twelve, and reach all six beasts', () => {
  const e = createGameEngine({ seed: 'same-world' }); let a = e.createInitialState(), b = e.createInitialState();
  const original = JSON.stringify(a), first = e.drawCard(a);
  assert.equal(JSON.stringify(a), original); assert.equal(first.state.gold, 78); assert.equal(first.state.draws, 1);
  assert.equal(first.card.star, 1); assert.equal(first.state.cards.length, 7);
  for (let i = 0; i < 7; i++) { a = e.drawCard(a).state; b = e.drawCard(b).state; }
  assert.deepEqual(a, b); assert.throws(() => e.drawCard(a), /NOT_ENOUGH_GOLD/);
  const seen = new Set(); for (let i = 0; i < 100; i++) { const game = createGameEngine({ seed: 'world-' + i }); seen.add(game.drawCard(game.createInitialState()).card.beast); }
  assert.equal(seen.size, 6);
});

test('merge consumes exactly three same-name same-star cards and preserves party/equipment', () => {
  let s = createInitialState(); s = equipItem(s, 'fang', 'c2'); s = equipItem(s, 'veil', 'c3'); const original = JSON.stringify(s);
  const next = mergeCards(s, ['c1', 'c2', 'c3']);
  assert.equal(JSON.stringify(s), original); assert.equal(next.cards.length, 4);
  assert.equal(next.cards.find(c => c.id === 'c1').star, 2); assert.equal(next.party.length, 4);
  assert.equal(Object.keys(next.equipment).length, 1); assert.equal(next.equipment.fang, 'c1');
  assert.ok(cardStats(next, 'c1').attack > cardStats(s, 'c1').attack);
  assert.throws(() => mergeCards(s, ['c1', 'c1', 'c2']), /MERGE_REQUIRES_THREE/);
  assert.throws(() => mergeCards(s, ['c1', 'c2']), /MERGE_REQUIRES_THREE/);
  assert.throws(() => mergeCards(s, ['c1', 'c2', 'c4']), /MERGE_MISMATCH/);
  const mixed = createInitialState(); mixed.cards[0].star = 2;
  assert.throws(() => mergeCards(mixed, ['c1', 'c2', 'c3']), /MERGE_MISMATCH/);
  const max = createInitialState(); max.cards.slice(0, 3).forEach(c => c.star = 3);
  assert.equal(mergeGroups(max).length, 0); assert.throws(() => mergeCards(max, ['c1', 'c2', 'c3']), /MERGE_MISMATCH/);
});

test('relics modify stats, transfer and remove without duplication', () => {
  const s = createInitialState(), initial = cardStats(s, 'c1');
  const equipped = equipItem(s, 'fang', 'c1'); assert.equal(cardStats(equipped, 'c1').attack, initial.attack + 12);
  assert.equal(Object.keys(s.equipment).length, 0);
  const replacement = equipItem(equipped, 'veil', 'c1'); assert.deepEqual(replacement.equipment, { veil: 'c1' });
  assert.equal(cardStats(replacement, 'c1').health, initial.health + 45); assert.equal(cardStats(replacement, 'c1').armor, initial.armor + 3);
  const moved = equipItem(replacement, 'veil', 'c4'); assert.equal(cardStats(moved, 'c1').health, initial.health);
  assert.deepEqual(equipItem(moved, 'veil', null).equipment, {});
  assert.throws(() => equipItem(s, 'bell', 'c1'), /ITEM_LOCKED/); assert.throws(() => equipItem(s, 'fang', 'missing'), /CARD_NOT_FOUND/);
});

test('party validation enforces unique owned spirits and front-line ordering', () => {
  const e = createGameEngine(), s = e.createInitialState();
  for (const ids of [[], ['c1', 'c1'], ['missing'], ['c1', 'c2', 'c3', 'c4', 'c5']]) assert.throws(() => e.setParty(s, ids), /INVALID_PARTY/);
  assert.deepEqual(e.setParty(s, ['c4', 'c6']).party, ['c4', 'c6']);
  const best = e.autoParty(mergeAll(e, s)); assert.equal(best.party.length, 4);
  assert.ok(e.cardStats(best, best.party[0]).health >= e.cardStats(best, best.party[1]).health);
});

test('chapters unlock progressively and first-clear rewards never repeat', () => {
  const e = createGameEngine(), s = prepare(e, e.createInitialState());
  assert.deepEqual(e.availableStages(s).map(s => s.unlocked), [true, false, false]);
  assert.throws(() => e.startBattle(s, 2), /STAGE_LOCKED/); assert.throws(() => e.startBattle(s, 99), /STAGE_LOCKED/);
  const original = JSON.stringify(s), first = e.startBattle(s, 1);
  assert.equal(JSON.stringify(s), original); assert.equal(first.battle.won, true); assert.equal(first.state.cleared, 1);
  assert.equal(first.state.gold, s.gold + 48); assert.equal(first.battle.rewards.cards.length, 2); assert.equal(first.battle.rewards.item, 'bell');
  assert.deepEqual(e.availableStages(first.state).map(s => s.unlocked), [true, true, false]);
  const repeat = e.startBattle(first.state, 1); assert.equal(repeat.state.gold, first.state.gold); assert.equal(repeat.state.cards.length, first.state.cards.length); assert.equal(repeat.battle.firstClear, false);
  assert.deepEqual(e.startBattle(s, 1), first, 'battles are deterministic for the same state');
});

test('default progression wins all three chapters across 100 seeds without a single draw', () => {
  for (let seed = 0; seed < 100; seed++) {
    const e = createGameEngine({ seed }); let s = e.createInitialState();
    for (let stage = 1; stage <= 3; stage++) { s = prepare(e, s); const result = e.startBattle(s, stage); assert.ok(result.battle.won, `seed ${seed}, chapter ${stage}`); assert.ok(result.battle.rounds <= 30); assert.ok(result.battle.events.some(event => event.kind === 'attack')); s = result.state; assert.ok(e.validateState(s)); }
    assert.equal(s.cleared, 3); assert.equal(s.draws, 0); assert.equal(s.gold, 278);
  }
});

test('defeats consume no resources, do not unlock chapters, and restore everyone next battle', () => {
  const e = createGameEngine(), s = e.setParty(e.createInitialState(), ['c4']);
  const result = e.startBattle(s, 1); assert.equal(result.battle.won, false); assert.equal(result.state.gold, s.gold); assert.equal(result.state.cleared, 0); assert.equal(result.state.losses, 1);
  const retry = e.startBattle(result.state, 1); assert.equal(retry.battle.allies[0].hp, retry.battle.allies[0].health); assert.deepEqual(result.state.cards, s.cards);
});

test('saves round-trip and validation strips unexpected keys', () => {
  const e = createGameEngine({ seed: 'save-world' }), s = prepare(e, e.createInitialState());
  assert.deepEqual(e.deserializeState(e.serializeState(s)), s);
  const raw = JSON.parse(JSON.stringify(s)); raw.injected = '<script>bad()</script>'; raw.cards[0].name = 'injected'; raw.cards[0].attack = Infinity;
  const cleaned = e.validateState(raw); assert.ok(cleaned); assert.equal(cleaned.injected, undefined); assert.equal(cleaned.cards[0].name, undefined);
  assert.notEqual(cleaned, raw); assert.notEqual(cleaned.cards, raw.cards);
  assert.equal(createGameEngine({ seed: 'other-world' }).deserializeState(e.serializeState(s)), null);
  assert.equal(createGameEngine({ seed: 'save-world', title: 'Other title' }).deserializeState(e.serializeState(s)), null);
});

test('corrupt, malicious, and structurally invalid saves fail safely', () => {
  const e = createGameEngine(), s = e.createInitialState();
  for (const input of ['', '{', 'null', '[]', '1', '"hi"', 'x'.repeat(100001)]) assert.equal(e.deserializeState(input), null);
  const changes = [s => { s.version = 100; }, s => { s.gold = -1; }, s => { s.gold = Infinity; }, s => { s.rng = 0; }, s => { s.cleared = 4; }, s => { s.nextId = 2; }, s => { s.cards[0].star = 9; }, s => { s.cards[0].beast = '__proto__'; }, s => { s.cards[0].id = '<img>'; }, s => { s.cards[1].id = 'c1'; }, s => { s.party = ['missing']; }, s => { s.party = ['c1', 'c1']; }, s => { s.ownedItems.push('crown'); }, s => { s.equipment = { crown: 'c1' }; }, s => { s.equipment = { fang: 'c1', veil: 'c1' }; }, s => { s.lastBattle = { won: 'yes', stage: 1, rounds: 1, reward: 0 }; }];
  for (const change of changes) { const invalid = structuredClone(s); change(invalid); assert.equal(e.validateState(invalid), null); assert.throws(() => e.serializeState(invalid), /INVALID_SAVE/); }
  assert.equal(deserializeState('{"__proto__":{"polluted":true}}'), null); assert.equal({}.polluted, undefined);
});

test('custom configuration is bounded, defaults are safe, identity isolates saves', () => {
  const e = createGameEngine({ language: 'en', title: '\u0000  My mountain  ', seed: 42, cards: [{ name: '  A spirit  ', description: 'Original', attack: 999, health: -20, color: 'red; background:url(https://bad)' }, { name: 'B', color: '#12AbEF', attack: 12.8 }] });
  assert.equal(e.config.title, 'My mountain'); assert.equal(e.config.seed, '42'); assert.equal(e.beasts[0].name, 'A spirit'); assert.equal(e.beasts[0].attack, 45); assert.equal(e.beasts[0].health, 60); assert.equal(e.beasts[0].color, '#78d6b3'); assert.equal(e.beasts[1].color, '#12AbEF'); assert.equal(e.beasts[1].attack, 13); assert.equal(e.beasts[2].name, 'Raincrane');
  assert.equal(createGameEngine(null).config.language, 'zh');
  assert.equal(createGameEngine({ title: 'a'.repeat(200), seed: 'b'.repeat(200), cards: [{ name: 'c'.repeat(200) }] }).config.title.length, 80);
  assert.notEqual(e.gameId, createGameEngine().gameId);
});

test('HTML is portable, script-safe, original-art-only, and runtime text is escaped', () => {
  const attack = '</script><script>globalThis.PWNED=1</script><img src=x onerror=alert(1)>';
  const run = bootHTML({ title: attack, seed: attack, cards: [{ name: attack, description: attack, color: '#123456' }] });
  assert.ok(run.context.window.__MISTBOUND_READY__); assert.equal(run.context.PWNED, undefined);
  assert.equal((run.html.match(/<script/g) || []).length, 2); assert.equal((run.html.match(/<\/script>/g) || []).length, 2);
  assert.ok(run.html.includes('\\u003c/script\\u003e'));
  assert.ok(!run.elements.get('game-root').innerHTML.includes('<img src=x'));
  assert.ok(run.elements.get('game-root').innerHTML.includes('&lt;script&gt;'));
  assert.ok(!/<(?:script|img|link|iframe)\b[^>]*(?:src|href)=["']https?:/i.test(run.html));
  assert.ok(run.html.includes('new Blob')); assert.ok(run.html.includes('mist-save')); assert.ok(run.html.includes('localStorage.setItem'));
  assert.ok(run.html.indexOf('<meta charset="utf-8">') < 1024);
  assert.ok(run.html.indexOf('MIT License') > run.html.indexOf('<head>'), 'license stays inside the serialized document element');
  assert.ok(run.html.includes('Copyright (c) 2026 a348579184'));
  assert.ok(run.elements.get('game-root').innerHTML.includes('data-testid="merge-button"'));
});

test('Chinese and English documents boot, and UI controls update persisted state', () => {
  const zh = bootHTML(); assert.ok(zh.html.startsWith('<!doctype html>')); assert.ok(zh.elements.get('game-root').innerHTML.includes('灵兽图卷'));
  zh.click('merge', { beast: 'deer', star: '1' }); assert.equal(zh.getState().cards.length, 4); assert.equal(zh.getState().cards.find(c => c.beast === 'deer').star, 2);
  zh.click('select', { id: 'c4' }); zh.click('equip', { item: 'fang' }); assert.equal(zh.getState().equipment.fang, 'c4');
  zh.click('unequip', { item: 'fang' }); assert.equal(zh.getState().equipment.fang, undefined);
  zh.click('draw'); assert.equal(zh.getState().draws, 1); assert.equal(zh.getState().gold, 78);
  const english = bootHTML({ language: 'en' }); assert.ok(english.html.includes('<html lang="en">')); assert.ok(english.elements.get('game-root').innerHTML.includes('Spirit collection')); assert.ok(english.elements.get('game-root').innerHTML.includes('Mistbound Pacts'));
});

test('reset requires explicit confirmation and cancel leaves progress intact', () => {
  const run = bootHTML(); run.click('draw'); const before = run.getState();
  run.click('reset'); assert.ok(run.elements.get('modal').open); assert.deepEqual(run.getState(), before);
  run.click('close', {}, true); assert.equal(run.elements.get('modal').open, false); assert.deepEqual(run.getState(), before);
  run.click('reset'); run.click('confirm-reset', {}, true); assert.deepEqual(run.getState(), run.engine.createInitialState());
});

test('browser persistence restores a save, recovers corrupt saves, and uses embedded offline saves', () => {
  const e = createGameEngine(), progress = e.serializeState(e.drawCard(e.createInitialState()).state);
  const restored = bootHTML({}, progress); assert.equal(restored.getState().draws, 1);
  const corrupt = bootHTML({}, '{bad'); assert.equal(corrupt.getState().draws, 0); assert.ok(corrupt.elements.get('toast').textContent.includes('旧存档'));
  const offline = bootHTML({}, undefined, progress); assert.equal(offline.getState().draws, 1);
  const blocked = bootHTML({}, undefined, progress, true); assert.ok(blocked.context.window.__MISTBOUND_READY__); assert.ok(blocked.elements.get('game-root').innerHTML.includes('浏览器存储不可用'));
});
