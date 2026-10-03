# Bert The Bird — sammenligning, verdensretning og prioriteret roadmap

**Projektstatus: `edm-crowd-2`, 1. oktober 2026.** Dette er et designnotat. Boldsamlinger og sikre retningsskift er efterfølgende implementeret i den eksisterende Neon-event; Bird Hour og tre selvstændige EDM-baner er fortsat forslag.

**Bert har allerede en stærk og selvstændig kerne:** todelt mobilstyring med venstre skærmhalvdel = OP og højre = NED, synlige konservative kollisionsflader, stjernestreaks, ni adskilte ranked-baner og reproducerbare seedede dueller. Den rigtige retning er derfor ikke at lægge et jetpack-spil oven på Bert, men at gøre **flyvelæsning, højdevalg og fair reaktion** til den sport, spilleren kommer tilbage til. Den største risiko er ikke mangel på indhold; det er at kalde en klientindsendt scoretavle og en kun headless-testet mobiloplevelse for offentlig ranked-konkurrence, før de kan dokumenteres som fair.

## Konkret sammenligning: inspiration som genre, ikke som kopi

**Jetpack Joyride 1** er officielt beskrevet som et endeløst one-touch-løb med jetpacks, mønter, farer, missioner, gadgets/powerups, køretøjer, kostumer, achievements og konkurrence med venner [1]. Halfbrick fremhæver specifikt den kugledrevne jetpack, laboratorieflugten og køretøjerne [2]. Missioner blev koblet til level-up/rang, en stash og køb af opgraderinger/ting samt online score-sammenligning [3]; de fire dokumenterede powerups aktiveres automatisk ved token-pickup og kan opgraderes [4]. En senere officiel daglig række nulstilles efter én misset dag [5].

**Jetpack Joyride 2** går konkret i en anden retning: hovedforløbet er level-baseret, mens Endless låses op efter en boss i et laboratorieniveau; Apple beskriver også opgraderbar health, powerups/items der følger med, og et actionloop med auto-fire, projektiler og bosser [6]. Den officielle App Store-positionering føjer HD-grafik, nyt udstyr, våben og fjender til laboratorieeventyret [7], mens Halfbrick ligeledes fremhæver våben, fjender og laboratorieindramning [8].

**Det må Bert gerne lære af:** korte, læsbare onboarding-regler; en klar progression; replaybare udfordringer; synlige belønninger for mestring; eventindhold, der ikke omskriver kernebanerne; og sammenlignelige venneture. Brug det som designspørgsmål, ikke som opskrift på figurer, navne, grafik eller UI.

**Det må Bert ikke overtage:** jetpacks, Barry/Betty, laboratorier, våben, auto-fire, lasere/zappere/projektilkoder, køretøjer, mønt-/tokenloops, boss- og healthbar-struktur, Factory/passiv valuta, JJ-navne, missionstekster, ikonografi eller lydsignaturer. Bert skal heller ikke kopiere en hård femdages-streak, der straffer et misset døgn [5]. Berts særkende er en fugl, som læser luft, fugletrafik og solide former med én fri lodret bevægelse — ikke en figur, der skyder sig gennem et laboratorium.

## Berts faktiske udgangspunkt

### Styrker, der bør beskyttes

