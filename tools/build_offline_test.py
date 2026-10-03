"""Package only Bert's offline-cached PWA files, never backend data or Unity source."""
import hashlib
import json
import subprocess
from pathlib import Path
from zipfile import ZIP_DEFLATED, ZipFile

PROJECT = Path(__file__).resolve().parents[1]
WEB = PROJECT / 'webapp'
GUIDE = PROJECT / 'docs' / 'OFFLINE_MOBILE_TEST.md'
BUILD = 'worlds-relay-5'
OUTPUT = PROJECT.parent / f'BertTheBird-offline-test-{BUILD}.zip'
PREFIX = f'BertTheBird-offline-test-{BUILD}/'


def app_shell_paths():
    # Evaluate the actual APP_SHELL definition instead of parsing fragile JS strings.
    expression = """const fs=require('fs'),vm=require('vm');
        const src=fs.readFileSync(process.argv[1],'utf8');
        const context={self:{addEventListener(){}},console};
        vm.runInNewContext(src+'\\nself.paths=APP_SHELL;',context);
        process.stdout.write(JSON.stringify(context.self.paths));"""
    output = subprocess.check_output(['node', '-e', expression, str(WEB / 'service-worker.js')], text=True)
    paths = json.loads(output)
    names = {'service-worker.js', 'index.html'}
    for url in paths:
        path = url.split('?', 1)[0].removeprefix('./')
        if not path:
            continue
        assert path and '..' not in Path(path).parts and not path.startswith('/'), path
        names.add(path)
    return sorted(names)


def main():
    names = app_shell_paths()
    assert len(names) >= 260, f'Unexpectedly incomplete cache: {len(names)} files'
    assert GUIDE.is_file() and GUIDE.stat().st_size > 1000
    assert all((WEB / name).is_file() for name in names), 'Missing cached web files'
    assert not any(name.endswith(('.db', '.sqlite', '.sqlite3', '.wal', '.shm')) for name in names)
    with ZipFile(OUTPUT, 'w', ZIP_DEFLATED, compresslevel=6) as archive:
        for name in names:
            archive.write(WEB / name, PREFIX + 'webapp/' + name)
        archive.write(GUIDE, PREFIX + 'OFFLINE_MOBILE_TEST.md')
    with ZipFile(OUTPUT) as archive:
        assert archive.testzip() is None, 'ZIP CRC failed'
        listed = archive.namelist()
        assert len(listed) == len(names) + 1
        assert PREFIX + 'webapp/index.html' in listed
        assert PREFIX + 'webapp/service-worker.js' in listed
        assert not any('/server/' in name or name.endswith('.db') for name in listed)
    digest = hashlib.sha256(OUTPUT.read_bytes()).hexdigest()
    print(json.dumps({'zip': str(OUTPUT), 'build': BUILD, 'webFiles': len(names),
                      'bytes': OUTPUT.stat().st_size, 'sha256': digest, 'crc': 'ok'}, ensure_ascii=False))


if __name__ == '__main__':
    main()
