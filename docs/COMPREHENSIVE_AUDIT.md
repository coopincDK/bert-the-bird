# Samlet audit — Bert The Bird

**Formål:** Denne rapport samler otte Unity↔web-audits til én prioriteret implementerings- og releaseplan for den faktisk leverede webapp. Den er en **read-only syntese**: Ingen spil-, HTML-, CSS-, service-worker- eller assetfiler er ændret.

> **Kernevurdering:** Webappen har en brugbar grundstruktur og flere byte-identiske Unity-assets, men den aktive runtime er endnu ikke Unity-tro i de systemer, der bestemmer fairness og spillets identitet: fysik/input, tempo/spawn, Focus, Jungle-kollision, centrale prefab-pools, game-over-state og mobil/offline-livscyklus. Arbejdet må begynde med én autoritativ runtime- og datamodel; isolerede visuelle rettelser oven på de nuværende hardcodede branches vil ellers genskabe de samme fejl i nye former.

## 1. Grundlag, afgrænsning og beslutningsregel

### Autoritativ eksekveringsvej

Den publicerede side indlæser:

```text
webapp/index.html
  → app-shell.js
  → unity-collision.js
  → bert-physics.js
  → unity-faithful.js
```

`unity-faithful.js` er derfor det eneste runtime-mål for adfærdsrettelser. `game.js`, `levels.js` og `game-integration.js` er legacy og må **ikke** tælle som en løst implementeret rettelse, før de enten er fjernet, afkoblet eller bevidst synkroniseret med den autoritative model.

### Prioritetsdefinition

| Prioritet | Definition | Releasebehandling |
|---|---|---|
| **P0** | Brud på fairness, terminalt flow, offline-start eller central Unity-adfærd; kan give forkert død, tab af kontrol, korrupt resultat eller utilgængelig installeret app. | Skal være løst og accepteret før næste stabilitets-/PWA-release. |
| **P1** | Stor paritets- eller produktfejl, der ikke i sig selv blokerer sikker afvikling, men tydeligt forringer niveauidentitet, belønning, progression eller responsivt UI. | Skal være løst før en release, der markedsføres som **Unity-faithful**. |
| **P2** | Robusthed, performance, tilgængelighed, vedligeholdelse eller afgrænsede fidelityforbedringer efter de centrale kontrakter er på plads. | Planlægges og kvalitetssikres efter P0/P1; må ikke ændre de fastlåste domænekontrakter. |

## 2. Ledelsesresume

### Styrker, der skal bevares

- Den aktive browservej er identificeret entydigt, og baseline-tests for fysik og kollision passerer.
- Webben indeholder flere korrekte, byte-identiske Unity-assets, bl.a. Level 3-røret og dele af power-up-effekterne.
- Scoreformlen for indsamlede stjerner følger Unitys trekantede progression.
- Delta-tidsbaseret rendering, landscape-gate, Pointer Events, PWA-manifest og et eksisterende WebKit-smoke-testgrundlag er fornuftige baser.

### De fem beslutninger, der giver mest effekt

1. **Etabler én data-drevet simulation:** stages, world-speed, prefabvægt, spawn, transform, collider, power-up og lifecycle må ikke ligge som uafhængige magiske Canvas-tal.
2. **Ret fairness før grafik:** tungere og symmetrisk Bert-fysik, neutral midtzone, korrekt stage-/spawn-kurve, Focus og troværdige Level 4-hitboxes kommer før kosmetisk polish.
3. **Gør livscyklus central:** orientation, visibility, død, retry, power-up-stop og game-over skal gå gennem idempotente pause/teardown-funktioner, så score, lyd og render-state ikke fortsætter efter et terminalt skift.
4. **Gør mobil/PWA deterministisk:** cache-nøgler skal svare præcist til URL’erne i `index.html`; portrait må pauseres reelt; safe playable frame og pointer-ownership skal være fælles kontrakter.
5. **Byg fidelity på prefabdata:** visual, pivot, collider, stjerne/miss-detektor og variation skal komme fra samme `PrefabDefinition`. Det er den eneste bæredygtige vej til Level 1, 3, 4 og 5.

## 3. Prioriteret fundkatalog

### P0 — releaseblokkerende rettelser

