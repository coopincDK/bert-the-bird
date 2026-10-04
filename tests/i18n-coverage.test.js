/* Every Danish UI text must have an English translation (other languages fall back to English).
 * Names, numbers and words that are the same in every language are allowed to stay untranslated. */
const fs = require('fs'); const path = require('path'); const assert = require('assert');
const dir = path.join(__dirname, '..', 'webapp');
const keys = new Set();
for (const f of fs.readdirSync(dir).filter((n) => n.endsWith('.js') && !n.startsWith('lang-') && n !== 'service-worker.js')) {
  const src = fs.readFileSync(path.join(dir, f), 'utf8');
  for (const m of src.matchAll(/\bT\('((?:[^'\\]|\\.)*)'\)/g)) keys.add(m[1].replace(/\\'/g, "'"));
  for (const m of src.matchAll(/\bT`((?:[^`\\]|\\.)*)`/g)) {
    let i = 0; let depth = 0; let out = ''; const s = m[1];
    for (let k = 0; k < s.length; k++) {
      if (s[k] === '$' && s[k + 1] === '{' && depth === 0) { depth = 1; k++; out += `{${i++}}`; continue; }
      if (depth > 0) { if (s[k] === '{') depth++; else if (s[k] === '}') depth--; continue; }
      out += s[k];
    }
    keys.add(out);
  }
}
global.window = { BertI18n: { register(code, table) { (global.L ||= {})[code] = table; } } };
require(path.join(dir, 'lang-en.js'));
const sameEverywhere = /^(tekst|tekst \{0\}|\{0\}|\{0\}\/3 [A-Z]+|MAGNET|GAME OVER|PAUSE|Bert The Bird|QUICK PLAY|STREAK|Score|Streak)$/;
const missing = [...keys].filter((key) => !(key in L.en) && !sameEverywhere.test(key) && /[a-zæøå]{2}|[ÆØÅ]/.test(key));
assert.deepEqual(missing, [], `Danish texts without an English translation:\n${missing.join('\n')}`);
console.log(`Translation coverage passed (${keys.size} texts).`);
