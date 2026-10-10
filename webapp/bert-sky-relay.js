/* Sky Relay has solid visible cloud caps, open centers and a precise bell finish. */
(() => {
    'use strict';

    const VIEW = Object.freeze({ width: 1280, height: 720 });
    const BIRD = Object.freeze({
        centerX: 247,
        width: 124,
        height: 113,
        // Existing live Unity torso collider, ~31 px at the rendered sprite size.
        visibleBody: Object.freeze({ halfWidth: 31, halfHeight: 31 }),
    });
    const CORRIDOR = Object.freeze({ top: 145, bottom: 575 });
    const TIME_LIMIT = 45;
    const GATE_DISTANCES = Object.freeze([1600, 3100, 4600]);
    const GATE_CENTERS = Object.freeze([230, 420, 300]);
    const TARGET_DISTANCE = 6100;
    const GATE_FRAME = 58;
    const GATE_CAP_DEPTH = 52;
    const TARGET = Object.freeze({
        kind: 'wind-chime',
        centerX: 1000,
        centerY: 360,
        width: 300,
        height: 300,
        contactWidth: 104,
        contactHeight: 104,
    });

    function clamp(value, minimum, maximum) {
        return Math.max(minimum, Math.min(maximum, value));
    }

    function numberOr(value, fallback) {
        const number = Number(value);
        return Number.isFinite(number) ? number : fallback;
    }

    function elapsedSeconds(value) {
        return Math.max(0, numberOr(value, 0));
    }

    function normaliseSeed(seed) {
        return Math.trunc(numberOr(seed, 0)) >>> 0;
    }

    function freezeRoute(route) {
        route.gates.forEach((gate) => {
            Object.freeze(gate.openingBounds);
            Object.freeze(gate.frameBounds);
            Object.freeze(gate.bob);
            Object.freeze(gate.sway);
            Object.freeze(gate);
        });
        Object.freeze(route.gates);
        Object.freeze(route.target.visibleBounds);
        Object.freeze(route.target.contactBounds);
        Object.freeze(route.target.bob);
        Object.freeze(route.target);
        return Object.freeze(route);
    }

    /**
     * Build a short deterministic course. worldDistance is the integration
     * timeline: renderers move each marker toward Bert as worldDistance rises.
     */
    function seededRandom(seed) {
        let value = (Math.imul((seed >>> 0) ^ 0x9e3779b9, 0x85ebca6b) >>> 0) || 1;
        value = (Math.imul(value ^ (value >>> 13), 0xc2b2ae35) >>> 0) || 1;
        return () => {
            value = (value * 1664525 + 1013904223) >>> 0;
            return value / 4294967296;
        };
    }

    /**
     * Endless rounds. Round 1 is the original fixed course. Every later round
     * starts at startDistance, shrinks the painted ring (art and collider scale
     * together), shortens the clock and adds vertical, then horizontal motion.
     */
    function roundSettings(round) {
        const r = Math.max(1, Math.trunc(numberOr(round, 1)));
        return {
            round: r,
            scale: clamp(1 - 0.055 * (r - 1), 0.66, 1),
            // Less time each round, so later rounds really press (feedback 4. okt.).
            timeLimit: r === 1 ? TIME_LIMIT : clamp(TIME_LIMIT - 6 * (r - 1), 15, TIME_LIMIT),
            spacing: r === 1 ? 1500 : clamp(1500 - 70 * (r - 1), 1050, 1500),
            bobAmplitude: r < 2 ? 0 : clamp(35 * (r - 1), 0, 120),
            bobSpeed: r < 2 ? 0 : clamp(0.9 + 0.12 * (r - 2), 0.9, 1.8),
            swayAmplitude: r < 4 ? 0 : clamp(60 * (r - 3), 0, 220),
            swaySpeed: r < 4 ? 0 : clamp(0.7 + 0.1 * (r - 4), 0.7, 1.4),
            bellBob: r < 3 ? 0 : clamp(30 * (r - 2), 0, 110),
        };
    }

    function createRoute(seed = 0, round = 1, startDistance = 0) {
        const routeSeed = normaliseSeed(seed);
        const settings = roundSettings(round);
        const start = Math.max(0, numberOr(startDistance, 0));
        const random = seededRandom(routeSeed ^ Math.imul(settings.round, 0x27d4eb2d));
        const firstRound = settings.round === 1;
        const centers = firstRound ? GATE_CENTERS : GATE_CENTERS.map(() => Math.round(
            CORRIDOR.top + 60 + random() * (CORRIDOR.bottom - CORRIDOR.top - 120)));
        const gates = centers.map((centerY, index) => {
            // Gates start 1.5× big and shrink a little for every gate passed, across rounds
            // (feedback 10. okt.: hard to hit the hole at first). Art and collider scale together.
            const gateNumber = (settings.round - 1) * centers.length + index;
            const gateScale = clamp(1.5 - 0.08 * gateNumber, 0.66, 1.5);
            const openingRadius = Math.round(106 * gateScale);
            const passRadius = openingRadius - BIRD.visibleBody.halfHeight;
            const previewX = 1000;
            const capDepth = Math.round(GATE_CAP_DEPTH * gateScale);
            return {
                id: index + 1,
                round: settings.round,
                scale: gateScale,
                capDepth,
                bob: { amplitude: settings.bobAmplitude, speed: settings.bobSpeed, phase: random() * Math.PI * 2 },
                sway: { amplitude: settings.swayAmplitude, speed: settings.swaySpeed, phase: random() * Math.PI * 2 },
                worldDistance: firstRound ? GATE_DISTANCES[index] : start + 1400 + index * settings.spacing,
                centerX: previewX,
                centerY,
                openingRadius,
                passRadius,
                openingBounds: {
                    left: previewX - GATE_FRAME,
                    right: previewX + GATE_FRAME,
                    top: centerY - openingRadius,
                    bottom: centerY + openingRadius,
                },
                frameBounds: {
                    left: previewX - GATE_FRAME - 16,
                    right: previewX + GATE_FRAME + 16,
                    top: centerY - openingRadius - capDepth,
                    bottom: centerY + openingRadius + capDepth,
                },
            };
        });
        const target = {
            ...TARGET,
            bob: { amplitude: settings.bellBob, speed: 1.1, phase: random() * Math.PI * 2 },
            worldDistance: firstRound ? TARGET_DISTANCE : start + 1400 + 3 * settings.spacing,
            contactRadius: TARGET.contactHeight / 2,
            hitRadius: TARGET.contactHeight / 2 + BIRD.visibleBody.halfHeight,
            visibleBounds: {
                left: TARGET.centerX - TARGET.width / 2,
                right: TARGET.centerX + TARGET.width / 2,
                // The transparent source has a top rope and a plate at 69% of its height.
                top: TARGET.centerY - TARGET.height * 0.69,
                bottom: TARGET.centerY + TARGET.height * 0.31,
            },
            contactBounds: {
                left: TARGET.centerX - TARGET.contactWidth / 2,
                right: TARGET.centerX + TARGET.contactWidth / 2,
                top: TARGET.centerY - TARGET.contactHeight / 2,
                bottom: TARGET.centerY + TARGET.contactHeight / 2,
            },
        };
        return freezeRoute({
            kind: 'sky-relay',
            seed: routeSeed,
            view: VIEW,
            bird: BIRD,
            corridor: CORRIDOR,
            round: settings.round,
            startDistance: start,
            timeLimit: settings.timeLimit,
            gates,
            target,
        });
    }

    /** Where a (possibly moving) gate is at a given world time. */
    function gatePose(gate, time = 0) {
        const t = numberOr(time, 0);
        const bob = gate.bob && gate.bob.amplitude
            ? Math.sin(t * gate.bob.speed + gate.bob.phase) * gate.bob.amplitude : 0;
        const sway = gate.sway && gate.sway.amplitude
            ? Math.sin(t * gate.sway.speed + gate.sway.phase) * gate.sway.amplitude : 0;
        const centerY = clamp(gate.centerY + bob, CORRIDOR.top + gate.openingRadius * 0.4,
            CORRIDOR.bottom - gate.openingRadius * 0.4);
        return { centerY, worldDistance: gate.worldDistance + sway };
    }

    function targetPose(target, time = 0) {
        const t = numberOr(time, 0);
        const bob = target.bob && target.bob.amplitude
            ? Math.sin(t * target.bob.speed + target.bob.phase) * target.bob.amplitude : 0;
        return { centerY: target.centerY + bob, worldDistance: target.worldDistance };
    }

    function routeGate(route, gateIndex) {
        if (!route || !Array.isArray(route.gates)) return null;
        const index = Math.trunc(numberOr(gateIndex, -1));
        return route.gates[index] || null;
    }

    /**
     * Evaluate one gate at the moment its worldDistance marker crosses Bert.
     * It never mutates the route; collision with the painted top/bottom caps
     * is checked separately before recording a passage or a harmless bypass.
     */
    function gatePass(route, gateIndex, birdCenterY, time, poseTime = 0) {
        const gate = routeGate(route, gateIndex);
        const elapsed = elapsedSeconds(time);
        if (!gate) {
            return Object.freeze({
                passed: false, quality: 'invalid', score: 0, offset: null,
                elapsed, worldDistance: null,
            });
        }
        const pose = gatePose(gate, poseTime);
        const offset = Math.abs(numberOr(birdCenterY, Infinity) - pose.centerY);
        const withinTime = elapsed <= route.timeLimit;
        const passed = withinTime && offset <= gate.passRadius;
        const progress = clamp(1 - offset / gate.passRadius, 0, 1);
        const quality = !withinTime ? 'timeout' : !passed ? 'miss'
            : progress >= 0.8 ? 'perfect' : progress >= 0.42 ? 'clean' : 'edge';
        // Gate score is supplied for feedback only. finish() scores the final run.
        const score = passed ? 25 + Math.round(75 * progress) : 0;
        return Object.freeze({
            passed, quality, score, offset, elapsed, worldDistance: gate.worldDistance,
            gateIndex: Math.trunc(numberOr(gateIndex, -1)), centerY: pose.centerY,
            passRadius: gate.passRadius,
        });
    }

    /** Only visible top/bottom cloud caps are solid. A missed gate entirely
     * above or below the ring is not a collision. Horizontal contact is
     * conservative at the ring plane rather than across the whole sky art.
     */
    function frameContact(route, gateIndex, birdCenterY, gateScreenX, birdCenterX, birdRadius = 31, poseTime = 0) {
        const gate = routeGate(route, gateIndex);
        if (!gate) return Object.freeze({ contact: false, side: null });
        const radius = clamp(numberOr(birdRadius, 31), 0, 40);
        const nearPlane = Math.abs(numberOr(gateScreenX, Infinity) - numberOr(birdCenterX, -Infinity))
            <= GATE_FRAME + radius;
        const y = numberOr(birdCenterY, Infinity);
        const centerY = gatePose(gate, poseTime).centerY;
        const capDepth = gate.capDepth || GATE_CAP_DEPTH;
        const frame = GATE_FRAME * (gate.scale || 1);
        const nearRing = Math.abs(numberOr(gateScreenX, Infinity) - numberOr(birdCenterX, -Infinity))
            <= frame + radius;
        const topOfCap = centerY - gate.openingRadius - capDepth;
        const bottomOfCap = centerY - gate.openingRadius;
        const topContact = nearPlane && nearRing && y + radius >= topOfCap && y - radius <= bottomOfCap;
        const topOfBottomCap = centerY + gate.openingRadius;
        const bottomOfBottomCap = topOfBottomCap + capDepth;
        const bottomContact = nearPlane && nearRing && y + radius >= topOfBottomCap && y - radius <= bottomOfBottomCap;
        return Object.freeze({ contact: topContact || bottomContact,
            side: topContact ? 'top' : bottomContact ? 'bottom' : null });
    }

    function gateCount(gatesHit, maximum) {
        if (Array.isArray(gatesHit)) {
            return gatesHit.reduce((count, gate) => count + (gate === true || gate && gate.passed ? 1 : 0), 0);
        }
        return clamp(Math.floor(numberOr(gatesHit, 0)), 0, maximum);
    }

    /**
     * End the relay at the hanging bell. A body-to-contact overlap is required:
     * a near-but-visible miss earns zero final score but still returns completion.
     */
    function finish(route, birdCenterY, elapsed, gatesHit, poseTime = 0) {
        const time = elapsedSeconds(elapsed);
        const gates = gateCount(gatesHit, route.gates.length);
        const offset = Math.abs(numberOr(birdCenterY, Infinity) - targetPose(route.target, poseTime).centerY);
        const timedOut = time > route.timeLimit;
        const hit = !timedOut && offset <= route.target.hitRadius;
        const precision = hit ? clamp(1 - offset / route.target.hitRadius, 0, 1) : 0;
        const remainingTime = clamp(route.timeLimit - time, 0, route.timeLimit);
        const targetScore = hit ? 300 + Math.round(500 * precision) : 0;
        const gateScore = !hit ? 0 : Array.isArray(gatesHit)
            ? gatesHit.slice(0, route.gates.length).reduce((sum, gate) => sum
                + (gate === true ? 100 : gate?.passed
                    ? clamp(Math.round(numberOr(gate.score, 100)), 0, 100) : 0), 0)
            : gates * 100;
        const timeScore = hit ? Math.round(200 * (remainingTime / route.timeLimit)) : 0;
        const score = targetScore + gateScore + timeScore;
        const rating = timedOut ? 'TIMEOUT' : !hit ? 'MISS'
            : precision >= 0.9 && gates === route.gates.length && remainingTime >= route.timeLimit * 0.4
                ? 'PERFECT' : gates === route.gates.length ? 'COMPLETE' : 'FINISH';
        return Object.freeze({
            completed: true,
            hit,
            timedOut,
            outcome: hit ? 'bell-hit' : timedOut ? 'timeout' : 'bell-miss',
            rating,
            score,
            targetScore,
            gateScore,
            timeScore,
            precision,
            verticalOffset: offset,
            gatesHit: gates,
            gatesTotal: route.gates.length,
            elapsed: time,
            remainingTime,
        });
    }

    const BertSkyRelay = Object.freeze({
        VIEW, BIRD, CORRIDOR, TIME_LIMIT, GATE_DISTANCES, GATE_CENTERS, TARGET_DISTANCE,
        createRoute, roundSettings, gatePose, targetPose, gatePass, frameContact, finish,
    });

    if (typeof window !== 'undefined') window.BertSkyRelay = BertSkyRelay;
    if (typeof module !== 'undefined' && module.exports) module.exports = BertSkyRelay;
})();
