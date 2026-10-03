# Design-audit: Bert the Bird

- **Baseline:** `wind-birds-2`
- **Dato:** 2026-10-02
- **Metode:** Headless WebKit, screenshot-gennemgang
- **Omfang:** 13 uafhængige scenevurderinger ved 852x393 og 667x375

> Denne audit er en visuel baseline fra headless WebKit. Den er **ikke** en fysisk mobiltest og **ikke** en gameplay-balancetest. Den dokumenterer kun det, der er synligt i de leverede stillbilleder: komposition, beskæring, kontrast, læsbarhed, lagdeling og visuel kollisionslæsbarhed. Den beviser ikke touchmål, faktisk kollisionsgeometri, frame rate, animation, timing eller rendering på en konkret telefon.

## Kort konklusion

Spillet har en sammenhængende, børnevenlig Unity-illustrationsstil med tydelige primærfigurer, brugbare store scoreværdier og genkendelige banetemaer. Den største fælles forbedringsmulighed er ikke selve kunstretningen, men visuel afkodning: en scoreboks med en tæt påsat sceneetiket, meget små labels og enkelte mørke eller delvist skjulte forhindringskanter. **De mørke sidefelter ved 852x393 er tilsigtet:** den centrale 16:9-scene holdes skarp, mens 667x375 næsten er 16:9 og derfor fylder telefonen. De er ikke en ny P1-fejl, og vi skal ikke strække sprites for at fjerne dem.

Den første reparationsrunde bør fokusere på en lille oprydning af HUD-afstande, vindvisningen ved flaget og målrettet kontrol af, om en faktisk farlig silhuet skjules af forgrund. Spiltilstande, centralkamera, sceneindhold og eksisterende Unity-assets bevares.

## Billedeksempler fra 667×375 iPhone WebKit

| Situation | Før (`wind-birds-2`) | Efter (`design-waves-3`) |
|---|---|---|
| Låste Classic-kort: baggrund dæmpes, tekst forbliver skarp | [Banevælger før](design-audit/levels-before-667.png) | [Banevælger efter](design-audit/levels-after-667.png) |
| Stormline: barometeret flyttes ned ved flaget | [Vindscene før](design-audit/stormline-before-667.png) | [Vindscene efter](design-audit/stormline-after-667.png) |

[Bird Run: seks synlige, forskudte fugle i én bølge](design-audit/bird-wave-six-667.png). Dette er et QA-snapshot af en sen seedet bølge, ikke et bevis for hvor svær banen føles på en fysisk telefon.

## Auditstatus og prioritering

| Prioritet | Antal fund | Betydning | Status |
|---|---:|---|---|
| P0 | 0 | Blokerende visuel fejl | Ingen P0-fund |
| P1 | 25 rå observationer | Markerede screenshot-hypoteser, **ikke** 25 verificerede produktfejl | Triage nedenfor før kodning |
| P2 | 32 rå observationer | Også hypoteser; ikke alle bør ændres | Brug kun når årsag og gevinst er efterprøvet |

**Fejlede scener:** Ingen. Alle 13 angivne scener har et screenshot-grundlag og er med i auditten.

De automatiske delvurderinger brugte uens skalaer og er derfor ikke en meningsfuld samlet score. Rapporten bruger de konkrete screenshot-fund, designkontraktens triage og efterfølgende målbare tests i stedet.

### Kritisk triage efter review af de faktiske billeder og projektets designkontrakt

