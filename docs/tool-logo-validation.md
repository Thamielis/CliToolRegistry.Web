# Tool-Logo-Abnahme

Stand: 2026-10-08. Ergebnisbericht zu Epic `ctrw-tm9` und den sechs Teil-Beads.

## Ergebnisse

| Prüfung | Ergebnis |
|---|---|
| `npm run validate:logos` | Bestanden: 89 Katalog-IDs, 89 Manifest-Einträge, 89 Quellenzeilen; 5 Projektlogos, 4 Familienlogo-Zuordnungen, 80 Fallbacks; 8 von 8 lokalen Dateien referenziert und dokumentiert. SVG-Prüfung ohne aktive Inhalte, Handler oder externe Bild-/Ressourcenreferenzen. |
| `npm run test:ui` | Bestanden: 18/18 Playwright-Tests einschließlich bestehender Katalogregressionen und neuer Logo-/Theme-/Legacy-Fälle; Axe ohne Befunde im geprüften Detailzustand. |
| `npm run lint` | Exit 0. Oxlint meldet die vorhandene Fast-Refresh-Regel für den Theme-Context-Export sowie denselben bestehenden Hinweis für `LocaleContext`; keine Fehler. |
| `npm run build` | Bestanden: TypeScript und Vite-Produktionserstellung. `prebuild` synchronisierte 89 Tools aus 8 Dateien. Die dadurch generierte Änderung an `public/registry-catalog.json` (Zeitstempel und `ms`-Completion-Daten) wurde zurückgenommen; Katalogdatei und Schema bleiben im Enddiff unverändert. |
| Frontend Design Premium, `audit_project.py . --mode strict` | Bestanden: 0 Befunde, 0 Warnungen, 0 Verstöße. |

## Browserfälle und Screenshots

Playwright hat Projektlogos tatsächlich dekodiert (`complete` und `naturalWidth > 0`), darunter Git, .NET, Bun, Pandoc, Python, Docker und Vercel. Geprüft wurden der `/CliToolRegistry.Web/`-Unterpfad, unbekannte IDs, blockierte/beschädigte Quellen, Wiederherstellung bei Quellenwechsel, ein verspäteter Fehler der alten Quelle, Vercel-Varianten bei manuellem und systemgesteuertem Theme-Wechsel, ein beschädigtes Dunkel-Asset mit gültiger Hell-Variante, blockierter `localStorage`, Legacy-Emoji und URL-Ersatz sowie null externe Bildanfragen.

Cards+, Karten, Tabelle und geöffnete Details wurden auf Desktop und bei 320px/390px aufgenommen. Die Screenshots liegen als Playwright-Artefakte unter `test-results/`, darunter `cards-dark-desktop.png`, `cards-light-desktop.png`, `table-light-desktop.png`, `details-dark-desktop.png`, `details-light-desktop.png`, `cards-dark-mobile-320.png`, `details-dark-mobile-320.png`, `table-dark-mobile-320.png` und `cards-compact-dark-mobile-390.png`. Der mobile Test prüft zusätzlich, dass das Dokument nicht breiter als der Viewport wird.

## Abdeckung und Restfälle

Die echte Abdeckung beträgt 9 von 89 IDs: fünf projektspezifische Logos (`dotnet`, `bun`, `git`, `pandoc`, `python3`) und vier Markenfamilien-Zuordnungen (drei Docker-Produkte, Vercel CLI). Die verbleibenden 80 IDs erhalten deterministische Initialen und werden ausdrücklich nicht als Logo-Abdeckung gezählt. Für 7-Zip war der offizielle Logo-Link nicht verfügbar; GitHub CLI, Go und Node.js bleiben wegen ihrer jeweiligen Markeneinschränkungen bei Initialen. Die ohne Website/Repository katalogisierten APR-, CAAM-, CASR-, RCH- und Source2Prompt-Identitäten wurden gezielt geprüft und bleiben mangels belegter nutzbarer Bildmarke Fallbacks.

Die Markenübersicht nutzt nur lokale Dateien. Es gibt keinen Google-Favicon-, Avatar- oder sonstigen Logo-CDN-Aufruf. Legacy-Text und Emoji bleiben zulässig; URL- und Dateipfadwerte werden verworfen. Die Attributions-, Marken- und Quellenhinweise stehen in [tool-logo-sources.md](tool-logo-sources.md).
