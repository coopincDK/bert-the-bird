"""WebKit landscape acceptance for Stormline, event-only powerups and EDM scene layers."""
import asyncio
import json
import socket
import subprocess
import sys
import time
from pathlib import Path
from urllib.request import urlopen

from playwright.async_api import async_playwright

PROJECT = Path(__file__).resolve().parents[1]
OUTPUT = PROJECT.parent / 'qa-stormline-powerups'
BUILD = 'worlds-relay-74'


def free_port():
    with socket.socket() as sock:
        sock.bind(('127.0.0.1', 0))
        return sock.getsockname()[1]


async def run_phone(browser, port, width, height):
    page = await browser.new_page(viewport={'width': width, 'height': height}, device_scale_factor=2)
    errors, posts = [], []
    page.on('pageerror', lambda error: errors.append(str(error)))
    page.on('request', lambda request: posts.append(request.url) if request.method == 'POST' else None)
    await page.goto(f'http://127.0.0.1:{port}/?qa=1&noclip=1&rev={BUILD}', wait_until='networkidle')
    await page.wait_for_function("document.querySelector('#loading').classList.contains('hidden')")
    await page.locator('#play-btn').click()
    cards = await page.evaluate('''() => [...document.querySelectorAll('.event-shelf button')].map(el => {
        const box = el.getBoundingClientRect(), shell = document.querySelector('#game-shell').getBoundingClientRect();
        return {id: el.id, x: box.x, width: box.width, height: box.height,
            inside: box.x >= shell.x && box.right <= shell.right && box.top >= shell.y && box.bottom <= shell.bottom};
    })''')
    assert [card['id'] for card in cards] == ['bird-run-event-btn', 'edm-event-btn', 'stormline-event-btn', 'sky-relay-event-btn'], cards
    assert all(card['inside'] and card['width'] >= 125 and card['height'] >= 35 for card in cards), cards
    await page.screenshot(path=OUTPUT / f'event-menu-{width}.png')
    await page.locator('#stormline-event-btn').click()
    await page.wait_for_function("BertQA.snapshot().phase === 'prewarm'")
    first = await page.evaluate('BertQA.snapshot()')
    assert first['build'] == BUILD and first['event'] and first['levelId'] == 12
    assert len(first['levelCatalog']) == 9 and all(item['id'] <= 9 for item in first['levelCatalog'])
    assert {'stormSky', 'stormSail', 'stormSock', 'eventMetal', 'eventHyper', 'eventDouble', 'eventFlap'} <= set(first['loadedAssetKeys'])
    assert first['rescueLives'] == 0 and first['challengeId'] is None
    await page.screenshot(path=OUTPUT / f'stormline-prewarm-{width}.png')
    await page.locator('#gameCanvas').click(position={'x': 260, 'y': 146})
    await page.wait_for_function("BertQA.snapshot().phase === 'playing'")
    visible = await page.evaluate('''() => {
        for (let step = 0; step < 70; step++) {
            const view = BertQA.simulate(.12);
            const sail = view.obstacleGeometry.find(item => item.kind === 'storm-sail' && item.x < 850 && item.x > 580);
            if (sail) {
                BertQA.setBird(185, 142, 0);
                BertQA.renderNow();
                const shape = BertCollision.obstacleShapes(sail)[0];
                return {sail, shape, wind: view.stormWindCue, stars: view.starGeometry};
            }
        }
        return null;
    }''')
    assert visible, 'A visibly moving wind-borne sail did not enter the decision corridor.'
    sail = visible['sail']
    assert visible['shape']['type'] == 'circle'
    assert sail['x'] <= visible['shape']['x'] <= sail['x'] + sail['width'] * .55
    assert sail['y'] < visible['shape']['y'] < sail['y'] + sail['height']
    assert visible['stars'], visible
    star_clearance = visible['stars'][0]['x'] - (sail['x'] + sail['width'])
    assert star_clearance >= 320, {'clearance': star_clearance, 'sail': sail, 'stars': visible['stars']}
    await page.screenshot(path=OUTPUT / f'stormline-sail-{width}.png')

    pacing = await page.evaluate('''() => new Promise(resolve => {
        let previous = performance.now(), frames = [];
        function frame(now) {
            frames.push(now - previous); previous = now;
            if (frames.length >= 70) {
                frames = frames.slice(5).sort((a,b) => a-b);
                resolve({average: frames.reduce((sum,n) => sum+n, 0)/frames.length,
                    p95: frames[Math.floor(frames.length*.95)]});
            } else requestAnimationFrame(frame);
        }
        requestAnimationFrame(frame);
    })''')
    assert pacing['average'] < 65 and pacing['p95'] < 95, pacing

    effects = {}
    for kind in ['Heavy', 'Hyper', 'Double', 'Flap']:
        result = await page.evaluate('''async kind => {
            await BertQA.startLevel(12, {seed: 44}); BertQA.beginRun();
            const before = BertQA.snapshot();
            BertQA.activatePowerup(kind);
            const active = BertQA.snapshot();
            if (kind === 'Heavy') {
                BertQA.setBird(185, 270, 0);
                const falling = BertQA.simulate(.2).velocity;
                const ended = BertQA.simulate(6.1);
                return {before, active, falling, ended};
            }
            if (kind === 'Hyper') {
                const faster = BertQA.simulate(.08);
                const ended = BertQA.simulate(6.1);
                return {before, active, faster, ended};
            }
            if (kind === 'Double') {
                BertQA.collectStar(1);
                const doubled = BertQA.snapshot();
                BertQA.simulate(8.1);
                const postExpired = BertQA.snapshot();
                BertQA.collectStar(1);
                return {before, active, doubled, postExpired, ended: BertQA.snapshot()};
            }
            return {before, active};
        }''', kind)
        assert result['active']['activePowerup'] == kind and result['active']['event']
        assert result['active']['levelId'] == 12
        if kind == 'Heavy':
            assert result['falling'] > 125, result['falling']
            assert result['ended']['activePowerup'] is None
        if kind == 'Hyper':
            assert result['faster']['speed'] > result['before']['speed'] * 1.19
            assert abs(result['ended']['speed'] - result['before']['speed']) < .02
        if kind == 'Double':
            assert result['doubled']['score'] == 2 and result['doubled']['starsCollected'] == 1
            assert result['postExpired']['activePowerup'] is None
            assert result['ended']['score'] - result['postExpired']['score'] == result['postExpired']['streak'] + 1
            assert result['ended']['starsCollected'] - result['postExpired']['starsCollected'] == 1
        if kind == 'Flap':
            assert result['active']['controlMode'] == 'flappy'
            for x in [110, width - 105]:
                await page.evaluate('BertQA.setBird(185, 280, 220)')
                await page.locator('#gameCanvas').click(position={'x': x, 'y': 160})
                flap = await page.evaluate('BertQA.snapshot()')
                # The kick is -560 px/s at pointerdown; a few real WebKit frames
                # elapse before click() returns and the following snapshot runs.
                assert flap['velocity'] < -300 and not flap['inputDown'] and not flap['inputUp'], flap
            expired = await page.evaluate('''() => {
                const now = BertQA.snapshot().elapsed;
                BertQA.setRunStats({time: now + 29.9});
                return BertQA.simulate(.25);
            }''')
            assert expired['phase'] == 'playing' and expired['activePowerup'] is None and expired['controlMode'] == 'default'
            box = await page.locator('#gameCanvas').bounding_box()
            await page.mouse.move(box['x'] + box['width']*.78, box['y'] + box['height']*.45)
            await page.mouse.down()
            assert (await page.evaluate('BertQA.snapshot()'))['inputDown'], 'Right-side down control did not return after Flappy expired.'
            await page.mouse.up()
            assert not (await page.evaluate('BertQA.snapshot()'))['inputDown']
        effects[kind] = True

    await page.evaluate('''async () => {
        await BertQA.startLevel(12, {seed: 5151}); BertQA.beginRun();
        BertQA.setBird(185, 300, 0);
        BertQA.addPowerupPickup('Heavy', 640, 365);
        BertQA.renderNow();
    }''')
    await page.screenshot(path=OUTPUT / f'stormline-metal-pickup-{width}.png')
    actual_pickup = await page.evaluate('''() => {
        const before = BertQA.snapshot();
        const visible = BertQA.snapshot().powerupGeometry;
        const target = visible.find(item => item.type === 'Heavy');
        if (target) BertQA.setBird(target.x - 62, target.y - 65, 0);
        const collected = BertQA.simulate(.05);
        BertQA.setRunStats({score: 215, streak: 7, time: 42, stars: 7});
        BertQA.triggerDeath({kind: 'storm-sail', id: -17}); BertQA.finishDeath();
        return {before, visible, collected, after: BertQA.snapshot(),
            result: document.querySelector('#result-progress').textContent,
            shareHidden: document.querySelector('#challenge-btn').classList.contains('hidden')};
    }''')
    assert any(item['type'] == 'Heavy' and 150 < item['x'] <= 640 for item in actual_pickup['visible']), actual_pickup['visible']
    assert actual_pickup['collected']['activePowerup'] == 'Heavy', actual_pickup['collected']
    assert not any(item['type'] == 'Heavy' for item in actual_pickup['collected']['powerupGeometry'])
    assert actual_pickup['after']['phase'] == 'gameover'
    assert actual_pickup['after']['meta']['feathers'] == actual_pickup['before']['meta']['feathers']
    assert actual_pickup['after']['meta']['totalStars'] == actual_pickup['before']['meta']['totalStars']
    assert actual_pickup['after']['missionClaimsCompleted'] == actual_pickup['before']['missionClaimsCompleted']
    assert actual_pickup['after']['unlockedLevelIds'] == actual_pickup['before']['unlockedLevelIds']
    assert 'kun lokal eventrekord' in actual_pickup['result'] and actual_pickup['shareHidden']

    await page.evaluate('''async () => { await BertQA.startLevel(1); BertQA.beginRun(); BertQA.activatePowerup('Focus'); }''')
    before_focus = await page.evaluate('BertQA.snapshot()')
    assert before_focus['focusPhase'] == 'countdown' and before_focus['focusCountdown'] > 2.75, before_focus
    assert before_focus['focusAudioPrimed'] and before_focus['chopinPaused']
    in_countdown = await page.evaluate('BertQA.simulate(1.1)')
    assert in_countdown['focusPhase'] == 'countdown' and in_countdown['focusRemaining'] == 30
    assert in_countdown['stageClock'] > before_focus['stageClock'] + .95
    playing = await page.evaluate('BertQA.simulate(2.6)')
    assert playing['focusPhase'] == 'active' and 29 < playing['focusRemaining'] < 30
    assert playing['speed'] < before_focus['speed'] and playing['chopinPaused'] is False
    await page.screenshot(path=OUTPUT / f'focus-after-countdown-{width}.png')

    await page.evaluate('''async () => { await BertQA.startLevel(10); BertQA.beginRun(); BertQA.simulate(4.9); BertQA.renderNow(); }''')
    edm = await page.evaluate('BertQA.snapshot()')
    assert edm['levelId'] == 10 and len(edm['edmProjectors']) == 5
    assert edm['edmSmokeCue']['active'] and 0 < edm['edmSmokeCue']['opacity'] <= .15
    assert all(550 <= lamp['y'] < 585 for lamp in edm['edmProjectors'])
    await page.screenshot(path=OUTPUT / f'edm-stage-smoke-{width}.png')
    assert not errors and not posts, {'errors': errors, 'posts': posts}
    await page.close()
    return {'viewport': [width, height], 'pacing': pacing, 'effects': effects,
            'starClearancePx': round(star_clearance, 1), 'wind': visible['wind'],
            'projectorCount': len(edm['edmProjectors']), 'errors': errors, 'posts': posts}


