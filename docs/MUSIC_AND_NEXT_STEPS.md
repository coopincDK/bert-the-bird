# Bert The Bird — musik, nye forhindringer og næste skridt

## Hvilken lydfil vil jeg helst have?

**Send en WAV-master**, hvis musikken skal redigeres, fades, loopes eller geneksporteres. Behold helst den oprindelige sample rate og lever uden clipping og med lidt headroom. **I den installerbare browserudgave bruger vi komprimeret MP3 til længere musiknumre**: det er kompatibelt med Chrome på iPhone og betydeligt mindre end de originale WAV-filer. De kortvarige klik/coin/Shield-effekter kan fortsat ligge som WAV. For helt sømløse loops skal vi afprøve materialet i browseren; en MP3-fil kan have indkodningspadding, mens et dekodet Web Audio-loop kan styres mere præcist. Den nuværende Focus-musik afkodes på forhånd til hukommelse.

| Sted | Aktiv musik i browserudgaven | Original Unity-kilde | Browserfil |
|---|---|---|---|
| Forside/menu | Menu | `Menu.wav` | `menu.mp3` |
| Classic 1 · Desert | Level1 | `Level1.wav` | `level-1.mp3` |
| Classic 2 · Jungle | Level1 | `Level1.wav` | `level-1.mp3` |
| Classic 3 · Happy Sky | Level1 | `Level1.wav` | `level-1.mp3` |
| Flappy 1 · Flappy Bert | Level1 | `Level1.wav` | `level-1.mp3` |
| Flappy 2 · Sky Shift | Level1 | `Level1.wav` | `level-1.mp3` |
| Flappy 3 · Tower Mix | Level1 | `Level1.wav` | `level-1.mp3` |
| Tunnel 1 · Tunnel Training | Tunnel-testmusik | `Test.wav` | `tunnel.mp3` |
| Tunnel 2 · Star Stream | Tunnel-testmusik | `Test.wav` | `tunnel.mp3` |
| Tunnel 3 · Pulse Tunnel | Tunnel-testmusik | `Test.wav` | `tunnel.mp3` |
| Ekstra testevent · Neon Encore | Egen instrumental EDM-prototype | Ingen Unity-master; den genererede kildefil var allerede MP3-kodet | `assets/edm/neon-encore.mp3` |
| Focus-powerup i enhver bane | Chopin; banemusikken fades ned | `Chopin.wav` | `chopin.mp3`, dekodet én gang ved indlæsning |

**Det er altså ikke ni unikke numre endnu.** Tabellens mapping er kontrolleret i spillets aktive `levelMusicName()` og de konkrete Unity-/browserfiler. Før en bred offentlig lancering skal også rettighederne til *den konkrete indspilning* af Chopin og eventuelle nye optagelser afklares; at et klassisk værk er gammelt giver ikke automatisk fri brugsret til en bestemt lydoptagelse.

## Forhindringer og Focus i denne iteration

- Focus reducerer nu verdenshastigheden til cirka **67 % af hastigheden lige før poweruppen**, dog med en baneafhængig bund, så der fortsat sker noget på skærmen. I Desert ved start lander den på **0,60** (før 0,70); Flappy får en særskilt lav bund, så Focus **aldrig speeder en langsom Flappy-bane op**. Lydafkodning og render-FPS ændres ikke af dette tal.
- Desert får **tre nye stenpilleskins** plus originalen, og hvert fjerde par efter introduktionen får en moderat mindre åbning, dog mindst **258 scene-pixels**. Gruppespacing og den konservative kollisionskerne bevares. De første to par er stadig brede.
- Flappy får kobber- og perlemorsrør ved siden af de originale farver. Happy Sky får et koralfarvet rør med de eksisterende ansigter. Jungle får en mosklædt sten som baggrund/perch under jordslangerne; stenen er **ikke** en ekstra usynlig fare.
- Alle syv nye PNG'er er optimeret til tilsammen cirka 0,7 MB og lagres i PWA-cache. De originale Unity-assets er ikke erstattet og eksportværktøjet er uændret.

## Globalt og venner

Den eksisterende SQLite-API giver faktiske globale resultater med filtre for dag/uge/måned/alt, mode, konkret bane og point/streak/tid. Resultatlisten viser nu **bedste relevante tur pr. pilot** frem for at lade én spiller fylde hele tavlen. Vennefanen viser **dig og direkte modstandere fra serverregistrerede vennedueller** i samme filtre. En delt, lokal/offline duel uden server-registreret forsøg skaber ikke automatisk en relation. Der er **ikke** kontaktimport, brugerkonti eller verificeret venskab; fanen siger derfor udtrykkeligt “Venner fra dueller”. Når backend er utilgængelig vises kun lokale resultater, tydeligt mærket.

## Prioriteret næste pass

1. **Rigtigt onlinefundament:** permanent HTTPS-host, vedvarende database uden for midlertidig preview, automatiske backups og genopretningstest. Previewets scores er ikke en produktionsgaranti.
2. **Fair konkurrence og identitet:** scorevalidering/anti-cheat, konti eller bundet device-identitet, moderering af pilotnavne, rate limits og en verificeret venne-/invitationstabel. Aktuelt er både player ID og score klientindsendt; resultater er egnet til demo, **ikke** en manipulationssikker global konkurrence.
3. **Fysisk iPhone-test:** mål Focus med musik, mange aktiveringer, varme/batteri, installation og mærk haptics på Chrome iOS. Headless WebKit kan kun validere logik/layout, ikke haptisk motor eller konkret telefon-performance.
4. **Musikalsk variation:** særskilte numre eller varierede arrangementer for Jungle, Happy Sky, Flappy og hver Tunnel-variant, med bedre stems/fade og rettighedstjek. WAV-master ind, mobilvenlige exports ud.
5. **Finpudsning:** mål de nye ørkenpassager mod den oprindelige Unity-følelse på en fysisk telefon; formtilpassede Ferr2D-kollisionskurver for alle stenskins; gennemfør de planlagte primært fortjente, alternativt dyre helteoplåsninger.

**Formatkilde:** [MDN: Web audio codecs og valg af musikformat](https://developer.mozilla.org/en-US/docs/Web/Media/Guides/Formats/Audio_codecs).
