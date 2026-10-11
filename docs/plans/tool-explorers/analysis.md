# Datensatzanalyse: Stand 2026-10-11

## Prüfgegenstand

Neun Dateien unter `public/robot-docs/`: drei bestehende, sechs hinzugekommene. Acht sind gültiges UTF-8-JSON und werden aufgenommen. Eine enthält Klartext und wird nach der aktuellen Nutzerregel ignoriert. Analysiert wurden die Dateien und der Repository-Code; keine Tools wurden zur Neuerzeugung ausgeführt.

| Tool | Datensatz | Format | Umfang | Vertrag/Version |
| --- | --- | --- | --- | --- |
| br | robot-docs | JSON | 52 Textzeilen; 8 kanonische Befehle | `br.robot_docs.v1`; 0.7.4 |
| br | capabilities | JSON | 46 Befehle; 5 Features; 5 globale Flags; 9 Exitcodes; 6 Env-Einträge | `br.capabilities.v1`; 0.7.4 |
| bv | robot-docs | JSON | 41 Befehle; 18 Aliaspaare; 10 Beispiele; 11 Env-Einträge; 3 Exitcodes | Thema `all`; v0.25.2 |
| bv | capabilities | JSON | 41 Befehle; 18 Aliaspaare; 6 Topics; 11 Env-Einträge; 3 Exitcodes | `1.0.0`; v0.25.2 |
| cass | capabilities | JSON | 47 Befehle; 314 Argumenteinträge; 7 Workflows; 47 Recoveries | Vertrag `1`; API 1; 0.10.0 |
| ee | capabilities | JSON | 557 Befehlspfade; 130 Env-Einträge; 6 Subsysteme; 8 Features | Envelope `ee.response.v2`; 0.17.0 |
| fmd | capabilities | JSON | 11 Befehlsformen; 42 Beispiele; 48 Featurewerte; 6 Ausgabearten | `0.1.0`; 0.5.0 |
| fmd | robot-docs | Ignoriert: Klartext | 8.011 Bytes; keine Seite | Kein JSON-Vertrag |
| ubs | robot-docs | JSON | 6 Aufrufformen; 45 Flags; 9 Beispiele; 19 Env-Einträge; 4 Exitcodes | Schema `1`; 5.4.17 |

Die Zahlen sind unterschiedliche fachliche Mengen: ee zählt komplette Befehlspfade, UBS getrennte Aufrufformen und Flags, br/cass Befehlsbeschreibungen. Sie sind keine toolübergreifende Rangliste.

## br: Ergänzung statt Ersatz

`commands[]` besitzt durchgehend `name`, `summary`, `operation`, `workspace`, `machine_output`, `examples`. Operationswerte: 19 `read`, 10 `write`, 17 `mixed`. Workspace: 35 `required`, 7 `none`, 4 `optional`. Die fünf Features sind Objekte mit Name und Beschreibung; die vier Sicherheitsgarantien besitzen Name und Garantie. `build_features` ist ein Objekt mit zwei Werten.

Der Leitfaden bleibt die Quelle für Arbeitsabläufe. Die Fähigkeiten-Datei liefert Filter und Exitcodes, aber keine vollständige Optionssyntax. Beide tragen Version 0.7.4 und verschiedene Verträge; ein gemeinsamer Stand ersetzt die Herkunft nicht.

## bv: Neue Aufrufinformationen

Die neue Datei verschiebt Befehle vom nach Namen indizierten Objekt in ein Array und ergänzt bevorzugte und akzeptierte Aufrufe. Ein Feldvergleich über die 41 Befehle ergab keine Abweichungen der gemeinsamen Felder. Beide Dateien dokumentieren 35 Issue-, 13 Git-, 3 Sprint- und 1 Baseline-Voraussetzung sowie 2 zustandsändernde Befehle.

Zeitpunkte: Robot-Dokumentation `2026-10-09T10:42:48Z`, Fähigkeiten `2026-10-11T13:08:21Z`. `preferred_invocation`, `accepted_invocations` und `agent_intent_aliases.canonical` bleiben eigenständige Aussagen. Die Existenz von `docs_topics` ist kein Beleg für bereits gelieferte Topic-Dateien.

## cass: Bestehende Grenzen bleiben

Keine neue cass-Datei. Die 47 Befehle dokumentieren 41-mal JSON-Ausgabe und 6-mal deren Fehlen. Argumente: 186 Optionen, 117 Flags, 11 Positionsargumente. Weitere Mengen: 30 Features, 32 Connectoren, 9 globale Optionen, 67 Env-Einträge, 22 Exitcodes, 4 Limits. Nicht dokumentiert sind vollständige Unterbefehlsbäume und allgemeine Kombinationsregeln. `unknown`-Commitwerte sind keine Datierung.

## ee: Fähigkeitsvertrag mit lokalen Beobachtungen

Root: `schema`, `success`, `data`, `degraded`, `fields`. Inhalt liegt unter `/data`, nicht direkt am Root. `data.commands` enthält 557 eindeutige Namen über 112 erste Pfadsegmente. 556 sind `available=true`; `mcp serve-stdio` ist nicht verfügbar.

Ein Befehlsname wie `backup keys export` lässt sich für die Navigation nach Leerzeichen gruppieren. Das ist eine abgeleitete Pfadhierarchie, kein dokumentierter Options- oder Parserbaum. Die Einträge enthalten keine Befehlsbeschreibungen oder Argumentverträge.

Subsysteme: runtime, storage, graph und cass sind `ready`; search ist `degraded`, mesh `pending`. 4 von 8 Feature-Schaltern sind aktiviert. Zwei `unimplemented`-Einträge dokumentieren einen fehlenden Diagramm-Backend und ein deaktiviertes MCP-Feature. Diese Angaben beschreiben die exportierende Installation im Snapshot.

