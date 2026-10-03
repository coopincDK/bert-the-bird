/* Fast short SFX: decode once and reuse the buffer during star streaks. */
(() => {
    'use strict';

    async function create(url) {
        const Context = window.AudioContext || window.webkitAudioContext;
        if (Context) {
            let context;
            try {
                context = new Context({ latencyHint: 'playback' });
                const response = await fetch(url);
                if (!response.ok) throw new Error(`Coin sound HTTP ${response.status}`);
                const buffer = await context.decodeAudioData(await response.arrayBuffer());
                const gain = context.createGain();
                gain.gain.value = 0.42;
                gain.connect(context.destination);
                const voices = new Set();
                let lastPlayedAt = -Infinity;
                return {
                    driver: 'buffer',
                    get activeVoices() { return voices.size; },
                    prime() { return context.state === 'running' ? Promise.resolve() : context.resume(); },
                    playOnce() {
                        // Dense magnet/Star Stream pickups should not create dozens of voices.
                        const now = performance.now();
                        if (now - lastPlayedAt < 75 || voices.size >= 3) return false;
                        lastPlayedAt = now;
                        if (context.state !== 'running') context.resume().catch(() => {});
                        const source = context.createBufferSource();
                        source.buffer = buffer;
                        source.connect(gain);
                        voices.add(source);
                        source.onended = () => { voices.delete(source); source.disconnect(); };
                        try { source.start(); return true; }
                        catch (_) { voices.delete(source); source.disconnect(); return false; }
                    },
                };
            } catch (_) {
                context?.close().catch(() => {});
            }
        }

        // A few preloaded players instead of cloneNode()/decoder creation per star.
        const pool = Array.from({ length: 3 }, () => {
            const clip = new Audio(url);
            clip.preload = 'auto';
            clip.volume = 0.42;
            clip.load();
            return clip;
        });
        let lastPlayedAt = -Infinity;
        return {
            driver: 'media-pool',
            get activeVoices() { return pool.filter((clip) => !clip.paused && !clip.ended).length; },
            prime() { return Promise.resolve(); },
            playOnce() {
                const now = performance.now();
                if (now - lastPlayedAt < 75) return false;
                const clip = pool.find((candidate) => candidate.paused || candidate.ended);
                if (!clip) return false;
                lastPlayedAt = now;
                try { clip.currentTime = 0; clip.play().catch(() => {}); return true; }
                catch (_) { return false; }
            },
        };
    }

    window.BertStarAudio = Object.freeze({ create });
})();
