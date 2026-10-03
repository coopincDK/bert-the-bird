const assert = require('node:assert/strict');
const path = require('node:path');

const calls = [];
global.window = {};
Object.defineProperty(global, 'navigator', {
    configurable: true,
    value: {
        userAgent: 'Mozilla/5.0 (Linux; Android 15)',
        platform: 'Linux armv8l',
        maxTouchPoints: 5,
        vibrate: (pattern) => { calls.push(pattern); return true; },
    },
});

require(path.join(__dirname, '..', 'webapp', 'bert-haptics.js'));
const haptics = global.window.BertHaptics;

assert.equal(haptics.isEnabled(), true);
assert.equal(haptics.trigger('star'), true);
assert.equal(calls.at(-1), 12, 'A normal star should produce one light tick.');
assert.deepEqual(haptics.effects.bonusStar, [16, 22, 16]);
haptics.trigger('powerup');
assert.deepEqual(calls.at(-1), [24, 18, 42]);
haptics.trigger('death');
assert.deepEqual(calls.at(-1), [72, 36, 115]);
assert.equal(haptics.snapshot().lastEffect, 'death');
assert.equal(haptics.snapshot().lastTransport, 'vibration');

const deliveredBeforeDisable = calls.length;
haptics.setEnabled(false);
assert.equal(haptics.trigger('record'), false);
assert.equal(calls.length, deliveredBeforeDisable, 'Disabled haptics must not reach the device.');
haptics.setEnabled(true);
haptics.trigger('record');
assert.deepEqual(calls.at(-1), [28, 22, 46, 28, 88]);

console.log('Cross-platform haptic pattern tests passed.');