- **Spilbar kerne:** Ni ranked baner er allerede fordelt på Classic, Flappy og Tunnel; banevælgeren er mode-først, og progressionen låser samlet trin 2 og 3 op gennem konkrete bane- og missionskrav (`DEVELOPMENT_PLAN.md`, “Spiltype-navigation” og “Kronologisk oplåsning”).
- **Mobilidentitet:** Venstre = OP, højre = NED og en neutralzone er implementeret. Kontrolzonerne kan forklares før spil, mens de holdes usynlige under turen; portrait pauser spillet, og PWA’en kan installeres og bruges offline (`DEVELOPMENT_PLAN.md`, “Mobilspil” og “Installérbar webapp”).
- **Fair grundmotor:** Simulationen er fast på 60 Hz. Berts collider bruger Unity-radius og center-offset; flere prop-collidere er direkte afledt af den oprindelige reference (`DEVELOPMENT_PLAN.md`, “Bert-collider”, “Prop-colliders” og “iPhone-performance”).
- **Tydelig scorefantasi:** Hver stjerne øger streaken, point følger den aktuelle streak, og en misset stjerne nulstiller den (`DEVELOPMENT_PLAN.md`, “Point og streak”). Det er mere særpræget end en kopi af en møntøkonomi.
- **Nok meta til en beta:** Tolv kosmetiske helte deler fysik/collider; fire daglige mål, fjer, permanente redningsliv, ét risikofyldt redningsspin, Shield, Magnet, Focus og en afgrænset Streak Guard-prototype eksisterer allerede (`DEVELOPMENT_PLAN.md`, “Helte og garderobe”, “Meta og missioner” og “Streak Guard”).
- **Et godt isoleret eksperiment:** Neon Encore er allerede én gratis, offline-cached event uden for de ni ranked-baner. Den samme bane blander efter introen midter-LED, solohøjttaler, loftsrig og hoppende publikumsbolde med varierende fart. Boldene kommer nu også i små seedede flokke, lander ved publikum og kan vende kortvarigt væk fra Bert på en landing. Det er stadig ikke selvstændigt valgbare baner. Musik styrer ikke collision; Reduced Motion kan slå lys fra; eventen har kun lokal rekord og påvirker ikke fjer, helte eller dueller (`DEVELOPMENT_PLAN.md`, “Neon Encore — EDM-testevent”).
- **Et godt fairness-frø:** Dueller bruger samme seed, tre forsøg og transparent ghost; tavler kan filtreres på bane, mode, periode, point, streak og flyvetid (`DEVELOPMENT_PLAN.md`, “Global highscore og venneduel”).

### Reelle mangler — ikke pynt forklædt som roadmap

1. **Offentlig ranked er ikke klar.** Den nuværende SQLite/API-demo modtager `playerId` og score fra klienten; den mangler permanent HTTPS, identitet, rate limiting, navnemoderering, replay-/plausibilitetsvalidering og backup (`DEVELOPMENT_PLAN.md`, “Det, der stadig kræver portering”; `docs/RELEASE_READINESS_IDEAS.md`, “Udgivelsesporte”).
2. **Rangreglerne er ikke færdige.** Redningsliv og fjerbetalt fortsættelse kan ændre en score, men payloaden mærker ikke endnu en tur som ren eller hjulpet. Det må afklares før en offentlig tavle (`docs/RELEASE_READINESS_IDEAS.md`, “Fair runs og registrering af hjælp”).
3. **Fysisk mobilaccept mangler.** Headless-test erstatter ikke en ældre og en nyere iPhone, Android, 15–20 minutters spil, offline-genstart, rotation, tæt Star Stream, 30 sekunders Focus, lyd og haptik (`docs/RELEASE_READINESS_IDEAS.md`, “Fysiske mobiltests”).
4. **Nogle kollisions- og balanceopgaver er åbne.** Fire Desert-varianter bruger fortsat en indrykket konservativ kerne i stedet for fulde Ferr2D-polygoner; Enemy5/øvrige prefabvariationer, Unity-sammenligning og endelig fysikbalance mangler (`DEVELOPMENT_PLAN.md`, “Det, der stadig kræver portering”).
5. **Ejerskab, rettigheder og privatliv er ikke launch-klare.** Helte/progression er lokale; licenser for bl.a. konkret Chopin-indspilning, privatlivstekst og slette-/navneprocedure skal afklares (`DEVELOPMENT_PLAN.md`, “Helte og garderobe”; `docs/RELEASE_READINESS_IDEAS.md`, “Rettigheder og privatliv”).
6. **Bird Hour og den fulde Neon-ladder er forslag, ikke status.** Neon har én valgbar testevent med flere eksisterende forhindringsmønstre, ikke tre valgbare eventbaner. Bird Hour, densiteter, bagfra-varsler og den foreslåede seed/ghost-kontrakt er ikke implementeret.

