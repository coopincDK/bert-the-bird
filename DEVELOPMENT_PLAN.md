# Bert The Bird — Unity-tro browserrekonstruktion

## Princip: Unity-demoen er facit

Den tidligere browserudgave var en grov genfortolkning og er ikke længere den aktive retning. Browserudgaven læses nu direkte op imod det oprindelige Unity-projekt i `BertTheBird/`.

Det betyder, at vi bruger de faktiske Unity-filer som sandhed for:

- fuglens sprites, animationer og død-state
- level-navne, game modes, startfart og stages
- baggrundslag, parallax-hastigheder og originale prop-typer
- score/streak-regler, power-up-varighed og pre-warm-start

## Gennemført i den aktive browserudgave

**Aktuel lokal PWA-build: `worlds-relay-5`.** De ni Unity-afledte ranked baner er stadig urørte. De tre selvstændige eventverdener Neon Encore, Bird Run og Stormline har nu hver ét faktisk afslutteligt **lokalt** mål og et gemt kosmetisk mærke: henholdsvis overlev en hel 3+-bold-bølge, undvig en varslet rovfugl, og undvig en synlig storm-/orkangenstand. De stopper roligt uden dødsscene efter opnået mål, men er **ikke** offentligt ranked. Forbindelsen til fjer, missioner og dueller forbliver slået fra.

