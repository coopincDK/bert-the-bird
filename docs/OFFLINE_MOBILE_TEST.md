# Bert The Bird: lokal offline-test på mobil

**Version:** `worlds-relay-5`. Dette er en **testudgave af webappen**, ikke permanent hosting eller en signeret iPhone-app. Den delbare ZIP indeholder alene spillets webfiler, original Unity-grafik/lyd, nye originale eventillustrationer og installationsvejledningen, **ingen score-server eller spillernes data**.

## Sådan tester du på iPhone

1. Mens der er net, åbn Bert-spillets adresse i **Safari** på iPhone. Kontrollér, at Sky Relay ses i menuen; en gammel installeret PWA kan holde fast i sidste version, til den er genindlæst.
2. Vent til menuen er indlæst og beskeden **“Klar til offline-spil”** er vist. Første installation henter hele spilpakken til lokal browsercache. Hvis beskeden ikke kommer, må du ikke antage at installationen er færdig. Kontrollér forbindelsen og prøv igen.
3. I Safari: **Del → Føj til hjemmeskærm → Åbn som webapp** (hvis valget vises) → **Tilføj**. Åbn derpå Bert fra det nye ikon **mens net stadig er tilsluttet**, og vent også dér på **“Klar til offline-spil”**. Hjemmeskærmsappen kan bruge en særskilt cache fra Safari.
4. Luk appen helt. Slå **flytilstand** til (og sørg for, at Wi‑Fi ikke fortsat er slået til). Start fra ikonet, åbn først Desert og derefter Bird Run, Stormline, Neon Encore og **Sky Relay**. Flyv gennem en ring og ram den synlige guldklinge; prøv også en lokal highscore og genåbn appen stadig i flytilstand. Vend telefonen vandret.

På Android er rækkefølgen den samme i Chrome; brug browsermenuens **Installer app** og åbn ikonet én gang online før flytilstand.

## Hvad virker, og hvad virker ikke?

Når installationen er fuldført, ligger spilmotor, alle ni ranked baners grafik/lyd og **fire lokale eventverdener**, inklusive ringens separate forgrundsbillede, i en lokal service-worker-cache. Det kan startes og spilles **uden kontakt til score-serveren**. Personlige rekorder, verdensmærker, missioner, fjer, helte og indstillinger lagres på den pågældende telefon. Rangeringerne på skærmen viser kun lokale resultater, når serveren ikke er tilgængelig. **Globale topscorer, serverbaserede duel-ID'er og synkronisering mellem telefoner virker ikke offline**; offline-spil bliver ikke efterfølgende uploadet som global score. Et allerede indkodet vennelink kan kun bruges, når modtageren har linket og sin egen installerede kopi.

**Vigtig iPhone-grænse:** En ZIP- eller `file://`-fil kan ikke alene installeres som en ægte offline-webapp i Safari. Første installation kræver en **HTTPS-adresse**; `http://localhost` er kun en udviklingsundtagelse på den *samme* enhed og er ikke din computers LAN-adresse på en iPhone. ZIP'en er derfor en portabel kopi til fremtidig installation fra en passende HTTPS-kilde, **ikke en fil der installerer sig selv på telefonen**. Hvis kravet er nul serverkontakt allerede ved første start, er næste tekniske spor en signeret, lokal iOS-app bygget på en Mac, ikke en PWA-ZIP. [Apple: Føj et websted til hjemmeskærmen](https://support.apple.com/guide/iphone/open-as-web-app-iphea86e5236/ios) · [MDN: Service workers kræver sikker kontekst](https://developer.mozilla.org/en-US/docs/Web/API/Service_Worker_API).

En telefon kan senere rydde PWA-cache eller browserlager på grund af lagertryk eller brugerhandling. **Slet ikke hjemmeskærmsappen og ryd ikke Safari-webstedsdata**, hvis du vil bevare lokale testresultater. Hvis den lokale cache bliver slettet, kræver en ny installation igen en tilgængelig HTTPS-kilde. Vi har ikke afprøvet denne version på en fysisk iPhone: automatiske prøver blev kørt i Chromium med flytilstand og i WebKit efter at testserveren var helt slukket.

## For udvikling på en computer

Pak ZIP'en ud og kør `python3 -m http.server 8080 --bind 127.0.0.1 --directory webapp`; åbn derefter `http://127.0.0.1:8080/` **på den samme computer**. Det bruges kun ved første installation/test; derefter kan en cachet browser fortsætte offline. En almindelig `http://<computerens LAN-IP>:8080/` på iPhone kan **ikke** bruges til offline-PWA-installation, fordi den ikke er en sikker HTTPS-kontekst.

Testscript til den fulde kildepakke: `python3 tests/offline_resilience_acceptance.py`. Det kontrollerer 503, langsom server, lokal rekord, ingen offline HTTP-anmodninger og opstart af banerne 1–13 på to mobile browsermotorer. En grøn headless-test er ikke en fysisk touch-, lyd- eller lagringstest på din iPhone.