| ID | Fund og forretningsmæssig effekt | Krævet rettelse | Verifikation / exit-kriterium |
|---|---|---|---|
| **P0-01** | **Fysik og touch er uretfærdig:** `idleDamping` modvirker fald, OP/NED har forskellig nettoacceleration, og berøring præcis ved midtlinjen bliver NED. | I `bert-physics.js`: `gravity=480`, `controlAcceleration=2400`, modretnings-`reverseResponse=18`, velocity caps `-820/+1080`; fjern idle-damping. Beregn thrust gravity-kompenseret: OP `2880`, NED `1920`. I aktiv inputsti: top=OP/bund=NED, digital styrke 1 og neutral/hysterese 317–403 i 720 logical px. | Fra hvile: 0,5 s idle = +240 px/s / +62 px og 1,0 s = +480 px/s / +244 px. 0,2 s OP/NED er spejlsymmetrisk ±480 px/s. Vending fra ±600 krydser nul inden 0,12 s uden velocity-reset. Midt-touch er neutral og pointer-cancel/leave/up rydder input. |
| **P0-02** | **Stage, world-speed og spawn følger ikke Unity.** Sidste stage fryser på den forrige værdi; webben bruger 280×speed og 2,35–4,0 s heuristikker i stedet for Unitys stage- og SpawnScript-kurve. Dette ændrer long-run pacing, spacing og scoremulighed. | Udskil en ren, testbar stage-/pacing-model. Lad sidste stage fortsætte til target og derefter clampes. Brug seeded RNG og `interval=(0,30+0,25u)/D` snapshot ved schedule; `scroll=720×S px/s` for 1280×720/ortho-size-5 normalisering; første prop ved post-prewarm-start. Hold prefab-gap konstant. | Desert: t=295,5 s giver S=2,4/D=1,4; t≥385,5 s giver S=2,8/D=1,8. Med `u=.5` bliver interval 0,303571 s, scroll 1728 px/s og spacing ca. 524,57 px. Bekræft samme værdier ved 30/60 Hz og stagegrænser. |
| **P0-03** | **Focus er kun en 0,7 bird-frame-effekt.** Unity bremser verden absolut mod S=.7 over 2 s, holder D=1, pauser base-stage og kører en 2 s restore. | Implementér én Focus-state-maskine: `enter(2 s) → active(10+5×upgrade s) → exit(2 s)`. Snapshot normal stage; lerp S mod .7 og D mod 1; frys base-stage-ur i hele temp-stage-forløbet; anvend værdierne på scroll, spawn, parallax og animation. Alle forced-stop-/death-/timeout-veje skal bruge samme teardown. | Målinger ved 0, 1, 2 s og ved afslutning beviser S→.7→snapshot, D→1→snapshot, stilstand i stage-ur og ændret obstacle-/parallax-scroll. Ingen dobbelt restore eller gennemløbende base-stage. |
| **P0-04** | **Level 4 har ikke troværdig lethal collision.** Snake bruger en vilkårlig web-rect; spider bruger en uforklaret cirkel selv om Unity-prefabet ikke har en fatal Enemy-collider. Resultatet er upålidelige hits og nogle angreb når ikke normal game-over. | Konvertér snake root→visual→hitbox-transform og dens effektive fatal box `0,80×0,452` samt særskilt `3,168×3,54` Jump pre-trigger. Vedtag en eksplicit web-spec for spider: frame-alpha/body-hull med samme pivot-/swingmatrix som renderer, eller markér den ikke-fatal. Begge fatalveje kalder `triggerDeath()` præcis én gang. | E2E på snake idle- og Jump-frame: hit ⇒ én `dead` ⇒ efter 1,5 s `gameover`; 1 px uden for fatal box men inden for pre-trigger ⇒ Jump, ikke død. Samme hit/near-miss på spider første/sidste frame og begge swing-ekstremer. |
| **P0-05** | **Død er ikke terminal.** Under 1,5 s dead-window kan webben samle stjerner/power-ups, ændre streak og spawne nye effekter; derefter fryser gameplay-arrays bag resultatskærmen. | Ved `triggerDeath()`: snapshot score/streak/tid og stop collection, miss, aktivering og spawn. Lerp post-death scroll mod .3. Før game-over overlay: kald idempotent `clearGameplayRenderState()` der tømmer obstacles/collectibles/particles og nulstiller power-up/input/spawn-state. Game-over renderer må ikke tegne gameplay-arrays/debug-collidere. | Kollidér lige før star og power-up; alle resultatværdier og power-up-state er uændrede efter 1,5 s. Test retry→death→menu→retry uden array-, input-, badge- eller visuelle rester. |
| **P0-06** | **Portrait-gaten er kun visuel.** Spilleren kan dø og musik kan fortsætte under rotation. | Indfør central `pause(reason)`/kontrolleret `resume()` med `pausedForOrientation`; clear input, stop simulation og musik i portrait, nulstil frame-timestamp, og kræv eksplicit resume i landscape. Genbrug for visibility/pagehide. | Aktiv run i portrait i ≥10 s: uændret tid, score, bird- og obstacle-position samt pauset musik. Landscape kræver kontrolleret resume uden delta-hop. |
| **P0-07** | **Cold offline relaunch er ikke pålidelig.** Service worker precacher uversionerede filer, mens cached HTML anmoder query-versionerede CSS/JS; `caches.match(request)` normaliserer ikke search. | Gør `index.html`-URL’er og `APP_SHELL`-keys identiske, helst fingerprintede filnavne uden query; bump cache-version atomisk. Returnér kontrolleret fallback ved cache-miss. | Efter `serviceWorker.ready`: kontrollér cache-keys mod HTML-subresources, gå offline, luk/genåbn ved manifestets `start_url`, og start level uden netværksrequest eller manglende CSS/JS. |
| **P0-08** | **En enkelt sandhed for runtime mangler som håndhævet kontrakt.** Legacy-filer og hårdkodede parallelle modeller øger risikoen for, at rettelser lander uden effekt eller reintroducerer drift. | Dokumentér `unity-faithful.js` som production-entrypoint; flyt delte regler til importeret, testbar modul-/datakonfiguration; tilføj en build/test-assertion der kontrollerer scriptlisten i `index.html`. Sæt legacy i karantæne eller synkronisér det bevidst. | CI fejler hvis production HTML ikke loader den autoritative runtime, eller hvis beslutningsdata igen duplikeres i legacy-sti. |