| Vurdering | Konkrete forhold | Handling |
|---|---|---|
| Bekræftet forbedringsmulighed | På 667px er scoreplade og sceneetiket næsten sammenfaldende; små statuslabels kræver mere luft. Stormlines gamle rektangulære vindpanel sidder langt fra bundflaget. De låste banekort brugte et CSS-filter på **hele kortet**, hvilket også nedtonede deres tekst og tal. | Lille fælles HUD-gap og større minimumslabels; flyt vindstatus tæt ved bundflaget uden ekstra panel; ton **kun kortets thumbnail**, ikke dets forklaring. |
| Bør testes i bevægelse og mod hitboxes | Nederste Happy Sky-rør går visuelt bag en sky; Jungle-edderkoppen ligger tæt på top-HUD/mørkt løv; nogle tunnelkanter og EDM-højttaleren konkurrerer med detaljeret baggrund. | Sammenlign faktisk tegnet kollider og indflyvning på mobil, før sprite eller dybderækkefølge ændres. Skyforgrund må gerne skjule Bert ved kanten, men aldrig skjule en beslutningskritisk fare. |
| **Tilsigtet, ikke fejl** | Mørke 16:9-sidefelter på ultrabrede iPhones, rør der fortsætter ud over top/bund som del af banen, en stjerne netop på vej ind fra højre, dramatisk delvist afskåret menukunst. | Bevar. Stræk ikke scenen, klip ikke aktive rørkollidere eller vent med at tegne en stjerne til den er fuldt inde; det ville snarere skabe visuelle/tekniske mismatch. |

De automatisk indsamlede P1-/P2-tabeller nedenfor dokumenterer **rå visuelle observationer** fra snapshot-øjeblikke. De er ikke en to-do-liste der skal implementeres mekanisk. Særligt alle forslag om at fjerne sidefelter, vise hele rør inden for viewport eller holde indflyvende stjerner helt inde skal læses som **afvist efter triage**.

## Hvad der bør bevares

- **Kunstretningen.** Ørkener, jungle, skyer, bysilhuetter, tunneler og Neon Encore har hver sin genkendelige sceneidentitet, men deler en sammenhængende Unity-/pixel-art-nær assetstil.
- **Primære fokuspunkter.** Den røde Bert-sprite og de gule stjerner kan normalt findes hurtigt mod baggrunden. Det gælder især i desert, jungle, flappy-bert, tunnel-scenerne, neon-encore og stormline.
- **HUD-princippet.** PAUSE er isoleret, mens SCORE, STREAK og TID samles i en mørk afrundet plade med store, kontraststærke værdier. Det fungerer godt som basis.
- **Menuens grundhierarki.** Bert-logoet, den centrale Play-knap, Quick Play og den mørke scoreboks har tydelige roller. Banevælgerens tre modefaner og tre kolonner er også lette at forstå.
- **Store handlingselementer.** De centrale knapper og de grundlæggende baneåbninger er generelt store nok til at kunne afkodes visuelt af børn.
- **16:9 som intern spilkomposition.** Billederne viser ikke behov for at strække scenekunst. Bevar kameraets 16:9-komposition og standardisér i stedet den ydre præsentation.
- **Lagdeling.** Skyer, skyline, vegetation, terræn og forgrund skaber ofte god dybde. Det er især stærkt i jungle, flappy-bert, sky-shift, neon-encore og stormline.

## Tværgående hovedfund

### 1. Tilsigtet aspektforskel mellem 852x393 og 667x375

I menu, desert, flappy-bert, star-stream, pulse-tunnel og stormline er sidefelter et P1-fund. Jungle, tower-mix, neon-encore og bird-run har samme mønster som P2. I 852x393 ligger den synlige 16:9-spilflade ofte omtrent mellem x=77 og x=775, mens 667x375 næsten fylder hele billedbredden.

Det er korrekt aspect-fit for spillets faste 16:9-layout, ikke en uens kameraindstilling. Der er derfor **ingen viewportrettelse** i denne runde. En senere separat grafisk idé kan undersøge en rolig, ikke-interaktiv farvning af ydre matte; den må ikke ændre kamerabredde eller collisionkoordinater. Den eksisterende regel er:

- HUD og gameplay forankres til den indre 16:9-safe frame.
- Sidefelter bliver en bevidst matte eller en fortsættelse af den relevante baggrund, ikke tilsyneladende ubrugt plads.
- Samme camera crop og fokusafstand bruges i begge capture-formater.

### 2. Top-HUD og mode-/event-pille danner gentagne "boks mod boks"-sammenstød

Den store SCORE/STREAK/TID-boks har en god grundform, men en smal mode- eller event-pille ligger i flere scener direkte under, op ad eller delvist inde i dens visuelle fodaftryk. Det er synligt i desert, jungle, happy-sky, tunnel-training, neon-encore og stormline. I sky-shift ligger et rør desuden for tæt på HUD'en.

