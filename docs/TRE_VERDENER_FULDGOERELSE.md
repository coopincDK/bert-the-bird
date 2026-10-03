# Tre verdener, der føles færdige

**Status · 3. oktober 2026 · `worlds-relay-5`.** Spillet har fortsat ni rangerede baner. Neon Encore, Bird Run og Stormline har nu hver et faktisk, frivilligt, **lokalt slutmål**: overlev hele koncertbølgen med mindst tre bolde, undvig den varslede rovfugl, eller kom forbi en genstand under faktisk storm/orkan. Først efter at faren helt er ude af skærmen, vises »VERDEN MESTRET«, og et roligt ca. 1,85-sekunders resultatforløb afslutter eventen uden dødsscene. Et allerede optjent mærke kan gentages; personlig rekord og mærke ligger lokalt. Den fjerde event, Sky Relay, er en original kort præcisionsflyvning gennem tre **skrå, åbne skyringe** mod en vindklokke. Bert går synligt kort bag en separat nærkant. Ringens **malede top og bund kan rammes** og afslutter turen med 0 point; flyver man helt udenom, mister man kun gatepoint. **Ingen af disse events** giver fjer, missioner, ranked score, vennerangliste, dueller eller redningsspin. Resten af dokumentets faser og yderligere baner er **forslag, ikke bygget indhold**.

## Den samlende idé: én rejse, tre helt forskellige færdigheder

**Morgen: Bird Run → vejret skifter: Stormline → aften: Neon Encore.** Ikke en lang tvungen fortælling eller en kampagne, men en synlig rejse over himlen: først lærer man at **læse levende trafik**, så at **flyve med og mod vejret**, og til sidst at **finde sin rytme i en koncert**. Hver verden skal have et genkendeligt øjeblik, hvor spilleren tænker »nu kan jeg noget, jeg ikke kunne for et minut siden«. Det er stærkere end endnu flere forhindringer eller blot en højere generel fart.

**Princippet for alle tre:** Kort instruktion om målet ved start, synlig fare i banen, lokal belønning først efter faktisk overlevet passage. De tre eventverdener er nu **afsluttelige**, ikke endless efter målet. Mærkerne er kosmetiske, lokale og åbne fra start; ingen fjer, ranked score eller oplåsning af helte. De længere lære-/mestre-/finalefaser nedenfor er fremtidige designforslag, ikke noget denne build foregiver at have implementeret.

## 1. Bird Run: »Flyv med flokken«

**Dets løfte:** Det er ikke en række objekter, men andre fugle med intention og hver deres flyvestil. Den version, vi allerede har, bruger tre levende artsanimationer, forskudte bølger med højst seks fugle, 0,9 sekunders varslede bagfra-møder og én sjælden større rovfugl med længere varsel. Behold netop de særpræg.

| Del | Spillerens beslutning | Det konkrete produktionsarbejde |
| --- | --- | --- |
| **Lær** | »Hvilken fugl stiger, og hvilken dykker?« | Gør de tre første solo-fugle til en tydelig, kort introduktion; brug deres eksisterende silhuetter og vingeposer, ikke tekst over hele skærmen. |
| **Mestr** | »Hvor er den sikre vej gennem en forskudt flok?« | Lad de eksisterende bølger 2→3→4→5→6 føles som grupper med pauser og stjerner *efter* hele gruppen. Variér start-/sluthøjde og relative indflyvningsøjeblikke uden at åbne for samtidige overraskelsesangreb bagfra. |
| **Finalefølelse** | »Nu ser jeg en stor fugl, der vil opsnappe mig; jeg kan lokke den, ændre højde og slippe væk.« | Gør det ene varslede ørne-/gribemøde til et sent, sjældent højdepunkt med en tydelig nedtælling og kort forfølgelse. Ingen boss-liv, kamp eller skade til fuglen. Et undveget møde kan udløse verdensmærket **SKY PILOT** og et roligt øjeblik før flyvningen fortsætter. |

