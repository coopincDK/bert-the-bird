/* Flokken (prototype): slither × agar with Bert's birds, seen from the side.
 * Chain = a line of birds following the leader (fast, dies if its head hits another chain).
 * Flok  = for a limited time the chain folds into a big slow ball that eats smaller birds.
 * A chain that closes a ring around a flok catches it. Bots fill the sky until the
 * multiplayer server exists. Everything here is local; nothing is sent anywhere. */
(() => {
    'use strict';
    const canvas = document.getElementById('c');
    const ctx = canvas.getContext('2d', { alpha: false });
    const W = 6000;
    const H = 2200;
    const GROUND = H - 120;
    const SPACING = 30;
    const STAR_TARGET = 520;
    const BOT_COUNT = 14;
    const ORB_MIN = 15;
    const HEROES = ['bert', 'blue', 'block', 'brain', 'eagle', 'mecha', 'noir', 'vulture', 'sugar', 'moss', 'ink', 'prism', 'pingo', 'mogens', 'ninja', 'pakke', 'gold'];
    const NAMES = ['Kaj', 'Rapper', 'Fjerfrida', 'Næbbe', 'Pip', 'Svupper', 'Lille Lars', 'Gustav', 'Vingemor', 'Kvidre', 'Fløjte', 'Sky-Sofie', 'Turbo', 'Blæsebert', 'Mågemads', 'Sus'];
    const images = {};
    const img = (src) => images[src] || (images[src] = Object.assign(new Image(), { src }));
    const heroArt = (hero) => img(`assets/heroes/${hero}/glide.webp`);
    // Wingbeats (feedback): the heroes' 8 flap frames, loaded the first time a hero is drawn.
    const flapArt = (hero, frame) => img(`assets/heroes/${hero}/flap-0${(frame % 8) + 1}.webp`);
    const G7 = 'assets/v2/g7/flock/';
    const starArt = img(`${G7}star-food.webp`);
    const art = {
        sky: img(`${G7}sky.webp`), ground: img(`${G7}ground.webp`), edge: img(`${G7}edge.webp`),
        clouds: [1, 2, 3, 4].map((n) => img(`${G7}clouds-${n}.webp`)),
        orb: img(`${G7}orb-glow.webp`), orbMe: img(`${G7}orb-glow-me.webp`),
        catch: img(`${G7}catch.webp`), eat: img(`${G7}eat.webp`), crown: img(`${G7}crown.webp`),
    };
    const ready = (image) => image.complete && image.naturalWidth > 0;
    // Short picture effects in the world: something eaten, a flok caught in a ring.
    let effects = [];
    const effect = (kind, x, y, size = 160) => effects.push({ kind, x, y, size, age: 0 });
    const hawkFrames = [1, 2, 3, 4].map((n) => img(`assets/v2/birdrun/predator-fly-${n}.webp`));
    // The hawk: a computer predator that always hunts the biggest bird group. It makes
    // number 1 a target and gives the small ones a chance (feedback 10. okt.).
    let hawk = null;

    // ---------- sound: effects via the shared Web Audio player, music as a loop ----------
    const setting = (name, fallback) => { const v = window.BertMeta?.settingValue?.(name); return v === undefined ? fallback : v; };
    const SFX = ['coin', 'pop', 'combo', 'whoosh', 'ding', 'fanfare', 'hawk', 'bert-ohno', 'bert-yay', 'bert-pip', 'shield-break'];
    SFX.forEach((name) => window.BertSfx?.load(name, `assets/sfx/${name}.mp3`));
    function sfx(name, volume = 1) {
        if (setting('sfx', true) === false) return;
        window.BertSfx?.play(name, 0.45 * Number(setting('sfxVolume', 0.7)) * volume);
    }
    const music = new Audio('assets/music/flokken.mp3');
    music.loop = true;
    function startMusic() {
        if (setting('music', true) === false) return;
        music.volume = 0.4 * Number(setting('musicVolume', 0.7));
        music.play().catch(() => {});
    }
    ['pointerdown', 'keydown'].forEach((type) => window.addEventListener(type, () => window.BertSfx?.unlock(), { passive: true }));
    const nearPlayer = (x, y) => player && dist2(x, y, player.x, player.y) < 900 * 900;

    let entities = [];
    let stars = [];
    let player = null;
    let nextId = 1;
    let running = false;
    let lastTime = 0;
    let startedAt = 0;
    // A floating joystick: it appears where the finger lands, and the direction is from
    // there to the finger. Release and Bert keeps his heading.
    const input = { active: false, x: 0, y: 0, ox: 0, oy: 0, keyTurn: 0, id: null };
    const rand = (a, b) => a + Math.random() * (b - a);
    const dist2 = (ax, ay, bx, by) => (ax - bx) ** 2 + (ay - by) ** 2;
    const angleDiff = (a, b) => { let d = b - a; while (d > Math.PI) d -= Math.PI * 2; while (d < -Math.PI) d += Math.PI * 2; return d; };

    function addStar(x = rand(80, W - 80), y = rand(140, GROUND - 40), value = 1) {
        stars.push({ x, y, value, spin: Math.random() * 6 });
    }

    function spawn(isPlayer = false, size = 6) {
        const hero = isPlayer ? (localStorage.getItem('bertFlokHero') || 'bert') : HEROES[Math.floor(Math.random() * HEROES.length)];
        // Start somewhere quiet: the spot (of 20 tries) farthest from everyone else.
        let x = rand(400, W - 400); let y = rand(300, GROUND - 300); let bestGap = -1;
        for (let t = 0; t < 20; t += 1) {
            const cx = rand(400, W - 400); const cy = rand(300, GROUND - 300);
            let gap = Infinity;
            for (const o of entities) { gap = Math.min(gap, dist2(cx, cy, o.x, o.y)); for (let i = 0; i < o.birds.length; i += 4) gap = Math.min(gap, dist2(cx, cy, o.birds[i].x, o.birds[i].y)); }
            if (gap > bestGap) { bestGap = gap; x = cx; y = cy; }
        }
        const e = {
            id: nextId++, isPlayer, name: isPlayer ? (readName() || 'Dig') : NAMES[Math.floor(Math.random() * NAMES.length)],
            hero, x, y, angle: Math.random() * Math.PI * 2, target: 0, form: 'chain', path: [], birds: [],
            orbUntil: 0, orbReadyAt: 0, kills: 0, alive: true, think: 0, plan: null, spawnedAt: performance.now(),
        };
        e.target = e.angle;
        for (let i = 0; i < size; i += 1) e.birds.push(newBird(e, i));
        for (let i = 0; i < size * SPACING + 10; i += 4) e.path.push({ x: x - Math.cos(e.angle) * i, y: y - Math.sin(e.angle) * i });
        entities.push(e);
        return e;
    }
    function newBird(owner, index) {
        // Followers are a mix: mostly the owner's hero, now and then a friend.
        const hero = Math.random() < 0.7 ? owner.hero : HEROES[Math.floor(Math.random() * HEROES.length)];
        return { hero, x: owner.x, y: owner.y, orbA: Math.random() * Math.PI * 2, orbR: Math.sqrt(Math.random()), orbSpin: rand(0.6, 1.4) * (Math.random() < 0.5 ? -1 : 1), flap: Math.random() * 6 };
    }
    function readName() {
        try { return window.BertMeta?.snapshot().player?.name || JSON.parse(localStorage.getItem('bertTheBird_meta_v1') || '{}').player?.name || ''; } catch (_) { return ''; }
    }

    const size = (e) => e.birds.length + 1;
    const orbRadius = (e) => 26 + Math.sqrt(size(e)) * 17;
    const speedOf = (e) => (e.form === 'orb'
        ? Math.max(85, 230 * Math.pow(ORB_MIN / size(e), 0.45))
        : Math.max(185, 265 - size(e) * 0.7));
    const orbDuration = (e) => Math.min(25, 10 + size(e) * 0.5);

    function formOrb(e, now) {
        if (e.form !== 'chain' || size(e) < ORB_MIN || now < e.orbReadyAt) return false;
        if (e.isPlayer) sfx('combo'); else if (nearPlayer(e.x, e.y)) sfx('combo', 0.4);
        e.form = 'orb';
        e.orbUntil = now + orbDuration(e) * 1000;
        return true;
    }
    function unravel(e, now) {
        if (e.form !== 'orb') return;
        if (e.isPlayer) sfx('whoosh');
        e.form = 'chain';
        e.orbReadyAt = now + 8000;
        // The birds string out behind the leader along the current heading.
        e.path = [];
        for (let i = 0; i < size(e) * SPACING + 10; i += 4) e.path.push({ x: e.x - Math.cos(e.angle) * i, y: e.y - Math.sin(e.angle) * i });
    }
    function kill(e, killer = null) {
        if (!e.alive) return;
        e.alive = false;
        if (e.isPlayer) sfx('bert-ohno');
        else if (killer?.isPlayer) { sfx('ding'); setTimeout(() => sfx('bert-yay', 0.8), 200); }
        else if (nearPlayer(e.x, e.y)) sfx('pop', 0.5);
        // The birds fall out as stars: going after big ones pays off.
        const points = e.form === 'orb' ? e.birds.map(() => ({ x: e.x + rand(-orbRadius(e), orbRadius(e)), y: e.y + rand(-orbRadius(e), orbRadius(e)) })) : e.birds;
        points.forEach((p) => addStar(p.x + rand(-10, 10), Math.min(GROUND - 20, p.y + rand(-10, 10)), 1));
        addStar(e.x, e.y, 1);
        if (killer) killer.kills += 1;
        if (e.isPlayer) showDead(killer);
        else setTimeout(() => { if (running) spawn(false, Math.floor(rand(5, 12))); }, 2500);
    }
    function grow(e, n) {
        for (let i = 0; i < n; i += 1) e.birds.push(newBird(e, e.birds.length));
        e.peak = Math.max(e.peak || 0, size(e));
    }
    // Eating birds: 60 % join you, the rest fall as stars, so one big flok cannot snowball forever.
    function eat(e, n, x, y) {
        effect('eat', x, y, 140 + Math.min(120, n * 4));
        if (e.isPlayer) sfx('pop'); else if (nearPlayer(x, y)) sfx('pop', 0.4);
        const keep = Math.ceil(n * 0.6);
        grow(e, keep);
        for (let i = 0; i < (n - keep) * 3; i += 1) addStar(x + rand(-90, 90), Math.min(GROUND - 20, y + rand(-90, 90)), 1);
    }

    // ---------- bots ----------
    function think(e, now) {
        const near = (filter, range) => {
            let best = null; let bestD = range * range;
            for (const o of entities) {
                if (o === e || !o.alive || !filter(o)) continue;
                const d = dist2(e.x, e.y, o.x, o.y);
                if (d < bestD) { bestD = d; best = o; }
            }
            return best;
        };
        if (e.form === 'orb') {
            const prey = near((o) => size(o) < size(e) * 0.9, 900);
            if (prey) { e.target = Math.atan2(prey.y - e.y, prey.x - e.x); return; }
        } else {
            // Run from bigger floks.
            const threat = near((o) => o.form === 'orb' && size(o) > size(e), 520);
            if (threat) { e.target = Math.atan2(e.y - threat.y, e.x - threat.x); return; }
            // Smaller chain close by: fold into a flok and eat it.
            const snack = near((o) => size(o) < size(e) * 0.8, 320);
            if (snack && formOrb(e, now)) return;
            // Big enough: try to ring a smaller flok.
            const ringable = size(e) >= 28 && near((o) => o.form === 'orb' && size(o) < size(e), 600);
            if (ringable) {
                const r = orbRadius(ringable) + 70;
                const a = Math.atan2(e.y - ringable.y, e.x - ringable.x) + 0.6;
                e.target = Math.atan2(ringable.y + Math.sin(a) * r - e.y, ringable.x + Math.cos(a) * r - e.x);
                return;
            }
        }
        // Otherwise: the nearest star, with a little wandering.
        let best = null; let bestD = Infinity;
        for (const s of stars) {
            const d = dist2(e.x, e.y, s.x, s.y);
            if (d < bestD) { bestD = d; best = s; }
        }
        if (best) e.target = Math.atan2(best.y - e.y, best.x - e.x) + rand(-0.2, 0.2);
    }
    function avoid(e) {
        // Edges are deadly now, so every bot (flok or chain) turns back well before them.
        const m = e.form === 'orb' ? 420 : 300;
        if (e.x < m) { e.target = 0; return; }
        if (e.x > W - m) { e.target = Math.PI; return; }
        if (e.y < 60 + m * 0.7) { e.target = Math.PI / 2; return; }
        if (e.y > GROUND - m * 0.7) { e.target = -Math.PI / 2; return; }
        // Look ahead: steer away from any chain body in front of the head.
        if (e.form === 'orb') return;
        const lookX = e.x + Math.cos(e.angle) * 90;
        const lookY = e.y + Math.sin(e.angle) * 90;
        for (const o of entities) {
            if (!o.alive || o.form !== 'chain') continue;
            for (let i = o === e ? 8 : 0; i < o.birds.length; i += 2) {
                const b = o.birds[i];
                if (dist2(lookX, lookY, b.x, b.y) < 60 * 60) {
                    const side = Math.sign(angleDiff(e.angle, Math.atan2(b.y - e.y, b.x - e.x))) || 1;
                    e.target = e.angle - side * 1.3;
                    return;
                }
            }
        }
    }

    // ---------- simulation ----------
    function step(dt, now) {
        for (const e of entities) {
            if (!e.alive) continue;
            if (e.isPlayer) {
                if (input.active && Math.hypot(input.x - input.ox, input.y - input.oy) > 8 * (input.scale || 1)) {
                    e.target = Math.atan2(input.y - input.oy, input.x - input.ox);
                }
                if (input.keyTurn) e.target = e.angle + input.keyTurn * 0.8;
            } else {
                e.think -= dt;
                if (e.think <= 0) { e.think = rand(0.15, 0.3); think(e, now); }
                avoid(e);
            }
            const turn = e.form === 'orb' ? 1.8 : 3.4;
            e.angle += Math.max(-turn * dt, Math.min(turn * dt, angleDiff(e.angle, e.target)));
            // Side view, so gravity counts: diving is faster, climbing slower.
            const gravity = 1 + Math.sin(e.angle) * (e.form === 'orb' ? 0.1 : 0.25);
            // Slipstream: close behind another chain, heading the same way, gives +20 %.
            e.drafting = e.form === 'chain' && entities.some((o) => {
                if (o === e || !o.alive || o.form !== 'chain' || Math.cos(o.angle - e.angle) < 0.75) return false;
                for (let i = 0; i < o.birds.length; i += 3) {
                    const b = o.birds[i];
                    const d = dist2(e.x, e.y, b.x, b.y);
                    if (d < 110 * 110 && d > 30 * 30) return true;
                }
                return false;
            });
            const v = speedOf(e) * gravity * (e.drafting ? 1.2 : 1);
            e.x += Math.cos(e.angle) * v * dt;
            e.y += Math.sin(e.angle) * v * dt;
            // The edge of the sky is deadly (feedback 10. okt.): the wind walls and the ground.
            const pad = e.form === 'orb' ? orbRadius(e) * 0.5 : 0;
            if (e.x < pad || e.x > W - pad || e.y < 60 + pad || e.y > GROUND - pad) {
                e.edgeDeath = true;
                kill(e, null);
                continue;
            }
            if (e.form === 'orb' && now >= e.orbUntil) unravel(e, now);
            if (e.form === 'chain') {
                e.path.unshift({ x: e.x, y: e.y });
                // Place each bird SPACING px further back along the path.
                let need = SPACING; let index = 0; let acc = 0;
                for (let i = 1; i < e.path.length && index < e.birds.length; i += 1) {
                    const a = e.path[i - 1]; const b = e.path[i];
                    const seg = Math.hypot(a.x - b.x, a.y - b.y);
                    while (acc + seg >= need && index < e.birds.length) {
                        const t = (need - acc) / (seg || 1);
                        e.birds[index].x = a.x + (b.x - a.x) * t;
                        e.birds[index].y = a.y + (b.y - a.y) * t;
                        index += 1;
                        need += SPACING;
                    }
                    acc += seg;
                    if (index >= e.birds.length) { e.path.length = Math.min(e.path.length, i + 2); break; }
                }
            } else {
                const r = orbRadius(e);
                e.birds.forEach((b) => { b.orbA += b.orbSpin * dt; b.x = e.x + Math.cos(b.orbA) * r * b.orbR; b.y = e.y + Math.sin(b.orbA) * r * b.orbR * 0.85; });
            }
            // Stars.
            const reach = e.form === 'orb' ? orbRadius(e) : 30;
            for (let i = stars.length - 1; i >= 0; i -= 1) {
                const s = stars[i];
                if (Math.abs(s.x - e.x) > reach || Math.abs(s.y - e.y) > reach) continue;
                if (dist2(s.x, s.y, e.x, e.y) < reach * reach) {
                    // Three stars make a new bird, so growth stays readable.
                    stars.splice(i, 1);
                    e.bank = (e.bank || 0) + s.value;
                    if (e.isPlayer) sfx('coin', 0.5);
                    while (e.bank >= 3) { e.bank -= 3; grow(e, 1); if (e.isPlayer) sfx('bert-pip', 0.5); }
                }
            }
        }
        collide(now);
        stepHawk(dt, now);
        entities = entities.filter((e) => e.alive);
        while (stars.length < STAR_TARGET) addStar();
    }

    function stepHawk(dt, now) {
        hawk ||= { x: W / 2, y: 200, angle: 0, restUntil: now + 8000, frame: 0 };
        hawk.frame += dt * 10;
        const prey = entities.filter((e) => e.alive && now - e.spawnedAt > 3000).sort((a, b) => size(b) - size(a))[0];
        if (!prey || size(prey) < 15) { hawk.angle += dt * 0.3; }
        else if (now >= hawk.restUntil) {
            // A screech when it turns its attention to you.
            if (prey === player && hawk.lastTarget !== player) sfx('hawk', 0.8);
            hawk.lastTarget = prey;
            hawk.angle += Math.max(-2.2 * dt, Math.min(2.2 * dt, angleDiff(hawk.angle, Math.atan2(prey.y - hawk.y, prey.x - hawk.x))));
        }
        const speed = now < hawk.restUntil ? 160 : 300;
        hawk.x = Math.max(60, Math.min(W - 60, hawk.x + Math.cos(hawk.angle) * speed * dt));
        hawk.y = Math.max(100, Math.min(GROUND - 60, hawk.y + Math.sin(hawk.angle) * speed * dt));
        hawk.prey = prey;
        if (!prey || now < hawk.restUntil) return;
        // How the hawk catches (feedback 10. okt.):
        //  - it hits the LEADER: that chain is out;
        //  - it hits the middle of a chain: it takes 3 birds there and breaks the chain,
        //    the birds behind the break flutter loose as stars (quick: you can grab them back);
        //  - it hits a flok: it takes 3 birds and scatters the flok back into a chain.
        let caught = false;
        if (prey.form === 'orb') {
            const r = orbRadius(prey) + 30;
            if (dist2(hawk.x, hawk.y, prey.x, prey.y) < r * r) {
                prey.birds.splice(0, Math.min(3, prey.birds.length));
                unravel(prey, now);
                caught = true;
            }
        } else if (dist2(hawk.x, hawk.y, prey.x, prey.y) < 55 * 55) {
            prey.hawkDeath = true;
            kill(prey, null);
            caught = true;
        } else {
            const hit = prey.birds.findIndex((b) => dist2(hawk.x, hawk.y, b.x, b.y) < 45 * 45);
            if (hit >= 0) {
                const from = Math.max(0, hit - 1);
                prey.birds.splice(from, 3);                       // the three in its claws
                const loose = prey.birds.splice(from);            // the broken-off tail
                loose.forEach((b) => addStar(b.x + rand(-15, 15), Math.min(GROUND - 20, b.y + rand(10, 40)), 1));
                caught = true;
            }
        }
        if (caught) {
            sfx('hawk', prey.isPlayer ? 1 : nearPlayer(hawk.x, hawk.y) ? 0.5 : 0);
            if (prey.isPlayer && prey.alive) sfx('shield-break', 0.7);
            effect('eat', hawk.x, hawk.y, 170);
            hawk.restUntil = now + 6000;
            hawk.angle = -Math.PI / 2;
        }
    }

    function pointInPolygon(x, y, poly) {
        let inside = false;
        for (let i = 0, j = poly.length - 1; i < poly.length; j = i, i += 1) {
            const a = poly[i]; const b = poly[j];
            if ((a.y > y) !== (b.y > y) && x < ((b.x - a.x) * (y - a.y)) / (b.y - a.y + 1e-9) + a.x) inside = !inside;
        }
        return inside;
    }

    function collide(now) {
        const alive = entities.filter((e) => e.alive);
        for (const a of alive) {
            if (!a.alive) continue;
            for (const b of alive) {
                if (a === b || !b.alive || !a.alive) continue;
                if (now - b.spawnedAt < 3000 || now - a.spawnedAt < 3000) continue; // a 3 s spawn shield
                if (a.form === 'chain' && b.form === 'chain') {
                    // Head into body: the head's owner is out.
                    for (let i = 0; i < b.birds.length; i += 1) {
                        const s = b.birds[i];
                        if (dist2(a.x, a.y, s.x, s.y) < 26 * 26) { kill(a, b); break; }
                    }
                    if (a.alive && b.alive && dist2(a.x, a.y, b.x, b.y) < 26 * 26) {
                        if (size(a) < size(b)) kill(a, b); else if (size(b) < size(a)) kill(b, a); else { kill(a, b); kill(b, a); }
                    }
                } else if (a.form === 'orb' && b.form === 'chain') {
                    const r = orbRadius(a);
                    if (Math.abs(a.x - b.x) > r + size(b) * SPACING) continue;
                    let hit = -1;
                    if (dist2(a.x, a.y, b.x, b.y) < r * r) hit = 0;
                    else for (let i = 0; i < b.birds.length; i += 1) if (dist2(a.x, a.y, b.birds[i].x, b.birds[i].y) < r * r) { hit = i + 1; break; }
                    if (hit < 0) continue;
                    if (size(b) < size(a)) {
                        // The flok eats what it touches. Hit the head and the whole chain is gone.
                        if (hit === 0) { const n = size(b); b.birds.length = 0; eat(a, n, b.x, b.y); kill(b, a); }
                        else { const eaten = b.birds.splice(hit - 1); eat(a, eaten.length, a.x, a.y); }
                    } else {
                        // A longer chain forces the flok to unfold right away.
                        unravel(a, now);
                    }
                } else if (a.form === 'orb' && b.form === 'orb') {
                    const ra = orbRadius(a); const rb = orbRadius(b);
                    if (size(a) >= size(b) * 1.15 && dist2(a.x, a.y, b.x, b.y) < (ra - rb * 0.3) ** 2) { const n = size(b); b.birds.length = 0; eat(a, n, b.x, b.y); kill(b, a); }
                }
            }
            // Ring: a chain whose head comes back to its own body encloses whatever flok is inside.
            if (a.alive && a.form === 'chain' && a.birds.length >= 12) {
                for (let k = 10; k < a.birds.length; k += 1) {
                    if (dist2(a.x, a.y, a.birds[k].x, a.birds[k].y) < 40 * 40) {
                        const ring = [{ x: a.x, y: a.y }, ...a.birds.slice(0, k + 1)];
                        for (const o of alive) {
                            if (o !== a && o.alive && o.form === 'orb' && pointInPolygon(o.x, o.y, ring)) {
                                const n = size(o); o.birds.length = 0;
                                effect('catch', o.x, o.y, orbRadius(o) * 2.6);
                                if (a.isPlayer) sfx('fanfare');
                                eat(a, n, o.x, o.y);
                                kill(o, a);
                            }
                        }
                        break;
                    }
                }
            }
        }
    }

    // ---------- drawing ----------
    function draw(now) {
        const cw = canvas.width; const ch = canvas.height;
        if (ready(art.sky)) {
            // Cover the screen whatever the orientation.
            const k = Math.max(cw / 1280, ch / 720);
            ctx.drawImage(art.sky, (cw - 1280 * k) / 2, (ch - 720 * k) / 2, 1280 * k, 720 * k);
        } else {
            const sky = ctx.createLinearGradient(0, 0, 0, ch);
            sky.addColorStop(0, '#4fb8ec'); sky.addColorStop(1, '#bfe9fb');
            ctx.fillStyle = sky; ctx.fillRect(0, 0, cw, ch);
        }
        if (!player) return;
        // Same amount of sky in both orientations: portrait sees high and low,
        // landscape sees far ahead and behind. The phone's way round is a choice.
        const zoom = (Math.sqrt(cw * ch) / 900) * Math.max(0.55, 1 - (size(player) - 6) * 0.004);
        const camX = player.x; const camY = Math.min(player.y, GROUND - ch / 2 / zoom + 60);
        // Far clouds (parallax).
        for (let i = 0; i < 14; i += 1) {
            const cloud = art.clouds[i % 4];
            const cs = (0.5 + (i % 3) * 0.2) * (ch / 900);
            const px = ((i * 977 - camX * 0.3) % (cw + 600) + cw + 600) % (cw + 600) - 300;
            const py = (i * 173) % (ch * 0.75) + 20 - (camY - H / 2) * 0.05;
            if (ready(cloud)) { ctx.globalAlpha = 0.85; ctx.drawImage(cloud, px, py, 512 * cs, 220 * cs); ctx.globalAlpha = 1; }
        }
        ctx.save();
        ctx.translate(cw / 2, ch / 2);
        ctx.scale(zoom, zoom);
        ctx.translate(-camX, -camY);
        const viewL = camX - cw / 2 / zoom - 80; const viewR = camX + cw / 2 / zoom + 80;
        const viewT = camY - ch / 2 / zoom - 80; const viewB = camY + ch / 2 / zoom + 80;
        // World edges and ground.
        // World edges: walls of wind pointing inward.
        if (ready(art.edge)) {
            for (let y = 60; y < GROUND; y += 256) {
                if (viewL < 200) ctx.drawImage(art.edge, -60, y, 200, 256);
                if (viewR > W - 200) { ctx.save(); ctx.translate(W + 60, y); ctx.scale(-1, 1); ctx.drawImage(art.edge, 0, 0, 200, 256); ctx.restore(); }
            }
        }
        // Ground far below: the round-7 strip, then plain green under it.
        ctx.fillStyle = '#7fcf5a'; ctx.fillRect(-2000, GROUND + 260, W + 4000, 800);
        if (ready(art.ground)) {
            for (let x = Math.floor(viewL / 2560) * 2560; x < viewR; x += 2560) ctx.drawImage(art.ground, x, GROUND - 40, 2560, 300);
        }
        // Stars.
        for (const s of stars) {
            if (s.x < viewL || s.x > viewR || s.y < viewT || s.y > viewB) continue;
            s.spin += 0.04;
            const r = 13 + Math.sin(s.spin) * 1.5;
            if (starArt.complete && starArt.naturalWidth) ctx.drawImage(starArt, s.x - r, s.y - r, r * 2, r * 2);
            else { ctx.fillStyle = '#ffd23b'; ctx.beginPath(); ctx.arc(s.x, s.y, r * 0.7, 0, Math.PI * 2); ctx.fill(); }
        }
        // Birds.
        const sorted = entities.slice().sort((a, b) => size(a) - size(b));
        for (const e of sorted) {
            if (e.x < viewL - 1500 || e.x > viewR + 1500) continue;
            const facing = Math.cos(e.angle) < 0 ? -1 : 1;
            if (e.form === 'orb') {
                const r = orbRadius(e);
                const left = (e.orbUntil - now) / (orbDuration(e) * 1000);
                const glow = e.isPlayer ? art.orbMe : art.orb;
                if (ready(glow)) ctx.drawImage(glow, e.x - (r + 30), e.y - (r + 30), (r + 30) * 2, (r + 30) * 2);
                ctx.strokeStyle = e.isPlayer ? '#b6ff3b' : 'rgba(255,255,255,.85)'; ctx.lineWidth = 5;
                ctx.beginPath(); ctx.arc(e.x, e.y, r + 12, -Math.PI / 2, -Math.PI / 2 + Math.PI * 2 * Math.max(0, left)); ctx.stroke();
            }
            const birdSize = e.form === 'orb' ? 50 : 56;
            // Flap rate: a climbing chain beats hard, a diving one glides (no frames).
            // Calm wings (feedback): glide most of the time, a short burst of beats now and
            // then; steady beats only while climbing.
            const climb = -Math.sin(e.angle);
            const diving = e.form === 'chain' && climb < -0.3;
            const climbing = climb > 0.35;
            const rate = e.form === 'orb' ? 7 : climbing ? 7 + climb * 3 : 8;
            const beat = (offset) => {
                if (diving) return null;
                const t = now / 1000 + offset;
                if (climbing || e.form === 'orb') return t * rate;
                return (t % 1.6) < 0.5 ? t * rate : null; // one short burst every 1.6 s
            };
            for (let i = e.birds.length - 1; i >= 0; i -= 1) {
                const b = e.birds[i];
                const phase = beat(b.flap / 6);
                drawBird(b.hero, b.x, b.y + Math.sin(now / 160 + i) * 2, birdSize, e.form === 'orb' ? (Math.cos(b.orbA) < 0 ? 1 : -1) * Math.sign(b.orbSpin) : facing, phase);
            }
            drawBird(e.hero, e.x, e.y, 74, facing, beat(0));
            if (e === sorted[sorted.length - 1] && ready(art.crown)) {
                const cy = e.form === 'orb' ? e.y - orbRadius(e) - 64 : e.y - 78;
                ctx.drawImage(art.crown, e.x - 22, cy, 44, 44);
            }
            if (e.isPlayer || size(e) >= 20) {
                ctx.font = '900 18px system-ui, sans-serif'; ctx.textAlign = 'center';
                ctx.lineWidth = 5; ctx.strokeStyle = 'rgba(27,42,68,.8)'; ctx.fillStyle = e.isPlayer ? '#b6ff3b' : '#fff';
                const y = e.form === 'orb' ? e.y - orbRadius(e) - 26 : e.y - 42;
                ctx.strokeText(`${e.name} · ${size(e)}`, e.x, y); ctx.fillText(`${e.name} · ${size(e)}`, e.x, y);
            }
        }
        effects = effects.filter((fx) => (fx.age += 1 / 60) < 0.7);
        effects.forEach((fx) => {
            const image = art[fx.kind];
            if (!ready(image)) return;
            const k = 0.7 + fx.age * 0.6;
            ctx.save(); ctx.globalAlpha = 1 - fx.age / 0.7;
            ctx.drawImage(image, fx.x - fx.size * k / 2, fx.y - fx.size * k / 2, fx.size * k, fx.size * k);
            ctx.restore();
        });
        if (hawk) {
            const frame = hawkFrames[Math.floor(hawk.frame) % 4];
            if (frame.complete && frame.naturalWidth) {
                ctx.save();
                ctx.translate(hawk.x, hawk.y);
                if (Math.cos(hawk.angle) > 0) ctx.scale(-1, 1);
                ctx.drawImage(frame, -80, -80, 160, 160);
                ctx.restore();
            }
        }
        // Wind lines behind a drafting head.
        entities.forEach((e) => {
            if (!e.drafting || e.x < viewL || e.x > viewR) return;
            ctx.strokeStyle = 'rgba(255,255,255,.8)'; ctx.lineWidth = 3;
            for (let i = 0; i < 3; i += 1) {
                const off = (i - 1) * 12;
                ctx.beginPath();
                ctx.moveTo(e.x - Math.cos(e.angle) * 30 - Math.sin(e.angle) * off, e.y - Math.sin(e.angle) * 30 + Math.cos(e.angle) * off);
                ctx.lineTo(e.x - Math.cos(e.angle) * 70 - Math.sin(e.angle) * off, e.y - Math.sin(e.angle) * 70 + Math.cos(e.angle) * off);
                ctx.stroke();
            }
        });
        ctx.restore();
        // The hawk is after you: a warning at the screen edge pointing at it.
        if (hawk && hawk.prey === player && now >= hawk.restUntil && running) {
            const a = Math.atan2(hawk.y - camY, hawk.x - camX);
            const ex = cw / 2 + Math.cos(a) * Math.min(cw, ch) * 0.42;
            const ey = ch / 2 + Math.sin(a) * Math.min(cw, ch) * 0.42;
            ctx.save();
            ctx.globalAlpha = 0.6 + Math.sin(now / 120) * 0.3;
            ctx.fillStyle = '#ff4d5e';
            ctx.beginPath(); ctx.arc(ex, ey, 22 * (input.scale || 1), 0, Math.PI * 2); ctx.fill();
            ctx.fillStyle = '#fff'; ctx.font = `900 ${22 * (input.scale || 1)}px system-ui`; ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
            ctx.fillText('!', ex, ey);
            ctx.restore();
        }
        if (input.active && running) {
            const k = input.scale || 1;
            const max = 70 * k;
            const dx = input.x - input.ox; const dy = input.y - input.oy; const d = Math.hypot(dx, dy) || 1;
            const kx = input.ox + dx / d * Math.min(d, max); const ky = input.oy + dy / d * Math.min(d, max);
            ctx.save();
            ctx.globalAlpha = 0.5;
            ctx.fillStyle = 'rgba(8,20,32,.5)';
            ctx.strokeStyle = '#ffffff'; ctx.lineWidth = 3 * k;
            ctx.beginPath(); ctx.arc(input.ox, input.oy, max, 0, Math.PI * 2); ctx.fill(); ctx.stroke();
            ctx.globalAlpha = 0.85;
            ctx.fillStyle = '#b6ff3b';
            ctx.beginPath(); ctx.arc(kx, ky, 30 * k, 0, Math.PI * 2); ctx.fill(); ctx.stroke();
            ctx.restore();
        }
    }
    function drawBird(hero, x, y, s, facing, flap = null) {
        let art = heroArt(hero);
        if (flap !== null) {
            const frame = flapArt(hero, Math.floor(flap));
            if (frame.complete && frame.naturalWidth) art = frame;
        }
        if (!art.complete || !art.naturalWidth) return;
        ctx.save();
        ctx.translate(x, y);
        if (facing < 0) ctx.scale(-1, 1);
        ctx.drawImage(art, -s / 2, -s * 0.45, s, s * 0.9);
        ctx.restore();
    }

    // ---------- HUD ----------
    const sizeEl = document.getElementById('size');
    const boardEl = document.getElementById('board');
    const flokBtn = document.getElementById('flok-btn');
    function hud(now) {
        if (!player) return;
        sizeEl.textContent = String(size(player));
        const top = entities.slice().sort((a, b) => size(b) - size(a)).slice(0, 5);
        boardEl.innerHTML = top.map((e, i) => `<div class="${e.isPlayer ? 'me' : ''}"><b>${i + 1}.</b> ${e.name} · ${size(e)}</div>`).join('')
            + (top.includes(player) ? '' : `<div class="me">… Dig · ${size(player)}</div>`);
        const ready = player.form === 'chain' && size(player) >= ORB_MIN && now >= player.orbReadyAt;
        flokBtn.disabled = !ready;
        flokBtn.classList.toggle('on', ready || player.form === 'orb');
        flokBtn.textContent = player.form === 'orb' ? `${Math.ceil((player.orbUntil - now) / 1000)}s`
            : size(player) < ORB_MIN ? `${size(player)}/${ORB_MIN}` : now < player.orbReadyAt ? `${Math.ceil((player.orbReadyAt - now) / 1000)}s` : 'FLOK';
    }

    // ---------- loop and screens ----------
    function loop(time) {
        requestAnimationFrame(loop);
        const dt = Math.min(0.05, (time - (lastTime || time)) / 1000);
        lastTime = time;
        if (running) step(dt, performance.now());
        draw(performance.now());
        hud(performance.now());
    }
    function resize() {
        const ratio = Math.min(2, window.devicePixelRatio || 1);
        canvas.width = Math.floor(innerWidth * ratio);
        canvas.height = Math.floor(innerHeight * ratio);
        input.scale = ratio;
    }
    function livesText() {
        const st = window.BertMeta?.flokStatus?.();
        if (!st || st.unlimited) return '';
        const hearts = '❤'.repeat(st.lives) + '♡'.repeat(st.max - st.lives);
        const mins = Math.ceil(st.nextInMs / 60000);
        return st.lives >= st.max ? `${hearts}` : `${hearts} · nyt liv om ${mins} min`;
    }
    function refreshLives() {
        const st = window.BertMeta?.flokStatus?.();
        document.querySelectorAll('.lives').forEach((el) => { el.textContent = livesText(); });
        document.querySelectorAll('.buy-life').forEach((btn) => {
            const show = st && !st.unlimited && st.lives <= 0;
            btn.hidden = !show;
            if (show) { btn.textContent = `KØB ET LIV · ${st.cost} FJER (du har ${st.feathers})`; btn.disabled = st.feathers < st.cost; }
        });
        document.querySelectorAll('#play, #again').forEach((btn) => { btn.disabled = Boolean(st && !st.unlimited && st.lives <= 0); });
    }
    function tryStart() {
        const used = window.BertMeta?.useFlokLife?.();
        if (used && !used.ok) { refreshLives(); return; }
        start();
    }
    function start() {
        startMusic();
        entities = []; stars = []; hawk = null; effects = [];
        for (let i = 0; i < STAR_TARGET; i += 1) addStar();
        for (let i = 0; i < BOT_COUNT; i += 1) spawn(false, Math.floor(rand(5, 30)));
        player = spawn(true, 6);
        startedAt = performance.now();
        running = true;
        document.getElementById('start').classList.add('hidden');
        document.getElementById('dead').classList.add('hidden');
        document.body.classList.remove('menu');
    }
    function showDead(killer) {
        running = false;
        const seconds = Math.round((performance.now() - startedAt) / 1000);
        document.getElementById('dead-title').textContent = killer ? `${killer.name} fangede dig!` : player.hawkDeath ? 'Høgen tog dig!' : player.edgeDeath ? 'Du fløj ud af himlen!' : 'Ude!';
        const peak = Math.max(size(player), player.peak || 0);
        document.getElementById('stat-birds').textContent = String(peak);
        document.getElementById('stat-kills').textContent = String(player.kills);
        document.getElementById('stat-time').textContent = `${Math.floor(seconds / 60)}:${String(seconds % 60).padStart(2, '0')}`;
        let best = 0;
        try {
            best = Number(localStorage.getItem('bertFlokBest') || 0);
            if (peak > best) localStorage.setItem('bertFlokBest', String(peak));
        } catch (_) { /* ignore */ }
        document.getElementById('stat-best').textContent = peak > best ? 'Ny rekord!' : `Din rekord: ${best} fugle`;
        setTimeout(() => { refreshLives(); document.body.classList.add('menu'); document.getElementById('dead').classList.remove('hidden'); }, 700);
    }
    function pointer(event) {
        input.x = event.clientX * (input.scale || 1);
        input.y = event.clientY * (input.scale || 1);
    }
    canvas.addEventListener('pointerdown', (e) => {
        input.active = true; input.id = e.pointerId; pointer(e);
        input.ox = input.x; input.oy = input.y;
    });
    canvas.addEventListener('pointermove', (e) => {
        if (!input.active || e.pointerId !== input.id) return;
        pointer(e);
        // The base follows if the finger goes far, so you never run out of stick.
        const max = 70 * (input.scale || 1);
        const dx = input.x - input.ox; const dy = input.y - input.oy; const d = Math.hypot(dx, dy);
        if (d > max) { input.ox = input.x - dx / d * max; input.oy = input.y - dy / d * max; }
    });
    const release = (e) => { if (e.pointerId === input.id) { input.active = false; input.id = null; } };
    window.addEventListener('pointerup', release);
    window.addEventListener('pointercancel', release);
    window.addEventListener('keydown', (e) => {
        if (e.key === 'ArrowLeft' || e.key === 'ArrowUp') input.keyTurn = -1;
        if (e.key === 'ArrowRight' || e.key === 'ArrowDown') input.keyTurn = 1;
        if (e.key === ' ' && player) formOrb(player, performance.now());
    });
    window.addEventListener('keyup', () => { input.keyTurn = 0; });
    flokBtn.addEventListener('pointerdown', (e) => { e.stopPropagation(); if (player) formOrb(player, performance.now()); });
    document.getElementById('play').addEventListener('click', tryStart);
    document.getElementById('again').addEventListener('click', tryStart);
    document.querySelectorAll('.buy-life').forEach((btn) => btn.addEventListener('click', () => { window.BertMeta?.buyFlokLife?.(); refreshLives(); }));
    setInterval(refreshLives, 1000);
    refreshLives();
    document.getElementById('exit').addEventListener('click', () => { location.href = './'; });
    document.getElementById('dead-home').addEventListener('click', () => { location.href = './'; });
    document.body.classList.add('menu');
    window.addEventListener('resize', resize);
    // The main game locks to landscape; Flokken may be played either way round.
    try { screen.orientation?.unlock?.(); } catch (_) { /* not supported */ }
    resize();
    // Idle sky behind the start screen.
    for (let i = 0; i < STAR_TARGET; i += 1) addStar();
    for (let i = 0; i < BOT_COUNT; i += 1) spawn(false, Math.floor(rand(5, 30)));
    player = entities[0];
    running = true;
    requestAnimationFrame(loop);
    window.BertFlok = { get entities() { return entities; }, get player() { return player; }, start, formOrb: () => player && formOrb(player, performance.now()) };
})();
