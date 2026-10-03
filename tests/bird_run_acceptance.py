"""Landscape WebKit acceptance for Bird Run and isolated event economy."""
import asyncio
import json
import socket
import subprocess
import time
from pathlib import Path

from playwright.async_api import async_playwright

PROJECT = Path(__file__).resolve().parents[1]
OUTPUT = PROJECT.parent / 'qa-bird-run'
BUILD = 'worlds-relay-31'


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
    buttons = await page.evaluate('''() => [...document.querySelectorAll('.event-shelf button')].map(button => {
        const box = button.getBoundingClientRect();
        const scene = document.querySelector('#game-shell').getBoundingClientRect();
        return {visible: box.width >= 135 && box.height >= 28,
            inside: box.left >= scene.left && box.right <= scene.right
                && box.top >= scene.top && box.bottom <= scene.bottom};
    })''')
    assert len(buttons) == 4 and all(button['visible'] and button['inside'] for button in buttons), buttons
    await page.screenshot(path=OUTPUT / f'bird-run-menu-{width}.png')
    await page.locator('#bird-run-event-btn').click()
    await page.wait_for_function("BertQA.snapshot().phase === 'prewarm'")
    initial = await page.evaluate('BertQA.snapshot()')
    assert initial['event'] and initial['levelId'] == 11 and initial['levelKind'] == 'birdRun'
    assert initial['build'] == BUILD and initial['foreground']['image'] == 'birdRunCloud'
    assert {'happySky', 'birdRunBird', 'birdRunSwift', 'birdRunKite', 'birdRunCloud'} <= set(initial['loadedAssetKeys'])
    assert initial['rescueLives'] == 0 and initial['challengeId'] is None
    await page.locator('#gameCanvas').click(position={'x': 330, 'y': 150})
    await page.wait_for_function("BertQA.snapshot().phase === 'playing'")

    first = await page.evaluate('''() => {
        for (let step = 0; step < 80; step++) {
            const s = BertQA.simulate(.12);
            const front = s.obstacleGeometry.find(item => item.kind === 'bird-run-bird');
            if (front && front.x < 870 && front.x > 550) {
                BertQA.setBird(185, 125, 0);
                BertQA.renderNow();
                return {s, front};
            }
        }
        return null;
    }''')
    assert first, 'First front bird never reached the readable center corridor.'
    assert first['front']['direction'] == 'front' and first['front']['species'] == 'glider'
    assert sum(item['kind'] == 'bird-run-bird' for item in first['s']['obstacleGeometry']) == 1
    await page.screenshot(path=OUTPUT / f'bird-run-front-{width}.png')

    pacing = await page.evaluate('''() => new Promise(resolve => {
        let last = performance.now(); const frames = [];
        function tick(now) {
            frames.push(now - last); last = now;
            if (frames.length >= 75) {
                const measured = frames.slice(5).sort((a, b) => a - b);
                resolve({average: measured.reduce((sum, value) => sum + value, 0) / measured.length,
                    p95: measured[Math.floor(measured.length * .95)]});
            } else requestAnimationFrame(tick);
        }
        requestAnimationFrame(tick);
    })''')
    assert pacing['average'] < 65 and pacing['p95'] < 95, pacing

    species_seen = ['glider']
    for expected in ['swift', 'kite']:
        second = await page.evaluate('''expected => {
            for (let step = 0; step < 180; step++) {
                const s = BertQA.simulate(.12);
                const bird = s.obstacleGeometry.find(item => item.kind === 'bird-run-bird'
                    && item.species === expected && item.x < 870 && item.x > 550);
                if (bird) { BertQA.setBird(185, 125, 0); BertQA.renderNow(); return bird; }
            }
            return null;
        }''', expected)
        assert second and second['direction'] == 'front' and second['species'] == expected, second
        assert second['artKey'] == {'swift': 'birdRunSwift', 'kite': 'birdRunKite'}[expected]
        assert (second['pathTravel'] > 80) if expected == 'swift' else (second['pathTravel'] < -80)
        species_seen.append(expected)
        await page.screenshot(path=OUTPUT / f'bird-run-{expected}-{width}.png')

    rear = await page.evaluate('''() => {
        for (let step = 0; step < 300; step++) {
            const s = BertQA.simulate(.12);
            const warning = s.obstacleGeometry.find(item => item.kind === 'bird-run-bird'
                && item.direction === 'rear' && item.warningRemaining > 0);
            if (warning) { BertQA.setBird(185, 125, 0); BertQA.renderNow(); return {s, warning}; }
        }
        return null;
    }''')
    assert rear, 'No rear bird with a visible warning was reached after the introductory front birds.'
    warning = rear['warning']
    assert sum(item['kind'] == 'bird-run-bird' for item in rear['s']['obstacleGeometry']) == 1
    assert warning['id'] >= 3 and warning['x'] + warning['width'] < 0
    assert 0 < warning['warningRemaining'] <= .9, warning
    assert warning['flightAge'] == 0 and warning['pathTravel'] != 0
    await page.screenshot(path=OUTPUT / f'bird-run-rear-warning-{width}.png')
    afterwards = await page.evaluate('''() => {
        const before = BertQA.snapshot().obstacleGeometry.find(item => item.direction === 'rear');
        BertQA.simulate(1.2);
        const after = BertQA.snapshot().obstacleGeometry.find(item => item.id === before.id);
        return {before, after};
    }''')
    assert afterwards['after'] and afterwards['after']['warningRemaining'] == 0
    assert afterwards['after']['x'] > afterwards['before']['x']
    assert afterwards['after']['x'] < 200, 'Rear bird must not jump onto Bert when warning ends.'
    await page.evaluate('BertQA.setBird(185, 125, 0); BertQA.renderNow()')
    await page.screenshot(path=OUTPUT / f'bird-run-rear-flying-{width}.png')

    result = await page.evaluate('''() => {
        const before = BertQA.snapshot();
        BertQA.setRunStats({score: 215, streak: 7, time: 42, stars: 7});
        BertQA.triggerDeath({kind: 'bird-run-bird', direction: 'rear', id: -999});
        BertQA.finishDeath();
        const after = BertQA.snapshot();
        return {before, after, result: document.querySelector('#result-progress').textContent,
            shareHidden: document.querySelector('#challenge-btn').classList.contains('hidden')};
    }''')
    assert result['after']['phase'] == 'gameover'
    assert result['after']['deathCause'] == 'bird-run-bird' and result['after']['deathDirection'] == 'rear'
    assert result['after']['meta']['feathers'] == result['before']['meta']['feathers']
    assert result['after']['meta']['totalStars'] == result['before']['meta']['totalStars']
    assert result['after']['missionClaimsCompleted'] == result['before']['missionClaimsCompleted']
    assert result['after']['unlockedLevelIds'] == result['before']['unlockedLevelIds']
    assert 'FUGL BAGFRA' in result['result'] and 'kun lokal eventrekord' in result['result']
    assert result['shareHidden'] and not posts, posts
    await page.wait_for_timeout(950)  # The existing scoreboard counts points up over <=850 ms.
    await page.screenshot(path=OUTPUT / f'bird-run-result-{width}.png')
    assert not errors, errors
    await page.close()
    return {'phone': [width, height], 'introBirdId': first['front']['id'],
            'speciesSeen': species_seen,
            'rearWarningSeconds': .9, 'rearId': warning['id'],
            'pacingMs': {k: round(v, 1) for k, v in pacing.items()},
            'economyUnchanged': True, 'pageErrors': errors}


