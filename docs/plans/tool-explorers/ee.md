# ee: Befehlsatlas und dokumentierter Snapshot

Quelle: `ee.capabilities.json`. Adresse: `?section=explore&exploreTool=ee&dataset=capabilities`. Stand: 2026-10-11. [Analyse](analysis.md), [gemeinsamer Rahmen](../tool-explorers.md).

## Leitidee

557 Befehlspfade über 112 Hauptgruppen werden als durchsuchbarer Atlas dargestellt. Der Kopf lautet „Eidetic Engine · Fähigkeits-Snapshot“, Version 0.17.0. Der Verfügbarkeitsfilter bezieht sich ausdrücklich auf den dokumentierten Stand.

```text
[ee] Eidetic Engine · Fähigkeits-Snapshot
[Pfad oder Umgebungsvariable suchen …] [Verfügbarkeit: Alle ▼]
┌───────────────────┬─────────────────────────┬──────────────────────┐
│ Befehlsatlas      │ backup                  │ backup keys export   │
│ Subsysteme        │   create                │ Snapshot: verfügbar  │
│ Features          │   keys                  │ ee backup keys export│
│ Einschränkungen   │     export [ausgewählt] │ Pfad ohne Argumente  │
│ Konfiguration    │     import              │ Rohobjekt / Herkunft │
│ Ausgabe/Cursor   │   restore               │                      │
│ Lokaler Snapshot │ …                       │                      │
└───────────────────┴─────────────────────────┴──────────────────────┘
```

## Bereiche

- Befehlsatlas: Name und `available`; Gruppen nach erstem Pfadsegment, darunter rekursive Pfadansicht. Das Suchergebnis ist eine flache Liste vollständiger Pfade, damit Treffer nicht hinter eingeklappten Gruppen verschwinden. 48 Treffer pro Ansicht, „Mehr anzeigen“ in 48er-Schritten.
- Subsysteme: 6 originale Namen/Statuswerte. `ready`, `degraded`, `pending` werden nicht zu einem Booleschen Grün/Rot reduziert.
- Features: 8 `name`/`enabled`-Paare. Kein Rückschluss von `embed-fast=true` auf funktionierende semantische Suche.
- Einschränkungen: die 2 `unimplemented`-Objekte mit Code, Flag, Ship-Target und Tracking-ID; reine Snapshot-Angaben, keine Release-Zusage der Website.
- Konfiguration: 130 Env-Einträge; Filter über 14 Kategorien. Default, Source, Set-Status und optional CurrentValue bleiben getrennt. Header „Werte der exportierenden Installation“ für lokale Beobachtungen.
- Ausgabe/Cursor: 8 Formate, TOON-Definition, Governor-Budget, Cursor-Schema, Truncation-Points und Größenbeispiele; technische Angaben als lesbare Objektkarten mit Rohzugriff.
- Lokaler Snapshot: Binärfund und Index-/Embedding-Metadaten. Pfade werden als Text dargestellt. Kein Dateizugriff und keine automatischen Tool-Aufrufe.

Nur vorhandene Pfade erhalten kopierbare Basisaufrufe `ee <name>`. Ergänzte Gruppenknoten bleiben reine Navigation. Detailtext erklärt „Argumente in dieser Datei nicht dokumentiert“. `success`/`degraded` des Envelopes bleiben zugänglich; Werte werden nicht als aktuelle Website-Gesundheit angezeigt.

## Abnahme

557 Pfade, 556 verfügbare und `mcp serve-stdio` als nicht verfügbar. Vollständiger Suchpfad `backup keys export` öffnet den richtigen Quellindex. Env-Kategorien, `null`-Defaults, optionaler CurrentValue, Envelope und Nested-Output bleiben erhalten. Der Reader stellt keinen live verbundenen EE-Dienst dar.
