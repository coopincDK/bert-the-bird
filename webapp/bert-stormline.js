/* Stormline is an isolated non-ranked event. Every visual wind cue uses this same vector. */
(() => {
    'use strict';

    const PERIOD = 12;
    const PATTERN = Object.freeze([
        { grade: 'brise', level: 1, x: 1, y: -0.18, force: 0.24 },
        { grade: 'brise', level: 1, x: -1, y: 0.20, force: 0.24 },
        { grade: 'storm', level: 2, x: 1, y: -0.55, force: 0.62 },
        { grade: 'storm', level: 2, x: -1, y: 0.60, force: 0.62 },
        { grade: 'orkan', level: 3, x: 1, y: -0.58, force: 1 },
        { grade: 'orkan', level: 3, x: -1, y: 0.62, force: 1 },
    ]);
    const HAZARDS = Object.freeze({
        'storm-sail': Object.freeze({ artKey: 'stormSail', width: 128, height: 92 }),
        'wind-umbrella': Object.freeze({ artKey: 'stormUmbrella', width: 128, height: 102 }),
        'wind-branch': Object.freeze({ artKey: 'stormBranch', width: 148, height: 94 }),
        'wind-sign': Object.freeze({ artKey: 'stormSign', width: 126, height: 102 }),
        'wind-car': Object.freeze({ artKey: 'stormCar', width: 186, height: 112 }),
    });
    function clamp(value, low, high) { return Math.max(low, Math.min(high, value)); }

    function windCue(elapsed) {
        const time = Math.max(0, Number(elapsed) || 0);
        const index = Math.floor(time / PERIOD) % PATTERN.length;
        const phase = PATTERN[index];
        // Fade both OUT and IN at the scheduled reversal; no frame of wind
        // teleportation, even at the exact twelve-second phase boundary.
        const within = time % PERIOD;
        const fade = Math.min(clamp((within - 0.25) / 1.2, 0, 1),
            clamp((PERIOD - 0.25 - within) / 1.2, 0, 1));
        const rawStrength = phase.force * fade;
        const strength = rawStrength < 0.02 ? 0 : rawStrength;
        const horizontal = phase.x * strength;
        const vertical = phase.y * strength;
        const level = strength === 0 ? 0 : strength < 0.42 ? 1 : strength < 0.72 ? 2 : 3;
        return {
            grade: ['stille', 'brise', 'storm', 'orkan'][level], level, strength,
            horizontal, vertical, direction: phase.y < 0 ? -1 : 1,
            label: level === 0 ? 'VENDER' : phase.x > 0 ? 'MEDVIND' : 'MODVIND',
            speedFactor: clamp(1 + horizontal * 0.13, 0.87, 1.13),
            liftAcceleration: vertical * 285,
        };
    }

    function hazardKind(id, cue) {
        if (id === 0) return 'storm-sail';
        if (cue.level <= 1) return id % 2 ? 'wind-umbrella' : 'storm-sail';
        if (cue.level === 2) return id % 2 ? 'wind-branch' : 'wind-sign';
        return id % 11 === 9 ? 'wind-car' : id % 2 ? 'wind-branch' : 'wind-sign';
    }

    function isHazard(obstacle) {
        return Boolean(obstacle && Object.prototype.hasOwnProperty.call(HAZARDS, obstacle.kind));
    }

    function createEncounter(id, x, random, cue = windCue(0)) {
        const kind = hazardKind(id, cue);
        const art = HAZARDS[kind];
        // Wider, still bounded height choices ask Bert to change altitude;
        // the upper and lower escape routes are never closed at the same time.
        const lanes = kind === 'wind-car' ? [226, 328, 429] : [210, 321, 435];
        const baseY = lanes[id % lanes.length] + (random() - 0.5) * 12;
        return {
            obstacle: {
                id, x, y: baseY, baseY, width: art.width, height: art.height,
                kind, artKey: art.artKey, harmful: true, age: 0, weatherLevel: cue.level,
            },
            // Always after the object, never inside the decision corridor.
            star: { x: x + art.width + 365, y: [510, 220, 360][id % 3] },
        };
    }

    function advance(obstacle, delta, scroll, cue) {
        obstacle.age += delta;
        // Tailwind can slow the oncoming object, but cannot reverse its travel into Bert.
        obstacle.x -= Math.max(scroll * 0.15, scroll - cue.horizontal * 150 * delta);
        const desired = clamp(obstacle.baseY + cue.vertical * 135
            + Math.sin(obstacle.age * 1.25 + obstacle.id * 0.71) * 11, 156, 482);
        obstacle.y += clamp(desired - obstacle.y, -96 * delta, 96 * delta);
        return obstacle;
    }

    window.BertStormline = Object.freeze({
        windCue, hazardKind, isHazard, createEncounter, advance, HAZARDS, PERIOD,
    });
})();
