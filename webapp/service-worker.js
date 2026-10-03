const CACHE_VERSION = 'bert-the-bird-worlds-relay-7';

const frames = (folder, prefix, count) => Array.from(
    { length: count },
    (_, index) => `./assets/unity/${folder}/${prefix}${String(index).padStart(2, '0')}.png`,
);

const BIRD_FRAMES = frames('bird', 'fly-', 14);
const BLUE_BIRD_FRAMES = frames('bird-blue', 'fly-', 14);
const BLOCK_BIRD_FRAMES = ['up', 'mid', 'glide', 'dead'].map((pose) => `./assets/klodsbert/${pose}.png`);
const CONCEPT_BIRD_FRAMES = ['brainbird', 'skyclaw', 'mechabert'].flatMap((folder) =>
    ['up', 'mid', 'glide', 'dead'].map((pose) => `./assets/${folder}/${pose}.png`)
);
const FASHION_BIRD_FRAMES = ['noirwing', 'bonebeak', 'sugarrush', 'mosshex', 'inkbird', 'prismwing'].flatMap((folder) =>
    ['up', 'mid', 'glide', 'dead'].map((pose) => `./assets/${folder}/${pose}.png`)
);
const SPIDER_FRAMES = frames('props', 'spider-', 3);
const SPIDER_CATCH_FRAMES = frames('props', 'spider-catch-', 18);
const SNAKE_FRAMES = frames('props', 'snake-', 7);
const SNAKE_JUMP_FRAMES = frames('props', 'snake-jump-', 5);
const SNAKE_CATCH_FRAMES = frames('props', 'snake-catch-', 3);
const LEVEL_PREVIEWS = Array.from({ length: 9 }, (_, index) => `./assets/unity/ui/previews/level-${index + 1}.png`);
const HAPPY_PIPE_COLORS = ['blue', 'green', 'purple', 'red', 'yellow'];
const HAPPY_PIPE_ASSETS = HAPPY_PIPE_COLORS.flatMap((color) => [
    `./assets/unity/props/happy-pipe/pipe-${color}.png`,
    `./assets/unity/props/happy-pipe/pipe-${color}-top.png`,
]);

