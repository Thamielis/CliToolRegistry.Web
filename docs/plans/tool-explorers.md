# Tool-Inhalte erforschen: Analyse und Seitenentwurf

Stand: 2026-10-11. Status: vollständige Implementierungsplanung abgeschlossen; zwölf Beads bereit, Umsetzung noch nicht gestartet.

Der [Implementierungsplan](tool-explorers-implementation.md) konkretisiert diesen Entwurf anhand der aktuellen Workbench. Die [Datensatzanalyse](tool-explorers/analysis.md) dokumentiert acht aufgenommene JSON-Quellen und den ignorierten Klartextleitfaden mit `.json`-Endung.

## Ziel und Umfang

Besucher sollen die bereitgestellten Tool-Dokumentationen durchsuchen, Zusammenhänge verstehen und passende Befehle finden. Jedes Tool erhält einen eigenen Einstieg; jede aufgenommene gültige JSON-Datei erhält eine Seite. `.json`-Dateien mit Klartext werden ignoriert. Weitere valide Dateien werden unter ihrem Tool registriert.

Die sechs individuellen Entwürfe:

- [br: Agentenleitfaden](tool-explorers/br.md)
- [bv: Robot-Befehle und Voraussetzungen](tool-explorers/bv.md)
- [cass: Fähigkeiten und Befehlsreferenz](tool-explorers/cass.md)
- [ee: Befehlsatlas und Snapshot](tool-explorers/ee.md)
- [fmd: Rendering-Fähigkeiten](tool-explorers/fmd.md)
- [ubs: Scan-Referenz und Ausgabeverträge](tool-explorers/ubs.md)

## Tatsächlich vorhandene Daten

| Quelle unter `public/robot-docs/` | Dateigröße | Dokumentierter Stand | Inhalt |
| --- | ---: | --- | --- |
| `br.robot-docs.json` | 3.291 Bytes | 0.7.4; Vertrag `br.robot_docs.v1` | 52 Leitfadenzeilen, 8 kanonische Befehle |
| `bv.robot-docs.json` | 28.764 Bytes | v0.25.2; Thema `all` | 41 Befehle, 18 Aufrufzuordnungen, 10 Beispiele, 11 Umgebungsvariablen, 3 Exitcodes |
| `cass.capabilities.json` | 143.228 Bytes | 0.10.0; API 1; Vertrag `1` | 47 Befehle, 314 Argumenteinträge, 9 globale Optionen, 30 Fähigkeiten, 32 Connectoren, 67 Umgebungsvariablen, 22 Exitcodes, 7 Workflows, 47 Aufrufkorrekturen, 4 Limits |
| `br.capabilities.json` | 13.479 Bytes | 0.7.4; `br.capabilities.v1` | 46 Befehle mit Operation, Workspace und Ausgabeformat; 5 Fähigkeiten; 9 Exitcodes |
| `bv.capabilities.json` | 22.994 Bytes | v0.25.2; Vertrag `1.0.0` | 41 Befehle mit bevorzugten/akzeptierten Aufrufen; 18 Aliaszuordnungen; 6 dokumentierte Themen |
| `ee.capabilities.json` | 53.934 Bytes | 0.17.0; Envelope `ee.response.v2` | 557 Befehlspfade, 130 Umgebungsdefinitionen, 6 Subsysteme, 8 Features, 2 nicht implementierte Fähigkeiten |
| `fmd.capabilities.json` | 6.215 Bytes | 0.5.0; Vertrag `0.1.0` | 11 Befehlseinträge mit 42 Beispielen, 48 Feature-Statuswerte, 6 Ausgabearten, Theme-/PDF-Metadaten |
| `fmd.robot-docs.json` | 8.011 Bytes | Kein strukturierter Versionswert | Klartextleitfaden, 88 Zeilen; kein gültiges JSON |
| `ubs.robot-docs.json` | 18.406 Bytes | 5.4.17; Schema `1` | 6 Aufrufformen, 45 Flags, 9 Beispiele, 19 Umgebungsvariablen, 4 Exitcodes, 5 Ausgabeverträge |

Acht Dateien sind gültiges JSON und werden aufgenommen. `fmd.robot-docs.json` enthält Klartext und wird gemäß Nutzerkorrektur ignoriert: keine Registrierung, Seite, Suche oder Explorer-Downloadverknüpfung. Die Originaldatei bleibt unverändert. Die Angaben beschreiben Quell-Snapshots, keine live geprüfte Installation. Bei cass zählen die 314 Einträge Argumentvorkommen über alle Befehle, nicht eindeutige Optionsnamen.

`bv.generated_at` ist `2026-10-09T10:42:48Z`. br und cass enthalten keinen Erstellungszeitpunkt. Bei cass sind `build_commit` und `build_commit_date` jeweils `unknown`; die Oberfläche zeigt dafür „Nicht angegeben“. Keine Ersatzdatierung durch den Katalogzeitpunkt.

