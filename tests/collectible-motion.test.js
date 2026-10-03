'use strict';

const assert = require('node:assert/strict');
const fs = require('node:fs');
const vm = require('node:vm');

const context = { window: {} };
vm.createContext(context);
vm.runInContext(fs.readFileSync('webapp/bert-collectible-motion.js', 'utf8'), context);
const motion = context.window.BertCollectibleMotion;
const random = () => 0.25;

const approach = motion.create('edm', 350, random, 'approach');
const retreat = motion.create('edm', 350, random, 'retreat');
const sweep = motion.create('edm', 360, random, 'sweep');
assert(approach.scrollFactor > 1.2, 'Approaching powerups outpace world scrolling.');
assert(retreat.scrollFactor < 0.85, 'Retreating powerups allow Bert to catch up.');
assert(sweep.amplitude >= 195, 'Concert sweep reaches near upper and lower lanes.');
assert.equal(sweep.baseY, 360);
for (const choice of [approach, retreat, sweep]) {
    for (let age = 0; age < 30; age += 0.05) {
        const y = motion.yAt(choice, age);
        assert(y >= 95 && y <= 625, 'Pickup art and its hitbox stay on screen.');
    }
}
assert(motion.yAt(sweep, 0.55) > motion.yAt(sweep, 0) + 150, 'The sweep reaches a distinctly different lane.');

const tunnel = motion.create('tunnel', 360, random, 'sweep');
assert.equal(tunnel.tunnel, true);
assert(tunnel.amplitude <= 32, 'No full-screen sweeps inside a narrow tunnel.');
for (const center of [240, 360, 495]) {
    for (let age = 0; age < 20; age += 0.1) {
        assert(Math.abs(motion.yAt(tunnel, age, center) - center) <= 32,
            'A powerup follows the changing tunnel center without entering the wall.');
    }
}
const tunnelRandom = motion.create('tunnel', 360, () => 0.99);
assert.notEqual(tunnelRandom.profile, 'sweep', 'Tunnel random generation excludes full sweeps.');
assert.equal(motion.create('edm', 360, () => 0.05).profile, 'approach');
assert.equal(motion.create('edm', 360, () => 0.5).profile, 'retreat');
assert.equal(motion.create('edm', 360, () => 0.95).profile, 'sweep');
assert.equal(motion.safeSpawnX(1280, -Infinity, 185, 1.4), 1370);
const fastSpawn = motion.safeSpawnX(1280, 1500, 185, 1.35);
const slowSpawn = motion.safeSpawnX(1280, 1500, 185, 0.74);
assert(fastSpawn > slowSpawn + 450, 'Fast pickups require overtaking clearance.');
assert(fastSpawn - 1.35 * (1500 - 185) >= 250,
    'At the bird crossing, the fast pickup remains at least 250px past the last obstacle.');
console.log('Powerup approach, retreat, sweep and tunnel bounds passed.');
