import asyncio
import json
import os
import socket
import subprocess
import tempfile
import time
import urllib.request
from pathlib import Path

from playwright.async_api import async_playwright

PROJECT = Path(__file__).resolve().parents[1]
OUTPUT = PROJECT.parent / 'qa-social-jungle'


def free_port():
    with socket.socket() as listener:
        listener.bind(('127.0.0.1', 0))
        return listener.getsockname()[1]


def post(base, path, payload):
    request = urllib.request.Request(base + path, data=json.dumps(payload).encode(), headers={'Content-Type': 'application/json'})
    with urllib.request.urlopen(request, timeout=4) as response:
        return json.loads(response.read())


async def main():
    OUTPUT.mkdir(exist_ok=True)
    temporary_db = tempfile.TemporaryDirectory(prefix='bert_social_test_')
    port = free_port()
    base = f'http://127.0.0.1:{port}'
    server = subprocess.Popen(
        ['python3', str(PROJECT / 'server/server.py'), '--port', str(port)], cwd=PROJECT,
        env={**os.environ, 'BERT_DB_PATH': str(Path(temporary_db.name) / 'test.sqlite3')},
        stdout=subprocess.DEVNULL, stderr=subprocess.STDOUT,
    )
    try:
        for _ in range(50):
            try:
                urllib.request.urlopen(base + '/api/health', timeout=1)
                break
            except Exception:
                time.sleep(.1)
        post(base, '/api/scores', {'runId': 'accept-1', 'playerId': 'a', 'playerName': 'Ada', 'mode': 'classic', 'levelId': 1, 'score': 120, 'streak': 12, 'time': 50})
        post(base, '/api/scores', {'runId': 'accept-2', 'playerId': 'b', 'playerName': 'Bo', 'mode': 'classic', 'levelId': 4, 'score': 90, 'streak': 16, 'time': 72})
        challenge = post(base, '/api/challenges', {'playerId': 'a', 'playerName': 'Ada', 'mode': 'classic', 'levelId': 1, 'seed': 9988, 'score': 120, 'streak': 12, 'time': 50, 'ghost': [[0, 360, 0], [5, 315, 1], [10, 400, -1]]})

        async with async_playwright() as playwright:
            browser = await playwright.webkit.launch()
            page = await browser.new_page(viewport={'width': 852, 'height': 393}, device_scale_factor=2)
            errors = []
            page.on('pageerror', lambda error: errors.append(str(error)))
            await page.goto(base + '/?qa=1&noclip=1', wait_until='networkidle')
            await page.wait_for_function("document.querySelector('#loading').classList.contains('hidden')")
            await page.click('#leaderboard-btn')
            await page.wait_for_function("document.querySelectorAll('#leaderboard-list li').length === 2")
            assert 'GLOBAL' in await page.locator('#leaderboard-status').inner_text()
            await page.screenshot(path=OUTPUT / 'leaderboard.png')
            await page.click('#close-leaderboard')

            await page.evaluate('async()=>{await BertQA.startLevel(4,{seed:444});BertQA.beginRun()}')
            await page.wait_for_timeout(350)
            assert not errors, errors
            await page.screenshot(path=OUTPUT / 'jungle-restored.png')

            await page.evaluate('async()=>{await BertQA.startLevel(1,{seed:321});BertQA.beginRun();BertQA.simulate(28)}')
            desert = await page.evaluate('BertQA.snapshot()')
            walls = [item for item in desert['obstacleGeometry'] if item['kind'] == 'desert-wall']
            widths = {round(item['width']) for item in walls}
            pairs = {}
            for item in walls: pairs.setdefault(item['id'], []).append(item)
            gaps = []
            for pair in pairs.values():
                if len(pair) == 2:
                    top = next(item for item in pair if item['top'])
                    bottom = next(item for item in pair if not item['top'])
                    gaps.append(round(bottom['y'] - top['height']))
            assert len(widths) >= 3, widths
            assert len(set(gaps)) >= 2, gaps

            await page.goto(base + f"/?qa=1&duel={challenge['id']}", wait_until='networkidle')
            await page.wait_for_function("document.querySelector('#loading').classList.contains('hidden')")
            await page.wait_for_function("!document.querySelector('#challenge-modal').classList.contains('hidden')")
            await page.screenshot(path=OUTPUT / 'challenge.png')
            await page.click('#accept-challenge')
            await page.wait_for_function('BertQA.snapshot().challengeId !== null')
            snapshot = await page.evaluate('BertQA.snapshot()')
            assert snapshot['seed'] == 9988 and snapshot['challengeId'] == challenge['id']
            await page.click('#gameCanvas', position={'x': 180, 'y': 150})
            await page.wait_for_timeout(450)
            await page.screenshot(path=OUTPUT / 'ghost-run.png')
            assert not errors, errors
            report = {'status': 'passed', 'leaderboardRows': 2, 'desertWidths': sorted(widths), 'desertGaps': gaps, 'challengeId': challenge['id'], 'seed': snapshot['seed']}
            (OUTPUT / 'report.json').write_text(json.dumps(report, indent=2))
            print(json.dumps({'status': 'passed', 'report': str(OUTPUT / 'report.json')}))
            await browser.close()
    finally:
        server.terminate()
        server.wait(timeout=5)
        temporary_db.cleanup()


if __name__ == '__main__':
    asyncio.run(main())
