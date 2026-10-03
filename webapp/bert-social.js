/* Global leaderboard adapter and shareable asynchronous friend challenges. */
(() => {
    'use strict';

    const API_BASE = '';

    function base64UrlEncode(value) {
        const bytes = new TextEncoder().encode(JSON.stringify(value));
        let binary = '';
        bytes.forEach((byte) => { binary += String.fromCharCode(byte); });
        return btoa(binary).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/g, '');
    }

    function base64UrlDecode(value) {
        try {
            const padded = value.replace(/-/g, '+').replace(/_/g, '/') + '==='.slice((value.length + 3) % 4);
            const binary = atob(padded);
            const bytes = Uint8Array.from(binary, (character) => character.charCodeAt(0));
            return JSON.parse(new TextDecoder().decode(bytes));
        } catch (_) {
            return null;
        }
    }

    function makeSeed() {
        if (typeof crypto !== 'undefined' && crypto.getRandomValues) {
            return crypto.getRandomValues(new Uint32Array(1))[0] || 1;
        }
        return (Date.now() ^ Math.floor(Math.random() * 0xffffffff)) >>> 0;
    }

    function createGhostRecorder() {
        const points = [];
        let nextAt = 0;
        return {
            record(time, y, input) {
                if (time + 1e-6 < nextAt) return;
                points.push([Math.round(time * 10), Math.round(y), input > 0 ? 1 : input < 0 ? -1 : 0]);
                nextAt += 0.1;
            },
            export() { return points.slice(0, 1800); },
        };
    }

    function ghostYAt(points, elapsed) {
        if (!Array.isArray(points) || points.length === 0) return null;
        const tick = elapsed * 10;
        let low = 0;
        let high = points.length - 1;
        while (low < high) {
            const middle = Math.ceil((low + high) / 2);
            if (points[middle][0] <= tick) low = middle;
            else high = middle - 1;
        }
        const first = points[low];
        const second = points[Math.min(low + 1, points.length - 1)];
        if (first === second || second[0] === first[0]) return first[1];
        const amount = Math.max(0, Math.min(1, (tick - first[0]) / (second[0] - first[0])));
        return first[1] + (second[1] - first[1]) * amount;
    }

    async function challengeFromLocation(locationObject = window.location) {
        const duelId = new URL(locationObject.href).searchParams.get('duel');
        if (duelId) {
            try {
                const serverChallenge = await api(`/api/challenges/${encodeURIComponent(duelId)}`);
                return {
                    v: 1, id: serverChallenge.id, playerId: serverChallenge.creator_id,
                    playerName: serverChallenge.creator_name, levelId: serverChallenge.level_id,
                    mode: serverChallenge.mode, seed: serverChallenge.seed,
                    score: serverChallenge.target_score, streak: serverChallenge.target_streak,
                    time: serverChallenge.target_time, ghost: serverChallenge.ghost,
                };
            } catch (_) { return null; }
        }
        const encoded = new URL(locationObject.href).searchParams.get('challenge');
        const challenge = encoded ? base64UrlDecode(encoded) : null;
        if (!challenge || challenge.v !== 1 || !challenge.seed || !challenge.levelId || !Array.isArray(challenge.ghost)) return null;
        return challenge;
    }

    function challengeUrl(payload, locationObject = window.location) {
        const url = new URL(locationObject.href);
        url.search = '';
        url.hash = '';
        url.searchParams.set('challenge', base64UrlEncode({ v: 1, ...payload }));
        return url.toString();
    }

    async function shareChallenge(payload) {
        let url = challengeUrl(payload);
        try {
            const created = await api('/api/challenges', { method: 'POST', body: JSON.stringify(payload) });
            if (created.id) {
                const shortUrl = new URL(window.location.href);
                shortUrl.search = '';
                shortUrl.hash = '';
                shortUrl.searchParams.set('duel', created.id);
                url = shortUrl.toString();
            }
        } catch (_) { /* Encoded link remains playable without a backend. */ }
        const shareData = {
            title: 'Bert The Bird — udfordring',
            text: `${payload.playerName || 'En ven'} har udfordret dig til at slå ${payload.score} point. Du har tre forsøg.`,
            url,
        };
        if (navigator.share) {
            try { await navigator.share(shareData); return { method: 'share', url }; } catch (_) { /* Fall through. */ }
        }
        if (navigator.clipboard?.writeText) {
            try { await navigator.clipboard.writeText(url); return { method: 'clipboard', url }; } catch (_) { /* Fall through. */ }
        }
        return { method: 'manual', url };
    }

    function attemptsKey(id) { return `bertTheBird_challenge_attempts_${id}`; }
    function challengeAttempts(id) {
        try { return Number.parseInt(localStorage.getItem(attemptsKey(id)) || '0', 10) || 0; } catch (_) { return 0; }
    }
    function consumeChallengeAttempt(id) {
        const attempts = Math.min(3, challengeAttempts(id) + 1);
        try { localStorage.setItem(attemptsKey(id), String(attempts)); } catch (_) { /* Keep playable. */ }
        return attempts;
    }

    async function api(path, options = {}) {
        if (typeof navigator !== 'undefined' && navigator.onLine === false) throw new Error('Offline');
        const controller = new AbortController();
        const timeout = setTimeout(() => controller.abort(), 2500);
        try {
            const response = await fetch(`${API_BASE}${path}`, {
                ...options,
                headers: { 'Content-Type': 'application/json', ...(options.headers || {}) },
                signal: controller.signal,
            });
            if (!response.ok) throw new Error(`API ${response.status}`);
            return await response.json();
        } finally {
            clearTimeout(timeout);
        }
    }

    async function submitScore(run) {
        try { return await api('/api/scores', { method: 'POST', body: JSON.stringify(run) }); }
        catch (_) { return { offline: true }; }
    }

    async function submitChallengeAttempt(challengeId, run) {
        if (!challengeId) return { offline: true };
        try { return await api(`/api/challenges/${encodeURIComponent(challengeId)}/attempts`, { method: 'POST', body: JSON.stringify(run) }); }
        catch (_) { return { offline: true }; }
    }

    async function getLeaderboard(filters) {
        const query = new URLSearchParams(filters).toString();
        try {
            const result = await api(`/api/leaderboards?${query}`);
            if (filters.scope === 'friends' && result.scope !== 'friends') throw new Error('Server lacks duel-rival board');
            return result;
        }
        catch (_) { return { offline: true, rows: window.BertMeta.localLeaderboard(filters) }; }
    }

    window.BertSocial = Object.freeze({
        makeSeed, createGhostRecorder, ghostYAt, challengeFromLocation, challengeUrl,
        shareChallenge, challengeAttempts, consumeChallengeAttempt, submitScore, submitChallengeAttempt, getLeaderboard,
        base64UrlEncode, base64UrlDecode,
    });
})();