| Område | Unity-kilde | Browserresultat |
|---|---|---|
| Bert-flyvning | `fly.anim` + `RECOVER_bird.png` | De oprindelige 14 frames eksporteres uden ny grafik og afspilles ved **24 FPS**. Frame 14 bruges som original døds-state. |
| Desert | `Game.unity` level 1 + Level1-atlas | Korrekt levelnavn, startfart, stage-kurve, parallax-ørken og originale terrænforhindringer. |
| Flappy Bert | `Game.unity` level 3 + `FlappyBertPipe.png` | Original game mode, baggrundslag, grønne rør, tap-to-fly og stjerner i passagerne. |
| Level 4 | Unity level 4 + spider/snake animator-sheets | De faktiske spider- og snake-frames er eksporteret og animeres i browseren. |
| Level 5 | Unity level 5 + rainbow prefab-art | Original skybaggrund og rainbow-prop bruges i browseren. |
| Point og streak | `StaticVariables.cs` | Hver stjerne hæver streak; score stiger med den aktuelle streak; en misset stjerne nulstiller streak. |
| Progression | `GameSpeed.cs`, `SpawnScript.cs` + `LevelControl.cs` | Alle stages — inklusive sidste stage — interpoleres færdigt. Scroll bruger **720 × speed px/s**. Unity-kurven **0,30–0,55 / difficulty** kombineres med en faktisk, level-specifik canvas-afstand; Desert holder nu mindst **790 px** mellem grupper — også gennem Focus-fartskift — så høj difficulty ikke skaber overlap eller lag; prefab-gaps forbliver konstante. |
| Bert-collider | `Game.unity` · `CircleCollider2D` | Browseren bruger nu Unitys radius **0,45** og center-offset **(0, −0,13)** skaleret til den viste sprite — også under rotation. |
| Prop-colliders | Pipe/rainbow/snake prefabs | Flappy-rør har separate shaft/lip-bokse, rainbow bruger den oprindelige 11-punkts `EdgeCollider2D`, og animerede colliders følger deres synlige bevægelse. |
| Premium UI | `GUI/Atlas/Textures` + originale Unity-fonts | Hovedmenu, levelvælger og resultattavle bruger nu det originale logo, MenuBird, levelbilleder, knapper, highscore-tavle og skrifter i stedet for generiske webpaneler. Alle nøglepositioner beregnes mod den faste 16:9-spilscene, så titel, helt, daglig rute, handlinger og rekordpanel ikke kolliderer på korte iPhones. |
| Spiltype-navigation | De tre gameplay-familier | Banevælgeren er mode-først med **tre baner i hver**: Classic har Desert/Jungle/Happy Sky, Flappy har faste/bevægelige/blandede tårne, og Tunnel har Training/Star Stream/Pulse Tunnel. |
| Neon Encore — EDM-testevent | Originale genererede scene-/udstyrsbilleder og instrumental MP3 | Gratis ekstra event uden for de ni ranked baner. Efter tre læringsgrupper veksler **LED-armaturer i midten**, en enkelt **høj bundhøjttaler**, en **dyb loftsrig** og **hoppende publikumsbolde**. Bolde kommer nu i seedede bølger på én til fire, sjældent seks, med forskellige størrelser/højder/farter. De lander i publikums forgrundshænder og kan højst to gange pr. bold skubbes kort væk fra Bert på en synlig landing, men aldrig hvis en anden gruppe er for tæt på eller bolden er bag Bert. En fri øvre rute bevares, og hvert boldmøde erstatter et par i stedet for at blive stablet ovenpå. Begge ruter omkring midterhindringen er stjernefri; boldene har ingen prikket bane eller collider-markering, og de runde hitboxes følger billedet. Diskrete lys følger en animationsklokke (120 BPM) og kan slås fra separat eller via reduceret systembevægelse; lydafspilning påvirker ikke hitboxes. Eventen har kun lokal rekord, ingen global score, venneduel, fjerforbrug/-gevinst eller helteoplåsning. Hele pakken er offline-cachet. |
| Bird Run — flyv højt over jorden | Original Happy Sky-himmel, skybank og allerede valgbare BlueBert/SugarRush/NoirWing/SkyClaw/BoneBeak-poser | Anden, **separat gratis testevent**. Glider (blød kurve), Swift (skråt dyk) og Kite (skrå stigning) har rigtige skiftende vingeframes og seedet højde/fart. Efter tre solo-intromøder stiger kapaciteten i forskudte forfra-bølger gradvist fra 2 til højst 6 synlige fugle; naboarter varierer, farerne overhaler ikke hinanden, og der kommer én stjerne efter sidste fugl. Normal bagfra-fugl får 0,9 s stationært varsel, og en enkelt større SkyClaw-ørn eller BoneBeak-grib har **1,4 s** varsel og begrænset forfølgelse. Ægte kropskollision udløser ikke-grafisk fangst/fald; konservative collidere spejles med sprites. Bagfra-/rovfuglemøder forbliver solo, tidligere stjerner ryddes før varslet, og skyer skader ikke. Kun lokal eventrekord; sværheden skal vurderes med rigtige børn og telefoner, da kanterne fortsat kan være en let rute. Se `docs/BIRD_RUN_AND_EDM_LADDER.md` for de tre endnu ikke byggede EDM-baner. |
| Stormline: fysisk vind og gradvise vejrfare | Original vejrhimmel, vindfane/sejl og fire rensede transparente vejrgenstande | Tredje, **separat gratis testevent**. Ét fælles vindcue driver Berts lodrette fysik og med-/modvindens scenefart, bladeretning, vendende flag og **STILLE/BRISE/STORM/ORKAN**. Barometerets pil og tre styrkepunkter står nu samlet **lige ved bundflaget** uden en ekstra top-HUD-boks. Lette paraplyer/sejl, grene/skilte ved storm og sjælden tom minibil ved orkan erstatter hinanden efter vindstyrke; højst én synlig fare ad gangen, egen konservativ krop-collider, begge yderruter frie. Højder varierer mere, og næste fare kommer tidligere efter at den forrige og stjernen har passeret. Metal/tung, Hyper ×1,22, Dobbelt point og 30 s Flappy-vinge forbliver seedede, ikke-samtidige **kun-her**-pickups med lokal score, ingen ranked/fjer/dueller. Genbruger Classic-musik og fungerer offline. Se `docs/STORMLINE_AND_POWERUPS_PROTOTYPE.md`. |
| Sky Relay — originalt præcisionsminispil | Original Unity Happy Sky-baggrund og tre nye originale transparente spilillustrationer | Fjerde gratis lokal event. En fast, reproducerbar rute på ca. 15 sekunder fører Bert gennem tre **åbne, skråt sete skyringe**. Ringens **synlige skybuer i top og bund kan rammes og stoppe turen med nul point**; hele ringens midte er fri, og en flyvning helt udenom er kun et misset gatepoint. Den separate forskudte forgrundskant skjuler ham kortvarigt under passage uden ekstra usynlig collider. En synlig hængende vindklokkes **guldklinge** er slutmålet; hver ports faktiske centrumafstand, krop-til-klinge-præcision og tid giver **forskellig slutscore**, mens målmiss/timeout giver 0. Gulv/loft klemmer fuglen tilbage på skærmen i stedet for at dræbe; ingen generiske hindringer, slangebøsse, projektiler, bygninger, blokke eller lånt spilidentitet. Kun lokal rekord; ingen fjer, missioner, dueller, global/friends leaderboard eller rescue-spin. |
| Mode-previews og variantgrafik | Aktuel canvas-runtime + original `FlappyBertPipe.png` | Hvert af de ni banekort viser nu et deterministisk gameplay-frame fra den faktiske bane. Faste Flappy-rør er originale grønne, bevægelige er en forudgenereret blå palette, Tower Mix veksler guld/blå, og Tunnel har centerlinje, stjernerute eller pulsadvarsler. Der bruges ingen dyre live-filtre. |
| Kronologisk oplåsning | Lokal per-level highscore + missionsclaims | Første bane i hver spilform er åben som **trin 1**. Trin 2 åbner samlet efter de tre starterkrav (120 Desert, 90 Flappy Bert, 110 Tunnel Training) og én hentet mission. Trin 3 åbner samlet efter de tre næste krav (180 Jungle, 130 Sky Shift, 160 Star Stream) og fire hentede missioner i alt. Gamle, allerede optjente enkeltbane-oplåsninger bevares via én lokal engangsmigrering; nye oplåsninger følger de fælles krav. Pop-up'en viser alle tre banekrav og sender spilleren til missionerne eller den første manglende kvalifikationsbane. |
| Ni separate rekorder | Lokal lagring + global SQLite-API | Personlig og global highscore kan holdes adskilt for hvert af de ni level-id'er. Tavlen filtrerer på dag/uge/måned/alle tider, spilform, konkret bane og point/streak/tid; der beregnes ikke gennemsnit. |
| Mobilspil | Unity-kontrolprincip + moderne browser-API'er | **Venstre skærmhalvdel styrer OP, højre styrer NED**; en smal neutralzone omkring midten forhindrer fejlskift. Kontrolzonerne vises kun på start/tutorialskærmen og er helt skjulte under aktivt spil. Portrait pauser simulation og lyd bag drej-telefon-skærmen. |
| Installérbar webapp | Web App Manifest + Service Worker | Spillet kan installeres på startskærmen, åbner som fullscreen landscape-app og cacher hele den spilbare pakke til offline brug. `worlds-relay-5` bevarer den sidste gode HTML ved server-503 og efter 4,5 s uden svar; score-API-fejl bliver til kontrolleret lokal fallback. Sky Relay-logik, verdensmærker, bageste skyring, separat forgrundskant og vindklokke er tilføjet offline-cachen. Installationsguiden melder først **Klar til offline-spil**, når den aktive service worker og nuværende spilmotor er cachet. Alle ni ranked baner og fire events skal kontrolleres igen helt uden serverkontakt efter første installation; iPhone kræver stadig en HTTPS-kilde første gang og fysisk kontrol før bred udgivelse. Se `docs/OFFLINE_MOBILE_TEST.md`. |
| Responsiv flyvestyring | `BirdController.cs` + Rigidbody2D-værdier | Standard-mode bruger **480 px/s²** tyngde uden tomgangsdæmpning, balanceret nettoacceleration på **±2400 px/s²**, hurtig modretningsrespons og separate fald-/stigningsgrænser. Bert falder derfor tydeligt ved release uden skæv OP/NED-kraft. |
| iOS-landscape | Manifest, CSS safe areas, `visualViewport` og WebKit | Menu, levelvælger, gameplay og resultatskærm er landscape-only. Portrait blokeres af en drej-telefon-skærm. Scenen fastlåses til Chrome/Safaris faktiske visuelle viewport efter rotation i stedet for en potentielt forældet `100dvh`. På ekstra brede telefoner bevares den skarpe, uforvrængede 16:9-spilflade med rolige mørke sidefelter; den tidligere kunstige spejling er fjernet. Layout/touch er regressionstestet ved 852×393, 667×375 og 393×852. |
| Originale powerups | `PowerUpSprites.psd`, Shield/Magnet/Focus-scripts og SFX | Bogstavcirkler er fjernet. Shield, Magnet og Focus bruger de originale sprites, vinger, glows, lightning og effektlyde. Pickup-objekter får nu deterministiske **hurtig-mod-Bert**, **langsom-indhentning** og **øvre/nedre sweep**-profiler med hitbox på præcis det tegnede sted. Hurtige powerups fødes med ekstra afstand efter sidste hindring; i Tunnel følger de centerlinjen med kun en lille sidebevægelse. Focus viser først 3–2–1 med normalt stage-ur; derefter dæmpes scenen og den allerede afkodede originale Chopin-musik starter med en 0,65 s lyd-/fartfade. Chopin hentes **og afkodes én gang** parallelt med spriteindlæsningen; lydkonteksten aktiveres ved første rigtige spiltryk, men ingen lydstream/decoder holdes konstant kørende i tavshed. Ved pickup starter et nyt sample fra hukommelsen uden download eller mediesøgning; ældre browsere har en HTML-audio-fallback. Focus varer nu **30 s fra optaktens slutning** (0,65 s indfading + cirka 29,35 s fuld effekt), efterfulgt af den uændrede 2 s udtoning; Shield og Magnet varer stadig 10 s. Focus-hastigheden er nu omtrent **67 % af normal fart**, med bund 0,60 i Classic/Tunnel og særskilt lav bund i Flappy, så en langsom Flappy-bane aldrig bliver hurtigere af Focus. |
| Jungle-angreb og død | `Jump.anim`, `Catch.anim`, `catch_complete.anim` + originale sprite sheets | Introen har cirka 940 px mellem de første fjender i 18 s, 800 px frem til 35 s og derefter oprindelige 660 px. Stjerner ligger i en central flyvelinje **efter** fjenden i stedet for inde i angrebet. Edderkoppen låser sit mål og viser et kort spindelvævsvarsel dér før springet; effekten kan udelades i en fremtidig hardcore-bane uden at ændre angrebet. Slangen er bundforankret. Ved træf bruges de originale snake-catch-frames eller edderkoppens fulde 18-frame net-/kokonsekvens. Shield og redningsliv forbruges først; colliders er uændrede. |
| Resultattavle | `newScore.png` | Seks værdier er placeret i originalens venstre/højre score-, tid- og streak-rækker; gameplayobjekter ryddes før visning, medaljen har sin egen række med original stjernegrafik, og replay-/levelknapperne kan ikke længere blive dækket på korte iPhone-landscape-skærme. |
| iPhone-performance | Fast simulation + lazy asset decode | Simulationen kører i faste 60 Hz-trin og canvas præsenteres højst 60 gange/s, også på 120 Hz-iPhones. Menuen dekoder fælles canvas-assets og heltenes kompakte animationer; tunge level-/capture-assets indlæses ved banevalg. Bert/BlueBert kører 24 FPS, de ti koncepthelte 6 FPS med korte krydsfade. Focus ændrer verdensmekanikken uden per-frame ændring af HTML-lydafspillerens playbackRate; dens almindelige musik fades med få volumenopdateringer i stedet for 60/s. Render- og lydstien bruger billige hero-/settings-getters frem for at klone hele gemte spillehistorikken hvert frame. I Star Stream bliver den originale coin-SFX nu afkodet én gang med højst tre stemmer (tre forindlæste afspillere som fallback), den lange streak-break-lyd genbruges uden kloner, stjerneglow tegnes til to små buffere én gang, og starbursts er halveret og samlet begrænset til 96 partikler. Scoring, haptics og stjernelinje er uændret. Fysisk Chrome iOS-performance skal stadig mærketestes. |
| Tunnel Training | Originalt Level 2-art + ny deterministisk geometri | Det tomme Unity Test-slot er nu en konstant bølgende tunnel med smallere Bert, gradvis sværhedsprogression, fair minimumspassage og daglige seeds. |
| Helte og garderobe | Tolv kosmetiske helte + lokalt ejerskab | **Bert, BlueBert, BrickBird, BrainBird, SkyClaw, MechaBert, NoirWing, BoneBeak, SugarRush, MossHex, InkBird og PrismWing** beholder hver deres animation og deler fysik/collider. Bert er åben fra start; elleve optjenes permanent gennem klare præstationer eller købes for 120-480 fjer via to-trins bekræftelse. Garderoben viser status, krav, fremgang, pris og wallet. En eksisterende spillers tidligere valgte figur og allerede optjente præstationer bevares ved migration. Hovedmenuens store figur følger den valgte helt. Ejerskab er endnu kun gemt lokalt, så kontosynkronisering mangler før bred udgivelse. |
| Streak Guard | Afgrænset prototype med original stjerne-/Shield-art | Sjælden pickup efter de første 30 sekunder, højst én opladning og 90 sekunders cooldown. Badget sidder ved streaken; første missede stjerne forbruger opladningen, mens næste brud virker som før. Guard er uafhængig af Shield/Magnet/Focus og absorberer aldrig en kollision. Missede stjerner fjernes samme frame, så ét miss ikke gentages og skaber lyd-/renderlag. |
| Happy Pipes | Originale Level 5 PSD-lag | Happy Sky bruger de oprindelige farvede rør, topstykker, øjne og munddele som animerede forhindringer med compound colliders. |
| Forgrund i alle verdener | Originale Unity-lag + ny lav publikumsilhuet i EDM | **Top og bund** har korte, dekorative lag i Desert, Jungle, Happy Sky, Flappy, Tunnel, Neon Encore og Bird Run. De ydre lag tegnes nu **efter Bert**, så han faktisk flyver bag kulisserne nær kanten; de dækker ikke midterbanen og har ingen ny collider. Jungles store `fg` er stadig i baggrunden, mens dens bundkant og oprindelige løvtag ligger foran. EDM-publikummets arme skifter roligt mellem tre én gang klargjorte billedpositioner; reduceret systembevægelse fastholder den første. Ingen kunstige spejlede sidefelter eller blur. |
| Nye forhindringsskins | Original Unity-art + syv nye tilpassede PNG-sprites | Desert bruger tre nye sandstensstilarter sammen med originalen; Flappy får kobber/perlemor, Happy Sky koralrør og Jungle en mossten under jordslangerne. Desert-top/bund kan have forskellig bredde/skin, og hvert fjerde par efter introen har en kontrolleret mindre åbning (mindst 258 px). Konservativ kollisionskerne, gruppespacing og eksisterende angrebslogik bevares. Kun nødvendig bane-art dekodes ved banevalg; alle skins er i offline-cachen. |
| Meta og missioner | Original Chest/wallet-art + lokal progression | Berts rede viser fire daglige mål: stjerner, samlet flyvetid, streak og dagens rute. Færdige mål kan hentes én gang dagligt som fjer; 20/60/140 fjer åbner permanent 1/2/3 redningsliv pr. tur. Efter døden kan spilleren én gang pr. tur bruge **12 fjer** på et seksfelts redningshjul: fortsæt, Shield, Focus, Magnet, fjer retur eller Game Over. Fem felter genopliver Bert med tre sekunders sikkerhed; vennedueller tilbyder ikke spinnet. Der er ingen energimåler eller ventetid. |
| Global highscore og venneduel | Original leaderboard-art + SQLite-reference-API | Dag/uge/måned/alle tider kan filtreres på Classic, Flappy og Tunnel samt konkret bane, point, streak og tid. Kun bedste tur pr. pilot vises i hvert filter. Tavlen har nu særskilt “Venner fra dueller”-visning for direkte serverregistrerede rivaler. Dueller bruger samme seed, tre forsøg og transparent ghost. Test-API'en bruger egen midlertidig SQLite-fil i stedet for at nulstille live-databasen. Det er fortsat en uautentificeret demo-API med klientindsendte scores, ikke et verificeret netværk af kontakter. |
| Haptisk feedback | Vibration API + iOS 18 WebKit switch-fallback | Stjerner, bonusstjerner, powerups, skjold, redningsliv, død, missioner, rekorder, oplåsninger og almindelige knapper har særskilt feedback. OP/NED-flyvestyring vibrerer ikke kontinuerligt. Indstillingen **Haptisk feedback** gemmes lokalt. Android/kompatible browsere bruger fulde vibrationsmønstre; iOS-knapper bruger betroede native switch-tryk, mens programmatisk gameplayfeedback på iOS er best-effort og skal mærketestes på en fysisk iPhone. |