> **Fairness-kontrakt:** En synlig figur skal have den relevante kollisionsflade. Et varsel må aldrig være en skjult collider. En seedet gruppe skal altid have mindst én læsbar farbar rute. Kosmetik, fjer og betalte/permanente redninger må ikke forbedre en Ren tur eller skabe ekstra duelforsøg.

## Prioritetsregel

- **P0 — udgivelsesblokere:** Troværdig drift, regelklarhed, mobilaccept og minimum af kollisionsretfærdighed. Ingen ny ranked-bane eller global eventrangering før disse er lukket.
- **P1 — retention og kontrolleret indhold:** Nye, isolerede oplevelser og sociale vaner, der beviser læsbarhed og giver tilbagevenden uden at ændre de ni ranked-baner.
- **P2 — eksperimenter:** Ideen er interessant, men må først testes efter P0 og skal holde sig uden for ren rangering, indtil data beviser fairness.

## Nummereret idékatalog

### P0 — udgivelsesblokere

1. **Permanent score- og datafundament** — **Status: foreslået. Prioritet: P0. Risiko: drift, omkostning og migrering.** Flyt fra midlertidig sandbox/enkeltstående SQLite til permanent HTTPS, vedvarende lagring, automatiske backups og øvet gendannelse; en deployment må aldrig nulstille tavlen eller progressionen.

2. **Signeret pilotidentitet og navnesikkerhed** — **Status: foreslået. Prioritet: P0. Risiko: login-, support- og privatlivsbyrde.** Indfør en signeret gæsteidentitet eller konto, navnefilter, rapportering og rate limits, før “venner” eller offentlig rangering markedsføres som troværdig.

3. **Ren tur og Fri tur som to tydelige klasser** — **Status: foreslået. Prioritet: P0. Risiko: to resultatsæt kan forvirre.** Ren tur forbyder permanent redning, redningsspin og fortsættelse; Fri tur bevarer dem. Vis klassen før start, på resultatet og på tavlen, og lad dueller bruge præcis samme klasse og seed.

4. **Bevis-ghost og versionslås** — **Status: foreslået; seedet ghost findes allerede. Prioritet: P0. Risiko: serverarbejde og fejlafvisning ved lav FPS.** Udvid ghost-data med seed, physics-/collision-version, viewportklasse, inputskift, pickupplacering og kollisions-/sluttid; serveren afviser en Ren tur, der ikke kan reproduceres inden for en dokumenteret tolerance.

5. **Fysisk mobilaccept som gate** — **Status: foreslået; automatiske layout- og engine-tests findes allerede. Prioritet: P0. Risiko: fund kan forsinke indhold.** Gennemspil alle ni baner på mindst én ældre og én nyere iPhone og én Android, med mute, offline-genstart, rotation, Focus, tæt Star Stream og 15–20 minutters session; log varme, FPS, inputfejl og dødsårsag.

6. **Desert-kollisionsafslutning** — **Status: foreslået; konservativ indrykket collider findes allerede. Prioritet: P0. Risiko: polygonport kan flytte indlært timing.** Konverter de fire manglende Ferr2D-terrainformer og test den synlige silhuet mod collision i faste seed-cases; behold den konservative kerne, hvis fuld form giver mindre læsbar fairplay.

7. **Unity-referencebalance** — **Status: foreslået; fast 60 Hz og levelkurver findes allerede. Prioritet: P0. Risiko: “1:1” kan kollidere med mobilkomfort.** Sammenlign startfart, afstand, indgangsvindue og Focus på en kørende Unity-reference, men dokumentér bevidste mobilafvigelser i stedet for at skjule dem som fejl.

8. **Rettigheds- og privatlivsrelease** — **Status: foreslået. Prioritet: P0. Risiko: enkelte assets/lydfiler skal udskiftes.** Opret en rettighedsoversigt for lyd og grafik, en kort privatlivstekst, en slette-/navneprocedure og en klar markering af, hvilke data der gemmes lokalt, online og i replay.

