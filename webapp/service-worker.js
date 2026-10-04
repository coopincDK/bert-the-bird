const CACHE_VERSION = 'bert-the-bird-worlds-relay-78';

const frames = (folder, prefix, count) => Array.from(
    { length: count },
    (_, index) => `./assets/unity/${folder}/${prefix}${String(index).padStart(2, '0')}.webp`,
);

const BIRD_FRAMES = frames('bird', 'fly-', 14);
const BLUE_BIRD_FRAMES = frames('bird-blue', 'fly-', 14);
const BLOCK_BIRD_FRAMES = ['up', 'mid', 'glide', 'dead'].map((pose) => `./assets/klodsbert/${pose}.webp`);
const CONCEPT_BIRD_FRAMES = ['brainbird', 'skyclaw', 'mechabert'].flatMap((folder) =>
    ['up', 'mid', 'glide', 'dead'].map((pose) => `./assets/${folder}/${pose}.webp`)
);
const FASHION_BIRD_FRAMES = ['noirwing', 'bonebeak', 'sugarrush', 'mosshex', 'inkbird', 'prismwing', 'pingo', 'mogens', 'ninjabert', 'pakkeb', 'goldbert'].flatMap((folder) =>
    ['up', 'mid', 'glide', 'dead'].map((pose) => `./assets/${folder}/${pose}.webp`)
);
const SPIDER_FRAMES = frames('props', 'spider-', 3);
const SPIDER_CATCH_FRAMES = frames('props', 'spider-catch-', 18);
const SNAKE_FRAMES = frames('props', 'snake-', 7);
const SNAKE_JUMP_FRAMES = frames('props', 'snake-jump-', 5);
const SNAKE_CATCH_FRAMES = frames('props', 'snake-catch-', 3);
const LEVEL_PREVIEWS = Array.from({ length: 9 }, (_, index) => `./assets/unity/ui/previews/level-${index + 1}.webp`);
const HAPPY_PIPE_COLORS = ['blue', 'green', 'purple', 'red', 'yellow'];
const HAPPY_PIPE_ASSETS = HAPPY_PIPE_COLORS.flatMap((color) => [
    `./assets/unity/props/happy-pipe/pipe-${color}.webp`,
    `./assets/unity/props/happy-pipe/pipe-${color}-top.webp`,
]);

