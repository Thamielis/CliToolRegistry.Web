# fmd: Rendering-Referenz

Quelle: `fmd.capabilities.json`. Adresse: `?section=explore&exploreTool=fmd&dataset=capabilities`. `fmd.robot-docs.json` enthält Klartext und wird nicht aufgenommen. Stand: 2026-10-11. [Analyse](analysis.md), [gemeinsamer Rahmen](../tool-explorers.md).

## Fähigkeiten-Seite

„FrankenMarkdown · Rendering-Referenz“, Version 0.5.0, Vertrag 0.1.0. Der Einstieg zeigt echte Ausgabearten und die 11 dokumentierten Aufrufformen. Auswahl zeigt unveränderte Beispiele; 42 sind insgesamt vorhanden. Es gibt keinen Renderer, Upload oder automatisch erzeugten Komplettaufruf.

```text
[fmd] FrankenMarkdown · Rendering-Referenz       [Datensatz ▼]
[Befehl, Ausgabeart oder Fähigkeit suchen …]
┌─────────────────┬───────────────────────────┬──────────────────────┐
│ Befehle         │ render                    │ render               │
│ Ausgabearten    │ diff                      │ Originalbeispiele    │
│ Fähigkeiten     │ stats                     │ fmd README.md …      │
│ Theme-Modell    │ book                      │ [Kopieren]           │
│ PDF-Kopf/Fuß    │ …                         │ Quelle               │
│ Exitcodes       │                           │                      │
└─────────────────┴───────────────────────────┴──────────────────────┘
```

48 Feature-Statusstrings sind als Name/Wert-Liste durchsuchbar. Keine automatische Boolesche Interpretation von `available_v0_*`, `refused_usage_error` oder `0.31.2_ratcheted_min_578_of_652_normalized`. Filter zunächst nach exakt vorhandenem Statusstring, zusätzlich Name/Text.

`theme_model` zeigt Tool-Defaults als unveränderte JSONrows: Schriftrollen, Light/Dark-Farben, Spacing und Papierformat/Margins. Farben bleiben Originaltext und verändern nicht die Website. PDF-Running-Content zeigt Slots, Tokens, Date-Source, Overflow und Einschränkungen als dokumentierte Originalwerte. Alle 6 Exitcodes bleiben code-/bedeutungsbezogen erreichbar.

## Ausgeschlossene Quelle

Der Klartextleitfaden erhält keine Seite, Suche, Zählung oder Downloadaktion im Explorer. Die Originaldatei wird nicht umgeschrieben oder gelöscht. Ein expliziter Deep Link auf `dataset=robot-docs` zeigt „Datensatz nicht vorhanden“ und lädt diese Datei nicht.

Ein späterer tatsächlich gültiger JSON-Leitfaden kann als neue registrierte Quelle ergänzt werden. Klartext allein unter einer `.json`-Endung erfüllt den Aufnahmevertrag nicht.

## Abnahme

Eine JSON-Seite; 11 Aufrufformen, 42 Originalbeispiele und 48 unveränderte Featurewerte. Null/false/fehlend bleiben unterscheidbar. Ignorierter Klartext fehlt in Manifest, Suchindex, Palette, Seitenzählung und Explorer-Downloads.