`envOverrides` besitzt 130 Definitionen über 14 Kategorien; alle haben `name`, `category`, `controls`, `defaultValue`, `isSet`, `source`. Ein Eintrag besitzt zusätzlich `currentValue`. Binärpfad, Env-Set-Zustand und Indexmetadaten sind lokale Beobachtungen. Sie dürfen nicht als aktuelle Website-/Besucherumgebung ausgegeben werden.

`output` enthält 8 Ausgabeformate, TOON-Details, Governor-/Cursorvertrag und zwei Größenmessungen. Diese Größenmessungen sind Snapshot-Beispiele, keine allgemeinen Benchmarks. Der Index dokumentiert `semantic=false` und Hash-Fallback; das aktivierte `embed-fast`-Feature allein belegt somit keine semantische Suche.

## fmd: Eine gültige Fähigkeiten-Seite

`fmd.capabilities.json` enthält 11 Befehlseinträge mit 42 Beispielstrings. Namen wie `robot-docs guide` und `--robot-triage` sind bereits Aufrufformen; „fmd render“ darf nicht vor jeden Beispielstring gesetzt werden. Flags und Positionsargumente besitzen keine strukturierte Referenz.

48 Featurewerte sind Statusstrings, darunter Einschränkungen und Verweigerungen. Eine Umwandlung aller nichtleeren Werte zu „Verfügbar“ wäre falsch. `theme_model.default` beschreibt das Tool-Theme, nicht das Website-Theme. PDF-Running-Content besitzt 6 Slots, 5 Tokens und mehrere Begrenzungen, etwa `images=false` und `html_templates=false`. Exitcodes sind eine Objektmap mit 6 Einträgen.

`fmd.robot-docs.json` beginnt mit `fmd agent guide`; JSON-Parsing scheitert bei Zeile 1, Spalte 1. Der Inhalt ist kein leerer/abgebrochener Export, sondern ein 88-zeiliger lesbarer Leitfaden mit kanonischen Aufrufen, Config, Regeln, Verify-Hinweisen und WASM-Budgettabelle. Die Tabelle enthält historische Versionsstände bis 0.4.1; daraus darf nicht die Version des Leitfadens oder der installierten Software abgeleitet werden.

Die Quelle bleibt unverändert, wird aber gemäß Nutzerkorrektur nicht aufgenommen. Es gibt keinen Textdatensatz, keinen Textadapter und keinen Link auf einen solchen Reader. Die acht gültigen JSON-Datensätze bilden das vollständige aktuelle Explorer-Inventar.

## ubs: Dokumentation des Scanners

`commands` enthält zwei Arrays: 6 `subcommands` mit `usage`/`description` und 45 `flags` mit `args`/`example`/`description`. `args=null` ist eine dokumentierte wertlose Option, kein fehlender String. `--schema` steht unter Aufrufformen, obwohl es syntaktisch mit Strichen beginnt.

Fünf Ausgabeformate besitzen Beschreibungen und Schema-Aufrufe. Die Angaben beschreiben mögliche Scan-Envelopes; der Datensatz selbst enthält keine Findings oder Scanresultate. `status=partial`, fehlgeschlagene Module und Exitcode 3 („nichts gescannt“) sind inhaltlich wichtig und werden sichtbar erklärt. Eine erfolgreiche Website-/Dokumentationsprüfung ist kein bestandener UBS-Scan.

## Integrationsbefund im aktuellen Repository

Die Workbench besitzt inzwischen fünf Query-basierte Bereiche in `src/data/workbench.ts`, native Navigation, CommandPalette und Lazy-Screens. `App.tsx` hängt den bisherigen Seiteninhalt an einen erfolgreich geladenen Katalog. Erkundungsdaten müssen davon unabhängig renderbar werden.

Aktuelle Prüfskripte: `typecheck`, `lint`, `test:model`, `test:ui`, `test:production`, `validate:logos`, `build`. Der Deployment-Workflow prüft Modelle und Logos vor dem Build. Datensatzvalidierung muss dort ergänzt werden; weder Katalog-Sync noch CI sollen die CLI-Tools zum Generieren von Dokumentation ausführen.

## Identität der analysierten Quellen (SHA-256)

| Datei | SHA-256 |
| --- | --- |
| br.capabilities.json | `44dbee891b46d52ea55b2eb5b1bd31ef6a72aefac5307e780890ad43759d73f6` |
| br.robot-docs.json | `98140e2820bb7cc78ea55553aa395e4e0bb2809fc2cb95ba40037429ef1dd3d4` |
| bv.capabilities.json | `19267596b2fa29c81b146a55fad8c38f8dc06fd065eab4ca2102e642054fb547` |
| bv.robot-docs.json | `bce50d3ae9dd32ccb027b3d3f1d3c190bb3557ca8b756817e23a2b8fba32ceaa` |
| cass.capabilities.json | `e7a7b3c06e0e622960c627b75b45825275955980e3409efd65fb49bc11f23d83` |
| ee.capabilities.json | `6b38105422fba89fec9bb59ca22fc4622a52859b141124072b6c2951fecaaae8` |
| fmd.capabilities.json | `b7e4a6839eb291bf254ed0d8bc50b88847a868ee3e62f7c3a1dcd82b70858916` |
| fmd.robot-docs.json | `a55eb1778ed1d4f476b3c86fa0ce533100e481134a5ab853317eb8c69d90d9b5` |
| ubs.robot-docs.json | `0e01001f44bac02a2b504dc808a2a7d32ff38755345bb5e75d718fe1acc6f342` |
