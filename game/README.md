# 雾岭灵契 / Mistbound Pacts

An original, dependency-free, offline-first card adventure. All six spirit illustrations are original SVG drawings. Code and artwork use the repository MIT license; generated and downloaded HTML includes its complete notice.

## Rendering

```js
import { renderGame } from './game/render.js';

const html = renderGame({
  title: '雾岭灵契',
  language: 'zh', // default; use 'en' for English
  seed: 'mist-2026',
  cards: [
    { name: '自定义山灵', description: 'An original story.', attack: 25, health: 110, color: '#78d6b3' }
  ]
});
```

`renderGame(options = {})` returns a **complete HTML document**, not a fragment. It starts the actual game immediately; the parent owns its separate launch button. Embed using `iframe.srcdoc` with `allow-scripts allow-same-origin allow-downloads` if sandboxed. No host APIs, fetches, fonts, packages, CDN resources, or images are needed.

The first six entries of `cards` override the fixed six archetypes by index; omitted entries retain defaults. Stats and abilities retain consistent game rules. Options are normalized:

- `title`: nonempty text, maximum 80 characters.
- `seed`: stringified, maximum 80 characters; default `mist-2026`.
- `language`: `en` or Chinese by default.
- Card `name`: nonempty text, maximum 32 characters. Empty/missing uses default.
- Card `description`: maximum 160 characters. Empty/missing uses default.
- Card `attack`: finite number, rounded and clamped to 12–45.
- Card `health`: finite number, rounded and clamped to 60–180.
- Card `color`: exactly `#RRGGBB`; otherwise original palette.
- Control characters are removed; all configurable text is escaped at HTML rendering boundaries and JSON script embedding escapes `<`, `>`, `&`, and Unicode line separators.

## Pure engine

```js
import { createGameEngine } from './game/engine.js';
const game = createGameEngine(options);
let state = game.createInitialState();
state = game.mergeCards(state, game.mergeGroups(state)[0].ids);
state = game.equipItem(state, 'fang', 'c4');
const { state: next, battle } = game.startBattle(state, 1);
```

`createGameEngine(options)` returns configuration-bound data and functions:

| API | Result |
| --- | --- |
| `config`, `gameId`, `beasts`, `items`, `stages`, `VERSION` | Normalized config, save identity, definitions |
| `createInitialState()` | New state with six cards, three matching starter deer, four party members, two relics, 90 dew |
| `drawCard(state)` | `{ state, card }`; costs 12 dew; deterministic seeded draw |
| `mergeGroups(state)` | Available `{ beast, star, ids, count }` groups |
| `mergeCards(state, [id1, id2, id3])` | New state; exactly three matching species/tier; max 3★; preserves one relic and active party identity |
| `equipItem(state, itemId, cardId)` | New state; one unique relic per spirit; `cardId: null` removes |
| `setParty(state, ids)` | New state; 1–4 unique owned spirit IDs, ordered front to back |
| `autoParty(state)` | New state; four strongest companions with durable front line |
| `cardStats(state, cardOrId)` | `{ attack, health, armor, item }`, including star and relic bonuses |
| `availableStages(state)` | Stages with `unlocked` and `completed` flags |
| `startBattle(state, stageId)` | `{ state, battle }`; deterministic result, chronological events, starting combatants, reward summary |
| `validateState(raw)` | Whitelisted defensive state copy, or `null` |
| `serializeState(state)` | Validated JSON string; throws `INVALID_SAVE` for invalid state |
| `deserializeState(text)` | Valid state or `null`; bounded input, guarded JSON parsing |
| `hash(value)`, `nextRandom(rng)` | Deterministic seed/hash utilities |

The module additionally exports the default engine's state/action/save functions and `BEASTS`, `ITEMS`, `STAGES` as named exports. Actions never mutate input state. Invalid actions throw errors with stable uppercase codes.

Battle results are committed and saved before their animation starts. This intentionally makes closing/reloading during an animation safe and prevents paying/claiming twice. Each animation offers 1×/2×/4× speeds and skip-to-result. Every battle begins at full health; defeat never spends currency. Rewards are first-clear only. The default starter collection plus guaranteed chapter gifts wins all three chapters without summoning, verified across 100 seeds; custom stat extremes may alter difficulty.

## Persistence and offline export

Storage key: `mistbound-v1-<hash>`, based on normalized title, language, seed, and all six custom card definitions. Different configurations do not share saves. All loaded saves are structurally validated, configuration matched, and unknown keys stripped. Invalid saves recover to a fresh state. Blocked/quota-limited localStorage is handled with an honest visible warning; the game remains playable.

The in-game offline button downloads a single HTML file containing the full engine, UI, original art, styles, license, configuration, and current validated save. A valid local save takes precedence on reopening, then embedded save, then fresh start. Downloading a newly generated `renderGame()` result from the parent starts a fresh game; use the in-game download to capture current progress.

## Accessibility and tests

All primary controls have accessible names. Cards indicate selected/deployed state; battle health meters expose values; dialogs trap focus and support Escape; motion respects `prefers-reduced-motion`. Battle logs are visible and scrollable without constantly interrupting screen readers. Toasts and the final battle result announce important outcomes.

Stable selectors include `draw-button`, `merge-button`, `equip-fang`, `equip-veil`, `equip-bell`, `equip-crown`, `auto-party`, `battle-1`/`battle-2`/`battle-3`, `battle-speed`, `skip-battle`, `close-battle`, `reset-button`, `confirm-reset`, `cancel-reset`, `download-button`, `save-status`, and `card-<id>` as `data-testid` values. Runtime sets `window.__MISTBOUND_READY__ = true` after initial boot.

```sh
node --test tests/game.test.mjs
```

Tests cover deterministic draws, six original art variants, merges/equipment/party validation, progressive unlocks, reward replay protection, 100-seed no-grind balance, defeat behavior, save validation, malicious strings, configuration bounds, executable portable HTML, bilingual UI actions, reset confirmation, storage recovery, and embedded offline saves. Browser integration/layout testing belongs to the parent plugin's end-to-end checks.
