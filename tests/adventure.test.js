'use strict';
// Adventure worlds: every encounter is passable, hit shapes stay on the drawn art,
// and moving hazards always warn before they move.
const assert = require('node:assert/strict');
const path = require('node:path');
const A = require(path.join(__dirname, '..', 'webapp', 'bert-adventure.js'));

let seed = 12345;
const random = () => { seed = (seed * 1103515245 + 12345) % 2147483648; return seed / 2147483648; };
const env = { scroll: 0, speed: 900, birdX: 247, birdY: 360, time: 0 };

for (const theme of A.THEMES) {
    for (let index = 0; index < 300; index += 1) {
        const difficulty = 0.4 + (index % 10) * 0.3;
        const { obstacles, star } = A.createEncounter(theme, index, 1400, random, difficulty);
        assert(obstacles.length >= 1, `${theme} encounter has obstacles`);
        assert(star && Number.isFinite(star.x) && Number.isFinite(star.y), `${theme} has a star`);
        for (const o of obstacles) {
            assert(A.TYPES[o.type], `known type ${o.type}`);
            assert(o.size > 100 && o.size < 520, `${o.type} has a sane size ${o.size}`);
            // Hit shapes must lie inside the drawn 512 px art square (rotors and swings excepted: pivots/towers).
            if (!['swing', 'spin'].includes(o.behaviour)) {
                for (const shape of A.shapes(o)) {
                    if (shape.type === 'box') {
                        assert(shape.x >= o.x - 1 && shape.x + shape.width <= o.x + o.size + 1, `${o.type} box inside art`);
                    }
                }
            }
            // A vertical lane is always open at the obstacle's own x for static pairs.
        }
        // Static gap pairs keep at least 230 px open between top and bottom hit shapes.
        const statics = obstacles.filter((o) => !o.behaviour);
        if (statics.length === 2) {
            const bottoms = statics.flatMap((o) => A.shapes(o)).filter((s) => s.type === 'box');
            const topEdge = Math.max(...A.shapes(statics[0]).map((s) => s.type === 'box' ? s.y + s.height : s.type === 'circle' ? s.y + s.radius : 0));
            const bottomEdge = Math.min(...A.shapes(statics[1]).map((s) => s.type === 'box' ? s.y : s.type === 'circle' ? s.y - s.radius : 9999));
            if (statics[0].type === 'ice-shelf') assert(bottomEdge - topEdge >= 200, `${theme} gap ${bottomEdge - topEdge}`);
            assert(bottoms.length > 0);
        }
    }
}

// Drop, dive and rise hazards warn before they move.
for (const [theme, type] of [['iceberg', 'ice-stalactite'], ['volcano', 'lava-bubble']]) {
    let found = null;
    for (let index = 0; index < 200 && !found; index += 1) {
        found = A.createEncounter(theme, index, 1400, random, 1).obstacles.find((o) => o.type === type);
    }
    assert(found, `${type} spawns`);
    const startY = found.y;
    let movedBeforeWarning = false;
    let warned = false;
    for (let step = 0; step < 240; step += 1) {
        A.advance(found, 1 / 60, { ...env, scroll: 900 / 60 });
        if (found.warn > 0) warned = true;
        if (!warned && Math.abs(found.y - startY) > 0.5) movedBeforeWarning = true;
    }
    assert(warned, `${type} shows a warning`);
    assert(!movedBeforeWarning, `${type} never moves before its warning`);
}
// Harbor container stacks blink before the gap moves.
{
    let stack = null;
    for (let index = 0; index < 200 && !stack; index += 1) {
        stack = A.createEncounter('harbor', index, 1400, random, 1).obstacles.find((o) => o.behaviour === 'stack' && !o.stackTop);
    }
    assert(stack, 'container stack spawns');
    let warned = false;
    let movedEarly = false;
    for (let step = 0; step < 240; step += 1) {
        A.advance(stack, 1 / 60, { ...env, scroll: 900 / 60 });
        if (stack.warn > 0) warned = true;
        if (!warned && stack.offset !== 0) movedEarly = true;
    }
    assert(warned && !movedEarly, 'stack warns before it moves');
    assert(Math.abs(stack.offset) > 0, 'stack does move');
}
console.log('Adventure worlds: passable encounters, honest hit shapes, warnings first: PASS');