Problemet er et gentaget layoutmønster, ikke et problem med boksstilen. Bevar de mørke, afrundede plader, men fastlæg en fælles top-safe zone med en lille konsekvent afstand mellem:

1. HUD-pladens bundkant.
2. Mode-/event-pillens topkant.
3. Det første gameplay-objekt i topområdet.

En lille lodret afstand eller en lidt mindre HUD-højde er nok. Ingen nye paneltyper er nødvendige.

### 3. Små uppercase-labels mister læsbarhed før de store tal gør

Mønstret går igen i menuens sekundærtekst og bane-tiles, desert, flappy-bert, tower-mix, star-stream, pulse-tunnel, neon-encore, bird-run og stormline. SCORE, STREAK, TID, mode-/event-tekst, vindstatus og små progressionstekster bruger ofte kompakte versaler i meget mindre størrelse end de numeriske værdier.

Den lille rettelse er konsekvent på tværs af systemet:

- Øg kun den mindste labeltekst lidt, eller giv den mere tracking og indvendig luft.
- Hold den eksisterende fontkarakter, mørke plader og den stærke prioritet på talværdier.
- Giv menu-tiles en ensartet mørk statusplade eller mere tekstkontrast på mørke billeder.

### 4. Kollisionslæsbarhed svækkes af beskæring, overlap og mørke kanter

Flere fund handler om, hvad billedet kommunikerer som sikker eller farlig grænse, ikke om den faktiske kollisionskode:

- Spindlen er beskåret og filtrer sig visuelt sammen med grenene i jungle.
- Rør er afskåret ved top/bund i happy-sky, flappy-bert, tower-mix og delvist sky-shift.
- I desert læses platformens åbning og topgrænse uklart mod sandlagene.
- I tower-mix fortsætter bundrøret visuelt ind under jordkanten.
- I tunnel-training og star-stream mangler de mørke banegrænser luminansadskillelse.
- I pulse-tunnel ligger Bert tæt på den øvre linje, og en stjerne ligger for tæt på samme kant.
- I neon-encore er højttalerboksen og baggrundsstrålerne vanskelige at skelne fra gameplayrelevante elementer.
- I bird-run er en stjerne skåret ved højre kant, og det viste øjeblik har ingen synlig kollisionsreference.

Den gennemgående regel bør være: Et aktivt mål eller en forhindring skal have en hel, rolig og entydig silhuet inden for safe area. Små highlights, kontrastkanter, z-order-justeringer og få pixels ekstra afstand er mere passende end nye indikatorer eller redesign.

### 5. Mørke, detaljerede forgrunde kan skjule grænser

Jungle-græsset, tunnel-training, star-stream, pulse-tunnel, neon-encore og stormline har områder, hvor flere mørke lag ligger tæt i luminans. Det giver stemning og dybde, men kan gøre banegrænser, højttalerobjekt, lavtliggende genstande og forgrundssilhuetter svære at aflæse hurtigt.

Bevar paletten og dybden. Justér kun ét nærliggende tone-trin på aktive kanter eller adskil ét forgrundslag med en diskret, eksisterende-style outline. Der er ikke belæg for at lysne hele scenen.

### 6. Fokal konkurrence og for tætte collectibles

Nogle stjerner konkurrerer med det, spilleren først skal læse: desert har samtidig rød fugl og kraftig gul stjerne, sky-shift har stjerne tæt ved nederste rør, tunnel-training har seks stjerner som én glødende masse, star-stream presser kæden mod højre safe area, og pulse-tunnel placerer en stjerne ved den øvre kant.

Retningen er den samme i alle tilfælde: behold stjerne-assets og samleruten, men flyt, adskil eller dæmp glow marginalt. Spillerfigurens frie passage skal læses før samlegenstanden.

## Rå P1-observationer fra billedkritik (se triage før enhver rettelse)

