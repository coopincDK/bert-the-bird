"""WebKit integration of the three optional local world goals.

QA-only valid source obstacles are injected and culled by the real 60 Hz engine.
Noclip isolates milestone completion from adversarial balancing; other acceptance
suites separately cover real spawn, collision, visual cues and playable lanes.
"""
import asyncio
import json
import socket
import subprocess
from pathlib import Path

from playwright.async_api import async_playwright

ROOT = Path(__file__).resolve().parents[1]
OUTPUT = ROOT.parent / 'qa-world-milestones-worlds-relay-83'
BADGES = {10: 'PUBLIKUMSVØLGE', 11: 'FRI AF ROVFUGLEN', 12: 'STORMPILOT'}


def free_port():
    with socket.socket() as sock:
        sock.bind(('127.0.0.1', 0))
        return sock.getsockname()[1]


async def check(browser, port, width, height, event_id):
    context = await browser.new_context(viewport={'width': width, 'height': height},
                                        device_scale_factor=2, is_mobile=True,
                                        has_touch=True)
    page = await context.new_page()
    posts = []
    errors = []
    page.on('request', lambda req: posts.append(req.url) if req.method == 'POST' else None)
    page.on('pageerror', lambda err: errors.append(str(err)))
    try:
        await page.goto(f'http://127.0.0.1:{port}/?qa=1&noclip=1&rev=worlds-relay-83',
                        wait_until='networkidle')
        await page.wait_for_function('window.BertQA && window.BertWorldMastery && window.BertEDM && window.BertStormline')
        start = await page.evaluate('''async id => {
            await BertQA.startLevel(id, {seed: 4242}); BertQA.beginRun();
            return BertQA.snapshot();
        }''', event_id)
        assert start['event'] and len(start['levelCatalog']) == 9
        assert start['worldBadge'] is None and start['phase'] == 'playing', start
        before = {key: start['meta'][key] for key in ('feathers', 'totalStars', 'runCount')}
        claims = start['missionClaimsCompleted']
        visible = await page.evaluate('''id => {
            if (id === 10) {
                const crowd = BertEDM.createGroup(12, 420, 1, () => .99);
                if (crowd.kind !== 'crowd-ball' || crowd.obstacles.length !== 3) throw Error('Invalid crowd fixture');
                crowd.obstacles.forEach(ball => BertQA.addObstacle(ball));
            } else if (id === 11) {
                BertQA.addObstacle({kind:'bird-run-bird', predator:true, direction:'rear',
                    heroId:'SkyClaw', x: 1270, y: 430, baseY:430, width:160, height:100,
                    warningRemaining:0, flightAge:2, forwardSpeed:240, scrollFactor:1});
            } else {
                BertQA.addObstacle(BertStormline.createEncounter(5, 420, () => .5,
                    {level:2, horizontal:0, vertical:0}).obstacle);
            }
            return BertQA.renderNow();
        }''', event_id)
        assert visible['worldBadge'] is None and visible['phase'] == 'playing'
        assert visible['obstacleCount'] >= (3 if event_id == 10 else 1)
        await page.screenshot(path=OUTPUT / f'world-{event_id}-hazard-{width}.png')
        completion = await page.evaluate('''id => {
            let partly = false;
            let finished = null;
            for (let i=0; i<110; i++) {
                const s = BertQA.snapshot();
                if (s.phase === 'world-finish') { finished = s; break; }
                if (s.phase !== 'playing') throw Error('World unexpectedly stopped: ' + s.phase);
                BertQA.setBird(185, id === 10 ? 135 : 535, 0);
                const next = BertQA.simulate(.06);
                if (id === 10 && next.obstacleGeometry.filter(o => o.id === 12).length > 0
                    && next.obstacleGeometry.filter(o => o.id === 12).length < 3) {
                    partly = true;
                    if (next.worldBadge) throw Error('Badge granted before the last crowd ball exited');
                }
            }
            return {partly, finished};
        }''', event_id)
        assert completion['finished'], f'World goal never completed: {event_id}'
        assert completion['finished']['worldBadge'] == BADGES[event_id], completion
        if event_id == 10:
            assert completion['partly'], 'Three-ball wave never showed an intermediate remaining ball'
        await page.screenshot(path=OUTPUT / f'world-{event_id}-complete-{width}.png')
        result = await page.evaluate('BertQA.simulate(2.0)')
        assert result['phase'] == 'gameover' and result['worldBadge'] == BADGES[event_id]
        assert all(result['meta'][key] == value for key, value in before.items()), result['meta']
        assert result['missionClaimsCompleted'] == claims
        assert result['rescueLives'] == 0 and result['challengeId'] is None
        assert await page.locator('#challenge-btn').is_hidden()
        result_text = await page.locator('#result-progress').inner_text()
        assert f'MÆRKE: {BADGES[event_id]}' in result_text, (event_id, result_text)
        assert 'VERDEN KLARET' in await page.locator('.result-kicker').inner_text()
        stored = await page.evaluate('JSON.parse(localStorage.getItem(BertWorldMastery.KEY))')
        assert stored[str(event_id)] is True
        assert not posts and not errors, {'posts': posts, 'pageErrors': errors}
        await page.screenshot(path=OUTPUT / f'world-{event_id}-result-{width}.png')
        return {'viewport': [width, height], 'eventId': event_id, 'badge': result['worldBadge'],
                'phase': result['phase'], 'elapsed': round(result['elapsed'], 2),
                'score': result['score'], 'posts': posts, 'pageErrors': errors}
    finally:
        await context.close()


async def main():
    OUTPUT.mkdir(parents=True, exist_ok=True)
    port = free_port()
    server = subprocess.Popen(['python3', '-m', 'http.server', str(port), '--bind', '127.0.0.1',
                               '--directory', str(ROOT / 'webapp')],
                              stdout=subprocess.DEVNULL, stderr=subprocess.DEVNULL)
    try:
        async with async_playwright() as playwright:
            browser = await playwright.webkit.launch(headless=True)
            try:
                report = [await check(browser, port, w, h, event)
                          for w, h in ((852, 393), (667, 375)) for event in (10, 11, 12)]
            finally:
                await browser.close()
    finally:
        server.terminate()
        server.wait(timeout=10)
    (OUTPUT / 'report.json').write_text(json.dumps(report, indent=2, ensure_ascii=False) + '\n')
    print(json.dumps(report, indent=2, ensure_ascii=False))


if __name__ == '__main__':
    asyncio.run(main())
