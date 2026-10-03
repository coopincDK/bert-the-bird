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
    });

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
                obstacles.push(topAt('ice-shelf', theme, id, x, gapTop, 300, 420));
                obstacles.push(bottomAt('ice-spikes', theme, id, x + 40, gapBottom, 240, 340));
                star = { x: x + 190, y: gapTop + gap / 2 };
            } else {
                const spikes = bottomAt('ice-spikes', theme, id, x, Math.max(gapBottom, 470), 240, 340);
                const drop = topAt('ice-stalactite', theme, id, x + 330, lerp(170, 220, random()), 220, 300);
                drop.behaviour = 'drop';
                obstacles.push(spikes, drop);
                star = { x: x + 160, y: spikes.top - 110 };
            }
        } else if (theme === 'harbor') {
            if (pick < 0.4) {
                obstacles.push(swingAt('crane-hook', theme, id, x, lerp(250, 380, random()), d, random));
                star = { x: x + 420, y: lerp(470, 560, random()) };
            } else if (pick < 0.72) {
                const gull = base('diving-gull', theme, id, x, lerp(190, 230, random()));
                gull.y = lerp(40, 120, random());
                gull.behaviour = 'dive';
                obstacles.push(gull);
                star = { x: x + 120, y: lerp(560, 600, random()) };
            } else {
                const parcel = bottomAt('rolling-parcel', theme, id, x + 260, 600, 170, 210);
                parcel.behaviour = 'roll';
                obstacles.push(swingAt('crane-hook', theme, id, x, lerp(230, 300, random()), d, random), parcel);
                star = { x: x + 130, y: 430 };
            }
        } else if (theme === 'nightcity') {
            if (pick < 0.45) {
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
            if (pick < 0.4) {
                obstacles.push(columnAt(theme, id, x, d, random));
                star = { x: x + 330, y: lerp(200, 380, random()) };
            } else if (pick < 0.72) {
                obstacles.push(bombAt(theme, id, x, d, random), bombAt(theme, id, x + 260, d, random));
                star = { x: x + 130, y: lerp(160, 300, random()) };
            } else {
                obstacles.push(columnAt(theme, id, x, d, random), bombAt(theme, id, x + 380, d, random));
                star = { x: x + 200, y: 180 };
            }
        } else {
            if (pick < 0.45) {
                obstacles.push(rotorAt(theme, id, x, lerp(300, 440, random()), d, random));
                star = { x: x + 470, y: lerp(200, 520, random()) };
            } else if (pick < 0.75) {
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
        const sign = type === 'signboard';
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
    function columnAt(theme, id, x, difficulty, random, options = {}) {
        const o = base('lava-spout', theme, id, x, 260);
        o.behaviour = 'column';
        o.fromTop = Boolean(options.fromTop);
        o.palette = options.palette || 'lava';
        o.columnWidth = lerp(70, 90, random());
        o.peakTop = options.peak ?? lerp(70, 150, random());
        o.cycle = clamp(3.0 - 0.35 * difficulty, 1.9, 3.0);
        o.cycleOffset = random() * o.cycle;
        o.topY = GROUND;
        o.lavaTop = GROUND;
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
        } else if (o.behaviour === 'column') {
            // Base edge: the lava surface, the floor, or the ceiling for jets from above.
            o.lavaTop = o.fromTop ? -40 : (env.lavaTop ?? GROUND);
            const t = (o.age + o.cycleOffset) % o.cycle;
            const warnStart = o.cycle - 0.8;
            const up = 0.25;
            const hold = 0.9;
            if (t < up) o.topY = lerp(o.lavaTop, o.peakTop, t / up);
            else if (t < up + hold) o.topY = o.peakTop;
            else if (t < up + hold + 0.4) o.topY = lerp(o.peakTop, o.lavaTop, (t - up - hold) / 0.4);
            else o.topY = o.lavaTop;
            o.warn = t >= warnStart ? clamp((t - warnStart) / 0.6, 0, 1) : 0;
            o.harmful = o.fromTop ? o.topY > o.lavaTop + 24 : o.topY < o.lavaTop - 24;
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
        if (o.behaviour === 'column') return { x: o.x + o.size / 2, y: o.fromTop ? 30 : (o.lavaTop ?? GROUND) - 10, radius: o.columnWidth + 20 };
        if (o.behaviour === 'bomb') return { x: o.x + o.size / 2, y: (o.lavaTop ?? GROUND) - 10, radius: o.size * 0.55 };
        if (o.type === 'lava-spout' || o.type === 'lava-bubble') return { x: o.x + 256 * scale, y: GROUND - 8, radius: 110 * scale + 24 };
        return null;
    }

    /** Hit shapes in world space, measured on the 512 px art. */
    function shapes(o) {
        if (!o.harmful) return [];
        const s = o.size / ART;
        const p = (ax, ay) => at(o, ax, ay);
        if (o.behaviour === 'column') {
            const cx = o.x + o.size / 2;
            const w = o.columnWidth;
            if (o.fromTop) {
                return [box(cx - w * 0.42, o.lavaTop, w * 0.84, Math.max(0, o.topY - o.lavaTop - w * 0.3)), circle(cx, o.topY - w * 0.35, w * 0.45)];
            }
            return [box(cx - w * 0.42, o.topY + w * 0.3, w * 0.84, Math.max(0, o.lavaTop - o.topY)), circle(cx, o.topY + w * 0.35, w * 0.45)];
        }
        if (o.behaviour === 'bomb') {
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
            const left = local(70, 330);
            const right = local(442, 330);
            return [segment(left.x, left.y, right.x, right.y, 70 * s)];
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
        THEMES, TYPES, GROUND, WARN_COLOR, isTheme, createEncounter, columnAt, advance, shapes, warningSpot, rotatePoint,
    });
    if (typeof window !== 'undefined') window.BertAdventure = api;
    if (typeof module !== 'undefined' && module.exports) module.exports = api;
})();
