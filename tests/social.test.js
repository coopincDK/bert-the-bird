const assert = require('node:assert/strict');
const path = require('node:path');

const memory = new Map();
global.localStorage = {
    getItem: (key) => memory.get(key) ?? null,
    setItem: (key, value) => memory.set(key, String(value)),
};
global.navigator = {};
global.window = { location: { href: 'https://example.test/game/' } };
global.fetch = async () => { throw new Error('offline'); };
require(path.join(__dirname, '..', 'webapp', 'bert-social.js'));
const social = global.window.BertSocial;

const payload = { v: 1, id: 'duel-1', seed: 123, levelId: 2, score: 44, streak: 7, time: 12, ghost: [[0, 300, 0], [10, 200, 1]] };
const encoded = social.base64UrlEncode(payload);
assert.deepEqual(social.base64UrlDecode(encoded), payload);
assert.equal(social.ghostYAt(payload.ghost, 0.5), 250);
assert.equal(social.challengeAttempts('duel-1'), 0);
assert.equal(social.consumeChallengeAttempt('duel-1'), 1);
assert.equal(social.consumeChallengeAttempt('duel-1'), 2);
assert.equal(social.consumeChallengeAttempt('duel-1'), 3);
assert.equal(social.consumeChallengeAttempt('duel-1'), 3);

const recorder = social.createGhostRecorder();
for (let index = 0; index < 60; index += 1) recorder.record(index / 60, 300 - index, index % 2 ? 1 : -1);
assert(recorder.export().length <= 12, 'Ghost recorder should sample rather than store every frame.');

global.window.BertMeta = { localLeaderboard(filters) {
    assert.equal(filters.scope, 'friends');
    return [{ player_name: 'My local score', score: 5 }];
} };
global.fetch = async () => ({ ok: true, json: async () => ({ scope: 'global', rows: [{ player_name: 'A stranger', score: 99 }] }) });
social.getLeaderboard({ scope: 'friends', playerId: 'pilot-a' }).then((result) => {
    assert.equal(result.offline, true);
    assert.deepEqual(result.rows.map((row) => row.player_name), ['My local score']);
    console.log('Social challenge and honest friend-board fallback tests passed.');
}).catch((error) => { console.error(error); process.exitCode = 1; });
