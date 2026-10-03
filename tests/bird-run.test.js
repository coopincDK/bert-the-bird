'use strict';

const assert = require('node:assert/strict');
const fs = require('node:fs');
const vm = require('node:vm');

const context = { window: {} };
vm.createContext(context);
for (const script of ['webapp/bert-bird-run.js', 'webapp/unity-collision.js']) {
    vm.runInContext(fs.readFileSync(script, 'utf8'), context);
}
const birdRun = context.window.BertBirdRun;
const collision = context.window.BertCollision;
assert.equal(birdRun.WARNING_SECONDS, 0.9);
assert.equal(birdRun.PREDATOR_WARNING_SECONDS, 1.4);

function seeded(seed) {
    let value = seed >>> 0;
    return () => { value = (Math.imul(value, 1664525) + 1013904223) >>> 0; return value / 0x100000000; };
}
function capture(seed) {
    const random = seeded(seed);
    return Array.from({ length: 30 }, (_, id) => birdRun.createEncounter(id, 1400, random));
}
const a = capture(13579);
const b = capture(13579);
assert.deepEqual(JSON.parse(JSON.stringify(a)), JSON.parse(JSON.stringify(b)), 'The same seed must yield the same traffic.');
assert.equal(a.filter(({ obstacle }) => obstacle.direction === 'rear').length, 7);
assert.equal(a.filter(({ obstacle }) => obstacle.predator).length, 1,
    'Only one large predator may chase Bert per event run.');
