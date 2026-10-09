# Tool-Inhalte erforschen: Analyse und Seitenentwurf

Stand: 2026-10-09. Status: ausgearbeiteter Seitenentwurf, noch keine Implementierung oder APR-Freigabe.

## Ziel und Umfang

Besucher sollen die bereitgestellten Tool-Dokumentationen durchsuchen, Zusammenhänge verstehen und passende Befehle finden. Jedes Tool erhält einen eigenen Einstieg; jede vorhandene JSON-Datei erhält eine eigenständig verlinkbare Erkundungsseite. Weitere Dateien desselben Tools erscheinen als zusätzliche Datensätze unter diesem Einstieg.

Die drei individuellen Entwürfe:

- [br: Agentenleitfaden](tool-explorers/br.md)
- [bv: Robot-Befehle und Voraussetzungen](tool-explorers/bv.md)
- [cass: Fähigkeiten und Befehlsreferenz](tool-explorers/cass.md)

## Tatsächlich vorhandene Daten

| Quelle unter `public/robot-docs/` | Dateigröße | Dokumentierter Stand | Inhalt |
| --- | ---: | --- | --- |
| `br.robot-docs.json` | 3.291 Bytes | 0.7.4; Vertrag `br.robot_docs.v1` | 52 Leitfadenzeilen, 8 kanonische Befehle |
| `bv.robot-docs.json` | 28.764 Bytes | v0.25.2; Thema `all` | 41 Befehle, 18 Aufrufzuordnungen, 10 Beispiele, 11 Umgebungsvariablen, 3 Exitcodes |
| `cass.capabilities.json` | 143.228 Bytes | 0.10.0; API 1; Vertrag `1` | 47 Befehle, 314 Argumenteinträge, 9 globale Optionen, 30 Fähigkeiten, 32 Connectoren, 67 Umgebungsvariablen, 22 Exitcodes, 7 Workflows, 47 Aufrufkorrekturen, 4 Limits |

Alle drei Dateien sind gültiges JSON. Die Angaben stammen aus den Dateien und beschreiben deren Snapshot, nicht eine live geprüfte Installation. Bei cass beziehen sich 314 Einträge auf Argumente über alle Befehle hinweg, nicht auf eindeutige Optionsnamen.

`bv.generated_at` ist `2026-10-09T10:42:48Z`. br und cass enthalten keinen Erstellungszeitpunkt. Bei cass sind `build_commit` und `build_commit_date` jeweils `unknown`; die Oberfläche zeigt dafür „Nicht angegeben“. Keine Ersatzdatierung durch den Katalogzeitpunkt.

Die bestehenden Katalog-IDs `br`, `bv` und `cass` stimmen mit den vorgesehenen Tool-Einstiegen überein. `beads` ist ein eigener Katalogeintrag und darf nicht automatisch mit `br` gleichgesetzt werden.

`Get-CliTools.ps1` nennt weitere geplante cass-Themen und einen Export nach `cass.commands.robot-docs.json`. Diese Datei ist aktuell nicht vorhanden. Der Entwurf zeigt nur tatsächlich vorhandene Datensätze.

## Navigation und Adressen

Vorgeschlagene Adressen relativ zur bestehenden GitHub-Pages-Basis `/CliToolRegistry.Web/`:

| Adresse | Darstellung |
| --- | --- |
| `#/explore` | Alle Tools mit bereitgestellten Erkundungsdaten |
| `#/explore/br` | Tool-Einstieg; bei einer Datei direkte Weiterleitung zu deren Seite |
| `#/explore/br/robot-docs` | br-Leitfaden |
| `#/explore/bv/robot-docs` | bv-Robot-Referenz |
| `#/explore/cass/capabilities` | cass-Fähigkeiten und Befehle |
| `#/explore/cass/robot-docs-commands` | Erst verfügbar, wenn die entsprechende Datei bereitgestellt wird |

Ein einzelner vorhandener Datensatz wird direkt geöffnet. Bei mehreren Datensätzen zeigt der Tool-Einstieg eine Übersicht mit Thema, Version und Inhaltsart; die zuletzt besuchte Datei darf angeboten werden, ersetzt aber keine eindeutige Adresse. Die Datei-Seite besitzt einen Datensatzwechsler.

Hash-Adressen erlauben Direktaufrufe und Neuladen auf der vorhandenen statischen Bereitstellung ohne zusätzliche Server-Routen. Filter und Auswahl stehen in der Hash-Abfrage, beispielsweise `#/explore/bv/robot-docs?section=commands&entry=robot-history&needs=git`. Ein kleiner zentraler Parser validiert diese Werte. Vor-/Zurück-Navigation stellt den Zustand wieder her. Suche aktualisiert die aktuelle Adresse; bewusste Seiten- oder Eintragswechsel erzeugen einen History-Eintrag.

