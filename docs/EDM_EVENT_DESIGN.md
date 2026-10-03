# Neon Encore — spilbar lokal EDM-verden

**Status · `worlds-relay-5`:** Gratis, særskilt, **afsluttelig lokal eventverden** under de ni almindelige baner. Endnu ikke en tiende ranked bane eller en selvstændig EDM-stige. Den eksisterende koncert har nu et enkelt tydeligt mål: kom sikkert forbi hele en publikumsbølge med **mindst tre** bolde. Først når samtlige bolde i bølgen er passeret og ude af scenen, gemmes mærket **PUBLIKUMSVØLGE** lokalt; »VERDEN MESTRET« vises og flyvningen slutter roligt efter ca. 1,85 sekunder. En enkelt bold fra en større bølge udløser ikke succes for tidligt. Resultatet er lokalt, uden fjer, mission, ranked score eller offentlig/friends leaderboard. Fair tempo kræver stadig fysisk test med børn.

## Spilbar progression

1. De første tre grupper er velkendte brede top/bund-passager med lysbroer, højttalere og enkelte spejlkugler.
2. Fra gruppe fire kommer et **selvstændigt LED-armatur midt i banen**: flyv over eller under. Senere afløses nogle par af **én høj højttaler fra bunden** eller **én dyb lysrig fra toppen**. Der er altid en fri rute på den modsatte side, og disse møder har ingen obligatorisk stjerne på den ene rute.
3. Fra gruppe otte kommer **oppustelige koncertbolde**. Først optræder en eller to, senere typisk to til fire og sjældent seks i samme bølge. Ti på én gang er fravalgt for at bevare læsbarhed på en lille telefon. Boldene har forskellig størrelse, vandret hastighed, hoppefase og hoppehøjde. Hver bold lander med underkanten ved publikumshænderne i den nederste forgrund, hvor forgrundslaget delvist dækker den, og stiger så op igen. Boldens cirkulære hitbox følger selve billedet; ingen prikker, retningspile, collider-omrids eller tegnet bane afslører dens fremtidige bevægelse.
4. Ved enkelte **synlige landinger** kan publikum skubbe en bold kortvarigt tilbage mod højre, så den bevæger sig væk fra Bert og dernæst kommer mod ham igen. Samme bold kan gøre det op til to gange. Det sker kun, når hele bolden endnu er tydeligt foran Bert og befinder sig inde på skærmen; vendingen undertrykkes også, hvis en anden forhindringsgruppe nærmer sig, så den ikke klemmes ind i et loftsrig eller højttalertårn. En bold bag Bert vender aldrig uvarslet om til et bagfra-angreb. RNG er seedet, vendingen er kort og bliver aldrig lydstyret.
5. Kendte par, midterarmaturer, høje/lave enkeltforhindringer og boldbølger afløser hinanden fremfor at blive lagt oven i samme passage. Den øvre flyverute er altid åben over boldene. Geometrien og musikkens tempo er uafhængige: mute, offline-spil og Focus ændrer ikke hitbox-positionen i forhold til billedet.

## Levende powerups

Powerups står ikke længere og vipper på samme verdensbane: de kan flyve **hurtigere mod Bert**, **langsommere, så Bert indhenter dem**, eller **svinge fra øvre til nedre del**. Det er collectible-objektets faktiske `x` og `y`, der både tegnes og kollideres imod, ikke et kosmetisk billede oven på en stillestående hitbox. Hurtige powerups fødes med ekstra afstand efter forrige hindring, så de ikke overhaler ind i den. I den snævre Tunnel følger de korridorens midterlinje med højst en lille sidebevægelse; ingen fuldskærms-sweep dér. Den seeded spil-tilfældighed bevares.

## Forgrund og billeddybde

Den skarpe **16:9-scene med mørke sidefelter** bevares på brede telefoner. Hver verden har en lav top- og bundkant, og de tegnes nu **efter Bert, aura, ghost og partikler**. Bert flyver derfor kortvarigt bag de ydre kulisser i stedet for uden på dem; HUD'en ligger stadig over canvas. Kanten ændrer ingen kollisionsflader og dækker ikke banens midte.