Die bestehenden Katalog-IDs `br`, `bv`, `cass`, `ee`, `fmd` und `ubs` stimmen mit den vorgesehenen Tool-Einstiegen überein. `beads` ist ein eigener Katalogeintrag und darf nicht automatisch mit `br` gleichgesetzt werden.

`Get-CliTools.ps1` nennt weitere geplante cass-Themen und einen Export nach `cass.commands.robot-docs.json`. Diese Datei ist aktuell nicht vorhanden. Der Entwurf zeigt nur tatsächlich vorhandene Datensätze.

## Navigation und Adressen

Vorgeschlagene Adressen relativ zur bestehenden GitHub-Pages-Basis `/CliToolRegistry.Web/`:

| Adresse | Darstellung |
| --- | --- |
| `?section=explore` | Alle Tools mit bereitgestellten Erkundungsdaten |
| `?section=explore&exploreTool=br` | br-Einstieg mit zwei Datensätzen |
| `?section=explore&exploreTool=br&dataset=robot-docs` | br-Leitfaden |
| `?section=explore&exploreTool=bv&dataset=capabilities` | bv-Aufruf- und Fähigkeitsvertrag |
| `?section=explore&exploreTool=cass&dataset=capabilities` | cass-Fähigkeiten und Befehle |
| `?section=explore&exploreTool=ee&dataset=capabilities` | ee-Befehlsatlas |
| `?section=explore&exploreTool=fmd&dataset=capabilities` | fmd-Rendering-Fähigkeiten |
| `?section=explore&exploreTool=ubs&dataset=robot-docs` | UBS-Referenz |

Ein einzelner vorhandener Datensatz wird direkt geöffnet. Bei mehreren Datensätzen zeigt der Tool-Einstieg eine Übersicht mit Thema, Version und Inhaltsart; die zuletzt besuchte Datei darf angeboten werden, ersetzt aber keine eindeutige Adresse. Die Datei-Seite besitzt einen Datensatzwechsler.

Die seit dem ersten Entwurf hinzugekommene Workbench verwendet `parseNavigation`/`navigationUrl` aus `src/data/workbench.ts` und `popstate` in `App.tsx`. Die Erkundung erweitert dieses bestehende Query-System. Beispiel: `?section=explore&exploreTool=bv&dataset=capabilities&docSection=commands&entry=cmd%3Arobot-history&needs=git`. Katalogsuche `q` und Datensatzsuche `docQ` bleiben getrennt. Direktaufrufe und Neuladen bleiben auf GitHub Pages ohne Server-Routen möglich. Vor-/Zurück-Navigation stellt den Zustand wieder her. Suche aktualisiert die aktuelle Adresse; bewusste Seiten- oder Eintragswechsel erzeugen einen History-Eintrag. Die früher vorgeschlagenen Hash-Routen waren noch nicht implementiert und werden nicht eingeführt.

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

Der Entwurf übernimmt das aktuelle Dark-/Light-System, lokale Tool-Logos und vorhandene Schriftrollen. Canvas, Oberfläche, Text, Kontur und Akzente stammen ausschließlich aus den bestehenden `--registry-*`-Tokens. Frühere konkrete Hexwerte sind keine neuen Themevorgaben. Befehle und technische Schlüssel verwenden die bestehende Monospace-Rolle; neue Schriftdownloads sind nicht nötig.

Das charakteristische Element ist pro Tool inhaltlich begründet: br zeigt Arbeitsablauf und Operationsmatrix, bv eine Voraussetzungenmatrix, cass eine Befehls- und Argumentreferenz, ee einen hierarchischen Befehlsatlas, fmd eine Feature-/Ausgabereferenz und ubs einen Scan-/Ausgabevertrag. Glow bleibt auf Seitenkopf und aktive Auswahl begrenzt. Keine animierten Scheingraphen aus Dokumentationsdaten. Abhängigkeiten, Session-Ergebnisse und reale Tool-Gesundheit werden nicht als vorhanden dargestellt.

UI-Beschriftungen werden Deutsch/Englisch angeboten. Quelldokumentation bleibt in ihrer Originalsprache, analog zum vorhandenen Katalog. Badges haben Text und Farbe; True/False/fehlend werden als „Ja“/„Nein“/„Nicht dokumentiert“ unterschieden.

## Erweiterung um weitere Dateien

Ein expliziter Datensatzkatalog beschreibt `toolId`, `datasetId`, `filename`, `title`, `adapter` und unterstützte Verträge. Alle aufgenommenen Quellen sind JSON. Stabile IDs bilden Adressen; Fachadapter trennen die acht JSON-Strukturen. Einträge erhalten stabile IDs, Bereich, Suchtext und Herkunft; tool-spezifische Metadaten bleiben erhalten.

