# Bert The Bird — grafik, meta, highscore og vennedueller

## Retning

Bert The Bird står stærkest som et hurtigt, præcist arkadespil med korte runs, tydelig personlighed og flere regelsæt omkring den samme kerneflyvning. Det bør ikke blive et tungt systemspil. Meta-laget skal give spilleren en grund til at tage “én tur mere”, uden at skjule den enkle styring.

## Det implementerede fundament

### Tre scorebare spil

| Spil | Kerne | Primær færdighed |
|---|---|---|
| **Classic** | Desert, Jungle og Happy Sky med skiftende forhindringer | kontrol, ruter og streak |
| **Flappy** | Flappy Bert, Sky Shift og Tower Mix med faste, bevægelige og blandede rør | timing, rytme og aflæsning |
| **Tunnel** | Tunnel Training, Star Stream og Pulse Tunnel med tre forskellige korridormønstre | præcision, rutevalg og reaktion |

### Globale highscore-dimensioner

Den nye scoretavle kan filtrere på:

- periode: **dag, uge, måned og alle tider**;
- spil: **Classic, Flappy og Tunnel**;
- konkret bane: **alle ni level-id'er hver for sig**;
- disciplin: **point, højeste streak og flyvetid**.

Browseren falder tilbage til lokale resultater, hvis den globale API ikke er tilgængelig. Projektet indeholder en fungerende SQLite-reference-server under `server/`, som serverer spil og API fra samme origin.

### Udfordr en ven

En afsluttet tur kan deles som en duel:

1. udfordreren spiller først;
2. banens seed, resultat og flyvekurve gemmes;
3. modtageren får **præcis samme bane** og tre forsøg;
4. udfordrerens tur vises som en transparent spøgelsesfugl;
5. point afgør duellen, derefter streak og til sidst flyvetid;
6. vinderen kan sende sin nye tur tilbage;
7. lokale duel-sejre, aktuel vinderstreak og bedste vinderstreak gemmes.

Når score-serveren er online, bruges korte duel-links. Uden server deles en selvbærende udfordring i URL'en.

### Meta-lag: Berts rede og fjerøkonomi

Der er nu et missions- og økonomilag med tre daglige mål:

- saml stjerner som mad til reden;
- flyv et samlet antal minutter;
- nå en bestemt streak.

Hvert mål kan hentes én gang om dagen og giver **fjer**. Fjer bruges i reden til at låse op for op til tre permanente redningsliv pr. tur. Priserne er stigende: **20, 60 og 140 fjer**. Et redningsliv fjerner den konkrete forhindring, nulstiller streaken og giver 2,4 sekunders beskyttelse. Det giver reel værdi uden at gøre det ligegyldigt at ramme noget.

Der bør **ikke** indføres en energimåler, ventetid eller et begrænset antal forsøg. Det vil bremse præcis den korte “én tur mere”-rytme, som spillet lever af. Hvis videoannoncer senere tilføjes, bør en annonce højst kunne give ét frivilligt redningsliv efter et run — aldrig være nødvendig for at fortsætte eller konkurrere.

Det næste økonomilag bør primært bruge fjer og stjerner på **kosmetik frem for mere styrke**:

- helte og skins;
- vingespor og partikeleffekter;
- rede-dekorationer;
- alternative resultatskærme;
- musik- og lydpakker.

Det bevarer fair globale scoreboards. Ranked tavler bør enten markere antal brugte redningsliv eller have et særskilt **ren flyvning**-filter, så en tur uden redninger kan sammenlignes fair. Yderligere opgraderinger, der gør Bert fysisk stærkere, bør ligge i en separat “eventyr”-tilstand og ikke i ranked runs.

## Grafikgennemgang

Unity-projektet indeholder langt mere grafik end den tidlige browserversion brugte. Den seneste gennemgang fandt blandt andet:

- komplette Jungle-lag med baggrund, mellemgrund, forgrund, trætoppe, stammer, sten og tæt løv;
- komplette slange- og edderkoppeangreb samt fangstframes;
- originale leaderboard-, world-, friend-, score-, streak- og time-elementer;
- skattekiste, stjerne-wallet og ældre shop-layouts;
- yderligere figur-previewgrafik for Bert, Tweert og en gris;
- ældre sociale knapper og flere ubrugte menuvarianter.

