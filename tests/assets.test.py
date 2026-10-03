"""Release gate for Bert The Bird's browser asset package and build markers."""

from pathlib import Path
import re
import subprocess

PROJECT = Path(__file__).resolve().parents[1]
WEBAPP = PROJECT / "webapp"
RUNTIME = (WEBAPP / "unity-faithful.js").read_text(encoding="utf-8")
INDEX = (WEBAPP / "index.html").read_text(encoding="utf-8")
APP_SHELL = (WEBAPP / "app-shell.js").read_text(encoding="utf-8")
SERVICE_WORKER = (WEBAPP / "service-worker.js").read_text(encoding="utf-8")


def require_match(pattern: str, text: str, label: str) -> str:
    match = re.search(pattern, text)
    if not match:
        raise AssertionError(f"Missing {label}")
    return match.group(1)


required = set(re.findall(r"['\"](assets/[^'\"]+\.(?:webp|png|jpg|jpeg|mp3|wav|ttf|woff2))['\"]", RUNTIME, re.I))
required.update(f"assets/unity/bird/fly-{index:02d}.webp" for index in range(14))
required.update(f"assets/unity/bird-blue/fly-{index:02d}.webp" for index in range(14))
required.update(f"assets/klodsbert/{pose}.webp" for pose in ("up", "mid", "glide", "dead"))
for folder in ("brainbird", "skyclaw", "mechabert"):
    required.update(f"assets/{folder}/{pose}.webp" for pose in ("up", "mid", "glide", "dead"))
for folder in ("noirwing", "bonebeak", "sugarrush", "mosshex", "inkbird", "prismwing"):
    required.update(f"assets/{folder}/{pose}.webp" for pose in ("up", "mid", "glide", "dead"))
required.update(f"assets/unity/ui/previews/level-{level_id}.webp" for level_id in (1, 2, 3, 4, 5, 6, 7, 8, 9))
required.update({
    "assets/unity/props/flappy-pipe-blue.webp",
    "assets/unity/props/flappy-pipe-gold.webp",
    "assets/edm/concert-stage.webp",
    "assets/edm/mirror-ball.webp",
    "assets/edm/speaker-stack.webp",
    "assets/edm/light-truss.webp",
    "assets/edm/center-led.webp",
    "assets/edm/crowd-ball.webp",
    "assets/edm/crowd-foreground.webp",
    "assets/edm/neon-encore.mp3",
    *(f"assets/obstacles/{name}.webp" for name in (
        "desert-ruin", "desert-banded", "desert-etched", "flappy-copper", "flappy-pearl", "jungle-stone", "happy-coral"
    )),
})
for prefix, count in (
    ("assets/unity/props/spider-", 3),
    ("assets/unity/props/spider-catch-", 18),
    ("assets/unity/props/snake-", 7),
    ("assets/unity/props/snake-jump-", 5),
    ("assets/unity/props/snake-catch-", 3),
):
    required.update(f"{prefix}{index:02d}.webp" for index in range(count))

missing = sorted(path for path in required if not (WEBAPP / path).is_file())
if missing:
    raise AssertionError("Missing runtime assets:\n" + "\n".join(missing))

untracked = []
for path in sorted(required):
    relative = (Path("webapp") / path).as_posix()
    result = subprocess.run(
        ["git", "ls-files", "--error-unmatch", relative],
        cwd=PROJECT,
        stdout=subprocess.DEVNULL,
        stderr=subprocess.DEVNULL,
        check=False,
    )
    if result.returncode != 0:
        untracked.append(relative)
if untracked:
    raise AssertionError("Runtime assets are not tracked by Git:\n" + "\n".join(untracked))

runtime_build = require_match(r"const BUILD_VERSION = '([^']+)'", RUNTIME, "runtime build ID")
shell_build = require_match(r"const ACTIVE_BUILD = '([^']+)'", APP_SHELL, "app-shell build ID")
index_builds = set(re.findall(r"\?v=([^\"']+)", INDEX))
if runtime_build != shell_build or index_builds != {runtime_build}:
    raise AssertionError(
        f"Build markers disagree: runtime={runtime_build}, shell={shell_build}, index={sorted(index_builds)}"
    )
if runtime_build not in SERVICE_WORKER:
    raise AssertionError(f"Service-worker cache version does not contain build ID {runtime_build}")
hero_script = 'bert-hero-store.js'
if not (WEBAPP / hero_script).is_file():
    raise AssertionError('Missing hero achievement catalog')
if INDEX.index(hero_script) >= INDEX.index('bert-meta.js'):
    raise AssertionError('Hero achievements must load before saved meta state')
if f'./{hero_script}?v={runtime_build}' not in SERVICE_WORKER:
    raise AssertionError('Hero achievements are missing from the offline PWA cache')
if INDEX.index('bert-edm.js') >= INDEX.index('unity-faithful.js'):
    raise AssertionError('Concert geometry must load before game initialization')
if f'./bert-edm.js?v={runtime_build}' not in SERVICE_WORKER:
    raise AssertionError('EDM geometry module is missing from the offline PWA cache')
for script in ('bert-world-mastery.js', 'bert-sky-relay.js'):
    if not (WEBAPP / script).is_file() or INDEX.index(script) >= INDEX.index('unity-faithful.js'):
        raise AssertionError(f'{script} must load before the game runtime')
    if f'./{script}?v={runtime_build}' not in SERVICE_WORKER:
        raise AssertionError(f'{script} is missing from the offline PWA cache')
for name in ('flight-gate-play.webp', 'flight-gate-foreground-play.webp', 'wind-chime-target-play.webp'):
    if f"'./assets/sky-relay/{name}'" not in SERVICE_WORKER:
        raise AssertionError(f'Sky Relay sprite {name} is missing from the offline PWA cache')
motion_script = 'bert-collectible-motion.js'
if not (WEBAPP / motion_script).is_file() or INDEX.index(motion_script) >= INDEX.index('unity-faithful.js'):
    raise AssertionError('Powerup motion must load before the game runtime')
if f'./{motion_script}?v={runtime_build}' not in SERVICE_WORKER:
    raise AssertionError('Powerup motion is missing from the offline PWA cache')
for path in ('concert-stage.webp', 'mirror-ball.webp', 'speaker-stack.webp', 'light-truss.webp', 'neon-encore.mp3'):
    if f"'./assets/edm/{path}'" not in SERVICE_WORKER:
        raise AssertionError(f'EDM asset {path} is missing from the offline PWA cache')

print(f"Asset release gate passed: {len(required)} runtime assets, build {runtime_build}.")
