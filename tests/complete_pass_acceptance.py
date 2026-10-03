import asyncio
import json
import socket
import subprocess
import time
from pathlib import Path

from playwright.async_api import async_playwright

PROJECT = Path(__file__).resolve().parents[1]
WEBAPP = PROJECT / "webapp"
OUTPUT = PROJECT.parent / "qa-complete-pass"


def free_port():
    with socket.socket() as listener:
        listener.bind(("127.0.0.1", 0))
        return listener.getsockname()[1]


def ensure(condition, message):
    if not condition:
        raise AssertionError(message)


async def main():
    port = free_port()
    url = f"http://127.0.0.1:{port}/?qa=1&noclip=1&rev=complete-pass-1"
    OUTPUT.mkdir(parents=True, exist_ok=True)
    server = subprocess.Popen(
        ["python3", "-m", "http.server", str(port), "--bind", "127.0.0.1"],
        cwd=WEBAPP,
        stdout=subprocess.DEVNULL,
        stderr=subprocess.DEVNULL,
    )
    report = {"url": url, "engine": "Playwright WebKit / Chrome iOS user agent"}
    try:
        time.sleep(0.5)
        async with async_playwright() as playwright:
            browser = await playwright.webkit.launch(headless=True)
            context = await browser.new_context(
                viewport={"width": 852, "height": 393},
                device_scale_factor=2,
                is_mobile=True,
                has_touch=True,
                user_agent=(
                    "Mozilla/5.0 (iPhone; CPU iPhone OS 18_0 like Mac OS X) "
                    "AppleWebKit/605.1.15 (KHTML, like Gecko) CriOS/130.0.6723.90 "
                    "Mobile/15E148 Safari/604.1"
                ),
            )
            page = await context.new_page()
            page_errors = []
            failed_requests = []
            page.on("pageerror", lambda error: page_errors.append(str(error)))
            page.on("requestfailed", lambda request: failed_requests.append(f"{request.url}: {request.failure}"))
            await page.goto(url, wait_until="networkidle")
            await page.locator("#loading").wait_for(state="hidden")

            shell = await page.locator("#game-shell").bounding_box()
            ensure(shell is not None, "Missing fixed stage")
            ensure(abs(shell["width"] / shell["height"] - 16 / 9) < 0.01, f"Stage is not 16:9: {shell}")
            ensure(shell["height"] >= 392, f"Landscape stage does not use the full available height: {shell}")

            await page.locator("#play-btn").click()
            await page.locator("#level-menu").wait_for(state="visible")
            ensure(await page.locator(".mode-tab").count() == 3, "Mode-first selector is missing")
            ensure(await page.locator(".level-card:not(.mode-hidden)").count() == 3, "Classic mode should expose three levels")
            await page.locator('.mode-tab[data-mode="tunnel"]').click()
            ensure(await page.locator(".level-2:not(.mode-hidden)").count() == 1, "Tunnel mode did not isolate Tunnel Training")
            await page.locator("#back-to-main").click()

            await page.locator('#hero-selector').click()
            await page.locator('#hero-modal').wait_for(state='visible')
            ensure(await page.locator('.hero-option.locked').count() == 11, 'Only Bert should be available in a fresh wardrobe')
            await page.evaluate("BertMeta.recordRun({levelId:1, mode:'classic', score:120, stars:0})")
            await page.locator('#confirm-hero').click()
            await page.locator('#hero-selector').click()
            await page.locator('[data-hero="block"]').click()
            hero = await page.evaluate('BertQA.snapshot()')
            ensure(hero['hero'] == 'block', 'Desert achievement did not equip BrickBird')
            await page.locator('#confirm-hero').click()
            ensure((await page.locator('#selected-hero-name').text_content()).strip() == 'BRICKBIRD', 'Compact hero selector did not mirror the wardrobe choice')

            await page.locator("#settings-btn").click()
            await page.locator("#settings-modal").wait_for(state="visible")
            await page.locator("#setting-music").uncheck()
            settings = await page.evaluate("BertQA.snapshot().meta.settings")
            ensure(settings["music"] is False, f"Music preference did not persist: {settings}")
            await page.locator("#setting-music").check()
            await page.locator("#close-settings").click()

            await page.locator("#daily-btn").click()
            await page.locator("#hud").wait_for(state="visible")
            daily = await page.evaluate("BertQA.snapshot()")
            ensure(daily["dailyKey"] and daily["dailyTarget"] >= 30, f"Daily route did not start: {daily}")
            await page.evaluate("BertQA.simulate(.2)")
            await page.screenshot(path=OUTPUT / "brickbird-gameplay.png")

            await page.evaluate("BertQA.pauseGame()")
            paused = await page.evaluate("BertQA.snapshot()")
            ensure(paused["phase"] == "paused", f"Pause did not engage: {paused}")
            elapsed = paused["elapsed"]
            await page.evaluate("BertQA.simulate(1)")
            ensure(abs((await page.evaluate("BertQA.snapshot().elapsed")) - elapsed) < 0.001, "Paused simulation advanced")
            await page.screenshot(path=OUTPUT / "pause-menu.png")
            await page.locator("#resume-btn").click()

            await page.evaluate("BertQA.startLevel(2)")
            await page.wait_for_function("BertQA.snapshot().phase === 'prewarm'")
            await page.evaluate("BertQA.beginRun(); BertQA.simulate(12)")
            tunnel = await page.evaluate("BertQA.snapshot()")
            ensure(tunnel["levelKind"] == "tunnel", f"Tunnel level did not start: {tunnel}")
            ensure(tunnel["birdWidth"] == 88 and tunnel["birdHeight"] == 80, f"Tunnel hero is not reduced: {tunnel}")
            ensure("tunnelSky" in tunnel["loadedAssetKeys"], "Tunnel art was not loaded on demand")
            ensure(tunnel["collectibleCount"] > 0, "Tunnel did not generate a star route")
            await page.screenshot(path=OUTPUT / "tunnel-training.png")

            await page.evaluate("BertQA.finishDeath()")
            await page.locator("#game-over").wait_for(state="visible")
            await page.wait_for_timeout(850)
            result_layout = await page.evaluate(
                """() => {
                    const take = (selector) => {
                        const rect = document.querySelector(selector).getBoundingClientRect();
                        return {left: rect.left, right: rect.right, top: rect.top, bottom: rect.bottom, width: rect.width, height: rect.height};
                    };
                    const board = take('.scoreboard');
                    const medal = take('#result-medal');
                    const actions = take('.result-actions');
                    const stage = take('#game-shell');
                    const overlap = board.left < medal.right && board.right > medal.left && board.top < medal.bottom && board.bottom > medal.top;
                    return {board, medal, actions, stage, medalOverlapsBoard: overlap};
                }"""
            )
            ensure(not result_layout["medalOverlapsBoard"], f"Medal obscures the original scoreboard: {result_layout}")
            ensure(result_layout["medal"]["width"] >= 45, f"Result medal did not finish its entrance animation: {result_layout}")
            ensure(result_layout["medal"]["bottom"] + 2 <= result_layout["actions"]["top"], f"Result medal overlaps the replay controls: {result_layout}")
            ensure(result_layout["actions"]["bottom"] <= result_layout["stage"]["bottom"] + 1, f"Result actions leave the stage: {result_layout}")
            await page.screenshot(path=OUTPUT / "result-screen.png")

            await page.evaluate("BertQA.startLevel(5)")
            await page.wait_for_function("BertQA.snapshot().phase === 'prewarm'")
            await page.evaluate("""
                BertQA.beginRun();
                BertQA.addObstacle({kind:'happy-pipe',x:820,y:0,width:132,height:210,gap:280,baseGapTop:210,color:'purple',top:true,motionAmplitude:35,motionSpeed:1,motionPhase:0});
                BertQA.addObstacle({kind:'happy-pipe',x:820,y:490,width:132,height:230,gap:280,baseGapTop:210,color:'purple',top:false,motionAmplitude:35,motionSpeed:1,motionPhase:0});
                BertQA.simulate(.5);
            """)
            happy = await page.evaluate("BertQA.snapshot()")
            ensure(happy["happyPipeCount"] >= 2 and happy["happyPipeCount"] % 2 == 0, f"Happy Pipe pair missing: {happy}")
            ensure("happyPipePurple" in happy["loadedAssetKeys"], "Happy Pipe art was not loaded")
            await page.screenshot(path=OUTPUT / "happy-pipes.png")

            frame_stats = await page.evaluate("""() => new Promise((resolve) => {
                const samples = [];
                let last = performance.now();
                const tick = (now) => {
                    samples.push(now - last); last = now;
                    if (samples.length >= 90) {
                        const sorted = samples.slice(5).sort((a,b) => a-b);
                        resolve({average: sorted.reduce((a,b) => a+b,0)/sorted.length, p95: sorted[Math.floor(sorted.length*.95)]});
                    } else requestAnimationFrame(tick);
                };
                requestAnimationFrame(tick);
            })""")
            # Headless WebKit throttles mobile requestAnimationFrame to roughly 25 Hz
            # in this environment. The gate catches pathological stalls, while the
            # fixed-step simulation tests independently protect gameplay timing.
            ensure(frame_stats["average"] < 60 and frame_stats["p95"] < 85, f"Frame pacing contains pathological stalls: {frame_stats}")

            material_failures = [item for item in failed_requests if "ABORTED" not in item.upper() and "CANCELLED" not in item.upper()]
            ensure(not page_errors, f"Page errors: {page_errors}")
            ensure(not material_failures, f"Failed requests: {material_failures}")
            report.update({
                "stage": shell,
                "hero": hero,
                "settings": settings,
                "daily": daily,
                "pause": paused,
                "tunnel": tunnel,
                "resultLayout": result_layout,
                "happy": happy,
                "framePacing": frame_stats,
                "pageErrors": page_errors,
                "failedRequests": material_failures,
            })
            (OUTPUT / "report.json").write_text(json.dumps(report, indent=2), encoding="utf-8")
            await browser.close()
    finally:
        server.terminate()
        server.wait(timeout=5)

    print(json.dumps({"status": "passed", "report": str(OUTPUT / "report.json")}, indent=2))


if __name__ == "__main__":
    asyncio.run(main())
