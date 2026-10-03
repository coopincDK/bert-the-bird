"""Build the shareable full Bert source/game archive without private runtime state.

The original Unity Assets/ProjectSettings are included. The live SQLite database,
Git history, browser/test caches, Windows thumbnails and credential files are not.
"""
import hashlib
import json
import re
from pathlib import Path
from zipfile import ZIP_DEFLATED, ZipFile

PROJECT = Path(__file__).resolve().parents[1]
BUILD = 'worlds-relay-5'
OUTPUT = PROJECT.parent / f'BertTheBird-full-{BUILD}.zip'
PREFIX = f'BertTheBird-{BUILD}/'
SKIP_DIRS = {'.git', '__pycache__', '.pytest_cache', '.cache', 'node_modules',
             'Library', 'Temp', 'obj', 'Logs'}
SKIP_NAMES = {'.ds_store', '.env', 'bert.sqlite3', 'bert.sqlite3-wal', 'bert.sqlite3-shm'}
SKIP_SUFFIXES = ('.pyc', '.pyo', '.sqlite', '.sqlite3', '.sqlite3-wal', '.sqlite3-shm',
                 '.db', '.db-wal', '.db-shm', '.pem', '.p12', '.key', '.log', '.zip')
SENSITIVE_NAMES = ('password', 'secret', 'private-key')


def include(path):
    if not path.is_file() or path.is_symlink():
        return False
    relative = path.relative_to(PROJECT)
    name = path.name.lower()
    if any(part in SKIP_DIRS for part in relative.parts):
        return False
    if name in SKIP_NAMES or name.startswith(('thumbs.db', '.env')):
        return False
    if name.endswith(SKIP_SUFFIXES) or any(word in name for word in SENSITIVE_NAMES):
        return False
    return True


def main():
    main_script = (PROJECT / 'webapp' / 'unity-faithful.js').read_text()
    build_match = re.search(r"const BUILD_VERSION = '([^']+)'", main_script)
    assert build_match and build_match.group(1) == BUILD, 'Build token mismatch'
    files = sorted((path for path in PROJECT.rglob('*') if include(path)),
                   key=lambda path: path.relative_to(PROJECT).as_posix())
    relative_names = {path.relative_to(PROJECT).as_posix() for path in files}
    essential = {'webapp/index.html', 'webapp/service-worker.js',
                 'webapp/bert-sky-relay.js', 'webapp/bert-world-mastery.js',
                 'webapp/assets/sky-relay/flight-gate-play.png',
                 'webapp/assets/sky-relay/flight-gate-foreground-play.png',
                 'webapp/assets/sky-relay/wind-chime-target-play.png',
                 'docs/WORLDS_RELAY_5_RELEASE.md',
                 'BertTheBird/ProjectSettings/ProjectVersion.txt'}
    assert essential <= relative_names, f'Missing release files: {sorted(essential - relative_names)}'
    unity_count = sum(name.startswith('BertTheBird/') for name in relative_names)
    assert unity_count > 700, f'Original Unity project unexpectedly incomplete: {unity_count}'
    with ZipFile(OUTPUT, 'w', ZIP_DEFLATED, compresslevel=6) as archive:
        for path in files:
            archive.write(path, PREFIX + path.relative_to(PROJECT).as_posix())
    with ZipFile(OUTPUT) as archive:
        assert archive.testzip() is None, 'ZIP CRC check failed'
        names = archive.namelist()
        assert len(names) == len(files)
        assert not any('/.git/' in name or '/__pycache__/' in name
                       or 'Thumbs.db' in name or name.endswith(
                           ('.sqlite3', '.sqlite3-wal', '.sqlite3-shm')) for name in names)
    digest = hashlib.sha256()
    with OUTPUT.open('rb') as stream:
        for chunk in iter(lambda: stream.read(4 * 1024 * 1024), b''):
            digest.update(chunk)
    print(json.dumps({'zip': str(OUTPUT), 'build': BUILD, 'files': len(files),
                      'originalUnityFiles': unity_count, 'bytes': OUTPUT.stat().st_size,
                      'sha256': digest.hexdigest(), 'crc': 'ok'}, ensure_ascii=False))


if __name__ == '__main__':
    main()
