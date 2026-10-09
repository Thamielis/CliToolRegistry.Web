# cass: Fähigkeiten und Befehle erforschen

Quelle: `public/robot-docs/cass.capabilities.json`. Adresse: `#/explore/cass/capabilities`. Gemeinsamer Rahmen: [Seitenkonzept](../tool-explorers.md).

## Analyse

Version und Crate-Version 0.10.0, API-Version 1, Vertragsversion als String `1`. Commit und Commitdatum sind `unknown`; ein Erstellungszeitpunkt fehlt.

`commands` ist ein Array mit 47 eindeutigen Befehlsnamen. Jeder Eintrag enthält `name`, `description`, `arguments` und `has_json_output`. 41 dokumentieren JSON-Ausgabe, 6 nicht. Über alle Befehle stehen 314 Argumenteinträge bereit: 186 Optionen, 117 Flags und 11 Positionsargumente. Weitere Argumentfelder: `value_type`, `enum_values`, `default`, `repeatable`, `short`; nicht jeder Eintrag enthält jedes Feld.

Zusätzlich: 9 globale Optionen, 30 Fähigkeiten, 32 Connector-Namen, 67 Umgebungsvariablen, 22 Exitcode-Verträge mit `retryable` und `agent_action`, 7 Workflows mit Start-/Folgebefehlen und Parsehinweisen sowie 47 Aufrufkorrekturen mit `wrong`, `canonical`, `accepted` und `behavior`. Die 4 Limits sind `max_limit`, `max_content_length`, `max_fields`, `max_agg_buckets`.

Es fehlen vollständige Unterbefehlsbäume, allgemeine Shell-Quoting-Regeln und strukturierte Mutationsmerkmale. Beispielsweise listet `sources` nur eine Option; das ist keine vollständige Sources-Referenz. Connector-Namen sind unterstützte Typen des Snapshots, keine Bestätigung installierter oder verbundener Quellen.

## Aufgabe der Seite

„Welche Funktionen bietet cass, wie sind die Befehle aufgebaut, und welcher dokumentierte Weg passt zu meiner Aufgabe?“ Einstieg sind echte Workflows; daneben steht eine präzise durchsuchbare Referenz.

```text
[cass] cass · Fähigkeiten und Befehle                  [Datensatz ▼]
Dokumentierte Version 0.10.0 · API 1 · Vertrag 1
[Befehle, Argumente, Workflows durchsuchen …]

┌──────────────────┬─────────────────────────────┬────────────────────┐
│ Einstieg         │ 7 dokumentierte Workflows  │ bounded-search     │
│ Befehle          │ cold-start                 │ Zweck / Start      │
│ Globale Optionen │ bounded-search             │ Originalaufruf     │
│ Fähigkeiten      │ session-drilldown          │ [Kopieren]         │
│ Connectoren      │ …                          │ Folgebefehle       │
│ Konfiguration    │                             │ Parsehinweise      │
│ Exitcodes        │ Befehle: search, pack, …   │ Zugehörige Befehle │
│ Aufrufhilfen     │                             │ Quelle             │
│ Limits           │                             │                    │
└──────────────────┴─────────────────────────────┴────────────────────┘
```

## Bereiche und Verhalten

**Einstieg/Workflows:** Alle 7 Workflows zeigen `intent`, `first_command`, `follow_up_commands`, `parse_contract` und `note`, soweit vorhanden. Die Schrittfolge zeigt dokumentierte Aktionen, keinen Ausführungsstatus. Links zur Befehlsreferenz entstehen nur für eindeutig erkannte `cass <name>`-Aufrufe, deren Namen im aktuellen Datensatz stehen. Der restliche Aufruf bleibt Originaltext.

**Befehle:** Suche nach Namen, Beschreibung und Argumentnamen; Filter „JSON-Ausgabe: Alle / Ja / Nein“. Auswahl öffnet den Befehl und seine Argumenttabelle. Filter über Argumenttyp, Pflicht und Suchtext gelten innerhalb dieses Befehls, damit globale Treffer nicht als Optionen des ausgewählten Befehls erscheinen.

