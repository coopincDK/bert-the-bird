# Bert The Bird — ni baner og kronologisk oplåsning

## Struktur

Spillet består af tre spilformer med tre baner i hver. De eksisterende level-id'er bevares, så gamle rekorder og vennedueller fortsat virker.

| Spilform | Rækkefølge | Level-id | Bane | Kerneidé | Oplåsning |
|---|---:|---:|---|---|---|
| Classic | 1 | 1 | Desert | Grundbane med varierede top-/bundformationer | Åben fra start |
| Classic | 2 | 4 | Jungle | Fjender, angreb og særlige death scenes | Hele trin 1 + 1 hentet mission |
| Classic | 3 | 5 | Happy Sky | Animerede Happy Pipes og regnbuer | Hele trin 2 + 4 hentede missioner |
| Flappy | 1 | 3 | Flappy Bert | Faste rør og ren rytme | Åben fra start |
| Flappy | 2 | 6 | Sky Shift | Alle rørpar bevæger sig lodret | Hele trin 1 + 1 hentet mission |
| Flappy | 3 | 7 | Tower Mix | Kontrolleret blanding af faste og bevægelige rør | Hele trin 2 + 4 hentede missioner |
| Tunnel | 1 | 2 | Tunnel Training | Bølgende korridor og grundlæggende tunnelkontrol | Åben fra start |
| Tunnel | 2 | 8 | Star Stream | En næsten ubrudt stjernerute viser den sikre linje gennem tunnelen | Hele trin 1 + 1 hentet mission |
| Tunnel | 3 | 9 | Pulse Tunnel | Vægge ånder mellem brede kamre og smallere porte, mens centrum flytter sig hurtigere | Hele trin 2 + 4 hentede missioner |

## Oplåsningsligning

De tre spilformer er nu bundet sammen som én progressionstrappe. Et nyt trin åbner **samlet**; spilleren kan derfor ikke springe den svageste spilform over og grinde direkte videre i Flappy eller Tunnel.

- **Trin 1** er Desert, Flappy Bert og Tunnel Training og er åbent fra start.
- **Trin 2** åbner samlet, når spilleren har 120 point i Desert, 90 i Flappy Bert og 110 i Tunnel Training samt har løst og hentet mindst én missionsbelønning.
- **Trin 3** åbner samlet, når spilleren har 180 point i Jungle, 130 i Sky Shift og 160 i Star Stream samt har løst og hentet mindst fire missionsbelønninger i alt.

En hentet mission tæller som et permanent milestone på tværs af dage. Fjerene beholdes og bruges ikke på baneoplåsningen; missionen dokumenterer blot, at spilleren har deltaget i metaspillet. Der bruges ingen tilfældighed, og et åbnet trin mistes ikke, så længe de gemte rekorder og missionsclaims findes lokalt.

**Eksisterende spillere:** Ved første åbning af denne build registreres én gang, hvilke enkeltbaner deres gamle per-mode-scorekrav allerede havde åbnet. Netop disse baner forbliver åbne, også hvis de nye fælles krav eller missionsmilepæle endnu ikke er nået. Registreringen er gemt lokalt og giver ikke senere optjente point en genvej uden om de nye trinregler.

Et tryk på en låst bane åbner en kvalifikations-pop-up med banens rigtige preview, alle tre scorekrav i forrige trin, aktuelle rekorder, manglende point og missionsmilepælen. Hvis missionerne blokerer, går handlingsknappen direkte til Berts rede; ellers går den til den første bane med et manglende scorekrav.

Den eksisterende streak-score følger `score = 1 + 2 + ... + n`. Kravene svarer derfor omtrent til én ren kæde på **13–19 stjerner**: 90 kræver 13, 110/120 kræver 15, 130 kræver 16, 160 kræver 18 og 180 kræver 19. Kravene er høje nok til at bevise forståelse, men korte nok til mobilruns.

## Highscores

- Personlig rekord gemmes separat for alle ni level-id'er.
- Der beregnes ikke gennemsnit.
- Global score kan filtreres på periode, spilform, konkret bane og disciplin.
- Vennedueller gemmer level-id og seed, så begge spillere får samme variant og samme banegeometri.

## Balanceringsprincipper

- Første bane i hver spilform lærer den centrale styring uden ekstra variation.
- Bane 2 introducerer én tydelig regelændring.
- Bane 3 kombinerer variation og højere tempo, men bevarer de eksisterende minimumsafstande og fair passager.
- Unlock-kravene er første balancepunkt og bør justeres ud fra virkelige spillerdata, ikke gennemsnitsscore fra automatiske tests.
- Quick Play og Dagens Rute vælger kun mellem baner, spilleren allerede har låst op.

