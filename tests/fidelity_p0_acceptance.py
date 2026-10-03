import asyncio
import json
import socket
import subprocess
import time
from pathlib import Path

from playwright.async_api import async_playwright

PROJECT = Path(__file__).resolve().parents[1]
WEBAPP = PROJECT / "webapp"
OUTPUT = PROJECT.parent / "qa-fidelity-p0"


def available_port():
    with socket.socket() as listener:
        listener.bind(("127.0.0.1", 0))
        return listener.getsockname()[1]


PORT = available_port()
URL = f"http://127.0.0.1:{PORT}/?qa=1&rev=worlds-relay-10"


def ensure(condition, message):
    if not condition:
        raise AssertionError(message)


async def main():
    OUTPUT.mkdir(parents=True, exist_ok=True)
    server = subprocess.Popen(
        ["python3", "-m", "http.server", str(PORT), "--bind", "127.0.0.1"],
        cwd=WEBAPP,
        stdout=subprocess.DEVNULL,
        stderr=subprocess.DEVNULL,
    )
    try:
        time.sleep(0.5)
        async with async_playwright() as playwright:
            browser = await playwright.webkit.launch(headless=True)
            context = await browser.new_context(
                viewport={"width": 852, "height": 393},
                device_scale_factor=2,
                has_touch=True,
                is_mobile=True,
                user_agent=(
                    "Mozilla/5.0 (iPhone; CPU iPhone OS 18_0 like Mac OS X) "
                    "AppleWebKit/605.1.15 (KHTML, like Gecko) CriOS/129.0.0.0 "
                    "Mobile/15E148 Safari/604.1"
                ),
            )
            page = await context.new_page()
            page_errors = []
            request_errors = []
            page.on("pageerror", lambda error: page_errors.append(str(error)))
            page.on("requestfailed", lambda request: request_errors.append({
                "url": request.url,
                "error": request.failure,
            }))

            await page.goto(URL + "&noclip=1", wait_until="networkidle")
            await page.wait_for_function("document.querySelector('#loading').classList.contains('hidden')")
            menu_load = await page.evaluate("BertQA.snapshot()")
            ensure(menu_load["loadedAssetCount"] <= 18, f"Menu eagerly decoded unused level art: {menu_load['loadedAssetKeys']}")
            ensure(not any(key.startswith(("jungle", "spider", "snake", "tunnel", "happyPipe")) for key in menu_load["loadedAssetKeys"]), "Level-specific assets decoded before level selection")
            await page.screenshot(path=OUTPUT / "menu.png")

            await page.evaluate("BertQA.startLevel(1)")
            await page.click("#gameCanvas", position={"x": 426, "y": 120})
            long_run = await page.evaluate("BertQA.simulate(60)")
            groups = long_run["obstacleGroups"]
            ensure(len(groups) <= 3, f"Too many simultaneous obstacle groups after 60 s: {groups}")
            if len(groups) > 1:
                minimum_spacing = min(b - a for a, b in zip(groups, groups[1:]))
                ensure(minimum_spacing >= 750, f"Obstacle groups are too close: {minimum_spacing}px")

            await page.evaluate("BertQA.startLevel(1)")
            await page.click("#gameCanvas", position={"x": 426, "y": 120})
            await page.evaluate("""
                BertQA.addPowerupPickup('Shield', 620, 235);
                BertQA.addPowerupPickup('Magnet', 780, 235);
                BertQA.addPowerupPickup('Focus', 940, 235);
            """)
            await page.wait_for_timeout(120)
            await page.screenshot(path=OUTPUT / "original-powerups.png")

            before_focus = await page.evaluate("BertQA.snapshot()")
            ensure(before_focus['focusAudioDriver'] == 'buffer' and before_focus['focusAudioPrimed'] and before_focus['chopinPaused'], f"Chopin must already be decoded and idle before pickup: {before_focus}")
            await page.evaluate("""() => {
                const descriptor = Object.getOwnPropertyDescriptor(HTMLMediaElement.prototype, 'playbackRate');
                window.__focusRateWrites = 0;
                Object.defineProperty(HTMLMediaElement.prototype, 'playbackRate', {
                    configurable: true,
                    get() { return descriptor.get.call(this); },
                    set(value) { window.__focusRateWrites += 1; descriptor.set.call(this, value); },
                });
            }""")
            await page.evaluate("document.querySelector('#gameCanvas').addEventListener('pointerdown', () => BertQA.activatePowerup('Focus'), {once:true})")
            await page.click("#gameCanvas", position={"x": 426, "y": 120})
            countdown = await page.evaluate('BertQA.snapshot()')
            ensure(countdown['focusPhase'] == 'countdown' and countdown['focusCountdown'] > 2,
                   f'Focus must show 3–2–1 before slowdown: {countdown}')
            ensure(countdown['chopinPaused'] and countdown['focusRemaining'] == 30,
                   'Chopin must remain decoded and silent during the three-second countdown')
            await page.wait_for_function("BertQA.snapshot().focusPhase === 'active'", timeout=15000)
            focus = await page.evaluate("BertQA.snapshot()")
            ensure(focus["focusPhase"] == "active", f"Focus did not become active: {focus}")
            ensure(abs(focus["speed"] - 0.6) < 0.03, f"Focus speed is not 0.6: {focus['speed']}")
            ensure(abs(focus["difficulty"] - 1) < 0.03, f"Focus difficulty is not 1: {focus['difficulty']}")
            ensure(2.6 < focus["stageClock"] - before_focus["stageClock"] < 3.6,
                   'Only the three-second countdown should advance the normal stage clock')
            ensure(focus["musicPaused"] is True, "Level music was not paused after the Focus transition")
            ensure(focus["chopinPaused"] is False, "Chopin did not start during Focus")
            ensure(focus["focusAudioDriver"] == 'buffer' and focus["focusAudioPrimed"] is True and focus["focusReadyState"] >= 2, f"Focus audio was not predecoded before playback: {focus}")
            ensure(focus["musicRate"] == 1 and await page.evaluate("window.__focusRateWrites") == 0, 'Focus must not reconfigure the HTML audio decoder every simulation tick')
            await page.evaluate("BertQA.pauseGame()")
            ensure((await page.evaluate("BertQA.snapshot()"))['chopinPaused'], 'Focus buffer did not pause with the game')
            await page.locator('#resume-btn').click()
            ensure(not (await page.evaluate("BertQA.snapshot()"))['chopinPaused'], 'Decoded Chopin did not resume after pause')
            focus_density = await page.evaluate("BertQA.simulate(4)")
            focus_groups = focus_density["obstacleGroups"]
            ensure(len(focus_groups) <= 3, f"Too many obstacle groups during Focus: {focus_groups}")
            if len(focus_groups) > 1:
                focus_spacing = min(b - a for a, b in zip(focus_groups, focus_groups[1:]))
                ensure(focus_spacing >= 750, f"Focus compressed obstacle spacing: {focus_spacing}px")
            await page.screenshot(path=OUTPUT / "focus-active.png")

            await page.evaluate("async () => { await BertQA.startLevel(1); BertQA.beginRun(); BertQA.setStageClock(220); }")
            late_before_focus = await page.evaluate("BertQA.snapshot()")
            initial_focus = await page.evaluate("""() => {
                BertQA.activatePowerup('Focus');
                return { state: BertQA.snapshot(), badge: document.querySelector('#powerup').textContent };
            }""")
            ensure(initial_focus['state']['focusRemaining'] == 30
                   and initial_focus['state']['focusPhase'] == 'countdown'
                   and 'FOKUS OM 3' in initial_focus['badge'], f"Focus must show countdown without consuming 30 seconds: {initial_focus}")
            await page.evaluate("BertQA.simulate(3.75)")
            late_focus = await page.evaluate("BertQA.snapshot()")
            expected_focus_speed = max(.6, late_before_focus["speed"] * .67)
            ensure(abs(late_focus["speed"] - expected_focus_speed) < .03, f"Late Focus slowdown is too extreme: {late_before_focus['speed']} -> {late_focus['speed']}")
            ensure(28.9 < late_focus['focusRemaining'] < 29.5, f"The 30-second Focus starts only after countdown: {late_focus['focusRemaining']}")
            await page.evaluate("BertQA.simulate(28)")
            near_end = await page.evaluate("BertQA.snapshot()")
            ensure(near_end['focusPhase'] == 'active' and near_end['focusRemaining'] > 0.5, f"Focus ended before thirty seconds: {near_end['focusRemaining']}")
            ensure(abs(near_end['speed'] - expected_focus_speed) < .03, 'Focus speed changed during its extended duration')
            await page.evaluate("BertQA.simulate(1.5)")
            ensure((await page.evaluate("BertQA.snapshot()"))['focusPhase'] == 'exit', 'Focus failed to enter its normal exit phase after thirty seconds')
            await page.evaluate("BertQA.simulate(2.1)")
            ensure((await page.evaluate("BertQA.snapshot()"))['focusPhase'] == 'idle', 'Focus did not restore stage speed after the exit fade')

            await page.evaluate("async () => { await BertQA.startLevel(3); BertQA.beginRun(); }")
            flappy_normal_speed = (await page.evaluate("BertQA.snapshot()"))["speed"]
            await page.evaluate("BertQA.activatePowerup('Focus'); BertQA.simulate(3.75)")
            flappy_focus = await page.evaluate("BertQA.snapshot()")
            ensure(flappy_focus["speed"] < flappy_normal_speed, f"Focus must not accelerate Flappy: {flappy_normal_speed} -> {flappy_focus['speed']}")

            await page.evaluate("async () => { await BertQA.startLevel(1); BertQA.beginRun(); for (let index = 0; index < 8; index++) BertQA.spawnObstacle(); }")
            desert_obstacles = (await page.evaluate("BertQA.snapshot()"))["obstacleGeometry"]
            desert_gaps = [next(obstacle["gap"] for obstacle in desert_obstacles if obstacle["id"] == index) for index in range(8)]
            ensure(all(258 <= gap <= 349 for gap in desert_gaps), f"Desert opening outside safe design envelope: {desert_gaps}")
            ensure(all(desert_gaps[index] < 299 for index in (2, 6)), f"The occasional narrow Desert passage is missing: {desert_gaps}")
            ensure(all(desert_gaps[index] >= 300 for index in (0, 1)), f"Desert opens with an unfair passage: {desert_gaps}")

            await page.set_viewport_size({"width": 393, "height": 852})
            await page.wait_for_function("BertQA.snapshot().orientationPaused === true")
            portrait_before = await page.evaluate("BertQA.snapshot()")
            await page.wait_for_timeout(1000)
            portrait_after = await page.evaluate("BertQA.snapshot()")
            ensure(abs(portrait_after["elapsed"] - portrait_before["elapsed"]) < 0.001, "Gameplay advanced behind the portrait rotate gate")
            await page.screenshot(path=OUTPUT / "portrait-paused.png")
            await page.set_viewport_size({"width": 852, "height": 393})
            await page.wait_for_function("BertQA.snapshot().orientationPaused === false")

            await page.evaluate("BertQA.triggerDeath()")
            await page.wait_for_function("BertQA.snapshot().phase === 'gameover'", timeout=15000)
            result = await page.evaluate("BertQA.snapshot()")
            ensure(result["phase"] == "gameover", f"Forced death did not reach game over: {result}")
            ensure(result["obstacleCount"] == 0 and result["collectibleCount"] == 0, "Gameplay objects remained behind the result screen")

            geometry = await page.evaluate("""
                () => {
                    const box = (selector) => {
                        const r = document.querySelector(selector).getBoundingClientRect();
                        return {x:r.x,y:r.y,width:r.width,height:r.height,right:r.right,bottom:r.bottom};
                    };
                    return {
                        board: box('.scoreboard'),
                        actions: box('.result-actions'),
                        values: [
                            '#final-highscore','#final-score','#record-time',
                            '#final-time','#record-streak','#final-streak'
                        ].map(box)
                    };
                }
            """)
            board = geometry["board"]
            for value in geometry["values"]:
                ensure(value["x"] >= board["x"] - 2 and value["right"] <= board["right"] + 2, "Result value escaped scoreboard horizontally")
                ensure(value["y"] >= board["y"] - 2 and value["bottom"] <= board["bottom"] + 2, "Result value escaped scoreboard vertically")
            ensure(geometry["actions"]["bottom"] <= 393, "Result buttons overflow the landscape viewport")
            await page.screenshot(path=OUTPUT / "result-board.png")

            await page.goto(URL, wait_until="networkidle")
            await page.wait_for_function("document.querySelector('#loading').classList.contains('hidden')")
            await page.evaluate("async () => { await BertQA.startLevel(4); BertQA.beginRun(); BertQA.setBird(185,360,0); BertQA.addObstacle({kind:'jungle-spider',x:560,y:80,width:124,height:87,harmful:false,baseY:80,attackState:'idle'}); }")
            spider_warning = await page.evaluate("BertQA.simulate(0.2)")
            locked_lane = spider_warning["enemyStates"][0]["targetY"]
            ensure(spider_warning["enemyStates"][0]["warningVisible"], "Spider warning did not appear before the lunge")
            ensure(locked_lane is not None, "Spider did not lock a target lane")
            await page.screenshot(path=OUTPUT / "spider-warning.png")
            await page.evaluate("BertQA.setBird(185, 480, 0)")
            spider_attack = await page.evaluate("BertQA.simulate(0.68)")
            ensure("spiderCatch17" in spider_attack["loadedAssetKeys"], "Jungle capture bundle did not load on level selection")
            ensure(spider_attack["enemyStates"][0]["attackState"] == "attacking", f"Spider did not launch: {spider_attack}")
            ensure(spider_attack["enemyStates"][0]["y"] > 170, f"Spider did not lunge toward Bert: {spider_attack}")
            ensure(spider_attack["enemyStates"][0]["targetY"] == locked_lane, "Spider retargeted after its warning")
            await page.screenshot(path=OUTPUT / "spider-lunge.png")

            await page.goto(URL, wait_until="networkidle")
            await page.wait_for_function("document.querySelector('#loading').classList.contains('hidden')")
            await page.evaluate("async () => { await BertQA.startLevel(4); BertQA.beginRun(); BertQA.setBird(185,330,0); BertQA.addObstacle({kind:'jungle-snake',x:560,y:500,width:103,height:160,scale:1.35,harmful:false,baseBottom:660,attackState:'idle'}); }")
            snake_attack = await page.evaluate("BertQA.simulate(0.4)")
            ensure(snake_attack["enemyStates"][0]["attackState"] == "attacking", f"Snake did not jump: {snake_attack}")
            ensure(snake_attack["enemyStates"][0]["attackFrame"] >= 3, f"Snake jump did not reach its strike frames: {snake_attack}")
            ensure(snake_attack["enemyStates"][0]["renderY"] < 390, f"Snake did not extend upward: {snake_attack}")
            await page.screenshot(path=OUTPUT / "snake-jump.png")

            async def jungle_hit(kind, bird_y, obstacle_y, filename):
                await page.goto(URL, wait_until="networkidle")
                await page.wait_for_function("document.querySelector('#loading').classList.contains('hidden')")
                await page.evaluate("async () => { await BertQA.startLevel(4); BertQA.beginRun(); }")
                await page.evaluate(
                    "([kind,birdY,obstacleY]) => { BertQA.setBird(185,birdY,0); BertQA.addObstacle({kind,x:185,y:obstacleY,width:kind==='jungle-spider'?124:105,height:kind==='jungle-spider'?87:164}); }",
                    [kind, bird_y, obstacle_y],
                )
                await page.wait_for_function("BertQA.snapshot().phase === 'dead'", timeout=5000)
                hit = await page.evaluate("BertQA.snapshot()")
                ensure(hit["phase"] == "dead", f"{kind} did not trigger death: {hit}")
                ensure(hit["deathCause"] == kind, f"Wrong death cause for {kind}: {hit}")
                ensure(hit["birdsVisible"] is False, f"Normal Bert sprite remained visible for {kind}: {hit}")
                await page.evaluate("seconds => BertQA.simulate(seconds)", 2.08 if kind == "jungle-spider" else 0.35)
                capture = await page.evaluate("BertQA.snapshot()")
                minimum_frame = 16 if kind == "jungle-spider" else 2
                ensure(capture["deathCaptureFrame"] >= minimum_frame, f"Capture sequence did not advance for {kind}: {capture}")
                await page.screenshot(path=OUTPUT / filename)
                await page.wait_for_function("BertQA.snapshot().phase === 'gameover'", timeout=15000)
                finished = await page.evaluate("BertQA.snapshot()")
                ensure(finished["phase"] == "gameover", f"{kind} death did not reach result screen: {finished}")
                return capture

            spider_capture = await jungle_hit("jungle-spider", 300, 300, "spider-hit.png")
            snake_capture = await jungle_hit("jungle-snake", 430, 430, "snake-hit.png")

            report = {
                "menu_load": menu_load,
                "long_run": long_run,
                "focus": focus,
                "focus_density": focus_density,
                "late_focus": late_focus,
                "flappy_focus": flappy_focus,
                "desert_gaps": desert_gaps,
                "spider_attack": spider_attack,
                "spider_warning": spider_warning,
                "snake_attack": snake_attack,
                "spider_capture": spider_capture,
                "snake_capture": snake_capture,
                "result_geometry": geometry,
                "page_errors": page_errors,
                "request_errors": request_errors,
            }
            ensure(not page_errors, f"Page errors: {page_errors}")
            material_request_errors = [
                item for item in request_errors
                if not any(token in str(item.get("error", "")).upper() for token in ("ABORTED", "CANCELLED"))
            ]
            ensure(not material_request_errors, f"Request errors: {material_request_errors}")
            (OUTPUT / "report.json").write_text(json.dumps(report, indent=2), encoding="utf-8")
            await browser.close()
    finally:
        server.terminate()
        server.wait(timeout=5)


if __name__ == "__main__":
    asyncio.run(main())
