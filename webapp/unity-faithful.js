/*
 * Bert The Bird — browser reconstruction from the supplied Unity project.
 *
 * Reference sources:
 * - Assets/Animations/Skin Animations/00 - Bert/fly.anim (14 frames, 24 FPS)
 * - Assets/Scripts/BirdController.cs, Core/GameSpeed.cs and Core/LevelControl.cs
 * - Assets/Scenes/Game.unity (level definitions, stages and game modes)
 */
(() => {
    'use strict';
    // Translation hook: Danish text is the key; BertI18n (when loaded) maps it to the chosen language.
    const T = (typeof window !== 'undefined' && window.BertI18n) ? window.BertI18n.T
        : (strings, ...values) => (Array.isArray(strings) ? strings.reduce((out, part, index) => out + part + (index < values.length ? values[index] : ''), '') : String(strings));

    const VIEW = { width: 1280, height: 720, margin: 0 };
    const BASE_WIDTH = 1280;
    const MAX_ASPECT = 21 / 9;
    const BASE_BIRD_X = 185;
    const BUILD_VERSION = 'worlds-relay-117';
    const FLAPPY_GRAVITY = 1750;
    const BIRD = { x: 185, width: 124, height: 113 };
    const FIXED_STEP = 1 / 60;
    const MAX_SIMULATION_STEPS = 3;
    const RENDER_INTERVAL = 1000 / 60;
    const FOCUS_MIN_SPEED = 0.6;
    const FOCUS_SPEED_RATIO = 0.67;
    const FOCUS_DURATION_SECONDS = 30;
    // Focus starts instantly; its soundtrack is decoded at load time.
    const FOCUS_COUNTDOWN_SECONDS = 0;
    const FOCUS_ENTER_SECONDS = 0.65;
    const GENERATED_HERO_IDS = new Set(['pingo', 'mogens', 'ninja', 'pakke', 'gold', 'epicMalthe', 'epicJohan', 'epicSos', 'epicThor', 'epicFan', 'epicCoop', 'block', 'brain', 'eagle', 'mecha', 'noir', 'vulture', 'sugar', 'moss', 'ink', 'prism']);
    const GENERATED_FLIGHT_SEQUENCE = Object.freeze([0, 2, 4, 2]);
    const GENERATED_ANIMATION_FPS = 6;
    const RESCUE_OUTCOMES = Object.freeze([
        { id: 'continue', label: T('FORTSÆT') },
        { id: 'shield', label: T('SKJOLD'), powerup: 'Shield' },
        { id: 'refund', label: T('FJER RETUR'), refund: 12 },
        { id: 'gameover', label: T('GAME OVER') },
        { id: 'magnet', label: T('MAGNET'), powerup: 'Magnet' },
        { id: 'focus', label: T('FOKUS'), powerup: 'Focus' },
    ]);
    const QUERY = new URLSearchParams(window.location.search);
    const DEBUG_COLLIDERS = QUERY.has('colliders');
    const DEBUG_NOCLIP = QUERY.has('noclip');

    const MODE = Object.freeze({ DEFAULT: 'default', FLAPPY: 'flappy' });
    const POWERUP = Object.freeze({ SHIELD: 'Shield', MAGNET: 'Magnet', FOCUS: 'Focus', GUARD: 'Guard',
        HEAVY: 'Heavy', HYPER: 'Hyper', DOUBLE: 'Double', FLAP: 'Flap', REVERSE: 'Reverse',
        // Forstør: Bert grows (harder to slip through, double points). Formindsk: Bert shrinks.
        GROW: 'Grow', SHRINK: 'Shrink' });
    const SIZE_POWERUP = Object.freeze({ Grow: 1.45, Shrink: 0.6 });
    const BIRD_DRAW_SCALE = 1.15;
    // The old Unity snake's behaviour (coils, hop, eyes between the coils), redrawn in
    // round 6. The new frames are higher resolution: these factors map them to the old sizes.
    const OLD_SNAKE = true;
    const SNAKE_JUMP_SCALE = 0.55;
    const SNAKE_CATCH_SCALE = 0.7;
    // Omvendt styring: op er ned, og i flappy-styring flyver Bert på hovedet.
    const REVERSE_SECONDS = 7;
    const isReversed = () => state.activePowerup === POWERUP.REVERSE;
    function focusSpeed(speed, mode = currentLevel.mode) {
        // Flappy begins below the Classic minimum: Focus must never speed it up.
        const minimum = mode === MODE.FLAPPY ? 0.28 : FOCUS_MIN_SPEED;
        return Math.min(speed, Math.max(minimum, speed * FOCUS_SPEED_RATIO));
    }
    const OBSTACLE_SPACING = Object.freeze({ desert: 760, tunnel: 620, flappy: 700, jungle: 620, happySky: 680, edm: 860 });

    const LEVEL_LAYERS = Object.freeze({
        desert: [
            { image: 'desertSky', y: 0, height: 720, factor: 0.03 },
            { image: 'desertBg1', y: 238, height: 188, factor: 0.07 },
            { image: 'desertBg2', y: 305, height: 300, factor: 0.07 },
            { image: 'desertMg', y: 462, height: 198, factor: 0.12 },
            { image: 'desertFg', y: 570, height: 198, factor: 0.60 },
        ],
        jungle: [
            { image: 'jungleBg', y: 0, height: 720, factor: 0.12 },
            { image: 'jungleMg', y: 28, height: 690, factor: 0.20 },
            { image: 'jungleFg', y: 410, height: 310, factor: 1.00 },
        ],
        happySky: [
            { image: 'happySky', y: 0, height: 720, factor: 0.10 },
            { image: 'happyBg', y: 556, height: 164, factor: 0.50 },
            { image: 'happyMg', y: 472, height: 155, factor: 0.20 },
        ],
        flappy: [
            { image: 'flappySky', y: 0, height: 720, factor: 0.03 },
            { image: 'flappyBg', y: 206, height: 150, factor: 0.07 },
            { image: 'flappyMg', y: 412, height: 198, factor: 0.12 },
            { image: 'flappyFg', y: 546, height: 174, factor: 1.00 },
        ],
        tunnel: [
            { image: 'tunnelSky', y: 0, height: 720, factor: 0.025 },
            { image: 'tunnelBg2', y: 250, height: 300, factor: 0.07 },
            { image: 'tunnelBg1', y: 310, height: 190, factor: 0.11 },
            { image: 'tunnelMg', y: 474, height: 198, factor: 0.18 },
            { image: 'tunnelFg', y: 575, height: 170, factor: 0.45 },
        ],
    });

    const FOREGROUND_BANDS = Object.freeze({
        desert: { image: 'desertFg', top: 64, floor: 652, y: 570, height: 198, factor: 0.60 },
        flappy: { image: 'flappyFg', top: 68, floor: 654, y: 546, height: 174, factor: 1.00 },
        happySky: { image: 'happyBg', top: 62, floor: 650, y: 556, height: 164, factor: 0.50 },
        tunnel: { image: 'tunnelFg', top: 52, floor: 666, y: 575, height: 170, factor: 0.45 },
    });

    const UNITY_LEVELS = [
        {
            id: 1, modeGroup: 'classic', modeOrder: 1, unlockScore: 0,
            name: 'Desert', sourceName: 'Desert', cardText: T('GRUNDFLYVNING'), thumbnail: 1,
            mode: MODE.DEFAULT, startSpeed: 0.8, kind: 'desert', variant: 'desert', spacing: 820,
            stages: [
                { duration: 0.5, speed: 0.8, difficulty: 0.3 }, { duration: 35, speed: 1.0, difficulty: 0.5 },
                { duration: 35, speed: 1.2, difficulty: 0.6 }, { duration: 45, speed: 1.6, difficulty: 0.8 },
                { duration: 30, speed: 1.8, difficulty: 1.0 }, { duration: 60, speed: 2.0, difficulty: 1.0 },
                { duration: 180, speed: 2.8, difficulty: 1.8 },
            ],
            layers: LEVEL_LAYERS.desert,
        },
        {
            id: 4, modeGroup: 'classic', modeOrder: 2, unlockScore: 120,
            name: 'Jungle', sourceName: 'Jungle', cardText: T('FJENDER & ANGREB'), thumbnail: 4,
            mode: MODE.DEFAULT, startSpeed: 0.8, kind: 'jungle', variant: 'enemies', spacing: 660, spiderWarning: true,
            stages: [
                { duration: 25, speed: 0.75, difficulty: 0.7 }, { duration: 45, speed: 1.05, difficulty: 1.0 },
                { duration: 180, speed: 1.4, difficulty: 1.35 },
            ],
            layers: LEVEL_LAYERS.jungle,
        },
        {
            id: 5, modeGroup: 'classic', modeOrder: 3, unlockScore: 180,
            name: 'Happy Sky', sourceName: 'Happy Sky', cardText: T('LEVENDE FORHINDRINGER'), thumbnail: 5,
            mode: MODE.DEFAULT, startSpeed: 0.76, kind: 'happySky', variant: 'happy', spacing: 710,
            stages: [
                { duration: 35, speed: 0.75, difficulty: 0.55 }, { duration: 45, speed: 1.0, difficulty: 0.75 },
                { duration: 60, speed: 1.3, difficulty: 0.95 }, { duration: 180, speed: 1.65, difficulty: 1.15 },
            ],
            layers: LEVEL_LAYERS.happySky,
        },
        {
            id: 3, modeGroup: 'flappy', modeOrder: 1, unlockScore: 0,
            name: 'Flappy Bert', sourceName: 'Flappy Bert', cardText: T('FASTE TÅRNE'), thumbnail: 3,
            mode: MODE.FLAPPY, startSpeed: 0.45, kind: 'flappy', variant: 'fixed', spacing: 760, gap: 270,
            stages: [
                { duration: 40, speed: 0.45, difficulty: 0.7 }, { duration: 55, speed: 0.54, difficulty: 0.9 },
                { duration: 180, speed: 0.64, difficulty: 1.1 },
            ],
            layers: LEVEL_LAYERS.flappy,
        },
        {
            id: 6, modeGroup: 'flappy', modeOrder: 2, unlockScore: 90,
            name: 'Sky Shift', sourceName: 'Flappy Bert', cardText: T('BEVÆGELIGE TÅRNE'), thumbnail: 3,
            mode: MODE.FLAPPY, startSpeed: 0.42, kind: 'flappy', variant: 'moving', spacing: 810, gap: 282,
            stages: [
                { duration: 40, speed: 0.42, difficulty: 0.75 }, { duration: 55, speed: 0.52, difficulty: 1.0 },
                { duration: 180, speed: 0.62, difficulty: 1.25 },
            ],
            layers: LEVEL_LAYERS.flappy,
        },
        {
            id: 7, modeGroup: 'flappy', modeOrder: 3, unlockScore: 130,
            name: 'Tower Mix', sourceName: 'Flappy Bert', cardText: T('FAST + BEVÆGELIG'), thumbnail: 3,
            mode: MODE.FLAPPY, startSpeed: 0.48, kind: 'flappy', variant: 'mixed', spacing: 770, gap: 266,
            stages: [
                { duration: 32, speed: 0.48, difficulty: 0.85 }, { duration: 48, speed: 0.58, difficulty: 1.1 },
                { duration: 180, speed: 0.70, difficulty: 1.35 },
            ],
            layers: LEVEL_LAYERS.flappy,
        },
        {
            id: 2, modeGroup: 'tunnel', modeOrder: 1, unlockScore: 0,
            name: 'Tunnel Training', sourceName: 'Tunnel', cardText: T('LÆR KORRIDOREN'), thumbnail: 2,
            mode: MODE.DEFAULT, startSpeed: 0.72, kind: 'tunnel', variant: 'training', spacing: 650,
            stages: [
                { duration: 35, speed: 0.85, difficulty: 0.8 }, { duration: 50, speed: 1.05, difficulty: 1.0 },
                { duration: 70, speed: 1.28, difficulty: 1.25 }, { duration: 180, speed: 1.55, difficulty: 1.5 },
            ],
            layers: LEVEL_LAYERS.tunnel,
        },
        {
            id: 8, modeGroup: 'tunnel', modeOrder: 2, unlockScore: 110,
            name: 'Star Stream', sourceName: 'Tunnel', cardText: T('FØLG STJERNESTRØMMEN'), thumbnail: 2,
            mode: MODE.DEFAULT, startSpeed: 0.78, kind: 'tunnel', variant: 'star-stream', spacing: 610,
            stages: [
                { duration: 35, speed: 0.82, difficulty: 0.85 }, { duration: 55, speed: 1.06, difficulty: 1.1 },
                { duration: 180, speed: 1.36, difficulty: 1.45 },
            ],
            layers: LEVEL_LAYERS.tunnel,
        },
        {
            id: 9, modeGroup: 'tunnel', modeOrder: 3, unlockScore: 160,
            name: 'Pulse Tunnel', sourceName: 'Tunnel', cardText: T('ÅNDENDE PORTE'), thumbnail: 2,
            mode: MODE.DEFAULT, startSpeed: 0.76, kind: 'tunnel', variant: 'pulse', spacing: 690,
            stages: [
                { duration: 35, speed: 0.78, difficulty: 0.9 }, { duration: 55, speed: 1.04, difficulty: 1.18 },
                { duration: 180, speed: 1.34, difficulty: 1.55 },
            ],
            layers: LEVEL_LAYERS.tunnel,
        },
    ];

    // Separate from the nine ranked levels: no progression or server submission.
    const EDM_EVENT = Object.freeze({
        id: 10, modeGroup: 'event', modeOrder: 1, unlockScore: 0,
        name: 'Neon Encore', sourceName: 'Neon Encore', cardText: T('KONCERT · TESTBANE'),
        mode: MODE.DEFAULT, startSpeed: 0.78, kind: 'edm', variant: 'concert', spacing: 860,
        stages: [
            { duration: 38, speed: 0.78, difficulty: 0.72 },
            { duration: 55, speed: 0.95, difficulty: 0.95 },
            { duration: 180, speed: 1.12, difficulty: 1.15 },
        ],
        layers: [],
    });

    const BIRD_RUN_EVENT = Object.freeze({
        id: 11, modeGroup: 'event', modeOrder: 2, unlockScore: 0,
        name: 'Bird Run', sourceName: 'Bird Run', cardText: T('FUGLETRAFIK · TESTBANE'),
        mode: MODE.DEFAULT, startSpeed: 0.74, kind: 'birdRun', variant: 'open-sky', spacing: 920,
        stages: [
            { duration: 42, speed: 0.74, difficulty: 0.65 },
            { duration: 62, speed: 0.84, difficulty: 0.78 },
            { duration: 180, speed: 0.94, difficulty: 0.92 },
        ],
        layers: [],
    });
    const STORMLINE_EVENT = Object.freeze({
        id: 12, modeGroup: 'event', modeOrder: 3, unlockScore: 0,
        name: 'Stormline', sourceName: 'Stormline', cardText: T('VIND · TESTBANE'),
        mode: MODE.DEFAULT, startSpeed: 0.72, kind: 'stormline', variant: 'wind-sail', spacing: 1040,
        stages: [
            { duration: 48, speed: 0.72, difficulty: 0.65 },
            { duration: 66, speed: 0.80, difficulty: 0.78 },
            { duration: 180, speed: 0.88, difficulty: 0.92 },
        ],
        layers: [],
    });
    const SKY_RELAY_EVENT = Object.freeze({
        id: 13, modeGroup: 'event', modeOrder: 4, unlockScore: 0,
        name: 'Sky Relay', sourceName: 'Sky Relay', cardText: T('PRÆCISIONSFLYVNING · LOKAL PRØVE'),
        mode: MODE.DEFAULT, startSpeed: 0.58, kind: 'skyRelay', variant: 'wind-chime', spacing: 0,
        stages: [], layers: [],
    });

    // Five adventure worlds, always open. Endless like every other level.
    const ADVENTURE_ART = Object.freeze({
        iceberg: { name: T('Isbjerget'), card: T('ISTAPPER & SPIDSER'), obstacles: { advIceStalactite: 'falling-stalactite', advIceShelf: 'cracking-ice-shelf', advIceSpikes: 'ice-spike-cluster',
            advIcicles: 'icicle-cluster', advFloe: 'ice-floe', iceCrystal: 'frost-crystal', iceFrost: 'bert-frost', iceSkid: 'ice-skid' } },
        harbor: { name: T('Havnen'), card: T('KRANER & MÅGER'), obstacles: { advCraneHook: 'crane-hook', advGull: 'diving-gull', advParcel: 'rolling-parcel',
            harContainer0: 'container-red', harContainer1: 'container-blue', harContainer2: 'container-green', harLamp: 'crane-lamp',
            harGull1: 'gull-1', harGull2: 'gull-2', harGull3: 'gull-3' } },
        nightcity: { name: T('Nattebyen'), card: T('MØRKE & SKILTE'), obstacles: { advWaterTank: 'lit-water-tank', advVent: 'rooftop-vent', advSignboard: 'swaying-signboard',
            advAntenna: 'antenna-mast', advCableLamps: 'cable-lamps', advNeonFish: 'neon-sign-fish', advNeonBolt: 'neon-sign-bolt',
            nightLantern1: 'lantern-1', nightLantern2: 'lantern-2', nightMoth: 'moth' } },
        volcano: { name: T('Vulkanen'), card: T('LAVA & BOBLER'), obstacles: { advLavaLedge: 'cracked-lava-ledge', advLavaBubble: 'lava-bubble', advLavaSpout: 'lava-spout',
            volcSurface1: 'lava-surface-1', volcSurface2: 'lava-surface-2', volcColumn1: 'lava-column-1', volcColumn2: 'lava-column-2',
            volcCooling: 'cooling-stone', volcBomb: 'lava-bomb', volcSmoke: 'smoke-trail', volcVent: 'vent-crack' } },
        windfarm: { name: T('Vindmøller'), card: T('ROTORER & BØJER'), obstacles: { advRotor: 'rotor-gate', advBuoys: 'buoy-chain', advPlatform: 'service-platform',
            windArrowUp: 'wind-arrow-up', windArrowDown: 'wind-arrow-down', windStreak: 'wind-streak', windNacelle: 'nacelle', advKite: 'kite' } },
        poop: { name: T('Fugleklat'), card: T('SPIS & KLAT'), obstacles: {
            poopBerry: 'food-berry', poopCrumb: 'food-crumb', poopFries: 'food-fries', poopDrop: 'poop-drop',
            poopSplat1: 'poop-splat-1', poopSplat2: 'poop-splat-2', poopCar: 'target-car', poopCabrio: 'target-cabrio',
            poopIcecream: 'target-icecream', poopStatue: 'target-statue', poopGold: 'target-gold-car',
            poopUmbrellaOpen: 'target-umbrella-open', poopUmbrellaClosed: 'target-umbrella-closed', poopLaundry: 'target-laundry',
            poopMeterIcon: 'poop-meter-icon', poopMeterFrame: 'poop-meter-frame' } },
    });
    // bg1 ends just inside bg2's solid band, so no seam shows between them.
    const ADVENTURE_BG1_Y = Object.freeze({ iceberg: 310, harbor: 335, nightcity: 350, volcano: 412, windfarm: 238, poop: 250 });
    const adventureLayers = (theme) => [
        { image: `${theme}Sky`, y: 0, height: 720, factor: 0.03 },
        // Vindmøller: bg2 carries its own horizon, so bg1's sea band made a second
        // horizon (sea, sky, sea). The far islands layer is left out there.
        ...(theme === 'windfarm' ? [] : [{ image: `${theme}Bg1`, y: ADVENTURE_BG1_Y[theme], height: 190, factor: 0.06 }]),
        { image: `${theme}Bg2`, y: 275, height: 400, factor: 0.1 },
        { image: `${theme}Mg`, y: 470, height: 200, factor: 0.18 },
        { image: `${theme}Fg`, y: 545, height: 200, factor: 0.55 },
    ];
    // Fugleklat: a sixth adventure world. Until its own art arrives it borrows the Flappy town.
    const ADVENTURE_INFO = ADVENTURE_ART;
    // Unlock order (feedback): one world per base mode first, then the hard ones; Isbjerget and Fugleklat last.
    const ADVENTURE_ORDER = Object.freeze({ harbor: 1, nightcity: 2, windfarm: 3, volcano: 4, iceberg: 5, poop: 6 });
    const ADVENTURE_LEVELS = Object.freeze(['iceberg', 'harbor', 'nightcity', 'volcano', 'windfarm', 'poop'].map((theme, index) => Object.freeze({
        id: 20 + index, modeGroup: 'adventure', modeOrder: ADVENTURE_ORDER[theme], unlockScore: 0,
        name: ADVENTURE_INFO[theme].name, sourceName: ADVENTURE_INFO[theme].name, cardText: ADVENTURE_INFO[theme].card,
        mode: MODE.DEFAULT, startSpeed: 0.8, kind: theme, variant: theme, spacing: theme === 'windfarm' ? 980 : 820,
        stages: [
            { duration: 0.5, speed: 0.8, difficulty: 0.4 }, { duration: 30, speed: 1.0, difficulty: 0.6 },
            { duration: 35, speed: 1.25, difficulty: 0.8 }, { duration: 40, speed: 1.6, difficulty: 1.0 },
            { duration: 60, speed: 2.0, difficulty: 1.3 }, { duration: 150, speed: 2.7, difficulty: 1.8 },
        ],
        layers: adventureLayers(theme),
    })));
    const isAdventureLevel = (level = currentLevel) => level?.modeGroup === 'adventure';
    // Eventyr (feedback 4. okt.): each world opens through something done elsewhere.
    // Havnen = all Classic bronze, Nattebyen = all Flappy bronze, Vindmøller = all Tunnel bronze,
    // Vulkanen = silver in two of those three, Isbjerget = silver in Vulkanen + gold somewhere,
    // Fugleklat = silver in Isbjerget. The tab and the test worlds appear with the first world.
    const BRONZE_SCORE = 20;
    const SILVER_SCORE = 50;
    const GOLD_SCORE = 100;
    const best = (id) => loadHighscore(id);
    const allBronze = (ids) => ids.every((id) => best(id) >= BRONZE_SCORE);
    const countBronze = (ids) => ids.filter((id) => best(id) >= BRONZE_SCORE).length;
    function baseBronzeCount() {
        return UNITY_LEVELS.filter((level) => loadHighscore(level.id) >= BRONZE_SCORE).length;
    }
    const WORLD_RULES = {
        21: () => ({ ok: allBronze([1, 4, 5]), short: T`${countBronze([1, 4, 5])}/3 CLASSIC`, long: T('Få bronze på alle tre Classic-baner for at åbne Havnen.') }),
        22: () => ({ ok: allBronze([3, 6, 7]), short: T`${countBronze([3, 6, 7])}/3 FLAPPY`, long: T('Få bronze på alle tre Flappy-baner for at åbne Nattebyen.') }),
        24: () => ({ ok: allBronze([2, 8, 9]), short: T`${countBronze([2, 8, 9])}/3 TUNNEL`, long: T('Få bronze på alle tre Tunnel-baner for at åbne Vindmøller.') }),
        23: () => { const n = [21, 22, 24].filter((id) => best(id) >= SILVER_SCORE).length;
            return { ok: n >= 2, short: T`SØLV ${n}/2`, long: T('Få sølv i to af Havnen, Nattebyen og Vindmøller for at åbne Vulkanen.') }; },
        20: () => { const gold = UNITY_LEVELS.some((level) => best(level.id) >= GOLD_SCORE);
            return { ok: best(23) >= SILVER_SCORE && gold, short: best(23) >= SILVER_SCORE ? T('GULD PÅ EN BANE') : T('SØLV I VULKANEN'),
                long: T('Få sølv i Vulkanen og guld på én af grundbanerne for at åbne Isbjerget.') }; },
        25: () => ({ ok: best(20) >= SILVER_SCORE, short: T('SØLV I ISBJERGET'), long: T('Få sølv i Isbjerget for at åbne Fugleklat.') }),
    };
    function adventureOpen() {
        return BertMeta.hasTestAccess?.() || [21, 22, 24].some((id) => WORLD_RULES[id]().ok);
    }
    // Bonus levels (feedback 10. okt.): every special level belongs to a world on the
    // journey and opens with silver on that world's own level.
    const BONUS_HOME = Object.freeze({ 15: 1, 11: 4, 13: 5, 14: 5, 10: 22, 12: 24 }); // 11 Bird Run, 10 Neon Encore
    function adventureStatus(level) {
        if (BertMeta.hasTestAccess?.()) return { unlocked: true };
        if (level.modeGroup === 'event') {
            const home = BONUS_HOME[level.id];
            const homeLevel = home && levelById(home);
            if (!homeLevel) return { unlocked: true };
            const ok = loadHighscore(home) >= SILVER_SCORE;
            return ok ? { unlocked: true } : { unlocked: false, short: T`SØLV I ${homeLevel.name.toUpperCase()}`,
                long: T`Få sølv (50 point) i ${homeLevel.name} for at åbne bonusbanen ${level.name}.` };
        }
        const rule = WORLD_RULES[level.id];
        if (!rule) return { unlocked: true };
        const result = rule();
        return result.ok ? { unlocked: true } : { unlocked: false, short: result.short, long: result.long };
    }
    // The four test worlds live in the Eventyr tab too, after the five new levels.
    // Svæv (feedback 10. okt.): Bert has no wingbeats, only pitch. Nose up costs speed,
    // nose down gains it; warm air (thermals) lifts him; speed is points.
    const GLIDE_EVENT = Object.freeze({
        id: 14, modeGroup: 'event', modeOrder: 5, unlockScore: 0,
        name: 'Svæv', sourceName: 'Svæv', cardText: T('GLID & OPVIND · TESTBANE'),
        mode: MODE.DEFAULT, startSpeed: 0.7, kind: 'glide', variant: 'thermals', spacing: 820,
        stages: [
            { duration: 40, speed: 0.70, difficulty: 0.6 },
            { duration: 60, speed: 0.78, difficulty: 0.75 },
            { duration: 180, speed: 0.86, difficulty: 0.9 },
        ],
        layers: [],
    });
    // Fuglesværm (feedback 10. okt.): every 10 stars in a row a small bird joins the
    // formation. A hit costs a bird instead of the run. Built on the Desert level.
    const SWARM_EVENT = ({
        ...UNITY_LEVELS[0], id: 15, modeGroup: 'event', modeOrder: 6, unlockScore: 0, thumbnail: 15,
        name: 'Fuglesværm', sourceName: 'Fuglesværm', cardText: T('FLOK & FORMATION · TESTBANE'), swarm: true,
    });
    const EVENT_LEVELS = Object.freeze([BIRD_RUN_EVENT, EDM_EVENT, STORMLINE_EVENT, SKY_RELAY_EVENT, GLIDE_EVENT, SWARM_EVENT]);
    const EVENT_CARD = Object.freeze({
        11: { name: 'Bird Run', card: T('FUGLE & ROVFUGL'), order: 7 },
        10: { name: 'Neon Encore', card: T('RIGGE & BOLDE'), order: 8 },
        12: { name: 'Stormline', card: T('VIND & GENSTANDE'), order: 9 },
        13: { name: 'Sky Relay', card: T('PORTE & KLOKKE'), order: 10 },
        14: { name: 'Svæv', card: T('GLID & OPVIND'), order: 11 },
        15: { name: 'Fuglesværm', card: T('FLOK & FORMATION'), order: 12 },
    });

    function isEventLevel(level = currentLevel) {
        return level.modeGroup === 'event';
    }

    const ASSET_PATHS = {
        ...Object.fromEntries(Object.entries(ADVENTURE_ART).flatMap(([theme, art]) => [
            [`${theme}Sky`, `assets/adventure/${theme}/sky.webp`],
            [`${theme}Bg1`, `assets/adventure/${theme}/bg1.webp`],
            [`${theme}Bg2`, `assets/adventure/${theme}/bg2.webp`],
            [`${theme}Mg`, `assets/adventure/${theme}/mg.webp`],
            [`${theme}Fg`, `assets/adventure/${theme}/fg.webp`],
            ...Object.entries(art.obstacles).map(([key, file]) => [key, `assets/adventure/${theme}/${file}.webp`]),
        ])),
        desertSky: 'assets/unity/levels/desert/sky.webp',
        desertBg1: 'assets/unity/levels/desert/bg-1.webp',
        desertBg2: 'assets/unity/levels/desert/bg-2.webp',
        desertMg: 'assets/unity/levels/desert/mg.webp',
        desertFg: 'assets/unity/levels/desert/fg.webp',
        flappySky: 'assets/unity/levels/flappy/sky.webp',
        flappyBg: 'assets/unity/levels/flappy/bg.webp',
        flappyMg: 'assets/unity/levels/flappy/mg.webp',
        flappyFg: 'assets/unity/levels/flappy/fg.webp',
        jungleBg: 'assets/unity/levels/jungle/bg.webp',
        jungleMg: 'assets/unity/levels/jungle/mg.webp',
        jungleFg: 'assets/unity/levels/jungle/fg.webp',
        jungleTop: 'assets/unity/levels/jungle/top-foreground.webp',
        jungleGround: 'assets/unity/levels/jungle/ground.webp',
        jungleCanopyLeft: 'assets/unity/levels/jungle/canopy-left.webp',
        jungleCanopyRight: 'assets/unity/levels/jungle/canopy-right.webp',
        jungleStoneLeft: 'assets/unity/levels/jungle/stone-left.webp',
        jungleStoneRight: 'assets/unity/levels/jungle/stone-right.webp',
        happySky: 'assets/unity/levels/happy-sky/sky.webp',
        happyBg: 'assets/unity/levels/happy-sky/bg.webp',
        happyMg: 'assets/unity/levels/happy-sky/mg.webp',
        tunnelSky: 'assets/unity/levels/tunnel/sky.webp',
        tunnelBg1: 'assets/unity/levels/tunnel/bg-1.webp',
        tunnelBg2: 'assets/unity/levels/tunnel/bg-2.webp',
        tunnelMg: 'assets/unity/levels/tunnel/mg.webp',
        tunnelFg: 'assets/unity/levels/tunnel/fg.webp',
        desertTerrain: 'assets/unity/props/desert-terrain.webp',
        desertRuin: 'assets/obstacles/desert-ruin.webp',
        desertBanded: 'assets/obstacles/desert-banded.webp',
        desertEtched: 'assets/obstacles/desert-etched.webp',
        flappyPipe: 'assets/unity/props/flappy-pipe.webp',
        flappyPipeBlue: 'assets/unity/props/flappy-pipe-blue.webp',
        flappyPipeGold: 'assets/unity/props/flappy-pipe-gold.webp',
        flappyCopper: 'assets/obstacles/flappy-copper.webp',
        flappyPearl: 'assets/obstacles/flappy-pearl.webp',
        jungleStone: 'assets/obstacles/jungle-stone.webp',
        happyCoral: 'assets/obstacles/happy-coral.webp',
        edmStage: 'assets/edm/concert-stage.webp',
        edmMirror: 'assets/edm/mirror-ball.webp',
        edmSpeaker: 'assets/edm/speaker-stack.webp',
        edmTruss: 'assets/edm/light-truss.webp',
        edmCenterRig: 'assets/edm/center-led.webp',
        edmCrowdBall: 'assets/edm/crowd-ball.webp',
        edmCrowd: 'assets/edm/crowd-foreground.webp',
        birdRunBird: 'assets/bird-run/crosswind-bird-play.webp',
        birdRunSwift: 'assets/bird-run/amber-swift-play.webp',
        birdRunKite: 'assets/bird-run/violet-kite-play.webp',
        birdRunCloud: 'assets/bird-run/cloud-bank-play.webp',
        stormSky: 'assets/stormline/storm-sky.webp',
        stormSail: 'assets/stormline/wind-sail.webp',
        stormSock: 'assets/stormline/windsock.webp',
        stormUmbrella: 'assets/stormline/umbrella-play.webp',
        stormBranch: 'assets/stormline/branch-play.webp',
        stormSign: 'assets/v2/g4/stormline/sign.webp',
        stormCar: 'assets/v2/g4/stormline/car.webp',
        relayGate: 'assets/v2/g4/skyrelay/gate.webp',
        relayGateLit: 'assets/v2/g4/skyrelay/gate-lit.webp',
        relaySkyRing: 'assets/v2/g4/skyrelay/sky-ring.webp',
        relayGateFront: 'assets/sky-relay/flight-gate-foreground-play.webp',
        relayChime: 'assets/v2/g4/skyrelay/chime.webp',
        stormSkyDark: 'assets/v2/g4/stormline/sky-dark.webp',
        stormGust: 'assets/v2/g4/stormline/gust.webp',
        stormLeaves: 'assets/v2/g4/stormline/leaves-burst.webp',
        eventMetal: 'assets/powerup-prototypes/metal.webp',
        eventHyper: 'assets/powerup-prototypes/hyper.webp',
        eventDouble: 'assets/powerup-prototypes/double.webp',
        eventFlap: 'assets/powerup-prototypes/flap.webp',
        reversePickup: 'assets/powerup-prototypes/reverse.webp',
        goldFeather: 'assets/powerup-prototypes/gold-feather.webp',
        rainbow: 'assets/unity/props/rainbow-normal.webp',
        star: 'assets/unity/collectibles/star.webp',
        blueGlow: 'assets/unity/powerups/blue-glow.webp',
        whiteGlow: 'assets/unity/powerups/white-glow.webp',
        yellowGlow: 'assets/unity/powerups/yellow-glow.webp',
        lightning: 'assets/unity/powerups/lightning.webp',
        powerupWing: 'assets/unity/powerups/wing.webp',
        shieldPickup: 'assets/unity/powerups/shield-pickup.webp',
        magnetPickup: 'assets/unity/powerups/magnet-pickup.webp',
        focusPickup: 'assets/unity/powerups/focus-pickup.webp',
        shieldCharge: 'assets/unity/powerups/shield-charge.webp',
        feather: 'assets/unity/particles/feather.webp',
        shieldSplinter: 'assets/unity/particles/shield-splinter.webp',
        shieldSplinterOrange: 'assets/unity/particles/shield-splinter-orange.webp',
        happyPipeBlue: 'assets/unity/props/happy-pipe/pipe-blue.webp',
        happyPipeBlueTop: 'assets/unity/props/happy-pipe/pipe-blue-top.webp',
        happyPipeGreen: 'assets/unity/props/happy-pipe/pipe-green.webp',
        happyPipeGreenTop: 'assets/unity/props/happy-pipe/pipe-green-top.webp',
        happyPipePurple: 'assets/unity/props/happy-pipe/pipe-purple.webp',
        happyPipePurpleTop: 'assets/unity/props/happy-pipe/pipe-purple-top.webp',
        happyPipeRed: 'assets/unity/props/happy-pipe/pipe-red.webp',
        happyPipeRedTop: 'assets/unity/props/happy-pipe/pipe-red-top.webp',
        happyPipeYellow: 'assets/unity/props/happy-pipe/pipe-yellow.webp',
        happyPipeYellowTop: 'assets/unity/props/happy-pipe/pipe-yellow-top.webp',
        happyEyeLeft: 'assets/unity/props/happy-pipe/eye-left.webp',
        happyEyeRight: 'assets/unity/props/happy-pipe/eye-right.webp',
        happyEyeLeftClosed: 'assets/unity/props/happy-pipe/eye-left-closed.webp',
        happyEyeRightClosed: 'assets/unity/props/happy-pipe/eye-right-closed.webp',
        happyMouth1: 'assets/unity/props/happy-pipe/mouth-1.webp',
        happyMouth2: 'assets/unity/props/happy-pipe/mouth-2.webp',
        happyMouth3: 'assets/unity/props/happy-pipe/mouth-3.webp',
    };

    for (let index = 0; index < 3; index += 1) {
        ASSET_PATHS[`spider${index}`] = `assets/unity/props/spider-${String(index).padStart(2, '0')}.webp`;
    }
    for (let index = 0; index < 18; index += 1) {
        ASSET_PATHS[`spiderCatch${index}`] = `assets/unity/props/spider-catch-${String(index).padStart(2, '0')}.webp`;
    }
    for (let index = 0; index < 7; index += 1) {
        ASSET_PATHS[`snake${index}`] = `assets/v2/g6/snake/idle-${index}.webp`;
    }
    for (let index = 0; index < 5; index += 1) {
        ASSET_PATHS[`snakeJump${index}`] = `assets/v2/g6/snake/jump-${index}.webp`;
    }
    for (let index = 0; index < 3; index += 1) {
        ASSET_PATHS[`snakeCatch${index}`] = `assets/v2/g6/snake/catch-${index}.webp`;
    }

    // ---------- Grafikrunde 2 (4. okt.): pickups, effects, deaths, EDM and Stormline ----------
    Object.assign(ASSET_PATHS, {
        star: 'assets/v2/pickups/star.webp',
        goldFeather: 'assets/v2/pickups/feather.webp',
        eventMetal: 'assets/v2/pickups/pu-heavy.webp',
        eventHyper: 'assets/v2/pickups/pu-hyper.webp',
        eventDouble: 'assets/v2/pickups/pu-double.webp',
        eventFlap: 'assets/v2/pickups/pu-flap.webp',
        reversePickup: 'assets/v2/pickups/pu-reverse.webp',
        shieldPickup: 'assets/v2/pickups/pu-shield.webp',
        magnetPickup: 'assets/v2/pickups/pu-magnet.webp',
        focusPickup: 'assets/v2/pickups/pu-focus.webp',
        edmStage: 'assets/v2/edm/sky.webp',
        edmSpeaker: 'assets/v2/edm/speaker.webp',
        edmCrowd: 'assets/v2/edm/crowd.webp',
        stormSky: 'assets/v2/stormline/sky.webp',
        stormSail: 'assets/v2/stormline/sail.webp',
        stormUmbrella: 'assets/v2/stormline/umbrella.webp',
        stormBranch: 'assets/v2/stormline/branch.webp',
        v2EdmTruss: 'assets/v2/edm/truss.webp',
        v2Warning: 'assets/v2/fx/warning.webp',
        v2FeatherPuff: 'assets/v2/fx/feather-puff.webp',
        v2Sparkle: 'assets/v2/fx/sparkle.webp',
        v2Smoke0: 'assets/v2/fx/smoke-1.webp',
        v2Smoke1: 'assets/v2/fx/smoke-2.webp',
        v2Smoke2: 'assets/v2/fx/smoke-3.webp',
        v2WindSwirl: 'assets/v2/fx/wind-swirl.webp',
        v2Bubble: 'assets/v2/pickups/bubble.webp',
        g4AmbDust: 'assets/v2/g4/fx/ambient-dust.webp',
        g4AmbFirefly: 'assets/v2/g4/fx/ambient-firefly.webp',
        g4AmbSnow: 'assets/v2/g4/fx/ambient-snow.webp',
        g4AmbEmber: 'assets/v2/g4/fx/ambient-ember.webp',
        g4AmbLeaf: 'assets/v2/g4/fx/ambient-leaf.webp',
        g4AmbConfetti: 'assets/v2/g4/fx/ambient-confetti.webp',
        g4Trail: 'assets/v2/g4/fx/trail.webp',
        g4ComboBurst: 'assets/v2/g4/fx/combo-burst.webp',
        g6Bonk: 'assets/v2/g6/fx/bonk.webp',
        g7SwarmJoin: 'assets/v2/g7/swarm/join.webp',
        g7SwarmLose: 'assets/v2/g7/swarm/lose.webp',
        ...Object.fromEntries(['desert', 'jungle', 'sky'].flatMap((set) => [1, 2, 3, 4, 5].map((n) => [`sticker_${set}_${n}`, ['assets/v2/g6/stickers', `${set}-${n}.webp`].join('/')]))),
        g6LevelUp: 'assets/v2/g6/fx/level-up.webp',
        g6RecordFlag: 'assets/v2/g6/fx/record-flag.webp',
        g4StarPop: 'assets/v2/g4/fx/star-pop.webp',
        g4Festival: 'assets/v2/g4/edm/festival-bg.webp',
        g4MedalRing: 'assets/v2/g4/ui/medal-ring.webp',
        g5EggPickup: 'assets/v2/g5/egg/egg-pickup.webp',
        g5Hatch0: 'assets/v2/g5/egg/hatch-1.webp', g5Hatch1: 'assets/v2/g5/egg/hatch-2.webp', g5Hatch2: 'assets/v2/g5/egg/hatch-3.webp', g5Hatch3: 'assets/v2/g5/egg/hatch-4.webp',
        v2PuGrow: 'assets/v2/pickups/pu-grow.webp',
        v2PuShrink: 'assets/v2/pickups/pu-shrink.webp',
        v2Bonk: 'assets/v2/fx/bonk.webp',
        v2EdmStage: 'assets/v2/edm/stage.webp',
        v2DjMix: 'assets/v2/edm/dj-mix.webp',
        v2DjMove1: 'assets/v2/edm/dj-move-1.webp',
        v2DjMove2: 'assets/v2/edm/dj-move-2.webp',
        v2DjUp: 'assets/v2/edm/dj-both-wings-up.webp',
        v2Crowd0: 'assets/v2/edm/crowd-1.webp',
        v2Crowd1: 'assets/v2/edm/crowd-2.webp',
        v2Crowd2: 'assets/v2/edm/crowd-3.webp',
    });
    for (let i = 0; i < 6; i += 1) {
        ASSET_PATHS[`v2SpiderWrap${i}`] = `assets/v2/deaths/spider-wrap-${i + 1}.webp`;
        ASSET_PATHS[`v2HawkCarry${i}`] = `assets/v2/deaths/hawk-carry-${i + 1}.webp`;
    }
    for (let i = 0; i < 3; i += 1) ASSET_PATHS[`v2WebStuck${i}`] = `assets/v2/deaths/web-stuck-${i + 1}.webp`;

    const BASE_ASSET_KEYS = [
        'desertSky', 'desertBg1', 'desertBg2', 'desertMg', 'desertFg',
        'star', 'blueGlow', 'whiteGlow', 'yellowGlow', 'lightning',
        'powerupWing', 'shieldPickup', 'magnetPickup', 'focusPickup', 'shieldCharge',
        'feather', 'shieldSplinter', 'shieldSplinterOrange',
        'eventMetal', 'eventHyper', 'eventDouble', 'eventFlap', 'reversePickup', 'goldFeather',
        'v2Warning', 'v2FeatherPuff', 'v2Sparkle', 'v2Smoke0', 'v2Smoke1', 'v2Smoke2', 'v2WindSwirl', 'v2Bubble',
        'v2PuGrow', 'v2PuShrink', 'v2Bonk',
        'g4AmbDust', 'g4AmbFirefly', 'g4AmbSnow', 'g4AmbEmber', 'g4AmbLeaf', 'g4AmbConfetti', 'g4Trail', 'g4ComboBurst', 'g4StarPop',
        'g5EggPickup', 'g5Hatch0', 'g5Hatch1', 'g5Hatch2', 'g5Hatch3',
    ];
    const LEVEL_ASSET_KEYS = Object.freeze({
        desert: ['desertTerrain', 'desertRuin', 'desertBanded', 'desertEtched'],
        edm: ['edmStage', 'edmMirror', 'edmSpeaker', 'edmTruss', 'edmCenterRig', 'edmCrowdBall', 'edmCrowd'],
        birdRun: ['happySky', 'birdRunBird', 'birdRunSwift', 'birdRunKite', 'birdRunCloud'],
        stormline: ['stormSky', 'stormSail', 'stormSock', 'stormUmbrella', 'stormBranch',
            'stormSign', 'stormCar'],
        skyRelay: ['happySky', 'happyMg', 'relayGate', 'relayGateFront', 'relayChime'],
        ...Object.fromEntries(Object.entries(ADVENTURE_ART).map(([theme, art]) => [theme,
            [`${theme}Sky`, `${theme}Bg1`, `${theme}Bg2`, `${theme}Mg`, `${theme}Fg`, ...Object.keys(art.obstacles)]])),
        tunnel: ['tunnelSky', 'tunnelBg1', 'tunnelBg2', 'tunnelMg', 'tunnelFg'],
        flappy: ['flappySky', 'flappyBg', 'flappyMg', 'flappyFg', 'flappyPipe', 'flappyPipeBlue', 'flappyPipeGold', 'flappyCopper', 'flappyPearl'],
        jungle: [
            'jungleBg', 'jungleMg', 'jungleFg', 'jungleTop', 'jungleGround',
            'jungleCanopyLeft', 'jungleCanopyRight', 'jungleStoneLeft', 'jungleStoneRight', 'jungleStone',
            ...Array.from({ length: 3 }, (_, index) => `spider${index}`),
            ...Array.from({ length: 18 }, (_, index) => `spiderCatch${index}`),
            ...Array.from({ length: 7 }, (_, index) => `snake${index}`),
            ...Array.from({ length: 5 }, (_, index) => `snakeJump${index}`),
            ...Array.from({ length: 3 }, (_, index) => `snakeCatch${index}`),
        ],
        happySky: [
            'happySky', 'happyBg', 'happyMg', 'rainbow', 'happyCoral',
            'happyPipeBlue', 'happyPipeBlueTop', 'happyPipeGreen', 'happyPipeGreenTop',
            'happyPipePurple', 'happyPipePurpleTop', 'happyPipeRed', 'happyPipeRedTop',
            'happyPipeYellow', 'happyPipeYellowTop', 'happyEyeLeft', 'happyEyeRight',
            'happyEyeLeftClosed', 'happyEyeRightClosed', 'happyMouth1', 'happyMouth2', 'happyMouth3',
        ],
    });

    // ---------- New-style art (docs: grafikplan) ----------
    // assets/v2/manifest.json lists what has been delivered: { "heroes": [...], "levels": [...] }.
    // Anything listed overrides the original art; anything missing keeps the original.
    const V2 = { heroes: new Set(), levels: new Set(), ready: false };
    const manifest_extras = new Set();
    const V2_LEVEL_FOLDER = Object.freeze({ desert: 'desert', jungle: 'jungle', happySky: 'happysky', flappy: 'tap', tunnel: 'tunnel' });
    const V2_HERO_FOLDER = Object.freeze({
        bert: 'bert', blue: 'blue', block: 'block', brain: 'brain', eagle: 'eagle', mecha: 'mecha', noir: 'noir', vulture: 'vulture',
        sugar: 'sugar', moss: 'moss', ink: 'ink', prism: 'prism', pingo: 'pingo', mogens: 'mogens', ninja: 'ninja', pakke: 'pakke', gold: 'gold', eggbert: 'eggbert',
        // Round 11: creator heroes (nicknames until each creator has approved).
        pixelara: 'pixelara', skyggeravn: 'skyggeravn', turbokolibri: 'turbokolibri', kongeaben: 'kongeaben', tukantwist: 'tukantwist',
        epicMalthe: 'epic-malthe', epicJohan: 'epic-johan', epicSos: 'epic-sos', epicThor: 'epic-thor', epicFan: 'fanbert', epicCoop: 'coopinc',
    });
    // Existing art keys that simply point at a new file once the level is delivered.
    const V2_KEY_SWAPS = Object.freeze({
        desert: { desertBanded: 'pillar-banded', desertEtched: 'pillar-etched', desertRuin: 'pillar-ruin' },
        jungle: {
            jungleStone: 'rock',
            v2CanopyLeft: 'canopy-left',
            v2CanopyRight: 'canopy-right',
            ...Object.fromEntries([0, 1, 2, 3, 4, 5].map((i) => [`spider${i}`, `fit-spider-idle-${i + 1}`])),
            ...Object.fromEntries(Array.from({ length: 18 }, (_, i) => [`spiderCatch${i}`, `fit-spider-catch-${Math.floor(i / 3) + 1}`])),
            // The old snake is back (feedback 10. okt.): coils, a sudden hop, and eyes peeking
            // out between the coils after a catch. It stays until its redrawn version arrives.
        },
        happySky: { rainbow: 'rainbow', v2Tower0: 'tower-happy', v2Tower1: 'tower-sleepy', v2Tower2: 'tower-cheeky', v2Balloon: 'balloon' },
        flappy: { flappyPipe: 'chimney-brick', flappyPipeBlue: 'chimney-stone', flappyPipeGold: 'tower-gold', flappyCopper: 'tower-copper', flappyPearl: 'chimney-stone' },
        tunnel: { v2TunnelGlow: 'tunnel-glow', v2StarGate: 'star-gate' },
    });
    const v2LayerKeys = (kind) => ['Sky', 'Bg1', 'Bg2', 'Mg', 'Fg'].map((part) => `v2_${kind}_${part}`);
    // Layer y positions are measured per level: each layer reaches down to where
    // the nearer layer becomes solid, so no sky shows through as a band.
    const V2_LAYER_Y = Object.freeze({
        desert: [252, 181, 445, 520], jungle: [237, 185, 439, 520], happySky: [382, 239, 480, 520],
        flappy: [159, 111, 364, 520], tunnel: [188, 176, 428, 520],
    });
    const v2Layers = (kind) => {
        const [sky, bg1, bg2, mg, fg] = v2LayerKeys(kind);
        const [y1, y2, y3, y4] = V2_LAYER_Y[kind];
        return [
            { image: sky, y: 0, height: 720, factor: 0.03 },
            { image: bg1, y: y1, height: 190, factor: 0.06 },
            { image: bg2, y: y2, height: 400, factor: 0.1 },
            { image: mg, y: y3, height: 200, factor: 0.18 },
            // The near layer is drawn in front by drawForeground(), set low so only its top shows.
        ];
    };
    function levelAssetKeys(kind) {
        const base = LEVEL_ASSET_KEYS[kind] || [];
        const extra = [];
        if (kind === 'poop' && ASSET_PATHS.v2LampPost) extra.push('v2LampPost');
        if (kind === 'edm' && ASSET_PATHS.v2SmokeCannon) extra.push('v2SmokeCannon');
        if (kind === 'edm') extra.push('v2EdmTruss', 'v2EdmStage', 'v2Crowd0', 'v2Crowd1', 'v2Crowd2', 'v2DjMix', 'v2DjMove1', 'v2DjMove2', 'v2DjUp', 'g4Festival');
        if (kind === 'jungle') {
            for (let i = 0; i < 6; i += 1) extra.push(`v2SpiderWrap${i}`);
            for (let i = 0; i < 3; i += 1) extra.push(`v2WebStuck${i}`);
        }
        if (kind === 'birdRun') for (let i = 0; i < 6; i += 1) extra.push(`v2HawkCarry${i}`);
        if (kind === 'skyRelay') extra.push('relayGateLit', 'relaySkyRing');
        if (kind === 'desert') extra.push('g7SwarmJoin', 'g7SwarmLose');
        const stickerSet = { desert: 'desert', jungle: 'jungle', happySky: 'sky' }[kind];
        if (stickerSet) for (let n = 1; n <= 5; n += 1) extra.push(`sticker_${stickerSet}_${n}`);
        if (kind === 'glide') {
            [['v2Balloon', 'assets/v2/levels/happysky/balloon.webp'],
                ['g7GlideSky', 'assets/v2/g7/glide/sky.webp'], ['g7GlideBg1', 'assets/v2/g7/glide/bg1.webp'], ['g7GlideBg2', 'assets/v2/g7/glide/bg2.webp'],
                ['g7GlideFg', 'assets/v2/g7/glide/fg.webp'], ['g7Thermal', 'assets/v2/g7/glide/thermal.webp'],
                ['g7Hill0', 'assets/v2/g7/glide/hill-1.webp'], ['g7Hill1', 'assets/v2/g7/glide/hill-2.webp'], ['g7Hill2', 'assets/v2/g7/glide/hill-3.webp'],
                ['g7Heat0', 'assets/v2/g7/glide/thermal-source-1.webp'], ['g7Heat1', 'assets/v2/g7/glide/thermal-source-2.webp'], ['g7Heat2', 'assets/v2/g7/glide/thermal-source-3.webp'],
            ].forEach(([key, path]) => { ASSET_PATHS[key] ||= path; extra.push(key); });
        }
        if (kind === 'stormline') extra.push('stormSkyDark', 'stormGust', 'stormLeaves');
        if ((kind === 'birdRun' || kind === 'skyRelay' ) && V2.levels.has('happySky')) extra.push(...v2LayerKeys('happySky'));
        if (kind === 'birdRun' && ASSET_PATHS.v2HawkFly0) {
            for (let i = 0; i < 4; i += 1) extra.push(`v2HawkFly${i}`);
            for (let i = 0; i < 6; i += 1) extra.push(`v2HawkCatch${i}`);
        }
        if (!V2.levels.has(kind)) return [...base, ...extra];
        const swaps = Object.keys(V2_KEY_SWAPS[kind] || {}).filter((key) => !base.includes(key));
        return [...base, ...v2LayerKeys(kind), ...swaps, ...extra];
    }
    async function loadV2Manifest() {
        try {
            const response = await fetch(`assets/v2/manifest.json?v=${BUILD_VERSION}`, { cache: 'no-cache' });
            if (!response.ok) return;
            const manifest = await response.json();
            (manifest.heroes || []).forEach((hero) => { if (V2_HERO_FOLDER[hero]) V2.heroes.add(hero); });
            (manifest.levels || []).forEach((kind) => { if (V2_LEVEL_FOLDER[kind]) V2.levels.add(kind); });
            (manifest.extras || []).forEach((name) => manifest_extras.add(name));
        } catch (_) { /* No manifest: original art everywhere. */ }
        V2.levels.forEach((kind) => {
            const folder = `assets/v2/levels/${V2_LEVEL_FOLDER[kind]}`;
            ['sky', 'bg1', 'bg2', 'mg', 'fg'].forEach((file, index) => { ASSET_PATHS[v2LayerKeys(kind)[index]] = `${folder}/${file}.webp`; });
            Object.entries(V2_KEY_SWAPS[kind] || {}).forEach(([key, file]) => { ASSET_PATHS[key] = `${folder}/${file}.webp`; });
            [...UNITY_LEVELS, SWARM_EVENT].filter((level) => level.kind === kind).forEach((level) => { level.layers = v2Layers(kind); });
            const band = FOREGROUND_BANDS[kind];
            if (band) { band.image = v2LayerKeys(kind)[4]; band.y = 520; band.height = 200; }
        });
        if (manifest_extras.has('lamp-post')) ASSET_PATHS.v2LampPost = 'assets/v2/adventure/poop/lamp-post.webp';
        if (manifest_extras.has('hawk')) {
            for (let i = 0; i < 4; i += 1) ASSET_PATHS[`v2HawkFly${i}`] = `assets/v2/birdrun/predator-fly-${i + 1}.webp`;
            for (let i = 0; i < 6; i += 1) ASSET_PATHS[`v2HawkCatch${i}`] = `assets/v2/birdrun/predator-catch-${i + 1}.webp`;
        }
        if (manifest_extras.has('smoke-cannon')) ASSET_PATHS.v2SmokeCannon = 'assets/v2/adventure/edm/smoke-cannon.webp';
        V2.ready = true;
    }
    const loadedAssetKeys = new Set();

    const dom = {
        canvas: document.getElementById('gameCanvas'),
        mainMenu: document.getElementById('main-menu'),
        levelMenu: document.getElementById('level-menu'),
        gameOver: document.getElementById('game-over'),
        hud: document.getElementById('hud'),
        hudStrip: document.querySelector('#hud .hud-strip'),
        hudMenu: document.getElementById('hud-menu-btn'),
        loading: document.getElementById('loading'),
        levelGrid: document.getElementById('level-grid'),
        score: document.getElementById('score'),
        streak: document.getElementById('streak'),
        streakGuard: document.getElementById('streak-guard'),
        time: document.getElementById('time'),
        levelName: document.getElementById('hud-level'),
        lives: document.getElementById('hud-lives'),
        powerup: document.getElementById('powerup'),
        finalScore: document.getElementById('final-score'),
        finalStreak: document.getElementById('final-streak'),
        finalTime: document.getElementById('final-time'),
        finalHighscore: document.getElementById('final-highscore'),
        recordTime: document.getElementById('record-time'),
        recordStreak: document.getElementById('record-streak'),
        hint: document.getElementById('tap-hint'),
        shell: document.getElementById('game-shell'),
        menuHighscore: document.getElementById('menu-highscore'),
        menuBestLevel: document.getElementById('menu-best-level'),
        newHighscore: document.getElementById('new-highscore'),
        touchUp: document.getElementById('touch-up'),
        touchDown: document.getElementById('touch-down'),
        totalStars: document.getElementById('total-stars'),
        dailyName: document.getElementById('daily-name'),
        dailyDetail: document.getElementById('daily-detail'),
        dailyState: document.getElementById('daily-state'),
        dailyButton: document.getElementById('daily-btn'),
        menuBird: document.getElementById('menu-bird'),
        heroSelector: document.getElementById('hero-selector'),
        selectedHeroImage: document.getElementById('selected-hero-image'),
        selectedHeroName: document.getElementById('selected-hero-name'),
        heroModal: document.getElementById('hero-modal'),
        heroDetailName: document.getElementById('hero-detail-name'),
        heroDetailGoal: document.getElementById('hero-detail-goal'),
        heroFeathers: document.getElementById('hero-feathers'),
        heroBuy: document.getElementById('hero-buy-btn'),
        heroCancelBuy: document.getElementById('hero-cancel-buy'),
        pauseMenu: document.getElementById('pause-menu'),
        settingsModal: document.getElementById('settings-modal'),
        resultMedal: document.getElementById('result-medal'),
        resultProgress: document.getElementById('result-progress'),
        challengeButton: document.getElementById('challenge-btn'),
        settingMusic: document.getElementById('setting-music'),
        settingSfx: document.getElementById('setting-sfx'),
        settingHaptics: document.getElementById('setting-haptics'),
        settingLights: document.getElementById('setting-lights'),
        playerName: document.getElementById('player-name'),
        leaderboardModal: document.getElementById('leaderboard-modal'),
        leaderboardList: document.getElementById('leaderboard-list'),
        leaderboardStatus: document.getElementById('leaderboard-status'),
        boardPeriod: document.getElementById('board-period'),
        boardMode: document.getElementById('board-mode'),
        boardLevel: document.getElementById('board-level'),
        boardMetric: document.getElementById('board-metric'),
        missionsModal: document.getElementById('missions-modal'),
        missionList: document.getElementById('mission-list'),
        featherBalance: document.getElementById('feather-balance'),
        rescueLevel: document.getElementById('rescue-level'),
        rescueUpgrade: document.getElementById('rescue-upgrade-btn'),
        rescueWheelModal: document.getElementById('rescue-wheel-modal'),
        rescueWheel: document.getElementById('rescue-wheel'),
        rescueWheelBalance: document.getElementById('rescue-wheel-balance'),
        rescueWheelResult: document.getElementById('rescue-wheel-result'),
        rescueSpin: document.getElementById('rescue-spin-btn'),
        rescueEnd: document.getElementById('rescue-end-btn'),
        challengeModal: document.getElementById('challenge-modal'),
        nameModal: document.getElementById('name-modal'),
        poopButton: document.getElementById('poop-btn'),
        firstNameInput: document.getElementById('first-name-input'),
        saveFirstName: document.getElementById('save-first-name'),
        challengeCopy: document.getElementById('challenge-copy'),
        levelLockModal: document.getElementById('level-lock-modal'),
        levelLockPreview: document.getElementById('level-lock-preview'),
        levelLockTitle: document.getElementById('level-lock-title'),
        levelLockCopy: document.getElementById('level-lock-copy'),
        levelLockProgress: document.getElementById('level-lock-progress'),
        levelLockNumbers: document.getElementById('level-lock-numbers'),
        playQualification: document.getElementById('play-qualification'),
    };
    const ctx = dom.canvas.getContext('2d', { alpha: false, desynchronized: true });
    ctx.imageSmoothingEnabled = true;

    const assets = Object.create(null);
    const starGlowCache = new Map();
    const crowdFrames = [];
    const windLeaves = Array.from({ length: 14 }, (_, index) => ({
        x: (index * 263) % 1380 - 40,
        y: 171 + (index * 137) % 399,
        size: 14 + index % 3 * 3,
        drift: 66 + (index * 17) % 37,
        phase: index * 1.13,
    }));
    let edmSmokeStamp = null;
    const birdFrames = { bert: [], blue: [], block: [], brain: [], eagle: [], mecha: [], noir: [], vulture: [], sugar: [], moss: [], ink: [], prism: [],
        pingo: [], mogens: [], ninja: [], pakke: [], gold: [], eggbert: [], pixelara: [], skyggeravn: [], turbokolibri: [], kongeaben: [], tukantwist: [], epicMalthe: [], epicJohan: [], epicSos: [], epicThor: [], epicFan: [], epicCoop: [] };
    // Folder per hero. Epic heroes fall back to a stand-in until their own art is added.
    // Heroes redrawn in the shared style (see docs: grafikplan). Folder under assets/.
    const V2_FPS = 12;
    // Volumes follow the sliders in Lyd & feedback (default 70 %, overall lower than before).
    const volumeSetting = (name) => { const value = Number(BertMeta.settingValue?.(name)); return Number.isFinite(value) ? value : 0.7; };
    const musicVol = () => 0.45 * volumeSetting('musicVolume');
    const sfxVol = () => 0.45 * volumeSetting('sfxVolume');
    const focusVol = () => 0.7 * volumeSetting('musicVolume');
    const EXTRA_HERO_FOLDERS = Object.freeze({ pingo: 'pingo', mogens: 'mogens', ninja: 'ninjabert', pakke: 'pakkeb', gold: 'goldbert' });
    const EPIC_HEROES = Object.freeze({
        epicMalthe: { folder: 'epic-malthe', standIn: 'eagle' },
        epicJohan: { folder: 'epic-johan', standIn: 'block' },
        epicSos: { folder: 'epic-sos', standIn: 'sugar' },
        epicThor: { folder: 'epic-thor', standIn: 'mecha' },
        epicFan: { folder: 'fanbert', standIn: 'bert' },
        epicCoop: { folder: 'coopinc', standIn: 'bert' },
    });
    const menuHeroArt = Object.freeze({
        bert: 'assets/unity/ui/menu-bird.webp',
        blue: 'assets/unity/bird-blue/fly-00.webp',
        block: 'assets/klodsbert/up.webp',
        brain: 'assets/brainbird/up.webp',
        eagle: 'assets/skyclaw/up.webp',
        mecha: 'assets/mechabert/up.webp',
        noir: 'assets/noirwing/up.webp',
        vulture: 'assets/bonebeak/up.webp',
        sugar: 'assets/sugarrush/up.webp',
        moss: 'assets/mosshex/up.webp',
        ink: 'assets/inkbird/up.webp',
        prism: 'assets/prismwing/up.webp',
        pingo: 'assets/pingo/up.webp',
        mogens: 'assets/mogens/up.webp',
        ninja: 'assets/ninjabert/up.webp',
        pakke: 'assets/pakkeb/up.webp',
        gold: 'assets/goldbert/up.webp',
        eggbert: 'assets/heroes/eggbert/flap-03.webp',
        pixelara: 'assets/heroes/pixelara/flap-03.webp',
        skyggeravn: 'assets/heroes/skyggeravn/flap-03.webp',
        turbokolibri: 'assets/heroes/turbokolibri/flap-03.webp',
        kongeaben: 'assets/heroes/kongeaben/flap-03.webp',
        tukantwist: 'assets/heroes/tukantwist/flap-03.webp',
        epicMalthe: 'assets/epic-malthe/up.webp',
        epicJohan: 'assets/epic-johan/up.webp',
        epicSos: 'assets/epic-sos/up.webp',
        epicThor: 'assets/epic-thor/up.webp',
        epicFan: 'assets/fanbert/up.webp',
        epicCoop: 'assets/coopinc/up.webp',
    });
    const audio = Object.create(null);
    let currentLevel = UNITY_LEVELS[0];
    let lastFrame = performance.now();
    let lastRender = 0;
    let simulationAccumulator = 0;
    let lockedCardTrigger = null;
    let focusAudioPrimed = false;
    let leaderboardScope = 'global';
    let leaderboardRequestId = 0;
    let inspectedHero = 'bert';
    let pendingHeroPurchase = null;

    const state = {
        phase: 'menu',
        elapsed: 0,
        worldTime: 0,
        worldDistance: 0,
        stageIndex: -1,
        stageElapsed: 0,
        stageClock: 0,
        speed: currentLevel.startSpeed,
        difficulty: 1,
        nextSpawnAt: 0,
        nextPowerupAt: 20,
        nextFeatherAt: 40,
        feathersPicked: 0,
        deathCountdown: 0,
        score: 0,
        streak: 0,
        bestStreak: 0,
        highscore: 0,
        activePowerup: null,
        powerupEndsAt: 0,
        powerupReadyAt: { Shield: 0, Magnet: 0, Focus: 0, Guard: 0, Heavy: 0, Hyper: 0, Double: 0, Flap: 0, Reverse: 0 },
        eventPickupIndex: 0,
        shieldCharges: 0,
        streakGuardCharges: 0,
        guardNoticeUntil: 0,
        cleanRun: true,
        rescueUsed: false,
        focusPhase: 'idle',
        focusTransition: 0,
        focusCountdown: 0,
        focusRemaining: 0,
        focusSnapshotSpeed: 0,
        focusSnapshotDifficulty: 1,
        focusTargetSpeed: FOCUS_MIN_SPEED,
        focusTargetDifficulty: 1,
        invulnerableUntil: 0,
        birdsVisible: true,
        inputUp: false,
        inputDown: false,
        pointerHeld: false,
        activePointerId: null,
        inputStrength: 1,
        obstacleId: 0,
        spawnSpacing: 760,
        deathCause: null,
        deathDirection: null,
        deathObstacleId: null,
        deathCaptureElapsed: 0,
        deathCaptureX: 0,
        deathCaptureY: 0,
        orientationPaused: false,
        orientationAudio: null,
        pausedFrom: null,
        starsCollected: 0,
        rescueLives: 0,
        rescueNoticeUntil: 0,
        rescueNoticeText: '',
        continueUsed: false,
        rescueSpinPending: false,
        rescueWheelRotation: 0,
        worldBadge: null,
        worldBadgeUntil: 0,
        worldFinishDelay: 0,
        relayRoute: null,
        relayGates: [],
        relayResult: null,
        relayFlashUntil: 0,
        relayMessage: '',
        relayFinishDelay: 0,
        dailyKey: null,
        dailyTarget: 0,
        resultAnimation: 0,
        seed: 1,
        rngState: 1,
        ghostRecorder: null,
        completedGhost: [],
        challenge: null,
        pendingChallenge: null,
    };

    const bird = { x: BIRD.x, y: 320, velocity: 0, rotation: 0, animationTime: 0 };
    let obstacles = [];
    let collectibles = [];
    let particles = [];

    function image(url) {
        return new Promise((resolve, reject) => {
            const loaded = new Image();
            loaded.onload = () => resolve(loaded);
            loaded.onerror = () => reject(new Error(`Unable to load ${url}`));
            loaded.src = url;
        });
    }

    function sound(url, preload = 'auto') {
        if (/assets\/sfx\//.test(url)) window.BertSfx?.load(url.replace(/^.*\/|\.mp3$/g, ''), url);
        const loaded = new Audio(url);
        loaded.preload = preload;
        return loaded;
    }

    async function ensureAssetKeys(keys) {
        const missing = keys.filter((key) => !loadedAssetKeys.has(key));
        const loaded = await Promise.all(missing.map(async (name) => [name, await image(ASSET_PATHS[name])]));
        loaded.forEach(([name, loadedImage]) => {
            assets[name] = loadedImage;
            loadedAssetKeys.add(name);
        });
    }

    async function ensureLevelAssets(level) {
        await ensureAssetKeys(levelAssetKeys(level.kind));
        if (level.kind === 'edm' && !crowdFrames.length) warmCrowdFrames();
    }

    function warmCrowdFrames() {
        const source = assets.edmCrowd;
        if (!source?.naturalWidth) return;
        const width = source.naturalWidth;
        const height = source.naturalHeight;
        const overlay = document.createElement('canvas');
        overlay.width = width;
        overlay.height = height;
        const overlayCtx = overlay.getContext('2d');
        if (!overlayCtx) return;
        for (let pose = 0; pose < 3; pose += 1) {
            const frame = document.createElement('canvas');
            frame.width = width;
            frame.height = height;
            const painter = frame.getContext('2d');
            if (!painter) return;
            // The audience stays anchored while raised hands move in separate waves.
            painter.drawImage(source, 0, 46, width, height - 46, 0, 46, width, height - 46);
            overlayCtx.clearRect(0, 0, width, height);
            overlayCtx.globalCompositeOperation = 'source-over';
            for (let x = 0; x < width; x += 24) {
                const slice = Math.min(24, width - x);
                const wave = Math.sin(x / 83 + pose * Math.PI * 2 / 3) * 6;
                overlayCtx.drawImage(source, x, 0, slice, 76, x, wave, slice, 76);
            }
            overlayCtx.globalCompositeOperation = 'destination-in';
            const fade = overlayCtx.createLinearGradient(0, 32, 0, 75);
            fade.addColorStop(0, '#000');
            fade.addColorStop(1, 'transparent');
            overlayCtx.fillStyle = fade;
            overlayCtx.fillRect(0, 0, width, 76);
            painter.drawImage(overlay, 0, 0);
            crowdFrames.push(frame);
        }
    }

    function warmStarGlow() {
        for (const size of [48, 54]) {
            const canvas = document.createElement('canvas');
            canvas.width = canvas.height = size + 36;
            const glow = canvas.getContext('2d');
            glow.shadowColor = '#ffd632';
            glow.shadowBlur = 14;
            glow.drawImage(assets.star, 18, 18, size, size);
            starGlowCache.set(size, canvas);
        }
    }

    function applyV2HeroArt() {
        V2.heroes.forEach((hero) => {
            const src = `assets/heroes/${V2_HERO_FOLDER[hero]}/flap-03.webp`;
            menuHeroArtOverrides[hero] = src;
            document.querySelectorAll(`.hero-option[data-hero="${hero}"] img`).forEach((img) => { img.src = src; });
            if (hero === 'bert') document.querySelectorAll('.rescue-wheel-bert').forEach((img) => { img.src = src; });
        });
    }
    const menuHeroArtOverrides = {};

    async function loadAssets() {
        await loadV2Manifest();
        applyV2HeroArt();
        const focusSoundLoading = window.BertFocusAudio.create('assets/music/focus.mp3');
        const pointSoundLoading = window.BertStarAudio.create('assets/sfx/coin.mp3');
        await ensureAssetKeys(BASE_ASSET_KEYS);
        warmStarGlow();
        const generatedFrames = (folder) => Promise.all(['up', 'mid', 'glide', 'dead'].map((pose) => image(`assets/${folder}/${pose}.webp`)));
        // Heroes with new-style art skip their original frames entirely.
        const original = (hero, load) => (V2.heroes.has(hero) ? Promise.resolve(null) : load());
        const unityFrames = (folder) => () => Promise.all(Array.from({ length: 14 }, (_, index) => image(`assets/unity/${folder}/fly-${String(index).padStart(2, '0')}.webp`)));
        const [bert, blue, block, brain, eagle, mecha, noir, vulture, sugar, moss, ink, prism] = await Promise.all([
            original('bert', unityFrames('bird')),
            original('blue', unityFrames('bird-blue')),
            original('block', () => generatedFrames('klodsbert')),
            original('brain', () => generatedFrames('brainbird')),
            original('eagle', () => generatedFrames('skyclaw')),
            original('mecha', () => generatedFrames('mechabert')),
            original('noir', () => generatedFrames('noirwing')),
            original('vulture', () => generatedFrames('bonebeak')),
            original('sugar', () => generatedFrames('sugarrush')),
            original('moss', () => generatedFrames('mosshex')),
            original('ink', () => generatedFrames('inkbird')),
            original('prism', () => generatedFrames('prismwing')),
        ]);
        if (bert) birdFrames.bert.push(...bert);
        if (blue) birdFrames.blue.push(...blue);
        // New-style heroes: 8 wingbeat frames + glide + dead in assets/heroes/<id>/.
        // Loaded after the originals so an incomplete set falls back silently.
        // Only the chosen hero is waited for; the rest load quietly in the background.
        const loadV2Hero = async (hero) => {
            const folder = `heroes/${V2_HERO_FOLDER[hero]}`;
            try {
                const flaps = await Promise.all(Array.from({ length: 8 }, (_, index) => image(`assets/${folder}/flap-${String(index + 1).padStart(2, '0')}.webp`)));
                const optional = async (pose, fallback) => { try { return await image(`assets/${folder}/${pose}.webp`); } catch (_) { return fallback; } };
                const glide = await optional('glide', flaps[2]);
                const dead = await optional('dead', flaps[2]);
                const frames = [...flaps, glide, dead];
                frames.v2 = true;
                // Round 4: eyes closed (blink) and wide-eyed (scared), optional.
                const g4 = `assets/v2/g4/heroes/${V2_HERO_FOLDER[hero]}`;
                try { frames.blink = await image(`${g4}/blink.webp`); } catch (_) { /* none */ }
                try { frames.scared = await image(`${g4}/scared.webp`); } catch (_) { /* none */ }
                birdFrames[hero] = frames;
            } catch (_) { /* Keeps the original frames. */ }
        };
        const chosenHero = BertMeta.currentHero();
        if (V2.heroes.has(chosenHero)) await loadV2Hero(chosenHero);
        if (chosenHero !== 'bert' && V2.heroes.has('bert')) await loadV2Hero('bert');
        Promise.all([...V2.heroes].filter((hero) => hero !== chosenHero && hero !== 'bert').map(loadV2Hero));
        const setGeneratedAnimation = (hero, frames) => {
            if (!frames || birdFrames[hero]?.v2) return;
            const [up, mid, glide, dead] = frames;
            birdFrames[hero].push(up, up, mid, mid, glide, glide, glide, glide, mid, mid, up, up, mid, dead);
        };
        setGeneratedAnimation('block', block);
        setGeneratedAnimation('brain', brain);
        setGeneratedAnimation('eagle', eagle);
        setGeneratedAnimation('mecha', mecha);
        setGeneratedAnimation('noir', noir);
        setGeneratedAnimation('vulture', vulture);
        setGeneratedAnimation('sugar', sugar);
        setGeneratedAnimation('moss', moss);
        setGeneratedAnimation('ink', ink);
        setGeneratedAnimation('prism', prism);
        // Newer heroes load after the core set so they never delay the first flight.
        Promise.all(Object.entries(EXTRA_HERO_FOLDERS).filter(([hero]) => !V2.heroes.has(hero)).map(async ([hero, folder]) => {
            try { setGeneratedAnimation(hero, await generatedFrames(folder)); } catch (_) { /* Falls back to Bert. */ }
        }));
        // folder null = own art not delivered yet: borrow the stand-in without a failed request.
        Object.entries(EPIC_HEROES).forEach(async ([hero, { folder, standIn }]) => {
            if (V2.heroes.has(hero)) return;
            if (!folder) { birdFrames[hero] = birdFrames[standIn]; return; }
            try {
                setGeneratedAnimation(hero, await generatedFrames(folder));
            } catch (_) {
                birdFrames[hero] = birdFrames[standIn];
            }
        });

        audio.point = await pointSoundLoading;
        audio.explosion = sound('assets/sfx/explosion.mp3');
        audio.pop = sound('assets/sfx/pop.mp3');
        audio.music = sound('assets/music/classic.mp3', 'none');
        audio.music.loop = true;
        audio.music.volume = musicVol();
        audio.tunnel = sound('assets/music/tunnel.mp3', 'none');
        audio.tunnel.loop = true;
        audio.tunnel.volume = musicVol();
        audio.edm = sound('assets/music/edm.mp3', 'none');
        audio.edm.loop = true;
        audio.edm.volume = musicVol();
        Object.entries(EXTRA_MUSIC).forEach(([name, url]) => {
            audio[name] = sound(url, 'none');
            audio[name].loop = true;
            audio[name].volume = musicVol();
        });
        audio.menu = sound('assets/music/menu.mp3');
        audio.menu.loop = true;
        audio.menu.volume = musicVol() * 0.8;
        audio.focus = await focusSoundLoading;
        audio.focus.loop = true;
        audio.focus.volume = 0;
        audio.magnetUp = sound('assets/sfx/magnet-up.mp3');
        audio.magnetRunning = sound('assets/sfx/magnet-running.mp3');
        audio.magnetRunning.loop = true;
        audio.magnetRunning.volume = 0.3 * volumeSetting('sfxVolume');
        audio.magnetDown = sound('assets/sfx/magnet-down.mp3');
        audio.shieldOn = sound('assets/sfx/shield-on.mp3');
        audio.shieldBreak = sound('assets/sfx/shield-break.mp3');
        audio.shieldOff = sound('assets/sfx/shield-off.mp3');
        // Original sound effects made for this game (tools/make_sfx.py).
        audio.splat = sound('assets/sfx/splat.mp3');
        audio.drop = sound('assets/sfx/drop.mp3');
        audio.lava = sound('assets/sfx/lava.mp3');
        audio.whoosh = sound('assets/sfx/whoosh.mp3');
        audio.wind = sound('assets/sfx/wind.mp3');
        audio.crack = sound('assets/sfx/crack.mp3');
        audio.miss = sound('assets/sfx/miss.mp3');
        audio.ding = sound('assets/sfx/ding.mp3');
        audio.combo = sound('assets/sfx/combo.mp3');
        audio.fanfare = sound('assets/sfx/fanfare.mp3');
        audio.tick = sound('assets/sfx/tick.mp3');
        // Bert's made-up bird language: no real words, so it works in every language.
        ['yay', 'ohno', 'whoa', 'pip', 'prrt'].forEach((word) => { audio[`bert_${word}`] = sound(`assets/sfx/bert-${word}.mp3`); });
    }

    // The first touch anywhere unlocks Web Audio on iPhone.
    ['pointerdown', 'touchstart', 'keydown'].forEach((type) => window.addEventListener(type, () => window.BertSfx?.unlock(), { passive: true }));

    function primeFocusAudio() {
        if (focusAudioPrimed || !audio.focus || !BertMeta.settingEnabled('music')) return;
        if (typeof audio.focus.prime === 'function') {
            audio.focus.prime().then(() => { focusAudioPrimed = true; }).catch(() => {});
            return;
        }
        audio.focus.volume = 0;
        audio.focus.currentTime = 0;
        const started = audio.focus.play();
        Promise.resolve(started).then(() => {
            focusAudioPrimed = true;
        }).catch(() => {});
    }

    // Level tracks made in Suno (see docs/LYD_OG_LICENSER.md). Key = level kind.
    const EXTRA_MUSIC = Object.freeze({ flappy: 'assets/music/flappy.mp3', iceberg: 'assets/music/iceberg.mp3', harbor: 'assets/music/harbor.mp3', nightcity: 'assets/music/nightcity.mp3', volcano: 'assets/music/volcano.mp3', windfarm: 'assets/music/windfarm.mp3', poop: 'assets/music/poop.mp3' });
    const MUSIC_NAMES = ['music', 'tunnel', 'edm', 'menu', 'focus', ...Object.keys(EXTRA_MUSIC)];

    function playAudio(name) {
        const clip = audio[name];
        if (!clip) return;
        const isMusic = MUSIC_NAMES.includes(name);
        if (!BertMeta.settingEnabled(isMusic ? 'music' : 'sfx')) return;
        try {
            if (isMusic) {
                clip.play().catch(() => {});
            } else if (typeof clip.playOnce === 'function') {
                clip.playOnce();
            } else if (name === 'explosion' && !window.BertSfx?.has('explosion')) {
                // A missed star can end a streak repeatedly. Never clone the
                // original 2.5-second explosion clip for every break.
                if (!clip.paused && !clip.ended) return;
                clip.currentTime = 0;
                clip.volume = sfxVol();
                clip.play().catch(() => {});
            } else {
                const key = (clip.src || '').replace(/^.*\/|\.mp3.*$/g, '');
                if (window.BertSfx?.play(key, sfxVol())) return;
                const effect = clip.cloneNode();
                effect.volume = sfxVol();
                effect.play().catch(() => {});
            }
        } catch (_) {
            // Browser audio permissions must never interrupt the game loop.
        }
    }

    function stopMusic() {
        [...MUSIC_NAMES, 'magnetRunning'].forEach((name) => {
            const clip = audio[name];
            if (!clip) return;
            clip.pause();
            clip.currentTime = 0;
        });
        if (audio.music) {
            audio.music.volume = musicVol();
            audio.music.playbackRate = 1;
        }
        if (audio.tunnel) {
            audio.tunnel.volume = musicVol();
            audio.tunnel.playbackRate = 1;
        }
        if (audio.edm) audio.edm.volume = musicVol();
        Object.keys(EXTRA_MUSIC).forEach((name) => {
            if (audio[name]) { audio[name].volume = musicVol(); audio[name].playbackRate = 1; }
        });
        if (audio.focus) audio.focus.volume = 0;
    }

    function levelMusicName() {
        if (currentLevel.kind === 'edm') return 'edm';
        if (currentLevel.kind === 'tunnel') return 'tunnel';
        // Own track per level type when one exists; otherwise the Classic track.
        if (EXTRA_MUSIC[currentLevel.kind] && audio[currentLevel.kind]) return currentLevel.kind;
        return 'music';
    }

    function activeLevelMusic() {
        return audio[levelMusicName()];
    }

    function setMediaVolume(clip, value) {
        // HTMLMediaElement setters can reconfigure the mobile audio pipeline.
        // Keep the 2-second fades but only write when the change is audible.
        if (clip && (Math.abs(clip.volume - value) >= 0.02 || value === 0 || value === musicVol())) {
            if (clip.volume !== value) clip.volume = value;
        }
    }

    function resizeCanvas() {
        const viewport = window.visualViewport;
        const viewportWidth = Math.max(1, viewport?.width || window.innerWidth);
        const viewportHeight = Math.max(1, viewport?.height || window.innerHeight);
        const viewportLeft = viewport?.offsetLeft || 0;
        const viewportTop = viewport?.offsetTop || 0;
        // Spilfladen er mindst 16:9 og må fylde ud til 21:9 på brede telefoner.
        // Ekstra bredde lægges som margen i begge sider; Bert og spillogikken er uændret.
        const stageWidth = Math.min(viewportWidth, viewportHeight * MAX_ASPECT);
        const stageHeight = Math.min(viewportHeight, viewportWidth * 9 / 16);
        const logicalWidth = clamp(Math.round(VIEW.height * stageWidth / stageHeight), BASE_WIDTH, Math.round(VIEW.height * MAX_ASPECT));
        if (logicalWidth !== VIEW.width) {
            const previousBirdX = BIRD.x;
            VIEW.width = logicalWidth;
            VIEW.margin = logicalWidth - BASE_WIDTH;
            BIRD.x = BASE_BIRD_X + VIEW.margin / 2;
            bird.x += BIRD.x - previousBirdX;
        }
        Object.assign(dom.shell.style, {
            position: 'fixed',
            left: `${viewportLeft + (viewportWidth - stageWidth) / 2}px`,
            top: `${viewportTop + (viewportHeight - stageHeight) / 2}px`,
            width: `${stageWidth}px`,
            height: `${stageHeight}px`,
        });
        if (dom.canvas.width !== VIEW.width) dom.canvas.width = VIEW.width;
        if (dom.canvas.height !== VIEW.height) dom.canvas.height = VIEW.height;
        dom.canvas.style.width = '100%';
        dom.canvas.style.height = '100%';
    }

    function setVisible(element, visible) {
        element.classList.toggle('hidden', !visible);
    }

    function hideMenus() {
        setVisible(dom.mainMenu, false);
        setVisible(dom.levelMenu, false);
        setVisible(dom.gameOver, false);
        setVisible(dom.pauseMenu, false);
        setVisible(dom.heroModal, false);
        setVisible(dom.levelLockModal, false);
        setVisible(dom.rescueWheelModal, false);
    }

    function showMainMenu() {
        state.phase = 'menu';
        currentLevel = UNITY_LEVELS[0];
        BIRD.width = 124;
        BIRD.height = 113;
        obstacles = [];
        collectibles = [];
        particles = [];
        cancelPowerupsForDeath();
        clearTouchDirection();
        hideMenus();
        setVisible(dom.mainMenu, true);
        setVisible(dom.hud, false);
        updateMenuHighscore();
        updateMetaMenu();
        stopMusic();
        playAudio('menu');
        window.BertApp?.leaveGameMode();
    }

    // Eventyr as a map (feedback 9. okt., "like Mario"): the six worlds are stops on the
    // painted islands, joined by the dotted flight path. Each stop shows its medal or lock;
    // tapping it does exactly what tapping the world's card does.
    const MAP_STOPS = Object.freeze({ 21: [48.8, 22], 22: [84.8, 25.7], 24: [50.4, 75], 23: [16.8, 74], 20: [16.4, 26], 25: [86, 75.7] });
    function renderWorldMap(show) {
        let map = document.getElementById('world-map');
        if (!show) { map?.remove(); return; }
        if (!map) {
            map = document.createElement('div');
            map.id = 'world-map';
            map.className = 'world-map';
            dom.levelGrid.prepend(map);
        }
        map.replaceChildren();
        const pin = document.createElement('img');
        pin.className = 'map-pin'; pin.src = 'assets/v2/g4/map/pin.webp'; pin.alt = '';
        let pinPlaced = false;
        ADVENTURE_LEVELS.slice().sort((a, b) => a.modeOrder - b.modeOrder).forEach((level) => {
            const [left, top] = MAP_STOPS[level.id] || [50, 50];
            const status = adventureStatus(level);
            const best = loadHighscore(level.id);
            const medal = best >= 100 ? 'gold' : best >= 50 ? 'silver' : best >= 20 ? 'bronze' : '';
            const stop = document.createElement('button');
            stop.type = 'button';
            stop.className = `map-stop${status.unlocked ? '' : ' locked'}${medal ? ` medal-${medal}` : ''}`;
            stop.style.left = `${left}%`;
            stop.style.top = `${top}%`;
            stop.setAttribute('aria-label', `${level.name}${status.unlocked ? '' : ` · ${status.short}`}`);
            stop.innerHTML = `<b>${level.modeOrder}</b><span>${level.name}</span>${status.unlocked
                ? (medal ? `<img src="${['assets/v2/ui/medal', medal].join('-')}.webp" alt="">` : '')
                : `<small><img src="assets/adventure/ui/lock.webp" alt="">${status.short}</small>`}`;
            stop.addEventListener('click', () => dom.levelGrid.querySelector(`.level-card[data-level-id="${level.id}"]`)?.click());
            map.appendChild(stop);
            // "Du er her": the newest open world without a medal yet.
            if (!pinPlaced && status.unlocked && !medal) {
                pin.style.left = `${left + 4}%`; pin.style.top = `${top - 4}%`;
                map.appendChild(pin);
                pinPlaced = true;
            }
        });
    }

    // ---------- Rejsen (fase 2): every level is a stop on one long journey ----------
    // Desert → Jungle → Himlen → Byen → Tunnelen → Havnen → … → Fugleklat. Each stop shows
    // its three stars (bronze, silver, gold) or a lock; Bert sits on the last stop played.
    // The test worlds float above as balloons. Tapping a stop is the same as its card.
    const JOURNEY = Object.freeze([
        { area: T('Ørkenen'), ids: [1], bonus: [15] }, { area: T('Junglen'), ids: [4], bonus: [11] }, { area: T('Himlen'), ids: [5], bonus: [13, 14] },
        { area: T('Byen'), ids: [3, 6, 7] }, { area: T('Tunnelen'), ids: [2, 8, 9] },
        { area: T('Havnen'), ids: [21] }, { area: T('Natten'), ids: [22], bonus: [10] }, { area: T('Vinden'), ids: [24], bonus: [12] },
        { area: T('Vulkanen'), ids: [23] }, { area: T('Isen'), ids: [20] }, { area: T('Fugleklat-øen'), ids: [25] },
    ]);
    const AREA_ART = ['desert', 'jungle', 'sky', 'city', 'tunnel', 'harbor', 'night', 'wind', 'volcano', 'ice', 'poop'];
    const AREA_TINT = ['#f3c56b', '#5fbf5a', '#8fd3ff', '#7a8cff', '#2d2f6e', '#3aa6c9', '#272b58', '#7ed0f0', '#e2583a', '#bfe6ff', '#f7d77a'];
    function levelById(id) {
        return UNITY_LEVELS.find((l) => l.id === id) || ADVENTURE_LEVELS.find((l) => l.id === id) || EVENT_LEVELS.find((l) => l.id === id);
    }
    function stopIsOpen(level) {
        if (!level) return false;
        if (level.modeGroup === 'adventure' || level.modeGroup === 'event') return adventureStatus(level).unlocked;
        return unlockedLevels().some((l) => l.id === level.id);
    }
    // Ugens bonusbane: one bonus level a week is in the spotlight with double rewards.
    const BONUS_ROTATION = Object.freeze([13, 10, 11, 12, 14, 15]);
    // Round 9 art per bonus level: its own balloon on the map and banner on the front page.
    const BONUS_ART = Object.freeze({ 15: 'swarm', 11: 'birdrun', 13: 'skyrelay', 14: 'glide', 10: 'encore', 12: 'storm' });
    const bonusArt = (id, kind) => ['assets/v2/g9/bonus', `${kind}-${BONUS_ART[id]}.webp`].join('/');
    function weekNumber(date = new Date()) {
        const d = new Date(Date.UTC(date.getFullYear(), date.getMonth(), date.getDate()));
        d.setUTCDate(d.getUTCDate() + 4 - (d.getUTCDay() || 7));
        return Math.ceil(((d - new Date(Date.UTC(d.getUTCFullYear(), 0, 1))) / 86400000 + 1) / 7) + d.getUTCFullYear() * 53;
    }
    function weeklyBonusId() { return BONUS_ROTATION[weekNumber() % BONUS_ROTATION.length]; }
    function daysLeftInWeek() { const day = (new Date().getDay() + 6) % 7; return 7 - day; }
    function updateBonusPromo() {
        const card = document.getElementById('bonus-promo');
        if (!card) return;
        const level = levelById(weeklyBonusId());
        const lvlCard = dom.levelGrid.querySelector(`.level-card[data-level-id="${level.id}"]`);
        const thumb = lvlCard?.querySelector('.level-thumb');
        card.style.setProperty('--banner', `url('${bonusArt(level.id, 'banner')}')`);

        card.querySelector('strong').textContent = level.name;
        const open = adventureStatus(level).unlocked;
        card.querySelector('small').textContent = open ? T`2× FJER · ${daysLeftInWeek()} DAGE` : adventureStatus(level).short;
        card.classList.toggle('locked', !open);
    }

    function renderJourney() {
        let journey = document.getElementById('journey');
        if (!journey) {
            journey = document.createElement('div');
            journey.id = 'journey';
            journey.className = 'journey';
            dom.levelMenu.querySelector('.mode-tabs')?.insertAdjacentElement('beforebegin', journey);
        }
        dom.levelMenu.classList.add('journey-mode');
        // The test-world balloons sit in their own row under the map, big enough to tap.
        const balloonRow = document.getElementById('journey-balloons');
        if (balloonRow && balloonRow.previousElementSibling !== journey) journey.insertAdjacentElement('afterend', balloonRow);
        const last = Number(localStorage.getItem('bertTheBird_lastLevel')) || 1;
        const track = document.createElement('div');
        track.className = 'journey-track';
        const stops = [];
        let index = 0;
        JOURNEY.forEach((section, areaIndex) => {
            const area = document.createElement('div');
            area.className = 'journey-area';
            area.style.setProperty('--tint', AREA_TINT[areaIndex]);
            area.style.setProperty('--art', `url(assets/v2/g6/journey/area-${AREA_ART[areaIndex]}.webp)`);
            area.style.width = `${section.ids.length * 150 + (section.bonus?.length || 0) * 110 + 40}px`;
            area.innerHTML = `<span class="journey-area-name">${section.area}</span>`;
            section.ids.forEach((id, i) => {
                const level = levelById(id);
                if (!level) return;
                const open = stopIsOpen(level);
                const best = loadHighscore(id);
                const stars = (best >= 20) + (best >= 50) + (best >= 100);
                const card = dom.levelGrid.querySelector(`.level-card[data-level-id="${id}"]`);
                const thumb = card?.querySelector('.level-thumb');
                const art = thumb?.dataset.src || thumb?.src || '';
                const stop = document.createElement('button');
                stop.type = 'button';
                stop.className = `journey-stop${open ? '' : ' locked'}${id === last ? ' here' : ''}`;
                const top = index % 2 === 0 ? 54 : 66;
                stop.style.left = `${40 + i * 150}px`;
                stop.style.top = `${top}%`;
                const lockText = !open ? (level.modeGroup === 'adventure' ? adventureStatus(level).short : T('LÅST')) : '';
                stop.innerHTML = `<span class="journey-thumb" style="background-image:url('${art}')"><b>${index + 1}</b></span>`
                    + `<span class="journey-name">${level.name}</span>`
                    + (open ? `<span class="journey-stars">${[0, 1, 2].map((k) => `<i class="${k < stars ? 'on' : ''}">★</i>`).join('')}</span>`
                        : `<span class="journey-lock"><img src="assets/adventure/ui/lock.webp" alt="">${lockText}</span>`);
                stop.addEventListener('click', () => {
                    if (!card) return;
                    selectGameMode(card.dataset.mode);
                    card.click();
                });
                area.appendChild(stop);
                if (open && stars === 3) {
                    // Gold opens the mirrored version of the level.
                    const mirror = document.createElement('button');
                    mirror.type = 'button';
                    mirror.className = 'journey-mirror';
                    mirror.title = T('Spejlbanen');
                    mirror.textContent = '⇄';
                    mirror.style.left = `${40 + i * 150 + 88}px`;
                    mirror.style.top = `calc(${top}% - 44px)`;
                    mirror.addEventListener('click', (event) => { event.stopPropagation(); startLevel(id, { mirror: true }); });
                    area.appendChild(mirror);
                }
                stops.push({ stop, area, top, x: 40 + i * 150 });
                index += 1;
            });
            // Bonus stops: smaller balloons on a side branch, after the world's own stop.
            (section.bonus || []).forEach((id, b) => {
                const level = levelById(id);
                if (!level) return;
                const open = stopIsOpen(level);
                const best = loadHighscore(id);
                const stars = (best >= 20) + (best >= 50) + (best >= 100);
                const card = dom.levelGrid.querySelector(`.level-card[data-level-id="${id}"]`);
                const thumb = card?.querySelector('.level-thumb');
                const art = thumb?.dataset.src || thumb?.src || '';
                const spotlight = id === weeklyBonusId();
                const stop = document.createElement('button');
                stop.type = 'button';
                stop.className = `journey-stop bonus${open ? '' : ' locked'}${spotlight ? ' spotlight' : ''}`;
                stop.style.left = `${40 + section.ids.length * 150 + b * 110}px`;
                stop.style.top = '46%';
                stop.innerHTML = `<img class="bonus-path" src="assets/v2/g9/bonus/path.webp" alt="">`
                    + `<span class="journey-thumb" style="background-image:url('${art}')"><img class="bonus-balloon" src="${bonusArt(id, 'balloon')}" alt=""></span>`
                    + `<span class="journey-name">${level.name}</span>`
                    + (spotlight ? `<span class="bonus-week">${T('UGENS BONUS')}</span>` : '')
                    + (open ? `<span class="journey-stars">${[0, 1, 2].map((k) => `<i class="${k < stars ? 'on' : ''}">★</i>`).join('')}</span>`
                        : `<span class="journey-lock"><img src="assets/adventure/ui/lock.webp" alt="">${adventureStatus(level).short}</span>`);
                stop.addEventListener('click', () => { if (card) { selectGameMode('adventure'); card.click(); } });
                area.appendChild(stop);
            });
            track.appendChild(area);
        });
        document.getElementById('journey-balloons')?.replaceChildren();
        journey.replaceChildren(track);
        // Dotted path between stops, drawn after layout.
        requestAnimationFrame(() => {
            const svgNs = 'http://www.w3.org/2000/svg';
            const svg = document.createElementNS(svgNs, 'svg');
            svg.classList.add('journey-path');
            svg.setAttribute('width', String(track.scrollWidth));
            svg.setAttribute('height', String(track.clientHeight));
            const base = track.getBoundingClientRect();
            const points = stops.map(({ stop }) => {
                const r = stop.querySelector('.journey-thumb').getBoundingClientRect();
                return [r.left - base.left + r.width / 2 + track.scrollLeft, r.top - base.top + r.height / 2];
            });
            const path = document.createElementNS(svgNs, 'path');
            path.setAttribute('d', points.map(([x, y], i) => (i ? `S ${x - 60} ${y} ${x} ${y}` : `M ${x} ${y}`)).join(' '));
            svg.appendChild(path);
            track.prepend(svg);
            // Scroll so Bert's stop is in view.
            const here = track.querySelector('.journey-stop.here');
            if (here) journey.scrollLeft = Math.max(0, here.offsetLeft + here.parentElement.offsetLeft - journey.clientWidth / 2 + 60);
        });
    }

    function selectGameMode(mode = 'classic') {
        const selectedMode = ['classic', 'flappy', 'tunnel', 'adventure'].includes(mode) ? mode : 'classic';
        document.querySelectorAll('.mode-tab').forEach((button) => {
            const selected = button.dataset.mode === selectedMode;
            button.classList.toggle('selected', selected);
            button.setAttribute('aria-pressed', String(selected));
            button.setAttribute('aria-selected', String(selected));
            button.tabIndex = selected ? 0 : -1;
        });
        dom.levelGrid.dataset.mode = selectedMode;
        renderWorldMap(selectedMode === 'adventure');
        dom.levelGrid.querySelectorAll('.level-card').forEach((card) => {
            const hidden = card.dataset.mode !== selectedMode;
            card.classList.toggle('mode-hidden', hidden);
            card.hidden = hidden;
            card.setAttribute('aria-hidden', String(hidden));
            if (!hidden) {
                const preview = card.querySelector('.level-thumb');
                if (preview && !preview.src) preview.src = preview.dataset.src;
            }
        });
    }

    function showLevelMenu(mode = 'classic') {
        state.phase = 'levels';
        cancelPowerupsForDeath();
        clearTouchDirection();
        hideMenus();
        setVisible(dom.levelMenu, true);
        setVisible(dom.hud, false);
        selectGameMode(mode);
        updateLevelHighscores();
        renderJourney();
        const earned = BertWorldMastery.read(localStorage);
        for (const [id, buttonId] of [[10, 'edm-event-btn'], [11, 'bird-run-event-btn'], [12, 'stormline-event-btn']]) {
            const kicker = document.querySelector(`#${buttonId} .edm-event-kicker`);
            const goals = { 10: T('MÅL: 3 BOLDE'), 11: T('MÅL: ROVFUGL'), 12: T('MÅL: STORM') };
            if (kicker) kicker.textContent = earned[id] ? T('VERDEN KLARET · LOKALT') : goals[id];
        }
        updateMetaMenu();
        stopMusic();
        window.BertApp?.leaveGameMode();
    }

    function createLevelButtons() {
        dom.levelGrid.innerHTML = '';
        const eventCards = EVENT_LEVELS.map((event) => ({ ...event, name: EVENT_CARD[event.id].name,
            cardText: EVENT_CARD[event.id].card, modeOrder: EVENT_CARD[event.id].order }));
        [...UNITY_LEVELS, ...ADVENTURE_LEVELS, ...eventCards].forEach((level) => {
            const button = document.createElement('button');
            button.className = `level-card level-${level.id}`;
            button.dataset.mode = level.modeGroup === 'event' ? 'adventure' : modeForLevel(level);
            button.dataset.variant = level.variant;
            button.dataset.levelId = String(level.id);
            button.dataset.group = level.modeGroup || 'base';
            const thumbnail = `assets/unity/ui/previews/level-${level.id}.webp`;
            button.innerHTML = `
                <img class="level-thumb" data-src="${thumbnail}" alt="" decoding="async">
                <span class="level-card-copy">
                    <span class="level-id">${level.modeOrder}</span>
                    <span class="level-card-label">
                        <span class="level-card-title">${level.name}</span>
                        <span class="level-card-mode">${level.cardText}</span>
                    </span>
                    <span class="level-card-score">${T('REKORD')} <strong id="level-score-${level.id}">0</strong></span>
                </span>
                <span id="level-lock-${level.id}" class="level-card-lock"></span>
                <span class="level-unlock-track" aria-hidden="true"><i id="level-unlock-fill-${level.id}"></i></span>
            `;
            button.addEventListener('click', () => attemptLevel(level.id, button));
            dom.levelGrid.appendChild(button);
        });
        selectGameMode('classic');
        updateLevelHighscores();
    }

    function loadRecord(levelId) {
        const empty = { score: 0, streak: 0, time: 0 };
        try {
            const saved = JSON.parse(localStorage.getItem(`bertTheBird_record_v2_${levelId}`) || 'null');
            if (saved && [saved.score, saved.streak, saved.time].every((value) => Number.isFinite(value) && value >= 0)) {
                return { score: Math.floor(saved.score), streak: Math.floor(saved.streak), time: saved.time };
            }
            const legacy = Number.parseInt(localStorage.getItem(`bertTheBird_unity_level_${levelId}`) || '0', 10);
            return { ...empty, score: Number.isFinite(legacy) && legacy >= 0 ? legacy : 0 };
        } catch (_) {
            return empty;
        }
    }

    function loadHighscore(levelId) {
        return loadRecord(levelId).score;
    }

    function bestScoresByLevel() {
        return Object.fromEntries(UNITY_LEVELS.map((level) => [level.id, loadHighscore(level.id)]));
    }

    function progressionSnapshot() {
        const bestScores = bestScoresByLevel();
        const migrationKey = 'bertTheBird_legacy_unlocks_sprite_tiers_v1';
        let grandfatheredLevelIds = null;
        try {
            const stored = JSON.parse(localStorage.getItem(migrationKey) || 'null');
            if (Array.isArray(stored)) grandfatheredLevelIds = stored;
        } catch (_) { /* A broken migration value must not block the game. */ }
        if (!grandfatheredLevelIds) {
            grandfatheredLevelIds = [];
            for (const mode of ['classic', 'flappy', 'tunnel']) {
                const levels = UNITY_LEVELS.filter((level) => level.modeGroup === mode)
                    .sort((left, right) => left.modeOrder - right.modeOrder);
                for (let index = 1; index < levels.length; index += 1) {
                    const prior = levels[index - 1];
                    const next = levels[index];
                    if (bestScores[prior.id] < next.unlockScore) break;
                    grandfatheredLevelIds.push(next.id);
                }
            }
            try { localStorage.setItem(migrationKey, JSON.stringify(grandfatheredLevelIds)); }
            catch (_) { /* Private mode stays playable. */ }
        }
        const progression = BertMeta.progressionState(UNITY_LEVELS, bestScores, { grandfatheredLevelIds });
        if (BertMeta.hasTestAccess?.()) {
            Object.values(progression).forEach((status) => { status.unlocked = true; status.requirement = null; status.progress = 1; });
        }
        return progression;
    }

    function closeLockedLevel() {
        setVisible(dom.levelLockModal, false);
        lockedCardTrigger?.focus({ preventScroll: true });
        lockedCardTrigger = null;
    }

    function pendingTierRequirements(status) {
        return (status.requirements || []).filter((requirement) => !requirement.complete);
    }

    function scoreRequirementText(requirement) {
        const source = UNITY_LEVELS.find((candidate) => candidate.id === requirement.levelId);
        const missing = Math.max(0, requirement.score - requirement.current);
        return `${source?.name || `bane ${requirement.levelId}`}: ${requirement.current}/${requirement.score} point (${missing} mangler)`;
    }

    function showLockedLevel(level, status, trigger = null) {
        const pendingScores = pendingTierRequirements(status);
        const mission = status.missionRequirement;
        if (!status.requirement || !mission) return;
        lockedCardTrigger = trigger;
        dom.levelLockPreview.src = `assets/unity/ui/previews/level-${level.id}.webp`;
        dom.levelLockTitle.textContent = T`${level.name.toUpperCase()} ER LÅST`;
        const scoreCopy = pendingScores.length
            ? T`Klar hele trin ${level.modeOrder - 1}: ${pendingScores.map(scoreRequirementText).join(' · ')}.`
            : T`Alle pointkrav i trin ${level.modeOrder - 1} er klaret.`;
        const missionCopy = mission.complete
            ? T`${mission.target} missionsbelønninger er hentet.`
            : T`Hent ${mission.target} missionsbelønninger i alt; du har ${mission.current}.`;
        dom.levelLockCopy.textContent = T`${scoreCopy} ${missionCopy} Når begge krav er opfyldt, åbner hele trin ${level.modeOrder}.`;
        dom.levelLockProgress.style.width = `${Math.round(status.progress * 100)}%`;
        const completeScores = (status.requirements || []).filter((requirement) => requirement.complete).length;
        dom.levelLockNumbers.textContent = T`${completeScores}/${status.requirements.length} BANER · ${Math.min(mission.current, mission.target)}/${mission.target} MISSIONER`;
        if (!mission.complete) {
            dom.playQualification.dataset.action = 'missions';
            delete dom.playQualification.dataset.levelId;
            dom.playQualification.textContent = T('ÅBN DAGENS MISSIONER');
        } else {
            const nextRequirement = pendingScores[0] || status.requirement;
            const previous = UNITY_LEVELS.find((candidate) => candidate.id === nextRequirement.levelId);
            dom.playQualification.dataset.action = 'level';
            dom.playQualification.dataset.levelId = String(nextRequirement.levelId);
            dom.playQualification.textContent = `SPIL ${(previous?.name || T('KVALIFIKATIONSBANEN')).toUpperCase()}`;
        }
        setVisible(dom.levelLockModal, true);
        playAudio('pop');
        dom.playQualification.focus({ preventScroll: true });
    }

    function attemptLevel(levelId, trigger = null) {
        const adventure = ADVENTURE_LEVELS.find((level) => level.id === Number(levelId))
            || EVENT_LEVELS.find((level) => level.id === Number(levelId));
        if (adventure) {
            const status = adventureStatus(adventure);
            if (!status.unlocked) {
                trigger?.classList.remove('shake');
                void trigger?.offsetWidth;
                trigger?.classList.add('shake');
                playAudio('pop');
                window.BertApp?.showToast(status.long);
                return;
            }
            startLevel(Number(levelId));
            return;
        }
        const level = UNITY_LEVELS.find((candidate) => candidate.id === Number(levelId));
        const status = level ? progressionSnapshot()[level.id] : null;
        if (!level || !status) return;
        if (!status.unlocked) {
            showLockedLevel(level, status, trigger);
            return;
        }
        startLevel(level.id);
    }

    function unlockedLevels() {
        const progression = progressionSnapshot();
        return UNITY_LEVELS.filter((level) => progression[level.id]?.unlocked);
    }

    function nextLevelInMode(level) {
        return UNITY_LEVELS.find((candidate) => candidate.modeGroup === level.modeGroup && candidate.modeOrder === level.modeOrder + 1) || null;
    }

    function beatsRecord(run, record) {
        if (run.score !== record.score) return run.score > record.score;
        if (run.streak !== record.streak) return run.streak > record.streak;
        return run.time > record.time;
    }

    function saveRecord(levelId, run) {
        const previous = loadRecord(levelId);
        const improved = beatsRecord(run, previous);
        const record = improved ? run : previous;
        try {
            localStorage.setItem(`bertTheBird_record_v2_${levelId}`, JSON.stringify(record));
            localStorage.setItem(`bertTheBird_unity_level_${levelId}`, String(record.score));
        } catch (_) {
            // Private browsing and quota failures must never block game over.
        }
        return { record, improved };
    }

    function updateMenuHighscore() {
        const records = UNITY_LEVELS.map((level) => ({ level, score: loadHighscore(level.id) }));
        const best = records.reduce((winner, candidate) => candidate.score > winner.score ? candidate : winner, records[0]);
        dom.menuHighscore.textContent = String(best.score);
        dom.menuBestLevel.textContent = best.score > 0 ? T`Bedst på level ${best.level.id} · ${best.level.name}` : T('Ingen rekord endnu');
        applyOnboarding(best.score);
    }

    // The game has many systems; a new player meets them one at a time.
    // Stage 0 (never flown): only PLAY and Classic. Stage 1 (has a score): heroes,
    // quick play and missions. Stage 2 (bronze on Desert): Flappy, Tunnel, daily route, leaderboard.
    function applyOnboarding(bestScore) {
        const all = BertMeta.hasTestAccess?.();
        const flown = all || bestScore > 0;
        const desertBronze = all || loadHighscore(1) >= 20;
        const show = (id, visible) => document.getElementById(id)?.classList.toggle('hidden', !visible);
        show('hero-selector', flown);
        show('quick-play-btn', flown);
        show('missions-btn', flown);
        show('daily-btn', desertBronze);
        show('leaderboard-btn', desertBronze);
        document.querySelectorAll('.mode-tab').forEach((tab) => {
            const mode = tab.dataset.mode;
            const visible = mode === 'classic' || (mode === 'adventure' ? adventureOpen() : desertBronze);
            tab.classList.toggle('hidden', !visible);
        });
    }

    function updateLevelHighscores() {
        const progression = progressionSnapshot();
        UNITY_LEVELS.forEach((level) => {
            const element = document.getElementById(`level-score-${level.id}`);
            if (element) element.textContent = String(loadHighscore(level.id));
            const card = dom.levelGrid.querySelector(`[data-level-id="${level.id}"]`);
            const lock = document.getElementById(`level-lock-${level.id}`);
            const fill = document.getElementById(`level-unlock-fill-${level.id}`);
            const status = progression[level.id];
            if (!card || !status) return;
            card.disabled = false;
            card.classList.toggle('locked', !status.unlocked);
            card.removeAttribute('aria-disabled');
            card.setAttribute('aria-label', status.unlocked
                ? T`${level.name}, åben, personlig rekord ${loadHighscore(level.id)}`
                : T`${level.name}, låst. Tryk for at se oplåsningskravet`);
            if (status.unlocked) {
                lock.textContent = level.modeOrder === 1 ? T('STARTBANE') : T('LÅST OP');
                if (fill) fill.style.width = '100%';
            } else {
                const completeScores = (status.requirements || []).filter((requirement) => requirement.complete).length;
                const mission = status.missionRequirement;
                // Short and readable on the card; the full requirement opens on tap.
                lock.innerHTML = '';
                const icon = document.createElement('img'); icon.src = 'assets/adventure/ui/lock.webp'; icon.alt = ''; icon.className = 'lock-icon';
                lock.append(icon, document.createTextNode(T`LÅST · ${completeScores + Math.min(mission.current, mission.target)}/${status.requirements.length + mission.target}`));
                if (fill) fill.style.width = `${Math.round(status.progress * 100)}%`;
            }
        });
        const earnedBadges = BertWorldMastery.read(localStorage);
        [...ADVENTURE_LEVELS, ...EVENT_LEVELS].forEach((level) => {
            const element = document.getElementById(`level-score-${level.id}`);
            if (element) element.textContent = String(loadHighscore(level.id));
            const lock = document.getElementById(`level-lock-${level.id}`);
            const status = adventureStatus(level);
            const card = dom.levelGrid.querySelector(`[data-level-id="${level.id}"]`);
            card?.classList.toggle('locked', !status.unlocked);
            if (lock) {
                if (!status.unlocked) {
                    lock.innerHTML = '<img class="lock-icon" src="assets/adventure/ui/lock.webp" alt="">';
                    lock.append(document.createTextNode(status.short));
                } else {
                    lock.textContent = level.modeGroup === 'event' ? (earnedBadges[level.id] ? T('MÆRKE VUNDET') : T('TESTBANE')) : T('NY BANE');
                }
            }
            const fill = document.getElementById(`level-unlock-fill-${level.id}`);
            if (fill) fill.style.width = '100%';
        });
        const modeHelp = { classic: T('HOLD OP/NED'), flappy: T('TAP'), tunnel: T('PRÆCISION'), adventure: T('NYE VERDENER') };
        document.querySelectorAll('.mode-tab').forEach((tab) => {
            if (tab.dataset.mode === 'adventure') {
                const copy = tab.querySelector('small');
                const open = adventureOpen();
                tab.classList.toggle('locked-tab', !open);
                if (copy) {
                    if (open) copy.textContent = T`${ADVENTURE_LEVELS.length + EVENT_LEVELS.length} BANER · ${modeHelp.adventure}`;
                    else {
                        copy.innerHTML = '<img class="lock-icon" src="assets/adventure/ui/lock.webp" alt="">';
                        copy.append(document.createTextNode(T`${baseBronzeCount()}/${UNITY_LEVELS.length} BRONZE`));
                    }
                }
                return;
            }
            const levels = UNITY_LEVELS.filter((level) => level.modeGroup === tab.dataset.mode);
            const open = levels.filter((level) => progression[level.id]?.unlocked).length;
            const copy = tab.querySelector('small');
            if (copy) copy.textContent = T`${open}/${levels.length} ÅBNE · ${modeHelp[tab.dataset.mode]}`;
        });
        updateMenuHighscore();
    }

    function renderWardrobe() {
        const catalog = BertMeta.heroCatalog();
        const meta = BertMeta.snapshot();
        dom.heroFeathers.textContent = String(meta.feathers);
        document.querySelectorAll('.hero-option').forEach((button) => {
            const hero = catalog.find((entry) => entry.id === button.dataset.hero);
            if (!hero) return;
            const selected = button.dataset.hero === meta.hero;
            button.classList.toggle('hidden', Boolean(hero.secret) && !hero.owned);
            button.classList.toggle('epic', Boolean(hero.secret));
            button.classList.toggle('selected', selected);
            button.classList.toggle('locked', !hero.owned);
            button.classList.toggle('inspected', button.dataset.hero === inspectedHero && !selected);
            button.setAttribute('aria-selected', String(selected));
            button.setAttribute('aria-label', hero.owned
                ? T`Vælg ${hero.name}, ${hero.source === 'feathers' ? 'købt' : 'låst op'}`
                : T`${hero.name} låst. ${hero.goal}. ${hero.current} af ${hero.target}. Alternativ pris ${hero.price} fjer.`);
            button.querySelector('small').textContent = hero.owned
                ? hero.source === 'feathers' ? T('KØBT') : hero.source === 'name' ? T('EPISK') : hero.source === 'legacy' ? T('BEHOLDT') : hero.id === 'bert' ? T('ORIGINAL') : T('VUNDET')
                : hero.secret ? T('HEMMELIG') : T('LÅST');
            button.classList.toggle('locked', !hero.owned);
        });
        const active = catalog.find((hero) => hero.id === inspectedHero) || catalog[0];
        dom.heroDetailName.textContent = active.name.toUpperCase();
        dom.heroDetailGoal.textContent = active.secret && active.owned
            ? active.id === meta.hero ? T('Episk helt · kun til dig · valgt') : T('Episk helt · kun til dig. Tryk for at vælge.')
            : active.owned
            ? active.id === meta.hero ? T('Valgt og klar til at flyve') : T('Låst op. Tryk på figuren for at vælge.')
            : `${active.goal} · ${active.current}/${active.target} · ${Math.max(0, active.price - meta.feathers)} fjer mangler`;
        // Heroes hatch from eggs in the nest now; the wardrobe only shows the way.
        dom.heroBuy.classList.add('hidden');
        dom.heroCancelBuy.classList.add('hidden');
        // The detail line stays short; tapping a locked hero opens the full explanation.
        if (!active.owned) dom.heroDetailGoal.textContent = T('Låst. Tryk på helten for at se, hvordan du får den.');
    }

    // A locked hero explains itself in a popup: the feat, the egg, and how to get feathers.
    function showHeroLock(hero) {
        document.getElementById('hero-lock-pop')?.remove();
        const eggs = BertMeta.eggStatus?.();
        const choice = BertMeta.starterChoice?.();
        const lines = [];
        if (hero.secret) lines.push(T('En hemmelig helt. Den hører til et særligt pilotnavn.'));
        else if (hero.starter) lines.push(choice?.pending ? T('Du kan vælge en starthelt nu.') : T`Vælg den som starthelt efter ${choice?.nextAt || 10} ture. Du har fløjet ${choice?.runCount || 0}.`);
        else if (hero.id === 'eggbert') lines.push(T`Klæk alle helte fra rugepladsen. ${hero.current}/${hero.target} klækket.`);
        else if (!hero.eggOnly) lines.push(T`Bedrift: ${hero.goal} (${hero.current}/${hero.target}).`);
        if (!hero.secret && !hero.starter && hero.id !== 'eggbert') {
            const eggPrice = BertMeta.EGG_TIERS?.rare.includes(hero.id) ? eggs?.rareSecuredPrice : eggs?.securedPrice;
            lines.push(hero.eggOnly
                ? (eggs?.open ? T`Klæk den fra et æg i reden: sikret æg ${eggPrice} fjer.` : T('Klæk den fra et æg, når reden har nået trin 4.'))
                : (eggs?.open ? T`Eller klæk den fra et æg i reden: sikret æg ${eggPrice} fjer.` : T('Eller klæk den fra et æg, når reden har nået trin 4.')));
            lines.push(T`Du har ${BertMeta.snapshot().feathers} fjer. Fjer får du af dagens missioner, en tur om dagen og sjældne fjer i banerne.`);
        }
        const pop = document.createElement('div');
        pop.id = 'hero-lock-pop';
        pop.className = 'hero-lock-pop';
        pop.innerHTML = `<img src="assets/adventure/ui/lock.webp" alt=""><div><b>${hero.name}</b>${lines.map((line) => `<p>${line}</p>`).join('')}</div><button type="button" aria-label="${T('Luk')}">×</button>`;
        pop.querySelector('button').addEventListener('click', () => pop.remove());
        dom.heroModal.querySelector('.hero-wardrobe-card')?.appendChild(pop);
    }

    function updateFlokPromo() {
        // "NYT" stays for 14 days from the first time it is seen, or until 3 rounds are played.
        try {
            const first = Number(localStorage.getItem('bertFlokSeen')) || Date.now();
            localStorage.setItem('bertFlokSeen', String(first));
            const rounds = Number(localStorage.getItem('bertFlokRounds')) || 0;
            const stillNew = Date.now() - first < 14 * 86400000 && rounds < 3;
            document.querySelector('.flok-promo-new')?.toggleAttribute('hidden', !stillNew);
        } catch (_) { /* ignore */ }
        const el = document.getElementById('flok-promo-lives');
        const st = BertMeta.flokStatus?.();
        if (!el || !st) return;
        el.textContent = st.unlimited ? '' : `${'❤'.repeat(st.lives)}${'♡'.repeat(st.max - st.lives)}`;
    }

    function updateMetaMenu() {
        updateFlokPromo();
        updateBonusPromo();
        const meta = BertMeta.snapshot();
        const daily = BertMeta.dailyChallenge(new Date(), unlockedLevels().map((level) => level.id));
        dom.totalStars.textContent = String(meta.totalStars);
        if (dom.featherBalance) dom.featherBalance.textContent = String(meta.feathers);
        const nest = BertMeta.nestStatus();
        const nestArt = `assets/v2/g4/menu/nest-${nest.level + 1}.webp`;
        ['nest-image', 'nest-header-icon', 'menu-nest-icon', 'menu-nest-image'].forEach((id) => { const el = document.getElementById(id); if (el && !el.src.endsWith(nestArt)) el.src = nestArt; });
        if (dom.rescueLevel) dom.rescueLevel.textContent = nest.next ? nest.next.label.toUpperCase() : T('REDEN ER FÆRDIG');
        const nextText = document.getElementById('nest-next-text');
        if (nextText) nextText.textContent = nest.next ? nest.next.text : T('Alle syv trin er bygget. Flot!');
        const nextIcon = document.getElementById('nest-next-icon');
        if (nextIcon && nest.next) nextIcon.src = `assets/v2/g4/${nest.next.icon.startsWith('nest-') ? 'menu' : 'nest'}/${nest.next.icon}.webp`;
        if (dom.rescueUpgrade) {
            dom.rescueUpgrade.disabled = !nest.next || !nest.canBuild;
            dom.rescueUpgrade.textContent = !nest.next ? T('FÆRDIG') : nest.canBuild ? T`BYG · ${nest.next.cost} FJER` : T`MANGLER ${nest.missing} FJER`;
        }
        renderNestExtras(nest);
        dom.dailyName.textContent = daily.name.toUpperCase();
        const dailyLevel = UNITY_LEVELS.find((level) => level.id === daily.levelId);
        dom.dailyDetail.textContent = T`${dailyLevel?.name || `Level ${daily.levelId}`} · Mål ${daily.target}`;
        dom.dailyState.textContent = daily.completed ? T('KLARET') : T('SPIL');
        dom.dailyButton.classList.toggle('completed', daily.completed);
        renderWardrobe();
        const selectedHero = document.querySelector(`.hero-option[data-hero="${meta.hero}"]`) || document.querySelector('.hero-option[data-hero="bert"]');
        const selectedImage = selectedHero?.querySelector('img');
        if (selectedImage && dom.selectedHeroImage) {
            dom.selectedHeroImage.src = selectedImage.getAttribute('src');
            dom.selectedHeroImage.alt = selectedImage.alt;
        }
        const selectedName = selectedHero?.querySelector('b')?.textContent || 'BERT';
        if (dom.selectedHeroName) dom.selectedHeroName.textContent = selectedName;
        if (dom.heroSelector) dom.heroSelector.dataset.hero = meta.hero;
        if (dom.menuBird) {
            dom.menuBird.src = menuHeroArtOverrides[meta.hero] || menuHeroArt[meta.hero] || menuHeroArtOverrides.bert || menuHeroArt.bert;
            dom.menuBird.alt = `${selectedName} flyver`;
            dom.menuBird.dataset.hero = meta.hero;
        }
        dom.settingMusic.checked = meta.settings.music;
        dom.settingSfx.checked = meta.settings.sfx;
        dom.settingHaptics.checked = meta.settings.haptics;
        dom.settingLights.checked = meta.settings.lights;
        if (document.activeElement !== dom.playerName) dom.playerName.value = meta.player.name;
    }

    // The first flight asks for a name; 'Pilot' is no longer a default.
    let pendingFirstFlight = null;
    function askForName(levelId, options) {
        pendingFirstFlight = { levelId, options };
        dom.firstNameInput.value = '';
        dom.saveFirstName.disabled = true;
        setVisible(dom.nameModal, true);
        setTimeout(() => dom.firstNameInput.focus({ preventScroll: true }), 50);
    }
    function saveFirstName() {
        const name = dom.firstNameInput.value.trim();
        if (!name) return;
        if (!BertMeta.nameAllowed(name.replace(/\(op\)/i, ''))) {
            window.BertApp?.showToast(T('Vælg et andet navn'));
            dom.firstNameInput.select();
            return;
        }
        BertMeta.setPlayerName(name);
        setVisible(dom.nameModal, false);
        updateMetaMenu();
        const pending = pendingFirstFlight;
        pendingFirstFlight = null;
        if (pending) startLevel(pending.levelId, pending.options);
    }

    async function startLevel(levelId, options = {}) {
        // The name is asked for after three flights, not before the first (feedback 10. okt.).
        if (!QUERY.has('qa') && !BertMeta.hasPlayerName() && (BertMeta.snapshot().runCount || 0) >= 3) {
            askForName(levelId, options);
            return false;
        }
        const requestedLevel = Number(levelId) === EDM_EVENT.id ? EDM_EVENT
            : Number(levelId) === BIRD_RUN_EVENT.id ? BIRD_RUN_EVENT
                : Number(levelId) === STORMLINE_EVENT.id ? STORMLINE_EVENT
                    : Number(levelId) === SKY_RELAY_EVENT.id ? SKY_RELAY_EVENT
                    : Number(levelId) === GLIDE_EVENT.id ? GLIDE_EVENT
                    : Number(levelId) === SWARM_EVENT.id ? SWARM_EVENT
                    : ADVENTURE_LEVELS.find((level) => level.id === Number(levelId))
                    || UNITY_LEVELS.find((level) => level.id === Number(levelId)) || UNITY_LEVELS[0];
        const unlock = isEventLevel(requestedLevel) || isAdventureLevel(requestedLevel)
            ? adventureStatus(requestedLevel) : progressionSnapshot()[requestedLevel.id];
        if (!QUERY.has('qa') && !unlock?.unlocked) {
            showLevelMenu(modeForLevel(requestedLevel));
            window.BertApp?.showToast(unlock?.requirement
                ? T`Klar hele forrige trin og missionskravet først`
                : T('Banen er låst'));
            return false;
        }
        currentLevel = requestedLevel;
        BIRD.width = currentLevel.kind === 'tunnel' ? 88 : 124;
        BIRD.height = currentLevel.kind === 'tunnel' ? 80 : 113;
        state.phase = 'loading';
        hideMenus();
        setVisible(dom.hud, false);
        setVisible(dom.loading, true);
        try {
            await ensureLevelAssets(currentLevel);
        } catch (error) {
            console.error(error);
            dom.loading.querySelector('p').textContent = T('Banens grafik kunne ikke indlæses.');
            throw error;
        }
        setVisible(dom.loading, false);
        state.phase = 'prewarm';
        state.elapsed = 0;
        state.worldTime = 0;
        state.worldDistance = 0;
        state.stageIndex = -1;
        state.stageElapsed = 0;
        state.stageClock = 0;
        state.speed = currentLevel.startSpeed;
        state.difficulty = 1;
        state.nextSpawnAt = 1.4;
        state.seed = (Number(options.seed) >>> 0) || BertSocial.makeSeed();
        state.rngState = state.seed;
        state.relayRoute = currentLevel === SKY_RELAY_EVENT ? BertSkyRelay.createRoute(state.seed) : null;
        state.relayGates = [];
        state.relayBanked = 0;
        state.relayRoundStart = 0;
        state.relayPassedTotal = 0;
        state.relayResult = null;
        state.relayFlashUntil = 0;
        state.relayMessage = '';
        state.relayFinishDelay = 0;
        state.nextPowerupAt = currentLevel === STORMLINE_EVENT ? 8 : 15 + gameRandom() * 10;
        state.nextFeatherAt = 35 + gameRandom() * 25;
        state.lavaTop = LAVA_START;
        state.gripUntil = 0;
        state.light = 1;
        state.poopMeter = 2;
        state.poops = [];
        state.splats = [];
        state.poopCooldown = 0;
        state.poopMessage = '';
        state.poopMessageUntil = 0;
        state.smokeFog = [];
        state.nextRelayBirdAt = 0;
        state.relayBirdCount = 0;
        state.runFeathers = 0;
        state.nearMisses = 0;
        state.stickersShown = {};
        state.swarm = [];
        state.imageFx = [];
        state.birdTrail = [];
        state.glideSpeed = 1;
        state.glideDistance = 0;
        state.glideCount = 0;
        state.runPowerups = 0;
        state.maxNoStar = 0;
        state.lastStarAt = 0;
        state.levelStep = 1;
        state.eggSpawned = false;
        state.hitStop = 0;
        state.shake = 0;
        state.slowmoUntil = 0;
        state.comboText = null;
        state.flyingPickups = [];
        state.ambient = [];
        state.topCampTime = 0;
        state.nextTopMeteorAt = 0;
        updatePoopButton();
        state.nextLanternAt = 5;
        state.nextCrystalAt = 7;
        state.gust = null;
        state.nextGustAt = 6;
        state.nextCoolingAt = 8;
        state.coolFlashUntil = 0;
        state.feathersPicked = 0;
        state.featherFlashUntil = 0;
        state.deathCountdown = 0;
        state.score = 0;
        state.streak = 0;
        state.bestStreak = 0;
        state.highscore = loadHighscore(currentLevel.id);
        state.activePowerup = null;
        state.powerupEndsAt = 0;
        state.powerupReadyAt = { Shield: 0, Magnet: 0, Focus: 0, Guard: 0, Heavy: 0, Hyper: 0, Double: 0, Flap: 0, Reverse: 0 };
        state.eventPickupIndex = 0;
        state.shieldCharges = 0;
        state.streakGuardCharges = 0;
        state.guardNoticeUntil = 0;
        state.cleanRun = true;
        state.rescueUsed = false;
        state.focusPhase = 'idle';
        state.focusTransition = 0;
        state.focusCountdown = 0;
        state.focusRemaining = 0;
        state.focusSnapshotSpeed = currentLevel.startSpeed;
        state.focusSnapshotDifficulty = 1;
        state.focusTargetSpeed = focusSpeed(currentLevel.startSpeed);
        state.focusTargetDifficulty = 1;
        state.invulnerableUntil = 0;
        state.birdsVisible = true;
        state.inputUp = false;
        state.inputDown = false;
        heldPointers.clear();
        state.birdScale = 1;
        window.BertSizeScale = 1;
        state.pointerHeld = false;
        state.activePointerId = null;
        state.inputStrength = 1;
        state.obstacleId = 0;
        state.spawnSpacing = currentLevel.spacing || OBSTACLE_SPACING[currentLevel.kind] || 680;
        state.deathCause = null;
        state.deathDirection = null;
        state.deathPredatorHero = null;
        state.deathObstacleId = null;
        state.deathCaptureElapsed = 0;
        state.deathCaptureX = 0;
        state.deathCaptureY = 0;
        state.pausedFrom = null;
        state.starsCollected = 0;
        state.rescueLives = isEventLevel() ? 0 : Math.max(0, Number(BertMeta.snapshot().nest?.rescueLives) || 0);
        state.rescueNoticeUntil = 0;
        state.rescueNoticeText = '';
        state.continueUsed = false;
        state.rescueSpinPending = false;
        state.rescueWheelRotation = 0;
        state.worldBadge = null;
        state.worldBadgeUntil = 0;
        state.levelUpStage = 1;
        state.worldFinishDelay = 0;
        state.dailyKey = options.dailyKey || null;
        state.dailyTarget = Number(options.dailyTarget) || 0;
        state.challenge = options.challenge || null;
        state.mirror = Boolean(options.mirror);
        try { if (!isEventLevel()) localStorage.setItem('bertTheBird_lastLevel', String(currentLevel.id)); } catch (_) { /* ignore */ }
        state.ghostRecorder = isEventLevel() ? null : BertSocial.createGhostRecorder();
        // Your own best run flies along as a faint ghost (feedback 10. okt.).
        state.ownGhost = null;
        if (!state.challenge && !isEventLevel()) {
            try { state.ownGhost = JSON.parse(localStorage.getItem(`bertTheBird_ghost_${currentLevel.id}`) || 'null'); } catch (_) { state.ownGhost = null; }
        }
        state.completedGhost = [];
        obstacles = [];
        collectibles = [];
        particles = [];
        windLeaves.forEach((leaf, index) => {
            leaf.x = (index * 263) % 1380 - 40;
            leaf.y = 171 + (index * 137) % 399;
        });
        bird.x = BIRD.x;
        bird.y = (VIEW.height - BIRD.height) / 2;
        bird.velocity = 0;
        bird.rotation = 0;
        bird.animationTime = 0;
        hideMenus();
        setVisible(dom.hud, true);
        setVisible(dom.newHighscore, false);
        document.body.classList.add('is-prewarm');
        dom.levelName.textContent = state.dailyKey
            ? T`DAGENS RUTE · MÅL ${state.dailyTarget}`
            : isEventLevel() ? T`BONUSBANE · ${currentLevel.name.toUpperCase()}`
            : isAdventureLevel() ? `EVENTYR · ${currentLevel.name.toUpperCase()}`
            : `${currentLevel.modeGroup.toUpperCase()} ${currentLevel.modeOrder} · ${currentLevel.name.toUpperCase()}`;
        dom.hint.textContent = currentLevel.mode === MODE.FLAPPY
            ? T`TAP FOR AT FLYVE · ${currentLevel.cardText}`
            : currentLevel.kind === 'birdRun'
                ? T('MÅL: UNDVIG EN ROVFUGL · VENSTRE OP · HØJRE NED')
            : currentLevel.kind === 'stormline'
                ? T('MÅL: UNDVIG EN STORMGENSTAND · FØLG FLAG OG BLADE')
            : currentLevel.kind === 'edm'
                ? T('MÅL: KOM FORBI EN BØLGE MED TRE BOLDE · VENSTRE OP · HØJRE NED')
            : currentLevel.kind === 'skyRelay'
                ? T('FLYV GENNEM TRE SKY-PORTE · RAM GULDPLADEN · VENSTRE OP · HØJRE NED')
            : currentLevel.kind === 'iceberg'
                ? T('GLAT IS: STYR I GOD TID · SAML FROSTKRYSTALLER')
            : currentLevel.kind === 'windfarm'
                ? T('PAS PÅ VINDSTØD · PILENE VISER VEJEN')
            : currentLevel.kind === 'volcano'
                ? T('LAVAEN STIGER · SAML KØLESTEN')
            : currentLevel.kind === 'nightcity'
                ? T('LYSET SLUKKER LANGSOMT · SAML LANTERNER')
            : currentLevel.kind === 'poop'
                ? T('SPIS MAD · TRYK 💩 FOR AT RAMME MÅL NEDENUNDER')
            : currentLevel.kind === 'harbor'
                ? T('CONTAINERNE FLYTTER SIG · PAS PÅ MÅGERNE')
            : currentLevel.kind === 'tunnel'
                ? T`${currentLevel.cardText} · VENSTRE OP · HØJRE NED`
                : T('VENSTRE SIDE = OP · HØJRE SIDE = NED');
        setVisible(dom.hint, true);
        showLevelIntro();
        updateHud();
        stopMusic();
        window.BertApp?.enterGameMode();
        return true;
    }

    // Before a level starts: a short card that says what THIS level is about, so look-alike
    // levels (Desert and Fuglesværm) are not confused (feedback 10. okt.).
    const CONTROL_HOLD = T('Hold venstre side = op · højre side = ned');
    const CONTROL_TAP = T('Tryk for at baske · slip for at falde');
    const LEVEL_INTRO = {
        1: [T('Flyv mellem søjlerne og saml stjerner. Banen bliver hurtigere, og hullerne bliver mindre.'), CONTROL_HOLD],
        4: [T('Pas på slanger, der hopper op, og edderkopper, der hænger i spind.'), CONTROL_HOLD],
        5: [T('Slikstårne ruller og står skævt. Find hullet i tide.'), CONTROL_HOLD],
        3: [T('Flappy: flyv gennem hullerne mellem skorstenene.'), CONTROL_TAP],
        6: [T('Flappy: hullerne skifter højde, mens du flyver.'), CONTROL_TAP],
        7: [T('Flappy: den sværeste af de tre. Små huller og høj fart.'), CONTROL_TAP],
        2: [T('Følg tunnelen, og rør ikke væggene.'), CONTROL_HOLD],
        8: [T('Tunnelen snor sig mere og bliver smallere.'), CONTROL_HOLD],
        9: [T('Den hurtigste tunnel. Hold dig i midten.'), CONTROL_HOLD],
        21: [T('Containerne flytter sig. Pas på kranekroge og måger.'), CONTROL_HOLD],
        22: [T('Lyset slukker langsomt. Saml lanterner for at kunne se.'), CONTROL_HOLD],
        24: [T('Vinden skubber dig. Pas på møllevinger og drager.'), CONTROL_HOLD],
        23: [T('Lavaen stiger. Saml kølesten, og undgå bomber og meteorer.'), CONTROL_HOLD],
        20: [T('Glat styring: Bert glider efter. Styr i god tid.'), CONTROL_HOLD],
        25: [T('Spis mad, og tryk på 💩 for at ramme mål nedenunder.'), CONTROL_HOLD],
        10: [T('Koncert: kom forbi boldene, når publikum laver bølgen.'), CONTROL_HOLD],
        11: [T('Flyv med flokken, og undgå rovfuglen, når den varsles.'), CONTROL_HOLD],
        12: [T('Stormen kaster ting efter dig. Hold øje med pilene.'), CONTROL_HOLD],
        13: [T('Flyv gennem tre skyporte, og ring med klokken. Portene bliver mindre.'), CONTROL_HOLD],
        14: [T('Ingen vingeslag: op koster fart, ned giver fart. Find opvinden, og flyv langt.'), CONTROL_HOLD],
        15: [T('Hver 10. stjerne i træk giver en fugl i flokken. Et sammenstød koster en fugl i stedet for turen.'), CONTROL_HOLD],
    };
    function showLevelIntro() {
        const card = document.getElementById('level-intro');
        if (!card) return;
        const [goal, controls] = LEVEL_INTRO[currentLevel.id] || [T('Saml stjerner, og undgå forhindringerne.'), CONTROL_HOLD];
        const group = isEventLevel() ? T('BONUSBANE') : isAdventureLevel() ? T('EVENTYR') : (modeForLevel(currentLevel) || 'classic').toUpperCase();
        const best = loadHighscore(currentLevel.id);
        card.querySelector('.intro-group').textContent = state.mirror ? `${group} · ${T('SPEJLVENDT')}` : group;
        // Round 10 icons: the level type and a drawing of the controls.
        const typeKey = state.mirror ? 'mirror' : isEventLevel() ? 'bonus' : isAdventureLevel() ? 'adventure' : (modeForLevel(currentLevel) || 'classic');
        card.querySelector('.intro-type').src = ['assets/v2/g10/intro', `type-${typeKey}.webp`].join('/');
        card.querySelector('.intro-control').src = ['assets/v2/g10/intro', `control-${controls === CONTROL_TAP ? 'tap' : 'hold'}.webp`].join('/');
        const medal = best >= 100 ? 'gold' : best >= 50 ? 'silver' : '';
        const medalImg = card.querySelector('.intro-medal');
        medalImg.hidden = !medal;
        if (medal) medalImg.src = ['assets/v2/g10/intro', `medal-${medal}.webp`].join('/');
        card.querySelector('.intro-name').textContent = currentLevel.name;
        card.querySelector('.intro-goal').textContent = goal;
        card.querySelector('.intro-controls').textContent = controls;
        card.querySelector('.intro-medals span').textContent = best > 0 ? T`Rekord ${best} · bronze 20 · sølv 50 · guld 100` : T('Bronze 20 · sølv 50 · guld 100');
        setVisible(dom.hint, false);
        card.classList.remove('hidden');
    }
    function hideLevelIntro() { document.getElementById('level-intro')?.classList.add('hidden'); }

    function beginRun() {
        if (state.phase !== 'prewarm') return;
        hideLevelIntro();
        state.phase = 'playing';
        state.elapsed = 0;
        // Nest perk "Hurtig start": the first five seconds are safe and a little faster.
        if (BertMeta.nestPerks?.().boost && !isEventLevel()) state.invulnerableUntil = Math.max(state.invulnerableUntil, 5);
        state.stageIndex = -1;
        state.stageElapsed = 0;
        state.stageClock = 0;
        state.nextSpawnAt = 0;
        document.body.classList.remove('is-prewarm');
        setVisible(dom.hint, false);
        stopMusic();
        primeFocusAudio();
        audio.point?.prime?.().catch(() => {});
        playAudio(levelMusicName());
    }

    // Endless pacing: the stage ladder is climbed 35 % faster than the Unity
    // original, and after the last stage the game keeps getting harder.
    const STAGE_TEMPO = 1.35;
    function currentStageValues() {
        const values = BertProgression.stageValues(currentLevel.startSpeed, currentLevel.stages, state.stageClock);
        const stages = currentLevel.stages || [];
        if (!stages.length || values.progress < 1 || values.index < stages.length - 1) return values;
        const total = stages.reduce((sum, stage) => sum + Math.max(Number(stage.duration) || 0, 0.001), 0);
        const overtimeMinutes = Math.max(0, state.stageClock - total) / 60;
        const growth = Math.min(1.6, 1 + 0.1 * overtimeMinutes);
        return { ...values, speed: values.speed * growth,
            difficulty: values.difficulty * Math.min(1.7, 1 + 0.12 * overtimeMinutes) };
    }

    function updateStages(delta) {
        // Flappy keeps its speed for longer; the tightening gaps carry the difficulty.
        const tempo = currentLevel.mode === MODE.FLAPPY ? 0.6 : STAGE_TEMPO;
        if (state.focusPhase === 'idle' || state.focusPhase === 'countdown') state.stageClock += delta * tempo;
        const values = currentStageValues();
        state.stageIndex = values.index;
        state.stageElapsed = values.progress;

        if (state.focusPhase === 'idle') {
            state.speed = BertEventPowerups.speed(values.speed, state.activePowerup)
                * (currentLevel.kind === 'glide' ? (state.glideSpeed || 1) : 1)
                * (1 + Math.min(0.24, ((state.levelStep || 1) - 1) * 0.04))
                * (BertMeta.nestPerks?.().boost && !isEventLevel() && state.elapsed < 5 ? 1.15 : 1);
            state.difficulty = values.difficulty;
            return;
        }

        if (state.focusPhase === 'countdown') {
            state.speed = values.speed;
            state.difficulty = values.difficulty;
            state.focusCountdown = Math.max(0, state.focusCountdown - delta);
            if (state.focusCountdown <= 0) {
                // Capture the *current* stage, not the pre-countdown stage.
                state.focusSnapshotSpeed = values.speed;
                state.focusSnapshotDifficulty = values.difficulty;
                state.focusTargetSpeed = focusSpeed(values.speed);
                state.focusTargetDifficulty = 1;
                state.focusPhase = 'enter';
                state.focusTransition = 0;
                if (audio.focus && BertMeta.settingEnabled('music')) {
                    audio.focus.currentTime = 0;
                    audio.focus.volume = 0;
                    audio.focus.play().catch(() => {});
                }
            }
            return;
        }

        state.focusTransition += delta;
        if (state.focusPhase === 'enter') {
            state.focusRemaining = Math.max(0, state.focusRemaining - delta);
            const progress = clamp(state.focusTransition / FOCUS_ENTER_SECONDS, 0, 1);
            state.speed = lerp(state.focusSnapshotSpeed, state.focusTargetSpeed, progress);
            state.difficulty = lerp(state.focusSnapshotDifficulty, state.focusTargetDifficulty, progress);
            const levelMusic = activeLevelMusic();
            setMediaVolume(levelMusic, musicVol() * (1 - progress));
            if (audio.focus) audio.focus.volume = focusVol() * progress;
            if (progress >= 1) {
                state.focusPhase = 'active';
                state.focusTransition = 0;
                levelMusic?.pause();
            }
            return;
        }

        if (state.focusPhase === 'active') {
            state.speed = state.focusTargetSpeed;
            state.difficulty = state.focusTargetDifficulty;
            state.focusRemaining -= delta;
            if (state.focusRemaining <= 0) {
                state.focusPhase = 'exit';
                state.focusTransition = 0;
                const levelMusic = activeLevelMusic();
                if (levelMusic && BertMeta.settingEnabled('music')) {
                    levelMusic.volume = 0;
                    levelMusic.play().catch(() => {});
                }
            }
            return;
        }

        const progress = clamp(state.focusTransition / 2, 0, 1);
        state.speed = lerp(state.focusTargetSpeed, state.focusSnapshotSpeed, progress);
        state.difficulty = lerp(state.focusTargetDifficulty, state.focusSnapshotDifficulty, progress);
        if (audio.focus) audio.focus.volume = focusVol() * (1 - progress);
        const levelMusic = activeLevelMusic();
        setMediaVolume(levelMusic, musicVol() * progress);
        if (progress >= 1) {
            audio.focus?.pause();
            if (audio.focus) {
                audio.focus.currentTime = 0;
                audio.focus.volume = 0;
            }
            state.focusPhase = 'idle';
            state.focusTransition = 0;
            state.activePowerup = null;
            dom.powerup.classList.remove('active');
            if (levelMusic) {
                levelMusic.volume = musicVol();
                levelMusic.playbackRate = 1;
            }
        }
    }

    function updateBird(delta) {
        const focusProgress = clamp(state.focusTransition
            / (state.focusPhase === 'enter' ? FOCUS_ENTER_SECONDS : 2), 0, 1);
        const animationSpeed = state.focusPhase === 'enter'
            ? lerp(1, 0.4, focusProgress)
            : state.focusPhase === 'active'
                ? 0.4
                : state.focusPhase === 'exit'
                    ? lerp(0.4, 1, focusProgress)
                    : 1;
        if (currentLevel.kind === 'glide' && state.phase === 'playing') {
            // Glide: pitch only. Up = climb but lose speed; down = dive and gain speed;
            // nothing = a slow sink. Thermals push up hard.
            state.glideSpeed ??= 1;
            if (state.inputUp) { bird.velocity -= 560 * delta; state.glideSpeed -= 0.32 * delta; }
            else if (state.inputDown) { bird.velocity += 720 * delta; state.glideSpeed += 0.42 * delta; }
            else { bird.velocity += 170 * delta; state.glideSpeed += (0.9 - state.glideSpeed) * 0.15 * delta; }
            const cx = bird.x + BIRD.width / 2;
            const inThermal = obstacles.some((o) => o.kind === 'glide-thermal' && cx > o.x && cx < o.x + o.width);
            if (inThermal) bird.velocity -= 1050 * delta;
            state.inThermal = inThermal;
            bird.velocity *= 1 - Math.min(0.5, 1.1 * delta);
            bird.velocity = clamp(bird.velocity, -420, 560);
            state.glideSpeed = clamp(state.glideSpeed, 0.55, 1.7);
        } else if (BertEventPowerups.isFlap(currentLevel.mode, state.activePowerup)) {
            bird.velocity += (isReversed() ? -FLAPPY_GRAVITY : FLAPPY_GRAVITY) * delta;
            bird.velocity = isReversed() ? clamp(bird.velocity, -700, 620) : clamp(bird.velocity, -620, 700);
        } else {
            const previousVelocity = bird.velocity;
            bird.velocity = BertPhysics.stepDefault(
                bird.velocity,
                isReversed() ? state.inputDown : state.inputUp,
                isReversed() ? state.inputUp : state.inputDown,
                state.inputStrength,
                delta,
                state.activePowerup === POWERUP.HEAVY ? BertPhysics.HEAVY : BertPhysics.DEFAULT,
            );
            // Isbjerget: on slippery ice Bert answers slowly and keeps gliding.
            // A frost crystal gives normal grip for a short while.
            if (currentLevel.kind === 'iceberg' && state.phase === 'playing' && state.elapsed >= (state.gripUntil || 0)) {
                // Time constant ~0.12 s at the start, ~0.17 s late: a soft glide, never sluggish.
                // Middle ground (feedback): slippery enough to feel, quick enough to steer.
                const grip = 1 - Math.exp(-delta * clamp(10 - state.difficulty * 1.3, 7.5, 10));
                bird.velocity = previousVelocity + (bird.velocity - previousVelocity) * grip;
            }
        }
        // Vindmøller: gusts push Bert up or down after a warning.
        if (currentLevel.kind === 'windfarm' && state.phase === 'playing' && state.gust?.phase === 'blow') {
            bird.velocity = clamp(bird.velocity + state.gust.dir * state.gust.force * delta, -700, 700);
        }
        if (currentLevel === STORMLINE_EVENT && state.phase === 'playing') {
            const wind = BertStormline.windCue(state.worldTime);
            const profile = state.activePowerup === POWERUP.HEAVY ? BertPhysics.HEAVY : BertPhysics.DEFAULT;
            bird.velocity = clamp(bird.velocity + wind.liftAcceleration * delta,
                profile.minimumVelocity, profile.maximumVelocity);
        }
        bird.y += bird.velocity * delta;
        if (currentLevel.kind === 'glide' && state.phase === 'playing') {
            if (bird.y < 40) { bird.y = 40; bird.velocity = Math.max(0, bird.velocity); }
            if (bird.y + BIRD.height > VIEW.height - 30 && !DEBUG_NOCLIP) { triggerDeath(null); return; }
            // Speed is points: every 150 px flown gives points, more the faster you go.
            state.glideDistance = (state.glideDistance || 0) + BertProgression.scrollPixelsPerSecond(state.speed) * delta;
            while (state.glideDistance >= 150) {
                state.glideDistance -= 150;
                state.score += Math.max(1, Math.round((state.glideSpeed || 1) * 2 - 1));
            }
        }
        if (currentLevel.kind === 'skyRelay') {
            const lowest = VIEW.height - BIRD.height - 58;
            const impact = Math.abs(bird.velocity);
            const bonk = (y) => {
                if (impact > 160 && state.elapsed >= (state.nextBonkAt || 0)) {
                    (state.bonks ||= []).push({ x: bird.x + BIRD.width * 0.6, y, age: 0 });
                    state.nextBonkAt = state.elapsed + 0.35;
                    playAudio('pop');
                }
            };
            if (bird.y > lowest) { bonk(lowest + BIRD.height); bird.y = lowest; bird.velocity = Math.min(0, bird.velocity) * 0 - 120; }
            if (bird.y < 58) { bonk(58); bird.y = 58; bird.velocity = 140; }
        }
        bird.rotation = clamp(bird.velocity * 0.055, -28, 76);
        bird.animationTime += delta * animationSpeed;

        let liveCollider = BertCollision.bertCollider(bird, BIRD);
        const ceilingPenetration = 8 - (liveCollider.y - liveCollider.radius);
        if (ceilingPenetration > 0) {
            bird.y += ceilingPenetration;
            bird.velocity = Math.max(0, bird.velocity);
            liveCollider = BertCollision.bertCollider(bird, BIRD);
        }
        const floorPenetration = liveCollider.y + liveCollider.radius - (VIEW.height - 8);
        if (floorPenetration > 0) {
            bird.y -= floorPenetration;
            bird.velocity = Math.min(0, bird.velocity);
            if (!DEBUG_NOCLIP && currentLevel.kind !== 'skyRelay'
                && (currentLevel.mode === MODE.FLAPPY || state.phase === 'playing')) triggerDeath();
        }
        if (currentLevel.kind === 'tunnel' && state.phase === 'playing' && !DEBUG_NOCLIP) {
            const tunnelCollider = BertCollision.bertCollider(bird, BIRD);
            if (BertTunnel.hitsTunnel(tunnelCollider, state.worldDistance, state.difficulty, currentLevel.variant)) {
                triggerDeath({ kind: 'tunnel-wall' });
            }
        }
    }

    function updatePrewarm(delta) {
        bird.animationTime += delta;
        bird.y = (VIEW.height - BIRD.height) / 2 + Math.sin(state.worldTime * 2.7) * 8;
        bird.rotation = Math.sin(state.worldTime * 2.7) * 3;
    }

    function advanceWindLeaves(delta, cue) {
        if (prefersReducedMotion()) return;
        for (const leaf of windLeaves) {
            leaf.x += cue.horizontal * leaf.drift * delta;
            leaf.y += cue.vertical * leaf.drift * 0.73 * delta;
            if (leaf.x < -35) leaf.x = VIEW.width + 24;
            if (leaf.x > VIEW.width + 35) leaf.x = -24;
            if (leaf.y < 165) leaf.y = 584;
            if (leaf.y > 584) leaf.y = 165;
        }
    }

    function smoothStep(value) {
        const t = clamp(value, 0, 1);
        return t * t * (3 - 2 * t);
    }

    function updateJungleEnemy(obstacle, delta, interactive) {
        if (obstacle.kind === 'jungle-spider') {
            obstacle.baseY ??= obstacle.y;
            obstacle.attackState ??= 'idle';
            obstacle.attackElapsed ??= 0;
            const distanceAhead = obstacle.x - (bird.x + BIRD.width);
            if (interactive && obstacle.attackState === 'idle' && distanceAhead < 430 && distanceAhead > 35) {
                obstacle.attackState = 'attacking';
                obstacle.attackElapsed = 0;
                obstacle.attackWindup = 0.6;
                obstacle.targetY = clamp(bird.y + BIRD.height * 0.5 - obstacle.height * 0.45, 118, VIEW.height - obstacle.height - 65);
            }
            // Smoother spider (feedback): a gentle idle bob, a wind-up where it pulls
            // itself up, a springy drop that slightly overshoots, then a calm climb back.
            const easeOutBack = (t) => 1 + 2.2 * Math.pow(t - 1, 3) + 1.2 * Math.pow(t - 1, 2);
            if (obstacle.attackState === 'idle' || obstacle.attackState === 'spent') {
                obstacle.y = obstacle.baseY + Math.sin(obstacle.age * 2.1 + (obstacle.animationPhase || 0)) * 6;
            }
            if (obstacle.attackState === 'attacking') {
                obstacle.attackElapsed += delta;
                const elapsed = obstacle.attackElapsed;
                const windup = obstacle.attackWindup ?? 0.6;
                const drop = 0.55;
                if (elapsed < windup) {
                    obstacle.y = obstacle.baseY - Math.sin((elapsed / windup) * Math.PI * 0.5) * 16;
                } else if (elapsed < windup + drop) {
                    const t = (elapsed - windup) / drop;
                    obstacle.y = lerp(obstacle.baseY - 16, obstacle.targetY, easeOutBack(t));
                } else if (elapsed < windup + drop + 0.3) {
                    obstacle.y = obstacle.targetY + Math.sin((elapsed - windup - drop) * 14) * 3;
                } else if (elapsed < windup + drop + 1.0) {
                    obstacle.y = lerp(obstacle.targetY, obstacle.baseY, smoothStep((elapsed - windup - drop - 0.3) / 0.7));
                } else {
                    obstacle.y = obstacle.baseY;
                    obstacle.attackState = 'spent';
                }
            }
            obstacle.renderX = obstacle.x;
            obstacle.renderY = obstacle.y;
            obstacle.renderWidth = obstacle.width;
            obstacle.renderHeight = obstacle.height;
            return;
        }

        if (obstacle.kind === 'jungle-snake') {
            obstacle.baseBottom ??= obstacle.y + obstacle.height;
            obstacle.attackState ??= 'idle';
            obstacle.attackElapsed ??= 0;
            // Time the jump so the top of it (frames 4, ~0.27–0.47 s in) meets Bert,
            // whatever the current speed. A fixed distance made it jump too late or early.
            const scrollPerSecond = BertProgression.scrollPixelsPerSecond(state.speed);
            const centerGap = (obstacle.x + obstacle.width / 2) - (bird.x + BIRD.width / 2);
            if (interactive && obstacle.attackState === 'idle' && centerGap > 0 && centerGap <= scrollPerSecond * 0.37) {
                obstacle.attackState = 'attacking';
                obstacle.attackElapsed = 0;
            }
            const jumpSequence = [0, 1, 2, 3, 4, 4, 4, 3, 2, 1, 0];
            if (!OLD_SNAKE && V2.levels.has('jungle')) {
                // New-style snake: the snake rises out of its coil and leaps off the rock,
                // reaching as high as the old lunge did. The rock itself stays put.
                obstacle.snakeHeight = obstacle.height * 1.05;
                obstacle.renderWidth = obstacle.snakeHeight * 0.8;
                obstacle.renderX = obstacle.x + obstacle.width / 2 - obstacle.renderWidth / 2;
                let lift = 0;
                obstacle.attackFrame = null;
                if (obstacle.attackState === 'attacking') {
                    obstacle.attackElapsed += delta;
                    const progress = clamp(obstacle.attackElapsed / 0.733333, 0, 0.9999);
                    obstacle.attackFrame = jumpSequence[Math.floor(progress * jumpSequence.length)];
                    lift = Math.max(0, 272 * obstacle.scale - obstacle.snakeHeight) * Math.sin(Math.PI * progress);
                    if (obstacle.attackElapsed >= 0.733333) obstacle.attackState = 'spent';
                }
                // The body stretches up from the rock, so the whole column is the snake.
                obstacle.renderHeight = obstacle.snakeHeight + lift;
                obstacle.renderY = obstacle.baseBottom + 4 - obstacle.renderHeight;
                return;
            }
            if (obstacle.attackState === 'attacking') {
                obstacle.attackElapsed += delta;
                const progress = clamp(obstacle.attackElapsed / 0.733333, 0, 0.9999);
                const frameIndex = jumpSequence[Math.floor(progress * jumpSequence.length)];
                const frame = assets[`snakeJump${frameIndex}`];
                obstacle.attackFrame = frameIndex;
                obstacle.renderWidth = (frame?.naturalWidth ? frame.naturalWidth * SNAKE_JUMP_SCALE : 81) * obstacle.scale;
                obstacle.renderHeight = (frame?.naturalHeight ? frame.naturalHeight * SNAKE_JUMP_SCALE : 106) * obstacle.scale;
                obstacle.renderX = obstacle.x - (obstacle.renderWidth - obstacle.width) * 0.45;
                obstacle.renderY = obstacle.baseBottom - obstacle.renderHeight;
                if (obstacle.attackElapsed >= 0.733333) obstacle.attackState = 'spent';
            } else {
                obstacle.attackFrame = null;
                obstacle.renderX = obstacle.x;
                obstacle.renderY = obstacle.y;
                obstacle.renderWidth = obstacle.width;
                obstacle.renderHeight = obstacle.height;
            }
        }
    }

    function updateObjects(delta, interactive = true) {
        const scroll = BertProgression.scrollPixelsPerSecond(state.speed) * delta;
        for (const obstacle of obstacles) {
            if (obstacle.kind === 'bird-run-bird') {
                BertBirdRun.advance(obstacle, delta, scroll, bird.y + BIRD.height / 2);
            } else if (BertStormline.isHazard(obstacle)) {
                BertStormline.advance(obstacle, delta, scroll, BertStormline.windCue(state.worldTime));
            } else if (obstacle.kind === 'adventure') {
                const before = { phase: obstacle.phase, harmful: obstacle.harmful };
                BertAdventure.advance(obstacle, delta, {
                    scroll, speed: scroll / Math.max(delta, 1e-6),
                    birdX: bird.x + BIRD.width / 2, birdY: bird.y + BIRD.height / 2, time: state.worldTime,
                    lavaTop: currentLevel.kind === 'volcano' ? state.lavaTop : undefined,
                });
                // Sound cues follow the hazards' own state changes.
                if (obstacle.palette === 'smoke' && obstacle.harmful) blowSmoke(obstacle, delta);
                if (interactive && obstacle.x < VIEW.width + 60) {
                    if (obstacle.behaviour === 'column' && obstacle.harmful && !before.harmful) playAudio(obstacle.palette === 'smoke' ? 'whoosh' : 'lava');
                    if ((obstacle.behaviour === 'meteor' || obstacle.behaviour === 'bomb') && obstacle.phase === 'fly' && before.phase !== 'fly') playAudio('whoosh');
                    if (obstacle.behaviour === 'drop' && obstacle.phase === 'warn' && before.phase !== 'warn') playAudio('crack');
                    if (obstacle.behaviour === 'stack' && obstacle.phase === 'move' && before.phase !== 'move') playAudio('pop');
                }
            } else if (obstacle.kind === 'edm-crowd-ball') {
                BertEDM.advanceCrowdBall(obstacle, delta, scroll, bird.x + BIRD.width,
                    VIEW.width, gameRandom,
                    () => !obstacles.some((other) => other.id !== obstacle.id
                        && other.x > obstacle.x && other.x - obstacle.x < 1000));
            } else {
                obstacle.x -= scroll;
                obstacle.age += delta;
            }
            if (obstacle.kind === 'jungle-spider') obstacle.bob += delta * 4;
            if ((obstacle.kind === 'happy-pipe' || obstacle.kind === 'flappy-pipe') && obstacle.conveyor) {
                // Conveyor column: the gap keeps travelling one way. When it leaves at the
                // top a new one rises from the bottom (and the reverse), at a steady rhythm.
                const period = VIEW.height;
                const raw = obstacle.baseGapTop + obstacle.conveyor * obstacle.age;
                const g = (((raw + obstacle.gap) % period) + period) % period - obstacle.gap;
                if (g >= 0) {
                    obstacle.y = obstacle.top ? 0 : g + obstacle.gap;
                    obstacle.height = obstacle.top ? g : VIEW.height - g - obstacle.gap;
                } else {
                    obstacle.y = obstacle.top ? 0 : g + obstacle.gap;
                    obstacle.height = obstacle.top ? 0 : VIEW.height - obstacle.gap;
                }
            } else if ((obstacle.kind === 'happy-pipe' || obstacle.kind === 'flappy-pipe') && obstacle.motionAmplitude > 0) {
                const wave = Math.sin(obstacle.age * obstacle.motionSpeed + obstacle.motionPhase) * obstacle.motionAmplitude;
                const gapTop = clamp(obstacle.baseGapTop + wave, 90, VIEW.height - obstacle.gap - 90);
                obstacle.y = obstacle.top ? 0 : gapTop + obstacle.gap;
                obstacle.height = obstacle.top ? gapTop : VIEW.height - obstacle.y;
            }
            updateJungleEnemy(obstacle, delta, interactive);
        }
        const beforeCull = obstacles;
        obstacles = obstacles.filter((obstacle) => obstacle.kind === 'bird-run-bird'
            ? !BertBirdRun.isGone(obstacle, VIEW.width)
            : obstacle.kind === 'adventure'
                ? obstacle.x + obstacle.width > -260 && obstacle.y < VIEW.height + 120 && obstacle.y + obstacle.size > -260
            : obstacle.x + obstacle.width > -140);
        if (interactive && isEventLevel() && !state.worldBadge
            && BertWorldMastery.qualifies(currentLevel.id,
                beforeCull.filter((item) => !obstacles.includes(item)), obstacles)) {
            const achievement = BertWorldMastery.award(currentLevel.id, localStorage);
            state.worldBadge = achievement.badge?.label || null;
            state.worldBadgeUntil = state.elapsed + 3;
            // Endless: the badge is a milestone, never the end of the run.
            state.levelUpStage = (state.levelUpStage || 1) + 1;
            burst(bird.x + BIRD.width / 2, bird.y + BIRD.height / 2, '#ffe6a0', 12);
            playAudio('point');
            BertMeta.haptic('reward');
        }

        for (const collectible of collectibles) {
            collectible.x -= scroll * (collectible.motion?.scrollFactor || 1);
            collectible.spin += delta * 5;
            if ((collectible.kind === 'powerup' || collectible.kind === 'feather' || collectible.kind === 'egg' || collectible.kind === 'sticker') && collectible.motion) {
                collectible.age += delta;
                const corridor = collectible.motion.tunnel
                    ? BertTunnel.profileAt(state.worldDistance + collectible.x, state.difficulty, currentLevel.variant).center
                    : collectible.motion.baseY;
                collectible.y = BertCollectibleMotion.yAt(collectible.motion, collectible.age, corridor);
            }
            if (collectible.kind === 'star' && collectible.drift) {
                collectible.age = (collectible.age || 0) + delta;
                const drift = collectible.drift;
                const next = Math.sin(collectible.age * drift.speed + drift.phase) * drift.amplitude;
                collectible.y += next - drift.offset;
                drift.offset = next;
            }
            if (interactive && state.activePowerup === POWERUP.MAGNET && collectible.kind === 'star') {
                const dx = bird.x + BIRD.width / 2 - collectible.x;
                const dy = bird.y + BIRD.height / 2 - collectible.y;
                const distance = Math.hypot(dx, dy);
                if (distance < (BertMeta.nestPerks?.().magnet ? 273 : 210)) {
                    collectible.x += (dx / Math.max(distance, 1)) * 430 * delta;
                    collectible.y += (dy / Math.max(distance, 1)) * 430 * delta;
                }
            }
            if (interactive) {
                const collectibleBounds = {
                    x: collectible.x - collectible.width / 2,
                    y: collectible.y - collectible.height / 2,
                    width: collectible.width,
                    height: collectible.height,
                };
                const liveCollider = BertCollision.bertCollider(bird, BIRD);
                if (circleHitsRect(liveCollider, liveCollider.radius, collectibleBounds)) {
                    collectible.collected = true;
                    if (collectible.kind === 'powerup') activatePowerup(collectible.type);
                    else if (collectible.kind === 'feather') collectFeather(collectible);
                    else if (collectible.kind === 'sticker') {
                        if (!opMode() && BertMeta.findSticker?.(collectible.sticker)) {
                            playAudio('ding');
                            window.BertApp?.showToast(T('Klistermærke fundet! Se det i albummet i reden'));
                        }
                        burst(collectible.x, collectible.y, '#ffffff', 12);
                        BertMeta.haptic('reward');
                    }
                    else if (collectible.kind === 'egg') {
                        const result = opMode() ? { ok: false } : BertMeta.grantFoundEgg?.();
                        playAudio(result?.ok ? 'fanfare' : 'pop');
                        if (result?.ok) window.BertApp?.showToast(T('Du fandt et æg! Det ligger i reden og ruger.'));
                        BertMeta.haptic('reward');
                    }
                    else if (collectible.kind === 'food') {
                        state.poopMeter = Math.min(POOP_MAX, (state.poopMeter || 0) + collectible.value);
                        playAudio('point');
                        burst(collectible.x, collectible.y, '#ffe39a', 6);
                        updatePoopButton();
                    }
                    else if (collectible.kind === 'lantern') {
                        state.light = Math.min(1, (state.light ?? 0) + 0.38);
                        playAudio('point');
                        BertMeta.haptic('star');
                        burst(collectible.x, collectible.y, '#ffe39a', 14);
                    }
                    else if (collectible.kind === 'crystal') {
                        state.gripUntil = state.elapsed + 5;
                        playAudio('point');
                        BertMeta.haptic('star');
                        burst(collectible.x, collectible.y, '#d9fbff', 12);
                    }
                    else if (collectible.kind === 'cool') {
                        state.lavaTop = Math.min(LAVA_START, state.lavaTop + 120);
                        playAudio('point');
                        BertMeta.haptic('star');
                        burst(collectible.x, collectible.y, '#bff6ff', 12);
                        state.coolFlashUntil = state.elapsed + 1.4;
                    }
                    else collectStar(collectible);
                }
            }
        }
        const missed = collectibles.filter((collectible) => collectible.kind === 'star' && !collectible.collected && collectible.x < -30);
        if (interactive && missed.length) {
            missed.forEach((collectible) => {
                collectible.collected = true; // A missed star must never break the streak again on the next frame.
                state.cleanRun = false;
                breakStreak();
            });
        }
        collectibles = collectibles.filter((collectible) => collectible.x > -80 && !collectible.collected);

        for (let index = particles.length - 1; index >= 0; index -= 1) {
            const particle = particles[index];
            particle.x += particle.vx * delta;
            particle.y += particle.vy * delta;
            particle.vy += 600 * delta;
            particle.rotation += (particle.angularVelocity || 0) * delta;
            particle.life -= delta;
            if (particle.life <= 0) particles.splice(index, 1);
        }

        if (interactive) {
            if (state.activePowerup && state.activePowerup !== POWERUP.FOCUS && state.elapsed >= state.powerupEndsAt) {
                deactivatePowerup('timeout');
            }

            if (currentLevel.kind !== 'birdRun' && state.elapsed >= state.nextPowerupAt && !state.activePowerup) {
                spawnPowerup();
                state.nextPowerupAt = currentLevel === STORMLINE_EVENT
                    ? state.elapsed + 13 + gameRandom() * 4
                    : state.elapsed + 15 + gameRandom() * 10;
            }

            // Klistermærker: five hidden per level (Desert, Jungle, Happy Sky). Each shows up
            // once at its own moment in the run until it is found, then it is in the album.
            const stickerSet = STICKER_SETS[currentLevel.id];
            if (stickerSet && state.elapsed < 0.2) for (let n = 1; n <= 5; n += 1) stickerArt(`${stickerSet}_${n}`);
            if (stickerSet && !isEventLevel() && !state.mirror) {
                const found = BertMeta.stickers?.() || {};
                STICKER_TIMES.forEach((at, index) => {
                    const id = `${stickerSet}_${index + 1}`;
                    if (found[id] || (state.stickersShown ||= {})[id] || state.elapsed < at) return;
                    state.stickersShown[id] = true;
                    spawnFeather('sticker');
                    collectibles[collectibles.length - 1].sticker = id;
                    collectibles[collectibles.length - 1].width = 62;
                    collectibles[collectibles.length - 1].height = 62;
                });
            }
            // A rare feather for the nest economy, about once a minute (not in events).
            if (!isEventLevel() && state.elapsed >= state.nextFeatherAt) {
                // Now and then the feather is an egg instead: free, random, only when the nest can take one.
                const eggs = BertMeta.eggStatus?.();
                if (eggs?.open && !eggs.incubating && eggs.remaining && !state.eggSpawned && gameRandom() < 0.22) {
                    spawnFeather('egg');
                    state.eggSpawned = true;
                } else spawnFeather();
                state.nextFeatherAt = state.elapsed + 50 + gameRandom() * 25;
            }

            for (const obstacle of obstacles) {
                if (!obstacle.harmful) continue;
                if (state.elapsed < state.invulnerableUntil) continue;
                const liveCollider = BertCollision.bertCollider(bird, BIRD);
                if (!DEBUG_NOCLIP && BertCollision.birdHitsObstacle(liveCollider, obstacle)) {
                    triggerDeath(obstacle);
                    break;
                }
            }
        }
    }

    function obstacleGroupCanSpawn() {
        if (currentLevel.kind === 'birdRun' || currentLevel.kind === 'stormline') {
            // A rear warning waits for the old star to disappear entirely. A
            // front wave starts far right only once the previous reward is
            // already past Bert, never on top of a still-visible bird.
            const nextRear = currentLevel.kind === 'birdRun'
                && (state.obstacleId === 5 || state.obstacleId >= 3 && state.obstacleId % 5 === 3);
            const rewardClearX = nextRear ? -30 : bird.x + 135;
            return !obstacles.some((obstacle) => currentLevel.kind === 'stormline'
                ? BertStormline.isHazard(obstacle) && obstacle.x + obstacle.width > bird.x - 35
                : obstacle.kind === 'bird-run-bird')
                && !collectibles.some((item) => (item.kind === 'star'
                    || (currentLevel.kind === 'stormline' && item.kind === 'powerup'))
                    && item.x > rewardClearX);
        }
        const spawnX = VIEW.width + 120;
        // A wide rainbow counts with most of its width, so the next obstacle never lands inside it.
        const rightmostGroupX = obstacles.reduce((rightmost, obstacle) => Math.max(rightmost,
            obstacle.x + (obstacle.kind === 'happy-rainbow' ? obstacle.width - 220 : 0)), -Infinity);
        if (!Number.isFinite(rightmostGroupX)) return true;
        return spawnX - rightmostGroupX >= state.spawnSpacing;
    }

    // Flappy gets harder by tightening, not by rushing: the hole shrinks by up
    // to a third over about 80 seconds, and the pipes move closer together.
    function flappyGap() {
        const base = currentLevel.gap || 270;
        return Math.max(base * 0.67, base - state.elapsed * 1.15);
    }
    function flappySpacing(base) {
        return Math.max(base - 240, base - state.elapsed * 3);
    }

    // ---------- Fugleklat ----------
    // Eat food to fill the klat meter, drop klatter on targets below. Hits in a
    // row build the streak exactly like stars; a klat that hits the street breaks it.
    const POOP_GROUND = 660;
    const POOP_MAX = 6;
    const TARGET_TYPES = Object.freeze({
        car: { width: 190, height: 100, value: 1, drive: [40, 120] },
        cabrio: { width: 190, height: 94, value: 2, drive: [60, 140] },
        gold: { width: 210, height: 77, value: 3, drive: [140, 220] },
        statue: { width: 110, height: 190, value: 1, drive: [0, 0] },
        icecream: { width: 116, height: 150, value: 2, drive: [0, 30] },
        umbrella: { width: 120, height: 160, value: 2, drive: [0, 25] },
    });
    function spawnPoopEncounter(x, id) {
        const roll = gameRandom();
        const pick = roll < 0.05 + Math.min(0.06, state.difficulty * 0.02) ? 'gold'
            : ['car', 'car', 'cabrio', 'statue', 'icecream', 'umbrella'][Math.floor(gameRandom() * 6)];
        const spec = TARGET_TYPES[pick];
        obstacles.push({ kind: 'target', type: pick, id, x, y: POOP_GROUND + 30 - spec.height, width: spec.width, height: spec.height,
            value: spec.value, harmful: false, age: 0, drive: randomBetween(spec.drive[0], spec.drive[1]),
            umbrellaPhase: gameRandom() * 3, hit: false });
        if (state.elapsed > 4 && gameRandom() < 0.55) {
            const lamp = gameRandom() < 0.5;
            if (lamp) {
                const top = randomBetween(360, 470);
                obstacles.push({ kind: 'poop-hazard', type: 'lamp', id, x: x + 330, y: top, width: 40, height: VIEW.height - top + 40, harmful: true, age: 0 });
            } else {
                // Art content 432×163: the hit box is the washing itself, hung at a varying height.
                const width = 300;
                const height = Math.round(width * 163 / 432);
                obstacles.push({ kind: 'poop-hazard', type: 'laundry', id, x: x + 300, y: randomBetween(40, 150), width, height, harmful: true, age: 0 });
            }
        }
        const foods = 1 + Math.floor(gameRandom() * 2);
        for (let index = 0; index < foods; index += 1) {
            const fries = gameRandom() < 0.25;
            collectibles.push({ x: x + 120 + index * 170, y: randomBetween(150, 380), width: 64, height: 64,
                kind: 'food', food: fries ? 'fries' : gameRandom() < 0.5 ? 'berry' : 'crumb', value: fries ? 2 : 1, spin: 0, age: 0, collected: false });
        }
    }

    function dropPoop() {
        if (currentLevel.kind !== 'poop' || state.phase !== 'playing' || state.poopMeter < 1) return;
        if (state.poopCooldown > state.elapsed) return;
        state.poopMeter -= 1;
        state.poopCooldown = state.elapsed + 0.22;
        state.poops.push({ x: bird.x + BIRD.width * 0.42, y: bird.y + BIRD.height * 0.78, vy: Math.max(0, bird.velocity * 0.25) + 120 });
        playAudio('drop');
        BertMeta.haptic('star');
        updatePoopButton();
    }

    function updatePoopButton() {
        if (!dom.poopButton) return;
        const show = currentLevel.kind === 'poop' && ['prewarm', 'playing'].includes(state.phase);
        setVisible(dom.poopButton, show);
        dom.poopButton.classList.toggle('empty', (state.poopMeter || 0) < 1);
        const count = dom.poopButton.querySelector('strong');
        if (count) count.textContent = String(state.poopMeter || 0);
    }

    function umbrellaOpen(target) {
        return target.type === 'umbrella' && Math.sin(target.age * 2.2 + target.umbrellaPhase) > -0.1;
    }

    function updatePoop(delta, scroll) {
        if (currentLevel.kind !== 'poop') return;
        obstacles.forEach((obstacle) => {
            if (obstacle.kind === 'target') obstacle.x -= obstacle.drive * delta;
        });
        for (let index = state.poops.length - 1; index >= 0; index -= 1) {
            const poop = state.poops[index];
            poop.vy += 1500 * delta;
            poop.y += poop.vy * delta;
            let landed = false;
            for (const target of obstacles) {
                if (target.kind !== 'target' || target.hit) continue;
                const hitTop = target.type === 'icecream' ? target.y : target.y + 6;
                const inside = poop.x > target.x + 8 && poop.x < target.x + target.width - 8 && poop.y > hitTop && poop.y < target.y + target.height * 0.6;
                if (!inside) continue;
                landed = true;
                if (umbrellaOpen(target)) {
                    state.splats.push({ x: poop.x, y: poop.y, age: 0, bounce: true });
                    breakStreak();
                    state.poopMessage = T('PARAPLYEN REDDEDE DEM');
                    state.poopMessageUntil = state.elapsed + 1.2;
                    break;
                }
                target.hit = true;
                state.streak += 1;
                state.bestStreak = Math.max(state.bestStreak, state.streak);
                state.score += BertEventPowerups.score(state.streak * target.value, state.activePowerup);
                state.starsCollected += target.value;
                state.splats.push({ x: poop.x, y: poop.y, age: 0, target });
                burst(poop.x, poop.y, '#ffffff', 10);
                playAudio('splat');
                playAudio('point');
                BertMeta.haptic('reward');
                state.poopMessage = target.type === 'gold' ? T('GULDBIL! ×3') : `${T('PLASK!')} +${state.streak * target.value}`;
                state.poopMessageUntil = state.elapsed + 1.1;
                break;
            }
            if (!landed && poop.y >= POOP_GROUND + 20) {
                landed = true;
                state.splats.push({ x: poop.x, y: POOP_GROUND + 20, age: 0 });
                playAudio('splat');
                breakStreak();
            }
            if (landed) state.poops.splice(index, 1);
        }
        state.splats.forEach((splat) => { splat.age += delta; splat.x -= scroll; if (splat.target) splat.x -= splat.target.drive * delta; });
        state.splats = state.splats.filter((splat) => splat.age < 2.5 && splat.x > -60);
        updatePoopButton();
    }

    function drawPoopWorld() {
        if (currentLevel.kind !== 'poop' || !['prewarm', 'playing', 'dead'].includes(state.phase)) return;
        ctx.save();
        const dropArt = assets.poopDrop?.naturalWidth ? assets.poopDrop : null;
        state.poops.forEach((poop) => {
            if (dropArt) { ctx.drawImage(dropArt, poop.x - 16, poop.y - 18, 32, 32); return; }
            ctx.fillStyle = '#ffffff';
            ctx.strokeStyle = '#5b6470';
            ctx.lineWidth = 3;
            ctx.beginPath();
            ctx.ellipse(poop.x, poop.y, 10, 13, 0, 0, Math.PI * 2);
            ctx.fill(); ctx.stroke();
            ctx.fillStyle = '#cfd6de';
            ctx.beginPath(); ctx.arc(poop.x - 3, poop.y - 4, 4, 0, Math.PI * 2); ctx.fill();
        });
        state.splats.forEach((splat, splatIndex) => {
            ctx.globalAlpha = Math.max(0, 1 - splat.age / 2.5);
            const splatArt = assets[splatIndex % 2 ? 'poopSplat2' : 'poopSplat1'];
            if (splatArt?.naturalWidth) { ctx.drawImage(splatArt, splat.x - 28, splat.y - 24, 56, 48); return; }
            ctx.fillStyle = '#ffffff';
            ctx.strokeStyle = '#7b8490';
            ctx.lineWidth = 3;
            ctx.beginPath();
            for (let i = 0; i < 10; i += 1) {
                const a = (i / 10) * Math.PI * 2;
                const r = i % 2 ? 11 : 20;
                ctx.lineTo(splat.x + Math.cos(a) * r, splat.y + Math.sin(a) * r * 0.6);
            }
            ctx.closePath(); ctx.fill(); ctx.stroke();
        });
        ctx.globalAlpha = 1;
        // Klat meter under the pause button.
        if (assets.poopMeterFrame?.naturalWidth) {
            ctx.drawImage(assets.poopMeterFrame, 38, 21, 436, 53, 60, 108, 220, 34);
            if (assets.poopMeterIcon?.naturalWidth) ctx.drawImage(assets.poopMeterIcon, 18, 100, 50, 50);
            for (let i = 0; i < POOP_MAX; i += 1) {
                ctx.fillStyle = i < state.poopMeter ? '#ffffff' : 'rgba(255,255,255,.16)';
                ctx.beginPath(); ctx.ellipse(92 + i * 31, 125, 9, 10, 0, 0, Math.PI * 2); ctx.fill();
            }
        } else {
            ctx.fillStyle = 'rgba(8, 16, 30, .78)';
            ctx.fillRect(24, 112, 186, 26);
            for (let i = 0; i < POOP_MAX; i += 1) {
                ctx.fillStyle = i < state.poopMeter ? '#ffffff' : 'rgba(255,255,255,.18)';
                ctx.beginPath(); ctx.ellipse(42 + i * 29, 125, 9, 10, 0, 0, Math.PI * 2); ctx.fill();
            }
        }
        if (state.elapsed < (state.poopMessageUntil || 0) && state.poopMessage) {
            ctx.font = '900 34px "Bert Rounded", sans-serif';
            ctx.textAlign = 'center';
            ctx.lineWidth = 7;
            ctx.strokeStyle = 'rgba(20, 30, 50, .9)';
            ctx.fillStyle = '#fff6b0';
            ctx.strokeText(state.poopMessage, VIEW.width / 2, 170);
            ctx.fillText(state.poopMessage, VIEW.width / 2, 170);
        }
        ctx.restore();
    }

    // Target art: content boxes measured on the 512 px sprites (car/cabrio bottoms at y≈369/362).
    const TARGET_ART = Object.freeze({
        car: { key: 'poopCar', box: [40, 143, 472, 369] },
        cabrio: { key: 'poopCabrio', box: [40, 149, 472, 362] },
        icecream: { key: 'poopIcecream', box: [89, 41, 422, 471] },
        statue: { key: 'poopStatue', box: [135, 41, 377, 471] },
        gold: { key: 'poopGold', box: [41, 177, 472, 335] },
    });
    function drawTarget(target) {
        if (target.type === 'umbrella') {
            const open = umbrellaOpen(target);
            const key = open ? 'poopUmbrellaOpen' : 'poopUmbrellaClosed';
            const box = open ? [94, 40, 409, 472] : [120, 53, 418, 468];
            if (assets[key]?.naturalWidth) {
                // Keep the person's feet on the same spot in both frames.
                const scale = target.height / (box[3] - box[1]);
                const width = (box[2] - box[0]) * scale;
                ctx.drawImage(assets[key], box[0], box[1], box[2] - box[0], box[3] - box[1],
                    target.x + target.width / 2 - width / 2, target.y, width, target.height);
                return;
            }
        }
        const art = TARGET_ART[target.type];
        if (art && assets[art.key]?.naturalWidth) {
            const [x0, y0, x1, y1] = art.box;
            ctx.drawImage(assets[art.key], x0, y0, x1 - x0, y1 - y0, target.x, target.y, target.width, target.height);
            return;
        }
        ctx.save();
        const x = target.x;
        const y = target.y;
        const w = target.width;
        const h = target.height;
        ctx.lineWidth = 4;
        ctx.strokeStyle = '#1b2230';
        if (['car', 'cabrio', 'gold'].includes(target.type)) {
            const body = target.type === 'gold' ? '#f5c33b' : target.type === 'cabrio' ? '#6fb7e8' : '#d94a3a';
            ctx.fillStyle = body;
            ctx.beginPath();
            ctx.moveTo(x + 6, y + h - 26);
            ctx.lineTo(x + 6, y + h * 0.45);
            ctx.lineTo(x + w * 0.22, y + h * 0.42);
            if (target.type === 'cabrio') { ctx.lineTo(x + w * 0.38, y + h * 0.18); ctx.lineTo(x + w * 0.42, y + h * 0.42); }
            else { ctx.lineTo(x + w * 0.32, y + 4); ctx.lineTo(x + w * 0.7, y + 4); ctx.lineTo(x + w * 0.82, y + h * 0.42); }
            ctx.lineTo(x + w - 6, y + h * 0.48);
            ctx.lineTo(x + w - 6, y + h - 26);
            ctx.closePath(); ctx.fill(); ctx.stroke();
            if (target.type !== 'cabrio') {
                ctx.fillStyle = '#bfe6ff';
                ctx.fillRect(x + w * 0.36, y + 12, w * 0.3, h * 0.26);
                ctx.strokeRect(x + w * 0.36, y + 12, w * 0.3, h * 0.26);
            }
            ctx.fillStyle = '#20242c';
            [x + w * 0.24, x + w * 0.76].forEach((wx) => { ctx.beginPath(); ctx.arc(wx, y + h - 22, 20, 0, Math.PI * 2); ctx.fill(); ctx.stroke(); });
            if (target.type === 'gold') {
                ctx.fillStyle = '#fff6c0';
                for (let i = 0; i < 3; i += 1) {
                    const a = state.worldTime * 3 + i * 2;
                    ctx.beginPath(); ctx.arc(x + w / 2 + Math.cos(a) * w * 0.4, y + Math.sin(a) * 18, 4, 0, Math.PI * 2); ctx.fill();
                }
            }
        } else if (target.type === 'statue') {
            ctx.fillStyle = '#9aa3ad';
            ctx.fillRect(x + 10, y + h - 60, w - 20, 60); ctx.strokeRect(x + 10, y + h - 60, w - 20, 60);
            ctx.fillStyle = '#b07a3e';
            ctx.beginPath(); ctx.arc(x + w / 2, y + 26, 22, 0, Math.PI * 2); ctx.fill(); ctx.stroke();
            ctx.fillRect(x + w / 2 - 22, y + 46, 44, h - 110); ctx.strokeRect(x + w / 2 - 22, y + 46, 44, h - 110);
        } else {
            // A person: tourist with ice cream, or someone with an umbrella.
            ctx.fillStyle = target.type === 'icecream' ? '#f29c52' : '#4f6fb3';
            ctx.fillRect(x + w / 2 - 22, y + 62, 44, h - 62); ctx.strokeRect(x + w / 2 - 22, y + 62, 44, h - 62);
            ctx.fillStyle = '#f2c9a0';
            ctx.beginPath(); ctx.arc(x + w / 2, y + 46, 18, 0, Math.PI * 2); ctx.fill(); ctx.stroke();
            if (target.type === 'icecream') {
                ctx.fillStyle = '#e8b766';
                ctx.beginPath(); ctx.moveTo(x + w / 2 + 26, y + 40); ctx.lineTo(x + w / 2 + 38, y + 2 + 40); ctx.lineTo(x + w / 2 + 14, y + 42); ctx.closePath();
                ctx.fillStyle = '#ffb6d0';
                ctx.beginPath(); ctx.arc(x + w / 2 + 26, y + 18, 14, 0, Math.PI * 2); ctx.fill(); ctx.stroke();
                ctx.fillStyle = '#e8b766';
                ctx.beginPath(); ctx.moveTo(x + w / 2 + 14, y + 28); ctx.lineTo(x + w / 2 + 38, y + 28); ctx.lineTo(x + w / 2 + 26, y + 60); ctx.closePath(); ctx.fill(); ctx.stroke();
            } else {
                const open = umbrellaOpen(target);
                ctx.fillStyle = '#e04f7a';
                ctx.beginPath();
                if (open) { ctx.arc(x + w / 2, y + 30, 58, Math.PI, 0); ctx.closePath(); }
                else { ctx.moveTo(x + w / 2 - 8, y - 6); ctx.lineTo(x + w / 2 + 8, y - 6); ctx.lineTo(x + w / 2 + 3, y + 40); ctx.lineTo(x + w / 2 - 3, y + 40); ctx.closePath(); }
                ctx.fill(); ctx.stroke();
                ctx.beginPath(); ctx.moveTo(x + w / 2, y + 30); ctx.lineTo(x + w / 2, y + 80); ctx.stroke();
            }
        }
        ctx.restore();
    }

    function drawPoopHazard(hazard) {
        ctx.save();
        ctx.lineWidth = 4;
        ctx.strokeStyle = '#1b2230';
        if (hazard.type === 'lamp' && assets.v2LampPost?.naturalWidth) {
            // Art is cropped to the lamp: keep its aspect, pole centred on the hit box.
            const art = assets.v2LampPost;
            const height = hazard.height - 40;
            const width = height * art.naturalWidth / art.naturalHeight;
            ctx.drawImage(art, hazard.x + hazard.width / 2 - width / 2, hazard.y, width, height + 40);
        } else if (hazard.type === 'lamp') {
            ctx.fillStyle = '#3d4655';
            ctx.fillRect(hazard.x + 12, hazard.y + 30, 16, hazard.height); ctx.strokeRect(hazard.x + 12, hazard.y + 30, 16, hazard.height);
            ctx.fillStyle = '#ffe28a';
            ctx.beginPath(); ctx.arc(hazard.x + 20, hazard.y + 22, 20, 0, Math.PI * 2); ctx.fill(); ctx.stroke();
        } else if (assets.poopLaundry?.naturalWidth) {
            ctx.strokeStyle = '#2b2b2b';
            ctx.lineWidth = 3;
            ctx.beginPath();
            ctx.moveTo(hazard.x + 4, -10); ctx.lineTo(hazard.x + 4, hazard.y + 12);
            ctx.moveTo(hazard.x + hazard.width - 4, -10); ctx.lineTo(hazard.x + hazard.width - 4, hazard.y + 12);
            ctx.stroke();
            ctx.drawImage(assets.poopLaundry, 40, 174, 432, 163, hazard.x, hazard.y, hazard.width, hazard.height);
        } else {
            ctx.strokeStyle = '#2b2b2b';
            ctx.lineWidth = 3;
            ctx.beginPath(); ctx.moveTo(hazard.x - 30, 10); ctx.quadraticCurveTo(hazard.x + hazard.width / 2, 60, hazard.x + hazard.width + 30, 10); ctx.stroke();
            const colors = ['#ffffff', '#5cc3ff', '#ff8fb1', '#ffe066'];
            for (let i = 0; i < 4; i += 1) {
                const cx = hazard.x + 20 + i * 60;
                ctx.fillStyle = colors[i];
                ctx.strokeStyle = '#1b2230';
                ctx.lineWidth = 3;
                ctx.fillRect(cx, 36, 44, hazard.height - 40);
                ctx.strokeRect(cx, 36, 44, hazard.height - 40);
            }
        }
        ctx.restore();
    }

    function spawnGlideGroup() {
        // A tower from the ground, sometimes a balloon in the air, and a thermal every other group.
        const x = VIEW.width + 80;
        const height = randomBetween(170, 200 + Math.min(260, state.elapsed * 3));
        const pick = Math.floor(gameRandom() * 3);
        const width = pick === 1 ? 230 : 140;
        obstacles.push({ id: state.obstacleId++, kind: 'glide-tower', art: `g7Hill${pick}`, x, y: VIEW.height - height, width, height, harmful: true, age: 0 });
        if (gameRandom() < 0.4 + Math.min(0.3, state.elapsed / 200)) {
            obstacles.push({ id: state.obstacleId++, kind: 'glide-balloon', x: x + 330, y: randomBetween(90, 330), width: 110, height: 150, harmful: true, age: 0, phase: gameRandom() * 6 });
        }
        state.glideCount = (state.glideCount || 0) + 1;
        if (state.glideCount % 2 === 1) {
            obstacles.push({ id: state.obstacleId++, kind: 'glide-thermal', x: x + 250, y: 0, width: 150, height: VIEW.height, harmful: false, age: 0, source: Math.floor(gameRandom() * 3) });
        }
        // A short arc of stars to dive through.
        for (let i = 0; i < 4; i += 1) {
            collectibles.push({ x: x + 420 + i * 70, y: VIEW.height - height - 120 + Math.sin(i / 3 * Math.PI) * -60, width: 52, height: 52, kind: 'star', spin: 0, age: 0, collected: false });
        }
    }

    function spawnObstacle() {
        if (currentLevel.kind === 'glide') { spawnGlideGroup(); return; }
        const x = VIEW.width + 120;
        const id = state.obstacleId++;
        if (currentLevel.kind === 'poop') {
            spawnPoopEncounter(x, id);
            return;
        }
        if (BertAdventure.isTheme(currentLevel.kind)) {
            const encounter = BertAdventure.createEncounter(currentLevel.kind, id, x, gameRandom, state.difficulty);
            obstacles.push(...encounter.obstacles);
            if (encounter.star) collectibles.push(makeCollectible(encounter.star.x, clamp(encounter.star.y, 110, currentLevel.kind === 'volcano' ? Math.min(600, state.lavaTop - 110) : 600)));
            return;
        }
        if (currentLevel.kind === 'birdRun') {
            const wave = BertBirdRun.createWave(id, x, gameRandom);
            obstacles.push(...wave.obstacles);
            if (wave.star) collectibles.push(makeCollectible(wave.star.x, wave.star.y));
            return;
        }
        if (currentLevel.kind === 'stormline') {
            const encounter = BertStormline.createEncounter(id, x, gameRandom,
                BertStormline.windCue(state.worldTime));
            obstacles.push(encounter.obstacle);
            collectibles.push(makeCollectible(encounter.star.x, encounter.star.y));
            return;
        }
        if (currentLevel.kind === 'edm') {
            const group = BertEDM.createGroup(id, x, state.difficulty, gameRandom);
            obstacles.push(...group.obstacles);
            group.stars.forEach((star) => collectibles.push(makeCollectible(star.x, star.y)));
            // Smoke cannons join after 15 s: a warned white jet from the floor or ceiling.
            if (state.elapsed > 15 && gameRandom() < 0.35) {
                const fromTop = gameRandom() < 0.5;
                const jet = BertAdventure.columnAt('nightcity', id, x + 430, state.difficulty, gameRandom, {
                    fromTop, palette: 'smoke', peak: fromTop ? randomBetween(300, 400) : randomBetween(300, 420),
                });
                jet.theme = 'nightcity';
                obstacles.push(jet);
            }
            return;
        }
        // Only every fourth Desert pair is narrow. The earliest two pairs stay generous.
        const narrowDesertPair = currentLevel.kind === 'desert' && id >= 2 && id % 4 === 2;
        // Desert gets tighter over time (feedback): the gap shrinks with the run's clock,
        // not only with difficulty, so a long run keeps getting harder.
        const desertShrink = currentLevel.kind === 'desert' ? clamp(state.elapsed / 90, 0, 1) * 70 : 0;
        const desertGapFloor = narrowDesertPair
            ? clamp(284 - state.difficulty * 10 - desertShrink, 205, 280)
            : clamp(325 - state.difficulty * 18 - desertShrink, 225, 307);
        const gap = currentLevel.mode === MODE.FLAPPY
            ? flappyGap()
            : currentLevel.kind === 'desert'
                ? randomBetween(desertGapFloor, desertGapFloor + (narrowDesertPair ? 18 : 42))
                : 285;
        const minimum = 120;
        let gapTop = randomBetween(minimum, VIEW.height - minimum - gap);
        if (currentLevel.kind === 'desert') {
            // Bigger vertical jumps between pairs, so Bert has to use the whole screen.
            const lastTop = state.lastDesertGapTop ?? gapTop;
            const span = VIEW.height - 2 * minimum - gap;
            if (Math.abs(gapTop - lastTop) < span * 0.45) gapTop = lastTop < minimum + span / 2 ? minimum + span * (0.7 + gameRandom() * 0.3) : minimum + span * gameRandom() * 0.3;
            state.lastDesertGapTop = gapTop;
        }

        if (currentLevel.kind === 'tunnel') {
            const worldX = state.worldDistance + x;
            const variant = currentLevel.variant;
            const stream = variant === BertTunnel.VARIANTS.STAR_STREAM;
            const pulse = variant === BertTunnel.VARIANTS.PULSE;
            const count = stream ? 8 : pulse ? 5 : 3;
            const spacing = stream ? 76 : pulse ? 116 : 94;
            const baseLane = stream ? 0 : Math.floor(gameRandom() * 3) - 1;
            for (let index = 0; index < count; index += 1) {
                const starX = x + index * spacing;
                const starWorldX = worldX + index * spacing;
                const lane = pulse ? (index % 3) - 1 : baseLane;
                const risk = stream ? index % 4 === 3 : pulse ? index % 2 === 1 : Math.abs(lane) === 1;
                collectibles.push(makeCollectible(
                    starX,
                    BertTunnel.starY(starWorldX, state.difficulty, lane, variant),
                    risk,
                ));
            }
            return;
        }
        if (currentLevel.kind === 'flappy' || currentLevel.kind === 'desert') {
            const kind = currentLevel.kind === 'flappy' ? 'flappy-pipe' : 'desert-wall';
            const desertWidths = [118, 136, 156, 180, 208, 238];
            const topVariant = currentLevel.kind === 'desert' ? Math.floor(gameRandom() * desertWidths.length) : 0;
            const bottomVariant = currentLevel.kind === 'desert' ? Math.floor(gameRandom() * desertWidths.length) : 0;
            const pipeWidth = currentLevel.kind === 'flappy' ? randomBetween(108, 124) : 112;
            const topWidth = currentLevel.kind === 'flappy' ? pipeWidth : desertWidths[topVariant];
            const bottomWidth = currentLevel.kind === 'flappy' ? pipeWidth : desertWidths[bottomVariant];
            const pairCenter = x + Math.max(topWidth, bottomWidth) / 2;
            const movingPair = currentLevel.kind === 'flappy'
                && (currentLevel.variant === 'moving' || (currentLevel.variant === 'mixed' && id % 2 === 1));
            const motionAmplitude = movingPair ? randomBetween(42, currentLevel.variant === 'moving' ? 78 : 92) : 0;
            const motionSpeed = movingPair ? randomBetween(0.75, 1.22) : 0;
            const motionPhase = movingPair ? gameRandom() * Math.PI * 2 : 0;
            // New-style Desert has three drawn pillars and no terrain-textured wall.
            const desertSkins = V2.levels.has('desert') ? ['desertRuin', 'desertBanded', 'desertEtched'] : ['desertTerrain', 'desertRuin', 'desertBanded', 'desertEtched'];
            const flappySkins = movingPair
                ? ['flappyPipeBlue', 'flappyPearl']
                : ['flappyPipe', 'flappyPipeGold', 'flappyCopper'];
            const skinChoices = currentLevel.kind === 'desert' ? desertSkins : flappySkins;
            const topSkin = skinChoices[Math.floor(gameRandom() * skinChoices.length)];
            const bottomSkin = currentLevel.kind === 'desert'
                ? skinChoices[Math.floor(gameRandom() * skinChoices.length)]
                : topSkin;
            // Moving columns always roll one way now (no up-down 'kick'), fast enough
            // that it reads as a column travelling all the way through.
            const conveyor = movingPair
                ? (gameRandom() < 0.5 ? -1 : 1) * clamp(115 + state.difficulty * 35, 115, 185) : 0;
            const pairData = { gap, baseGapTop: gapTop, motionAmplitude, motionSpeed, motionPhase, moving: movingPair, conveyor };
            obstacles.push({ x: pairCenter - topWidth / 2, y: 0, width: topWidth, height: gapTop, kind, top: true, harmful: true, age: 0, id, variant: topVariant, artKey: topSkin, ...pairData });
            obstacles.push({ x: pairCenter - bottomWidth / 2, y: gapTop + gap, width: bottomWidth, height: VIEW.height - gapTop - gap, kind, top: false, harmful: true, age: 0, id, variant: bottomVariant, artKey: bottomSkin, ...pairData });
            const risk = gameRandom() < 0.34 && !conveyor;
            // A conveyor's gap moves, so its star waits in open air before the column.
            const starY = conveyor ? randomBetween(250, 470) : gapTop + gap * (risk ? (gameRandom() < 0.5 ? 0.24 : 0.76) : 0.5);
            collectibles.push(makeCollectible(conveyor ? pairCenter - 200 : pairCenter, starY, risk));
            return;
        }
        if (currentLevel.kind === 'jungle' && state.elapsed > 10 && gameRandom() < 0.2) {
            // A huge spider web from the canopy or the ground: fly over or under it.
            const fromTop = gameRandom() < 0.5;
            const height = randomBetween(260, 360) + Math.min(60, state.difficulty * 25);
            const width = height * 0.82;
            const y = fromTop ? 0 : 652 - height;
            obstacles.push({ x, y, width, height, kind: 'jungle-web', top: fromTop, harmful: true, age: 0, id, sway: gameRandom() * Math.PI * 2 });
            collectibles.push(makeCollectible(x + width / 2, fromTop ? Math.min(560, height + 110) : Math.max(110, y - 110)));
            return;
        }
        if (currentLevel.kind === 'jungle') {
            const spider = gameRandom() < 0.75;
            const scale = spider ? randomBetween(0.9, 1.12) : randomBetween(1.2, 1.5);
            const width = (spider ? 124 : 76) * scale;
            const height = (spider ? 87 : 119) * scale;
            const fromTop = spider;
            // Snakes sit on a rock that rises above the foreground grass.
            const groundAnchor = spider ? randomBetween(610, 646) : randomBetween(596, 624);
            const y = fromTop ? randomBetween(64, 190) : groundAnchor - height;
            obstacles.push({
                x, y, width, height, kind: spider ? 'jungle-spider' : 'jungle-snake',
                harmful: true, top: fromTop, age: 0, bob: gameRandom() * Math.PI * 2,
                animationPhase: gameRandom() * 4, id, scale,
                baseY: y, baseBottom: fromTop ? y + height : groundAnchor, attackState: 'idle', attackElapsed: 0,
                renderX: x, renderY: y, renderWidth: width, renderHeight: height,
            });
            // The old star sat on the enemy itself. Put it behind the passed enemy,
            // in a readable flight lane; the first encounters stay near Bert's start height.
            const introductory = state.elapsed < 35;
            const starY = introductory
                ? 360 + ((id % 3) - 1) * 42
                : 360 + ((id % 5) - 2) * 42;
            collectibles.push(makeCollectible(x + 260, starY));
            return;
        }
        if (currentLevel.kind === 'happySky') {
            if (gameRandom() < 0.48) {
                const pipeGap = 275;
                const baseGapTop = randomBetween(120, VIEW.height - pipeGap - 120);
                const colors = ['blue', 'green', 'purple', 'red', 'yellow', 'coral'];
                const color = colors[Math.floor(gameRandom() * colors.length)];
                const motionAmplitude = randomBetween(22, 64);
                const motionSpeed = randomBetween(0.9, 1.45);
                const motionPhase = gameRandom() * Math.PI * 2;
                const width = randomBetween(118, 146);
                // Variety (feedback 4. okt.): some columns roll steadily one way, some lean.
                const style = gameRandom();
                const conveyor = state.elapsed > 8 && style < 0.3
                    ? (gameRandom() < 0.5 ? -1 : 1) * clamp(100 + state.difficulty * 30, 100, 165) : 0;
                const tilt = !conveyor && state.elapsed > 8 && style < 0.6 ? (gameRandom() < 0.5 ? -1 : 1) * randomBetween(0.12, 0.2) : 0;
                const extra = { conveyor, tilt };
                obstacles.push({ x, y: 0, width, height: baseGapTop, gap: pipeGap, baseGapTop, kind: 'happy-pipe', color, top: true, harmful: true, age: 0, id, motionAmplitude, motionSpeed, motionPhase, ...extra });
                obstacles.push({ x, y: baseGapTop + pipeGap, width, height: VIEW.height - baseGapTop - pipeGap, gap: pipeGap, baseGapTop, kind: 'happy-pipe', color, top: false, harmful: true, age: 0, id, motionAmplitude, motionSpeed, motionPhase, ...extra });
                const risk = gameRandom() < 0.4 && !conveyor;
                collectibles.push(conveyor
                    ? makeCollectible(x - 180, randomBetween(250, 470))
                    : makeCollectible(x + width / 2, baseGapTop + pipeGap * (risk ? 0.25 : 0.5), risk));
                return;
            }
            // New-style Happy Sky: a hot-air balloon that drifts slowly up and down.
            if (V2.levels.has('happySky') && assets.v2Balloon?.naturalWidth && gameRandom() < 0.4) {
                const height = randomBetween(230, 280);
                const width = height * assets.v2Balloon.naturalWidth / assets.v2Balloon.naturalHeight;
                const baseY = randomBetween(110, VIEW.height - height - 140);
                obstacles.push({ x, y: baseY, baseY, width, height, kind: 'happy-balloon', harmful: true, top: false, age: 0, bob: gameRandom() * Math.PI * 2, id });
                collectibles.push(makeCollectible(x + width / 2, baseY > 300 ? baseY - 90 : baseY + height + 90));
                return;
            }
            // Unity size: the rainbow sprite is 9.19 × 4.33 world units (≈660 × 312 px),
            // a big arch rising from the clouds or hanging from the sky.
            const top = gameRandom() > 0.5;
            const width = randomBetween(540, 720);
            const height = width * (433 / 919);
            const y = top ? randomBetween(-height * 0.32, -height * 0.08) : randomBetween(690 - height, 690 - height * 0.78);
            obstacles.push({ x, y, width, height, kind: 'happy-rainbow', harmful: true, top, age: 0, bob: 0, id });
            collectibles.push(makeCollectible(x + width / 2, top ? y + height + 70 : y - 70));
        }
    }

    function spawnPowerup() {
        const experimental = currentLevel === STORMLINE_EVENT;
        const available = experimental
            ? [BertEventPowerups.nextType(state.eventPickupIndex, state.seed)]
            : [POWERUP.SHIELD, POWERUP.MAGNET, POWERUP.FOCUS,
                // Mixed blessings: Tung and Flappy-styring make it harder,
                // Hyperfart is risky, Point x2 is a bonus. From 20 s in.
                // Omvendt styring removed (feedback 9. okt.: the only purely negative one).
                ...(state.elapsed >= 20 ? [POWERUP.HEAVY, POWERUP.HYPER, POWERUP.DOUBLE, POWERUP.GROW, POWERUP.SHRINK,
                    ...(currentLevel.mode === MODE.FLAPPY ? [] : [POWERUP.FLAP])] : [])]
                .filter((type) => (state.powerupReadyAt[type] ?? 0) <= state.elapsed);
        const guardAvailable = !experimental && state.elapsed >= 30 && state.streakGuardCharges === 0 && state.powerupReadyAt.Guard <= state.elapsed;
        const guardRoll = guardAvailable && gameRandom() < 0.12;
        if (available.length === 0 && !guardRoll) return false;
        // Independent 12% roll. One charge max, 90-second cooldown, no extra life.
        const type = guardRoll
            ? POWERUP.GUARD : available[Math.floor(gameRandom() * available.length)];
        // A faster pickup needs more initial distance or it could overtake the
        // preceding obstacle and briefly look safe while overlapping its collider.
        const rightmost = experimental
            ? [...obstacles, ...collectibles].reduce((x, item) => Math.max(x, item.x + (item.width || 0)), -Infinity)
            : obstacles.reduce((x, obstacle) => Math.max(x, obstacle.x + obstacle.width), -Infinity);
        const y = experimental ? randomBetween(260, 340) : randomBetween(155, VIEW.height - 155);
        const motion = BertCollectibleMotion.create(currentLevel.kind, y, gameRandom);
        const x = BertCollectibleMotion.safeSpawnX(VIEW.width, rightmost, bird.x, motion.scrollFactor);
        collectibles.push(makePowerupPickup(type, x, y, null, motion));
        if (experimental) state.eventPickupIndex += 1;
        return true;
    }

    // Five hidden stickers on every level (round 6: 3 levels, round 8: the other 12).
    const STICKER_SETS = Object.freeze({ 1: 'desert', 4: 'jungle', 5: 'sky', 3: 'city', 6: 'shift', 7: 'flappy3', 2: 'tunnel', 8: 'tunnel2', 9: 'tunnel3',
        21: 'harbor', 22: 'night', 24: 'wind', 23: 'volcano', 20: 'ice', 25: 'poop' });
    const STICKER_BOOK = Object.freeze([[1, 'desert'], [4, 'jungle'], [5, 'sky'], [3, 'city'], [6, 'shift'], [7, 'flappy3'], [2, 'tunnel'], [8, 'tunnel2'], [9, 'tunnel3'],
        [21, 'harbor'], [22, 'night'], [24, 'wind'], [23, 'volcano'], [20, 'ice'], [25, 'poop']]);
    const stickerImages = new Map();
    function stickerArt(id) {
        // Loaded the first time a sticker is shown, so 75 small images never slow the start.
        if (!stickerImages.has(id)) stickerImages.set(id, Object.assign(new Image(), { src: ['assets/v2/g6/stickers', `${id.replace('_', '-')}.webp`].join('/') }));
        return stickerImages.get(id);
    }
    const STICKER_TIMES = Object.freeze([14, 33, 55, 82, 120]);

    function spawnFeather(kind = 'feather') {
        const rightmost = obstacles.reduce((x, obstacle) => Math.max(x, obstacle.x + obstacle.width), -Infinity);
        const y = randomBetween(170, VIEW.height - 170);
        const motion = BertCollectibleMotion.create(currentLevel.kind, y, gameRandom);
        const x = BertCollectibleMotion.safeSpawnX(VIEW.width, rightmost, bird.x, motion.scrollFactor);
        const corridor = motion.tunnel
            ? BertTunnel.profileAt(state.worldDistance + x, state.difficulty, currentLevel.variant).center
            : motion.baseY;
        collectibles.push({ x, y: BertCollectibleMotion.yAt(motion, 0, corridor), width: 70, height: 70,
            kind, spin: 0, age: 0, motion, collected: false });
    }

    function collectFeather(collectible) {
        state.feathersPicked += 1;
        if (!opMode()) BertMeta.addFeathers(1);
        state.runFeathers = (state.runFeathers || 0) + 1;
        (state.flyingPickups ||= []).push({ kind: 'feather', x: bird.x + BIRD.width / 2, y: bird.y, tx: 70, ty: 100, age: 0 });
        playAudio('point');
        BertMeta.haptic('star');
        burst(collectible.x, collectible.y, '#fff1c7', 10);
        dom.powerup.textContent = T('+1 FJER');
        dom.powerup.classList.add('active');
        state.featherFlashUntil = state.elapsed + 1.4;
    }

    function makePowerupPickup(type, x, y, requestedProfile = null, preparedMotion = null) {
        const motion = preparedMotion || BertCollectibleMotion.create(currentLevel.kind, y, gameRandom, requestedProfile);
        const corridor = motion.tunnel
            ? BertTunnel.profileAt(state.worldDistance + x, state.difficulty, currentLevel.variant).center
            : motion.baseY;
        return { x, y: BertCollectibleMotion.yAt(motion, 0, corridor),
            width: 124, height: 120, kind: 'powerup', type,
            spin: 0, age: 0, motion, collected: false };
    }

    // Stars start drifting once a run heats up: more of them, and further,
    // the harder it gets. Tunnel stars follow their own path and stay put.
    const DRIFTING_STAR_KINDS = new Set(['desert', 'jungle', 'flappy', 'happySky', 'edm', 'stormline', 'iceberg', 'harbor', 'nightcity', 'volcano', 'windfarm']);
    function starDrift(risk) {
        if (!DRIFTING_STAR_KINDS.has(currentLevel.kind) || state.phase !== 'playing') return null;
        const heat = clamp((state.difficulty - 0.55) / 1.2, 0, 1);
        if (gameRandom() > heat * 0.75) return null;
        const reach = risk ? 22 : 30 + 50 * heat;
        return { amplitude: reach, speed: 1.6 + gameRandom() * 1.4 + heat, phase: gameRandom() * Math.PI * 2, offset: 0 };
    }
    function makeCollectible(x, y, risk = false) {
        return { x, y, width: risk ? 54 : 48, height: risk ? 54 : 48, kind: 'star', spin: gameRandom() * Math.PI, collected: false, risk, value: risk ? 2 : 1,
            age: 0, drift: starDrift(risk) };
    }

    function collectStar(collectible = null) {
        state.maxNoStar = Math.max(state.maxNoStar || 0, state.elapsed - (state.lastStarAt || 0));
        state.lastStarAt = state.elapsed;
        const value = collectible?.value || 1;
        if (collectible) {
            (state.sparkles ||= []).push({ x: collectible.x, y: collectible.y, age: 0 });
            (state.flyingPickups ||= []).push({ kind: 'star', x: collectible.x, y: collectible.y, tx: HUD_SCORE_TARGET.x, ty: HUD_SCORE_TARGET.y, age: 0 });
        }
        state.streak += 1;
        state.bestStreak = Math.max(state.bestStreak, state.streak);
        state.starsCollected += value;
        noteCombo(state.streak);
        if (currentLevel.swarm && state.streak > 0 && state.streak % 10 === 0 && (state.swarm ||= []).length < 10) {
            const owned = BertMeta.heroCatalog().filter((hero) => hero.owned).map((hero) => hero.id);
            state.swarm.push({ hero: owned[Math.floor(Math.random() * owned.length)] || 'blue', x: bird.x, y: bird.y });
            (state.imageFx ||= []).push({ key: 'g7SwarmJoin', x: bird.x - 40, y: bird.y + 30, age: 0 });
            playAudio('bert_pip');
        }
        if (currentLevel.swarm && state.swarm?.length) state.score += state.swarm.length; // each bird adds a point per star
        state.score += BertEventPowerups.score(state.streak * value, state.activePowerup) * (state.activePowerup === POWERUP.GROW ? 2 : 1)
            + (BertMeta.nestPerks?.().gold && state.elapsed < 10 && !isEventLevel() ? 1 : 0);
        if (!isEventLevel() && state.cleanRun && state.score >= 180 && BertMeta.noteCleanScore(state.score)) {
            window.BertApp?.showToast(T('NOIRWING LÅST OP · FEJLFRI FLYVNING'));
            BertMeta.haptic('reward');
        }
        playAudio('point');
        BertMeta.haptic(value > 1 ? 'bonusStar' : 'star');
        burst(bird.x + BIRD.width / 2, bird.y + BIRD.height / 2, '#ffd93b', 6);
        updateHud();
    }

    function activatePowerup(type) {
        state.runPowerups = (state.runPowerups || 0) + 1;
        if (BertEventPowerups.isPrototype(type)) {
            if (state.activePowerup) return;
            if (type === POWERUP.FLAP) {
                // Held fingers stay tracked; direction pauses while tapping is the control
                // and comes back by itself when the power-up ends.
                state.inputUp = false;
                state.inputDown = false;
            }
        }
        if (type === POWERUP.GUARD) {
            if (state.streakGuardCharges > 0) return;
            state.streakGuardCharges = 1;
            state.powerupReadyAt.Guard = state.elapsed + 90;
            burst(bird.x + BIRD.width / 2, bird.y + BIRD.height / 2, '#ffe08a', 10);
            playAudio('shieldOn');
            BertMeta.haptic('powerup');
            updateHud();
            return;
        }
        state.activePowerup = type;
        const duration = type === POWERUP.FOCUS ? FOCUS_DURATION_SECONDS
            : type === POWERUP.REVERSE ? REVERSE_SECONDS
            : SIZE_POWERUP[type] ? 8
            : (BertEventPowerups.DURATION[type] || 10) + (type === POWERUP.SHIELD && BertMeta.nestPerks?.().shield ? 2 : 0);
        state.powerupEndsAt = state.elapsed + duration + (type === POWERUP.FOCUS ? FOCUS_COUNTDOWN_SECONDS : 0);
        state.powerupReadyAt[type] = state.elapsed + 60;
        if (type === POWERUP.SHIELD) {
            state.shieldCharges = 1;
            playAudio('shieldOn');
        } else if (type === POWERUP.MAGNET) {
            playAudio('magnetUp');
            if (audio.magnetRunning && BertMeta.settingEnabled('sfx')) {
                audio.magnetRunning.currentTime = 0;
                audio.magnetRunning.play().catch(() => {});
            }
        } else if (type === POWERUP.FOCUS) {
            state.focusPhase = 'countdown';
            state.focusTransition = 0;
            state.focusCountdown = FOCUS_COUNTDOWN_SECONDS;
            state.focusRemaining = duration;
            primeFocusAudio();
        } else if (SIZE_POWERUP[type]) {
            playAudio(type === POWERUP.GROW ? 'shieldOn' : 'magnetDown');
            // A short grace period so growing inside a gap is never an instant death.
            if (type === POWERUP.GROW) state.invulnerableUntil = Math.max(state.invulnerableUntil, state.elapsed + 0.9);
        } else if (BertEventPowerups.isPrototype(type) || type === POWERUP.REVERSE) {
            playAudio('pop');
            if (type === POWERUP.FLAP) {
                bird.velocity = Math.min(bird.velocity, -250);
            }
        }
        const powerupNames = { [POWERUP.SHIELD]: T('SKJOLD'), [POWERUP.MAGNET]: T('MAGNET'),
            [POWERUP.HEAVY]: T('TUNG'), [POWERUP.HYPER]: T('HYPERFART'), [POWERUP.REVERSE]: T('OMVENDT STYRING'), [POWERUP.DOUBLE]: 'POINT ×2', [POWERUP.FLAP]: T('FLAPPY-STYRING'),
            [POWERUP.GROW]: T('FORSTØR'), [POWERUP.SHRINK]: T('FORMINDSK') };
        dom.powerup.textContent = type === POWERUP.FOCUS ? T('FOKUS') : `${powerupNames[type] || type.toUpperCase()} · ${duration}s`;
        dom.powerup.classList.add('active');
        burst(bird.x + BIRD.width / 2, bird.y + BIRD.height / 2, type === POWERUP.SHIELD ? '#65d8ff' : '#ffd93b', 16);
        BertMeta.haptic('powerup');
    }

    function deactivatePowerup(reason = 'timeout') {
        const type = state.activePowerup;
        if (!type) return;
        if (type === POWERUP.FOCUS && state.focusPhase === 'countdown') {
            state.focusPhase = 'idle';
            state.focusCountdown = 0;
            state.focusRemaining = 0;
            state.activePowerup = null;
            dom.powerup.textContent = '';
            dom.powerup.classList.remove('active');
            return;
        }
        if (type === POWERUP.FOCUS && state.focusPhase !== 'idle' && state.focusPhase !== 'exit') {
            state.focusPhase = 'exit';
            state.focusTransition = 0;
            state.focusRemaining = 0;
            const levelMusic = activeLevelMusic();
            if (levelMusic && BertMeta.settingEnabled('music')) {
                levelMusic.volume = 0;
                levelMusic.play().catch(() => {});
            }
            return;
        }
        if (type === POWERUP.MAGNET) {
            audio.magnetRunning?.pause();
            if (audio.magnetRunning) audio.magnetRunning.currentTime = 0;
            playAudio('magnetDown');
        }
        if (type === POWERUP.SHIELD && reason === 'timeout') playAudio('shieldOff');
        if (type === POWERUP.FLAP) clearTouchDirection();
        state.activePowerup = null;
        state.shieldCharges = 0;
        dom.powerup.textContent = '';
        dom.powerup.classList.remove('active');
    }

    function cancelPowerupsForDeath() {
        audio.focus?.pause();
        audio.magnetRunning?.pause();
        if (audio.focus) {
            audio.focus.currentTime = 0;
            audio.focus.volume = 0;
        }
        if (audio.magnetRunning) audio.magnetRunning.currentTime = 0;
        state.activePowerup = null;
        state.shieldCharges = 0;
        state.focusPhase = 'idle';
        state.focusTransition = 0;
        state.focusCountdown = 0;
        state.focusRemaining = 0;
        dom.powerup.textContent = '';
        dom.powerup.classList.remove('active');
    }

    function breakStreak() {
        if (state.streak <= 0) return;
        if (state.streakGuardCharges > 0) {
            state.streakGuardCharges = 0;
            state.guardNoticeUntil = state.elapsed + 1.35;
            burst(bird.x + BIRD.width / 2, bird.y + BIRD.height / 2, '#ffe08a', 10);
            playAudio('shieldBreak');
            BertMeta.haptic('shield');
            window.BertApp?.showToast(T('Streak Guard reddede din streak'));
            updateHud();
            return;
        }
        const brokenStreak = state.streak;
        state.bestStreak = Math.max(state.bestStreak, state.streak);
        state.streak = 0;
        // A missed star gets a soft "aww", not an explosion.
        playAudio('miss');
        if (brokenStreak >= 3) BertMeta.haptic('warning');
        updateHud();
    }

    // OP mode ("(OP)" in the name): an everlasting shield. Nothing can end the run.
    const opMode = () => Boolean(BertMeta.hasOpMode?.());
    function triggerDeath(obstacle = null) {
        if (opMode() && state.phase === 'playing') {
            if (obstacle && state.elapsed >= (state.opFlashUntil || 0)) {
                state.opFlashUntil = state.elapsed + 0.35;
                playAudio('shieldBreak');
            }
            return;
        }
        if (state.phase !== 'playing') return;
        if (currentLevel.swarm && obstacle && state.swarm?.length) {
            const lost = state.swarm.pop();
            burst(lost.x, lost.y, '#ffffff', 10);
            (state.imageFx ||= []).push({ key: 'g7SwarmLose', x: lost.x + 30, y: lost.y + 30, age: 0 });
            playAudio('pop');
            BertMeta.haptic('warning');
            state.invulnerableUntil = state.elapsed + 1.2;
            return;
        }
        state.cleanRun = false;
        if (state.activePowerup === POWERUP.SHIELD && state.shieldCharges > 0) {
            state.shieldCharges -= 1;
            state.invulnerableUntil = state.elapsed + 2;
            dom.powerup.textContent = T('SKJOLD BRUGT · 2s');
            dom.powerup.classList.add('active');
            burst(bird.x + BIRD.width / 2, bird.y + BIRD.height / 2, '#75e8ff', 22, 'shieldSplinter');
            playAudio('shieldBreak');
            BertMeta.haptic('shield');
            if (state.shieldCharges <= 0) deactivatePowerup('consumed');
            return;
        }
        if (state.rescueLives > 0) {
            state.rescueUsed = true;
            state.rescueLives -= 1;
            state.streak = 0;
            state.invulnerableUntil = state.elapsed + 2.4;
            state.rescueNoticeUntil = state.elapsed + 2.4;
            state.rescueNoticeText = T('REDNINGSLIV');
            bird.y = clamp(bird.y, 150, VIEW.height - BIRD.height - 150);
            bird.velocity = -90;
            bird.rotation = -5;
            if (obstacle?.id != null) obstacles = obstacles.filter((candidate) => candidate.id !== obstacle.id);
            burst(bird.x + BIRD.width / 2, bird.y + BIRD.height / 2, '#f8efe1', 28, 'feather');
            playAudio('shieldBreak');
            BertMeta.haptic('rescue');
            updateHud();
            return;
        }
        // Flying into the big web is a spider catch: the spider comes down for you.
        const captureCause = obstacle && ['jungle-spider', 'jungle-snake'].includes(obstacle.kind)
            ? obstacle.kind
            : obstacle?.kind === 'jungle-web' ? 'jungle-spider' : null;
        const predatorHero = obstacle?.kind === 'bird-run-bird' && obstacle.predator
            ? obstacle.heroId : null;
        state.phase = 'dead';
        state.deathCause = captureCause || obstacle?.kind || 'world';
        state.deathDirection = obstacle?.kind === 'bird-run-bird' ? obstacle.direction : null;
        state.deathPredatorHero = predatorHero;
        state.deathObstacleId = captureCause || predatorHero ? obstacle.id : null;
        state.deathCaptureElapsed = 0;
        state.deathCaptureX = bird.x + BIRD.width / 2;
        state.deathCaptureY = bird.y + BIRD.height / 2;
        // The hawk's catch frames show the bird in its talons, so the bird itself is hidden.
        state.birdsVisible = !captureCause && !(predatorHero && (assets.v2HawkCarry0?.naturalWidth || assets.v2HawkCatch0?.naturalWidth));
        state.deathFromWeb = obstacle?.kind === 'jungle-web';
        state.hitStop = 0.11;
        state.shake = Math.max(state.shake || 0, 0.6);
        state.deathBonk = { x: bird.x + BIRD.width * 0.75, y: bird.y + BIRD.height * 0.3, age: 0 };
        setTimeout(() => playAudio('bert_ohno'), 140);
        state.slowmoUntil = state.worldTime + 0.55;
        BertMeta.haptic?.('death');
        if (!captureCause && !predatorHero) state.featherPuff = { x: bird.x + BIRD.width / 2, y: bird.y + BIRD.height / 2, age: 0 };
        state.deathCountdown = captureCause === 'jungle-spider' ? 3.8
            : captureCause === 'jungle-snake' ? 2.2 : predatorHero ? 2.1 : 1.5;
        if (predatorHero) bird.velocity = -165;
        clearTouchDirection();
        cancelPowerupsForDeath();
        stopMusic();
        playAudio(predatorHero ? 'pop' : 'explosion');
        const burstColor = predatorHero ? '#f8da8b'
            : captureCause === 'jungle-spider' ? '#e5eef2' : captureCause === 'jungle-snake' ? '#1b6fff' : '#e31c32';
        burst(bird.x + BIRD.width / 2, bird.y + BIRD.height / 2,
            burstColor, captureCause || predatorHero ? 14 : 28, predatorHero ? 'feather' : captureCause ? null : 'feather');
        BertMeta.haptic('death');
    }

    function rescueOutcomeIndex() {
        if (typeof crypto !== 'undefined' && crypto.getRandomValues) {
            const value = new Uint32Array(1);
            crypto.getRandomValues(value);
            return value[0] % RESCUE_OUTCOMES.length;
        }
        return Math.floor(gameRandom() * RESCUE_OUTCOMES.length);
    }

    function updateRescueWheelWallet() {
        const offer = BertMeta.continueSpinOffer();
        dom.rescueWheelBalance.textContent = String(offer.balance);
        dom.rescueSpin.textContent = T`SPIN · ${offer.cost} FJER`;
        dom.rescueSpin.disabled = !offer.canAfford || state.rescueSpinPending;
        return offer;
    }

    function offerRescueWheel() {
        const offer = BertMeta.continueSpinOffer();
        if (isEventLevel() || state.continueUsed || state.challenge || !offer.canAfford) {
            finishDeath();
            return false;
        }
        state.phase = 'rescue-offer';
        state.rescueSpinPending = false;
        dom.rescueWheel.closest('.rescue-wheel-card')?.classList.remove('spinning', 'rescued', 'lost');
        dom.rescueWheel.style.transition = 'none';
        dom.rescueWheel.style.transform = `rotate(${state.rescueWheelRotation}deg)`;
        requestAnimationFrame(() => { dom.rescueWheel.style.transition = ''; });
        dom.rescueWheelResult.textContent = T('SPIN FOR AT SE DIN REDNING');
        updateRescueWheelWallet();
        setVisible(dom.hud, false);
        setVisible(dom.rescueWheelModal, true);
        playAudio('pop');
        return true;
    }

    function resumeFromRescueWheel(outcome) {
        BertMeta.settleContinueSpin({ survived: true, refund: outcome.refund || 0 });
        state.rescueUsed = true;
        state.rescueSpinPending = false;
        state.phase = 'playing';
        state.deathCause = null;
        state.deathObstacleId = null;
        state.deathPredatorHero = null;
        state.deathCaptureElapsed = 0;
        state.deathCountdown = 0;
        state.birdsVisible = true;
        state.streak = 0;
        state.invulnerableUntil = state.elapsed + 3;
        state.rescueNoticeUntil = state.elapsed + 3;
        state.rescueNoticeText = outcome.id === 'refund' ? T('GRATIS REDNING') : T('REDNINGSSPIN');
        bird.x = BIRD.x;
        bird.y = (VIEW.height - BIRD.height) / 2;
        bird.velocity = -80;
        bird.rotation = -4;
        obstacles = obstacles.filter((obstacle) => obstacle.x > bird.x + 520 || obstacle.x + obstacle.width < bird.x - 120);
        state.nextSpawnAt = Math.max(state.nextSpawnAt, state.elapsed + 1.25);
        setVisible(dom.rescueWheelModal, false);
        setVisible(dom.hud, true);
        playAudio(levelMusicName());
        if (outcome.powerup) activatePowerup(outcome.powerup);
        burst(bird.x + BIRD.width / 2, bird.y + BIRD.height / 2, '#f8efe1', 32, 'feather');
        BertMeta.haptic(outcome.id === 'refund' ? 'reward' : 'rescue');
        updateMetaMenu();
        updateHud();
    }

    function settleRescueWheel(outcome, immediate = false) {
        const card = dom.rescueWheel.closest('.rescue-wheel-card');
        card?.classList.remove('spinning');
        if (outcome.id === 'gameover') {
            BertMeta.settleContinueSpin({ survived: false });
            dom.rescueWheelResult.textContent = T('GAME OVER · TUREN SLUTTER');
            card?.classList.add('lost');
            BertMeta.haptic('death');
            const finish = () => {
                state.rescueSpinPending = false;
                setVisible(dom.rescueWheelModal, false);
                finishDeath();
            };
            if (immediate) finish();
            else window.setTimeout(finish, 900);
            return;
        }
        dom.rescueWheelResult.textContent = outcome.id === 'refund'
            ? T('REDDET · DINE 12 FJER KOMMER RETUR')
            : `REDDET · ${outcome.label}`;
        card?.classList.add('rescued');
        if (immediate) resumeFromRescueWheel(outcome);
        else window.setTimeout(() => resumeFromRescueWheel(outcome), 760);
    }

    function spinRescueWheel(forcedOutcome = null, immediate = false) {
        if (state.phase !== 'rescue-offer' || state.rescueSpinPending || state.continueUsed) return { ok: false };
        const purchase = BertMeta.buyContinueSpin();
        if (!purchase.ok) {
            updateRescueWheelWallet();
            dom.rescueWheelResult.textContent = T`DU MANGLER ${Math.max(0, purchase.offer.cost - purchase.offer.balance)} FJER`;
            BertMeta.haptic('warning');
            return purchase;
        }
        state.continueUsed = true;
        state.rescueSpinPending = true;
        const forcedIndex = typeof forcedOutcome === 'number'
            ? forcedOutcome
            : RESCUE_OUTCOMES.findIndex((entry) => entry.id === forcedOutcome);
        const index = forcedIndex >= 0 && forcedIndex < RESCUE_OUTCOMES.length ? forcedIndex : rescueOutcomeIndex();
        const outcome = RESCUE_OUTCOMES[index];
        const currentAngle = ((state.rescueWheelRotation % 360) + 360) % 360;
        const alignment = ((360 - index * 60 - currentAngle) % 360 + 360) % 360;
        state.rescueWheelRotation += 1800 + alignment;
        dom.rescueWheel.closest('.rescue-wheel-card')?.classList.add('spinning');
        dom.rescueWheelResult.textContent = T('REDNINGSREDEN SNURRER …');
        dom.rescueWheel.style.transform = `rotate(${state.rescueWheelRotation}deg)`;
        updateRescueWheelWallet();
        if (immediate) settleRescueWheel(outcome, true);
        else window.setTimeout(() => settleRescueWheel(outcome), 3500);
        return { ok: true, outcome: outcome.id, spent: purchase.spent };
    }

    function declineRescueWheel() {
        if (state.phase !== 'rescue-offer' || state.rescueSpinPending) return;
        state.continueUsed = true;
        setVisible(dom.rescueWheelModal, false);
        finishDeath();
    }

    function clearGameplayRenderState() {
        obstacles = [];
        collectibles = [];
        particles = [];
        clearTouchDirection();
        cancelPowerupsForDeath();
    }

    function finishDeath() {
        setVisible(dom.rescueWheelModal, false);
        const resultKicker = dom.gameOver.querySelector('.result-kicker');
        if (resultKicker) resultKicker.textContent = state.worldBadge ? T('VERDEN KLARET')
            : currentLevel.kind === 'skyRelay' ? state.relayResult?.outcome === 'ring-hit' ? T('SKYRING RAMT')
                : state.relayResult?.hit ? T('VINDKLOKKEN RAMT') : T('RUTEN AFSLUTTET')
                : T('DIN FLYVETUR');
        const run = { score: state.score, streak: state.bestStreak, time: state.elapsed };
        const nextLevel = nextLevelInMode(currentLevel);
        const nextWasUnlocked = nextLevel ? Boolean(progressionSnapshot()[nextLevel.id]?.unlocked) : true;
        const opRun = opMode();
        const { record, improved } = opRun ? { record: loadRecord(currentLevel.id), improved: false } : saveRecord(currentLevel.id, run);
        state.completedGhost = state.ghostRecorder?.export() || [];
        if (improved && state.score > 0 && !isEventLevel() && !opRun && state.completedGhost.length) {
            try { localStorage.setItem(`bertTheBird_ghost_${currentLevel.id}`, JSON.stringify(state.completedGhost)); } catch (_) { /* full storage */ }
        }
        const mode = currentLevel.kind === 'tunnel' ? 'tunnel' : currentLevel.mode === MODE.FLAPPY ? 'flappy' : 'classic';
        const savedRun = opRun ? { unlockedHeroes: [] } : BertMeta.recordRun({
            ...run,
            stars: state.starsCollected,
            levelId: currentLevel.id,
            mode,
            dailyKey: state.dailyKey,
            dailyTarget: state.dailyTarget,
            rescueUsed: state.rescueUsed,
            powerups: state.runPowerups || 0,
            feathers: state.runFeathers || 0,
            maxNoStar: Math.max(state.maxNoStar || 0, state.elapsed - (state.lastStarAt || 0)),
            cause: state.deathCause || '',
            hero: BertMeta.currentHero(),
            improved: Boolean(improved && state.score > 0),
            diedBig: state.activePowerup === POWERUP.GROW,
            nearMisses: state.nearMisses || 0,
        });
        const player = BertMeta.snapshot().player;
        if (!isEventLevel() && !opRun) BertSocial.submitScore({
            runId: savedRun.runId,
            playerId: player.id,
            playerName: player.name,
            levelId: currentLevel.id,
            mode,
            score: state.score,
            streak: state.bestStreak,
            time: state.elapsed,
            createdAt: savedRun.createdAt,
        });
        const medal = BertMeta.medalForScore(state.score);
        updateLevelHighscores();
        animateResultNumber(dom.finalScore, state.score);
        dom.finalStreak.textContent = `x${state.bestStreak}`;
        dom.finalTime.textContent = formatTime(state.elapsed);
        dom.finalHighscore.textContent = String(record.score);
        dom.recordStreak.textContent = `x${record.streak}`;
        dom.recordTime.textContent = formatTime(record.time);
        dom.resultMedal.className = `result-medal medal-${medal.id}`;
        dom.resultMedal.querySelector('strong').textContent = medal.label;
        const medalImage = dom.resultMedal.querySelector('img');
        if (medalImage) medalImage.src = `assets/v2/ui/medal-${medal.id === 'flight' ? 'none' : medal.id}.webp`;
        const unlockAfterRun = nextLevel ? progressionSnapshot()[nextLevel.id] : null;
        const medalText = medal.next
            ? T`${Math.max(0, medal.next - state.score)} point til næste medalje`
            : T('Topflyvning');
        dom.resultProgress.classList.toggle('event-status', isEventLevel());
        if (currentLevel === EDM_EVENT) {
            dom.resultProgress.textContent = T`NEON ENCORE · ${state.starsCollected} stjerner · kun lokal eventrekord`;
        } else if (currentLevel === BIRD_RUN_EVENT) {
            const cause = state.deathCause === 'bird-run-bird'
                ? ` · ${state.deathPredatorHero ? T('ROVFUGL') : T('FUGL')} ${state.deathDirection === 'rear' ? T('BAGFRA') : T('FORFRA')}` : '';
            dom.resultProgress.textContent = T`BIRD RUN${cause} · ${state.starsCollected} stjerner · kun lokal eventrekord`;
        } else if (currentLevel === STORMLINE_EVENT) {
            dom.resultProgress.textContent = T`STORMLINE · VIND OG FLYVENDE TING · ${state.starsCollected} stjerner · kun lokal eventrekord`;
        } else if (currentLevel === SKY_RELAY_EVENT) {
            const relay = state.relayResult;
            dom.resultProgress.textContent = relay?.outcome === 'ring-hit'
                ? T`SKY RELAY · RAMT ${relay.ringSide === 'top' ? T('TOPPEN') : T('BUNDEN')} AF PORT ${relay.ringIndex} · 0 POINT · PRØV IGEN`
                : relay?.hit
                ? T`SKY RELAY · ${relay.gatesHit}/3 PORTE · ${Math.round(relay.precision * 100)}% PRÆCISION · KUN LOKALT`
                : T`SKY RELAY · ${relay?.timedOut ? T('TIDEN UDE') : T('FORBI GULDPLADEN')} · 0 POINT · PRØV IGEN`;
        } else if (nextLevel && !nextWasUnlocked && unlockAfterRun?.unlocked) {
            dom.resultProgress.textContent = T`NYT TRIN: ALLE TRE BANER ER ÅBNE · ${state.starsCollected} stjerner samlet`;
        } else if (nextLevel && !unlockAfterRun?.unlocked) {
            const blockers = pendingTierRequirements(unlockAfterRun).map((requirement) => {
                const source = UNITY_LEVELS.find((candidate) => candidate.id === requirement.levelId);
                return T`${Math.max(0, requirement.score - requirement.current)} point i ${source?.name || T('en bane')}`;
            });
            const mission = unlockAfterRun.missionRequirement;
            if (mission && !mission.complete) blockers.push(T`${mission.target - mission.current} missionsbelønninger`);
            dom.resultProgress.textContent = T`${blockers.join(' + ')} til trin ${nextLevel.modeOrder} · ${state.starsCollected} stjerner`;
        } else {
            dom.resultProgress.textContent = T`${medalText} · ${state.starsCollected} stjerner samlet`;
        }
        if (state.worldBadge) dom.resultProgress.textContent += T` · MÆRKE: ${state.worldBadge}`;
        if (state.challenge) {
            const attempt = BertSocial.consumeChallengeAttempt(state.challenge.id || `${state.challenge.seed}-${state.challenge.playerId}`);
            const won = (state.score > state.challenge.score)
                || (state.score === state.challenge.score && state.bestStreak > state.challenge.streak)
                || (state.score === state.challenge.score && state.bestStreak === state.challenge.streak && state.elapsed > state.challenge.time);
            const mechaWasOwned = BertMeta.heroCatalog().find((hero) => hero.id === 'mecha').owned;
            BertMeta.recordDuel(won);
            if (!mechaWasOwned && BertMeta.heroCatalog().find((hero) => hero.id === 'mecha').owned) {
                savedRun.unlockedHeroes.push('MechaBert');
            }
            dom.resultProgress.textContent = won
                ? T`DU VANDT DUELLEN · udfordr tilbage · ${state.starsCollected} stjerner`
                : T`${Math.max(0, 3 - attempt)} forsøg tilbage · slå ${state.challenge.score} point`;
            BertSocial.submitChallengeAttempt(state.challenge.id, {
                playerId: player.id,
                playerName: player.name,
                score: state.score,
                streak: state.bestStreak,
                time: state.elapsed,
            });
        }
        if (savedRun.unlockedHeroes.length) {
            dom.resultProgress.textContent = T`NY HELT: ${savedRun.unlockedHeroes.join(', ').toUpperCase()} · ${dom.resultProgress.textContent}`;
            BertMeta.haptic('reward');
        }
        setVisible(dom.newHighscore, improved && state.score > 0);
        setVisible(dom.challengeButton, !isEventLevel());
        if (nextLevel && !nextWasUnlocked && unlockAfterRun?.unlocked) BertMeta.haptic('upgrade');
        else if (improved && state.score > 0) BertMeta.haptic('record');
        clearGameplayRenderState();
        state.phase = 'gameover';
        setVisible(dom.hud, false);
        setVisible(dom.gameOver, true);
        revealResult(improved && state.score > 0);
        settleNest(opRun);
        showRunHighlights(improved && !opRun, record);
        if (!opRun && currentLevel.id === weeklyBonusId()) {
            const reward = BertMeta.claimBonusWeek?.(String(weekNumber()), state.score);
            if (reward?.feathers) setTimeout(() => window.BertApp?.showToast(T`Ugens bonus: +${reward.feathers} fjer til reden`), 2600);
        }
        maybeOfferStarter();
    }

    // Turens højdepunkter (feedback 10. okt.): a short, always positive summary of the run.
    // Comparisons are with your own runs for now; with the server they become "of all players".
    function showRunHighlights(newRecord, record) {
        const box = document.getElementById('result-highlights');
        if (!box) return;
        const score = state.score;
        const insight = BertMeta.runInsights?.(currentLevel.id, score) || { total: 0 };
        const lines = [];
        if (newRecord && record?.score > 0) lines.push(['🏆', T`Ny rekord på ${currentLevel.name}!`]);
        else if (insight.total >= 3 && insight.rank <= 3) lines.push(['🥇', T`Din ${insight.rank}. bedste tur ud af ${insight.total} her`]);
        else if (insight.total >= 4 && insight.percentBetter >= 50) lines.push(['📈', T`Bedre end ${insight.percentBetter} % af dine ture her`]);
        if ((state.nearMisses || 0) >= 3) lines.push(['😱', T`${state.nearMisses} nærdødsoplevelser`]);
        if (state.bestStreak >= 8) lines.push(['🔥', T`Længste stjernerække: x${state.bestStreak}`]);
        if ((state.runPowerups || 0) >= 2) lines.push(['⚡', T`${state.runPowerups} power-ups taget`]);
        if (state.elapsed >= 60) lines.push(['⏱️', T`I luften i ${formatTime(state.elapsed)}`]);
        if ((state.runFeathers || 0) > 0) lines.push(['🪶', T`${state.runFeathers} gyldne fjer fundet`]);
        if (state.swarm?.length) lines.push(['🐦', T`${state.swarm.length} fugle i flokken til sidst`]);
        // Encouragement, never "you are bad".
        if (!lines.length || (insight.total >= 4 && score < insight.average * 0.6)) {
            lines.push(['💪', score < 5 ? T('Det kan kun gå fremad herfra. Prøv at holde dig midt på skærmen.')
                : T`Dit snit her er ${Math.round(insight.average)}. Næste tur sidder den!`]);
        }
        box.replaceChildren(...lines.slice(0, 4).map(([icon, text], i) => {
            const li = document.createElement('li');
            li.style.animationDelay = `${0.9 + i * 0.25}s`;
            li.innerHTML = `<span>${icon}</span>`;
            li.append(document.createTextNode(text));
            return li;
        }));
        box.classList.remove('hidden');
    }

    // Starter heroes: after 10, 20, 30 and 40 flights the player picks one.
    function maybeOfferStarter() {
        const choice = BertMeta.starterChoice?.();
        if (!choice?.pending || !choice.remaining.length) return;
        setTimeout(() => openStarterChoice(choice), 1800);
    }
    function openStarterChoice(choice) {
        document.getElementById('starter-modal')?.remove();
        const modal = document.createElement('section');
        modal.id = 'starter-modal';
        modal.className = 'modal-backdrop';
        const card = document.createElement('div');
        card.className = 'challenge-card starter-card';
        card.innerHTML = `<p class="edition-label">${T`${choice.runCount} TURE FLØJET`}</p><h2>${T('VÆLG EN NY HELT')}</h2><p>${T('Du må vælge én. De andre kan vælges efter 10 ture mere.')}</p>`;
        const row = document.createElement('div');
        row.className = 'starter-row';
        choice.remaining.forEach((id) => {
            const hero = BertHeroStore.catalog.find((entry) => entry.id === id);
            const button = document.createElement('button');
            button.type = 'button';
            button.className = 'starter-option';
            const heroArt = ['assets/heroes', V2_HERO_FOLDER[id] || id, 'glide.webp'].join('/');
            button.innerHTML = `<img src="${heroArt}" alt=""><b>${hero?.name || id}</b>`;
            button.addEventListener('click', () => {
                const result = BertMeta.chooseStarter(id);
                if (result.ok) { playAudio('fanfare'); window.BertApp?.showToast(T`${hero?.name || id} er din nu`); }
                modal.remove();
                updateMetaMenu();
            });
            row.appendChild(button);
        });
        card.appendChild(row);
        const later = document.createElement('button');
        later.type = 'button'; later.className = 'text-button'; later.textContent = T('SENERE');
        later.addEventListener('click', () => modal.remove());
        card.appendChild(later);
        modal.appendChild(card);
        document.body.appendChild(modal);
    }

    // The egg cracks open on the result screen, and the new hero pops out of it.
    function showHatch(heroId) {
        const stage = document.createElement('div');
        stage.className = 'hatch-stage';
        const egg = document.createElement('img'); egg.className = 'hatch-egg'; egg.alt = '';
        const hero = document.createElement('img'); hero.className = 'hatch-hero'; hero.alt = '';
        hero.src = `assets/heroes/${V2_HERO_FOLDER[heroId] || heroId}/glide.webp`;
        stage.append(egg, hero);
        dom.gameOver.appendChild(stage);
        [0, 1, 2, 3].forEach((index) => setTimeout(() => { egg.src = `assets/v2/g5/egg/hatch-${index + 1}.webp`; if (index === 2) stage.classList.add('open'); }, index * 320));
        setTimeout(() => stage.remove(), 4200);
    }

    // Reden after a run: the daily flight, new badges, and feathers first on the screen.
    function settleNest(opRun) {
        if (opRun) return;
        const records = {};
        UNITY_LEVELS.forEach((level) => { records[level.id] = loadHighscore(level.id); });
        const earned = BertMeta.awardBadges?.({
            levelId: currentLevel.id, score: state.score, streak: state.bestStreak, stars: state.starsCollected, time: state.elapsed,
            deathCause: state.deathCause, rescueUsed: state.rescueUsed, spinUsed: Boolean(state.rescueSpinUsed),
            relayGatesHit: state.relayResult?.gatesHit || 0, records, worldBadges: BertWorldMastery.read(localStorage),
        }) || [];
        const daily = BertMeta.noteDailyFlight?.() || { ok: false };
        const nest = BertMeta.nestStatus?.();
        const hatched = BertMeta.incubate?.(state.starsCollected);
        const bits = [];
        if (hatched) {
            const heroName = BertHeroStore.catalog.find((hero) => hero.id === hatched)?.name || hatched;
            bits.push(T`Ægget klækkede: ${heroName}!`);
            setTimeout(() => { playAudio('fanfare'); playAudio('bert_prrt'); window.BertApp?.showToast(T`${heroName} er klækket og venter i garderoben`); showHatch(hatched); }, 1200);
        } else if (BertMeta.eggStatus?.().incubating) {
            const egg = BertMeta.eggStatus().incubating;
            bits.push(T`Ægget: ${egg.progress}/${egg.need} stjerner`);
        }
        const near = BertMeta.nearestChallenge?.(unlockedLevels().map((level) => level.id));
        if (near) bits.unshift(T`Tæt på: ${near.label} (${near.value}/${near.target})`);
        if (state.runFeathers > 0) bits.push(T`${state.runFeathers} fjer fundet`);
        if (daily.ok) bits.push(T`Dag ${daily.streak} i træk: +${daily.reward} fjer`);
        if (nest?.next) bits.push(T`Reden: ${nest.feathers}/${nest.next.cost} til ${nest.next.label}`);
        const nestLine = document.getElementById('result-nest');
        if (nestLine) {
            nestLine.textContent = bits.join(' · ');
            nestLine.classList.toggle('hidden', !bits.length || isEventLevel());
        }
        if (earned.length) {
            const list = BertMeta.badgeList();
            const names = earned.map((id) => list.find((badge) => badge.id === id)?.label || id);
            setTimeout(() => window.BertApp?.showToast(T`Nyt mærke: ${names.join(', ')}`), 900);
            BertMeta.haptic('reward');
        }
        updateMetaMenu();
    }

    // The result screen builds up: ribbon, board, then the medal with a ding.
    // A new record adds a fanfare and confetti.
    let resultTimers = [];
    function revealResult(newRecord) {
        resultTimers.forEach(clearTimeout);
        resultTimers = [];
        dom.gameOver.classList.remove('reveal');
        void dom.gameOver.offsetWidth;
        dom.gameOver.classList.add('reveal');
        dom.gameOver.querySelectorAll('.confetti-piece').forEach((piece) => piece.remove());
        resultTimers.push(setTimeout(() => { if (state.phase === 'gameover') playAudio('ding'); }, 480));
        if (newRecord && !prefersReducedMotion()) {
            resultTimers.push(setTimeout(() => {
                if (state.phase !== 'gameover') return;
                playAudio('fanfare');
                setTimeout(() => playAudio('bert_yay'), 650);
                // Bert turns all the way round to the camera at a new record (round 6, "Bert i 3D").
                const board = dom.gameOver.querySelector('.scoreboard');
                if (board && BertMeta.currentHero() === 'bert' && !prefersReducedMotion()) {
                    board.querySelector('.bert-spin')?.remove();
                    const spin = document.createElement('img');
                    spin.className = 'bert-spin'; spin.alt = '';
                    board.appendChild(spin);
                    let frame = 0;
                    const timer = setInterval(() => {
                        spin.src = ['assets/v2/g6/bert/turn', String((frame % 8) + 1)].join('-') + '.webp';
                        frame += 1;
                        if (frame > 16) { clearInterval(timer); spin.src = 'assets/v2/g6/bert/turn-1.webp'; }
                    }, 90);
                    resultTimers.push(timer);
                }
                for (let i = 0; i < 36; i += 1) {
                    const piece = document.createElement('i');
                    piece.className = 'confetti-piece';
                    piece.style.left = `${Math.random() * 100}%`;
                    piece.style.setProperty('--d', `${1.8 + Math.random() * 1.6}s`);
                    piece.style.setProperty('--x', `${(Math.random() - 0.5) * 160}px`);
                    piece.style.setProperty('--r', `${Math.random() * 720}deg`);
                    piece.style.animationDelay = `${Math.random() * 0.6}s`;
                    piece.style.background = ['#ffd93b', '#ff5a73', '#5ad1ff', '#b6ff3b', '#ff9ef0'][i % 5];
                    dom.gameOver.appendChild(piece);
                }
            }, 700));
        }
    }

    function animateResultNumber(element, target) {
        const started = performance.now();
        const duration = Math.min(850, 260 + target * 8);
        element.textContent = '0';
        element.classList.add('counting');
        const tick = (now) => {
            const progress = clamp((now - started) / duration, 0, 1);
            const eased = 1 - Math.pow(1 - progress, 3);
            element.textContent = String(Math.round(target * eased));
            if (progress < 1 && state.phase === 'gameover') requestAnimationFrame(tick);
            else {
                // Always land on the real number, even if the screen changed mid-count.
                element.textContent = String(target);
                element.classList.remove('counting');
            }
        };
        requestAnimationFrame(tick);
    }

    function updateHud() {
        const scoreText = String(state.score);
        const streakText = `x${state.streak}`;
        const relayClock = currentLevel.kind === 'skyRelay' && state.relayRoute
            ? Math.max(0, state.relayRoute.timeLimit - (state.elapsed - (state.relayRoundStart || 0))) : null;
        const timeText = formatTime(relayClock ?? state.elapsed);
        if (dom.score.textContent !== scoreText) dom.score.textContent = scoreText;
        if (dom.streak.textContent !== streakText) dom.streak.textContent = streakText;
        setVisible(dom.streakGuard, state.streakGuardCharges > 0 && ['playing', 'prewarm', 'paused'].includes(state.phase));
        if (dom.time.textContent !== timeText) dom.time.textContent = timeText;
        const lifeValue = dom.lives?.querySelector('strong');
        if (lifeValue && lifeValue.textContent !== String(state.rescueLives)) lifeValue.textContent = String(state.rescueLives);
        if (dom.lives) setVisible(dom.lives, state.rescueLives > 0 && ['prewarm', 'playing', 'paused'].includes(state.phase));
        let powerupText = '';
        if (state.activePowerup) {
            const remaining = state.activePowerup === POWERUP.FOCUS
                ? Math.max(0, Math.ceil(state.focusRemaining))
                : Math.max(0, Math.ceil(state.powerupEndsAt - state.elapsed));
            const label = {
                [POWERUP.FOCUS]: T('FOKUS'), [POWERUP.SHIELD]: T('SKJOLD'), [POWERUP.MAGNET]: T('MAGNET'),
                [POWERUP.HEAVY]: T('TUNG · STIGER LANGSOMT'), [POWERUP.HYPER]: T('HYPERFART'),
                [POWERUP.DOUBLE]: 'POINT ×2', [POWERUP.FLAP]: T('FLAPPY-STYRING · TAP'),
                [POWERUP.REVERSE]: T('OMVENDT STYRING'),
                [POWERUP.GROW]: T('FORSTØR · POINT ×2'), [POWERUP.SHRINK]: T('FORMINDSK'),
            }[state.activePowerup] || state.activePowerup.toUpperCase();
            powerupText = state.activePowerup === POWERUP.FOCUS && state.focusPhase === 'countdown'
                ? T`FOKUS OM ${Math.max(1, Math.ceil(state.focusCountdown))}`
                : `${label} · ${remaining}s`;
            dom.powerup.classList.add('active');
        } else if (state.elapsed < state.invulnerableUntil) {
            powerupText = state.elapsed < state.rescueNoticeUntil
                ? T`${state.rescueNoticeText || T('REDNINGSLIV')} · ${state.rescueLives} FASTE LIV`
                : `BESKYTTET · ${Math.ceil(state.invulnerableUntil - state.elapsed)}s`;
            dom.powerup.classList.add('active');
        } else if (state.elapsed < state.guardNoticeUntil) {
            powerupText = T('STREAK REDDET · GUARD BRUGT');
            dom.powerup.classList.add('active');
        } else {
            dom.powerup.classList.remove('active');
        }
        if (state.worldBadge && state.elapsed < state.worldBadgeUntil && !powerupText) {
            powerupText = `NIVEAU ${state.levelUpStage || 2}! · ${state.worldBadge}`;
            dom.powerup.classList.add('active');
        }
        if (currentLevel.kind === 'iceberg' && state.elapsed < (state.gripUntil || 0) && !powerupText) {
            powerupText = T`GODT GREB · ${Math.ceil(state.gripUntil - state.elapsed)}s`;
            dom.powerup.classList.add('active');
        }
        if (currentLevel.kind === 'windfarm' && state.gust && !powerupText) {
            powerupText = state.gust.dir < 0 ? T('VINDSTØD · OP') : T('VINDSTØD · NED');
            dom.powerup.classList.add('active');
        }
        if (state.elapsed < (state.coolFlashUntil || 0) && !powerupText) {
            powerupText = T('LAVAEN FALDER');
            dom.powerup.classList.add('active');
        }
        if (state.elapsed < (state.featherFlashUntil || 0) && !powerupText) {
            powerupText = '+1 FJER';
            dom.powerup.classList.add('active');
        }
        if (currentLevel.kind === 'skyRelay' && state.elapsed < state.relayFlashUntil) {
            powerupText = state.relayMessage;
            dom.powerup.classList.add('active');
        }
        if (dom.powerup.textContent !== powerupText) dom.powerup.textContent = powerupText;
    }

    function finishSkyRelay(timedOut = false) {
        if (state.phase !== 'playing' || !state.relayRoute) return;
        const center = BertCollision.bertCollider(bird, BIRD);
        const roundElapsed = state.elapsed - (state.relayRoundStart || 0);
        const elapsed = timedOut ? state.relayRoute.timeLimit + FIXED_STEP : roundElapsed;
        const result = BertSkyRelay.finish(state.relayRoute, center.y, elapsed, state.relayGates, state.worldTime);
        if (result.hit) {
            // Endless: ringing the bell starts the next, harder round at once.
            const round = state.relayRoute.round || 1;
            state.relayBanked = (state.relayBanked || 0) + result.score;
            state.score = state.relayBanked;
            state.relayRoute = BertSkyRelay.createRoute(state.seed, round + 1, state.worldDistance);
            state.relayGates = [];
            state.relayRoundStart = state.elapsed;
            state.relayMessage = `KLANG! +${result.score} · RUNDE ${round + 1}`;
            state.relayFlashUntil = state.elapsed + 2;
            playAudio('point');
            BertMeta.haptic('reward');
            burst(center.x + 50, center.y, '#ffdf70', 15);
            updateHud();
            return;
        }
        state.relayResult = result;
        state.score = (state.relayBanked || 0) + result.score;
        state.bestStreak = Math.max(state.bestStreak, state.relayPassedTotal || 0);
        state.streak = state.relayPassedTotal || 0;
        state.relayMessage = timedOut ? T('TIDEN UDE') : T('FORBI GULDPLADEN');
        state.relayFlashUntil = state.elapsed + 2;
        state.relayFinishDelay = result.hit ? 1.05 : 0.6;
        state.phase = 'relay-finish';
        clearTouchDirection();
        stopMusic();
        if (result.hit) {
            playAudio('point');
            BertMeta.haptic('reward');
            burst(center.x + 50, center.y, '#ffdf70', 15);
        } else {
            playAudio('pop');
        }
        updateHud();
    }

    function updateSkyRelay() {
        const route = state.relayRoute;
        if (!route) return;
        const center = BertCollision.bertCollider(bird, BIRD);
        for (let index = 0; index < route.gates.length; index += 1) {
            const gate = route.gates[index];
            const pose = BertSkyRelay.gatePose(gate, state.worldTime);
            const screenX = center.x + pose.worldDistance - state.worldDistance;
            const impact = BertSkyRelay.frameContact(route, index, center.y, screenX, center.x,
                center.radius, state.worldTime);
            if (!DEBUG_NOCLIP && impact.contact) {
                state.score = state.relayBanked || 0;
                state.relayHitGate = index;
                state.relayResult = {
                    completed: false, hit: false, outcome: 'ring-hit', score: 0,
                    ringIndex: index + 1, ringSide: impact.side,
                    gatesHit: state.relayGates.filter((entry) => entry.passed).length,
                    gatesTotal: route.gates.length,
                };
                triggerDeath({ kind: 'relay-cloud-frame', id: gate.id });
                return;
            }
            if (state.worldDistance < pose.worldDistance || state.relayGates.length > index) continue;
            const result = BertSkyRelay.gatePass(route, index, center.y,
                state.elapsed - (state.relayRoundStart || 0), state.worldTime);
            state.relayGates.push(result);
            if (result.passed) state.relayPassedTotal = (state.relayPassedTotal || 0) + 1;
            state.streak = state.relayPassedTotal || 0;
            state.bestStreak = Math.max(state.bestStreak, state.streak);
            state.score = (state.relayBanked || 0) + state.relayGates.reduce((sum, entry) => sum + entry.score, 0);
            const gateText = { perfect: T('RENT GENNEM'), clean: T('GODT RAMT'), edge: T('KANT'), miss: T('FORBI') };
            state.relayMessage = `PORT ${index + 1}/3 · ${gateText[result.quality] || T('FORBI')}`;
            state.relayFlashUntil = state.elapsed + 1.5;
            if (result.passed) {
                playAudio('point');
                BertMeta.haptic('star');
                burst(center.x + 35, pose.centerY, '#b4ecff', 5);
            }
        }
        if (state.worldDistance >= route.target.worldDistance) finishSkyRelay();
        else if (state.elapsed - (state.relayRoundStart || 0) >= route.timeLimit) finishSkyRelay(true);
    }

    function update(delta) {
        if (state.phase === 'paused') return;
        // Feel: a short freeze on impact (hit-stop), then half speed for a moment so the
        // player sees what hit them. The camera shake decays on its own.
        if (state.hitStop > 0) { state.hitStop -= delta; return; }
        if (state.slowmoUntil && state.phase === 'dead' && state.worldTime < state.slowmoUntil) delta *= 0.45;
        if (state.shake > 0) state.shake = Math.max(0, state.shake - delta * 1.8);
        state.worldTime += delta;
        if (state.phase === 'prewarm') {
            updatePrewarm(delta);
            return;
        }
        if (state.phase === 'world-finish') {
            state.worldFinishDelay -= delta;
            bird.animationTime += delta;
            if (state.worldFinishDelay <= 0) finishDeath();
            return;
        }
        if (state.phase === 'relay-finish') {
            state.relayFinishDelay -= delta;
            bird.animationTime += delta;
            if (state.relayFinishDelay <= 0) finishDeath();
            return;
        }
        if (state.phase === 'playing') {
            state.elapsed += delta;
            state.ghostRecorder?.record(state.elapsed, bird.y + BIRD.height / 2, state.inputUp ? 1 : state.inputDown ? -1 : 0);
            updateStages(delta);
            if (currentLevel === STORMLINE_EVENT) {
                const cue = BertStormline.windCue(state.worldTime);
                state.speed *= cue.speedFactor;
                advanceWindLeaves(delta, cue);
            }
            state.worldDistance += BertProgression.scrollPixelsPerSecond(state.speed) * delta;
            updateBird(delta);
            if (currentLevel.kind === 'skyRelay') {
                if (state.phase === 'playing') updateSkyRelay();
                updateHud();
                return;
            }
            if (state.phase === 'playing' && state.elapsed >= state.nextSpawnAt) {
                if (currentLevel.kind === 'test') {
                    state.nextSpawnAt = Number.POSITIVE_INFINITY;
                } else if (obstacleGroupCanSpawn()) {
                    spawnObstacle();
                    const baseDistance = currentLevel.spacing || OBSTACLE_SPACING[currentLevel.kind] || 680;
                    if (currentLevel.kind === 'desert') {
                        const lower = clamp(845 - state.difficulty * 24, 790, 825);
                        state.spawnSpacing = randomBetween(lower, lower + 150);
                    } else {
                        state.spawnSpacing = currentLevel.kind === 'jungle'
                            ? state.elapsed < 18 ? 940 : state.elapsed < 35 ? 800 : baseDistance
                            : currentLevel.kind === 'flappy'
                                ? flappySpacing(baseDistance)
                                : baseDistance;
                    }
                    if (currentLevel === STORMLINE_EVENT && state.activePowerup === POWERUP.HYPER) {
                        state.spawnSpacing *= BertEventPowerups.HYPER_MULTIPLIER;
                    }
                    state.nextSpawnAt = state.elapsed + BertProgression.spawnDelay(
                        state.difficulty,
                        gameRandom(),
                        state.speed,
                        state.spawnSpacing,
                    );
                } else {
                    state.nextSpawnAt = state.elapsed + 0.08;
                }
            }
            if (heldPointers.size && !usingFlapControl() && !state.inputUp && !state.inputDown) applyHeldDirection();
            const targetScale = SIZE_POWERUP[state.activePowerup] || 1;
            state.birdScale = (state.birdScale || 1) + (targetScale - (state.birdScale || 1)) * Math.min(1, delta * 6);
            window.BertSizeScale = state.birdScale;
            updateAmbient(delta);
            // Difficulty steps you can feel and see: every 30 seconds "NIVEAU n!" and
            // a little more speed on top of the normal ramp (feedback 9.–10. okt.).
            const step = 1 + Math.floor(state.elapsed / 30);
            if (state.phase === 'playing' && !isEventLevel() && step > (state.levelStep || 1)) {
                state.levelStep = step;
                state.comboText = { text: T`NIVEAU ${step}!`, age: 0, levelUp: true };
                playAudio('combo');
                setTimeout(() => playAudio('bert_pip'), 250);
            }
            noteNearMiss();
            // Sky Relay: from round 2 birds cross the route, from round 3 the hawk hunts too.
            if (currentLevel.kind === 'skyRelay' && state.phase === 'playing' && state.relayRoute) {
                const round = state.relayRoute.round || 1;
                if (round >= 2 && state.elapsed >= (state.nextRelayBirdAt || 6)) {
                    state.relayBirdCount = (state.relayBirdCount || 0) + 1;
                    const hawk = round >= 3 && state.relayBirdCount % 4 === 0;
                    const encounter = BertBirdRun.createEncounter(hawk ? 5 : 4 + Math.floor(gameRandom() * 2) * 3, VIEW.width + 140, gameRandom);
                    encounter.obstacle.id = state.obstacleId++;
                    obstacles.push(encounter.obstacle);
                    state.nextRelayBirdAt = state.elapsed + clamp(7.5 - round * 1.1, 2.6, 6);
                }
            }
            updateObjects(delta);
            updateVolcanoLava(delta);
            updateIceAndWind(delta);
            updateNightLight(delta);
            updatePoop(delta, BertProgression.scrollPixelsPerSecond(state.speed) * delta);
            updateSmokeFog(delta, BertProgression.scrollPixelsPerSecond(state.speed) * delta);
            obstacles.forEach((obstacle) => {
                if (obstacle.kind === 'happy-balloon') obstacle.y = obstacle.baseY + Math.sin(obstacle.age * 1.1 + obstacle.bob) * 55;
            });
            updateHud();
            return;
        }
        if (state.phase === 'dead') {
            state.speed = lerp(state.speed, 0.3, Math.min(1, delta));
            state.worldDistance += BertProgression.scrollPixelsPerSecond(state.speed) * delta;
            state.deathCaptureElapsed += delta;
            if (state.deathCause !== 'jungle-spider') {
                bird.velocity += 980 * delta;
                bird.y = Math.min(VIEW.height - BIRD.height, bird.y + bird.velocity * delta);
                bird.rotation = Math.min(180, bird.rotation + 210 * delta);
            }
            state.deathCountdown -= delta;
            updateObjects(delta, false);
            if (state.deathCountdown <= 0) offerRescueWheel();
        }
    }

    function drawTiled(imageElement, y, height, factor) {
        const imageWidth = imageElement?.naturalWidth || imageElement?.width;
        const imageHeight = imageElement?.naturalHeight || imageElement?.height;
        if (!imageWidth || !imageHeight) return;
        const width = Math.max(VIEW.width, (imageWidth / imageHeight) * height);
        const menuDistance = state.worldTime * 220;
        const distance = ['playing', 'dead', 'gameover', 'relay-finish', 'world-finish'].includes(state.phase)
            ? state.worldDistance : menuDistance;
        const offset = ((distance * factor) % width + width) % width;
        // Only the visible part of each tile is drawn (at most two tiles), so the GPU
        // never paints pixels outside the screen. This was the biggest cost per frame.
        const scaleX = imageWidth / width;
        // Whole-pixel positions and a 1 px overlap between tiles: no flicker at the seams.
        const start = -Math.round(offset);
        for (let x = start; x < VIEW.width; x += width) {
            const left = Math.max(0, x);
            const right = Math.min(VIEW.width, x + width + 1);
            if (right <= left) continue;
            const sw = Math.min(imageWidth - (left - x) * scaleX, (right - left) * scaleX);
            ctx.drawImage(imageElement, (left - x) * scaleX, 0, sw, imageHeight, left, Math.round(y), sw / scaleX, height);
        }
    }

    // Read once a second instead of dozens of times per frame (matchMedia showed up in profiles).
    let reducedMotionCache = false;
    let reducedMotionReadAt = -Infinity;
    function prefersReducedMotion() {
        const now = performance.now();
        if (now - reducedMotionReadAt > 1000) {
            reducedMotionReadAt = now;
            reducedMotionCache = Boolean(window.matchMedia?.('(prefers-reduced-motion: reduce)').matches);
        }
        return reducedMotionCache;
    }

    function drawEDMBackground() {
        if (!assets.edmStage?.naturalWidth) {
            ctx.fillStyle = '#091630';
            ctx.fillRect(0, 0, VIEW.width, VIEW.height);
            return;
        }
        ctx.drawImage(assets.edmStage, 0, 0, VIEW.width, VIEW.height);
        if (assets.g4Festival?.naturalWidth) ctx.drawImage(assets.g4Festival, 0, 440, VIEW.width, 300);
        if (assets.v2EdmStage?.naturalWidth) {
            // Festival searchlights behind the stage: slow coloured sweeps that bring back
            // the busy concert backdrop of the old design without covering play.
            if (!prefersReducedMotion() && BertMeta.settingEnabled('lights')) {
                ctx.save();
                ctx.globalCompositeOperation = 'lighter';
                [['rgba(255, 90, 210, .26)', 420, 0.7], ['rgba(90, 230, 255, .26)', 860, -0.6], ['rgba(255, 210, 90, .2)', 640, 0.45]].forEach(([color, baseX, speed], index) => {
                    const angle = Math.sin(state.worldTime * speed + index * 2) * 0.55;
                    ctx.save();
                    ctx.translate(baseX, 640);
                    ctx.rotate(angle);
                    const beam = ctx.createLinearGradient(0, 0, 0, -620);
                    beam.addColorStop(0, color);
                    beam.addColorStop(1, 'rgba(0,0,0,0)');
                    ctx.fillStyle = beam;
                    ctx.beginPath(); ctx.moveTo(-18, 0); ctx.lineTo(18, 0); ctx.lineTo(120, -640); ctx.lineTo(-120, -640); ctx.closePath(); ctx.fill();
                    ctx.restore();
                });
                ctx.restore();
            }
            // Smaller and further back, so the stage sets the scene without crowding play.
            // The DJ stands behind the booth (booth top ≈ y 507 on screen): drawn first,
            // so the booth hides the lower body. Pose follows the beat; both wings up on the drop.
            const djPoses = ['v2DjMix', 'v2DjMove1', 'v2DjMix', 'v2DjMove2', 'v2DjMix', 'v2DjMove1', 'v2DjMix', 'v2DjUp'];
            const beat = prefersReducedMotion() ? 0 : Math.floor(state.worldTime * 2.2);
            const dj = assets[djPoses[beat % djPoses.length]];
            if (dj?.naturalWidth) {
                const bob = prefersReducedMotion() ? 0 : Math.abs(Math.sin(state.worldTime * Math.PI * 2.2)) * 5;
                // Stage 720×225 standing on the crowd line (base ≈ y 705); booth top ≈ y 604.
                // DJ at half the previous size (feedback), still standing behind the booth.
                ctx.drawImage(dj, 599, 550 - bob * 0.5, 82, 82);
            }
            ctx.drawImage(assets.v2EdmStage, 280, 480, 720, 225);
        } else {
        // A stage in the background: deck, glowing front edge, DJ booth and side screens.
        ctx.save();
        const cx = VIEW.width / 2;
        ctx.fillStyle = '#120b2e';
        ctx.beginPath(); ctx.moveTo(cx - 470, 600); ctx.lineTo(cx - 390, 470); ctx.lineTo(cx + 390, 470); ctx.lineTo(cx + 470, 600); ctx.closePath(); ctx.fill();
        ctx.fillStyle = '#1d1446';
        ctx.fillRect(cx - 120, 420, 240, 56);
        ctx.strokeStyle = 'rgba(124, 243, 255, .85)';
        ctx.lineWidth = 4;
        ctx.beginPath(); ctx.moveTo(cx - 390, 470); ctx.lineTo(cx + 390, 470); ctx.stroke();
        ctx.strokeStyle = 'rgba(255, 110, 220, .8)';
        ctx.strokeRect(cx - 120, 420, 240, 56);
        [-1, 1].forEach((side) => {
            ctx.fillStyle = '#0f0a26';
            ctx.fillRect(cx + side * 520 - 70, 330, 140, 200);
            const pulse = 0.35 + 0.25 * Math.sin(state.worldTime * 6 + side);
            ctx.fillStyle = `rgba(124, 243, 255, ${pulse})`;
            ctx.fillRect(cx + side * 520 - 58, 342, 116, 120);
        });
        ctx.restore();
        }
        if (!BertMeta.settingEnabled('lights')) return;
        const reduced = prefersReducedMotion();
        const cue = BertEDM.lightCue(state.worldTime, reduced);
        ctx.save();
        ctx.fillStyle = cue.color;
        BertEDM.STAGE_PROJECTORS.forEach((lamp, index) => {
            const offset = reduced ? 0 : Math.sin(state.worldTime * 0.58 + index * 1.6) * 22;
            ctx.globalAlpha = Math.min(0.15, cue.intensity * 0.86);
            ctx.beginPath();
            ctx.moveTo(lamp.x, lamp.y);
            ctx.lineTo(lamp.aimX + offset - 43, lamp.aimY);
            ctx.lineTo(lamp.aimX + offset + 43, lamp.aimY);
            ctx.closePath();
            ctx.fill();
            // Small fixtures share the stage towers' coordinates in the image.
            ctx.globalAlpha = 0.5;
            ctx.beginPath();
            ctx.arc(lamp.x, lamp.y, 3, 0, Math.PI * 2);
            ctx.fill();
        });
        ctx.restore();
    }

    function smokeStamp() {
        if (edmSmokeStamp) return edmSmokeStamp;
        const stamp = document.createElement('canvas');
        stamp.width = 180;
        stamp.height = 120;
        const paint = stamp.getContext('2d');
        const glow = paint.createRadialGradient(90, 73, 5, 90, 73, 77);
        glow.addColorStop(0, 'rgba(212,231,244,.75)');
        glow.addColorStop(0.56, 'rgba(163,194,220,.36)');
        glow.addColorStop(1, 'rgba(140,185,220,0)');
        paint.fillStyle = glow;
        paint.fillRect(0, 0, stamp.width, stamp.height);
        edmSmokeStamp = stamp;
        return stamp;
    }

    function drawEDMSmoke() {
        if (currentLevel.kind !== 'edm') return;
        const mist = BertEDM.smokeCue(state.worldTime, prefersReducedMotion());
        if (!mist.active) return;
        const stamp = smokeStamp();
        ctx.save();
        // Haze can soften the lower stage, never replace a hazardous silhouette.
        ctx.globalAlpha = mist.opacity;
        for (const origin of [430, 850]) {
            for (let index = 0; index < 3; index += 1) {
                const lift = (mist.age * 34 + index * 38) % 160;
                const spread = Math.sin(index * 2.4 + mist.age * 0.8) * 24;
                ctx.drawImage(stamp, origin + spread - 90, 577 - lift, 180 + index * 22, 120 + index * 12);
            }
        }
        ctx.restore();
    }

    function drawEDMFrontLasers() {
        if (currentLevel.kind !== 'edm' || prefersReducedMotion() || !BertMeta.settingEnabled('lights')) return;
        const cue = BertEDM.lightCue(state.worldTime);
        ctx.save();
        ctx.strokeStyle = cue.color;
        // Decorative thin rays cross the extreme foreground, not the collision layer.
        for (const [x, target] of [[32, 340], [1248, 940]]) {
            const drift = Math.sin(state.worldTime * 0.42 + x) * 35;
            ctx.globalAlpha = 0.08;
            ctx.lineWidth = 6;
            ctx.beginPath();
            ctx.moveTo(x, 655);
            ctx.lineTo(target + drift, 144);
            ctx.stroke();
            ctx.globalAlpha = 0.28;
            ctx.lineWidth = 1.5;
            ctx.stroke();
        }
        ctx.restore();
    }

    function drawStormlineBackground() {
        ctx.fillStyle = '#9bc9dd';
        ctx.fillRect(0, 0, VIEW.width, VIEW.height);
        if (assets.stormSky?.naturalWidth) ctx.drawImage(assets.stormSky, 0, 0, VIEW.width, VIEW.height);
        const wind = BertStormline.windCue(state.worldTime);
        const reduced = prefersReducedMotion();
        if (assets.stormSkyDark?.naturalWidth && wind.strength > 0.45) {
            // Storm and hurricane darken the sky; it fades back when the wind drops.
            ctx.save();
            ctx.globalAlpha = clamp((wind.strength - 0.45) / 0.4, 0, 1) * 0.85;
            ctx.drawImage(assets.stormSkyDark, 0, 0, VIEW.width, VIEW.height);
            ctx.restore();
        }
        ctx.save();
        if (assets.stormGust?.naturalWidth && wind.strength > 0.05) {
            // Drawn gust streaks instead of thin lines, flowing with the wind.
            ctx.globalAlpha = 0.65 * wind.strength;
            const flow = Math.sign(wind.horizontal || 1);
            for (let band = 0; band < 4; band += 1) {
                for (let repeat = 0; repeat < 3; repeat += 1) {
                    const shift = reduced ? 0 : state.worldTime * 60 * flow;
                    const x = ((repeat * 465 + band * 138 - shift + 180 + 3840) % 1480) - 180;
                    const y = 200 + band * 90 + Math.sin(repeat * 2 + band) * 17;
                    ctx.save();
                    ctx.translate(x, y);
                    ctx.rotate(Math.atan2(wind.vertical, Math.abs(wind.horizontal) || 1) * flow);
                    if (flow < 0) ctx.scale(-1, 1);
                    ctx.drawImage(assets.stormGust, -90, -22, 180, 44);
                    ctx.restore();
                }
            }
            ctx.restore();
            ctx.save();
        }
        ctx.strokeStyle = '#246384';
        ctx.lineCap = 'round';
        ctx.lineWidth = 2.4;
        ctx.globalAlpha = 0.24 * wind.strength;
        // These soft wisps and leaves show the same direction as the actual force.
        for (let band = 0; band < 4; band += 1) {
            for (let repeat = 0; repeat < 3; repeat += 1) {
                const shift = reduced ? 0 : state.worldTime * 40 * Math.sign(wind.horizontal || 1);
                const x = ((repeat * 465 + band * 138 - shift + 180 + 3840) % 1480) - 180;
                const y = 218 + band * 84 + Math.sin(repeat * 2 + band) * 17;
                const flow = Math.sign(wind.horizontal || 1);
                ctx.beginPath();
                ctx.moveTo(x, y);
                ctx.bezierCurveTo(x + flow * 45, y + wind.vertical * 8,
                    x + flow * 110, y + wind.vertical * 32,
                    x + flow * 166, y + wind.vertical * 47);
                ctx.stroke();
            }
        }
        for (const leaf of windLeaves) {
            ctx.save();
            ctx.translate(leaf.x, leaf.y);
            ctx.rotate((wind.level === 0 ? 0 : Math.atan2(wind.vertical, wind.horizontal))
                + (reduced ? 0 : Math.sin(state.worldTime * 4 + leaf.phase) * 0.14));
            ctx.globalAlpha = 0.34 + wind.strength * 0.56;
            ctx.fillStyle = leaf.phase % 2 > 1 ? '#e3be57' : '#639d67';
            ctx.beginPath();
            ctx.moveTo(-leaf.size * 0.55, 0);
            ctx.quadraticCurveTo(0, -leaf.size * 0.44, leaf.size * 0.55, 0);
            ctx.quadraticCurveTo(0, leaf.size * 0.42, -leaf.size * 0.55, 0);
            ctx.fill();
            ctx.strokeStyle = '#28597a';
            ctx.lineWidth = 1;
            ctx.beginPath();
            ctx.moveTo(-leaf.size * 0.36, 0);
            ctx.lineTo(leaf.size * 0.3, 0);
            ctx.stroke();
            ctx.restore();
        }
        ctx.restore();
    }

    function drawStormWindMeter(wind) {
        // The windsock and its readout are one bottom-edge instrument; nothing
        // floats over the sky or competes with the score HUD on small phones.
        const x = 238;
        const y = 624;
        ctx.save();
        ctx.lineJoin = 'round';
        ctx.strokeStyle = 'rgba(9, 37, 55, .94)';
        ctx.lineWidth = 5;
        ctx.fillStyle = '#fff2d0';
        ctx.font = '900 20px "Bert Rounded", sans-serif';
        ctx.strokeText(`VIND · ${wind.grade.toUpperCase()}`, x, y + 19);
        ctx.fillText(`VIND · ${wind.grade.toUpperCase()}`, x, y + 19);
        ctx.font = '800 16px "Bert Rounded", sans-serif';
        ctx.strokeText(wind.label, x + 35, y + 48);
        ctx.fillText(wind.label, x + 35, y + 48);
        ctx.fillStyle = '#f9c665';
        if (wind.level === 0) {
            ctx.beginPath();
            ctx.arc(x + 10, y + 42, 5, 0, Math.PI * 2);
            ctx.fill();
        } else {
            const angle = Math.atan2(wind.vertical, wind.horizontal);
            ctx.translate(x + 10, y + 42);
            ctx.rotate(angle);
            ctx.strokeStyle = '#f9c665';
            ctx.lineWidth = 4;
            ctx.beginPath();
            ctx.moveTo(-14, 0);
            ctx.lineTo(12, 0);
            ctx.stroke();
            ctx.beginPath();
            ctx.moveTo(19, 0);
            ctx.lineTo(6, -8);
            ctx.lineTo(6, 8);
            ctx.closePath();
            ctx.fill();
        }
        ctx.restore();
        ctx.save();
        for (let bar = 0; bar < 3; bar += 1) {
            ctx.fillStyle = bar < wind.level ? ['#90d1b0', '#f3d073', '#ef8c6c'][bar] : 'rgba(255,255,255,.35)';
            ctx.strokeStyle = 'rgba(9, 37, 55, .87)';
            ctx.lineWidth = 2.5;
            ctx.beginPath();
            ctx.arc(x + 186 + bar * 24, y + 42, 7 + bar * 2, 0, Math.PI * 2);
            ctx.fill();
            ctx.stroke();
        }
        ctx.restore();
    }

    function drawBackground() {
        const level = state.phase === 'menu' || state.phase === 'levels' ? UNITY_LEVELS[0] : currentLevel;
        if (level.kind === 'edm') {
            drawEDMBackground();
            return;
        }
        // Open-sky test worlds borrow the new Happy Sky: sky plus a low cloud floor.
        const newSky = V2.levels.has('happySky') && assets.v2_happySky_Sky?.naturalWidth;
        if (level.kind === 'birdRun') {
            ctx.fillStyle = '#bdeaff';
            ctx.fillRect(0, 0, VIEW.width, VIEW.height);
            if (newSky) {
                drawTiled(assets.v2_happySky_Sky, 0, 720, 0.03);
            } else if (assets.happySky?.naturalWidth) ctx.drawImage(assets.happySky, 0, 0, VIEW.width, VIEW.height);
            return;
        }
        if (level.kind === 'skyRelay') {
            ctx.fillStyle = '#bdeaff';
            ctx.fillRect(0, 0, VIEW.width, VIEW.height);
            if (newSky) {
                drawTiled(assets.v2_happySky_Sky, 0, 720, 0.03);
                if (assets.v2_happySky_Mg?.naturalWidth) drawTiled(assets.v2_happySky_Mg, 540, 200, 0.15);
                return;
            }
            if (assets.happySky?.naturalWidth) ctx.drawImage(assets.happySky, 0, 0, VIEW.width, VIEW.height);
            if (assets.happyMg?.naturalWidth) drawTiled(assets.happyMg, 568, 152, 0.15);
            return;
        }
        if (level.kind === 'stormline') {
            drawStormlineBackground();
            return;
        }
        if (level.kind === 'glide') {
            // Svæv (round 7): warm sky, far hills, patchwork fields.
            if (assets.g7GlideSky?.naturalWidth) ctx.drawImage(assets.g7GlideSky, 0, 0, VIEW.width, VIEW.height);
            else { ctx.fillStyle = '#9fd8f2'; ctx.fillRect(0, 0, VIEW.width, VIEW.height); }
            if (assets.g7GlideBg1?.naturalWidth) drawTiled(assets.g7GlideBg1, 0, 720, 0.1);
            if (assets.g7GlideBg2?.naturalWidth) drawTiled(assets.g7GlideBg2, 0, 720, 0.3);
            return;
        }
        ctx.fillStyle = level.kind === 'jungle' ? '#153c20' : level.kind === 'happySky' ? '#bdeeff' : level.kind === 'tunnel' ? '#061a2b' : '#70c8e0';
        ctx.fillRect(0, 0, VIEW.width, VIEW.height);
        level.layers.forEach((layer, index) => {
            drawTiled(assets[layer.image], layer.y, layer.height, layer.factor);
            // Desert: the stretched sky's horizon showed as a cyan band (looked like
            // water) between the city and the dunes. Sand fills it behind the layers.
            if (index === 0 && level.kind === 'desert' && !V2.levels.has('desert')) {
                const sand = ctx.createLinearGradient(0, 410, 0, VIEW.height);
                sand.addColorStop(0, '#d7c67c');
                sand.addColorStop(1, '#bfac67');
                ctx.fillStyle = sand;
                ctx.fillRect(0, 410, VIEW.width, VIEW.height - 410);
            }
        });
        if (level.kind === 'tunnel') drawTunnelWalls();
        if (level.kind === 'jungle') {
            ctx.fillStyle = 'rgba(4, 29, 11, 0.06)';
            ctx.fillRect(0, 0, VIEW.width, VIEW.height);
        }
    }

    function drawWindSock(poleX, poleY, cue) {
        const image = assets.stormSock;
        if (!image?.naturalWidth) return;
        ctx.save();
        ctx.globalAlpha = 0.94;
        // Crop the original illustration so the pole stays fixed while only fabric turns.
        ctx.drawImage(image, 379, 0, 70, 320, poleX - 10, poleY, 22, 100);
        ctx.translate(poleX, poleY + 35);
        const unfurl = clamp(cue.strength / 0.24, 0, 1);
        ctx.save();
        ctx.rotate(-Math.PI / 2);
        ctx.globalAlpha = 0.94 * (1 - unfurl);
        ctx.drawImage(image, 45, 66, 355, 130, -34, -13, 34, 30);
        ctx.restore();
        if (unfurl > 0) {
            const sign = cue.horizontal >= 0 ? 1 : -1;
            const slope = Math.atan2(cue.vertical, Math.abs(cue.horizontal) + 0.2) * sign;
            const flutter = prefersReducedMotion() ? 0 : Math.sin(state.worldTime * 6) * cue.strength * 0.045;
            ctx.rotate(slope + flutter);
            ctx.scale(sign === 1 ? -1 : 1, 1);
            ctx.globalAlpha = 0.94 * unfurl;
            const length = (77 + cue.strength * 41) * unfurl;
            ctx.drawImage(image, 45, 66, 355, 130, -length, -15, length, 44);
        }
        ctx.restore();
    }

    function drawForeground() {
        if (['menu', 'levels', 'loading'].includes(state.phase)) return;
        if (currentLevel.kind === 'glide' && assets.g7GlideFg?.naturalWidth) {
            drawTiled(assets.g7GlideFg, VIEW.height - 160, 160, 1);
            return;
        }
        if (currentLevel.kind === 'stormline') {
            const cue = BertStormline.windCue(state.worldTime);
            drawWindSock(155, 604, cue);
            if (assets.stormSky?.naturalWidth) {
                // Source from this *same* sky to create shallow cloud occlusion.
                ctx.drawImage(assets.stormSky, 0, 0, 1600, 120, 0, 0, VIEW.width, 58);
                ctx.drawImage(assets.stormSky, 0, 780, 1600, 120, 0, 667, VIEW.width, 53);
            }
            drawStormWindMeter(cue);
            return;
        }
        // New-style art: the near layer is drawn whole at the bottom (no straight cut)
        // and mirrored as a shallow top edge, so every level has a top and bottom frame.
        const v2Edge = (kind, image, bottom = true) => {
            if (!image?.naturalWidth) return false;
            ctx.save();
            ctx.translate(0, 70);
            ctx.scale(1, -1);
            ctx.globalAlpha = 0.95;
            drawTiled(image, 0, 140, 0.4);
            ctx.restore();
            // In front of Bert again (feedback 4. okt.), but pushed down so only a low
            // top edge shows: the art's half-covered row sits at y≈668, near the floor.
            const FG_HALF = { desert: 107, jungle: 128, happySky: 109, flappy: 44, tunnel: 96 };
            if (bottom) drawTiled(image, 668 - (FG_HALF[kind] ?? 100), 200, kind === 'flappy' ? 1.0 : 0.55);
            return true;
        };
        // Mirrored top edge only where it reads as natural (an ice overhang); a mirrored
        // quay or street looked upside down and made harbour read as water-sky-water-sky.
        if (currentLevel.kind === 'iceberg') v2Edge('iceberg', assets.icebergFg, false);
        if ((currentLevel.kind === 'birdRun' || currentLevel.kind === 'skyRelay' ) && V2.levels.has('happySky')) {
            if (v2Edge('happySky', assets.v2_happySky_Fg)) return;
        }
        if (V2.levels.has(currentLevel.kind) && v2Edge(currentLevel.kind, assets[`v2_${currentLevel.kind}_Fg`])) return;
        if (currentLevel.kind === 'birdRun') {
            if (!assets.birdRunCloud?.naturalWidth) return;
            ctx.save();
            ctx.beginPath();
            ctx.rect(0, 0, VIEW.width, 98);
            ctx.clip();
            ctx.translate(0, 205);
            ctx.scale(1, -1);
            drawTiled(assets.birdRunCloud, 0, 205, prefersReducedMotion() ? 0 : 0.16);
            ctx.restore();
            ctx.save();
            ctx.beginPath();
            ctx.rect(0, 644, VIEW.width, VIEW.height - 644);
            ctx.clip();
            drawTiled(assets.birdRunCloud, 570, 180, prefersReducedMotion() ? 0 : 0.32);
            ctx.restore();
            return;
        }
        if (currentLevel.kind === 'edm' && assets.v2EdmTruss?.naturalWidth) {
            // New-style stage: horizontal light truss at the top, new crowd at the bottom.
            // A thinner truss high up, so the top of the stage never feels crowded.
            drawTiled(assets.v2EdmTruss, -10, 48, 0.16);
            if (assets.edmCrowd?.naturalWidth) {
                const reduced = prefersReducedMotion();
                const frame = crowdFrames[BertEDM.crowdFrame(state.worldTime, reduced)];
                // Round 3 crowd: hands down, half up, up — two rows a half beat apart.
                const poses = [assets.v2Crowd0, assets.v2Crowd1, assets.v2Crowd2, assets.v2Crowd1];
                if (poses[0]?.naturalWidth) {
                    const step = reduced ? 0 : Math.floor(state.worldTime * 4);
                    drawTiled(poses[step % 4], 548, 180, 0.34);
                    drawTiled(poses[(step + 2) % 4], 572, 180, 0.42);
                    return;
                }
                // The crowd jumps to the beat (two offset rows so it never moves as one block).
                const beat = reduced ? 0 : Math.abs(Math.sin(state.worldTime * Math.PI * 2));
                drawTiled(frame || assets.edmCrowd, 574 - beat * 9, 160, 0.34);
                drawTiled(frame || assets.edmCrowd, 590 - (1 - beat) * 7, 160, 0.42);
            }
            return;
        }
        if (currentLevel.kind === 'edm') {
            const truss = assets.edmTruss;
            if (truss?.naturalWidth) {
                const band = 58;
                const segment = Math.round(truss.naturalHeight / truss.naturalWidth * band);
                const offset = (state.worldDistance * 0.16) % segment;
                ctx.save();
                ctx.beginPath();
                ctx.rect(0, 0, VIEW.width, band);
                ctx.clip();
                ctx.globalAlpha = 0.88;
                for (let x = -segment - offset; x < VIEW.width + segment; x += segment) {
                    ctx.save();
                    ctx.translate(x, band);
                    ctx.rotate(-Math.PI / 2);
                    ctx.drawImage(truss, 0, 0, band, segment);
                    ctx.restore();
                }
                ctx.restore();
            }
            if (assets.edmCrowd?.naturalWidth) {
                const frame = crowdFrames[BertEDM.crowdFrame(state.worldTime, prefersReducedMotion())];
                drawTiled(frame || assets.edmCrowd, 628, 92, 0.38);
            }
            return;
        }
        if (currentLevel.kind === 'jungle') {
            if (assets.jungleTop?.naturalWidth) drawTiled(assets.jungleTop, -8, 120, 0.78);
            if (assets.jungleFg?.naturalWidth) {
                ctx.save();
                ctx.beginPath();
                ctx.rect(0, 632, VIEW.width, VIEW.height - 632);
                ctx.clip();
                drawTiled(assets.jungleFg, 410, 310, 1.00);
                ctx.restore();
            }
            return;
        }
        const band = FOREGROUND_BANDS[currentLevel.kind];
        if (!band || !assets[band.image]?.naturalWidth) return;
        // The same original image/parallax offset is clipped over the obstacle roots;
        // unlike a second full layer, this never masks a playable gap or the bird.
        ctx.save();
        ctx.beginPath();
        ctx.rect(0, band.floor, VIEW.width, VIEW.height - band.floor);
        ctx.clip();
        drawTiled(assets[band.image], band.y, band.height, band.factor);
        ctx.restore();
        ctx.save();
        ctx.translate(0, band.top);
        ctx.scale(1, -1);
        ctx.globalAlpha = currentLevel.kind === 'tunnel' ? 0.87 : 0.95;
        drawTiled(assets[band.image], 0, band.top, band.factor * 0.8);
        ctx.restore();
    }

    function drawTunnelWalls() {
        const samples = BertTunnel.sample(VIEW.width, state.worldDistance, state.difficulty, 44, currentLevel.variant);
        const wallGradient = ctx.createLinearGradient(0, 0, 0, VIEW.height);
        const pulse = currentLevel.variant === BertTunnel.VARIANTS.PULSE;
        const stream = currentLevel.variant === BertTunnel.VARIANTS.STAR_STREAM;
        wallGradient.addColorStop(0, pulse ? '#201333' : stream ? '#08233a' : '#0e1724');
        wallGradient.addColorStop(0.5, pulse ? '#42304f' : stream ? '#17465d' : '#29343d');
        wallGradient.addColorStop(1, pulse ? '#160d24' : stream ? '#071c2d' : '#171018');
        ctx.save();
        ctx.fillStyle = wallGradient;
        // New-style Tunnel: the night world shows faintly through the walls.
        if (V2.levels.has('tunnel')) ctx.globalAlpha = 0.72;
        ctx.beginPath();
        ctx.moveTo(samples[0].x, 0);
        samples.forEach((point) => ctx.lineTo(point.x, point.top));
        ctx.lineTo(samples.at(-1).x, 0);
        ctx.closePath();
        ctx.fill();
        ctx.beginPath();
        ctx.moveTo(samples[0].x, VIEW.height);
        samples.forEach((point) => ctx.lineTo(point.x, point.bottom));
        ctx.lineTo(samples.at(-1).x, VIEW.height);
        ctx.closePath();
        ctx.fill();
        ctx.globalAlpha = 1;
        if (V2.levels.has('tunnel') && assets.v2TunnelGlow?.naturalWidth) {
            // Soft light streaks along both edges.
            ctx.save();
            ctx.globalCompositeOperation = 'lighter';
            ctx.globalAlpha = 0.55;
            for (let i = 1; i < samples.length - 1; i += 3) {
                const a = samples[i - 1];
                const b = samples[i + 1];
                [['top', a.top, b.top], ['bottom', a.bottom, b.bottom]].forEach(([, y1, y2]) => {
                    ctx.save();
                    ctx.translate(samples[i].x, (y1 + y2) / 2);
                    ctx.rotate(Math.atan2(y2 - y1, b.x - a.x));
                    ctx.drawImage(assets.v2TunnelGlow, -80, -20, 160, 40);
                    ctx.restore();
                });
            }
            ctx.restore();
        }
        const edgeColor = pulse ? 'rgba(237, 102, 255, .78)' : stream ? 'rgba(90, 245, 255, .82)' : 'rgba(92, 220, 237, .68)';
        ctx.strokeStyle = edgeColor;
        ctx.lineWidth = 8;
        ctx.globalAlpha = .2;
        ctx.beginPath();
        samples.forEach((point, index) => index ? ctx.lineTo(point.x, point.top) : ctx.moveTo(point.x, point.top));
        ctx.stroke();
        ctx.beginPath();
        samples.forEach((point, index) => index ? ctx.lineTo(point.x, point.bottom) : ctx.moveTo(point.x, point.bottom));
        ctx.stroke();
        ctx.globalAlpha = 1;
        ctx.lineWidth = 3;
        ctx.beginPath();
        samples.forEach((point, index) => index ? ctx.lineTo(point.x, point.top) : ctx.moveTo(point.x, point.top));
        ctx.stroke();
        ctx.beginPath();
        samples.forEach((point, index) => index ? ctx.lineTo(point.x, point.bottom) : ctx.moveTo(point.x, point.bottom));
        ctx.stroke();
        if (currentLevel.variant === BertTunnel.VARIANTS.TRAINING) {
            // The dashed centre line is gone (feedback). A short steering hint shows instead.
        } else if (pulse) {
            ctx.fillStyle = 'rgba(255, 207, 89, .72)';
            samples.forEach((point, index) => {
                if (index % 4 || point.bottom - point.top > 304) return;
                ctx.fillRect(point.x - 2, point.top + 9, 4, 14);
                ctx.fillRect(point.x - 2, point.bottom - 23, 4, 14);
            });
        }
        ctx.restore();
    }

    function happyPipeAsset(color, top) {
        const title = color.charAt(0).toUpperCase() + color.slice(1);
        return assets[`happyPipe${title}${top ? 'Top' : ''}`];
    }

    // New-style Happy Sky: candy towers. The face sits at the gap end in its true
    // proportions; the rest of the length is filled with the tower's plain body.
    const V2_TOWERS = ['v2Tower0', 'v2Tower1', 'v2Tower2'];
    function drawCandyTower(obstacle) {
        const art = assets[V2_TOWERS[Math.abs(obstacle.id || 0) % 3]];
        if (!art?.naturalWidth) return false;
        const w = obstacle.width;
        const H = art.naturalHeight;
        const scale = w / art.naturalWidth;
        // Art: cap + face (0–45 %), plain stripes (50–75 %), flange foot (80–100 %).
        const slice = (from, to, y, height) => ctx.drawImage(art, 0, H * from, art.naturalWidth, H * (to - from), obstacle.x, y, w, height);
        if (obstacle.top) {
            // Hanging: stripes from the top, the flange at the gap end (faces only on standing towers).
            const foot = Math.min(obstacle.height, H * 0.2 * scale);
            const rest = obstacle.height - foot;
            if (rest > 0) slice(0.5, 0.75, obstacle.y, rest + 2);
            slice(0.8, 1, obstacle.y + rest, foot);
        } else {
            const head = Math.min(obstacle.height, H * 0.45 * scale);
            const rest = obstacle.height - head;
            if (rest > 0) slice(0.5, 0.75, obstacle.y + head - 2, rest + 2);
            slice(0, 0.45, obstacle.y, head);
        }
        return true;
    }

    function drawHappyPipe(obstacle) {
        if (V2.levels.has('happySky') && drawCandyTower(obstacle)) return;
        if (obstacle.color === 'coral') {
            if (obstacle.top) {
                ctx.save();
                ctx.translate(obstacle.x + obstacle.width / 2, obstacle.height);
                ctx.scale(1, -1);
                ctx.drawImage(assets.happyCoral, -obstacle.width / 2, 0, obstacle.width, obstacle.height);
                ctx.restore();
            } else {
                ctx.drawImage(assets.happyCoral, obstacle.x, obstacle.y, obstacle.width, obstacle.height);
            }
        } else {
            const capHeight = Math.min(38, Math.max(24, obstacle.width * (45 / 153)));
            const bodyWidth = obstacle.width * 0.84;
            const bodyX = obstacle.x + (obstacle.width - bodyWidth) / 2;
            const body = happyPipeAsset(obstacle.color, false);
            const cap = happyPipeAsset(obstacle.color, true);
            if (obstacle.top) {
                ctx.drawImage(body, bodyX, obstacle.y, bodyWidth, Math.max(1, obstacle.height - capHeight * .55));
                ctx.drawImage(cap, obstacle.x, obstacle.y + obstacle.height - capHeight, obstacle.width, capHeight);
            } else {
                ctx.drawImage(body, bodyX, obstacle.y + capHeight * .55, bodyWidth, Math.max(1, obstacle.height - capHeight * .55));
                ctx.drawImage(cap, obstacle.x, obstacle.y, obstacle.width, capHeight);
            }
        }
        const blink = Math.floor(obstacle.age * 3.5) % 11 === 0;
        const faceY = obstacle.top ? obstacle.y + obstacle.height - 74 : obstacle.y + 34;
        ctx.drawImage(assets[blink ? 'happyEyeLeftClosed' : 'happyEyeLeft'], obstacle.x + obstacle.width * .25, faceY, 27, blink ? 11 : 28);
        ctx.drawImage(assets[blink ? 'happyEyeRightClosed' : 'happyEyeRight'], obstacle.x + obstacle.width * .56, faceY, 27, blink ? 11 : 28);
        ctx.drawImage(assets[`happyMouth${1 + (Math.floor(obstacle.age * 6) % 3)}`], obstacle.x + obstacle.width * .39, faceY + 29, 30, 14);
    }

    function drawAdventureObstacle(o) {
        const image = assets[o.art];
        const scale = o.size / 512;
        const spot = BertAdventure.warningSpot(o);
        // Vulkanen: a meteor marks where it will land with a pulsing ring on the lava
        // (no guide lines, feedback); bombs bulge up out of the lava below.
        if (spot && o.warn > 0 && o.behaviour === 'meteor') {
            const cx = o.x + o.size / 2 - 60;
            const lavaTop = o.lavaTop ?? BertAdventure.GROUND;
            ctx.save();
            ctx.globalAlpha = 0.35 + 0.55 * o.warn * (0.6 + 0.4 * Math.sin(state.worldTime * 14));
            ctx.strokeStyle = '#ffb347';
            ctx.lineWidth = 5;
            ctx.beginPath(); ctx.ellipse(cx, lavaTop - 6, 34 + 10 * (1 - o.warn), 12, 0, 0, Math.PI * 2); ctx.stroke();
            ctx.beginPath(); ctx.ellipse(cx, lavaTop - 6, 16, 6, 0, 0, Math.PI * 2); ctx.stroke();
            ctx.restore();
        }
        if (spot && o.warn > 0 && (o.behaviour === 'column' || o.behaviour === 'bomb') && !o.fromTop && assets.volcVent?.naturalWidth && currentLevel.kind === 'volcano') {
            ctx.save();
            ctx.globalAlpha = Math.min(1, o.warn * 1.5);
            ctx.drawImage(assets.volcVent, spot.x - 110, spot.y - 22, 220, 55);
            ctx.restore();
        }
        if (spot && o.warn > 0) {
            // A calm, growing glow: never a flash, always before the hazard moves.
            ctx.save();
            const pulse = 0.55 + Math.sin(state.worldTime * 9) * 0.2;
            const gradient = ctx.createRadialGradient(spot.x, spot.y, 0, spot.x, spot.y, spot.radius * (0.7 + o.warn * 0.5));
            const color = BertAdventure.WARN_COLOR[o.theme] || '#ffffff';
            gradient.addColorStop(0, color);
            gradient.addColorStop(1, 'rgba(255,255,255,0)');
            ctx.globalAlpha = o.warn * pulse;
            ctx.fillStyle = gradient;
            ctx.beginPath();
            ctx.arc(spot.x, spot.y, spot.radius * (0.7 + o.warn * 0.5), 0, Math.PI * 2);
            ctx.fill();
            ctx.globalAlpha = Math.min(1, o.warn * 1.4);
            if (assets.v2Warning?.naturalWidth) {
                const size = 52 + o.warn * 10;
                ctx.drawImage(assets.v2Warning, spot.x - size / 2, spot.y - size / 2, size, size);
            } else {
                ctx.font = '900 34px "Bert Rounded", sans-serif';
                ctx.textAlign = 'center';
                ctx.lineWidth = 6;
                ctx.strokeStyle = 'rgba(20, 20, 30, .85)';
                ctx.fillStyle = '#fff';
                ctx.strokeText('!', spot.x, spot.y + 12);
                ctx.fillText('!', spot.x, spot.y + 12);
            }
            ctx.restore();
        }
        if (o.behaviour === 'stack') {
            drawContainerStack(o);
            return;
        }
        if (o.behaviour === 'flock' && assets.harGull1?.naturalWidth) {
            const frame = assets[`harGull${1 + (Math.floor(o.age * 10) % 3)}`];
            ctx.save();
            ctx.translate(o.x + o.size / 2, o.y + o.size / 2);
            ctx.rotate(o.angle);
            ctx.drawImage(frame, -o.size / 2, -o.size / 2, o.size, o.size);
            ctx.restore();
            return;
        }
        if (o.behaviour === 'kite') {
            if (!image?.naturalWidth) return;
            ctx.save();
            const s = o.size / 512;
            // The kite line runs down to the sea, drawn but harmless.
            ctx.strokeStyle = 'rgba(40, 40, 50, .7)';
            ctx.lineWidth = 2;
            {
                // The line leaves the kite where the art's string starts, follows its tilt,
                // and sags down to the sea behind it like a real kite line.
                const cx = o.x + o.size / 2;
                const cy = o.y + o.size / 2;
                const ax = (384 - 256) * s;
                const ay = (458 - 256) * s;
                const anchorX = cx + ax * Math.cos(o.angle) - ay * Math.sin(o.angle);
                const anchorY = cy + ax * Math.sin(o.angle) + ay * Math.cos(o.angle);
                const groundX = cx - 110;
                const groundY = BertAdventure.GROUND + 40;
                ctx.beginPath();
                ctx.moveTo(anchorX, anchorY);
                ctx.quadraticCurveTo(anchorX - 25, (anchorY + groundY) / 2 + 25, groundX, groundY);
                ctx.stroke();
            }
            ctx.translate(o.x + o.size / 2, o.y + o.size / 2);
            ctx.rotate(o.angle);
            ctx.drawImage(image, -o.size / 2, -o.size / 2, o.size, o.size);
            ctx.restore();
            return;
        }
        if (o.behaviour === 'flock') {
            if (!image?.naturalWidth) return;
            ctx.save();
            // Source art faces left already; small, quick wingbeat by squashing.
            ctx.translate(o.x + o.size / 2, o.y + o.size / 2);
            ctx.rotate(o.angle);
            ctx.scale(1, 0.85 + Math.abs(Math.sin(o.age * 12)) * 0.15);
            ctx.drawImage(image, -o.size / 2, -o.size / 2, o.size, o.size);
            ctx.restore();
            return;
        }
        if (o.behaviour === 'column') {
            if (o.palette === 'smoke') {
                const resting = o.fromTop ? o.topY <= o.lavaTop + 4 : o.topY >= o.lavaTop - 4;
                if (resting) {
                    const cx = o.x + o.size / 2;
                    ctx.save();
                    ctx.fillStyle = '#1b1f2e';
                    ctx.strokeStyle = '#7cf3ff';
                    ctx.lineWidth = 3;
                    drawCannonNozzle(o, cx);
                    ctx.restore();
                    return;
                }
            }
            drawLavaColumn(o);
            return;
        }
        if (o.behaviour === 'bomb' && o.phase === 'warn') {
            // Warning you can actually see: the bomb bulges up out of the lava, glowing.
            const art = assets.volcBomb?.naturalWidth ? assets.volcBomb : image;
            const lavaTop = o.lavaTop ?? BertAdventure.GROUND;
            const rise = o.size * (0.15 + 0.45 * o.warn);
            ctx.save();
            const glow = ctx.createRadialGradient(o.x + o.size / 2, lavaTop, 4, o.x + o.size / 2, lavaTop, o.size * 0.9);
            glow.addColorStop(0, `rgba(255, 200, 80, ${0.75 * o.warn})`);
            glow.addColorStop(1, 'rgba(255, 120, 30, 0)');
            ctx.fillStyle = glow;
            ctx.fillRect(o.x - o.size * 0.4, lavaTop - o.size, o.size * 1.8, o.size * 1.4);
            ctx.translate(o.x + o.size / 2, lavaTop - rise + o.size * 0.5 + Math.sin(state.worldTime * 30) * 2 * o.warn);
            if (art?.naturalWidth) ctx.drawImage(art, -o.size / 2, -o.size / 2, o.size, o.size);
            ctx.restore();
            return;
        }
        if (o.behaviour === 'bomb' || o.behaviour === 'meteor') {
            if (o.phase !== 'fly') return;
            ctx.save();
            if (assets.volcSmoke?.naturalWidth) {
                ctx.globalAlpha = 0.75;
                const trailX = o.x + o.size * 0.75;
                const trailY = o.behaviour === 'meteor' ? o.y - o.size * 0.35 : o.y + o.size * (o.vy > 0 ? 0.1 : 0.7);
                ctx.drawImage(assets.volcSmoke, trailX - o.size * 0.2, trailY - o.size * 0.35, o.size * 0.95, o.size * 0.95);
                ctx.globalAlpha = 1;
                ctx.translate(o.x + o.size / 2, o.y + o.size / 2);
                ctx.rotate(o.angle);
                const bombArt = assets.volcBomb?.naturalWidth ? assets.volcBomb : image;
                if (bombArt?.naturalWidth) ctx.drawImage(bombArt, -o.size / 2, -o.size / 2, o.size, o.size);
                ctx.restore();
                return;
            }
            // Smoke trail behind the bomb, then the bomb itself.
            for (let i = 1; i <= 4; i += 1) {
                ctx.globalAlpha = 0.18 * (5 - i) / 4;
                ctx.fillStyle = '#4a3a3a';
                ctx.beginPath();
                ctx.arc(o.x + o.size / 2 + i * 16, o.y + o.size / 2 + i * (o.vy > 0 ? -14 : 14), o.size * (0.18 + i * 0.04), 0, Math.PI * 2);
                ctx.fill();
            }
            ctx.globalAlpha = 1;
            ctx.translate(o.x + o.size / 2, o.y + o.size / 2);
            ctx.rotate(o.angle);
            if (image?.naturalWidth) ctx.drawImage(image, -o.size / 2, -o.size / 2, o.size, o.size);
            ctx.restore();
            return;
        }
        if (!image?.naturalWidth) return;
        ctx.save();
        if (o.clipGround) {
            ctx.beginPath();
            ctx.rect(-200, -400, VIEW.width + 400, BertAdventure.GROUND + 400);
            ctx.clip();
        }
        if (o.behaviour === 'swing') {
            const top = BertAdventure.TYPES[o.type].bbox[1] * scale;
            ctx.translate(o.pivotX, o.pivotY);
            ctx.rotate(o.angle);
            ctx.strokeStyle = 'rgba(40, 44, 52, 0.92)';
            ctx.lineWidth = 5;
            ctx.beginPath();
            const chains = BertAdventure.CHAIN_X[o.type];
            if (chains) {
                ctx.moveTo(0, 0); ctx.lineTo(-o.pivotOffset + chains[0] * scale, o.length);
                ctx.moveTo(0, 0); ctx.lineTo(-o.pivotOffset + chains[1] * scale, o.length);
                ctx.stroke();
            } else {
                // Crane hook: a thick braided steel cable that continues the one in the art,
                // instead of a thin line that looked like a cut rope.
                const cable = (width, color) => {
                    ctx.strokeStyle = color;
                    ctx.lineWidth = width;
                    ctx.beginPath();
                    ctx.moveTo(0, 0); ctx.lineTo(0, o.length + 12);
                    ctx.stroke();
                };
                cable(Math.max(9, o.size * 0.045), '#1e2733');
                cable(Math.max(5, o.size * 0.026), '#56606e');
                ctx.save();
                ctx.strokeStyle = 'rgba(20, 26, 34, .8)';
                ctx.lineWidth = 2;
                for (let y = 8; y < o.length + 6; y += 9) {
                    ctx.beginPath(); ctx.moveTo(-4, y); ctx.lineTo(4, y + 5); ctx.stroke();
                }
                ctx.restore();
            }

            ctx.drawImage(image, -o.pivotOffset, o.length - top, o.size, o.size);
        } else if (o.behaviour === 'spin') {
            const hubX = o.x + o.hubAx * scale;
            const hubY = o.y + o.hubAy * scale;
            // Tower: drawn in the same place as its lethal segment.
            const towerGradient = ctx.createLinearGradient(hubX - 9, 0, hubX + 9, 0);
            towerGradient.addColorStop(0, '#c9d3dc');
            towerGradient.addColorStop(0.5, '#ffffff');
            towerGradient.addColorStop(1, '#aab6c1');
            ctx.fillStyle = towerGradient;
            ctx.beginPath();
            ctx.moveTo(hubX - 7, hubY + 20);
            ctx.lineTo(hubX + 7, hubY + 20);
            ctx.lineTo(hubX + 13, BertAdventure.GROUND + 40);
            ctx.lineTo(hubX - 13, BertAdventure.GROUND + 40);
            ctx.closePath();
            ctx.fill();
            if (assets.windNacelle?.naturalWidth) {
                ctx.drawImage(assets.windNacelle, hubX - 18, hubY - 26, 104, 52);
            }
            ctx.translate(hubX, hubY);
            ctx.rotate(o.angle);
            ctx.drawImage(image, -o.hubAx * scale, -o.hubAy * scale, o.size, o.size);
        } else if (o.type === 'cable-lamps') {
            const s = o.size / 512;
            ctx.strokeStyle = 'rgba(30, 34, 50, .9)';
            ctx.lineWidth = 4;
            ctx.beginPath();
            ctx.moveTo(o.x + 64 * s, -10); ctx.lineTo(o.x + 64 * s, o.y + 205 * s);
            ctx.moveTo(o.x + 448 * s, -10); ctx.lineTo(o.x + 448 * s, o.y + 205 * s);
            ctx.stroke();
            ctx.drawImage(image, o.x, o.y, o.size, o.size);
        } else if (o.angle) {
            ctx.translate(o.x + o.size / 2, o.y + o.size / 2);
            ctx.rotate(o.angle);
            ctx.drawImage(image, -o.size / 2, -o.size / 2, o.size, o.size);
        } else {
            ctx.drawImage(image, o.x, o.y, o.size, o.size);
        }
        ctx.restore();
    }

    function drawLavaColumn(o) {
        if (o.fromTop ? o.topY <= o.lavaTop + 4 : o.topY >= o.lavaTop - 4) return;
        if (o.palette === 'smoke') {
            drawSmokeJet(o);
            return;
        }
        const columnArt = assets[Math.floor(state.worldTime * 8) % 2 ? 'volcColumn2' : 'volcColumn1'];
        if (columnArt?.naturalWidth) {
            // Source column content: x 23–233, y 190–833 of the 256×1024 art.
            const cx = o.x + o.size / 2;
            const drawWidth = o.columnWidth * 1.45;
            const top = o.topY - o.columnWidth * 0.25;
            const bottom = o.lavaTop + 30;
            ctx.save();
            ctx.drawImage(columnArt, 23, 190, 210, 643, cx - drawWidth / 2, top, drawWidth, bottom - top);
            ctx.restore();
            return;
        }
        const cx = o.x + o.size / 2;
        const w = o.columnWidth;
        const top = o.topY;
        const bottom = o.lavaTop + 30;
        ctx.save();
        const glow = ctx.createLinearGradient(cx - w, 0, cx + w, 0);
        glow.addColorStop(0, 'rgba(255, 90, 20, 0)');
        glow.addColorStop(0.5, 'rgba(255, 140, 40, .45)');
        glow.addColorStop(1, 'rgba(255, 90, 20, 0)');
        ctx.fillStyle = glow;
        ctx.fillRect(cx - w, top, w * 2, bottom - top);
        const body = ctx.createLinearGradient(cx - w / 2, 0, cx + w / 2, 0);
        body.addColorStop(0, '#b3260c');
        body.addColorStop(0.35, '#ff7a1a');
        body.addColorStop(0.5, '#ffe36b');
        body.addColorStop(0.65, '#ff7a1a');
        body.addColorStop(1, '#b3260c');
        ctx.fillStyle = body;
        ctx.strokeStyle = '#3a1205';
        ctx.lineWidth = 4;
        ctx.beginPath();
        ctx.moveTo(cx - w * 0.42, bottom);
        ctx.lineTo(cx - w * 0.42, top + w * 0.35);
        ctx.arc(cx, top + w * 0.35, w * 0.45, Math.PI, 0);
        ctx.lineTo(cx + w * 0.42, bottom);
        ctx.closePath();
        ctx.fill();
        ctx.stroke();
        // Droplets around the crown so the top reads as a splashing peak.
        ctx.fillStyle = '#ffb347';
        for (let i = 0; i < 5; i += 1) {
            const angle = state.worldTime * 3 + i * 1.3;
            ctx.beginPath();
            ctx.arc(cx + Math.cos(angle) * w * 0.7, top + Math.sin(angle * 1.3) * 10 - 6, 6 + (i % 2) * 3, 0, Math.PI * 2);
            ctx.fill();
        }
        ctx.restore();
    }

    const CONTAINER_COLORS = [['#c8402f', '#8e2519'], ['#2f6fc8', '#1c4485'], ['#3a9a4f', '#226433']];
    function drawContainerStack(o) {
        const edge = o.gapTop + o.offset;
        const h = 104;
        ctx.save();
        const containerArt = (index) => assets[`harContainer${index}`];
        if (containerArt(0)?.naturalWidth) {
            // Container content: x 39–473, y 62–193 of the 512×256 art.
            const boxHeight = (o.width - 8) * 131 / 434;
            const art = (y, colorIndex) => ctx.drawImage(containerArt(colorIndex), 39, 62, 434, 131, o.x + 4, y, o.width - 8, boxHeight);
            if (o.stackTop) {
                let index = 0;
                for (let y = edge - boxHeight; y > -boxHeight; y -= boxHeight - 2) art(y, o.colors[index++ % o.colors.length]);
            } else {
                let index = 0;
                for (let y = edge + o.gap; y < VIEW.height + boxHeight; y += boxHeight - 2) art(y, o.colors[index++ % o.colors.length]);
                if (o.phase !== 'done' && assets.harLamp?.naturalWidth) {
                    const on = (o.phase === 'warn' || o.phase === 'move') && Math.sin(state.worldTime * 22) > 0;
                    ctx.globalAlpha = on ? 1 : 0.55;
                    ctx.drawImage(assets.harLamp, o.x + o.width - 54, edge + o.gap - 44, 44, 44);
                    ctx.globalAlpha = 1;
                }
            }
            ctx.restore();
            return;
        }
        const drawBox = (y, colorIndex) => {
            const [main, dark] = CONTAINER_COLORS[colorIndex];
            ctx.fillStyle = main;
            ctx.strokeStyle = '#1b2230';
            ctx.lineWidth = 4;
            ctx.fillRect(o.x + 6, y, o.width - 12, h - 4);
            ctx.strokeRect(o.x + 6, y, o.width - 12, h - 4);
            ctx.strokeStyle = dark;
            ctx.lineWidth = 5;
            for (let rib = o.x + 26; rib < o.x + o.width - 20; rib += 20) {
                ctx.beginPath(); ctx.moveTo(rib, y + 10); ctx.lineTo(rib, y + h - 14); ctx.stroke();
            }
        };
        if (o.stackTop) {
            let index = 0;
            for (let y = edge - h; y > -h; y -= h) drawBox(y, o.colors[index++ % o.colors.length]);
            // Crane cable above the hanging stack.
            ctx.strokeStyle = 'rgba(30, 34, 44, .9)';
            ctx.lineWidth = 4;
            ctx.beginPath(); ctx.moveTo(o.x + o.width / 2, -10); ctx.lineTo(o.x + o.width / 2, 0); ctx.stroke();
        } else {
            let index = 0;
            for (let y = edge + o.gap; y < VIEW.height + h; y += h) drawBox(y, o.colors[index++ % o.colors.length]);
        }
        // The warning beacon blinks on the bottom stack's top corner.
        if (!o.stackTop && o.phase !== 'done') {
            const on = o.phase === 'warn' || o.phase === 'move' ? Math.sin(state.worldTime * 22) > 0 : false;
            ctx.fillStyle = on ? '#ffb02e' : '#7a5a2a';
            ctx.strokeStyle = '#1b2230';
            ctx.lineWidth = 3;
            ctx.beginPath();
            ctx.arc(o.x + o.width - 26, edge + o.gap - 12, 11, 0, Math.PI * 2);
            ctx.fill(); ctx.stroke();
            if (on) {
                ctx.globalAlpha = 0.35;
                ctx.beginPath(); ctx.arc(o.x + o.width - 26, edge + o.gap - 12, 30, 0, Math.PI * 2); ctx.fill();
            }
        }
        ctx.restore();
    }

    // Neon Encore: a blast pushes Bert out of the jet and leaves drifting fog
    // that hides what is behind it for a few seconds. Smoke never kills.
    function blowSmoke(o, delta) {
        const cx = o.x + o.size / 2;
        const top = Math.min(o.lavaTop, o.topY);
        const bottom = Math.max(o.lavaTop, o.topY);
        const centerX = bird.x + BIRD.width / 2;
        const centerY = bird.y + BIRD.height / 2;
        if (state.phase === 'playing' && Math.abs(centerX - cx) < o.columnWidth * 0.95 && centerY > top - 30 && centerY < bottom + 30) {
            const dir = o.fromTop ? 1 : -1;
            bird.velocity = clamp(bird.velocity + dir * 2600 * delta, -820, 820);
        }
        o.fogTimer = (o.fogTimer || 0) - delta;
        if (o.fogTimer <= 0) {
            o.fogTimer = 0.06;
            // Two puffs per tick: one at the tip, one along the jet, spreading wide.
            const along = randomBetween(0.2, 1);
            [o.topY, o.lavaTop + (o.topY - o.lavaTop) * along].forEach((y) => state.smokeFog.push({
                x: cx + randomBetween(-o.columnWidth * 1.3, o.columnWidth * 1.3),
                y: y + randomBetween(-40, 40), r: randomBetween(70, 110),
                vx: randomBetween(-190, 190), vy: randomBetween(-35, 35), age: 0 }));
        }
    }

    function updateSmokeFog(delta, scroll) {
        if (!state.smokeFog?.length) return;
        state.smokeFog.forEach((puff) => {
            puff.age += delta;
            puff.x += puff.vx * delta - scroll;
            puff.y += puff.vy * delta;
            puff.vx *= 0.985;
            puff.r += 55 * delta;
        });
        state.smokeFog = state.smokeFog.filter((puff) => puff.age < 4 && puff.x + puff.r > -100);
        if (state.smokeFog.length > 90) state.smokeFog.splice(0, state.smokeFog.length - 90);
    }

    // One soft puff is rendered once and reused; per-puff gradients stalled phones.
    let fogSprite = null;
    // Short art effects: a sparkle where a star was taken, feathers where Bert hit something.
    function drawArtEffects(delta) {
        ctx.save();
        (state.sparkles || []).forEach((fx) => {
            fx.age += delta;
            const t = fx.age / 0.45;
            if (!assets.v2Sparkle?.naturalWidth || t >= 1) return;
            const size = 26 + t * 30;
            ctx.globalAlpha = 1 - t;
            ctx.drawImage(assets.g4StarPop?.naturalWidth ? assets.g4StarPop : assets.v2Sparkle, fx.x - size / 2, fx.y - size / 2, size, size);
        });
        state.sparkles = (state.sparkles || []).filter((fx) => fx.age < 0.45);
        (state.bonks || []).forEach((fx) => {
            fx.age += delta;
            const t = fx.age / 0.5;
            if (!assets.v2Bonk?.naturalWidth || t >= 1) return;
            const size = 70 + t * 40;
            ctx.globalAlpha = 1 - t;
            ctx.drawImage(assets.v2Bonk, fx.x - size / 2, fx.y - size / 2, size, size);
        });
        state.bonks = (state.bonks || []).filter((fx) => fx.age < 0.5);
        if (state.featherPuff && assets.v2FeatherPuff?.naturalWidth) {
            state.featherPuff.age += delta;
            const t = state.featherPuff.age / 0.7;
            if (t < 1) {
                const size = 90 + t * 110;
                ctx.globalAlpha = 1 - t;
                ctx.drawImage(assets.v2FeatherPuff, state.featherPuff.x - size / 2, state.featherPuff.y - size / 2, size, size);
            } else state.featherPuff = null;
        }
        ctx.restore();
    }

    function drawSmokeFog() {
        if (!state.smokeFog?.length) return;
        // Fog belongs to the run; it never hangs over the result screen or menus.
        if (!['prewarm', 'playing', 'dead'].includes(state.phase)) { state.smokeFog = []; return; }
        if (!fogSprite) {
            fogSprite = document.createElement('canvas');
            fogSprite.width = fogSprite.height = 128;
            const g = fogSprite.getContext('2d');
            const gradient = g.createRadialGradient(64, 64, 8, 64, 64, 64);
            gradient.addColorStop(0, 'rgba(240, 248, 255, 0.85)');
            gradient.addColorStop(1, 'rgba(210, 230, 255, 0)');
            g.fillStyle = gradient;
            g.fillRect(0, 0, 128, 128);
        }
        ctx.save();
        state.smokeFog.forEach((puff, index) => {
            ctx.globalAlpha = puff.age < 0.4 ? puff.age / 0.4 : Math.max(0, 1 - (puff.age - 0.4) / 3.6);
            const art = assets[`v2Smoke${index % 3}`];
            if (art?.naturalWidth) ctx.drawImage(art, puff.x - puff.r, puff.y - puff.r, puff.r * 2, puff.r * 2);
            else ctx.drawImage(fogSprite, puff.x - puff.r, puff.y - puff.r, puff.r * 2, puff.r * 2);
        });
        ctx.restore();
    }

    // Neon Encore: CO2/smoke cannons fire a white jet from the floor or ceiling.
    function drawSmokeJet(o) {
        const cx = o.x + o.size / 2;
        const w = o.columnWidth;
        const tip = o.topY;
        const base = o.fromTop ? -20 : o.lavaTop + 20;
        const dir = o.fromTop ? 1 : -1;
        ctx.save();
        const length = Math.abs(tip - base);
        for (let i = 0; i < 9; i += 1) {
            const f = i / 8;
            const y = base + dir * length * f;
            const r = w * (0.35 + f * 0.45) + Math.sin(state.worldTime * 9 + i) * 4;
            ctx.globalAlpha = 0.55 + 0.35 * f;
            const puff = ctx.createRadialGradient(cx, y, r * 0.2, cx, y, r);
            puff.addColorStop(0, 'rgba(255,255,255,1)');
            puff.addColorStop(1, 'rgba(200,230,255,0)');
            ctx.fillStyle = puff;
            ctx.beginPath();
            ctx.arc(cx, y, r, 0, Math.PI * 2);
            ctx.fill();
        }
        ctx.globalAlpha = 0.95;
        ctx.fillStyle = 'rgba(245, 252, 255, .92)';
        ctx.fillRect(cx - w * 0.3, Math.min(base, tip), w * 0.6, length);
        // The cannon nozzle itself.
        ctx.globalAlpha = 1;
        ctx.fillStyle = '#1b1f2e';
        ctx.strokeStyle = '#7cf3ff';
        ctx.lineWidth = 3;
        drawCannonNozzle(o, cx);
        ctx.restore();
    }

    function drawCannonNozzle(o, cx) {
        const art = assets.v2SmokeCannon;
        if (art?.naturalWidth) {
            const width = 54;
            const height = width * art.naturalHeight / art.naturalWidth;
            ctx.save();
            if (o.fromTop) {
                ctx.translate(cx, 0);
                ctx.scale(1, -1);
                ctx.drawImage(art, -width / 2, -height + 6, width, height);
            } else {
                ctx.drawImage(art, cx - width / 2, o.lavaTop - height + 6, width, height);
            }
            ctx.restore();
            return;
        }
        const ny = o.fromTop ? 0 : o.lavaTop - 34;
        ctx.fillRect(cx - 26, ny, 52, 34);
        ctx.strokeRect(cx - 26, ny, 52, 34);
    }

    // Vulkanen: the lava floor rises; cooling stones push it back down.
    const LAVA_START = 770;
    const LAVA_HIGHEST = 440;
    function updateVolcanoLava(delta) {
        if (currentLevel.kind !== 'volcano' || state.phase !== 'playing') return;
        if (state.elapsed > 3) {
            const rate = 5 + state.difficulty * 6;
            state.lavaTop = Math.max(LAVA_HIGHEST, state.lavaTop - rate * delta);
        }
        if (state.elapsed >= state.nextCoolingAt) {
            const y = randomBetween(170, Math.max(220, state.lavaTop - 130));
            collectibles.push({ x: VIEW.width + 140, y, width: 74, height: 74, kind: 'cool', spin: 0, age: 0, collected: false });
            state.nextCoolingAt = state.elapsed + 9 + gameRandom() * 5;
        }
        // Hiding at the top for long brings a meteor aimed at Bert (feedback 4. okt.).
        const topCenter = bird.y + BIRD.height / 2;
        state.topCampTime = topCenter < 190 ? (state.topCampTime || 0) + delta : 0;
        if (state.topCampTime > 1.8 && state.elapsed >= (state.nextTopMeteorAt || 0)) {
            const meteor = BertAdventure.meteorAt('volcano', state.obstacleId++, bird.x + 520, state.difficulty, gameRandom);
            meteor.kind = 'adventure';
            obstacles.push(meteor);
            state.nextTopMeteorAt = state.elapsed + 2.6;
            state.topCampTime = 0.9;
        }
        const collider = BertCollision.bertCollider(bird, BIRD);
        if (!DEBUG_NOCLIP && state.elapsed >= state.invulnerableUntil && collider.y + collider.radius * 0.6 > state.lavaTop + 8) {
            triggerDeath({ kind: 'lava-floor', id: -1, x: 0, y: state.lavaTop, width: VIEW.width, height: 100 });
        }
    }

    function updateIceAndWind(delta) {
        if (state.phase !== 'playing') return;
        if (currentLevel.kind === 'iceberg' && state.elapsed >= state.nextCrystalAt) {
            const y = randomBetween(170, 560);
            collectibles.push({ x: VIEW.width + 140, y, width: 70, height: 70, kind: 'crystal', spin: 0, age: 0, collected: false });
            state.nextCrystalAt = state.elapsed + 11 + gameRandom() * 6;
        }
        if (currentLevel.kind !== 'windfarm') return;
        const gust = state.gust;
        if (!gust) {
            if (state.elapsed >= state.nextGustAt) {
                state.gust = { phase: 'warn', timer: 0, dir: gameRandom() < 0.5 ? -1 : 1,
                    force: clamp(900 + state.difficulty * 250, 900, 1500), length: clamp(1.4 + state.difficulty * 0.3, 1.4, 2.4) };
            }
            return;
        }
        gust.timer += delta;
        if (gust.phase === 'warn' && gust.timer >= 1.2) { gust.phase = 'blow'; gust.timer = 0; playAudio('wind'); }
        else if (gust.phase === 'blow' && gust.timer >= gust.length) {
            state.gust = null;
            state.nextGustAt = state.elapsed + clamp(7.5 - state.difficulty * 1.2, 3.5, 7.5) + gameRandom() * 2.5;
        }
    }

    function drawWindGust() {
        const gust = state.gust;
        if (currentLevel.kind !== 'windfarm' || !gust || !['playing', 'prewarm'].includes(state.phase)) return;
        const warn = gust.phase === 'warn';
        const arrowArt = assets[gust.dir < 0 ? 'windArrowUp' : 'windArrowDown'];
        if (arrowArt?.naturalWidth) {
            ctx.save();
            ctx.globalAlpha = warn ? 0.45 + 0.4 * Math.abs(Math.sin(state.worldTime * 8)) : 0.85;
            const travel = (state.worldTime * (warn ? 90 : 420)) % 340;
            for (let row = 0; row < 3; row += 1) {
                for (let col = -1; col < Math.ceil(VIEW.width / 340) + 1; col += 1) {
                    const x = col * 340 + (row % 2) * 170 - travel;
                    const y = 120 + row * 170;
                    ctx.drawImage(arrowArt, x, y, 220, 110);
                }
            }
            if (!warn && assets.windStreak?.naturalWidth) {
                ctx.globalAlpha = 0.7;
                ctx.drawImage(assets.windStreak, bird.x - 70, bird.y + BIRD.height * 0.2, 110, 110);
            }
            ctx.restore();
            return;
        }
        ctx.save();
        ctx.globalAlpha = warn ? 0.35 + 0.35 * Math.abs(Math.sin(state.worldTime * 8)) : 0.75;
        ctx.strokeStyle = '#ffffff';
        ctx.fillStyle = '#ffffff';
        ctx.lineWidth = warn ? 8 : 6;
        ctx.lineCap = 'round';
        const travel = (state.worldTime * (warn ? 120 : 520)) % 260;
        for (let row = 0; row < 4; row += 1) {
            for (let col = -1; col < Math.ceil(VIEW.width / 320) + 1; col += 1) {
                const x = col * 320 + (row % 2) * 160;
                const y = 140 + row * 140 + (gust.dir > 0 ? travel : -travel) % 140;
                ctx.beginPath();
                ctx.moveTo(x, y);
                ctx.quadraticCurveTo(x + 60, y + gust.dir * 30, x + 110, y + gust.dir * 70);
                ctx.stroke();
                // Arrow head shows which way the wind will push.
                ctx.beginPath();
                ctx.moveTo(x + 110, y + gust.dir * 70);
                ctx.lineTo(x + 86, y + gust.dir * 52);
                ctx.lineTo(x + 116, y + gust.dir * 44);
                ctx.closePath();
                ctx.fill();
            }
        }
        ctx.restore();
    }

    function drawFrostCrystal(collectible) {
        if (assets.iceCrystal?.naturalWidth) {
            ctx.save();
            ctx.translate(collectible.x, collectible.y);
            const glow = ctx.createRadialGradient(0, 0, 4, 0, 0, 52);
            glow.addColorStop(0, 'rgba(190, 250, 255, .85)');
            glow.addColorStop(1, 'rgba(190, 250, 255, 0)');
            ctx.fillStyle = glow;
            ctx.beginPath(); ctx.arc(0, 0, 52, 0, Math.PI * 2); ctx.fill();
            ctx.rotate(collectible.spin * 0.3);
            ctx.drawImage(assets.iceCrystal, -38, -38, 76, 76);
            ctx.restore();
            return;
        }
        ctx.save();
        ctx.translate(collectible.x, collectible.y);
        const glow = ctx.createRadialGradient(0, 0, 4, 0, 0, 50);
        glow.addColorStop(0, 'rgba(190, 250, 255, .9)');
        glow.addColorStop(1, 'rgba(190, 250, 255, 0)');
        ctx.fillStyle = glow;
        ctx.beginPath();
        ctx.arc(0, 0, 50, 0, Math.PI * 2);
        ctx.fill();
        ctx.rotate(collectible.spin * 0.4);
        ctx.strokeStyle = '#1b4f6b';
        ctx.lineWidth = 9;
        ctx.lineCap = 'round';
        for (let i = 0; i < 3; i += 1) {
            const a = i * Math.PI / 3;
            ctx.beginPath(); ctx.moveTo(Math.cos(a) * -26, Math.sin(a) * -26); ctx.lineTo(Math.cos(a) * 26, Math.sin(a) * 26); ctx.stroke();
        }
        ctx.strokeStyle = '#d9fbff';
        ctx.lineWidth = 5;
        for (let i = 0; i < 3; i += 1) {
            const a = i * Math.PI / 3;
            ctx.beginPath(); ctx.moveTo(Math.cos(a) * -24, Math.sin(a) * -24); ctx.lineTo(Math.cos(a) * 24, Math.sin(a) * 24); ctx.stroke();
        }
        ctx.restore();
    }

    function drawLavaFloor() {
        if (currentLevel.kind !== 'volcano' || !['prewarm', 'playing', 'dead'].includes(state.phase)) return;
        const top = state.lavaTop;
        if (top >= VIEW.height + 20) return;
        const surface = assets[Math.floor(state.worldTime * 4) % 2 ? 'volcSurface2' : 'volcSurface1'];
        if (surface?.naturalWidth) {
            // The surface art's glowing edge starts 70 px down; below it, solid deep lava.
            ctx.save();
            ctx.fillStyle = '#7a1606';
            ctx.fillRect(0, top + 120, VIEW.width, VIEW.height - top);
            const offset = (state.worldDistance * 0.9) % 1280;
            for (let x = -offset; x < VIEW.width; x += 1280) ctx.drawImage(surface, x, top - 70, 1280, 200);
            ctx.restore();
            return;
        }
        ctx.save();
        const gradient = ctx.createLinearGradient(0, top - 10, 0, VIEW.height);
        gradient.addColorStop(0, '#ffe36b');
        gradient.addColorStop(0.08, '#ff8a1f');
        gradient.addColorStop(0.5, '#d6380f');
        gradient.addColorStop(1, '#6e1406');
        ctx.fillStyle = gradient;
        ctx.beginPath();
        ctx.moveTo(0, VIEW.height);
        for (let x = 0; x <= VIEW.width + 20; x += 20) {
            const wave = Math.sin((x + state.worldDistance * 0.6) / 70 + state.worldTime * 2) * 7
                + Math.sin((x + state.worldDistance) / 31 + state.worldTime * 3.1) * 3;
            ctx.lineTo(x, top + wave);
        }
        ctx.lineTo(VIEW.width, VIEW.height);
        ctx.closePath();
        ctx.fill();
        ctx.strokeStyle = 'rgba(255, 245, 190, .9)';
        ctx.lineWidth = 3;
        ctx.stroke();
        ctx.restore();
    }

    function drawCoolingStone(collectible) {
        if (assets.volcCooling?.naturalWidth) {
            ctx.save();
            ctx.translate(collectible.x, collectible.y);
            const glow = ctx.createRadialGradient(0, 0, 4, 0, 0, 54);
            glow.addColorStop(0, 'rgba(160, 240, 255, .7)');
            glow.addColorStop(1, 'rgba(160, 240, 255, 0)');
            ctx.fillStyle = glow;
            ctx.beginPath(); ctx.arc(0, 0, 54, 0, Math.PI * 2); ctx.fill();
            ctx.rotate(Math.sin(collectible.spin) * 0.25);
            ctx.drawImage(assets.volcCooling, -40, -40, 80, 80);
            ctx.restore();
            return;
        }
        ctx.save();
        ctx.translate(collectible.x, collectible.y);
        const glow = ctx.createRadialGradient(0, 0, 4, 0, 0, 52);
        glow.addColorStop(0, 'rgba(160, 240, 255, .8)');
        glow.addColorStop(1, 'rgba(160, 240, 255, 0)');
        ctx.fillStyle = glow;
        ctx.beginPath();
        ctx.arc(0, 0, 52, 0, Math.PI * 2);
        ctx.fill();
        ctx.rotate(Math.sin(collectible.spin) * 0.3);
        ctx.fillStyle = '#7f95a8';
        ctx.strokeStyle = '#1d2c3a';
        ctx.lineWidth = 4;
        ctx.beginPath();
        ctx.moveTo(-26, 6); ctx.lineTo(-14, -22); ctx.lineTo(12, -26); ctx.lineTo(28, -4); ctx.lineTo(18, 22); ctx.lineTo(-16, 24);
        ctx.closePath();
        ctx.fill();
        ctx.stroke();
        ctx.strokeStyle = '#e8fbff';
        ctx.lineWidth = 3;
        for (let i = 0; i < 3; i += 1) {
            ctx.beginPath();
            ctx.moveTo(Math.cos(i * Math.PI / 3) * -11, Math.sin(i * Math.PI / 3) * -11);
            ctx.lineTo(Math.cos(i * Math.PI / 3) * 11, Math.sin(i * Math.PI / 3) * 11);
            ctx.stroke();
        }
        ctx.restore();
    }

    // Nattebyen: darkness away from Bert. Hazards have glowing rims and stay readable.
    // Nattebyen: the light around Bert is a resource. It drains slowly and
    // lanterns fill it up. Hazards keep a faint glowing outline in the dark.
    function updateNightLight(delta) {
        if (currentLevel.kind !== 'nightcity' || state.phase !== 'playing') return;
        state.light = Math.max(0, state.light - delta * clamp(0.028 + state.difficulty * 0.008, 0.028, 0.05));
        if (state.elapsed >= state.nextLanternAt) {
            collectibles.push({ x: VIEW.width + 140, y: randomBetween(160, 560), width: 70, height: 70, kind: 'lantern', spin: 0, age: 0, collected: false });
            state.nextLanternAt = state.elapsed + 6 + gameRandom() * 4;
        }
    }

    function drawNightDarkness() {
        if (currentLevel.kind !== 'nightcity' || !['prewarm', 'playing', 'dead'].includes(state.phase)) return;
        const centerX = bird.x + BIRD.width / 2;
        const centerY = bird.y + BIRD.height / 2;
        const light = state.light ?? 1;
        const inner = lerp(110, 260, light);
        const outer = lerp(330, 700, light);
        const strength = lerp(0.86, 0.5, light);
        const gradient = ctx.createRadialGradient(centerX, centerY, inner, centerX, centerY, outer);
        gradient.addColorStop(0, 'rgba(4, 6, 24, 0)');
        gradient.addColorStop(1, `rgba(4, 6, 24, ${strength})`);
        ctx.save();
        ctx.fillStyle = gradient;
        ctx.fillRect(0, 0, VIEW.width, VIEW.height);
        // Hazard rims were removed (feedback: they read as stray outlines on the art).
        // Lanterns glow through the dark too.
        collectibles.filter((item) => item.kind === 'lantern').forEach(drawLantern);
        // Light meter under the pause button.
        ctx.fillStyle = 'rgba(8, 16, 30, .75)';
        ctx.fillRect(24, 112, 168, 18);
        ctx.fillStyle = light > 0.3 ? '#ffd56b' : '#ff8a4a';
        ctx.fillRect(27, 115, 162 * light, 12);
        ctx.restore();
    }

    function drawLantern(collectible) {
        const lanternArt = assets[Math.floor(state.worldTime * 6) % 2 ? 'nightLantern2' : 'nightLantern1'];
        if (lanternArt?.naturalWidth) {
            ctx.save();
            ctx.translate(collectible.x, collectible.y + Math.sin(collectible.spin) * 4);
            const glow = ctx.createRadialGradient(0, 0, 6, 0, 0, 70);
            glow.addColorStop(0, 'rgba(255, 220, 120, .9)');
            glow.addColorStop(1, 'rgba(255, 200, 90, 0)');
            ctx.fillStyle = glow;
            ctx.beginPath(); ctx.arc(0, 0, 70, 0, Math.PI * 2); ctx.fill();
            ctx.drawImage(lanternArt, -36, -38, 72, 76);
            ctx.restore();
            return;
        }
        ctx.save();
        ctx.translate(collectible.x, collectible.y + Math.sin(collectible.spin) * 4);
        const glow = ctx.createRadialGradient(0, 0, 6, 0, 0, 64);
        glow.addColorStop(0, 'rgba(255, 220, 120, .95)');
        glow.addColorStop(1, 'rgba(255, 200, 90, 0)');
        ctx.fillStyle = glow;
        ctx.beginPath(); ctx.arc(0, 0, 64, 0, Math.PI * 2); ctx.fill();
        ctx.fillStyle = '#ffcf5a';
        ctx.strokeStyle = '#3a2410';
        ctx.lineWidth = 4;
        ctx.beginPath();
        ctx.ellipse(0, 0, 20, 26, 0, 0, Math.PI * 2);
        ctx.fill(); ctx.stroke();
        ctx.strokeStyle = '#c4572a';
        ctx.lineWidth = 3;
        ctx.beginPath(); ctx.moveTo(-20, -6); ctx.lineTo(20, -6); ctx.moveTo(-20, 8); ctx.lineTo(20, 8); ctx.stroke();
        ctx.fillStyle = '#3a2410';
        ctx.fillRect(-9, -32, 18, 7);
        ctx.fillRect(-9, 25, 18, 7);
        ctx.restore();
    }

    function drawObstacle(obstacle) {
        if (obstacle.kind === 'target') { drawTarget(obstacle); return; }
        if (obstacle.kind === 'poop-hazard') { drawPoopHazard(obstacle); return; }
        if (obstacle.kind === 'adventure') {
            if (!(state.phase === 'dead' && obstacle.id === state.deathObstacleId && obstacle.type === state.deathObstacleType)) drawAdventureObstacle(obstacle);
            return;
        }
        ctx.save();
        if (state.phase === 'dead' && obstacle.id === state.deathObstacleId && obstacle.kind !== 'jungle-web') {
            ctx.restore();
            return;
        }
        if (obstacle.kind === 'jungle-web') {
            drawSpiderWeb(obstacle);
            ctx.restore();
            return;
        }
        if (obstacle.kind === 'bird-run-bird') {
            const birdArt = assets[obstacle.artKey || 'birdRunBird'];
            if (!obstacle.warningRemaining && (obstacle.heroId || birdArt?.naturalWidth)) {
                // Selectable heroes face right; traffic from the front faces left.
                const mirrored = obstacle.heroId
                    ? obstacle.direction === 'front' : obstacle.direction === 'rear';
                if (mirrored) {
                    ctx.translate(obstacle.x + obstacle.width, obstacle.y);
                    ctx.scale(-1, 1);
                } else {
                    ctx.translate(obstacle.x, obstacle.y);
                }
                if (obstacle.predator && assets.v2HawkFly0?.naturalWidth) {
                    // The brown hawk: art faces left, so it is mirrored when it hunts from behind.
                    const frame = assets[`v2HawkFly${Math.floor((obstacle.flightAge || 0) * 10) % 4}`];
                    ctx.translate(obstacle.width, 0);
                    ctx.scale(-1, 1);
                    const pad = obstacle.width * 0.18;
                    ctx.drawImage(frame, -pad, -pad, obstacle.width + pad * 2, obstacle.height + pad * 2);
                } else if (obstacle.heroId) drawHeroAnimation(obstacle.heroId,
                    prefersReducedMotion() ? 0.18 : obstacle.flightAge + obstacle.animationOffset,
                    false, 0, 0, obstacle.width, obstacle.height);
                else ctx.drawImage(birdArt, 0, 0, obstacle.width, obstacle.height);
            }
        } else if (BertStormline.isHazard(obstacle)) {
            const art = assets[obstacle.artKey];
            if (art?.naturalWidth) {
                // New art has its own proportions: fit it inside the hazard box, centred.
                const scale = Math.min(obstacle.width / art.naturalWidth, obstacle.height / art.naturalHeight) * 1.15;
                const w = art.naturalWidth * scale;
                const h = art.naturalHeight * scale;
                ctx.drawImage(art, obstacle.x + (obstacle.width - w) / 2, obstacle.y + (obstacle.height - h) / 2, w, h);
            }
        } else if (obstacle.kind === 'edm-center-rig') {
            if (assets.edmCenterRig?.naturalWidth) ctx.drawImage(assets.edmCenterRig,
                obstacle.x, obstacle.y, obstacle.width, obstacle.height);
        } else if (obstacle.kind === 'edm-crowd-ball') {
            if (assets.edmCrowdBall?.naturalWidth) {
                ctx.translate(obstacle.x + obstacle.width / 2, obstacle.y + obstacle.height / 2);
                ctx.rotate(obstacle.age * 1.1);
                ctx.drawImage(assets.edmCrowdBall, -obstacle.width / 2, -obstacle.height / 2,
                    obstacle.width, obstacle.height);
            }
        } else if (obstacle.kind === 'edm-tower') {
            const art = assets[obstacle.artKey];
            if (art && obstacle.artKey === 'edmSpeaker') {
                // Speaker stacks: tile the speaker art along the tower so it never stretches.
                const w = obstacle.width;
                const tileH = w * art.naturalHeight / art.naturalWidth;
                ctx.save();
                ctx.beginPath(); ctx.rect(obstacle.x - 10, obstacle.y, w + 20, obstacle.height); ctx.clip();
                if (obstacle.top) for (let y = obstacle.y + obstacle.height - tileH; y > obstacle.y - tileH; y -= tileH) ctx.drawImage(art, obstacle.x, y, w, tileH);
                else for (let y = obstacle.y; y < obstacle.y + obstacle.height; y += tileH) ctx.drawImage(art, obstacle.x, y, w, tileH);
                ctx.restore();
            } else if (art) ctx.drawImage(art, obstacle.x, obstacle.y, obstacle.width, obstacle.height);
        } else if (obstacle.kind === 'edm-orb') {
            // The cord is decorative; only the visible ball has a solid circular hitbox.
            ctx.strokeStyle = 'rgba(169, 218, 226, .65)';
            ctx.lineWidth = 2;
            ctx.beginPath();
            ctx.moveTo(obstacle.x + obstacle.width / 2, 0);
            ctx.lineTo(obstacle.x + obstacle.width / 2, obstacle.y + 20);
            ctx.stroke();
            ctx.drawImage(assets.edmMirror, obstacle.x, obstacle.y, obstacle.width, obstacle.height);
        } else if (obstacle.kind === 'flappy-pipe') {
            const pipe = assets[obstacle.artKey] || assets.flappyPipe;
            if (obstacle.top) {
                ctx.translate(obstacle.x + obstacle.width / 2, obstacle.height);
                ctx.scale(1, -1);
                ctx.drawImage(pipe, -obstacle.width / 2, 0, obstacle.width, obstacle.height);
            } else {
                ctx.drawImage(pipe, obstacle.x, obstacle.y, obstacle.width, obstacle.height);
            }
        } else if (obstacle.kind === 'happy-pipe') {
            if (obstacle.tilt) {
                // Leaning tower: rotate around its gap end so the opening stays in line.
                const pivotX = obstacle.x + obstacle.width / 2;
                const pivotY = obstacle.top ? obstacle.y + obstacle.height : obstacle.y;
                ctx.translate(pivotX, pivotY);
                ctx.rotate(obstacle.tilt);
                ctx.translate(-pivotX, -pivotY);
            }
            drawHappyPipe(obstacle);
        } else if (obstacle.kind === 'desert-wall') {
            const terrain = assets[obstacle.artKey] || assets.desertTerrain;
            if (obstacle.artKey === 'desertTerrain' || !obstacle.artKey) {
                // Klippebilledet har gennemsigtig luft mod åbningen (ca. 13 % af hver halvdel).
                // Den skæres fra, så den synlige klippe passer præcist med hitboxen.
                const half = Math.floor(terrain.naturalHeight / 2);
                const air = Math.round(half * 0.135);
                const sourceY = obstacle.top ? 0 : half + air;
                const sourceHeight = half - air;
                ctx.drawImage(terrain, 0, sourceY, terrain.naturalWidth, sourceHeight, obstacle.x, obstacle.y, obstacle.width, obstacle.height);
            } else if (obstacle.top) {
                ctx.translate(obstacle.x + obstacle.width / 2, obstacle.height);
                ctx.scale(1, -1);
                ctx.drawImage(terrain, -obstacle.width / 2, 0, obstacle.width, obstacle.height);
            } else {
                ctx.drawImage(terrain, obstacle.x, obstacle.y, obstacle.width, obstacle.height);
            }
        } else if (obstacle.kind === 'jungle-spider') {
            // Six-frame spider (round 3) for soft leg movement; the old art has three.
            const idleSequence = assets.spider5 ? [0, 1, 2, 3, 4, 5, 4, 3, 2, 1] : [0, 1, 2, 1];
            const frame = assets[`spider${idleSequence[Math.floor((obstacle.age + obstacle.animationPhase) * (assets.spider5 ? 10 : 5)) % idleSequence.length]}`];
            const swing = Math.sin(obstacle.bob) * 14;
            // New-style Jungle: each spider hangs from a leafy branch at the top.
            const canopy = assets[obstacle.id % 2 ? 'v2CanopyLeft' : 'v2CanopyRight'];
            if (V2.levels.has('jungle') && canopy?.naturalWidth) {
                const width = 230;
                const height = width * canopy.naturalHeight / canopy.naturalWidth;
                ctx.drawImage(canopy, obstacle.renderX + obstacle.renderWidth / 2 - width / 2, -height * 0.35, width, height);
            }
            ctx.strokeStyle = 'rgba(230,230,230,0.85)';
            ctx.lineWidth = 2;
            ctx.beginPath();
            ctx.moveTo(obstacle.renderX + obstacle.renderWidth / 2, 0);
            ctx.lineTo(obstacle.renderX + obstacle.renderWidth / 2 + swing * 0.25, obstacle.renderY + 16);
            ctx.stroke();
            ctx.drawImage(frame, obstacle.renderX + swing, obstacle.renderY, obstacle.renderWidth, obstacle.renderHeight);
            if (currentLevel.spiderWarning && obstacle.attackState === 'attacking'
                && obstacle.attackElapsed < (obstacle.attackWindup ?? 0.52) + 0.5) {
                // The spider shoots a thread and spins a web where it will land:
                // the web's centre is exactly where it drops to.
                const windup = obstacle.attackWindup ?? 0.52;
                const elapsed = obstacle.attackElapsed;
                const shoot = clamp(elapsed / (windup * 0.45), 0, 1);
                const grow = clamp((elapsed - windup * 0.35) / (windup * 0.55), 0, 1);
                const fadeOut = clamp((windup + 0.5 - elapsed) / 0.25, 0, 1);
                const startX = obstacle.x + obstacle.width / 2 + swing;
                const startY = obstacle.renderY + obstacle.height * 0.8;
                const targetX = startX;
                const targetY = obstacle.targetY + obstacle.height * 0.45;
                ctx.save();
                ctx.globalAlpha = 0.9 * fadeOut;
                ctx.strokeStyle = '#f4f7f8';
                ctx.lineCap = 'round';
                ctx.lineWidth = 2;
                ctx.beginPath();
                ctx.moveTo(startX, startY);
                ctx.lineTo(startX, lerp(startY, targetY, shoot));
                ctx.stroke();
                if (grow > 0) {
                    const radius = 46 * smoothStep(grow);
                    const spokes = 8;
                    ctx.lineWidth = 1.6;
                    ctx.beginPath();
                    for (let i = 0; i < spokes; i += 1) {
                        const a = (i / spokes) * Math.PI * 2 + 0.2;
                        ctx.moveTo(targetX, targetY);
                        ctx.lineTo(targetX + Math.cos(a) * radius, targetY + Math.sin(a) * radius * 0.85);
                    }
                    for (let ring = 1; ring <= 4; ring += 1) {
                        const r = radius * ring / 4;
                        for (let i = 0; i <= spokes; i += 1) {
                            const a = (i / spokes) * Math.PI * 2 + 0.2;
                            // Slight inward sag between spokes makes it read as silk.
                            const sag = i % 1 === 0 ? 1 : 0.9;
                            const x = targetX + Math.cos(a) * r * sag;
                            const y = targetY + Math.sin(a) * r * 0.85 * sag;
                            if (i === 0) ctx.moveTo(x, y); else ctx.lineTo(x, y);
                        }
                    }
                    ctx.stroke();
                }
                ctx.restore();
            }
        } else if (obstacle.kind === 'jungle-snake' && !OLD_SNAKE && V2.levels.has('jungle')) {
            const idleSequence = [0, 1, 2, 3, 4, 5, 5, 4, 3, 2, 1, 0];
            const frame = obstacle.attackFrame == null
                ? assets[`snake${idleSequence[Math.floor((obstacle.age + obstacle.animationPhase) * 8) % idleSequence.length]}`]
                : assets[`snakeJump${obstacle.attackFrame}`];
            if (frame) {
                const head = obstacle.snakeHeight || obstacle.renderHeight;
                const stretch = obstacle.renderHeight - head;
                if (stretch > 1) {
                    // Stretch the lower coil down to the rock while the snake strikes upward.
                    const from = frame.naturalHeight * 0.74;
                    ctx.drawImage(frame, 0, from, frame.naturalWidth, frame.naturalHeight - from,
                        obstacle.renderX, obstacle.renderY + head * 0.74, obstacle.renderWidth, obstacle.renderHeight - head * 0.74);
                }
                ctx.drawImage(frame, obstacle.renderX, obstacle.renderY, obstacle.renderWidth, head);
            }
            drawSnakeRock(obstacle);
        } else if (obstacle.kind === 'jungle-snake') {
            if (assets.jungleStone && obstacle.baseBottom != null) {
                // The snake coils on top of a real rock (art 180×140, kept in proportion).
                obstacle.rockAspect = assets.jungleStone.naturalHeight / assets.jungleStone.naturalWidth;
                const rock = BertCollision.snakeRock(obstacle);
                ctx.drawImage(assets.jungleStone, rock.x, rock.y, rock.width, rock.height);
            }
            const idleSequence = [0, 1, 2, 3, 4, 5, 6, 6, 5, 4, 0, 3, 0, 3];
            const frame = obstacle.attackFrame == null
                ? assets[`snake${idleSequence[Math.floor((obstacle.age + obstacle.animationPhase) * 10) % idleSequence.length]}`]
                : assets[`snakeJump${obstacle.attackFrame}`];
            ctx.drawImage(frame, obstacle.renderX, obstacle.renderY, obstacle.renderWidth, obstacle.renderHeight);
        } else if (obstacle.kind === 'glide-tower') {
            // Hill art is 400 × 600 with the hill in the middle; scale so the hill fills the box.
            const hill = assets[obstacle.art];
            if (hill?.naturalWidth) {
                const inner = obstacle.art === 'g7Hill1' ? 386 : 236;
                const scale = obstacle.width / inner;
                const w = 400 * scale;
                ctx.drawImage(hill, obstacle.x + obstacle.width / 2 - w / 2, obstacle.y, w, Math.max(obstacle.height + 40, 600 * scale * (obstacle.height / (600 * scale))));
            }
        } else if (obstacle.kind === 'glide-balloon') {
            obstacle.y += Math.sin(state.worldTime * 1.4 + obstacle.phase) * 0.4;
            if (assets.v2Balloon?.naturalWidth) ctx.drawImage(assets.v2Balloon, obstacle.x, obstacle.y, obstacle.width, obstacle.height);
        } else if (obstacle.kind === 'glide-thermal') {
            // Warm air (round 7 art) rising from a heat source on the ground.
            if (assets.g7Thermal?.naturalWidth) {
                ctx.globalAlpha = 0.85;
                ctx.drawImage(assets.g7Thermal, obstacle.x - 25, 0, obstacle.width + 50, VIEW.height);
                ctx.globalAlpha = 1;
            }
            const heat = assets[`g7Heat${obstacle.source || 0}`];
            if (heat?.naturalWidth) ctx.drawImage(heat, obstacle.x + obstacle.width / 2 - 110, VIEW.height - 190, 220, 183);
            ctx.strokeStyle = 'rgba(255,255,255,.75)';
            ctx.lineWidth = 4;
            ctx.lineCap = 'round';
            for (let i = 0; i < 5; i += 1) {
                const y = ((VIEW.height + 80) - ((state.worldTime * 160 + i * 150) % (VIEW.height + 80)));
                const cx = obstacle.x + obstacle.width / 2 + Math.sin(state.worldTime * 2 + i) * 18;
                ctx.beginPath(); ctx.moveTo(cx - 14, y + 12); ctx.lineTo(cx, y); ctx.lineTo(cx + 14, y + 12); ctx.stroke();
            }
        } else if (obstacle.kind === 'happy-balloon') {
            if (assets.v2Balloon?.naturalWidth) ctx.drawImage(assets.v2Balloon, obstacle.x, obstacle.y, obstacle.width, obstacle.height);
        } else if (obstacle.kind === 'happy-rainbow') {
            ctx.translate(obstacle.x + obstacle.width / 2, obstacle.y + obstacle.height / 2);
            if (obstacle.top) ctx.scale(1, -1);
            ctx.drawImage(assets.rainbow, -obstacle.width / 2, -obstacle.height / 2, obstacle.width, obstacle.height);
        }
        ctx.restore();
    }

    function drawSpiderWeb(o) {
        const cx = o.x + o.width / 2 + Math.sin(o.age * 1.3 + o.sway) * 6;
        const cy = o.top ? o.y + o.height * 0.58 : o.y + o.height * 0.42;
        const rx = o.width * 0.48;
        const ry = o.height * 0.42;
        ctx.save();
        ctx.strokeStyle = 'rgba(245, 250, 255, 0.85)';
        ctx.lineCap = 'round';
        // Anchor threads to the canopy or the ground.
        ctx.lineWidth = 2.5;
        ctx.beginPath();
        const edgeY = o.top ? -10 : 680;
        [-0.6, -0.15, 0.3, 0.7].forEach((f) => { ctx.moveTo(cx + rx * f, cy + (o.top ? -ry : ry) * 0.9); ctx.lineTo(cx + rx * f * 1.3, edgeY); });
        ctx.stroke();
        const spokes = 12;
        ctx.lineWidth = 2;
        ctx.beginPath();
        for (let i = 0; i < spokes; i += 1) {
            const a = (i / spokes) * Math.PI * 2;
            ctx.moveTo(cx, cy);
            ctx.lineTo(cx + Math.cos(a) * rx, cy + Math.sin(a) * ry);
        }
        ctx.stroke();
        ctx.lineWidth = 1.6;
        for (let ring = 1; ring <= 6; ring += 1) {
            const k = ring / 6;
            ctx.beginPath();
            for (let i = 0; i <= spokes; i += 1) {
                const a = (i / spokes) * Math.PI * 2;
                const mid = ((i + 0.5) / spokes) * Math.PI * 2;
                const x1 = cx + Math.cos(a) * rx * k;
                const y1 = cy + Math.sin(a) * ry * k;
                if (i === 0) { ctx.moveTo(x1, y1); continue; }
                // Each strand sags a little towards the centre.
                ctx.quadraticCurveTo(cx + Math.cos(mid - Math.PI / spokes) * rx * k * 0.9, cy + Math.sin(mid - Math.PI / spokes) * ry * k * 0.9, x1, y1);
            }
            ctx.stroke();
        }
        // Dew drops catch the light.
        ctx.fillStyle = 'rgba(255,255,255,.9)';
        for (let i = 0; i < 8; i += 1) {
            const a = i * 0.83 + o.sway;
            const k = 0.3 + (i % 4) * 0.18;
            ctx.beginPath(); ctx.arc(cx + Math.cos(a) * rx * k, cy + Math.sin(a) * ry * k, 2.6, 0, Math.PI * 2); ctx.fill();
        }
        ctx.restore();
    }

    function drawSnakeRock(obstacle) {
        if (!assets.jungleStone || obstacle.baseBottom == null) return;
        obstacle.rockAspect = assets.jungleStone.naturalHeight / assets.jungleStone.naturalWidth;
        const rock = BertCollision.snakeRock(obstacle);
        ctx.drawImage(assets.jungleStone, rock.x, rock.y, rock.width, rock.height);
    }

    function drawEnemyCapture() {
        if (state.phase !== 'dead' || !state.deathCause) return;
        // Round 2 deaths: the scene art has no bird in it; the player's own hero is drawn in.
        const heroPose = (pose) => {
            const frames = birdFrames[BertMeta.currentHero()];
            if (frames?.v2) return pose === 'dead' ? frames[9] : frames[8];
            return frames?.[pose === 'dead' ? 13 : 4] || birdFrames.bert?.[4];
        };
        const fitHero = (img, x, y, w, h, angle = 0) => {
            if (!img?.naturalWidth) return;
            const scale = Math.min(w / img.naturalWidth, h / img.naturalHeight);
            const dw = img.naturalWidth * scale;
            const dh = img.naturalHeight * scale;
            ctx.save();
            ctx.translate(x + w / 2, y + h / 2);
            ctx.rotate(angle);
            ctx.drawImage(img, -dw / 2, -dh / 2, dw, dh);
            ctx.restore();
        };
        const isBert = BertMeta.currentHero() === 'bert';
        if (state.deathPredatorHero && isBert && assets.v2HawkCatch0?.naturalWidth) {
            // Bert's own hawk catch (round 1 art with Bert drawn in), kept because it reads best.
            const progress = clamp(state.deathCaptureElapsed / 1.3, 0, 1);
            const frame = assets[`v2HawkCatch${Math.min(5, Math.floor(state.deathCaptureElapsed / 0.22))}`];
            const size = 300;
            const x = state.deathCaptureX - size / 2 + progress * 320;
            const y = state.deathCaptureY - size * 0.55 - Math.sin(progress * Math.PI) * 60;
            ctx.save();
            ctx.globalAlpha = clamp((2.1 - state.deathCaptureElapsed) / 0.55, 0, 1);
            ctx.translate(x + size, y);
            ctx.scale(-1, 1);
            ctx.drawImage(frame, 0, 0, size, size);
            ctx.restore();
            return;
        }
        if (state.deathPredatorHero && assets.v2HawkCarry0?.naturalWidth) {
            const progress = clamp(state.deathCaptureElapsed / 1.3, 0, 1);
            const frame = assets[`v2HawkCarry${Math.min(5, Math.floor(state.deathCaptureElapsed / 0.2))}`];
            const size = 300;
            const x = state.deathCaptureX - size / 2 + progress * 320;
            const y = state.deathCaptureY - size * 0.62 - Math.sin(progress * Math.PI) * 60;
            ctx.save();
            ctx.globalAlpha = clamp((2.1 - state.deathCaptureElapsed) / 0.55, 0, 1);
            ctx.translate(x + size, y);
            ctx.scale(-1, 1);
            // The hero dangles from the talons (lower middle of the art), then the hawk on top.
            // The hawk carries off the grilled chicken (feedback: the roast-chicken pose fits here).
            fitHero(heroPose('dead'), size * 0.5 - BIRD.width * 0.5, size * 0.72, BIRD.width, BIRD.height, 0.25);
            ctx.drawImage(frame, 0, 0, size, size);
            ctx.restore();
            return;
        }
        if (state.deathPredatorHero && assets.v2HawkCatch0?.naturalWidth) {
            const progress = clamp(state.deathCaptureElapsed / 1.3, 0, 1);
            const frame = assets[`v2HawkCatch${Math.min(5, Math.floor(state.deathCaptureElapsed / 0.22))}`];
            const size = 230;
            const x = state.deathCaptureX - size / 2 + progress * 320;
            const y = state.deathCaptureY - size * 0.55 - Math.sin(progress * Math.PI) * 60;
            ctx.save();
            ctx.globalAlpha = clamp((2.1 - state.deathCaptureElapsed) / 0.55, 0, 1);
            ctx.translate(x + size, y);
            ctx.scale(-1, 1);
            ctx.drawImage(frame, 0, 0, size, size);
            ctx.restore();
            return;
        }
        if (state.deathPredatorHero) {
            const progress = clamp(state.deathCaptureElapsed / 1.1, 0, 1);
            const x = state.deathCaptureX - 155 + progress * 280;
            const y = state.deathCaptureY - 105 - Math.sin(progress * Math.PI) * 44;
            ctx.save();
            ctx.globalAlpha = clamp((2.1 - state.deathCaptureElapsed) / 0.55, 0, 1);
            drawHeroAnimation(state.deathPredatorHero,
                prefersReducedMotion() ? 0.18 : state.deathCaptureElapsed,
                false, x, y, 212, 158);
            ctx.restore();
            return;
        }
        if (state.deathCause === 'jungle-snake' && !OLD_SNAKE && V2.levels.has('jungle')) {
            // The snake sits back on its rock with a happy, full belly.
            const snake = obstacles.find((obstacle) => obstacle.id === state.deathObstacleId && obstacle.kind === 'jungle-snake');
            const frame = assets[`snakeCatch${Math.min(2, Math.floor(state.deathCaptureElapsed / 0.3))}`];
            if (!snake || !frame) return;
            const height = snake.height * 1.05;
            const width = height * 0.8;
            ctx.drawImage(frame, snake.x + snake.width / 2 - width / 2, snake.baseBottom + 4 - height, width, height);
            drawSnakeRock(snake);
            return;
        }
        if (state.deathCause === 'jungle-snake') {
            const frameIndex = Math.min(2, Math.floor(state.deathCaptureElapsed / 0.145));
            const frame = assets[`snakeCatch${frameIndex}`];
            if (!frame) return;
            const scale = 1.1 * SNAKE_CATCH_SCALE;
            const width = frame.naturalWidth * scale;
            const height = frame.naturalHeight * scale;
            ctx.save();
            ctx.translate(bird.x + BIRD.width / 2, bird.y + BIRD.height / 2);
            ctx.rotate((bird.rotation * Math.PI) / 180);
            ctx.drawImage(frame, -width / 2, -height / 2, width, height);
            ctx.restore();
            return;
        }
        if (state.deathCause === 'jungle-spider' && isBert && assets.spiderCatch0?.naturalWidth && !(state.deathFromWeb && assets.v2WebStuck0?.naturalWidth)) {
            // Bert's own spider catch (round 1 art, six frames with Bert drawn in).
            const frameIndex = Math.min(17, Math.floor(state.deathCaptureElapsed * 8));
            const frame = assets[`spiderCatch${frameIndex}`];
            if (!frame) return;
            const size = 300;
            const x = state.deathCaptureX - size * 0.5;
            const y = state.deathCaptureY - size * 0.58;
            ctx.save();
            ctx.strokeStyle = 'rgba(240, 245, 250, .9)';
            ctx.lineWidth = 3;
            ctx.beginPath(); ctx.moveTo(x + size * 0.5, -10); ctx.lineTo(x + size * 0.5, y + size * 0.1); ctx.stroke();
            ctx.drawImage(frame, x, y, size, size);
            ctx.restore();
            return;
        }
        if (state.deathCause === 'jungle-spider' && assets.v2SpiderWrap0?.naturalWidth) {
            // Scene scaled so the cocoon opening (x 264–402 of 512) fits a full-size hero:
            // the caught bird keeps its in-game size instead of shrinking to a micro bird.
            const size = 380;
            const k = size / 512;
            const x = state.deathCaptureX - 333 * k;
            const y = state.deathCaptureY - 277 * k;
            let elapsed = state.deathCaptureElapsed;
            // From the big web: first the strands close around the hero, then the spider comes.
            if (state.deathFromWeb && assets.v2WebStuck0?.naturalWidth) {
                if (elapsed < 0.9) {
                    const s2 = 300;
                    fitHero(heroPose('glide'), state.deathCaptureX - BIRD.width / 2, state.deathCaptureY - BIRD.height / 2, BIRD.width, BIRD.height);
                    ctx.drawImage(assets[`v2WebStuck${Math.min(2, Math.floor(elapsed / 0.3))}`], state.deathCaptureX - s2 / 2, state.deathCaptureY - s2 / 2, s2, s2);
                    return;
                }
                elapsed -= 0.9;
            }
            const frameIndex = Math.min(5, Math.floor(elapsed / 0.28));
            // The spider's thread continues from the art (x 118, top ~y 50) all the way up.
            ctx.save();
            ctx.strokeStyle = 'rgba(240, 245, 250, .9)';
            ctx.lineWidth = 3;
            ctx.beginPath();
            ctx.moveTo(x + 118 * k, -10);
            ctx.lineTo(x + 118 * k, y + 60 * k);
            ctx.stroke();
            ctx.restore();
            ctx.save();
            ctx.shadowColor = 'rgba(0,0,0,.28)';
            ctx.shadowBlur = 9;
            // Mask hole in frame 3: x 264–402, y 228–326 of the 512 art. The hero sits there
            // while the cocoon is still open (frames 1–3); the closed cocoon hides it.
            if (frameIndex <= 2) {
                // Full-size hero in the open cocoon; its head pokes out over the rim.
                fitHero(heroPose('glide'), state.deathCaptureX - BIRD.width * 0.5, state.deathCaptureY - BIRD.height * 0.62, BIRD.width, BIRD.height, -0.15);
            }
            ctx.drawImage(assets[`v2SpiderWrap${frameIndex}`], x, y, size, size);
            ctx.restore();
            return;
        }
        if (state.deathCause === 'jungle-spider') {
            const frameIndex = Math.min(17, Math.floor(state.deathCaptureElapsed * 8));
            const frame = assets[`spiderCatch${frameIndex}`];
            if (!frame) return;
            const scale = 1.35;
            const width = frame.naturalWidth * scale;
            const height = frame.naturalHeight * scale;
            const x = state.deathCaptureX - width / 2;
            const y = state.deathCaptureY - height * 0.8;
            ctx.save();
            ctx.shadowColor = 'rgba(0,0,0,.28)';
            ctx.shadowBlur = 9;
            ctx.drawImage(frame, x, y, width, height);
            ctx.restore();
        }
    }

    // Forstør/Formindsk pickup: the bubble with four golden arrows pointing out or in.
    function drawSizePickup(grow) {
        const art = assets[grow ? 'v2PuGrow' : 'v2PuShrink'];
        if (art?.naturalWidth) { ctx.drawImage(art, -37, -37, 74, 74); return; }
        const bubble = assets.v2Bubble;
        if (bubble?.naturalWidth) ctx.drawImage(bubble, -37, -37, 74, 74);
        ctx.save();
        ctx.fillStyle = grow ? '#ffcf3a' : '#7fe8ff';
        ctx.strokeStyle = '#1b2a44';
        ctx.lineWidth = 3;
        for (let i = 0; i < 4; i += 1) {
            ctx.save();
            ctx.rotate(Math.PI / 4 + (i * Math.PI) / 2);
            ctx.translate(grow ? 14 : 24, 0);
            if (!grow) ctx.scale(-1, 1);
            ctx.beginPath();
            ctx.moveTo(0, -5); ctx.lineTo(6, -5); ctx.lineTo(6, -10); ctx.lineTo(15, 0); ctx.lineTo(6, 10); ctx.lineTo(6, 5); ctx.lineTo(0, 5);
            ctx.closePath(); ctx.fill(); ctx.stroke();
            ctx.restore();
        }
        ctx.fillStyle = '#ffffff';
        ctx.beginPath(); ctx.arc(0, 0, grow ? 9 : 5, 0, Math.PI * 2); ctx.fill(); ctx.stroke();
        ctx.restore();
    }

    function drawReversePickup(collectible) {
        const glowSize = 112;
        if (assets.reversePickup?.naturalWidth) {
            ctx.globalAlpha = 0.38 + Math.sin(collectible.spin * 2) * 0.08;
            ctx.drawImage(assets.whiteGlow, -glowSize / 2, -glowSize / 2, glowSize, glowSize);
            ctx.globalAlpha = 1;
            ctx.rotate(Math.sin(collectible.spin * 1.4) * 0.2);
            ctx.drawImage(assets.reversePickup, -38, -38, 76, 76);
            return;
        }
        ctx.globalAlpha = 0.4 + Math.sin(collectible.spin * 2) * 0.08;
        ctx.drawImage(assets.whiteGlow, -glowSize / 2, -glowSize / 2, glowSize, glowSize);
        ctx.globalAlpha = 1;
        ctx.rotate(Math.sin(collectible.spin * 1.4) * 0.25);
        ctx.fillStyle = '#7b3fd6';
        ctx.strokeStyle = '#ffffff';
        ctx.lineWidth = 5;
        ctx.beginPath();
        ctx.arc(0, 0, 31, 0, Math.PI * 2);
        ctx.fill();
        ctx.stroke();
        // Two opposed arrows: up becomes down.
        ctx.fillStyle = '#ffffff';
        [[-11, -1], [11, 1]].forEach(([x, dir]) => {
            ctx.beginPath();
            ctx.moveTo(x, -18 * dir);
            ctx.lineTo(x + 10, -5 * dir);
            ctx.lineTo(x + 4, -5 * dir);
            ctx.lineTo(x + 4, 17 * dir);
            ctx.lineTo(x - 4, 17 * dir);
            ctx.lineTo(x - 4, -5 * dir);
            ctx.lineTo(x - 10, -5 * dir);
            ctx.closePath();
            ctx.fill();
        });
    }

    // A soft haze over the scenery (not over obstacles, stars or Bert): the background
    // loses a little contrast and the action in front stands out (feedback 9. okt.).
    const DEPTH_HAZE = {
        desert: 'rgba(255, 238, 200, .16)', jungle: 'rgba(210, 245, 225, .16)', happySky: 'rgba(235, 248, 255, .16)',
        flappy: 'rgba(235, 245, 255, .14)', tunnel: 'rgba(10, 18, 40, .22)', birdRun: 'rgba(235, 248, 255, .16)',
        skyRelay: 'rgba(235, 248, 255, .14)', stormline: 'rgba(225, 235, 245, .16)', edm: 'rgba(12, 6, 30, .2)',
        iceberg: 'rgba(235, 248, 255, .16)', harbor: 'rgba(230, 242, 250, .16)', nightcity: 'rgba(8, 14, 34, .2)',
        volcano: 'rgba(40, 18, 18, .16)', windfarm: 'rgba(235, 248, 255, .14)', poop: 'rgba(240, 245, 250, .14)',
    };
    function drawDepthHaze() {
        const color = DEPTH_HAZE[currentLevel.kind];
        if (!color || state.phase === 'menu' || state.phase === 'levels') return;
        ctx.save();
        ctx.fillStyle = color;
        ctx.fillRect(0, 0, VIEW.width, VIEW.height);
        ctx.restore();
    }

    let starHaloCache = null;
    function starHaloSprite() {
        if (starHaloCache) return starHaloCache;
        const c = document.createElement('canvas'); c.width = c.height = 96;
        const g = c.getContext('2d');
        const halo = g.createRadialGradient(48, 48, 10, 48, 48, 46);
        halo.addColorStop(0, 'rgba(255, 196, 40, .75)'); halo.addColorStop(1, 'rgba(255, 150, 0, 0)');
        g.fillStyle = halo; g.beginPath(); g.arc(48, 48, 46, 0, Math.PI * 2); g.fill();
        g.strokeStyle = 'rgba(27, 42, 68, .55)'; g.lineWidth = 3; g.beginPath(); g.arc(48, 48, 30, 0, Math.PI * 2); g.stroke();
        starHaloCache = c;
        return c;
    }

    function drawCollectible(collectible) {
        ctx.save();
        ctx.translate(collectible.x, collectible.y);
        // Bright sky levels: a warm halo and a dark ring make stars pop off the clouds.
        if (collectible.kind === 'star' && ['skyRelay', 'birdRun', 'happySky'].includes(currentLevel.kind)) {
            ctx.drawImage(starHaloSprite(), -48, -48, 96, 96);
        }
        if (currentLevel.kind === 'tunnel' && collectible.kind === 'star' && assets.v2StarGate?.naturalWidth) {
            ctx.globalAlpha = 0.5;
            ctx.drawImage(assets.v2StarGate, -42, -42, 84, 84);
            ctx.globalAlpha = 1;
        }
        if (collectible.kind === 'cool') {
            ctx.restore();
            drawCoolingStone(collectible);
            return;
        }
        if (collectible.kind === 'crystal') {
            ctx.restore();
            drawFrostCrystal(collectible);
            return;
        }
        if (collectible.kind === 'lantern') {
            ctx.restore();
            drawLantern(collectible);
            return;
        }
        if (collectible.kind === 'food') {
            ctx.rotate(Math.sin(collectible.spin) * 0.25);
            const foodArt = assets[{ fries: 'poopFries', berry: 'poopBerry', crumb: 'poopCrumb' }[collectible.food]];
            if (foodArt?.naturalWidth) {
                ctx.drawImage(foodArt, -34, -34, 68, 68);
                ctx.restore();
                return;
            }
            ctx.lineWidth = 3;
            ctx.strokeStyle = '#2a1a10';
            if (collectible.food === 'fries') {
                ctx.fillStyle = '#ffd34a';
                for (let i = -2; i <= 2; i += 1) { ctx.fillRect(i * 7 - 3, -26 + Math.abs(i) * 3, 6, 22); }
                ctx.fillStyle = '#e8463a';
                ctx.beginPath(); ctx.moveTo(-20, -6); ctx.lineTo(20, -6); ctx.lineTo(14, 24); ctx.lineTo(-14, 24); ctx.closePath(); ctx.fill(); ctx.stroke();
            } else if (collectible.food === 'berry') {
                ctx.fillStyle = '#d6203b';
                [[-9, 4], [9, 4], [0, -9]].forEach(([bx, by]) => { ctx.beginPath(); ctx.arc(bx, by, 11, 0, Math.PI * 2); ctx.fill(); ctx.stroke(); });
                ctx.fillStyle = '#3c9a3c';
                ctx.beginPath(); ctx.ellipse(6, -20, 9, 4, -0.5, 0, Math.PI * 2); ctx.fill();
            } else {
                ctx.fillStyle = '#d9a45a';
                ctx.beginPath(); ctx.ellipse(0, 0, 20, 14, 0.3, 0, Math.PI * 2); ctx.fill(); ctx.stroke();
                ctx.fillStyle = '#f3dca8';
                ctx.beginPath(); ctx.ellipse(-3, -2, 10, 6, 0.3, 0, Math.PI * 2); ctx.fill();
            }
            ctx.restore();
            return;
        }
        if (collectible.kind === 'sticker') {
            const art = stickerArt(collectible.sticker);
            ctx.globalAlpha = 0.45 + Math.sin(collectible.spin * 2) * 0.15;
            ctx.drawImage(assets.whiteGlow, -50, -50, 100, 100);
            ctx.globalAlpha = 1;
            ctx.rotate(Math.sin(collectible.spin * 0.8) * 0.2);
            if (art?.naturalWidth) ctx.drawImage(art, -31, -31, 62, 62);
            ctx.restore();
            return;
        }
        if (collectible.kind === 'egg') {
            const glowSize = 110;
            ctx.globalAlpha = 0.5 + Math.sin(collectible.spin * 2) * 0.12;
            ctx.drawImage(assets.yellowGlow || assets.whiteGlow, -glowSize / 2, -glowSize / 2, glowSize, glowSize);
            ctx.globalAlpha = 1;
            ctx.rotate(Math.sin(collectible.spin * 0.9) * 0.25);
            if (assets.g5EggPickup?.naturalWidth) ctx.drawImage(assets.g5EggPickup, -32, -36, 64, 72);
            ctx.restore();
            return;
        }
        if (collectible.kind === 'feather') {
            const glowSize = 96;
            ctx.globalAlpha = 0.42 + Math.sin(collectible.spin * 2) * 0.1;
            ctx.drawImage(assets.whiteGlow, -glowSize / 2, -glowSize / 2, glowSize, glowSize);
            ctx.globalAlpha = 1;
            ctx.rotate(Math.sin(collectible.spin * 0.9) * 0.35);
            if (assets.goldFeather?.naturalWidth) ctx.drawImage(assets.goldFeather, -34, -34, 68, 68);
            else if (assets.feather?.naturalWidth) ctx.drawImage(assets.feather, -30, -27, 60, 54);
        } else if (collectible.kind === 'powerup') {
            ctx.scale(1.3, 1.3); // bigger and readable on a phone (feedback 9. okt.)
            const prototypeArt = {
                [POWERUP.HEAVY]: 'eventMetal', [POWERUP.HYPER]: 'eventHyper',
                [POWERUP.DOUBLE]: 'eventDouble', [POWERUP.FLAP]: 'eventFlap',
            }[collectible.type];
            if (collectible.type === POWERUP.REVERSE) {
                drawReversePickup(collectible);
                ctx.restore();
                return;
            }
            if (SIZE_POWERUP[collectible.type]) {
                drawSizePickup(collectible.type === POWERUP.GROW);
                ctx.restore();
                return;
            }
            const body = prototypeArt ? assets[prototypeArt] : collectible.type === POWERUP.GUARD
                ? assets.shieldCharge
                : collectible.type === POWERUP.SHIELD
                ? assets.shieldPickup
                : collectible.type === POWERUP.MAGNET
                    ? assets.magnetPickup
                    : assets.focusPickup;
            const glow = collectible.type === POWERUP.SHIELD || collectible.type === POWERUP.HEAVY
                ? assets.blueGlow
                : collectible.type === POWERUP.GUARD || collectible.type === POWERUP.MAGNET
                    || collectible.type === POWERUP.HYPER || collectible.type === POWERUP.DOUBLE
                    ? assets.yellowGlow
                    : assets.whiteGlow;
            const glowSize = collectible.type === POWERUP.FOCUS ? 94 : 112;
            ctx.globalAlpha = 0.38 + Math.sin(collectible.spin * 2) * 0.08;
            ctx.drawImage(glow, -glowSize / 2, -glowSize / 2, glowSize, glowSize);
            ctx.globalAlpha = 1;

            // Round-2 pickups are bubbles of their own; the old wings are only for old art.
            const bubbleArt = body?.src?.includes('/v2/pickups/');
            if (collectible.type !== POWERUP.FOCUS && !bubbleArt) {
                const flap = Math.sin(collectible.spin * 4.2) * 0.22;
                ctx.save();
                ctx.translate(-32, -2);
                ctx.rotate(-0.16 - flap);
                ctx.scale(-1, 1);
                ctx.drawImage(assets.powerupWing, -43, -27, 66, 52);
                ctx.restore();
                ctx.save();
                ctx.translate(32, -2);
                ctx.rotate(0.16 + flap);
                ctx.drawImage(assets.powerupWing, -23, -27, 66, 52);
                ctx.restore();
            }

            const bodyHeight = bubbleArt ? 74 : collectible.type === POWERUP.SHIELD ? 70 : 64;
            const bodyWidth = bubbleArt ? 74 : collectible.type === POWERUP.SHIELD ? 57 : 64;
            if (body?.naturalWidth) ctx.drawImage(body, -bodyWidth / 2, -bodyHeight / 2, bodyWidth, bodyHeight);
            if (collectible.type === POWERUP.GUARD) ctx.drawImage(assets.star, -15, -13, 30, 30);
        } else {
            ctx.rotate(collectible.spin);
            const star = starGlowCache.get(collectible.width);
            if (star) ctx.drawImage(star, -star.width / 2, -star.height / 2);
            else ctx.drawImage(assets.star, -collectible.width / 2, -collectible.height / 2, collectible.width, collectible.height);
        }
        ctx.restore();
    }

    function drawPowerupAura() {
        const x = bird.x + BIRD.width / 2;
        const y = bird.y + BIRD.height / 2;
        const pulse = 1 + Math.sin(state.worldTime * 7) * 0.08;
        ctx.save();
        if (state.activePowerup === POWERUP.SHIELD || state.elapsed < state.invulnerableUntil) {
            const size = 176 * pulse;
            ctx.globalAlpha = 0.42;
            ctx.drawImage(assets.blueGlow, x - size / 2, y - size / 2, size, size);
            ctx.globalAlpha = 1;
            if (state.shieldCharges > 0) {
                const angle = state.worldTime * 2.8;
                const orbitX = x + Math.cos(angle) * 78;
                const orbitY = y + Math.sin(angle) * 50;
                ctx.drawImage(assets.shieldCharge, orbitX - 25, orbitY - 25, 50, 50);
            }
        }
        if (state.activePowerup === POWERUP.MAGNET) {
            const size = 250 * pulse;
            ctx.globalAlpha = 0.28;
            ctx.drawImage(assets.yellowGlow, x - size / 2, y - size / 2, size, size);
            ctx.globalAlpha = 0.82;
            for (let index = 0; index < 5; index += 1) {
                const angle = state.worldTime * 2.4 + (index / 5) * Math.PI * 2;
                const radius = 92 + Math.sin(state.worldTime * 5 + index) * 12;
                ctx.save();
                ctx.translate(x + Math.cos(angle) * radius, y + Math.sin(angle) * radius);
                ctx.rotate(angle + Math.PI / 2);
                ctx.drawImage(assets.lightning, -6, -29, 12, 46);
                ctx.restore();
            }
            ctx.globalAlpha = 1;
        }
        if (state.activePowerup === POWERUP.FOCUS) {
            ctx.globalAlpha = 0.2;
            ctx.drawImage(assets.whiteGlow, x - 150, y - 150, 300, 300);
            ctx.globalAlpha = 1;
            ctx.fillStyle = 'rgba(32, 38, 70, 0.2)';
            ctx.fillRect(0, 0, VIEW.width, VIEW.height);
        }
        ctx.restore();
    }

    function heroAnimationState(hero, animationTime, dead = false) {
        if (birdFrames[hero]?.v2) {
            if (dead) return { currentIndex: 9, nextIndex: 9, blend: 0, fps: 0 };
            // Glide when Bert is falling calmly; otherwise the 8-frame wingbeat at 12 fps.
            if (bird.velocity > 260 && state.phase === 'playing') return { currentIndex: 8, nextIndex: 8, blend: 0, fps: 0 };
            const currentIndex = Math.floor(Math.max(0, animationTime) * V2_FPS) % 8;
            return { currentIndex, nextIndex: currentIndex, blend: 0, fps: V2_FPS };
        }
        if (dead) return { currentIndex: 13, nextIndex: 13, blend: 0, fps: 0 };
        if (!GENERATED_HERO_IDS.has(hero)) {
            const currentIndex = Math.floor(Math.max(0, animationTime) * 24) % 13;
            return { currentIndex, nextIndex: currentIndex, blend: 0, fps: 24 };
        }
        const phase = Math.max(0, animationTime) * GENERATED_ANIMATION_FPS;
        const whole = Math.floor(phase);
        const sequenceIndex = whole % GENERATED_FLIGHT_SEQUENCE.length;
        const currentIndex = GENERATED_FLIGHT_SEQUENCE[sequenceIndex];
        const nextIndex = GENERATED_FLIGHT_SEQUENCE[(sequenceIndex + 1) % GENERATED_FLIGHT_SEQUENCE.length];
        const transition = clamp((phase - whole - 0.58) / 0.42, 0, 1);
        return { currentIndex, nextIndex, blend: smoothStep(transition), fps: GENERATED_ANIMATION_FPS };
    }

    function drawHeroAnimation(hero, animationTime, dead, x, y, width, height) {
        const frames = birdFrames[hero]?.length ? birdFrames[hero] : birdFrames.bert;
        const sample = heroAnimationState(hero, animationTime, dead);
        const current = frames[sample.currentIndex] || birdFrames.bert[sample.currentIndex];
        if (!current) return sample;
        const baseAlpha = ctx.globalAlpha;
        if (sample.blend > 0 && sample.nextIndex !== sample.currentIndex) {
            const next = frames[sample.nextIndex] || current;
            ctx.drawImage(current, x, y, width, height);
            ctx.globalAlpha = baseAlpha * sample.blend;
            ctx.drawImage(next, x, y, width, height);
            ctx.globalAlpha = baseAlpha;
        } else {
            ctx.drawImage(current, x, y, width, height);
        }
        return sample;
    }

    // A blink every few seconds, and wide eyes when something harmful is right ahead.
    function heroExpression(frames) {
        if (state.phase !== 'playing') return null;
        if (frames.scared && state.elapsed < (state.scaredUntil || 0)) return frames.scared;
        const cycle = (state.worldTime + 1.7) % 4.3;
        if (frames.blink && cycle < 0.13) return frames.blink;
        return null;
    }
    function noteNearMiss() {
        const bx = bird.x + BIRD.width;
        const by = bird.y + BIRD.height / 2;
        const close = obstacles.some((o) => o.harmful && o.x > bx - 20 && o.x < bx + 120 && by > (o.y ?? 0) - 70 && by < (o.y ?? 0) + (o.height || o.size || 0) + 70);
        if (close) {
            if (state.elapsed >= (state.scaredUntil || 0) + 2.5 && state.phase === 'playing') playAudio('bert_whoa');
            // A new close call (not the same one continuing) counts as a near miss.
            if (state.phase === 'playing' && state.elapsed > (state.scaredUntil || 0) + 0.2) state.nearMisses = (state.nearMisses || 0) + 1;
            state.scaredUntil = state.elapsed + 0.35;
        }
    }

    function drawBird() {
        const dead = state.phase === 'dead' || state.phase === 'gameover';
        const hero = BertMeta.currentHero();
        ctx.save();
        ctx.translate(bird.x + BIRD.width / 2, bird.y + BIRD.height / 2);
        // Bert is drawn 15 % larger (feedback: too small on phones); see BIRD_DRAW_SCALE.
        const drawScale = BIRD_DRAW_SCALE * (state.birdScale || 1);
        ctx.scale(drawScale, drawScale);
        if (!dead && state.phase === 'playing' && !prefersReducedMotion()) {
            // Squash & stretch: a touch wider when climbing, a touch taller when diving.
            const k = clamp(bird.velocity / 900, -0.1, 0.1);
            ctx.scale(1 - k * 0.6, 1 + k * 0.6);
        }
        // Reversed controls show Bert on his head, so the twist is readable at a glance.
        const upsideDown = isReversed() && !dead;
        if (upsideDown) {
            ctx.scale(1, -1);
            ctx.rotate((-bird.rotation * Math.PI) / 180);
        } else {
            ctx.rotate((bird.rotation * Math.PI) / 180);
        }
        if (state.elapsed < state.invulnerableUntil && Math.floor(state.worldTime * 12) % 2 === 0) ctx.globalAlpha = 0.45;
        const frames = birdFrames[hero];
        const expression = !dead && frames?.v2 ? heroExpression(frames) : null;
        if (expression) ctx.drawImage(expression, -BIRD.width / 2, -BIRD.height / 2, BIRD.width, BIRD.height);
        else drawHeroAnimation(hero, bird.animationTime, dead, -BIRD.width / 2, -BIRD.height / 2, BIRD.width, BIRD.height);
        // Isbjerget: a frosty rim while the ice is slippery (no grip crystal active).
        if (currentLevel.kind === 'iceberg' && !dead && state.phase === 'playing' && state.elapsed >= (state.gripUntil || 0) && assets.iceFrost?.naturalWidth) {
            ctx.globalAlpha = 0.85;
            ctx.drawImage(assets.iceFrost, -BIRD.width * 0.62, -BIRD.height * 0.62, BIRD.width * 1.24, BIRD.height * 1.24);
        }
        ctx.restore();
    }

    function drawGhost() {
        const ghost = state.challenge?.ghost || state.ownGhost;
        if (!ghost || state.phase !== 'playing') return;
        const centerY = BertSocial.ghostYAt(ghost, state.elapsed);
        if (!Number.isFinite(centerY)) return;
        const heroId = state.challenge?.hero || BertMeta.currentHero();
        const hero = Object.prototype.hasOwnProperty.call(birdFrames, heroId) ? heroId : 'bert';
        // Where the ghost's run ended, it crashes: it falls to the ground and stays behind
        // in the world while you fly on (feedback: it must stop, not keep following).
        const last = ghost[ghost.length - 1];
        const endTime = last[0] / 10;
        const recordedToTheEnd = ghost.length < 1800;
        if (recordedToTheEnd && state.elapsed > endTime + 0.05) {
            const since = state.elapsed - endTime;
            const ground = VIEW.height - BIRD.height - 40;
            const y = Math.min(ground, last[1] - BIRD.height / 2 + 0.5 * 1500 * since * since);
            const x = BIRD.x - (state.challenge ? 24 : 10) - since * BertProgression.scrollPixelsPerSecond(state.speed);
            if (x < -BIRD.width * 2) return;
            ctx.save();
            ctx.globalAlpha = state.challenge ? 0.3 : 0.28;
            ctx.translate(x + BIRD.width / 2, y + BIRD.height / 2);
            ctx.rotate(Math.min(1.4, since * 3));
            drawHeroAnimation(hero, endTime, false, -BIRD.width / 2, -BIRD.height / 2, BIRD.width, BIRD.height);
            ctx.restore();
            if (y >= ground) {
                // Landed: a small marker where the old run ended.
                ctx.save();
                ctx.globalAlpha = 0.75;
                if (assets.g6RecordFlag?.naturalWidth) ctx.drawImage(assets.g6RecordFlag, x + BIRD.width * 0.6, ground + BIRD.height - 54, 30, 38);
                ctx.font = '900 13px "Bert Rounded", sans-serif';
                ctx.fillStyle = '#ffffff';
                ctx.strokeStyle = 'rgba(27,42,68,.7)';
                ctx.lineWidth = 4;
                ctx.textAlign = 'center';
                const label = state.challenge ? T('UDFORDRER') : T('REKORD');
                ctx.strokeText(label, x + BIRD.width / 2, ground + 6);
                ctx.fillText(label, x + BIRD.width / 2, ground + 6);
                ctx.restore();
            }
            return;
        }
        if (!state.challenge) {
            // The record ghost: a faint copy of you, with a tiny "REKORD" tag.
            ctx.save();
            ctx.globalAlpha = 0.22;
            drawHeroAnimation(hero, state.elapsed, false, BIRD.x - 10, centerY - BIRD.height / 2, BIRD.width, BIRD.height);
            ctx.globalAlpha = 0.6;
            ctx.font = '900 13px "Bert Rounded", sans-serif';
            ctx.fillStyle = '#ffffff';
            ctx.textAlign = 'center';
            ctx.fillText(T('REKORD'), BIRD.x - 10 + BIRD.width / 2, centerY - BIRD.height / 2 - 4);
            if (assets.g6RecordFlag?.naturalWidth) ctx.drawImage(assets.g6RecordFlag, BIRD.x - 34, centerY - BIRD.height / 2 - 34, 26, 32);
            ctx.restore();
            return;
        }
        ctx.save();
        ctx.globalAlpha = 0.24;
        ctx.filter = 'grayscale(1) brightness(1.65)';
        drawHeroAnimation(hero, state.elapsed, false, BIRD.x - 24, centerY - BIRD.height / 2, BIRD.width, BIRD.height);
        ctx.filter = 'none';
        ctx.strokeStyle = 'rgba(255,255,255,.28)';
        ctx.setLineDash([10, 12]);
        ctx.beginPath();
        ctx.moveTo(BIRD.x - 140, centerY);
        ctx.lineTo(BIRD.x - 28, centerY);
        ctx.stroke();
        ctx.restore();
    }

    function drawParticles() {
        particles.forEach((particle) => {
            ctx.save();
            ctx.globalAlpha = Math.max(0, particle.life / particle.maxLife);
            ctx.translate(particle.x, particle.y);
            ctx.rotate(particle.rotation || 0);
            if (particle.sprite && assets[particle.sprite]) {
                const size = particle.size * 4;
                ctx.drawImage(assets[particle.sprite], -size / 2, -size / 2, size, size);
            } else {
                ctx.fillStyle = particle.color;
                ctx.beginPath();
                ctx.arc(0, 0, particle.size, 0, Math.PI * 2);
                ctx.fill();
            }
            ctx.restore();
        });
    }

    function drawBirdRunWarnings() {
        if (currentLevel.kind !== 'birdRun' || state.phase !== 'playing') return;
        obstacles.filter((obstacle) => obstacle.kind === 'bird-run-bird'
            && obstacle.direction === 'rear' && obstacle.warningRemaining > 0).forEach((obstacle) => {
            const y = obstacle.y + obstacle.height / 2;
            const panelWidth = obstacle.predator ? 280 : 181;
            ctx.save();
            ctx.fillStyle = 'rgba(18, 62, 82, 0.92)';
            ctx.strokeStyle = obstacle.predator ? '#ffd365' : '#f4bd67';
            ctx.lineWidth = 3;
            ctx.beginPath();
            if (typeof ctx.roundRect === 'function') ctx.roundRect(14, y - 31, panelWidth, 62, 13);
            else ctx.rect(14, y - 31, panelWidth, 62);
            ctx.fill();
            ctx.stroke();
            ctx.fillStyle = '#fff4d4';
            ctx.font = '900 16px "Bert Rounded", sans-serif';
            ctx.fillText(obstacle.predator ? T('ROVFUGL BAGFRA') : T('FUGL BAGFRA'), 27, y - 5);
            ctx.fillStyle = '#f4bd67';
            ctx.font = '800 13px "Bert Rounded", sans-serif';
            ctx.fillText(obstacle.predator
                ? T`FØLGER DIG KORT · ${obstacle.warningRemaining.toFixed(1)}s`
                : obstacle.pathTravel < 0 ? T('STIGER') : T('DYKKER'), 27, y + 16);
            ctx.beginPath();
            ctx.moveTo(14 + panelWidth - 19, y);
            ctx.lineTo(14 + panelWidth - 34, y - 10);
            ctx.lineTo(14 + panelWidth - 34, y + 10);
            ctx.closePath();
            ctx.fill();
            ctx.restore();
        });
    }

    function drawRelayCourse() {
        if (currentLevel.kind !== 'skyRelay' || !state.relayRoute
            || !['prewarm', 'playing', 'relay-finish'].includes(state.phase)) return;
        const centerX = BertCollision.bertCollider(bird, BIRD).x;
        ctx.save();
        const route = state.relayRoute;
        route.gates.forEach((gate, index) => {
            const pose = BertSkyRelay.gatePose(gate, state.worldTime);
            const x = centerX + pose.worldDistance - state.worldDistance;
            if (x < -200 || x > VIEW.width + 200) return;
            const size = 350 * (gate.scale || 1);
            if (assets.relayGate?.naturalWidth) {
                // New art: a passed gate glows gold; a hit gate turns into the dark sky ring.
                const passed = state.relayGates[index]?.passed;
                const hit = state.relayResult?.outcome === 'ring-hit' && !passed && state.relayHitGate === index;
                const art = hit && assets.relaySkyRing?.naturalWidth ? assets.relaySkyRing
                    : passed && assets.relayGateLit?.naturalWidth ? assets.relayGateLit : assets.relayGate;
                ctx.drawImage(art, x - size / 2, pose.centerY - size * 0.47, size, size);
            }
        });
        const target = { ...route.target, centerY: BertSkyRelay.targetPose(route.target, state.worldTime).centerY };
        const x = centerX + target.worldDistance - state.worldDistance;
        if (x >= -target.width && x <= VIEW.width + target.width) {
            const top = target.centerY - target.height * 0.69;
            if (assets.relayChime?.naturalWidth) {
                ctx.drawImage(assets.relayChime, x - target.width / 2, top, target.width, target.height);
            }
            // This thin highlight sits ON the painted gold plate; it is not a wall.
            ctx.strokeStyle = 'rgba(255, 250, 186, 0.73)';
            ctx.lineWidth = 3;
            ctx.beginPath();
            ctx.arc(x, target.centerY, target.contactRadius - 6, 0, Math.PI * 2);
            ctx.stroke();
            ctx.textAlign = 'center';
            ctx.font = '900 25px "Bert Rounded", sans-serif';
            ctx.lineWidth = 6;
            ctx.strokeStyle = 'rgba(53, 79, 80, 0.9)';
            ctx.fillStyle = '#fff2b4';
            ctx.strokeText(T('RAM GULDPLADEN'), x, target.centerY + 130);
            ctx.fillText(T('RAM GULDPLADEN'), x, target.centerY + 130);
        }
        ctx.restore();
    }

    function drawRelayNearEdge() {
        if (assets.relayGate?.src?.includes('/g4/')) { drawRelayFrontRim(); return; }
        if (currentLevel.kind !== 'skyRelay' || !state.relayRoute
            || !assets.relayGateFront?.naturalWidth
            || !['prewarm', 'playing', 'relay-finish'].includes(state.phase)) return;
        const centerX = BertCollision.bertCollider(bird, BIRD).x;
        ctx.save();
        state.relayRoute.gates.forEach((gate, index) => {
            const pose = BertSkyRelay.gatePose(gate, state.worldTime);
            const x = centerX + pose.worldDistance - state.worldDistance;
            if (x < -200 || x > VIEW.width + 200) return;
            // The near-right rim is a DISTINCT alpha sprite shifted toward the
            // approaching bird. Bert visibly passes behind it, without collision.
            const scale = gate.scale || 1;
            const size = 350 * scale;
            ctx.globalAlpha = state.relayGates[index]?.passed ? 0.68 : 1;
            ctx.drawImage(assets.relayGateFront, x - size / 2 - 38 * scale, pose.centerY - size * 0.47,
                size, size);
        });
        ctx.restore();
    }

    // The new one-piece gate art: draw its near (left) rim again on top of Bert, so he
    // visibly flies THROUGH the ring rather than across it (feedback 10. okt.).
    function drawRelayFrontRim() {
        if (currentLevel.kind !== 'skyRelay' || !state.relayRoute
            || !['prewarm', 'playing', 'relay-finish'].includes(state.phase)) return;
        const centerX = BertCollision.bertCollider(bird, BIRD).x;
        state.relayRoute.gates.forEach((gate, index) => {
            const pose = BertSkyRelay.gatePose(gate, state.worldTime);
            const x = centerX + pose.worldDistance - state.worldDistance;
            if (x < -300 || x > VIEW.width + 300) return;
            const size = 350 * (gate.scale || 1);
            const passed = state.relayGates[index]?.passed;
            const art = passed && assets.relayGateLit?.naturalWidth ? assets.relayGateLit : assets.relayGate;
            if (!art?.naturalWidth) return;
            ctx.save();
            ctx.beginPath();
            ctx.rect(x - size / 2, pose.centerY - size, size * 0.27, size * 2);
            ctx.clip();
            ctx.drawImage(art, x - size / 2, pose.centerY - size * 0.47, size, size);
            ctx.restore();
        });
    }

    function drawRelayLabels() {
        if (currentLevel.kind !== 'skyRelay' || !state.relayRoute
            || !['prewarm', 'playing', 'relay-finish'].includes(state.phase)) return;
        const centerX = BertCollision.bertCollider(bird, BIRD).x;
        ctx.save();
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.font = '900 23px "Bert Rounded", sans-serif';
        ctx.lineWidth = 5;
        ctx.strokeStyle = 'rgba(25, 75, 106, 0.87)';
        ctx.fillStyle = '#fff8dc';
        state.relayRoute.gates.forEach((gate, index) => {
            const pose = BertSkyRelay.gatePose(gate, state.worldTime);
            const x = centerX + pose.worldDistance - state.worldDistance;
            if (x < -200 || x > VIEW.width + 200) return;
            const round = state.relayRoute.round || 1;
            const label = state.relayGates[index]?.passed ? T('RAMT')
                : round > 1 ? `RUNDE ${round} · PORT ${index + 1}/3` : `PORT ${index + 1}/3`;
            const labelY = pose.centerY + 179 * (gate.scale || 1);
            ctx.strokeText(label, x, labelY);
            ctx.fillText(label, x, labelY);
        });
        ctx.restore();
    }

    function render() {
        ctx.clearRect(0, 0, VIEW.width, VIEW.height);
        ctx.save();
        if (state.shake > 0 && !prefersReducedMotion()) {
            const amp = state.shake * state.shake * 14;
            ctx.translate((Math.random() - 0.5) * amp, (Math.random() - 0.5) * amp);
        }
        // Spejlbanen: the whole world is drawn mirrored, so Bert flies to the left.
        ctx.save();
        if (state.mirror) { ctx.translate(VIEW.width, 0); ctx.scale(-1, 1); }
        drawBackground();
        drawDepthHaze();
        drawAmbient();
        drawRelayCourse();
        obstacles.forEach(drawObstacle);
        drawEDMSmoke();
        drawBirdRunWarnings();
        drawEnemyCapture();
        collectibles.forEach(drawCollectible);
        drawPowerupAura();
        if (opMode() && ['prewarm', 'playing'].includes(state.phase)) {
            const cx = bird.x + BIRD.width / 2;
            const cy = bird.y + BIRD.height / 2;
            const flash = state.elapsed < (state.opFlashUntil || 0);
            ctx.save();
            ctx.globalAlpha = flash ? 0.9 : 0.45 + 0.1 * Math.sin(state.worldTime * 4);
            ctx.strokeStyle = flash ? '#ffffff' : '#7fe8ff';
            ctx.lineWidth = flash ? 7 : 5;
            ctx.beginPath(); ctx.arc(cx, cy, BIRD.width * 0.62, 0, Math.PI * 2); ctx.stroke();
            ctx.globalAlpha = 0.9;
            ctx.font = '900 18px "Bert Rounded", sans-serif';
            ctx.fillStyle = '#7fe8ff';
            ctx.strokeStyle = 'rgba(10, 20, 35, .85)';
            ctx.lineWidth = 4;
            ctx.textAlign = 'left';
            const label = T('OP · EVIGT SKJOLD · INGEN REKORDER');
            ctx.strokeText(label, 24, 108);
            ctx.fillText(label, 24, 108);
            ctx.restore();
        }
        drawSmokeFog();
        drawArtEffects(1 / 60);
        if (currentLevel.kind === 'tunnel' && state.phase === 'playing' && state.elapsed < 6) {
            // Tunnel is hard at first: a short steering hint instead of the old dashed line.
            const fade = state.elapsed < 5 ? 1 : 6 - state.elapsed;
            const label = T('FØLG TUNNELEN · HOLD VENSTRE = OP · HØJRE = NED');
            ctx.save();
            ctx.globalAlpha = fade * 0.95;
            ctx.font = '900 20px "Bert Rounded", sans-serif';
            ctx.textAlign = 'center';
            const width = ctx.measureText(label).width + 44;
            ctx.fillStyle = 'rgba(10, 24, 40, .78)';
            ctx.beginPath(); ctx.roundRect(VIEW.width / 2 - width / 2, 150, width, 44, 22); ctx.fill();
            ctx.fillStyle = '#9ff7ff';
            ctx.fillText(label, VIEW.width / 2, 180);
            ctx.restore();
        }
        drawGhost();
        if (state.activePowerup === POWERUP.HYPER && state.phase === 'playing' && assets.g4Trail?.naturalWidth) {
            ctx.save(); ctx.globalAlpha = 0.75;
            ctx.drawImage(assets.g4Trail, bird.x - 200, bird.y + BIRD.height * 0.3, 230, 60);
            ctx.restore();
        }
        if (state.birdsVisible && state.phase === 'playing' && !['tunnel', 'skyRelay', 'stormline', 'birdRun', 'edm'].includes(currentLevel.kind)) {
            // A soft shadow on the ground under Bert, so height reads at a glance.
            const groundY = VIEW.height - 34;
            const height = clamp((groundY - (bird.y + BIRD.height)) / groundY, 0, 1);
            // Only near the ground: higher up the shadow fades away completely (feedback 10. okt.).
            const near = clamp(1 - height / 0.45, 0, 1);
            if (near <= 0) { /* too high to cast a visible shadow */ } else {
            ctx.save();
            ctx.globalAlpha = 0.3 * near;
            ctx.fillStyle = '#1b2a44';
            ctx.beginPath();
            ctx.ellipse(bird.x + BIRD.width / 2, groundY, 44 * (0.5 + near * 0.5), 9 * (0.5 + near * 0.5), 0, 0, Math.PI * 2);
            ctx.fill();
            ctx.restore();
            }
        }
        if (currentLevel.swarm && state.swarm?.length && state.phase === 'playing') {
            // Followers fly in a V behind Bert, each a little later along his path.
            state.birdTrail.unshift(bird.y);
            state.birdTrail.length = Math.min(state.birdTrail.length, 80);
            state.swarm.forEach((follower, index) => {
                const lag = Math.min(state.birdTrail.length - 1, (index + 1) * 6);
                const side = index % 2 === 0 ? -1 : 1;
                const row = Math.floor(index / 2) + 1;
                follower.x = bird.x - 44 * row;
                follower.y = state.birdTrail[lag] + side * 34 * row * 0.6;
                drawHeroAnimation(follower.hero, bird.animationTime + index * 0.13, false, follower.x, follower.y + 14, BIRD.width * 0.55, BIRD.height * 0.55);
            });
        }
        if (state.birdsVisible && state.phase !== 'menu' && state.phase !== 'levels' && state.phase !== 'gameover') drawBird();
        if (state.imageFx?.length) {
            // Short picture effects (round 7): a bird joins or leaves the swarm.
            state.imageFx = state.imageFx.filter((fx) => (fx.age += 1 / 60) < 0.6);
            state.imageFx.forEach((fx) => {
                const art = assets[fx.key];
                if (!art?.naturalWidth) return;
                const k = 0.6 + fx.age;
                ctx.save();
                ctx.globalAlpha = 1 - fx.age / 0.6;
                ctx.drawImage(art, fx.x - 60 * k, fx.y - 60 * k, 120 * k, 120 * k);
                ctx.restore();
            });
        }
        drawRelayNearEdge();
        drawRelayLabels();
        drawLavaFloor();
        drawPoopWorld();
        drawWindGust();
        drawNightDarkness();
        drawParticles();
        // The shallow top/bottom set pieces are *in front* of Bert, not just
        // decorative scenery behind him. Only the outer, non-playable bands cover him.
        drawForeground();
        drawEDMFrontLasers();
        if (state.deathBonk && assets.g6Bonk?.naturalWidth) {
            const b = state.deathBonk;
            b.age += 1 / 60;
            if (b.age > 0.7) state.deathBonk = null;
            else {
                const k = b.age < 0.1 ? b.age / 0.1 : 1;
                ctx.save();
                ctx.globalAlpha = b.age > 0.5 ? (0.7 - b.age) / 0.2 : 1;
                ctx.translate(b.x, b.y);
                ctx.rotate(b.age * 2);
                ctx.drawImage(assets.g6Bonk, -60 * k, -60 * k, 120 * k, 120 * k);
                ctx.restore();
            }
        }
        ctx.restore();
        drawFlyingPickups();
        drawComboText();
        if (DEBUG_COLLIDERS && state.phase !== 'menu' && state.phase !== 'levels') {
            BertCollision.drawDebug(ctx, BertCollision.bertCollider(bird, BIRD), obstacles.filter((obstacle) => obstacle.harmful));
        }
        ctx.restore();
    }

    // ---------- Feel: stars fly to the counter, combo text, ambient particles ----------
    const HUD_SCORE_TARGET = { x: 450, y: 46 };
    function drawFlyingPickups() {
        if (!state.flyingPickups?.length) return;
        const dt = 1 / 60;
        ctx.save();
        state.flyingPickups.forEach((fx) => {
            fx.age += dt;
            const t = Math.min(1, fx.age / 0.45);
            const e = t * t * (3 - 2 * t);
            const x = fx.x + (fx.tx - fx.x) * e;
            const y = fx.y + (fx.ty - fx.y) * e - Math.sin(t * Math.PI) * 60;
            const size = 34 * (1 - t * 0.55);
            const art = fx.kind === 'feather' ? assets.goldFeather : assets.star;
            ctx.globalAlpha = 1 - t * 0.3;
            if (art?.naturalWidth) ctx.drawImage(art, x - size / 2, y - size / 2, size, size);
            if (t >= 1 && !fx.landed) {
                fx.landed = true;
                dom.score?.animate?.([{ transform: 'scale(1)' }, { transform: 'scale(1.25)' }, { transform: 'scale(1)' }], { duration: 220 });
            }
        });
        state.flyingPickups = state.flyingPickups.filter((fx) => fx.age < 0.5);
        ctx.restore();
    }
    // Combo text stays out of star-heavy modes (Tunnel, Sky Relay, magnet), per Martin.
    const COMBO_STEPS = [[5, 'FLOT!'], [10, 'PERFEKT!'], [20, 'UTROLIGT!'], [30, 'LEGENDARISK!'], [50, 'BERT-NIVEAU!']];
    function noteCombo(streak) {
        if (['tunnel', 'skyRelay'].includes(currentLevel.kind) || state.activePowerup === POWERUP.MAGNET) return;
        const step = COMBO_STEPS.find(([count]) => count === streak);
        if (!step) return;
        state.comboText = { text: T(step[1]), age: 0 };
        playAudio('combo');
        BertMeta.haptic?.('powerup');
    }
    function drawComboText() {
        const combo = state.comboText;
        if (!combo) return;
        combo.age += 1 / 60;
        const t = combo.age / 0.9;
        if (t >= 1) { state.comboText = null; return; }
        const pop = t < 0.15 ? 0.6 + (t / 0.15) * 0.5 : 1.1 - (t - 0.15) * 0.1;
        ctx.save();
        // Top centre, under the HUD, so it never sits on top of Bert (feedback).
        ctx.translate(VIEW.width / 2, 150 - t * 20);
        ctx.scale(pop, pop);
        ctx.rotate(-0.08);
        ctx.globalAlpha = t > 0.7 ? (1 - t) / 0.3 : 1;
        if (combo.levelUp && assets.g6LevelUp?.naturalWidth) {
            ctx.drawImage(assets.g6LevelUp, -200, -78, 400, 125);
        } else if (assets.g4ComboBurst?.naturalWidth) {
            ctx.save(); ctx.globalAlpha *= 0.85; ctx.rotate(t * 1.5);
            ctx.drawImage(assets.g4ComboBurst, -110, -110, 220, 220);
            ctx.restore();
        }
        ctx.font = '900 34px "Bert Display", "Bert Rounded", sans-serif';
        ctx.textAlign = 'center';
        ctx.lineWidth = 7;
        ctx.strokeStyle = '#1b2a44';
        ctx.fillStyle = '#ffd93b';
        ctx.strokeText(combo.text, 0, 0);
        ctx.fillText(combo.text, 0, 0);
        ctx.restore();
    }
    // Ambient particles: a few dozen soft shapes per world, cheap and alive.
    const AMBIENT = {
        desert: { count: 26, color: 'rgba(255, 226, 150, .55)', size: [2, 4], vx: [-160, -90], vy: [-6, 6], shape: 'dot', art: 'g4AmbDust' },
        jungle: { count: 18, color: 'rgba(214, 255, 120, .9)', size: [2, 3.5], vx: [-30, 10], vy: [-14, 14], shape: 'glow', blink: true, art: 'g4AmbFirefly' },
        happySky: { count: 22, color: 'rgba(255, 255, 255, .7)', size: [2, 4], vx: [-60, -20], vy: [-10, 10], shape: 'dot' },
        flappy: { count: 16, color: 'rgba(255, 240, 200, .45)', size: [1.5, 3], vx: [-120, -60], vy: [-6, 6], shape: 'dot' },
        tunnel: { count: 24, color: 'rgba(190, 240, 255, .8)', size: [1.5, 3], vx: [-40, -10], vy: [-8, 8], shape: 'glow', blink: true },
        iceberg: { count: 40, color: 'rgba(255, 255, 255, .85)', size: [2, 4.5], vx: [-70, -20], vy: [30, 70], shape: 'flake', art: 'g4AmbSnow' },
        volcano: { count: 30, color: 'rgba(255, 150, 60, .85)', size: [1.5, 3.5], vx: [-60, 10], vy: [-70, -25], shape: 'glow', blink: true, art: 'g4AmbEmber' },
        harbor: { count: 14, color: 'rgba(255, 255, 255, .5)', size: [2, 3], vx: [-90, -40], vy: [-10, 10], shape: 'dot' },
        nightcity: { count: 20, color: 'rgba(255, 220, 130, .8)', size: [1.5, 2.5], vx: [-20, 10], vy: [-12, 12], shape: 'glow', blink: true },
        windfarm: { count: 16, color: 'rgba(120, 200, 90, .85)', size: [3, 5], vx: [-220, -120], vy: [-20, 40], shape: 'leaf', art: 'g4AmbLeaf' },
        poop: { count: 14, color: 'rgba(255, 255, 255, .45)', size: [2, 3], vx: [-80, -40], vy: [-6, 6], shape: 'dot' },
        edm: { count: 28, color: null, size: [2, 4], vx: [-40, 40], vy: [40, 90], shape: 'confetti', art: 'g4AmbConfetti' },
        birdRun: { count: 18, color: 'rgba(255, 255, 255, .6)', size: [2, 3.5], vx: [-80, -30], vy: [-8, 8], shape: 'dot' },
        skyRelay: { count: 18, color: 'rgba(255, 255, 255, .6)', size: [2, 3.5], vx: [-80, -30], vy: [-8, 8], shape: 'dot' },
        stormline: { count: 22, color: 'rgba(120, 200, 90, .85)', size: [3, 5], vx: [-320, -180], vy: [-30, 50], shape: 'leaf', art: 'g4AmbLeaf' },
    };
    const CONFETTI_COLORS = ['rgba(255,110,220,.9)', 'rgba(90,230,255,.9)', 'rgba(255,230,90,.9)'];
    const PERF_FLAGS = new URLSearchParams(location.search).get('perf') || '';
    function updateAmbient(delta) {
        const cfg = PERF_FLAGS.includes('noamb') ? null : AMBIENT[currentLevel.kind];
        if (!cfg || prefersReducedMotion()) { state.ambient = []; return; }
        state.ambient ||= [];
        const spawn = () => {
            const fromRight = cfg.vx[1] < -40;
            return { x: fromRight ? VIEW.width + 10 : Math.random() * VIEW.width, y: cfg.vy[0] > 20 ? -10 : cfg.vy[1] < -20 ? VIEW.height + 10 : Math.random() * VIEW.height,
                vx: cfg.vx[0] + Math.random() * (cfg.vx[1] - cfg.vx[0]), vy: cfg.vy[0] + Math.random() * (cfg.vy[1] - cfg.vy[0]),
                size: cfg.size[0] + Math.random() * (cfg.size[1] - cfg.size[0]), phase: Math.random() * Math.PI * 2, color: cfg.color || CONFETTI_COLORS[Math.floor(Math.random() * 3)], spin: Math.random() * 6 };
        };
        while (state.ambient.length < cfg.count) {
            const p = spawn();
            if (state.ambient.length < cfg.count / 2) { p.x = Math.random() * VIEW.width; p.y = Math.random() * VIEW.height; }
            state.ambient.push(p);
        }
        const scroll = BertProgression.scrollPixelsPerSecond(state.speed) * 0.25;
        state.ambient.forEach((p) => {
            p.x += (p.vx - scroll) * delta;
            p.y += (p.vy + Math.sin(state.worldTime * 1.3 + p.phase) * 12) * delta;
            p.phase += delta;
            if (p.x < -20 || p.x > VIEW.width + 20 || p.y < -20 || p.y > VIEW.height + 20) Object.assign(p, spawn());
        });
    }
    function drawAmbient() {
        const cfg = AMBIENT[currentLevel.kind];
        if (!cfg || !state.ambient?.length) return;
        ctx.save();
        state.ambient.forEach((p) => {
            const blink = cfg.blink ? 0.4 + 0.6 * Math.abs(Math.sin(state.worldTime * 2.2 + p.phase * 3)) : 1;
            ctx.globalAlpha = blink;
            ctx.fillStyle = p.color;
            const art = cfg.art ? assets[cfg.art] : null;
            if (art?.naturalWidth) {
                const size = p.size * 4.5;
                ctx.save(); ctx.translate(p.x, p.y);
                if (cfg.shape === 'leaf' || cfg.shape === 'confetti' || cfg.shape === 'flake') ctx.rotate(p.phase * p.spin * 0.3);
                ctx.drawImage(art, -size / 2, -size / 2, size, size);
                ctx.restore();
            } else if (cfg.shape === 'glow') {
                const g = ctx.createRadialGradient(p.x, p.y, 0, p.x, p.y, p.size * 3);
                g.addColorStop(0, p.color); g.addColorStop(1, 'rgba(0,0,0,0)');
                ctx.fillStyle = g;
                ctx.beginPath(); ctx.arc(p.x, p.y, p.size * 3, 0, Math.PI * 2); ctx.fill();
            } else if (cfg.shape === 'leaf' || cfg.shape === 'confetti') {
                ctx.save(); ctx.translate(p.x, p.y); ctx.rotate(p.phase * p.spin * 0.3);
                ctx.fillRect(-p.size, -p.size * 0.45, p.size * 2, p.size * 0.9);
                ctx.restore();
            } else if (cfg.shape === 'flake') {
                ctx.beginPath(); ctx.arc(p.x, p.y, p.size, 0, Math.PI * 2); ctx.fill();
            } else {
                ctx.beginPath(); ctx.arc(p.x, p.y, p.size, 0, Math.PI * 2); ctx.fill();
            }
        });
        ctx.restore();
    }

    function burst(x, y, color, count, sprite = null) {
        // Dense Star Stream/Magnet streaks should not accumulate hundreds of canvas paths.
        const available = Math.min(count, Math.max(0, 96 - particles.length));
        for (let index = 0; index < available; index += 1) {
            const angle = gameRandom() * Math.PI * 2;
            const speed = randomBetween(80, 280);
            particles.push({
                x, y,
                vx: Math.cos(angle) * speed,
                vy: Math.sin(angle) * speed,
                size: randomBetween(2, 6),
                color,
                sprite,
                rotation: gameRandom() * Math.PI * 2,
                angularVelocity: randomBetween(-8, 8),
                life: randomBetween(0.35, 0.85),
                maxLife: 0.85,
            });
        }
    }

    function birdCenter() {
        return { x: bird.x + BIRD.width / 2, y: bird.y + BIRD.height / 2 };
    }

    function circleHitsRect(center, radius, rectangle) {
        const closestX = clamp(center.x, rectangle.x, rectangle.x + rectangle.width);
        const closestY = clamp(center.y, rectangle.y, rectangle.y + rectangle.height);
        const dx = center.x - closestX;
        const dy = center.y - closestY;
        return dx * dx + dy * dy < radius * radius;
    }

    function clamp(value, min, max) {
        return Math.min(Math.max(value, min), max);
    }

    function lerp(from, to, amount) {
        return from + (to - from) * amount;
    }

    function gameRandom() {
        state.rngState = (state.rngState + 0x6D2B79F5) >>> 0;
        let value = state.rngState;
        value = Math.imul(value ^ (value >>> 15), value | 1);
        value ^= value + Math.imul(value ^ (value >>> 7), value | 61);
        return ((value ^ (value >>> 14)) >>> 0) / 4294967296;
    }

    function randomBetween(min, max) {
        return min + gameRandom() * (max - min);
    }

    function formatTime(seconds) {
        const minutes = Math.floor(seconds / 60);
        const remaining = Math.floor(seconds % 60);
        return `${minutes}:${String(remaining).padStart(2, '0')}`;
    }

    function logicalPointerX(event) {
        const rect = dom.canvas.getBoundingClientRect();
        return clamp(((event.clientX - rect.left) / rect.width) * VIEW.width, 0, VIEW.width);
    }

    function setTouchDirection(event) {
        const pointerX = logicalPointerX(event);
        const midpoint = VIEW.width / 2;
        const neutralBand = VIEW.width * 0.04;
        state.inputUp = pointerX < midpoint - neutralBand;
        state.inputDown = pointerX > midpoint + neutralBand;
        state.inputStrength = 1;
        dom.touchUp.classList.toggle('active', state.inputUp);
        dom.touchDown.classList.toggle('active', state.inputDown);
    }

    // Every finger on the screen is tracked. The newest finger still held decides
    // the direction, so pressing the other side before letting go (two thumbs)
    // never leaves Bert without input. Before: releasing the second thumb cleared
    // everything even though the first was still down, and Bert just fell.
    const heldPointers = new Map();
    function applyHeldDirection() {
        if (usingFlapControl() || !heldPointers.size) {
            state.pointerHeld = heldPointers.size > 0;
            state.activePointerId = null;
            state.inputUp = false;
            state.inputDown = false;
            state.inputStrength = 1;
            dom.touchUp?.classList.remove('active');
            dom.touchDown?.classList.remove('active');
            return;
        }
        const [pointerId, pointerX] = [...heldPointers].at(-1);
        state.pointerHeld = true;
        state.activePointerId = pointerId;
        const midpoint = VIEW.width / 2;
        const neutralBand = VIEW.width * 0.04;
        state.inputUp = pointerX < midpoint - neutralBand;
        state.inputDown = pointerX > midpoint + neutralBand;
        state.inputStrength = 1;
        dom.touchUp?.classList.toggle('active', state.inputUp);
        dom.touchDown?.classList.toggle('active', state.inputDown);
    }

    function clearTouchDirection(event) {
        if (event?.pointerId != null) heldPointers.delete(event.pointerId);
        else if (!event) heldPointers.clear();
        applyHeldDirection();
    }

    function flap() {
        bird.velocity = isReversed() ? 560 : -560;
        bird.rotation = isReversed() ? 22 : -22;
    }

    function usingFlapControl() {
        return BertEventPowerups.isFlap(currentLevel.mode, state.activePowerup);
    }

    function pauseGame() {
        if (!['prewarm', 'playing'].includes(state.phase)) return;
        state.pausedFrom = state.phase;
        state.phase = 'paused';
        clearTouchDirection();
        activeLevelMusic()?.pause();
        audio.focus?.pause();
        audio.magnetRunning?.pause();
        setVisible(dom.pauseMenu, true);
    }

    function resumeGame() {
        if (state.phase !== 'paused') return;
        state.phase = state.pausedFrom || 'playing';
        state.pausedFrom = null;
        setVisible(dom.pauseMenu, false);
        lastFrame = performance.now();
        simulationAccumulator = 0;
        if (state.phase === 'playing' && BertMeta.settingEnabled('music')) {
            if (['enter', 'active', 'exit'].includes(state.focusPhase)) audio.focus?.play().catch(() => {});
            if (state.focusPhase !== 'active') activeLevelMusic()?.play().catch(() => {});
        }
        if (state.activePowerup === POWERUP.MAGNET && BertMeta.settingEnabled('sfx')) audio.magnetRunning?.play().catch(() => {});
    }

    function openSettings() {
        updateMetaMenu();
        setVisible(dom.settingsModal, true);
    }

    function closeSettings() {
        setVisible(dom.settingsModal, false);
    }

    function applySetting(name, enabled) {
        BertMeta.setSetting(name, enabled);
        if (name === 'music') {
            if (!enabled) {
                audio.menu?.pause();
                audio.edm?.pause();
                activeLevelMusic()?.pause();
                audio.focus?.pause();
            } else if (state.phase === 'menu') {
                playAudio('menu');
            } else if (state.phase === 'playing') {
                primeFocusAudio();
                if (['enter', 'active', 'exit'].includes(state.focusPhase)) playAudio('focus');
                if (state.focusPhase !== 'active') playAudio(levelMusicName());
            }
        }
        updateMetaMenu();
    }

    function startQuickFlight() {
        const levelId = BertMeta.nextQuickLevel(unlockedLevels().map((level) => level.id));
        startLevel(levelId);
    }

    function startDailyRoute() {
        const daily = BertMeta.dailyChallenge(new Date(), unlockedLevels().map((level) => level.id));
        startLevel(daily.levelId, { dailyKey: daily.key, dailyTarget: daily.target, seed: daily.seed });
    }

    function modeForLevel(level = currentLevel) {
        return level.modeGroup || (level.kind === 'tunnel' ? 'tunnel' : level.mode === MODE.FLAPPY ? 'flappy' : 'classic');
    }

    function boardValue(row, metric) {
        if (metric === 'time') return formatTime(Number(row.time_seconds ?? row.time) || 0);
        if (metric === 'streak') return `x${Number(row.streak) || 0}`;
        return String(Number(row.score) || 0);
    }

    function syncLeaderboardLevels() {
        const selected = dom.boardLevel.value || 'all';
        const mode = dom.boardMode.value;
        const candidates = UNITY_LEVELS.filter((level) => mode === 'all' || level.modeGroup === mode);
        dom.boardLevel.replaceChildren(new Option(T('Alle baner'), 'all'));
        candidates.forEach((level) => dom.boardLevel.add(new Option(`${level.modeOrder}. ${level.name}`, String(level.id))));
        dom.boardLevel.value = candidates.some((level) => String(level.id) === selected) ? selected : 'all';
    }

    async function refreshLeaderboard() {
        const filters = { period: dom.boardPeriod.value, mode: dom.boardMode.value, level: dom.boardLevel.value, metric: dom.boardMetric.value, scope: leaderboardScope };
        if (leaderboardScope === 'friends') filters.playerId = BertMeta.snapshot().player.id;
        const requestId = ++leaderboardRequestId;
        dom.leaderboardStatus.textContent = T('HENTER RESULTATER …');
        const result = await BertSocial.getLeaderboard(filters);
        if (requestId !== leaderboardRequestId) return;
        dom.leaderboardList.replaceChildren();
        (result.rows || []).forEach((row, index) => {
            const item = document.createElement('li');
            const rank = document.createElement('span');
            rank.className = 'rank'; rank.textContent = `#${row.rank || index + 1}`;
            const pilot = document.createElement('span');
            pilot.className = 'pilot'; pilot.textContent = row.player_name || row.playerName || 'Pilot';
            const mode = document.createElement('span');
            const boardLevel = UNITY_LEVELS.find((level) => level.id === Number(row.level_id ?? row.levelId));
            mode.className = 'mode'; mode.textContent = boardLevel?.name || row.mode || 'classic';
            const value = document.createElement('strong');
            value.className = 'value'; value.textContent = boardValue(row, filters.metric);
            item.append(rank, pilot, mode, value);
            dom.leaderboardList.appendChild(item);
        });
        dom.leaderboardStatus.textContent = result.offline
            ? T('KUN DINE LOKALE RESULTATER · ONLINE SCOREBOARD ER IKKE TILGÆNGELIGT')
            : filters.scope === 'friends'
                ? T`VENNER FRA DUELLER · ${result.rivalsCount} RIVALER · ${result.rows.length} RESULTATER`
                : `GLOBALT · ${result.rows.length} RESULTATER`;
        if (filters.scope === 'friends' && !result.offline && result.rivalsCount === 0) {
            dom.leaderboardStatus.textContent += T(' · SPIL EN VENNEDUEL FOR AT FÅ EN RIVAL');
        } else if (!result.rows?.length) {
            dom.leaderboardStatus.textContent += T(' · FLYV EN TUR FOR AT SÆTTE FØRSTE SCORE');
        }
    }

    function openLeaderboard() {
        setVisible(dom.leaderboardModal, true);
        syncLeaderboardLevels();
        refreshLeaderboard();
    }

    function renderNestExtras(nest) {
        const steps = document.getElementById('nest-steps');
        if (steps) {
            steps.replaceChildren(...nest.steps.map((step, index) => {
                const el = document.createElement('div');
                el.className = `nest-step ${index <= nest.level ? 'done' : index === nest.level + 1 ? 'next' : 'locked'}`;
                el.title = `${step.label} · ${step.cost} fjer`;
                const img = document.createElement('img');
                img.src = `assets/v2/g4/${step.icon.startsWith('nest-') ? 'menu' : 'nest'}/${step.icon}.webp`;
                img.alt = '';
                el.appendChild(img);
                return el;
            }));
        }
        const calendar = document.getElementById('nest-calendar');
        if (calendar) {
            const status = BertMeta.calendarStatus();
            calendar.replaceChildren(...status.rewards.map((reward, index) => {
                const el = document.createElement('div');
                const done = index < status.daysThisWeek;
                el.className = `cal-day${done ? ' done' : ''}${index === status.daysThisWeek && !status.today ? ' today' : ''}`;
                el.textContent = `+${reward}`;
                return el;
            }));
            const note = document.getElementById('calendar-note');
            if (note) note.textContent = status.streak ? T`${status.streak} dage i træk` : T('Én tur om dagen giver fjer');
        }
        renderEggs();
        const grid = document.getElementById('badge-grid');
        if (grid) {
            const badges = BertMeta.badgeList();
            const earned = badges.filter((badge) => badge.earned).length;
            const count = document.getElementById('badge-count');
            if (count) count.textContent = `${earned}/${badges.length}`;
            grid.replaceChildren(...badges.map((badge) => {
                const el = document.createElement('button');
                el.type = 'button';
                el.className = `badge${badge.earned ? '' : ' locked'}`;
                el.dataset.haptic = 'none';
                el.setAttribute('aria-label', `${badge.label}: ${badge.text}`);
                const img = document.createElement('img');
                img.src = `assets/v2/g4/nest/badges/${badge.id}.webp`;
                img.alt = '';
                el.appendChild(img);
                el.addEventListener('click', () => window.BertApp?.showToast(`${badge.label}: ${badge.text}`));
                return el;
            }));
        }
    }

    function renderEggs() {
        const section = document.getElementById('egg-section');
        const status = BertMeta.eggStatus?.();
        if (!section || !status) return;
        section.classList.toggle('hidden', !status.open);
        if (!status.open) return;
        const catalog = BertHeroStore.catalog;
        const name = (id) => catalog.find((hero) => hero.id === id)?.name || id;
        const view = document.getElementById('egg-view');
        const progress = document.getElementById('egg-progress');
        const note = document.getElementById('egg-note');
        const random = document.getElementById('egg-random');
        const secure = document.getElementById('egg-secure');
        const select = document.getElementById('egg-hero');
        view.className = `egg-view ${status.incubating ? `stage-${status.incubating.stage}` : 'empty'}`;
        const eggImg = view.querySelector('img.egg-art') || view.insertBefore(Object.assign(document.createElement('img'), { className: 'egg-art', alt: '' }), view.firstChild);
        eggImg.src = status.incubating ? `assets/v2/g5/egg/egg-${status.incubating.stage}.webp` : 'assets/v2/g5/egg/basket.webp';
        const basket = document.getElementById('nest-basket');
        if (basket) { basket.src = `assets/v2/g5/egg/${status.incubating ? 'basket-warm' : 'basket'}.webp`; basket.classList.toggle('hidden', !status.open); }
        if (status.incubating) {
            const egg = status.incubating;
            progress.textContent = T`${egg.progress}/${egg.need} STJERNER`;
            note.textContent = egg.secured ? T`Ruger: ${name(egg.hero)}` : T('Ruger et tilfældigt æg. Saml stjerner, så klækker det.');
        } else {
            progress.textContent = status.remaining ? T('TOM') : T('ALLE KLÆKKET');
            note.textContent = status.remaining ? T`${status.remaining} helte kan stadig klækkes` : T('Alle helte er klækket');
        }
        random.disabled = !status.canBuy;
        random.textContent = T`TILFÆLDIGT ÆG · ${status.price} FJER`;
        select.replaceChildren(...[...status.candidates.common, ...status.candidates.rare].map((id) => {
            const option = document.createElement('option');
            const rare = status.candidates.rare.includes(id);
            option.value = id;
            option.textContent = `${name(id)} · ${rare ? status.rareSecuredPrice : status.securedPrice} ${T('fjer')}${rare ? ` · ${T('sjælden')}` : ''}`;
            return option;
        }));
        const chosen = select.value;
        const securedCost = status.candidates.rare.includes(chosen) ? status.rareSecuredPrice : status.securedPrice;
        secure.disabled = Boolean(status.incubating) || !status.remaining || BertMeta.snapshot().feathers < securedCost;
        secure.textContent = T`SIKRET ÆG · ${securedCost} FJER`;
        select.onchange = () => renderEggs();
        random.onclick = () => {
            const result = BertMeta.buyEgg(null);
            if (result.ok) { playAudio('pop'); BertMeta.haptic('upgrade'); window.BertApp?.showToast(T('Et æg ligger i reden. Saml stjerner, så klækker det.')); }
            updateMetaMenu();
        };
        secure.onclick = () => {
            const result = BertMeta.buyEgg(select.value);
            if (result.ok) { playAudio('pop'); BertMeta.haptic('upgrade'); window.BertApp?.showToast(T`Et sikret æg med ${name(select.value)} ligger i reden`); }
            updateMetaMenu();
        };
    }

    function renderMissions() {
        dom.missionList.replaceChildren();
        const openIds = unlockedLevels().map((level) => level.id);
        BertMeta.missions(new Date(), openIds).forEach((mission) => {
            const row = document.createElement('div');
            row.className = `mission-row${mission.complete ? ' complete' : ''}${mission.claimed ? ' claimed' : ''}`;
            const title = document.createElement('strong'); title.textContent = mission.label;
            const track = document.createElement('span'); track.className = 'mission-track';
            const fill = document.createElement('i'); fill.style.width = `${Math.min(100, mission.value / mission.target * 100)}%`; track.appendChild(fill);
            const count = document.createElement('b'); count.textContent = `${mission.value}/${mission.target}`;
            const claim = document.createElement('button');
            claim.type = 'button';
            claim.className = 'mission-claim';
            claim.disabled = !mission.complete || mission.claimed;
            claim.textContent = mission.claimed ? T('HENTET') : mission.complete ? T`HENT +${mission.reward}` : T`+${mission.reward} FJER`;
            claim.addEventListener('click', () => {
                const result = BertMeta.claimMission(mission.id);
                if (result.ok) {
                    BertMeta.haptic('reward');
                    window.BertApp?.showToast(result.unlockedHeroes.length
                        ? T`+${result.reward} fjer · ${result.unlockedHeroes.join(', ')} låst op`
                        : T`+${result.reward} fjer til reden`);
                }
                updateMetaMenu();
                renderMissions();
            });
            claim.dataset.haptic = 'none';
            if (mission.difficulty) row.dataset.difficulty = mission.difficulty;
            row.append(title, track, count, claim); dom.missionList.appendChild(row);
        });
        renderChallengeBook(openIds);
        updateMetaMenu();
    }

    // Weekly challenges and the challenge book (milestones, mastery, hidden) in the nest.
    let bookTab = 'milestones';
    function challengeRow(entry, onClaim) {
        const row = document.createElement('div');
        row.className = `mission-row${entry.complete ? ' complete' : ''}${entry.claimed ? ' claimed' : ''}`;
        const title = document.createElement('strong');
        title.textContent = entry.hidden && !entry.complete ? T('??? (hemmelig udfordring)') : entry.label;
        const track = document.createElement('span'); track.className = 'mission-track';
        const fill = document.createElement('i'); fill.style.width = `${Math.min(100, entry.value / entry.target * 100)}%`; track.appendChild(fill);
        const count = document.createElement('b');
        count.textContent = entry.hidden ? (entry.complete ? '✓' : '') : `${Number(entry.value).toLocaleString('da-DK')}/${Number(entry.target).toLocaleString('da-DK')}`;
        const claim = document.createElement('button');
        claim.type = 'button'; claim.className = 'mission-claim'; claim.dataset.haptic = 'none';
        claim.disabled = !entry.complete || entry.claimed;
        claim.textContent = entry.claimed ? T('HENTET') : entry.complete ? T`HENT +${entry.reward}` : T`+${entry.reward} FJER`;
        claim.addEventListener('click', onClaim);
        row.append(title, track, count, claim);
        return row;
    }
    function openStickerAlbum() {
        const found = BertMeta.stickers?.() || {};
        document.getElementById('sticker-modal')?.remove();
        const modal = document.createElement('section');
        modal.id = 'sticker-modal'; modal.className = 'modal-backdrop';
        const card = document.createElement('div'); card.className = 'sticker-album';
        const sets = STICKER_BOOK.map(([levelId, set]) => [set, levelById(levelId)?.name || set]);
        card.innerHTML = `<button class="round-close" type="button" aria-label="${T('Luk')}">×</button><h2>${T('KLISTERMÆRKER')} · ${Object.keys(found).length}/${sets.length * 5}</h2>`
            + sets.map(([set, name]) => `<div class="sticker-row"><b>${name}</b>${[1, 2, 3, 4, 5].map((n) => {
                const id = `${set}_${n}`;
                const art = ['assets/v2/g6/stickers', `${set}-${n}.webp`].join('/');
                return `<span class="sticker-slot${found[id] ? ' found' : ''}"><img src="${art}" alt=""></span>`;
            }).join('')}</div>`).join('')
            + `<p>${T('Fem skjulte klistermærker i hver bane. Hold øje, mens du flyver.')}</p>`;
        card.querySelector('.round-close').addEventListener('click', () => modal.remove());
        modal.addEventListener('click', (event) => { if (event.target === modal) modal.remove(); });
        modal.appendChild(card);
        document.body.appendChild(modal);
    }

    function renderChallengeBook(openIds) {
        const weekly = document.getElementById('weekly-list');
        if (weekly) {
            weekly.replaceChildren(...BertMeta.weeklyChallenges(openIds).map((entry) => challengeRow(entry, () => {
                const result = BertMeta.claimWeekly(entry.id, openIds);
                if (result.ok) { BertMeta.haptic('reward'); playAudio('ding'); window.BertApp?.showToast(T`+${result.reward} fjer til reden`); }
                renderMissions();
            })));
        }
        const albumButton = document.getElementById('sticker-album-btn');
        if (albumButton) {
            albumButton.querySelector('small').textContent = `${Object.keys(BertMeta.stickers?.() || {}).length}/${STICKER_BOOK.length * 5}`;
            albumButton.onclick = openStickerAlbum;
        }
        const list = document.getElementById('book-list');
        if (!list) return;
        const book = BertMeta.challengeBook();
        document.querySelectorAll('.book-tab').forEach((tab) => {
            const entries = book[tab.dataset.book] || [];
            tab.classList.toggle('selected', tab.dataset.book === bookTab);
            tab.querySelector('small').textContent = `${entries.filter((e) => e.complete).length}/${entries.length}`;
            tab.onclick = () => { bookTab = tab.dataset.book; renderChallengeBook(openIds); };
        });
        // Unclaimed finished ones first, then the closest to done.
        const entries = (book[bookTab] || []).slice().sort((a, b) => (b.complete && !b.claimed) - (a.complete && !a.claimed)
            || (a.claimed - b.claimed) || (b.value / b.target) - (a.value / a.target));
        list.replaceChildren(...entries.map((entry) => challengeRow(entry, () => {
            const result = BertMeta.claimBook(entry.id);
            if (result.ok) { BertMeta.haptic('reward'); playAudio('ding'); window.BertApp?.showToast(T`+${result.reward} fjer · ${result.label}`); }
            renderMissions();
        })));
    }

    function openMissions() {
        renderMissions();
        setVisible(dom.missionsModal, true);
    }

    async function shareCurrentChallenge() {
        if (isEventLevel()) return;
        const meta = BertMeta.snapshot();
        const payload = {
            id: `local-${state.seed}-${Date.now()}`,
            playerId: meta.player.id,
            playerName: meta.player.name,
            levelId: currentLevel.id,
            mode: modeForLevel(),
            hero: meta.hero,
            seed: state.seed,
            score: state.score,
            streak: state.bestStreak,
            time: state.elapsed,
            ghost: state.completedGhost,
        };
        const result = await BertSocial.shareChallenge(payload);
        window.BertApp?.showToast(result.method === 'share' ? T('Udfordringen er klar') : result.method === 'clipboard' ? T('Udfordringslink kopieret') : T('Udfordringslink klar'));
    }

    function showIncomingChallenge(challenge) {
        state.pendingChallenge = challenge;
        const used = BertSocial.challengeAttempts(challenge.id || `${challenge.seed}-${challenge.playerId}`);
        dom.challengeCopy.textContent = T`${challenge.playerName || 'En ven'} fik ${challenge.score} point. Du har ${Math.max(0, 3 - used)} forsøg på den samme bane, og deres flyvning vises som en skygge.`;
        setVisible(dom.challengeModal, true);
    }

    function acceptIncomingChallenge() {
        const challenge = state.pendingChallenge;
        if (!challenge) return;
        if (!UNITY_LEVELS.some((level) => level.id === Number(challenge.levelId))) {
            dom.challengeCopy.textContent = T('Denne bane kan ikke bruges til ranked vennesdueller.');
            return;
        }
        const used = BertSocial.challengeAttempts(challenge.id || `${challenge.seed}-${challenge.playerId}`);
        if (used >= 3) {
            dom.challengeCopy.textContent = T('Alle tre forsøg er brugt. Bed din ven om en ny duel.');
            return;
        }
        setVisible(dom.challengeModal, false);
        startLevel(challenge.levelId, { seed: challenge.seed, challenge });
    }

    function bindControls() {
        document.getElementById('play-btn').addEventListener('click', () => showLevelMenu('classic'));
        document.getElementById('edm-event-btn').addEventListener('click', () => startLevel(EDM_EVENT.id));
        document.getElementById('bird-run-event-btn').addEventListener('click', () => startLevel(BIRD_RUN_EVENT.id));
        document.getElementById('stormline-event-btn').addEventListener('click', () => startLevel(STORMLINE_EVENT.id));
        document.getElementById('sky-relay-event-btn').addEventListener('click', () => startLevel(SKY_RELAY_EVENT.id));
        document.querySelectorAll('.mode-tab').forEach((button) => button.addEventListener('click', () => {
            selectGameMode(button.dataset.mode);
            playAudio('pop');
        }));
        document.getElementById('quick-play-btn').addEventListener('click', startQuickFlight);
        dom.dailyButton.addEventListener('click', startDailyRoute);
        dom.heroSelector.addEventListener('click', () => {
            inspectedHero = BertMeta.currentHero();
            pendingHeroPurchase = null;
            renderWardrobe();
            setVisible(dom.heroModal, true);
        });
        document.querySelectorAll('.hero-option').forEach((button) => button.addEventListener('click', () => {
            inspectedHero = button.dataset.hero;
            pendingHeroPurchase = null;
            const hero = BertMeta.heroCatalog().find((entry) => entry.id === inspectedHero);
            if (hero?.owned) {
                BertMeta.setHero(inspectedHero);
                playAudio('pop');
            } else if (hero) {
                showHeroLock(hero);
            }
            updateMetaMenu();
        }));
        // Arrows scroll the hero row one card at a time.
        document.querySelectorAll('.hero-scroll').forEach((arrow) => arrow.addEventListener('click', () => {
            const grid = document.getElementById('hero-grid');
            grid?.scrollBy({ left: (arrow.dataset.dir === 'left' ? -1 : 1) * grid.clientWidth * 0.8, behavior: 'smooth' });
        }));
        dom.heroBuy.addEventListener('click', () => {
            if (pendingHeroPurchase !== inspectedHero) {
                pendingHeroPurchase = inspectedHero;
                renderWardrobe();
                return;
            }
            const result = BertMeta.buyHero(inspectedHero);
            pendingHeroPurchase = null;
            if (result.ok) {
                BertMeta.setHero(inspectedHero);
                BertMeta.haptic('upgrade');
                window.BertApp?.showToast(T`${result.option.name} låst op for ${result.spent} fjer`);
                playAudio('pop');
            }
            updateMetaMenu();
        });
        dom.heroBuy.dataset.haptic = 'none';
        dom.heroCancelBuy.addEventListener('click', () => { pendingHeroPurchase = null; renderWardrobe(); });
        document.getElementById('close-hero-modal').addEventListener('click', () => setVisible(dom.heroModal, false));
        document.getElementById('confirm-hero').addEventListener('click', () => setVisible(dom.heroModal, false));
        dom.heroModal.addEventListener('click', (event) => {
            if (event.target === dom.heroModal) setVisible(dom.heroModal, false);
        });
        document.getElementById('settings-btn').addEventListener('click', openSettings);
        document.getElementById('pause-settings-btn').addEventListener('click', openSettings);
        document.getElementById('close-settings').addEventListener('click', closeSettings);
        // On phones the keyboard covers most of the landscape screen: lift the
        // open dialog to the top while a text field has focus.
        [dom.firstNameInput, dom.playerName].forEach((input) => {
            input.addEventListener('focus', () => {
                document.body.classList.add('keyboard-open');
                setTimeout(() => input.scrollIntoView({ block: 'center', behavior: 'smooth' }), 120);
            });
            input.addEventListener('blur', () => document.body.classList.remove('keyboard-open'));
        });
        dom.poopButton?.addEventListener('pointerdown', (event) => {
            event.preventDefault();
            event.stopPropagation();
            if (state.phase === 'prewarm') beginRun();
            dropPoop();
        });
        dom.firstNameInput.addEventListener('input', () => {
            dom.saveFirstName.disabled = !dom.firstNameInput.value.trim();
        });
        dom.firstNameInput.addEventListener('keydown', (event) => {
            if (event.key === 'Enter') saveFirstName();
        });
        dom.saveFirstName.addEventListener('click', saveFirstName);
        dom.playerName.addEventListener('change', () => {
            if (dom.playerName.value.trim() && !BertMeta.nameAllowed(dom.playerName.value.replace(/\(op\)/i, ''))) {
                window.BertApp?.showToast(T('Vælg et andet navn'));
                dom.playerName.value = BertMeta.snapshot().player.name || '';
                return;
            }
            BertMeta.setPlayerName(dom.playerName.value);
            updateMetaMenu();
        });
        dom.settingsModal.addEventListener('click', (event) => {
            if (event.target === dom.settingsModal) closeSettings();
        });
        dom.settingMusic.addEventListener('change', () => applySetting('music', dom.settingMusic.checked));
        ['musicVolume', 'sfxVolume'].forEach((name) => {
            const slider = document.getElementById(`setting-${name}`);
            if (!slider) return;
            slider.value = String(Math.round(volumeSetting(name) * 100));
            slider.addEventListener('input', () => {
                BertMeta.setSetting(name, Number(slider.value) / 100);
                MUSIC_NAMES.forEach((key) => { if (audio[key] && key !== 'focus' && !audio[key].paused) audio[key].volume = musicVol(); });
                if (name === 'sfxVolume') playAudio('coin');
            });
        });
        document.getElementById('flok-promo')?.addEventListener('click', () => { location.href = 'flok.html'; });
        document.getElementById('bonus-promo')?.addEventListener('click', () => {
            const id = weeklyBonusId();
            const card = dom.levelGrid.querySelector(`.level-card[data-level-id="${id}"]`);
            if (adventureStatus(levelById(id)).unlocked) startLevel(id);
            else { showLevelMenu(); card?.click(); }
        });
        setInterval(() => { if (state.phase === 'menu') updateFlokPromo(); }, 30000);
        document.getElementById('reset-all-btn')?.addEventListener('click', () => {
            const button = document.getElementById('reset-all-btn');
            if (button.dataset.confirm !== '1') {
                button.dataset.confirm = '1';
                button.textContent = T('ER DU SIKKER? TRYK IGEN');
                setTimeout(() => { button.dataset.confirm = ''; button.textContent = T('START FORFRA'); }, 4000);
                return;
            }
            BertMeta.resetAll();
            location.reload();
        });
        dom.settingSfx.addEventListener('change', () => applySetting('sfx', dom.settingSfx.checked));
        dom.settingHaptics.addEventListener('change', () => applySetting('haptics', dom.settingHaptics.checked));
        const languageSelect = document.getElementById('setting-language');
        if (languageSelect && window.BertI18n) {
            languageSelect.value = window.BertI18n.choice;
            languageSelect.addEventListener('change', () => {
                window.BertI18n.setLanguage(languageSelect.value);
                // Texts are set up once at load, so a reload is the clean way to switch.
                window.location.reload();
            });
        }
        dom.settingLights.addEventListener('change', () => applySetting('lights', dom.settingLights.checked));
        document.getElementById('leaderboard-btn').addEventListener('click', openLeaderboard);
        document.getElementById('close-leaderboard').addEventListener('click', () => setVisible(dom.leaderboardModal, false));
        document.querySelectorAll('[data-board-scope]').forEach((button) => button.addEventListener('click', () => {
            leaderboardScope = button.dataset.boardScope;
            document.querySelectorAll('[data-board-scope]').forEach((other) => {
                other.setAttribute('aria-pressed', String(other === button));
            });
            const label = dom.leaderboardModal.querySelector('.edition-label');
            label.textContent = leaderboardScope === 'friends' ? T('DINE VENNEDUELLER') : T('GLOBAL HIGHSCORE');
            dom.leaderboardModal.querySelector('.ui-board-scope').textContent = leaderboardScope === 'friends'
                ? T('VENNER') : T('VERDEN');
            refreshLeaderboard();
        }));
        [dom.boardPeriod, dom.boardLevel, dom.boardMetric].forEach((select) => select.addEventListener('change', refreshLeaderboard));
        dom.boardMode.addEventListener('change', () => { syncLeaderboardLevels(); refreshLeaderboard(); });
        dom.leaderboardModal.addEventListener('click', (event) => {
            if (event.target === dom.leaderboardModal) setVisible(dom.leaderboardModal, false);
        });
        document.getElementById('missions-btn').addEventListener('click', openMissions);
        document.getElementById('menu-nest')?.addEventListener('click', openMissions);
        dom.rescueUpgrade.addEventListener('click', () => {
            const result = BertMeta.buildNest();
            BertMeta.haptic(result.ok ? 'upgrade' : 'warning');
            if (result.ok) playAudio('fanfare');
            window.BertApp?.showToast(result.ok ? T`Reden er bygget: ${result.step.label}` : T('Du mangler fjer. Flyv en tur, og klar dagens missioner.'));
            updateMetaMenu();
            renderMissions();
        });
        dom.rescueUpgrade.dataset.haptic = 'none';
        dom.rescueSpin.addEventListener('click', () => spinRescueWheel());
        dom.rescueEnd.addEventListener('click', declineRescueWheel);
        document.getElementById('close-missions').addEventListener('click', () => setVisible(dom.missionsModal, false));
        document.getElementById('missions-x')?.addEventListener('click', () => setVisible(dom.missionsModal, false));
        dom.missionsModal.addEventListener('click', (event) => {
            if (event.target === dom.missionsModal) setVisible(dom.missionsModal, false);
        });
        document.getElementById('challenge-btn').addEventListener('click', shareCurrentChallenge);
        document.getElementById('accept-challenge').addEventListener('click', acceptIncomingChallenge);
        document.getElementById('decline-challenge').addEventListener('click', () => setVisible(dom.challengeModal, false));
        document.getElementById('close-level-lock').addEventListener('click', closeLockedLevel);
        dom.playQualification.addEventListener('click', () => {
            if (dom.playQualification.dataset.action === 'missions') {
                setVisible(dom.levelLockModal, false);
                lockedCardTrigger = null;
                openMissions();
                return;
            }
            const levelId = Number(dom.playQualification.dataset.levelId);
            const card = dom.levelGrid.querySelector(`[data-level-id="${levelId}"]`);
            setVisible(dom.levelLockModal, false);
            lockedCardTrigger = null;
            attemptLevel(levelId, card);
        });
        dom.levelLockModal.addEventListener('click', (event) => {
            if (event.target === dom.levelLockModal) closeLockedLevel();
        });
        document.getElementById('back-to-main').addEventListener('click', showMainMenu);
        document.getElementById('retry-btn').addEventListener('click', () => startLevel(currentLevel.id));
        document.getElementById('menu-btn').addEventListener('click', () => showLevelMenu(modeForLevel()));
        document.getElementById('hud-menu-btn').addEventListener('click', pauseGame);
        document.getElementById('resume-btn').addEventListener('click', resumeGame);
        document.getElementById('restart-btn').addEventListener('click', () => startLevel(currentLevel.id));
        document.getElementById('pause-levels-btn').addEventListener('click', () => showLevelMenu(modeForLevel()));
        document.getElementById('pause-main-btn').addEventListener('click', showMainMenu);

        dom.shell.addEventListener('pointerdown', (event) => {
            if (event.target.closest?.('button')) return;
            if (state.phase !== 'prewarm' && state.phase !== 'playing') return;
            event.preventDefault();
            heldPointers.set(event.pointerId, logicalPointerX(event));
            try { dom.shell.setPointerCapture?.(event.pointerId); } catch (_) { /* Some browsers refuse; tracking still works. */ }
            if (state.phase === 'prewarm') beginRun();
            if (usingFlapControl()) {
                flap();
                return;
            }
            applyHeldDirection();
        });
        dom.shell.addEventListener('pointermove', (event) => {
            if (!heldPointers.has(event.pointerId)) return;
            event.preventDefault();
            heldPointers.set(event.pointerId, logicalPointerX(event));
            if (state.phase === 'playing' && !usingFlapControl()) applyHeldDirection();
        });
        ['pointerup', 'pointercancel', 'lostpointercapture'].forEach((type) => {
            dom.shell.addEventListener(type, (event) => {
                if (!heldPointers.has(event.pointerId)) return;
                clearTouchDirection(event);
            });
        });
        window.addEventListener('blur', () => clearTouchDirection());
        window.addEventListener('pagehide', () => clearTouchDirection());
        document.addEventListener('visibilitychange', () => {
            if (document.hidden) {
                clearTouchDirection();
                pauseGame();
            }
        });

        document.addEventListener('keydown', (event) => {
            // Typing a name must never steer Bert or open menus.
            if (event.target instanceof HTMLInputElement) return;
            if (event.key === 'Escape') {
                if (!dom.levelLockModal.classList.contains('hidden')) {
                    closeLockedLevel();
                    return;
                }
                if (state.phase === 'paused') resumeGame();
                else if (['prewarm', 'playing'].includes(state.phase)) pauseGame();
                else showMainMenu();
                return;
            }
            // Tastatur: venstre/op = stig (som venstre side af skærmen), højre/ned = fald.
            const dir = keyDirection(event.key);
            if (state.phase === 'prewarm' && (event.key === ' ' || dir === 'up')) {
                event.preventDefault();
                beginRun();
                if (currentLevel.mode === MODE.FLAPPY) flap();
                else {
                    state.inputStrength = 1;
                    state.inputUp = true;
                }
                return;
            }
            if (state.phase === 'prewarm' && dir === 'down' && currentLevel.mode !== MODE.FLAPPY) {
                event.preventDefault();
                beginRun();
                state.inputStrength = 1;
                state.inputDown = true;
                return;
            }
            if (state.phase !== 'playing') return;
            if (currentLevel.kind === 'poop' && (event.key === ' ' || event.key === 'x' || event.key === 'X')) {
                event.preventDefault();
                dropPoop();
                return;
            }
            if (usingFlapControl() && (event.key === ' ' || dir === 'up')) {
                event.preventDefault();
                flap();
            } else if (!usingFlapControl() && currentLevel.mode === MODE.DEFAULT && dir) {
                event.preventDefault();
                state.inputStrength = 1;
                if (dir === 'up') state.inputUp = true;
                if (dir === 'down') state.inputDown = true;
            }
        });
        document.addEventListener('keyup', (event) => {
            const dir = keyDirection(event.key);
            if (dir === 'up') state.inputUp = false;
            if (dir === 'down') state.inputDown = false;
        });
    }

    function keyDirection(key) {
        if (['ArrowUp', 'ArrowLeft', 'w', 'W'].includes(key)) return 'up';
        if (['ArrowDown', 'ArrowRight', 's', 'S'].includes(key)) return 'down';
        return null;
    }

    function syncOrientationPause() {
        const width = window.visualViewport?.width || window.innerWidth;
        const height = window.visualViewport?.height || window.innerHeight;
        const blocked = height > width;
        if (blocked === state.orientationPaused) return;

        state.orientationPaused = blocked;
        simulationAccumulator = 0;
        clearTouchDirection();
        if (blocked) {
            state.orientationAudio = {
                music: Boolean(activeLevelMusic() && !activeLevelMusic().paused),
                focus: Boolean(audio.focus && !audio.focus.paused),
                magnet: Boolean(audio.magnetRunning && !audio.magnetRunning.paused),
            };
            activeLevelMusic()?.pause();
            audio.focus?.pause();
            audio.magnetRunning?.pause();
            return;
        }

        lastFrame = performance.now();
        lastRender = 0;
        if (state.phase === 'playing') {
            if (state.orientationAudio?.focus) audio.focus?.play().catch(() => {});
            else if (state.orientationAudio?.music && BertMeta.settingEnabled('music')) activeLevelMusic()?.play().catch(() => {});
            if (state.orientationAudio?.magnet) audio.magnetRunning?.play().catch(() => {});
        }
        state.orientationAudio = null;
    }

    let orientationDirty = true;
    window.addEventListener('resize', () => { orientationDirty = true; });
    window.visualViewport?.addEventListener('resize', () => { orientationDirty = true; });
    window.addEventListener('orientationchange', () => { orientationDirty = true; });
    function loop(now) {
        requestAnimationFrame(loop);
        if (orientationDirty) { orientationDirty = false; syncOrientationPause(); }
        // Smooth motion (feedback 9. okt.: frames felt "set back"). The game advances by
        // exactly the time since the last drawn frame, split into small steps, so every
        // drawn frame shows the same amount of movement. A fixed 1/60 step with jittery
        // frame timing sometimes advanced 0 or 2 steps per frame, which reads as stutter.
        const shouldRender = lastRender === 0 || now - lastRender >= RENDER_INTERVAL - 0.75;
        if (!shouldRender) return;
        const delta = Math.min((now - lastFrame) / 1000, FIXED_STEP * MAX_SIMULATION_STEPS);
        lastFrame = now;
        if (!state.orientationPaused && !document.hidden) {
            const steps = Math.max(1, Math.ceil(delta / FIXED_STEP - 0.01));
            for (let step = 0; step < steps; step += 1) update(delta / steps);
        }
        simulationAccumulator = 0;
        if (shouldRender) {
            render();
            lastRender = now;
            updateHudClearance();
        }
    }

    // The score strip and pause button sit over the top of the play field.
    // When Bert, a star or the visible part of an obstacle is underneath them,
    // they fade out so nothing the player has to react to is ever hidden.
    const hudClearance = { frame: 0, rects: [], dim: false };
    function hudOverlapRects() {
        const canvasRect = dom.canvas?.getBoundingClientRect?.();
        if (!canvasRect || !canvasRect.width || !canvasRect.height) return [];
        const sx = VIEW.width / canvasRect.width;
        const sy = VIEW.height / canvasRect.height;
        return [dom.hudStrip, dom.hudMenu].filter(Boolean).map((element) => {
            const rect = element.getBoundingClientRect();
            return {
                left: (rect.left - canvasRect.left) * sx - 6,
                right: (rect.right - canvasRect.left) * sx + 6,
                top: (rect.top - canvasRect.top) * sy,
                bottom: (rect.bottom - canvasRect.top) * sy + 8,
            };
        }).filter((rect) => rect.right > rect.left && rect.bottom > rect.top);
    }
    function overlapsHud(rects, left, top, right, bottom) {
        return rects.some((rect) => left < rect.right && right > rect.left && top < rect.bottom && bottom > rect.top);
    }
    function updateHudClearance() {
        if (!dom.hud) return;
        const active = ['playing', 'prewarm'].includes(state.phase) && !dom.hud.classList.contains('hidden');
        let dim = false;
        if (active) {
            if (hudClearance.frame % 20 === 0 || !hudClearance.rects.length) hudClearance.rects = hudOverlapRects();
            hudClearance.frame += 1;
            const rects = hudClearance.rects;
            if (rects.length) {
                dim = overlapsHud(rects, bird.x, bird.y, bird.x + BIRD.width, bird.y + BIRD.height)
                    || collectibles.some((item) => !item.collected && overlapsHud(rects,
                        item.x - item.width / 2, item.y - item.height / 2, item.x + item.width / 2, item.y + item.height / 2))
                    || obstacles.some((obstacle) => {
                        const x = obstacle.renderX ?? obstacle.x;
                        const y = obstacle.renderY ?? obstacle.y;
                        const width = obstacle.renderWidth ?? obstacle.width;
                        const height = obstacle.renderHeight ?? obstacle.height;
                        if (!(width > 0 && height > 0)) return false;
                        const lowestHudEdge = Math.max(...rects.map((rect) => rect.bottom));
                        // A pipe or wall hanging from the top is only body under the HUD;
                        // its dangerous edge is far below, so it does not need a fade.
                        if (y <= 2 && y + height > lowestHudEdge + 24) return false;
                        return overlapsHud(rects, x, y, x + width, y + height);
                    });
            }
        } else {
            hudClearance.frame = 0;
            hudClearance.rects = [];
        }
        if (dim !== hudClearance.dim) {
            hudClearance.dim = dim;
            dom.hud.classList.toggle('is-clear', dim);
        }
    }

    if (QUERY.has('qa')) {
        window.BertQA = Object.freeze({
            snapshot: () => ({
                build: BUILD_VERSION,
                worldTime: state.worldTime,
                relayRound: state.relayRoute?.round || null,
                phase: state.phase,
                elapsed: state.elapsed,
                score: state.score,
                streak: state.streak,
                streakGuardCharges: state.streakGuardCharges,
                guardReadyAt: state.powerupReadyAt.Guard,
                cleanRun: state.cleanRun,
                rescueUsed: state.rescueUsed,
                birdY: bird.y,
                birdWidth: BIRD.width,
                birdHeight: BIRD.height,
                velocity: bird.velocity,
                inputUp: state.inputUp,
                inputDown: state.inputDown,
                inputStrength: state.inputStrength,
                levelId: currentLevel.id,
                levelKind: currentLevel.kind,
                event: isEventLevel(),
                worldBadge: state.worldBadge,
                worldGoalCompleted: state.phase === 'world-finish' || Boolean(state.worldBadge),
                worldFinishDelay: state.worldFinishDelay,
                worldDistance: state.worldDistance,
                birdCollider: BertCollision.bertCollider(bird, BIRD),
                relay: state.relayRoute ? {
                    gates: state.relayRoute.gates.map((gate) => ({
                        id: gate.id, worldDistance: gate.worldDistance, centerY: gate.centerY,
                        openingRadius: gate.openingRadius, passRadius: gate.passRadius,
                        screenX: BertCollision.bertCollider(bird, BIRD).x
                            + gate.worldDistance - state.worldDistance,
                    })),
                    target: {
                        ...state.relayRoute.target,
                        screenX: BertCollision.bertCollider(bird, BIRD).x
                            + state.relayRoute.target.worldDistance - state.worldDistance,
                    },
                    timeLimit: state.relayRoute.timeLimit,
                    gateResults: state.relayGates.map((gate) => ({ ...gate })),
                    result: state.relayResult,
                } : null,
                crowdFrames: crowdFrames.length,
                crowdFrame: currentLevel === EDM_EVENT
                    ? BertEDM.crowdFrame(state.worldTime, prefersReducedMotion()) : null,
                foreground: currentLevel.kind === 'birdRun'
                    ? { top: 98, bottomStart: 644, image: 'birdRunCloud' }
                    : currentLevel.kind === 'edm'
                    ? { top: 58, bottomStart: 628, image: 'edmCrowd' }
                    : currentLevel.kind === 'jungle'
                        ? { top: 112, bottomStart: 632, image: 'jungleFg' }
                        : FOREGROUND_BANDS[currentLevel.kind]
                            ? { top: FOREGROUND_BANDS[currentLevel.kind].top,
                                bottomStart: FOREGROUND_BANDS[currentLevel.kind].floor,
                                image: FOREGROUND_BANDS[currentLevel.kind].image }
                            : null,
                edmMusicPaused: audio.edm?.paused ?? true,
                edmLightCue: currentLevel === EDM_EVENT
                    ? BertEDM.lightCue(state.worldTime, prefersReducedMotion() || !BertMeta.settingEnabled('lights'))
                    : null,
                edmSmokeCue: currentLevel === EDM_EVENT
                    ? BertEDM.smokeCue(state.worldTime, prefersReducedMotion()) : null,
                edmProjectors: currentLevel === EDM_EVENT ? BertEDM.STAGE_PROJECTORS : [],
                stormWindCue: currentLevel === STORMLINE_EVENT ? BertStormline.windCue(state.worldTime) : null,
                stormLeaves: currentLevel === STORMLINE_EVENT
                    ? windLeaves.map((leaf) => ({ x: leaf.x, y: leaf.y })) : [],
                levelVariant: currentLevel.variant,
                modeGroup: currentLevel.modeGroup,
                modeOrder: currentLevel.modeOrder,
                unlockedLevelIds: unlockedLevels().map((level) => level.id),
                levelCatalog: UNITY_LEVELS.map((level) => ({
                    id: level.id,
                    name: level.name,
                    mode: level.modeGroup,
                    order: level.modeOrder,
                    unlockScore: level.unlockScore,
                    variant: level.variant,
                })),
                tunnelProfile: currentLevel.kind === 'tunnel'
                    ? BertTunnel.profileAt(state.worldDistance + 640, state.difficulty, currentLevel.variant)
                    : null,
                seed: state.seed,
                challengeId: state.challenge?.id || null,
                hero: BertMeta.snapshot().hero,
                heroAnimation: heroAnimationState(BertMeta.snapshot().hero, bird.animationTime, state.phase === 'dead' || state.phase === 'gameover'),
                meta: BertMeta.snapshot(),
                missionClaimsCompleted: BertMeta.missionClaimCount(),
                starsCollected: state.starsCollected,
                rescueLives: state.rescueLives,
                rescueNoticeUntil: state.rescueNoticeUntil,
                continueUsed: state.continueUsed,
                rescueSpinPending: state.rescueSpinPending,
                dailyKey: state.dailyKey,
                dailyTarget: state.dailyTarget,
                pausedFrom: state.pausedFrom,
                speed: state.speed,
                difficulty: state.difficulty,
                stageClock: state.stageClock,
                activePowerup: state.activePowerup,
                eventPickupIndex: state.eventPickupIndex,
                controlMode: usingFlapControl() ? 'flappy' : 'default',
                powerupRemaining: state.activePowerup && state.activePowerup !== POWERUP.FOCUS
                    ? Math.max(0, state.powerupEndsAt - state.elapsed) : 0,
                focusPhase: state.focusPhase,
                focusCountdown: state.focusCountdown,
                focusRemaining: state.focusRemaining,
                focusTargetSpeed: state.focusTargetSpeed,
                focusAudioPrimed,
                focusAudioDriver: audio.focus?.driver || 'media',
                focusReadyState: audio.focus?.readyState ?? 0,
                musicPaused: audio.music?.paused,
                musicVolume: audio.music?.volume,
                musicRate: audio.music?.playbackRate,
                chopinPaused: audio.focus?.paused,
                chopinVolume: audio.focus?.volume,
                obstacleCount: obstacles.length,
                edmWarningCount: obstacles.filter((obstacle) =>
                    ['edm-center-rig', 'edm-crowd-ball'].includes(obstacle.kind)
                    && obstacle.x - (bird.x + BIRD.width) < 830 && obstacle.x > bird.x - 220).length,
                spawnedObstacleGroups: state.obstacleId,
                spawnSpacing: state.spawnSpacing,
                happyPipeCount: obstacles.filter((obstacle) => obstacle.kind === 'happy-pipe').length,
                obstacleGroups: [...new Map(obstacles.map((obstacle) => [obstacle.id, obstacle.x])).values()].sort((a, b) => a - b),
                obstacleGeometry: obstacles.map((obstacle) => ({
                    id: obstacle.id,
                    ballIndex: obstacle.ballIndex ?? null,
                    kind: obstacle.kind,
                    top: Boolean(obstacle.top),
                    x: obstacle.x,
                    y: obstacle.y,
                    width: obstacle.width,
                    height: obstacle.height,
                    artKey: obstacle.artKey || null,
                    species: obstacle.species || null,
                    waveIndex: obstacle.waveIndex ?? null,
                    waveSize: obstacle.waveSize ?? null,
                    heroId: obstacle.heroId || null,
                    predator: Boolean(obstacle.predator),
                    animationFrame: obstacle.heroId
                        ? heroAnimationState(obstacle.heroId,
                            prefersReducedMotion() ? 0.18 : obstacle.flightAge + obstacle.animationOffset,
                            false).currentIndex : null,
                    pathTravel: obstacle.pathTravel ?? null,
                    flightAge: obstacle.flightAge ?? null,
                    moving: Boolean(obstacle.moving),
                    scrollFactor: obstacle.scrollFactor || 1,
                    motionAmplitude: obstacle.motionAmplitude || 0,
                    tilt: obstacle.tilt || 0,
                    conveyor: obstacle.conveyor || 0,
                    warn: obstacle.warn || 0,
                    type: obstacle.type || null,
                    motionPhase: obstacle.motionPhase ?? null,
                    motionSpeed: obstacle.motionSpeed ?? null,
                    baseY: obstacle.baseY ?? null,
                    windDirection: obstacle.windDirection ?? null,
                    reverseRemaining: obstacle.reverseRemaining ?? null,
                    reverseCount: obstacle.reverseCount ?? null,
                    baseGapTop: obstacle.baseGapTop ?? null,
                    gap: obstacle.gap ?? null,
                    direction: obstacle.direction || null,
                    warningRemaining: obstacle.warningRemaining ?? null,
                    forwardSpeed: obstacle.forwardSpeed || null,
                })),
                enemyStates: obstacles
                    .filter((obstacle) => obstacle.kind.startsWith('jungle-'))
                    .map((obstacle) => ({
                        kind: obstacle.kind,
                        attackState: obstacle.attackState,
                        attackElapsed: obstacle.attackElapsed ?? 0,
                        attackWindup: obstacle.attackWindup ?? null,
                        targetY: obstacle.targetY ?? null,
                        warningVisible: Boolean(currentLevel.spiderWarning && obstacle.kind === 'jungle-spider'
                            && obstacle.attackState === 'attacking'
                            && obstacle.attackElapsed < (obstacle.attackWindup ?? 0.52) + 0.14),
                        attackFrame: obstacle.attackFrame ?? null,
                        y: obstacle.y,
                        baseBottom: obstacle.baseBottom ?? null,
                        renderY: obstacle.renderY ?? obstacle.y,
                        renderHeight: obstacle.renderHeight ?? obstacle.height,
                    })),
                collectibleCount: collectibles.length,
                featherPickups: collectibles.filter((item) => item.kind === 'feather').map((item) => ({ x: item.x, y: item.y })),
                feathersPicked: state.feathersPicked,
                driftingStars: collectibles.filter((item) => item.kind === 'star' && item.drift).length,
                starGeometry: collectibles.filter((item) => item.kind === 'star').map((item) => ({ x: item.x, y: item.y, value: item.value })),
                powerupGeometry: collectibles.filter((item) => item.kind === 'powerup').map((item) => ({
                    x: item.x, y: item.y, width: item.width, height: item.height, type: item.type,
                    profile: item.motion?.profile || 'static', scrollFactor: item.motion?.scrollFactor || 1,
                    age: item.age || 0,
                })),
                particleCount: particles.length,
                pointAudioDriver: audio.point?.driver || 'media',
                pointAudioVoices: audio.point?.activeVoices ?? 0,
                loadedAssetCount: loadedAssetKeys.size,
                loadedAssetKeys: [...loadedAssetKeys].sort(),
                loadedAssetSizes: Object.fromEntries([...loadedAssetKeys].map((key) => [key, [assets[key]?.naturalWidth || 0, assets[key]?.naturalHeight || 0]])),
                deathCause: state.deathCause,
                deathDirection: state.deathDirection,
                deathPredatorHero: state.deathPredatorHero,
                deathCountdown: state.deathCountdown,
                deathCaptureElapsed: state.deathCaptureElapsed,
                deathCaptureFrame: state.deathCause === 'jungle-spider'
                    ? Math.min(17, Math.floor(state.deathCaptureElapsed * 8))
                    : state.deathCause === 'jungle-snake'
                        ? Math.min(2, Math.floor(state.deathCaptureElapsed / 0.145))
                        : null,
                birdsVisible: state.birdsVisible,
                orientationPaused: state.orientationPaused,
            }),
            activatePowerup: (type) => activatePowerup(POWERUP[String(type).toUpperCase()] || type),
            collectStar: (value = 1) => collectStar({ value: Math.max(1, Number(value) || 1) }),
            heroAnimationState,
            startLevel,
            beginRun,
            pauseGame,
            resumeGame,
            spawnObstacle,
            triggerDeath,
            finishDeath,
            renderNow: () => { render(); return window.BertQA.snapshot(); },
            offerRescueWheel,
            spinRescueWheel: (outcome = null, immediate = true) => spinRescueWheel(outcome, immediate),
            setBird: (x, y, velocity = 0) => {
                bird.x = x;
                bird.y = y;
                bird.velocity = velocity;
            },
            setBirdAnimationTime: (seconds) => {
                bird.animationTime = Math.max(0, Number(seconds) || 0);
                render();
                return heroAnimationState(BertMeta.snapshot().hero, bird.animationTime, state.phase === 'dead' || state.phase === 'gameover');
            },
            setRunStats: ({ score = state.score, streak = state.bestStreak, time = state.elapsed, stars = state.starsCollected } = {}) => {
                state.score = Math.max(0, Math.floor(Number(score) || 0));
                state.streak = Math.max(0, Math.floor(Number(streak) || 0));
                state.bestStreak = Math.max(state.streak, state.bestStreak);
                state.elapsed = Math.max(0, Number(time) || 0);
                state.starsCollected = Math.max(0, Math.floor(Number(stars) || 0));
                updateHud();
            },
            setStageClock: (seconds) => {
                state.stageClock = Math.max(0, Number(seconds) || 0);
                const values = currentStageValues();
                state.speed = values.speed;
                state.difficulty = values.difficulty;
                return window.BertQA.snapshot();
            },
            setWorldTime: (seconds) => {
                state.worldTime = Math.max(0, Number(seconds) || 0);
                return window.BertQA.snapshot();
            },
            setNextObstacleId: (id) => {
                state.obstacleId = Math.max(0, Math.trunc(Number(id) || 0));
                return window.BertQA.snapshot();
            },
            addObstacle: (obstacle) => obstacles.push({ harmful: true, age: 0, bob: 0, animationPhase: 0, id: state.obstacleId++, ...obstacle }),
            addStar: (x = -30, y = 360, value = 1) => {
                const star = makeCollectible(x, y);
                star.value = value;
                collectibles.push(star);
            },
            addPowerupPickup: (type, x = 720, y = 360) => collectibles.push({
                x, y, width: 96, height: 92, kind: 'powerup',
                type: POWERUP[String(type).toUpperCase()] || type,
                spin: 0, collected: false,
            }),
            addMovingPowerupPickup: (type, x = 1100, y = 360, profile = 'approach') => {
                collectibles.push(makePowerupPickup(POWERUP[String(type).toUpperCase()] || type,
                    x, y, profile));
                return window.BertQA.snapshot();
            },
            simulate: (seconds, delta = 1 / 60) => {
                const frames = Math.ceil(seconds / delta);
                for (let index = 0; index < frames; index += 1) {
                    state.worldTime += delta;
                    update(delta);
                }
                return window.BertQA.snapshot();
            },
        });
    }

    async function boot() {
        resizeCanvas();
        const refreshViewport = () => {
            resizeCanvas();
            requestAnimationFrame(resizeCanvas);
            window.setTimeout(resizeCanvas, 180);
        };
        window.addEventListener('resize', refreshViewport);
        window.visualViewport?.addEventListener('resize', refreshViewport);
        window.visualViewport?.addEventListener('scroll', resizeCanvas);
        screen.orientation?.addEventListener?.('change', refreshViewport);
        document.addEventListener('fullscreenchange', resizeCanvas);
        createLevelButtons();
        bindControls();
        try {
            await loadAssets();
            setVisible(dom.loading, false);
            showMainMenu();
            // Flyv hver dag counts the day you open the game, so day 1 is filled at once.
            if (BertMeta.hasPlayerName?.()) {
                const day = BertMeta.noteDailyFlight?.();
                if (day?.ok) setTimeout(() => window.BertApp?.showToast(T`Dag ${day.streak} i træk · +${day.reward} fjer til reden`), 900);
                updateMetaMenu();
            }
            maybeOfferStarter();
            const incomingChallenge = await BertSocial.challengeFromLocation();
            if (incomingChallenge) showIncomingChallenge(incomingChallenge);
            requestAnimationFrame(loop);
        } catch (error) {
            console.error(error);
            dom.loading.querySelector('p').textContent = T('Spillet kunne ikke indlæses. Prøv igen.');
        }
    }

    boot();
})();
