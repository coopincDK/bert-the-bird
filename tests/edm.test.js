'use strict';

const assert = require('node:assert/strict');
const fs = require('node:fs');
const vm = require('node:vm');

const context = { window: {} };
vm.createContext(context);
for (const script of ['webapp/bert-edm.js', 'webapp/unity-collision.js']) {
    vm.runInContext(fs.readFileSync(script, 'utf8'), context);
}
const edm = context.window.BertEDM;
const collision = context.window.BertCollision;
assert.equal(edm.BPM, 120);
assert.deepEqual([0, 1, 2, 3, 5, 7, 9].map(edm.groupKind),
    ['pair', 'pair', 'pair', 'center-rig', 'solo-floor', 'crowd-ball', 'solo-ceiling']);

let discoCount = 0;
let centerCount = 0;
let movingCount = 0;
const scrollFactors = new Set();
const burstSizes = new Set();
const bounceHeights = new Set();
let soloFloorCount = 0;
let soloCeilingCount = 0;
for (let id = 0; id < 64; id += 1) {
    const group = edm.createGroup(id, 1400, 1 + id / 30, () => 0.5);
    assert.equal(group.kind, edm.groupKind(id));
    if (group.kind === 'pair') {
        assert.equal(group.obstacles.length, 2);
        assert(group.gap >= 294, 'The familiar pair passage remains wide enough for Bert.');
        assert.equal(group.obstacles[0].id, group.obstacles[1].id);
        assert(group.obstacles[0].harmful && group.obstacles[1].harmful);
        assert(group.stars[0].y > group.gapTop + 100);
        assert(group.stars[0].y < group.gapTop + group.gap - 100);
        assert(group.stars[0].x > 1400 + 112, 'Stars appear after the obstacle.');
        if (group.obstacles[0].kind === 'edm-orb') {
            discoCount += 1;
            const orb = group.obstacles[0];
            const solid = collision.obstacleShapes(orb)[0];
            assert.equal(solid.type, 'circle');
            assert(collision.birdHitsObstacle({ x: solid.x, y: solid.y, radius: 30 }, orb));
            assert(!collision.birdHitsObstacle({ x: solid.x, y: 24, radius: 30 }, orb),
                'The decorative cable is not lethal.');
        }
        continue;
    }
    assert.equal(group.stars.length, 0, 'Choosing either route must never break a star streak.');
    if (group.kind === 'crowd-ball') {
        movingCount += 1;
        burstSizes.add(group.obstacles.length);
        for (const obstacle of group.obstacles) {
            const x = obstacle.x + obstacle.width / 2;
            assert.equal(obstacle.id, id);
            assert.equal(obstacle.baseY + obstacle.height, 670,
                'Every ball lands between the raised audience hands.');
            bounceHeights.add(obstacle.motionAmplitude);
            scrollFactors.add(obstacle.scrollFactor);
            assert.equal(collision.obstacleShapes(obstacle)[0].type, 'circle');
            for (let age = 0; age < 6; age += 0.1) {
                obstacle.y = edm.crowdBallY(age, obstacle.baseY, obstacle.motionAmplitude,
                    obstacle.motionPhase, obstacle.motionSpeed);
                assert(obstacle.y >= 255 && obstacle.y + obstacle.height <= 670,
                    'Throws stay visible and bounce from the audience, never above the top route.');
                assert(!collision.birdHitsObstacle({ x, y: 148, radius: 31 }, obstacle),
                    'The high route always remains open even through a six-ball wave.');
                const live = collision.obstacleShapes(obstacle)[0];
                assert(Math.abs(live.y - (obstacle.y + obstacle.height / 2)) < 0.000001);
                assert(collision.birdHitsObstacle({ x: live.x, y: live.y, radius: 31 }, obstacle));
            }
        }
        continue;
    }
    assert.equal(group.obstacles.length, 1);
    const obstacle = group.obstacles[0];
    const x = obstacle.x + obstacle.width / 2;
    const shape = collision.obstacleShapes(obstacle)[0];
    assert(collision.birdHitsObstacle({ x: shape.x + (shape.width || 0) / 2,
        y: shape.y + (shape.height || 0) / 2, radius: 31 }, obstacle));
    if (group.kind === 'center-rig') {
        centerCount += 1;
        assert.equal(shape.type, 'box');
        assert(!collision.birdHitsObstacle({ x, y: 118, radius: 31 }, obstacle));
        assert(!collision.birdHitsObstacle({ x, y: 605, radius: 31 }, obstacle));
        assert(shape.width <= obstacle.width && shape.height <= obstacle.height);
    } else if (group.kind.startsWith('solo-')) {
        assert.equal(shape.type, 'box');
        assert.equal(obstacle.kind, 'edm-tower');
        if (group.kind === 'solo-floor') {
            soloFloorCount += 1;
            assert(obstacle.y <= 235 && obstacle.y >= 205);
            assert(!collision.birdHitsObstacle({ x, y: 118, radius: 31 }, obstacle),
                'A tall floor tower always leaves an upper route.');
            assert(collision.birdHitsObstacle({ x, y: 525, radius: 31 }, obstacle));
        } else {
            soloCeilingCount += 1;
            assert(obstacle.height >= 460 && obstacle.height <= 480);
            assert(!collision.birdHitsObstacle({ x, y: 605, radius: 31 }, obstacle),
                'A deep ceiling truss always leaves a lower route.');
            assert(collision.birdHitsObstacle({ x, y: 200, radius: 31 }, obstacle));
        }
    }
}
assert(centerCount >= 8 && movingCount >= 7 && discoCount >= 6);
assert(soloFloorCount >= 7 && soloCeilingCount >= 6);
assert([...scrollFactors].some((factor) => factor < 1) && [...scrollFactors].some((factor) => factor > 1));
assert(burstSizes.has(1) && [...burstSizes].some((size) => size >= 2));
assert(bounceHeights.size >= 4);
assert.deepEqual([0.02, 0.28, 0.58, 0.85, 0.99].map((roll) => edm.crowdBallCount(22, roll)),
    [1, 2, 3, 4, 6]);
