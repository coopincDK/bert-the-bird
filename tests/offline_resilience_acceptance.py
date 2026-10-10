"""Install Bert, survive an unhealthy server, then play every mode with no network."""
import asyncio
import json
import threading
import time
from http.server import SimpleHTTPRequestHandler, ThreadingHTTPServer
from pathlib import Path
from urllib.parse import urlsplit

from playwright.async_api import async_playwright

ROOT = Path(__file__).resolve().parents[1]
OUTPUT = ROOT.parent / 'qa-offline-resilience'
BUILD = 'worlds-relay-102'


class GameHandler(SimpleHTTPRequestHandler):
    root = str(ROOT / 'webapp')
    fault = None
    requests = 0
    lock = threading.Lock()

    def __init__(self, *args, **kwargs):
        super().__init__(*args, directory=self.root, **kwargs)

    def do_GET(self):
        with self.lock:
            self.__class__.requests += 1
        if urlsplit(self.path).path in ('/', '/index.html') and self.fault:
            if self.fault == 'slow':
                time.sleep(7)
            self.send_response(503)
            self.send_header('Content-Type', 'text/html; charset=utf-8')
            self.end_headers()
            try:
                self.wfile.write(b'<!doctype html><title>Unavailable</title>Preview unavailable')
            except (BrokenPipeError, ConnectionResetError):
                pass
            return
        super().do_GET()

    def log_message(self, *args):
        pass