const APP_SHELL = [
    './',
    './index.html',
    './style.css?v=worlds-relay-7',
    './app-shell.js?v=worlds-relay-7',
    './unity-collision.js?v=worlds-relay-7',
    './bert-physics.js?v=worlds-relay-7',
    './bert-progression.js?v=worlds-relay-7',
    './bert-tunnel.js?v=worlds-relay-7',
    './bert-edm.js?v=worlds-relay-7',
    './bert-bird-run.js?v=worlds-relay-7',
    './bert-stormline.js?v=worlds-relay-7',
    './bert-world-mastery.js?v=worlds-relay-7',
    './bert-sky-relay.js?v=worlds-relay-7',
    './bert-event-powerups.js?v=worlds-relay-7',
    './bert-collectible-motion.js?v=worlds-relay-7',
    './bert-haptics.js?v=worlds-relay-7',
    './bert-hero-store.js?v=worlds-relay-7',
    './bert-meta.js?v=worlds-relay-7',
    './bert-social.js?v=worlds-relay-7',
    './bert-focus-audio.js?v=worlds-relay-7',
    './bert-star-audio.js?v=worlds-relay-7',
    './unity-faithful.js?v=worlds-relay-7',
    './manifest.webmanifest?v=worlds-relay-7',
    './icons/bert-192.png',
    './icons/bert-512.png',
    './assets/unity/fonts/fullhouse.ttf',
    './assets/unity/fonts/arial-rounded.ttf',
    './assets/unity/ui/game-title.png',
    './assets/unity/ui/menu-bird.png',
    './assets/unity/ui/menu-play.png',
    './assets/unity/ui/menu-quick-play.png',
    './assets/unity/ui/menu-settings.png',
    './assets/unity/ui/level-main-menu.png',
    './assets/unity/ui/button-leaderboards.png',
    './assets/unity/ui/result-clock.png',
    './assets/unity/ui/crown.png',
    './assets/unity/ui/stopwatch.png',
    './assets/unity/ui/menu-star.png',
    './assets/unity/ui/menu-leaderboards.png',
    './assets/unity/ui/leaderboard-score.png',
    './assets/unity/ui/leaderboard-streak.png',
    './assets/unity/ui/leaderboard-time.png',
    './assets/unity/ui/leaderboard-world.png',
    './assets/unity/ui/leaderboard-friends.png',
    './assets/unity/ui/leaderboard-row-1.png',
    './assets/unity/ui/leaderboard-row-2.png',
    './assets/unity/ui/chest.png',
    './assets/unity/ui/wallet-star.png',
    './assets/unity/ui/player-bert.png',
    './assets/unity/ui/player-tweert.png',
    './assets/unity/ui/player-pig.png',
    ...LEVEL_PREVIEWS,
    './assets/unity/levels/desert/sky.jpg',
    './assets/unity/levels/desert/bg-1.png',
    './assets/unity/levels/desert/bg-2.png',
    './assets/unity/levels/desert/mg.png',
    './assets/unity/levels/desert/fg.png',
    './assets/unity/levels/tunnel/sky.png',
    './assets/unity/levels/tunnel/bg-1.png',
    './assets/unity/levels/tunnel/bg-2.png',
    './assets/unity/levels/tunnel/mg.png',
    './assets/unity/levels/tunnel/fg.png',
    './assets/unity/levels/flappy/sky.png',
    './assets/unity/levels/flappy/bg.png',
    './assets/unity/levels/flappy/mg.png',
    './assets/unity/levels/flappy/fg.png',
    './assets/unity/levels/jungle/bg.png',
    './assets/unity/levels/jungle/mg.png',
    './assets/unity/levels/jungle/fg.png',
    './assets/unity/levels/jungle/top-foreground.png',
    './assets/unity/levels/jungle/ground.png',
    './assets/unity/levels/jungle/canopy-left.png',
    './assets/unity/levels/jungle/canopy-right.png',
    './assets/unity/levels/jungle/stone-left.png',
    './assets/unity/levels/jungle/stone-right.png',
    './assets/unity/levels/happy-sky/sky.png',
    './assets/unity/levels/happy-sky/bg.png',
    './assets/unity/levels/happy-sky/mg.png',
    './assets/unity/props/desert-terrain.png',
    './assets/obstacles/desert-ruin.png',
    './assets/obstacles/desert-banded.png',
    './assets/obstacles/desert-etched.png',
    './assets/unity/props/flappy-pipe.png',
    './assets/unity/props/flappy-pipe-blue.png',
    './assets/unity/props/flappy-pipe-gold.png',
    './assets/obstacles/flappy-copper.png',
    './assets/obstacles/flappy-pearl.png',
    './assets/obstacles/jungle-stone.png',
    './assets/obstacles/happy-coral.png',
    './assets/edm/concert-stage.jpg',
    './assets/edm/mirror-ball.png',
    './assets/edm/speaker-stack.png',
    './assets/edm/light-truss.png',
    './assets/edm/center-led.png',
    './assets/edm/crowd-ball.png',
    './assets/edm/crowd-foreground.png',
    './assets/edm/neon-encore.mp3',
    './assets/bird-run/crosswind-bird-play.png',
    './assets/bird-run/amber-swift-play.png',
    './assets/bird-run/violet-kite-play.png',
    './assets/bird-run/cloud-bank-play.png',
    './assets/stormline/storm-sky.jpg',
    './assets/stormline/wind-sail.png',
    './assets/stormline/windsock.png',
    './assets/stormline/umbrella-play.png',
    './assets/stormline/branch-play.png',
    './assets/stormline/sign-play.png',
    './assets/stormline/car-play.png',
    './assets/sky-relay/flight-gate-play.png',
    './assets/sky-relay/flight-gate-foreground-play.png',
    './assets/sky-relay/wind-chime-target-play.png',
    './assets/powerup-prototypes/metal.png',
    './assets/powerup-prototypes/hyper.png',
    './assets/powerup-prototypes/double.png',
    './assets/powerup-prototypes/flap.png',
    './assets/unity/props/rainbow-normal.png',
    './assets/unity/props/happy-pipe/eye-left.png',
    './assets/unity/props/happy-pipe/eye-right.png',
    './assets/unity/props/happy-pipe/eye-left-closed.png',
    './assets/unity/props/happy-pipe/eye-right-closed.png',
    './assets/unity/props/happy-pipe/mouth-1.png',
    './assets/unity/props/happy-pipe/mouth-2.png',
    './assets/unity/props/happy-pipe/mouth-3.png',
    './assets/unity/collectibles/star.png',
    './assets/unity/powerups/blue-glow.png',
    './assets/unity/powerups/white-glow.png',
    './assets/unity/powerups/yellow-glow.png',
    './assets/unity/powerups/lightning.png',
    './assets/unity/powerups/wing.png',
    './assets/unity/powerups/shield-pickup.png',
    './assets/unity/powerups/magnet-pickup.png',
    './assets/unity/powerups/focus-pickup.png',
    './assets/unity/powerups/shield-charge.png',
    './assets/unity/particles/feather.png',
    './assets/unity/particles/shield-splinter.png',
    './assets/unity/particles/shield-splinter-orange.png',
    './assets/unity/audio/magnet-up.wav',
    './assets/unity/audio/magnet-running.wav',
    './assets/unity/audio/magnet-down.wav',
    './assets/unity/audio/shield-on.wav',
    './assets/unity/audio/shield-break.wav',
    './assets/unity/audio/shield-off.wav',
    './assets/unity/audio/chopin.mp3',
    './assets/unity/audio/level-1.mp3',
    './assets/unity/audio/menu.mp3',
    './assets/unity/audio/tunnel.mp3',
    './assets/sounds/Sounds/Sfx/COIN 1.wav',
    './assets/sounds/Sounds/Sfx/Explotion.wav',
    './assets/sounds/Sounds/GUI/Pop.wav',
    ...BIRD_FRAMES,
    ...BLUE_BIRD_FRAMES,
    ...BLOCK_BIRD_FRAMES,
    ...CONCEPT_BIRD_FRAMES,
    ...FASHION_BIRD_FRAMES,
    ...SPIDER_FRAMES,
    ...SPIDER_CATCH_FRAMES,
    ...SNAKE_FRAMES,
    ...SNAKE_JUMP_FRAMES,
    ...SNAKE_CATCH_FRAMES,
    ...HAPPY_PIPE_ASSETS,
];

