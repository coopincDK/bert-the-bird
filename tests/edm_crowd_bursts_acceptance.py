"""WebKit acceptance for seeded multi-ball concert waves and audience-height landings."""
import asyncio
import json
import socket
import subprocess
import time
from pathlib import Path

from playwright.async_api import async_playwright

PROJECT = Path(__file__).resolve().parents[1]
OUTPUT = PROJECT.parent / 'qa-edm-crowd-bursts'


def free_port():
    with socket.socket() as sock:
        sock.bind(('127.0.0.1', 0))
        return sock.getsockname()[1]


async def run_phone(browser, port, width, height):
    page = await browser.new_page(viewport={'width': width, 'height': height}, device_scale_factor=2)
    errors = []
    posts = []
    page.on('pageerror', lambda error: errors.append(str(error)))
    page.on('request', lambda request: posts.append(request.url) if request.method == 'POST' else None)
    await page.goto(f'http://127.0.0.1:{port}/?qa=1&noclip=1&rev=worlds-relay-56', wait_until='networkidle')
    await page.wait_for_function("document.querySelector('#loading').classList.contains('hidden')")
    await page.locator('#play-btn').click()
    await page.locator('#edm-event-btn').click()
    await page.wait_for_function("BertQA.snapshot().phase === 'prewarm'")
    await page.locator('#gameCanvas').click(position={'x': 340, 'y': 160})
    await page.wait_for_function("BertQA.snapshot().phase === 'playing'")
    result = await page.evaluate('''() => {
        BertQA.simulate(2);
        const wave = BertEDM.createGroup(22, 420, 1, () => 0.99).obstacles;
        wave[0].motionPhase = 0;
        wave[0].y = wave[0].baseY;
        wave.forEach(ball => BertQA.addObstacle({...ball, id: 2222}));
        BertQA.setBird(185, 100, 0);
        // Pause only the simulation, not rendering, while timing six *visible* balls.
        BertQA.pauseGame();
        document.querySelector('#pause-menu').classList.add('hidden');
        const view = BertQA.renderNow();
        const balls = view.obstacleGeometry.filter(item => item.id === 2222);
        const shapes = wave.map(ball => BertCollision.obstacleShapes(ball)[0]);
        return {view, balls, shapes};
    }''')
    balls = result['balls']
    shapes = result['shapes']
    view = result['view']
    assert view['event'] and view['build'] == 'worlds-relay-56'
    assert len(balls) == 6 and len(shapes) == 6
    assert len({ball['motionAmplitude'] for ball in balls}) >= 4
    assert all(ball['baseY'] + ball['height'] == 670 for ball in balls)
    assert all(ball['kind'] == 'edm-crowd-ball' and ball['moving'] for ball in balls)
    assert all(shape['type'] == 'circle' and shape['radius'] < ball['width'] / 2
               and shape['x'] == ball['x'] + ball['width'] / 2
               and shape['y'] == ball['y'] + ball['height'] / 2
               for ball, shape in zip(balls, shapes))
    assert all(ball['y'] >= 250 for ball in balls), 'Keep a wide upper route free.'
    assert view['foreground']['bottomStart'] == 628 and view['crowdFrames'] == 3
    await page.screenshot(path=OUTPUT / f'crowd-burst-{width}.png')

    frame_stats = await page.evaluate('''() => new Promise(resolve => {
        const samples = [];
        let last = performance.now();
        const tick = now => {
            samples.push(now - last); last = now;
            if (samples.length >= 75) {
                const sorted = samples.slice(5).sort((a, b) => a - b);
                resolve({average: sorted.reduce((a, b) => a + b, 0) / sorted.length,
                    p95: sorted[Math.floor(sorted.length * .95)]});
            } else requestAnimationFrame(tick);
        };
        requestAnimationFrame(tick);
    })''')
    assert frame_stats['average'] < 65 and frame_stats['p95'] < 95, frame_stats

    movement = await page.evaluate('''() => {
        BertQA.resumeGame();
        const before = BertQA.snapshot().obstacleGeometry.filter(item => item.id === 2222);
        BertQA.simulate(0.45);
        const after = BertQA.snapshot().obstacleGeometry.filter(item => item.id === 2222);
        return {before, after};
    }''')
    assert len(movement['after']) >= 5
    for before in movement['before']:
        after = next(item for item in movement['after'] if item['ballIndex'] == before['ballIndex'])
        assert after['baseY'] + after['height'] == 670
        assert after['reverseCount'] >= before['reverseCount']
        assert after['y'] != before['y'] or after['x'] != before['x']
    assert not posts, 'The non-ranked event must not submit scores or duels.'
    assert not errors, errors
    await page.close()
    return {'phone': [width, height], 'waveSize': len(balls),
            'distinctHeights': len({ball['motionAmplitude'] for ball in balls}),
            'audienceLandingY': 670,
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
        report = {'status': 'passed', 'reports': reports}
        (OUTPUT / 'report.json').write_text(json.dumps(report, indent=2), encoding='utf-8')
        print(json.dumps({'status': 'passed', 'report': str(OUTPUT / 'report.json')}))
    finally:
        server.terminate()
        server.wait(timeout=5)


if __name__ == '__main__':
    asyncio.run(main())
