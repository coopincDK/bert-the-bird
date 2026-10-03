/* Neon Encore: hazards are deterministic and never synchronized to audio playback. */
(() => {
    'use strict';

    const BPM = 120;
    const BEAT_SECONDS = 60 / BPM;
    const HEIGHT = 720;
    const AUDIENCE_HANDS_Y = 670;
    // The concert-stage JPEG is drawn 1600x900 -> 1280x720. These five bases
    // sit on the actual distant stage towers/arch rather than in the sky.
    const STAGE_PROJECTORS = Object.freeze([
        { x: 376, y: 570, aimX: 232, aimY: 168 },
        { x: 518, y: 562, aimX: 410, aimY: 132 },
        { x: 644, y: 564, aimX: 650, aimY: 112 },
        { x: 775, y: 562, aimX: 874, aimY: 132 },
        { x: 902, y: 570, aimX: 1048, aimY: 168 },
    ]);

    function clamp(value, minimum, maximum) {
        return Math.max(minimum, Math.min(maximum, value));
    }

    function groupKind(id) {
        // Three familiar pairs first; after that each encounter remains independently passable.
        if (id >= 5 && id % 8 === 5) return 'solo-floor';
        if (id >= 9 && id % 8 === 1) return 'solo-ceiling';
        if (id >= 7 && id % 5 === 2) return 'crowd-ball';
        if (id >= 3 && id % 4 === 3) return 'center-rig';
        return 'pair';
    }

    function crowdBallY(age, baseY, amplitude, phase, speed) {
        // The bottom of every ball returns to the audience's raised hands, never mid-air.
        const cycle = ((phase + Math.max(0, age) * speed) % 1 + 1) % 1;
        return baseY - 4 * amplitude * cycle * (1 - cycle);
    }

    function crowdBallCount(id, roll) {
        // A short introduction, then rare six-ball waves; ten obscures the phone-sized lane.
        if (id < 12) return roll < 0.65 ? 1 : 2;
        if (id < 22) return roll < 0.2 ? 1 : roll < 0.65 ? 2 : 3;
        return roll < 0.12 ? 1 : roll < 0.45 ? 2 : roll < 0.75 ? 3 : roll < 0.95 ? 4 : 6;
    }

    function advanceCrowdBall(ball, delta, scroll, birdFront, viewportWidth, random,
        noNearbyGroup = () => true) {
        const beforeLanding = Math.floor(ball.motionPhase + ball.age * ball.motionSpeed);
        const wasReversing = ball.reverseRemaining > 0;
        ball.age += delta;
        ball.x += wasReversing ? scroll * ball.reverseFactor : -scroll * ball.scrollFactor;
        ball.reverseRemaining = Math.max(0, ball.reverseRemaining - delta);
        ball.y = crowdBallY(ball.age, ball.baseY, ball.motionAmplitude,
            ball.motionPhase, ball.motionSpeed);

        const landed = Math.floor(ball.motionPhase + ball.age * ball.motionSpeed) > beforeLanding;
        // A spectator may bat a *visible* ball away on landing; it then comes back naturally.
        // Never change direction at the player's position, behind Bert, or toward the next group.
        if (landed && !wasReversing && ball.reverseCount < ball.maxReversals
            && ball.x > birdFront + 230 && ball.x < viewportWidth - 80
            && noNearbyGroup() && random() < 0.7) {
            ball.reverseRemaining = 0.38 + random() * 0.29;
            ball.reverseFactor = 0.38 + random() * 0.34;
            ball.reverseCount += 1;
        }
        return ball;
    }

    function crowdFrame(elapsed, reducedMotion = false) {
        return reducedMotion ? 0 : Math.floor(Math.max(0, elapsed) * 3.2) % 3;
    }

    function createGroup(id, x, difficulty, random) {
        const kind = groupKind(id);
        if (kind === 'solo-floor' || kind === 'solo-ceiling') {
            const fromFloor = kind === 'solo-floor';
            const width = 122;
            const lip = (id % 3) * 10;
            const height = fromFloor ? HEIGHT - 235 + lip : 460 + lip;
            return {
                kind, gap: 0, gapTop: 0, stars: [],
                obstacles: [{ x, y: fromFloor ? HEIGHT - height : 0, width, height,
                    kind: 'edm-tower', artKey: fromFloor ? 'edmSpeaker' : 'edmTruss',
                    top: !fromFloor, harmful: true, age: 0, id }],
            };
        }
        if (kind === 'center-rig') {
            const width = 210;
            const height = 56;
            const y = 348 - height / 2 + Math.sin(id * 1.27) * 22;
            return {
                kind, gap: 0, gapTop: 0, stars: [],
                obstacles: [{ x, y, width, height, kind: 'edm-center-rig',
                    artKey: 'edmCenterRig', harmful: true, age: 0, id }],
            };
        }
        if (kind === 'crowd-ball') {
            const count = crowdBallCount(id, random());
            const heights = [122, 212, 158, 264, 188, 238];
            const speeds = [0.68, 0.91, 0.75, 1.02, 0.83, 1.10];
            const factors = [0.67, 1.14, 0.86, 1.28, 0.76, 1.04];
            const obstacles = Array.from({ length: count }, (_, ballIndex) => {
                const width = [94, 82, 100, 88][(id + ballIndex) % 4];
                const height = width;
                const motionAmplitude = heights[(id + ballIndex) % heights.length];
                const motionPhase = (ballIndex * 0.19 + id * 0.07) % 1;
                const motionSpeed = speeds[(id + ballIndex) % speeds.length];
                const scrollFactor = factors[(id + ballIndex) % factors.length];
                const baseY = AUDIENCE_HANDS_Y - height;
                return { x: x + ballIndex * 132,
                    y: crowdBallY(0, baseY, motionAmplitude, motionPhase, motionSpeed),
                    baseY, motionAmplitude, motionPhase, motionSpeed, scrollFactor,
                    reverseRemaining: 0, reverseFactor: 0, reverseCount: 0,
                    maxReversals: id >= 15 ? 2 : 1, ballIndex, crowdSize: count,
                    width, height, kind: 'edm-crowd-ball', artKey: 'edmCrowdBall',
                    harmful: true, moving: true, age: 0, id };
            });
            return {
                kind, gap: 0, gapTop: 0, stars: [],
                obstacles,
            };
        }

        const intro = id < 2;
        const gap = intro ? 348 : clamp(330 - Math.max(0, difficulty - 1) * 18, 294, 330);
        // Deliberate, bounded changes of lane; no sudden opposite-edge jumps.
        const lanes = [205, 236, 257, 227, 194, 224];
        const gapTop = clamp(lanes[id % lanes.length] + (random() - 0.5) * 16, 178, HEIGHT - gap - 120);
        const width = 112;
        const pairCenter = x + width / 2;
        const ballGroup = id >= 2 && id % 4 === 2;
        const top = ballGroup
            ? { x: pairCenter - 67, y: gapTop - 177, width: 134, height: 177,
                kind: 'edm-orb', artKey: 'edmMirror', top: true, harmful: true, age: 0, id }
            : { x, y: 0, width, height: gapTop,
                kind: 'edm-tower', artKey: id % 2 ? 'edmSpeaker' : 'edmTruss', top: true, harmful: true, age: 0, id };
        const bottom = { x, y: gapTop + gap, width, height: HEIGHT - gapTop - gap,
            kind: 'edm-tower', artKey: id % 2 ? 'edmTruss' : 'edmSpeaker', top: false, harmful: true, age: 0, id };
        return {
            kind, gap, gapTop, obstacles: [top, bottom],
            stars: [{ x: pairCenter + 205, y: gapTop + gap / 2 }],
        };
    }

    function lightCue(elapsed, reducedMotion = false) {
        if (reducedMotion) return { beat: 0, intensity: 0.12, color: '#79d7dc' };
        const safeTime = Math.max(0, Number(elapsed) || 0);
        const beat = Math.floor(safeTime / BEAT_SECONDS);
        const phase = (safeTime % BEAT_SECONDS) / BEAT_SECONDS;
        return {
            beat,
            // Slow ebb with a low ceiling, never a full-screen flash or black frame.
            intensity: 0.10 + (1 - phase) * 0.06,
            color: ['#79d7dc', '#e4b7d8', '#ffe1a6', '#9bd4d9'][beat % 4],
        };
    }

    function smokeCue(elapsed, reducedMotion = false) {
        if (reducedMotion) return { active: false, opacity: 0, age: 0 };
        const cycle = ((Math.max(0, Number(elapsed) || 0) + 9) % 18);
        if (cycle >= 4.5) return { active: false, opacity: 0, age: cycle };
        return { active: true, opacity: 0.15 * Math.min(1, cycle / 0.6, (4.5 - cycle) / 0.8), age: cycle };
    }

    window.BertEDM = Object.freeze({ BPM, BEAT_SECONDS, groupKind, crowdBallY,
        crowdBallCount, advanceCrowdBall, crowdFrame, createGroup, lightCue,
        STAGE_PROJECTORS, smokeCue });
})();
