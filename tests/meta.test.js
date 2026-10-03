const assert = require('node:assert/strict');
const path = require('node:path');

const memory = new Map();
global.localStorage = {
    getItem: (key) => memory.get(key) ?? null,
    setItem: (key, value) => memory.set(key, String(value)),
};
global.navigator = { vibrate: () => true };
global.window = {};
const hapticEffects = [];
const hapticEnabled = [];
global.window.BertHaptics = {
    trigger: (effect) => { hapticEffects.push(effect); return true; },
    setEnabled: (enabled) => { hapticEnabled.push(enabled); return enabled; },
};
require(path.join(__dirname, '..', 'webapp', 'bert-hero-store.js'));
require(path.join(__dirname, '..', 'webapp', 'bert-meta.js'));
const meta = global.window.BertMeta;

assert.equal(meta.snapshot().hero, 'bert');
assert.equal(meta.heroCatalog().length, 21);
meta.setHero('blue');
assert.equal(meta.snapshot().hero, 'bert', 'A locked hero cannot be selected.');
assert.equal(meta.buyHero('prism').ok, false, 'A new player cannot buy a hero without feathers.');
meta.setHero('unknown');
assert.equal(meta.snapshot().hero, 'bert');
assert.equal(meta.currentHero(), 'bert');
meta.setSetting('music', false);
assert.equal(meta.snapshot().settings.music, false);
assert.equal(meta.settingEnabled('music'), false);
assert.equal(hapticEnabled.at(-1), true, 'Saved default must initialize the haptics engine.');
assert.equal(meta.haptic('star'), true);
assert.equal(hapticEffects.at(-1), 'star');
meta.setSetting('haptics', false);
assert.equal(hapticEnabled.at(-1), false);
assert.equal(meta.haptic('death'), false, 'Disabled haptics must not delegate an effect.');
assert.equal(hapticEffects.length, 1);
meta.setSetting('haptics', true);
assert.equal(hapticEnabled.at(-1), true);
meta.setPlayerName('  Martin   Pilot  ');
assert.equal(meta.snapshot().player.name, 'Martin Pilot');

const date = new Date();
date.setHours(12, 0, 0, 0);
const runDate = new Date(Date.UTC(date.getFullYear(), date.getMonth(), date.getDate(), 12)).toISOString();
const dailyA = meta.dailyChallenge(date, [1, 2, 3]);
const dailyB = meta.dailyChallenge(date, [1, 2, 3, 4, 5, 6, 7, 8, 9]);
assert.equal(dailyA.levelId, dailyB.levelId, 'Today’s route must remain stable when more levels unlock.');
assert([1, 2, 3].includes(dailyA.levelId));

meta.recordRun({ levelId: dailyA.levelId, mode: 'classic', score: dailyA.target, stars: 7, dailyKey: dailyA.key, dailyTarget: dailyA.target, createdAt: runDate });
assert.equal(meta.heroCatalog().find((hero) => hero.id === 'blue').source, 'achievement');
meta.setHero('blue');
assert.equal(meta.currentHero(), 'blue');
meta.recordRun({ levelId: 6, mode: 'flappy', score: 75, stars: 2, createdAt: runDate });
assert.equal(meta.snapshot().totalStars, 9);
assert.equal(meta.dailyChallenge(date, [1, 2, 3]).completed, true);
assert.equal(meta.localLeaderboard({ period: 'all', metric: 'score', mode: 'all' }).length, 2);
assert.equal(meta.localLeaderboard({ period: 'all', metric: 'score', mode: 'flappy', level: '6' }).length, 1);
assert.equal(meta.localLeaderboard({ period: 'all', metric: 'score', mode: 'flappy', level: '3' }).length, 0);
assert.equal(meta.missions(date)[0].value, 9);

