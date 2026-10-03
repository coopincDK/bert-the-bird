"""Verify the existing mobile scoreboard UI against an isolated real SQLite server."""
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
SERVER = PROJECT / 'server' / 'server.py'


def port():
    with socket.socket() as listener:
        listener.bind(('127.0.0.1', 0))
        return listener.getsockname()[1]


def request(base, route, payload=None):
    data = None if payload is None else json.dumps(payload).encode()
    with urllib.request.urlopen(urllib.request.Request(base + route, data=data, headers={'Content-Type': 'application/json'}), timeout=4) as response:
        return json.load(response)


async def main():
    with tempfile.TemporaryDirectory(prefix='bert_friends_ui_') as folder:
        listen = port()
        base = f'http://127.0.0.1:{listen}'
        server = subprocess.Popen(
            ['python3', str(SERVER), '--port', str(listen)], cwd=PROJECT,
            env={**os.environ, 'BERT_DB_PATH': str(Path(folder) / 'test.sqlite3')},
            stdout=subprocess.DEVNULL, stderr=subprocess.STDOUT,
        )
        try:
            for _ in range(50):
                try:
                    if request(base, '/api/health')['ok']:
                        break
                except Exception:
                    time.sleep(.1)
            async with async_playwright() as playwright:
                browser = await playwright.webkit.launch(headless=True)
                context = await browser.new_context(
                    viewport={'width': 852, 'height': 393}, device_scale_factor=2,
                    is_mobile=True, has_touch=True,
                    user_agent='Mozilla/5.0 (iPhone; CPU iPhone OS 18_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) CriOS/129.0 Mobile/15E148 Safari/604.1',
                )
                page = await context.new_page()
                errors = []
                page.on('pageerror', lambda error: errors.append(str(error)))
                await page.goto(base + '/?qa=1', wait_until='networkidle')
                await page.wait_for_function("document.querySelector('#loading').classList.contains('hidden')")
                own_id = await page.evaluate('BertMeta.snapshot().player.id')
                run = {'mode': 'classic', 'levelId': 1, 'score': 50, 'streak': 5, 'time': 25}
                for run_id, player, name, score in [('a', own_id, 'Ada', 50), ('b', 'pilot-b', 'Bo', 60), ('c', 'pilot-c', 'Cal', 999)]:
                    request(base, '/api/scores', {**run, 'runId': run_id, 'playerId': player, 'playerName': name, 'score': score})
                challenge = request(base, '/api/challenges', {**run, 'playerId': own_id, 'playerName': 'Ada', 'seed': 128, 'ghost': [[0, 360, 0]]})
                request(base, f"/api/challenges/{challenge['id']}/attempts", {'playerId': 'pilot-b', 'playerName': 'Bo', 'score': 60, 'streak': 5, 'time': 25})
                await page.locator('#leaderboard-btn').click()
                await page.wait_for_function("document.querySelector('#leaderboard-status').textContent.includes('GLOBALT')")
                assert 'Cal' in await page.locator('#leaderboard-list').inner_text()
                await page.locator('[data-board-scope="friends"]').click()
                await page.wait_for_function("document.querySelector('#leaderboard-status').textContent.includes('1 RIVALER')")
                friends = await page.locator('#leaderboard-list').inner_text()
                assert 'Ada' in friends and 'Bo' in friends and 'Cal' not in friends, friends
                assert await page.locator('[data-board-scope="friends"]').get_attribute('aria-pressed') == 'true'
                await page.select_option('#board-level', '1')
                await page.wait_for_function("document.querySelector('#leaderboard-status').textContent.includes('VENNER FRA DUELLER')")
                assert 'Cal' not in await page.locator('#leaderboard-list').inner_text()
                await page.locator('[data-board-scope="global"]').click()
                await page.wait_for_function("document.querySelector('#leaderboard-status').textContent.includes('GLOBALT')")
                assert 'Cal' in await page.locator('#leaderboard-list').inner_text()
                await page.set_viewport_size({'width': 667, 'height': 375})
                await page.wait_for_timeout(200)
                card = await page.locator('.leaderboard-card').bounding_box()
                scopes = [await button.bounding_box() for button in await page.locator('[data-board-scope]').all()]
                assert card and card['x'] >= 0 and card['y'] >= 0 and card['y'] + card['height'] <= 375, card
                assert all(box and box['width'] > 50 and box['x'] >= card['x'] and box['x'] + box['width'] <= card['x'] + card['width'] for box in scopes), scopes
                await page.screenshot(path=PROJECT.parent / 'qa-friends-board-se.png')
                assert not errors, errors
                await browser.close()
            print('Global and duel-rival iPhone leaderboard UI passed against isolated SQLite API.')
        finally:
            server.terminate()
            server.wait(timeout=5)


if __name__ == '__main__':
    asyncio.run(main())
