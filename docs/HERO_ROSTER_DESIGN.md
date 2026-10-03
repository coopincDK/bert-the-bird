# Bert The Bird: helte, præstationer og fjerbutik

## Kort fortalt

Alle tolv helte er **kosmetiske**. De har samme fart, collider og scorepotentiale. Bert er gratis fra start. De øvrige elleve kan vindes permanent gennem præstationer eller købes permanent for fjer. Der er ingen reklamer eller betaling med rigtige penge.

Garderoben viser krav, aktuel fremgang, fjerpris og saldo. Tryk på en låst helt for at læse kravet. Et fjerkøb kræver to tryk: **KØB** og **BEKRÆFT**; FORTRYD afbryder uden træk. En allerede ejet helt kan ikke købes igen. Præstationer opkræver aldrig fjer.

## Sådan vindes heltene

| Helt | Præstation | Alternativ pris |
| --- | --- | ---: |
| Bert | Starthelt | Gratis |
| BlueBert | Klar dagens rute én gang | 120 fjer |
| BrickBird | Nå 120 point i Desert | 180 fjer |
| SugarRush | Saml 250 stjerner i alt | 220 fjer |
| InkBird | Opnå bronze, sølv og guld | 240 fjer |
| BrainBird | Hent mindst én mission syv dage i træk | 260 fjer |
| SkyClaw | Nå 300 point på én tur | 280 fjer |
| BoneBeak | Nå bronze i Jungle uden permanent redning eller redningsspin | 300 fjer |
| MossHex | Nå bronze i Desert, Jungle og Happy Sky | 320 fjer |
| MechaBert | Vind ti vennedueller | 360 fjer |
| NoirWing | Nå 180 point på én tur uden at misse en stjerne eller ramme en forhindring | 420 fjer |
| PrismWing | Nå bronze i alle ni baner | 480 fjer |

**Bronze er 20 point.** Score, stjerner, medaljer og kvalificerende baner registreres permanent. NoirWing tildeles straks ved 180 point på en fejlfri tur, så et uundgåeligt senere slut-kollision ikke gør målet umuligt. At ignorere en stjerne tæller som en fejl, også når Streak Guard redder streaken. Ved Jungle-betingelsen tæller det ikke som redning at bruge et almindeligt Shield, men et permanent redningsliv og betalt fortsættelse gør.

Den bedste mulige indtjening fra alle fire daglige missioner er **45 fjer pr. dag** (8 + 12 + 15 + 10). Uden andre fjerforbrug svarer priserne derfor mindst til tre perfekte missionsdage for BlueBert og elleve for PrismWing. Det er et **teoretisk minimum**, ikke et løfte om faktisk spilletid eller en målt gennemsnitsspillers fremgang. De fleste spillere bør derfor vinde figurerne gennem præstationer. Test priserne med rigtige spillere før version 1.0.

## Eksisterende spilleres figurer

Tidligere var alle figurer åbne til test. Ved første indlæsning af denne version **beholder en eksisterende spiller den figur, vedkommende havde valgt**, også hvis dens nye krav ikke er opfyldt. Tidligere registrerede ture, missioner og duelsejre kan allerede opfylde præstationer; de belønnes ved migreringen uden fjertræk. Andre tidligere frit tilgængelige figurer bliver låst, indtil de vindes eller købes. Saldo, scorehistorik, missioner og pilot-ID bevares.

Ejerskab og præstationsfremskridt ligger foreløbig lokalt i browserens gemte spildata. Hvis disse data slettes, kan vi ikke gendanne køb eller figurer fra den offentlige highscore. Kontosynkronisering og backupløsning er fortsat et releasekrav, ikke en færdig funktion.

## Animation og design

Bert og BlueBert bruger deres originale Unity-sekvenser ved 24 FPS. De ti koncepthelte bruger hver tre tegninger plus dødspose, en 6 FPS-cyklus og korte krydsfade, så figuren ikke flimrer. Garderoben er et kompakt 6 × 2-grid; menuens store figur følger den valgte helt. Alle beholder Berts kollisionsmål.

## Streak Guard-prototype

En sjælden, selvstændig pickup giver **én** opladning. Den kommer først efter 30 sekunder, optræder i højst cirka 12 % af de kvalificerede powerup-vinduer, kan ikke stables og har 90 sekunders cooldown fra pickup. Et særskilt badge ved streaken viser opladningen. Den første missede stjerne forbruger Guard uden at nulstille streaken; den næste missede stjerne bryder streaken normalt. Guard beskytter **ikke** mod vægge, slanger, rør eller andre skader og er ikke et ekstra liv. Den påvirker ikke en allerede aktiv Shield, Magnet eller Focus. Et kort HUD-signal og en lyd markerer forbruget.

Dette er en afgrænset prototype, som skal prøves i hånden på fysisk mobil. Den er ikke et argument for at udvide powerup-udvalget før balance, hitboxes og den rene versus hjulpne leaderboardklasse er afklaret.
