const assert = require('node:assert/strict');
const path = require('node:path');

global.window = {};
require(path.join(__dirname, '..', 'webapp', 'bert-progression.js'));

const { stageValues, scrollPixelsPerSecond, spawnInterval, spawnDelay } = global.window.BertProgression;
const desertStages = [
    { duration: 0.5, speed: 0.8, difficulty: 0.3 },
    { duration: 35, speed: 1.0, difficulty: 0.5 },
    { duration: 35, speed: 1.2, difficulty: 0.6 },
    { duration: 45, speed: 1.6, difficulty: 0.8 },
    { duration: 30, speed: 1.8, difficulty: 1.0 },
    { duration: 60, speed: 2.0, difficulty: 1.0 },
    { duration: 180, speed: 2.8, difficulty: 1.8 },
];

let values = stageValues(0.8, desertStages, 295.5);
assert(Math.abs(values.speed - 2.4) < 1e-9, `Expected Desert speed 2.4, got ${values.speed}`);
assert(Math.abs(values.difficulty - 1.4) < 1e-9, `Expected Desert difficulty 1.4, got ${values.difficulty}`);

values = stageValues(0.8, desertStages, 385.5);
assert.equal(values.speed, 2.8);
assert.equal(values.difficulty, 1.8);
assert.equal(values.progress, 1);

const flappy = stageValues(0.45, [{ duration: 1, speed: 0.4, difficulty: 1.2 }], 1);
assert.equal(flappy.speed, 0.4);
assert.equal(flappy.difficulty, 1.2);

const interval = spawnInterval(1.4, 0.5);
assert(Math.abs(interval - 0.3035714285714286) < 1e-12);
assert.equal(scrollPixelsPerSecond(2.4), 1728);
assert(Math.abs(scrollPixelsPerSecond(2.4) * interval - 524.5714285714286) < 1e-9);

const earlySafeDelay = spawnDelay(1, 0, 0.8, 760);
assert(Math.abs(earlySafeDelay - (760 / 576)) < 1e-9, 'Early Desert obstacles must preserve 760 px center spacing');
const lateSafeDelay = spawnDelay(1.8, 0, 2.8, 760);
assert(Math.abs(scrollPixelsPerSecond(2.8) * lateSafeDelay - 760) < 1e-9, 'Late-game speed must not collapse spatial spacing');

console.log('Unity stage and pacing tests passed.');