| Verden | Øverste kant | Nederste kant |
|---|---|---|
| Desert | Lav omvendt kant af original ørkenforgrund | Nederste 68 px af sandlaget |
| Jungle | Original grøn løvforgrund | Kun den nederste kant af originalt junglelag |
| Happy Sky | Lav omvendt skybræmme | Original skybræmme ved bunden |
| Flappy | Grøn kant af eksisterende forgrund | Græs foran bunden af tårnene |
| Tunnel | Tynd eksisterende tunnelkant | Tynd bundkant; den egentlige tunnelvæg forbliver synlig |
| Neon Encore | Lysbro af eksisterende rig-art | Original transparent publikumsgrafik i nederste 92 px |
| Stormline (separat testevent) | Lav kant fra egen himmelgrafik | Lav skybræmme fra egen himmelgrafik; vindfaner er rent dekorative |

Koncertens publikum er nu **tre forberedte in-memory billedpositioner** af den samme godkendte originale forgrund: hænderne vifter roligt, mens den nederste silhouet står fast. Positionerne bygges én gang, når eventens art indlæses, ikke for hver spilframe. Systemindstillingen **Reducer bevægelse** fastholder ét publikumssprite. Ingen fuldskærmsblur eller blink.

## Projektører, laser og korte røgpust

Fem dæmpede projektørstråler er forankret i **sceneillustrationens faktiske tårne og midterbue**, i stedet for at begynde højt oppe i himlen. Armaturerne er små, strålerne svinger roligt og tilfører ingen nye collidere. To meget tynde laserstråler krydser det allerforreste billedlag *efter* publikum, Bert og partikler, men bliver aldrig faste vægge; indstillingen »Bevægelse i koncertlys« slukker dem sammen med de nye projektørstråler. Reduceret bevægelse stopper sving og skjuler de forreste laserstreger. Ingen stroboskop, fuldskærmsblink eller prikbaner.

To scenepunkter afgiver svage puff cirka **4,5 sekunder for hver 18 sekunder**, første gang omkring ni sekunder inde i spillet. Røgstemplet er en engangsoprettet gradient og genbruges per frame. Lag-alpha er højst **0,15**; røg tegnes efter forhindringerne, men før stjerner og Bert, og når ikke til at skjule en nødvendig sikker rute. Røg er altid **slukket ved Reduced Motion** og kolliderer aldrig. Effekten er en visuel prototype: hvis den føles mudret på fysisk iPhone, fjernes eller dæmpes den uden gameplayændring.

## Musik, progression og økonomi

EDM-lyset bruger en dæmpet puls omkring 120 BPM. Musikken er instrumental MP3 på loop, og lav bevægelse eller dæmpet musik påvirker aldrig kollisionsreglerne. Eventen har egen lokal rekord, men **ingen global score, ranked kvalifikation, fjer, heltepræstation eller venneduel**. Redning bruger ikke fjer her. De fire nye powerups er i denne build **kun i Stormline**, ikke blandet ind i koncertens endnu ikke balancerede bolde.

## Godkendelsespunkt

Prøv også på en **fysisk iPhone**: Er skiftet mellem én høj og én dyb forhindring til at læse, føles boldens frie hop naturligt, og er det tydeligt, at Bert forsvinder bag publikum og topkulissen? Hvor hyppigt skal powerups optræde med de tre hastigheder? Headless WebKit tester fair ruter, faktisk kollisionsposition, foreground-tegnerækkefølge, reduceret bevægelse, iPhone-layout og offline-cache, men kan ikke erstatte spillerens vurdering af tempo og timing.

**Kontroller:** `node tests/edm.test.js`, `node tests/collectible-motion.test.js`, `python3 tests/edm_acceptance.py`, `python3 tests/edm_progression_foreground_acceptance.py`, `python3 tests/edm_crowd_bursts_acceptance.py`, `python3 tests/edm_motion_acceptance.py`, `python3 tests/edm_offline_acceptance.py` samt eksisterende iPhone- og end-to-end-tests. Offline-testen kræver en lokal fuldstack-server på port 4175. Burst- og landingstesten kører på 852×393 og 667×375 i WebKit; fysisk iPhone-følelse og varme er stadig ikke bevist.
