const assert = require('node:assert/strict');
const path = require('node:path');

global.window = {};
require(path.join(__dirname, '..', 'webapp', 'bert-physics.js'));

const { DEFAULT, stepDefault } = global.window.BertPhysics;
const frame = 1 / 60;

function simulate(velocity, seconds, up, down, strength = 1, delta = frame) {
    const frames = Math.round(seconds / delta);
    for (let index = 0; index < frames; index += 1) {
        velocity = stepDefault(velocity, up, down, strength, delta);
    }
    return velocity;
}

const upward = simulate(0, 0.2, true, false);
const downward = simulate(0, 0.2, false, true);
assert(Math.abs(upward + 480) < 0.001, `Expected -480 px/s upward, got ${upward}`);
assert(Math.abs(downward - 480) < 0.001, `Expected +480 px/s downward, got ${downward}`);
assert(Math.abs(Math.abs(upward) - Math.abs(downward)) < 0.001, 'Up/down net acceleration must be symmetric');

const reversedUp = simulate(600, 0.12, true, false);
const reversedDown = simulate(-600, 0.12, false, true);
assert(reversedUp < 0, `Expected fast upward reversal, got ${reversedUp}`);
assert(reversedDown > 0, `Expected fast downward reversal, got ${reversedDown}`);

const naturalFallHalfSecond = simulate(0, 0.5, false, false);
const naturalFallOneSecond = simulate(0, 1, false, false);
assert(Math.abs(naturalFallHalfSecond - 240) < 0.001, `Expected 240 px/s after 0.5 s idle, got ${naturalFallHalfSecond}`);
assert(Math.abs(naturalFallOneSecond - 480) < 0.001, `Expected 480 px/s after 1 s idle, got ${naturalFallOneSecond}`);

const upward30 = simulate(0, 0.2, true, false, 1, 1 / 30);
const downward30 = simulate(0, 0.2, false, true, 1, 1 / 30);
assert(Math.abs(upward30 - upward) < 0.001, 'Upward control must remain frame-rate independent');
assert(Math.abs(downward30 - downward) < 0.001, 'Downward control must remain frame-rate independent');

assert.equal(simulate(0, 2, true, false), DEFAULT.minimumVelocity);
assert.equal(simulate(0, 2, false, true), DEFAULT.maximumVelocity);

console.log('Balanced heavy flight physics tests passed.');