**Vigtig balance:** I dag kan et barn måske campere helt øverst eller nederst. Løs det først med **interessante og sikre stjerneveje i midten**, vekslende fuglehøjder og klare belønninger for at flyve aktivt; gør ikke kanterne til tilfældige usynlige dødszoner. Forfra-bølge og bagfra-rovdyr må stadig ikke overlappe. En fugleflok på seks skal være en spændende læseopgave, ikke seks kollidere på samme tid ved Berts x-position.

## 2. Stormline: »Stormens øje«

**Dets løfte:** Vinden ændrer selve flyvningen, men barnet kan *se og forstå* den gennem flaget ved barometeret, bladene og de ting, der blæser. Vi har allerede faktisk fysisk vind, stille vendinger, brise/storm/orkan og fem originale typer genstande. Den manglende komponent er en tydelig kurve med kontrast mellem ro og styrke.

| Del | Spillerens beslutning | Det konkrete produktionsarbejde |
| --- | --- | --- |
| **Lær** | »Hvilken vej blæser det, og hvor stærkt?« | Start med brise, én let og genkendelig genstand og et flag/barometer der peger på samme fysiske kraft som bladene. Undgå at lægge en negativ pickup i barnets første vejrmøde. |
| **Mestr** | »Skal jeg flyve med vinden eller arbejde imod den for at få stjernen?« | Skift gradvist mellem medvind/modvind og forskellige genstandshøjder. Lad en stjerne komme efter hindringen på en bane, der inviterer til et aktivt, men aldrig tvunget højdeskift. Brug reelle rolige vendinger som planlægningsrum, ikke som skjult hastighedsskift. |
| **Finalefølelse** | »Jeg kom gennem stormen; nu åbner en lys, rolig passage sig, og vinden vender.« | Skab et *kort, tydeligt visuelt stormøje* med klar himmel/lysning og ingen kolliderende genstand i det rolige mellemrum; derpå én varslet orkan-/modvindsfase med større, letlæselig fare. Ved sikker passage: verdensmærket **STORM RIDER**. Løbet fortsætter bagefter med normal seedet vejrrytme. |

**Skærpelse frem for mere støj:** Prøv en smule strammere pauser og bedre genstandspositioner *før* to samtidige farer overvejes. Den sjældne tomme bil beholdes kun, hvis børn straks aflæser den som en farlig, vindført ting; ellers virker den som en løs vittighed og kan udgå. Metal/tung, Hyperfart, ×2 og Flappy er stadig lokale prøveeffekter. Metal skal varsles tydeligt som **ulempe** og aldrig ligne en god belønning, man uforvarende skal spise for at komme videre. En stormfase må aldrig kræve Hyperfart eller Flappy for at være mulig.

## 3. Neon Encore: »Publikumsbølgen«

**Dets løfte:** En koncert med fysiske sceneredskaber og kastede bolde, ikke et Desert-skin med lys. Den eksisterende Neon Encore er allerede én blandet event: LED i midten, høje bundhøjttalere/dybe loftrigs, bolde med forskellige hastigheder og hop, projektører, forgrundslasers og afdæmpet røg.

| Del | Spillerens beslutning | Det konkrete produktionsarbejde |
| --- | --- | --- |
| **Lær** | »Hvad er sceneudstyr, og hvad er bare lys?« | Begynd med ét tydeligt, fysisk midter-LED-objekt og én fri over-/underrute. Projektørstråler og dekorative lasers må aldrig ligne usynlige vægge. |
| **Mestr** | »Kommer faren fra gulv, loft eller publikum?« | Giv plads til at læse solo-højttaler og solo-loftsrig hver for sig. Først derefter bolde fra publikumshænder i forskellige højder, få samtidigt i begyndelsen og mere senere. Retningsskift sker kun synligt ved boldens landing og ikke ind i et nyt rig. |
| **Finalefølelse** | »Publikum laver en stor, men forståelig bølge, og jeg flyver rent igennem.« | Indfør en forudsigelig sen **koncertsekvens**: et roligt rigvalg, derefter en forskudt boldbølge med mindst én aflæselig passage og et kort scenelys/crowd-højdepunkt *efter* faren. Mærket **ENCORE** gives for at overleve sekvensen. Ingen strobe, fuldskærmsflash eller lydafhængig collision. |

