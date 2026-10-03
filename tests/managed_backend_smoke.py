"""Exercise the real managed HTTP API, then remove only this test's rows.

This is not a migration. Never clear unrelated user scores or duels.
"""
import json
import os
import urllib.request
import uuid

from server.db import connect_mysql

BASE = os.environ.get('BERT_TEST_BASE', 'http://127.0.0.1:3000').rstrip('/')


def request(path, payload=None):
    body = json.dumps(payload).encode() if payload is not None else None
    req = urllib.request.Request(BASE + path, data=body,
                                 headers={'Content-Type': 'application/json'})
    with urllib.request.urlopen(req, timeout=15) as response:
        return response.status, json.load(response)


def main():
    uid = uuid.uuid4().hex[:16]
    player_id = 'qa-' + uid
    opponent_id = 'qa-rival-' + uid
    score_ids = ['qa-run-' + uid, 'qa-rival-run-' + uid]
    challenge_id = None
    try:
        assert request('/api/health')[1]['ok']
        payload = {'runId': score_ids[0], 'playerId': player_id,
                   'playerName': 'Web QA', 'mode': 'classic', 'levelId': 1,
                   'score': 321, 'streak': 3, 'time': 14.5}
        assert request('/api/scores', payload)[0] == 201
        assert request('/api/scores', payload)[0] == 201  # idempotent runId
        assert request('/api/scores', {**payload, 'runId': score_ids[1],
                                       'playerId': opponent_id,
                                       'playerName': 'QA Rival', 'score': 350})[0] == 201
        board = request('/api/leaderboards?period=all&mode=classic')[1]
        assert any(row['player_name'] == 'Web QA' for row in board['rows']), board
        created = request('/api/challenges', {**payload, 'seed': 12345,
                   'ghost': [[0, 360, 0], [1, 350, 1]]})[1]
        challenge_id = created['id']
        loaded = request('/api/challenges/' + challenge_id)[1]
        assert loaded['seed'] == 12345 and len(loaded['ghost']) == 2
        for attempt in (1, 2, 3):
            result = request('/api/challenges/' + challenge_id + '/attempts',
                             {'playerId': opponent_id, 'playerName': 'QA Rival',
                              'score': 321 + attempt, 'streak': 4,
                              'time': 15})[1]
            assert result['attempt'] == attempt, result
        friends = request('/api/leaderboards?scope=friends&playerId=' + player_id
                          + '&period=all&level=1')[1]
        assert {'Web QA', 'QA Rival'} <= {row['player_name'] for row in friends['rows']}
        print('PASS managed HTTP score, idempotency, duels, 3 attempts and friends')
    finally:
        with connect_mysql() as db:
            if challenge_id:
                db.execute('DELETE FROM challenge_attempts WHERE challenge_id=?', (challenge_id,))
                db.execute('DELETE FROM challenges WHERE id=?', (challenge_id,))
            for run_id in score_ids:
                db.execute('DELETE FROM scores WHERE run_id=?', (run_id,))
        with connect_mysql() as db:
            scores = db.execute('SELECT COUNT(*) AS n FROM scores WHERE run_id IN (?,?)',
                                tuple(score_ids)).fetchone()
            assert scores is not None and scores['n'] == 0
            if challenge_id:
                challenges = db.execute('SELECT COUNT(*) AS n FROM challenges WHERE id=?',
                                        (challenge_id,)).fetchone()
                assert challenges is not None and challenges['n'] == 0
        print('PASS only owned QA rows removed; other scores and old SQLite untouched')


if __name__ == '__main__':
    main()
