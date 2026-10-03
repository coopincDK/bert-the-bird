# Bert The Bird: status for deling og fuldgyldige baner

> **Arkiveret status for `offline-safe-4` før `worlds-relay-5`.** Tallene nedenfor beskriver præcist den gamle 12-valgs build. Den nye build har også Sky Relay og tre lokale verdensmål; se [verdensstatus](TRE_VERDENER_FULDGOERELSE.md) og [offline-guide](OFFLINE_MOBILE_TEST.md). De fire events er fortsat ikke ranked.

**Historisk status: 3. oktober 2026 · PWA `offline-safe-4` · lokal Git-revision `0d44abe`.** Dette er en beslutnings- og releasevurdering, ikke en gennemført publicering eller en ændring i banerne. Den midlertidige 4175-preview og dens API svarede ved kontrollen, men adressen er ikke stabil hosting. En fuldstændig udpakket offline-ZIP startede alle 12 daværende spilbare banevalg i headless Chromium og WebKit uden server; alle JavaScript-enhedstests og projektets assetgate bestod ved denne statuskontrol. Vi havde **ikke** i denne gennemgang genkørt hele den brede regressionspakke eller afprøvet spillet på en fysisk telefon.

## Min korte vurdering

**Vi har et spilbart spil til en lille, ærligt mærket prøveudgivelse nu.** De **ni almindelige baner** er allerede fordelt på Classic, Flappy og Tunnel, tre i hver. Oven på dem kan man spille **Neon Encore, Bird Run og Stormline** som tre gratis, selvstændige testevents. Man kan flyve, dø, prøve igen og sætte en personlig eventrekord i alle tre. Der er offline-PWA, kontrolsystem, lyd/grafik, synlige farer og separate gameplaytests.

**Det er ikke det samme som, at alle 12 er fuldgyldige ranked baner.** Eventerne har fart-/sværhedsstages, men ligger som tre direkte spilbare knapper uden for de ni baners fane-, oplåsnings-, daglige missions- og ranglistesystem. Det er med vilje: Bird Runs sværhed og kant-camping, Stormlines tempo og Neon Encores farelæsning skal først vurderes på rigtige telefoner. Serveren har desuden ikke sikker identitet eller autoritativ scorevalidering.

## Hvad findes faktisk?

| Del | Spilbar nu? | Indgår i samme progression som de ni? | Vigtigste restarbejde |
| --- | --- | --- | --- |
| **Classic 1–3: Desert, Jungle, Happy Sky** | Ja | Ja: personlige rekorder, tier-oplåsning, missioner og demo-backend for global score | Fysisk test og de fælles releaseporte nedenfor; enkelte visuelt uklare farekanter undersøges i bevægelse. |
| **Flappy 1–3: Flappy Bert, Sky Shift, Tower Mix** | Ja | Ja | Fysisk touch- og passagebalance, særligt ved Focus og bevægelige rør. |
| **Tunnel 1–3: Training, Star Stream, Pulse** | Ja | Ja | Fysisk test af tætte stjerner, mørke vægge, tempo og billedhastighed. |
| **Neon Encore (ID 10)** | Ja. Én *blandet* koncert-event med LED i midten, solo-gulv/-loft, bolde, lys og røg | **Nej**: lokal eventrekord, men ingen normal runhistorik, fjer, missioner, unlock eller netrangering | Test om bolde, lys og baggrund giver en klar, fair beslutning; finjustér introduktion og senere pres. |
| **Bird Run (ID 11)** | Ja. Tre fuglearter, seedede bølger til højst seks synlige fugle, varslede bagfra-møder og en sjælden rovfugl | **Nej**: samme eventisolering | Test fysisk om den åbne top/bund gør kant-camping for nem; justér mødevariation uden umulige klemmer eller skjulte fugle. |
| **Stormline (ID 12)** | Ja. Fysisk vind, flag/barometer, fem vindbårne farer og fire nye prøve-powerups | **Nej**: samme eventisolering | Test om vinden mærkes og aflæses af børn, om banen stadig er for let, og om Metal/Hyper/×2/Flappy faktisk gør oplevelsen bedre. |
| **Prism Path, Bass Switch, Crowd Current** | **Nej**: tre særskilte EDM-baner findes som design, ikke valgbare baner | Nej | Design, byg, balancér og test dem senere. Den eksisterende Neon Encore indeholder allerede nogle af deres mekanikker; det er *ikke* det samme som tre færdige baner. |

**Teknisk forklaring på forskellen:** `UNITY_LEVELS` indeholder de ni almindelige baner og er kilden til banevælgerens faner, tier-oplåsning, dagsrute og lokal leaderboardhistorik. ID 10–12 er defineret som `modeGroup: 'event'` uden for listen. De får en personlig rekord gennem `saveRecord`, men `finishDeath()` kalder bevidst hverken `BertMeta.recordRun` eller `BertSocial.submitScore` for events. De får heller ingen redningshjul, hero-unlock eller ghost-duel. At slette ordet **TESTBANE** eller blot putte event-id'erne i `UNITY_LEVELS` ville derfor *ikke* graduere dem sikkert; det ville især risikere forkert progression, pointøkonomi og blandede scoreklasser.