**En vigtig scope-beslutning:** Fuldend **den ene spilbare Neon Encore** først. De tre allerede beskrevne selvstændige fremtidige EDM-baner, *Prism Path*, *Bass Switch* og *Crowd Current*, kan senere adskille LED-læsning, solo-rigs og bolde til hver sin valgbar bane. De er ikke nødvendige for, at den nuværende koncertverden kan føles færdig og deles.

## Hvad gør dette til en rigtig del af Bert?

1. **Et selvstændigt »Verdener«-område** med tre store, originale kort, korrekt preview, navn, personlig rekord og et lille lokalt mærke; samme menu- og resultatsprog som de ni normale baner, men ikke blandede Classic/Flappy/Tunnel-scoreklasser. Alle tre forbliver tilgængelige i beta. Et barn skal forstå, hvorfor hun vil prøve *denne* verden igen.
2. **Tre milepæle pr. verden:** »lærte reglen«, »undslap signatursekvensen« og »ny personlig rekord«. Kun den første signatursekvens udløser mærket. Ikke tre tvungne 30–90-sekunders filmsekvenser eller tre nye downloads; brug spillernes faktiske overlevelsestider til at bestemme, hvornår møderne skal komme.
3. **Én lokal eventhistorik**, adskilt fra de ni ranked runs. Bevar ID 10/11/12 og deres eksisterende lokale rekorder; Sky Relay bruger ID 13. Senere kan vi beslutte, om kosmetiske mærker og daglige mål skal give fjer, men ×2-point, assists og negative effekter må aldrig forurene en sammenlignelig ranking.
4. **Korte flyv-afsted-introer:** Eksempelvis fuglens stigende/dukkende silhuet, flag og blade med ens pil, eller »lys skader ikke, udstyr gør«. Lad illustration og én sætning lære reglen; ingen ekstra kontrolstribe under gameplay. Reduced Motion og lydløs tilstand skal give nøjagtigt samme sikre beslutningstid.
5. **Rigtig godkendelse før eventverdenerne kan blive rangerede/offentligt lanceret:** Flere seedede runs i tidlig/mellem/sen fase, live collider mod synlig krop, ingen umulig knibning, iPhone-landscape på både lille og stor fysisk skærm, én Android, offline-genstart, reelt frame pacing og mindst et par børn der kan forklare deres dødsårsag. Automatiske WebKit-tests er regressionskontrol, ikke dokumentation for sværhedsgrad eller fysisk touch.

## Anbefalet byggeorden

**Første lille lodrette skive: Bird Run.** Behold den nuværende mekanik, men design og test én god sen flok + ét klart varsel + undviget rovfugl + lokalt mærke på resultatet. Det demonstrerer både spillets særpræg og den fælles »færdig verden«-struktur. Kopiér derefter *progressionsrammen*, ikke fuglemekanikken, til Stormline og Neon Encore. Mens vi gør det, kan vi udgive en ærligt mærket, serverløs beta af det nuværende spil på en stabil HTTPS-testadresse; fuld verdenspolering behøver ikke udsætte, at andre prøver det.

**Implementeret i denne build:** De tre første, begrænsede verdensmål og Sky Relay er funktioner i den lokale PWA. Ovenstående stormøje, selvstændige EDM-baner, tre milepæle pr. verden, fysisk børneafprøvning og fuld ranking er endnu ikke implementeret eller godkendt. DNS og hosting er uændret.
