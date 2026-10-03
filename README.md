# Bert The Bird

Et dansk 2D-flyvespil. Bert startede som et Unity-spil i 2014 og er nu genopbygget som et browserspil, der kan installeres på telefonen (PWA) og spilles offline.

## Indhold

| Mappe | Hvad det er |
| --- | --- |
| `webapp/` | Selve spillet: HTML, JavaScript, grafik og lyd. Det er denne mappe, der skal online. |
| `server/` | Valgfri Python-server til ranglister og dueller. Spillet virker uden. |
| `BertTheBird/` | Det originale Unity-projekt fra 2014, til reference. |
| `tests/` | Automatiske tests af fysik, baner og progression. |
| `tools/` | Hjælpescripts til grafik og builds. |
| `docs/` | Designnoter: baner, helte, økonomi, musik og idéer. |

## Kør spillet lokalt

```
python3 server/server.py --port 8080
```

Åbn derefter http://localhost:8080/ i browseren.

## Status

Se `DEVELOPMENT_PLAN.md` for hvad der er færdigt, og hvad der mangler.
