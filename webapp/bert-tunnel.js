/* Deterministic Tunnel modes for Bert The Bird. */
(() => {
    'use strict';

    const HEIGHT = 720;
    const MIN_HALF_GAP = 112;
    const VARIANTS = Object.freeze({
        TRAINING: 'training',
        STAR_STREAM: 'star-stream',
        PULSE: 'pulse',
    });

    function clamp(value, minimum, maximum) {
        return Math.min(maximum, Math.max(minimum, value));
    }

    function normalizeVariant(variant) {
        return Object.values(VARIANTS).includes(variant) ? variant : VARIANTS.TRAINING;
    }

    function profileAt(worldX, difficulty = 1, variant = VARIANTS.TRAINING) {
        const x = Number(worldX) || 0;
        const d = Math.max(0, Number(difficulty) || 0);
        const selected = normalizeVariant(variant);
        let center;
        let halfGap;

        if (selected === VARIANTS.STAR_STREAM) {
            center = 360
                + Math.sin(x / 690) * 96
                + Math.sin(x / 255 + 0.9) * 26
                + Math.sin(x / 1450) * 18;
            halfGap = clamp(188 - d * 11 + Math.sin(x / 510 + 0.5) * 16, 126, 194);
        } else if (selected === VARIANTS.PULSE) {
            center = 360
                + Math.sin(x / 505) * 118
                + Math.sin(x / 195 + 1.15) * 30;
            const breath = (Math.sin(x / 575 - 0.6) + 1) / 2;
            halfGap = clamp(205 - breath * (70 + d * 7), MIN_HALF_GAP, 205);
        } else {
            center = 360
                + Math.sin(x / 760) * 112
                + Math.sin(x / 310 + 1.2) * 43;
            halfGap = clamp(
                196 - d * 14 + Math.sin(x / 540) * 25 + Math.sin(x / 1700) * 12,
                132,
                205,
            );
        }

        center = clamp(center, halfGap + 44, HEIGHT - halfGap - 44);
        return { center, halfGap, top: center - halfGap, bottom: center + halfGap, variant: selected };
    }

    function sample(width, worldOffset, difficulty, step = 36, variant = VARIANTS.TRAINING) {
        const points = [];
        for (let x = -step; x <= width + step; x += step) {
            const profile = profileAt(worldOffset + x, difficulty, variant);
            points.push({ x, top: profile.top, bottom: profile.bottom, center: profile.center });
        }
        return points;
    }

    function hitsTunnel(circle, worldOffset, difficulty, variant = VARIANTS.TRAINING) {
        const profile = profileAt(worldOffset + circle.x, difficulty, variant);
        return circle.y - circle.radius <= profile.top || circle.y + circle.radius >= profile.bottom;
    }

    function starY(worldX, difficulty, lane = 0, variant = VARIANTS.TRAINING) {
        const profile = profileAt(worldX, difficulty, variant);
        let offset = lane * Math.min(64, profile.halfGap * 0.38);
        if (profile.variant === VARIANTS.STAR_STREAM) {
            offset += Math.sin(worldX / 215) * Math.min(34, profile.halfGap * 0.2);
        } else if (profile.variant === VARIANTS.PULSE) {
            offset += Math.sin(worldX / 165 + 0.8) * Math.min(42, profile.halfGap * 0.24);
        }
        return clamp(profile.center + offset, profile.top + 44, profile.bottom - 44);
    }

    window.BertTunnel = Object.freeze({
        HEIGHT,
        MIN_HALF_GAP,
        VARIANTS,
        profileAt,
        sample,
        hitsTunnel,
        starY,
    });
})();
