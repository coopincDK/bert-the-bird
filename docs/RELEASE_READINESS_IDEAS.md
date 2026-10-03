# Bert The Bird — hvad mangler før udgivelse?

**Status: 1. oktober 2026 · build `hero-guard-1`.** Dette er en produktprioritering af det eksisterende spil, ikke en påstand om, at øvrige forslag nedenfor allerede er implementeret.

## Det har vi allerede

Ni baner fordelt på Classic, Flappy og Tunnel; originale Unity-miljøer samt supplerende forhindringskunst; tolv kosmetiske helte, hvoraf elleve kan vindes eller købes for fjer; Shield, Magnet, Focus og en afgrænset Streak Guard-prototype; missioner, permanente redningsliv og et redningsspin; daglig rute, medaljer og gradvis baneoplåsning. Der er en installerbar/offline PWA, personlige rekorder, en SQLite-baseret global tavle og seedede vennedueller med ghost. Focus varer **30 sekunder fra pickup** inklusive 2 sekunders indfading, efterfulgt af uændret 2 sekunders udtoning; hastigheden er ikke ændret i denne opdatering.

Det er en **spilbar beta**. En bred offentlig udgivelse med troværdig konkurrence kræver mere end flere baner.

## Udgivelsesporte, prioriteret

| Prioritet | Mangler | Hvorfor det er vigtigt | Konkret acceptkriterium |
| --- | --- | --- | --- |
| Før invitation af mange spillere | **Stabil HTTPS-host og data** | Det aktuelle sandbox-link er midlertidigt. Scores ligger i én SQLite-fil. | Permanent adresse, vedvarende datalagring, automatiske backups og testet gendannelse; opdatering må ikke nulstille tavlen. |
| Før invitation af mange spillere | **Fysiske mobiltests** | Headless WebKit kan ikke mærke haptics eller afsløre alle varme-, lyd- og hakkeproblemer i Chrome iOS. | Gennemspil hver af de ni baner på mindst en ældre og en nyere iPhone, helst også Android; test 30 s Focus, tæt Star Stream, pause/rotation, lyd, offline-genstart og 15–20 minutters kontinuerlig flyvning. |
| Før offentlig rangering | **Fair runs og registrering af hjælp** | Redningsliv og fjer-finansieret fortsættelse kan påvirke score, men scorepayloaden fortæller ikke tavlen, om de blev brugt. | Vælg og implementér to adskilte tavler: *ren tur* (ingen rescue/continue) og *fri tur*; samme regler og seed for venner. Vis tydeligt hvilken tavle et resultat tilhører. |
| Før offentlig rangering | **Identitet, anti-cheat og moderering** | Både `playerId` og score kan aktuelt indsendes af klienten. “Venner” betyder kun direkte duelrivaler, ikke verificerede kontakter. | Signeret identitet/evt. konti, rate limits, sikre navne, plausibilitetskontrol og en plan for replay-/servervalidering. Kald ikke prototypetavlen manipulationssikker. |
| Før offentlig udgivelse | **Rettigheder og privatliv** | Den konkrete Chopin-indspilning, øvrige lyd-/grafikfiler og offentliggørelse af pilotnavne skal kunne bruges lovligt. | Rettighedsoversigt for hver kilde, privatlivstekst, slette-/navneprocedure og en gennemgang af indsamlede data. |
| Før en balanceret version 1.0 | **Progression og opnåelighed** | Tværgående krav, daglige missioner og priser kan se rimelige ud i tests, men føles anderledes for nye spillere. | 10–20 rigtige spillere når bane 2 og prøver mindst ét fjerkøb; mål frafald, dødsårsager, tid til oplåsning og om Focus føles hjælpsom uden at ødelægge tempo. Justér på data. |

**En lille lukket beta kan komme før alle rangeringstiltag**, hvis tavlen tydeligt mærkes som uverificeret testdata, og spillerne ikke loves præmier eller manipulationssikre rekorder. Ekstra baner bør ikke blokere denne test.

