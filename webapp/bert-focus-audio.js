/* Decode the short Focus soundtrack once; no media seek/decode when a pickup starts. */
(() => {
    'use strict';

    async function create(url) {
        const Context = window.AudioContext || window.webkitAudioContext;
        if (Context) {
            let context;
            try {
                context = new Context({ latencyHint: 'playback' });
                const response = await fetch(url);
                if (!response.ok) throw new Error(`Focus audio HTTP ${response.status}`);
                const buffer = await context.decodeAudioData(await response.arrayBuffer());
                const gain = context.createGain();
                gain.gain.value = 0;
                gain.connect(context.destination);
                let source = null;
                let offset = 0;
                let startedAt = 0;
                let volume = 0;
                let loop = true;

                const position = () => source
                    ? (context.currentTime - startedAt) % buffer.duration
                    : offset;
                const stopSource = () => {
                    if (!source) return;
                    const previous = source;
                    source = null;
                    previous.onended = null;
                    try { previous.stop(); } catch (_) { /* May already have ended. */ }
                    previous.disconnect();
                };
                return {
                    driver: 'buffer',
                    get paused() { return !source; },
                    get readyState() { return 4; },
                    get duration() { return buffer.duration; },
                    get currentTime() { return position(); },
                    set currentTime(seconds) {
                        const next = Math.max(0, Number(seconds) || 0) % buffer.duration;
                        const wasPlaying = Boolean(source);
                        stopSource();
                        offset = next;
                        if (wasPlaying) this.play().catch(() => {});
                    },
                    get volume() { return volume; },
                    set volume(value) {
                        volume = Math.min(1, Math.max(0, Number(value) || 0));
                        gain.gain.value = volume;
                    },
                    get loop() { return loop; },
                    set loop(value) { loop = Boolean(value); if (source) source.loop = loop; },
                    prime() {
                        // Call inside the first real tap: iOS needs a trusted gesture to resume.
                        return context.state === 'running' ? Promise.resolve() : context.resume();
                    },
                    play() {
                        if (source) return Promise.resolve();
                        // Begin the source immediately rather than waiting until the gesture has ended.
                        const unlocked = this.prime();
                        const current = context.createBufferSource();
                        current.buffer = buffer;
                        current.loop = loop;
                        current.connect(gain);
                        current.start(0, offset);
                        startedAt = context.currentTime - offset;
                        source = current;
                        current.onended = () => {
                            if (source === current) { source = null; offset = 0; }
                        };
                        return Promise.resolve(unlocked).catch((error) => { this.pause(); throw error; });
                    },
                    pause() {
                        if (!source) return;
                        offset = position();
                        stopSource();
                    },
                };
            } catch (_) {
                context?.close().catch(() => {});
            }
        }
        // Old/limited WebKit: preserve the original media-element path.
        const fallback = new Audio(url);
        fallback.preload = 'auto';
        fallback.load();
        fallback.loop = true;
        fallback.volume = 0;
        return fallback;
    }

    window.BertFocusAudio = Object.freeze({ create });
})();