## Den aktuelle browser-version

Den aktive motor ligger i `webapp/unity-faithful.js`; mobil-/installationsskallen ligger i `webapp/app-shell.js`. De bruger kun browser-klare, eksporterede filer fra `webapp/assets/unity/`.

Eksporten kan genskabes deterministisk med:

```bash
python3 tools/extract_unity_web_assets.py
python3 tools/generate_level_previews.py
```

Unity-eksportscriptsættet **kopierer, beskærer, farvetilpasser eller renderer kun den aktive motor og originale Unity-filer** og skaber ingen generiske erstatningsassets. De separate kosmetiske koncepthelte bruges nu også til Bird Runs rigtige NPC-vingeanimation; Bird Runs fire egne referenceillustrationer (skybank og tre tidlige artsformer) og Stormlines elleve egne originalaktiver (himmel, sejl, vindfane, fire rensede vejrgenstande og fire powerup-ikoner) ligger uden for Unity-eksporten som optimerede billeder.

De automatiske kontrol- og iOS-layouttests køres med:

```bash
node tests/physics.test.js
node tests/progression.test.js
node tests/collision.test.js
node tests/tunnel.test.js
node tests/haptics.test.js
node tests/meta.test.js
node tests/hero-store.test.js
node tests/social.test.js
node tests/focus-audio.test.js
node tests/star-audio.test.js
node tests/edm.test.js
node tests/bird-run.test.js
python3 tests/bird_waves_acceptance.py
python3 tests/design_visual_audit.py
python3 tests/offline_resilience_acceptance.py
python3 tools/build_offline_test.py
python3 tests/offline_package_acceptance.py
node tests/stormline-powerups.test.js
node tests/collectible-motion.test.js
python3 tests/assets.test.py
python3 tests/server_api.test.py
python3 tests/friends_leaderboard_acceptance.py
python3 tests/star_streak_acceptance.py
python3 tests/hero_guard_acceptance.py
python3 tests/jungle_intro_acceptance.py
python3 tests/edm_acceptance.py
python3 tests/edm_progression_foreground_acceptance.py
python3 tests/edm_crowd_bursts_acceptance.py
python3 tests/edm_motion_acceptance.py
python3 tests/bird_run_acceptance.py
python3 tests/stormline_weather_acceptance.py
python3 tests/stormline_powerups_acceptance.py
python3 tests/edm_offline_acceptance.py  # kræver game-server på localhost:4175
python3 tests/ios_webkit_acceptance.py
python3 tests/fidelity_p0_acceptance.py
python3 tests/complete_pass_acceptance.py
python3 tests/social_jungle_acceptance.py
python3 tests/nine_levels_acceptance.py
python3 tests/jungle_economy_acceptance.py
```