async def test_actual_collision(browser, port, species_id, random_roll=.32):
    page = await browser.new_page(viewport={'width': 852, 'height': 393})
    errors = []
    page.on('pageerror', lambda error: errors.append(str(error)))
    await page.goto(f'http://127.0.0.1:{port}/?qa=1&rev={BUILD}', wait_until='networkidle')
    await page.wait_for_function("document.querySelector('#loading').classList.contains('hidden')")
    await page.locator('#play-btn').click()
    await page.locator('#bird-run-event-btn').click()
    await page.wait_for_function("BertQA.snapshot().phase === 'prewarm'")
    await page.locator('#gameCanvas').click(position={'x': 330, 'y': 150})
    await page.wait_for_function("BertQA.snapshot().phase === 'playing'")
    before = await page.evaluate('''({id, roll}) => {
        const economyBefore = BertQA.snapshot().meta;
        BertQA.setRunStats({score: 179, streak: 0, time: 0});
        BertQA.collectStar(1);
        const economyAfter = BertQA.snapshot().meta;
        BertQA.setBird(185, 290, 0);
        const s = BertQA.snapshot();
        const bird = BertBirdRun.createEncounter(id, 1000, () => roll).obstacle;
        bird.x = 185 + s.birdWidth / 2 - bird.width / 2;
        bird.y = 290 + s.birdHeight / 2 + 9 - bird.height / 2;
        bird.baseY = bird.y;
        bird.warningRemaining = 0; // In the collision test it is already visible, not in the warning phase.
        BertQA.addObstacle({...bird, id: -27});
        BertQA.renderNow();
        const shape = BertCollision.obstacleShapes(bird)[0];
        return {phase: BertQA.snapshot().phase, shape, bird,
            economyBefore, economyAfter, score: s.score};
    }''', {'id': species_id, 'roll': random_roll})
    assert before['phase'] == 'playing'
    assert before['score'] >= 180 and before['economyAfter'] == before['economyBefore']
    assert before['shape']['type'] == 'box' and before['shape']['x'] >= before['bird']['x']
    after = await page.evaluate('BertQA.simulate(1 / 60)')
    assert after['phase'] == 'dead' and after['deathCause'] == 'bird-run-bird', after
    if species_id == 5:
        assert after['deathPredatorHero'] == before['bird']['heroId']
        assert after['deathCountdown'] >= 2 and after['birdsVisible']
        await page.evaluate('BertQA.simulate(.28); BertQA.renderNow()')
        await page.screenshot(path=OUTPUT / f'bird-run-predator-catch-{before["bird"]["species"]}.png')
        done = await page.evaluate('''() => {
            BertQA.finishDeath(); return {view: BertQA.snapshot(),
                text: document.querySelector('#result-progress').textContent};
        }''')
        assert done['view']['phase'] == 'gameover' and 'ROVFUGL BAGFRA' in done['text'], done
    assert not errors, errors
    await page.close()
    return {'actualVisibleBirdCollision': True, 'species': before['bird']['species'],
            'direction': before['bird']['direction'],
            'deathCause': after['deathCause']}


