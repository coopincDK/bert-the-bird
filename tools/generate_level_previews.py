#!/usr/bin/env python3
"""Capture deterministic in-engine previews for all nine level cards."""

from __future__ import annotations

import asyncio
import socket
import subprocess
import time
from pathlib import Path

from PIL import Image, ImageOps
from playwright.async_api import async_playwright

PROJECT = Path(__file__).resolve().parents[1]
WEBAPP = PROJECT / "webapp"
OUTPUT = WEBAPP / "assets" / "unity" / "ui" / "previews"
LEVELS = (1, 4, 5, 3, 6, 7, 2, 8, 9)


def free_port() -> int:
    with socket.socket() as sock:
        sock.bind(("127.0.0.1", 0))
        return int(sock.getsockname()[1])


async def render(port: int) -> None:
    OUTPUT.mkdir(parents=True, exist_ok=True)
    async with async_playwright() as playwright:
        browser = await playwright.chromium.launch(executable_path="/usr/bin/chromium", args=["--no-sandbox"])
        context = await browser.new_context(viewport={"width": 1280, "height": 720})
        page = await context.new_page()
        await page.goto(f"http://127.0.0.1:{port}/?qa=1&noclip=1&rev=preview-generator", wait_until="networkidle")
        await page.locator("#loading").wait_for(state="hidden")
        await page.evaluate("document.querySelector('#hud').style.visibility = 'hidden'")
        canvas = page.locator("#gameCanvas")

        for level_id in LEVELS:
            await page.evaluate(
                """async ({ levelId }) => {
                    await BertQA.startLevel(levelId, { seed: 41000 + levelId });
                    BertQA.beginRun();
                    if (levelId === 7) {
                        const pair = (id, x, gapTop, gap, moving) => {
                            BertQA.addObstacle({id, x, y: 0, width: 118, height: gapTop, kind: 'flappy-pipe', top: true, moving, harmful: true, baseGapTop: gapTop, gap});
                            BertQA.addObstacle({id, x, y: gapTop + gap, width: 118, height: 720 - gapTop - gap, kind: 'flappy-pipe', top: false, moving, harmful: true, baseGapTop: gapTop, gap});
                        };
                        pair(91, 720, 170, 266, false);
                        pair(92, 1080, 255, 266, true);
                    } else {
                        BertQA.spawnObstacle();
                    }
                    BertQA.simulate(levelId === 4 ? 0.8 : 0.45);
                    BertQA.setBird(250, 302, 0);
                    await new Promise(requestAnimationFrame);
                    await new Promise(requestAnimationFrame);
                }""",
                {"levelId": level_id},
            )
            source = OUTPUT / f"level-{level_id}-source.png"
            target = OUTPUT / f"level-{level_id}.png"
            await canvas.screenshot(path=source)
            with Image.open(source).convert("RGB") as image:
                ImageOps.fit(image, (398, 221), method=Image.Resampling.LANCZOS).save(target, optimize=True)
            source.unlink()

        await context.close()
        await browser.close()


def main() -> None:
    port = free_port()
    server = subprocess.Popen(
        ["python3", "-m", "http.server", str(port), "--directory", str(WEBAPP)],
        stdout=subprocess.DEVNULL,
        stderr=subprocess.STDOUT,
    )
    try:
        time.sleep(0.35)
        asyncio.run(render(port))
    finally:
        server.terminate()
        server.wait(timeout=5)


if __name__ == "__main__":
    main()
