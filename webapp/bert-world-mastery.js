/* Local, optional world milestones. No ranked, currency or network side effects. */
(() => {
    'use strict';
    // Translation hook: Danish text is the key; BertI18n (when loaded) maps it to the chosen language.
    const T = (typeof window !== 'undefined' && window.BertI18n) ? window.BertI18n.T
        : (strings, ...values) => (Array.isArray(strings) ? strings.reduce((out, part, index) => out + part + (index < values.length ? values[index] : ''), '') : String(strings));
    const KEY = 'bert_world_mastery_v1';
    const BADGES = Object.freeze({
        10: Object.freeze({ label: T('PUBLIKUMSVØLGE'), description: T('Kom forbi mindst tre bolde i én koncertbølge') }),
        11: Object.freeze({ label: T('FRI AF ROVFUGLEN'), description: T('Undvig den varslede ørn eller grib') }),
        12: Object.freeze({ label: 'STORMPILOT', description: T('Undvig en flyvende genstand i storm eller orkan') }),
    });
    const STORM_HAZARDS = new Set(['storm-sail', 'wind-umbrella', 'wind-branch', 'wind-sign', 'wind-car']);
    function qualifies(levelId, removed, existing) {
        if (levelId === 11) return removed.some((item) => item.kind === 'bird-run-bird' && item.predator);
        if (levelId === 12) return removed.some((item) => STORM_HAZARDS.has(item.kind) && item.weatherLevel >= 2);
        if (levelId !== 10) return false;
        return removed.some((item) => item.kind === 'edm-crowd-ball' && item.crowdSize >= 3
            && !existing.some((other) => other.id === item.id && other.kind === item.kind));
    }
    function read(storage) {
        try {
            const value = JSON.parse(storage.getItem(KEY) || '{}');
            return value && typeof value === 'object' && !Array.isArray(value) ? value : {};
        } catch (_) { return {}; }
    }
    function award(levelId, storage) {
        if (!BADGES[levelId]) return { awarded: false, badge: null };
        const badges = read(storage);
        if (badges[levelId]) return { awarded: false, badge: BADGES[levelId] };
        badges[levelId] = true;
        try { storage.setItem(KEY, JSON.stringify(badges)); } catch (_) { /* Private mode stays playable. */ }
        return { awarded: true, badge: BADGES[levelId] };
    }
    const api = Object.freeze({ BADGES, KEY, qualifies, read, award });
    if (typeof window !== 'undefined') window.BertWorldMastery = api;
    if (typeof module !== 'undefined') module.exports = api;
})();