## Tre powerups, der kunne give noget nyt

1. **Streak Guard (implementeret prototype):** absorberer *én* overset stjerne uden at nulstille streak. Ét tydeligt badge sidder på streak-tælleren. Det er ikke et ekstra liv eller en kopi af Magnet, og pickup'en kan ikke stables. Test balancen på fysisk telefon.

1. **Scout Lens** — viser de næste cirka to sekunders sikre tunnelmidte eller et markeret hul før en svær forhindring. Giver information frem for at flytte fuglen automatisk; kan bruges på tværs af modes, men især i Pulse Tunnel.

1. **Time Anchor** — gemmer ét sikkert punkt og fører Bert kort tilbage ved det næste fatale sammenstød. Interessant som *fri flyvning*-eksperiment, men vanskelig for seeds, ghosts og rekordfairness. Først efter at assisted runs er skilt fra ren rangering.

**Streak Guard er første prototype.** Den passer til spillets vigtigste scoremekanik, kræver ingen ny styringsknap og har særskilt cooldown og visuelt tegn. Næste skridt er fysisk spiltest, ikke at tilføje flere powerups med det samme.

## Baner uden at udvande de ni, vi har

- **Crosswind Canyon (Classic):** synligt varslede sidevindsstød i en ny ørkenrute; korte vindeffekter frem for usynlig drift. Den nye mekanik skal kunne læres uden tekst midt i flyvningen.

- **Clockwork Towers (Flappy):** rør åbner og lukker i en gentagende, synlig rytme. Samme seed og klare cyklusmarkører gør den egnet til præcise dueller.

- **Afterglow (Tunnel):** mørkere tunnel hvor stjerner oplyser den kommende sikre linje. Udgangspunkt i Star Streams læsbarhed, men med en selvstændig timingregel.

**Vent med nye baner til de ni eksisterende består fysiske spiltests.** Læg derefter én bane ud med én ny regel, ikke tre nye mekanikker på én gang. Hver bane kræver egen art, lydretning, collider- og spacing-test samt et rimeligt unlockkrav.

## “Noget helt tredje”: ugentlig Star League

En **fælles seedet rute hver uge** med en ren leaderboardklasse, tre fair forsøg, valgfrit ghost fra venner og et kosmetisk badge eller fjer ved deltagelse. Ingen købte ekstraliv på den rangerede tavle; helte forbliver kosmetiske. Det udnytter de seedede dueller, eksisterende ruter og fjerøkonomien bedre end at tilføje endnu en valuta. Det kræver dog først identitet og troværdig scorehåndtering.

**Heltepræstationerne er implementeret:** Bert er starthelt; elleve andre kan primært vindes gennem konkrete præstationer, med dyre fjerpriser som alternativ. Krav og priser findes i `HERO_ROSTER_DESIGN.md`. Gamle spillere beholder deres senest valgte figur; øvrige tidligere åbne figurer skal nu vindes eller købes. Priser og indtjeningstakt skal testes på rigtige spillere før 1.0.

## Min anbefalede rækkefølge

1. Fysisk iPhone/Android-spiltest og rettelser af performance, styring, lyd og collider-retfærdighed.

1. Stabil drift, backup og **ren vs. hjulpet** rangering; identitet og validering før en offentlig konkurrencetavle.

1. Valider de nu implementerede heltekrav, fjerpriser og Streak Guard på rigtige spillere; justér ud fra data før næste powerup.

1. Ugentlig Star League og først derefter en enkelt ny bane.

**Beslutning vi bør tage sammen før offentlig launch:** Skal Focus, Shield, Magnet og Streak Guard være tilladt på den *rene* rangering? Mit forslag er ja for powerups, der kan spawne ens i den samme seedede bane; nej for købte/permanente redninger og betalte fortsættelser. Reglerne skal være synlige før en tur starter.