## Hurtigste forsvarlige deling

1. **Frys en lille beta-build:** De ni baner plus tre tydeligt mærkede bonus-/testverdener. Ingen ny EDM-trilogi eller ny art er nødvendig for at lade folk prøve spillet. Behold rednings- og fjerregler for de ni som nu; lov ikke at events giver belønninger, når de faktisk ikke gør.
2. **Udgiv en ren statisk PWA på en stabil HTTPS-testadresse**, f.eks. en særskilt GitHub Pages-adresse som beskrevet i [GitHub/GoDaddy-guiden](GITHUB_GODADDY_ABC.md). Brug kun spilfilerne fra den testede offline-pakke, ikke Unity-referenceprojektet eller SQLite-filen. Test Pages-adressen, før eget domæne og SmartPack-siden overhovedet berøres. Det ønskede domænenavn skal først afklares: `theelytra.com` i beskeden kontra `dielytra.com` på GoDaddy-billedet. Ingen GitHub-remote, DNS-ændring eller publicering er gennemført her.
3. **Gør serverløs status tydelig på websiden**, før linket deles bredt: Personlige rekorder, missioner og fjer er *lokale på den telefon*. Den eksisterende globale/friends-UI kan ved et rent statisk site falde tilbage til lokale data, men bør ikke kaldes live globalt. Serverdueller, kontosynkronisering og globale scores skal enten skjules/deaktiveres i denne udgave eller mærkes klart som ikke tilgængelige. Et indkodet seed-/ghost-link er noget andet end en serveradministreret venneduel med troværdige forsøg.
4. **Kør en kort fysisk test før invitation:** Mindst én nyere og én ældre iPhone og gerne en Android; installér fra den nye HTTPS-origin, spil hver af de 12 valg, start i flytilstand efter cacheklar, kontroller faktisk venstre-op/højre-ned, Flappy-tryk, lyd/Focus, synlig collider mod fare, pause/rotation og om 15–20 minutters spil giver hak/varme. Involver også et par børn uden at forklare vindbarometer, fuglevarsel eller koncertbolde først. Dokumentér fejl, ikke blot et ja/nej.
5. **Tjek distributionsrettigheder og privatliv**, før musik/grafik og navneregistrering lægges åbent på et offentligt repository. Et offentligt Pages-site gør spilelementer og lyd downloadbare. Vælg derefter en tydelig »åben spiltest« uden præmier, sikker rangering eller falske sociale løfter. Den midlertidige 4175-sandbox-URL er kun nødpreview, ikke distributionsadressen.

Det er en **playtest**, ikke et 1.0-løfte. Allerede installerede lokale data fra 4175-origin flyttes ikke automatisk til Pages/et nyt domæne; vis dette før spillere skifter adresse. Den eksisterende [offline-installationsguide](OFFLINE_MOBILE_TEST.md) forklarer første HTTPS-installation og grænserne uden backend.

## Sådan flytter vi de tre events ud af teststadiet

**Anbefaling: Behold Classic/Flappy/Tunnel som 3 × 3.** Gør de tre ekstra verdener til en selvstændig, officielt navngivet **»Verdener«/bonusrejse** med den samme gennemarbejdede *spiloplevelse* som de ni: banepræsentation, læring, stigende tempo, personligt mål, tydeligt resultat, »prøv igen« og gradvis åbning. At putte dem i én af de tre eksisterende modefaner giver forkert kontrol- og scoreforventning. »Fuldgyldig« behøver **ikke** betyde »på en offentlig ranked tavle«.

### Fælles, konkrete gradueringstrin

