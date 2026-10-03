# Bert The Bird — markedslighed og styringsvurdering 2026

**Nej: På det gennemgåede marked fremstår Bert The Bird ikke som en 1:1-kopi.** Bert deler en velkendt mobil-arkadekerne med andre spil — vandret fremdrift, højdekontrol, forhindringer og korte highscore-runs — men det er fælles genremekanik, ikke i sig selv et produktudtryk. Den nærmeste umiddelbare association er **Flappy Bird**, men især for Berts Flappy-spilform; for Classic og Tunnel er Bert væsentligt længere fra Flappys enkelt-tap-loop. Navn, figur, verdener, styring, banestruktur og helhedsindtryk skiller produkterne ad. [1] [2]

Dette er en **afgrænset markedsvurdering**, ikke et udtømmende fraværsbevis, en clearance eller en juridisk vurdering. Den bygger kun på de angivne, verificerede spilfund, en fokuseret søgning efter lignende styring og projektets egne filer. Den kan derfor hverken fastslå, at ingen anden titel bruger samme styring, eller erklære Berts idé “først”, beskyttelig eller risikofri.

## Hvad der faktisk er dokumenteret i Bert

Den bevarede Unity-kode viser allerede en klar forskel mellem to kontrolmodeller. I standardtilstand giver holdt venstre museområde opadgående kraft, mens holdt højre museområde giver nedadgående kraft; piletasterne er desktop-alternativer. `BertTheBird/Assets/Scripts/BirdController.cs:133–159`. I Flappy-tilstand udløser ét klik eller et tryk på op-pilen derimod et opadgående impuls-hop. `BertTheBird/Assets/Scripts/BirdController.cs:87–99`. Det er vigtigt: den gamle Unity-kode havde altså ikke én universel “Flappy”-styring.

Den aktuelle browserudgave omsætter standardprincippet til touch i en fast **16:9-landskabsscene**. Pointerens X-position normaliseres til en scene på 1280 × 720; `setTouchDirection` sætter OP til venstre for midten minus 4 % af bredden og NED til højre for midten plus 4 %. Midterfeltet er derfor neutralt, og et løftet touch nulstiller begge retninger. `webapp/unity-faithful.js:2790–2815`. Projektplanen beskriver tilsvarende venstre=OP, højre=NED, synlige zoner kun i start/tutorial og portrait-pause. `DEVELOPMENT_PLAN.md:33–36`.

Unity-mappen indeholder `BirdController.cs.meta` og `Game.unity.meta` dateret **14. marts 2014**; selve den bevarede `BirdController.cs` har ændringstid **12. maj 2017**. Metadata er **ikke** bevis for, at præcis denne udgave af styringen fandtes allerede i marts 2014. Den tilgængelige projektkopi har ingen historisk kildekodeversion, der daterer kontrolvalget præcist. Den dokumenterer, at det var en del af det ældre Unity-projekt — ikke, hvornår reglen første gang blev skrevet.

Bert har i browserudgaven tre scorebare familier med tre baner hver, altså ni ranked baner, samt seedede vennedueller med transparent ghost. `docs/GAME_DESIGN_SOCIAL_ROADMAP.md:7–40`; `DEVELOPMENT_PLAN.md:28–34, 48`. **Bird Hour må ikke bruges som nuværende markedsdifferentiering:** det er et foreslået, ikke implementeret eventkoncept; den eksisterende Neon Encore er én separat testevent. `docs/JETPACK_COMPARISON_AND_WORLD_ROADMAP.md:3, 36, 76–86, 118–135`.

## Hvad ligner Bert mest?

Nedenstående er en **arbejdsrangering af samlet produktlighed**, ikke en lighedstest af enkeltbilleder og ikke en juridisk konklusion. Den vægter de funktioner, en spiller sandsynligvis ser: figurtype, run-loop, styring, forhindringer, progression og visuel/brandmæssig helhed.

1. **Flappy Bird** er nærmest samlet set, men primært mod Berts Flappy-familie: fugl, vandret forhindringsbane og tap-/timingfærdighed giver en reel, umiddelbar genreassociation. Den officielle relancering beskriver Classic og Quest samt tap/timing omkring rør og forhindringer. Berts Classic/Tunnel-zoner, ni baner, multi-mode-ramme og ghost-dueller er ikke den samme produktsløjfe. [1] [2]