### P1 — nødvendig Unity-fidelity og komplet produktoplevelse

| ID | Fund | Handlingsklar rettelse | Acceptance-nøgle |
|---|---|---|---|
| **P1-01** | Level 1 erstatter fem præfaber med ét generisk 235 px sandstenspar. | Opret `StoneWall1–4` og `Enemy5` med vægte **2:2:2:2:10**, hver y-range, form/pivot, stjernepunkt og alpha/Ferr2D-afledt collision. | Seedet 180-spawn-forløb giver 20/20/20/20/100; alle y ligger i præfabets range; ingen hit i transparent/afrundet terræn. |
| **P1-02** | Level 3 bruger korrekt pipe-pixel, men magisk 210 px gap og strakte colliderbokse. | Modellér komplet pipe-par med root y `[-2,0;2,4]`, authored top/bund-transform, fire shaft/lip-collidere og separat Star 10-transform. | Sweep rammer fire boxes, men passerer opening; render/collider-overlay er sammenfaldende; opening er invariant gennem run. |
| **P1-03** | Level 5 viser kun bobbende rainbow: 14/18 poolvægte, alle Happy Pipes, farver, ansigter og miss-detectors mangler. | Implementér syv definitions med vægt **2:2:2:3:3:3:3**; to særskilte rainbow edge-lister (11/12 punkter); static/moving compound pipes, PipeColor, facefaser, stars og MissDetector. Fjern uautoriseret rainbow-bob. | Seedet 180-spawn: 20 af de tre 2-vægts typer og 30 af hver Moving1–4; normal/reversed har korrekt orientering; cap/shaft, star og miss-adfærd er korrekt. |
| **P1-04** | Niveauernes baggrunds-/lagkomposition tilsidesætter Unity `Enabled`, højde, y og slack. L1 strækker sky; L4/L5 tegner deaktiverede lag; L5 mangler originale moving-pipe-animationer. | Byg Unity-layer-adapter med `Enabled`, `Images[]`, `height`, `y`, `slack` og tre wrap-paneler. Brug scene-data: L1 (324/40 sky, BG1 188/-103, BG2 400/-103, MG 198/-207, FG 198/-376); L3 fire scene-lag; L4 skybox + mg/fg kun; L5 skybox + bg kun. Portér L4 5/10 fps animationer og L5 4 s pipe-kurver. | Golden-master captures ved 5/15/30 s, HUD-maskeret; log/assert viser korrekt lag aktiveret og draw-order. L5 0/2/4 s viser korrekt pipe-bevægelse og farvevariation. |
| **P1-05** | Power-ups bruger S/M/F-cirkler; Shield-charge-/effectmodellen, upgrades, cooldowns og originale visuals mangler. | Eksportér PSD slices `_0/_1/_3/_6`; komponér Shield/Magnet med vinger/glow, Focus med original medaljon. Brug BlueGlow, YellowGlow og Lightning i renderer. Portér Shield charges `1+upgrade`, 2 s immunity, radial spawn/break/splinter; Magnet radius `1,6+upgrade`/force 30; alle varigheder `10+5×upgrade`; ReadyAt +60 s/type og 15–25 s spawner. | Screenshot-/`drawImage`-test beviser original art og aktiv brug af copied assets. Base/upgrade Shield forbruger en charge per hit. Magnet er star-only, radiusstyret og power-up-miss ændrer ikke streak. |
| **P1-06** | Audio er reduceret til fast Level1 og generisk Pop/Explotion. Focus mangler Chopin, pitch/fade og normal musikmatrix. | Lav `AudioDirector`: menu/1/2/3/4/5 = `Menu/Level1/Test/Menu/Level1/Level1`; Focus 2 s musik-rate/fade og separat ikke-loopende Chopin; ShieldOn/Instantiate/Break/Off; Magnet `pwr_up → pwr_running` loop ved .64 → `pwr_down`; death-rate-fade; separate master/music/SFX gains. Cache nye clips med PWA-rettelsen. | Start menu + 1–5 bekræfter matrix og stop af forrige clip. Focus ved t=0–2 og exit bekræfter rate/fade/Chopin. Magnet-loop stopper på timeout, death og retry. |
| **P1-07** | Resultatskærmen har forkert seksfeltsgeometri, én score-rekord, overflowende actions og resultatstate uden fuld records-model. | Genskab 589×341 designgrid med seks felter: best/run ved x 17,80/82,20 % og rækker y 25,15/52,63/ca.79 %. Skaler scoreboard/action-art mod 16:9 safe frame; persistér valideret `{score,time,streak}` pr. level og tre badges. | Ved 1280×720, 852×393, 667×375 er tavle/action-art inden for frame. Stress `12,500`, `59:59`, `x999` uden overlap. Test ingen/en/alle/lig rekord og reload. |
| **P1-08** | Persistence og levelmenu mangler Unitys score→streak→time tie-break, daily record, safe storage og unlock-flow. | Versionér record-objekt med UTC-daily; `Number.isFinite`-validering; in-memory fallback på storage-fejl; eksplicit unlock-kontrakt; vis score, streak og tid på levelkort. | Tie-breaks, korrupt/negativ storage, `setItem`-exception og UTC-dagsskifte kan ikke blokere game-over eller give `NaN`. |
| **P1-09** | Safe area, pointer ownership, fullscreen-status og visibility-livscyklus er ufuldstændige på Chrome iOS/WebKit. | Definér shared safe playable frame; mål canvas mod den; spor `activePointerId`, capture fra prewarm, håndtér lost capture/blur/pagehide/visibility; returnér immersiv capability (`fullscreen`/`standalone`/`browser`) og vis ærlig fallback. | Ikke-nul insets holder HUD, modaler og touch-zoner synlige; sekundær finger afbryder ikke primær; cancellation/blur rydder input; browser-/standalone-flow er forståeligt. |

