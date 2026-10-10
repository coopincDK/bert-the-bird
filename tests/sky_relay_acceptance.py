"""Headless WebKit integration for the original, non-ranked Sky Relay flight.

A QA-only setBird helper holds Bert on prescribed lanes while the real 60 Hz
engine advances. This tests collision/route/render integration, not a physical
phone's touch latency, subjective balance or haptics.
"""
import asyncio
import json
import socket
import subprocess
from pathlib import Path

from playwright.async_api import async_playwright

ROOT = Path(__file__).resolve().parents[1]
OUTPUT = ROOT.parent / 'qa-sky-relay-worlds-relay-91'
BUILD = 'worlds-relay-91'


def free_port():
    with socket.socket() as sock:
        sock.bind(('127.0.0.1', 0))
        return sock.getsockname()[1]


async def drive(page, distance, lane='perfect'):
    return await page.evaluate('''({distance, lane}) => {
        const s = BertQA.snapshot();
        const relativeColliderY = s.birdCollider.y - s.birdY;
        const route = s.relay;
        for (let i = 0; i < 1200; i++) {
            const before = BertQA.snapshot();
            if (before.phase !== 'playing' || before.worldDistance >= distance) break;
            // Keep the chosen lane until the entire painted ring has passed Bert.
            // Instant QA teleport at the center plane would itself be a collision.
            const nextGate = route.gates.find(gate => gate.worldDistance + 100 > before.worldDistance);
            let desired = nextGate ? nextGate.centerY : route.target.centerY;
            if (lane === 'miss-first' && nextGate?.id === 1) desired = 540;
            if (lane === 'edge-first' && nextGate?.id === 1) desired += nextGate.passRadius - 5;
            if (lane === 'miss-target' && !nextGate) desired = 560;
            BertQA.setBird(185, desired - relativeColliderY, 0);
            BertQA.simulate(1 / 60);
        }
        return BertQA.renderNow();
    }''', {'distance': distance, 'lane': lane})


async def play_run(page, lane):
    await page.evaluate('''async () => { await BertQA.startLevel(13, {seed:4242}); BertQA.beginRun(); }''')
    initial = await page.evaluate('BertQA.snapshot()')
    assert initial['phase'] == 'playing' and initial['event']
    assert initial['rescueLives'] == 0 and initial['challengeId'] is None
    assert {'happySky', 'happyMg', 'relayGate', 'relayGateFront', 'relayChime'} <= set(initial['loadedAssetKeys'])
    before = (initial['meta']['feathers'], initial['missionClaimsCompleted'])
    first = await drive(page, 1150, lane)
    assert first['obstacleCount'] == 0 and first['collectibleCount'] == 0
    shown = await page.evaluate('BertQA.renderNow()')
    assert 0 < shown['relay']['gates'][0]['screenX'] < 1100
    if lane == 'perfect':
        crossing = await drive(page, 1590, lane)
        assert 0 < crossing['relay']['gates'][0]['screenX'] - crossing['birdCollider']['x'] < 30
        await page.screenshot(path=OUTPUT / f'portal-cross-{page.viewport_size["width"]}.png')
        await drive(page, 3090, lane)
        await page.screenshot(path=OUTPUT / f'portal-low-{page.viewport_size["width"]}.png')
    target = await drive(page, 5450, lane)
    assert len(target['relay']['gateResults']) == 3, target['relay']['gateResults']
    assert 0 < target['relay']['target']['screenX'] < 1100
    if lane == 'perfect':
        await page.screenshot(path=OUTPUT / f'wind-chime-{page.viewport_size["width"]}.png')
    result = await drive(page, 6200, lane)
    assert result['phase'] == 'relay-finish', result['phase']
    assert result['relay']['result']['completed'] is True
    assert result['deathCause'] is None and result['rescueLives'] == 0
    await page.evaluate('BertQA.simulate(1.2)')
    final = await page.evaluate('BertQA.snapshot()')
    assert final['phase'] == 'gameover' and final['event']
    assert (final['meta']['feathers'], final['missionClaimsCompleted']) == before
    assert final['challengeId'] is None and final['starsCollected'] == 0
    return initial, first, target, result, final


