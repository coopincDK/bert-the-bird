"""Stormline weather: visual and physical matching in iPhone landscape WebKit."""
import asyncio
import json
import socket
import subprocess
import sys
from pathlib import Path
from urllib.request import urlopen

from playwright.async_api import async_playwright

PROJECT = Path(__file__).resolve().parents[1]
OUTPUT = PROJECT.parent / 'qa-stormline-weather'
BUILD = 'worlds-relay-88'
HAZARDS = ('storm-sail', 'wind-umbrella', 'wind-branch', 'wind-sign', 'wind-car')


def free_port():
    with socket.socket() as sock:
        sock.bind(('127.0.0.1', 0))
        return sock.getsockname()[1]


async def phone(browser, port, width, height):
    page = await browser.new_page(viewport={'width': width, 'height': height}, device_scale_factor=2)
    errors = []
    page.on('pageerror', lambda error: errors.append(str(error)))
    await page.goto(f'http://127.0.0.1:{port}/?qa=1&noclip=1&rev={BUILD}', wait_until='networkidle')
    await page.wait_for_function("document.querySelector('#loading').classList.contains('hidden')")
    await page.locator('#play-btn').click()
    await page.locator('#stormline-event-btn').click()
    await page.wait_for_function("BertQA.snapshot().phase === 'prewarm'")
    assets = await page.evaluate('BertQA.snapshot().loadedAssetKeys')
    assert {'stormUmbrella', 'stormBranch', 'stormSign', 'stormCar'} <= set(assets), assets
    grades = []
    for wanted in ('brise', 'storm', 'orkan'):
        result = await page.evaluate('''async wanted => {
            await BertQA.startLevel(12, {seed: 654}); BertQA.beginRun();
            // Each local event now ends upon its first survived storm hazard;
            // inspect later natural weather on a fresh QA-only weather clock.
            BertQA.setWorldTime({brise: 2, storm: 24.8, orkan: 48.8}[wanted]);
            // Encounter 0 is always the harmless tutorial sail, even during a
            // QA time-jump straight to hurricane conditions.
            if (wanted === 'orkan') BertQA.setNextObstacleId(1);
            BertQA.setBird(185, 135, 0);
            let view = BertQA.snapshot();
            for (let i = 0; i < 260 && view.stormWindCue.grade !== wanted; i++)
                view = BertQA.simulate(.12);
            if (view.stormWindCue.grade !== wanted) return {error:'grade missing', view};
            const weather = view.stormWindCue;
            const kinds = {brise:['storm-sail','wind-umbrella'],
                storm:['wind-branch','wind-sign'], orkan:['wind-branch','wind-sign','wind-car']}[wanted];
            // Wait for the normal spawner, not QA injection; only one harmful
            // object may exist and its collider must match the drawn body.
            for (let i = 0; i < 75 && !view.obstacleGeometry.some(item =>
                    kinds.includes(item.kind) && item.x > 490 && item.x < 1020); i++)
                view = BertQA.simulate(.12);
            const objects = view.obstacleGeometry.filter(BertStormline.isHazard);
            const visible = objects.find(item => kinds.includes(item.kind) && item.x > 490 && item.x < 1020);
            if (!visible) return {error:'no visible hazard', weather, view};
            BertQA.setBird(185, 135, 0);
            BertQA.renderNow();
            const shape = BertCollision.obstacleShapes(visible)[0];
            return {weather, cue: view.stormWindCue, visible, shape, count: objects.length,
                leaves: view.stormLeaves, phase: view.phase};
        }''', wanted)
        assert 'error' not in result, (wanted, result.get('error'),
            [(o['kind'], round(o['x'])) for o in result.get('view', {}).get('obstacleGeometry', [])],
            result.get('view', {}).get('stageClock'))
        wind, hazard, shape = result['weather'], result['visible'], result['shape']
        assert result['count'] == 1 and result['phase'] == 'playing', result
        assert wind['grade'] == wanted and result['cue']['grade'] == wanted \
            and wind['level'] == len(grades) + 1, wind
        assert len(result['leaves']) == 14 and all(-30 < l['x'] < 1320 for l in result['leaves'])
        assert shape['x'] >= hazard['x'] and shape['x'] + shape.get('radius', 0) < hazard['x'] + hazard['width'], result
        assert shape['y'] >= hazard['y'] and shape['y'] < hazard['y'] + hazard['height'], result
        allowed = {'brise': {'storm-sail', 'wind-umbrella'},
                   'storm': {'wind-branch', 'wind-sign'},
                   'orkan': {'wind-branch', 'wind-sign', 'wind-car'}}[wanted]
        assert hazard['kind'] in allowed, result
        await page.screenshot(path=OUTPUT / f'{wanted}-{width}.png')
        grades.append({'grade': wanted, 'kind': hazard['kind'], 'wind': wind,
                       'count': result['count']})
    await page.evaluate('''async () => {
        await BertQA.startLevel(12, {seed: 654}); BertQA.beginRun();
        BertQA.setWorldTime(59.45);
        BertQA.setBird(185, 135, 0);
    }''')
    # After the strong tailwind, a windless transition must be visible *before*
    # the windsock, arrow, leaves and Bert experience the opposite vector.
    calm = await page.evaluate('''() => {
        let view = BertQA.snapshot();
        for (let i=0; i<150 && view.stormWindCue.grade !== 'stille'; i++)
            view = BertQA.simulate(.1);
        BertQA.setBird(185, 135, 0); BertQA.renderNow();
        return view.stormWindCue;
    }''')
    assert calm['grade'] == 'stille' and calm['level'] == 0 \
        and calm['speedFactor'] == 1 and abs(calm['liftAcceleration']) < 3, calm
    await page.screenshot(path=OUTPUT / f'calm-turn-{width}.png')
    reverse = await page.evaluate('''() => {
        let view = BertQA.snapshot();
        for (let i=0; i<45 && !(view.stormWindCue.grade==='orkan'
                && view.stormWindCue.label==='MODVIND' && view.stormWindCue.strength>.8); i++)
            view = BertQA.simulate(.12);
        const cue = view.stormWindCue;
        const firstLeaf = view.stormLeaves.find(l => l.x>200 && l.x<900);
        const index = view.stormLeaves.indexOf(firstLeaf);
        view = BertQA.simulate(.15);
        BertQA.setBird(185, 135, 0); BertQA.renderNow();
        return {cue, before:firstLeaf.x, after:view.stormLeaves[index].x};
    }''')
    assert reverse['cue']['label'] == 'MODVIND' and reverse['cue']['horizontal'] < -.8 \
        and reverse['cue']['vertical'] > 0 and reverse['cue']['speedFactor'] < 1 \
        and reverse['cue']['liftAcceleration'] > 0, reverse
    assert reverse['after'] < reverse['before'], reverse
    await page.screenshot(path=OUTPUT / f'headwind-{width}.png')
    assert not errors, errors
    await page.close()
    return {'viewport': [width, height], 'grades': grades,
            'calmTurn': calm, 'headwind': reverse, 'pageErrors': errors}


