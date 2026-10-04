/* Permanent cosmetic hero achievements. The game and the wardrobe read the same catalog. */
(() => {
    'use strict';
    // Translation hook: Danish text is the key; BertI18n (when loaded) maps it to the chosen language.
    const T = (typeof window !== 'undefined' && window.BertI18n) ? window.BertI18n.T
        : (strings, ...values) => (Array.isArray(strings) ? strings.reduce((out, part, index) => out + part + (index < values.length ? values[index] : ''), '') : String(strings));

    const CATALOG = Object.freeze([
        { id: 'bert', name: 'Bert', price: 0, goal: 'Starthelt', target: 1 },
        // Starter heroes: the player picks one after 10, 20, 30 and 40 flights.
        { id: 'blue', name: 'BlueBert', price: 120, goal: T('Vælg én starthelt efter 10, 20, 30 og 40 ture'), target: 10, starter: true },
        { id: 'block', name: 'BrickBird', price: 180, goal: T('Vælg én starthelt efter 10, 20, 30 og 40 ture'), target: 10, starter: true },
        { id: 'brain', name: 'BrainBird', price: 260, goal: T('Vælg én starthelt efter 10, 20, 30 og 40 ture'), target: 10, starter: true },
        { id: 'eagle', name: 'SkyClaw', price: 280, goal: T('Nå 600 point på én tur'), target: 600 },
        { id: 'mecha', name: 'MechaBert', price: 360, goal: T('Vind ti vennedueller'), target: 10 },
        { id: 'noir', name: 'NoirWing', price: 420, goal: T('Nå 180 point uden at misse en stjerne eller ramme noget'), target: 1 },
        { id: 'vulture', name: 'BoneBeak', price: 300, goal: T('Nå bronze i Jungle uden redning'), target: 1 },
        { id: 'sugar', name: 'SugarRush', price: 220, goal: T('Vælg én starthelt efter 10, 20, 30 og 40 ture'), target: 10, starter: true },
        { id: 'moss', name: 'MossHex', price: 320, goal: T('Nå guld i alle tre Classic-baner'), target: 3 },
        { id: 'ink', name: 'InkBird', price: 240, goal: T('Kun fra et æg i reden'), target: 1, eggOnly: true },
        { id: 'prism', name: 'PrismWing', price: 480, goal: T('Nå bronze i alle ni baner'), target: 9 },
        { id: 'pingo', name: 'Pingo', price: 260, goal: T('Kun fra et æg i reden'), target: 1, eggOnly: true },
        { id: 'mogens', name: T('Mågen Mogens'), price: 280, goal: T('Kun fra et æg i reden'), target: 1, eggOnly: true },
        { id: 'ninja', name: T('Ninja-Bert'), price: 340, goal: T('Kun fra et æg i reden'), target: 1, eggOnly: true },
        { id: 'pakke', name: T('Pakke-Bert'), price: 300, goal: T('Kun fra et æg i reden'), target: 1, eggOnly: true },
        { id: 'gold', name: T('Guld-Bert'), price: 1500, goal: T('Kun fra et æg i reden (sjælden)'), target: 1, eggOnly: true },
        { id: 'eggbert', name: T('Æggebert'), price: 0, goal: T('Klæk alle helte fra rugepladsen'), target: 16 },
        // Epic heroes: only for players with a specific pilot name. The names are
        // stored as hashes, so they are not readable in the public source code.
        { id: 'epicMalthe', name: 'Storm Royale', price: 0, goal: T('Hemmelig helt'), target: 1, secret: true, nameHash: 3598967373 },
        { id: 'epicJohan', name: 'Blok-Johan', price: 0, goal: T('Hemmelig helt'), target: 1, secret: true, nameHash: 667591339 },
        { id: 'epicSos', name: T('Prinsesse Søs'), price: 0, goal: T('Hemmelig helt'), target: 1, secret: true, nameHash: 1846338164 },
        { id: 'epicThor', name: 'Thor Obby', price: 0, goal: T('Hemmelig helt'), target: 1, secret: true, nameHash: 4206434765 },
        { id: 'epicFan', name: T('Fodbold-Bert'), price: 0, goal: T('Hemmelig helt'), target: 1, secret: true, nameHash: 3317535425 },
        { id: 'epicCoop', name: 'Coopinc', price: 0, goal: T('Hemmelig helt'), target: 1, secret: true, nameHash: 3375363772 },
    ]);
    /** FNV-1a over the trimmed, lower-cased, NFC-normalised pilot name. */
    function nameHash(name) {
        const text = String(name || '').trim().normalize('NFC').toLowerCase();
        let hash = 0x811c9dc5;
        for (const character of text) {
            hash ^= character.codePointAt(0);
            hash = Math.imul(hash, 0x01000193) >>> 0;
        }
        return hash >>> 0;
    }

    function secretHeroesForName(name) {
        const hash = nameHash(name);
        return CATALOG.filter((hero) => hero.secret && hero.nameHash === hash).map((hero) => hero.id);
    }

    const BY_ID = Object.freeze(Object.fromEntries(CATALOG.map((hero) => [hero.id, hero])));

    function missionDayStreak(claims) {
        const days = Object.keys(claims || {}).filter((key) => /^\d{4}-\d{2}-\d{2}$/.test(key) &&
            Object.values(claims[key] || {}).some(Boolean)).sort();
        let consecutive = 0;
        let best = 0;
        let previous = null;
        days.forEach((key) => {
            const day = Date.parse(`${key}T12:00:00Z`);
            if (!Number.isFinite(day)) return;
            consecutive = previous != null && day - previous === 86400000 ? consecutive + 1 : 1;
            best = Math.max(best, consecutive);
            previous = day;
        });
        return best;
    }

    function progress(id, data) {
        if (!Object.prototype.hasOwnProperty.call(BY_ID, id)) return null;
        const hero = BY_ID[id];
        const achievements = data.achievements || {};
        const best = achievements.bestScores || {};
        const bronze = achievements.bronzeLevels || {};
        const medal = achievements.medals || {};
        let current = 0;
        switch (id) {
        case 'bert': current = 1; break;
        case 'blue': case 'block': case 'brain': case 'sugar': current = Math.min(10, Number(data.runCount) || 0); break;
        case 'eagle': current = Number(achievements.maxScore) || 0; break;
        case 'mecha': current = Number(data.duels?.wins) || 0; break;
        case 'noir': current = achievements.clean180 ? 1 : 0; break;
        case 'vulture': current = achievements.cleanJungle ? 1 : 0; break;
        case 'moss': current = [1, 4, 5].filter((level) => (Number(best[level]) || 0) >= 100).length; break;
        case 'ink': current = 0; break;
        case 'prism': current = Array.from({ length: 9 }, (_, index) => index + 1).filter((level) => bronze[level]).length; break;
        default: break;
        }
        // Starters are chosen, egg-only heroes hatch: neither unlocks by itself.
        const automatic = !hero.starter && !hero.eggOnly;
        return { ...hero, current: Math.min(hero.target, current), complete: automatic && current >= hero.target };
    }

    const STARTERS = Object.freeze(CATALOG.filter((hero) => hero.starter).map((hero) => hero.id));
    window.BertHeroStore = Object.freeze({ catalog: CATALOG, byId: BY_ID, progress, missionDayStreak, nameHash, secretHeroesForName, STARTERS });
})();