2. **Jetpack Joyride** ligger nærmest Berts Classic/Tunnel på kontinuerlig vandret fremdrift og højdeundvigelse, men det er Barry i et laboratorie med jetpack, mønter, missioner, køretøjer og våbenrelaterede farer. Dets dokumenterede styring er tryk hvor som helst for at stige og slip for at falde, ikke to retningszoner. Det skaber tydelig afstand i figur, miljø og gameplay-følelse. [3]

3. **BADLAND** deler side-scrollende flyvning og præcis touch-navigation gennem farer, men den mørke silhuetæstetik, skovvæsnerne, fysikgåderne, kloning og level-/multiplayerstruktur giver et markant andet helhedsindtryk. Original mobilstyring er beskrevet som én knap: berøring løfter, slip lader figurerne falde. [6] [7]

4. **Birdy Trip** er en nærliggende fugle- og skyreference: farverige flyvende fugle, farer, samleobjekter, missioner og one-touch-spil. Den handler dog om at føre en voksende flok på migration og er dokumenteret som one-touch, ikke Berts zonebaserede Classic/Tunnel-input. Det giver mere overfladisk end strukturel lighed. [9]

5. **Whale Trail** deler farverig side-scrollende højdehåndtering, samleobjekter og korte udfordringsruns, men Willow er en hval i Rainbow Land, og den dokumenterede globale hold/slip-styring samt loops, Blubbles og Thunder Bros giver en anden figur- og mekanikidentitet. [11]

6. **Tiny Wings** er en stærk fugle-reference visuelt på et meget bredt plan, men spillets særkende er bakker, momentum og jagten på natten. I udviklerens demo dykker spilleren ved at holde og stiger/lancerer ved slip; det er hverken Berts retningszoner eller Flappy-tap. [8]

7. **Nyan Cat: Lost In Space** deler 2D-side-scroll, highscore, farer og samleobjekter, men kat/meme, regnbue, pixel-candy-rum og platform-/powerup-loopet skaber en tydeligt anden identitet. [10]

8. **Jetpack Joyride 2** er den fjerneste af de otte som samlet Bert-reference, selv om den også er landskabsorienteret og har vertikal flyvning. Den er et levelbaseret lab-actionshooter med Barry eller Betty, auto-fire, helbred, bosser og udstyr; en gennemgang dokumenterer tap-og-hold for at affyre og stige. [4] [5]

Hvis spørgsmålet alene er “hvad vil en spiller først tænke på?”, er svaret derfor **Flappy Bird i Flappy-tilstand**. Hvis spørgsmålet er “hvad ligner Berts Classic/Tunnel-oplevelse mest?”, er **Jetpack Joyride** den mere relevante genrebenchmark, mens BADLAND er den relevante præcisions-/fysikbenchmark. Ingen af dem gør Bert til en kopi i samlet udtryk.

## Kontrolsammenligning: er venstre=OP / højre=NED unikt?

**Det er ikke dokumenteret som unikt.** Den fokuserede søgning fandt ikke et verificeret eksempel på netop `venstre touch = op`, `højre touch = ned`. Det er dog ikke evidens for, at eksemplet ikke findes, og det må ikke omskrives til “første nogensinde”. Det nærmeste eksplicit dokumenterede eksempel er *The Ice Run*, hvor en isterning undviger ildkugler ved styring på hver sin skærmside, men i den omvendte retning: højre = op og venstre = ned. [12]

For **Classic/Tunnel** er styringsrækkefølgen derfor bedst forstået i niveauer frem for som en påstået præcisionsrangering. *The Ice Run* er nærmest strukturelt, men har omvendt semantik. En lavere, fælles kategori består af *Jetpack Joyride*, *Whale Trail*, *BADLAND* og i bred forstand *Birdy Trip*: de dokumenterer lodret kontrol gennem én global berøringsflade med hold/slip, ikke et venstre/højre-valg. [3] [7] [9] [11] *Tiny Wings* er endnu længere væk, fordi hold/slip styrer dyk og terræn-momentum. [8]

For **Flappy-tilstanden** er *Flappy Bird* klart nærmest på input: en enkelt tap/click giver flap og opstigning. [1] [2] Det er samtidig netop grunden til, at Berts Flappy-familie bør beskrives som en velkendt variant, ikke som det særlige bevis på Berts originalitet. Berts særlige, dokumenterede kontrolfortælling ligger i stedet i Classic/Tunnel: retningsvalg på hver sin side plus neutral midte i en 16:9-touchflade.

