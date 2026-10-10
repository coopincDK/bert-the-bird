/* Local-first progression and score history for Bert The Bird. */
(() => {
    'use strict';
    // Translation hook: Danish text is the key; BertI18n (when loaded) maps it to the chosen language.
    const T = (typeof window !== 'undefined' && window.BertI18n) ? window.BertI18n.T
        : (strings, ...values) => (Array.isArray(strings) ? strings.reduce((out, part, index) => out + part + (index < values.length ? values[index] : ''), '') : String(strings));

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
        nest: { rescueLives: 0, level: 0 },
        calendar: { lastDay: '', streak: 0, days: [] },
        badges: {},
        stats: { deaths: 0, feathersEver: 0, bestPoopStreak: 0, relayPerfect: 0 },
        eggs: { bought: 0, incubating: null, hatched: [] },
        challengeClaims: {},
        counters: { causes: {}, heroesFlown: {}, levelRuns: {} },
        economy: { continueSpins: 0, revivesWon: 0, feathersSpent: 0 },
        settings: { music: true, sfx: true, haptics: true, lights: true, musicVolume: 0.7, sfxVolume: 0.7 },
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
                calendar: { ...DEFAULTS.calendar, ...(stored.calendar || {}) },
                badges: stored.badges && typeof stored.badges === 'object' ? stored.badges : {},
                stats: { ...DEFAULTS.stats, ...(stored.stats || {}) },
                eggs: { ...DEFAULTS.eggs, ...(stored.eggs || {}) },
                challengeClaims: stored.challengeClaims && typeof stored.challengeClaims === 'object' ? stored.challengeClaims : {},
                counters: { causes: {}, heroesFlown: {}, levelRuns: {}, ...(stored.counters || {}) },
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
    function settingValue(name) { return data.settings[name]; }
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
            owned: Boolean(data.ownedHeroes[hero.id]) || hasTestAccess(),
            source: data.ownedHeroes[hero.id]?.source || (hasTestAccess() ? 'test' : null),
            balance: data.feathers,
        }));
    }

    function setHero(hero) {
        if (!Object.prototype.hasOwnProperty.call(window.BertHeroStore.byId, hero)) hero = 'bert';
        if (!Object.prototype.hasOwnProperty.call(data.ownedHeroes, hero) && !hasTestAccess()) return snapshot();
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
        if (!hasTestAccess() && !data.ownedHeroes[data.hero]) data.hero = 'bert';
        // A newly matched epic hero is equipped right away, as a surprise.
        if (granted.length) data.hero = granted[0];
        return save();
    }

    /** 'Pilot' was the old placeholder; it never counts as a chosen name. */
    /** The pilot name "test" opens every level and every hero, for trying things out. */
    // "(OP)" anywhere in the pilot name: an everlasting shield for play-testing.
    // Runs in OP mode never count for records, leaderboards or missions.
    function hasOpMode() {
        return /\(op\)/i.test(String(data.player.name || ''));
    }

    function hasTestAccess() {
        return String(data.player.name || '').trim().toLowerCase() === 'test';
    }

    function hasPlayerName() {
        const name = String(data.player.name || '').trim();
        return name.length > 0 && name.toLowerCase() !== 'pilot';
    }

    function setSetting(name, enabled) {
        if (!Object.prototype.hasOwnProperty.call(DEFAULTS.settings, name)) return snapshot();
        // Volumes are numbers 0..1; everything else is on/off.
        data.settings[name] = /Volume$/.test(name) ? Math.max(0, Math.min(1, Number(enabled) || 0)) : Boolean(enabled);
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
        const routeNames = ['Stjerneregn', T('Præcisionsflyvning'), T('Høj fart'), 'Langtur', T('Mod vinden')];
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
            powerups: Math.max(0, Math.floor(Number(run.powerups) || 0)),
            feathers: Math.max(0, Math.floor(Number(run.feathers) || 0)),
            maxNoStar: Math.max(0, Number(run.maxNoStar) || 0),
            cause: String(run.cause || ''),
            hero: String(run.hero || data.hero || 'bert'),
            improved: run.improved === true,
            diedBig: run.diedBig === true,
        };
        data.totalStars += stars;
        data.runCount += 1;
        data.counters.levelRuns[normalized.levelId] = (data.counters.levelRuns[normalized.levelId] || 0) + 1;
        data.counters.heroesFlown[normalized.hero] = true;
        if (normalized.cause) data.counters.causes[normalized.cause] = (data.counters.causes[normalized.cause] || 0) + 1;
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

    let lastOpenLevels = [1];
    function missions(date = new Date(), openLevels = lastOpenLevels) {
        lastOpenLevels = openLevels && openLevels.length ? openLevels : lastOpenLevels;
        const key = dayKey(date);
        const runs = data.runs.filter((run) => String(run.createdAt).slice(0, 10) === key);
        const claimed = data.missionClaims[key] || {};
        const dailyRouteComplete = Boolean(data.daily[key]);
        const picked = pickThree(dailyPool(lastOpenLevels.filter((id) => id < 20 || data.achievements.bestScores[id] != null)), key);
        return [
            ...picked.map((entry) => {
                const value = entry.value(runs);
                return { id: entry.id, label: entry.label, value: Math.min(value, entry.target), target: entry.target, reward: DIFF_REWARD[entry.diff],
                    difficulty: entry.diff, complete: value >= entry.target, claimed: Boolean(claimed[entry.id]) };
            }),
            { id: 'route', label: T('Klar dagens rute'), value: dailyRouteComplete ? 1 : 0, target: 1, reward: 10, complete: dailyRouteComplete, claimed: Boolean(claimed.route) },
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
        if (value) { data.feathers += value; data.stats.feathersEver = (data.stats.feathersEver || 0) + value; }
        return save();
    }

    // ---------- Reden: the nest ladder, the login calendar and the badges ----------
    // Bert builds his nest with feathers. Each step is felt in the game; see nestPerks().
    const NEST_STEPS = Object.freeze([
        { id: 'soft', cost: 0, label: T('Blød rede'), text: T('Et sted at lande. Fjer bygger den videre.'), icon: 'nest-1' },
        { id: 'rescue', cost: 20, label: T('Redningsfjer'), text: T('Ét redningsliv på hver tur.'), icon: 'upgrade-rescue' },
        { id: 'magnet', cost: 35, label: T('Stærkere magnet'), text: T('Magneten trækker 30 % længere.'), icon: 'upgrade-magnet' },
        { id: 'shield', cost: 50, label: T('Varmt skjold'), text: T('Skjoldet holder 2 sekunder længere.'), icon: 'upgrade-shield' },
        { id: 'boost', cost: 70, label: T('Hurtig start'), text: T('Usårlig med ekstra fart de første 5 sekunder.'), icon: 'upgrade-boost' },
        { id: 'lives', cost: 100, label: T('To redningsliv'), text: T('To redningsliv på hver tur.'), icon: 'upgrade-lives' },
        { id: 'gold', cost: 150, label: T('Guldrede'), text: T('Stjerner giver +1 point de første 10 sekunder.'), icon: 'upgrade-gold' },
    ]);
    function nestLevel() {
        // Players who already bought rescue lives before the nest existed keep what they paid for.
        const stored = Math.max(0, Math.min(NEST_STEPS.length - 1, Math.floor(Number(data.nest.level) || 0)));
        const legacy = data.nest.rescueLives >= 2 ? 5 : data.nest.rescueLives >= 1 ? 1 : 0;
        return Math.max(stored, legacy);
    }
    function nestStatus() {
        const level = nestLevel();
        const next = NEST_STEPS[level + 1] || null;
        return {
            level, steps: NEST_STEPS, next,
            canBuild: Boolean(next) && data.feathers >= next.cost,
            feathers: data.feathers,
            missing: next ? Math.max(0, next.cost - data.feathers) : 0,
        };
    }
    function buildNest() {
        const status = nestStatus();
        if (!status.next || !status.canBuild) return { ok: false, status };
        data.feathers -= status.next.cost;
        data.economy.feathersSpent += status.next.cost;
        data.nest.level = status.level + 1;
        if (status.next.id === 'rescue') data.nest.rescueLives = Math.max(data.nest.rescueLives, 1);
        if (status.next.id === 'lives') data.nest.rescueLives = Math.max(data.nest.rescueLives, 2);
        save();
        return { ok: true, step: status.next, status: nestStatus() };
    }
    function nestPerks() {
        const level = nestLevel();
        const has = (id) => NEST_STEPS.findIndex((step) => step.id === id) <= level;
        return { magnet: has('magnet'), shield: has('shield'), boost: has('boost'), gold: has('gold') };
    }

    // ---------- Rugepladsen: eggs hatch new heroes ----------
    // Opens at nest step 4 (one egg, slow), improves at step 7 (faster, two eggs is a later idea).
    const EGG_TIERS = Object.freeze({
        common: ['moss', 'ink', 'pingo', 'mogens', 'ninja', 'pakke'],
        rare: ['eagle', 'mecha', 'noir', 'vulture', 'prism', 'gold'],
    });
    const EGG_BASE_PRICE = 40;
    const EGG_PRICE_STEP = 20;
    function eggCandidates() {
        const owned = data.ownedHeroes || {};
        return {
            common: EGG_TIERS.common.filter((id) => !owned[id]),
            rare: EGG_TIERS.rare.filter((id) => !owned[id]),
        };
    }
    function eggStatus() {
        const level = nestLevel();
        const open = level >= 3;
        const candidates = eggCandidates();
        const remaining = candidates.common.length + candidates.rare.length;
        const price = EGG_BASE_PRICE + EGG_PRICE_STEP * (data.eggs.bought || 0);
        const egg = data.eggs.incubating;
        return {
            open, level, price, securedPrice: price * 2, rareSecuredPrice: price * 3,
            remaining, candidates,
            incubating: egg ? { ...egg, stage: Math.min(3, Math.floor((egg.progress / egg.need) * 3)) } : null,
            canBuy: open && !egg && remaining > 0 && data.feathers >= price,
            need: level >= 6 ? 180 : 300,
        };
    }
    /** Buy an egg. heroId picks a secured egg (2× price, 3× for rare); null is a random egg. */
    function buyEgg(heroId = null) {
        const status = eggStatus();
        if (!status.open || status.incubating || !status.remaining) return { ok: false, status };
        let hero = null;
        let cost = status.price;
        if (heroId) {
            const rare = status.candidates.rare.includes(heroId);
            if (!rare && !status.candidates.common.includes(heroId)) return { ok: false, status };
            hero = heroId;
            cost = rare ? status.rareSecuredPrice : status.securedPrice;
        } else {
            const pickRare = status.candidates.rare.length && (!status.candidates.common.length || Math.random() < 0.18);
            const pool = pickRare ? status.candidates.rare : status.candidates.common;
            hero = pool[Math.floor(Math.random() * pool.length)];
        }
        if (data.feathers < cost) return { ok: false, status, missing: cost - data.feathers };
        data.feathers -= cost;
        data.economy.feathersSpent += cost;
        data.eggs.bought = (data.eggs.bought || 0) + 1;
        data.eggs.incubating = { hero, secured: Boolean(heroId), progress: 0, need: status.need, at: new Date().toISOString() };
        save();
        return { ok: true, cost, secured: Boolean(heroId), status: eggStatus() };
    }
    // Starter heroes: one choice after 10, 20, 30 and 40 flights.
    function starterChoice() {
        const store = window.BertHeroStore;
        const remaining = store.STARTERS.filter((id) => !data.ownedHeroes[id]);
        const earned = Math.min(store.STARTERS.length, Math.floor((Number(data.runCount) || 0) / 10));
        const taken = store.STARTERS.length - remaining.length;
        const pending = Math.max(0, earned - taken);
        return { pending, remaining, nextAt: (taken + 1) * 10, runCount: data.runCount };
    }
    function chooseStarter(heroId) {
        const choice = starterChoice();
        if (!choice.pending || !choice.remaining.includes(heroId)) return { ok: false, choice };
        data.ownedHeroes[heroId] = { source: 'choice', at: new Date().toISOString() };
        data.hero = heroId;
        save();
        return { ok: true, hero: heroId, choice: starterChoice() };
    }

    /** An egg found out on a level: free and random. */
    function grantFoundEgg() {
        const status = eggStatus();
        if (!status.open || status.incubating || !status.remaining) return { ok: false };
        const pickRare = status.candidates.rare.length && (!status.candidates.common.length || Math.random() < 0.18);
        const pool = pickRare ? status.candidates.rare : status.candidates.common;
        const hero = pool[Math.floor(Math.random() * pool.length)];
        data.eggs.incubating = { hero, secured: false, progress: 0, need: status.need, at: new Date().toISOString(), found: true };
        save();
        return { ok: true, hero };
    }

    /** After a run: stars warm the egg. Returns the hatched hero id when it cracks open. */
    function incubate(stars) {
        const egg = data.eggs.incubating;
        if (!egg) return null;
        egg.progress = Math.min(egg.need, egg.progress + Math.max(1, Math.floor(Number(stars) || 0)));
        if (egg.progress < egg.need) { save(); return null; }
        const hero = egg.hero;
        if (!data.ownedHeroes[hero]) data.ownedHeroes[hero] = { source: 'egg', at: new Date().toISOString() };
        data.eggs.hatched = [...(data.eggs.hatched || []), hero];
        data.eggs.incubating = null;
        // Æggebert: the reward for hatching every hero the nest can give.
        const left = eggCandidates();
        if (!left.common.length && !left.rare.length && !data.ownedHeroes.eggbert) {
            data.ownedHeroes.eggbert = { source: 'egg', at: new Date().toISOString() };
        }
        save();
        return hero;
    }

    // ---------- Udfordringer (feedback 10. okt.): many more, and harder ----------
    // Daily: 3 a day from a pool of ~55 (one easy, one medium, one hard) + the daily route.
    // Weekly: 3 a week. Milestones (42), mastery per level (45) and hidden ones (15) live
    // in the nest. Everything is judged from the run log, so nothing needs a server.
    function seeded(seed) { let x = seed % 2147483647 || 1; return () => (x = (x * 48271) % 2147483647) / 2147483647; }
    function keySeed(key) { return [...key].reduce((sum, ch) => (sum * 31 + ch.charCodeAt(0)) % 2147483647, 7); }
    const LEVEL_NAMES = { 1: 'Desert', 2: 'Tunnel', 3: 'Flappy Bert', 4: 'Jungle', 5: 'Happy Sky', 6: 'Sky Shift', 7: 'Flappy 3', 8: 'Tunnel 2', 9: 'Tunnel 3',
        20: T('Isbjerget'), 21: T('Havnen'), 22: T('Nattebyen'), 23: T('Vulkanen'), 24: T('Vindmøller'), 25: 'Fugleklat' };
    function runsSince(start) { return data.runs.filter((run) => new Date(run.createdAt).getTime() >= start); }
    function sum(runs, field) { return runs.reduce((total, run) => total + (Number(run[field]) || 0), 0); }
    function best(runs, field) { return runs.reduce((top, run) => Math.max(top, Number(run[field]) || 0), 0); }
    const DIFF_REWARD = { easy: 6, medium: 10, hard: 18 };
    function dailyPool(openLevels) {
        const pool = [];
        const add = (id, diff, label, target, value) => pool.push({ id, diff, label, target, value });
        [[20, 'easy'], [45, 'medium'], [90, 'hard']].forEach(([n, d]) => add(`stars${n}`, d, T`Saml ${n} stjerner i dag`, n, (r) => sum(r, 'stars')));
        [[120, 'easy'], [300, 'medium'], [600, 'hard']].forEach(([n, d]) => add(`time${n}`, d, T`Flyv ${Math.round(n / 60)} minutter i alt i dag`, n, (r) => Math.floor(sum(r, 'time'))));
        [[8, 'easy'], [15, 'medium'], [25, 'hard']].forEach(([n, d]) => add(`streak${n}`, d, T`Nå en streak på ${n}`, n, (r) => best(r, 'streak')));
        [[3, 'easy'], [7, 'medium'], [15, 'hard']].forEach(([n, d]) => add(`runs${n}`, d, T`Flyv ${n} ture i dag`, n, (r) => r.length));
        [[40, 'easy'], [120, 'medium'], [300, 'hard']].forEach(([n, d]) => add(`score${n}`, d, T`Få ${n} point på én tur`, n, (r) => best(r, 'score')));
        [[2, 'easy'], [5, 'medium'], [10, 'hard']].forEach(([n, d]) => add(`pu${n}`, d, T`Tag ${n} power-ups i dag`, n, (r) => sum(r, 'powerups')));
        [[45, 'easy'], [90, 'medium'], [180, 'hard']].forEach(([n, d]) => add(`long${n}`, d, T`Flyv ${n} sekunder på én tur`, n, (r) => Math.floor(best(r, 'time'))));
        add('clean40', 'medium', T('Få 40 point uden redningsliv'), 40, (r) => best(r.filter((x) => !x.rescueUsed), 'score'));
        add('clean80', 'hard', T('Få 80 point uden redningsliv'), 80, (r) => best(r.filter((x) => !x.rescueUsed), 'score'));
        add('feather1', 'medium', T('Find en gylden fjer i en bane'), 1, (r) => sum(r, 'feathers'));
        add('nopower60', 'hard', T('Få 60 point uden at tage en power-up'), 60, (r) => best(r.filter((x) => !x.powerups), 'score'));
        openLevels.forEach((levelId) => {
            const name = LEVEL_NAMES[levelId] || `#${levelId}`;
            add(`lvl${levelId}b`, 'easy', T`Bronze i ${name} i dag`, 20, (r) => best(r.filter((x) => x.levelId === levelId), 'score'));
            add(`lvl${levelId}s`, 'medium', T`Sølv i ${name} i dag`, 50, (r) => best(r.filter((x) => x.levelId === levelId), 'score'));
            add(`lvl${levelId}g`, 'hard', T`Guld i ${name} i dag`, 100, (r) => best(r.filter((x) => x.levelId === levelId), 'score'));
        });
        return pool;
    }
    function pickThree(pool, key) {
        const rand = seeded(keySeed(key));
        return ['easy', 'medium', 'hard'].map((diff) => {
            const options = pool.filter((entry) => entry.diff === diff);
            return options[Math.floor(rand() * options.length)];
        }).filter(Boolean);
    }
    function weeklyChallenges(openLevels = [1], now = new Date()) {
        const start = new Date(now); start.setDate(start.getDate() - ((start.getDay() + 6) % 7)); start.setHours(0, 0, 0, 0);
        const weekKey = `w${dayKey(start)}`;
        const runs = runsSince(start.getTime());
        const golds = openLevels.filter((id) => best(runs.filter((r) => r.levelId === id), 'score') >= 100).length;
        const levelsPlayed = new Set(runs.map((r) => r.levelId)).size;
        const pool = [
            { id: 'wstars', label: T('Saml 400 stjerner i denne uge'), target: 400, value: sum(runs, 'stars') },
            { id: 'wruns', label: T('Flyv 30 ture i denne uge'), target: 30, value: runs.length },
            { id: 'wgold', label: T('Guld på 2 forskellige baner i denne uge'), target: 2, value: golds },
            { id: 'wrecord', label: T('Slå din egen rekord 3 gange'), target: 3, value: runs.filter((r) => r.improved).length },
            { id: 'wlevels', label: T('Flyv på 6 forskellige baner'), target: 6, value: levelsPlayed },
            { id: 'wtime', label: T('Flyv 30 minutter i denne uge'), target: 1800, value: Math.floor(sum(runs, 'time')) },
        ];
        const rand = seeded(keySeed(weekKey));
        const chosen = pool.slice().sort(() => rand() - 0.5).slice(0, 3);
        const claims = data.challengeClaims[weekKey] || {};
        return chosen.map((entry, index) => ({ ...entry, key: weekKey, reward: [30, 40, 50][index],
            value: Math.min(entry.value, entry.target), complete: entry.value >= entry.target, claimed: Boolean(claims[entry.id]) }));
    }
    function claimWeekly(id, openLevels) {
        const entry = weeklyChallenges(openLevels).find((item) => item.id === id);
        if (!entry || !entry.complete || entry.claimed) return { ok: false };
        data.challengeClaims[entry.key] ||= {};
        data.challengeClaims[entry.key][id] = Date.now();
        data.feathers += entry.reward;
        data.stats.feathersEver = (data.stats.feathersEver || 0) + entry.reward;
        save();
        return { ok: true, reward: entry.reward };
    }
    const MILESTONES = [
        ...[10, 25, 50, 100, 250, 500, 1000, 2500].map((n) => ({ id: `m-runs-${n}`, label: T`Tur nr. ${n}`, target: n, read: () => data.runCount })),
        ...[100, 500, 1000, 5000, 10000, 25000, 50000, 100000].map((n) => ({ id: `m-stars-${n}`, label: T`${n.toLocaleString('da-DK')} stjerner i alt`, target: n, read: () => data.totalStars })),
        ...[3, 7, 14, 30, 60, 100].map((n) => ({ id: `m-days-${n}`, label: T`${n} dage i træk`, target: n, read: () => data.calendar.best || data.calendar.streak || 0 })),
        ...[50, 200, 500, 1000].map((n) => ({ id: `m-feathers-${n}`, label: T`${n} fjer samlet i alt`, target: n, read: () => data.stats.feathersEver || 0 })),
        ...[3, 5, 10, 15, 20].map((n) => ({ id: `m-heroes-${n}`, label: T`${n} helte`, target: n, read: () => Object.keys(data.ownedHeroes || {}).length })),
        ...[5, 10, 20, 30].map((n) => ({ id: `m-badges-${n}`, label: T`${n} mærker`, target: n, read: () => Object.keys(data.badges || {}).length })),
        ...[3, 5, 7].map((n) => ({ id: `m-nest-${n}`, label: T`Reden på trin ${n}`, target: n, read: () => nestLevel() + 1 })),
        ...[1, 5, 10, 16].map((n) => ({ id: `m-eggs-${n}`, label: T`${n} æg klækket`, target: n, read: () => (data.eggs.hatched || []).length })),
    ];
    const MASTERY_LEVELS = [1, 4, 5, 3, 6, 7, 2, 8, 9, 21, 22, 24, 23, 20, 25];
    const MASTERY = MASTERY_LEVELS.flatMap((levelId) => {
        const name = LEVEL_NAMES[levelId] || `#${levelId}`;
        const runsOn = () => data.runs.filter((r) => r.levelId === levelId);
        return [
            { id: `x-${levelId}-gold`, levelId, label: T`${name}: guld`, target: 100, read: () => Math.max(Number(data.achievements.bestScores[levelId]) || 0) },
            { id: `x-${levelId}-200`, levelId, label: T`${name}: 200 point`, target: 200, read: () => Math.max(Number(data.achievements.bestScores[levelId]) || 0) },
            { id: `x-${levelId}-pure`, levelId, label: T`${name}: 60 point uden redning og power-ups`, target: 60, read: () => best(runsOn().filter((r) => !r.rescueUsed && !r.powerups), 'score') },
        ];
    });
    const HIDDEN = [
        { id: 'h-speedrun', label: T('Lynhurtig: styrt inden for 1 sekund'), test: (r) => r.some((x) => x.time > 0 && x.time < 1) },
        { id: 'h-42', label: T('Svaret på alt: præcis 42 point'), test: (r) => r.some((x) => x.score === 42) },
        { id: 'h-night', label: T('Natteravn: flyv mellem midnat og kl. 4'), test: (r) => r.some((x) => new Date(x.createdAt).getHours() < 4) },
        { id: 'h-patient', label: T('Tålmodig: 60 sekunder uden en eneste stjerne'), test: (r) => r.some((x) => x.maxNoStar >= 60) },
        { id: 'h-hunger', label: T('Sultestrejke: 30 sekunder og 0 stjerner'), test: (r) => r.some((x) => x.time >= 30 && x.stars === 0) },
        { id: 'h-bigfall', label: T('Jo større de er: styrt mens du er forstørret'), test: (r) => r.some((x) => x.diedBig) },
        { id: 'h-xmas', label: T('Juleflyver: flyv juleaften'), test: (r) => r.some((x) => String(x.createdAt).slice(5, 10) === '12-24') },
        { id: 'h-hattrick', label: T('Hattrick: tre ture i træk med samme point'), test: (r) => r.some((x, i) => i >= 2 && x.score > 0 && x.score === r[i - 1].score && x.score === r[i - 2].score) },
        { id: 'h-wardrobe', label: T('Garderobe-gal: flyv med 7 forskellige helte'), test: () => Object.keys(data.counters.heroesFlown || {}).length >= 7 },
        { id: 'h-marathon', label: T('Maraton: 10 minutter på én tur'), test: (r) => r.some((x) => x.time >= 600) },
        { id: 'h-desert', label: T('Ørkenrotte: 100 ture i Desert'), test: () => (data.counters.levelRuns[1] || 0) >= 100 },
        { id: 'h-fifty', label: T('Halvtreds: en streak på 50'), test: (r) => r.some((x) => x.streak >= 50) },
        { id: 'h-flappy500', label: T('Flappy-mester: 500 point i Flappy Bert'), test: (r) => r.some((x) => x.levelId === 3 && x.score >= 500) },
        { id: 'h-bonk', label: T('Bonk-serie: 5 styrt på 2 minutter'), test: (r) => r.length >= 5 && (new Date(r[0].createdAt) - new Date(r[4].createdAt)) < 120000 && r.slice(0, 5).every((x) => x.time < 20) },
        { id: 'h-spiderfriend', label: T('Edderkoppens ven: fanget 10 gange'), test: () => (data.counters.causes['jungle-spider'] || 0) >= 10 },
    ];
    function challengeBook() {
        const claims = data.challengeClaims.book || {};
        const row = (entry, kind, reward) => {
            const value = entry.read ? entry.read() : (entry.test(data.runs) ? 1 : 0);
            const target = entry.read ? entry.target : 1;
            return { id: entry.id, kind, label: entry.label, value: Math.min(value, target), target, complete: value >= target,
                claimed: Boolean(claims[entry.id]), reward, hidden: kind === 'hidden' };
        };
        return {
            milestones: MILESTONES.map((entry, index) => row(entry, 'milestone', 10 + Math.floor(index % 8) * 5)),
            mastery: MASTERY.map((entry) => row(entry, 'mastery', entry.id.endsWith('pure') ? 25 : entry.id.endsWith('200') ? 20 : 12)),
            hidden: HIDDEN.map((entry) => row(entry, 'hidden', 25)),
        };
    }
    function claimBook(id) {
        const book = challengeBook();
        const entry = [...book.milestones, ...book.mastery, ...book.hidden].find((item) => item.id === id);
        if (!entry || !entry.complete || entry.claimed) return { ok: false };
        data.challengeClaims.book ||= {};
        data.challengeClaims.book[id] = Date.now();
        data.feathers += entry.reward;
        data.stats.feathersEver = (data.stats.feathersEver || 0) + entry.reward;
        save();
        return { ok: true, reward: entry.reward, label: entry.label };
    }
    /** The challenge closest to done (>= 70 %), for the "almost there" line after a run. */
    function nearestChallenge(openLevels = [1]) {
        const book = challengeBook();
        const candidates = [...missions(new Date(), openLevels), ...weeklyChallenges(openLevels), ...book.milestones, ...book.mastery]
            .filter((entry) => !entry.complete && entry.target > 0 && entry.value / entry.target >= 0.7);
        candidates.sort((a, b) => (b.value / b.target) - (a.value / a.target));
        return candidates[0] || null;
    }

    // Login calendar: one flight a day keeps the streak; rewards 1, 2, 3, 5, 8, 8, 8 feathers.
    const CALENDAR_REWARDS = Object.freeze([1, 2, 3, 5, 8, 8, 8]);
    function dayKey(date = new Date()) { return date.toISOString().slice(0, 10); }
    function noteDailyFlight(date = new Date()) {
        const today = dayKey(date);
        if (data.calendar.lastDay === today) return { ok: false, streak: data.calendar.streak, reward: 0 };
        const yesterday = dayKey(new Date(date.getTime() - 86400000));
        data.calendar.streak = data.calendar.lastDay === yesterday ? data.calendar.streak + 1 : 1;
        data.calendar.best = Math.max(data.calendar.best || 0, data.calendar.streak);
        data.calendar.lastDay = today;
        data.calendar.days = [...(data.calendar.days || []), today].slice(-7);
        const reward = CALENDAR_REWARDS[Math.min(CALENDAR_REWARDS.length, data.calendar.streak) - 1];
        data.feathers += reward;
        data.stats.feathersEver = (data.stats.feathersEver || 0) + reward;
        save();
        return { ok: true, streak: data.calendar.streak, reward, weekDone: data.calendar.streak % 7 === 0 };
    }
    function calendarStatus() {
        const today = dayKey();
        const streak = data.calendar.lastDay === today || data.calendar.lastDay === dayKey(new Date(Date.now() - 86400000)) ? data.calendar.streak : 0;
        return { streak, today: data.calendar.lastDay === today, rewards: CALENDAR_REWARDS, daysThisWeek: streak % 7 === 0 && streak > 0 ? 7 : streak % 7 };
    }

    // Badges: 30 achievements, all judged from things the game already counts.
    const BADGES = Object.freeze([
        ['first-flight', T('Første flyvetur'), T('Gennemfør din første tur')],
        ['first-star', T('Første stjerne'), T('Saml din første stjerne')],
        ['first-feather', T('Første fjer'), T('Find din første gyldne fjer')],
        ['first-bronze', 'Bronze', T('Vind din første bronzemedalje')],
        ['first-hero', T('Ny ven'), T('Lås din første ekstra helt op')],
        ['silver-medal', T('Sølv'), T('Vind sølv på en bane')],
        ['gold-medal', T('Guld'), T('Vind guld på en bane')],
        ['streak-10', T('I flow'), T('Nå en streak på 10')],
        ['streak-25', T('Ustoppelig'), T('Nå en streak på 25')],
        ['stars-100-run', T('Stjerneregn'), T('Saml 100 stjerner på én tur')],
        ['score-500', T('Højtflyver'), T('Få 500 point på én tur')],
        ['long-flight', T('Udholdenhed'), T('Flyv 3 minutter på én tur')],
        ['clean-run', T('Fejlfri'), T('Guld uden redningsliv eller redningsspin')],
        ['classic-all', T('Klassiker'), T('Bronze på alle Classic-baner')],
        ['flappy-all', T('Skorstensfejer'), T('Bronze på alle Flappy-baner')],
        ['tunnel-all', T('Tunnelrytter'), T('Bronze på alle Tunnel-baner')],
        ['adventure-open', T('Eventyrer'), T('Lås Eventyr op')],
        ['adventure-all', T('Verdensflyver'), T('Sølv på alle seks eventyrbaner')],
        ['volcano-master', T('Lavalord'), T('Guld på Vulkanen')],
        ['poop-master', T('Mesterskytte'), T('10 træffere i træk i Fugleklat')],
        ['crowd-wave', T('Publikumsvølge'), T('Kom forbi tre bolde i én koncertbølge')],
        ['predator-dodge', T('Fri af rovfuglen'), T('Undvig den varslede rovfugl')],
        ['storm-pilot', 'Stormpilot', T('Undvig en flyvende genstand i storm')],
        ['relay-all', T('Portløber'), T('Klar alle tre porte i én Sky Relay-runde')],
        ['dj-encore', T('Ekstranummer'), T('Sølv i Neon Encore')],
        ['caught-spider', T('Pakket ind'), T('Bliv fanget af edderkoppen')],
        ['caught-snake', T('Snack'), T('Bliv fanget af slangen')],
        ['roast', T('Grillkylling'), T('Dø 50 gange i alt')],
        ['heroes-10', T('Flokken'), T('Lås 10 helte op')],
        ['feathers-100', T('Redebygger'), T('Saml 100 fjer i alt')],
    ]);
    function badgeList() {
        return BADGES.map(([id, label, text]) => ({ id, label, text, earned: Boolean(data.badges[id]) }));
    }
    /** Called after every run with what happened; returns newly earned badges. */
    function awardBadges(ctx) {
        const best = (ids, min) => ids.every((id) => (Number(ctx.records?.[id]) || 0) >= min);
        const anyBest = (min) => Object.values(ctx.records || {}).some((score) => Number(score) >= min);
        const owned = Object.keys(data.ownedHeroes || {}).length;
        if (ctx.deathCause && ctx.deathCause !== 'world') data.stats.deaths = (data.stats.deaths || 0) + 1;
        if (ctx.levelId === 25) data.stats.bestPoopStreak = Math.max(data.stats.bestPoopStreak || 0, ctx.streak || 0);
        if (ctx.relayGatesHit >= 3) data.stats.relayPerfect = (data.stats.relayPerfect || 0) + 1;
        const checks = {
            'first-flight': data.runCount >= 1 || ctx.time > 0,
            'first-star': data.totalStars >= 1 || ctx.stars >= 1,
            'first-feather': (data.stats.feathersEver || 0) >= 1,
            'first-bronze': anyBest(20) || ctx.score >= 20,
            'first-hero': owned >= 2,
            'silver-medal': anyBest(50) || ctx.score >= 50,
            'gold-medal': anyBest(100) || ctx.score >= 100,
            'streak-10': ctx.streak >= 10,
            'streak-25': ctx.streak >= 25,
            'stars-100-run': ctx.stars >= 100,
            'score-500': ctx.score >= 500,
            'long-flight': ctx.time >= 180,
            'clean-run': ctx.score >= 100 && !ctx.rescueUsed && !ctx.spinUsed,
            'classic-all': best([1, 4, 5], 20),
            'flappy-all': best([3, 6, 7], 20),
            'tunnel-all': best([2, 8, 9], 20),
            'adventure-open': best([1, 2, 3, 4, 5, 6, 7, 8, 9], 20),
            'adventure-all': best([20, 21, 22, 23, 24, 25], 50),
            'volcano-master': (Number(ctx.records?.[23]) || 0) >= 100,
            'poop-master': (data.stats.bestPoopStreak || 0) >= 10,
            'crowd-wave': Boolean(ctx.worldBadges?.[10]),
            'predator-dodge': Boolean(ctx.worldBadges?.[11]),
            'storm-pilot': Boolean(ctx.worldBadges?.[12]),
            'relay-all': (data.stats.relayPerfect || 0) >= 1,
            'dj-encore': (Number(ctx.records?.[10]) || 0) >= 50,
            'caught-spider': ctx.deathCause === 'jungle-spider',
            'caught-snake': ctx.deathCause === 'jungle-snake',
            'roast': (data.stats.deaths || 0) >= 50,
            'heroes-10': owned >= 10,
            'feathers-100': (data.stats.feathersEver || 0) >= 100,
        };
        const earned = [];
        BADGES.forEach(([id]) => {
            if (!data.badges[id] && checks[id]) { data.badges[id] = new Date().toISOString(); earned.push(id); }
        });
        save();
        return earned;
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
        if (value >= 100) return { id: 'gold', label: T('GULD'), next: null };
        if (value >= 50) return { id: 'silver', label: T('SØLV'), next: 100 };
        if (value >= 20) return { id: 'bronze', label: 'BRONZE', next: 50 };
        return { id: 'flight', label: T('FLYV IGEN'), next: 20 };
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
        addFeathers, hasPlayerName, hasTestAccess, hasOpMode, settingValue,
        NEST_STEPS, nestLevel, nestStatus, buildNest, nestPerks, noteDailyFlight, calendarStatus, badgeList, awardBadges,
        EGG_TIERS, eggStatus, buyEgg, incubate, grantFoundEgg, starterChoice, chooseStarter,
        weeklyChallenges, claimWeekly, challengeBook, claimBook, nearestChallenge,
        resetAll() { try { localStorage.clear(); } catch (_) { /* ignore */ } },
        snapshot, currentHero, settingEnabled, heroCatalog, setHero, buyHero, noteCleanScore, setPlayerName, setSetting, dailyChallenge, recordRun,
        localLeaderboard, missions, claimMission, missionClaimCount, rescueUpgrade, buyRescueLife,
        continueSpinOffer, buyContinueSpin, settleContinueSpin,
        recordDuel, nextQuickLevel, progressionState, medalForScore, haptic,
    });
})();