| Scene | Fund | Screenshot-begrundelse | Lille rettelse |
|---|---|---|---|
| Menu | Uens bred framing | 852x393 har mørke sidefelter; 667x375 fylder bredden | Lås layout til den indre 16:9-flade og brug konsekvent ydre matte/baggrund. |
| Menu | Uklart aktivt modefokus | Aktiv fane er grønfyldt, mens en anden fane også har stærk grøn kontur | Én grøn aktivstil; samme rolige kontur på alle ikke-aktive faner. |
| Menu | Små statusmærker i tiles | "0/3 BANER", "REKORD" og korte undertekster forsvinder delvist mod mørke thumbnails | Lidt større minimumstekst og ensartet mørk statusplade. |
| Desert | Uens bred framing | 852x393 viser sidebånd; 667x375 gør ikke | Brug samme aspect-fit/letterbox-regel og camera crop. |
| Desert | Platformens højrekant virker påsat | Tung mørk kontur og abrupt lodret afslutning mod sand | Blødgør kun ydre søm med lille sandtonet overgang/skygge. |
| Desert | Uklar sikker platformgrænse | Flere beige sandlag og ingen stabil topkollisionslinje | Diskret top-highlight eller kontaktskygge på platformens læsbare kontur. |
| Jungle | Spindel beskåret i top | Øverste krops-/bendetal rammer viewportkanten | Flyt spindlen få pixels ned eller tilføj top-safe margin. |
| Jungle | Spindelsilhuet filtrer sig sammen | Sorte ben møder mørk baldakin, gren og løv | Placér mod roligere baggrundsfelt eller tilføj meget lille kontrastadskillelse. |
| Happy-sky | Nedre rør skjules af forreste skylag | Kun top og smal øjendel ses | Læg forreste sky bag røret, så rørets silhuet er ubrudt. |
| Happy-sky | Rør er hårdt beskåret i top og bund | Begge rør fortsætter uden for viewporten | Justér framing få pixels, så relevante afrundinger aflæses mindre abrupt. |
| Flappy-bert | Uens bred framing | 852x393 har sidefelter; 667x375 går til kant | Fastlæg samme viewport- og matte-princip. |
| Flappy-bert | Toprør er beskåret | Kun rørmunding og skaft er synlige | Vis en lille konsekvent topafslutning eller margin. |
| Sky-shift | Toprør møder HUD | Rør ligger under eller helt op ad HUD-pladens højre side | Indfør fast fri margin mellem HUD og gameplayrør. |
| Tower-mix | Bundrør fortsætter ind i bundstribe | Røret går over grøn jordkant og ned i beige område | Maskér røret ved spillefeltsbund eller justér rør-/jordafslutning. |
| Tunnel-training | Mørke terrænlag skjuler banegrænser | Jord, palmer, skyline og pyramide ligger tæt i luminans | Adskil kun aktive kollisionskanter med ét nærliggende tonetrin. |
| Tunnel-training | Seks stjerner læses som én masse | Tæt 3x2-klynge med overlappende glow | Giv hver stjerne få pixels mere luft eller mindre glow. |
| Star-stream | Uens bred framing | 852x393 har sidefelter; 667x375 er kant-til-kant | Standardisér safe frame og HUD-ankring. |
| Star-stream | Mørke lag flyder sammen | By, træer, bjerg og terræn er næsten samme brun/sort | Løft eller sænk kontrasten på ét lag eller en aktiv kant. |
| Star-stream | Stjernekæde presses mod højre | Yderste stjerner og glow ligger tæt på kanten i 667x375 | Skub eller skalér kæden lidt ind i safe area. |
| Pulse-tunnel | Uens bred framing | 852x393 har tydelig 16:9-ramme med sidefelter | Gør matte og viewport-ankring eksplicit og ens. |
| Pulse-tunnel | Bert ligger tæt på øvre tunnelkant | Sprite og magenta linje læses næsten som ét objekt | Skab få pixels luft eller en lille stilpasset kontrastkant om Bert. |
| Neon-encore | Højttalerens objektgrænse er svag | Cyanindrammet boks falder sammen med publikum og scenegulv | Giv kun boksen en mere ensartet ydre kant eller rolig lokal kontrastplade. |
| Neon-encore | Kabler/lysstråler kan forveksles med gameplay | Tynde diagonaler og transparente stråler krydser fuglens luftområde | Dæmp baggrundsstråler/kabler lidt omkring spilleområdet. |
| Bird-run | Collectible er beskåret i højre kant | Kun en smal del af gul stjerne ses | Hold stjernen helt inden for safe margin, før den er interaktiv. |
| Bird-run | Ingen synlig kollisionsreference i frame | To fugle flyver over åben himmel uden kontrastgeometri | Sørg for, at repræsentative testframes viser eksisterende geometri med tydelig silhuet. |
| Stormline | Uens bred framing | 852x393 har sidegutter; 667x375 fylder bredden | Forankr HUD til 16:9-viewportet og brug ens letterbox. |
| Stormline | Vindpanel er for småt | "VIND · BRISE", "MEDVIND" og indikatorer er langt mindre end score/tid | Forstør tekst/indikatorer lidt eller saml dem i ét større vindikon med kort label. |

