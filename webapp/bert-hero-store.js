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
    ]);
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

    window.BertHeroStore = Object.freeze({ catalog: CATALOG, byId: BY_ID, progress, missionDayStreak });
})();
