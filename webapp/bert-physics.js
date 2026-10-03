/*
 * Bert's browser physics, tuned from the original Unity Rigidbody2D setup:
 * mass 5, gravityScale 0.5 and equal ±150 control forces. Browser units use
 * gravity-compensated input so OP and NED have equal net authority while Bert
 * still develops a clear, natural fall as soon as the player releases.
 */
(() => {
    'use strict';

    const DEFAULT = Object.freeze({
        gravity: 480,
        controlAcceleration: 2400,
        upwardThrust: 2880,
        downwardThrust: 1920,
        reverseResponse: 18,
        minimumVelocity: -820,
        maximumVelocity: 1080,
    });
    const HEAVY = Object.freeze({
        gravity: 790,
        controlAcceleration: 1040,
        upwardThrust: 1240,
        downwardThrust: 2290,
        reverseResponse: 12,
        minimumVelocity: -490,
        maximumVelocity: 1190,
    });

    function clamp(value, minimum, maximum) {
        return Math.max(minimum, Math.min(maximum, value));
    }

    function stepDefault(velocity, inputUp, inputDown, strength, delta, profile = DEFAULT) {
        let next = velocity;
        const inputStrength = clamp(strength, 0, 1);

        // Reversing direction should feel immediate on a touch screen instead of
        // spending half a second cancelling the previous vertical momentum.
        if ((inputUp && next > 0) || (inputDown && next < 0)) {
            next *= Math.exp(-profile.reverseResponse * delta);
        }

        next += profile.gravity * delta;
        if (inputUp) {
            next -= profile.upwardThrust * inputStrength * delta;
        } else if (inputDown) {
            next += profile.downwardThrust * inputStrength * delta;
        }

        return clamp(next, profile.minimumVelocity, profile.maximumVelocity);
    }

    window.BertPhysics = Object.freeze({ DEFAULT, HEAVY, stepDefault });
})();