### P2 — hardening, kvalitet og vedligeholdelse

| ID | Forbedring | Leverance og mål |
|---|---|---|
| **P2-01** | Level 2 skal være deklarativ træningsmode, ikke et scheduler-sidefald. | `obstaclesEnabled:false`; 10-minutters simulation har nul props, collision og falsk telemetry. |
| **P2-02** | Del tung, atomisk 15,50 MiB precache op. | Kritisk shell først, best-effort/on-demand level- og lydcache bagefter; offline-klar først efter valideret cache-readiness; mål TTI, cache-størrelse og fejl ved begrænset lager. |
| **P2-03** | Tilgængelighed: HUD announcerer pr. frame, modal focus og canvas reduced motion mangler. | Sjældne `role=status`-hændelser; dialog-fokus, Tab-trap og Escape-luk; fokuserbar controls-hjælp samt canvas reduced-motion-profil. |
| **P2-04** | Testhygiejne og regressionsforebyggelse. | Visuel golden-master med maskeret HUD, seeded RNG-fixtures, render/collider-overlays, source-data snapshot og CI-testmatrix. |
| **P2-05** | Asset-/pipelinehygiejne. | Eksportér manglende PSD/frame/pivot-data gennem reproducerbar pipeline; fjern kun døde assets, hvis de ikke indgår efter P1-05; dokumentér kilde, hash og renderer-forbrug. |
| **P2-06** | Finpolish efter kvantitativ accept. | Først efter P0 kan gravity playtestes i små trin 440/480/520 uden at ændre den symmetriske kontrolkontrakt; lydmix og visuelle tolerancer justeres uden ændring af mekaniske tests. |

## 4. Fælles årsager på tværs af fund

| Fælles årsag | Hvor den ses | Konsekvens | Varig modforanstaltning |
|---|---|---|---|
| **Hårdkodede generiske Canvas-regler erstatter prefab- og scene-data.** | Obstacles, lag, rørgap, Level 5, pickup-art, collidere. | Asset-pixels kan være korrekte, mens spillet visuelt og mekanisk stadig er forkert. | Én `PrefabDefinition`/`LevelSpec` som bærer vægt, range, render/pivot, compound collision, points/miss og animation. |
| **Simulationstilstand er spredt og ikke lifecycle-ejet.** | Focus, stage, death, orientation, visibility, power-up timeout. | Timer, lyd, score og render kører efter et skift, eller stopper forskelligt fra vej til vej. | Én state-maskine med veldefinerede `start`, `pause`, `resume`, `enterPowerup`, `stopPowerup`, `triggerDeath`, `finishDeath`, `retry`, `menu`. |
| **Render og collision bruger forskellige koordinat-/transformantagelser.** | Snake, spider, pipe, rainbow, Ferr2D, Happy Pipes. | Synligt overlap og faktisk hit er ikke det samme; død virker tilfældig. | Fælles world→canvas-matrix og samme transformobjekt for render, collider og collectible-spawn. |
| **Canvas-pixels bruges som uafhængige magiske konstanter.** | Physics, scroll, gaps, resultatoverlay, responsiv lagkomposition. | Dårlig mobilskalering og afvigelse fra Unitys world-enheder og designgrid. | Dokumentér normalisering (`72 px/world`, 16:9 safe frame, 589×341 scoregrid) og test den som data. |
| **RNG og tid er ikke deterministisk testbare.** | Spawner, pools, phase, long-run pacing. | Vægte, spacing og regressions kan ikke bevises stabilt. | Injiceret seeded RNG + fake clock; schedule snapshotter difficulty ved planlægning. |
| **Asset-livscyklus er inkonsistent.** | Original glows/lightning loades uden render; Chopin findes men bruges ikke; SW-query mismatch. | Død vægt, manglende fidelity og upålidelig offline-start. | Asset-manifest med `source → runtime reference → cache key → test`. |
| **UI er viewport-baseret snarere end frame-/designbaseret.** | Scoreboard, action-art, safe areas, rotate overlay. | Overflow og overlap på landskabs-mobiler. | Én safe playable frame, 16:9 game frame og designgrids for HUD/resultater. |

