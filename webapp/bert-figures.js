/* Samlefigurer (feedback 10. okt.): series of collectible figures, bought in packs for coins
 * collected on the levels. No real money, odds shown on the pack. Duplicates: three of them
 * can be swapped for a figure you don't have; trading with friends comes with the server. */
(() => {
    'use strict';
    const T = (typeof window !== 'undefined' && window.BertI18n) ? window.BertI18n.T
        : (strings, ...values) => (Array.isArray(strings) ? strings.reduce((out, part, i) => out + part + (i < values.length ? values[i] : ''), '') : String(strings));
    // Rarity per position in a series of 8: 4 common, 2 rare, 1 epic, 1 legendary.
    const RARITY_OF = ['common', 'common', 'common', 'common', 'rare', 'rare', 'epic', 'legendary'];
    const ODDS = Object.freeze({ common: 0.70, rare: 0.22, epic: 0.07, legendary: 0.01 });
    const SERIES = Object.freeze([
        { id: 'desert', name: T('Ørkenen'), icons: ['🐪', '🌵', '🦂', '🏺', '🐍', '🧭', '🦅', '👑'] },
        { id: 'jungle', name: T('Junglen'), icons: ['🐒', '🦜', '🍌', '🐸', '🦥', '🌺', '🐆', '🗿'] },
        { id: 'sky', name: T('Himlen'), icons: ['☁️', '🌈', '🎈', '🪁', '🦋', '☀️', '🦄', '🪐'] },
        { id: 'harbor', name: T('Havnen'), icons: ['🦀', '⚓', '🐟', '🛟', '🚢', '🦭', '🐙', '🧜'] },
        { id: 'night', name: T('Natten'), icons: ['🦉', '🌙', '🏮', '🦇', '🎧', '✨', '🪩', '🌌'] },
        { id: 'volcano', name: T('Vulkanen'), icons: ['🌋', '🦎', '🍍', '🔥', '🪨', '🦖', '💎', '🐉'] },
    ]);
    const FIGURES = Object.freeze(SERIES.flatMap((series) => series.icons.map((icon, i) => Object.freeze({
        id: `${series.id}-${i + 1}`, series: series.id, number: i + 1, icon, rarity: RARITY_OF[i],
        art: `assets/v2/g12/figures/${series.id}-${i + 1}.webp`,
    }))));
    const PACK_COST = 50;
    const PACK_SIZE = 3;
    const KEY = 'bertTheBird_figures_v1';
    function load() {
        try { const d = JSON.parse(localStorage.getItem(KEY) || '{}'); return { coins: Number(d.coins) || 0, coinsEver: Number(d.coinsEver) || 0, owned: d.owned || {}, packs: Number(d.packs) || 0 }; }
        catch (_) { return { coins: 0, coinsEver: 0, owned: {}, packs: 0 }; }
    }
    let data = load();
    function save() { try { localStorage.setItem(KEY, JSON.stringify(data)); } catch (_) { /* full */ } }
    function rollRarity(rand = Math.random) {
        const r = rand();
        let acc = 0;
        for (const [rarity, p] of Object.entries(ODDS)) { acc += p; if (r < acc) return rarity; }
        return 'common';
    }
    function randomOf(list) { return list[Math.floor(Math.random() * list.length)]; }
    function openPack() {
        if (data.coins < PACK_COST) return { ok: false, need: PACK_COST - data.coins };
        data.coins -= PACK_COST;
        data.packs += 1;
        const got = [];
        for (let i = 0; i < PACK_SIZE; i += 1) {
            // The last card of a pack is never common, so every pack has something to look forward to.
            let rarity = rollRarity();
            if (i === PACK_SIZE - 1 && rarity === 'common') rarity = 'rare';
            const figure = randomOf(FIGURES.filter((f) => f.rarity === rarity));
            const isNew = !data.owned[figure.id];
            data.owned[figure.id] = (data.owned[figure.id] || 0) + 1;
            got.push({ ...figure, isNew });
        }
        save();
        return { ok: true, figures: got };
    }
    function duplicates() { return Object.values(data.owned).reduce((n, c) => n + Math.max(0, c - 1), 0); }
    /** Three duplicates (any) → one figure you do not have yet. */
    function swapDuplicates() {
        const missing = FIGURES.filter((f) => !data.owned[f.id]);
        if (duplicates() < 3 || !missing.length) return { ok: false };
        let toRemove = 3;
        for (const id of Object.keys(data.owned)) {
            while (toRemove > 0 && data.owned[id] > 1) { data.owned[id] -= 1; toRemove -= 1; }
        }
        // Rarer figures are rarer here too.
        let pick = null;
        for (let tries = 0; tries < 20 && !pick; tries += 1) {
            const rarity = rollRarity();
            const pool = missing.filter((f) => f.rarity === rarity);
            if (pool.length) pick = randomOf(pool);
        }
        pick ||= randomOf(missing);
        data.owned[pick.id] = 1;
        save();
        return { ok: true, figure: { ...pick, isNew: true } };
    }
    function addCoins(n) { data.coins += n; data.coinsEver += n; save(); return data.coins; }
    window.BertFigures = Object.freeze({
        SERIES, FIGURES, ODDS, PACK_COST, PACK_SIZE,
        status: () => ({ coins: data.coins, coinsEver: data.coinsEver, owned: { ...data.owned }, packs: data.packs,
            count: Object.keys(data.owned).length, total: FIGURES.length, duplicates: duplicates() }),
        addCoins, openPack, swapDuplicates,
        reset() { data = { coins: 0, coinsEver: 0, owned: {}, packs: 0 }; save(); },
    });
})();
