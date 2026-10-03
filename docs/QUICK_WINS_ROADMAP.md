# Bert The Bird — næste quick wins

## Kort vurdering

Bert The Bird har nu en tydelig styrke: den originale grafik, den direkte venstre/højre-styring og de korte runs giver spillet en genkendelig arcade-identitet. Den største begrænsning er ikke længere den tekniske grundmotor, men at flere baner stadig føles som variationer af samme mønster: flyv gennem en åbning, saml en stjerne, gentag.

Den bedste vej videre er derfor **mere variation i selve flyveruten**, tydeligere mål mellem runs og mere af den originale animation og feedback — ikke bare højere fart eller flere forhindringer.

## Allerede gennemført i denne milepæl

- Slangen bruger de originale jump-frames og angriber opad.
- Ved slangetræf erstattes den normale Bert-sprite af de tre originale frames, hvor Bert er fanget i slangen.
- Edderkoppen registrerer Bert, firer sig ned og angriber i stedet for blot at hænge passivt.
- Ved edderkoppetræf erstattes Bert af hele den originale 18-frame net-/kokonsekvens før resultatskærmen.
- Den fejlagtige ekstra gameplay-Bert er fjernet fra menuerne; kun den tilsigtede menufigur vises.
- Simulationen kører i faste 60 Hz-trin, og canvas tegnes højst 60 gange i sekundet på 120 Hz-skærme.
- Menuen dekoder 15 fælles canvas-assets plus Berts delte animation. Tunge level-, fjende- og capture-sprites indlæses først, når den valgte bane kræver dem.

## Prioriteret plan

| Prioritet | Forbedring | Effekt | Arbejde | Anbefaling |
|---:|---|:---:|:---:|---|
| 1 | **Erstat Training/Test med Tunnel Training** | Høj | Mellem | Byg en sammenhængende tunnel, der bevæger sig op/ned og bliver smallere/bredere. Det ændrer selve navigationsopgaven og giver mere variation end endnu en almindelig obstacle-bane. |
| 2 | **Forankr HUD og overlays til det præcise 16:9-spilfelt** | Høj | Mellem | På skærme med kraftig letterboxing kan HUD-elementer ellers ligge uden for canvas. Læg canvas, HUD, menuer og resultatskærm i én fælles 16:9-stage. |
| 3 | **Gør resultatskærmen levende og mere meningsfuld** | Høj | Mellem | Lad tavlen komme ind i en kort sekvens, og marker separat ny rekord for score, streak og tid. Data findes allerede. |
| 4 | **Tilføj BlueBert som første optjenelige helt** | Høj | Mellem | Brug den komplette originale BlueBert-animation. Lås den op ved et klart færdighedsmål, fx første x5-streak. Ingen gameplay-fordel og ingen butik. |
| 5 | **Pausemenu samt musik-, effekt- og lydvalg** | Høj | Mellem | Den nuværende pauseknap forlader runnet. Lav Resume / Restart / Menu og gem lokale indstillinger for musik og effekter. |
| 6 | **Mere beslutning i stjernerne** | Høj | Mellem | Behold en sikker stjerne i ruten, men tilføj af og til en tydeligt risikabel stjerne med en lille bonus. Det gør flyvningen mindre mekanisk uden at ændre grundstyringen. |
| 7 | **Originale feather- og shield-partikler** | Mellem | Lille–mellem | Erstat generiske prikker ved død og shield-break med de originale feather- og shield-splinter-assets. Det løfter et meget synligt gentaget øjeblik. |
| 8 | **Quick Flight og en enkel dagsudfordring** | Mellem | Lille–mellem | Quick Flight starter senest spillede bane. En lokal, seedet dagsrute giver et nyt mål uden login, backend eller online leaderboard. |
| 9 | **Portér Happy Pipes og de resterende originale obstacle-varianter** | Mellem | Mellem | Level 5 har flere originale prefab-varianter end de nuværende rainbow-forhindringer. De giver variation uden at opfinde en ny visuel stil. |

## Anbefalet Level 2: Tunnel Training

### Grundidé

Level 2 erstatter det tomme Test-slot med en **kontinuerlig tunnel**. Loft og gulv danner én sammenhængende korridor, som bølger roligt op og ned. Åbningen bliver gradvist smallere, men der kommer regelmæssige brede “recovery caverns”, hvor spilleren kan genfinde rytmen og eventuelt samle en power-up.

### Spilbar specifikation

- **Bert-størrelse:** 90 × 82 px i denne bane, cirka 72 % af normal størrelse. Collider skaleres proportionalt; den må ikke skjult gøres ekstra lille.
- **Tunnelprofil:** nyt kontrolpunkt cirka hver 160 world-pixel med centerlinje og åbningshøjde. Punkterne interpoleres glat.
- **Fair kurve:** centerlinjen flytter højst cirka 30 px pr. kontrolpunkt. En skarp drejning og en kraftig indsnævring må aldrig ske samtidigt.
- **0–15 sek.:** åbning 400–440 px, fart 0,80. Kun bløde bevægelser.
- **15–45 sek.:** åbning 340–410 px, fart omkring 0,90.
- **45–85 sek.:** åbning 280–360 px, fart omkring 1,10.
- **85+ sek.:** åbning 240–320 px, maksimal fart omkring 1,30.
- **Stjerner:** én stjerne hver 640–720 world-pixel på eller tæt ved centerlinjen. Ingen stjerne må placeres i en fysisk umulig passage.
- **Power-ups:** kun i brede recovery-sektioner og aldrig lige før en indsnævring.
- **Grafik:** brug den originale mørke Level 2-atlas som baggrund og tekstur til tunnelens loft/gulv. Det bevarer spillets egen stil.
- **Kollision:** den samme kurve, der tegnes, skal bruges som collider med 8–12 px visuel tolerance. Spilleren må aldrig dø af usynlig geometri.

## Hvordan spillet bliver mindre “tap, tap, tap”

Den vigtigste ændring er ikke flere knapper. Den er at lade hver bane stille en anden slags opgave:

- **Desert:** klassisk præcisionsflyvning og streak.
- **Flappy Bert:** korte impulser og timing.
- **Tunnel Training:** kontinuerlig linjelæsning og positionering.
- **Jungle:** reaktion på telegrapherede levende fjender.
- **Happy Sky:** bevægelige eller skiftende originale Happy Pipe-mønstre.

Herefter kan risikostjerner, lokale dagsruter og BlueBert skabe grunde til at tage “bare ét run mere” uden at gøre spillet til en tung progressionstjeneste.

## Min anbefalede næste milepæl

1. Byg **Tunnel Training** som erstatning for det tomme Test-level.
2. Saml HUD, menuer og resultatskærm i én præcis 16:9-stage.
3. Tilføj BlueBert som færdighedsbaseret unlock.
4. Afslut med resultatskærmens sekvens og separate rekordmarkeringer.

Det giver mest mærkbar forbedring pr. arbejdstime og udvider spillets identitet i stedet for blot at gøre den eksisterende bane hurtigere.