9. **45–60 sekunders første flyvning** — **Status: foreslået; Training og skjulte kontrolzoner findes allerede. Prioritet: P0. Risiko: obligatorisk tutorial kan skabe frafald.** Brug tre sikre passager i Tunnel Training: venstre for OP, højre for NED og slip for at mærke tyngdekraften. Vis kort Berts faktiske collider og en hindrings fair kerne, og gør forløbet springbart efter første gennemførsel.

10. **Før-start fairness-mærke** — **Status: foreslået. Prioritet: P0. Risiko: flere labels kan virke tekniske.** Vis en kompakt linje før hver tur: *Ren/Fri*, seedet/ikke-seedet, tilladte powerups, collision-version og online/offline-status. Spilleren skal ikke opdage regler efter en rekord.

### P1 — retention og kontrolleret indhold

11. **Fjersti med ugentligt valg** — **Status: foreslået; fire daglige missioner og fjer findes allerede. Prioritet: P1. Risiko: målkort kan fylde UI.** Læg tre parallelle ugemål over de daglige mål — flyvning, præcision og variation — og lad spilleren vælge to; mistede dage nulstiller ikke fremskridt, og belønningen er fjer og kosmetik, ikke permanent styrke.

12. **Progressionsmåling før ny økonomi** — **Status: foreslået. Prioritet: P1. Risiko: en lille testgruppe er ikke repræsentativ.** Test med 10–20 nye spillere og mål tid til bane 2, første fjerkøb, missionfrafald, brug af redningsliv og om Focus/Streak Guard føles fair; justér priser og unlocks på data frem for at tilføje en ny valuta.

13. **Bird Hour: introduktion med én modgående fugl** — **Status: bygget som Bird Run-event. Prioritet: P1-mobiltest. Risiko: kan føles tomt uden god rytme.** Tre første enkeltmøder viser nu hver sin fugleart og flyvekurve, stadig højst én synlig fare ad gangen med bred fri højde; spilleren lærer retning uden et nyt kontrolsystem.

14. **Bird Hour: fair bagfra-varsel** — **Status: bygget i Bird Run, endnu ikke fysisk mobiltestet. Prioritet: P1. Risiko: varsel overses på små skærme eller bliver for let.** Den sjældne langsomme bagfra-fugl får en stillestående `FUGL BAGFRA`-markør med **STIGER/DYKKER i 0,9 sekund**, før dens synlige krop nærmer sig. Varslet er aldrig dødeligt, og bagfra-fuglen kombineres ikke med top-/bundlukning. Det er et designvindue, ikke et målt menneskeligt reaktionskrav.

15. **Bird Hour: tre densiteter med restitution** — **Status: foreslået. Prioritet: P1. Risiko: høj tæthed bliver visuel støj.** Lav = enkeltmøder, medium = forskudte par fra skiftevis retning, høj = korte grupper med central åbning; en høj sektion følges altid af en rolig, læsbar sektion, og hver gruppe har mindst én ubrudt sikker rute.

16. **Bird Hour: sky- og vejrmøder** — **Status: foreslået. Prioritet: P1. Risiko: vejr kan komme til at ligne skjult fysik.** Kombinér fugle med højst én synlig sekundær fare ad gangen: en massiv skybank med tydeligt hul, en luftstrøm tegnet som vindbånd med sin virkning varslet, eller en enkelt regnfront med bred passage. Ingen usynlig drift, ingen dekorative lysstråler som dræber og ingen stjerne i en tvungen kombination.

17. **Bird Hour: sjældne ikke-fugle med eget sprog** — **Status: foreslået. Prioritet: P1. Risiko: for mange silhuetter gør scenen uklar.** Brug sjældent én ad gangen — fx papirfly, vindfane eller ballonkurv — med fast, kontrastfuld silhuet og egen optakt. De placeres efter restitution, ikke oven i et bagfra-varsel.

