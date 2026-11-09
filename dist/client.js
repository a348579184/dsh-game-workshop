/*! dsh-game-workshop 0.1.0 | Copyright (c) 2026 a348579184 | MIT License */
(() => {
  // game/engine.js
  function createGameEngine(options = {}) {
    const VERSION = 1;
    const cleanText = (value, fallback, max) => typeof value === "string" && value.trim() ? value.replace(/[\u0000-\u001f\u007f]/g, "").trim().slice(0, max) : fallback;
    const bounded = (value, min, max, fallback) => Number.isFinite(value) ? Math.max(min, Math.min(max, Math.round(value))) : fallback;
    const hash = (value) => {
      let h = 2166136261;
      for (const c of String(value)) {
        h ^= c.charCodeAt(0);
        h = Math.imul(h, 16777619);
      }
      return h >>> 0 || 1;
    };
    const base = [
      { id: "deer", name: "青岚鹿", en: "Jadehart", description: "角生青岚，步过之处草木回春。", descriptionEn: "A jade-antlered guardian whose steps restore the mountain.", skill: "回春", skillEn: "Renewal", detail: "每三回合，为伤势最重的友方恢复生命。", detailEn: "Every third round, heals the most wounded ally.", attack: 23, health: 100, armor: 4, color: "#78d6b3" },
      { id: "fox", name: "烬尾狐", en: "Emberfox", description: "拾起落日余烬，照亮归山的路。", descriptionEn: "Carries the last embers of sunset to light the homeward path.", skill: "烬火", skillEn: "Emberstrike", detail: "每三回合，攻击造成双倍伤害。", detailEn: "Every third round, attacks deal double damage.", attack: 30, health: 78, armor: 2, color: "#f1aa78" },
      { id: "crane", name: "听雨鹤", en: "Raincrane", description: "听一夜山雨，羽间藏着万点星光。", descriptionEn: "Listens to mountain rain with a thousand stars beneath its wings.", skill: "流雨", skillEn: "Starshower", detail: "每三回合，额外攻击所有其他敌人。", detailEn: "Every third round, also strikes all other enemies.", attack: 25, health: 85, armor: 3, color: "#a5c9ec" },
      { id: "turtle", name: "玄苔龟", en: "Mosstortoise", description: "背负一座小山，也守护每一位同行者。", descriptionEn: "Bears a tiny mountain and shields every fellow traveler.", skill: "山佑", skillEn: "Mountainward", detail: "存活时，全队受到的每次伤害减少 3 点。", detailEn: "While alive, reduces all incoming ally damage by 3.", attack: 17, health: 145, armor: 8, color: "#b4ca83" },
      { id: "tiger", name: "金纹猞", en: "Goldlynx", description: "金纹如篆，跃过迷雾而不惊落叶。", descriptionEn: "Golden runes gleam as it leaps through mist without stirring a leaf.", skill: "破晓", skillEn: "Dawnbreak", detail: "攻击半血以下的敌人时，伤害提高 50%。", detailEn: "Deals 50% more damage to enemies below half health.", attack: 32, health: 105, armor: 4, color: "#e5c67d" },
      { id: "serpent", name: "月涟螭", en: "Moonwyrm", description: "从月下涟漪中醒来，将清辉织成鳞。", descriptionEn: "Awakens in moonlit ripples, its scales woven from silver light.", skill: "月蚀", skillEn: "Moonpierce", detail: "攻击无视敌方护甲，并恢复自身 5 点生命。", detailEn: "Attacks ignore armor and restore 5 health to itself.", attack: 25, health: 92, armor: 3, color: "#c1a6e2" }
    ];
    const input = options && typeof options === "object" ? options : {};
    const language = input.language === "en" ? "en" : "zh";
    const beasts = base.map((beast, index) => {
      const card = Array.isArray(input.cards) && input.cards[index] && typeof input.cards[index] === "object" ? input.cards[index] : {};
      return { ...beast, name: cleanText(card.name, language === "en" ? beast.en : beast.name, 32), description: cleanText(card.description, language === "en" ? beast.descriptionEn : beast.description, 160), attack: bounded(card.attack, 12, 45, beast.attack), health: bounded(card.health, 60, 180, beast.health), color: typeof card.color === "string" && /^#[\da-f]{6}$/i.test(card.color) ? card.color : beast.color };
    });
    const config = { title: cleanText(input.title, language === "en" ? "Mistbound Pacts" : "雾岭灵契", 80), language, seed: cleanText(String(input.seed ?? "mist-2026"), "mist-2026", 80), cards: beasts.map(({ name, description, attack, health, color }) => ({ name, description, attack, health, color })) };
    const gameId = "mistbound-v1-" + hash(JSON.stringify(config)).toString(36);
    const items = [
      { id: "fang", name: "赤金牙佩", en: "Gilded Fang", icon: "✧", attack: 12, health: 0, armor: 0, description: "攻击 +12", descriptionEn: "+12 attack" },
      { id: "veil", name: "凝露护符", en: "Dew Amulet", icon: "◈", attack: 0, health: 45, armor: 3, description: "生命 +45 · 护甲 +3", descriptionEn: "+45 health · +3 armor" },
      { id: "bell", name: "听风铃", en: "Wind Chime", icon: "♧", attack: 8, health: 25, armor: 2, description: "攻击 +8 · 生命 +25 · 护甲 +2", descriptionEn: "+8 attack · +25 health · +2 armor" },
      { id: "crown", name: "山月冠", en: "Moon Crown", icon: "♔", attack: 15, health: 40, armor: 3, description: "攻击 +15 · 生命 +40 · 护甲 +3", descriptionEn: "+15 attack · +40 health · +3 armor" }
    ];
    const stages = [
      { id: 1, name: "苔径初行", en: "The Moss Path", subtitle: "穿过薄雾，寻回第一枚山印", subtitleEn: "Through the first mist, recover a mountain seal.", reward: 48, enemies: [{ name: "雾芽", en: "Mistbud", health: 115, attack: 17, armor: 2 }, { name: "迷途石灵", en: "Wayward Pebble", health: 140, attack: 20, armor: 4 }] },
      { id: 2, name: "月溪回响", en: "Moonstream Echoes", subtitle: "循溪而上，唤醒沉睡的月光", subtitleEn: "Follow the stream and awaken the sleeping moon.", reward: 60, enemies: [{ name: "空谷回声", en: "Hollow Echo", health: 180, attack: 25, armor: 4 }, { name: "流雾", en: "Drifting Mist", health: 145, attack: 24, armor: 3 }, { name: "溪石卫", en: "Stream Sentinel", health: 160, attack: 22, armor: 6 }] },
      { id: 3, name: "云巅归契", en: "Covenant at the Summit", subtitle: "越过云海，让灵契照亮群山", subtitleEn: "Above the clouds, bring light back to the mountains.", reward: 80, enemies: [{ name: "长夜山魇", en: "Nightfall Warden", health: 280, attack: 32, armor: 7 }, { name: "蔽月之影", en: "Moonshade", health: 220, attack: 29, armor: 5 }, { name: "深雾之心", en: "Heart of the Mist", health: 200, attack: 28, armor: 5 }] }
    ];
    const clone = (state) => JSON.parse(JSON.stringify(state));
    const fail = (code) => {
      throw new Error(code);
    };
    const integer = (n, min, max) => Number.isInteger(n) && n >= min && n <= max;
    const nextRandom2 = (rng) => {
      let x = rng >>> 0 || 1;
      x ^= x << 13;
      x ^= x >>> 17;
      x ^= x << 5;
      return { rng: x >>> 0, value: (x >>> 0) / 4294967296 };
    };
    function createInitialState2() {
      return { version: VERSION, gameId, seed: config.seed, rng: hash(config.seed), gold: 90, draws: 0, nextId: 7, cards: ["deer", "deer", "deer", "fox", "crane", "turtle"].map((beast, i) => ({ id: "c" + (i + 1), beast, star: 1 })), party: ["c6", "c1", "c4", "c5"], ownedItems: ["fang", "veil"], equipment: {}, cleared: 0, wins: 0, losses: 0, lastBattle: null };
    }
    function validateState2(raw) {
      if (!raw || typeof raw !== "object" || raw.version !== VERSION || raw.gameId !== gameId || raw.seed !== config.seed) return null;
      if (!integer(raw.rng, 1, 4294967295) || !integer(raw.gold, 0, 1e5) || !integer(raw.draws, 0, 1e4) || !integer(raw.nextId, 7, 1e6) || !integer(raw.cleared, 0, 3) || !integer(raw.wins, 0, 1e5) || !integer(raw.losses, 0, 1e5)) return null;
      if (!Array.isArray(raw.cards) || raw.cards.length < 1 || raw.cards.length > 120) return null;
      const ids = /* @__PURE__ */ new Set();
      const cards = [];
      for (const card of raw.cards) {
        if (!card || typeof card.id !== "string" || !/^c[1-9]\d{0,5}$/.test(card.id) || Number(card.id.slice(1)) >= raw.nextId || ids.has(card.id) || !base.some((b) => b.id === card.beast) || !integer(card.star, 1, 3)) return null;
        ids.add(card.id);
        cards.push({ id: card.id, beast: card.beast, star: card.star });
      }
      if (!Array.isArray(raw.party) || raw.party.length < 1 || raw.party.length > 4 || new Set(raw.party).size !== raw.party.length || raw.party.some((id) => !ids.has(id))) return null;
      const unlockedItems = items.slice(0, Math.min(4, raw.cleared + 2)).map((item) => item.id);
      if (!Array.isArray(raw.ownedItems) || raw.ownedItems.length !== unlockedItems.length || new Set(raw.ownedItems).size !== unlockedItems.length || raw.ownedItems.some((id) => !unlockedItems.includes(id))) return null;
      if (!raw.equipment || typeof raw.equipment !== "object" || Array.isArray(raw.equipment)) return null;
      const equipment = {};
      const holders = /* @__PURE__ */ new Set();
      for (const [item, card] of Object.entries(raw.equipment)) {
        if (!unlockedItems.includes(item) || !ids.has(card) || holders.has(card)) return null;
        equipment[item] = card;
        holders.add(card);
      }
      let lastBattle = null;
      if (raw.lastBattle !== null) {
        const b = raw.lastBattle;
        if (!b || typeof b.won !== "boolean" || !integer(b.stage, 1, 3) || !integer(b.rounds, 1, 30) || !integer(b.reward, 0, 80)) return null;
        lastBattle = { won: b.won, stage: b.stage, rounds: b.rounds, reward: b.reward };
      }
      return { version: VERSION, gameId, seed: config.seed, rng: raw.rng, gold: raw.gold, draws: raw.draws, nextId: raw.nextId, cards, party: [...raw.party], ownedItems: [...unlockedItems], equipment, cleared: raw.cleared, wins: raw.wins, losses: raw.losses, lastBattle };
    }
    const assertState = (state) => validateState2(state) || fail("INVALID_SAVE");
    function serializeState2(state) {
      return JSON.stringify(assertState(state));
    }
    function deserializeState2(text) {
      if (typeof text !== "string" || text.length > 1e5) return null;
      try {
        return validateState2(JSON.parse(text));
      } catch {
        return null;
      }
    }
    function drawCard2(state) {
      const next = assertState(state);
      if (next.gold < 12) fail("NOT_ENOUGH_GOLD");
      if (next.cards.length >= 114) fail("COLLECTION_FULL");
      const roll = nextRandom2(next.rng);
      next.rng = roll.rng;
      next.gold -= 12;
      next.draws++;
      const card = { id: "c" + next.nextId++, beast: beasts[Math.floor(roll.value * beasts.length)].id, star: 1 };
      next.cards.push(card);
      return { state: next, card: { ...card } };
    }
    function mergeGroups2(state) {
      const groups = [];
      for (const beast of beasts) for (let star = 1; star < 3; star++) {
        const cards = state.cards.filter((c) => c.beast === beast.id && c.star === star);
        if (cards.length >= 3) groups.push({ beast: beast.id, star, ids: cards.slice(0, 3).map((c) => c.id), count: cards.length });
      }
      return groups;
    }
    function mergeCards2(state, cardIds) {
      const next = assertState(state);
      if (!Array.isArray(cardIds) || cardIds.length !== 3 || new Set(cardIds).size !== 3) fail("MERGE_REQUIRES_THREE");
      const cards = cardIds.map((id) => next.cards.find((c) => c.id === id));
      if (cards.some((c) => !c) || cards.some((c) => c.beast !== cards[0].beast || c.star !== cards[0].star) || cards[0].star >= 3) fail("MERGE_MISMATCH");
      const retained = cards.find((c) => next.party.includes(c.id)) || cards[0];
      const result = { ...retained, star: retained.star + 1 };
      next.cards = next.cards.filter((c) => !cardIds.includes(c.id) || c.id === retained.id).map((c) => c.id === retained.id ? result : c);
      next.party = [...new Set(next.party.map((id) => cardIds.includes(id) ? retained.id : id))];
      const equipped = Object.keys(next.equipment).filter((item) => cardIds.includes(next.equipment[item]));
      const kept = equipped.find((item) => next.equipment[item] === retained.id) || equipped[0];
      for (const item of equipped) {
        if (item === kept) next.equipment[item] = retained.id;
        else delete next.equipment[item];
      }
      for (const card of next.cards) if (next.party.length < 4 && !next.party.includes(card.id)) next.party.push(card.id);
      return next;
    }
    function equipItem2(state, itemId, cardId) {
      const next = assertState(state);
      if (!next.ownedItems.includes(itemId)) fail("ITEM_LOCKED");
      if (cardId === null) {
        delete next.equipment[itemId];
        return next;
      }
      if (!next.cards.some((c) => c.id === cardId)) fail("CARD_NOT_FOUND");
      for (const item of Object.keys(next.equipment)) if (next.equipment[item] === cardId) delete next.equipment[item];
      next.equipment[itemId] = cardId;
      return next;
    }
    function setParty2(state, ids) {
      const next = assertState(state);
      if (!Array.isArray(ids) || ids.length < 1 || ids.length > 4 || new Set(ids).size !== ids.length || ids.some((id) => !next.cards.some((c) => c.id === id))) fail("INVALID_PARTY");
      next.party = [...ids];
      return next;
    }
    function cardStats2(state, cardOrId) {
      const card = typeof cardOrId === "string" ? state.cards.find((c) => c.id === cardOrId) : cardOrId;
      if (!card) fail("CARD_NOT_FOUND");
      const beast = beasts.find((b) => b.id === card.beast);
      if (!beast) fail("CARD_NOT_FOUND");
      const factor = [0, 1, 1.85, 3.25][card.star];
      const item = items.find((i) => state.equipment[i.id] === card.id);
      return { attack: Math.round(beast.attack * factor) + (item?.attack || 0), health: Math.round(beast.health * factor) + (item?.health || 0), armor: beast.armor + (card.star - 1) * 2 + (item?.armor || 0), item: item?.id || null };
    }
    function autoParty2(state) {
      const next = assertState(state);
      next.party = [...next.cards].sort((a, b) => {
        const sa = cardStats2(next, a), sb = cardStats2(next, b);
        return sb.attack * 3 + sb.health + sb.armor * 4 - (sa.attack * 3 + sa.health + sa.armor * 4);
      }).slice(0, 4).map((c) => c.id);
      next.party.sort((a, b) => cardStats2(next, b).health - cardStats2(next, a).health);
      return next;
    }
    function availableStages2(state) {
      return stages.map((s) => ({ ...s, unlocked: s.id <= state.cleared + 1, completed: s.id <= state.cleared }));
    }
    function startBattle2(state, stageId) {
      const next = assertState(state);
      const stage = stages.find((s) => s.id === stageId);
      if (!stage || stageId > next.cleared + 1) fail("STAGE_LOCKED");
      const allies = next.party.map((id) => {
        const card = next.cards.find((c) => c.id === id);
        const stats = cardStats2(next, card);
        return { ...card, ...stats, hp: stats.health, name: beasts.find((b) => b.id === card.beast).name };
      });
      const enemies = stage.enemies.map((e, i) => ({ ...e, id: "e" + i, hp: e.health, name: language === "en" ? e.en : e.name }));
      const initialAllies = clone(allies), initialEnemies = clone(enemies), events = [];
      let rounds = 0;
      const alive = (list) => list.filter((c) => c.hp > 0);
      const heal = (actor, target, amount, round) => {
        const actual = Math.min(amount, target.health - target.hp);
        if (actual > 0) {
          target.hp += actual;
          events.push({ kind: "heal", side: "ally", actor: actor.id, target: target.id, amount: actual, remaining: target.hp, round });
        }
      };
      const hit = (actor, target, multiplier, side, round, skill = false) => {
        const roll = nextRandom2(next.rng);
        next.rng = roll.rng;
        const ward = side === "enemy" && alive(allies).some((a) => a.beast === "turtle") ? 3 : 0;
        const armor = actor.beast === "serpent" ? 0 : target.armor;
        const damage = Math.max(1, Math.round(actor.attack * multiplier * (0.94 + roll.value * 0.12)) - armor - ward);
        target.hp = Math.max(0, target.hp - damage);
        events.push({ kind: "attack", side, actor: actor.id, target: target.id, amount: damage, remaining: target.hp, round, skill });
      };
      for (let round = 1; round <= 30 && alive(allies).length && alive(enemies).length; round++) {
        rounds = round;
        events.push({ kind: "round", round });
        for (const actor of alive(allies)) {
          const target = alive(enemies)[0];
          if (!target) break;
          const skill = round % 3 === 0;
          if (actor.beast === "deer" && skill) {
            const targetAlly = [...alive(allies)].sort((a, b) => b.health - b.hp - (a.health - a.hp))[0];
            heal(actor, targetAlly, 25 * actor.star, round);
          }
          const multiplier = actor.beast === "fox" && skill ? 2 : actor.beast === "tiger" && target.hp < target.health / 2 ? 1.5 : 1;
          hit(actor, target, multiplier, "ally", round, multiplier > 1);
          if (actor.beast === "crane" && skill) for (const extra of alive(enemies).filter((e) => e.id !== target.id)) hit(actor, extra, 0.55, "ally", round, true);
          if (actor.beast === "serpent") heal(actor, actor, 5 * actor.star, round);
        }
        for (const actor of alive(enemies)) {
          const target = alive(allies)[0];
          if (!target) break;
          hit(actor, target, 1, "enemy", round);
        }
      }
      const won = alive(enemies).length === 0;
      const firstClear = won && next.cleared < stageId;
      const rewards = { gold: 0, cards: [], item: null };
      if (won) next.wins++;
      else next.losses++;
      if (firstClear) {
        next.cleared = stageId;
        next.gold += stage.reward;
        rewards.gold = stage.reward;
        const rewardBeast = stageId === 1 ? "fox" : stageId === 2 ? "crane" : null;
        if (rewardBeast && next.cards.length <= 118) for (let i = 0; i < 2; i++) {
          const card = { id: "c" + next.nextId++, beast: rewardBeast, star: 1 };
          next.cards.push(card);
          rewards.cards.push({ ...card });
        }
        const item = stageId === 1 ? "bell" : stageId === 2 ? "crown" : null;
        if (item) {
          next.ownedItems.push(item);
          rewards.item = item;
        }
      }
      next.lastBattle = { won, stage: stageId, rounds, reward: rewards.gold };
      return { state: next, battle: { won, firstClear, stage: stageId, rounds, events, allies: initialAllies, enemies: initialEnemies, rewards } };
    }
    return { VERSION, config, gameId, beasts, items, stages, hash, nextRandom: nextRandom2, createInitialState: createInitialState2, validateState: validateState2, serializeState: serializeState2, deserializeState: deserializeState2, drawCard: drawCard2, mergeGroups: mergeGroups2, mergeCards: mergeCards2, equipItem: equipItem2, setParty: setParty2, autoParty: autoParty2, cardStats: cardStats2, availableStages: availableStages2, startBattle: startBattle2 };
  }
  var defaultEngine = createGameEngine();
  var { createInitialState, validateState, serializeState, deserializeState, drawCard, mergeGroups, mergeCards, equipItem, setParty, autoParty, cardStats, availableStages, startBattle, nextRandom } = defaultEngine;
  var BEASTS = defaultEngine.beasts;
  var ITEMS = defaultEngine.items;
  var STAGES = defaultEngine.stages;

  // game/art.js
  function beastArt(beast, color = "#78d6b3", suffix = "art") {
    const c = /^#[0-9a-f]{6}$/i.test(color) ? color : "#78d6b3";
    const id = String(suffix).replace(/[^a-zA-Z0-9_-]/g, "").slice(0, 60) || "art";
    const illustrations = {
      deer: `<path d="M79 172Q77 150 94 134L132 121Q151 119 161 137L154 163 135 167 125 150 102 156 99 180 89 181 90 159"/><path d="M138 132Q125 112 132 94L143 81 157 82 163 96 150 112 155 140"/><path d="M139 89L121 77 124 67 140 78M155 86L175 73 174 65 159 76"/><path d="M141 82L133 60 137 39M134 61L117 51 114 37M134 57L149 45 148 30M155 82L163 57 159 35M162 58L180 47 184 32M164 51L176 30" fill="none" stroke-width="3"/><path d="M79 146L67 132 64 143 80 155M135 163L140 183 148 183 147 161"/><circle cx="152" cy="94" r="2.5" fill="#f4e5b2"/><path d="M104 136L115 132M99 142L107 139M119 139L125 136" stroke="#e9edc0" stroke-width="2"/><path d="M124 53Q119 39 129 37Q139 40 124 53M176 44Q180 29 191 35Q191 44 176 44" fill="#badb9c" stroke="none"/>`,
      fox: `<path d="M115 160Q64 179 51 143Q41 110 66 84Q57 119 85 122Q65 101 77 77Q79 106 105 110Q90 86 107 65Q105 98 130 115Q145 142 115 160"/><path d="M67 85Q60 102 66 115L57 124Q48 106 67 85M78 77Q78 92 86 102L75 107Q69 92 78 77M107 65Q103 81 112 94L101 99Q94 83 107 65" fill="#fff0c1" opacity=".75" stroke="none"/><path d="M105 155Q106 131 125 123L155 127 166 155 154 174 125 174Z"/><path d="M124 135L119 99 117 70 139 88 154 87 174 68 171 102 159 123 145 137Z"/><path d="M123 80L128 101 136 94M167 79L158 98 167 101" fill="#774842" stroke="none"/><path d="M124 105L145 119 168 103 156 126 145 133 134 125Z" fill="#fff0c8" stroke="none"/><path d="M132 106L137 109M155 109L160 105" stroke="#213e3a" stroke-width="3"/><path d="M142 119L149 119 145 124Z" fill="#213e3a"/><path d="M131 153L127 178 136 179 144 158M152 152L152 178 163 178 160 153"/><path d="M145 97L141 104 148 104Z" fill="#f8df9c" stroke="none"/>`,
      crane: `<path d="M120 143Q81 147 65 114Q96 123 116 94L134 101 151 127Q142 145 120 143"/><path d="M117 114Q109 81 126 61Q140 50 151 61Q160 70 151 83L141 91 141 115"/><path d="M149 64L181 75 151 78Z" fill="#d7b86c"/><path d="M118 103Q90 65 55 70Q66 91 86 100Q62 95 46 91Q55 114 82 122Q105 129 125 122"/><path d="M127 110Q153 77 182 90L171 107 189 102Q179 125 150 130"/><path d="M85 85L110 109M73 96L105 117M162 99L142 119" fill="none" stroke="#f7f0d8" stroke-width="2"/><path d="M119 142L111 172 96 181M135 140L138 169 153 179M107 177L118 182M145 174L142 183" fill="none" stroke="#d9b86f" stroke-width="3"/><circle cx="143" cy="68" r="2.4" fill="#183b3c"/><path d="M128 61Q140 49 150 59" fill="none" stroke="#e9c795" stroke-width="5"/><path d="M151 69Q166 52 160 41" fill="none" stroke="#eef3e8" stroke-width="2"/>`,
      turtle: `<path d="M66 150L59 170 74 174 89 156M136 151L145 176 161 173 155 151"/><path d="M64 137L46 145 58 152 73 149"/><path d="M153 130Q168 108 184 116L195 133Q195 150 174 153L151 146"/><path d="M68 142Q67 91 109 82Q151 82 163 141Q117 166 68 142Z"/><path d="M74 136L97 119 119 124 143 112 157 137M97 119L96 96M119 124L117 88M119 124L121 150M143 112L136 95M97 119L91 150" fill="none" stroke="#315d50" stroke-width="3"/><path d="M76 109L91 84 100 89 114 59 126 77 139 68 151 112" fill="#547c5c"/><path d="M98 89L111 62 118 80 113 77 108 86M130 83L139 70 143 91" fill="#d6dfac" stroke="none"/><path d="M92 86Q82 68 92 64Q106 64 100 83M123 69Q119 45 131 46Q143 53 130 70" fill="#8cb883" stroke="none"/><circle cx="180" cy="130" r="3" fill="#1e3e32"/><path d="M178 142L190 140M67 148Q109 175 162 147" fill="none" stroke="#dfe3ad" stroke-width="3"/>`,
      tiger: `<path d="M92 153Q58 160 57 138Q56 124 43 127Q60 112 67 130Q69 145 94 137" fill="none" stroke-width="9"/><path d="M84 146Q79 116 102 109L143 111Q165 123 157 153L142 166 105 162Z"/><path d="M104 126L99 93 104 68 121 84 143 82 163 67 165 96 156 120 132 135Z"/><path d="M103 70L100 56 113 72M160 70L169 56 166 81" fill="#f2dc9b"/><path d="M108 78L113 95 120 88M157 77L144 90 158 97" fill="#706143" stroke="none"/><path d="M114 111L130 119 150 109 141 125 129 129 119 123" fill="#f5e5ba" stroke="none"/><path d="M112 103L121 106M142 106L152 101M126 118L133 118" stroke="#29433a" stroke-width="3"/><path d="M130 88L126 99 134 99ZM91 124L103 132 92 136M96 144L109 150 98 154M151 133L139 140 155 144" fill="#6b6045" stroke="none"/><path d="M108 152L104 178 118 179 124 153M140 152L144 179 157 178 153 148"/><path d="M128 109L133 109" stroke="#f9d56c" stroke-width="2"/>`,
      serpent: `<path d="M80 160Q48 140 68 113Q83 97 109 111Q136 125 150 112Q166 97 147 82Q170 82 178 100Q190 132 158 144Q136 156 110 139Q86 122 78 136Q69 149 92 160Q133 178 163 157Q141 192 102 177Q62 172 57 154Q68 162 80 160Z"/><path d="M143 90L128 75 128 57 142 44 158 48 166 66 156 83Z"/><path d="M137 51L126 36 133 27M155 51L168 33 165 24" fill="none" stroke="#f3deb0" stroke-width="3"/><path d="M130 62L112 56 123 70M160 62L178 55 167 70" fill="#dfd2f0"/><path d="M130 75L146 84 160 70 152 88 142 94Z" fill="#f0e9d5" stroke="none"/><path d="M137 65L141 67M151 66L156 63" stroke="#243e43" stroke-width="2.8"/><path d="M143 76L148 76" stroke="#243e43" stroke-width="2"/><path d="M91 119L94 126M103 123L106 132M118 133L119 141M135 137L134 146M151 133L154 141M162 121L168 125" stroke="#eee2f2" stroke-width="2"/><path d="M140 84Q119 92 112 78M157 81Q174 89 182 74" fill="none" stroke="#e4d4ee" stroke-width="1.8"/><path d="M143 54L146 49 150 55 146 60Z" fill="#f4df9b" stroke="none"/>`
    };
    return `<svg viewBox="0 0 240 210" xmlns="http://www.w3.org/2000/svg" aria-hidden="true" focusable="false"><defs><radialGradient id="glow-${id}"><stop stop-color="${c}" stop-opacity=".25"/><stop offset="1" stop-color="${c}" stop-opacity="0"/></radialGradient><linearGradient id="fur-${id}" x2=".7" y2="1"><stop stop-color="${c}"/><stop offset="1" stop-color="#456d63"/></linearGradient></defs><circle cx="120" cy="108" r="98" fill="url(#glow-${id})"/><circle cx="120" cy="100" r="67" fill="none" stroke="${c}" stroke-opacity=".2"/><circle cx="120" cy="100" r="74" fill="none" stroke="${c}" stroke-opacity=".1" stroke-dasharray="2 7"/><path d="M29 173Q63 155 99 173T213 166M42 186Q92 174 125 182T199 177" fill="none" stroke="${c}" stroke-opacity=".25"/><g fill="url(#fur-${id})" stroke="${c}" stroke-width="1.5" stroke-linejoin="round" stroke-linecap="round">${illustrations[beast] || illustrations.deer}</g><g fill="#e9d69f"><path d="M48 66l2-5 2 5 5 2-5 2-2 5-2-5-5-2z" opacity=".6"/><path d="M191 143l1.5-4 1.5 4 4 1.5-4 1.5-1.5 4-1.5-4-4-1.5z" opacity=".65"/><circle cx="188" cy="90" r="1.3"/><circle cx="83" cy="43" r="1.2"/><circle cx="41" cy="119" r="1"/></g></svg>`;
  }
  function mountainArt() {
    return `<svg viewBox="0 0 1000 350" xmlns="http://www.w3.org/2000/svg" preserveAspectRatio="xMidYMax slice" aria-hidden="true"><defs><linearGradient id="mountain-fade" x2="0" y2="1"><stop stop-color="#70ad99" stop-opacity=".3"/><stop offset="1" stop-color="#132e2b" stop-opacity="0"/></linearGradient></defs><circle cx="770" cy="83" r="46" fill="#d8c58b" opacity=".18"/><circle cx="770" cy="83" r="59" fill="none" stroke="#d8c58b" opacity=".12"/><path d="M0 282L98 190 169 233 299 81 369 163 415 127 549 261 643 169 737 238 834 102 1000 250V350H0Z" fill="url(#mountain-fade)"/><path d="M0 318L148 227 240 269 365 153 459 254 530 225 631 314 757 211 832 257 926 193 1000 281V350H0Z" fill="#31594d" opacity=".3"/><path d="M0 334Q155 275 334 319T658 310T1000 303V350H0Z" fill="#577c68" opacity=".16"/><path d="M0 290Q230 252 452 288T1000 265M180 318Q475 281 803 300" fill="none" stroke="#b9d5be" stroke-width="2" opacity=".12"/></svg>`;
  }

  // game/render.js
  var escapeHTML = (value) => String(value).replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[c]);
  var safeJSON = (value) => JSON.stringify(value).replace(/[<>&\u2028\u2029]/g, (c) => "\\u" + c.charCodeAt(0).toString(16).padStart(4, "0"));
  function renderGame(options = {}) {
    const engine = createGameEngine(options);
    const { config } = engine;
    return `<!doctype html><html lang="${config.language === "en" ? "en" : "zh-CN"}"><head><meta charset="utf-8"><!--
MIT License

Copyright (c) 2026 a348579184

Permission is hereby granted, free of charge, to any person obtaining a copy
of this software and associated documentation files (the "Software"), to deal
in the Software without restriction, including without limitation the rights
to use, copy, modify, merge, publish, distribute, sublicense, and/or sell
copies of the Software, and to permit persons to whom the Software is
furnished to do so, subject to the following conditions:

The above copyright notice and this permission notice shall be included in all
copies or substantial portions of the Software.

THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,
FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE
AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER
LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM,
OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN THE
SOFTWARE.

All six spirit illustrations are original SVG artwork created for this game.
--><meta name="viewport" content="width=device-width,initial-scale=1"><meta name="color-scheme" content="dark"><title>${escapeHTML(config.title)}</title><style>${STYLES}</style></head><body><div class="ambient" aria-hidden="true"></div><div id="game-root"></div><div id="battle-root"></div><dialog id="modal" aria-labelledby="modal-title"></dialog><div id="toast" class="toast" role="status" aria-live="polite"></div><script type="application/json" id="mist-save">null<\/script><script>(${bootGame.toString()})(${safeJSON(config)},${createGameEngine.toString()},${beastArt.toString()},${mountainArt.toString()});<\/script></body></html>`;
  }
  function bootGame(config, createEngine, art, mountains) {
    "use strict";
    const engine = createEngine(config), en = config.language === "en";
    const t = (zh, english) => en ? english : zh;
    const esc = (value) => String(value).replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[c]);
    const root = document.getElementById("game-root"), battleRoot = document.getElementById("battle-root"), modal = document.getElementById("modal");
    const key = engine.gameId;
    let storageAvailable = true, damagedSave = false, state;
    try {
      const saved = localStorage.getItem(key);
      if (saved) {
        state = engine.deserializeState(saved);
        if (!state) damagedSave = true;
      }
    } catch {
      storageAvailable = false;
    }
    if (!state) {
      try {
        state = engine.deserializeState(document.getElementById("mist-save").textContent);
      } catch {
      }
    }
    state ||= engine.createInitialState();
    let selected = state.party[0], activeBattle = null, timer = null, toastTimer = null, speed = 1;
    const reducedMotion = typeof matchMedia === "function" && matchMedia("(prefers-reduced-motion: reduce)").matches;
    const beastFor = (card) => engine.beasts.find((b) => b.id === card.beast);
    const itemName = (item) => en ? item.en : item.name;
    const stageName = (stage) => en ? stage.en : stage.name;
    const stars = (n) => "★".repeat(n) + "☆".repeat(3 - n);
    const icon = (name) => ({ leaf: "❧", coin: "◈", sword: "↗", heart: "♡", armor: "◇", close: "×" })[name] || name;
    function toast(message) {
      clearTimeout(toastTimer);
      const el = document.getElementById("toast");
      el.textContent = message;
      el.classList.add("visible");
      toastTimer = setTimeout(() => el.classList.remove("visible"), 3600);
    }
    function save() {
      try {
        localStorage.setItem(key, engine.serializeState(state));
        storageAvailable = true;
      } catch {
        storageAvailable = false;
      }
    }
    function commit(next) {
      state = next;
      if (!state.cards.some((c) => c.id === selected)) selected = state.party[0];
      save();
      render();
    }
    const tag = (text, cls = "") => `<span class="tag ${cls}">${esc(text)}</span>`;
    function renderCard(card, index) {
      const beast = beastFor(card), stats = engine.cardStats(state, card), deployed = state.party.includes(card.id), chosen = selected === card.id;
      return `<article class="spirit-card ${chosen ? "selected" : ""} ${deployed ? "deployed" : ""}" style="--beast:${beast.color}" data-testid="card-${card.id}"><div class="card-corners" aria-hidden="true"></div><button class="card-select" id="select-${card.id}" data-action="select" data-id="${card.id}" aria-pressed="${chosen}" aria-label="${esc(beast.name + " " + card.star + t("星，选择灵兽", " star, select spirit"))}"><span class="card-top"><span class="stars" aria-label="${card.star} ${t("星", "stars")}">${stars(card.star)}</span><span class="card-index">${String(index + 1).padStart(2, "0")}</span></span><span class="beast-art">${art(card.beast, beast.color, card.id)}</span><span class="beast-name">${esc(beast.name)}</span><span class="beast-skill">${esc(en ? beast.skillEn : beast.skill)}</span><span class="card-stats"><span title="${t("攻击", "Attack")}" aria-label="${t("攻击", "Attack")} ${stats.attack}">${icon("sword")} ${stats.attack}</span><span title="${t("生命", "Health")}" aria-label="${t("生命", "Health")} ${stats.health}">${icon("heart")} ${stats.health}</span><span title="${t("护甲", "Armor")}" aria-label="${t("护甲", "Armor")} ${stats.armor}">${icon("armor")} ${stats.armor}</span></span></button><div class="card-bottom"><span class="equipped-label" title="${stats.item ? esc(itemName(engine.items.find((i) => i.id === stats.item))) : ""}">${stats.item ? "✧ " + esc(itemName(engine.items.find((i) => i.id === stats.item))) : t("未佩灵器", "No relic")}</span><button class="deploy-button ${deployed ? "on" : ""}" id="party-${card.id}" data-action="party" data-id="${card.id}" data-testid="party-${card.id}" aria-label="${esc((deployed ? t("收回 ", "Bench ") : t("出阵 ", "Deploy ")) + beast.name)}" aria-pressed="${deployed}">${deployed ? "✓ " + t("出阵", "Party") : "+ " + t("出阵", "Deploy")}</button></div></article>`;
    }
    function render() {
      const focusId = document.activeElement?.id;
      const groups = engine.mergeGroups(state), selectedCard = state.cards.find((c) => c.id === selected) || state.cards[0], beast = beastFor(selectedCard);
      const completed = state.cleared === 3;
      const objective = completed ? t("山海已明，灵契长存。你的雾岭之旅已圆满。", "The mountains shine again. Your covenant is complete.") : groups.length ? t("灵契共鸣已就绪：三只同名同星灵兽，可以合成更高星级。", "A covenant resonates: merge three matching spirits of the same star tier.") : state.cleared === 0 ? t("为出阵灵兽佩上灵器，然后出发「苔径初行」。", "Equip your party with relics, then explore The Moss Path.") : t("首通奖励带来了新伙伴。合成、佩器，继续走向云巅。", "First-clear gifts bring new companions. Merge, equip, and climb higher.");
      root.innerHTML = `<div class="app-shell"><header class="topbar"><a class="brand" href="#main" aria-label="${esc(config.title)}"><span class="brand-mark" aria-hidden="true">契</span><span><strong>${esc(config.title)}</strong><small>${t("山海之间 · 万物有灵", "BETWEEN MOUNTAIN & MIST")}</small></span></a><nav class="top-actions" aria-label="${t("游戏菜单", "Game menu")}"><button class="text-button" data-action="guide" id="guide" data-testid="help-button">${t("玩法手札", "Field guide")}</button><button class="text-button" data-action="download" id="download" data-testid="download-button">↓ <span>${t("离线珍藏", "Keep offline")}</span></button><button class="icon-button" data-action="reset" id="reset" data-testid="reset-button" aria-label="${t("重新开始游戏", "Reset game")}" title="${t("重新开始", "Reset game")}">↺</button></nav></header><main id="main"><section class="hero" aria-labelledby="hero-title"><div class="mountains">${mountains()}</div><div class="hero-copy"><div class="eyebrow"><span></span>${t("雾散之处，灵契初生", "A LITTLE WONDER IN THE WILDS")}</div><h1 id="hero-title">${completed ? t("云开见月，<em>归契山海。</em>", "Mist lifts.<em>The mountain remembers.</em>") : t("与山灵，<em>结一场奇遇。</em>", "Meet the spirits.<em>Make a little magic.</em>")}</h1><p>${t("召来六方山灵，融合同源灵契。<br>带上你的伙伴，走过这片温柔而神秘的雾岭。", "Gather six mountain spirits. Unite their ancient gifts.<br>With your companions, find a path through the mist.")}</p><div class="hero-meta">${tag(t("原创灵兽", "ORIGINAL SPIRITS"))}${tag(t("三境探索", "THREE CHAPTERS"))}${tag(t("无尽温柔 · 无需氪金", "NO GRIND · NO PURCHASES"))}</div></div><div class="summon-panel"><div class="summon-top"><span class="eyebrow">${t("山间灵泉", "THE SPIRIT SPRING")}</span><span class="currency" data-testid="gold">◈ <strong>${state.gold}</strong><small>${t("灵露", "dew")}</small></span></div><div class="summon-sigil" aria-hidden="true"><span>✧</span><i></i><b>契</b></div><button class="primary summon-button" data-action="draw" id="draw" data-testid="draw-button" ${state.gold < 12 || state.cards.length >= 114 ? "disabled" : ""}>${t("唤灵结契", "Summon a spirit")} <span>◈ 12</span></button><p class="fine-print">${t("每次唤来一位一星灵兽 · 六灵等概率", "One one-star spirit · six equally likely companions")}</p></div></section><section class="quest-strip ${completed ? "complete" : ""}" aria-label="${t("当前目标", "Current objective")}"><span class="quest-icon">${completed ? "✦" : "❧"}</span><div><strong>${completed ? t("灵契圆满", "Covenant complete") : t("行山小笺", "A note for the journey")}</strong><span>${objective}</span></div><span class="chapter-progress">${state.cleared} / 3 <span>${t("山印", "seals")}</span></span></section><div class="main-grid"><section class="collection" aria-labelledby="collection-title"><div class="section-heading"><div><div class="eyebrow">${t("与你同行", "YOUR COMPANIONS")}</div><h2 id="collection-title">${t("灵兽图卷", "Spirit collection")} <span>${state.cards.length.toString().padStart(2, "0")}</span></h2></div><button class="subtle-button" data-action="auto" id="auto-party" data-testid="auto-party">${t("自动布阵", "Best formation")} ↗</button></div><div class="party-strip"><span class="party-label">${t("出阵", "PARTY")} <b>${state.party.length}/4</b></span><div class="party-list">${state.party.map((id, i) => {
        const card = state.cards.find((c) => c.id === id);
        return `<button data-action="select" data-id="${id}" aria-label="${esc(t("阵位 ", "Position ") + (i + 1) + " " + beastFor(card).name)}" class="party-chip ${selected === id ? "active" : ""}"><span>${i === 0 ? "◇" : i + 1}</span>${esc(beastFor(card).name)}<small>${"★".repeat(card.star)}</small></button>`;
      }).join("")}</div><span class="frontline-note">${t("左侧先承伤", "Left takes hits first")}</span></div><div class="merge-bar ${groups.length ? "ready" : ""}" data-testid="merge-panel"><span>${groups.length ? "✦ " + t("同源共鸣", "Ready to merge") : "◇ " + t("三只同名、同星 → 升一星（最高三星）", "Three matching spirits → next tier (max 3★)")}</span>${groups.map((g) => `<button class="merge-button" id="merge-${g.beast}-${g.star}" data-action="merge" data-beast="${g.beast}" data-star="${g.star}" data-testid="merge-button">${esc(engine.beasts.find((b) => b.id === g.beast).name)} ×3 <span>→ ${g.star + 1}★</span></button>`).join("")}</div><div class="cards-grid">${state.cards.map(renderCard).join("")}</div><section class="inspector" aria-labelledby="selected-name" data-testid="selected-card"><div class="inspector-art">${art(selectedCard.beast, beast.color, "detail")}</div><div class="inspector-copy"><div class="eyebrow">${t("灵兽志", "SPIRIT NOTES")} · ${esc(en ? beast.skillEn : beast.skill)}</div><h3 id="selected-name">${esc(beast.name)} <span class="stars">${stars(selectedCard.star)}</span></h3><p>${esc(beast.description)}</p><p class="skill-detail">${esc(en ? beast.detailEn : beast.detail)}</p>${state.party.includes(selected) && state.party[0] !== selected ? `<button class="text-button" data-action="front" id="move-front">${t("移至前排承伤", "Move to the front line")} →</button>` : ""}</div></section><section class="equipment" aria-labelledby="equipment-title"><div class="section-heading compact"><div><div class="eyebrow">${t("山川赠礼", "GIFTS OF THE MOUNTAIN")}</div><h2 id="equipment-title">${t("灵器行囊", "Relic satchel")}</h2></div><span class="section-note">${t("每位灵兽可佩一件", "One relic per spirit")}</span></div><div class="equipment-grid">${engine.items.map((item) => {
        const unlocked = state.ownedItems.includes(item.id), holder = state.cards.find((c) => c.id === state.equipment[item.id]);
        return `<div class="relic ${unlocked ? "" : "locked"}"><span class="relic-icon" aria-hidden="true">${item.icon}</span><div class="relic-copy"><h3>${esc(itemName(item))}</h3><p>${esc(en ? item.descriptionEn : item.description)}</p><span>${holder ? esc(beastFor(holder).name) + " · " + t("已佩戴", "equipped") : unlocked ? t("静候有缘灵兽", "Awaiting a companion") : t("通关第 ", "Clear chapter ") + (item.id === "bell" ? "1" : "2") + t(" 境解锁", " to unlock")}</span></div>${unlocked ? `<div class="relic-actions"><button class="subtle-button" data-action="equip" data-item="${item.id}" id="equip-${item.id}" data-testid="equip-${item.id}" aria-label="${esc(t("给", "Equip ") + beast.name + t("佩戴", " with ") + itemName(item))}" ${holder?.id === selected ? "disabled" : ""}>${t("给所选灵兽", "Equip selected")}</button>${holder ? `<button class="text-button" data-action="unequip" data-item="${item.id}" id="unequip-${item.id}" aria-label="${esc(t("卸下", "Remove ") + itemName(item))}">${t("卸下", "Remove")}</button>` : ""}</div>` : '<span class="lock-symbol" aria-hidden="true">◇</span>'}</div>`;
      }).join("")}</div></section></section><aside class="journey" aria-labelledby="journey-title"><div class="section-heading"><div><div class="eyebrow">${t("循雾而行", "FOLLOW THE MIST")}</div><h2 id="journey-title">${t("雾岭三境", "The mountain trail")}</h2></div><span class="trail-mark" aria-hidden="true">山</span></div><div class="stages">${engine.availableStages(state).map((stage) => `<article class="stage ${stage.unlocked ? "" : "locked"} ${stage.completed ? "cleared" : ""}" data-testid="stage-${stage.id}"><div class="stage-number">0${stage.id}<span>${stage.completed ? "✓" : stage.unlocked ? "✦" : "◇"}</span></div><div class="stage-landscape landscape-${stage.id}" aria-hidden="true"><i></i><b></b><span></span></div><div class="stage-content"><div class="stage-status">${stage.completed ? t("山印已得", "SEAL RECOVERED") : stage.unlocked ? t("此境已开启", "READY TO EXPLORE") : t("前境通关后开启", "CLEAR PREVIOUS CHAPTER")}</div><h3>${esc(stageName(stage))}</h3><p>${esc(en ? stage.subtitleEn : stage.subtitle)}</p><div class="stage-reward">${t("首通", "First clear")} <span>◈ ${stage.reward}</span>${stage.id < 3 ? " · " + t("灵兽 ×2 · 灵器", "2 spirits · a relic") : " · " + t("山海圆契", "the final covenant")}</div><button class="${stage.unlocked && !stage.completed ? "primary" : "stage-button"}" data-action="battle" data-stage="${stage.id}" id="stage-button-${stage.id}" data-testid="battle-${stage.id}" ${stage.unlocked ? "" : "disabled"}>${stage.completed ? t("重访此境", "Revisit chapter") : stage.unlocked ? t("携灵入境", "Enter the mist") : t("云雾未散", "Veiled in mist")}<span>${stage.unlocked ? "→" : "◇"}</span></button></div></article>`).join("")}</div><div class="trail-note"><span aria-hidden="true">☽</span><p>${t("战斗自动进行，伙伴每战满血。<br>失利不损失灵露，重访不重复领奖。<br>合成与灵器，比盲目唤灵更重要。", "Battles play automatically; spirits start fully healed.<br>Defeat costs nothing. Rewards are first-clear only.<br>Merging and relics matter more than endless summons.")}</p></div>${state.lastBattle ? `<div class="last-battle" data-testid="last-battle"><strong>${state.lastBattle.won ? "✦ " + t("上次凯旋", "Last victory") : "◇ " + t("上次历练", "Last expedition")}</strong><span>${esc(stageName(engine.stages[state.lastBattle.stage - 1]))} · ${state.lastBattle.rounds} ${t("回合", "rounds")}</span></div>` : ""}</aside></div></main><footer><span><i class="save-dot ${storageAvailable ? "" : "warning"}"></i><span data-testid="save-status">${storageAvailable ? t("进度已自动珍藏于此浏览器", "Progress saved in this browser") : t("浏览器存储不可用 · 请下载离线珍藏保留进度", "Storage unavailable · download to keep your progress")}</span></span><span class="seed-label">${t("山岚种子", "WORLD SEED")} <code>${esc(config.seed)}</code></span><span>${t("六灵皆为原创 · 无联网请求", "Six original spirits · entirely offline")}</span></footer></div>`;
      if (focusId) document.getElementById(focusId)?.focus({ preventScroll: true });
    }
    function errorMessage(error) {
      const map = { NOT_ENOUGH_GOLD: t("灵露不足。首通山境可获得更多灵露。", "Not enough dew. Clear a new chapter to earn more."), COLLECTION_FULL: t("图卷已满，请先合成灵兽。", "Collection full. Merge spirits to make room."), INVALID_PARTY: t("请保留 1 至 4 位出阵灵兽。", "Keep between one and four spirits in your party."), STAGE_LOCKED: t("先通关前一境，雾才会散。", "Clear the previous chapter first."), MERGE_MISMATCH: t("需要三只同名、同星的灵兽。", "Merge three matching spirits at the same star tier.") };
      return map[error.message] || t("这次操作未能完成，请重试。", "That action could not be completed. Please try again.");
    }
    function openModal(content) {
      modal.innerHTML = content;
      modal.showModal();
    }
    function guide() {
      openModal(`<div class="dialog-heading"><span class="eyebrow">${t("一卷行山手札", "A TRAVELER’S FIELD GUIDE")}</span><button class="icon-button" data-dialog="close" aria-label="${t("关闭", "Close")}">×</button></div><h2 id="modal-title">${t("与六灵，慢慢相识。", "A covenant, one companion at a time.")}</h2><div class="guide-steps"><p><b>01 · ${t("先合成", "Merge first")}</b>${t("开局已有三只一星青岚鹿。点击「同源共鸣」将它们合为一只二星灵兽，战力大幅提升。最高可达三星；佩戴的灵器会保留一件，其余回到行囊。", "You begin with three one-star Jadeharts. Merge them into a stronger two-star spirit. The maximum tier is three stars. One equipped relic is retained; any others return to your satchel.")}</p><p><b>02 · ${t("再布阵", "Form your party")}</b>${t("最多四位灵兽出阵，左侧先承受攻击。选中灵兽后可佩戴灵器、移到前排；每位可佩一件。自动布阵会优先选择强大的伙伴。", "Deploy up to four spirits. The leftmost takes hits first. Select a spirit to equip a relic or move it to the front. Each holds one relic. Best formation selects your strongest companions.")}</p><p><b>03 · ${t("入境探索", "Explore the trail")}</b>${t("每场战斗自动进行，三回合触发部分灵技。每战开始恢复全部生命，失败不消耗资源。首通第一、二境各赠同源灵兽两只及一件灵器，足以让队伍不断成长。", "Battles run automatically, with several skills triggering every third round. Everyone starts at full health; defeats cost nothing. The first two chapters each grant two matching spirits and a relic—enough to grow without grinding.")}</p><p><b>04 · ${t("珍藏旅程", "Keep your journey")}</b>${t("每次操作都会自动保存。离线珍藏会下载包含当前存档的完整 HTML 文件，双击即可继续，无需联网。清除浏览器数据会删除本地进度；重置前会再次确认。", "Every action is saved automatically. Keep offline downloads the complete game with your current save; open the HTML file to continue without a connection. Clearing browser data removes local saves. Reset always asks for confirmation.")}</p></div><button class="primary" data-dialog="close">${t("记下了，出发吧", "Got it. Let’s explore.")}</button>`);
    }
    function askReset() {
      openModal(`<div class="dialog-heading"><span class="eyebrow">${t("重启山间奇遇", "A FRESH BEGINNING")}</span><button class="icon-button" data-dialog="close" aria-label="${t("取消", "Cancel")}">×</button></div><h2 id="modal-title">${t("让一切回到初见？", "Begin the journey again?")}</h2><p class="dialog-copy">${t("这将清除当前灵兽、灵器与山境进度。山岚种子不变。你可以先下载离线珍藏，留下这段旅程。", "This clears your spirits, relics, and chapter progress. The world seed stays the same. Download an offline copy first if you’d like to keep this journey.")}</p><div class="dialog-actions"><button class="subtle-button" data-dialog="close" data-testid="cancel-reset">${t("继续这段旅程", "Keep my journey")}</button><button class="danger-button" data-dialog="confirm-reset" data-testid="confirm-reset">${t("确认重新开始", "Reset my progress")}</button></div>`);
    }
    function download() {
      const copy = document.documentElement.cloneNode(true);
      copy.querySelector("#mist-save").textContent = engine.serializeState(state).replace(/</g, "\\u003c");
      copy.querySelector("#modal").removeAttribute("open");
      copy.querySelector("#modal").innerHTML = "";
      copy.querySelector("#battle-root").innerHTML = "";
      copy.querySelector("#toast").className = "toast";
      copy.querySelector("#toast").textContent = "";
      const blob = new Blob(["<!doctype html>\n" + copy.outerHTML], { type: "text/html;charset=utf-8" });
      const url = URL.createObjectURL(blob), link = document.createElement("a");
      link.href = url;
      link.download = config.title.replace(/[\\/:*?"<>|\u0000-\u001f]/g, "_").slice(0, 64) + ".html";
      document.body.append(link);
      link.click();
      link.remove();
      setTimeout(() => URL.revokeObjectURL(url), 1e3);
      toast(t("完整游戏与当前存档已打包。愿山灵一路相伴。", "Your complete game and save are packed for an offline journey."));
    }
    function battleUnit(unit, side) {
      const beast = side === "ally" ? engine.beasts.find((b) => b.id === unit.beast) : null;
      return `<div class="battle-unit ${side}" data-unit="${unit.id}"><div class="battle-portrait">${beast ? art(unit.beast, beast.color, "battle-" + unit.id) : `<svg viewBox="0 0 100 100" aria-hidden="true"><path d="M20 72L32 43 27 28 43 34 51 18 61 35 79 30 72 48 84 72 65 84 39 86Z" fill="#445c64" stroke="#8fa8b1"/><path d="M31 58L43 61M60 61L72 55" stroke="#d8c48b" stroke-width="3"/><path d="M44 74Q53 69 62 72" fill="none" stroke="#aec5c4"/></svg>`}</div><strong>${esc(unit.name)}</strong><div class="health-track" role="meter" aria-label="${esc(unit.name)} ${t("生命", "health")}" aria-valuemin="0" aria-valuemax="${unit.health}" aria-valuenow="${unit.hp}"><i style="width:${unit.hp / unit.health * 100}%"></i></div><small data-hp="${unit.id}">${unit.hp} / ${unit.health}</small><span class="floating-damage" aria-hidden="true"></span></div>`;
    }
    function beginBattle(stageId) {
      const result = engine.startBattle(state, stageId);
      commit(result.state);
      activeBattle = { ...result.battle, cursor: 0, units: [...result.battle.allies, ...result.battle.enemies].map((u) => ({ ...u })), done: false };
      root.inert = true;
      battleRoot.innerHTML = `<div class="battle-backdrop"><section class="battle-dialog" role="dialog" aria-modal="true" aria-labelledby="battle-title" tabindex="-1"><div class="battle-header"><div><div class="eyebrow">${t("灵契交锋", "COVENANTS IN MOTION")}</div><h2 id="battle-title">${esc(stageName(engine.stages[stageId - 1]))}</h2></div><div class="battle-controls"><button class="subtle-button" data-battle="speed" data-testid="battle-speed">1×</button><button class="text-button" data-battle="skip" data-testid="skip-battle">${t("快进至结果", "Skip to result")} →</button></div></div><div class="battle-round" data-testid="battle-round">${t("灵兽蓄势，雾境初开", "Spirits gather. The mist opens.")}<span></span></div><div class="battle-field"><div class="battle-team allies">${activeBattle.allies.map((u) => battleUnit(u, "ally")).join("")}</div><div class="versus" aria-hidden="true">✧</div><div class="battle-team enemies">${activeBattle.enemies.map((u) => battleUnit(u, "enemy")).join("")}</div></div><div class="battle-log" role="log" aria-label="${t("战斗记录", "Battle log")}" aria-live="off" data-testid="battle-log"></div><div class="battle-result" data-testid="battle-result"></div></section></div>`;
      battleRoot.querySelector(".battle-dialog").focus();
      timer = setTimeout(battleStep, reducedMotion ? 80 : 550);
    }
    function updateUnit(id, remaining, amount, heal, fast) {
      const unit = activeBattle.units.find((u) => u.id === id);
      unit.hp = remaining;
      const el = battleRoot.querySelector(`[data-unit="${id}"]`), meter = el.querySelector('[role="meter"]');
      meter.setAttribute("aria-valuenow", String(remaining));
      meter.querySelector("i").style.width = remaining / unit.health * 100 + "%";
      el.querySelector("[data-hp]").textContent = remaining + " / " + unit.health;
      el.classList.toggle("fallen", remaining === 0);
      if (!fast && !reducedMotion) {
        const number = el.querySelector(".floating-damage");
        number.textContent = (heal ? "+" : "−") + amount;
        number.classList.toggle("healing", heal);
        number.classList.remove("animate");
        void number.offsetWidth;
        number.classList.add("animate");
      }
    }
    function applyEvent(event, fast) {
      const log = battleRoot.querySelector(".battle-log");
      if (event.kind === "round") {
        battleRoot.querySelector(".battle-round").textContent = t("第 ", "Round ") + event.round + t(" 回合", "");
        const row = document.createElement("p");
        row.className = "log-round";
        row.textContent = "— " + t("第 ", "Round ") + event.round + t(" 回合", "") + " —";
        log.append(row);
      } else {
        const actor = activeBattle.units.find((u) => u.id === event.actor), target = activeBattle.units.find((u) => u.id === event.target);
        updateUnit(event.target, event.remaining, event.amount, event.kind === "heal", fast);
        const row = document.createElement("p");
        row.className = event.kind === "heal" ? "log-heal" : event.side === "enemy" ? "log-enemy" : "log-ally";
        row.textContent = event.kind === "heal" ? t(`${actor.name} 为 ${target.name} 恢复 ${event.amount} 点生命`, `${actor.name} heals ${target.name} for ${event.amount}`) : t(`${actor.name}${event.skill ? " 施展灵技，" : " → "}${target.name} −${event.amount}${event.remaining === 0 ? " · 退场" : ""}`, `${actor.name}${event.skill ? " uses a skill on " : " → "}${target.name} −${event.amount}${event.remaining === 0 ? " · fallen" : ""}`);
        log.append(row);
      }
      log.scrollTop = log.scrollHeight;
    }
    function battleStep() {
      if (!activeBattle || activeBattle.done) return;
      if (activeBattle.cursor >= activeBattle.events.length) {
        finishBattle();
        return;
      }
      const event = activeBattle.events[activeBattle.cursor++];
      applyEvent(event, false);
      timer = setTimeout(battleStep, (event.kind === "round" ? 580 : 330) / speed);
    }
    function finishBattle() {
      clearTimeout(timer);
      timer = null;
      if (!activeBattle) return;
      activeBattle.done = true;
      const b = activeBattle;
      const box = battleRoot.querySelector(".battle-result");
      box.innerHTML = `<div class="result-mark">${b.won ? "✦" : "☽"}</div><div><h3>${b.won ? b.stage === 3 && b.firstClear ? t("雾散月明，灵契圆满！", "The mist lifts. Your covenant is complete!") : t("山境已明，携灵而归。", "A seal recovered. A path revealed.") : t("暂歇一程，再赴山海。", "Rest a while. The mountain will wait.")}</h3><p>${b.won ? b.firstClear ? t(`首通奖励：灵露 +${b.rewards.gold}`, `First-clear reward: +${b.rewards.gold} dew`) + (b.rewards.cards.length ? t(" · 同源灵兽 ×2 · 新灵器 ×1", " · 2 matching spirits · 1 new relic") : "") : t("重访不重复获得奖励。伙伴们又多了一段山间回忆。", "No repeat rewards, just another memory of the mountain.") : t("没有失去任何资源。试试合成升星、佩戴灵器，并让高生命伙伴站在前排。", "Nothing was lost. Try merging, equipping relics, and putting a sturdy spirit in front.")}</p><small>${b.rounds} ${t("回合 · 全体伙伴已恢复生命", "rounds · all companions fully restored")}</small></div><button class="primary" data-battle="close" data-testid="close-battle">${t("回到山间", "Back to the trail")} →</button>`;
      battleRoot.querySelector(".battle-controls").hidden = true;
      box.setAttribute("role", "status");
      box.querySelector("button").focus({ preventScroll: true });
    }
    function skipBattle() {
      if (!activeBattle || activeBattle.done) return;
      clearTimeout(timer);
      while (activeBattle.cursor < activeBattle.events.length) applyEvent(activeBattle.events[activeBattle.cursor++], true);
      finishBattle();
    }
    root.addEventListener("click", (event) => {
      const button = event.target.closest("[data-action]");
      if (!button || button.disabled || activeBattle) return;
      try {
        const action = button.dataset.action;
        if (action === "select") {
          selected = button.dataset.id;
          render();
        }
        if (action === "draw") {
          const result = engine.drawCard(state);
          selected = result.card.id;
          commit(result.state);
          toast(t("灵契结成 · ", "A covenant forms · ") + beastFor(result.card).name);
          document.getElementById("select-" + selected)?.scrollIntoView({ block: "nearest", behavior: reducedMotion ? "auto" : "smooth" });
        }
        if (action === "merge") {
          const group = engine.mergeGroups(state).find((g) => g.beast === button.dataset.beast && g.star === Number(button.dataset.star));
          if (group) {
            const next = engine.mergeCards(state, group.ids);
            selected = next.cards.find((c) => group.ids.includes(c.id)).id;
            commit(next);
            toast(t("同源归一，灵契升星！", "Three become one. Your covenant grows!"));
          }
        }
        if (action === "party") {
          const id = button.dataset.id;
          if (state.party.includes(id)) commit(engine.setParty(state, state.party.filter((c) => c !== id)));
          else if (state.party.length >= 4) toast(t("阵位已满，请先收回一位伙伴，或使用自动布阵。", "Your party is full. Bench a spirit first, or use Best formation."));
          else commit(engine.setParty(state, [...state.party, id]));
        }
        if (action === "auto") {
          commit(engine.autoParty(state));
          toast(t("阵容已整备，坚实的伙伴站在最前方。", "Formation ready, with a sturdy companion in front."));
        }
        if (action === "front") commit(engine.setParty(state, [selected, ...state.party.filter((id) => id !== selected)]));
        if (action === "equip") {
          commit(engine.equipItem(state, button.dataset.item, selected));
          toast(t("灵器已佩戴，原有灵器自动回到行囊。", "Relic equipped. Any previous relic returns to the satchel."));
        }
        if (action === "unequip") commit(engine.equipItem(state, button.dataset.item, null));
        if (action === "battle") beginBattle(Number(button.dataset.stage));
        if (action === "guide") guide();
        if (action === "reset") askReset();
        if (action === "download") download();
      } catch (error) {
        toast(errorMessage(error));
      }
    });
    modal.addEventListener("click", (event) => {
      const action = event.target.closest("[data-dialog]")?.dataset.dialog;
      if (action === "close") modal.close();
      if (action === "confirm-reset") {
        modal.close();
        selected = "c6";
        commit(engine.createInitialState());
        toast(t("山岚如初，新的奇遇已启程。", "A fresh mist. A new beginning."));
      }
    });
    battleRoot.addEventListener("click", (event) => {
      const button = event.target.closest("[data-battle]");
      if (!button) return;
      if (button.dataset.battle === "skip") skipBattle();
      if (button.dataset.battle === "speed") {
        speed = speed === 1 ? 2 : speed === 2 ? 4 : 1;
        button.textContent = speed + "×";
      }
      if (button.dataset.battle === "close" && activeBattle?.done) {
        const stage = activeBattle.stage;
        activeBattle = null;
        battleRoot.innerHTML = "";
        root.inert = false;
        document.getElementById("stage-button-" + stage)?.focus();
      }
    });
    document.addEventListener("keydown", (event) => {
      if (!activeBattle) return;
      if (event.key === "Escape") {
        event.preventDefault();
        if (activeBattle.done) battleRoot.querySelector('[data-battle="close"]').click();
        else skipBattle();
      }
      if (event.key === "Tab") {
        const focusable = [...battleRoot.querySelectorAll("button:not([disabled])")].filter((el) => !el.closest("[hidden]"));
        const first = focusable[0], last = focusable[focusable.length - 1];
        if (event.shiftKey && (document.activeElement === first || !focusable.includes(document.activeElement))) {
          event.preventDefault();
          last?.focus();
        } else if (!event.shiftKey && (document.activeElement === last || !focusable.includes(document.activeElement))) {
          event.preventDefault();
          first?.focus();
        }
      }
    });
    save();
    render();
    if (damagedSave) toast(t("旧存档无法读取，已安全开启新旅程。", "The previous save could not be read. A fresh journey is ready."));
    window.__MISTBOUND_READY__ = true;
  }
  var STYLES = `
:root{--bg:#0c201e;--panel:#142d29;--panel-2:#1a3630;--line:#b9c9a922;--ink:#edf1dc;--muted:#96b1a3;--gold:#e2c888;--teal:#8acdb5;--radius:18px;font-family:Inter,"PingFang SC","Microsoft YaHei",system-ui,sans-serif;color:var(--ink);background:var(--bg);font-synthesis:none;font-size:14px}*{box-sizing:border-box}body{margin:0;min-width:320px}button,a{-webkit-tap-highlight-color:transparent}button{font:inherit;cursor:pointer;color:inherit;transition:background .18s,border-color .18s,transform .18s}button:disabled{opacity:.43;cursor:not-allowed}button:not(:disabled):active{transform:translateY(1px)}button:focus-visible,a:focus-visible{outline:2px solid var(--gold);outline-offset:4px}a{color:inherit;text-decoration:none}button{border:1px solid transparent;background:none}h1,h2,h3,p{margin:0}button svg{pointer-events:none}svg{display:block;width:100%;height:100%}.ambient{position:fixed;inset:0;pointer-events:none;z-index:-1;background:radial-gradient(ellipse at 70% 0%,#3657453b,transparent 60%),radial-gradient(ellipse at 0% 60%,#1d514429,transparent 55%)}.app-shell{max-width:1440px;padding:0 48px;margin:auto}.topbar{min-height:94px;display:flex;align-items:center;justify-content:space-between;gap:20px;border-bottom:1px solid var(--line)}.brand{display:flex;gap:13px;align-items:center}.brand-mark{font-family:serif;width:43px;height:48px;display:grid;place-items:center;border:1px solid #d8c58666;border-radius:15px 15px 4px 4px;color:var(--gold);font-size:26px;background:linear-gradient(145deg,#b7be7f13,transparent);position:relative}.brand-mark:after{content:"";position:absolute;inset:4px;border:1px solid #d8c58622;border-radius:10px 10px 2px 2px}.brand strong{font-size:20px;font-family:"Songti SC","Noto Serif CJK SC",Georgia,serif;letter-spacing:3px;display:block}.brand small{display:block;color:var(--muted);font-size:9px;letter-spacing:2px;margin-top:5px}.top-actions{display:flex;align-items:center;gap:21px}.text-button{padding:7px 0;color:var(--muted);font-size:12px}.text-button:hover{color:var(--gold)}.icon-button{height:34px;width:34px;display:grid;place-items:center;border:1px solid var(--line);border-radius:50%;font-size:23px;color:var(--muted)}.icon-button:hover{background:#ffffff0a;color:var(--gold)}.hero{position:relative;isolation:isolate;display:grid;grid-template-columns:1fr 300px;gap:50px;align-items:center;min-height:350px;padding:48px 12px 38px;overflow:hidden}.mountains{position:absolute;inset:10px -50px -15px;z-index:-1;opacity:.85}.eyebrow{color:var(--gold);font-size:10px;font-weight:500;letter-spacing:2px;line-height:1.6}.hero .eyebrow{display:flex;align-items:center;gap:10px}.hero .eyebrow>span{height:1px;width:23px;background:var(--gold)}h1{font-family:"Songti SC","Noto Serif CJK SC",Georgia,serif;font-size:clamp(30px,3.4vw,47px);font-weight:500;letter-spacing:2px;line-height:1.4;margin:15px 0}h1 em{font-style:normal;color:#d8dec1;display:block}.hero-copy>p{color:#aac0af;font-size:12px;line-height:1.9;letter-spacing:.6px}.hero-meta{display:flex;gap:8px;flex-wrap:wrap;margin-top:24px}.tag{font-size:9px;letter-spacing:1px;border:1px solid #a4bda42b;border-radius:3px;padding:5px 8px;color:#a4bba9;background:#0c211c66}.summon-panel{align-self:center;padding:18px 20px 14px;border:1px solid #cfcc9733;border-radius:18px;background:linear-gradient(145deg,#223e31e6,#102821e6);position:relative;box-shadow:0 15px 60px #00000022}.summon-panel:before,.summon-panel:after{content:"✦";position:absolute;color:#c8bb7f55;font-size:9px;top:8px}.summon-panel:before{left:9px}.summon-panel:after{right:9px}.summon-top{display:flex;align-items:center;justify-content:space-between;gap:10px}.summon-top .eyebrow{font-size:9px;letter-spacing:1.5px}.currency{color:var(--gold);display:flex;align-items:baseline;gap:5px}.currency strong{font-family:Georgia,serif;font-size:27px;font-weight:400}.currency small{font-size:9px;color:var(--muted)}.summon-sigil{height:113px;position:relative;display:grid;place-items:center;color:var(--gold)}.summon-sigil:before,.summon-sigil:after,.summon-sigil i{content:"";position:absolute;border:1px solid #c9c88a44;width:67px;height:67px;transform:rotate(45deg);border-radius:10px}.summon-sigil:after{width:82px;height:82px;border-radius:50%;border-color:#a8c49622;transform:rotate(0)}.summon-sigil i{width:94px;height:94px;border-radius:50%;border-style:dashed;border-color:#a8c49618}.summon-sigil b{font-family:serif;font-size:34px;font-weight:400;text-shadow:0 0 20px #dbd38d77}.summon-sigil>span{position:absolute;right:62px;top:15px;font-size:20px}.primary{border:1px solid #e0cc93;background:linear-gradient(120deg,#e2cd97,#c9b377);color:#243c2e;border-radius:8px;padding:11px 16px;font-size:12px;font-weight:650;letter-spacing:1px;box-shadow:0 3px 10px #00000011}.primary:hover:not(:disabled){background:linear-gradient(120deg,#f1ddb0,#dfc58a);box-shadow:0 0 20px #dbc58a18}.summon-button{width:100%;display:flex;align-items:center;justify-content:center;gap:25px;padding:13px 16px}.summon-button>span{font-size:11px;opacity:.65;border-left:1px solid #41553844;padding-left:20px;letter-spacing:0}.fine-print{text-align:center;font-size:9px;color:var(--muted);margin-top:10px;line-height:1.7}.quest-strip{display:flex;align-items:center;gap:16px;padding:17px 22px;border:1px solid #9cbd9633;background:linear-gradient(90deg,#2642377a,#1a332a55);border-radius:10px;margin:0 0 34px}.quest-icon{color:var(--gold);font-size:27px}.quest-strip>div{flex:1;display:flex;gap:18px;align-items:center}.quest-strip strong{font-size:12px;color:#d7d6ad;white-space:nowrap}.quest-strip>div>span{font-size:11px;color:#abc1ac;line-height:1.7}.chapter-progress{color:var(--gold);font-family:Georgia,serif;font-size:23px;white-space:nowrap}.chapter-progress>span{font-size:10px;display:inline-block;color:var(--muted);margin-left:6px}.quest-strip.complete{border-color:#d4c68a66;background:#c9bf6a12}.main-grid{display:grid;grid-template-columns:minmax(0,1fr) 298px;gap:32px}.section-heading{display:flex;align-items:center;justify-content:space-between;gap:12px;margin-bottom:20px}.section-heading h2{font-family:"Songti SC",Georgia,serif;font-size:23px;font-weight:500;letter-spacing:1px;margin-top:4px}.section-heading h2>span{font-size:15px;color:#829c87;font-family:Georgia,serif;letter-spacing:0;margin-left:6px}.section-heading .eyebrow{font-size:9px;letter-spacing:2px;color:#8eb59e}.subtle-button{border:1px solid #a3b79944;border-radius:6px;padding:7px 10px;font-size:10px;color:#c1cfb7;background:#ffffff03}.subtle-button:hover:not(:disabled){background:#b6c78e12;border-color:#b6c78e88}.party-strip{display:flex;gap:10px;align-items:center;border-block:1px solid var(--line);padding:11px 0;margin-bottom:13px;flex-wrap:wrap}.party-label{font-size:9px;color:var(--muted);letter-spacing:1px;white-space:nowrap}.party-label>b{font-weight:400;color:var(--gold);margin-left:5px}.party-list{display:flex;gap:5px;flex-wrap:wrap;flex:1}.party-chip{padding:5px 6px;border:1px solid #b4c99a22;border-radius:4px;font-size:9px;background:#233d30;display:flex;gap:5px;align-items:center;white-space:nowrap}.party-chip>span{color:#a3ba9d;font-size:8px}.party-chip>small{color:var(--gold);font-size:7px;letter-spacing:-1px}.party-chip.active{border-color:#d4c28677}.frontline-note{font-size:8px;color:#849e8c;white-space:nowrap}.merge-bar{display:flex;flex-wrap:wrap;align-items:center;gap:9px;padding:11px 13px;border:1px dashed #aabd8c33;border-radius:7px;min-height:43px;margin-bottom:17px;color:#94ac97;font-size:10px}.merge-bar.ready{background:#c5b36c0a;border-color:#ccb77866;color:var(--gold)}.merge-bar>span{flex:1}.merge-button{padding:6px 10px;background:#b7c68a18;border:1px solid #c8c38155;border-radius:5px;font-size:10px;color:#e8d69b}.merge-button>span{margin-left:8px;font-size:10px}.merge-button:hover{background:#c5c78d33}.cards-grid{display:grid;grid-template-columns:repeat(3,minmax(0,1fr));gap:12px}.spirit-card{border:1px solid #adc7a52e;border-radius:12px;overflow:hidden;background:linear-gradient(150deg,#25413670,#142d2866);position:relative;transition:border-color .2s,box-shadow .2s,transform .2s}.spirit-card:hover{border-color:#abc7a577;transform:translateY(-2px)}.spirit-card.selected{border-color:#d9c48a99;box-shadow:0 0 0 1px #d9c48a22,0 8px 24px #00000022}.card-corners{position:absolute;inset:5px;border:1px solid #a8b58a0c;border-radius:8px;pointer-events:none}.card-select{width:100%;padding:11px 12px 0;display:block;text-align:center}.card-top{display:flex;align-items:center;justify-content:space-between}.stars{font-size:10px;color:var(--gold);letter-spacing:2px;white-space:nowrap}.card-index{font:10px Georgia,serif;color:#809781;letter-spacing:1px}.beast-art{display:block;aspect-ratio:1.22;margin:-4px -9px -10px;max-height:170px}.beast-name{display:block;font-family:"Songti SC",Georgia,serif;font-size:17px;font-weight:500;letter-spacing:2px;color:#e4e9cf;margin-top:4px;overflow-wrap:anywhere}.beast-skill{font-size:8px;color:var(--beast);letter-spacing:2px;display:block;margin-top:5px}.card-stats{display:flex;justify-content:center;gap:13px;margin:14px 0 10px;font-size:10px;color:#b6cab3}.card-stats>span:nth-child(1){color:#e0c28e}.card-bottom{display:flex;align-items:center;justify-content:space-between;gap:4px;padding:9px 10px;border-top:1px solid #a7bda318;background:#0d211b44}.equipped-label{font-size:8px;color:#a9bba0;overflow:hidden;text-overflow:ellipsis;white-space:nowrap}.deploy-button{font-size:9px;border:1px solid #a6bb9d44;padding:4px 6px;border-radius:4px;white-space:nowrap;color:#b8cbb4}.deploy-button.on{color:#b8d7ae;border-color:#92b18633;background:#8cb78716}.inspector{margin-top:18px;padding:16px;display:flex;align-items:center;gap:16px;background:linear-gradient(100deg,#253e3266,#172f2766);border:1px solid var(--line);border-radius:10px}.inspector-art{width:100px;flex-shrink:0;height:100px}.inspector-copy{min-width:0}.inspector h3{font-family:"Songti SC",Georgia,serif;font-size:17px;font-weight:500;margin-top:5px}.inspector h3 .stars{margin-left:8px;font-size:9px}.inspector p{font-size:10px;color:#a2b89f;line-height:1.8;margin-top:7px;overflow-wrap:anywhere}.inspector .skill-detail{color:#c5cbb0;margin-top:3px}.inspector .eyebrow{font-size:8px;letter-spacing:1.5px}.equipment{margin-top:31px}.compact{margin-bottom:15px}.compact h2{font-size:21px}.section-note{font-size:9px;color:var(--muted)}.equipment-grid{display:grid;grid-template-columns:1fr 1fr;gap:10px}.relic{display:flex;align-items:center;gap:10px;border:1px solid var(--line);border-radius:9px;padding:12px;background:#1d342a55;flex-wrap:wrap}.relic-icon{height:37px;width:37px;background:linear-gradient(135deg,#b8b78222,#8bab7e08);color:var(--gold);border:1px solid #c5c89333;border-radius:9px;display:grid;place-items:center;font-size:22px;flex-shrink:0}.relic-copy{flex:1;min-width:90px}.relic h3{font-size:11px;font-weight:500;color:#d6d7b3}.relic p{font-size:8px;color:#acbda0;margin:5px 0}.relic-copy>span{font-size:8px;color:#849d88}.relic-actions{display:flex;gap:10px;align-items:center;width:100%;padding-left:47px}.relic-actions .subtle-button{font-size:8px;padding:5px 8px}.relic-actions .text-button{font-size:8px;padding:4px 0}.relic.locked{opacity:.42}.lock-symbol{color:var(--muted)}.trail-mark{font-size:33px;font-family:serif;color:#b8bc8444;border:1px solid #a5b28b22;border-radius:50%;width:43px;height:43px;display:grid;place-items:center}.journey{border-left:1px solid var(--line);padding-left:27px}.stages{display:flex;flex-direction:column;gap:14px}.stage{border:1px solid #c4c89044;border-radius:12px;overflow:hidden;position:relative;background:linear-gradient(145deg,#2c463599,#19342977)}.stage.locked{border-color:#93a68722;background:#1b312966}.stage.locked .stage-content{opacity:.5}.stage-number{position:absolute;z-index:2;left:17px;top:14px;font-family:Georgia,serif;font-size:27px;color:#e0d4a099;display:flex;align-items:center;gap:13px}.stage-number>span{font-size:11px;border:1px solid #bccc8c44;border-radius:50%;width:21px;height:21px;display:grid;place-items:center;color:#bdce9b}.stage-landscape{height:98px;position:relative;overflow:hidden;border-bottom:1px solid #a5bd8b11;background:radial-gradient(ellipse at 70% 0%,#9ab6801f,transparent 80%)}.stage-landscape i{position:absolute;right:35px;top:17px;width:35px;height:35px;border-radius:50%;background:#d3c18a22;box-shadow:0 0 40px #c5bf7e13}.stage-landscape b{position:absolute;width:180px;height:100px;right:-23px;bottom:-22px;background:linear-gradient(135deg,#7b986b66,#42644744);clip-path:polygon(0 100%,45% 0,64% 40%,74% 24%,100% 100%)}.stage-landscape span{position:absolute;width:170px;height:80px;left:-10px;bottom:-25px;background:linear-gradient(135deg,#577c61,#2c4c3d);clip-path:polygon(0 100%,25% 26%,45% 65%,65% 15%,100% 100%);opacity:.6}.landscape-2{background:radial-gradient(ellipse at 80% 20%,#76a8ac2a,transparent 80%)}.landscape-2 i{right:49px;top:12px;width:40px;height:40px;box-shadow:inset -11px -6px #28443d;background:#d3d0a255}.landscape-2 b{background:linear-gradient(135deg,#6d9c9355,#2e5c5144);right:-4px;height:82px}.landscape-3{background:radial-gradient(ellipse at 65% 0%,#ae9a6c2a,transparent 80%)}.landscape-3 i{right:55px;top:6px;width:49px;height:49px;background:#d3c18a33}.landscape-3 b{height:130px;right:-12px;bottom:-30px;background:linear-gradient(135deg,#c5c5a066,#47634766);clip-path:polygon(0 100%,40% 0,52% 23%,61% 14%,100% 100%)}.stage-content{padding:15px 17px 17px}.stage-status{font-size:8px;letter-spacing:1.5px;color:#b4c28f}.stage h3{font-family:"Songti SC",Georgia,serif;font-size:21px;font-weight:500;color:#e4e4c6;letter-spacing:1px;margin:6px 0 8px}.stage p{font-size:9px;color:#94af98;line-height:1.7}.stage-reward{font-size:8px;color:#8fa88f;line-height:1.7;margin-top:13px;letter-spacing:.2px}.stage-reward>span{color:#d2c594;margin-left:4px}.stage button{width:100%;margin-top:13px;display:flex;align-items:center;justify-content:space-between;font-size:10px;padding:9px 12px;border-radius:6px}.stage-button{border:1px solid #a9bc8d33;color:#b0c098;background:#b5c68b08}.stage-button:hover:not(:disabled){background:#b5c68b18}.stage.cleared{border-color:#8fb58e44}.stage.cleared .stage-status{color:#91c398}.trail-note{display:flex;align-items:flex-start;gap:10px;margin-top:18px;padding:3px 4px}.trail-note>span{font-size:27px;color:#b5bf8b77}.trail-note p{font-size:9px;line-height:1.9;color:#8aa58e}.last-battle{margin-top:15px;border:1px solid var(--line);border-radius:8px;padding:12px;display:flex;flex-direction:column;gap:6px;font-size:10px;color:#b1c3a4}.last-battle>strong{font-weight:500;color:var(--gold)}.last-battle>span{font-size:9px}footer{display:flex;align-items:center;justify-content:space-between;gap:20px;flex-wrap:wrap;border-top:1px solid var(--line);margin-top:38px;padding:23px 0 27px;color:#7f9a86;font-size:9px;line-height:1.8}footer>span:first-child{display:flex;align-items:center;gap:7px}.save-dot{width:5px;height:5px;display:inline-block;border-radius:50%;background:#91b78e;box-shadow:0 0 9px #86b18144}.save-dot.warning{background:#d3ac73}.seed-label{font-size:8px;letter-spacing:1px}.seed-label code{font-family:monospace;font-size:9px;letter-spacing:0;color:#afbea3;margin-left:6px;overflow-wrap:anywhere}.toast{position:fixed;bottom:25px;left:50%;transform:translate(-50%,15px);background:#d9d3ac;color:#203c2d;border:1px solid #e5ddb7;padding:13px 23px;border-radius:10px;max-width:min(90vw,600px);font-size:12px;line-height:1.6;box-shadow:0 12px 50px #0006;z-index:100;opacity:0;pointer-events:none;transition:opacity .2s,transform .2s}.toast.visible{opacity:1;transform:translate(-50%,0)}dialog{background:linear-gradient(145deg,#253e32,#122c25);color:var(--ink);border:1px solid #bdc59455;border-radius:18px;width:min(560px,calc(100% - 32px));padding:28px;max-height:85vh;box-shadow:0 30px 100px #0008}dialog::backdrop{background:#041611cf;backdrop-filter:blur(8px)}.dialog-heading{display:flex;align-items:center;justify-content:space-between;gap:10px;margin-bottom:16px}dialog h2{font-family:"Songti SC",Georgia,serif;font-size:27px;font-weight:500;line-height:1.5}dialog>.primary{width:100%;margin-top:17px}.guide-steps{display:flex;flex-direction:column;gap:17px;margin:20px 0}.guide-steps p,.dialog-copy{font-size:11px;line-height:1.9;color:#a9c0a9}.guide-steps b{display:block;color:#d5d3a6;font-weight:500;font-size:13px;margin-bottom:4px}.dialog-copy{margin-top:17px}.dialog-actions{display:flex;justify-content:flex-end;gap:12px;flex-wrap:wrap;margin-top:26px}.danger-button{background:#745348;color:#f1d9be;border:1px solid #b88b6c66;border-radius:7px;padding:10px 16px;font-size:11px}.battle-backdrop{position:fixed;inset:0;z-index:30;background:#061812ed;backdrop-filter:blur(10px);display:flex;align-items:center;justify-content:center;padding:24px;overflow:auto}.battle-dialog{width:min(920px,100%);max-height:calc(100dvh - 48px);overflow:auto;border:1px solid #c8c49455;background:radial-gradient(ellipse at 50% 10%,#36503b88,transparent 70%),#142c25;border-radius:19px;padding:27px;box-shadow:0 30px 100px #0006;outline:none}.battle-header{display:flex;justify-content:space-between;gap:15px;align-items:center}.battle-header h2{font:26px/1.5 "Songti SC",Georgia,serif;margin-top:5px}.battle-controls{display:flex;align-items:center;gap:17px}.battle-controls[hidden]{display:none}.battle-round{text-align:center;margin:23px 0 12px;font-size:10px;color:#c4c69e;letter-spacing:2px}.battle-field{display:flex;align-items:center;justify-content:center;gap:14px;padding:15px 0 22px;border-bottom:1px solid var(--line)}.battle-team{display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:12px;width:44%;max-width:335px}.battle-team.enemies{grid-template-columns:repeat(3,minmax(0,1fr));max-width:340px}.battle-unit{position:relative;min-width:0;border:1px solid #b1c69b2a;background:#1e3b2b77;border-radius:9px;padding:5px 8px 10px;text-align:center;transition:opacity .4s}.battle-unit.enemy{background:#24363866}.battle-unit.fallen{opacity:.3}.battle-portrait{height:92px;margin:-4px -4px -8px}.enemy .battle-portrait{height:79px;padding:8px}.battle-unit strong{display:block;font-size:10px;font-weight:500;overflow-wrap:anywhere;line-height:1.4;margin:3px 0 8px}.health-track{height:4px;background:#071b16;border-radius:4px;overflow:hidden}.health-track i{display:block;height:100%;background:#91c59a;border-radius:4px;transition:width .22s}.enemy .health-track i{background:#c7ac78}.battle-unit small{font-size:8px;display:block;color:#b1c3a3;margin-top:5px}.versus{font-size:27px;color:#c9c49477}.battle-log{height:110px;overflow:auto;padding:12px 6px;font-size:10px;line-height:1.8;scrollbar-width:thin;scrollbar-color:#7c927144 transparent}.battle-log p{margin:2px 0}.log-round{color:#b7c390;margin-top:5px!important}.log-ally{color:#b3c9a7}.log-enemy{color:#c1ab96}.log-heal{color:#93d0a3}.floating-damage{position:absolute;top:25%;left:50%;font:700 22px Georgia,serif;color:#f1c58c;text-shadow:0 2px 8px #000;opacity:0;pointer-events:none}.floating-damage.healing{color:#a6e0a3}.floating-damage.animate{animation:float-number .8s ease-out forwards}.battle-result:empty{display:none}.battle-result{display:flex;align-items:center;gap:17px;flex-wrap:wrap;background:#a9be8010;border:1px solid #bfcb8e33;border-radius:10px;padding:19px;margin-top:12px}.result-mark{font-size:36px;color:var(--gold)}.battle-result>div:nth-child(2){flex:1;min-width:180px}.battle-result h3{font-family:"Songti SC",Georgia,serif;font-weight:500;font-size:20px;color:#e7dfb4;line-height:1.5}.battle-result p{font-size:10px;line-height:1.8;color:#b6c8a9;margin-top:5px}.battle-result small{display:block;font-size:9px;margin-top:7px;color:#93ac8f}.battle-result>.primary{font-size:10px;white-space:nowrap}.battle-dialog::-webkit-scrollbar,.battle-log::-webkit-scrollbar{width:5px}.battle-dialog::-webkit-scrollbar-thumb,.battle-log::-webkit-scrollbar-thumb{background:#78936b55;border-radius:5px}@keyframes float-number{0%{transform:translate(-50%,0);opacity:1}100%{transform:translate(-50%,-38px);opacity:0}}@media(min-width:1350px){.cards-grid{grid-template-columns:repeat(3,minmax(0,1fr))}.beast-art{max-height:190px}.main-grid{grid-template-columns:minmax(0,1fr) 328px;gap:38px}}@media(max-width:1100px){.app-shell{padding:0 30px}.hero{grid-template-columns:1fr 260px;gap:30px}.main-grid{grid-template-columns:minmax(0,1fr) 250px;gap:22px}.journey{padding-left:20px}.card-select{padding:10px 8px 0}.card-stats{gap:8px}.card-bottom{padding:8px 6px}.equipped-label{font-size:7px}.beast-name{font-size:15px}.equipment-grid{grid-template-columns:1fr}.relic-actions{width:auto;padding-left:0}.hero h1{font-size:38px}.party-strip{gap:8px}.frontline-note{display:none}.quest-strip>div{gap:12px}}@media(max-width:850px){.app-shell{padding:0 24px}.topbar{min-height:83px}.hero{grid-template-columns:1fr 230px;gap:22px;padding:36px 0;min-height:320px}.hero h1{font-size:32px}.hero-copy>p{font-size:11px}.summon-panel{padding:17px 15px 13px}.summon-top .eyebrow{letter-spacing:.5px;font-size:8px}.main-grid{grid-template-columns:minmax(0,1fr)}.journey{border-left:0;border-top:1px solid var(--line);padding:25px 0 0}.stages{display:grid;grid-template-columns:repeat(3,minmax(0,1fr));gap:12px}.stage-content{padding:13px 12px}.stage h3{font-size:19px}.stage p{min-height:32px;font-size:9px}.stage-reward{min-height:27px}.stage-status{font-size:7px;letter-spacing:1px}.stage button{font-size:9px;padding:9px}.equipment-grid{grid-template-columns:1fr 1fr}.relic-actions{width:100%;padding-left:47px}.quest-strip{margin-bottom:28px;padding:15px 17px}.quest-strip>div{display:block}.quest-strip strong{display:block;margin-bottom:4px}.quest-strip>div>span{font-size:10px}.card-select{padding:13px 15px 0}.beast-name{font-size:18px}.card-stats{gap:18px}.card-bottom{padding:10px 12px}.equipped-label{font-size:9px}.beast-art{max-height:200px}.trail-note p br{display:none}.last-battle{flex-direction:row;gap:15px;align-items:center}}@media(max-width:600px){.app-shell{padding:0 17px}.topbar{gap:12px;min-height:77px}.brand{gap:9px}.brand-mark{width:34px;height:40px;font-size:22px}.brand strong{font-size:16px;letter-spacing:2px}.brand small{font-size:7px;letter-spacing:1px}.top-actions{gap:12px}.top-actions .text-button{font-size:10px}.top-actions .icon-button{font-size:20px;width:29px;height:29px}.top-actions #download span{display:none}.hero{grid-template-columns:1fr;gap:25px;padding:30px 0 25px;overflow:hidden}.hero-copy{padding:0 3px}.hero h1{font-size:36px;letter-spacing:1px;margin:13px 0}.hero h1 em{display:inline;margin-left:3px}.hero-copy>p{font-size:11px}.hero-meta{margin-top:17px;gap:6px}.tag{font-size:8px;padding:5px 7px}.summon-panel{display:grid;grid-template-columns:1fr 1fr;column-gap:14px;row-gap:8px;padding:15px 17px;border-radius:11px}.summon-top{grid-column:1;flex-direction:column;align-items:flex-start;gap:0;z-index:1}.summon-top .eyebrow{font-size:8px;letter-spacing:1px}.currency strong{font-size:26px}.summon-sigil{position:absolute;left:110px;top:9px;width:65px;height:65px;opacity:.3}.summon-sigil b{font-size:27px}.summon-sigil:before{height:43px;width:43px}.summon-sigil:after{height:57px;width:57px}.summon-sigil i{height:65px;width:65px}.summon-sigil>span{right:0;top:0}.summon-button{align-self:center;grid-column:2;grid-row:1;padding:12px 10px;font-size:12px;gap:10px;letter-spacing:0}.summon-button>span{font-size:10px;padding-left:10px}.fine-print{grid-column:1/3;margin:0;text-align:left;font-size:8px}.quest-strip{gap:10px;padding:13px;align-items:flex-start;margin-bottom:25px}.quest-icon{font-size:23px}.quest-strip>div>span{font-size:10px}.quest-strip strong{font-size:11px}.chapter-progress{font-size:20px}.chapter-progress>span{display:block;text-align:center;margin:3px 0 0;font-size:8px}.section-heading{margin-bottom:15px}.section-heading h2{font-size:22px}.section-heading .eyebrow{font-size:8px}.subtle-button{font-size:9px}.party-strip{gap:8px}.party-list{gap:5px}.party-chip{font-size:8px;padding:5px}.party-chip>small{font-size:6px}.party-label{font-size:8px}.merge-bar{font-size:9px;padding:10px}.merge-button{font-size:9px;padding:6px 7px}.cards-grid{grid-template-columns:repeat(2,minmax(0,1fr));gap:11px}.card-select{padding:11px 12px 0}.beast-art{max-height:none;margin-bottom:-8px}.beast-name{font-size:17px;letter-spacing:1px}.card-stats{gap:12px;font-size:10px;margin-top:12px}.card-bottom{padding:9px}.equipped-label{font-size:8px}.inspector{padding:12px;gap:10px}.inspector-art{width:72px;height:90px}.inspector h3{font-size:16px}.inspector h3 .stars{font-size:8px;margin-left:3px}.inspector p{font-size:9px}.equipment-grid{gap:9px}.relic{padding:10px;gap:8px}.relic-icon{width:29px;height:32px;font-size:20px}.relic-copy{min-width:70px}.relic h3{font-size:10px}.relic p{font-size:7px}.relic-copy>span{font-size:7px}.relic-actions{padding-left:0;gap:8px}.relic-actions .subtle-button{font-size:8px;padding:5px}.section-note{font-size:8px}.stages{grid-template-columns:1fr;gap:12px}.stage{display:grid;grid-template-columns:94px 1fr}.stage-landscape{height:100%;min-height:174px;border-bottom:0;border-right:1px solid var(--line)}.stage-landscape b{width:130px;right:-45px;bottom:5px;height:110px}.stage-landscape span{bottom:-15px;width:140px;left:-20px}.stage-landscape i{top:55px;right:22px;width:35px;height:35px}.stage-number{top:14px;left:13px;font-size:25px;gap:7px}.stage-content{padding:14px 16px}.stage-status{font-size:8px}.stage h3{font-size:23px;margin:5px 0}.stage p{min-height:0;font-size:9px}.stage-reward{min-height:0;margin-top:8px;font-size:8px}.stage button{margin-top:10px;font-size:10px;padding:9px 11px}.trail-note{margin-top:16px}.last-battle{font-size:9px}footer{gap:7px;margin-top:27px;padding:20px 0;align-items:flex-start;flex-direction:column;font-size:8px}.seed-label{font-size:7px}dialog{padding:23px}dialog h2{font-size:24px}.guide-steps p{font-size:10px}.battle-backdrop{padding:10px}.battle-dialog{padding:17px 12px;max-height:calc(100dvh - 20px);border-radius:14px}.battle-header h2{font-size:22px}.battle-header .eyebrow{font-size:8px}.battle-controls{gap:8px;flex-wrap:wrap;justify-content:flex-end;max-width:120px}.battle-controls .text-button{font-size:9px}.battle-round{margin:19px 0 8px;font-size:9px}.battle-field{display:flex;flex-direction:column;gap:8px;padding:4px 0 14px}.battle-team{grid-template-columns:repeat(4,minmax(0,1fr));width:100%;max-width:none;gap:6px}.battle-team.enemies{grid-template-columns:repeat(3,minmax(0,1fr));width:82%;max-width:none}.battle-unit{padding:4px 5px 7px}.battle-portrait{height:69px;margin:-3px -4px -4px}.enemy .battle-portrait{height:62px;padding:7px}.battle-unit strong{font-size:9px;margin-bottom:6px}.battle-unit small{font-size:7px}.versus{font-size:17px;line-height:1}.battle-log{height:86px;font-size:9px}.battle-result{padding:13px;gap:10px}.result-mark{font-size:25px}.battle-result h3{font-size:18px}.battle-result p{font-size:9px}.battle-result>.primary{width:100%}.toast{font-size:11px;padding:12px 17px;bottom:17px}.dialog-actions{gap:10px}.dialog-actions>button{flex:1;font-size:10px}}@media(max-width:370px){.app-shell{padding:0 12px}.top-actions{gap:8px}.brand strong{font-size:14px}.hero h1{font-size:31px}.summon-panel{padding:13px}.card-bottom{padding:8px 6px}.equipped-label{font-size:7px}.card-stats{gap:9px}.party-chip>small{display:none}.inspector-art{display:none}}@media(prefers-reduced-motion:reduce){*,*:before,*:after{animation:none!important;transition:none!important;scroll-behavior:auto!important}}
`;

  // locale/zh.json
  var zh_default = {
    meta: { title: "游戏工坊", description: "试玩原创卡牌《雾岭灵契》，对话生成离线 HTML 游戏，并按需连接本机 Unity、Unreal 与 Blender。" },
    panel: "游戏工坊",
    eyebrow: "从一个灵感，到一个能玩的世界",
    heading: "游戏工坊",
    intro: "先玩一局，再用对话做出你自己的游戏。无需账号，没有内购。",
    sampleLabel: "原创卡牌 · 离线可玩",
    sampleTitle: "雾岭灵契",
    sampleDescription: "穿过山雾，与六种灵兽结契。抽卡、合成、搭配装备，带领你的队伍挑战三座秘境。开局已备好三张同名卡，第一次升星就在眼前。",
    start: "开始试玩",
    resume: "继续试玩",
    download: "下载游戏 HTML",
    closeGame: "收起试玩",
    gameTitle: "雾岭灵契 — 试玩区",
    gameHelp: "进度保存在此浏览器。下载的 HTML 无需联网；在同一浏览器、同一文件位置打开可继续离线存档。",
    six: "6 种原创灵兽",
    merge: "三合一升星",
    stages: "3 个递进关卡",
    createTitle: "下一款游戏，由你来定义",
    createDescription: "改写下面这条指令，复制到已选择工作区的 DSH 对话中。生成工具只新建文件；遇到同名文件会要求换名。",
    promptLabel: "可编辑的中文制作指令",
    copy: "复制制作指令",
    copied: "已复制，粘贴到对话即可",
    copyFailed: "无法读取剪贴板权限，请选中文字手动复制。",
    editorsTitle: "把卡牌，带进你的编辑器",
    editorsDescription: "三个独立 MCP 连接预设随插件提供，安装时全部关闭。先在插件设置中填写本机路径并启用，再在对话中调用 game_workshop_editors 查看实际发现的工具。",
    disabled: "安装默认关闭",
    unity: "Unity · 官方 CLI",
    unreal: "Unreal Engine 5.8",
    blender: "Blender Lab · 官方 MCP",
    stdio: "本机 stdio",
    http: "本机 Streamable HTTP",
    editorSafety: "每次编辑前先只读确认目标；Unity/UE 需配置已审核的所选工程查询。不自动安装编辑器；其网络与权限由各自设置决定。",
    docs: "安装与编辑器接入说明",
    footer: "原创图形 · MIT 开源 · 无远程资源与遥测",
    previewAlt: "雾岭群山与原创灵兽灵契纹章"
  };

  // locale/en.json
  var en_default = {
    meta: { title: "Game workshop", description: "Play the original Mistbound Pacts card game, create offline HTML games in chat, and opt into local Unity, Unreal and Blender connections." },
    panel: "Game workshop",
    eyebrow: "From a small idea to a playable world",
    heading: "Game workshop",
    intro: "Play a round, then make a game of your own in chat. No account or in-app purchases.",
    sampleLabel: "Original card game · Works offline",
    sampleTitle: "Mistbound Pacts",
    sampleDescription: "Cross the misty ridges and befriend six original creatures. Draw cards, merge duplicates, equip your team and conquer three realms. Three matching cards are ready for your first upgrade.",
    start: "Start playing",
    resume: "Continue playing",
    download: "Download game HTML",
    closeGame: "Close play area",
    gameTitle: "Mistbound Pacts — play area",
    gameHelp: "Progress stays in this browser. The downloaded HTML works offline; reopen it in the same browser and file location to resume its local save.",
    six: "6 original creatures",
    merge: "Merge three to upgrade",
    stages: "3 progressive realms",
    createTitle: "Your next game starts here",
    createDescription: "Edit this Chinese prompt and paste it into a DSH conversation with a workspace selected. The tool only creates new files and never replaces an existing one.",
    promptLabel: "Editable Chinese game creation prompt",
    copy: "Copy creation prompt",
    copied: "Copied — paste it into chat",
    copyFailed: "Clipboard access failed. Select the text and copy it manually.",
    editorsTitle: "Bring your cards into your editor",
    editorsDescription: "Three independent MCP presets ship disabled. Set your local paths and enable a preset in plugin settings, then call game_workshop_editors in chat to inspect the tools actually discovered.",
    disabled: "Disabled on installation",
    unity: "Unity · Official CLI",
    unreal: "Unreal Engine 5.8",
    blender: "Blender Lab · Official MCP",
    stdio: "Local stdio",
    http: "Local Streamable HTTP",
    editorSafety: "Verify the target before every edit. Unity/UE require an audited selected-project probe. Editors are not installed automatically; their network access and permissions follow their own settings.",
    docs: "Installation and editor guide",
    footer: "Original artwork · MIT open source · No remote assets or telemetry",
    previewAlt: "Misty mountains and original creature pact emblems"
  };

  // client/index.js
  var PROMPT = "请调用 game_workshop_create_cards，在我当前选择的工作区新建一个可离线玩的卡牌游戏。标题：星海灵契；卡组：星鲸、月狐、晶鹿、云鹤、岩龟、萤蝶（请为它们写原创中文描述）；随机种子：星海-2026；输出文件名：星海灵契.html。保留抽卡、三合一升星、装备和三关自动战斗。如文件已存在，请先让我换名，不要覆盖。";
  var STYLE = `
.gw-page{box-sizing:border-box;height:100%;overflow:auto;padding:calc(var(--dsh-frame-top-clearance,0px) + 28px) clamp(20px,4vw,52px) 36px;color:var(--dsw-alias-label-primary);background:var(--dsw-alias-bg-base,Canvas);font:14px/1.65 var(--dsw-font-family,system-ui);scrollbar-gutter:stable}
.gw-page *{box-sizing:border-box}.gw-wrap{max-width:1140px;margin:0 auto}.gw-heading{display:flex;align-items:center;justify-content:space-between;gap:18px;margin-bottom:24px}.gw-heading h1{font-size:27px;letter-spacing:-.7px;line-height:1.3;margin:3px 0 7px;font-weight:650}.gw-eyebrow{font-size:11px;letter-spacing:1.6px;color:var(--dsw-alias-label-secondary);text-transform:uppercase}.gw-muted{color:var(--dsw-alias-label-secondary);margin:0}.gw-version{font:12px/1.2 ui-monospace,monospace;border:1px solid var(--dsw-alias-border-l1,GrayText);padding:7px 10px;border-radius:9px;color:var(--dsw-alias-label-secondary);white-space:nowrap}.gw-hero{position:relative;isolation:isolate;overflow:hidden;border-radius:20px;background:#143d38;color:#f4f0dc;display:grid;grid-template-columns:minmax(0,1.2fr) minmax(220px,.8fr);padding:38px 38px 32px;gap:20px}.gw-hero::before{content:'';position:absolute;inset:0;z-index:-1;background:radial-gradient(ellipse at 85% 20%,#2f736157,transparent 65%),linear-gradient(125deg,transparent,#092a2859)}.gw-hero h2{font-family:ui-serif,'Songti SC','Noto Serif CJK SC',serif;font-size:clamp(35px,4.5vw,56px);font-weight:600;letter-spacing:7px;line-height:1.25;margin:14px 0}.gw-hero p{color:#bed8cc;max-width:560px;font-size:14px;line-height:1.9;margin:0 0 24px}.gw-sample-label{display:inline-flex;gap:8px;align-items:center;color:#e5ca8d;font-size:11px;letter-spacing:2px}.gw-sample-label:before{content:'';width:5px;height:5px;border-radius:50%;background:#e5ca8d}.gw-actions{display:flex;gap:10px;flex-wrap:wrap;align-items:center}.gw-btn{appearance:none;display:inline-flex;align-items:center;justify-content:center;gap:7px;border:1px solid var(--dsw-alias-border-l1,GrayText);background:transparent;color:inherit;border-radius:10px;padding:9px 16px;font:inherit;font-size:13px;font-weight:550;line-height:1.5;cursor:pointer;text-decoration:none;min-height:39px}.gw-btn:hover{background:var(--dsw-alias-bg-hover,color-mix(in srgb,currentColor 7%,transparent))}.gw-btn:focus-visible,.gw-prompt:focus-visible{outline:2px solid var(--dsw-alias-state-business-primary,Highlight);outline-offset:3px}.gw-btn-primary{background:#e6c88e;border-color:#e6c88e;color:#153d37}.gw-btn-primary:hover{background:#f4dba9}.gw-btn-hero{border-color:#54796b;color:#edf0df}.gw-btn-hero:hover{background:#ffffff10}.gw-art{width:100%;max-width:340px;align-self:center;justify-self:center;filter:drop-shadow(0 15px 24px #08231f66)}.gw-features{display:flex;gap:20px;flex-wrap:wrap;font-size:11px;color:#b0cfc0;margin-top:22px}.gw-features span{display:flex;align-items:center;gap:6px}.gw-dot{width:4px;height:4px;border:1px solid #b8aa7a;transform:rotate(45deg)}.gw-section{padding:29px 0 3px}.gw-section h2{font-size:18px;line-height:1.5;font-weight:600;letter-spacing:-.3px;margin:0 0 7px}.gw-section .gw-muted{font-size:13px;max-width:900px}.gw-prompt{display:block;resize:vertical;width:100%;min-height:118px;margin:16px 0 12px;padding:15px 17px;border:1px solid var(--dsw-alias-border-l1,GrayText);border-radius:12px;background:var(--dsw-alias-bg-l1,Canvas);color:var(--dsw-alias-label-primary,CanvasText);font:13px/1.8 var(--dsw-font-family,system-ui)}.gw-copy-status{font-size:12px;color:var(--dsw-alias-label-secondary);min-height:20px}.gw-editors{display:grid;grid-template-columns:repeat(3,minmax(0,1fr));gap:12px;margin:17px 0 13px}.gw-editor{border:1px solid var(--dsw-alias-border-l1,GrayText);border-radius:13px;padding:16px}.gw-editor strong{font-size:13px;font-weight:600;display:block;margin-bottom:6px}.gw-editor small{font-size:11px;color:var(--dsw-alias-label-secondary);display:block}.gw-editor .gw-off{display:inline-flex;font-size:10px;gap:5px;align-items:center;padding:3px 7px;background:var(--dsw-alias-bg-l2,color-mix(in srgb,currentColor 6%,transparent));border-radius:6px;margin-top:11px;color:var(--dsw-alias-label-secondary)}.gw-off:before{content:'';width:4px;height:4px;background:currentColor;border-radius:50%}.gw-safety{font-size:12px;color:var(--dsw-alias-label-secondary)}.gw-link{font-size:12px;color:var(--dsw-alias-state-business-primary,LinkText);text-underline-offset:3px}.gw-footer{display:flex;flex-wrap:wrap;gap:12px;justify-content:space-between;margin-top:26px;padding-top:17px;border-top:1px solid var(--dsw-alias-border-l1,GrayText);font-size:11px;color:var(--dsw-alias-label-secondary)}.gw-gamebar{display:flex;gap:12px;align-items:center;justify-content:space-between;flex-wrap:wrap;padding:0 0 13px}.gw-gamebar h2{font-size:18px;font-weight:600;margin:0}.gw-game{display:block;width:100%;height:780px;max-height:85vh;min-height:480px;border:1px solid var(--dsw-alias-border-l1,GrayText);border-radius:16px;background:#0c2423}.gw-game-note{font-size:11px;color:var(--dsw-alias-label-secondary);margin-top:9px}.gw-visually-hidden{position:absolute!important;width:1px;height:1px;padding:0;overflow:hidden;clip:rect(0,0,0,0);white-space:nowrap;border:0}
@media(max-width:850px){.gw-hero{grid-template-columns:1fr;padding:26px}.gw-art{display:none}.gw-editors{grid-template-columns:1fr}.gw-page{padding-left:20px;padding-right:20px}.gw-heading h1{font-size:23px}.gw-hero h2{font-size:40px}.gw-game{height:760px;max-height:none}.gw-heading{margin-bottom:18px}.gw-hero p{max-width:none}}
@media(prefers-reduced-motion:reduce){.gw-page *{scroll-behavior:auto!important}}
`;
  window.__ModuleLoader__.load({
    id: "dsh-game-workshop",
    factory(require2) {
      const React = require2("react");
      const h = React.createElement;
      function Icon({ size = 18 }) {
        return h(
          "svg",
          { viewBox: "0 0 24 24", width: size, height: size, fill: "none", stroke: "currentColor", strokeWidth: 1.6, "aria-hidden": true },
          h("rect", { x: 5, y: 3, width: 14, height: 18, rx: 3 }),
          h("path", { d: "m12 7 1.5 3.5L17 12l-3.5 1.5L12 17l-1.5-3.5L7 12l3.5-1.5Z" })
        );
      }
      function Art({ label }) {
        return h(
          "svg",
          { className: "gw-art", viewBox: "0 0 340 300", role: "img", "aria-label": label },
          h("defs", null, h("linearGradient", { id: "gw-art-card", x1: "0", y1: "0", x2: "1", y2: "1" }, h("stop", { stopColor: "#ecedcf" }), h("stop", { offset: "1", stopColor: "#c2d0b6" }))),
          h("circle", { cx: 178, cy: 143, r: 111, fill: "none", stroke: "#81b798", strokeOpacity: 0.3 }),
          h("circle", { cx: 178, cy: 143, r: 90, fill: "none", stroke: "#81b798", strokeOpacity: 0.25, strokeDasharray: "2 10" }),
          h("path", { d: "M13 237 70 173 102 206 158 118 234 221 275 155 330 241Z", fill: "#49765e", opacity: 0.45 }),
          h("g", { transform: "translate(52 47) rotate(-15 75 106)" }, h("rect", { width: 142, height: 199, rx: 13, fill: "#456959", stroke: "#8eaa7d" }), h("rect", { x: 9, y: 9, width: 124, height: 181, rx: 8, fill: "none", stroke: "#9db98a", opacity: 0.6 }), h("path", { d: "m71 53 12 34 33 13-33 13-12 34-12-34-33-13 33-13Z", fill: "none", stroke: "#b4c69a", strokeWidth: 2 })),
          h("g", { transform: "translate(133 35) rotate(12 77 110)" }, h("rect", { width: 153, height: 218, rx: 13, fill: "url(#gw-art-card)", stroke: "#dbc389", strokeWidth: 2 }), h("rect", { x: 9, y: 9, width: 135, height: 200, rx: 9, fill: "none", stroke: "#7d9873", opacity: 0.6 }), h("circle", { cx: 77, cy: 92, r: 49, fill: "#9eb994", opacity: 0.4 }), h("path", { d: "m43 100-8-36 25 17 17-16 18 16 25-17-9 36-6 32-28 18-28-18Z", fill: "#2a6557" }), h("path", { d: "m48 99 16 5-11 10m53-15-16 5 11 10M68 126l9 7 9-7", fill: "none", stroke: "#e6d597", strokeWidth: 3, strokeLinecap: "round", strokeLinejoin: "round" }), h("path", { d: "M77 54v17m-7-8h14M48 171h58M61 184h32", stroke: "#748d68", strokeWidth: 2, strokeLinecap: "round" }), h("circle", { cx: 77, cy: 91, r: 4, fill: "#e6d597" })),
          h("path", { d: "m293 53 3 9 9 3-9 3-3 9-3-9-9-3 9-3ZM38 145l2 6 6 2-6 2-2 6-2-6-6-2 6-2Z", fill: "#d9c48a" })
        );
      }
      return {
        inject: ["slots", "locale"],
        apply(ctx) {
          const { meta: _zh, ...zhUi } = zh_default;
          const { meta: _en, ...enUi } = en_default;
          ctx.effect(() => ctx.locale.register("game-workshop", { zh: zhUi, en: enUi }), "game-workshop locale");
          const t = ctx.locale.bind("game-workshop");
          const subscribe = (listener) => ctx.locale.subscribe(listener);
          const getSnapshot = () => ctx.locale.getSnapshot();
          function Workshop() {
            const snapshot = React.useSyncExternalStore(subscribe, getSnapshot);
            const language = snapshot.active === "zh" ? "zh" : "en";
            const [playing, setPlaying] = React.useState(false);
            const [prompt, setPrompt] = React.useState(PROMPT);
            const [copyState, setCopyState] = React.useState("");
            const downloadRef = React.useRef(null);
            const html = React.useMemo(() => renderGame({ language }), [language]);
            const [downloadUrl, setDownloadUrl] = React.useState("");
            React.useEffect(() => {
              const url = URL.createObjectURL(new Blob([html], { type: "text/html;charset=utf-8" }));
              setDownloadUrl(url);
              return () => URL.revokeObjectURL(url);
            }, [html]);
            async function copyPrompt() {
              try {
                await navigator.clipboard.writeText(prompt);
                setCopyState("copied");
              } catch {
                setCopyState("copyFailed");
              }
            }
            const download = (hero = false) => h("a", { ref: downloadRef, className: `gw-btn${hero ? " gw-btn-hero" : ""}`, href: downloadUrl || void 0, download: language === "zh" ? "雾岭灵契.html" : "Mistbound-Pacts.html", "data-testid": "download-game" }, t("download"));
            return h(
              "main",
              { className: "gw-page", "data-testid": "game-workshop-page" },
              h("style", null, STYLE),
              h(
                "div",
                { className: "gw-wrap" },
                h("header", { className: "gw-heading" }, h("div", null, h("div", { className: "gw-eyebrow" }, t("eyebrow")), h("h1", null, t("heading")), !playing && h("p", { className: "gw-muted" }, t("intro"))), h("span", { className: "gw-version" }, "v0.1.0")),
                playing ? h(
                  "section",
                  { "aria-label": t("gameTitle") },
                  h("div", { className: "gw-gamebar" }, h("h2", null, t("sampleTitle")), h("div", { className: "gw-actions" }, download(), h("button", { className: "gw-btn", onClick: () => setPlaying(false) }, t("closeGame")))),
                  h("iframe", { className: "gw-game", title: t("gameTitle"), srcDoc: html, sandbox: "allow-scripts allow-same-origin allow-downloads", "data-testid": "game-frame" }),
                  h("p", { className: "gw-game-note" }, t("gameHelp"))
                ) : h("section", { className: "gw-hero", "aria-label": t("sampleTitle") }, h(
                  "div",
                  null,
                  h("span", { className: "gw-sample-label" }, t("sampleLabel")),
                  h("h2", null, t("sampleTitle")),
                  h("p", null, t("sampleDescription")),
                  h("div", { className: "gw-actions" }, h("button", { className: "gw-btn gw-btn-primary", onClick: () => setPlaying(true), "data-testid": "start-game" }, h(Icon, {}), t("start")), download(true)),
                  h("div", { className: "gw-features" }, ...["six", "merge", "stages"].map((key) => h("span", { key }, h("i", { className: "gw-dot", "aria-hidden": true }), t(key))))
                ), h(Art, { label: t("previewAlt") })),
                h(
                  "section",
                  { className: "gw-section" },
                  h("h2", null, t("createTitle")),
                  h("p", { className: "gw-muted" }, t("createDescription")),
                  h("label", { htmlFor: "gw-creation-prompt", className: "gw-visually-hidden" }, t("promptLabel")),
                  h("textarea", { id: "gw-creation-prompt", className: "gw-prompt", value: prompt, maxLength: 6e3, onChange: (event) => {
                    setPrompt(event.target.value);
                    setCopyState("");
                  }, spellCheck: false, "data-testid": "creation-prompt" }),
                  h("div", { className: "gw-actions" }, h("button", { className: "gw-btn", onClick: copyPrompt, "data-testid": "copy-prompt" }, t("copy")), h("span", { className: "gw-copy-status", role: "status" }, copyState ? t(copyState) : ""))
                ),
                h(
                  "section",
                  { className: "gw-section" },
                  h("h2", null, t("editorsTitle")),
                  h("p", { className: "gw-muted" }, t("editorsDescription")),
                  h("div", { className: "gw-editors" }, ...["unity", "unreal", "blender"].map((editor) => h("article", { key: editor, className: "gw-editor" }, h("strong", null, t(editor)), h("small", null, t(editor === "unreal" ? "http" : "stdio")), h("span", { className: "gw-off" }, t("disabled"))))),
                  h("p", { className: "gw-safety" }, t("editorSafety"))
                ),
                h("footer", { className: "gw-footer" }, h("span", null, t("footer")), h("a", { className: "gw-link", href: "https://github.com/a348579184/dsh-game-workshop#readme", target: "_blank", rel: "noopener noreferrer" }, t("docs")))
              )
            );
          }
          ctx.slots.inject("main", () => ctx.slots.register({ name: "main", key: "game-workshop", locale: "game-workshop" }, Workshop));
          ctx.slots.inject("sidebar.panellist", () => ctx.slots.register({ name: "sidebar.panellist", id: "game-workshop", order: 25, locale: "game-workshop", label: () => t("panel") }, Icon));
        }
      };
    }
  });
})();
