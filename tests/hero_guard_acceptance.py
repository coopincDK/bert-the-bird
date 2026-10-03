"""Verify the economy and one-charge Streak Guard without using the live score database."""
import asyncio
import json
import socket
import subprocess
import time
from pathlib import Path

from playwright.async_api import async_playwright

PROJECT = Path(__file__).resolve().parents[1]
OUTPUT = PROJECT.parent / 'qa-hero-guard'


def free_port():
    with socket.socket() as listener:
        listener.bind(('127.0.0.1', 0))
        return listener.getsockname()[1]


async def main():
    OUTPUT.mkdir(exist_ok=True)
    port = free_port()
    server = subprocess.Popen(['python3', '-m', 'http.server', str(port), '--bind', '127.0.0.1', '--directory', str(PROJECT / 'webapp')], stdout=subprocess.DEVNULL, stderr=subprocess.STDOUT)
    url = f'http://127.0.0.1:{port}/?qa=1&noclip=1&rev=hero-guard-1'
    try:
        time.sleep(.35)
        async with async_playwright() as playwright:
            browser = await playwright.webkit.launch()
            context = await browser.new_context(viewport={'width': 667, 'height': 375}, is_mobile=True, has_touch=True, user_agent='Mozilla/5.0 (iPhone; CPU iPhone OS 18_0 like Mac OS X) AppleWebKit/605.1.15 CriOS/130 Mobile/15E148 Safari/604.1')
            page = await context.new_page()
            errors = []
            page.on('pageerror', lambda error: errors.append(str(error)))
            await page.goto(url, wait_until='networkidle')
            await page.locator('#loading').wait_for(state='hidden')
            await page.locator('#hero-selector').click()
            assert await page.locator('.hero-option.locked').count() == 11
            await page.locator('[data-hero="block"]').click()
            assert await page.evaluate("BertMeta.currentHero()") == 'bert'
            assert '120' in await page.locator('#hero-detail-goal').inner_text()
            assert await page.locator('#hero-buy-btn').is_disabled()
            await page.screenshot(path=OUTPUT / 'locked-wardrobe.png')
            await page.locator('#confirm-hero').click()

            # An isolated QA fixture controls the available feathers. The UI must enforce the transaction.
            await page.evaluate("""() => { const key='bertTheBird_meta_v1'; const save=JSON.parse(localStorage.getItem(key)); save.feathers=200; localStorage.setItem(key,JSON.stringify(save)); }""")
            await page.reload(wait_until='networkidle')
            await page.locator('#loading').wait_for(state='hidden')
            await page.locator('#hero-selector').click()
            await page.locator('[data-hero="block"]').click()
            assert await page.locator('#hero-feathers').inner_text() == '200'
            await page.locator('#hero-buy-btn').click()
            assert await page.locator('#hero-buy-btn').inner_text() == 'BEKRÆFT · 180 FJER'
            assert await page.evaluate('BertMeta.snapshot().feathers') == 200, 'First tap must not spend anything'
            await page.locator('#hero-cancel-buy').click()
            assert await page.evaluate('BertMeta.snapshot().feathers') == 200
            await page.locator('#hero-buy-btn').click()
            await page.locator('#hero-buy-btn').click()
            assert await page.evaluate('BertMeta.snapshot().feathers') == 20
            assert await page.evaluate("BertMeta.snapshot().economy.feathersSpent") == 180
            assert await page.evaluate('BertMeta.currentHero()') == 'block'
            assert not await page.locator('#hero-buy-btn').is_visible()
            await page.screenshot(path=OUTPUT / 'purchased-wardrobe.png')
            await page.locator('#confirm-hero').click()
            await page.reload(wait_until='networkidle')
            await page.locator('#loading').wait_for(state='hidden')
            assert await page.evaluate('BertMeta.currentHero()') == 'block'
            assert await page.evaluate("BertMeta.heroCatalog().find(hero => hero.id === 'block').source") == 'feathers'

            reward = await page.evaluate("""() => {
                const route = BertMeta.dailyChallenge(new Date(), [1]);
                return BertMeta.recordRun({levelId:1, mode:'classic', score:route.target, stars:0, dailyKey:route.key, dailyTarget:route.target});
            }""")
            assert 'BlueBert' in reward['unlockedHeroes'], reward
            await page.locator('#hero-selector').click()
            await page.locator('[data-hero="blue"]').click()
            assert await page.evaluate('BertMeta.currentHero()') == 'blue'
            await page.locator('#confirm-hero').click()

            await page.evaluate("async () => { await BertQA.startLevel(8); BertQA.beginRun(); BertQA.collectStar(); BertQA.collectStar(); BertQA.collectStar(); BertQA.activatePowerup('Guard'); BertQA.activatePowerup('Guard'); }")
            initial = await page.evaluate('BertQA.snapshot()')
            assert initial['streak'] == 3 and initial['streakGuardCharges'] == 1
            assert await page.locator('#streak-guard').is_visible()
            assert initial['activePowerup'] is None, 'Guard must not replace Shield, Magnet, or Focus'
            await page.screenshot(path=OUTPUT / 'guard-charge.png')
            await page.evaluate("BertQA.addStar(-31, 100); BertQA.simulate(.05)")
            saved = await page.evaluate('BertQA.snapshot()')
            assert saved['streak'] == 3 and saved['streakGuardCharges'] == 0 and not saved['cleanRun'], saved
            assert not await page.locator('#streak-guard').is_visible()
            assert 'STREAK REDDET' in await page.locator('#powerup').inner_text()
            await page.evaluate('BertQA.simulate(.2)')
            assert await page.evaluate('BertQA.snapshot().streak') == 3, 'The same missed star must not break the streak again next frame'
            await page.evaluate('BertQA.addStar(-31, 100); BertQA.simulate(.05)')
            broken = await page.evaluate('BertQA.snapshot()')
            assert broken['streak'] == 0 and broken['streakGuardCharges'] == 0, broken
            assert broken['guardReadyAt'] >= 90, 'The next Guard must be subject to a 90-second cooldown'
            await page.evaluate("BertQA.activatePowerup('Guard'); BertQA.triggerDeath()")
            assert await page.evaluate("BertQA.snapshot().phase") == 'dead', 'Streak Guard must not prevent a fatal collision'
            assert not errors, errors
            (OUTPUT / 'report.json').write_text(json.dumps({'purchase': 180, 'balanceAfterPurchase': 20, 'earned': reward['unlockedHeroes'], 'guardBefore': initial['streak'], 'guardSaved': saved['streak'], 'guardFinallyBroken': broken['streak'], 'pageErrors': errors}, indent=2) + '\n')
            await browser.close()
    finally:
        server.terminate()
        server.wait(timeout=5)
    print(json.dumps({'status': 'passed', 'report': str(OUTPUT / 'report.json')}))


if __name__ == '__main__':
    asyncio.run(main())