async def real_collision(browser, port):
    page = await browser.new_page(viewport={'width': 852, 'height': 393})
    await page.goto(f'http://127.0.0.1:{port}/?qa=1&rev={BUILD}', wait_until='networkidle')
    await page.wait_for_function("document.querySelector('#loading').classList.contains('hidden')")
    result = await page.evaluate('''async () => {
        await BertQA.startLevel(12); BertQA.beginRun();
        BertQA.setBird(185, 270, 0);
        BertQA.addObstacle({kind:'storm-sail',x:190,y:265,baseY:265,width:128,height:92,harmful:true});
        return BertQA.simulate(.08);
    }''')
    assert result['phase'] == 'dead' and result['deathCause'] == 'storm-sail', result
    await page.close()
    return result['deathCause']


async def main():
    OUTPUT.mkdir(exist_ok=True)
    port = free_port()
    server = subprocess.Popen([sys.executable, '-m', 'http.server', str(port), '--bind', '127.0.0.1'],
                              cwd=PROJECT / 'webapp', stdout=subprocess.DEVNULL, stderr=subprocess.DEVNULL)
    try:
        for _ in range(50):
            try:
                urlopen(f'http://127.0.0.1:{port}/', timeout=1).close()
                break
            except Exception:
                await asyncio.sleep(.1)
        else:
            raise RuntimeError('Static Stormline acceptance origin did not become ready.')
        async with async_playwright() as playwright:
            browser = await playwright.webkit.launch()
            reports = [await run_phone(browser, port, width, height)
                       for width, height in [(852,393), (667,375)]]
            hit = await real_collision(browser, port)
            await browser.close()
        report = {'status': 'passed', 'build': BUILD, 'phones': reports,
                  'visibleStormSailCollision': hit, 'rankedLevels': 9}
        (OUTPUT / 'report.json').write_text(json.dumps(report, indent=2), encoding='utf-8')
        print(json.dumps(report))
    finally:
        server.terminate()
        try:
            server.wait(timeout=4)
        except subprocess.TimeoutExpired:
            server.kill()
            server.wait(timeout=4)


if __name__ == '__main__':
    asyncio.run(main())
