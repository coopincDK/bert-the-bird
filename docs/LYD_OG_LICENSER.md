# Lyd og licenser – Bert The Bird

Status pr. 3. oktober 2026. Alt lyd i spillet skal have en dokumenteret kilde, før spillet kommer i App Store, Google Play og på nettet.

## Lydeffekter – egne, lavet fra bunden

Alle lydeffekter er syntetiseret af `tools/make_sfx.py` (ingen samples, ingen tredjepartsfiler). De er SmartPacks eget værk og kan bruges frit.

| Fil | Bruges til |
| --- | --- |
| `assets/sfx/coin.mp3` | Stjerne, point, træffer |
| `assets/sfx/pop.mp3` | Knapper, containere der flytter sig |
| `assets/sfx/explosion.mp3` | Streak brudt, sammenstød |
| `assets/sfx/shield-on.mp3`, `shield-off.mp3`, `shield-break.mp3` | Skjold og streak guard |
| `assets/sfx/magnet-up.mp3`, `magnet-down.mp3`, `magnet-running.mp3` | Magnet |
| `assets/sfx/splat.mp3`, `drop.mp3` | Fugleklat |
| `assets/sfx/lava.mp3` | Lavasøjle bryder ud |
| `assets/sfx/whoosh.mp3` | Meteor, lavabombe, røgkanon |
| `assets/sfx/wind.mp3` | Vindstød |
| `assets/sfx/crack.mp3` | Istap varsler |

De gamle lydeffekter med ukendt kilde (fra Unity 2014 og en lydpakke) er slettet.

## Musik – egen AI-musik (Suno Pro)

Lavet af Martin René Mortensen med Suno på SmartPacks betalte Pro-abonnement (årsabonnement) og downloadet fra kontoen, så retten til kommerciel brug gælder (Suno Terms of Service: Pro/Premier får rettighederne overdraget; siden 3. sep. 2026 gælder det downloadede numre).

| Fil | Nummer på Suno | Lavet | Bruges til |
| --- | --- | --- | --- |
| `assets/music/menu.mp3` | "Menu", https://suno.com/song/77fb60ae-602b-49e7-85d5-ace3e7756d7f | 3. okt. 2026 | Hovedmenu |
| `assets/music/classic.mp3` | "Classic" (uploadet fil) | 3. okt. 2026 | Desert, Jungle, Happy Sky og banerne uden eget nummer endnu |
| `assets/music/flappy.mp3` | "Flappy" (uploadet fil) | 3. okt. 2026 | De tre Flappy-baner |
| `assets/music/tunnel.mp3` | "Tunnel" (uploadet fil) | 3. okt. 2026 | De tre Tunnel-baner |
| `assets/music/edm.mp3` | "EDM" (uploadet fil) | 3. okt. 2026 | Neon Encore |

## Musik – mangler stadig at blive skiftet

Artlists katalog (stockmusik og -lydeffekter) må **ikke** bruges i spillet med Max Pro-licensen (Artlist support, 3. okt. 2026: kræver en særlig Business-licens). Musik, SmartPack selv genererer med Artlists AI-værktøj, er dækket af Artlists Terms of Use afsnit 14.9 (rettighederne overdrages, kommerciel brug ikke begrænset).

| Nuværende fil | Kilde | Status |
| --- | --- | --- |
| `assets/unity/audio/chopin.mp3` | Ukendt indspilning (værket er frit, indspilningen måske ikke) | Skiftes til AI-musik |

For hvert AI-nummer gemmes: prompt, dato, Artlist-konto og den downloadede fil, som dokumentation.
