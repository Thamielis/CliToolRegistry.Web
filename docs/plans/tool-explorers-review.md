# Reviewprotokoll: Tool-Erkundungsseiten

Stand: 2026-10-11. Aktueller Auftrag: vollständiger Planungsworkflow mit JSON-only-Aufnahme. Anwendungsimplementierung ist nicht gestartet. R1 dokumentiert den früheren Auftrag; dessen Textausnahme ist durch die spätere Nutzerentscheidung aufgehoben.

## Vorprüfung

- Aktueller Ausgangs-HEAD: `fd7f8d6`. Sechs neue Quelldateien sind bereits staged; Analyse/Planung verändern sie nicht.
- Neun Quellen gelesen: acht parsebares JSON und ein 88-zeiliger Klartextleitfaden. SHA-256 mit Analyse abgeglichen.
- Relative Links der neun Analyse-/Planungsdokumente geprüft: kein fehlendes Ziel.
- Zwölf geplante Arbeitspakete als DAG geprüft: keine Zyklen.
- Query-Navigation und Katalog-Snapshot-Gate am aktuellen Code geprüft; frühere Hash-Routen aus Entwürfen entfernt.
- Kein App-Build gestartet: diese Runde ändert ausschließlich Dokumentation; ein Build würde zudem den Katalog synchronisieren.

## Oracle-MCP Runde 1

Session: `ctr-web-explorers-plan-r1`. Auftrag: Architektur, Quelltreue, statisches Manifest, Textausnahme und vorhandene URL-/Workbench-Verträge prüfen. Zwölf Dateien als Textbundle über Oracle-MCP angehängt: Startplan, Analyse, aktueller Navigation-/App-Code, UX-Vertrag, package.json sowie die sechs neuen Quellen. Alte Quellen wurden lokal erneut geprüft und sind in der Analyse dokumentiert.

Dry-Run: Oracle 0.21.4 erreichbar; Auflösung des Pro-Alias auf GPT-5.6 Sol, somit kein Pro-Nachweis. Echte Runde explizit auf `gpt-5.6-sol` gestartet, gewünschtes Effort `extra-high`.

Laufzeitdiagnose: Extra High ist auf dem verbundenen Konto nicht verfügbar. Oracle behält das bereits in ChatGPT ausgewählte Effort bei; im Picker-Diagnosefenster war „Medium“ sichtbar. Deshalb wird diese Runde nicht als Extra-High-/Pro-Review gewertet. Der Transport wird weiterhin ausschließlich über Oracle-MCP genutzt.

