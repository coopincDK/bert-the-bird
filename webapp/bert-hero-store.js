/* Permanent cosmetic hero achievements. The game and the wardrobe read the same catalog. */
(() => {
    'use strict';

    const CATALOG = Object.freeze([
        { id: 'bert', name: 'Bert', price: 0, goal: 'Starthelt', target: 1 },
        { id: 'blue', name: 'BlueBert', price: 120, goal: 'Klar dagens rute én gang', target: 1 },
        { id: 'block', name: 'BrickBird', price: 180, goal: 'Nå 120 point i Desert', target: 120 },
        { id: 'brain', name: 'BrainBird', price: 260, goal: 'Hent en mission syv dage i træk', target: 7 },
        { id: 'eagle', name: 'SkyClaw', price: 280, goal: 'Nå 300 point på én tur', target: 300 },
        { id: 'mecha', name: 'MechaBert', price: 360, goal: 'Vind ti vennedueller', target: 10 },
        { id: 'noir', name: 'NoirWing', price: 420, goal: 'Nå 180 point uden at misse en stjerne eller ramme noget', target: 1 },
        { id: 'vulture', name: 'BoneBeak', price: 300, goal: 'Nå bronze i Jungle uden redning', target: 1 },
        { id: 'sugar', name: 'SugarRush', price: 220, goal: 'Saml 250 stjerner i alt', target: 250 },
        { id: 'moss', name: 'MossHex', price: 320, goal: 'Nå bronze i alle tre Classic-baner', target: 3 },
        { id: 'ink', name: 'InkBird', price: 240, goal: 'Vind bronze, sølv og guld', target: 3 },
        { id: 'prism', name: 'PrismWing', price: 480, goal: 'Nå bronze i alle ni baner', target: 9 },
        { id: 'pingo', name: 'Pingo', price: 260, goal: 'Pingvin med jetpack · køb for fjer', target: 1 },
        { id: 'mogens', name: 'Mågen Mogens', price: 280, goal: 'Sur havnemåge · køb for fjer', target: 1 },
        { id: 'ninja', name: 'Ninja-Bert', price: 340, goal: 'Lydløs og hurtig · køb for fjer', target: 1 },
        { id: 'pakke', name: 'Pakke-Bert', price: 300, goal: 'Har altid en pakke med · køb for fjer', target: 1 },
        { id: 'gold', name: 'Guld-Bert', price: 1500, goal: 'Den sjældneste fugl · køb for fjer', target: 1 },
        // Epic heroes: only for players with a specific pilot name. The names are
        // stored as hashes, so they are not readable in the public source code.
        { id: 'epicMalthe', name: 'Storm Royale', price: 0, goal: 'Hemmelig helt', target: 1, secret: true, nameHash: 3598967373 },
        { id: 'epicJohan', name: 'Blok-Johan', price: 0, goal: 'Hemmelig helt', target: 1, secret: true, nameHash: 667591339 },
        { id: 'epicSos', name: 'Prinsesse Søs', price: 0, goal: 'Hemmelig helt', target: 1, secret: true, nameHash: 1846338164 },
        { id: 'epicThor', name: 'Thor Obby', price: 0, goal: 'Hemmelig helt', target: 1, secret: true, nameHash: 4206434765 },
        { id: 'epicFan', name: 'Fodbold-Bert', price: 0, goal: 'Hemmelig helt', target: 1, secret: true, nameHash: 3317535425 },
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
        case 'blue': current = Object.values(data.daily || {}).some((route) => route?.completedAt) ? 1 : 0; break;
        case 'block': current = Number(best[1]) || 0; break;
        case 'brain': current = missionDayStreak(data.missionClaims); break;
        case 'eagle': current = Number(achievements.maxScore) || 0; break;
        case 'mecha': current = Number(data.duels?.wins) || 0; break;
        case 'noir': current = achievements.clean180 ? 1 : 0; break;
        case 'vulture': current = achievements.cleanJungle ? 1 : 0; break;
        case 'sugar': current = Number(data.totalStars) || 0; break;
        case 'moss': current = [1, 4, 5].filter((level) => bronze[level]).length; break;
        case 'ink': current = ['bronze', 'silver', 'gold'].filter((kind) => medal[kind]).length; break;
        case 'prism': current = Array.from({ length: 9 }, (_, index) => index + 1).filter((level) => bronze[level]).length; break;
        default: break;
        }
        return { ...hero, current: Math.min(hero.target, current), complete: current >= hero.target };
    }

    window.BertHeroStore = Object.freeze({ catalog: CATALOG, byId: BY_ID, progress, missionDayStreak, nameHash, secretHeroesForName });
})();