async def test_predator_warning(browser, port, width, height, roll):
    page = await browser.new_page(viewport={'width': width, 'height': height}, device_scale_factor=2)
    errors = []
    page.on('pageerror', lambda error: errors.append(str(error)))
    await page.goto(f'http://127.0.0.1:{port}/?qa=1&noclip=1&rev={BUILD}', wait_until='networkidle')
    await page.wait_for_function("document.querySelector('#loading').classList.contains('hidden')")
    first = await page.evaluate('''async roll => {
        await BertQA.startLevel(11, {seed: 12}); BertQA.beginRun();
        BertQA.setBird(185, 125, 0);
        const predator = BertBirdRun.createEncounter(5, 1300, () => roll).obstacle;
        BertQA.addObstacle({...predator, id:-59}); BertQA.renderNow();
        return BertQA.snapshot().obstacleGeometry.find(ob => ob.id === -59);
    }''', roll)
    assert first['warningRemaining'] == 1.4 and first['predator']
    assert first['species'] == ('eagle' if roll < .5 else 'vulture') and first['x'] + first['width'] < 0
    await page.screenshot(path=OUTPUT / f'bird-run-predator-warning-{width}.png')
    middle = await page.evaluate('''() => {
        BertQA.simulate(1.2); BertQA.renderNow();
        return BertQA.snapshot().obstacleGeometry.find(ob => ob.id === -59);
    }''')
    assert middle and middle['x'] == first['x'] and 0 < middle['warningRemaining'] < .35, middle
    frames = await page.evaluate('''() => {
        BertQA.simulate(.95);
        const result = [];
        for (let i=0; i<8; i++) {
            BertQA.simulate(.08);
            const bird = BertQA.snapshot().obstacleGeometry.find(ob => ob.id === -59);
            if (bird) result.push({x:bird.x, y:bird.y, frame:bird.animationFrame});
        }
        BertQA.setBird(185, 125, 0); BertQA.renderNow();
        return result;
    }''')
    assert frames and frames[0]['x'] > first['x'] and frames[0]['x'] < 210
    assert len({item['frame'] for item in frames}) >= 2, frames
    assert max(abs(frames[i]['y'] - frames[i-1]['y']) for i in range(1, len(frames))) < 16, frames
    await page.screenshot(path=OUTPUT / f'bird-run-predator-flying-{width}.png')
    await page.emulate_media(reduced_motion='reduce')
    still = await page.evaluate('''() => {
        const frames=[];
        for (let i=0; i<5; i++) {
            BertQA.simulate(.08);
            const ob=BertQA.snapshot().obstacleGeometry.find(item => item.id === -59);
            if (ob) frames.push(ob.animationFrame);
        }
        return frames;
    }''')
    assert still and len(set(still)) == 1, still
    assert not errors, errors
    await page.close()
    return {'species': first['species'], 'warningSeconds': 1.4,
            'flappingFrames': sorted({item['frame'] for item in frames}),
            'reducedMotionFrozen': True}


async def main():
    OUTPUT.mkdir(exist_ok=True)
    port = free_port()
    server = subprocess.Popen(['python3', '-m', 'http.server', str(port), '--bind', '127.0.0.1'],
                              cwd=PROJECT / 'webapp', stdout=subprocess.DEVNULL, stderr=subprocess.STDOUT)
    try:
        time.sleep(.4)
        async with async_playwright() as playwright:
            browser = await playwright.webkit.launch()
            reports = [await run_phone(browser, port, 852, 393),
                       await run_phone(browser, port, 667, 375)]
            predators = [await test_predator_warning(browser, port, 852, 393, .1),
                         await test_predator_warning(browser, port, 667, 375, .9)]
            collisions = [await test_actual_collision(browser, port, species_id)
                          for species_id in range(3)]
            collisions += [await test_actual_collision(browser, port, 3, roll)
                           for roll in (.32, .55, .92)]
            collisions += [await test_actual_collision(browser, port, 5, roll)
                           for roll in (.1, .9)]
            assert {c['species'] for c in collisions if c['direction'] == 'rear'} == \
                {'glider', 'swift', 'kite', 'eagle', 'vulture'}
            await browser.close()
        report = {'status': 'passed', 'reports': reports, 'predators': predators, 'collisions': collisions}
        (OUTPUT / 'report.json').write_text(json.dumps(report, indent=2), encoding='utf-8')
        print(json.dumps({'status': 'passed', 'report': str(OUTPUT / 'report.json')}))
    finally:
        server.terminate()
        server.wait(timeout=5)


if __name__ == '__main__':
    asyncio.run(main())
