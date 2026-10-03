/*
 * Sprog. Dansk tekst er nøglen; andre sprog slås op i ordbogen. T virker både som
 * T('tekst') og som T`tekst ${værdi}`: pladsholdere nummereres {0}, {1} …, så
 * oversættelser kan bytte om på rækkefølgen. Ukendte tekster vises på dansk.
 */
(() => {
    'use strict';

    const STORAGE_KEY = 'bertTheBird_language';
    const SUPPORTED = ['da', 'en'];
    const DICT = { da: {}, en: {} };

    function storedChoice() {
        try { return localStorage.getItem(STORAGE_KEY) || 'auto'; } catch (_) { return 'auto'; }
    }

    function detect(choice = storedChoice()) {
        if (SUPPORTED.includes(choice)) return choice;
        const candidates = (typeof navigator !== 'undefined' && (navigator.languages?.length ? navigator.languages : [navigator.language])) || [];
        for (const tag of candidates) {
            const code = String(tag || '').toLowerCase().split('-')[0];
            if (SUPPORTED.includes(code)) return code;
        }
        return 'en';
    }

    let lang = detect();

    function lookup(key) {
        const table = DICT[lang];
        if (table && Object.prototype.hasOwnProperty.call(table, key)) return table[key];
        return key;
    }

    function T(strings, ...values) {
        if (Array.isArray(strings) && strings.raw) {
            const key = strings.reduce((out, part, index) => out + part + (index < values.length ? `{${index}}` : ''), '');
            return lookup(key).replace(/\{(\d+)\}/g, (_, index) => String(values[Number(index)] ?? ''));
        }
        return lookup(String(strings));
    }

    /** Translate static text in the page: text nodes and a few attributes. */
    function apply(root = document.body) {
        if (!root) return;
        const walker = document.createTreeWalker(root, NodeFilter.SHOW_TEXT, {
            acceptNode: (node) => (['SCRIPT', 'STYLE', 'TEXTAREA'].includes(node.parentElement?.tagName) ? NodeFilter.FILTER_REJECT : NodeFilter.FILTER_ACCEPT),
        });
        const nodes = [];
        while (walker.nextNode()) nodes.push(walker.currentNode);
        nodes.forEach((node) => {
            const raw = node.nodeValue;
            const trimmed = raw.trim();
            if (!trimmed) return;
            const translated = lookup(trimmed);
            if (translated !== trimmed) node.nodeValue = raw.replace(trimmed, translated);
        });
        root.querySelectorAll('[aria-label], [placeholder], [alt], [title]').forEach((element) => {
            ['aria-label', 'placeholder', 'alt', 'title'].forEach((attribute) => {
                const value = element.getAttribute(attribute);
                if (value && value.trim()) {
                    const translated = lookup(value.trim());
                    if (translated !== value.trim()) element.setAttribute(attribute, translated);
                }
            });
        });
        document.documentElement.lang = lang;
    }

    function setLanguage(choice) {
        try { localStorage.setItem(STORAGE_KEY, choice); } catch (_) { /* Private mode: in-memory only. */ }
        lang = detect(choice);
    }

    const api = {
        T, apply, setLanguage, detect,
        get language() { return lang; },
        get choice() { return storedChoice(); },
        SUPPORTED,
        register(code, table) { DICT[code] = { ...(DICT[code] || {}), ...table }; },
    };
    window.BertI18n = api;
})();
