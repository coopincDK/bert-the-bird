/*
 * Adventure worlds: Isbjerget, Havnen, Nattebyen, Vulkanen og Vindmølleparken.
 * Every obstacle is 512×512 art. Hit shapes are measured on that art, so the
 * lethal area always matches what is drawn. Moving hazards always warn first.
 */
(() => {
    'use strict';

    const VIEW_HEIGHT = 720;
    const GROUND = 704;
    const ART = 512;
    const THEMES = Object.freeze(['iceberg', 'harbor', 'nightcity', 'volcano', 'windfarm']);

    // Content bounding boxes (x0, y0, x1, y1) in the 512 px source art.
    const TYPES = Object.freeze({
        'ice-stalactite': { art: 'advIceStalactite', bbox: [91, 37, 420, 474], anchor: 'top' },
        'ice-shelf': { art: 'advIceShelf', bbox: [33, 83, 478, 428], anchor: 'top' },
        'ice-spikes': { art: 'advIceSpikes', bbox: [34, 115, 477, 396], anchor: 'bottom' },
        'crane-hook': { art: 'advCraneHook', bbox: [177, 36, 335, 475], anchor: 'swing' },
        'diving-gull': { art: 'advGull', bbox: [36, 38, 476, 473], anchor: 'air' },
        'rolling-parcel': { art: 'advParcel', bbox: [34, 115, 477, 396], anchor: 'bottom' },
        'water-tank': { art: 'advWaterTank', bbox: [59, 41, 453, 470], anchor: 'bottom' },
        'rooftop-vent': { art: 'advVent', bbox: [33, 158, 478, 353], anchor: 'bottom' },
        'signboard': { art: 'advSignboard', bbox: [33, 97, 479, 414], anchor: 'swing' },
        'lava-ledge': { art: 'advLavaLedge', bbox: [32, 184, 479, 335], anchor: 'bottom' },
        'lava-bubble': { art: 'advLavaBubble', bbox: [76, 50, 435, 468], anchor: 'rise' },
        'lava-spout': { art: 'advLavaSpout', bbox: [99, 40, 412, 471], anchor: 'erupt' },
        'rotor': { art: 'advRotor', bbox: [32, 38, 479, 473], anchor: 'spin' },
        'buoy-chain': { art: 'advBuoys', bbox: [32, 178, 479, 333], anchor: 'bottom' },
        'service-platform': { art: 'advPlatform', bbox: [33, 81, 477, 430], anchor: 'bottom' },
        'icicles': { art: 'advIcicles', bbox: [42, 53, 470, 458], anchor: 'top' },
        'ice-floe': { art: 'advFloe', bbox: [40, 95, 472, 416], anchor: 'bottom' },
        'antenna': { art: 'advAntenna', bbox: [206, 40, 305, 471], anchor: 'bottom' },
        'cable-lamps': { art: 'advCableLamps', bbox: [40, 187, 472, 320], anchor: 'top' },
        'neon-fish': { art: 'advNeonFish', bbox: [48, 94, 465, 412], anchor: 'swing' },
        'neon-bolt': { art: 'advNeonBolt', bbox: [144, 41, 368, 471], anchor: 'swing' },
        'kite': { art: 'advKite', bbox: [47, 41, 464, 473], anchor: 'air' },
    });
    // Where the two chains of a hanging sign meet the art (x in 512 px art).
    const CHAIN_X = Object.freeze({ signboard: [140, 372], 'neon-fish': [150, 360], 'neon-bolt': [195, 320] });

    const WARN_COLOR = Object.freeze({
        iceberg: '#bff6ff', harbor: '#ffd36b', nightcity: '#ffb36b', volcano: '#ffb347', windfarm: '#fff6a8',
    });

    function clamp(value, low, high) { return Math.max(low, Math.min(high, value)); }
    function lerp(a, b, t) { return a + (b - a) * t; }

    function box(x, y, width, height) { return { type: 'box', x, y, width, height }; }
    function circle(x, y, radius) { return { type: 'circle', x, y, radius }; }
    function segment(x1, y1, x2, y2, thickness) { return { type: 'segment', x1, y1, x2, y2, thickness }; }

    function contentHeightFraction(type) {
        const [, y0, , y1] = TYPES[type].bbox;
        return (y1 - y0) / ART;
    }

    /** Art-space point (0..512) to world space for an unrotated obstacle. */
    function at(obstacle, ax, ay) {
        const scale = obstacle.size / ART;
        return { x: obstacle.x + ax * scale, y: obstacle.y + ay * scale };
    }

    function base(type, theme, id, x, size) {
        return {
            kind: 'adventure', type, theme, id, art: TYPES[type].art,
            x, y: 0, size, width: size, height: size,
            age: 0, warn: 0, angle: 0, harmful: true, phase: 'idle',
        };
    }

    /** Top-anchored: the art's lowest content pixel ends at `reach`. */
    function topAt(type, theme, id, x, reach, minSize, maxSize) {
        const fraction = contentHeightFraction(type);
        const size = clamp(reach / fraction, minSize, maxSize);
        const obstacle = base(type, theme, id, x, size);
        obstacle.y = reach - (TYPES[type].bbox[3] / ART) * size;
        obstacle.reach = reach;
        return obstacle;
    }

    /** Bottom-anchored: the art's highest content pixel starts at `top`. */
    function bottomAt(type, theme, id, x, top, minSize, maxSize) {
        const fraction = contentHeightFraction(type);
        const size = clamp((GROUND - top) / fraction, minSize, maxSize);
        const obstacle = base(type, theme, id, x, size);
        obstacle.y = top - (TYPES[type].bbox[1] / ART) * size;
        obstacle.top = top;
        return obstacle;
    }

    function gapFor(difficulty) {
        return clamp(330 - 26 * (difficulty - 0.5), 245, 330);
    }

    /**
     * One encounter for a theme. Returns obstacles plus a star position that
     * sits in the safe lane of this encounter.
     */
    function createEncounter(theme, id, x, random, difficulty = 1) {
        const d = clamp(difficulty, 0.3, 3.2);
        const gap = gapFor(d);
        const gapTop = lerp(130, VIEW_HEIGHT - 130 - gap - 60, random());
        const gapBottom = gapTop + gap;
        const pick = random();
        const obstacles = [];
        let star = { x: x + 330, y: gapTop + gap / 2 };

        if (theme === 'iceberg') {
            if (pick < 0.38) {
                const o = topAt('ice-stalactite', theme, id, x, lerp(190, 260, random()), 230, 330);
                o.behaviour = 'drop';
                obstacles.push(o);
                star = { x: x + o.size * 0.5, y: lerp(470, 560, random()) };
            } else if (pick < 0.75) {
                const topType = random() < 0.5 ? 'ice-shelf' : 'icicles';
                const bottomType = random() < 0.5 ? 'ice-spikes' : 'ice-floe';
                obstacles.push(topAt(topType, theme, id, x, gapTop, 300, 420));
                obstacles.push(bottomAt(bottomType, theme, id, x + 40, gapBottom, 240, 380));
                star = { x: x + 190, y: gapTop + gap / 2 };
            } else {
                const spikes = bottomAt('ice-spikes', theme, id, x, Math.max(gapBottom, 470), 240, 340);
                const drop = topAt('ice-stalactite', theme, id, x + 330, lerp(170, 220, random()), 220, 300);
                drop.behaviour = 'drop';
                obstacles.push(spikes, drop);
                star = { x: x + 160, y: spikes.top - 110 };
            }
        } else if (theme === 'harbor') {
            // Container stacks that shift the gap as Bert closes in, gull flocks
            // that home in on him, and the swinging crane hooks.
            if (pick < 0.42) {
                const pair = stacksAt(theme, id, x, gapTop, gap, d, random);
                obstacles.push(...pair);
                star = { x: x + 115, y: gapTop + gap / 2 };
            } else if (pick < 0.72) {
                obstacles.push(...flockAt(theme, id, x, d, random));
                star = { x: x + 420, y: lerp(200, 520, random()) };
            } else if (pick < 0.86) {
                obstacles.push(swingAt('crane-hook', theme, id, x, lerp(250, 380, random()), d, random));
                star = { x: x + 420, y: lerp(470, 560, random()) };
            } else {
                const parcel = bottomAt('rolling-parcel', theme, id, x + 260, 600, 170, 210);
                parcel.behaviour = 'roll';
                obstacles.push(swingAt('crane-hook', theme, id, x, lerp(230, 300, random()), d, random), parcel);
                star = { x: x + 130, y: 430 };
            }
        } else if (theme === 'nightcity') {
            if (pick < 0.2) {
                obstacles.push(bottomAt('antenna', theme, id, x, gapBottom - 30, 300, 480));
                obstacles.push(topAt('cable-lamps', theme, id, x + 40, Math.max(120, gapTop), 300, 360));
                star = { x: x + 200, y: gapTop + gap / 2 };
            } else if (pick < 0.45) {
                obstacles.push(bottomAt('water-tank', theme, id, x, gapBottom, 300, 470));
                const sign = swingAt('signboard', theme, id, x + 20, Math.max(110, gapTop), d * 0.6, random);
                obstacles.push(sign);
            } else if (pick < 0.75) {
                obstacles.push(bottomAt('rooftop-vent', theme, id, x, Math.max(gapBottom, 540), 260, 340));
                obstacles.push(swingAt('signboard', theme, id, x + 60, Math.max(120, gapTop), d * 0.6, random));
            } else {
                const top = Math.max(gapBottom - 60, 330);
                obstacles.push(bottomAt('water-tank', theme, id, x, top, 320, 470));
                star = { x: x + 200, y: top - 120 };
            }
        } else if (theme === 'volcano') {
            // Rising lava floor (handled by the game) + tall columns and arcing bombs.
            // Columns leave room above them; meteors from the sky stop "hiding at the top".
            if (pick < 0.3) {
                obstacles.push(columnAt(theme, id, x, d, random));
                star = { x: x + 330, y: lerp(200, 380, random()) };
            } else if (pick < 0.52) {
                obstacles.push(bombAt(theme, id, x, d, random), bombAt(theme, id, x + 260, d, random));
                star = { x: x + 130, y: lerp(160, 300, random()) };
            } else if (pick < 0.78) {
                obstacles.push(columnAt(theme, id, x, d, random), meteorAt(theme, id, x + 360, d, random));
                star = { x: x + 200, y: lerp(220, 330, random()) };
            } else {
                obstacles.push(meteorAt(theme, id, x, d, random), meteorAt(theme, id, x + 300, d, random));
                star = { x: x + 150, y: lerp(260, 420, random()) };
            }
        } else {
            // Kites fly high, so the top is no safe place to hide; rotors cover the bottom.
            const kiteAt = (kx, low, high) => {
                const kite = base('kite', theme, id, kx, lerp(230, 270, random()));
                kite.behaviour = 'kite';
                kite.baseY = lerp(low, high, random());
                kite.y = kite.baseY;
                kite.bob = lerp(50, 90, random());
                kite.bobSpeed = clamp(1.1 + 0.25 * d, 1.1, 2.2);
                kite.phaseOffset = random() * Math.PI * 2;
                return kite;
            };
            if (pick < 0.3) {
                obstacles.push(rotorAt(theme, id, x, lerp(300, 440, random()), d, random));
                star = { x: x + 470, y: lerp(200, 520, random()) };
            } else if (pick < 0.5) {
                // A rotor below and a kite above: fly between them.
                obstacles.push(rotorAt(theme, id, x, lerp(380, 450, random()), d, random));
                obstacles.push(kiteAt(x + 520, -40, 40));
                star = { x: x + 300, y: lerp(220, 320, random()) };
            } else if (pick < 0.62) {
                const kite = base('kite', theme, id, x, lerp(230, 270, random()));
                kite.behaviour = 'kite';
                kite.baseY = lerp(-30, 200, random());
                kite.y = kite.baseY;
                kite.bob = lerp(60, 110, random());
                kite.bobSpeed = clamp(1.1 + 0.25 * d, 1.1, 2.2);
                kite.phaseOffset = random() * Math.PI * 2;
                obstacles.push(kite);
                star = { x: x + 360, y: lerp(200, 520, random()) };
            } else if (pick < 0.78) {
                obstacles.push(bottomAt('service-platform', theme, id, x, Math.max(gapBottom, 430), 300, 440));
                obstacles.push(bottomAt('buoy-chain', theme, id, x + 340, 620, 250, 300));
                star = { x: x + 180, y: Math.max(gapBottom, 430) - 120 };
            } else {
                obstacles.push(rotorAt(theme, id, x, lerp(340, 450, random()), d, random));
                obstacles.push(bottomAt('buoy-chain', theme, id, x + 420, 620, 250, 300));
                star = { x: x + 420, y: 470 };
            }
        }
        return { obstacles, star };
    }

    function swingAt(type, theme, id, x, lowest, difficulty, random) {
        if (type === 'signboard') type = ['signboard', 'neon-fish', 'neon-bolt'][Math.floor(random() * 3)];
        const sign = type !== 'crane-hook';
        const size = sign ? lerp(200, 240, random()) : lerp(230, 270, random());
        const o = base(type, theme, id, x, size);
        // The pivot sits above the screen; the cable reaches down to the art.
        const artBottom = (TYPES[type].bbox[3] / ART) * size;
        o.pivotX = x + size / 2;
        o.pivotOffset = size / 2;
        o.pivotY = -30;
        o.length = Math.max(60, lowest - artBottom - o.pivotY);
        o.swingAmplitude = sign ? clamp(0.12 + 0.05 * difficulty, 0.12, 0.3) : clamp(0.28 + 0.08 * difficulty, 0.28, 0.62);
        o.swingSpeed = sign ? 1.6 : clamp(1.2 + 0.18 * difficulty, 1.2, 2.1);
        o.swingPhase = random() * Math.PI * 2;
        o.behaviour = 'swing';
        return o;
    }

    function eruptAt(theme, id, x, top, difficulty, random) {
        const o = bottomAt('lava-spout', theme, id, x, top, 280, 420);
        o.behaviour = 'erupt';
        o.restY = GROUND - (TYPES['lava-spout'].bbox[1] / ART) * o.size * 0.25;
        o.peakY = o.y;
        o.y = o.restY;
        o.cycle = clamp(2.8 - 0.35 * difficulty, 1.7, 2.8);
        o.cycleOffset = random() * o.cycle;
        o.clipGround = true;
        return o;
    }

    function riseAt(theme, id, x, difficulty, random) {
        const o = base('lava-bubble', theme, id, x, lerp(160, 200, random()));
        o.y = GROUND + 10;
        o.behaviour = 'rise';
        o.riseSpeed = clamp(330 + 60 * difficulty, 330, 560);
        o.clipGround = true;
        return o;
    }

    /** A lava column: rests in the lava, warns, then shoots up almost to the top. */
    /** A top and a bottom container stack. Both shift together once, after a lamp warning. */
    function stacksAt(theme, id, x, gapTop, gap, difficulty, random) {
        const width = 230;
        const shift = (random() < 0.5 ? -1 : 1) * clamp(110 + 30 * difficulty, 110, 190);
        const safeShift = clamp(gapTop + shift, 110, VIEW_HEIGHT - 110 - gap - 40) - gapTop;
        const make = (top) => {
            const o = base('rolling-parcel', theme, id, x, width);
            o.behaviour = 'stack';
            o.stackTop = top;
            o.width = width;
            o.gapTop = gapTop;
            o.gap = gap;
            o.shift = safeShift;
            o.offset = 0;
            o.colors = [0, 1, 2, 3, 4].map(() => Math.floor(random() * 3));
            return o;
        };
        return [make(true), make(false)];
    }

    /** Three to five small gulls that fly in and gently steer towards Bert. */
    function flockAt(theme, id, x, difficulty, random) {
        const count = 3 + Math.floor(random() * Math.min(3, 1 + difficulty));
        const centerY = lerp(180, 460, random());
        return Array.from({ length: count }, (_, index) => {
            const o = base('diving-gull', theme, id, x + index * 70 + random() * 30, lerp(105, 125, random()));
            o.behaviour = 'flock';
            o.y = centerY + (index - count / 2) * 55 + random() * 30;
            o.turn = clamp(90 + 30 * difficulty, 90, 170);
            o.extraSpeed = lerp(140, 200, random());
            return o;
        });
    }

    function columnAt(theme, id, x, difficulty, random, options = {}) {
        const o = base('lava-spout', theme, id, x, 260);
        o.behaviour = 'column';
        o.fromTop = Boolean(options.fromTop);
        o.palette = options.palette || 'lava';
        o.columnWidth = lerp(70, 90, random());
        // Peak stays well below the ceiling, so there is always a way over the top.
        o.peakTop = options.peak ?? lerp(230, 330, random());
        o.cycle = clamp(3.0 - 0.35 * difficulty, 1.9, 3.0);
        o.cycleOffset = random() * o.cycle;
        o.topY = GROUND;
        o.lavaTop = GROUND;
        o.harmful = false;
        return o;
    }

    /** A meteor: glows at the top edge first, then drops from the sky. */
    function meteorAt(theme, id, x, difficulty, random) {
        const o = base('lava-bubble', theme, id, x, lerp(120, 150, random()));
        o.behaviour = 'meteor';
        o.y = -o.size - 20;
        o.fallSpeed = clamp(380 + 60 * difficulty, 380, 620);
        o.harmful = false;
        return o;
    }

    /** A lava bomb: glows on the surface first, then flies in an arc. */
    function bombAt(theme, id, x, difficulty, random) {
        const o = base('lava-bubble', theme, id, x, lerp(130, 160, random()));
        o.behaviour = 'bomb';
        o.lavaTop = GROUND;
        o.y = GROUND - o.size * 0.5;
        o.launchSpeed = clamp(lerp(850, 1050, random()) + 40 * difficulty, 850, 1200);
        o.harmful = false;
        return o;
    }

    function rotorAt(theme, id, x, hubY, difficulty, random) {
        const size = lerp(380, 430, random());
        const o = base('rotor', theme, id, x, size);
        const scale = size / ART;
        o.hubAx = 254;
        o.hubAy = 313;
        o.y = hubY - o.hubAy * scale;
        o.spinSpeed = clamp(0.9 + 0.22 * difficulty, 0.9, 1.9) * (random() < 0.5 ? 1 : -1);
        o.angle = random() * Math.PI * 2;
        o.behaviour = 'spin';
        return o;
    }

    /** Advance one obstacle. env: { scroll (px this step), speed (px/s), birdX, birdY, time } */
    function advance(o, delta, env) {
        o.x -= env.scroll;
        o.age += delta;
        if (o.pivotX != null) o.pivotX -= env.scroll;
        const speed = Math.max(200, env.speed || 600);
        const distance = o.x - env.birdX;

        if (o.behaviour === 'drop') {
            if (o.phase === 'idle' && distance < speed * 1.05) { o.phase = 'warn'; o.timer = 0; }
            if (o.phase === 'warn') {
                o.timer += delta;
                o.warn = clamp(o.timer / 0.55, 0, 1);
                if (o.timer >= 0.6) { o.phase = 'fall'; o.vy = 0; o.warn = 0; }
            } else if (o.phase === 'fall') {
                o.vy += 1700 * delta;
                o.y += o.vy * delta;
            }
        } else if (o.behaviour === 'swing') {
            o.angle = Math.sin(o.age * o.swingSpeed + o.swingPhase) * o.swingAmplitude;
        } else if (o.behaviour === 'dive') {
            if (o.phase === 'idle' && distance < speed * 1.25) {
                o.phase = 'warn'; o.timer = 0;
                o.targetY = clamp(env.birdY - o.size * 0.5, 80, GROUND - o.size * 0.7);
            }
            if (o.phase === 'warn') {
                o.timer += delta;
                o.warn = clamp(o.timer / 0.5, 0, 1);
                if (o.timer >= 0.55) { o.phase = 'dive'; o.warn = 0; o.startY = o.y; o.diveTime = 0; }
            } else if (o.phase === 'dive') {
                o.diveTime += delta;
                o.x -= 240 * delta;
                o.y = lerp(o.startY, o.targetY, clamp(o.diveTime / 0.9, 0, 1));
                o.angle = -0.35 * (1 - clamp(o.diveTime / 0.9, 0, 1));
            }
        } else if (o.behaviour === 'roll') {
            o.x -= 200 * delta;
            o.angle -= (200 + speed) * delta / (o.size * 0.35);
        } else if (o.behaviour === 'erupt') {
            const t = (o.age + o.cycleOffset) % o.cycle;
            const warnStart = o.cycle - 0.75;
            const up = 0.22;
            const hold = 0.7;
            if (t < up) o.y = lerp(o.restY, o.peakY, t / up);
            else if (t < up + hold) o.y = o.peakY;
            else if (t < up + hold + 0.35) o.y = lerp(o.peakY, o.restY, (t - up - hold) / 0.35);
            else o.y = o.restY;
            o.warn = t >= warnStart ? clamp((t - warnStart) / 0.6, 0, 1) : 0;
            o.harmful = o.y < o.restY - 6;
        } else if (o.behaviour === 'rise') {
            if (o.phase === 'idle' && distance < speed * 1.15) { o.phase = 'warn'; o.timer = 0; }
            if (o.phase === 'warn') {
                o.timer += delta;
                o.warn = clamp(o.timer / 0.6, 0, 1);
                if (o.timer >= 0.65) { o.phase = 'rise'; o.warn = 0; }
            } else if (o.phase === 'rise') {
                o.y -= o.riseSpeed * delta;
            }
        } else if (o.behaviour === 'spin') {
            o.angle += o.spinSpeed * delta;
        } else if (o.behaviour === 'stack') {
            if (o.phase === 'idle' && distance < speed * 1.15) { o.phase = 'warn'; o.timer = 0; }
            if (o.phase === 'warn') {
                o.timer += delta;
                o.warn = clamp(o.timer / 0.45, 0, 1);
                if (o.timer >= 0.5) { o.phase = 'move'; o.timer = 0; o.warn = 0; }
            } else if (o.phase === 'move') {
                o.timer += delta;
                const t = clamp(o.timer / 0.6, 0, 1);
                o.offset = o.shift * (t * t * (3 - 2 * t));
                if (t >= 1) o.phase = 'done';
            }
        } else if (o.behaviour === 'kite') {
            o.y = o.baseY + Math.sin(o.age * o.bobSpeed + o.phaseOffset) * o.bob;
            o.angle = Math.sin(o.age * o.bobSpeed * 1.3 + o.phaseOffset) * 0.12;
        } else if (o.behaviour === 'flock') {
            o.x -= o.extraSpeed * delta;
            if (distance > -60) {
                const target = env.birdY - o.size * 0.5;
                const step = clamp(target - o.y, -o.turn * delta, o.turn * delta);
                o.y += step;
            }
            o.angle = Math.sin(o.age * 12) * 0.08;
        } else if (o.behaviour === 'column') {
            // Base edge: the lava surface, the floor, or the ceiling for jets from above.
            o.lavaTop = o.fromTop ? -40 : (env.lavaTop ?? GROUND);
            // The first eruption is triggered by Bert's approach, so its warning is
            // always on screen; after that it repeats on a fixed, learnable rhythm.
            const WARN = 1.1;
            const UP = 0.25;
            const HOLD = 1.0;
            const DOWN = 0.4;
            const REST = clamp(o.cycle - 1.2, 0.8, 1.8);
            if (o.phase === 'idle') {
                o.topY = o.lavaTop;
                if (distance < speed * 1.5) { o.phase = 'cycle'; o.timer = 0; }
            }
            if (o.phase === 'cycle') {
                o.timer += delta;
                const period = WARN + UP + HOLD + DOWN + REST;
                const t = o.timer % period;
                if (t < WARN) { o.topY = o.lavaTop; o.warn = clamp(t / (WARN * 0.8), 0, 1); }
                else if (t < WARN + UP) { o.warn = 0; o.topY = lerp(o.lavaTop, o.peakTop, (t - WARN) / UP); }
                else if (t < WARN + UP + HOLD) { o.warn = 0; o.topY = o.peakTop; }
                else if (t < WARN + UP + HOLD + DOWN) { o.warn = 0; o.topY = lerp(o.peakTop, o.lavaTop, (t - WARN - UP - HOLD) / DOWN); }
                else { o.warn = 0; o.topY = o.lavaTop; }
            }
            o.harmful = o.fromTop ? o.topY > o.lavaTop + 24 : o.topY < o.lavaTop - 24;
        } else if (o.behaviour === 'meteor') {
            const lavaTop = env.lavaTop ?? GROUND;
            if (o.phase === 'idle' && distance < speed * 1.3) { o.phase = 'warn'; o.timer = 0; }
            if (o.phase === 'warn') {
                o.timer += delta;
                o.warn = clamp(o.timer / 0.65, 0, 1);
                if (o.timer >= 0.75) { o.phase = 'fly'; o.warn = 0; o.vy = o.fallSpeed; o.harmful = true; }
            } else if (o.phase === 'fly') {
                o.vy += 700 * delta;
                o.y += o.vy * delta;
                o.x -= 60 * delta;
                o.angle += 3 * delta;
                if (o.y + o.size * 0.5 > lavaTop) o.harmful = false;
            }
        } else if (o.behaviour === 'bomb') {
            const lavaTop = env.lavaTop ?? GROUND;
            if (o.phase === 'idle') {
                o.lavaTop = lavaTop;
                o.y = lavaTop - o.size * 0.5;
                if (distance < speed * 1.35) { o.phase = 'warn'; o.timer = 0; }
            }
            if (o.phase === 'warn') {
                o.timer += delta;
                o.warn = clamp(o.timer / 0.55, 0, 1);
                if (o.timer >= 0.6) { o.phase = 'fly'; o.warn = 0; o.vy = -o.launchSpeed; o.harmful = true; }
            } else if (o.phase === 'fly') {
                o.vy += 1500 * delta;
                o.y += o.vy * delta;
                o.x -= 140 * delta;
                o.angle += 4 * delta;
                if (o.vy > 0 && o.y + o.size * 0.5 > lavaTop) o.harmful = false;
            }
        }
    }

    function rotatePoint(px, py, cx, cy, angle) {
        const cos = Math.cos(angle);
        const sin = Math.sin(angle);
        return { x: cx + (px - cx) * cos - (py - cy) * sin, y: cy + (px - cx) * sin + (py - cy) * cos };
    }

    /** Where the warning glow is drawn, in world space. */
    function warningSpot(o) {
        const scale = o.size / ART;
        if (o.type === 'ice-stalactite') return { x: o.x + 256 * scale, y: Math.max(20, o.y + 70 * scale), radius: 70 * scale + 20 };
        if (o.type === 'diving-gull') return { x: o.x + 256 * scale, y: o.y + 250 * scale, radius: 120 * scale + 20 };
        if (o.behaviour === 'stack') return o.stackTop ? null : { x: o.x + o.width / 2, y: o.gapTop + o.gap / 2, radius: 70 };
        if (o.behaviour === 'column') return { x: o.x + o.size / 2, y: o.fromTop ? 30 : (o.lavaTop ?? GROUND) - 10, radius: o.columnWidth + 20 };
        if (o.behaviour === 'bomb') return { x: o.x + o.size / 2, y: (o.lavaTop ?? GROUND) - 10, radius: o.size * 0.55 };
        if (o.behaviour === 'meteor') return { x: o.x + o.size / 2, y: 34, radius: o.size * 0.6 };
        if (o.type === 'lava-spout' || o.type === 'lava-bubble') return { x: o.x + 256 * scale, y: GROUND - 8, radius: 110 * scale + 24 };
        return null;
    }

    /** Hit shapes in world space, measured on the 512 px art. */
    function shapes(o) {
        if (!o.harmful) return [];
        // Smoke cannons push and hide things, but smoke itself never kills.
        if (o.palette === 'smoke') return [];
        const s = o.size / ART;
        const p = (ax, ay) => at(o, ax, ay);
        if (o.behaviour === 'stack') {
            const edge = o.gapTop + o.offset;
            return o.stackTop ? [box(o.x + 6, -40, o.width - 12, edge + 40)]
                : [box(o.x + 6, edge + o.gap, o.width - 12, VIEW_HEIGHT - edge - o.gap + 40)];
        }
        if (o.behaviour === 'flock') {
            return [circle(o.x + o.size * 0.5, o.y + o.size * 0.52, o.size * 0.2)];
        }
        if (o.behaviour === 'column') {
            const cx = o.x + o.size / 2;
            const w = o.columnWidth;
            if (o.fromTop) {
                return [box(cx - w * 0.42, o.lavaTop, w * 0.84, Math.max(0, o.topY - o.lavaTop - w * 0.3)), circle(cx, o.topY - w * 0.35, w * 0.45)];
            }
            return [box(cx - w * 0.42, o.topY + w * 0.3, w * 0.84, Math.max(0, o.lavaTop - o.topY)), circle(cx, o.topY + w * 0.35, w * 0.45)];
        }
        if (o.behaviour === 'bomb' || o.behaviour === 'meteor') {
            return [circle(o.x + o.size / 2, o.y + o.size * 0.45, o.size * 0.29)];
        }
        switch (o.type) {
        case 'ice-stalactite': {
            const lip = p(110, 50);
            const tip = p(258, 455);
            return [box(lip.x, lip.y, 300 * s, 120 * s), segment(o.x + 258 * s, o.y + 150 * s, tip.x, tip.y, 34 * s)];
        }
        case 'ice-shelf': {
            const a = p(45, 95);
            return [box(a.x, a.y, 420 * s, 170 * s), circle(o.x + 360 * s, o.y + 330 * s, 62 * s)];
        }
        case 'ice-spikes': {
            const a = p(60, 300);
            const b = p(205, 140);
            const left = p(95, 215);
            const right = p(335, 225);
            return [box(a.x, a.y, 390 * s, 96 * s), box(b.x, b.y, 110 * s, 180 * s),
                box(left.x, left.y, 85 * s, 90 * s), box(right.x, right.y, 85 * s, 80 * s)];
        }
        case 'icicles': {
            const band = p(50, 55);
            const spike = (ax, tipY, t) => segment(o.x + ax * s, o.y + 105 * s, o.x + ax * s, o.y + tipY * s, t * s);
            return [box(band.x, band.y, 410 * s, 55 * s), spike(128, 340, 22), spike(256, 415, 26), spike(384, 212, 20),
                spike(224, 218, 16), spike(288, 296, 16), spike(96, 190, 14), spike(416, 165, 14)];
        }
        case 'ice-floe': {
            const slab = p(62, 222);
            const peak = p(256, 150);
            return [box(slab.x, slab.y, 388 * s, 175 * s), circle(peak.x, peak.y, 48 * s)];
        }
        case 'antenna': {
            const top = p(256, 60);
            const foot = p(222, 432);
            return [segment(top.x, top.y, top.x, o.y + 465 * s, 20 * s), box(foot.x, foot.y, 68 * s, 38 * s)];
        }
        case 'cable-lamps': {
            const l = p(64, 210);
            const m = p(256, 255);
            const r = p(448, 210);
            const b1 = p(128, 285);
            const b2 = p(256, 303);
            const b3 = p(384, 285);
            return [segment(l.x, l.y, m.x, m.y, 12 * s), segment(m.x, m.y, r.x, r.y, 12 * s),
                circle(b1.x, b1.y, 18 * s), circle(b2.x, b2.y, 18 * s), circle(b3.x, b3.y, 18 * s)];
        }
        case 'kite': {
            const c = rotatePoint(o.x + 355 * s, o.y + 165 * s, o.x + 256 * s, o.y + 256 * s, o.angle);
            return [circle(c.x, c.y, 92 * s)];
        }
        case 'rolling-parcel': {
            const c = p(256, 256);
            return [circle(c.x, c.y, 120 * s)];
        }
        case 'water-tank': {
            const a = p(70, 55);
            const legs = p(105, 360);
            return [box(a.x, a.y, 372 * s, 320 * s), box(legs.x, legs.y, 300 * s, 110 * s)];
        }
        case 'rooftop-vent': {
            const a = p(40, 165);
            return [box(a.x, a.y, 430 * s, 180 * s)];
        }
        case 'lava-ledge': {
            const a = p(40, 200);
            return [box(a.x, a.y, 430 * s, 125 * s)];
        }
        case 'lava-spout': {
            const top = p(256, 60);
            const pool = p(110, 380);
            return [segment(top.x, top.y + 20 * s, top.x, o.y + 400 * s, 52 * s), box(pool.x, pool.y, 290 * s, 90 * s)];
        }
        case 'lava-bubble': {
            const c = p(256, 220);
            return [circle(c.x, c.y, 150 * s)];
        }
        case 'buoy-chain': {
            const left = p(110, 260);
            const right = p(402, 260);
            return [circle(left.x, left.y, 70 * s), circle(right.x, right.y, 70 * s), segment(left.x, left.y, right.x, right.y, 12 * s)];
        }
        case 'service-platform': {
            const deck = p(40, 230);
            const legs = p(80, 300);
            return [box(deck.x, deck.y, 430 * s, 75 * s), box(legs.x, legs.y, 350 * s, 130 * s)];
        }
        case 'diving-gull': {
            const c = rotatePoint(o.x + 250 * s, o.y + 270 * s, o.x + 256 * s, o.y + 256 * s, o.angle);
            return [circle(c.x, c.y, 95 * s)];
        }
        case 'crane-hook':
        case 'neon-fish':
        case 'neon-bolt':
        case 'signboard': {
            const pivot = { x: o.pivotX, y: o.pivotY };
            const offsetY = o.pivotY + o.length;
            const local = (ax, ay) => rotatePoint(o.pivotX - o.pivotOffset + ax * s, offsetY + (ay - TYPES[o.type].bbox[1]) * s,
                pivot.x, pivot.y, o.angle);
            if (o.type === 'crane-hook') {
                const block = local(254, 222);
                const hook = local(258, 395);
                return [circle(block.x, block.y, 64 * s), circle(hook.x, hook.y, 72 * s)];
            }
            if (o.type === 'neon-bolt') {
                const top = local(215, 90);
                const bottom = local(250, 440);
                return [segment(top.x, top.y, bottom.x, bottom.y, 46 * s)];
            }
            const y = o.type === 'neon-fish' ? 320 : 330;
            const left = local(o.type === 'neon-fish' ? 80 : 70, y);
            const right = local(o.type === 'neon-fish' ? 440 : 442, y);
            return [segment(left.x, left.y, right.x, right.y, (o.type === 'neon-fish' ? 72 : 70) * s)];
        }
        case 'rotor': {
            const hub = { x: o.x + o.hubAx * s, y: o.y + o.hubAy * s };
            const result = [circle(hub.x, hub.y, 30 * s), segment(hub.x, hub.y + 40 * s, hub.x, GROUND + 40, 14)];
            [-Math.PI / 2, Math.PI / 6, (5 * Math.PI) / 6].forEach((rest) => {
                const angle = rest + o.angle;
                const length = 262 * s;
                result.push(segment(hub.x + Math.cos(angle) * 30 * s, hub.y + Math.sin(angle) * 30 * s,
                    hub.x + Math.cos(angle) * length, hub.y + Math.sin(angle) * length, 20 * s));
            });
            return result;
        }
        default:
            return [box(o.x, o.y, o.size, o.size)];
        }
    }

    function isTheme(kind) { return THEMES.includes(kind); }

    const api = Object.freeze({
        THEMES, TYPES, CHAIN_X, GROUND, WARN_COLOR, isTheme, createEncounter, columnAt, advance, shapes, warningSpot, rotatePoint,
    });
    if (typeof window !== 'undefined') window.BertAdventure = api;
    if (typeof module !== 'undefined' && module.exports) module.exports = api;
})();
