/*
 * Unity-derived stage and obstacle pacing for Bert The Bird.
 * Source: GameSpeed.cs, SpawnScript.cs and the 1280×720 / orthographic-size-5 scene.
 */
(() => {
    'use strict';

    const PIXELS_PER_WORLD_UNIT = 72;
    const UNITY_MOVE_SPEED = 10;
    const SPAWN_MIN_SECONDS = 0.30;
    const SPAWN_MAX_SECONDS = 0.55;

    function clamp(value, minimum, maximum) {
        return Math.max(minimum, Math.min(maximum, value));
    }

    function lerp(from, to, amount) {
        return from + (to - from) * amount;
    }

    function stageValues(startSpeed, stages, elapsed) {
        const fallback = { speed: startSpeed, difficulty: 1, index: -1, progress: 1 };
        if (!Array.isArray(stages) || stages.length === 0) return fallback;

        let remaining = Math.max(0, elapsed);
        let previous = { speed: startSpeed, difficulty: 1 };

        for (let index = 0; index < stages.length; index += 1) {
            const target = stages[index];
            const duration = Math.max(Number(target.duration) || 0, 0.001);
            if (remaining <= duration) {
                const progress = clamp(remaining / duration, 0, 1);
                return {
                    speed: lerp(previous.speed, target.speed, progress),
                    difficulty: lerp(previous.difficulty, target.difficulty, progress),
                    index,
                    progress,
                };
            }
            remaining -= duration;
            previous = target;
        }

        const final = stages[stages.length - 1];
        return { speed: final.speed, difficulty: final.difficulty, index: stages.length - 1, progress: 1 };
    }

    function scrollPixelsPerSecond(speed) {
        return PIXELS_PER_WORLD_UNIT * UNITY_MOVE_SPEED * Math.max(0, speed);
    }

    function spawnInterval(difficulty, randomValue) {
        const sample = SPAWN_MIN_SECONDS + (SPAWN_MAX_SECONDS - SPAWN_MIN_SECONDS) * clamp(randomValue, 0, 0.999999);
        return sample / Math.max(0.1, difficulty);
    }

    function spawnDelay(difficulty, randomValue, speed, minimumDistance) {
        const unityDelay = spawnInterval(difficulty, randomValue);
        const spatialDelay = Math.max(0, minimumDistance) / Math.max(1, scrollPixelsPerSecond(speed));
        return Math.max(unityDelay, spatialDelay);
    }

    window.BertProgression = Object.freeze({
        PIXELS_PER_WORLD_UNIT,
        UNITY_MOVE_SPEED,
        SPAWN_MIN_SECONDS,
        SPAWN_MAX_SECONDS,
        stageValues,
        scrollPixelsPerSecond,
        spawnInterval,
        spawnDelay,
    });
})();
