"""Check progressive Neon Encore obstacles and decorative foreground across worlds."""
import asyncio
import json
import socket
import subprocess
import time
from pathlib import Path
from playwright.async_api import async_playwright

PROJECT = Path(__file__).resolve().parents[1]
OUTPUT = PROJECT.parent / 'qa-edm-progression'


def free_port():
    with socket.socket() as sock:
        sock.bind(('127.0.0.1', 0))
        return sock.getsockname()[1]


async def find_obstacle(page, kind, max_steps=180, obstacle_id=None):
    for _ in range(max_steps):
        view = await page.evaluate('BertQA.simulate(0.2)')
        matches = [ob for ob in view['obstacleGeometry'] if ob['kind'] == kind
                   and 450 < ob['x'] < 950 and (obstacle_id is None or ob['id'] == obstacle_id)]
        if matches:
            return view, matches[0]
    raise AssertionError(f'{kind} never reached the central playfield')


async def run_phone(browser, port, width, height, foreground_screenshots=False):
    page = await browser.new_page(viewport={'width': width, 'height': height}, device_scale_factor=2)
    errors = []
    page.on('pageerror', lambda error: errors.append(str(error)))
    await page.goto(f'http://127.0.0.1:{port}/?qa=1&noclip=1&rev=worlds-relay-92', wait_until='networkidle')
    await page.wait_for_function("document.querySelector('#loading').classList.contains('hidden')")
    await page.locator('#play-btn').click()
    await page.locator('#edm-event-btn').click()
    await page.wait_for_function("BertQA.snapshot().phase === 'prewarm'")
    await page.locator('#gameCanvas').click(position={'x': 340, 'y': 160})
    await page.wait_for_function("BertQA.snapshot().phase === 'playing'")
    opening = await page.evaluate('BertQA.simulate(4)')
    assert opening['foreground'] == {'top': 58, 'bottomStart': 628, 'image': 'edmCrowd'}
    assert opening['crowdFrames'] == 3, opening
    assert set(['edmCenterRig', 'edmCrowdBall', 'edmCrowd']).issubset(opening['loadedAssetKeys'])
    assert opening['obstacleGeometry'][0]['kind'] in ('edm-tower', 'edm-orb')

    fixture_view, fixture = await find_obstacle(page, 'edm-center-rig')
    assert fixture['id'] >= 3, fixture
    assert fixture_view['edmWarningCount'] > 0, fixture_view['obstacleGeometry']
    assert fixture['width'] > fixture['height'] * 3
    await page.evaluate('BertQA.setBird(185, 307, 0); BertQA.renderNow()')
    await page.screenshot(path=OUTPUT / f'center-fixture-{width}.png')

    floor_view, floor = await find_obstacle(page, 'edm-tower', obstacle_id=5)
    assert floor['y'] >= 205 and floor['height'] >= 485 and not floor['top'], floor
    await page.evaluate('BertQA.setBird(185, 95, 0); BertQA.renderNow()')
    await page.screenshot(path=OUTPUT / f'solo-floor-{width}.png')

    ball_view, ball = await find_obstacle(page, 'edm-crowd-ball')
    assert ball['id'] >= 7 and ball['moving'] and ball['motionAmplitude'] >= 65, ball
    assert ball['scrollFactor'] != 1, ball
    assert ball['baseY'] + ball['height'] == 670, 'Beach balls must land in the audience hands.'
    dotted_calls = await page.evaluate('''() => {
        const ctx = document.querySelector('#gameCanvas').getContext('2d');
        const original = ctx.setLineDash;
        let count = 0;
        ctx.setLineDash = function (...args) { count++; return original.apply(this, args); };
        try { BertQA.renderNow(); } finally { ctx.setLineDash = original; }
        return count;
    }''')
    assert dotted_calls == 0, 'Concert hazards must not draw collider-style dotted paths.'
    sampled_ys = [ball['y']]
    for _ in range(4):
        next_view = await page.evaluate('BertQA.simulate(0.2)')
        following = [ob for ob in next_view['obstacleGeometry'] if ob['id'] == ball['id']
                     and ob['ballIndex'] == ball['ballIndex']]
        assert following, (ball, next_view['obstacleGeometry'])
        sampled_ys.append(following[0]['y'])
    assert max(sampled_ys) - min(sampled_ys) >= 12, (ball, sampled_ys)
    actual_scroll = next_view['worldDistance'] - ball_view['worldDistance']
    assert actual_scroll > 0, (ball_view['worldDistance'], next_view['worldDistance'])
    scroll_ratio = (ball['x'] - following[0]['x']) / actual_scroll
    if not ball['reverseRemaining'] and not following[0]['reverseCount']:
        assert abs(scroll_ratio - ball['scrollFactor']) < 0.03, (scroll_ratio, ball)
    else:
        assert following[0]['reverseCount'] >= ball['reverseCount'], (ball, following)
    await page.evaluate('BertQA.setBird(185, 297, 0); BertQA.renderNow()')
    await page.screenshot(path=OUTPUT / f'moving-crowd-ball-{width}.png')

    ceiling_view, ceiling = await find_obstacle(page, 'edm-tower', obstacle_id=9)
    assert ceiling['top'] and ceiling['height'] >= 460, ceiling
    await page.evaluate('BertQA.setBird(185, 550, 0); BertQA.renderNow()')
    await page.screenshot(path=OUTPUT / f'solo-ceiling-{width}.png')

    foregrounds = {}
    if foreground_screenshots:
        for level_id, kind in [(1, 'desert'), (4, 'jungle'), (5, 'happySky'),
                               (3, 'flappy'), (2, 'tunnel'), (10, 'edm')]:
            await page.evaluate('(id) => BertQA.startLevel(id)', level_id)
            await page.wait_for_function("BertQA.snapshot().phase === 'prewarm'")
            view = await page.evaluate('''() => {
                BertQA.beginRun(); BertQA.setBird(185, 299, 0);
                return BertQA.simulate(1.6);
            }''')
            assert view['levelKind'] == kind and view['phase'] == 'playing', view
            band = view['foreground']
            assert 48 <= band['top'] <= 120 and 624 <= band['bottomStart'] <= 680, (kind, band)
            assert band['image'] in view['loadedAssetKeys'], (kind, band)
            await page.evaluate('BertQA.setBird(185, 299, 0); BertQA.renderNow()')
            await page.screenshot(path=OUTPUT / f'foreground-{kind}-{width}.png')
            foregrounds[kind] = band
    assert not errors, errors
    await page.close()
    return {'phone': [width, height], 'firstCenterId': fixture['id'],
            'floorId': floor['id'], 'ceilingId': ceiling['id'],
            'firstMovingId': ball['id'], 'ballMotionPixels': round(max(sampled_ys) - min(sampled_ys), 1),
            'ballScrollFactor': ball['scrollFactor'], 'observedScrollRatio': round(scroll_ratio, 3),
            'dottedGuideCalls': dotted_calls, 'crowdFrames': opening['crowdFrames'],
            'foregrounds': foregrounds, 'pageErrors': errors}


async def main():
    OUTPUT.mkdir(exist_ok=True)
    port = free_port()
    server = subprocess.Popen(['python3', '-m', 'http.server', str(port), '--bind', '127.0.0.1'],
                              cwd=PROJECT / 'webapp', stdout=subprocess.DEVNULL, stderr=subprocess.STDOUT)
    try:
        time.sleep(.5)
        async with async_playwright() as playwright:
            browser = await playwright.webkit.launch()
            reports = [await run_phone(browser, port, 852, 393, True),
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