const APP_SHELL = [
    './',
    './index.html',
    './style.css?v=worlds-relay-78',
    './bert-i18n.js?v=worlds-relay-78',
    './lang-en.js?v=worlds-relay-78',
    './lang-nb.js?v=worlds-relay-78',
    './lang-sv.js?v=worlds-relay-78',
    './lang-de.js?v=worlds-relay-78',
    './lang-es.js?v=worlds-relay-78',
    './lang-fr.js?v=worlds-relay-78',
    './lang-pt.js?v=worlds-relay-78',
    './app-shell.js?v=worlds-relay-78',
    './unity-collision.js?v=worlds-relay-78',
    './bert-physics.js?v=worlds-relay-78',
    './bert-progression.js?v=worlds-relay-78',
    './bert-tunnel.js?v=worlds-relay-78',
    './bert-edm.js?v=worlds-relay-78',
    './bert-bird-run.js?v=worlds-relay-78',
    './bert-stormline.js?v=worlds-relay-78',
    './bert-world-mastery.js?v=worlds-relay-78',
    './bert-sky-relay.js?v=worlds-relay-78',
    './bert-adventure.js?v=worlds-relay-78',
    './bert-event-powerups.js?v=worlds-relay-78',
    './bert-collectible-motion.js?v=worlds-relay-78',
    './bert-haptics.js?v=worlds-relay-78',
    './bert-hero-store.js?v=worlds-relay-78',
    './bert-meta.js?v=worlds-relay-78',
    './bert-social.js?v=worlds-relay-78',
    './bert-focus-audio.js?v=worlds-relay-78',
    './bert-star-audio.js?v=worlds-relay-78',
    './unity-faithful.js?v=worlds-relay-78',
    './manifest.webmanifest?v=worlds-relay-78',
    './icons/bert-192.png',
    './icons/bert-512.png',
    './assets/unity/fonts/bert-display.woff2',
    './assets/unity/fonts/bert-rounded.woff2',
    './assets/unity/ui/game-title.webp',
    './assets/unity/ui/menu-bird.webp',
    './assets/unity/ui/button-leaderboards.webp',
    './assets/unity/ui/result-clock.webp',
    './assets/unity/ui/crown.webp',
    './assets/unity/ui/stopwatch.webp',
    './assets/unity/ui/menu-star.webp',
    './assets/unity/ui/leaderboard-score.webp',
    './assets/unity/ui/leaderboard-streak.webp',
    './assets/unity/ui/leaderboard-time.webp',
    './assets/unity/ui/leaderboard-row-1.webp',
    './assets/unity/ui/leaderboard-row-2.webp',
    './assets/unity/ui/chest.webp',
    './assets/unity/ui/wallet-star.webp',
    './assets/unity/ui/player-bert.webp',
    './assets/unity/ui/player-tweert.webp',
    './assets/unity/ui/player-pig.webp',
    ...LEVEL_PREVIEWS,
    './assets/unity/levels/desert/sky.webp',
    './assets/unity/levels/desert/bg-1.webp',
    './assets/unity/levels/desert/bg-2.webp',
    './assets/unity/levels/desert/mg.webp',
    './assets/unity/levels/desert/fg.webp',
    './assets/unity/levels/tunnel/sky.webp',
    './assets/unity/levels/tunnel/bg-1.webp',
    './assets/unity/levels/tunnel/bg-2.webp',
    './assets/unity/levels/tunnel/mg.webp',
    './assets/unity/levels/tunnel/fg.webp',
    './assets/unity/levels/flappy/sky.webp',
    './assets/unity/levels/flappy/bg.webp',
    './assets/unity/levels/flappy/mg.webp',
    './assets/unity/levels/flappy/fg.webp',
    './assets/unity/levels/jungle/bg.webp',
    './assets/unity/levels/jungle/mg.webp',
    './assets/unity/levels/jungle/fg.webp',
    './assets/unity/levels/jungle/top-foreground.webp',
    './assets/unity/levels/jungle/ground.webp',
    './assets/unity/levels/jungle/canopy-left.webp',
    './assets/unity/levels/jungle/canopy-right.webp',
    './assets/unity/levels/jungle/stone-left.webp',
    './assets/unity/levels/jungle/stone-right.webp',
    './assets/unity/levels/happy-sky/sky.webp',
    './assets/unity/levels/happy-sky/bg.webp',
    './assets/unity/levels/happy-sky/mg.webp',
    './assets/unity/props/desert-terrain.webp',
    './assets/obstacles/desert-ruin.webp',
    './assets/obstacles/desert-banded.webp',
    './assets/obstacles/desert-etched.webp',
    './assets/unity/props/flappy-pipe.webp',
    './assets/unity/props/flappy-pipe-blue.webp',
    './assets/unity/props/flappy-pipe-gold.webp',
    './assets/obstacles/flappy-copper.webp',
    './assets/obstacles/flappy-pearl.webp',
    './assets/obstacles/jungle-stone.webp',
    './assets/obstacles/happy-coral.webp',
    './assets/edm/concert-stage.webp',
    './assets/edm/mirror-ball.webp',
    './assets/edm/speaker-stack.webp',
    './assets/edm/light-truss.webp',
    './assets/edm/center-led.webp',
    './assets/edm/crowd-ball.webp',
    './assets/edm/crowd-foreground.webp',
    './assets/music/edm.mp3',
    './assets/bird-run/crosswind-bird-play.webp',
    './assets/bird-run/amber-swift-play.webp',
    './assets/bird-run/violet-kite-play.webp',
    './assets/bird-run/cloud-bank-play.webp',
    './assets/stormline/storm-sky.webp',
    './assets/stormline/wind-sail.webp',
    './assets/stormline/windsock.webp',
    './assets/stormline/umbrella-play.webp',
    './assets/stormline/branch-play.webp',
    './assets/stormline/sign-play.webp',
    './assets/stormline/car-play.webp',
    './assets/sky-relay/flight-gate-play.webp',
    './assets/sky-relay/flight-gate-foreground-play.webp',
    './assets/sky-relay/wind-chime-target-play.webp',
    './assets/powerup-prototypes/metal.webp',
    './assets/powerup-prototypes/hyper.webp',
    './assets/powerup-prototypes/double.webp',
    './assets/powerup-prototypes/flap.webp',
    './assets/unity/props/rainbow-normal.webp',
    './assets/unity/props/happy-pipe/eye-left.webp',
    './assets/unity/props/happy-pipe/eye-right.webp',
    './assets/unity/props/happy-pipe/eye-left-closed.webp',
    './assets/unity/props/happy-pipe/eye-right-closed.webp',
    './assets/unity/props/happy-pipe/mouth-1.webp',
    './assets/unity/props/happy-pipe/mouth-2.webp',
    './assets/unity/props/happy-pipe/mouth-3.webp',
    './assets/unity/collectibles/star.webp',
    './assets/unity/powerups/blue-glow.webp',
    './assets/unity/powerups/white-glow.webp',
    './assets/unity/powerups/yellow-glow.webp',
    './assets/unity/powerups/lightning.webp',
    './assets/unity/powerups/wing.webp',
    './assets/unity/powerups/shield-pickup.webp',
    './assets/unity/powerups/magnet-pickup.webp',
    './assets/unity/powerups/focus-pickup.webp',
    './assets/unity/powerups/shield-charge.webp',
    './assets/unity/particles/feather.webp',
    './assets/unity/particles/shield-splinter.webp',
    './assets/unity/particles/shield-splinter-orange.webp',
    './assets/sfx/magnet-up.mp3',
    './assets/sfx/magnet-running.mp3',
    './assets/sfx/magnet-down.mp3',
    './assets/sfx/splat.mp3',
    './assets/sfx/drop.mp3',
    './assets/sfx/lava.mp3',
    './assets/sfx/whoosh.mp3',
    './assets/sfx/wind.mp3',
    './assets/sfx/crack.mp3',
    './assets/sfx/shield-on.mp3',
    './assets/sfx/shield-break.mp3',
    './assets/sfx/shield-off.mp3',
    './assets/music/focus.mp3',
    './assets/music/classic.mp3',
    './assets/music/flappy.mp3',
    './assets/music/iceberg.mp3',
    './assets/music/harbor.mp3',
    './assets/music/nightcity.mp3',
    './assets/music/volcano.mp3',
    './assets/music/windfarm.mp3',
    './assets/music/poop.mp3',
    './assets/music/menu.mp3',
    './assets/v2/manifest.json',
    './assets/heroes/bert/flap-01.webp',
    './assets/heroes/bert/flap-02.webp',
    './assets/heroes/bert/flap-03.webp',
    './assets/heroes/bert/flap-04.webp',
    './assets/heroes/bert/flap-05.webp',
    './assets/heroes/bert/flap-06.webp',
    './assets/heroes/bert/flap-07.webp',
    './assets/heroes/bert/flap-08.webp',
    './assets/music/tunnel.mp3',
    './assets/sfx/coin.mp3',
    './assets/sfx/miss.mp3',
    './assets/sfx/explosion.mp3',
    './assets/sfx/pop.mp3',
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