const wave = edm.createGroup(22, 1400, 1, () => 0.99).obstacles;
assert.equal(wave.length, 6);
assert.equal(JSON.stringify(wave), JSON.stringify(edm.createGroup(22, 1400, 1, () => 0.99).obstacles));
const ball = wave[0];
ball.x = 850;
ball.age = (1 - ball.motionPhase) / ball.motionSpeed - 0.008;
edm.advanceCrowdBall(ball, 1 / 60, 9, 309, 1280, () => 0);
assert.equal(ball.reverseCount, 1, 'First visible landing ahead of Bert may send a ball away.');
const beforeReverse = ball.x;
edm.advanceCrowdBall(ball, 1 / 60, 9, 309, 1280, () => 0);
assert(ball.x > beforeReverse, 'A bounced-away ball moves right, not at Bert.');
ball.reverseRemaining = 0;
ball.x = 820;
ball.age = (2 - ball.motionPhase) / ball.motionSpeed - 0.008;
edm.advanceCrowdBall(ball, 1 / 60, 9, 309, 1280, () => 0);
assert.equal(ball.reverseCount, 2, 'The same ball may reverse twice at separate landings.');
ball.reverseRemaining = 0;
ball.x = 280;
ball.age = (3 - ball.motionPhase) / ball.motionSpeed - 0.008;
edm.advanceCrowdBall(ball, 1 / 60, 9, 309, 1280, () => 0);
assert.equal(ball.reverseCount, 2, 'A ball at/behind Bert must never reverse into an unseen attack.');
const lateBall = edm.createGroup(22, 1400, 1, () => 0.5).obstacles[0];
lateBall.x = 850;
lateBall.age = (1 - lateBall.motionPhase) / lateBall.motionSpeed - 0.008;
edm.advanceCrowdBall(lateBall, 1 / 60, 9, 309, 1280, () => 0.99);
assert.equal(lateBall.reverseCount, 0, 'The landing choice remains random but seeded.');
const blockedBall = edm.createGroup(22, 1400, 1, () => 0.5).obstacles[0];
blockedBall.x = 850;
blockedBall.age = (1 - blockedBall.motionPhase) / blockedBall.motionSpeed - 0.008;
edm.advanceCrowdBall(blockedBall, 1 / 60, 9, 309, 1280, () => 0, () => false);
assert.equal(blockedBall.reverseCount, 0,
    'A ball cannot reverse toward another nearby stage obstacle group.');
assert.equal(edm.crowdBallY(0, 452, 180, 0, 0.6), 452);
assert.equal(edm.crowdBallY(0.5 / 0.6, 452, 180, 0, 0.6), 272);
assert(Math.abs(edm.crowdBallY(1 / 0.6, 452, 180, 0, 0.6) - 452) < 1e-8);
assert.equal(edm.crowdFrame(0, true), edm.crowdFrame(40, true));
assert.notEqual(edm.crowdFrame(0.1), edm.crowdFrame(0.4));
const cueA = edm.lightCue(0.01);
const cueB = edm.lightCue(0.51);
assert.notEqual(cueA.beat, cueB.beat);
for (let t = 0; t < 60; t += 0.01) {
    const cue = edm.lightCue(t);
    assert(cue.intensity <= 0.16 && cue.intensity >= 0.10, 'There must be no strobe or black frames.');
}
assert.equal(edm.lightCue(0, true).intensity, edm.lightCue(30, true).intensity);
assert.equal(edm.lightCue(0, true).color, edm.lightCue(30, true).color);
console.log('EDM intro, solo routes, safe multi-ball throws, landings, reversals and hitboxes passed.');
