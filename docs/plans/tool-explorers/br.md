# br: Agentenleitfaden erforschen

Quellen: `public/robot-docs/br.robot-docs.json` und `br.capabilities.json`. Adressen: `?section=explore&exploreTool=br&dataset=robot-docs` und `dataset=capabilities`. Gemeinsamer Rahmen: [Seitenkonzept](../tool-explorers.md).

## Ergänzung vom 2026-10-11: Fähigkeiten-Seite

br besitzt jetzt zwei separate Datensatzseiten. Die Fähigkeiten-Seite enthält 46 Befehle mit `summary`, `operation`, `workspace`, `machine_output` und `examples`. Filter: Operation `read`/`write`/`mixed` (19/10/17 Einträge), Workspace `required`/`none`/`optional` (35/7/4), dokumentierte Ausgabeformate. `mixed` bleibt ausdrücklich „Gemischt“ und wird nicht als read-only behandelt.

Das Befehlsblatt zeigt Originalbeispiele, ohne aus dem Namen Unterbefehle oder Argumente zu erfinden. Zusätzlich erreichbar: 5 Fähigkeiten, 2 Build-Merkmale, 5 globale Flags, 3 Ausgabeformate, 9 Exitcodes, 6 Umgebungsvariablen, 4 Sicherheitsgarantien und 5 empfohlene Einstiege. Leere `examples` bedeutet „Keine Beispiele dokumentiert“.

Beide Dateien dokumentieren Version 0.7.4, besitzen aber unterschiedliche Verträge. Die Fähigkeiten-Seite verlinkt den Leitfaden als ergänzende Quelle. Gleichnamige Befehle werden nicht zusammengeführt. Die bestehende Leitfadenseite bleibt wie folgt entworfen; ihre Aussage über fehlende Argument-/Exitcode-Definitionen gilt nur für die Leitfadendatei.

## Analyse

Die Datei enthält `tool`, `version`, `contract_version`, `title`, `line_count`, einen vollständigen Text in `guide` und 8 Objekte `{task, command}` in `canonical_commands`. Version 0.7.4, Vertrag `br.robot_docs.v1`. Der Leitfaden besitzt tatsächlich die angegebenen 52 Zeilen. Argumentdefinitionen, Exitcodes und eine vollständige Befehlsliste fehlen.

## Aufgabe der Seite

„Wie arbeite ich mit br, und welchen dokumentierten Einstieg brauche ich?“ Der Leitfaden ist die Hauptdarstellung. Eine schmale Ablaufnavigation hilft beim Lesen, ergänzt durch eine direkt durchsuchbare Liste der kanonischen Befehle.

```text
[br] br · Agentenleitfaden                         [Datensatz ▼]
Version 0.7.4 · 52 Zeilen · 8 kanonische Befehle
[Leitfaden und Befehle durchsuchen …]

┌────────────────────┬─────────────────────────────────────────┐
│ Zweck              │ Sitzungsstart                           │
│ Ausgabeformate     │ Originalabschnitt mit erklärendem Text │
│ Sitzungsstart      │ br capabilities --format json [Kopieren]│
│ Arbeit finden      │ br ready --json              [Kopieren]│
│ Arbeit übernehmen  │                                         │
│ Arbeit abschließen │ Kanonische Befehle                      │
│ Verträge entdecken │ Aufgabe                 Aufruf          │
│ Hinweise           │ discover capabilities  br capabilities…│
└────────────────────┴─────────────────────────────────────────┘
[Originalleitfaden] [Quell-JSON] [Herunterladen]
```

## Bereiche und Verhalten

Der Reader bildet `Purpose`, `Machine-output defaults`, `Start of session`, `Finding work`, `Claiming work`, `Completing work`, `Discovery` und `Safety` als lesbare Abschnitte ab. Die deutsche Bereichsnavigation ergänzt den originalen Text. Ein konservativer Parser erkennt nur eigenständige Überschriften; bei geändertem Format bleibt der vollständige Text lesbar. Abschnitte behalten ihre Zeilenbereiche für die Herkunft.

„Kanonische Befehle“ zeigt alle 8 `task`/`command`-Paare unverändert. Eine Auswahl öffnet Aufgabe, vollständigen Aufruf und `/canonical_commands/<index>` als Herkunft. Suche trifft Aufgaben, Aufrufe und Leitfadentext; Abschnitte mit Treffern sind direkt anspringbar.

Das charakteristische Ablaufband lautet „Sitzungsstart → Arbeit finden → Übernehmen → Abschließen“. Es ist eine redaktionelle Lesehilfe aus dem Leitfaden. Die dort erwähnten Claim-/Close-Befehle sind Leitfadeninhalte und werden nicht als zusätzliche kanonische Einträge gezählt. Ein kurzer Hinweis erklärt aus der Quelle: `br sync` exportiert und führt selbst keinen Commit, Push oder Pull aus.

Bei kopierten Aufrufen bleiben `<id>`, `$AGENT_NAME` und ähnliche Platzhalter sichtbar. Es gibt keinen generischen Parametereditor, weil dazu keine strukturierten Definitionen vorliegen. Zustandsänderungen werden aus dem Leitfaden erklärt; maschinenlesbare Mutation-Badges können aus dieser Datei nicht zuverlässig erzeugt werden.

## Konkreter Erkundungsweg

Besucher sucht „ready“, erhält den Abschnitt „Arbeit finden“ und den kanonischen Eintrag `br ready --json`, liest die Erklärung zur Projekt-Policy und kopiert den Originalaufruf. Der Permalink öffnet denselben Eintrag. „Originalleitfaden“ erlaubt jederzeit den Vergleich mit dem unzerlegten Text.

## Abnahme

Alle 8 kanonischen Einträge und alle Leitfadenzeilen bleiben erreichbar. Suche nach „schema“ findet die passenden Quellen. Abschnitte werden nicht mit fehlenden Detailverträgen angereichert. Bei geändertem Überschriftenformat funktioniert die Volltextdarstellung weiterhin. Die Fähigkeiten-Seite zeigt alle 46 Befehle und die genannten Filtermengen. Ein Wechsel zwischen beiden Seiten bewahrt ihre getrennte Herkunft.
