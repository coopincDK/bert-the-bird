/* Local-first progression and score history for Bert The Bird. */
(() => {
    'use strict';

    const STORAGE_KEY = 'bertTheBird_meta_v1';
    const CONTINUE_SPIN_COST = 12;
    const DEFAULTS = Object.freeze({
        hero: 'bert',
        ownedHeroes: { bert: { source: 'starter' } },
        achievements: { bestScores: {}, bronzeLevels: {}, medals: {}, maxScore: 0, cleanJungle: false, clean180: false },
        player: { id: '', name: '' },
        totalStars: 0,
        feathers: 0,
        runCount: 0,
        quickIndex: 0,
        runs: [],
        duels: { wins: 0, currentStreak: 0, bestStreak: 0 },
        nest: { rescueLives: 0 },
        economy: { continueSpins: 0, revivesWon: 0, feathersSpent: 0 },
        settings: { music: true, sfx: true, haptics: true, lights: true },
        daily: {},
        dailyLevels: {},
        missionClaims: {},
    });

    const cloneDefaults = () => JSON.parse(JSON.stringify(DEFAULTS));

    function load() {
        try {
            const stored = JSON.parse(localStorage.getItem(STORAGE_KEY) || 'null');
            if (!stored || typeof stored !== 'object') return cloneDefaults();
            const migratedFeathers = Number.isFinite(Number(stored.feathers))
                ? Math.max(0, Math.floor(Number(stored.feathers)))
                : Math.max(0, Math.floor(Number(stored.totalStars) || 0) / 4);
            const catalog = window.BertHeroStore.catalog;
            const hero = catalog.some((entry) => entry.id === stored.hero) ? stored.hero : 'bert';
            const owned = { bert: { source: 'starter' } };
            if (stored.ownedHeroes && typeof stored.ownedHeroes === 'object') {
                catalog.forEach((entry) => {
                    if (entry.id !== 'bert' && stored.ownedHeroes[entry.id]) owned[entry.id] = stored.ownedHeroes[entry.id];
                });
            } else if (hero !== 'bert') {
                // Earlier builds let players choose freely. Never confiscate their selected hero.
                owned[hero] = { source: 'legacy' };
            }
            const recorded = Array.isArray(stored.runs) ? stored.runs : [];
            const achievements = {
                ...DEFAULTS.achievements, ...(stored.achievements || {}),
                bestScores: { ...(stored.achievements?.bestScores || {}) },
                bronzeLevels: { ...(stored.achievements?.bronzeLevels || {}) },
                medals: { ...(stored.achievements?.medals || {}) },
            };
            recorded.forEach((run) => {
                const score = Math.max(0, Number(run.score) || 0);
                const level = Math.floor(Number(run.levelId));
                if (level >= 1 && level <= 9) {
                    achievements.bestScores[level] = Math.max(Number(achievements.bestScores[level]) || 0, score);
                    if (score >= 20) achievements.bronzeLevels[level] = true;
                }
                achievements.maxScore = Math.max(Number(achievements.maxScore) || 0, score);
                if (score >= 20) achievements.medals.bronze = true;
                if (score >= 50) achievements.medals.silver = true;
                if (score >= 100) achievements.medals.gold = true;
                // Old runs did not record rescue usage, so do not infer a clean Jungle run.
            });
            return {
                ...cloneDefaults(),
                ...stored,
                hero,
                ownedHeroes: owned,
                achievements,
                feathers: migratedFeathers,
                player: { ...DEFAULTS.player, ...(stored.player || {}) },
                runs: Array.isArray(stored.runs) ? stored.runs.slice(0, 200) : [],
                duels: { ...DEFAULTS.duels, ...(stored.duels || {}) },
                nest: { ...DEFAULTS.nest, ...(stored.nest || {}) },
                economy: { ...DEFAULTS.economy, ...(stored.economy || {}) },
                settings: { ...DEFAULTS.settings, ...(stored.settings || {}) },
                daily: stored.daily && typeof stored.daily === 'object' ? stored.daily : {},
                dailyLevels: stored.dailyLevels && typeof stored.dailyLevels === 'object' ? stored.dailyLevels : {},
                missionClaims: stored.missionClaims && typeof stored.missionClaims === 'object' ? stored.missionClaims : {},
            };
        } catch (_) {
            return cloneDefaults();
        }
    }

    let data = load();
    function awardEarnedHeroes() {
        const earned = [];
        window.BertHeroStore.catalog.forEach((hero) => {
            if (hero.id !== 'bert' && !data.ownedHeroes[hero.id] && window.BertHeroStore.progress(hero.id, data).complete) {
                data.ownedHeroes[hero.id] = { source: 'achievement', at: new Date().toISOString() };
                earned.push(hero.name);
            }
        });
        return earned;
    }
    awardEarnedHeroes();
    syncSecretHeroes();
    if (!data.player.id) {
        data.player.id = typeof crypto !== 'undefined' && crypto.randomUUID
            ? crypto.randomUUID()
            : `pilot-${Date.now()}-${Math.random().toString(36).slice(2)}`;
    }

    function save() {
        try { localStorage.setItem(STORAGE_KEY, JSON.stringify(data)); } catch (_) { /* Private mode stays playable. */ }
        return snapshot();
    }

    function snapshot() { return JSON.parse(JSON.stringify(data)); }
    function currentHero() { return data.hero; }
    function settingEnabled(name) { return Boolean(data.settings[name]); }
    /** Secret heroes belong to a pilot name: granted when it matches, removed when it no longer does. */
    function syncSecretHeroes() {
        const store = window.BertHeroStore;
        if (!store?.secretHeroesForName) return [];
        const earned = new Set(store.secretHeroesForName(data.player.name));
        const granted = [];
        store.catalog.filter((hero) => hero.secret).forEach((hero) => {
            if (earned.has(hero.id)) {
                if (!data.ownedHeroes[hero.id]) {
                    data.ownedHeroes[hero.id] = { source: 'name', at: new Date().toISOString() };
                    granted.push(hero.id);
                }
            } else if (data.ownedHeroes[hero.id]) {
                delete data.ownedHeroes[hero.id];
                if (data.hero === hero.id) data.hero = 'bert';
            }
        });
        return granted;
    }

    function heroCatalog() {
        return window.BertHeroStore.catalog.map((hero) => ({
            ...window.BertHeroStore.progress(hero.id, data),
            owned: Boolean(data.ownedHeroes[hero.id]),
            source: data.ownedHeroes[hero.id]?.source || null,
            balance: data.feathers,
        }));
    }

    function setHero(hero) {
        if (!Object.prototype.hasOwnProperty.call(window.BertHeroStore.byId, hero)) hero = 'bert';
        if (!Object.prototype.hasOwnProperty.call(data.ownedHeroes, hero)) return snapshot();
        data.hero = hero;
        return save();
    }

    function buyHero(hero) {
        const option = heroCatalog().find((entry) => entry.id === hero);
        if (!option || option.owned || option.price <= 0 || data.feathers < option.price) {
            return { ok: false, option: option || null, meta: snapshot() };
        }
        data.feathers -= option.price;
        data.economy.feathersSpent += option.price;
        data.ownedHeroes[hero] = { source: 'feathers', at: new Date().toISOString() };
        save();
        return { ok: true, spent: option.price, option: heroCatalog().find((entry) => entry.id === hero), meta: snapshot() };
    }

    function noteCleanScore(score) {
        if (data.achievements.clean180 || Number(score) < 180) return false;
        data.achievements.clean180 = true;
        awardEarnedHeroes();
        save();
        return true;
    }

    function setPlayerName(name) {
        const cleaned = String(name || '').trim().replace(/\s+/g, ' ').slice(0, 24);
        data.player.name = cleaned;
        const granted = syncSecretHeroes();
        // A newly matched epic hero is equipped right away, as a surprise.
        if (granted.length) data.hero = granted[0];
        return save();
    }

    /** 'Pilot' was the old placeholder; it never counts as a chosen name. */
    function hasPlayerName() {
        const name = String(data.player.name || '').trim();
        return name.length > 0 && name.toLowerCase() !== 'pilot';
    }

    function setSetting(name, enabled) {
        if (!Object.prototype.hasOwnProperty.call(DEFAULTS.settings, name)) return snapshot();
        data.settings[name] = Boolean(enabled);
        if (name === 'haptics') window.BertHaptics?.setEnabled(data.settings.haptics);
        return save();
    }

    function dayKey(date = new Date()) {
        const year = date.getFullYear();
        const month = String(date.getMonth() + 1).padStart(2, '0');
        const day = String(date.getDate()).padStart(2, '0');
        return `${year}-${month}-${day}`;
    }

    function hashText(value) {
        let hash = 2166136261;
        for (let index = 0; index < value.length; index += 1) {
            hash ^= value.charCodeAt(index);
            hash = Math.imul(hash, 16777619);
        }
        return hash >>> 0;
    }

    function normalizedLevelIds(levelIds) {
        const source = Array.isArray(levelIds)
            ? levelIds
            : Array.from({ length: Math.max(1, Math.floor(Number(levelIds) || 1)) }, (_, index) => index + 1);
        const clean = [...new Set(source.map((value) => Math.max(1, Math.floor(Number(value) || 0))).filter(Boolean))];
        return clean.length ? clean : [1];
    }

    function dailyChallenge(date = new Date(), levelIds = [1]) {
        const key = dayKey(date);
        const seed = hashText(`bert-${key}`);
        const routeNames = ['Stjerneregn', 'Præcisionsflyvning', 'Høj fart', 'Langtur', 'Mod vinden'];
        const available = normalizedLevelIds(levelIds);
        const savedLevel = Number(data.dailyLevels[key]);
        const levelId = available.includes(savedLevel) ? savedLevel : available[seed % available.length];
        if (data.dailyLevels[key] !== levelId) {
            data.dailyLevels[key] = levelId;
            save();
        }
        return {
            key,
            seed,
            levelId,
            target: 30 + (seed % 5) * 10,
            name: routeNames[seed % routeNames.length],
            completed: Boolean(data.daily[key]),
        };
    }

    function recordRun(run) {
        const stars = Math.max(0, Math.floor(Number(run.stars) || 0));
        const normalized = {
            runId: run.runId || `${Date.now()}-${Math.random().toString(36).slice(2)}`,
            createdAt: run.createdAt || new Date().toISOString(),
            levelId: Math.max(1, Math.floor(Number(run.levelId) || 1)),
            mode: String(run.mode || 'classic'),
            score: Math.max(0, Math.floor(Number(run.score) || 0)),
            streak: Math.max(0, Math.floor(Number(run.streak) || 0)),
            time: Math.max(0, Number(run.time) || 0),
            stars,
            rescueUsed: run.rescueUsed === true,
        };
        data.totalStars += stars;
        data.runCount += 1;
        data.runs.unshift(normalized);
        data.runs = data.runs.slice(0, 200);
        if (run.dailyKey && normalized.score >= Number(run.dailyTarget)) {
            data.daily[run.dailyKey] = { score: normalized.score, completedAt: Date.now() };
        }
        data.achievements.bestScores[normalized.levelId] = Math.max(Number(data.achievements.bestScores[normalized.levelId]) || 0, normalized.score);
        data.achievements.maxScore = Math.max(Number(data.achievements.maxScore) || 0, normalized.score);
        if (normalized.score >= 20) { data.achievements.bronzeLevels[normalized.levelId] = true; data.achievements.medals.bronze = true; }
        if (normalized.score >= 50) data.achievements.medals.silver = true;
        if (normalized.score >= 100) data.achievements.medals.gold = true;
        if (normalized.levelId === 4 && normalized.score >= 20 && run.rescueUsed === false) data.achievements.cleanJungle = true;
        const unlockedHeroes = awardEarnedHeroes();
        save();
        return { ...normalized, unlockedHeroes };
    }

    function periodStart(period, now = new Date()) {
        const start = new Date(now);
        if (period === 'day') start.setHours(0, 0, 0, 0);
        else if (period === 'week') {
            start.setDate(start.getDate() - ((start.getDay() + 6) % 7));
            start.setHours(0, 0, 0, 0);
        } else if (period === 'month') {
            start.setDate(1);
            start.setHours(0, 0, 0, 0);
        } else return 0;
        return start.getTime();
    }

    function localLeaderboard({ period = 'day', metric = 'score', mode = 'all', level = 'all' } = {}) {
        const start = periodStart(period);
        const key = metric === 'time' ? 'time' : metric === 'streak' ? 'streak' : 'score';
        const levelId = level === 'all' ? null : Math.max(1, Math.floor(Number(level) || 0));
        return data.runs
            .filter((run) => new Date(run.createdAt).getTime() >= start)
            .filter((run) => mode === 'all' || run.mode === mode)
            .filter((run) => levelId == null || run.levelId === levelId)
            .sort((a, b) => b[key] - a[key] || b.score - a.score)
            .slice(0, 20)
            .map((run, index) => ({ rank: index + 1, playerName: data.player.name || 'Dig', ...run }));
    }

    function missions(date = new Date()) {
        const key = dayKey(date);
        const runs = data.runs.filter((run) => String(run.createdAt).slice(0, 10) === key);
        const stars = runs.reduce((sum, run) => sum + run.stars, 0);
        const seconds = runs.reduce((sum, run) => sum + run.time, 0);
        const streak = runs.reduce((best, run) => Math.max(best, run.streak), 0);
        const claimed = data.missionClaims[key] || {};
        const dailyRouteComplete = Boolean(data.daily[key]);
        return [
            { id: 'food', label: 'Saml 20 stjerner til reden', value: Math.min(stars, 20), target: 20, reward: 8, complete: stars >= 20, claimed: Boolean(claimed.food) },
            { id: 'flight', label: 'Flyv samlet i 3 minutter', value: Math.min(Math.floor(seconds), 180), target: 180, reward: 12, complete: seconds >= 180, claimed: Boolean(claimed.flight) },
            { id: 'streak', label: 'Nå en streak på 12', value: Math.min(streak, 12), target: 12, reward: 15, complete: streak >= 12, claimed: Boolean(claimed.streak) },
            { id: 'route', label: 'Klar dagens rute', value: dailyRouteComplete ? 1 : 0, target: 1, reward: 10, complete: dailyRouteComplete, claimed: Boolean(claimed.route) },
        ];
    }

    function claimMission(id, date = new Date()) {
        const mission = missions(date).find((entry) => entry.id === id);
        if (!mission || !mission.complete || mission.claimed) return { ok: false, mission, meta: snapshot() };
        const key = dayKey(date);
        data.missionClaims[key] ||= {};
        data.missionClaims[key][id] = Date.now();
        data.feathers += mission.reward;
        const unlockedHeroes = awardEarnedHeroes();
        save();
        return { ok: true, reward: mission.reward, unlockedHeroes, mission: { ...mission, claimed: true }, meta: snapshot() };
    }

    function missionClaimCount() {
        return Object.values(data.missionClaims || {}).reduce((total, claims) => {
            if (!claims || typeof claims !== 'object') return total;
            return total + Object.values(claims).filter(Boolean).length;
        }, 0);
    }

    const RESCUE_COSTS = Object.freeze([20, 60, 140]);

    function rescueUpgrade() {
        const level = Math.max(0, Math.min(RESCUE_COSTS.length, Math.floor(Number(data.nest.rescueLives) || 0)));
        return {
            level,
            maxLevel: RESCUE_COSTS.length,
            cost: level < RESCUE_COSTS.length ? RESCUE_COSTS[level] : null,
            canBuy: level < RESCUE_COSTS.length && data.feathers >= RESCUE_COSTS[level],
        };
    }

    function buyRescueLife() {
        const upgrade = rescueUpgrade();
        if (upgrade.cost == null || !upgrade.canBuy) return { ok: false, upgrade, meta: snapshot() };
        data.feathers -= upgrade.cost;
        data.nest.rescueLives = upgrade.level + 1;
        save();
        return { ok: true, spent: upgrade.cost, upgrade: rescueUpgrade(), meta: snapshot() };
    }

    function continueSpinOffer() {
        return {
            cost: CONTINUE_SPIN_COST,
            balance: data.feathers,
            canAfford: data.feathers >= CONTINUE_SPIN_COST,
        };
    }

    function buyContinueSpin() {
        const offer = continueSpinOffer();
        if (!offer.canAfford) return { ok: false, offer, meta: snapshot() };
        data.feathers -= CONTINUE_SPIN_COST;
        data.economy.continueSpins += 1;
        data.economy.feathersSpent += CONTINUE_SPIN_COST;
        save();
        return { ok: true, spent: CONTINUE_SPIN_COST, offer: continueSpinOffer(), meta: snapshot() };
    }

    function settleContinueSpin({ survived = false, refund = 0 } = {}) {
        const normalizedRefund = Math.max(0, Math.floor(Number(refund) || 0));
        if (normalizedRefund) data.feathers += normalizedRefund;
        if (survived) data.economy.revivesWon += 1;
        return save();
    }

    /** A feather picked up out on a level. Capped so it can never be farmed in bulk. */
    function addFeathers(amount = 1) {
        const value = Math.max(0, Math.min(5, Math.floor(Number(amount) || 0)));
        if (value) data.feathers += value;
        return save();
    }

    function recordDuel(won) {
        if (won) {
            data.duels.wins += 1;
            data.duels.currentStreak += 1;
            data.duels.bestStreak = Math.max(data.duels.bestStreak, data.duels.currentStreak);
        } else {
            data.duels.currentStreak = 0;
        }
        awardEarnedHeroes();
        return save();
    }

    function nextQuickLevel(levelIds = [1]) {
        const available = normalizedLevelIds(levelIds);
        const levelId = available[data.quickIndex % available.length];
        data.quickIndex = (data.quickIndex + 1) % available.length;
        save();
        return levelId;
    }

    function progressionState(levels, bestScores = {}, options = {}) {
        const result = {};
        const catalog = Array.isArray(levels) ? levels : [];
        const claimedMissions = Number.isFinite(Number(options.claimedMissions))
            ? Math.max(0, Math.floor(Number(options.claimedMissions)))
            : missionClaimCount();
        const grandfathered = new Set(Array.isArray(options.grandfatheredLevelIds) ? options.grandfatheredLevelIds.map(Number) : []);
        const groups = new Map();
        catalog.forEach((level) => {
            const mode = String(level.modeGroup || level.mode || 'classic');
            if (!groups.has(mode)) groups.set(mode, []);
            groups.get(mode).push(level);
        });
        groups.forEach((entries) => entries.sort((a, b) => Number(a.modeOrder) - Number(b.modeOrder)));
        const maximumOrder = catalog.reduce((maximum, level) => Math.max(maximum, Math.max(1, Math.floor(Number(level.modeOrder) || 1))), 1);
        for (let order = 1; order <= maximumOrder; order += 1) {
            const tier = catalog.filter((level) => Math.max(1, Math.floor(Number(level.modeOrder) || 1)) === order);
            if (order === 1) {
                tier.forEach((level) => {
                    const mode = String(level.modeGroup || level.mode || 'classic');
                    result[level.id] = { unlocked: true, mode, order, requirement: null, requirements: [], missionRequirement: null, progress: 1 };
                });
                continue;
            }
            const previousTier = catalog.filter((level) => Math.max(1, Math.floor(Number(level.modeOrder) || 1)) === order - 1);
            const requirements = previousTier.map((previous) => {
                const mode = String(previous.modeGroup || previous.mode || 'classic');
                const target = tier.find((level) => String(level.modeGroup || level.mode || 'classic') === mode);
                const score = Math.max(0, Math.floor(Number(bestScores[previous.id]) || 0));
                const required = Math.max(1, Math.floor(Number(target?.unlockScore) || 1));
                return { levelId: previous.id, mode, score: required, current: score, complete: score >= required };
            });
            const missionTarget = order === 2 ? 1 : 4;
            const missionRequirement = {
                current: claimedMissions,
                target: missionTarget,
                complete: claimedMissions >= missionTarget,
            };
            const previousTierUnlocked = previousTier.every((level) => Boolean(result[level.id]?.unlocked));
            const tierQualified = requirements.every((requirement) => requirement.complete);
            const progressParts = [
                ...requirements.map((requirement) => Math.min(1, requirement.current / requirement.score)),
                Math.min(1, claimedMissions / missionTarget),
            ];
            tier.forEach((level) => {
                const mode = String(level.modeGroup || level.mode || 'classic');
                const requirement = requirements.find((entry) => entry.mode === mode) || requirements[0] || null;
                const legacyUnlocked = grandfathered.has(Number(level.id));
                result[level.id] = {
                    unlocked: legacyUnlocked || (previousTierUnlocked && tierQualified && missionRequirement.complete),
                    grandfathered: legacyUnlocked,
                    mode,
                    order,
                    requirement,
                    requirements: requirements.map((entry) => ({ ...entry })),
                    missionRequirement: { ...missionRequirement },
                    progress: progressParts.length ? Math.min(...progressParts) : 1,
                };
            });
        }
        return result;
    }

    function medalForScore(score) {
        const value = Math.max(0, Number(score) || 0);
        if (value >= 100) return { id: 'gold', label: 'GULD', next: null };
        if (value >= 50) return { id: 'silver', label: 'SØLV', next: 100 };
        if (value >= 20) return { id: 'bronze', label: 'BRONZE', next: 50 };
        return { id: 'flight', label: 'FLYV IGEN', next: 20 };
    }

    function haptic(pattern) {
        if (!data.settings.haptics) return false;
        if (window.BertHaptics) return window.BertHaptics.trigger(pattern);
        if (typeof navigator === 'undefined' || typeof navigator.vibrate !== 'function') return false;
        return navigator.vibrate(pattern);
    }

    window.BertHaptics?.setEnabled(data.settings.haptics);
    save();
    window.BertMeta = Object.freeze({
        addFeathers, hasPlayerName,
        snapshot, currentHero, settingEnabled, heroCatalog, setHero, buyHero, noteCleanScore, setPlayerName, setSetting, dailyChallenge, recordRun,
        localLeaderboard, missions, claimMission, missionClaimCount, rescueUpgrade, buyRescueLife,
        continueSpinOffer, buyContinueSpin, settleContinueSpin,
        recordDuel, nextQuickLevel, progressionState, medalForScore, haptic,
    });
})();