**Argumentdetails:** Spalten Name, Typ, Werttyp, Pflicht, Default; aufklappbar Kurzform, erlaubte Werte, Wiederholbarkeit und Beschreibung. Flags werden mit `--name`, Optionen mit `--name <Wert>`, Positionsargumente ohne `--` gezeigt. Dies sind Syntaxbausteine, keine automatisch validierten Komplettbefehle. `false`, `0` und leere Defaults bleiben von fehlenden Angaben unterscheidbar. Argumentherkunft verweist auf `/commands/<index>/arguments/<index>`.

**Globale Optionen:** Eigene Liste für 9 Optionen; keine implizite Vermischung mit Befehlsargumenten. Ein Befehlsblatt verlinkt diese Liste. Die Quelle dokumentiert keine durchgängig geprüfte Reihenfolge oder Kombinierbarkeit sämtlicher Optionen.

**Fähigkeiten und Connectoren:** Suchbare kompakte Verzeichnisse mit originalen technischen IDs. Übersetzte Labels können ergänzen, Original-IDs bleiben sichtbar. Es gibt keine erfundenen Leistungsbeschreibungen und keinen Connector-Status.

**Konfiguration:** 67 Einträge mit Name, dokumentiertem Default und Beschreibung. Suche trifft auch Pfade und Optionsnamen in Beschreibungen. Die UI bildet nur vorhandene Verknüpfungen ab; keine geratenen Prioritätsregeln für alle Variablen.

**Exitcodes:** 22 Einträge mit Bedeutung, Retry-Angabe als Quellwert und empfohlenem `agent_action`. Code bleibt ein String. Kontextabhängige Bedeutungen dürfen nicht zu einer vermeintlich universellen Tabelle zusammengekürzt werden. Suche trifft Code, Bedeutung und Handlung.

**Aufrufhilfen:** 47 Original-/Kanonisch-Paare, Erklärung und `accepted` als „Laut Dokumentation akzeptiert: Ja/Nein“. Die Bezeichnung „Aufrufhilfen“ berücksichtigt, dass manche vermeintlich falschen Schreibweisen tatsächlich akzeptiert werden. Kanonischer Aufruf ist separat kopierbar.

**Limits:** Alle 4 Namen mit Rohwert. `max_limit=0` und `max_content_length=0` werden ohne erfundene Erläuterung angezeigt: „Bedeutung von 0 im Limit-Objekt nicht erläutert“. Einzelne Argumentbeschreibungen können einen Kontext liefern, rechtfertigen aber keine pauschale Interpretation dieser Metadaten.

## Konkreter Erkundungsweg

Besucher öffnet „bounded-search“, kopiert den vorhandenen begrenzten Suchaufruf und folgt dem Link zu `search`. Dort findet er `--limit`, `--fields` und `--max-content-length`, liest die jeweiligen Beschreibungen und öffnet bei Bedarf die Rohdefinition. Suche nach `CASS_SEARCH_LIMIT` führt zur Konfiguration. Keine Suchergebnisse aus echten Sessions werden simuliert.

## Bewusste Designentscheidung

Ein universeller Befehlsbaukasten wird zunächst nicht angeboten: Unterbefehle, bedingte Argumente und Shell-Regeln sind unvollständig. Die Erkundungsseite bietet zuverlässige Originalaufrufe, Parameterreferenz und Workflows. Ein späterer Builder benötigt zusätzliche dokumentierte Syntaxverträge und gezielte Prüfung.

Weitere cass-Dateien für `commands`, `schemas`, `sources`, `doctor` oder `recipes` bekommen eigenständige Seiten unter dem cass-Einstieg. Sie können auf diese Fähigkeiten-Seite verweisen, behalten aber ihre Quellen und Versionen. Ein neues Thema wird erst bei vorhandener Datei angeboten.

## Abnahme

Alle 47 Befehle, 314 Argumenteinträge und zusätzlichen Bereiche sind erreichbar. JSON-Filter liefert 41 bzw. 6 Befehle. Boolesche Flags erhalten keinen automatisch angehängten `true`-Wert aus `enum_values`. Fehlende Defaults, `0`, `false` und `unknown` werden korrekt behandelt. Workflows, Aufrufkorrekturen und Rohobjekte bleiben vollständig quellentreu. Eine später hinzugefügte zweite cass-Datei erhält eine eigene stabile Adresse.
