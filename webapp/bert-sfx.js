/* Short sound effects through ONE shared Web Audio context: decoded once, played as buffers.
 * Creating a new <audio> element per effect (cloneNode) stutters badly on iPhone. */
(() => {
    'use strict';
    const Context = window.AudioContext || window.webkitAudioContext;
    let context = null;
    let master = null;
    const buffers = new Map();
    const loading = new Map();
    const lastPlayed = new Map();
    let voices = 0;

    function ensure() {
        if (!Context) return null;
        if (!context) {
            try { context = new Context({ latencyHint: 'interactive' }); } catch (_) { return null; }
            master = context.createGain();
            master.connect(context.destination);
        }
        return context;
    }
    function load(name, url) {
        if (buffers.has(name) || loading.has(name) || !ensure()) return;
        const job = fetch(url).then((response) => response.arrayBuffer())
            .then((data) => new Promise((resolve, reject) => context.decodeAudioData(data, resolve, reject)))
            .then((buffer) => { buffers.set(name, buffer); })
            .catch(() => {})
            .finally(() => loading.delete(name));
        loading.set(name, job);
    }
    /** Returns true when the effect was played through Web Audio. */
    function play(name, volume = 0.3) {
        const buffer = buffers.get(name);
        if (!buffer || !context) return false;
        if (context.state !== 'running') context.resume().catch(() => {});
        const now = performance.now();
        // The same effect at most every 60 ms, and never more than 8 voices at once.
        if (now - (lastPlayed.get(name) || 0) < 60 || voices >= 8) return true;
        lastPlayed.set(name, now);
        const source = context.createBufferSource();
        const gain = context.createGain();
        gain.gain.value = volume;
        source.buffer = buffer;
        source.connect(gain).connect(master);
        voices += 1;
        source.onended = () => { voices -= 1; source.disconnect(); gain.disconnect(); };
        try { source.start(); } catch (_) { voices -= 1; }
        return true;
    }
    function unlock() {
        if (!ensure()) return;
        if (context.state !== 'running') context.resume().catch(() => {});
    }
    window.BertSfx = Object.freeze({ load, play, unlock, has: (name) => buffers.has(name) });
})();
