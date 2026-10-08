# Abschließende Oracle-MCP-Review

Datum: 2026-10-08. Session: `ctr-web-tool-logo-plan-2`. Modell: GPT-5.6 Sol, Auswahl bestätigt. Extra High war nicht verfügbar; die bestehende Browser-Effort-Einstellung wurde verwendet. Diese Review bewertet den Plan, keine implementierten Logo-Assets.

+APPROVE

Die vier früheren Korrekturpunkte sind im überarbeiteten Plan jetzt **ausreichend konkret und implementierbar** abgedeckt:

- **Legacy `AppEntry.icon` bleibt berücksichtigt:** `AppEntry.icon?: string` existiert weiterhin im aktuellen Typmodell, und L1/L3 definieren jetzt eine klare Migration: Text/Emoji bleibt als Fallback erhalten; alte Bildquellen werden inventarisiert und bei Erhalt lokal kuratiert, nicht mehr direkt geladen. Das passt zum heutigen Verhalten von `AppIcon.tsx`, ohne die Legacy-Aufrufer `AppCard`/`AppRow` unnötig umzubauen.
- **Fehlerzustand ist quellengebunden:** `failedSource === currentSource` plus die expliziten Tests für Source-Wechsel und verspätete `onError`-Events beheben genau das Problem des heutigen globalen `failed`-Booleans. Der Plan vermeidet dabei auch einen unnötigen Reset-Effect.
- **Theme-Reaktivität ist korrekt adressiert:** Der Source bestätigt die beschriebene Lücke: `ThemeContext` veröffentlicht aktuell nur `theme`; der `matchMedia`-Listener aktualisiert lediglich DOM/Meta. Das geplante `resolvedTheme` im bestehenden Provider ist daher die richtige kleine Erweiterung und deckt sowohl manuelle Auswahl als auch Live-OS-Wechsel unter `system` ab.
- **Asset-Provenienz ist jetzt Abnahmekriterium:** `docs/tool-logo-sources.md` verlangt für jede ID Klassifikation und für jedes eingecheckte Asset Quelle, Version/Commit soweit verfügbar sowie Nutzungs-/Attributionshinweise. Undokumentierte Assets sind ausdrücklich nicht abnahmefähig.

Die übrige Architektur bleibt sauber begrenzt: lokales ID-Manifest, `BASE_URL` für `/CliToolRegistry.Web/`, keine Runtime-Favicon-/Avatar-Abhängigkeit, Wiederverwendung von `AppIcon`, keine Schemaänderung und keine neue Infrastruktur.

**Keine blockierenden Restpunkte gefunden.**

Die noch offene tatsächliche **Logo-Abdeckung** ist davon klar zu trennen: Welche der 89 Tools am Ende ein eigenes Projektlogo, ein Familienlogo oder nur einen Fallback erhalten, kann erst L1/L2 ergeben. Das ist eine vorgesehene Asset-Inventur und **kein Korrektheitsmangel des Plans**.
