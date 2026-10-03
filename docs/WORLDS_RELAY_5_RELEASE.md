# Bert The Bird · `worlds-relay-5`

**Spilbar udviklingsversion, ikke offentlig ranked-udgivelse.** De ni eksisterende rangerede baner er bevaret. Under dem ligger nu fire frivillige, lokale eventverdener med egne rekorder. Ingen af de fire giver fjer, missioner, globale point, vennerangliste, duelresultater eller redningsspin.

## Ny original flyverute: Sky Relay

- Bert flyver fortsat **op med venstre side, ned med højre**. Ingen slangebøsse, projektiler, vælteblokke eller lånte spilfigurer.
- Samme korte rute hver gang: tre synlige, let skråt sete, åbne **skyringe** over Happy Sky og til sidst en stor **vindklokke med guldplade**. Baggrunden er fra projektets originale Unity-aktiver; skyring, separat nærkant og vindklokke er **nye, originale AI-genererede eventillustrationer**, ikke oprindelige Unity-sprites.
- Ringens gennemgående åbning er virkelig fri. Bert flyver kort **bag en separat forgrundskant**, så det ser ud som en gennemflyvning. Rammer Berts levende kropskollider ringens **tegnede top- eller bundsky**, afsluttes turen med 0 point og et tydeligt ringtræf på resultatet. Ingen usynlig væg tværs over skærmen: flyvning udenom mister blot portpoint.
- Rene portpassager giver flere **slutpoint** end passager ved skyernes kant. Et præcist træf på guldpladen og den resterende tid giver yderligere point. Misser man klokken eller overskrider den beskyttende 45-sekunders grænse, bliver slutscoren 0. Gulv/loft klemmer Bert tilbage i den synlige korridor frem for at udløse en overraskende død; der spawner ingen almindelige banehindringer i Sky Relay.
- Kontaktområdet ved klokken er sat efter den synlige runde guldplade, ikke efter dekorative snore og ophæng. Faste 60 Hz-trin og samme ringåbning på tværs af seeds gør billedets grænse til en fair grænse.

## Lokale slutmål i de tre tidligere eventverdener

| Verden | Faktisk kort mål | Afslutning |
| --- | --- | --- |
| Neon Encore | Kom levende forbi **hele** en gruppe med mindst tre publikumsbolde. | Synligt »VERDEN MESTRET«, lokal badge og resultat, først når sidste bold er væk. |
| Bird Run | Overlev den varslede **rovfugl bagfra** til den er helt væk fra skærmen. | Lokalt mærke »FRI AF ROVFUGLEN« og rolig resultatskærm. |
| Stormline | Overlev en rigtig flyvende genstand, der blev spawnet under **storm eller orkan**. | Lokalt »STORMPILOT«-mærke; en brise eller usynlig/dekorativ testgenstand tæller ikke. |

Børn kan spille verdenerne om igen, og de personlige eventrekorder og mærker ligger på samme enhed. De mere omfattende tre-fase-verdener, specialfinaler og tre ekstra EDM-baner i tidligere designnotater **er ikke bygget eller lovet som færdige**. Se [verdensplanen](TRE_VERDENER_FULDGOERELSE.md) for den skelnen.

## Testbeviser og begrænsninger

- **23/23 Python-browseracceptance-filer bestod i ét serielt gennemløb** efter rettelse af to testmålinger, som tidligere antog konstant slutframe-speed og nøjagtigt nul tid mellem WebKit-klik og snapshot. **16/16 Node-enhedstestfiler**, asset-gaten og API-testen er også grønne.
- Node-enhedstests omfatter rute, klokkekontakt, fuldt kanttræf, åbent midterhul, bypass uden usynlig død, monoton score ved portcenter/kant, lokale badges og regression af fysik, progression og eventmekanik.
- WebKit-acceptance i **852×393 og 667×375** gennemspiller tre porte og mål, kantpassage, bommet port, top-/bundkollision, klokkemiss, timeout og venstre-/højreinput. En særskilt test gennemfører hvert af de tre gamle eventmål i begge størrelser og sammenligner metaøkonomi og HTTP POSTs før/efter. Screenshots er inspiceret for todelt ringdybde, fire menukort og læsbar lokal resultatskærm.
- Asset-gaten kræver alle tre endelige Sky Relay-PNG'er og begge nye scripts i service-worker-cachen. Den udpakkede **offline-PWA-ZIP** er CRC-testet og starter alle **13** spilvalg uden server i Chromium og WebKit. Offline-globalrangliste og online-dueller virker fortsat ikke.
- Headless-timing og emuleret pointerinput **beviser ikke** reel iPhone-touchfornemmelse, vibration, musikoutput, varm telefon, balance for børn eller langvarig frame pacing. En Safari-installation kræver første åbning over HTTPS; en ZIP kan ikke selv installere en offline-PWA på iPhone. Følg [offline-mobilguiden](OFFLINE_MOBILE_TEST.md), og send gerne et billede af ringkontakt og resultat fra din egen telefon, før vi kalder balancen låst.

Den midlertidige 4175-preview er **ikke** permanent hosting. [GitHub/GoDaddy-guiden](GITHUB_GODADDY_ABC.md) beskriver en senere statisk HTTPS-udgivelse uden at ændre domæne eller slette noget nu; GitHub Pages kan ikke afvikle Python-/SQLite-score-API'et.