async def browser_case(browser_type, base, width, height, server):
    executable_path = '/usr/bin/chromium' if browser_type.name == 'chromium' else None
    launch_options = {'executable_path': executable_path, 'args': ['--no-sandbox']} if executable_path else {}
    browser = await browser_type.launch(**launch_options)
    context = await browser.new_context(
        viewport={'width': width, 'height': height},
        is_mobile=(browser_type.name == 'webkit'),
        has_touch=True,
        service_workers='allow',
    )
    page = await context.new_page()
    errors = []
    page.on('pageerror', lambda error: errors.append(str(error)))
    try:
        await page.goto(base + '?rev=' + BUILD, wait_until='domcontentloaded')
        await page.locator('#loading').wait_for(state='hidden', timeout=35000)
        await page.wait_for_function('window.BertApp?.offlineReady()', timeout=45000)
        assert await page.evaluate('navigator.serviceWorker.controller !== null')
        cache = await page.evaluate('''async () => {
            const entries = await caches.open('bert-the-bird-worlds-relay-102');
            return {html: !!(await entries.match('./index.html')),
                    game: !!(await entries.match('./unity-faithful.js?v=worlds-relay-102')),
                    relay: !!(await entries.match('./bert-sky-relay.js?v=worlds-relay-102')),
                    mastery: !!(await entries.match('./bert-world-mastery.js?v=worlds-relay-102')),
                    gate: !!(await entries.match('./assets/sky-relay/flight-gate-play.webp')),
                    front: !!(await entries.match('./assets/sky-relay/flight-gate-foreground-play.webp')),
                    bell: !!(await entries.match('./assets/sky-relay/wind-chime-target-play.webp'))};
        }''')
        assert cache == {'html': True, 'game': True, 'relay': True, 'mastery': True,
                         'gate': True, 'front': True, 'bell': True}, cache

        GameHandler.fault = '503'
        response = await page.reload(wait_until='domcontentloaded')
        assert response and response.status == 200, f'503 replaced cached HTML: {response.status if response else None}'
        await page.locator('#loading').wait_for(state='hidden', timeout=20000)
        assert await page.evaluate('BertApp.build') == BUILD
        assert 'Unavailable' not in await page.title()
        GameHandler.fault = 'slow'
        started = time.monotonic()
        response = await page.reload(wait_until='domcontentloaded', timeout=15000)
        fallback_seconds = time.monotonic() - started
        assert response and response.status == 200, response.status if response else None
        assert fallback_seconds < 6.8, fallback_seconds
        GameHandler.fault = None

        # Playwright's headless WebKit errors internally on context.set_offline()
        # with an active service worker. Shutting the server down is a stronger
        # test of server independence and preserves the browser's SW behavior.
        if browser_type.name == 'webkit':
            server.shutdown()
            server.server_close()
        else:
            await context.set_offline(True)
        # QA flags expose locked levels but do not bypass the installed worker.
        await page.goto(base + '?qa=1&noclip=1', wait_until='domcontentloaded')
        await page.locator('#loading').wait_for(state='hidden', timeout=15000)
        await page.wait_for_function('window.BertQA && window.BertApp', timeout=15000)
        await page.wait_for_timeout(400)
        count_offline = GameHandler.requests
        assert await page.evaluate('navigator.serviceWorker.controller !== null') is True
        levels = []
        for level_id in range(1, 14):
            result = await page.evaluate('''async levelId => {
                await BertQA.startLevel(levelId, {seed: 67000 + levelId});
                BertQA.beginRun();
                BertQA.simulate(0.07);
                const s = BertQA.snapshot();
                return {id:s.levelId, phase:s.phase, event:s.event, loaded:s.loadedAssetCount};
            }''', level_id)
            assert result['id'] == level_id and result['phase'] == 'playing', result
            assert result['event'] == (level_id >= 10), result
            levels.append(result)

        # A regular ranked run must write local history, not send a delayed POST
        # once the network returns. The service worker never caches /api/.
        local_score = await page.evaluate('''async () => {
            await BertQA.startLevel(1, {seed: 67001});
            BertQA.beginRun();
            BertQA.setRunStats({score:135, streak:3, time:8, stars:0});
            BertQA.triggerDeath();
            BertQA.finishDeath();
            const rows = await BertSocial.getLeaderboard({period:'all', mode:'all',
                level:'all', metric:'score', scope:'global'});
            return {record: localStorage.getItem('bertTheBird_unity_level_1'),
                    offline: rows.offline, first: rows.rows[0]?.score};
        }''')
        assert local_score == {'record': '135', 'offline': True, 'first': 135}, local_score
        await page.reload(wait_until='domcontentloaded')
        await page.locator('#loading').wait_for(state='hidden', timeout=15000)
        assert await page.evaluate("localStorage.getItem('bertTheBird_unity_level_1')") == '135'
        assert await page.evaluate('navigator.serviceWorker.controller !== null') is True
        await page.locator('#play-btn').click()
        assert await page.locator('#level-grid').is_visible()
        assert GameHandler.requests == count_offline, 'The game contacted a server in airplane mode'
        # WebKit can log a failed *background update check* after the test has
        # deliberately shut its origin down. The already-installed controller,
        # zero HTTP requests, and all 13 loaded runs are asserted above.
        expected_update_warnings = [error for error in errors if browser_type.name == 'webkit'
                                    and 'service-worker.js' in error
                                    and 'due to access control checks' in error]
        unexpected_errors = [error for error in errors if error not in expected_update_warnings]
        assert not unexpected_errors, errors
        return {'browser': browser_type.name, 'viewport': [width, height],
                'cache': cache, 'server503': True, 'timeoutFallbackSeconds': round(fallback_seconds, 2),
                'offlineLevels': [item['id'] for item in levels], 'localScore': local_score,
                'offlineHttpRequests': GameHandler.requests - count_offline,
                'expectedOfflineSWUpdateWarnings': expected_update_warnings,
                'pageErrors': unexpected_errors}
    finally:
        GameHandler.fault = None
        await browser.close()


async def main():
    OUTPUT.mkdir(exist_ok=True)
    server = ThreadingHTTPServer(('127.0.0.1', 0), GameHandler)
    worker = threading.Thread(target=server.serve_forever, daemon=True)
    worker.start()
    base = f'http://127.0.0.1:{server.server_port}/'
    try:
        async with async_playwright() as playwright:
            report = [await browser_case(playwright.chromium, base, 852, 393, server),
                      await browser_case(playwright.webkit, base, 667, 375, server)]
    finally:
        server.shutdown()
        server.server_close()
    (OUTPUT / 'report.json').write_text(json.dumps(report, indent=2) + '\n', encoding='utf-8')
    print(json.dumps({'status': 'passed', 'report': str(OUTPUT / 'report.json'),
                      'browsers': [item['browser'] for item in report]}))


if __name__ == '__main__':
    asyncio.run(main())
