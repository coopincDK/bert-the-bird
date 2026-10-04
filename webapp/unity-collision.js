/*
 * Collision geometry reconstructed from the supplied Unity 5 project.
 *
 * Bert live collider (Assets/Scenes/Game.unity):
 *   CircleCollider2D radius 0.45, center (0, -0.13)
 * Bert sprite: 396 x 361 px, PPU 100, local scale 0.45.
 *
 * Flappy pipe collider (Level3/Props/Pipe.prefab):
 *   shaft 1.28 x ~5.2, lip 1.53 x ~0.35 on a 1.57 x 5.28 sprite.
 *
 * Rainbow collider (Level5/props/rainbow/rainbow.prefab):
 *   the original 11-point EdgeCollider2D, normalized to the displayed sprite.
 */
(() => {
    'use strict';

    const BERT_SOURCE = Object.freeze({
        spriteWidth: 396,
        pixelsPerUnit: 100,
        localScale: 0.45,
        liveRadius: 0.45,
        liveCenterX: 0,
        liveCenterY: -0.13,
    });

    const RAINBOW_EDGE = Object.freeze([
        [-6.44557524, -3.10129619],
        [-5.68040562, -1.23339725],
        [-4.72489595, 0.285569698],
        [-3.43826294, 1.6195122],
        [-1.53852022, 2.68033838],
        [0.0658167303, 3.03996158],
        [2.39118719, 2.50888968],
        [3.92362165, 1.43327713],
        [4.95074797, 0.183045313],
        [5.92426395, -1.52692354],
        [6.47525358, -3.13097453],
    ]);

    const RAINBOW_BOUNDS = Object.freeze({
        minX: Math.min(...RAINBOW_EDGE.map(([x]) => x)),
        maxX: Math.max(...RAINBOW_EDGE.map(([x]) => x)),
        minY: Math.min(...RAINBOW_EDGE.map(([, y]) => y)),
        maxY: Math.max(...RAINBOW_EDGE.map(([, y]) => y)),
    });

    function rotatePoint(x, y, radians) {
        const cosine = Math.cos(radians);
        const sine = Math.sin(radians);
        return {
            x: x * cosine - y * sine,
            y: x * sine + y * cosine,
        };
    }

    function bertCollider(bird, birdDisplay) {
        const spriteWorldWidth = (BERT_SOURCE.spriteWidth / BERT_SOURCE.pixelsPerUnit) * BERT_SOURCE.localScale;
        const pixelsPerWorldUnit = birdDisplay.width / spriteWorldWidth;
        const localOffset = rotatePoint(
            BERT_SOURCE.liveCenterX * pixelsPerWorldUnit,
            -BERT_SOURCE.liveCenterY * pixelsPerWorldUnit,
            (bird.rotation * Math.PI) / 180,
        );
        return {
            type: 'circle',
            x: bird.x + birdDisplay.width / 2 + localOffset.x,
            y: bird.y + birdDisplay.height / 2 + localOffset.y,
            // Forstør/Formindsk scale the hit circle with the drawn bird.
            radius: BERT_SOURCE.liveRadius * pixelsPerWorldUnit * ((typeof window !== 'undefined' && window.BertSizeScale) || 1),
        };
    }

    function box(x, y, width, height) {
        return { type: 'box', x, y, width, height };
    }

    function circle(x, y, radius) {
        return { type: 'circle', x, y, radius };
    }

    function segment(x1, y1, x2, y2, thickness) {
        return { type: 'segment', x1, y1, x2, y2, thickness };
    }

    /** Rock under a jungle snake: art 180×140, top just under the snake's coil. */
    function snakeRock(obstacle) {
        const width = Math.max(150, obstacle.width * 1.6);
        const height = width * (obstacle.rockAspect || 140 / 180);
        return { x: obstacle.x + (obstacle.width - width) / 2, y: obstacle.baseBottom - 18, width, height };
    }

    function rainbowSegments(obstacle) {
        const points = RAINBOW_EDGE.map(([sourceX, sourceY]) => {
            const normalizedX = (sourceX - RAINBOW_BOUNDS.minX) / (RAINBOW_BOUNDS.maxX - RAINBOW_BOUNDS.minX);
            const normalizedY = (RAINBOW_BOUNDS.maxY - sourceY) / (RAINBOW_BOUNDS.maxY - RAINBOW_BOUNDS.minY);
            return {
                x: obstacle.x + normalizedX * obstacle.width,
                y: obstacle.y + (obstacle.top ? 1 - normalizedY : normalizedY) * obstacle.height,
            };
        });
        // Outer edge from Unity, plus an inner edge so the whole painted band is
        // solid (the band is ~19 % of the arch height thick).
        const band = 0.19;
        const centerX = obstacle.x + obstacle.width / 2;
        const baseY = obstacle.top ? obstacle.y : obstacle.y + obstacle.height;
        const kx = 1 - (2 * band * obstacle.height) / Math.max(1, obstacle.width);
        const inner = points.map((point) => ({
            x: centerX + (point.x - centerX) * kx,
            y: baseY + (point.y - baseY) * (1 - band),
        }));
        const thickness = Math.max(3, obstacle.height * 0.03);
        const toSegments = (list) => list.slice(0, -1).map((point, index) => ({
            type: 'segment',
            x1: point.x,
            y1: point.y,
            x2: list[index + 1].x,
            y2: list[index + 1].y,
            thickness,
        }));
        return [...toSegments(points), ...toSegments(inner)];
    }

    function obstacleShapes(obstacle) {
        if (obstacle.kind === 'adventure' && typeof window !== 'undefined' && window.BertAdventure) {
            return window.BertAdventure.shapes(obstacle);
        }
        if (obstacle.kind === 'bird-run-bird') {
            // Selectable hero poses face right. All body boxes are defined in the
            // front-facing (mirrored) art; rear flight mirrors this same box.
            const body = obstacle.species === 'swift' ? [0.30, 0.33, 0.47, 0.48]
                : obstacle.species === 'kite' ? [0.29, 0.40, 0.48, 0.45]
                    : obstacle.species === 'eagle' ? [0.27, 0.39, 0.45, 0.42]
                        : obstacle.species === 'vulture' ? [0.27, 0.35, 0.41, 0.48]
                            : [0.30, 0.40, 0.42, 0.43];
            const bodyX = obstacle.direction === 'rear' ? 1 - body[0] - body[2] : body[0];
            return [box(obstacle.x + obstacle.width * bodyX,
                obstacle.y + obstacle.height * body[1],
                obstacle.width * body[2], obstacle.height * body[3])];
        }
        if (obstacle.kind === 'storm-sail') {
            // The triangular canvas is solid; thin tails and transparent margins are not.
            return [circle(obstacle.x + obstacle.width * 0.35,
                obstacle.y + obstacle.height * 0.50, Math.min(obstacle.width * 0.19, obstacle.height * 0.26))];
        }
        if (obstacle.kind === 'wind-umbrella') {
            // Only the colorful canopy, not the fine handle, is solid.
            return [circle(obstacle.x + obstacle.width * 0.38,
                obstacle.y + obstacle.height * 0.40, obstacle.width * 0.19)];
        }
        if (obstacle.kind === 'wind-branch') {
            return [box(obstacle.x + obstacle.width * 0.30,
                obstacle.y + obstacle.height * 0.45,
                obstacle.width * 0.42, obstacle.height * 0.18)];
        }
        if (obstacle.kind === 'wind-sign') {
            return [box(obstacle.x + obstacle.width * 0.19,
                obstacle.y + obstacle.height * 0.24,
                obstacle.width * 0.62, obstacle.height * 0.50)];
        }
        if (obstacle.kind === 'wind-car') {
            // The car body is dangerous; the wind curls outside it are only a cue.
            return [box(obstacle.x + obstacle.width * 0.22,
                obstacle.y + obstacle.height * 0.32,
                obstacle.width * 0.59, obstacle.height * 0.50)];
        }
        if (obstacle.kind === 'edm-crowd-ball') {
            return [circle(obstacle.x + obstacle.width / 2,
                obstacle.y + obstacle.height / 2, obstacle.width * 0.44)];
        }
        if (obstacle.kind === 'edm-center-rig') {
            return [box(obstacle.x + obstacle.width * 0.055,
                obstacle.y + obstacle.height * 0.10,
                obstacle.width * 0.89, obstacle.height * 0.80)];
        }
        if (obstacle.kind === 'edm-orb') {
            return [circle(
                obstacle.x + obstacle.width / 2,
                obstacle.y + obstacle.height * 0.62,
                obstacle.width * 0.44,
            )];
        }
        if (obstacle.kind === 'edm-tower') {
            const inset = obstacle.width * 0.10;
            return [box(obstacle.x + inset, obstacle.y + 4,
                obstacle.width - inset * 2, Math.max(0, obstacle.height - 8))];
        }
        if (obstacle.kind === 'happy-pipe' && obstacle.tilt && obstacle.height > 0) {
            // Leaning tower = a thick line from its gap end along the tilted axis.
            const pivotX = obstacle.x + obstacle.width / 2;
            const pivotY = obstacle.top ? obstacle.y + obstacle.height : obstacle.y;
            const length = obstacle.height + 60;
            const dir = obstacle.top ? -1 : 1;
            const endX = pivotX - Math.sin(obstacle.tilt) * length * dir;
            const endY = pivotY + Math.cos(obstacle.tilt) * length * dir;
            return [segment(pivotX, pivotY, endX, endY, obstacle.width * 0.46)];
        }
        if (obstacle.kind === 'flappy-pipe' || obstacle.kind === 'happy-pipe') {
            const shaftWidth = obstacle.width * (1.28 / 1.57);
            const lipWidth = obstacle.width * (1.53 / 1.57);
            const lipHeight = obstacle.kind === 'happy-pipe'
                ? Math.min(38, Math.max(24, obstacle.width * (45 / 153)))
                : Math.max(10, obstacle.height * (0.35 / 5.28));
            const shaftX = obstacle.x + (obstacle.width - shaftWidth) / 2;
            const lipX = obstacle.x + (obstacle.width - lipWidth) / 2;
            return obstacle.top
                ? [
                    box(shaftX, obstacle.y, shaftWidth, Math.max(0, obstacle.height - lipHeight * 0.55)),
                    box(lipX, obstacle.y + obstacle.height - lipHeight, lipWidth, lipHeight),
                ]
                : [
                    box(shaftX, obstacle.y + lipHeight * 0.55, shaftWidth, Math.max(0, obstacle.height - lipHeight * 0.55)),
                    box(lipX, obstacle.y, lipWidth, lipHeight),
                ];
        }

        if (obstacle.kind === 'desert-wall') {
            // Ferr2D generated a curved terrain mesh. The visible texture is wider
            // than its solid core; this inset removes the transparent/rounded shoulders.
            const insetX = obstacle.width * 0.12;
            const gapInset = Math.min(12, obstacle.height * 0.05);
            return obstacle.top
                ? [box(obstacle.x + insetX, obstacle.y, obstacle.width - insetX * 2, Math.max(0, obstacle.height - gapInset))]
                : [box(obstacle.x + insetX, obstacle.y + gapInset, obstacle.width - insetX * 2, Math.max(0, obstacle.height - gapInset))];
        }

        if (obstacle.kind === 'jungle-spider') {
            const swing = Math.sin(obstacle.bob) * 14;
            const x = obstacle.renderX ?? obstacle.x;
            const y = obstacle.renderY ?? obstacle.y;
            const width = obstacle.renderWidth ?? obstacle.width;
            const height = obstacle.renderHeight ?? obstacle.height;
            return [box(
                x + swing + width * 0.1,
                y + height * 0.12,
                width * 0.8,
                height * 0.76,
            )];
        }

        if (obstacle.kind === 'jungle-snake') {
            // Product override: the original prefab's tiny offset trigger made
            // visible overlaps feel harmless. Use a documented body hull so the
            // rendered snake and its lethal area share the same transform.
            const x = obstacle.renderX ?? obstacle.x;
            const y = obstacle.renderY ?? obstacle.y;
            const width = obstacle.renderWidth ?? obstacle.width;
            const height = obstacle.renderHeight ?? obstacle.height;
            const shapes = [box(
                x + width * 0.1,
                y + height * 0.08,
                width * 0.8,
                height * 0.84,
            )];
            // The rock under the snake is solid too.
            if (obstacle.baseBottom != null) {
                const rock = snakeRock(obstacle);
                shapes.push(box(rock.x + rock.width * 0.08, rock.y + rock.height * 0.12, rock.width * 0.84, rock.height * 0.88));
            }
            return shapes;
        }

        if (obstacle.kind === 'jungle-web') {
            // The web's sticky disc (an ellipse) as three boxes.
            const cx = obstacle.x + obstacle.width / 2;
            const cy = obstacle.top ? obstacle.y + obstacle.height * 0.58 : obstacle.y + obstacle.height * 0.42;
            const rx = obstacle.width * 0.44;
            const ry = obstacle.height * 0.4;
            return [box(cx - rx, cy - ry * 0.45, rx * 2, ry * 0.9), box(cx - rx * 0.7, cy - ry * 0.85, rx * 1.4, ry * 1.7), box(cx - rx * 0.35, cy - ry, rx * 0.7, ry * 2)];
        }
        if (obstacle.kind === 'happy-balloon') {
            // Envelope (round, top 70 %) and the basket underneath.
            const { x, y, width, height } = obstacle;
            return [
                circle(x + width / 2, y + height * 0.36, Math.min(width, height * 0.72) * 0.47),
                box(x + width * 0.36, y + height * 0.8, width * 0.28, height * 0.18),
            ];
        }
        if (obstacle.kind === 'happy-rainbow') {
            return rainbowSegments(obstacle);
        }

        return [box(obstacle.x, obstacle.y, obstacle.width, obstacle.height)];
    }

    function circleHitsBox(hitCircle, hitBox) {
        const closestX = Math.max(hitBox.x, Math.min(hitCircle.x, hitBox.x + hitBox.width));
        const closestY = Math.max(hitBox.y, Math.min(hitCircle.y, hitBox.y + hitBox.height));
        const dx = hitCircle.x - closestX;
        const dy = hitCircle.y - closestY;
        return dx * dx + dy * dy < hitCircle.radius * hitCircle.radius;
    }

    function circleHitsCircle(first, second) {
        const dx = first.x - second.x;
        const dy = first.y - second.y;
        const radii = first.radius + second.radius;
        return dx * dx + dy * dy < radii * radii;
    }

    function circleHitsSegment(hitCircle, segment) {
        const vx = segment.x2 - segment.x1;
        const vy = segment.y2 - segment.y1;
        const lengthSquared = vx * vx + vy * vy;
        const projection = lengthSquared === 0
            ? 0
            : Math.max(0, Math.min(1, ((hitCircle.x - segment.x1) * vx + (hitCircle.y - segment.y1) * vy) / lengthSquared));
        const closestX = segment.x1 + projection * vx;
        const closestY = segment.y1 + projection * vy;
        const dx = hitCircle.x - closestX;
        const dy = hitCircle.y - closestY;
        const threshold = hitCircle.radius + segment.thickness;
        return dx * dx + dy * dy < threshold * threshold;
    }

    function birdHitsObstacle(hitCircle, obstacle) {
        return obstacleShapes(obstacle).some((shape) => {
            if (shape.type === 'circle') return circleHitsCircle(hitCircle, shape);
            if (shape.type === 'segment') return circleHitsSegment(hitCircle, shape);
            return circleHitsBox(hitCircle, shape);
        });
    }

    function drawDebug(ctx, hitCircle, obstacles) {
        ctx.save();
        ctx.lineWidth = 2;
        ctx.strokeStyle = '#00ff9d';
        ctx.fillStyle = 'rgba(0, 255, 157, 0.12)';
        ctx.beginPath();
        ctx.arc(hitCircle.x, hitCircle.y, hitCircle.radius, 0, Math.PI * 2);
        ctx.fill();
        ctx.stroke();

        ctx.strokeStyle = '#ff2f66';
        ctx.fillStyle = 'rgba(255, 47, 102, 0.12)';
        obstacles.forEach((obstacle) => {
            obstacleShapes(obstacle).forEach((shape) => {
                ctx.beginPath();
                if (shape.type === 'circle') {
                    ctx.arc(shape.x, shape.y, shape.radius, 0, Math.PI * 2);
                    ctx.fill();
                    ctx.stroke();
                } else if (shape.type === 'segment') {
                    ctx.moveTo(shape.x1, shape.y1);
                    ctx.lineTo(shape.x2, shape.y2);
                    ctx.stroke();
                } else {
                    ctx.fillRect(shape.x, shape.y, shape.width, shape.height);
                    ctx.strokeRect(shape.x, shape.y, shape.width, shape.height);
                }
            });
        });
        ctx.restore();
    }

    window.BertCollision = Object.freeze({
        bertCollider,
        birdHitsObstacle,
        drawDebug,
        obstacleShapes,
        snakeRock,
    });
})();