18. **Bird Hour: seed-dommerlog** — **Status: foreslået; seedede dueller findes allerede. Prioritet: P1. Risiko: mere replaydata og QA.** Gem fugletype, retning, spawn-/varslingstid, densitet, nærmeste sikre rute og dødsårsag i ghosten; en intern test afviser seeds med lukket passage, to tvungne retninger eller for kort varsel.

19. **Neon Encore A — Prismesti** — **Status: foreslået som selvstændig bane; midter-LED findes allerede i den samlede Neon-event. Prioritet: P1. Risiko: kan ligne en ren skin.** Den første gratis eventbane bruger tre brede, skiftende LED-porte i lav, mellem og høj højde med synlige konturer og fri over-/underrute. Den er åben fra start og lærer, at form og kontrast — aldrig lyd — fortæller den sikre linje.

20. **Neon Encore B — Basskifte** — **Status: foreslået som selvstændig bane; begge solohindringer findes allerede i den samlede Neon-event. Prioritet: P1. Risiko: bundhøjttaler og loftsrig kan lukke banen visuelt.** Efter én gennemført Prismesti åbnes en bane med én høj bundhøjttaler *eller* én dyb loftsrig ad gangen, med tydelig optakt og en bred passage. Målet om mindst cirka 2,5 Bert-højders fri passage skal valideres på telefon og i simulerede ruter, ikke behandles som et bevist tal. Der må ikke ligge en obligatorisk stjerne i den svære side.

21. **Neon Encore C — Publikumsvølge** — **Status: foreslået som selvstændig bane; bolde i små flokke, med varieret fart/højde og sikre landingsvendinger findes allerede i den samlede Neon-event. Prioritet: P1. Risiko: tættere bølger kræver præcis iPhone-kalibrering.** Efter to eventmål — gennemført Basskifte og endnu en tydeligt angivet eventgennemførsel — åbnes en bane, der sætter tre seedede boldtempoer og stigende, men begrænset bølgestørrelse i centrum. Bolde og runde collidere følger hinanden; brede kamre adskiller sekvenserne.

22. **Neon som tilgængelig, isoleret event-ladder** — **Status: delvist findes allerede; Reduced Motion, lokal rekord og offline-cache findes. Prioritet: P1. Risiko: lys og forgrund kan reducere læsbarhed.** Bevar lokal eventrekord og hold alle tre baner uden for ranked score, fjer, helte og dueller; tilføj high-contrast-/flickerfri tilstand, mute-test og en ét-sekunds regelpreview før nye faresorter.

23. **Tre-trins pickupvalg** — **Status: foreslået; Shield, Magnet og Focus autoaktiveres allerede ved pickup. Prioritet: P1. Risiko: ny beslutning kan belaste begyndere.** I tutorial eller event vises en kort, synlig lomme: tag pickup nu, lad den passere, eller nå en alternativ pickup i næste seedede lomme. Timer, ikon, effekt og hitbox skal være synlige uden lyd; ranked afventer data, før dette ændrer balance.

24. **Ugentlig Star League** — **Status: foreslået; seeds, ghosts og tre duelforsøg findes allerede. Prioritet: P1. Risiko: kræver P0-identitet og validering først.** Brug en fælles ugeseed med Ren tur, tre forsøg og valgfri venneghost; beløn deltagelse med kosmetisk badge eller lille fjerbonus, aldrig ekstra liv eller statsfordel.

25. **Duel-lommer og rematch-flow** — **Status: foreslået; direkte seedede dueller findes allerede. Prioritet: P1. Risiko: notifikationer og rapportering skaber driftsbehov.** Vis rivaler lige over og under spillerens placering, en klar tiebreaker rækkefølge (point, derefter streak og flyvetid) og en sikker rematch med seed/version-lås; først efter P0-identitet kan invitationer og udløb håndteres robust.

