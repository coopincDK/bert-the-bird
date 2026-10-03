"""Exercise Jungle's new opening spacing, star lane and transition in mobile WebKit."""
import asyncio
import json
import socket
import subprocess
import time
from pathlib import Path

from playwright.async_api import async_playwright

PROJECT = Path(__file__).resolve().parents[1]
OUTPUT = PROJECT.parent / 'qa-jungle-intro'


def free_port():
    with socket.socket() as listener:
        listener.bind(('127.0.0.1', 0))
        return listener.getsockname()[1]


async def main():
    OUTPUT.mkdir(exist_ok=True)
    port = free_port()
    server = subprocess.Popen(
        ['python3', '-m', 'http.server', str(port), '--bind', '127.0.0.1'],
        cwd=PROJECT / 'webapp', stdout=subprocess.DEVNULL, stderr=subprocess.STDOUT,
    )
    try:
        time.sleep(.5)
        async with async_playwright() as playwright:
            browser = await playwright.webkit.launch()
            page = await browser.new_page(viewport={'width': 852, 'height': 393}, device_scale_factor=2)
            errors = []
            page.on('pageerror', lambda error: errors.append(str(error)))
            await page.goto(f'http://127.0.0.1:{port}/?qa=1&noclip=1&rev=worlds-relay-28', wait_until='networkidle')
            await page.wait_for_function("document.querySelector('#loading').classList.contains('hidden')")
            await page.evaluate('async () => { await BertQA.startLevel(4, {seed: 1442}); BertQA.beginRun(); }')
            opening = await page.evaluate('BertQA.simulate(.05)')
            first_enemy = opening['obstacleGeometry'][0]
            first_star = opening['starGeometry'][0]
            assert first_enemy['kind'].startswith('jungle-'), first_enemy
            assert first_star['x'] - first_enemy['x'] == 260, (first_star, first_enemy)
            assert 318 <= first_star['y'] <= 402, first_star
            assert opening['spawnSpacing'] == 940, opening['spawnSpacing']

            # Keep Bert in the chosen lane to show the first star can be caught only
            # after its enemy has passed the bird; no synthetic score injection.
            pickup = await page.evaluate('''(starY) => {
                let snapshot;
                for (let frame = 0; frame < 220; frame += 1) {
                    BertQA.setBird(185, starY - 56, 0);
                    snapshot = BertQA.simulate(1 / 60);
                    if (snapshot.starsCollected) break;
                }
                return snapshot;
            }''', first_star['y'])
            assert pickup['starsCollected'] >= 1, 'The first approachable Jungle star could not be collected.'
            earliest_enemy = next((item for item in pickup['obstacleGeometry'] if item['id'] == first_enemy['id']), None)
            assert earliest_enemy is None or earliest_enemy['x'] + earliest_enemy['width'] < 215, earliest_enemy
            await page.screenshot(path=OUTPUT / 'intro-play.png')

            await page.evaluate('async () => { await BertQA.startLevel(4, {seed: 1442}); BertQA.beginRun(); }')
            early = await page.evaluate('BertQA.simulate(17)')
            assert early['spawnSpacing'] == 940, early['spawnSpacing']
            assert 6 <= early['spawnedObstacleGroups'] <= 14, early['spawnedObstacleGroups']
            middle = await page.evaluate('BertQA.simulate(5)')
            assert middle['spawnSpacing'] == 800, middle['spawnSpacing']
            late = await page.evaluate('BertQA.simulate(17)')
            assert late['spawnSpacing'] == 660, late['spawnSpacing']
            assert late['spawnedObstacleGroups'] > middle['spawnedObstacleGroups'] > early['spawnedObstacleGroups']
            assert not errors, errors
            report = {
                'status': 'passed',
                'firstStar': first_star,
                'firstEnemy': first_enemy,
                'collectedBeforeNextEnemy': pickup['starsCollected'],
                'obstacleGroups': [early['spawnedObstacleGroups'], middle['spawnedObstacleGroups'], late['spawnedObstacleGroups']],
                'spacing': [early['spawnSpacing'], middle['spawnSpacing'], late['spawnSpacing']],
                'pageErrors': errors,
            }
            path = OUTPUT / 'report.json'
            path.write_text(json.dumps(report, indent=2), encoding='utf-8')
            print(json.dumps({'status': 'passed', 'report': str(path)}))
            await browser.close()
    finally:
        server.terminate()
        server.wait(timeout=5)


if __name__ == '__main__':
    asyncio.run(main())
