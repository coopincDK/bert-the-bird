'use strict';

const fs = require('fs');
const vm = require('vm');
const assert = require('assert');

const context = { window: {} };
vm.createContext(context);
vm.runInContext(fs.readFileSync('webapp/unity-collision.js', 'utf8'), context);
const collision = context.window.BertCollision;

const bird = collision.bertCollider({ x: 185, y: 300, rotation: 0 }, { width: 124, height: 113 });
assert(Math.abs(bird.radius - 31.3131) < 0.02, `Unexpected Unity-scaled radius: ${bird.radius}`);
assert(Math.abs(bird.x - 247) < 0.001, `Unexpected collider x: ${bird.x}`);
assert(Math.abs(bird.y - 365.546) < 0.03, `Unexpected collider y offset: ${bird.y}`);

const rainbow = { kind: 'happy-rainbow', x: 500, y: 300, width: 220, height: 105, top: false, bob: 0 };
const safelyBelowArch = { type: 'circle', x: 610, y: 395, radius: 20 };
assert.strictEqual(collision.birdHitsObstacle(safelyBelowArch, rainbow), false, 'The open area under the rainbow must remain passable.');
const touchingArch = { type: 'circle', x: 610, y: 305, radius: 20 };
assert.strictEqual(collision.birdHitsObstacle(touchingArch, rainbow), true, 'The visible rainbow arc must collide.');

const pipe = { kind: 'flappy-pipe', x: 400, y: 0, width: 112, height: 245, top: true };
const pipeShapes = collision.obstacleShapes(pipe);
assert.strictEqual(pipeShapes.length, 2, 'Flappy pipes should use Unity shaft + lip compound boxes.');
assert(pipeShapes[0].width < pipe.width, 'Pipe shaft collider should be narrower than the sprite texture.');

const happyPipe = { kind: 'happy-pipe', x: 420, y: 480, width: 132, height: 240, top: false };
const happyPipeShapes = collision.obstacleShapes(happyPipe);
assert.strictEqual(happyPipeShapes.length, 2, 'Happy Pipes should use shaft + cap compound boxes.');
assert.strictEqual(collision.birdHitsObstacle({ type: 'circle', x: 486, y: 500, radius: 24 }, happyPipe), true, 'Visible Happy Pipe cap must collide.');
assert.strictEqual(collision.birdHitsObstacle({ type: 'circle', x: 390, y: 500, radius: 12 }, happyPipe), false, 'Space outside a Happy Pipe must remain safe.');

const spiderA = collision.obstacleShapes({ kind: 'jungle-spider', x: 400, y: 100, width: 125, height: 100, bob: 0 })[0];
const spiderB = collision.obstacleShapes({ kind: 'jungle-spider', x: 400, y: 100, width: 125, height: 100, bob: Math.PI / 2 })[0];
assert(Math.abs((spiderB.x - spiderA.x) - 14) < 0.001, 'Spider collider must follow its rendered swing.');
assert.strictEqual(spiderA.type, 'box', 'Spider must use a visible-body hull rather than an undersized point collider.');
assert.strictEqual(collision.birdHitsObstacle({ type: 'circle', x: 462, y: 150, radius: 20 }, { kind: 'jungle-spider', x: 400, y: 100, width: 125, height: 100, bob: 0 }), true, 'Visible spider body must be lethal.');

const snake = { kind: 'jungle-snake', x: 500, y: 430, width: 105, height: 164 };
assert.strictEqual(collision.birdHitsObstacle({ type: 'circle', x: 552, y: 512, radius: 20 }, snake), true, 'Visible snake body must be lethal.');
assert.strictEqual(collision.birdHitsObstacle({ type: 'circle', x: 460, y: 512, radius: 10 }, snake), false, 'Space outside the snake sprite must remain safe.');

console.log('Unity collision regression tests passed.');