26. **Kontosynkronisering med ærlig offline-status** — **Status: foreslået; helte og progression er primært lokale. Prioritet: P1. Risiko: konfliktløsning og datatab ved migration.** Synkronisér kun kosmetik, wallet og progression efter eksplicit opt-in, behold offline-spil og vis status i reden. Indtil da skal spillet klart sige, at slettede browserdata kan koste lokalt ejerskab.

### P2 — eksperimenter efter bevis

27. **Achievement-baserede powerup-moduler** — **Status: foreslået. Prioritet: P2. Risiko: små varighedsændringer kan gøre gamle rekorder uretfærdige.** Erstat ikke-porterede shop-opgraderinger med ét optjent modul ad gangen, fx længere Shield, lille præcis Magnet eller tydeligere Focus-ind-/udfade; slå moduler fra i Ren tur eller kræv identisk modul i begge duelforsøg.

28. **Streakvalg ved 12 stjerner** — **Status: foreslået; Streak Guard-prototype findes allerede. Prioritet: P2. Risiko: lange streaks kan blive for stærke.** Tilbyd i en kommende fri/event-rute enten én synlig kollisionssikring eller en kort trestjernet magnetkæde; valget kan afvises, kan ikke lagres og kan ikke redde en allerede tabt frame.

29. **Fuglevagtens afslutning** — **Status: foreslået. Prioritet: P2. Risiko: en stor figur kan skjule banen eller ligne en lånt boss.** Lav et separat tre-faset setpiece uden healthbar eller skydning: synligt vingeslag åbner en høj/lav passage, en varslet flok krydser fra én side, og en sikker pause afslutter med fly-through-banner. Hold hitboxen lille, formerne synlige og fasen seedet.

30. **Rutevalg uden fælde** — **Status: foreslået. Prioritet: P2. Risiko: bonussporet bliver skjult optimal rute.** I event-setpieces kan to visuelt ligeværdige passager eksistere: én hurtigere og én med ren kosmetisk bonus. Begge skal være overlevelsesdygtige, have buffer før/efter og gemmes i ghosten; belønningen caps, så den ikke styrer ranked adfærd.

31. **Én ny ranked-regel ad gangen** — **Status: foreslået. Prioritet: P2. Risiko: flere baner udvander eksisterende trappe.** Når de ni baner har bestået P0-mobiltesten, kan én ny bane eksperimenteres med en enkelt, forvarslet regel — eksempelvis synlig sidevind eller rytmisk åbning — og med egen collider-, spacing- og unlocktest. Nye regler må ikke ændre gamle seeds eller historiske rekorder.

32. **Læringsdata pr. hazard og rute** — **Status: foreslået. Prioritet: P2. Risiko: telemetry kræver privatlivsdisciplin.** Mål anonymt completion, dødsårsag, næsten-uheld, valgt rute, pickup-rate og forståelse af bagfra-varsel; beslut først derefter eventvarighed, densitetsgrænser og unlocktærskler. Indsaml kun det, der kan forklares i privatlivsteksten.

## Bird Hour-verdenen: spilbar Bird Run-prototype og videre plan

**Bird Hour-idéen er en original fugletrafikverden, ikke et fjendesystem importeret fra en shooter.** Den første spilbare prototype hedder **Bird Run**: gratis, separat og ikke-ranked, så de ni baners seed, unlocks og rekorder ikke ændres. De tre første forfra-møder lærer nu forskellige arter og flyvekurver: først lige og så højdeændring, skråt dyk og skrå stigning. Derefter kan en sjælden langsom bagfra-fugl komme med 0,9 sekunders retningsangivet varsel. Bert bevarer venstre=OP/højre=NED, stjernestreak og collider-regel. Scenen har rolige skyer i top og bund, åben himmel i midten og højst én farlig fugl ad gangen. Dekorative skyer har ingen collider. **Vejr, flokke og højere densiteter er fortsat forslag**; se `docs/BIRD_RUN_AND_EDM_LADDER.md` for den præcise aktive version.

### Progression

