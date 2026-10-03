# Stormline, nye powerups og koncertscene: spilbar testudgave

**Aktuel build:** `worlds-relay-5`. Der er fortsat ni ranked baner. Stormline er en **gratis, ikke-ranked, afsluttelig lokal eventverden** ved siden af Bird Run, Neon Encore og det originale Sky Relay-minispil; de tre planlagte selvstændige EDM-baner er endnu ikke bygget.

## Stormline: vind man både ser og mærker

- **Én vindmodel** styrer samtidig Berts lodrette acceleration, med-/modvindens scenefart, de få drivende blade, korte transparente vindstreger, vindfanens retning, forhindringernes bevægelse og det synlige barometer. Det er ikke længere kun en dekorativ effekt på sejlet. Berts kendte venstre=OP/højre=NED-kontrol bevares; vinden kan modarbejde eller hjælpe hans bevægelse, men forbliver begrænset og kan modflyves.
- Barometeret sidder nu **lige ved bundflaget** i stedet for i en løs kasse øverst til højre. Én kort linje viser **STILLE → BRISE → STORM → ORKAN** efter den *faktiske øjeblikkelige styrke* med tre styrkepunkter; en anden viser **MEDVIND/MODVIND** med pil. Pilens hældning og bladene viser løft/nedadtryk. I de korte, glidende vendinger står **VENDER**, når der reelt er nul vind; flaget hænger slapt og pilen erstattes af en prik. Vejrets seks seedede faser varer 12 sekunder hver med ca. 1,2 sekunders ud- og indfasning og et kort vindstille punkt. Grad og risikoniveau kan aldrig vise »orkan« ved nul kraft.
- Den eksisterende dekorative stof-vindfane forbliver fastgjort til sin stang, men stofdelen vendes og bøjes med vinden. Den har ingen collider. Under Reduced Motion fryses den kosmetiske flagflappen, men samme vindcue, Bert-fysik og farer fortsætter, så tilgængelighedsvalget ikke ændrer turens fairness.
- **Brise:** patchwork-sejl og lille paraply. **Storm:** løsrivende gren og vejskiltplade. **Orkan:** gren/skilt og en sjælden *tom, stiliseret lille bil* med klart synligt karosseri (højst ca. hvert ellevte møde under orkan). Der findes højst **én skadelig genstand ad gangen**. Alle fem har egne rensede originale billeder og hver sin konservative, synlige krop-collider. Løse blade, vindstreger, skyer og flag skader aldrig; top og bund forbliver åbne, også ved orkan. Farerne varierer nu mere i højde og får kortere tomme pauser først når den forrige fare er bag Bert og belønningen har passeret. Stjerner ligger mindst 365 scene-px efter faren. Det er en afgrænset tempojustering, **ikke** en dokumenteret sværhedsgrad på en fysisk telefon. Bilen er en valgfri prøveidé til fysisk mobiltjek, ikke et krav til endelig børneversion.
- Original Classic-musik genbruges. Eventen kan gemme **kun en lokal testrekord** og ændrer ikke fjer, missioner, helte, ni ranked baner, global score, dueller eller redningsspin. Den kan startes offline fra den installerede PWA.
- **Nyt lokalt mål:** Kom forbi en *faktisk* flyvende genstand, som blev født under `weatherLevel >= 2` (storm eller orkan). Først når den helt har forladt banen uden at ramme Bert, gemmes verdensmærket **STORMPILOT**, teksten »VERDEN MESTRET« vises, og løbet afsluttes roligt efter ca. 1,85 sekunder. Hverken en let brise eller blot et kraftigt flag udløser mærket. Det giver ingen fjer eller ranked fremdrift; fysisk sværhedsgrad og typisk ventetid skal stadig prøves på telefon.

## Fire midlertidige pickups: kun Stormline

| Pickup | Prototypeadfærd | Varighed |
|---|---|---:|
| **Metal / tung** | En metalgenstand gør OP mærkbart sværere og NED lettere. Normal fysik og synlig størrelse/collider ændres ikke i de ranked baner. | 6 s |
| **Hyperfart** | Aktuel scenefart ganges med **1,22**; næste møde får større afstand. Normal scene-/vindfart kommer tilbage ved udløb. | 6 s |
| **Dobbelt point** | Point fra fremtidige stjerner/streak ganges med **2**. Antallet af stjerner, fjer, missioner og tidligere point ændres ikke. | 8 s |
| **Flappy-vinge** | Ethvert nyt tryk **hvor som helst** giver ét vingeslag; ingen manuel NED-styring under effekten. Efter udløb vender venstre=OP/højre=NED tilbage uden en hængende finger. | 30 s |

De fire pickups roterer i en seedet rækkefølge og kommer ikke samtidig med hinanden. Tal, navne og placering er **prøveværdier**, ikke en færdigbalanceret ranked-pulje. Ingen shop- eller reklamekobling.

## Focus og Neon Encore

- **Focus:** original Chopin indlæses og afkodes før første pickup. Ved pickup står **FOKUS OM 3 → 2 → 1** i HUD, mens normal musik, fart og stage-ur fortsætter; derefter starter Chopin og slowdown med en **0,65 s** crossfade. Først da tæller 30 sekunders Focus. Den eksisterende 2 s udtoning bevares. Nedtællingen er ikke et 3-sekunders download-stop. Pause, portræt og musikindstillinger må ikke ødelægge timer eller lydresume.
- **Neon Encore:** fem dæmpede projektørstråler udspringer af scenens faktiske tårn-/arch-punkter. To tynde forgrundslasers er **rent lys, uden collider**. To scenekanoner udsender af og til transparent røg bag Bert, stjerner og forhindringer, maks. 0,15 lag-alpha. Reduced Motion slukker røg og forreste laserstreger; koncertlys kan slukkes særskilt. Ingen strobe eller lydstyret kollisionsgeometri.

## Godkendelse på en rigtig telefon

Lad gerne et barn spille Stormline uden forklaring: Fortæller barometer, bladene og det vendende flag samme historie? Kan man nå at se forskel på paraply, gren, skilt og sjælden bil? Fungerer kontrolmodstand, Flappy og Focus-lyd faktisk med fingre og højtaler på telefon? Test også koncert-røg, varme og batteri. Headless WebKit/Chromium kan måle billedlag, collider, effekter, offline-tilstand og frame pacing, men **kan ikke bevise fysisk touch, haptik eller lydindtryk**. Det offentlige 4175-link er stadig en **midlertidig sandbox-preview, ikke permanent hosting**.

**Automatiske kontroller:** `node tests/stormline-powerups.test.js`, `python3 tests/stormline_weather_acceptance.py`, `python3 tests/stormline_powerups_acceptance.py`, `python3 tests/bird_run_acceptance.py`, `python3 tests/fidelity_p0_acceptance.py` og `python3 tests/edm_offline_acceptance.py` (offline-testen bruger lokal full-stack-port 4175).
