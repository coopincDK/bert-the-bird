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
    const starArt = img('assets/unity/ui/menu-star.webp');

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
        const x = rand(400, W - 400);
        const y = rand(300, GROUND - 300);
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
        try { return JSON.parse(localStorage.getItem('bertTheBird_meta') || '{}').player?.name || ''; } catch (_) { return ''; }
    }

    const size = (e) => e.birds.length + 1;
    const orbRadius = (e) => 26 + Math.sqrt(size(e)) * 17;
    const speedOf = (e) => (e.form === 'orb'
        ? Math.max(85, 230 * Math.pow(ORB_MIN / size(e), 0.45))
        : Math.max(185, 265 - size(e) * 0.7));
    const orbDuration = (e) => Math.min(25, 10 + size(e) * 0.5);

    function formOrb(e, now) {
        if (e.form !== 'chain' || size(e) < ORB_MIN || now < e.orbReadyAt) return false;
        e.form = 'orb';
        e.orbUntil = now + orbDuration(e) * 1000;
        return true;
    }
    function unravel(e, now) {
        if (e.form !== 'orb') return;
        e.form = 'chain';
        e.orbReadyAt = now + 8000;
        // The birds string out behind the leader along the current heading.
        e.path = [];
        for (let i = 0; i < size(e) * SPACING + 10; i += 4) e.path.push({ x: e.x - Math.cos(e.angle) * i, y: e.y - Math.sin(e.angle) * i });
    }
    function kill(e, killer = null) {
        if (!e.alive) return;
        e.alive = false;
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
    }
    // Eating birds: 60 % join you, the rest fall as stars, so one big flok cannot snowball forever.
    function eat(e, n, x, y) {
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
        if (e.x < 200) e.target = 0;
        if (e.x > W - 200) e.target = Math.PI;
        if (e.y < 240) e.target = Math.PI / 2;
        if (e.y > GROUND - 160) e.target = -Math.PI / 2;
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
            const v = speedOf(e);
            e.x = Math.max(40, Math.min(W - 40, e.x + Math.cos(e.angle) * v * dt));
            e.y = Math.max(80, Math.min(GROUND - 30, e.y + Math.sin(e.angle) * v * dt));
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
                    while (e.bank >= 3) { e.bank -= 3; grow(e, 1); }
                }
            }
        }
        collide(now);
        entities = entities.filter((e) => e.alive);
        while (stars.length < STAR_TARGET) addStar();
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
                if (now - b.spawnedAt < 1500 || now - a.spawnedAt < 1500) continue; // a short spawn shield
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
        const sky = ctx.createLinearGradient(0, 0, 0, ch);
        sky.addColorStop(0, '#4fb8ec'); sky.addColorStop(1, '#bfe9fb');
        ctx.fillStyle = sky; ctx.fillRect(0, 0, cw, ch);
        if (!player) return;
        // Same amount of sky in both orientations: portrait sees high and low,
        // landscape sees far ahead and behind. The phone's way round is a choice.
        const zoom = (Math.sqrt(cw * ch) / 900) * Math.max(0.55, 1 - (size(player) - 6) * 0.004);
        const camX = player.x; const camY = Math.min(player.y, GROUND - ch / 2 / zoom + 60);
        // Far clouds (parallax).
        ctx.fillStyle = 'rgba(255,255,255,.75)';
        for (let i = 0; i < 18; i += 1) {
            const px = ((i * 977 - camX * 0.3) % (cw + 400) + cw + 400) % (cw + 400) - 200;
            const py = (i * 131) % (ch * 0.7) + 30 - (camY - H / 2) * 0.05;
            ctx.beginPath(); ctx.ellipse(px, py, 90, 26, 0, 0, Math.PI * 2); ctx.ellipse(px + 50, py - 14, 60, 24, 0, 0, Math.PI * 2); ctx.fill();
        }
        ctx.save();
        ctx.translate(cw / 2, ch / 2);
        ctx.scale(zoom, zoom);
        ctx.translate(-camX, -camY);
        const viewL = camX - cw / 2 / zoom - 80; const viewR = camX + cw / 2 / zoom + 80;
        const viewT = camY - ch / 2 / zoom - 80; const viewB = camY + ch / 2 / zoom + 80;
        // World edges and ground.
        ctx.strokeStyle = 'rgba(255,255,255,.5)'; ctx.lineWidth = 8; ctx.setLineDash([30, 24]);
        ctx.strokeRect(0, 60, W, GROUND - 60); ctx.setLineDash([]);
        ctx.fillStyle = '#7fcf5a'; ctx.fillRect(-2000, GROUND, W + 4000, 800);
        ctx.fillStyle = '#5fae43';
        for (let x = Math.floor(viewL / 220) * 220; x < viewR; x += 220) { ctx.beginPath(); ctx.ellipse(x, GROUND + 10, 140, 50, 0, Math.PI, 0); ctx.fill(); }
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
                ctx.fillStyle = e.isPlayer ? 'rgba(182,255,59,.16)' : 'rgba(255,255,255,.16)';
                ctx.beginPath(); ctx.arc(e.x, e.y, r + 12, 0, Math.PI * 2); ctx.fill();
                ctx.strokeStyle = e.isPlayer ? '#b6ff3b' : 'rgba(255,255,255,.85)'; ctx.lineWidth = 5;
                ctx.beginPath(); ctx.arc(e.x, e.y, r + 12, -Math.PI / 2, -Math.PI / 2 + Math.PI * 2 * Math.max(0, left)); ctx.stroke();
            }
            const birdSize = e.form === 'orb' ? 50 : 56;
            for (let i = e.birds.length - 1; i >= 0; i -= 1) {
                const b = e.birds[i];
                drawBird(b.hero, b.x, b.y + Math.sin(now / 160 + i) * 2, birdSize, e.form === 'orb' ? (Math.cos(b.orbA) < 0 ? 1 : -1) * Math.sign(b.orbSpin) : facing);
            }
            drawBird(e.hero, e.x, e.y, 74, facing);
            if (e.isPlayer || size(e) >= 20) {
                ctx.font = '900 18px system-ui, sans-serif'; ctx.textAlign = 'center';
                ctx.lineWidth = 5; ctx.strokeStyle = 'rgba(27,42,68,.8)'; ctx.fillStyle = e.isPlayer ? '#b6ff3b' : '#fff';
                const y = e.form === 'orb' ? e.y - orbRadius(e) - 26 : e.y - 42;
                ctx.strokeText(`${e.name} · ${size(e)}`, e.x, y); ctx.fillText(`${e.name} · ${size(e)}`, e.x, y);
            }
        }
        ctx.restore();
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
    function drawBird(hero, x, y, s, facing) {
        const art = heroArt(hero);
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
    function start() {
        entities = []; stars = [];
        for (let i = 0; i < STAR_TARGET; i += 1) addStar();
        for (let i = 0; i < BOT_COUNT; i += 1) spawn(false, Math.floor(rand(5, 30)));
        player = spawn(true, 6);
        startedAt = performance.now();
        running = true;
        document.getElementById('start').classList.add('hidden');
        document.getElementById('dead').classList.add('hidden');
    }
    function showDead(killer) {
        running = false;
        const seconds = Math.round((performance.now() - startedAt) / 1000);
        document.getElementById('dead-title').textContent = killer ? `${killer.name} fangede dig!` : 'UDE!';
        document.getElementById('dead-text').textContent = `Du nåede ${size(player)} fugle og fangede ${player.kills} på ${seconds} sekunder.`;
        try {
            const best = Number(localStorage.getItem('bertFlokBest') || 0);
            if (size(player) > best) localStorage.setItem('bertFlokBest', String(size(player)));
        } catch (_) { /* ignore */ }
        setTimeout(() => document.getElementById('dead').classList.remove('hidden'), 700);
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
    document.getElementById('play').addEventListener('click', start);
    document.getElementById('again').addEventListener('click', start);
    document.getElementById('exit').addEventListener('click', () => { location.href = './'; });
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