1. **Lektion 1 — Læs modvinden:** Lav tæthed. Én forfra-fugl eller én skybank med bred åbning. Stjerner ligger kun på den frie rute efter mødet, ikke inde i beslutningen.
2. **Lektion 2 — Vælg højde:** Medium tæthed. Ét forskudt møde fra hver retning, men aldrig samtidige tvungne top-/bundlukninger. En synlig, kort luftstrøm kan flytte en rute, men retning og varighed vises før påvirkningen.
3. **Lektion 3 — Hold rytmen:** Høj, segmenteret tæthed. Korte flokke, en bagfra-fugl med et foreslået 0,7–1,0 sekunders varsel og ét vejrelement ad gangen. Efter hver krævende gruppe kommer et bredt restitutionsrum.

### Designkontrakt

- Fugle fra begge sider er solide efter deres egen silhuet; en vindstribe, skygge eller retningspil er aldrig i sig selv farlig.
- En bagfra-fugl må ikke overlappe en top-/bundlukning, en anden bagfra-fugl eller en sekundær vejrfare.
- Start med højst to tydeligt forskellige fugletyper og højst én farlig fugl ad gangen. Udvid først efter mobiltest, så himlen ikke bliver en uoverskuelig sværm; baggrundsfugle må ikke ligne farlige fugle.
- Skybanke, regnfront, vindbånd og sjældne ikke-fugle bruger forskellige former og optakter. Farve alene må ikke bære betydningen.
- Hver spawn-gruppe skal have en beregnet fri rute, minimumsafstand og et seedet replay. Dødsårsag skal kunne læses efter turen.
- Bird Hour må få egen eventrekord; global ranking, fjerbelønninger og duelstatus bør vente, til P0-bevis-ghost og mobiltest har bestået.

## Neon Encore: tre distinkte EDM-baner

Neon skal føles som en **visuel koncertflyvning**, ikke som en Desert-skin og ikke som lydstyret timing. I dag er midter-LED, solohøjttaler, loftsrig og bolde mønstre i **én** valgbar event. Her foreslås tre separate, oplåselige eventbaner, som dyrker hver sit mønster frem for at lægge alle farer oven i hinanden. Den eksisterende grundregel bevares: lyd og 120 BPM-lys kan understrege et mønster, men påvirker aldrig spawn, collider eller hitbox (`DEVELOPMENT_PLAN.md`, “Neon Encore — EDM-testevent”). Hver bane læses på mute, med Reduced Motion og uden kraftige blink.

1. **Prismesti — åben fra start.** Tre brede LED-porte flytter den sikre højde mellem lav, mellem og høj. Synlig gulvstribe, kantkontur og rolig luminanspuls læres i tre korte grupper; både over og under en midterform er frie uden stjerner som lokkemad.
2. **Basskifte — åbnes efter én gennemført Prismesti.** En enkelt bundhøjttaler og en enkelt loftsrig veksler, aldrig samtidig. Hver form får optakt og en 2,5 Bert-højders passage; mellem dem ligger en sikker midterlomme, der giver reaktion og læsning på lille skærm.
3. **Publikumsvølge — åbnes efter to eventmål.** I den nuværende blandede event kan flere bolde allerede hoppe samtidig og vende ved publikums hænder. Den foreslåede selvstændige bane bygger på dette med en tydelig læringskurve for lav, mellem og høj seedet boldfart samt brede kamre mellem bølgerne. Bolden og dens collider stemmer overens, og publikums forgrund er rent dekorativ.

**Unlocklogik:** Det er kun eventens lokale progression: Prismesti er åben; en gyldig gennemførsel åbner Basskifte; to klart viste eventmål åbner Publikumsvølge. Unlock ændrer aldrig ranked seed, ranked score, fjer, helte, de ni eksisterende banekrav eller gammel spillerprogression.

## Seks næste beslutninger