## Risiko for markedsforveksling

Vurderet som produkt og visuel markedsadskillelse er risikoen **lav samlet set**, med en **lav til mellem** risiko for et flygtigt genreindtryk omkring Flappy Bird eller Birdy Trip i meget små butiksthumbnails. Det er ikke en juridisk risikovurdering. En spiller kan genkende “farverigt fuglespil med forhindringer”, men den samme spiller får stærke modsignaler fra titlen **Bert The Bird**, fuglefiguren, de tre tydelige spilformer, venstre/højre-styringen i Classic/Tunnel, Berts navngivne verdener og det score-/duelbaserede lag.

Risikoen stiger ikke af, at Bert bruger almindelige genreord som flyvning, stjerner eller forhindringer. Den ville snarere stige, hvis salgsmateriale udelukkende viste en generisk fugl mellem rør med tap-tekst, eller hvis det overtog andres umiddelbart genkendelige figur-, miljø-, ordmærke- eller UI-sprog. Her er forskellen mellem **mekanik** og **helhedsindtryk** central: Flappy Birds tap-til-flap, Jetpack Joyrides hold-til-stige, BADLANDs one-touch-flyvning og Whale Trails hold/slip er fælles designmønstre; deres brands, figurer og præsentation er konkrete produktidentiteter. [1] [3] [6] [11]

## Tre konkrete greb, der bevarer Berts identitet

1. **Gør kontrolsignaturen synlig før første run.** Vis kort og klart “venstre: OP / midte: neutral / højre: NED” i onboarding og i et ærligt gameplay-klip. Understreg samtidig, at Flappy er en separat tap-til-flyve-spilform. Det gør forskellen forståelig uden at påstå nyhed.

2. **Markedsfør det, der allerede findes, som én pakke.** Lad trailere og butikstekst vise Classic, Flappy og Tunnel, de ni ranked baner og en seedet ghost-duel. Det er en mere præcis produktfortælling end et enkelt billede af en fugl mellem forhindringer. Henvis ikke til Bird Hour som om det var live.

3. **Hold afstand i titel, figur og nøglebilleder.** Brug konsekvent Bert-navnet, Berts egen fuglesilhuet og de dokumenterede Desert/Jungle/Happy Sky/Neon Encore-rammer. Undgå at bygge kampagnens hovedbillede op omkring en generisk tap-fugl, en andens karakteristiske rør-/lab-/silhuetlook eller lånte ordmærkeassociationer.

## Kilder

[1]: https://play.google.com/store/apps/details?id=com.flappybirdfoundation.flappybird&hl=en_US "Flappy Bird — Google Play official listing"

[2]: https://theconversation.com/flappy-bird-and-the-eight-secrets-to-optimal-gameplay-25603 "Flappy Bird and the eight secrets to optimal gameplay — The Conversation"

[3]: https://apps.apple.com/kr/app/jetpack-joyride/id457446957?l=en-GB&platform=tv "Jetpack Joyride — App Store (Apple, opened listing variant)"

[4]: https://www.halfbrick.com/games/jetpack-joyride-2 "Jetpack Joyride 2 — Halfbrick official game page"

[5]: https://switchtoipad.com/reviews/jetpack-joyride-2/ "Jetpack Joyride 2 – a review — Switch to iPad"

[6]: https://play.google.com/store/apps/details?id=com.frogmind.badland&hl=en_US "BADLAND — Apps on Google Play"

[7]: https://toucharcade.com/2013/04/12/badland-review/ "‘Badland’ Review – A Stylish, Physics-based Adventure — TouchArcade"

[8]: https://www.andreasilliger.com/ "Tiny Wings — Andreas Illiger (official developer page; live browser demo)"

[9]: https://apps.apple.com/us/app/birdy-trip/id1270782229 "Birdy Trip — App Store (Apple)"

[10]: https://play.google.com/store/apps/details?id=com.istomgames.engine&hl=en_US "Nyan Cat: Lost In Space — Google Play"

[11]: https://play.google.com/store/apps/details?id=com.jakyl.whaletrail&hl=en_US "Whale Trail Classic — Google Play"

[12]: https://apps.apple.com/us/app/the-ice-run/id1070055622 "The Ice Run — App Store (Apple)"