In ToolDetails erscheint „Inhalte erforschen“, wenn Daten vorhanden sind. Karten und Tabelle erhalten denselben Link mit Anzahl der Datensätze. Der Katalog behält seine bisherigen Ansichten und Filter. Zurück zum Katalog stellt die vorherige Such- und Scrollposition innerhalb der Sitzung wieder her. Erkundungsseiten sind auch ohne erfolgreich geladenen Katalog erreichbar; Logo und Tool-Name bekommen dann lokale Fallbacks.

## Gemeinsamer Seitenrahmen

```text
Katalog / Tool / Datensatz                       Sprache | Theme
[Logo] Toolname · Dokumentation                  [Datensatz wechseln]
Datei · dokumentierte Version · Zeitpunkt, falls vorhanden

[In diesem Datensatz suchen …]       [Filter zurücksetzen]
┌──────────────────┬────────────────────────┬──────────────────────┐
│ Inhaltsbereiche  │ Treffer / Lesebereich │ Ausgewählter Eintrag │
│ mit Trefferzahl  │ mit echten Inhalten   │ Details und Quelle   │
│                  │                       │ Kopieren / Permalink │
└──────────────────┴────────────────────────┴──────────────────────┘
Originaldatei ansehen · JSON herunterladen
```

Auf breiten Bildschirmen: maximal 1.440 px Inhaltsbreite, ca. 220 px Bereichsnavigation, flexible Hauptspalte und bei Listen ca. 360 px Detailspalte. Der br-Lesebereich nutzt zwei Spalten statt einer unnötigen Trefferliste. Auf mittleren Breiten wandern Details unter die Auswahl. Mobil stehen Bereichsauswahl, Suche, Treffer und Details untereinander; kein horizontaler Seiten-Scroll und keine verschachtelten Scrollkäfige.

Die Suche umfasst Namen, Beschreibungen, Befehle und die im jeweiligen Entwurf festgelegten Unterfelder. Sie durchsucht zunächst die aktuelle Datei, zeigt Treffer nach Bereich und erhält den Suchtext beim Bereichswechsel. Ein Tool-weites Suchen über mehrere Dateien kann später ergänzt werden; die erste Fassung kennzeichnet den Suchumfang ausdrücklich.

Jeder dargestellte Eintrag kann seine Herkunft zeigen: Dateiname und JSON-Pointer, etwa `/commands/6` oder `/commands/robot-history`. Die Rohansicht zeigt das Quellobjekt, nicht ein normalisiertes Ersatzobjekt. Herkunft steht in einem aufklappbaren Detailbereich, damit sie die normale Erkundung nicht überlagert.

## Visuelle Richtung

Der Entwurf übernimmt das aktuelle Dark-/Light-System, lokale Tool-Logos und die vorhandenen Schriftrollen. Dunkle Basis: Canvas `#08090d`, Oberfläche `#111319`, angehobene Fläche `#191c24`, Text `#f1f2f5`, Sekundärtext `#b0b4c0`, Kontur `#2b2f3a`. Akzente und helle Variante werden über die bestehenden `--registry-*`-Tokens bezogen. Befehle und technische Schlüssel verwenden die bestehende Monospace-Rolle; neue Schriftdownloads sind nicht nötig.

Das charakteristische Element ist pro Tool inhaltlich begründet: br zeigt einen Arbeitsablauf, bv eine filterbare Voraussetzungenmatrix, cass eine zusammenhängende Befehls- und Argumentreferenz. Glow bleibt auf Seitenkopf und aktive Auswahl begrenzt. Keine animierten Scheingraphen aus Dokumentationsdaten. Abhängigkeiten, Session-Ergebnisse und reale Tool-Gesundheit werden nicht als vorhanden dargestellt.

UI-Beschriftungen werden Deutsch/Englisch angeboten. Quelldokumentation bleibt in ihrer Originalsprache, analog zum vorhandenen Katalog. Badges haben Text und Farbe; True/False/fehlend werden als „Ja“/„Nein“/„Nicht dokumentiert“ unterschieden.

## Erweiterung um weitere Dateien

Ein kleiner expliziter Datensatzkatalog beschreibt `toolId`, `datasetId`, `filename`, `title`, `kind`, `adapter` und unterstützte Vertragsversionen. Stabile IDs bilden Adressen; Dateinamen bleiben austauschbar. Fachadapter trennen br-Leitfaden, bv-Robot-Dokumentation und cass-Fähigkeiten. Die UI bekommt gemeinsame Einträge mit stabiler ID, Bereich, Suchtext und Herkunft; tool-spezifische Metadaten bleiben erhalten.

