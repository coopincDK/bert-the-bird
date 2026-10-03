const assert = require('node:assert/strict');
const path = require('node:path');

let fetches = 0;
let decoded = 0;
let starts = [];
let stopped = 0;
class FakeContext {
    constructor() { this.state = 'suspended'; this.currentTime = 0; this.destination = {}; }
    async decodeAudioData(data) { decoded += 1; assert(data.byteLength > 0); return { duration: 48 }; }
    createGain() { return { gain: { value: 0 }, connect() {} }; }
    createBufferSource() {
        return {
            connect() {}, disconnect() {},
            start(when, offset) { starts.push(offset); },
            stop() { stopped += 1; },
        };
    }
    resume() { this.state = 'running'; return Promise.resolve(); }
    close() { this.state = 'closed'; return Promise.resolve(); }
}
global.window = { AudioContext: FakeContext };
global.fetch = async () => {
    fetches += 1;
    return { ok: true, arrayBuffer: async () => new Uint8Array([1, 2, 3]).buffer };
};
require(path.resolve(__dirname, '../webapp/bert-focus-audio.js'));
(async () => {
    const clip = await window.BertFocusAudio.create('chopin.mp3');
    assert.equal(clip.driver, 'buffer');
    assert.equal(clip.readyState, 4);
    assert.equal(clip.paused, true);
    assert.equal(fetches, 1);
    assert.equal(decoded, 1);
    await clip.prime();
    assert.equal(starts.length, 0, 'Priming must not keep a muted decoder running.');
    clip.volume = 0.56;
    assert.equal(clip.volume, 0.56);
    await clip.play();
    assert.deepEqual(starts, [0]);
    assert.equal(clip.paused, false);
    await clip.play();
    assert.equal(starts.length, 1, 'play() must be idempotent during a live Focus.');
    clip.pause();
    assert.equal(clip.paused, true);
    assert.equal(stopped, 1);
    await clip.play();
    assert.deepEqual(starts, [0, 0]);
    clip.pause();
    clip.currentTime = 12;
    assert.equal(clip.currentTime, 12);
    await clip.play();
    assert.deepEqual(starts, [0, 0, 12]);
    clip.currentTime = 0;
    assert.deepEqual(starts, [0, 0, 12, 0]);
    clip.pause();
    assert.equal(fetches, 1, 'Replay must reuse decoded audio without refetching.');

    window.AudioContext = undefined;
    global.Audio = class {
        constructor(url) { this.url = url; }
        load() { this.loaded = true; }
    };
    const fallback = await window.BertFocusAudio.create('chopin.mp3');
    assert.equal(fallback.loaded, true);
    assert.equal(fallback.loop, true);
    assert.equal(fallback.volume, 0);
    console.log('Cached Focus audio and fallback tests passed.');
})().catch((error) => { console.error(error); process.exitCode = 1; });
