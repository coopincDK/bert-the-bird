const assert = require('node:assert/strict');
const path = require('node:path');

global.window = {};
require(path.join(__dirname, '..', 'webapp', 'bert-tunnel.js'));
const tunnel = global.window.BertTunnel;

for (const variant of Object.values(tunnel.VARIANTS)) {
    let narrowest = Infinity;
    let widest = 0;
    let lastStar = null;
    let maximumStarStep = 0;
    for (let x = 0; x <= 30000; x += 73) {
        const profile = tunnel.profileAt(x, 1.5, variant);
        const width = profile.bottom - profile.top;
        narrowest = Math.min(narrowest, width);
        widest = Math.max(widest, width);
        assert(profile.top >= 0, `${variant} ceiling escaped at ${x}`);
        assert(profile.bottom <= 720, `${variant} floor escaped at ${x}`);
        assert(width >= tunnel.MIN_HALF_GAP * 2 - 1e-9, `${variant} became unfair at ${x}`);
        const star = tunnel.starY(x, 1.5, 0, variant);
        assert(star >= profile.top + 43 && star <= profile.bottom - 43, `${variant} star escaped at ${x}`);
        if (lastStar != null) maximumStarStep = Math.max(maximumStarStep, Math.abs(star - lastStar));
        lastStar = star;
    }
    assert(widest - narrowest >= 24, `${variant} needs meaningful width variation.`);
    assert(maximumStarStep < 42, `${variant} star route changes too abruptly.`);

    const profile = tunnel.profileAt(4200, 1, variant);
    assert.equal(tunnel.hitsTunnel({ x: 185, y: profile.center, radius: 22 }, 4200 - 185, 1, variant), false);
    assert.equal(tunnel.hitsTunnel({ x: 185, y: profile.top + 10, radius: 22 }, 4200 - 185, 1, variant), true);
    assert.equal(tunnel.hitsTunnel({ x: 185, y: profile.bottom - 10, radius: 22 }, 4200 - 185, 1, variant), true);

    const samples = tunnel.sample(1280, 0, 1, 48, variant);
    assert(samples.length >= 27, `${variant} renderer needs enough samples for a smooth wall.`);
    assert(samples[0].x < 0 && samples.at(-1).x > 1280, `${variant} samples must cover canvas edges.`);
}

const training = tunnel.profileAt(5000, 1, tunnel.VARIANTS.TRAINING);
const starStream = tunnel.profileAt(5000, 1, tunnel.VARIANTS.STAR_STREAM);
const pulse = tunnel.profileAt(5000, 1, tunnel.VARIANTS.PULSE);
assert.notDeepEqual(training, starStream, 'Star Stream must not reuse Training geometry.');
assert.notDeepEqual(training, pulse, 'Pulse Tunnel must not reuse Training geometry.');

console.log('All three Tunnel geometry variants passed.');
