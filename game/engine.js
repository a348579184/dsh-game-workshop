/** 雾岭灵契 — dependency-free, deterministic rules. No DOM, I/O or mutation of inputs. */
export function createGameEngine(options = {}) {
  const VERSION = 1;
  const cleanText = (value, fallback, max) => typeof value === 'string' && value.trim() ? value.replace(/[\u0000-\u001f\u007f]/g, '').trim().slice(0, max) : fallback;
  const bounded = (value, min, max, fallback) => Number.isFinite(value) ? Math.max(min, Math.min(max, Math.round(value))) : fallback;
  const hash = value => { let h = 2166136261; for (const c of String(value)) { h ^= c.charCodeAt(0); h = Math.imul(h, 16777619); } return h >>> 0 || 1; };
  const base = [
    { id: 'deer', name: '青岚鹿', en: 'Jadehart', description: '角生青岚，步过之处草木回春。', descriptionEn: 'A jade-antlered guardian whose steps restore the mountain.', skill: '回春', skillEn: 'Renewal', detail: '每三回合，为伤势最重的友方恢复生命。', detailEn: 'Every third round, heals the most wounded ally.', attack: 23, health: 100, armor: 4, color: '#78d6b3' },
    { id: 'fox', name: '烬尾狐', en: 'Emberfox', description: '拾起落日余烬，照亮归山的路。', descriptionEn: 'Carries the last embers of sunset to light the homeward path.', skill: '烬火', skillEn: 'Emberstrike', detail: '每三回合，攻击造成双倍伤害。', detailEn: 'Every third round, attacks deal double damage.', attack: 30, health: 78, armor: 2, color: '#f1aa78' },
    { id: 'crane', name: '听雨鹤', en: 'Raincrane', description: '听一夜山雨，羽间藏着万点星光。', descriptionEn: 'Listens to mountain rain with a thousand stars beneath its wings.', skill: '流雨', skillEn: 'Starshower', detail: '每三回合，额外攻击所有其他敌人。', detailEn: 'Every third round, also strikes all other enemies.', attack: 25, health: 85, armor: 3, color: '#a5c9ec' },
    { id: 'turtle', name: '玄苔龟', en: 'Mosstortoise', description: '背负一座小山，也守护每一位同行者。', descriptionEn: 'Bears a tiny mountain and shields every fellow traveler.', skill: '山佑', skillEn: 'Mountainward', detail: '存活时，全队受到的每次伤害减少 3 点。', detailEn: 'While alive, reduces all incoming ally damage by 3.', attack: 17, health: 145, armor: 8, color: '#b4ca83' },
    { id: 'tiger', name: '金纹猞', en: 'Goldlynx', description: '金纹如篆，跃过迷雾而不惊落叶。', descriptionEn: 'Golden runes gleam as it leaps through mist without stirring a leaf.', skill: '破晓', skillEn: 'Dawnbreak', detail: '攻击半血以下的敌人时，伤害提高 50%。', detailEn: 'Deals 50% more damage to enemies below half health.', attack: 32, health: 105, armor: 4, color: '#e5c67d' },
    { id: 'serpent', name: '月涟螭', en: 'Moonwyrm', description: '从月下涟漪中醒来，将清辉织成鳞。', descriptionEn: 'Awakens in moonlit ripples, its scales woven from silver light.', skill: '月蚀', skillEn: 'Moonpierce', detail: '攻击无视敌方护甲，并恢复自身 5 点生命。', detailEn: 'Attacks ignore armor and restore 5 health to itself.', attack: 25, health: 92, armor: 3, color: '#c1a6e2' }
  ];
  const input = options && typeof options === 'object' ? options : {};
  const language = input.language === 'en' ? 'en' : 'zh';
  const beasts = base.map((beast, index) => {
    const card = Array.isArray(input.cards) && input.cards[index] && typeof input.cards[index] === 'object' ? input.cards[index] : {};
    return { ...beast, name: cleanText(card.name, language === 'en' ? beast.en : beast.name, 32), description: cleanText(card.description, language === 'en' ? beast.descriptionEn : beast.description, 160), attack: bounded(card.attack, 12, 45, beast.attack), health: bounded(card.health, 60, 180, beast.health), color: typeof card.color === 'string' && /^#[\da-f]{6}$/i.test(card.color) ? card.color : beast.color };
  });
  const config = { title: cleanText(input.title, language === 'en' ? 'Mistbound Pacts' : '雾岭灵契', 80), language, seed: cleanText(String(input.seed ?? 'mist-2026'), 'mist-2026', 80), cards: beasts.map(({ name, description, attack, health, color }) => ({ name, description, attack, health, color })) };
  const gameId = 'mistbound-v1-' + hash(JSON.stringify(config)).toString(36);
  const items = [
    { id: 'fang', name: '赤金牙佩', en: 'Gilded Fang', icon: '✧', attack: 12, health: 0, armor: 0, description: '攻击 +12', descriptionEn: '+12 attack' },
    { id: 'veil', name: '凝露护符', en: 'Dew Amulet', icon: '◈', attack: 0, health: 45, armor: 3, description: '生命 +45 · 护甲 +3', descriptionEn: '+45 health · +3 armor' },
    { id: 'bell', name: '听风铃', en: 'Wind Chime', icon: '♧', attack: 8, health: 25, armor: 2, description: '攻击 +8 · 生命 +25 · 护甲 +2', descriptionEn: '+8 attack · +25 health · +2 armor' },
    { id: 'crown', name: '山月冠', en: 'Moon Crown', icon: '♔', attack: 15, health: 40, armor: 3, description: '攻击 +15 · 生命 +40 · 护甲 +3', descriptionEn: '+15 attack · +40 health · +3 armor' }
  ];
  const stages = [
    { id: 1, name: '苔径初行', en: 'The Moss Path', subtitle: '穿过薄雾，寻回第一枚山印', subtitleEn: 'Through the first mist, recover a mountain seal.', reward: 48, enemies: [{ name: '雾芽', en: 'Mistbud', health: 115, attack: 17, armor: 2 }, { name: '迷途石灵', en: 'Wayward Pebble', health: 140, attack: 20, armor: 4 }] },
    { id: 2, name: '月溪回响', en: 'Moonstream Echoes', subtitle: '循溪而上，唤醒沉睡的月光', subtitleEn: 'Follow the stream and awaken the sleeping moon.', reward: 60, enemies: [{ name: '空谷回声', en: 'Hollow Echo', health: 180, attack: 25, armor: 4 }, { name: '流雾', en: 'Drifting Mist', health: 145, attack: 24, armor: 3 }, { name: '溪石卫', en: 'Stream Sentinel', health: 160, attack: 22, armor: 6 }] },
    { id: 3, name: '云巅归契', en: 'Covenant at the Summit', subtitle: '越过云海，让灵契照亮群山', subtitleEn: 'Above the clouds, bring light back to the mountains.', reward: 80, enemies: [{ name: '长夜山魇', en: 'Nightfall Warden', health: 280, attack: 32, armor: 7 }, { name: '蔽月之影', en: 'Moonshade', health: 220, attack: 29, armor: 5 }, { name: '深雾之心', en: 'Heart of the Mist', health: 200, attack: 28, armor: 5 }] }
  ];
  const clone = state => JSON.parse(JSON.stringify(state));
  const fail = code => { throw new Error(code); };
  const integer = (n, min, max) => Number.isInteger(n) && n >= min && n <= max;
  const nextRandom = rng => { let x = rng >>> 0 || 1; x ^= x << 13; x ^= x >>> 17; x ^= x << 5; return { rng: x >>> 0, value: (x >>> 0) / 4294967296 }; };
  function createInitialState() {
    return { version: VERSION, gameId, seed: config.seed, rng: hash(config.seed), gold: 90, draws: 0, nextId: 7, cards: ['deer', 'deer', 'deer', 'fox', 'crane', 'turtle'].map((beast, i) => ({ id: 'c' + (i + 1), beast, star: 1 })), party: ['c6', 'c1', 'c4', 'c5'], ownedItems: ['fang', 'veil'], equipment: {}, cleared: 0, wins: 0, losses: 0, lastBattle: null };
  }
  function validateState(raw) {
    if (!raw || typeof raw !== 'object' || raw.version !== VERSION || raw.gameId !== gameId || raw.seed !== config.seed) return null;
    if (!integer(raw.rng, 1, 4294967295) || !integer(raw.gold, 0, 100000) || !integer(raw.draws, 0, 10000) || !integer(raw.nextId, 7, 1000000) || !integer(raw.cleared, 0, 3) || !integer(raw.wins, 0, 100000) || !integer(raw.losses, 0, 100000)) return null;
    if (!Array.isArray(raw.cards) || raw.cards.length < 1 || raw.cards.length > 120) return null;
    const ids = new Set(); const cards = [];
    for (const card of raw.cards) {
      if (!card || typeof card.id !== 'string' || !/^c[1-9]\d{0,5}$/.test(card.id) || Number(card.id.slice(1)) >= raw.nextId || ids.has(card.id) || !base.some(b => b.id === card.beast) || !integer(card.star, 1, 3)) return null;
      ids.add(card.id); cards.push({ id: card.id, beast: card.beast, star: card.star });
    }
    if (!Array.isArray(raw.party) || raw.party.length < 1 || raw.party.length > 4 || new Set(raw.party).size !== raw.party.length || raw.party.some(id => !ids.has(id))) return null;
    const unlockedItems = items.slice(0, Math.min(4, raw.cleared + 2)).map(item => item.id);
    if (!Array.isArray(raw.ownedItems) || raw.ownedItems.length !== unlockedItems.length || new Set(raw.ownedItems).size !== unlockedItems.length || raw.ownedItems.some(id => !unlockedItems.includes(id))) return null;
    if (!raw.equipment || typeof raw.equipment !== 'object' || Array.isArray(raw.equipment)) return null;
    const equipment = {}; const holders = new Set();
    for (const [item, card] of Object.entries(raw.equipment)) { if (!unlockedItems.includes(item) || !ids.has(card) || holders.has(card)) return null; equipment[item] = card; holders.add(card); }
    let lastBattle = null;
    if (raw.lastBattle !== null) {
      const b = raw.lastBattle;
      if (!b || typeof b.won !== 'boolean' || !integer(b.stage, 1, 3) || !integer(b.rounds, 1, 30) || !integer(b.reward, 0, 80)) return null;
      lastBattle = { won: b.won, stage: b.stage, rounds: b.rounds, reward: b.reward };
    }
    return { version: VERSION, gameId, seed: config.seed, rng: raw.rng, gold: raw.gold, draws: raw.draws, nextId: raw.nextId, cards, party: [...raw.party], ownedItems: [...unlockedItems], equipment, cleared: raw.cleared, wins: raw.wins, losses: raw.losses, lastBattle };
  }
  const assertState = state => validateState(state) || fail('INVALID_SAVE');
  function serializeState(state) { return JSON.stringify(assertState(state)); }
  function deserializeState(text) { if (typeof text !== 'string' || text.length > 100000) return null; try { return validateState(JSON.parse(text)); } catch { return null; } }
  function drawCard(state) {
    const next = assertState(state);
    if (next.gold < 12) fail('NOT_ENOUGH_GOLD');
    if (next.cards.length >= 114) fail('COLLECTION_FULL');
    const roll = nextRandom(next.rng); next.rng = roll.rng; next.gold -= 12; next.draws++;
    const card = { id: 'c' + next.nextId++, beast: beasts[Math.floor(roll.value * beasts.length)].id, star: 1 };
    next.cards.push(card); return { state: next, card: { ...card } };
  }
  function mergeGroups(state) {
    const groups = [];
    for (const beast of beasts) for (let star = 1; star < 3; star++) {
      const cards = state.cards.filter(c => c.beast === beast.id && c.star === star);
      if (cards.length >= 3) groups.push({ beast: beast.id, star, ids: cards.slice(0, 3).map(c => c.id), count: cards.length });
    }
    return groups;
  }
  function mergeCards(state, cardIds) {
    const next = assertState(state);
    if (!Array.isArray(cardIds) || cardIds.length !== 3 || new Set(cardIds).size !== 3) fail('MERGE_REQUIRES_THREE');
    const cards = cardIds.map(id => next.cards.find(c => c.id === id));
    if (cards.some(c => !c) || cards.some(c => c.beast !== cards[0].beast || c.star !== cards[0].star) || cards[0].star >= 3) fail('MERGE_MISMATCH');
    const retained = cards.find(c => next.party.includes(c.id)) || cards[0];
    const result = { ...retained, star: retained.star + 1 };
    next.cards = next.cards.filter(c => !cardIds.includes(c.id) || c.id === retained.id).map(c => c.id === retained.id ? result : c);
    next.party = [...new Set(next.party.map(id => cardIds.includes(id) ? retained.id : id))];
    const equipped = Object.keys(next.equipment).filter(item => cardIds.includes(next.equipment[item]));
    const kept = equipped.find(item => next.equipment[item] === retained.id) || equipped[0];
    for (const item of equipped) { if (item === kept) next.equipment[item] = retained.id; else delete next.equipment[item]; }
    for (const card of next.cards) if (next.party.length < 4 && !next.party.includes(card.id)) next.party.push(card.id);
    return next;
  }
  function equipItem(state, itemId, cardId) {
    const next = assertState(state);
    if (!next.ownedItems.includes(itemId)) fail('ITEM_LOCKED');
    if (cardId === null) { delete next.equipment[itemId]; return next; }
    if (!next.cards.some(c => c.id === cardId)) fail('CARD_NOT_FOUND');
    for (const item of Object.keys(next.equipment)) if (next.equipment[item] === cardId) delete next.equipment[item];
    next.equipment[itemId] = cardId; return next;
  }
  function setParty(state, ids) {
    const next = assertState(state);
    if (!Array.isArray(ids) || ids.length < 1 || ids.length > 4 || new Set(ids).size !== ids.length || ids.some(id => !next.cards.some(c => c.id === id))) fail('INVALID_PARTY');
    next.party = [...ids]; return next;
  }
  function cardStats(state, cardOrId) {
    const card = typeof cardOrId === 'string' ? state.cards.find(c => c.id === cardOrId) : cardOrId;
    if (!card) fail('CARD_NOT_FOUND');
    const beast = beasts.find(b => b.id === card.beast); if (!beast) fail('CARD_NOT_FOUND');
    const factor = [0, 1, 1.85, 3.25][card.star];
    const item = items.find(i => state.equipment[i.id] === card.id);
    return { attack: Math.round(beast.attack * factor) + (item?.attack || 0), health: Math.round(beast.health * factor) + (item?.health || 0), armor: beast.armor + (card.star - 1) * 2 + (item?.armor || 0), item: item?.id || null };
  }
  function autoParty(state) {
    const next = assertState(state);
    next.party = [...next.cards].sort((a, b) => { const sa = cardStats(next, a), sb = cardStats(next, b); return (sb.attack * 3 + sb.health + sb.armor * 4) - (sa.attack * 3 + sa.health + sa.armor * 4); }).slice(0, 4).map(c => c.id);
    // Keep a durable front line; opponents focus the leftmost living ally.
    next.party.sort((a, b) => cardStats(next, b).health - cardStats(next, a).health);
    return next;
  }
  function availableStages(state) { return stages.map(s => ({ ...s, unlocked: s.id <= state.cleared + 1, completed: s.id <= state.cleared })); }
  function startBattle(state, stageId) {
    const next = assertState(state); const stage = stages.find(s => s.id === stageId);
    if (!stage || stageId > next.cleared + 1) fail('STAGE_LOCKED');
    const allies = next.party.map(id => { const card = next.cards.find(c => c.id === id); const stats = cardStats(next, card); return { ...card, ...stats, hp: stats.health, name: beasts.find(b => b.id === card.beast).name }; });
    const enemies = stage.enemies.map((e, i) => ({ ...e, id: 'e' + i, hp: e.health, name: language === 'en' ? e.en : e.name }));
    const initialAllies = clone(allies), initialEnemies = clone(enemies), events = []; let rounds = 0;
    const alive = list => list.filter(c => c.hp > 0);
    const heal = (actor, target, amount, round) => { const actual = Math.min(amount, target.health - target.hp); if (actual > 0) { target.hp += actual; events.push({ kind: 'heal', side: 'ally', actor: actor.id, target: target.id, amount: actual, remaining: target.hp, round }); } };
    const hit = (actor, target, multiplier, side, round, skill = false) => {
      const roll = nextRandom(next.rng); next.rng = roll.rng;
      const ward = side === 'enemy' && alive(allies).some(a => a.beast === 'turtle') ? 3 : 0;
      const armor = actor.beast === 'serpent' ? 0 : target.armor;
      const damage = Math.max(1, Math.round(actor.attack * multiplier * (0.94 + roll.value * 0.12)) - armor - ward);
      target.hp = Math.max(0, target.hp - damage);
      events.push({ kind: 'attack', side, actor: actor.id, target: target.id, amount: damage, remaining: target.hp, round, skill });
    };
    for (let round = 1; round <= 30 && alive(allies).length && alive(enemies).length; round++) {
      rounds = round; events.push({ kind: 'round', round });
      for (const actor of alive(allies)) {
        const target = alive(enemies)[0]; if (!target) break;
        const skill = round % 3 === 0;
        if (actor.beast === 'deer' && skill) { const targetAlly = [...alive(allies)].sort((a, b) => (b.health - b.hp) - (a.health - a.hp))[0]; heal(actor, targetAlly, 25 * actor.star, round); }
        const multiplier = actor.beast === 'fox' && skill ? 2 : actor.beast === 'tiger' && target.hp < target.health / 2 ? 1.5 : 1;
        hit(actor, target, multiplier, 'ally', round, multiplier > 1);
        if (actor.beast === 'crane' && skill) for (const extra of alive(enemies).filter(e => e.id !== target.id)) hit(actor, extra, 0.55, 'ally', round, true);
        if (actor.beast === 'serpent') heal(actor, actor, 5 * actor.star, round);
      }
      for (const actor of alive(enemies)) { const target = alive(allies)[0]; if (!target) break; hit(actor, target, 1, 'enemy', round); }
    }
    const won = alive(enemies).length === 0; const firstClear = won && next.cleared < stageId; const rewards = { gold: 0, cards: [], item: null };
    if (won) next.wins++; else next.losses++;
    if (firstClear) {
      next.cleared = stageId; next.gold += stage.reward; rewards.gold = stage.reward;
      const rewardBeast = stageId === 1 ? 'fox' : stageId === 2 ? 'crane' : null;
      if (rewardBeast && next.cards.length <= 118) for (let i = 0; i < 2; i++) { const card = { id: 'c' + next.nextId++, beast: rewardBeast, star: 1 }; next.cards.push(card); rewards.cards.push({ ...card }); }
      const item = stageId === 1 ? 'bell' : stageId === 2 ? 'crown' : null;
      if (item) { next.ownedItems.push(item); rewards.item = item; }
    }
    next.lastBattle = { won, stage: stageId, rounds, reward: rewards.gold };
    return { state: next, battle: { won, firstClear, stage: stageId, rounds, events, allies: initialAllies, enemies: initialEnemies, rewards } };
  }
  return { VERSION, config, gameId, beasts, items, stages, hash, nextRandom, createInitialState, validateState, serializeState, deserializeState, drawCard, mergeGroups, mergeCards, equipItem, setParty, autoParty, cardStats, availableStages, startBattle };
}

const defaultEngine = createGameEngine();
export const { createInitialState, validateState, serializeState, deserializeState, drawCard, mergeGroups, mergeCards, equipItem, setParty, autoParty, cardStats, availableStages, startBattle, nextRandom } = defaultEngine;
export const BEASTS = defaultEngine.beasts;
export const ITEMS = defaultEngine.items;
export const STAGES = defaultEngine.stages;