## 5. Anbefalet målarkitektur

Dette er en implementeringsramme, ikke en anmodning om et stort rewrite. Hvert modul skal kunne indføres bag eksisterende API’er og valideres isoleret.

```text
Unity-derived immutable data
  ├─ LevelSpec: music, layers, stages, props-enabled
  ├─ StageEngine: base stage + temporary Focus stage + death slowdown
  ├─ PrefabDefinition: weight, y-range, pivot, render, colliders, star/miss nodes
  ├─ SpawnScheduler: seeded RNG, Unity interval, per-type cooldowns
  └─ AssetManifest: runtime URL, cache URL, expected use

Runtime state machine
  ├─ menu / level-select / prewarm / playing / paused / dead / gameover
  ├─ pause reasons: orientation, visibility, modal
  ├─ power-up lifecycle and unified teardown
  └─ immutable run-result snapshot at death

Adapters
  ├─ WorldToCanvas transform used by renderer + collision + spawns
  ├─ AudioDirector (music, SFX, gain, Focus, lifecycle)
  ├─ PersistenceStore (versioned, validated, fallible storage)
  └─ PWA cache manager (exact URL identity, readiness)
```

### Ikke-forhandlingsbare kontrakter

1. **Ingen renderer-specifik collider.** Hver skadelig collider skal komme fra den samme prefab-transform som det tegnede objekt.
2. **Ingen global gap-shrink.** Unity-progression øger speed og cadence; hvert prefab bevarer sin authored opening.
3. **Ingen mutation efter death-snapshot.** Score, streak, tid og power-up-state er frosne fra `triggerDeath()`.
4. **Ingen skjult simulation under pause.** Orientation, hidden page og eksplicit pause opdaterer ikke gameplaytid.
5. **Ingen adfærd afhænger af legacy-filer.** Production HTML og tests skal pege på den samme runtime.
6. **Ingen cacheantagelser.** URL i HTML, runtime assetreference og Cache Storage-key er identiske eller eksplicit normaliserede og testet.

## 6. Implementeringsrækkefølge

### Fase 0 — Fastlås reference og test-seams

**Før kodeændringer:**

1. Bekræft scriptgraph og markér `unity-faithful.js` som production runtime.
2. Registrér Unity-afledte data i revisionerede tabeller: level layers, stages, musik, prefab-pools, transforms, colliderformer, point/miss og power-up-parametre.
3. Udtræk ren stage/pacing-, RNG- og storage-logik, så den kan testes med fake clock uden `requestAnimationFrame`.
4. Opret test-fixtures: seeded RNG, 30/60/120 Hz deltas, screenshot viewport-matrix, event-log for lyd, Canvas `drawImage` spy og cache-key inspection.

**Gate:** CI kan bevise runtime-entrypoint, og de nye enhedstests kan køres uden browser.

### Fase 1 — P0: fairness og terminal state

1. Implementér P0-01 fysik/input og præcise måletests.
2. Implementér P0-02 stage-/pacing-engine med normaliseret speed, sidste-stage-fix og statisk prefab-gap.
3. Implementér P0-03 Focus som en midlertidig stage oven på denne engine; tilføj lydovergangens state hooks, men læg komplet clip-port i Fase 3.
4. Implementér P0-05 death snapshot, interaction-stop, slowdown og `clearGameplayRenderState()`.
5. Implementér P0-04 Level 4 snake først, derefter den eksplicit besluttede spider-kontrakt. Integrér shield-værn i samme terminal-vej.

**Gate:** Et seedet 10-minutters run ved 30 og 60 Hz har samme stage- og spawnbeslutninger inden for defineret tolerance; Level 4 kan ikke efterlade spillet i en dead-but-not-gameover-tilstand.

### Fase 2 — P0: mobil/PWA-livscyklus

1. Implementér P0-06 central pause/resume for orientation og visibility.
2. Implementér P0-07 ens cacheidentitet og cold-offline test.
3. Tilføj P1-09 safe playable frame og pointer ownership, fordi den samme lifecycle-/inputkode ændres her.

**Gate:** iPhone 15/SE-landscape, portrait rotation, multi-touch/cancellation, background/foreground og cold offline relaunch består i browser og installeret standalone, hvor platformen tillader det.