async def collide_with_ring(page, side):
    assert side in ('top', 'bottom')
    await page.evaluate('''async () => { await BertQA.startLevel(13, {seed:4242}); BertQA.beginRun(); }''')
    hit = await page.evaluate('''side => {
        const init = BertQA.snapshot();
        const gate = init.relay.gates[0];
        const colliderOffset = init.birdCollider.y - init.birdY;
        for (let i=0; i<250 && BertQA.snapshot().phase === 'playing'; i++) {
            const state = BertQA.snapshot();
            if (state.worldDistance > gate.worldDistance + 80) break;
            const lane = state.worldDistance < gate.worldDistance - 150 ? gate.centerY
                : gate.centerY + (side === 'top' ? -1 : 1) * (gate.openingRadius + 13);
            BertQA.setBird(185, lane - colliderOffset, 0);
            BertQA.simulate(1 / 60);
        }
        return BertQA.renderNow();
    }''', side)
    assert hit['phase'] == 'dead' and hit['deathCause'] == 'relay-cloud-frame', hit
    assert hit['relay']['result']['outcome'] == 'ring-hit'
    assert hit['relay']['result']['ringSide'] == side and hit['score'] == 0
    assert hit['rescueLives'] == 0
    await page.evaluate('BertQA.simulate(1.65)')
    result = await page.evaluate('BertQA.snapshot()')
    assert result['phase'] == 'gameover' and result['score'] == 0
    assert 'RAMT' in await page.locator('#result-progress').inner_text()
    return hit


