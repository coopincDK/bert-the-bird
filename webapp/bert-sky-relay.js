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
            Object.freeze(gate);
        });
        Object.freeze(route.gates);
        Object.freeze(route.target.visibleBounds);
        Object.freeze(route.target.contactBounds);
        Object.freeze(route.target);
        return Object.freeze(route);
    }

    /**
     * Build a short deterministic course. worldDistance is the integration
     * timeline: renderers move each marker toward Bert as worldDistance rises.
     */
    function createRoute(seed = 0) {
        const routeSeed = normaliseSeed(seed);
        const gates = GATE_CENTERS.map((centerY, index) => {
            // Fixed art has a fixed opening. Never move the lethal edge invisibly
            // between seeds while rendering the same painted cloud ring.
            const openingRadius = 106;
            const passRadius = openingRadius - BIRD.visibleBody.halfHeight;
            const previewX = 1000;
            return {
                id: index + 1,
                worldDistance: GATE_DISTANCES[index],
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
                    top: centerY - openingRadius - GATE_CAP_DEPTH,
                    bottom: centerY + openingRadius + GATE_CAP_DEPTH,
                },
            };
        });
        const target = {
            ...TARGET,
            worldDistance: TARGET_DISTANCE,
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
            timeLimit: TIME_LIMIT,
            gates,
            target,
        });
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
    function gatePass(route, gateIndex, birdCenterY, time) {
        const gate = routeGate(route, gateIndex);
        const elapsed = elapsedSeconds(time);
        if (!gate) {
            return Object.freeze({
                passed: false, quality: 'invalid', score: 0, offset: null,
                elapsed, worldDistance: null,
            });
        }
        const offset = Math.abs(numberOr(birdCenterY, Infinity) - gate.centerY);
        const withinTime = elapsed <= route.timeLimit;
        const passed = withinTime && offset <= gate.passRadius;
        const progress = clamp(1 - offset / gate.passRadius, 0, 1);
        const quality = !withinTime ? 'timeout' : !passed ? 'miss'
            : progress >= 0.8 ? 'perfect' : progress >= 0.42 ? 'clean' : 'edge';
        // Gate score is supplied for feedback only. finish() scores the final run.
        const score = passed ? 25 + Math.round(75 * progress) : 0;
        return Object.freeze({
            passed, quality, score, offset, elapsed, worldDistance: gate.worldDistance,
            gateIndex: Math.trunc(numberOr(gateIndex, -1)), centerY: gate.centerY,
            passRadius: gate.passRadius,
        });
    }

    /** Only visible top/bottom cloud caps are solid. A missed gate entirely
     * above or below the ring is not a collision. Horizontal contact is
     * conservative at the ring plane rather than across the whole sky art.
     */
    function frameContact(route, gateIndex, birdCenterY, gateScreenX, birdCenterX, birdRadius = 31) {
        const gate = routeGate(route, gateIndex);
        if (!gate) return Object.freeze({ contact: false, side: null });
        const radius = clamp(numberOr(birdRadius, 31), 0, 40);
        const nearPlane = Math.abs(numberOr(gateScreenX, Infinity) - numberOr(birdCenterX, -Infinity))
            <= GATE_FRAME + radius;
        const y = numberOr(birdCenterY, Infinity);
        const topOfCap = gate.centerY - gate.openingRadius - GATE_CAP_DEPTH;
        const bottomOfCap = gate.centerY - gate.openingRadius;
        const topContact = nearPlane && y + radius >= topOfCap && y - radius <= bottomOfCap;
        const topOfBottomCap = gate.centerY + gate.openingRadius;
        const bottomOfBottomCap = topOfBottomCap + GATE_CAP_DEPTH;
        const bottomContact = nearPlane && y + radius >= topOfBottomCap && y - radius <= bottomOfBottomCap;
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
    function finish(route, birdCenterY, elapsed, gatesHit) {
        const time = elapsedSeconds(elapsed);
        const gates = gateCount(gatesHit, route.gates.length);
        const offset = Math.abs(numberOr(birdCenterY, Infinity) - route.target.centerY);
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
        createRoute, gatePass, frameContact, finish,
    });

    if (typeof window !== 'undefined') window.BertSkyRelay = BertSkyRelay;
    if (typeof module !== 'undefined' && module.exports) module.exports = BertSkyRelay;
})();