### Fase 3 — præfab- og effektfidelity

1. Indfør `PrefabDefinition` og flyt Level 3 parret til modellen som første referenceimplementering.
2. Implementér Level 1-varianter og Level 5 komplette pool på samme model; først derefter fjernes generiske branches.
3. Indfør layer-adapteren og korrigér L1/L3/L4/L5-komposition og animationstakt.
4. Portér power-up-art, mechanics og complete AudioDirector. Fokus’ allerede byggede state-maskine tilsluttes Chopin, music rate og gain.

**Gate:** Seedede pool-/range-tests, compound collision sweeps, golden-masters og asset-consumption tests passer. Level 5 indeholder ikke uautoriseret rainbow bob eller deaktiverede scene-lag.

### Fase 4 — resultater, progression og persistence

1. Introducér versioneret safe record store og lexicografisk comparator.
2. Rebygg ScoreBoard på 589×341 designgrid og safe game frame.
3. Genskab tre record-badges, levelkortets recordvisning og den valgte unlock-kontrakt.
4. Tilføj dead/retry/menu integrationstest med storage-fejl.

**Gate:** Resultatdata, levelmenu og persisted records er konsistente efter reload; small-landscape overlay har ingen overflow eller overlappende dynamiske værdier.

### Fase 5 — P2 hardening og sign-off

1. Del caches, tilføj readiness-/performancebudget.
2. Luk A11y-/modal-/reduced-motion-arbejdet.
3. Karantænisér/slet eller konsekvent dokumentér legacy-filer.
4. Kør fuld visual, gameplay, PWA og accessibility release-matrix.

## 7. Acceptance-checkliste

### A. P0 release-gate — skal alle være grønne

- [ ] Production `index.html` loader kun den autoritative runtime, og CI verificerer scriptgraphen.
- [ ] Bert har kontinuerligt fald uden idle-damping, symmetrisk OP/NED-nettoacceleration og neutral/hysteretisk midtzone.
- [ ] Physics-mål passer ved 120/60/30 Hz; Flappy-mode (`gravity=1750`, flap `-560`) er uændret.
- [ ] Sidste stage når og fastholder Unity target på alle levels; store deltas taber ikke stage-overskud.
- [ ] Scheduler bruger seeded `(.30+.25u)/D`, `720×S`, difficulty snapshot og ingen dynamisk gap-shrink.
- [ ] Focus har 2 s enter/exit, S=.7/D=1 temp-stage, frosset base-stage og påvirker world, parallax, spawn og bird-animation.
- [ ] Level 4 snake og vedtaget spider-hull har render-aligned fatal/near-miss E2E-tests og når altid normal game-over præcis én gang.
- [ ] Dead-state kan ikke ændre score, streak, tid eller power-up; game-over tegner ingen resterende gameplay-arrays.
- [ ] Portrait og visibility pauser simulation og musik, rydder input og genoptager uden tids-/positionshop.
- [ ] Offline cold relaunch efter service-worker-ready fungerer med præcis de URL’er, HTML’en bruger.

### B. Unity-faithful gate — alle P1-kontrakter

- [ ] L1-poolvægt 2:2:2:2:10, L4-pool 10:1 og L5-pool 2:2:2:3:3:3:3 bevises med seeded tests.
- [ ] Hvert prefab har original y-range, konstant authored opening, fælles pivot/render/collider-transform og specifikt point-/miss-node.
- [ ] L3 bruger fire authored pipe-collidere; L5 normal/reversed rainbow bruger separat 11-/12-punkts geometri; Happy Pipes har cap/shaft/farve/ansigt/miss-behaviour.
- [ ] Layer-asserts beviser `Enabled`, source, y, height, slack, tile-count og draw-order per level; deaktiverede L4/L5 lag tegnes ikke.
- [ ] Shield, Magnet og Focus bruger original pickup-art; ingen normal S/M/F placeholder er tilbage.
- [ ] Shield-count/forbrug/immunity, Magnet-radius/force/star-only-target, durations og ReadyAt-cooldowns følger data.
- [ ] Audio-matrix, Focus-Chopin/rate-fade, Shield-/Magnet-cues, death-fade og separeret master/music/SFX er afprøvet online og offline.
- [ ] Scoreboard har seks korrekte felter, tre uafhængige badges og responsiv action-art inden for safe 16:9-frame.
- [ ] Record store klarer tie-break, UTC-daily, korrupt data og storage-fejl; levelkortets data matcher game-over.
- [ ] Safe areas, active pointer ownership, cancellation og browser/standalone capability-fallback består på WebKit/iOS testmatrix.

### C. P2 kvalitetsgate

