# Bert The Bird — haptisk feedback

## Formål

Feedbacken skal føles som en diskret del af spillet, ikke som konstant vibration. Flyvestyringen vibrerer derfor ikke ved hvert tryk. Haptik bruges ved tydelige resultater og tilstandsskift.

## Feedbackordbog

| Hændelse | Feedback |
|---|---|
| Almindelig knap eller valg | Ét meget let prik |
| Almindelig stjerne | Ét let prik |
| Risikostjerne med dobbelt værdi | To korte prik |
| Mission hentet | Kort belønningsmønster |
| Powerup samlet | Tydelig opadgående dobbeltfeedback |
| Streak mistet efter mindst tre | Kort advarsel |
| Skjold knuses | Fast dobbeltfeedback |
| Redningsliv bruges | Kraftigere redningsmønster |
| Død | Markant sammenstødsmønster |
| Ny rekord eller ny bane | Fejringsmønster |

Spilleren kan slå al haptik fra under **Lyd & feedback**. Indstillingen gemmes lokalt.

## Platformstrategi

- Browsere med standardens Vibration API bruger `navigator.vibrate()` og kan afspille de fulde mønstre. API'et kræver tidligere brugeraktivering og gør ingenting på enheder uden understøttelse.
- iOS WebKit har ikke den almindelige Vibration API. iOS 18+ understøtter i stedet en ikke-standard haptisk reaktion på `<input type="checkbox" switch>`. Spillets knapper får derfor et gennemsigtigt, betroet switch-label som direkte touchlag. Gameplayhændelser forsøger desuden en skjult switch-fallback; hvor WebKit begrænser programmatisk feedback, er den direkte knapfeedback stadig den robuste iOS-vej.
- Der vibreres ikke på hvert OP/NED-tryk, fordi det ville blive støjende og hurtigt udmatte feedbackens betydning.

## Kilder

- MDN, `Navigator.vibrate()`: https://developer.mozilla.org/en-US/docs/Web/API/Navigator/vibrate
- Ionic Framework issue om Safari/iOS switch-haptik: https://github.com/ionic-team/ionic-framework/issues/29942
- `ios-haptics`, referenceimplementering med betroet label over knappen: https://github.com/tijnjh/ios-haptics
