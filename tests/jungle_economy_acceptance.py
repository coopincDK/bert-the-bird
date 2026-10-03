#!/usr/bin/env python3
import asyncio
import json
import socket
import subprocess
import time
from pathlib import Path

from playwright.async_api import async_playwright

PROJECT = Path(__file__).resolve().parents[1]
OUTPUT = PROJECT.parent / 'qa-jungle-economy'


def ensure(condition, message):
    if not condition:
        raise AssertionError(message)


def free_port():
    with socket.socket() as sock:
        sock.bind(('127.0.0.1', 0))
        return sock.getsockname()[1]


async def main():
    OUTPUT.mkdir(exist_ok=True)
    port = free_port()
    server = subprocess.Popen(
        ['python3', '-m', 'http.server', str(port), '--directory', str(PROJECT / 'webapp')],
        stdout=subprocess.DEVNULL,
        stderr=subprocess.STDOUT,
    )
    base = f'http://127.0.0.1:{port}'
    try:
        for _ in range(40):
            try:
                import urllib.request
                urllib.request.urlopen(base, timeout=.3).read(1)
                break
            except Exception:
                time.sleep(.1)

        async with async_playwright() as playwright:
            browser = await playwright.webkit.launch()
            context = await browser.new_context(
                viewport={'width': 852, 'height': 393},
                user_agent='Mozilla/5.0 (iPhone; CPU iPhone OS 18_0 like Mac OS X) AppleWebKit/605.1.15 CriOS/129 Mobile/15E148 Safari/604.1',
                is_mobile=True,
                has_touch=True,
            )
            page = await context.new_page()
            errors = []
            page.on('pageerror', lambda error: errors.append(str(error)))
            await page.goto(f'{base}/?qa=1&noclip=1&rev=jungle-economy-1', wait_until='networkidle')
            await page.wait_for_function("document.querySelector('#loading').classList.contains('hidden')")

            economy = await page.evaluate("""() => {
                BertMeta.recordRun({levelId:1, mode:'classic', score:50, stars:20, time:180, streak:12});
                ['food','flight','streak'].forEach(id => BertMeta.claimMission(id));
                const purchase = BertMeta.buyRescueLife();
                document.querySelector('#missions-btn').click();
                return { purchase, meta: BertMeta.snapshot(), upgrade: BertMeta.rescueUpgrade() };
            }""")
            ensure(economy['purchase']['ok'], f"Rescue purchase failed: {economy}")
            ensure(economy['meta']['feathers'] == 15, f"Wrong feather balance: {economy}")
            ensure(economy['meta']['nest']['rescueLives'] == 1, f"Wrong rescue level: {economy}")
            ensure(await page.locator('#feather-balance').inner_text() == '15', 'Wallet did not update in the mission panel')
            mission_layout = await page.evaluate("""() => {
                const list = document.querySelector('#mission-list');
                const close = document.querySelector('#close-missions').getBoundingClientRect();
                return {clientHeight:list.clientHeight, scrollHeight:list.scrollHeight, closeBottom:close.bottom};
            }""")
            ensure(mission_layout['scrollHeight'] > mission_layout['clientHeight'], f"Four missions should scroll in short landscape: {mission_layout}")
            ensure(mission_layout['closeBottom'] <= 393, f"Mission close button is clipped: {mission_layout}")
            await page.screenshot(path=OUTPUT / 'feather-economy.png')
            await page.click('#close-missions')

            await page.evaluate("async () => { await BertQA.startLevel(4); BertQA.beginRun(); BertQA.simulate(.35); }")
            await page.wait_for_timeout(180)
            jungle = await page.evaluate('BertQA.snapshot()')
            ensure('jungleTop' in jungle['loadedAssetKeys'], f"Top foreground not loaded: {jungle['loadedAssetKeys']}")
            ensure(jungle['loadedAssetSizes']['jungleMg'] == [1218, 653], f"Wrong Jungle middle layer: {jungle['loadedAssetSizes']}")
            await page.screenshot(path=OUTPUT / 'jungle-restored.png')

            await page.evaluate("""() => {
                BertQA.setBird(185,330,0);
                BertQA.addObstacle({kind:'jungle-snake',x:560,y:470,width:103,height:160,scale:1.35,harmful:false,baseBottom:640,attackState:'idle'});
                BertQA.simulate(.4);
            }""")
            await page.wait_for_timeout(100)
            snake = await page.evaluate('BertQA.snapshot().enemyStates[0]')
            ensure(abs((snake['renderY'] + snake['renderHeight']) - snake['baseBottom']) < 1.1, f"Snake left ground anchor: {snake}")
            await page.screenshot(path=OUTPUT / 'snake-grounded.png')

            await page.evaluate("""() => {
                BertQA.triggerDeath({kind:'jungle-spider',id:880});
                BertQA.simulate(2.5);
                BertQA.setBird(185,280,0);
                BertQA.triggerDeath({kind:'jungle-spider',id:881});
                BertQA.simulate(2.3);
            }""")
            capture = await page.evaluate('BertQA.snapshot()')
            ensure(capture['phase'] == 'dead', f"Spider result appeared before final cocoon hold: {capture}")
            ensure(capture['deathCaptureFrame'] == 17, f"Final cocoon frame not reached: {capture}")
            ensure(capture['deathCountdown'] > 1.3, f"Final cocoon hold is too short: {capture}")
            ensure(capture['rescueLives'] == 0, f"Rescue life was not consumed first: {capture}")
            await page.screenshot(path=OUTPUT / 'spider-cocoon-hold.png')
            await page.evaluate('BertQA.simulate(1.6)')
            ensure((await page.evaluate('BertQA.snapshot().phase')) == 'rescue-offer', 'Affordable feather rescue was not offered after the capture')
            ensure(await page.locator('#rescue-wheel-modal').is_visible(), 'Rescue wheel modal is not visible')
            ensure(await page.locator('#rescue-wheel-balance').inner_text() == '15', 'Rescue wheel shows the wrong feather balance')
            await page.screenshot(path=OUTPUT / 'rescue-wheel.png')
            spin = await page.evaluate("BertQA.spinRescueWheel('shield', true)")
            rescue = await page.evaluate('BertQA.snapshot()')
            ensure(spin['ok'] and spin['spent'] == 12, f"Rescue spin purchase failed: {spin}")
            ensure(rescue['phase'] == 'playing' and rescue['activePowerup'] == 'Shield', f"Shield rescue did not resume gameplay: {rescue}")
            ensure(rescue['meta']['feathers'] == 3 and rescue['continueUsed'], f"Rescue spin economy did not settle correctly: {rescue['meta']}")
            await page.evaluate("BertQA.triggerDeath(); BertQA.triggerDeath(); BertQA.simulate(1.6)")
            ensure((await page.evaluate('BertQA.snapshot().phase')) == 'gameover', 'Only one paid rescue spin should be available per run')

            ensure(not errors, f"Page errors: {errors}")
            report = {'economy': economy, 'missionLayout': mission_layout, 'jungle': jungle, 'snake': snake, 'capture': capture, 'spin': spin, 'rescue': rescue, 'pageErrors': errors}
            (OUTPUT / 'report.json').write_text(json.dumps(report, indent=2), encoding='utf-8')
            await browser.close()
    finally:
        server.terminate()
        try:
            server.wait(timeout=5)
        except subprocess.TimeoutExpired:
            server.kill()

    print(json.dumps({'status': 'passed', 'report': str(OUTPUT / 'report.json')}, indent=2))


if __name__ == '__main__':
    asyncio.run(main())