- [ ] Level 2 producerer ingen obstacles, collisioner eller falsk spawn-telemetry over 10 minutter.
- [ ] App shell kan installeres under throttling/begrænset lager; kritisk menu/level 1 er funktionsdygtig, og offline-ready er ikke vist før cache er valideret.
- [ ] HUD annoncerer ikke tids-/scoreændringer pr. frame; dialoger har korrekt fokus, Escape og returfokus; reduced motion omfatter canvas.
- [ ] Golden-master captures ved 1280×720, 852×393 og 667×375 er godkendt med kun aftalte variationstolerancer.
- [ ] Ingen test afhænger af ægte rAF-tælling eller tilfældig `Math.random`; hver regression kan reproduceres med seed og fake clock.

## 8. Testmatrix og ejerskab

| Testlag | Centrale tests | Hvorfor det er nødvendigt |
|---|---|---|
| **Pure unit** | StageEngine, interval/spacing, physics, record comparator, cooldown, state transitions. | Fastlåser matematik og forebygger frame-rate-afhængighed. |
| **Seeded integration** | Prefabpooler, ranges, transforms, collidere, score/miss, Focus, death/retry. | Beviser at data, renderer og gameplay bruger samme kontrakt. |
| **Browser E2E** | Jungle fatal/near-miss, game-over cleanup, score overlay, audio lifecycle, orientation/visibility, touch ownership. | Finder fejl mellem Canvas, DOM, media og input, som unit-tests ikke ser. |
| **Visual regression** | Menu/prewarm samt 5/15/30 s for fem levels; HUD-maskeret golden master. | Verificerer layer-composition, spritepivots, animationstakt og responsive sceneudtryk. |
| **PWA/device** | SW ready→offline restart, browser/standalone, iPhone safe areas, pointercancel, audio rejection/retry, throttled cache. | Verificerer de fejl, der specifikt rammer Chrome iOS/WebKit. |
| **Manual playtest** | 844×390 og 915×412 landscape; centerjitter; 0,2 s retningsskift; lange runs. | Bekræfter at kvantitativt korrekt adfærd også føles læsbar og fair. |

## 9. Risici og afhængigheder

| Risiko | Håndtering |
|---|---|
| Spider har ikke en autoritativ fatal Unity-collider. | Kræver en produktbeslutning før implementering: ikke-fatal Unity-paritet eller dokumenteret web body-hull. Testen må bruge den valgte kontrakt, ikke en skjult tilnærmelse. |
| PSD slices, Ferr2D-konturer og frame-pivots mangler som webdata. | Gør eksport til en reproducerbar asset-pipeline med metadata og hash; gæt ikke med nye browser-rects. |
| Browserens `playbackRate=0`/media-autoplay varierer. | Brug en dokumenteret HTMLAudio/Web Audio strategi, aktivér fra brugerhandling, og test rejection/retry på målplatformen. |
| Unitys Focus-exit har animator-ramp .6→1 mod aktiv .4. | Følg kildekoden for paritet, eller registrér en eksplicit, godkendt produktafvigelse i testen. |
| World→Canvas-normalisering kan kræve kalibrering ved andre frame-størrelser. | Fasthold relationen som konfiguration og valider med 16:9 safe frame; bland ikke device CSS-pixels direkte ind i world-simuleringen. |

## 10. Sporbarhed til detailaudits

| Område | Detailgrundlag | Centrale indarbejdede emner |
|---|---|---|
| Power-ups | [01-powerups.md](audit/01-powerups.md) | PSD-slices, effects, upgrades, charges, cooldowns. |
| Audio | [02-audio.md](audit/02-audio.md) | Musikmatrix, Focus/Chopin, Shield/Magnet cues, gain og cache. |
| Fysik/input | [03-physics.md](audit/03-physics.md) | Tyngde, net acceleration, hysterese og frame-rate-tests. |
| Obstacles | [04-obstacles.md](audit/04-obstacles.md) | Pools, transforms, collidere, Level 4 death-flow og spacing. |
| Resultater | [05-results.md](audit/05-results.md) | 589×341 grid, records, responsive action-art og cleanup. |
| Visuelle niveauer | Kondenseret auditmateriale for område 06 | Unity layer-data, L1/L4/L5 Enabled-fejl, animationsrater og Happy Pipes. |
| Systemer | [07-systems.md](audit/07-systems.md) | Stage engine, pacing, score/miss, death, persistence og unlocks. |
| Mobile/PWA | [08-mobile.md](audit/08-mobile.md) | Orientation, SW cacheidentitet, safe areas, lifecycle og accessibility. |

## 11. Konklusion

Den korteste vej til en stabil og troværdig Bert The Bird-webudgave er **ikke** at rette hver visuel afvigelse isoleret. Først skal runtime, stage-/spawn-matematik, lifecycle og transformkontrakter gøres fælles og testbare. Derefter kan de allerede tilgængelige Unity-assets og -data bruges korrekt til præfaber, power-ups, lyd og lag. 

Når P0-gaten passerer, vil spillet være retfærdigt, terminalt korrekt og PWA-pålideligt. Når P1-gaten passerer, vil det også være rimeligt at betegne webudgaven som Unity-faithful. P2 reducerer derefter release-risiko og vedligeholdelsesomkostning uden at ændre de fastlåste mekaniske kontrakter.