assert(a[5].obstacle.predator && ['eagle', 'vulture'].includes(a[5].obstacle.species));
assert.deepEqual(a.slice(0, 3).map(({ obstacle }) => obstacle.species), ['glider', 'swift', 'kite']);
assert.equal(new Set(a.map(({ obstacle }) => obstacle.artKey)).size, 3);
for (let id = 0; id < a.length; id += 1) {
    const { obstacle, star } = a[id];
    const rear = id === 5 || id >= 3 && id % 5 === 3;
    assert.equal(obstacle.direction, rear ? 'rear' : 'front');
    assert(obstacle.y >= 120 && obstacle.y + obstacle.height <= 585, 'The upper and lower lanes stay open.');
    assert.equal(obstacle.artKey, birdRun.SPECIES[obstacle.species].asset);
    assert(Math.abs(obstacle.pathTravel) <= 106);
    assert.equal(obstacle.harmful, true);
    assert(obstacle.heroId && Number.isFinite(obstacle.animationOffset),
        'Traffic and predators must use the real animated selectable hero poses.');
    if (rear) {
        assert.equal(star, null, 'Rear crossing has no enticing star in its hazard route.');
        assert.equal(obstacle.warningRemaining, obstacle.predator ? 1.4 : 0.9);
        assert(obstacle.x + obstacle.width < 0);
    } else {
        assert.equal(obstacle.warningRemaining, 0);
        assert(star.x > obstacle.x + obstacle.width, 'Stars arrive only after the front encounter.');
        assert(Math.abs(star.y - (obstacle.y + obstacle.height / 2)) >= 150);
    }
    const shape = collision.obstacleShapes(obstacle)[0];
    assert.equal(shape.type, 'box');
    assert(shape.x >= obstacle.x && shape.y >= obstacle.y);
    assert(shape.width <= obstacle.width && shape.height <= obstacle.height);
    const fromFront = collision.obstacleShapes({ ...obstacle, direction: 'front' })[0];
    const fromRear = collision.obstacleShapes({ ...obstacle, direction: 'rear' })[0];
    assert(Math.abs((fromFront.x - obstacle.x)
        - (obstacle.x + obstacle.width - fromRear.x - fromRear.width)) < 0.0001,
    'A bird approaching from behind must mirror its visible body hitbox with the sprite.');
    assert(collision.birdHitsObstacle({ x: shape.x + shape.width / 2,
        y: shape.y + shape.height / 2, radius: 31 }, obstacle), 'A visible body touch collides.');
    for (const safeY of [48, 666]) {
        assert(!collision.birdHitsObstacle({ x: shape.x + shape.width / 2, y: safeY, radius: 32 }, obstacle),
            'A bird may never close both the upper and lower routes.');
    }
}
for (const { obstacle } of a) {
    const startY = obstacle.y;
    let midY = startY;
    for (let step = 0; step < 170; step += 1) {
        const previousY = obstacle.y;
        birdRun.advance(obstacle, 1 / 60, 400 / 60, step % 75 < 40 ? 220 : 500);
        if (step === 29) midY = obstacle.y;
        assert(Math.abs(obstacle.y - previousY) < 3.5, 'Birds may slope smoothly, never jump lanes.');
        assert(obstacle.y >= 118 && obstacle.y + obstacle.height < 608,
            'The hazard never disappears behind either cloud bank.');
        const shape = collision.obstacleShapes(obstacle)[0];
        assert(shape.x >= obstacle.x && shape.y >= obstacle.y);
        assert(shape.x + shape.width <= obstacle.x + obstacle.width);
        assert(shape.y + shape.height <= obstacle.y + obstacle.height);
        for (const safeY of [48, 666]) {
            assert(!collision.birdHitsObstacle({ x: shape.x + shape.width / 2, y: safeY, radius: 32 }, obstacle),
                'Even a diving species must keep an upper or lower route open.');
        }
    }
    if (obstacle.predator) {
        assert(Math.abs(obstacle.y - obstacle.baseY) <= 82.0001,
            'The predator can follow Bert briefly, never close both escape lanes.');
    } else assert(Math.abs((obstacle.y - startY) - obstacle.pathTravel) < 4,
        'Normal birds must actually follow their distinct profiles.');
    if (obstacle.species === 'glider' && obstacle.direction === 'front') {
        assert(Math.abs(midY - startY) < 4, 'The glider should fly straight first and then change height.');
    }
    if (obstacle.species === 'swift') assert(obstacle.pathTravel > 80);
    if (obstacle.species === 'kite') assert(obstacle.pathTravel < -80);
}
const rear = birdRun.createEncounter(3, 1400, seeded(7)).obstacle;
const offscreen = rear.x;
for (let step = 0; step < 45; step += 1) birdRun.advance(rear, 1 / 60, 400 / 60);
assert(rear.warningRemaining >= 0.14 && rear.warningRemaining <= 0.16);
assert.equal(rear.x, offscreen, 'The danger stays offscreen throughout its early visible warning.');
assert.equal(rear.flightAge, 0, 'The slope begins only after the full rear warning.');
for (let step = 0; step < 12; step += 1) birdRun.advance(rear, 1 / 60, 400 / 60);
assert.equal(rear.warningRemaining, 0);
assert(rear.x > offscreen && rear.x < 0, 'After warning ends, bird advances from behind, not teleporting onto Bert.');
let elapsed = 0;
while (!birdRun.isGone(rear, 1280) && elapsed < 12) {
    birdRun.advance(rear, 1 / 60, 400 / 60);
    const shape = collision.obstacleShapes(rear)[0];
    assert(shape.y >= rear.y && shape.y + shape.height <= rear.y + rear.height);
    elapsed += 1 / 60;
}
assert(elapsed < 12, 'Rear bird must leave the stage and permit another group.');
const front = birdRun.createEncounter(0, 1400, seeded(7)).obstacle;
const oldX = front.x;
birdRun.advance(front, 1 / 60, 400 / 60);
assert(front.x < oldX, 'Front bird approaches from the right.');
assert(!birdRun.isGone(front, 1280));
for (const roll of [0.1, 0.9]) {
    const hunter = birdRun.createEncounter(5, 1400, () => roll).obstacle;
    assert.equal(hunter.species, roll < 0.5 ? 'eagle' : 'vulture');
    const startX = hunter.x;
    for (let step = 0; step < 72; step += 1) birdRun.advance(hunter, 1 / 60, 400 / 60, 480);
    assert.equal(hunter.x, startX, 'The large bird stays fully offscreen through its warning.');
    assert(hunter.warningRemaining > 0.19);
    for (let step = 0; step < 13; step += 1) birdRun.advance(hunter, 1 / 60, 400 / 60, 480);
    assert(hunter.x < 0 && hunter.x > startX,
        'The predator enters visibly from behind instead of appearing on Bert.');
}
const expectedCapacities = [1, 1, 1, 1, 2, 1, 2, 3, 1, 3, 4, 4, 4, 1, 5, 5, 5, 5, 1, 6];
assert.deepEqual(expectedCapacities.map((_, id) => birdRun.waveSize(id)), expectedCapacities,
    'The first birds teach safe controls; later waves build slowly with solo rear-warning breaks.');
