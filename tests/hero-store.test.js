const assert = require('node:assert/strict');
const fs = require('node:fs');
const vm = require('node:vm');
const path = require('node:path');
const root = path.join(__dirname, '..', 'webapp');
const catalogSource = fs.readFileSync(path.join(root, 'bert-hero-store.js'), 'utf8');
const metaSource = fs.readFileSync(path.join(root, 'bert-meta.js'), 'utf8');

function load(seed = null, memory = new Map()) {
    if (seed) memory.set('bertTheBird_meta_v1', JSON.stringify(seed));
    const window = { BertHaptics: { setEnabled: () => true, trigger: () => true } };
    const context = vm.createContext({
        window, navigator: {}, Date, Math, JSON, crypto: { randomUUID: () => 'test-pilot' },
        localStorage: { getItem: (key) => memory.get(key) ?? null, setItem: (key, value) => memory.set(key, String(value)) },
    });
    vm.runInContext(catalogSource, context);
    vm.runInContext(metaSource, context);
    return { meta: window.BertMeta, memory, heroes: window.BertHeroStore };
}
const owned = (meta, id) => meta.heroCatalog().find((entry) => entry.id === id);

let { meta, heroes } = load();
assert.equal(meta.heroCatalog().length, 24); // 23 + Æggebert
assert.equal(meta.heroCatalog().filter((hero) => hero.owned).length, 1);
assert.equal(owned(meta, 'block').price, 180);
assert.equal(owned(meta, 'prism').price, 480);
assert.equal(meta.buyHero('unknown').ok, false);
assert.equal(meta.buyHero('bert').ok, false);
assert.equal(meta.buyHero('blue').ok, false);
meta.setHero('prism');
assert.equal(meta.currentHero(), 'bert');
assert.equal(heroes.missionDayStreak({ '2026-02-27': { food: 1 }, '2026-02-28': { food: 1 }, '2026-03-01': { food: 1 } }), 3);
assert.equal(heroes.missionDayStreak({ '2026-02-27': { food: 1 }, '2026-03-01': { food: 1 } }), 1);

const legacyStorage = new Map();
({ meta } = load({ hero: 'prism', player: { id: 'existing-pilot', name: 'Martin' }, feathers: 180, runs: [], economy: { feathersSpent: 0 } }, legacyStorage));
assert.equal(meta.currentHero(), 'prism');
assert.equal(owned(meta, 'prism').source, 'legacy', 'The selected old-build hero must not be confiscated.');
assert.equal(owned(meta, 'blue').owned, false);
meta.setHero('blue');
assert.equal(meta.currentHero(), 'prism', 'A locked hero cannot be equipped.');
assert.equal(meta.buyHero('block').ok, true);
assert.equal(meta.snapshot().feathers, 0);
assert.equal(meta.snapshot().economy.feathersSpent, 180);
assert.equal(owned(meta, 'block').source, 'feathers');
assert.equal(meta.buyHero('block').ok, false, 'A hero must not charge twice.');
meta.setHero('block');
assert.equal(meta.currentHero(), 'block');
({ meta } = load(null, legacyStorage));
assert.equal(meta.snapshot().player.id, 'existing-pilot');
assert.equal(meta.currentHero(), 'block');
assert.equal(owned(meta, 'prism').source, 'legacy');
assert.equal(owned(meta, 'block').source, 'feathers');

({ meta } = load());
assert.equal(meta.noteCleanScore(179), false);
assert.equal(meta.noteCleanScore(180), true);
assert.equal(meta.noteCleanScore(900), false);
assert.equal(owned(meta, 'noir').source, 'achievement');
meta.recordRun({ levelId: 4, score: 200, stars: 0, rescueUsed: true });
assert.equal(owned(meta, 'vulture').owned, false, 'A rescued Jungle run must not earn BoneBeak.');
meta.recordRun({ levelId: 4, score: 20, stars: 0, rescueUsed: false });
assert.equal(owned(meta, 'vulture').source, 'achievement');
// Feedback 4. okt.: starters are picked after 10/20/30/40 flights, not unlocked by one good run.
meta.recordRun({ levelId: 1, score: 120, stars: 250 });
assert.equal(owned(meta, 'block').owned, false, 'A starter is chosen, not unlocked by a good run.');
assert.equal(owned(meta, 'sugar').owned, false, 'A starter never unlocks by itself.');
assert.equal(owned(meta, 'ink').owned, false, 'InkBird only hatches from an egg.');
meta.recordRun({ levelId: 3, score: 300, stars: 0 });
assert.equal(owned(meta, 'eagle').owned, false, 'SkyClaw now needs 600 points on one run.');
meta.recordRun({ levelId: 3, score: 600, stars: 0 });
assert.equal(owned(meta, 'eagle').owned, true);
for (let level = 1; level <= 9; level += 1) meta.recordRun({ levelId: level, score: 20, stars: 0 });
assert.equal(owned(meta, 'prism').owned, true);
for (const level of [1, 4, 5]) meta.recordRun({ levelId: level, score: 100, stars: 0 });
assert.equal(owned(meta, 'moss').owned, true, 'MossHex needs gold on all three Classic levels.');
for (let win = 0; win < 10; win += 1) meta.recordDuel(true);
assert.equal(owned(meta, 'mecha').owned, true);
let choice = meta.starterChoice();
assert(choice.pending >= 1, 'Ten flights earn one starter choice.');
assert.equal(meta.chooseStarter('sugar').ok, true);
assert.equal(owned(meta, 'sugar').source, 'choice');

const days = {};
for (let day = 1; day <= 7; day += 1) days[`2026-09-${String(day).padStart(2, '0')}`] = { food: 1 };
({ meta } = load({ missionClaims: days, feathers: 5, daily: { '2026-09-01': { completedAt: 123 } } }));
assert.equal(owned(meta, 'brain').owned, false, 'Starters are chosen, not earned by streaks.');
assert.equal(owned(meta, 'blue').owned, false);
assert.equal(meta.snapshot().feathers, 5, 'Awards never charge feathers.');
console.log('Hero achievement and feather-shop tests passed.');
