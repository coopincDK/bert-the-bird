/* Experimental pickups live only in Stormline until their mobile balance is approved. */
(() => {
    'use strict';
    const TYPES = Object.freeze({ HEAVY: 'Heavy', HYPER: 'Hyper', DOUBLE: 'Double', FLAP: 'Flap' });
    const SEQUENCE = Object.freeze([TYPES.HEAVY, TYPES.HYPER, TYPES.DOUBLE, TYPES.FLAP]);
    const DURATION = Object.freeze({ Heavy: 6, Hyper: 6, Double: 8, Flap: 30 });
    const HYPER_MULTIPLIER = 1.22;

    function isPrototype(type) { return Object.values(TYPES).includes(type); }
    function nextType(index, seed) { return SEQUENCE[(index + (seed % SEQUENCE.length)) % SEQUENCE.length]; }
    function speed(stageSpeed, activeType) {
        return activeType === TYPES.HYPER ? stageSpeed * HYPER_MULTIPLIER : stageSpeed;
    }
    function score(base, activeType) { return activeType === TYPES.DOUBLE ? base * 2 : base; }
    function isFlap(mode, activeType) { return mode === 'flappy' || activeType === TYPES.FLAP; }

    window.BertEventPowerups = Object.freeze({ TYPES, SEQUENCE, DURATION,
        HYPER_MULTIPLIER, isPrototype, nextType, speed, score, isFlap });
})();
