# Beads-Übergabe: JSON-Erkundungsseiten

Stand: 2026-10-11. Planung abgeschlossen; keine Seiten implementiert. Vier qualifizierte High-Reviews über Oracle-MCP (R2–R5), letzte Zuständigkeitskorrekturen integriert. [Plan](../tool-explorers-implementation.md), [Reviewnachweis](../tool-explorers-review.md).

Umfang: acht initiale JSON-Datensatzseiten für sechs Tools. Nichtparsebare .json-Dateien bleiben ignoriert; fmd.robot-docs.json besitzt keine Explorerregistrierung. Weitere valide JSONquellen kommen über explizite Registrierung hinzu.

| Paket | Bead | Arbeit | Blockiert durch |
| --- | --- | --- | --- |
| P01 | ctrw-09f | Registry und deterministisches Manifest | keine |
| P02 | ctrw-tcv | ViewModels, Herkunft und generischer Reader | ctrw-09f |
| P03 | ctrw-pyj | Acht reine Fachadapter | ctrw-tcv |
| P04 | ctrw-das | Transport, Integrität und Wiederholung | ctrw-09f, ctrw-tcv |
| P05 | ctrw-npl | Zentrale URLnavigation und History | ctrw-09f, ctrw-tcv |
| P06 | ctrw-zoc | Erkundungsindex und gemeinsamer Screen | ctrw-pyj, ctrw-das, ctrw-npl |
| P07 | ctrw-sl3 | br- und bv-Fachansichten | ctrw-pyj, ctrw-zoc |
| P08 | ctrw-t5f | cass-Fachansicht | ctrw-pyj, ctrw-zoc |
| P09 | ctrw-be3 | ee-Pfadatlas und Snapshotdetails | ctrw-pyj, ctrw-zoc |
| P10 | ctrw-6qx | fmd- und ubs-Fachansichten | ctrw-pyj, ctrw-zoc |
| P11 | ctrw-sua | Katalog, Palette, Sprache und Theme | ctrw-zoc |
| P12 | ctrw-dt0 | Produktionsprüfung und CI-Veröffentlichungsgate | ctrw-sl3, ctrw-t5f, ctrw-be3, ctrw-6qx, ctrw-sua |

Alle zwölf Beads bleiben open. Jede Beschreibung enthält eigene Dateigrenzen, ausführbare Checks, Begründung, benötigte Schnittstellen und die vollständigen gemeinsamen Verträge. Keine verkürzte Ersetzung durch Planlinks. Die umfangreichen Beschreibungen sind bewusst eine unveränderte normative Basis für jede spätere Umsetzung.

Der tatsächliche Trackergraph wurde geprüft: 23 blocker-Kanten, keine Zyklen oder parallelen Dateikonflikte, P12 konsumiert alle elf Vorgänger. Einzige Readyaufgabe: ctrw-09f.

```text
br show ctrw-09f
br ready --json
node docs/plans/tool-explorers/verify-planning-inputs.mjs
```

Sechs getrennte Prüfungen: Scope/Dateigrenzen, vollständige Beschreibungen, JSON-Aufnahme/Inventar, Typ-/Herkunft-/URL-/Snapshotregeln, DAG/Ready/Abschlusskonsument und eigene Tests/Produktionsgate. Keine Befunde; keine Implementierungsaufgabe geschlossen.

Die bestehende Anwendung wurde nur als Ausgangsbasis geprüft: Typecheck erfolgreich, fünf bestehende Modelltests erfolgreich, Lint erfolgreich mit zwei bereits vorhandenen Fast-Refresh-Warnungen. Das ist kein Nachweis implementierter Explorer. Die neue Featureabnahme gehört zu den Beads und P12.

verify-planning-inputs.mjs ist ein rein lesender Analysenachweis: JSONgate, Quellhashes gegen Analyse, relative Planlinks, exportierte Beadkanten, Zyklen, parallel bereite Dateiverantwortung und Readyaufgaben. Es erzeugt kein Manifest, keinen Tracker und keine Website und ändert keine Eingabedatei.