self.addEventListener('install', (event) => {
    event.waitUntil(caches.open(CACHE_VERSION).then((cache) => cache.addAll(APP_SHELL)).then(() => self.skipWaiting()));
});

self.addEventListener('activate', (event) => {
    event.waitUntil(
        caches.keys()
            .then((keys) => Promise.all(keys.filter((key) => key !== CACHE_VERSION).map((key) => caches.delete(key))))
            .then(() => self.clients.claim())
    );
});

self.addEventListener('fetch', (event) => {
    const request = event.request;
    if (request.method !== 'GET') return;
    const url = new URL(request.url);
    if (url.origin !== self.location.origin) return;
    if (url.pathname.startsWith('/api/')) {
        event.respondWith(fetch(request).catch(() => new Response('{"offline":true}', {
            status: 503,
            headers: { 'Content-Type': 'application/json', 'Cache-Control': 'no-store' },
        })));
        return;
    }

    if (request.mode === 'navigate') {
        event.respondWith(
            (async () => {
                const controller = new AbortController();
                const timeout = setTimeout(() => controller.abort(), 4500);
                try {
                    const response = await fetch(request, { signal: controller.signal });
                    // A sleeping preview may answer 503 rather than reject. Never poison the
                    // installed app's last good HTML with an error page.
                    if (!response.ok || !response.headers.get('content-type')?.includes('text/html')) {
                        return (await caches.match('./index.html')) || response;
                    }
                    await caches.open(CACHE_VERSION)
                        .then((cache) => cache.put('./index.html', response.clone()))
                        .catch(() => {});
                    return response;
                } catch (_) {
                    return (await caches.match('./index.html')) || Response.error();
                } finally {
                    clearTimeout(timeout);
                }
            })()
        );
        return;
    }

    event.respondWith(
        caches.match(request).then((cached) => cached || fetch(request).then((response) => {
            if (response.ok) caches.open(CACHE_VERSION).then((cache) => cache.put(request, response.clone()));
            return response;
        }))
    );
});