for (const id of [0, 4, 6, 7, 10, 14, 19, 32]) {
    const first = birdRun.createWave(id, 1400, seeded(778));
    const repeat = birdRun.createWave(id, 1400, seeded(778));
    assert.deepEqual(JSON.parse(JSON.stringify(first)), JSON.parse(JSON.stringify(repeat)),
        'Identical seeded event waves must contain identical art, lanes, motion and reward.');
    assert.equal(first.obstacles.length, birdRun.waveSize(id));
    assert(first.obstacles.length <= 6);
    assert(first.obstacles.every((obstacle, index) => obstacle.waveIndex === index
        && obstacle.waveSize === first.obstacles.length));
    if (first.obstacles.length > 1) {
        assert(first.obstacles.every((obstacle) => obstacle.direction === 'front'
            && obstacle.scrollFactor === first.obstacles[0].scrollFactor));
        assert(first.star && first.star.x > first.obstacles.at(-1).x + first.obstacles.at(-1).width,
            'A wave must grant one star only after its LAST bird, never between approaching bodies.');
        for (let index = 1; index < first.obstacles.length; index += 1) {
            const previous = first.obstacles[index - 1];
            const next = first.obstacles[index];
            assert.notEqual(next.species, previous.species,
                'Neighboring birds in a wave need distinct silhouettes and flight profiles.');
            assert(next.x - previous.x >= (first.obstacles.length === 6 ? 210 : 220),
                'Birds enter the picture at different times.');
            assert(next.x - (previous.x + previous.width) >= 60,
                'Even six birds must have a readable horizontal gap between drawn bodies.');
        }
    }
    for (let tick = 0; tick < 450; tick += 1) {
        first.obstacles.forEach((obstacle) => birdRun.advance(obstacle, 1 / 60, 400 / 60, 360));
        const crossing = first.obstacles.filter((obstacle) => {
            const shape = collision.obstacleShapes(obstacle)[0];
            return shape.x < 309 && shape.x + shape.width > 185;
        });
        assert(crossing.length <= 1,
            `Wave ${id} may not put two dangerous bodies across Bert's x-band at once.`);
        for (const bird of first.obstacles) {
            const shape = collision.obstacleShapes(bird)[0];
            for (const safeY of [48, 666]) {
                assert(!collision.birdHitsObstacle({x: shape.x + shape.width / 2, y: safeY, radius: 32}, bird));
            }
        }
    }
}
for (const id of [3, 5, 8, 13, 18]) {
    const wave = birdRun.createWave(id, 1400, seeded(778));
    assert.equal(wave.obstacles.length, 1);
    assert.equal(wave.obstacles[0].direction, 'rear');
    assert.equal(wave.star, null);
    assert(wave.obstacles[0].warningRemaining >= .9);
}
for (let seed = 1; seed <= 64; seed += 1) {
    const wave = birdRun.createWave(19, 1400, seeded(seed));
    assert.equal(wave.obstacles.length, 6);
    assert(wave.obstacles.every((bird, i) => i === 0 || bird.species !== wave.obstacles[i - 1].species));
    let allVisibleTogether = false;
    for (let tick = 0; tick < 450; tick += 1) {
        wave.obstacles.forEach((bird) => birdRun.advance(bird, 1 / 60, 400 / 60, 360));
        allVisibleTogether ||= wave.obstacles.every((bird) => bird.x > -20 && bird.x + bird.width < 1270);
        const collidersOnBertX = wave.obstacles.filter((bird) => {
            const box = collision.obstacleShapes(bird)[0];
            return box.x < 309 && box.x + box.width > 185;
        });
        assert(collidersOnBertX.length <= 1, `Seed ${seed} pinches Bert's horizontal reaction band.`);
    }
    assert(allVisibleTogether, `Seed ${seed} never actually shows six birds together.`);
}
console.log('Bird Run deterministic flight, visible warning, collision and open routes: passed');