## P2: polering efter P1

| Scene | P2-fund og anbefalet lille rettelse |
|---|---|
| Menu | Flyt eller minimér Bert en anelse, så venstre/nederste silhuet ikke ligner utilsigtet klipning. Giv mørke tile-navne tekstskygge eller gradient. Øg lidt luft/kontrast om sekundære labels og forankr Leaderboards tydeligere til scoreboksen. |
| Desert | Skab få pixels luft mellem central HUD og "CLASS 1 · DESERT". Dæmp stjernens glow lidt, så fuglen er første fokus. Giv små labels lidt mere vandret luft. |
| Jungle | Tæm kun den nederste græsstribes tæthed eller kontrast. Skil HUD og "CLASSIC 2 · JUNGLE" lidt ad. Gør sidefelter bevidste uden strækning. |
| Happy-sky | Skil SCORE/STREAK/TID-pladen og "CLASSIC 3 · HAPPY SKY" ad med lidt mere lodret luft. |
| Flappy-bert | Øg HUD- og baneetikettekst minimalt i 667x375. Tilføj en diskret kant på rørmundingen, så kontaktgrænsen aflæses hurtigere. |
| Sky-shift | Flyt stjernen nogle få pixels fra nederste rør eller giv den en lille kontrastkant. Harmonér Bert-kontur med baggrunden gennem let farvetilpasning eller lokal skygge, uden at svække silhuetten. |
| Tower-mix | Giv toprøret en ensartet topgrænse eller lille margin. Gør sidefelter konsekvente. Øg små HUD-labels, men behold de store værdier uændret. |
| Tunnel-training | Skil navn-pille og HUD med 2-4 pixels. Styrk kun de eksisterende cyan-grænser eller ét diskret perspektivmotiv, så rummet læses bedre. |
| Star-stream | Øg små HUD-/pillelabels let. Rens Bert-spriteets hårde mørke kant med en asset-kompatibel udjævning eller matching outline. |
| Pulse-tunnel | Adskil by- og trælag med en svag toneforskel. Gør gule dash-markører lidt tykkere eller giv dem svag mørk halo. Flyt øvre højre stjerne lidt ind eller dæmp dens glow. |
| Neon-encore | Giv eventteksten en lille størrelses- eller paddingforbedring. Gør sidefelter bevidste, hvis de findes i den faktiske visning. |
| Bird-run | Ram aktive fugle en anelse mere centralt/større i den åbne scene. Øg event-pillens label lidt. Brug samme 16:9-sidefyld på begge størrelser. |
| Stormline | Tilpas sprite-outlines en anelse til den blødere baggrund. Adskil den nedre venstre stribede genstand fra mørke skyer med en tynd stilpasset rim. Giv eventstrippen luft i forhold til scoreboksen. |

## Gentagelser i kasser, bokse og paneler

### Det der fungerer

- Mørke, afrundede bokse med lyse tal passer til spillets øvrige grafik.
- SCORE/STREAK/TID har korrekt prioritet over deres labeltekst.
- PAUSE er separat og let at finde.
- Mode-/event-pillen gør scenens navn og tilstand tydelig, når den får luft.

### Det der skal standardiseres