async def actual_collision(browser, port):
    page = await browser.new_page(viewport={'width': 852, 'height': 393})
    errors = []
    page.on('pageerror', lambda error: errors.append(str(error)))
    await page.goto(f'http://127.0.0.1:{port}/?qa=1&rev={BUILD}', wait_until='networkidle')
    await page.wait_for_function("document.querySelector('#loading').classList.contains('hidden')")
    results = []
    for kind in HAZARDS:
        result = await page.evaluate('''async kind => {
            await BertQA.startLevel(12, {seed: 19}); BertQA.beginRun();
            BertQA.setBird(185, 270, 0);
            const art = BertStormline.HAZARDS[kind];
            const obstacle = {kind, artKey: art.artKey, x: 190, y: 265,
                baseY: 265, width: art.width, height: art.height, harmful:true};
            BertQA.addObstacle(obstacle);
            const shape = BertCollision.obstacleShapes(obstacle)[0];
            BertQA.renderNow();
            const view = BertQA.simulate(.08);
            return {shape, view};
        }''', kind)
        assert result['view']['phase'] == 'dead' and result['view']['deathCause'] == kind, result
        assert result['shape']['type'] in ('circle', 'box')
        results.append(kind)
    assert not errors, errors
    await page.close()
    return results


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
            raise RuntimeError('The temporary Stormline WebKit origin did not respond.')
        async with async_playwright() as playwright:
            browser = await playwright.webkit.launch()
            phones = [await phone(browser, port, width, height)
                      for width, height in ((852, 393), (667, 375))]
            collisions = await actual_collision(browser, port)
            await browser.close()
        report = {'status': 'passed', 'build': BUILD, 'phones': phones, 'collisions': collisions}
        (OUTPUT / 'report.json').write_text(json.dumps(report, indent=2), encoding='utf-8')
        print(json.dumps({'status': 'passed', 'report': str(OUTPUT / 'report.json')}))
    finally:
        server.terminate()
        try:
            server.wait(timeout=4)
        except subprocess.TimeoutExpired:
            server.kill()
            server.wait(timeout=4)


if __name__ == '__main__':
    asyncio.run(main())
