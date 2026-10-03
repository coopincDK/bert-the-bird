/* Powerups may approach, retreat or sweep; their visual and pickup positions are identical. */
(() => {
    'use strict';

    function clamp(value, minimum, maximum) {
        return Math.max(minimum, Math.min(maximum, value));
    }

    function create(kind, spawnY, random, requestedProfile = null) {
        const roll = random();
        const profile = ['approach', 'retreat', 'sweep'].includes(requestedProfile)
            ? requestedProfile
            : kind === 'tunnel'
                ? (roll < 0.5 ? 'approach' : 'retreat')
                : (roll < 0.38 ? 'approach' : roll < 0.72 ? 'retreat' : 'sweep');
        const tunnel = kind === 'tunnel';
        const amplitude = tunnel ? 28
            : profile === 'sweep' ? (kind === 'edm' ? 206 : 148)
                : profile === 'approach' ? 42 : 32;
        const phase = profile === 'sweep' ? (random() < 0.5 ? 0 : Math.PI) : random() * Math.PI * 2;
        const frequency = profile === 'sweep' ? 2.7 + random() * 0.55 : 1.3 + random() * 0.5;
        const baseY = tunnel ? 360 : profile === 'sweep' ? 360
            : clamp(spawnY - amplitude * Math.sin(phase), 95 + amplitude, 625 - amplitude);
        return {
            profile,
            scrollFactor: profile === 'approach' ? 1.27 + random() * 0.1
                : profile === 'retreat' ? 0.68 + random() * 0.12
                    : 0.98 + random() * 0.1,
            amplitude,
            frequency,
            phase,
            baseY,
            tunnel,
        };
    }

    function yAt(motion, age, corridorCenter = motion.baseY) {
        const base = motion.tunnel ? corridorCenter : motion.baseY;
        return clamp(base + Math.sin(Math.max(0, age) * motion.frequency + motion.phase)
            * motion.amplitude, 95, 625);
    }

    function safeSpawnX(viewWidth, rightmostObstacleEdge, birdX, scrollFactor) {
        if (!Number.isFinite(rightmostObstacleEdge)) return viewWidth + 90;
        const relativeCatchup = Math.max(0, scrollFactor - 1)
            * Math.max(0, rightmostObstacleEdge - birdX);
        return Math.max(viewWidth + 90, rightmostObstacleEdge + 250 + relativeCatchup);
    }

    window.BertCollectibleMotion = Object.freeze({ create, yAt, safeSpawnX });
})();
