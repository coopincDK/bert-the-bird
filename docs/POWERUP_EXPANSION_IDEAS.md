# Ekstra powerups – status og balancevalg

**Status 1. oktober 2026:** Fire nye powerups er nu **spilbare som isolerede Stormline-testprototyper** i build `stormline-powerups-1`. De er **ikke** føjet til de ni ranked baner, Bird Run eller Neon Encore. De oprindelige Shield, Magnet og Focus samt browserens Streak Guard eksisterer fortsat som før. Se [den konkrete event-specifikation](STORMLINE_AND_POWERUPS_PROTOTYPE.md).

| Prototype | Handling | Testvarighed | Hvad mangler før eventuel ranked brug? |
|---|---|---:|---|
| **Metal Meal / tung fugl** | En tydelig metalpickup vælger separat fysikprofil: meget sværere OP, hurtigere NED. Berts sprite og kollider vokser ikke. | 6 s | Fysisk telefonbalance, forudsigelig placering og fair reaktionstid i snævrere baner. |
| **Hyperflight / hyperfart** | Aktuel stagefart ×1,22 med større afstand til næste møde; hastigheden vender tilbage til *den aktuelle* stage ved udløb. | 6 s | Mobilkomfort, fair spawns ved høje stages og samspil med Focus. |
| **Double Points / dobbelt point** | Kun point fra stjerner under effekten ×2. Stjernetælling, fjer, missioner og allerede optjente point ændres ikke. | 8 s | Beslutning om leaderboard-regler og serverside validering før ranked score. |
| **Flappy-vinge** | Hvert nyt tryk hvor som helst flapper Bert op; ingen manuel NED. Ved 30 sekunders udløb frigives en eventuel finger, og venstre-OP/højre-NED vender tilbage. | 30 s | Om varigheden/afstanden er sjov, og om kontrollernes skifte er læsbart på fysisk iPhone. |

Pickups vælges i seedet rækkefølge uden samtidige prototypereffekter. De fire nye ikoner er særskilt originale og offline-cachede; vinger og glow i pickup-animationen genbruger original Unity-grafik. Varighed og multiplikator er **prøvetal**, som kan justeres efter feedback. Det ældre `docs/GAME_DESIGN_SOCIAL_ROADMAP.md` foreslår også »Modvind« som én kombineret risiko/belønning; den kombination er **ikke** bygget og bør ikke blandes sammen med disse fire.

**Åbent spørgsmål efter mobiltesten:** Hvilke, om nogen, hører til i ranked, og skal en senere kombineret negativ powerup overhovedet findes? Der er ingen grund til at røre konkurrencens fairness før spilfølelse, seedlogik, kollisionsafstande og scoreserverens tillidsmodel er gennemgået.