async def check_phone(browser, port, width, height):
    page = await browser.new_page(viewport={'width': width, 'height': height},
                                  device_scale_factor=2, has_touch=True)
    errors, posts = [], []
    page.on('pageerror', lambda error: errors.append(str(error)))
    page.on('request', lambda request: posts.append(request.url)
            if request.method == 'POST' else None)
    try:
        await page.goto(f'http://127.0.0.1:{port}/?qa=1&rev={BUILD}', wait_until='networkidle')
        await page.locator('#loading').wait_for(state='hidden', timeout=30000)
        await page.locator('#play-btn').click()
        cards = await page.evaluate('''() => [...document.querySelectorAll('.event-shelf button')]
            .map(el => { const b=el.getBoundingClientRect(), s=document.querySelector('#game-shell').getBoundingClientRect();
                return {id:el.id, width:b.width, height:b.height,
                    inside:b.left>=s.left && b.right<=s.right && b.top>=s.top && b.bottom<=s.bottom}; })''')
        assert [card['id'] for card in cards] == ['bird-run-event-btn', 'edm-event-btn',
                                                 'stormline-event-btn', 'sky-relay-event-btn']
        assert all(card['inside'] and card['width'] >= 135 and card['height'] >= 35 for card in cards), cards
        await page.screenshot(path=OUTPUT / f'menu-{width}.png')
        await page.locator('#sky-relay-event-btn').click()
        await page.wait_for_function("BertQA.snapshot().phase === 'prewarm'", timeout=20000)
        assert 'GULDPLADEN' in await page.locator('#tap-hint').inner_text()

        initial, first, target, perfect, final = await play_run(page, 'perfect')
        assert first['relay']['gates'][0]['screenX'] > first['birdCollider']['x']
        assert perfect['relay']['result']['hit'] is True and perfect['relay']['result']['gatesHit'] == 3
        assert perfect['relay']['result']['score'] > 900
        assert final['score'] == perfect['relay']['result']['score']
        await page.wait_for_function('''expected => document.querySelector('#final-score')?.textContent === String(expected)''',
                                     arg=final['score'], timeout=3000)
        await page.screenshot(path=OUTPUT / f'perfect-result-{width}.png')

        _, _, _, missed_gate, _ = await play_run(page, 'miss-first')
        assert missed_gate['relay']['gateResults'][0]['passed'] is False
        assert missed_gate['relay']['result']['hit'] is True
        assert missed_gate['relay']['result']['gatesHit'] == 2
        assert 0 < missed_gate['score'] < perfect['score']

        _, _, _, near_edge, _ = await play_run(page, 'edge-first')
        assert near_edge['relay']['gateResults'][0]['quality'] == 'edge'
        assert near_edge['relay']['result']['gatesHit'] == 3
        assert missed_gate['score'] < near_edge['score'] < perfect['score'], (missed_gate['score'], near_edge['score'], perfect['score'])
        await page.screenshot(path=OUTPUT / f'edge-result-{width}.png')

        _, _, _, miss, miss_end = await play_run(page, 'miss-target')
        assert miss['relay']['result']['outcome'] == 'bell-miss'
        assert miss_end['score'] == 0 and miss_end['deathCause'] is None
        assert 'FORBI GULDPLADEN' in await page.locator('#result-progress').inner_text()
        await page.screenshot(path=OUTPUT / f'miss-result-{width}.png')

        upper = await collide_with_ring(page, 'top')
        await page.screenshot(path=OUTPUT / f'ring-top-result-{width}.png')
        lower = await collide_with_ring(page, 'bottom')
        assert upper['worldDistance'] < upper['relay']['gates'][0]['worldDistance'] + 80
        assert lower['worldDistance'] < lower['relay']['gates'][0]['worldDistance'] + 80
        await page.screenshot(path=OUTPUT / f'ring-bottom-result-{width}.png')

        await page.evaluate('''async () => {
            await BertQA.startLevel(13, {seed:4242}); BertQA.beginRun();
            BertQA.setRunStats({time:46}); BertQA.simulate(1 / 60);
        }''')
        expired = await page.evaluate('BertQA.snapshot()')
        assert expired['phase'] == 'relay-finish' and expired['relay']['result']['timedOut']
        assert expired['score'] == 0 and expired['deathCause'] is None
        await page.evaluate('BertQA.simulate(1.2)')
        assert (await page.evaluate('BertQA.snapshot()'))['phase'] == 'gameover'

        await page.evaluate('''async () => {
            await BertQA.startLevel(13, {seed:4242}); BertQA.beginRun();
            BertQA.setBird(185, 300, 0);
        }''')
        box = await page.locator('#gameCanvas').bounding_box()
        await page.mouse.move(box['x'] + box['width'] * .24, box['y'] + box['height'] * .5)
        await page.mouse.down()
        climbing = await page.evaluate('BertQA.simulate(.16)')
        assert climbing['inputUp'] and not climbing['inputDown'] and climbing['velocity'] < 0
        await page.mouse.up()
        await page.mouse.move(box['x'] + box['width'] * .76, box['y'] + box['height'] * .5)
        await page.mouse.down()
        descending = await page.evaluate('BertQA.simulate(.3)')
        assert descending['inputDown'] and not descending['inputUp']
        assert descending['velocity'] > climbing['velocity'], (climbing['velocity'], descending['velocity'])
        await page.mouse.up()

        pace = await page.evaluate('''() => new Promise(resolve => {
            let previous=performance.now(), intervals=[];
            function tick(now) {
                intervals.push(now-previous); previous=now;
                if (intervals.length < 70) requestAnimationFrame(tick);
                else { const s=intervals.slice(5).sort((a,b)=>a-b);
                    resolve({p95:s[Math.floor(s.length*.95)], average:s.reduce((a,b)=>a+b,0)/s.length}); }
            }
            requestAnimationFrame(tick);
        })''')
        assert pace['p95'] < 100 and pace['average'] < 65, pace
        assert not posts and not errors, {'posts': posts, 'errors': errors}
        return {'viewport': [width, height], 'cards': len(cards),
                'route': initial['relay']['gates'], 'target': initial['relay']['target'],
                'perfectScore': perfect['score'], 'missedGateScore': missed_gate['score'],
                'nearRimScore': near_edge['score'],
                'bellMissScore': miss_end['score'], 'timeoutScore': expired['score'],
                'ringTop': upper['relay']['result']['ringSide'],
                'ringBottom': lower['relay']['result']['ringSide'],
                'framePacingMs': pace, 'postRequests': posts, 'pageErrors': errors}
    finally:
        await page.close()


async def main():
    OUTPUT.mkdir(parents=True, exist_ok=True)
    port = free_port()
    server = subprocess.Popen(['python3', '-m', 'http.server', str(port), '--bind', '127.0.0.1',
                               '--directory', str(ROOT / 'webapp')], stdout=subprocess.DEVNULL,
                              stderr=subprocess.DEVNULL)
    try:
        async with async_playwright() as playwright:
            browser = await playwright.webkit.launch()
            try:
                report = [await check_phone(browser, port, w, h)
                          for w, h in [(852, 393), (667, 375)]]
            finally:
                await browser.close()
        (OUTPUT / 'results.json').write_text(json.dumps(report, ensure_ascii=False, indent=2))
        print(json.dumps(report, ensure_ascii=False, indent=2))
    finally:
        server.terminate()
        server.wait(timeout=10)


if __name__ == '__main__':
    asyncio.run(main())
