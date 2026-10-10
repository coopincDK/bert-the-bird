'use strict';

const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');

const modulePath = path.join(__dirname, '..', 'webapp', 'bert-sky-relay.js');
const skyRelay = require(modulePath);

// The plain-script path remains available to the existing browser game.
const context = { window: {} };
vm.createContext(context);
vm.runInContext(fs.readFileSync(modulePath, 'utf8'), context);
assert.equal(typeof context.window.BertSkyRelay.createRoute, 'function');
assert.equal(typeof skyRelay.finish, 'function');
assert.notEqual(context.window.BertSkyRelay, skyRelay,
    'The browser-global and CommonJS paths are independently loadable.');

const first = skyRelay.createRoute(481516);
const repeat = skyRelay.createRoute(481516);
const alternate = skyRelay.createRoute(481517);
assert.deepEqual(JSON.parse(JSON.stringify(first)), JSON.parse(JSON.stringify(repeat)),
    'The same seed must produce the same short Sky Relay route.');
assert.notEqual(first.seed, alternate.seed);
assert.deepEqual(first.gates.map((gate) => gate.openingRadius),
    alternate.gates.map((gate) => gate.openingRadius),
    'The painted hole must have the same pass/collision geometry for every seed.');
assert.deepEqual(first.gates.map((gate) => gate.worldDistance), [1600, 3100, 4600]);
assert.deepEqual(first.gates.map((gate) => gate.centerY), [230, 420, 300]);
assert.equal(first.target.worldDistance, 6100);

for (const gate of first.gates) {
    // Gates start 1.5× big in round 1 and shrink gate by gate (feedback 10. okt.).
    assert(gate.openingRadius >= 95 && gate.openingRadius <= 160);
    assert(gate.passRadius > 0 && gate.passRadius < gate.openingRadius);
    assert(gate.openingBounds.top >= 0 && gate.openingBounds.bottom <= skyRelay.VIEW.height,
        'Every open gate has visible canvas bounds.');
    assert(gate.frameBounds.left >= 0 && gate.frameBounds.right <= skyRelay.VIEW.width,
        'Gate frames stay inside the 1280 px canvas preview.');
}
assert(first.target.visibleBounds.left >= 0 && first.target.visibleBounds.right <= skyRelay.VIEW.width);
assert(first.target.visibleBounds.top >= skyRelay.CORRIDOR.top
    && first.target.visibleBounds.bottom <= skyRelay.CORRIDOR.bottom,
'The large hanging wind chime remains visibly inside the open flight corridor.');
assert(first.target.contactBounds.top >= first.target.visibleBounds.top
    && first.target.contactBounds.bottom <= first.target.visibleBounds.bottom,
'The contact surface is visibly part of the wind chime rather than an invisible collider.');

const gate = first.gates[0];
const plane = first.bird.centerX;
assert.equal(skyRelay.frameContact(first, 0, gate.centerY, plane, plane).contact, false,
    'The visible center of a ring must be fully open.');
const topImpact = skyRelay.frameContact(first, 0,
    gate.centerY - gate.openingRadius - 13, plane, plane);
const bottomImpact = skyRelay.frameContact(first, 0,
    gate.centerY + gate.openingRadius + 13, plane, plane);
assert.equal(topImpact.side, 'top', 'The visible upper cloud cap can end the run.');
assert.equal(bottomImpact.side, 'bottom', 'The visible lower cloud cap can end the run.');
assert.equal(skyRelay.frameContact(first, 0,
    gate.centerY - gate.openingRadius - 13, plane + 120, plane).contact, false,
    'The cloud is not a full-width invisible wall.');
assert.equal(skyRelay.frameContact(first, 0, 565, plane, plane).contact, false,
    'Entirely bypassing a ring is a non-lethal missed waypoint.');
const centeredGate = skyRelay.gatePass(first, 0, gate.centerY, 8);
const edgeGate = skyRelay.gatePass(first, 0, gate.centerY + gate.passRadius, 8);
const missedGate = skyRelay.gatePass(first, 0, gate.centerY + gate.passRadius + 0.01, 8);
assert.equal(centeredGate.passed, true);
assert.equal(centeredGate.quality, 'perfect');
assert.equal(edgeGate.passed, true);
assert.equal(edgeGate.quality, 'edge');
assert.equal(missedGate.passed, false);
assert.equal(missedGate.quality, 'miss');
assert(centeredGate.score > edgeGate.score && edgeGate.score > missedGate.score,
    'Gate feedback must reward a centered passage; a harmless bypass earns no gate points.');
assert.equal(skyRelay.gatePass(first, 0, gate.centerY, first.timeLimit + 0.01).quality, 'timeout');

const atCenter = skyRelay.finish(first, first.target.centerY, 18, 3);
const atContactEdge = skyRelay.finish(first, first.target.centerY + first.target.hitRadius, 18, 3);
assert.equal(atCenter.hit, true);
assert.equal(atContactEdge.hit, true,
    'A visible body touch at the bell contact edge is a fair successful finish.');
assert(atCenter.score > atContactEdge.score,
    'The exact center receives more precision score than an edge touch.');

const miss = skyRelay.finish(first, first.target.centerY + first.target.hitRadius + 0.01, 18, 3);
assert.equal(miss.completed, true);
assert.equal(miss.outcome, 'bell-miss');
assert.equal(miss.hit, false);
assert.equal(miss.score, 0, 'A final miss is a fair zero-score ending, not a death state.');

const timeout = skyRelay.finish(first, first.target.centerY, first.timeLimit + 0.01, 3);
assert.equal(timeout.completed, true);
assert.equal(timeout.timedOut, true);
assert.equal(timeout.outcome, 'timeout');
assert.equal(timeout.score, 0);

const oneGate = skyRelay.finish(first, first.target.centerY, 20, 1);
const threeGates = skyRelay.finish(first, first.target.centerY, 20, 3);
assert.equal(threeGates.gatesHit, 3);
assert(threeGates.score > oneGate.score, 'All three clean ring passages improve the concrete result.');
const centeredPasses = first.gates.map((ring, index) => skyRelay.gatePass(first, index, ring.centerY, 8));
const nearEdgePasses = [skyRelay.gatePass(first, 0, gate.centerY + gate.passRadius - 5, 8),
    ...centeredPasses.slice(1)];
const centeredRun = skyRelay.finish(first, first.target.centerY, 20, centeredPasses);
const nearEdgeRun = skyRelay.finish(first, first.target.centerY, 20, nearEdgePasses);
assert.equal(centeredRun.gatesHit, nearEdgeRun.gatesHit);
assert(centeredRun.gateScore > nearEdgeRun.gateScore && centeredRun.score > nearEdgeRun.score,
    'A flight near the painted cloud rim must earn fewer FINAL points than three centered ring passages.');
const slower = skyRelay.finish(first, first.target.centerY, 38, 3);
assert(threeGates.score > slower.score, 'With matching precision and gates, more remaining time scores higher.');
assert(atCenter.score > threeGates.score && threeGates.score > atContactEdge.score,
    'Finish score is monotonic for equivalent successful runs: precision, gates, then time.');

console.log('Sky Relay deterministic route, solid visible cloud caps, open gates and precise bell: passed');