**Jungle som introduktion til fjender:** De første 18 sekunder bruger cirka 940 scene-pixels mellem fjendegrupper; fra 18–35 sekunder cirka 800; derefter de oprindelige 660. En stjerne kommer 260 px *efter* hver fjende i en af få centrale flyvelinjer, så man ikke tvinges ind i et edderkoppe- eller slangeangreb for at holde streaken. Edderkoppen låser angrebsbanen ved opdagelse og viser et kort spindelvævsvarsel i den valgte bane, før den springer. Varslet er kun en visuel hjælp, ikke en collider, og kan slås fra på en fremtidig hardcore-variant med samme angrebsfysik. Den præcise sværhedsgrad skal stadig prøves på en fysisk telefon.

## Visuel identitet og valgskærm

- Alle ni kort bruger nu **et billede optaget direkte fra den aktive bane**, ikke et genbrugt placeholder-billede.
- Flappy Bert beholder de originale grønne rør. Sky Shift bruger en blå variant af det originale rør, mens Tower Mix veksler forudsigeligt mellem faste guldrør og bevægelige blå rør. Formen, lyset og alpha kommer fortsat fra Unity-spriten.
- Tunnel Training har en diskret stiplet centerlinje, Star Stream lader stjernerne vise den optimale rute, og Pulse Tunnel markerer de smalleste pulssnit med korte advarselsstreger.
- Kun den valgte spilforms tre previews dekodes. De øvrige seks billeder indlæses først, når spilleren skifter faneblad.
- Inaktive kort får både `hidden` og `aria-hidden`, og gridet er låst til præcis tre kolonner. Det fjerner den tidligere iOS-fejl, hvor Flappy- og Tunnel-kort kunne stakke visuelt.

## Næste testbare iteration

1. **Baneintroduktion på 1 sekund:** vis én enkel, animeret regel før første tap — eksempelvis et blåt rør, der bevæger sig i Sky Shift, eller en væg, der pulserer i Pulse Tunnel.
2. **Oplåsningsøjeblik:** når en ny bane åbnes, bør resultatvisningen vise det nye kort og lade spilleren gå direkte videre. Det gør progressionen mærkbar uden en ekstra valuta.
3. **Ranked kontra hjælp:** redningsliv bør fortsat kunne bruges i fri/daglig flyvning, men globale konkurrencetavler bør have et tydeligt filter for runs med og uden redning, så økonomien aldrig opleves som pay-to-win.
4. **Én unik mekanik pr. tredje bane:** Tower Mix og Pulse Tunnel bør være de svære slutbaner i hver familie; nye mekanikker lægges først dér i stedet for at gøre alle ni baner mere komplekse samtidig.

## Fremtidig verden: EDM-fest og koncert

En selvstændig **EDM-verden** med koncertscene, publikum i flere parallax-lag, lysbroer, farvede spots og spejlkugler. Musik, miljø og forhindringer skal føles som én scene frem for en ny skin på Desert. Forslag til arbejdstitel: **Neon Encore**. Placering i progressionsstigen og antal baner besluttes først efter test af de nuværende ni.

- **Fysiske forhindringer:** hængende spejlkugler med tydelig rotationsbane, stablede højttalere, scene-truss, svingende projektører og synlige kabler. Kun den synlige, solide form har hitbox; rent dekorative lysstråler er ikke dødelige.
- **Varslede scenemekanikker:** strobefri laserporte eller korte pyrotekniske søjler tænder først efter en klar visuel optakt og sikker afstand. Et gulv-/lysmønster kan føre Bert hen til stjernerne mellem farerne, ikke lokke spilleren ind i en blindgyde.
- **Musik og rytme:** bevægelige dele kan følge et stabilt beat, men mønsteret skal kunne aflæses uden lyd. Flyvefysik og collision timing afhænger ikke af audioafspillerens latens. Original eller licenseret EDM leveres som WAV-master og eksporteres mobilvenligt til PWA'en.
- **Komfort og performance:** ingen kraftige fuldskærmsblink; indstilling til mindre lysbevægelse. Brug få genbrugte lyseffekter og cachet art frem for dyre canvas-blurfiltre, især under Focus og lange stjerneruter.

Den **første spilbare Neon Encore-testbane** ligger nu uden for de ni ranked baner med egen grafik og musik. Den starter med kendte top-/bund-passager og veksler derpå mellem midterarmatur, høj enkeltstående bundhøjttaler, dyb loftsrig og frit hoppende koncertbold i flere vandrette hastigheder. Bolden varsles af sin egen synlige bevægelse, **ikke** med en prikket bane eller et synligt kollisionsomrids. Der er stadig ingen laserporte, pyroteknik eller selvstændig *ranked* EDM-progression; de idéer er fortsat backlog. Se [EDM_EVENT_DESIGN.md](EDM_EVENT_DESIGN.md) for prototypens geometri, fair star-ruter, scoreisolering, lyd og testpunkter.
