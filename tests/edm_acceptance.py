"""End-to-end iPhone checks for the separate, unranked Neon Encore test level."""
import asyncio
import json
import socket
import subprocess
import time
from pathlib import Path

from playwright.async_api import async_playwright

PROJECT = Path(__file__).resolve().parents[1]
OUTPUT = PROJECT.parent / 'qa-edm-encore'


def free_port():
    with socket.socket() as sock:
        sock.bind(('127.0.0.1', 0))
        return sock.getsockname()[1]


async def run_phone(browser, port, width, height):
    page = await browser.new_page(viewport={'width': width, 'height': height}, device_scale_factor=2)
    errors = []
    posts = []
    page.on('pageerror', lambda error: errors.append(str(error)))
    page.on('console', lambda message: errors.append(f'console: {message.text}') if message.text.startswith('EDM error') else None)
    await page.add_init_script("window.addEventListener('error', e => console.error(`EDM error ${e.filename}:${e.lineno}:${e.colno} ${e.message} ${e.error?.stack || ''}`));")
    page.on('request', lambda request: posts.append(request.url) if request.method == 'POST' else None)
    await page.goto(f'http://127.0.0.1:{port}/?qa=1&noclip=1&rev=worlds-relay-26', wait_until='networkidle')
    await page.wait_for_function("document.querySelector('#loading').classList.contains('hidden')")
    await page.locator('#play-btn').click()
    button = page.locator('#edm-event-btn')
    assert await button.is_visible()
    assert await page.locator('.level-card:visible').count() == 3, 'The original three-by-three mode grid must remain intact.'
    layout = await page.evaluate('''() => {
        const panel = document.querySelector('#level-menu').getBoundingClientRect();
        const button = document.querySelector('#edm-event-btn').getBoundingClientRect();
        return {panel: {top: panel.top, bottom: panel.bottom}, button: {top: button.top, bottom: button.bottom}};
    }''')
    assert layout['button']['top'] >= layout['panel']['top'] and layout['button']['bottom'] <= layout['panel']['bottom'], layout
    await page.screenshot(path=OUTPUT / f'event-menu-{width}.png')
    await button.click()
    await page.wait_for_function("BertQA.snapshot().phase === 'prewarm'")
    await page.locator('#gameCanvas').click(position={'x': 340, 'y': 160})
    await page.wait_for_function("BertQA.snapshot().phase === 'playing'")
    opening = await page.evaluate('BertQA.simulate(4)')
    assert opening['event'] and opening['levelId'] == 10 and opening['levelKind'] == 'edm', opening
    assert not opening['edmMusicPaused'], 'The original concert music must start on the gameplay tap.'
    assert len(opening['levelCatalog']) == 9 and 10 not in opening['unlockedLevelIds']
    assert set(['edmStage', 'edmSpeaker', 'edmMirror', 'edmTruss']).issubset(set(opening['loadedAssetKeys']))
    assert opening['spawnedObstacleGroups'] > 0
    assert opening['obstacleGeometry'][0]['kind'] in ('edm-tower', 'edm-orb')
    assert opening['starGeometry'] and opening['starGeometry'][0]['x'] > opening['obstacleGeometry'][0]['x']
    orb = await page.evaluate('''() => {
        for (let halfSecond = 0; halfSecond < 80; halfSecond += 1) {
            const view = BertQA.simulate(0.5);
            if (view.obstacleGeometry.some(obstacle => obstacle.kind === 'edm-orb')) return true;
        }
        return false;
    }''')
    assert orb, 'Hanging disco balls should appear regularly within a playable run.'
    await page.evaluate('BertQA.simulate(1.25); BertQA.setBird(185, 310, 0)')
    await page.wait_for_timeout(80)
    await page.screenshot(path=OUTPUT / f'event-gameplay-{width}.png')
    cue_on = await page.evaluate('BertQA.snapshot().edmLightCue')
    await page.evaluate("BertMeta.setSetting('lights', false)")
    cue_off = await page.evaluate('BertQA.snapshot().edmLightCue')
    await page.evaluate('BertQA.simulate(2)')
    cue_off_later = await page.evaluate('BertQA.snapshot().edmLightCue')
    assert cue_off['color'] == cue_off_later['color'] and cue_off['intensity'] == cue_off_later['intensity']
    assert cue_on['intensity'] <= 0.16
    await page.evaluate("BertMeta.setSetting('lights', true)")
    await page.emulate_media(reduced_motion='reduce')
    system_cue = await page.evaluate('BertQA.snapshot().edmLightCue')
    await page.evaluate('BertQA.simulate(0.6)')
    system_cue_later = await page.evaluate('BertQA.snapshot().edmLightCue')
    assert system_cue_later['color'] == system_cue['color'], {
        'before': system_cue, 'after': system_cue_later,
        'mediaQuery': await page.evaluate("matchMedia('(prefers-reduced-motion: reduce)').matches"),
    }
    await page.emulate_media(reduced_motion='no-preference')
    await page.evaluate("BertMeta.setSetting('music', false)")
    silent_before = await page.evaluate('BertQA.snapshot().edmLightCue.beat')
    await page.evaluate('BertQA.simulate(0.6)')
    silent_after = await page.evaluate('BertQA.snapshot().edmLightCue.beat')
    assert silent_after > silent_before, 'Visual rhythm must follow the simulation clock even with the sound muted.'
    assert await page.evaluate('BertQA.snapshot().phase') == 'playing', 'The soundtrack must not control any obstacle collisions.'
    before = await page.evaluate('BertMeta.snapshot()')
    await page.evaluate('BertQA.collectStar(200)')
    await page.evaluate('BertQA.triggerDeath(); BertQA.finishDeath();')
    after = await page.evaluate('BertMeta.snapshot()')
    assert after['runCount'] == before['runCount'] and after['feathers'] == before['feathers']
    assert after['achievements'] == before['achievements'], 'An experimental score must not unlock ranked heroes.'
    assert await page.locator('#challenge-btn').is_hidden()
    assert 'kun lokal eventrekord' in await page.locator('#result-progress').inner_text()
    assert not any('/api/scores' in url or '/api/challenges' in url for url in posts), posts
    await page.locator('#retry-btn').click()
    await page.wait_for_function("BertQA.snapshot().phase === 'prewarm'")
    assert await page.evaluate('BertQA.snapshot().levelId') == 10
    await page.evaluate('async () => { await BertQA.startLevel(1); }')
    await page.evaluate('BertQA.beginRun(); BertQA.triggerDeath(); BertQA.finishDeath()')
    assert await page.locator('#challenge-btn').is_visible(), 'Ordinary ranked levels must retain friend-duel actions.'
    assert not errors, errors
    await page.close()
    return {'size': [width, height], 'layout': layout, 'firstGroup': opening['obstacleGeometry'][0]['kind'],
            'orbAppeared': orb, 'lightOff': cue_off, 'pageErrors': errors}


async def main():
    OUTPUT.mkdir(exist_ok=True)
    port = free_port()
    server = subprocess.Popen(['python3', '-m', 'http.server', str(port), '--bind', '127.0.0.1'],
                              cwd=PROJECT / 'webapp', stdout=subprocess.DEVNULL, stderr=subprocess.STDOUT)
    try:
        time.sleep(.5)
        async with async_playwright() as playwright:
            browser = await playwright.webkit.launch()
            reports = []
            for width, height in [(852, 393), (667, 375)]:
                reports.append(await run_phone(browser, port, width, height))
            await browser.close()
        report = {'status': 'passed', 'phones': reports}
        (OUTPUT / 'report.json').write_text(json.dumps(report, indent=2), encoding='utf-8')
        print(json.dumps({'status': 'passed', 'report': str(OUTPUT / 'report.json')}))
    finally:
        server.terminate()
        server.wait(timeout=5)


if __name__ == '__main__':
    asyncio.run(main())
