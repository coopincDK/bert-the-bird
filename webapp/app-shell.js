(() => {
    'use strict';
    // Translation hook: Danish text is the key; BertI18n (when loaded) maps it to the chosen language.
    const T = (typeof window !== 'undefined' && window.BertI18n) ? window.BertI18n.T
        : (strings, ...values) => (Array.isArray(strings) ? strings.reduce((out, part, index) => out + part + (index < values.length ? values[index] : ''), '') : String(strings));

    const shell = document.getElementById('game-shell');
    const installButton = document.getElementById('install-btn');
    const installGuide = document.getElementById('install-guide');
    const installGuideText = document.getElementById('install-guide-text');
    const closeInstallGuide = document.getElementById('close-install-guide');
    const statusToast = document.getElementById('app-status');
    const ACTIVE_BUILD = 'worlds-relay-70';
    const IS_QA = new URLSearchParams(window.location.search).has('qa');
    let deferredInstallPrompt = null;
    let toastTimer = 0;
    let offlineReady = false;

    function sessionFlag(key, value) {
        try {
            if (value !== undefined) sessionStorage.setItem(key, value);
            return sessionStorage.getItem(key);
        } catch (_) {
            return null;
        }
    }

    const isStandalone = () => window.matchMedia('(display-mode: standalone)').matches || window.navigator.standalone === true;
    const isIOS = () => /iphone|ipad|ipod/i.test(window.navigator.userAgent);
    const isChromeIOS = () => /crios/i.test(window.navigator.userAgent);

    function showToast(message) {
        window.clearTimeout(toastTimer);
        statusToast.textContent = message;
        statusToast.classList.add('visible');
        toastTimer = window.setTimeout(() => statusToast.classList.remove('visible'), 2600);
    }

    function updateInstallButton() {
        if (!installButton) return;
        installButton.classList.toggle('hidden', isStandalone());
    }

    function showInstallGuide() {
        installGuideText.textContent = isIOS()
            ? T('I Safari: Del → Føj til hjemmeskærm. Vent på “Klar til offline-spil”, og åbn ikonet én gang med net før du tester i flytilstand.')
            : T('Installér via browserens menu. Vent på “Klar til offline-spil”, og åbn appen én gang med net før du tester offline.');
        installGuide.classList.remove('hidden');
    }

    async function checkOfflineReady() {
        if (!navigator.serviceWorker?.controller || offlineReady) return;
        try {
            const cache = await caches.open(`bert-the-bird-${ACTIVE_BUILD}`);
            const [page, game] = await Promise.all([
                cache.match('./index.html'),
                cache.match(`./unity-faithful.js?v=${ACTIVE_BUILD}`),
            ]);
            if (!page || !game) return;
            offlineReady = true;
            const key = `bert-offline-ready-${ACTIVE_BUILD}`;
            if (!sessionFlag(key)) {
                sessionFlag(key, '1');
                showToast(T('Klar til offline-spil'));
            }
        } catch (_) { /* An incomplete install must never claim to be offline-ready. */ }
    }

    async function installApp() {
        if (deferredInstallPrompt) {
            deferredInstallPrompt.prompt();
            const choice = await deferredInstallPrompt.userChoice;
            deferredInstallPrompt = null;
            if (choice.outcome === 'accepted') showToast(T('Bert The Bird bliver installeret'));
            updateInstallButton();
            return;
        }
        showInstallGuide();
    }

    async function requestImmersiveMode() {
        try {
            if (!isStandalone() && !document.fullscreenElement && shell.requestFullscreen) {
                await shell.requestFullscreen({ navigationUI: 'hide' });
            }
        } catch (_) {
            // iOS Safari uses standalone PWA mode instead of the Fullscreen API.
        }
        try {
            if (screen.orientation?.lock) await screen.orientation.lock('landscape');
        } catch (_) {
            // Orientation lock is optional; the portrait overlay still guides the player.
        }
        window.dispatchEvent(new Event('resize'));
    }

    async function enterGameMode() {
        document.body.classList.add('is-playing');
        document.body.classList.remove('is-menu');
        await requestImmersiveMode();
    }

    async function leaveGameMode() {
        document.body.classList.remove('is-playing', 'is-prewarm');
        document.body.classList.add('is-menu');
        // Keep fullscreen and landscape active when returning to menus.
        window.dispatchEvent(new Event('resize'));
    }

    window.addEventListener('beforeinstallprompt', (event) => {
        event.preventDefault();
        deferredInstallPrompt = event;
        updateInstallButton();
    });
    window.addEventListener('appinstalled', () => {
        deferredInstallPrompt = null;
        updateInstallButton();
        showToast(T('Bert The Bird er installeret'));
    });
    window.addEventListener('online', () => showToast(T('Forbindelsen er tilbage')));
    window.addEventListener('offline', () => showToast(navigator.serviceWorker?.controller
        ? 'Offline · lokale resultater' : T('Offline er ikke klar endnu · forbind til nettet')));
    window.matchMedia('(display-mode: standalone)').addEventListener?.('change', updateInstallButton);

    installButton?.addEventListener('click', installApp);
    document.getElementById('play-btn')?.addEventListener('click', requestImmersiveMode);
    closeInstallGuide?.addEventListener('click', () => installGuide.classList.add('hidden'));
    installGuide?.addEventListener('click', (event) => {
        if (event.target === installGuide) installGuide.classList.add('hidden');
    });

    if (!IS_QA && 'serviceWorker' in navigator && location.protocol.startsWith('http')) {
        const hadController = Boolean(navigator.serviceWorker.controller);
        navigator.serviceWorker.addEventListener('controllerchange', () => {
            if (!hadController) {
                checkOfflineReady();
                return;
            }
            const reloadKey = `bert-reloaded-${ACTIVE_BUILD}`;
            if (sessionFlag(reloadKey)) return;
            sessionFlag(reloadKey, '1');
            location.reload();
        });
        window.addEventListener('load', () => {
            navigator.serviceWorker.register(`./service-worker.js?v=${ACTIVE_BUILD}`)
                .then((registration) => {
                    registration.update().catch(() => {});
                    return navigator.serviceWorker.ready;
                })
                .then(checkOfflineReady)
                .catch((error) => {
                    console.warn('Service worker registration failed:', error);
                });
        });
    }

    document.documentElement.classList.toggle('is-ios', isIOS());
    document.documentElement.classList.toggle('is-chrome-ios', isChromeIOS());
    document.body.classList.add('is-menu');
    updateInstallButton();
    if (sessionFlag(`bert-reloaded-${ACTIVE_BUILD}`)) {
        window.setTimeout(() => showToast(T('Ny mobilversion indlæst')), 250);
    }

    window.BertApp = Object.freeze({ build: ACTIVE_BUILD, enterGameMode, leaveGameMode, isStandalone, showToast,
        offlineReady: () => offlineReady });
})();