| Gentagelse | Berørte steder | Konsekvens | Fælles rettelse |
|---|---|---|---|
| Stor HUD-boks direkte over smal pille | Desert, jungle, happy-sky, tunnel-training, neon-encore, stormline; beslægtet konflikt i sky-shift | To tunge rammer læses som et sammenstød og optager unødigt topareal | Definér fælles lodret gap, samme kantrelation og top-safe zone. |
| Meget små versal-labels i mørke bokse | Gameplay-HUD, mode-/event-piller, vindpanel og menu-tiles | Tal er læsbare, men kontekstteksten går tabt på 667x375 | Fastsæt en minimumsstørrelse, lidt mere tracking/padding og tilstrækkelig kontrast. |
| Aspect-fit ser forskelligt ud på to telefonforhold | 852x393 har matte, 667x375 næsten ingen | Forventet for fast 16:9-scene; **ikke en fejl** | Bevar den indre 16:9-frame og mørke ydre felter; lad være med at strække gameplay. |
| Mørke plader oven på allerede mørke scener | Tunnel-scener, neon-encore, stormline | Konturer kan forsvinde i scenen eller konkurrere med forgrund | Behold pladerne, men brug rolig backing/kontrast omkring aktive gameplay-objekter, ikke flere bokse. |

## Realistisk lille reparationsrækkefølge

Rækkefølgen forudsætter små, afgrænsede layout- og assetlag-ændringer. Den omskriver ikke spillet, ændrer ikke spilformer og ændrer ikke banernes grundlæggende gameplay.

### 1. Bevar den allerede fastlåste viewport- og safe-area-kontrakt

- 16:9-scenen er allerede låst internt; 852x393 er bredere end 16:9, mens 667x375 næsten passer præcis. Denne forskel i synlig matte er derfor korrekt.
- Bevar HUD, collectibles og collisionforankring til den indre scene.
- Eventuel senere dekorativ sidefarve må ikke ændre spilgeometri eller læsbarhed og er ikke nødvendig i denne release.

**Forventet effekt:** Ingen kodeændring; forhindrer at en automatisk visuel kritik skaber en reel regressionsfejl.

### 2. Oprydning af fælles top-HUD

- Indfør en lille fast afstand mellem SCORE/STREAK/TID-boks, mode-/event-pille og første gameplayobjekt.
- Gør minimumsstørrelse, tracking og padding for små labels ens.
- Forstør kun vindpanelets tekst/indikatorer nok til hurtig afkodning.

**Forventet effekt:** Fjerner de fleste boks-sammenstød og løfter læsbarheden uden at ændre informationsarkitekturen.

### 3. Verificér kollisionslæsbarhed før yderligere sceneændringer

- Film og sammenlign den tegnede fare og dens faktiske collider omkring Happy Sky-skyen, Jungle-spindlen og EDM-højttaleren.
- Rør må fortsætte ud af viewporten, stjerner må komme ind fra højre, og forgrund må skjule Bert ved kanten: de er ikke i sig selv fejl. Kun en beslutningskritisk skjult fare skal ændres.
- Flyt kun verificeret uklare objekter få pixels, eller giv dem en beskeden, stilpasset kontrastkant.

**Forventet effekt:** Bedre visuel forståelse af fri passage og farlige grænser, uden påstand om eller ændring af faktisk kollisionslogik.

### 4. Kontrast- og glow-pass på mørke scener

- Adskil aktive banegrænser fra mørke baggrundslag i tunnel-training, star-stream og pulse-tunnel.
- Spred eller dæmp overlappende stjerneglow i tunnel-training, star-stream, sky-shift og pulse-tunnel.
- Dæmp kun baggrundsstråler og kabler lokalt i neon-encore.

**Forventet effekt:** Fjerner visuel støj med små farve-/lagjusteringer og bevarer scenestemningen.

### 5. Screenshot-regression og enhedstest

- Fang samme repræsentative menu- og gameplaytilstande i både 852x393 og 667x375.
- Kontroller at faresilhuetter, aktive UI-plader og collidere stemmer; tilsigtede ind-/udgange ved billedkanter accepteres.
- Sammenlign specifikt afstand mellem HUD, pillen og nærmeste baneobjekt.
- Kør derefter separat fysisk mobiltest for touch, scrolling/skalering, animation og faktisk collision. Den test ligger uden for denne audit.