1. **En undervisningsdel og en senere mestringsdel pr. verden.** De har allerede interne fart-/sværhedsstages. Definér nu forståelige milepæle, f.eks. »overlev introduktionens tre møder«, »nå en lokal rekord« og »klar én sen mekanik«. Mål derefter faktiske tider og antal forsøg, før pointgrænser sættes. Undgå at love en slutning på en endless runner: et »klaret« mål er en milepæl, ikke at banen ophører.
2. **Egen eventstige i UI og lokalt lager.** Lav kort med thumbnail, navn, lokal rekord, åben/låst og en pop-up med *præcist* næste mål. Genbrug god feedback fra 3 × 3-systemet, men lav **separate** eventkrav frem for at presse de tre ekstra niveauer ind i den nuværende tværgående tier-logik. Bevar spillere, der allerede har spillet events, deres rekord og adgang; flyt ikke gamle eventresultater til ranked eller nulstil dem. Vælg først om nye spillere skal have alle tre åbne under beta, og om senere eventmål skal åbne den næste; ændring af adgang er et produktvalg, ikke en ren kodeteknisk detalje.
3. **Lokal eventhistorik og fair belønning.** Beslut om gennemførte eventmål må bidrage til *egen* daglig mission og et lille antal fjer, eller om der skal være en særskilt kosmetisk eventbelønning. Registrér i så fald event-run med særskilt mode og scoreklasse, så ×2-point og redningsregler ikke kan farmes eller påvirke de ni baners oplåsning. Det kræver særskilte tests af migration, dobbeltbelønning og replay. Ingen udokumenteret automatisk konvertering af eksisterende eventrekorder.
4. **Balance og kollisionslæsbarhed på fysiske telefoner.** Afspil flere seeds i intro, mellem og sen fase; noter overlevelsestid, dødsårsag, frivilligt replay, blind spots og kant-camping. Alt farligt skal ses før det kan ramme, med matchende collider; reduceret bevægelse og lyd fra må ikke ændre sikker rute. Godkend kun, når et barn kan forklare, hvorfor et sammenstød skete, og erfarne spillere faktisk får noget at mestre.
5. **Rangering som *senere* port.** Først når stabil backend, backup/restore, identitet/navnemoderering, ren kontra hjulpet runklasse, serverkontrol af score og særskilt event-mode er på plads, kan hver event få offentlig rangering og serverdueller. Den nuværende Python/SQLite-demo accepterer klientindsendte scoretal og `levelId` op til 99; den bliver ikke sikker af at tilføje ID 10–12. GitHub Pages alene løser ingen af disse serverkrav.

### Bane-for-bane godkendelse

| Bane | Hvad der allerede kan bruges | Sidste designgate før »fuldgyldig bonusverden« |
| --- | --- | --- |
| **Neon Encore** | Eksisterende musik, fem sceneankrede projektører, rigs, solo-passager, boldbølger, underpublikum og dæmpet røg | Én tydelig læringskurve fra par til LED til solo-objekter til bolde; afprøv om boldvendinger og kulisselag er forudsigelige nok på fysisk iPhone. Dæmp eller fjern røg/laser, hvis en reel fare skjules. Vælg *enten* Neon som én fuld verden nu *eller* senere tre adskilte Prism/Bass/Crowd-baner. Kræv ikke den endnu ubebyggede trilogi for at fjerne testmærket på den ene eksisterende bane. |
| **Bird Run** | Tre animerede fuglearter, gradvise forskudte bølger op til seks, solo-varsler bagfra, én sjælden jagt | Mål om øvre/nedre kant giver gratis overlevelse, og om sen seks-fugle-tæthed bliver kaos uden reel beslutning. Justér højdevalg, timing, restitution og belønningslinje *inden for synlige fair ruter*. Ingen uvarslede angreb eller samtidige front-/bagfra-knibninger. |
| **Stormline** | Vind, der både er fysisk og synlig, flag ved barometer, fem styrkeafhængige genstande, fire lokale pickup-prototyper | Afprøv med børn, om barometer/flag/blade forstås, og gør banens midt-/slutfase spændende uden at lade orkanen overstyre kontrollen. Afgør især om den negative Metal-effekt og sjældne bil gavner børneudgaven; justér pickup-frekvens og indfør aldrig Stormline-×2 i ranked uden separat score-/økonomikontrol. Vælg/licensér evt. eget vejrlydspor senere; Classic er kun den aktuelle fallback. |

## Hvad er ikke en blocker for den første deling?

- Tre separate EDM-baner er **ikke bygget**, men Neon Encore er allerede en spilbar blandet event; den nye trilogi er næste indholdsudvidelse, ikke et krav for første testlink.
- 100 % binær Unity-port og nye sprites til alt er ikke påkrævet for at afprøve spillet. Enkelte resterende prefab-/Ferr2D-detaljer kan prioriteres efter observerede kollisionsproblemer.
- Globalt leaderboard er ikke påkrævet for en **tydeligt lokal** playtest. Derimod må vi ikke præsentere en lokal fallback som globalt verificerede rekorder.
- Ingen grund til at slette SmartPack-siden eller skifte domæne for at validere GitHub-testadressen; domænet er en senere, reversibel distributionsbeslutning.

## Min anbefalede rækkefølge og næste beslutning

**Først:** stabil Pages-testadresse med serverløs/local-only-tekst, rettighedstjek og reel mobiltest af alle 12 valg. **Dernæst:** tag én event ad gangen gennem introduktion, balancemåling, separat lokal eventstige, historik og eventmål, med **Bird Run først** fordi den tydeligst er Berts egen idé, derefter Stormline og Neon Encore. **Til sidst:** verificeret backend og eventrangering, hvis den er ønsket; tre adskilte EDM-baner kan bygges som næste indholdsbølge efter første deling.

**Produktbeslutning, før vi ændrer adgang eller økonomi:** Skal alle tre bonusverdener fortsat være frit tilgængelige, mens de gøres fuldgyldige, eller skal nye spillere låse dem op én ad gangen? Min anbefaling for den hurtige beta er **alle åbne**, og en senere valgfri eventstige med synlige mål, uden at låse eksisterende testere ude. Resten af den tekniske klargøring kan ske uden at blande dem ind i de ni eksisterende ranked baner.