## 12. Implementeringsstatus efter auditten

Efter den read-only audit blev følgende rettet i den aktive runtime og testet i WebKit med Chrome-iOS user agent:

- **P0-01:** tungere, symmetrisk OP/NED-fysik uden idle-damping samt neutral midtzone og aktiv pointer-ejerskab. Efter device-feedback er touchaksen ændret til **venstre side = OP / højre side = NED**; zonerne vises kun i tutorialen.
- **P0-02:** testbar stage-/pacingmodel med færdig sidste stage og `720 × speed`. Efter reel iPhone-feedback bruges Unitys `0,30–0,55 / difficulty` som tidsgrundlag, men med en faktisk, kontinuerligt kontrolleret canvas-afstand på 620–760 px mellem obstacle-grupper; det gælder også gennem Focus-fartskift.
- **P0-03:** Focus-state-maskine med 2 s fade, S=0,7/D=1, frosset stage-ur og den originale Chopin-musik i iOS-sikker MP3-stream.
- **P0-04:** dokumenteret, render-aligned body-hull for både spider og snake; begge når det fælles death/result-flow.
- **P0-05:** scoring/interaktion fryser ved død, og alle gameplay-arrays ryddes før resultattavlen.
- **P0-06:** portrait pauser simulation, input og aktiv lyd; landscape genoptager uden delta-hop.
- **P0-07:** HTML og service-worker bruger identiske versions-URL'er, og nye scripts, powerup-assets, lyde og klassisk musik er med i offline-cachen.
- **P1-05 delvist:** bogstavcirkler er erstattet af originale Shield/Magnet/Focus-sprites, vinger, glows, lightning, cooldowns og originale effektlyde. Shop-upgrades/alle partikelprefabs udestår.
- **P1-07 delvist:** resultattavlen bruger nu seks felter i 589×341-grid, `{score, streak, time}`-records og responsivt originalt action-art. Separate badges/daily records udestår.
- **P1-09 delvist:** aktiv pointer, cancel/lost-capture/blur/pagehide/visibility cleanup er implementeret.

Automatisk godkendt:

```text
node tests/physics.test.js
node tests/progression.test.js
node tests/collision.test.js
python3 tests/ios_webkit_acceptance.py
python3 tests/fidelity_p0_acceptance.py
```

De største tilbageværende fidelity-områder er nu de fulde Level 1-prefabformer/Ferr2D-polygone, Level 3-authored pipe-transform, Level 5's komplette Happy Pipe-pool, Unity layer-adapteren, den fulde musikmatrix og shop-/unlock-/daily-record-systemerne.

### Reel iPhone-korrektion efter P0

Efterfølgende device-tests viste frame-hak og for tæt cadence — især under Focus. Builden bruger nu minimumsafstandene Desert 760 px, Flappy 700 px, Jungle 620 px og Happy Sky 680 px, større Desert-/Flappy-passager og en runtime-guard, der måler den faktiske afstand på canvas før hver spawn. En 60-sekunders WebKit-run og en særskilt Focus-run holder begge højst tre obstacle-grupper med målt minimumsafstand ca. **764 px**. HUD-tekst ændres kun, når værdien reelt skifter, HUD'en er ikke længere en per-frame live-region, og dyre CSS `filter`/`backdrop-filter`-effekter er fjernet fra det kontinuerligt animerede canvas og gameplay-HUD. Kontrolhjælpen findes kun i tutorialen og fjernes helt under aktivt spil. Original `Level1.wav` bruges som en 1,3 MiB MP3-stream i stedet for den 11,35 MiB store WAV-fil. Service worker v3 genindlæser desuden automatisk en gammel installeret build én gang, så gamle pacing-scripts ikke fortsætter på iOS.

### Jungle-capture og frame-pacing milepæl

Den efterfølgende Jungle-gennemgang bekræftede, at Unity-kilden indeholder specialiserede dødsanimationer, som ikke tidligere var porteret. Browserbuilden eksporterer og bruger nu hele spider-`Catch`-sekvensen på 18 frames, snake-`Jump`-sekvensen og snake-`catch_complete`-sekvensen på tre frames. Spider og snake har telegrapherede angreb med render-aligned colliders; ved træf skjules den almindelige Bert-sprite, og fjendens originale capture-art afspilles før resultatskærmen.

Samtidig er simulationen flyttet til faste 60 Hz-trin med højst tre catch-up-trin pr. frame, canvas-præsentationen er begrænset til 60 Hz, og resize nulstiller ikke længere backing store uden grund. Menuen dekoder 15 fælles canvas-assets plus Berts delte animation; level-specifikke billeder indlæses ved valg af bane. WebKit-acceptance dækker nu spider-lunge, snake-jump, begge specialiserede death flows og on-demand Jungle-loading.

Den prioriterede produkt- og levelplan findes i [QUICK_WINS_ROADMAP.md](QUICK_WINS_ROADMAP.md).
