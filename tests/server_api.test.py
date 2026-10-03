#!/usr/bin/env python3
import json
import os
import socket
import subprocess
import tempfile
import time
import urllib.error
import urllib.request
from pathlib import Path

PROJECT = Path(__file__).resolve().parents[1]
SERVER = PROJECT / 'server' / 'server.py'


def free_port():
    with socket.socket() as sock:
        sock.bind(('127.0.0.1', 0))
        return sock.getsockname()[1]


def request(base, path, payload=None):
    data = None if payload is None else json.dumps(payload).encode()
    req = urllib.request.Request(base + path, data=data, headers={'Content-Type': 'application/json'})
    with urllib.request.urlopen(req, timeout=4) as response:
        return response.status, json.loads(response.read())


def main():
    temporary_db = tempfile.TemporaryDirectory(prefix='bert_api_test_')
    port = free_port()
    process = subprocess.Popen(
        ['python3', str(SERVER), '--port', str(port)], cwd=PROJECT,
        env={**os.environ, 'BERT_DB_PATH': str(Path(temporary_db.name) / 'scores.sqlite3')},
        stdout=subprocess.PIPE, stderr=subprocess.STDOUT,
    )
    base = f'http://127.0.0.1:{port}'
    try:
        for _ in range(40):
            try:
                if request(base, '/api/health')[1]['ok']: break
            except Exception: time.sleep(.1)
        run = {'runId': 'run-1', 'playerId': 'pilot-a', 'playerName': 'Ada', 'mode': 'classic', 'levelId': 1, 'score': 88, 'streak': 9, 'time': 42.5}
        assert request(base, '/api/scores', run)[0] == 201
        assert request(base, '/api/scores', {**run, 'runId': 'run-4', 'levelId': 4, 'score': 144})[0] == 201
        board = request(base, '/api/leaderboards?period=day&mode=classic&metric=score')[1]
        assert board['rows'][0]['player_name'] == 'Ada'
        desert_board = request(base, '/api/leaderboards?period=day&mode=classic&level=1&metric=score')[1]
        jungle_board = request(base, '/api/leaderboards?period=day&mode=classic&level=4&metric=score')[1]
        assert len(desert_board['rows']) == 1 and desert_board['rows'][0]['level_id'] == 1
        assert len(jungle_board['rows']) == 1 and jungle_board['rows'][0]['level_id'] == 4
        challenge = {**run, 'seed': 12345, 'ghost': [[0, 360, 0], [1, 350, 1]]}
        created = request(base, '/api/challenges', challenge)[1]
        challenge_id = created['id']
        loaded = request(base, f'/api/challenges/{challenge_id}')[1]
        assert loaded['seed'] == 12345 and len(loaded['ghost']) == 2
        for attempt in range(1, 4):
            result = request(base, f'/api/challenges/{challenge_id}/attempts', {'playerId': 'pilot-b', 'playerName': 'Bo', 'score': 88 + attempt, 'streak': 10, 'time': 43})[1]
            assert result['attempt'] == attempt and result['won'] is True
        request(base, '/api/scores', {**run, 'runId': 'run-b', 'playerId': 'pilot-b', 'playerName': 'Bo', 'score': 95})
        request(base, '/api/scores', {**run, 'runId': 'run-c', 'playerId': 'pilot-c', 'playerName': 'Cal', 'score': 200})
        global_board = request(base, '/api/leaderboards?period=all&metric=score')[1]
        assert global_board['scope'] == 'global' and global_board['rows'][0]['player_name'] == 'Cal'
        friends = request(base, '/api/leaderboards?scope=friends&playerId=pilot-a&period=all&level=1&metric=score')[1]
        assert friends['scope'] == 'friends'
        assert {row['player_name'] for row in friends['rows']} == {'Ada', 'Bo'}
        reverse = request(base, '/api/leaderboards?scope=friends&playerId=pilot-b&period=all&level=1')[1]
        assert {row['player_name'] for row in reverse['rows']} == {'Ada', 'Bo'}
        empty = request(base, '/api/leaderboards?scope=friends&playerId=pilot-c&period=all')[1]
        assert {row['player_name'] for row in empty['rows']} == {'Cal'}
        try:
            request(base, '/api/leaderboards?scope=friends&period=all')
            raise AssertionError('friends query without a player unexpectedly accepted')
        except urllib.error.HTTPError as error:
            assert error.code == 422
        try:
            request(base, f'/api/challenges/{challenge_id}/attempts', {'playerId': 'pilot-b', 'playerName': 'Bo', 'score': 90, 'streak': 11, 'time': 44})
            raise AssertionError('fourth attempt unexpectedly accepted')
        except urllib.error.HTTPError as error:
            assert error.code == 409
        print('Leaderboard and challenge API tests passed.')
    finally:
        process.terminate()
        process.wait(timeout=5)
        temporary_db.cleanup()


if __name__ == '__main__':
    main()
