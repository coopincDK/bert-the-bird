"""Bird Run progressive, seeded multi-bird waves in landscape WebKit."""
import asyncio
import json
import socket
import subprocess
import sys
from pathlib import Path
from urllib.request import urlopen

from playwright.async_api import async_playwright

PROJECT = Path(__file__).resolve().parents[1]
OUTPUT = PROJECT.parent / 'qa-bird-waves'
BUILD = 'worlds-relay-45'


def free_port():
    with socket.socket() as sock:
        sock.bind(('127.0.0.1', 0))
        return sock.getsockname()[1]


async def phone(browser, port, width, height):
    page = await browser.new_page(viewport={'width': width, 'height': height},
                                  device_scale_factor=2, service_workers='block')
    errors = []
    page.on('pageerror', lambda error: errors.append(str(error)))
    await page.goto(f'http://127.0.0.1:{port}/?qa=1&noclip=1&rev={BUILD}',
                    wait_until='networkidle')
    await page.locator('#loading').wait_for(state='hidden')
    rows = []
    for wave_id in (4, 7, 10, 14, 19):
        result = await page.evaluate('''async id => {
            await BertQA.startLevel(11, {seed: 391}); BertQA.beginRun();
            BertQA.setBird(185, 112, 0);
            let seed = 11803 + id;
            const random = () => { seed = (Math.imul(seed, 1664525) + 1013904223) >>> 0;
                return seed / 0x100000000; };
            const wave = BertBirdRun.createWave(id, 620, random);
            for (const obstacle of wave.obstacles) BertQA.addObstacle(obstacle);
            if (wave.star) BertQA.addStar(wave.star.x, wave.star.y);
            let view = BertQA.snapshot();
            let visible = [];
            for (let i = 0; i < 24; i++) {
                view = BertQA.simulate(.06);
                visible = view.obstacleGeometry.filter(ob => ob.waveSize === wave.obstacles.length
                    && ob.waveIndex !== null && ob.x > -20 && ob.x + ob.width < 1270);
                if (visible.length === wave.obstacles.length) break;
            }
            BertQA.setBird(185, 112, 0); BertQA.renderNow();
            return {id, size: wave.obstacles.length, visible,
                all: view.obstacleGeometry.filter(ob => ob.waveIndex !== null),
                star: wave.star, phase:view.phase,
                shapes: visible.map(ob => BertCollision.obstacleShapes(ob)[0]),
                mainRunBird: {x:185,y:112,width:view.birdWidth,height:view.birdHeight}};
        }''', wave_id)
        assert result['phase'] == 'playing' and len(result['visible']) == result['size'], result
        assert result['size'] in range(2, 7), result
        xs = [item['x'] for item in result['visible']]
        assert xs == sorted(xs) and all(xs[i] - xs[i-1] >= 160 for i in range(1, len(xs))), result
        assert all(item['direction'] == 'front' and item['warningRemaining'] == 0
                   and item['waveSize'] == result['size'] for item in result['visible']), result
        assert result['star']['x'] > result['all'][-1]['x'] + result['all'][-1]['width'], result
        for ob, shape in zip(result['visible'], result['shapes']):
            assert shape['x'] >= ob['x'] and shape['x'] + shape['width'] <= ob['x'] + ob['width'], result
            assert shape['y'] >= ob['y'] and shape['y'] + shape['height'] <= ob['y'] + ob['height'], result
        await page.screenshot(path=OUTPUT / f'bird-wave-{wave_id}-{width}.png')
        rows.append({'wave': wave_id, 'count': result['size'], 'visible': len(result['visible']),
                     'species': [item['species'] for item in result['visible']]})
    production = await page.evaluate('''async () => {
        await BertQA.startLevel(11, {seed: 8307}); BertQA.beginRun();
        const counts=[];
        for (let id=0; id<20; id++) {
            BertQA.spawnObstacle();
            const count=BertQA.snapshot().obstacleGeometry.filter(o => o.id===id).length;
            counts.push(count);
        }
        return counts;
    }''')
    assert production == [1,1,1,1,2,1,2,3,1,3,4,4,4,1,5,5,5,5,1,6], production
    assert not errors, errors
    await page.close()
    return {'viewport': [width, height], 'waves': rows, 'productionCounts': production,
            'pageErrors': errors}


async def main():
    OUTPUT.mkdir(exist_ok=True)
    port = free_port()
    server = subprocess.Popen([sys.executable, '-m', 'http.server', str(port), '--bind', '127.0.0.1'],
                              cwd=PROJECT / 'webapp', stdout=subprocess.DEVNULL, stderr=subprocess.STDOUT)
    try:
        for _ in range(50):
            try:
                urlopen(f'http://127.0.0.1:{port}/', timeout=1).close()
                break
            except Exception:
                await asyncio.sleep(.1)
        else:
            raise RuntimeError('No temporary Bird Run static origin')
        async with async_playwright() as playwright:
            browser = await playwright.webkit.launch()
            phones = []
            for width, height in ((852,393), (667,375)):
                phones.append(await phone(browser, port, width, height))
            await browser.close()
        report = {'build': BUILD, 'phones': phones, 'status': 'passed'}
        (OUTPUT / 'report.json').write_text(json.dumps(report, indent=2), encoding='utf-8')
        print(json.dumps({'status': 'passed', 'folder': str(OUTPUT), 'phones': len(phones),
                          'counts': [row['count'] for row in phones[0]['waves']]}))
    finally:
        server.terminate()
        server.wait(timeout=5)


if __name__ == '__main__':
    asyncio.run(main())