Ein Build-Schritt filtert nichtparsebare `.json`-Dateien aus und erzeugt aus gültigen registrierten Quellen ein Manifest. Ignorierter Klartext ist allein kein Buildfehler. Neue gültige Dateien benötigen einen Registry-Eintrag; unregistrierte gültige Dateien erhalten eine Inventardiagnose. Unbekannte gültige JSON-Strukturen können generisch nach Schlüssel, Wert und Pfad erforscht werden. Keine Dateinamenheuristik ordnet ein Tool zu und kein Textfallback wird eingeführt.

Mehrere Dateien werden nicht still zusammengeführt. Gleichnamige Befehle aus verschiedenen Snapshots behalten Version und Herkunft; widersprüchliche Inhalte bleiben sichtbar. Es gibt keine ausgedachten leeren Bereiche für noch nicht gelieferte Daten. Neue cass-Themen erweitern den Tool-Einstieg, ohne die bestehende Fähigkeiten-Seite zu ersetzen.

Runtime-Dateien werden nur beim Öffnen geladen, über `import.meta.env.BASE_URL + 'robot-docs/' + filename`. Suchindizes entstehen im Speicher pro geladenem Datensatz. Ein Datensatzfehler blockiert die anderen Seiten nicht. Für die aktuelle Größe ist kein neuer Suchdienst nötig; größere künftige Dateien werden vor einer Architekturänderung gemessen.

Unbekannte Zusatzfelder bleiben in der Rohansicht erreichbar. Nicht unterstützte Verträge öffnen die generische JSON-Ansicht. Nichtparsebare Quelldateien werden lokal als ignoriert gemeldet und nicht veröffentlichtes Explorer-Inventar. Laufzeit-Integritäts-/Parsefehler eines zuvor aufgenommenen Datensatzes haben einen Retry-Zustand, keine Textansicht.

## Interaktionen und Grenzen

- Befehle können mit sichtbarer Erfolg-/Fehlerrückmeldung kopiert werden. Platzhalter bleiben erkennbar. Die Seiten führen keine Befehle aus.
- Rohdaten sind als Text/JSON dargestellt. Keine HTML-Ausführung aus Quellstrings; ein späterer Markdown-Renderer muss HTML deaktivieren.
- Suchtreffer erhalten dezente Hervorhebung, Trefferzahl und einen klaren Leerzustand mit „Filter zurücksetzen“.
- Laden, Ladefehler mit „Erneut laden“, fehlender Datensatz und unbekannter Eintrag besitzen eigene Zustände. Ein ungültiger Eintragslink bietet die betreffende Übersicht an.
- Bereiche sind normale navigierbare Links; die aktive Auswahl ist markiert. Fokus folgt einem bewussten Detailwechsel zur Detailüberschrift. Live-Regionen melden Trefferzahl und Kopierergebnis, nicht jeden Rohdatenwechsel.
- Mobil, Tastatur, Light Theme, Reduced Motion und Forced Colors gehören zum selben Entwurf.
- Ein Dokumentations-Badge „Ändert Zustand“ beschreibt das dokumentierte Kommando. Es sagt nichts über einen ausgeführten Vorgang aus.

## Umsetzungsvorschlag und Abnahme

Der vollständige [Implementierungsplan](tool-explorers-implementation.md) wurde in vier qualifizierten High-Reviews über Oracle-MCP verfeinert und in zwölf selbstständige Beads mit 23 Abhängigkeiten übertragen. [Reviewprotokoll](tool-explorers-review.md) und [Übergabe](tool-explorers/handoff.md) enthalten den Nachweis; keine Seitenimplementierung begonnen.

| Arbeitspaket | Abhängigkeit | Nachweis |
| --- | --- | --- |
| Grundlagen P01–P05: Registry, Manifest, Adapter, Loader, URL | Plan verfeinert und angenommen | Acht JSON-Quellen, Klartext ignoriert, Digest/Herkunft und Query-Navigation |
| Rahmen P06 | Grundlagen | Index, sechs Tool-Einstiege, acht Seiten; ohne Katalog nutzbar |
| Fachseiten P07–P10 | Adapter und Rahmen | br/bv/cass/ee/fmd/ubs mit allen tatsächlich gelieferten Bereichen |
| Integration P11 | Rahmen | Karten, Karten+, Tabelle, Details und Palette konsistent |
| Abnahme P12 | Fachseiten und Integration | Quelltreue, Erweiterungsprobe, Produktions- und Workbench-Regression |

Verhaltensprüfungen umfassen Kombinationen von Suche/Filtern, fehlende optionale Felder, Quelltreue, veraltete Detailauswahl, defekte Datei, Clipboard-Fehler, Deep Links und mobile Tastaturnavigation. Bestehende Katalog- und Logo-Prüfungen bleiben relevant. Bei Umsetzung sind `npm run lint`, `npm run build` und `npm run test:ui` erforderlich; ein Build kann den Katalogexport aktualisieren und muss daher auf unbeabsichtigte Änderungen geprüft werden.