1. **Er Ren tur den officielle konkurrencetavle, og hvilke eksisterende powerups må være med?** Beslut før backend: et forsvarligt udgangspunkt er ens seedede Shield/Magnet/Focus/Streak Guard efter offentlig regeltest, men aldrig redningsliv, spin eller fortsættelse. Det følger den allerede dokumenterede anbefaling om at skille købte/permanente redninger fra score (`docs/RELEASE_READINESS_IDEAS.md`, “Min anbefalede rækkefølge”).
2. **Hvilken identitetsmodel er lille nok til beta, men stærk nok til at signere scores?** Uden svaret kan hverken offentlig tavle, venneinvitation eller anti-cheatplan designes rigtigt.
3. **Hvilke fysiske telefoner er release-matrixen?** Fastlæg mindst gammel/ny iPhone og én Android samt konkrete mute, offline, rotation, Focus og langsession-tests; ellers er “mobilvenlig” en antagelse.
4. **Godkendes den dokumenterede fairness-kontrakt som ikke-forhandlingsbar?** Især bagfra-varsel, minimumspassage, synlig colliderlogik og ingen samtidige tvungne top-/bundlukninger skal være automatiske acceptkriterier for Bird Hour og Neon.
5. **Hvad fortæller en fysisk Bird Run-prøve om næste event?** Den første Bird Run-prototype og dens bagfra-varsel er bygget; næste skridt er at måle læsbarhed, lyd, styring og tæthed på rigtige telefoner. Behold Neon som eksisterende event og byg først Prismesti som særskilt bane, når mobilkontrast er målt.
6. **Hvad er den maksimale eventbelønning?** Beslut nu, at events ikke ændrer ranked-fordel, og om de overhovedet giver fjer før økonomitesten. Kosmetik, redepynt og lokale medaljer er den sikre start.

## Anbefalet rækkefølge

1. Luk P0-drift, fair klasser, fysisk mobiltest, rettigheder og de mest synlige collision-/balancehuller.
2. Kør en lukket beta med tydeligt uverificerede testdata, hvis P0-onlinevalidering ikke er færdig; lov aldrig offentlige præmier eller manipulationssikre rekorder i denne fase (`docs/RELEASE_READINESS_IDEAS.md`, “Udgivelsesporte”).
3. Mål de eksisterende ni baner, missioner, fjerpriser, redningsliv og Streak Guard, før ny økonomi eller nye ranked-regler.
4. Afprøv den nu spilbare Bird Run-prototype med dens tre fuglearter på fysisk telefon med seed-dommerlog, mute-/Reduced Motion-test og kollisions-/varslingsfeedback; udvid først derefter verdens vejr eller fugletæthed.
5. Byg tre **separate** Neon-eventbaner: Prismesti, derefter Basskifte og Publikumsvølge, kun hvis læsbarhed, performance og eventunlock kan dokumenteres.
6. Start først derefter P2-eksperimenter og eventuelt én ny ranked-regel ad gangen.

## Referencer

[1]: https://apps.apple.com/fi/app/jetpack-joyride/id457446957 "Jetpack Joyride - App Store (Apple)"

[2]: https://www.halfbrick.com/games/jetpack-joyride "Jetpack Joyride Classic - Halfbrick"

[3]: https://www.halfbrick.com/blog/jetpack-joyride-sep-1st "Announcing Jetpack Joyride - releasing worldwide September 1st!"

[4]: https://halfbrick.helpshift.com/hc/en/4-jetpack-joyride/faq/706-how-do-i-upgrade-power-ups-1692683521/?contact=1&p=ios "How do I upgrade Power-ups? - Halfbrick Support"

[5]: https://www.halfbrick.com/blog/jetpack-joyride-1-6-frequently-asked-questions "Jetpack Joyride 1.6 - Frequently Asked Questions"

[6]: https://apps.apple.com/ca/iphone/story/id1634282912 "Blast Off in Jetpack Joyride 2 - Apple Arcade"

[7]: https://apps.apple.com/us/app/jetpack-joyride-2/id1598096399 "Jetpack Joyride 2 - App Store"

[8]: https://www.halfbrick.com/games/jetpack-joyride-2 "Jetpack Joyride 2 - Halfbrick"
