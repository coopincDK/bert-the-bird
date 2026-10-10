"""iPhone acceptance for the concert crowd, free-moving pickups and true foreground depth."""
import asyncio
import json
import socket
import subprocess
import time
from pathlib import Path

from playwright.async_api import async_playwright

PROJECT = Path(__file__).resolve().parents[1]
OUTPUT = PROJECT.parent / 'qa-edm-motion'
BUILD = 'worlds-relay-118'


def free_port():
    with socket.socket() as sock:
        sock.bind(('127.0.0.1', 0))
        return sock.getsockname()[1]


async def run_phone(browser, port, width, height):
    page = await browser.new_page(viewport={'width': width, 'height': height}, device_scale_factor=2)
    await page.emulate_media(reduced_motion='no-preference')
    errors = []
    page.on('pageerror', lambda error: errors.append(str(error)))
    await page.goto(f'http://127.0.0.1:{port}/?qa=1&noclip=1&rev={BUILD}', wait_until='networkidle')
    await page.wait_for_function("document.querySelector('#loading').classList.contains('hidden')")
    await page.locator('#play-btn').click()
    await page.locator('#edm-event-btn').click()
    await page.wait_for_function("BertQA.snapshot().phase === 'prewarm'")
    await page.locator('#gameCanvas').click(position={'x': 340, 'y': 160})
    await page.wait_for_function("BertQA.snapshot().phase === 'playing'")

    first = await page.evaluate('BertQA.snapshot()')
    assert first['crowdFrames'] == 3, first['crowdFrames']
    second = first
    for _ in range(8):
        if second['crowdFrame'] != first['crowdFrame']:
            break
        second = await page.evaluate('BertQA.simulate(0.12)')
    assert second['crowdFrame'] != first['crowdFrame'], (
        first['crowdFrame'], second['crowdFrame'],
        await page.evaluate("matchMedia('(prefers-reduced-motion: reduce)').matches"))
    assert not second['edmMusicPaused'], 'Concert music still starts from the trusted gameplay gesture.'

    # drawImage order is a stronger test than comparing semitransparent crowd pixels.
    order = await page.evaluate('''() => {
        const ctx = document.querySelector('#gameCanvas').getContext('2d');
        const original = ctx.drawImage;
        const calls = [];
        BertQA.setBird(185, 600, 0);
        ctx.drawImage = function (image, ...args) {
            if (image.width === 1280 && image.height === 124 && image.tagName !== 'IMG') calls.push('crowd');
            if (image.src && image.src.includes('/bird/fly-')) calls.push('bird');
            return original.call(this, image, ...args);
        };
        try { BertQA.renderNow(); } finally { ctx.drawImage = original; }
        return calls;
    }''')
    assert 'bird' in order and 'crowd' in order and order.index('bird') < order.index('crowd'), (order, second['phase'], second['birdsVisible'], second['hero'])
    await page.screenshot(path=OUTPUT / f'foreground-over-bird-{width}.png')
    await page.evaluate('BertQA.setBird(185, 305, 0); BertQA.renderNow()')

    before = await page.evaluate('''() => {
        BertQA.addMovingPowerupPickup('magnet', 1100, 360, 'approach');
        BertQA.addMovingPowerupPickup('focus', 1100, 360, 'retreat');
        BertQA.addMovingPowerupPickup('shield', 1100, 360, 'sweep');
        return BertQA.snapshot();
    }''')
    pickups = {item['profile']: item for item in before['powerupGeometry']}
    assert set(pickups) >= {'approach', 'retreat', 'sweep'}, pickups
    after = await page.evaluate('BertQA.simulate(0.55)')
    moved = {item['profile']: item for item in after['powerupGeometry']}
    assert set(moved) >= {'approach', 'retreat', 'sweep'}, moved
    assert moved['approach']['x'] < moved['sweep']['x'] < moved['retreat']['x'], moved
    assert abs(moved['sweep']['y'] - pickups['sweep']['y']) > 125, moved
    assert all(95 <= item['y'] <= 625 for item in moved.values()), moved
    await page.evaluate('BertQA.renderNow()')
    await page.screenshot(path=OUTPUT / f'chasing-powerups-{width}.png')

    # The live collision test places Bert at the exact center used by the moving sprite.
    collected = await page.evaluate('''() => {
        const target = BertQA.snapshot().powerupGeometry.find(item => item.profile === 'approach');
        BertQA.setBird(target.x - 62, target.y - 56, 0);
        return BertQA.simulate(1 / 60);
    }''')
    assert collected['activePowerup'] == 'Magnet', collected['activePowerup']
    assert len(collected['powerupGeometry']) == len(moved) - 1, collected['powerupGeometry']

    frame_stats = await page.evaluate('''() => new Promise(resolve => {
        const samples = [];
        let last = performance.now();
        const tick = now => {
            samples.push(now - last); last = now;
            if (samples.length >= 75) {
                const sorted = samples.slice(5).sort((a, b) => a - b);
                resolve({ average: sorted.reduce((a, b) => a + b, 0) / sorted.length,
                    p95: sorted[Math.floor(sorted.length * .95)] });
            } else requestAnimationFrame(tick);
        };
        requestAnimationFrame(tick);
    })''')
    # Headless WebKit already throttles to about 20–25 Hz on this emulator.
    assert frame_stats['average'] < 65 and frame_stats['p95'] < 95, frame_stats

    await page.emulate_media(reduced_motion='reduce')
    still = await page.evaluate('BertQA.simulate(0.8)')
    assert still['crowdFrame'] == 0, 'OS reduce-motion freezes the audience sprite.'
    assert not errors, errors
    await page.close()
    return {'phone': [width, height], 'crowdFrames': first['crowdFrames'],
            'audienceAnimated': second['crowdFrame'] != first['crowdFrame'],
            'foregroundDrawsAfterBird': order.index('bird') < order.index('crowd'),
            'profiles': {key: {'x': round(value['x'], 1), 'y': round(value['y'], 1)} for key, value in moved.items()},
            'powerupCollectedAtRenderedPosition': True, 'reduceMotionFrame': still['crowdFrame'],
            'framePacing': {key: round(value, 1) for key, value in frame_stats.items()},
            'pageErrors': errors}


async def main():
    OUTPUT.mkdir(exist_ok=True)
    port = free_port()
    server = subprocess.Popen(['python3', '-m', 'http.server', str(port), '--bind', '127.0.0.1'],
                              cwd=PROJECT / 'webapp', stdout=subprocess.DEVNULL, stderr=subprocess.STDOUT)
    try:
        time.sleep(.5)
        async with async_playwright() as playwright:
            browser = await playwright.webkit.launch()
            reports = [await run_phone(browser, port, 852, 393),
                       await run_phone(browser, port, 667, 375)]
            await browser.close()
        path = OUTPUT / 'report.json'
        path.write_text(json.dumps({'status': 'passed', 'reports': reports}, indent=2), encoding='utf-8')
        print(json.dumps({'status': 'passed', 'report': str(path)}))
    finally:
        server.terminate()
        server.wait(timeout=5)


if __name__ == '__main__':
    asyncio.run(main())
