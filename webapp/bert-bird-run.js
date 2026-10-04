/* Bird Run is an isolated non-ranked event. NPCs reuse animated selectable heroes. */
(() => {
    'use strict';

    const WARNING_SECONDS = 0.9;
    const PREDATOR_WARNING_SECONDS = 1.4;
    const LANES = [172, 350, 528];
    const SPECIES = Object.freeze({
        glider: Object.freeze({ asset: 'birdRunBird', hero: 'blue', width: 132, height: 92,
            lanes: [185, 355, 515], travel: 42, delay: 0.65, duration: 1.35 }),
        swift: Object.freeze({ asset: 'birdRunSwift', hero: 'sugar', width: 118, height: 92,
            lanes: [195, 335], travel: 104, delay: 0.12, duration: 1.65 }),
        kite: Object.freeze({ asset: 'birdRunKite', hero: 'noir', width: 143, height: 104,
            lanes: [370, 510], travel: -106, delay: 0.12, duration: 1.65 }),
        eagle: Object.freeze({ asset: 'birdRunBird', hero: 'eagle', width: 212, height: 158,
            lanes: [350], travel: 0, delay: 0, duration: 0 }),
        vulture: Object.freeze({ asset: 'birdRunKite', hero: 'vulture', width: 212, height: 158,
            lanes: [350], travel: 0, delay: 0, duration: 0 }),
    });
    const ORDER = ['glider', 'swift', 'kite'];
    const clamp = (value, low, high) => Math.max(low, Math.min(high, value));
    const clamp01 = (value) => clamp(value, 0, 1);
    const ease = (value) => { const t = clamp01(value); return t * t * (3 - 2 * t); };

    // The predator returns more and more often (feedback 4. okt.): first at 5,
    // then every 6th encounter, tightening to every 3rd late in the run.
    function isPredator(id) {
        if (id === 5) return true;
        if (id < 11) return false;
        const gap = Math.max(3, 6 - Math.floor((id - 11) / 12));
        return (id - 5) % gap === 0;
    }
    // Five spread lanes, so a wave never bunches up in the middle.
    const SPREAD = [150, 250, 350, 450, 550];

    function waveSize(id) {
        // The teaching flight, warning and predator stay solo. A rear arrival
        // is a short interlude between gradually larger *front* waves.
        if (id <= 3 || isPredator(id) || id >= 3 && id % 5 === 3) return 1;
        if (id < 7) return 2;
        if (id < 10) return 3;
        if (id < 14) return 4;
        if (id < 19) return 5;
        return 6;
    }

    function createEncounter(id, spawnX, random, previousSpecies = null, laneIndex = null) {
        const predator = isPredator(id);
        const fromRear = predator || id >= 3 && id % 5 === 3;
        let species = predator ? (random() < 0.5 ? 'eagle' : 'vulture')
            : id < 3 ? ORDER[id] : ORDER[Math.floor(random() * ORDER.length)];
        if (!predator && species === previousSpecies) {
            const alternatives = ORDER.filter((name) => name !== previousSpecies);
            species = alternatives[Math.floor(random() * alternatives.length)];
        }
        const profile = SPECIES[species];
        const lane = Math.floor(random() * profile.lanes.length);
        let centerY = laneIndex != null && !predator ? SPREAD[laneIndex] + (random() - 0.5) * 30 : profile.lanes[lane] + (random() - 0.5) * 20;
        let pathTravel = predator ? 0 : species === 'glider' && lane === 2
            ? -profile.travel : profile.travel;
        // Keep the drift on screen: birds low in the sky drift up, high ones down.
        if (centerY + pathTravel > 590 || centerY + pathTravel < 130) pathTravel = -pathTravel;
        centerY = clamp(centerY, 130, 590);
        const warningSeconds = fromRear ? predator ? PREDATOR_WARNING_SECONDS : WARNING_SECONDS : 0;
        const obstacle = {
            id,
            kind: 'bird-run-bird',
            species,
            predator,
            heroId: profile.hero,
            artKey: profile.asset,
            x: fromRear ? -profile.width - (predator ? 48 : 28) : spawnX,
            y: centerY - profile.height / 2,
            baseY: centerY - profile.height / 2,
            width: profile.width,
            height: profile.height,
            direction: fromRear ? 'rear' : 'front',
            warningRemaining: warningSeconds,
            warningSeconds,
            // Each later predator flies faster and hunts harder, within limits.
            forwardSpeed: fromRear ? predator ? 274 + Math.min(150, Math.max(0, id - 5) * 5) : 232 + random() * 24 : 0,
            hunt: predator ? Math.min(1, Math.max(0, id - 5) / 30) : 0,
            scrollFactor: fromRear ? 0 : 1.08 + random() * 0.1,
            pathTravel,
            pathDelay: profile.delay,
            pathDuration: profile.duration,
            motionPhase: random() * Math.PI * 2,
            animationOffset: random() * 1.4,
            flightAge: 0,
            age: 0,
            harmful: true,
        };
        const star = fromRear ? null : {
            x: spawnX + profile.width + 215,
            y: centerY < 410 ? 530 : 220,
        };
        return { obstacle, star };
    }

    function createWave(id, spawnX, random) {
        const count = waveSize(id);
        const obstacles = [];
        let star = null;
        let x = spawnX;
        // A shuffled set of lanes for the wave: members never share a lane.
        const lanes = SPREAD.map((_, index) => index);
        for (let i = lanes.length - 1; i > 0; i -= 1) {
            const j = Math.floor(random() * (i + 1));
            [lanes[i], lanes[j]] = [lanes[j], lanes[i]];
        }
        for (let index = 0; index < count; index += 1) {
            if (index) x += count === 6 ? 210 + random() * 6 : 220 + random() * 36;
            const encounter = createEncounter(id, x, random, obstacles.at(-1)?.species, count > 1 ? lanes[index % lanes.length] : null);
            encounter.obstacle.waveIndex = index;
            encounter.obstacle.waveSize = count;
            if (count > 1 && index) encounter.obstacle.scrollFactor = obstacles[0].scrollFactor;
            obstacles.push(encounter.obstacle);
            // One optional reward *after the whole wave*, never luring Bert
            // through a still-approaching bird or a rear warning.
            star = encounter.star;
        }
        return { obstacles, star };
    }

    function advance(obstacle, delta, scroll, targetCenterY = 360) {
        obstacle.age += delta;
        if (obstacle.warningRemaining > 0) {
            obstacle.warningRemaining = Math.max(0, obstacle.warningRemaining - delta);
            // The bird stays fully outside the scene during the entire warning.
            return;
        }
        obstacle.flightAge += delta;
        obstacle.x += obstacle.direction === 'rear'
            ? obstacle.forwardSpeed * delta * (obstacle.x > 490 ? 1.75 : 1)
            : -scroll * obstacle.scrollFactor;
        if (obstacle.predator) {
            // Short, bounded pursuit: the player can always break upward or downward.
            const hunt = obstacle.hunt || 0;
            if (obstacle.flightAge < 1.75 + hunt * 1.1 && obstacle.x < 340 + hunt * 220) {
                const reach = 82 + hunt * 110;
                const desired = clamp(targetCenterY - obstacle.height / 2,
                    Math.max(120, obstacle.baseY - reach), Math.min(460, obstacle.baseY + reach));
                const rate = 70 + hunt * 90;
                obstacle.y += clamp(desired - obstacle.y, -rate * delta, rate * delta);
            }
            return;
        }
        const progress = ease((obstacle.flightAge - obstacle.pathDelay) / obstacle.pathDuration);
        obstacle.y = obstacle.baseY + obstacle.pathTravel * progress
            + (Math.sin(obstacle.flightAge * 3.2 + obstacle.motionPhase)
                - Math.sin(obstacle.motionPhase)) * 1.5;
    }

    function isGone(obstacle, viewWidth) {
        return obstacle.direction === 'rear'
            ? obstacle.x > viewWidth + 145
            : obstacle.x + obstacle.width < -145;
    }

    window.BertBirdRun = Object.freeze({ isPredator,
        createEncounter, createWave, waveSize, advance, isGone,
        WARNING_SECONDS, PREDATOR_WARNING_SECONDS, LANES, SPECIES,
    });
})();