Jungle-laget er nu komponeret i korrekt dybde med et sammenhængende originalt toplag og fuldt bundforgrundslag efter figurerne. Slangen er bundforankret gennem alle hopframes, og edderkoppens sidste kokonframe holdes synlig før resultatskærmen. Desert-forhindringer varierer nu uafhængigt i top- og bundbredde, åbningshøjde og vandret afstand.

Ikke alt ubrugt materiale bør genbruges ukritisk. De gamle shop- og Facebook-elementer er visuelt daterede. De er bedst som reference til proportioner og formsprog, mens nye funktioner bør bruge det nuværende mørke paneldesign og originale figurer.

## Negativ powerup

Der er **ingen færdig negativ powerup i den oprindelige kode**. Originalen definerer kun Shield, Magnet og Focus. Erindringen kan stamme fra en prototype eller et planlagt element.

Et godt nyt forslag er **Modvind**:

- mørk vinget sky eller forvredet powerup-kugle;
- 5–6 sekunders tungere fald og 15–20 % højere verdenshastighed;
- tydelig varsling og unik lyd;
- frivillig risiko: spilleren får dobbelt point, mens effekten er aktiv.

Så bliver den negativ uden at føles tilfældig eller uretfærdig. Den bør først lanceres i en event- eller Daily Route-variant, ikke på alle ranked Classic-runs.

## De bedste næste baner og spilelementer

### 1. Stormfront

Mørke skyer, vindstød og lynzoner. Vind vises visuelt før den påvirker Bert. Skaber variation uden nye knapper.

### 2. Tempelruiner

Bevægelige stenporte, faldende søjler og korte sikre lommer. Kan genbruge junglepaletten og stenformer, men kræver nye porte og ruindele.

### 3. Natteflyvning

Begrænset synsfelt omkring Bert. Stjerner lyser ruten op, og Magnet får en ny taktisk rolle. Billig at producere, fordi eksisterende baner kan genbruges med lysmasker.

### 4. Rovfuglejagt

En fjende presser spilleren bagfra. Den normale rytme bevares, men langsom eller upræcis flyvning straffes. Egner sig til korte 30–60 sekunders events.

### 5. Tunnel-varianter — nu implementeret

- **Tunnel Training:** rolig bølge og bred passage.
- **Star Stream:** tæt, næsten sammenhængende stjernerute langs den sikre linje; risikostjerner giver dobbelt score.
- **Pulse Tunnel:** smallere og bredere kamre i et tydeligt pulsmønster, hurtigere centerbevægelse og alternative stjernelinjer.

Alle tre bruger deterministiske seeds, så highscore og venneduel sammenligner samme bane.

## Oplåsning og progression

Hver spilform har sin egen kæde på tre baner. Første bane er altid åben; anden og tredje åbnes kronologisk ved at nå en konkret highscore på den foregående bane. Der er ingen betaling, valuta eller tilfældighed i oplåsningen, og en bane kan aldrig låses igen. Quick Play og Dagens Rute vælger kun blandt allerede åbne baner.

## Helte

**Bert** og **BlueBert** bør være kosmetisk lige i ranked spil. Nye helte kan have:

- egne animationer, stemmer og partikler;
- forskellige silhuetter, men samme collider;
- karaktermissioner og kosmetiske samlinger;
- en tydelig forhåndsvisning i menuen.

Særlige fysiske evner bør kun bruges i et separat Adventure- eller Party-regelsæt, så scoreboards forbliver sammenlignelige.

## Produktionsprioritet

1. **Host spil og SQLite-API bag HTTPS**, så globale tavler og korte duel-links bliver reelt offentlige.
2. Tilføj identitet, navnemoderering og score-plausibilitetskontrol.
3. Gør vennedueller synlige i en indbakke og tilføj push-/delingsflow.
4. Udbyg reden med kosmetiske køb for optjente stjerner.
5. Lancér én ny eventbane ad gangen; start med Stormfront eller en avanceret Tunnel Daily.
6. Test på fysiske iPhones med 60-sekunders, 5-minutters og 15-minutters runs før offentlig release.

## Vigtig produktbeslutning

Globale data kræver en permanent HTTPS-host og en identitetsmodel. Den medfølgende server er klar som prototype, men valg af offentlig hosting, domæne og loginmetode skal fastlægges, før systemet kan kaldes produktionsklart.
