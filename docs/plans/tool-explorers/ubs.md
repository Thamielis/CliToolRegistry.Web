# ubs: Scan-Referenz und Ausgabe verstehen

Quelle: `ubs.robot-docs.json`. Adresse: `?section=explore&exploreTool=ubs&dataset=robot-docs`. Stand: 2026-10-11. [Analyse](analysis.md), [gemeinsamer Rahmen](../tool-explorers.md).

## Leitidee

„Ultimate Bug Scanner · Scan-Referenz“, Version 5.4.17, Schema 1. Die Seite beantwortet „Wie begrenze ich einen Scan, und wie interpretiere ich dessen Ausgabe?“ Einstieg sind die vier Exitcodes und quellentreue Beispiele, gefolgt von Aufrufformen und Flags.

```text
[ubs] Ultimate Bug Scanner · Scan-Referenz
[Flag, Beispiel oder Ausgabeformat suchen …]
┌────────────────┬───────────────────────────┬────────────────────────┐
│ Einstieg       │ Aufruf/Flag               │ --files                │
│ Aufrufformen   │ scan                      │ Argument: F1,F2        │
│ Flags          │ --files                   │ --files=a.js,b.py      │
│ Beispiele      │ --staged                  │ [Beispiel kopieren]    │
│ Ausgabeformate │ --format                  │ Beschreibung / Quelle │
│ Exitcodes      │ …                         │                        │
│ Konfiguration │                           │                        │
└────────────────┴───────────────────────────┴────────────────────────┘
```

## Bereiche und Verhalten

6 Aufrufformen zeigen `usage` unverändert und `description`. 45 Flags zeigen Namen, `args`, Beispiel und Beschreibung; `args=null` wird „Kein Wertargument“ genannt. Flags sind Optionsbausteine; Beispiele werden nicht mit einem erfundenen Subcommand präfixiert.

9 Beispiele sind nach `goal` und `command` durchsuchbar. 5 Ausgabeformate zeigen Beschreibung und dokumentierten Schema-Aufruf. JSONL bleibt als Stream-Vertrag erkennbar, nicht als einzelnes JSON-Dokument. TOON/SARIF werden aus Quelltext erklärt, nicht auf eigene Sample-Ergebnisse angewendet.

Exitcode 0, 1, 2 und 3 stehen mit der jeweiligen Bedeutung nebeneinander. `partial` und fehlgeschlagene Module werden beim Ausgabeformat erläutert. „Nichts gescannt“ wird nicht als bestanden visualisiert. 19 Env-Einträge behalten `name`, `value` und `description`; der Quellwert wird nicht pauschal „Default“ genannt.

Guide enthält Summary, Golden Rule, stdout-Vertrag und Workflowtexte. Jeder Schritt bleibt Dokumentation. Die Seite enthält weder Scanresultate noch Findings oder einen Scan-Startknopf.

## Abnahme

Alle 6 Aufrufformen, 45 Flags, 9 Beispiele, 5 Formate, 4 Exitcodes und 19 Env-Einträge erreichbar. Suche „partial“ findet den Vertrag; „--files“ findet Flag und Beispiele. Kopieren liefert genau die Quelle. Flags mit null-Argument unterscheiden sich von fehlenden Feldern.
