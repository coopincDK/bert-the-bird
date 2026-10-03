'use strict';

const assert = require('node:assert/strict');
const fs = require('node:fs');
const vm = require('node:vm');
const context = { window: {} };
vm.createContext(context);
for (const path of ['webapp/bert-stormline.js', 'webapp/bert-event-powerups.js',
    'webapp/bert-physics.js', 'webapp/unity-collision.js', 'webapp/bert-edm.js']) {
    vm.runInContext(fs.readFileSync(path, 'utf8'), context);
}
const storm = context.window.BertStormline;
const powers = context.window.BertEventPowerups;
const physics = context.window.BertPhysics;
const collision = context.window.BertCollision;
const edm = context.window.BertEDM;

const breeze = storm.windCue(2);
const headwind = storm.windCue(14);
const gale = storm.windCue(26);
const hurricane = storm.windCue(50);
assert.equal(breeze.grade, 'brise');
assert.equal(gale.grade, 'storm');
assert.equal(hurricane.grade, 'orkan');
assert.equal(breeze.label, 'MEDVIND');
assert.equal(headwind.label, 'MODVIND');
assert(breeze.horizontal > 0 && headwind.horizontal < 0);
assert(gale.vertical < 0 && storm.windCue(38).vertical > 0);
assert(breeze.speedFactor > 1 && headwind.speedFactor < 1,
    'A tailwind must speed up the whole scene while a headwind slows it.');
assert(gale.liftAcceleration < 0 && storm.windCue(38).liftAcceleration > 0,
    'The visibly diagonal wind must change Bert vertical velocity, not only move props.');
for (const boundary of [12, 24, 36, 48, 60]) {
    assert.equal(storm.windCue(boundary).strength, 0,
        'Direction and strength must ease in from calm at every scheduled reversal.');
    assert(storm.windCue(boundary - .1).strength < .085,
        'Wind must also fade out before changing direction, never drop from full force in one frame.');
    assert.equal(storm.windCue(boundary).grade, 'stille',
        'Barometer and hazard grade may never report a full hurricane at zero actual wind.');
    assert.equal(storm.hazardKind(6, storm.windCue(boundary)), 'storm-sail',
        'A lull cannot spawn a car even if the next phase is a hurricane.');
}
assert.equal(edm.STAGE_PROJECTORS.length, 5);
assert(edm.STAGE_PROJECTORS.every((lamp) => lamp.y >= 550 && lamp.y < 585));
assert.equal(edm.smokeCue(0).active, false);
assert(edm.smokeCue(9.8).opacity > 0 && edm.smokeCue(9.8).opacity <= 0.15);
assert.equal(edm.smokeCue(9.8, true).active, false);

let rng = 17;
function random() { rng = (Math.imul(rng, 1664525) + 1013904223) >>> 0; return rng / 0x100000000; }
const kinds = new Set();
for (const cue of [breeze, gale, hurricane]) {
    for (let id = 0; id < 24; id += 1) {
        const { obstacle, star } = storm.createEncounter(id, 1400, random, cue);
        kinds.add(obstacle.kind);
        assert.equal(obstacle.harmful, true);
        assert(storm.isHazard(obstacle));
        assert(star.x >= obstacle.x + obstacle.width + 350,
            'Stars follow a completed crossing, never bait Bert into an oncoming object.');
        assert([220, 360, 510].includes(star.y),
            'Stormline rewards must move between clear low, middle and high routes.');
        const shape = collision.obstacleShapes(obstacle)[0];
        assert(['circle', 'box'].includes(shape.type));
        const left = shape.type === 'circle' ? shape.x - shape.radius : shape.x;
        const right = shape.type === 'circle' ? shape.x + shape.radius : shape.x + shape.width;
        const top = shape.type === 'circle' ? shape.y - shape.radius : shape.y;
        const bottom = shape.type === 'circle' ? shape.y + shape.radius : shape.y + shape.height;
        assert(left >= obstacle.x && right <= obstacle.x + obstacle.width);
        assert(top >= obstacle.y && bottom <= obstacle.y + obstacle.height);
        assert(collision.birdHitsObstacle({ x: (left + right) / 2, y: (top + bottom) / 2, radius: 24 }, obstacle));
        for (const safeY of [85, 645]) {
            assert(!collision.birdHitsObstacle({ x: (left + right) / 2, y: safeY, radius: 30 }, obstacle),
                'Both high and low routes remain open for every object and storm strength.');
        }
        for (let frame = 0; frame < 900; frame += 1) {
            const oldY = obstacle.y;
            storm.advance(obstacle, 1 / 60, 4, storm.windCue(frame / 60));
            assert(Math.abs(obstacle.y - oldY) <= 96 / 60 + 0.00001,
                'Wind cannot teleport a collider.');
            assert(obstacle.y >= 155 && obstacle.y + obstacle.height <= 594,
                'No object closes both the upper and lower passages.');
        }
    }
}
assert.deepEqual([...kinds].sort(), ['storm-sail', 'wind-branch', 'wind-car', 'wind-sign', 'wind-umbrella']);
assert.equal(storm.hazardKind(0, hurricane), 'storm-sail');
assert.equal(storm.hazardKind(9, hurricane), 'wind-car');
assert([...Array(110).keys()].filter(id => storm.hazardKind(id, hurricane) === 'wind-car').length <= 10,
    'The car must be a rare exception among hurricane hazards, not one in every three.');
assert(!['wind-car', 'wind-branch', 'wind-sign'].some((kind) => storm.hazardKind(1, breeze) === kind));

assert.deepEqual(Array.from({ length: 4 }, (_, index) => powers.nextType(index, 8)),
    ['Heavy', 'Hyper', 'Double', 'Flap']);
assert.equal(powers.speed(.8, 'Hyper'), .8 * 1.22);
assert.equal(powers.speed(.8, 'Heavy'), .8);
assert.equal(powers.score(19, 'Double'), 38);
assert.equal(powers.score(19, 'Hyper'), 19);
assert.equal(powers.isFlap('default', 'Flap'), true);
assert.equal(powers.isFlap('flappy', null), true);
assert.equal(powers.isFlap('default', null), false);
assert.equal(powers.DURATION.Flap, 10);
for (const input of [{ up: true, down: false }, { up: false, down: true }]) {
    let normal = 0;
    let heavy = 0;
    for (let frame = 0; frame < 35; frame += 1) {
        normal = physics.stepDefault(normal, input.up, input.down, 1, 1 / 60);
        heavy = physics.stepDefault(heavy, input.up, input.down, 1, 1 / 60, physics.HEAVY);
    }
    if (input.up) assert(heavy > normal + 180, 'Metal must make rising materially harder.');
    else assert(heavy > normal + 80, 'Metal must make falling materially easier.');
}
console.log('Stormline three-tier physical wind, fair visible hazards and 4 isolated powerups: PASS');