meta.recordRun({ levelId: 1, mode: 'classic', score: 30, stars: 11, time: 180, streak: 12, createdAt: runDate });
const completedMissions = meta.missions(date);
assert(completedMissions.every((mission) => mission.complete));
assert.equal(meta.claimMission('food', date).reward, 8);
assert.equal(meta.claimMission('flight', date).reward, 12);
assert.equal(meta.claimMission('streak', date).reward, 15);
assert.equal(meta.claimMission('route', date).reward, 10);
assert.equal(meta.claimMission('food', date).ok, false, 'The same mission cannot be claimed twice.');
assert.equal(meta.missionClaimCount(), 4, 'Claimed missions must count as permanent progression milestones.');
assert.equal(meta.snapshot().feathers, 45);
assert.equal(meta.rescueUpgrade().cost, 20);
assert.equal(meta.buyRescueLife().ok, true);
assert.equal(meta.snapshot().nest.rescueLives, 1);
assert.equal(meta.snapshot().feathers, 25);
assert.equal(meta.buyRescueLife().ok, false, 'The second rescue life requires more feathers.');
assert.deepEqual(meta.continueSpinOffer(), { cost: 12, balance: 25, canAfford: true });
assert.equal(meta.buyContinueSpin().ok, true);
assert.equal(meta.snapshot().feathers, 13);
meta.settleContinueSpin({ survived: true, refund: 12 });
assert.equal(meta.snapshot().feathers, 25);
assert.equal(meta.snapshot().economy.continueSpins, 1);
assert.equal(meta.snapshot().economy.revivesWon, 1);
assert.equal(meta.snapshot().economy.feathersSpent, 12);

const levels = [
    { id: 1, modeGroup: 'classic', modeOrder: 1, unlockScore: 0 },
    { id: 4, modeGroup: 'classic', modeOrder: 2, unlockScore: 120 },
    { id: 5, modeGroup: 'classic', modeOrder: 3, unlockScore: 180 },
    { id: 3, modeGroup: 'flappy', modeOrder: 1, unlockScore: 0 },
    { id: 6, modeGroup: 'flappy', modeOrder: 2, unlockScore: 90 },
    { id: 7, modeGroup: 'flappy', modeOrder: 3, unlockScore: 130 },
];
let unlocks = meta.progressionState(levels, { 1: 119, 4: 999, 3: 90, 6: 129 }, { claimedMissions: 4 });
assert.equal(unlocks[1].unlocked, true);
assert.equal(unlocks[4].unlocked, false);
assert.equal(unlocks[5].unlocked, false, 'A later level cannot leapfrog a locked predecessor.');
assert.equal(unlocks[6].unlocked, false, 'Tier 2 must wait until every tier-1 qualification is met.');
assert.equal(unlocks[7].unlocked, false);
unlocks = meta.progressionState(levels, { 1: 120, 4: 180, 3: 90, 6: 130 }, { claimedMissions: 0 });
assert.equal(unlocks[4].unlocked, false, 'Tier 2 also requires one claimed mission.');
assert.equal(unlocks[4].missionRequirement.target, 1);
unlocks = meta.progressionState(levels, { 1: 120, 4: 180, 3: 90, 6: 130 }, { claimedMissions: 1 });
assert.equal(unlocks[4].unlocked, true);
assert.equal(unlocks[6].unlocked, true);
assert.equal(unlocks[5].unlocked, false, 'Tier 3 requires four claimed missions.');
assert.equal(unlocks[5].missionRequirement.target, 4);
unlocks = meta.progressionState(levels, { 1: 120, 4: 180, 3: 90, 6: 130 }, { claimedMissions: 4 });
assert.equal(unlocks[5].unlocked, true);
assert.equal(unlocks[7].unlocked, true);
unlocks = meta.progressionState(levels, { 1: 120, 3: 0 }, { claimedMissions: 0, grandfatheredLevelIds: [4] });
assert.equal(unlocks[4].unlocked, true, 'A previously earned Jungle unlock must survive migration.');
assert.equal(unlocks[4].grandfathered, true);
assert.equal(unlocks[6].unlocked, false, 'Grandfathering one lane must not unlock the other modes.');
assert.equal(unlocks[5].unlocked, false, 'A legacy tier-2 unlock must not bypass tier-3 requirements.');

const quickPool = [1, 3, 2];
assert.equal(meta.nextQuickLevel(quickPool), 1);
assert.equal(meta.nextQuickLevel(quickPool), 3);
assert.equal(meta.nextQuickLevel(quickPool), 2);

meta.recordDuel(true);
meta.recordDuel(true);
assert.equal(meta.snapshot().duels.bestStreak, 2);
meta.recordDuel(false);
assert.equal(meta.snapshot().duels.currentStreak, 0);
assert.equal(meta.medalForScore(10).id, 'flight');
assert.equal(meta.medalForScore(25).id, 'bronze');
assert.equal(meta.medalForScore(55).id, 'silver');
assert.equal(meta.medalForScore(105).id, 'gold');

console.log('Meta progression tests passed.');