## Sceneoversigt

| Scene | Rå P1-observationer | Rå P2-observationer | Styrker, der bevares |
|---|---:|---:|---|
| Menu | 3 | 3 | Klart Play-hierarki, store handlinger, samlet banevælger. |
| Desert | 3 | 3 | Sammenhængende ørkenscene, synlig rød fugl, forståelig HUD. |
| Jungle | 2 | 3 | God dybde i vegetation, genkendelige farvefokuspunkter. |
| Happy-sky | 2 | 1 | Ren sky-dybde, aflæselig Bert/stjerne/rør-stil. |
| Flappy-bert | 2 | 2 | Klar lagdeling og tydelig passage mellem rør. |
| Sky-shift | 1 | 2 | Tydelige røråbninger, samlet top-HUD og høj fuglekontrast. |
| Tower-mix | 1 | 3 | Tydelig spiller/stjerne/rør, stærke scoreværdier. |
| Tunnel-training | 2 | 2 | Sammenhængende pixel-art og klar HUD-struktur. |
| Star-stream | 3 | 2 | Høj kontrast på Bert og stjerner; konsekvent tunnelstil. |
| Pulse-tunnel | 2 | 3 | Magenta kanter, stærk kontrast på Bert og stjerner. |
| Neon-encore | 2 | 2 | Tydelig scenedybde, gode primærfokuspunkter og læsbare store tal. |
| Bird-run | 2 | 3 | Klar HUD, genkendelige fuglesilhuetter og rolige skylag. |
| Stormline | 2 | 3 | Stærk fugl-/flysprite-hierarki og atmosfærisk dybde. |

## Afgrænsning

Auditten bygger på 13 screenshot-begrundede scenevurderinger af baseline `wind-birds-2`. De rå agentvurderinger ændrede ikke spillet. **Efter auditten** er HUD-luft, vindbarometer og afgrænsede eventsværhedsprototyper implementeret separat i `design-waves-3`; det ændrer ikke, hvad de oprindelige stillbilleder kunne bevise. Hverken screenshot-audit eller headless-regression dokumenterer fysisk mobilkvalitet eller balance i selve spillet.

## Opfølgning i `design-waves-3`

| Fund / ønske | Målrettet ændring | Verifikation / begrænsning |
|---|---|---|
| Scoreboks og mode-/eventpille for tæt; meget lille statuslabel | Ensartet få-pixels gap og lidt større minimumslabels i alle gameplayscener | WebKit-billeder på 667x375 og 852x393; ingen ny HUD-boks. |
| Låste kort blev grå/svage helt ind i teksten | Filter nu kun på bane-preview; korttitel, tal og pop-up-kravlabel er skarpe; låst ramme er stadig dæmpet, så den valgte bane ikke forveksles med låste kort | De tre banefaner og kortene screen-captures i begge størrelser; beregnet CSS-filter og minimumsskriftstørrelse måles separat. |
| Vindens styrke langt fra det nederste flag | Eksisterende barometertekst, pil og tre prikker flyttet ned ved samme flag, uden mørk rektangulær topkasse | Begge iPhone-størrelser: brise, storm, orkan og nulvind; flag, blade, kraft og pil følger samme cue. |
| Bird Run for få fugle | Seedede, forskudte frontbølger stiger fra 1 til 2, 3, 4, 5 og maks. 6 på skærmen. Nabofugle får forskellige arter. Varslede bagfra-/rovfugle er solo; en stjerne først efter bølgen. | WebKit måler 2–6 reelt synlige fugle på to telefonstørrelser; unit-kontrol kræver én collider ad gangen i Berts x-bånd og åbne top-/bundruter. Tæthed er ikke det samme som bevist sværhedsgrad; kant-camping kan stadig virke. |
| Stormline for mange tomme mellemrum | Mere varierede højder og en lidt kortere, men stadig kontrolleret ventetid efter forrige fare/stjerne | Eksisterende vind-/pickup-tests og billedtest; spilbalancen skal vurderes med fingre på fysisk telefon. |