## Det, der stadig kræver portering for helt 1:1 gameplay

Browserudgaven er nu visuelt og strukturelt på den rigtige Unity-baserede sti, men den er endnu ikke en komplet binær port af det gamle Unity-spil. Følgende er de reelle udeståender:

1. **Ferr2D-kollisioner:** Bert, Flappy-rør og rainbow er nu Unity-afledte. De fire Desert-terrainvarianters fulde Ferr2D-kurver skal stadig konverteres til individuelle browser-polygoner; den nuværende Desert-collider er en visuelt indrykket, konservativ kerne.
2. **Resterende prefab-variationer:** Desert varierer nu bredde, passage, skin og afstand; Happy Pipes har en ekstra farve. Enemy5 og de fulde individuelle Ferr2D-former mangler stadig.
3. **Power-up-opgraderinger:** Den originale grafik, centrale effekter, SFX, particles og den forvarmede Focus-musik/speed er porteret. Shop-afhængige varigheds-/shield-count-opgraderinger mangler stadig.
4. **Produktions-onlinefunktioner:** Global score-API, direkte duel-rivalvisning, lokale fallback-data og ghost-links er implementeret. Offentlig lancering kræver permanent HTTPS-host, identitet, navnemoderering, scorevalidering og backup; se `docs/MUSIC_AND_NEXT_STEPS.md`.
5. **Balancetuning:** De nuværende pixel-fysiske værdier skal måles og finjusteres imod en kørende Unity-reference, hvis den originale demo kan åbnes igen.
6. **Meta-udbygning:** Missioner, fjer-wallet, permanente redningsliv, ét redningsspin pr. tur, tolv helte og duelstreak er på plads. Garderoben er klar til næste pass, hvor helte primært vindes via achievements og altid kan købes alternativt for en høj fjerpris. De foreslåede krav og priser står i `docs/HERO_ROSTER_DESIGN.md`.

## Arbejdsgang fremover

- Bevar Unity-mappen som lokal reference.
- Hver browserændring baseres på en identificeret Unity-kilde.
- Eksporter kun de nødvendige original-assets til `webapp/assets/unity/`.
- Test hvert level som spilbart browser-flow, og gem en separat Git-commit for hver portering.

Den første Unity-tro browsercommit dækker den visuelle kerne, de originale level-baggrunde, Bert-animationen og de centrale gameplay-loops.
