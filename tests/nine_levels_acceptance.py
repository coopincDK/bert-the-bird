#!/usr/bin/env python3
import asyncio
import json
import socket
import subprocess
import time
from pathlib import Path

from playwright.async_api import async_playwright

PROJECT = Path(__file__).resolve().parents[1]
OUTPUT = PROJECT.parent / 'qa-nine-levels'


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
                service_workers='block',  # Offline install is covered separately; this test reloads repeatedly.
            )
            page = await context.new_page()
            errors = []
            page.on('pageerror', lambda error: errors.append(str(error)))
            await page.goto(f'{base}/?qa=1&noclip=1&rev=nine-levels-1', wait_until='networkidle')
            await page.locator('#loading').wait_for(state='hidden')

            catalog = await page.evaluate('BertQA.snapshot().levelCatalog')
            ensure(len(catalog) == 9, f'Expected nine catalog entries, got {catalog}')
            grouped = {mode: [item for item in catalog if item['mode'] == mode] for mode in ('classic', 'flappy', 'tunnel')}
            ensure(all(len(items) == 3 for items in grouped.values()), f'Every mode needs three levels: {grouped}')
            ensure(all([item['order'] for item in items] == [1, 2, 3] for items in grouped.values()), 'Mode order must be chronological')

            await page.locator('#play-btn').click()
            initial = await page.evaluate("""() => [...document.querySelectorAll('.level-card')].map(card => ({
                id: Number(card.dataset.levelId), locked: card.classList.contains('locked'), mode: card.dataset.mode,
                lock: card.querySelector('.level-card-lock').textContent.trim()
            }))""")
            ensure([row['id'] for row in initial if not row['locked']] == [1, 3, 2], f'Only each mode starter should be open: {initial}')
            ensure(all(row['lock'] for row in initial), 'Every level card must explain its unlock state')
            await page.screenshot(path=OUTPUT / 'initial-locks.png')

            await page.evaluate("""async () => {
                await BertQA.startLevel(1, {seed: 101});
                BertQA.setRunStats({score: 120, streak: 12, time: 35, stars: 8});
                BertQA.finishDeath();
            }""")
            await page.locator('#game-over').wait_for(state='visible')
            await page.locator('#menu-btn').click()
            ensure(await page.locator('.level-4').evaluate("card => card.classList.contains('locked')"), 'Tier 2 must not unlock from Desert alone')

            await page.evaluate("""() => {
                const records = {1: 120, 3: 90, 2: 110};
                Object.entries(records).forEach(([id, score]) => {
                    localStorage.setItem(`bertTheBird_record_v2_${id}`, JSON.stringify({score, streak: 10, time: 40}));
                    localStorage.setItem(`bertTheBird_unity_level_${id}`, String(score));
                });
            }""")
            await page.reload(wait_until='networkidle')
            await page.locator('#loading').wait_for(state='hidden')
            await page.locator('#play-btn').click()
            ensure(await page.locator('.level-card.locked').count() == 6, 'Tier-1 scores alone must wait for the first claimed mission')

            await page.evaluate("""() => {
                const meta = JSON.parse(localStorage.getItem('bertTheBird_meta_v1'));
                meta.missionClaims = {'progression-day': {food: Date.now()}};
                localStorage.setItem('bertTheBird_meta_v1', JSON.stringify(meta));
            }""")
            await page.reload(wait_until='networkidle')
            await page.locator('#loading').wait_for(state='hidden')
            await page.locator('#play-btn').click()
            const_tier_two = await page.evaluate("""() => [...document.querySelectorAll('.level-card')]
                .filter(card => !card.classList.contains('locked')).map(card => Number(card.dataset.levelId))""")
            ensure(set(const_tier_two) == {1, 2, 3, 4, 6, 8}, f'One mission plus every tier-1 score should open all of tier 2: {const_tier_two}')

            await page.evaluate("""() => {
                const records = {4: 180, 6: 130, 8: 160};
                Object.entries(records).forEach(([id, score]) => {
                    localStorage.setItem(`bertTheBird_record_v2_${id}`, JSON.stringify({score, streak: 10, time: 40}));
                    localStorage.setItem(`bertTheBird_unity_level_${id}`, String(score));
                });
            }""")
            await page.reload(wait_until='networkidle')
            await page.locator('#loading').wait_for(state='hidden')
            await page.locator('#play-btn').click()
            ensure(await page.locator('.level-card.locked').count() == 3, 'Tier 3 must remain locked until four mission rewards have been claimed')

            await page.evaluate("""() => {
                const meta = JSON.parse(localStorage.getItem('bertTheBird_meta_v1'));
                meta.missionClaims = {'progression-day': {food: 1, flight: 2, streak: 3, route: 4}};
                localStorage.setItem('bertTheBird_meta_v1', JSON.stringify(meta));
            }""")
            await page.reload(wait_until='networkidle')
            await page.locator('#loading').wait_for(state='hidden')
            await page.locator('#play-btn').click()
            ensure(await page.locator('.level-card.locked').count() == 0, 'All nine levels should unlock after the six prerequisite records')
            await page.screenshot(path=OUTPUT / 'all-levels-unlocked.png')

            selector_geometry = {}
            for mode in ('classic', 'flappy', 'tunnel'):
                await page.locator(f'.mode-tab[data-mode="{mode}"]').click()
                geometry = await page.evaluate("""() => {
                    const cards = [...document.querySelectorAll('.level-card:not([hidden])')];
                    const rects = cards.map((card) => {
                        const rect = card.getBoundingClientRect();
                        return {id: Number(card.dataset.levelId), left: rect.left, top: rect.top, right: rect.right, bottom: rect.bottom};
                    });
                    const overlaps = rects.some((first, index) => rects.slice(index + 1).some((second) => !(
                        first.right <= second.left || second.right <= first.left || first.bottom <= second.top || second.bottom <= first.top
                    )));
                    return {count: cards.length, rects, overlaps};
                }""")
                ensure(geometry['count'] == 3, f'{mode} must show exactly three cards: {geometry}')
                ensure(not geometry['overlaps'], f'{mode} cards overlap: {geometry}')
                selector_geometry[mode] = geometry
                await page.screenshot(path=OUTPUT / f'selector-{mode}.png')

            await page.locator('#back-to-main').click()
            await page.locator('#leaderboard-btn').click()
            ensure(await page.locator('#board-level option').count() == 10, 'Leaderboard needs All + nine level filters')
            await page.locator('#board-mode').select_option('flappy')
            await page.wait_for_timeout(80)
            ensure(await page.locator('#board-level option').count() == 4, 'Flappy filter needs All + three variants')
            await page.screenshot(path=OUTPUT / 'level-filter.png')
            await page.locator('#close-leaderboard').click()

            flappy = {}
            for level_id, expected_variant in ((3, 'fixed'), (6, 'moving')):
                flappy[level_id] = await page.evaluate("""async ({levelId}) => {
                    await BertQA.startLevel(levelId, {seed: 424242});
                    BertQA.beginRun();
                    BertQA.spawnObstacle();
                    const before = BertQA.snapshot();
                    BertQA.simulate(1.1);
                    const after = BertQA.snapshot();
                    return {before, after};
                }""", {'levelId': level_id})
                ensure(flappy[level_id]['before']['levelVariant'] == expected_variant, f'Wrong Flappy variant for {level_id}')
                await page.evaluate('new Promise(requestAnimationFrame)')
                await page.screenshot(path=OUTPUT / f'flappy-{expected_variant}.png')
            fixed_geometry = flappy[3]['before']['obstacleGeometry']
            moving_before = flappy[6]['before']['obstacleGeometry']
            moving_after = flappy[6]['after']['obstacleGeometry']
            ensure(fixed_geometry and all(not row['moving'] for row in fixed_geometry), 'Flappy Bert should use fixed towers')
            ensure(moving_before and all(row['moving'] for row in moving_before), 'Sky Shift should use moving towers')
            ensure(abs(moving_before[0]['height'] - moving_after[0]['height']) > 5, 'Sky Shift towers did not visibly move')

            mixed = await page.evaluate("""async () => {
                await BertQA.startLevel(7, {seed: 777});
                BertQA.beginRun();
                for (let i = 0; i < 8; i += 1) BertQA.spawnObstacle();
                BertQA.simulate(.5);
                return BertQA.snapshot();
            }""")
            flags = {row['moving'] for row in mixed['obstacleGeometry']}
            ensure(flags == {True, False}, f'Tower Mix must contain fixed and moving pairs: {flags}')
            await page.screenshot(path=OUTPUT / 'flappy-mixed.png')

            tunnels = {}
            for level_id, variant, minimum_stars in ((2, 'training', 3), (8, 'star-stream', 8), (9, 'pulse', 5)):
                tunnels[level_id] = await page.evaluate("""async ({levelId}) => {
                    await BertQA.startLevel(levelId, {seed: 9000 + levelId});
                    BertQA.beginRun();
                    BertQA.spawnObstacle();
                    BertQA.simulate(.35);
                    return BertQA.snapshot();
                }""", {'levelId': level_id})
                snapshot = tunnels[level_id]
                ensure(snapshot['levelVariant'] == variant, f'Wrong Tunnel variant for {level_id}: {snapshot}')
                ensure(snapshot['collectibleCount'] >= minimum_stars, f'{variant} star route too sparse: {snapshot["collectibleCount"]}')
                ensure(snapshot['tunnelProfile']['bottom'] - snapshot['tunnelProfile']['top'] >= 224, f'{variant} tunnel became unfair')
                await page.evaluate('new Promise(requestAnimationFrame)')
                await page.screenshot(path=OUTPUT / f'tunnel-{variant}.png')

            legacy_context = await browser.new_context(viewport={'width': 852, 'height': 393})
            await legacy_context.add_init_script("""(() => {
                if (location.hostname === '127.0.0.1') {
                    localStorage.setItem('bertTheBird_unity_level_1', '120');
                }
            })()""")
            legacy_page = await legacy_context.new_page()
            await legacy_page.goto(f'{base}/?qa=1&rev=focus-pcm-1', wait_until='networkidle')
            await legacy_page.locator('#loading').wait_for(state='hidden')
            legacy = await legacy_page.evaluate("""() => ({
                migrated: JSON.parse(localStorage.getItem('bertTheBird_legacy_unlocks_sprite_tiers_v1')),
                open: BertQA.snapshot().unlockedLevelIds,
            })""")
            ensure(legacy['migrated'] == [4] and set(legacy['open']) == {1, 2, 3, 4}, f'Existing Jungle unlock was lost or leaked to other modes: {legacy}')
            await legacy_context.close()
            ensure(not errors, f'Page errors: {errors}')
            report = {
                'status': 'passed',
                'catalog': catalog,
                'initialLocks': initial,
                'legacyMigration': legacy,
                'selectorGeometry': selector_geometry,
                'flappy': {
                    'fixed': fixed_geometry,
                    'movingBefore': moving_before,
                    'movingAfter': moving_after,
                    'mixedFlags': sorted(flags),
                },
                'tunnels': {str(level_id): {
                    'variant': snapshot['levelVariant'],
                    'collectibles': snapshot['collectibleCount'],
                    'profile': snapshot['tunnelProfile'],
                } for level_id, snapshot in tunnels.items()},
                'pageErrors': errors,
            }
            (OUTPUT / 'report.json').write_text(json.dumps(report, indent=2, ensure_ascii=False))
            await context.close()
            await browser.close()
            print(json.dumps({'status': 'passed', 'report': str(OUTPUT / 'report.json')}, ensure_ascii=False))
    finally:
        server.terminate()
        try:
            server.wait(timeout=5)
        except subprocess.TimeoutExpired:
            server.kill()


if __name__ == '__main__':
    asyncio.run(main())
