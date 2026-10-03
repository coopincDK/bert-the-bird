const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');

const script = fs.readFileSync(path.join(__dirname, '../webapp/bert-star-audio.js'), 'utf8');

(async () => {
    let now = 1000;
    const sources = [];
    class FakeContext {
        constructor() { this.state = 'suspended'; this.destination = {}; }
        decodeAudioData() { return Promise.resolve({ duration: 0.35 }); }
        createGain() { return { gain: { value: 0 }, connect() {} }; }
        createBufferSource() {
            const source = { connect() {}, disconnect() {}, start() {}, onended: null };
            sources.push(source);
            return source;
        }
        resume() { this.state = 'running'; return Promise.resolve(); }
        close() { return Promise.resolve(); }
    }
    const buffered = {
        window: { AudioContext: FakeContext }, performance: { now: () => now },
        fetch: async () => ({ ok: true, arrayBuffer: async () => new ArrayBuffer(8) }),
    };
    vm.runInNewContext(script, buffered);
    const star = await buffered.window.BertStarAudio.create('/coin.wav');
    assert.equal(star.driver, 'buffer');
    await star.prime();
    assert.equal(star.playOnce(), true);
    now += 30;
    assert.equal(star.playOnce(), false, 'do not play every near-simultaneous pickup');
    now += 80;
    assert.equal(star.playOnce(), true);
    now += 80;
    assert.equal(star.playOnce(), true);
    now += 80;
    assert.equal(star.playOnce(), false, 'cap concurrent decoders');
    assert.equal(star.activeVoices, 3);
    sources[0].onended();
    assert.equal(star.playOnce(), true);
    assert.equal(star.activeVoices, 3);

    let created = 0;
    class FakeAudio {
        constructor() { created++; this.paused = true; this.ended = false; }
        load() {}
        play() { this.paused = false; return Promise.resolve(); }
    }
    const fallback = {
        window: {}, Audio: FakeAudio, performance: { now: () => now },
    };
    vm.runInNewContext(script, fallback);
    const pool = await fallback.window.BertStarAudio.create('/coin.wav');
    assert.equal(pool.driver, 'media-pool');
    assert.equal(created, 3, 'create exactly three players, not one per star');
    await pool.prime();
    for (let i = 0; i < 3; i++) { now += 80; assert.equal(pool.playOnce(), true); }
    now += 80;
    assert.equal(pool.playOnce(), false);
    assert.equal(created, 3);
    console.log('Buffered star SFX, voice limit, throttle, and fallback pool tests passed.');
})().catch((error) => { console.error(error); process.exitCode = 1; });