Ein Build-Schritt erfasst die JSON-Dateien unter `public/robot-docs/`, prüft Parsebarkeit, doppelte IDs und Quellenzuordnung und erzeugt ein Manifest. Dadurch erscheinen neue Dateien zuverlässig auch im statischen Deployment. Bekannte neue Themen erhalten einen Adapter; unbekannte Strukturen erhalten eine generische Objekt-/Array-Erkundung mit Suche nach Schlüssel, Wert und JSON-Pfad. Unzugeordnete Dateien erscheinen unter „Weitere Datensätze“, bis die Tool-Zuordnung explizit ergänzt wird. Das Tool wird nicht allein aus einem beliebigen Dateinamen geraten.

Mehrere Dateien werden nicht still zusammengeführt. Gleichnamige Befehle aus verschiedenen Snapshots behalten Version und Herkunft; widersprüchliche Inhalte bleiben sichtbar. Es gibt keine ausgedachten leeren Bereiche für noch nicht gelieferte Daten. Neue cass-Themen erweitern den Tool-Einstieg, ohne die bestehende Fähigkeiten-Seite zu ersetzen.

Runtime-Dateien werden nur beim Öffnen geladen, über `import.meta.env.BASE_URL + 'robot-docs/' + filename`. Suchindizes entstehen im Speicher pro geladenem Datensatz. Ein Datensatzfehler blockiert die anderen Seiten nicht. Für die aktuelle Größe ist kein neuer Suchdienst nötig; größere künftige Dateien werden vor einer Architekturänderung gemessen.

Unbekannte Zusatzfelder bleiben in der Rohansicht erreichbar. Nicht unterstützte Vertragsversionen öffnen die generische Ansicht mit Hinweis. Ungültige JSON-Dateien erscheinen als betroffene, nicht verfügbare Datensätze; der Build-Bericht nennt die Datei und die Ursache. Das Veröffentlichungs-Gate muss defekte Dateien melden, statt sie still zu übergehen.

## Interaktionen und Grenzen

- Befehle können mit sichtbarer Erfolg-/Fehlerrückmeldung kopiert werden. Platzhalter bleiben erkennbar. Die Seiten führen keine Befehle aus.
- Rohdaten sind als Text/JSON dargestellt. Keine HTML-Ausführung aus Quellstrings; ein späterer Markdown-Renderer muss HTML deaktivieren.
- Suchtreffer erhalten dezente Hervorhebung, Trefferzahl und einen klaren Leerzustand mit „Filter zurücksetzen“.
- Laden, Ladefehler mit „Erneut laden“, fehlender Datensatz und unbekannter Eintrag besitzen eigene Zustände. Ein ungültiger Eintragslink bietet die betreffende Übersicht an.
- Bereiche sind normale navigierbare Links; die aktive Auswahl ist markiert. Fokus folgt einem bewussten Detailwechsel zur Detailüberschrift. Live-Regionen melden Trefferzahl und Kopierergebnis, nicht jeden Rohdatenwechsel.
- Mobil, Tastatur, Light Theme, Reduced Motion und Forced Colors gehören zum selben Entwurf.
- Ein Dokumentations-Badge „Ändert Zustand“ beschreibt das dokumentierte Kommando. Es sagt nichts über einen ausgeführten Vorgang aus.

## Umsetzungsvorschlag und Abnahme

Dies ist eine Entwurfsgrundlage. Vor Beads-Erstellung folgt die vom Nutzer gewünschte detaillierte Planung mit planning-workflow/APR über Oracle-MCP. Dieser Entwurf behauptet keine durchgeführten Oracle-Reviews.

| Arbeitspaket | Abhängigkeit | Nachweis |
| --- | --- | --- |
| A: Datensatzkatalog, Manifest, Validierung und Adapter | Seitenentwurf angenommen | Tatsächliche Dateimengen und fehlende Felder korrekt; unbekannte Struktur erforschbar |
| B: Adressen, gemeinsamer Rahmen und Katalog-Verknüpfung | A | Direktaufruf, Reload, History und BASE_URL funktionieren |
| C: br-Seite | A, B | 8 kanonische Befehle und vollständiger Leitfaden erreichbar |
| D: bv-Seite | A, B | 41 Befehle; Filter, 18 Aliaszuordnungen und 2 Zustandsänderungen korrekt |
| E: cass-Seite | A, B | 47 Befehle; 314 Argumenteinträge; alle zusätzlichen Bereiche erreichbar |
| F: Gemeinsame Regression und Erweiterungsprobe | C, D, E | Zweite Datei desselben Tools und unbekannter Datensatz ohne Seitenumbau ergänzbar |

Verhaltensprüfungen umfassen Kombinationen von Suche/Filtern, fehlende optionale Felder, Quelltreue, veraltete Detailauswahl, defekte Datei, Clipboard-Fehler, Deep Links und mobile Tastaturnavigation. Bestehende Katalog- und Logo-Prüfungen bleiben relevant. Bei Umsetzung sind `npm run lint`, `npm run build` und `npm run test:ui` erforderlich; ein Build kann den Katalogexport aktualisieren und muss daher auf unbeabsichtigte Änderungen geprüft werden.