Status: abgeschlossen und in Planrevision 1 integriert. Antwort unter [Oracle-Transkript](/home/mario/.oracle/sessions/ctr-web-explorers-plan-r1/artifacts/transcript.md); [Review-Unterhaltung](https://chatgpt.com/c/6acb94ae-983c-83ed-a2e2-8c84a7743b64). Oracle-Rundenurteil: nicht konvergent, keine Implementierungsfreigabe. Tatsächliche Dauer laut Toolzusammenfassung: 4m15s; Modell GPT-5.6 Sol. Der reduzierte Effort-Nachweis bleibt wie oben dokumentiert.

### Integration und Prüfung der Empfehlungen

Übernommen: explizite Registry statt automatischer Seitendiscovery; harte fmd-Textidentität und Trennung von Fetch-MIME/Download-MIME; Snapshot-Isolation; synchrones URL-Parsing plus asynchroner Resolver; manueller History-/Scroll-/Fokusvertrag mit Navigation-Ursachen und Lazy-Ready-Callback; bytegenaue Manifest-Sortierung/Serialisierung; `.mjs`-Generator und gemeinsame JSON-Registry; Rohbytes vor Dekodierung; Digest-Key-/Retrystrategie; Palette ohne Katalog; getrennte Transport-/Integritäts-/Decode-/Parse-/Adapterzustände; owned Queryparameter und URL-Testverantwortung im bestehenden Workbench-Modell.

Grounding: `App.tsx` schreibt bislang null in history.state und scrollt bei Section-Wechsel nach oben; der neue Restoration-Vertrag ist notwendige geplante Arbeit, kein bereits vorhandenes Verhalten. `workbench.ts` ist synchron und erhält fremde Queryparameter. `bv` enthält zwei verschiedene Exportzeitpunkte. `fmd`-Klartext und `ee`-Envelope wurden erneut anhand der Originalquellen geprüft.

Angepasst statt wörtlich übernommen: Oracle fordert eine ausdrücklich freigegebene Planänderung für jede spätere zusätzliche Datei. Der Nutzer hat weitere Lieferungen bereits angekündigt. Deshalb bleibt Registrierung die Erweiterungsschnittstelle, benötigt aber keine erfundene zusätzliche Freigabe allein für einen routinemäßigen Datensatz. Die aktuelle Fassung enthält exakt neun Seiten; eine neue Registrierung erweitert das Inventar kontrolliert und wird geprüft. Generic-Reader bleibt für explizit registrierte neue und unbekannte Vertragsstrukturen verfügbar.

Validierungsloop R1: Quellhashes und Links stimmen; zwölf Pakete bilden weiterhin einen DAG; tragende Entscheidungen besitzen Begründungen. Selbstständigkeit ist für die Startfassung verbessert, aber noch nicht vollständig: konkrete Fachtypen/Validatorcodes bleiben vor Einfrieren auszudetailieren. R1 enthält materielle strukturelle Änderungen, daher keine Konvergenz. Ein unabhängiger Obscure-Task-Test und weitere qualifizierte Reviewrunden bleiben Teil der Planverfeinerung.

## JSON-only-Neustart und qualifizierte Runden

Nutzerentscheidung: nichtparsebare `.json` mit Klartext ignorieren. Acht JSON-Seiten für sechs Tools; `fmd.robot-docs.json` bleibt unverändert, wird aber nicht registriert oder veröffentlicht. Syntaktisch gültige JSON-Strings bleiben valide JSONwerte. Auch defekte JSONsyntax und ungültiges UTF-8 werden konservativ ausgeschlossen.

APR-Verwaltung lokal in `.apr/workflows/tool-explorers.yaml`; Ausführung aller Reviews ausschließlich über Oracle-MCP. Kein `apr run`, da dessen direkter Oracle-Ausführungspfad der globalen Vorgabe widerspräche.

R2: `ctr-web-explorers-plan-r2`, GPT-5.6 Sol, tatsächliche Laufzeitdiagnose „Thinking time: High“. Abgeschlossen nach 10m36s, Urteil REVISE. [Vollständiges Transkript](../../.apr/rounds/tool-explorers/round_2.md). Bundle aus 15 Dateien mit Plan, Detailverträgen, Analyse, Workbenchcode und allen acht validen Quellen.

Integration: R2-02 Manifest-/Registrywahrheit, R2-03 exklusive Presence plus Snapshotpointer, R2-04 getrennte Raw-/ViewModelcaches und Manifestepoch, R2-05 wiederholte needs-Parameter und Normalisierung, R2-06 Historybootstrap/historyId/Pop ohne Writes, R2-07 BVformats übernommen. IDs mit Doppelpunkt verwenden Pointerfallback; Sync ersetzt Ausgabe erst nach kompletter Prüfung.

R2-01 bewusst verworfen: Oracle wollte registriertes nichtparsebares JSON als Buildfehler einstufen. Der Nutzer verlangt Ignorieren/Nichtaufnahme. Registry enthält deshalb Kandidaten, Manifest aufgenommene Teilmengen; auch registrierte vorhandene Klartextdateien werden ausgeschlossen. Fehlende registrierte Dateien und unregistriertes valides JSON bleiben separate Fehler. Diese Abweichung ist eine dokumentierte Produktentscheidung, kein unbearbeiteter Blocker.

Grounding: echter deploy.yml-build-Job mit Node24 und Upload nach Build geprüft; zukünftiges CIgate dort konkretisiert. Snapshotpointer und BVoutput_format am RohJSON geprüft. Nach R3-Start zusätzlich die Requiredshape korrigiert: ee.degraded ist ein Array, kein Boolean; BVkey_fields/params sind optional (24/22 von 41), keine Pflichtfelder. Diese lokal belegten Korrekturen gehören in die nächste Reviewgrundlage.

Loop R2: 12 Pakete, DAG ohne Zyklen oder unbekannte Kanten; Links ohne fehlendes Ziel; Begründungen pro Paket. >1800 Planzeilen mit Detailverträgen. Materielle Korrekturen, daher noch keine Konvergenz. R3 läuft mit Fach-/A11y-/CI- und isoliertem P09-Selbstständigkeitscheck.

R3–R5: fachliche UI-/A11ygrenzen, selbstständige Aufgaben/DAG sowie abschließende Konvergenz. R1 mit reduziertem Effort wird nicht als eine der vier qualifizierten Runden dieses Neustarts gezählt.

R3: `ctr-web-explorers-plan-r3`, GPT-5.6 Sol, High bestätigt, abgeschlossen nach 6m09s, Urteil REVISE. [Transkript](../../.apr/rounds/tool-explorers/round_3.md). Vier Familienmodule und getrennte Adapter-/Loadertests lösen die parallelen Dateikonflikte. P06 legt funktionierende gemeinsame Basismodule an und besitzt die Dispatchliste; P07–P10 benötigen dadurch keine Shelländerungen.

Integration R3: Source→Section→Entry-Mapping für alle acht Adapter, Parent-/Childmodell für cass, StructuredDetail.sourceValue, explizite semantische Unterbereichsgates, ein universeller JSONquellenbereich und der P09-Snapshot-/Gruppen-/Copyvertrag. Mobile Tastaturwege und native Disclosurelisten präzisiert. ee.available ist required boolean; missing/null führt zu GenericFallback. 18 semantische Unterbereiche gegen alle Quelleinträge geprüft: keine fehlenden Pflichtfelder.

Abweichungen: fmd-Statusfilter und br-Ausgabeformatfilter werden nicht aus den früheren Entwürfen gestrichen. Stattdessen featureStatus und machineOutput samt Domains/URLregeln vollständig aufgenommen. Dekorative fmd-Farbswatches entfallen zugunsten unveränderter JSONrows. Bereits vor Ende der Runde lokal korrigierte BVoptional-/ee.degraded-/cass-JsonValue-Gates nochmals abgeglichen.

Isolierter P09-Test: noch nicht allein implementierbar als kurze Taskbeschreibung; Oracle benennt die benötigten Typen, Gates, Mapping-, Filter-/History-/Copy-/Fixturedefinitionen. Die spätere Beadbeschreibung übernimmt diese Verträge direkt, statt nur auf Markdown zu verweisen. Dieser Nachweis wird vor Übergabe wiederholt. R3 enthält materielle Präzisierungen, daher noch keine Konvergenz.

R4: ctr-web-explorers-plan-r4, GPT-5.6 Sol, High bestätigt, 7m16s, REVISE bei hoher Architekturkonvergenz. Transkript: [R4](../../.apr/rounds/tool-explorers/round_4.md). Vollständige Dateieigentümer, P05→P02 und P06→P03, Manifest-only-Links, universeller json-Bereich, getrennte BV-Formatpointer, Parsed-/Resolvedfilter und exakte npm-Listen integriert. Manifest lädt beim App-Mount unabhängig vom Katalog, Quelle weiterhin erst bei Auswahl.

R5: ctr-web-explorers-plan-r5, GPT-5.6 Sol, High bestätigt, 7m18s. [Transkript](../../.apr/rounds/tool-explorers/round_5.md). Rohurteil REVISE bei ARCHITEKTURKONVERGIERT; keine materielle Produkt-, Datenmodell-, Routing- oder Fachentscheidung offen. Konditionales READY nach drei Ownership-/Acceptancekorrekturen. P09-Selbstständigkeit inhaltlich PASS nach Scopekorrektur.

Schlussintegration R5: P02 liefert das Generic-Modell, P06 prüft Pagination/DOMtiefe/Rohpreview; P04 liefert Manifest-API, P06 startet sie am App-Mount; P09 registriert keine Commandpalette-Einträge, positive Palettenabnahme bleibt P11. Relative Planlinks aus Bead-Bodies entfernt und eigene ausführbare Checks ergänzt. Lokale Prüfung bestätigt die Zuständigkeitsgrenzen. R5 ist eine begrenzte Abnahmekorrektur, kein weiterer Architekturwechsel.

Status: vollständiger Planungsworkflow abgeschlossen. Vier qualifizierte High-Reviews R2–R5; R1 bleibt historische Vorarbeit mit reduziertem Effort. Zwölf selbstständige Beads mit 23 Kanten angelegt, sechs separate Politurprüfungen ohne Befund; kein Zyklus oder paralleler Dateikonflikt. Alle Beads open, einzig ctrw-09f Ready. [Übergabe](tool-explorers/handoff.md), [Prüfprotokoll](../../.apr/rounds/tool-explorers/beads-review.md).

Bestehende Modelltests 5/5, Typecheck erfolgreich; Lint erfolgreich mit zwei vorhandenen Fast-Refresh-Warnungen. Kein Anwendungsbuild erforderlich und kein neuer Seiten-/Deploymentnachweis. Keine Anwendungsdateien verändert.
