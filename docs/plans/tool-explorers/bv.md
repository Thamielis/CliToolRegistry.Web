# bv: Robot-Befehle erforschen

Quelle: `public/robot-docs/bv.robot-docs.json`. Adresse: `#/explore/bv/robot-docs`. Gemeinsamer Rahmen: [Seitenkonzept](../tool-explorers.md).

## Analyse

Version v0.25.2, Thema `all`, Ausgabe `json`, erstellt `2026-10-09T10:42:48Z`. `commands` ist ein nach Befehlsnamen indiziertes Objekt mit 41 Einträgen. Jeder Eintrag enthält `flag`, `description`, `needs_issues`, `needs_git`, `needs_sprint`, `needs_baseline` und `mutates_state`. 24 enthalten `key_fields`, 22 enthalten `params`.

35 Befehle benötigen Issues, 13 Git, 3 einen Sprint und 1 einen Baseline-Stand. Diese Mengen überschneiden sich. Zwei Befehle ändern Zustand: `robot-confirm-correlation` und `robot-reject-correlation`.

Zusätzlich vorhanden: 18 `guide.agent_intent_aliases`, Guide/Quickstart, JSON-/TOON-Hinweise, 10 Beispiele, 11 Umgebungsvariablen und 3 Exitcodes. Die Datei beschreibt Analysebefehle, enthält aber keinen realen Issue- oder Abhängigkeitsgraphen.

## Aufgabe der Seite

„Welcher Robot-Befehl beantwortet meine Frage, und welche Voraussetzungen hat er?“ Die Befehlsmatrix ist der zentrale Einstieg. Auswahl öffnet ein detailliertes Befehlsblatt.

```text
[bv] bv · Robot-Referenz                            [Datensatz ▼]
[Befehle, Aufgaben, Parameter durchsuchen …]
[Benötigt Git □] [Benötigt Sprint □] [Ändert Zustand: alle ▼]

┌───────────────┬──────────────────────────────────┬───────────────────┐
│ Befehle       │ Befehl        Issues Git Sprint │ robot-history     │
│ Aufrufhilfen  │ robot-next      ja   nein nein  │ Beschreibung      │
│ Beispiele    │ robot-history   ja   ja   nein  │ Voraussetzungen   │
│ Einstieg     │ robot-graph     ja   nein nein  │ bv --robot-history│
│ Konfiguration│ …                               │ [Kopieren]        │
│ Exitcodes    │ 41 Befehle, gefilterte Treffer   │ Parameter/Felder │
└───────────────┴──────────────────────────────────┴───────────────────┘
```

## Bereiche und Verhalten

**Befehle:** Suchbare Matrix mit Beschreibung, Voraussetzungen und Zustandsänderung. Boolesche Filter verwenden „Alle / Ja / Nein“; mehrere Voraussetzungen wirken als UND. Textsuche wirkt zusätzlich als UND und durchsucht Schlüssel, Beschreibung, `flag`, `params` und `key_fields`. Sortierung nach Name; der Einstieg verweist gesondert auf Triage und nächste Aufgabe.

**Befehlsblatt:** Der kopierbare Basisaufruf ist `bv ` plus das vorhandene `flag`; Platzhalter wie `deadbeef:ISSUE_ID` bleiben sichtbar. `params` sind dokumentierte Parametertexte und werden einzeln gezeigt, nicht blind zu einem Gesamtaufruf verkettet. `key_fields` heißen „Dokumentierte Ausgabefelder“; daraus entstehen keine erfundenen Ergebnisdaten oder JSON-Schemas. Herkunft verwendet den Objektschlüssel, etwa `/commands/robot-history`.

**Aufrufhilfen:** Gegenüberstellung von `agent_instinct` und `canonical` für alle 18 Zuordnungen. „Kanonischen Aufruf kopieren“ kopiert genau `canonical`. Die Originalschreibweise ist separat zugänglich.

**Beispiele und Einstieg:** Beispiele und Quickstart verwenden teilweise `bv robot-triage --json`, während `agent_intent_aliases` als kanonisch `bv --robot-triage --format json` angibt. Beide werden mit Herkunft gezeigt. Eine kanonische Variante wird nur angeboten, wenn die konkrete Zuordnung in der Datei vorliegt. Keine pauschale Ersetzung in Pipes, Shell-Kommentaren oder Suchausdrücken.

**Konfiguration:** Namens-/Beschreibungssuche über `environment_variables`. Ohne dokumentierten Default zeigt die UI „Nicht dokumentiert“. Ausgabeformate JSON und TOON werden aus `guide.output_modes` erläutert. Die dortigen Größenangaben sind Aussagen dieses Snapshots und kein allgemeines Performanceversprechen.

**Exitcodes:** Code und Bedeutung aus der Objektstruktur. Keine Retry-Automatik, da entsprechende strukturierte Felder fehlen.

Das charakteristische Element ist die Voraussetzungenmatrix: sie erklärt, warum etwa `robot-history` Git benötigt und `robot-next` nicht. Mutationskennzeichnung ist unmittelbar aus `mutates_state` abgeleitet und neben dem Kopieraufruf sichtbar.

## Konkreter Erkundungsweg

Besucher filtert „Benötigt Git: Ja“, erhält 13 Befehle, öffnet `robot-history`, liest dessen Parameter und Ausgabefelder und kopiert den dokumentierten Basisaufruf. Anschließend zeigt „Aufrufhilfen“ die bereitgestellten Schreibweisen. Die Matrix stellt keine Verfügbarkeit im lokalen Projekt fest.

## Abnahme

41 Befehle sind erreichbar; der Git-Filter liefert 13, der Sprint-Filter 3 und „Ändert Zustand: Ja“ genau 2. Alle 18 Aufrufzuordnungen und 10 Beispiele bleiben quellentreu. Ein Filter, der den ausgewählten Befehl ausblendet, schließt die Detailauswahl mit sichtbarer Rückmeldung. Alle Voraussetzungen haben verständliche Textlabels, auch mobil.
