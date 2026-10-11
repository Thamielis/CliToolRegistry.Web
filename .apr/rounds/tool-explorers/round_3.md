# Oracle Browser Transcript

Conversation: https://chatgpt.com/c/6acba01c-4c7c-83eb-bbe7-9e61d9d9aad2

## Prompt

Vollständiger Planungsworkflow R3. Reviewe vollständiges normatives Planpaket aus implementation+contracts+tasks+6Seitenentwürfen, gegen verifizierte Analyse und aktuellen Code/CI. Benutzerregel: vorhandene .json mit nichtparsebarem Klartext werden ignoriert und nicht aufgenommen, auch wenn registriert. Kein RegisteredSourceInvalidJson-Fehler allein dafür; Registry deklariert Kandidaten und Manifest die aufgenommenen Teilmengen. Das ist entschieden und R2-01 bewusst nicht übernommen. Keine Textseite, Backend/Toolausführung/Semantik/Builder. R2-02..07 sind integriert; die Registry-/Presence-/Snapshot-/Gate-/Cache-/Epoch-/History-/Filter-/CI-Präzisierungen stehen in Abschnitt J von contracts.md. Hauptplan/Contracts normativ vor älteren Seitenentwürfen; Widersprüche trotzdem als konkrete Textkorrektur nennen. Schwerpunkt: Quelltreue/Fachansichten/Presence und echte A11y-/mobile Wege, vollständige Requiredshape und Eintrags-/Bereichsmappings, CI/Pagesproduction. Auch Selbstständigkeit/DAG überprüfen: P01 ist einzige Readyaufgabe, P12 Abschlusskonsument. Zusätzlich den isolierten P09-Tasktext beurteilen: welche konkreten Vertragsdefinitionen muss sein späterer Bead direkt enthalten, damit er ohne Markdownplan umsetzbar ist? Keine neue Produkterweiterung erfinden. Priorisierte materielle Änderungen mit genauer Stelle+Begründung+gitdiff; optionale Verbesserungen getrennt. Abschlussurteil mit tatsächlich verbleibenden materiellen Blockern, oder explizit keine. Antworte kompakt genug für saubere Integration (~2500 Wörter maximal).

## Answer

# R3-Urteil: **REVISE**

Der Produktumfang ist inzwischen sehr stabil. Insbesondere ist die Klartextregel konsistent: `fmd.robot-docs.json` bleibt unverändert, ist aber **kein Explorer-Datensatz**, erhält keinen Textadapter und keinen Explorer-Link; acht valide JSON-Datensätze bilden das Inventar. R2-01 sollte daher weiterhin **nicht** übernommen werden. attachments-bundle

Ich sehe noch **fünf materielle Planblocker**. Keiner davon verlangt Backend, Toolausführung, Semantikdienst oder Builder. CI/Pages, Cache/Epoch, History und die grundsätzliche Registry-/Manifesttrennung sind dagegen ausreichend konkret.

## 1. **P0 – Arbeitspakete sind im DAG logisch korrekt, aber dateiseitig nicht selbstständig**

Der Dependency-Graph selbst stimmt: P01 ist einzige erste Ready-Aufgabe; P12 ist der transitive Abschlusskonsument. Das ist korrekt festgehalten. attachments-bundle

Die **Dateiverantwortung widerspricht aber der Parallelität des DAG**. P03 und P04 können gleichzeitig Ready werden und besitzen beide `tests/explorer-model.test.ts`. Noch deutlicher: P07, P08, P09 und P10 können parallel Ready werden, beanspruchen aber jeweils `ToolExplorer.tsx`, `ExplorerDetails.tsx` und `tests/explorer-ui.spec.ts`. attachments-bundle attachments-bundle

Das ist für selbstständige Beads ein realer Integrations-/Reservationskonflikt.

**Empfohlene Korrektur:** gemeinsame Shell ausschließlich P06, fachliche Ansichten in fachlich getrennte Dateien. Das ist gerade keine vorsorgliche Pluginarchitektur, sondern entspricht den bereits vorhandenen Fachgrenzen.

```diff
--- tasks.md
+++ tasks.md
@@ P03
-- tests/explorer-model.test.ts
+- tests/explorer-adapters.test.ts

@@ P04
-- tests/explorer-model.test.ts
+- tests/explorer-loader.test.ts

@@ P07
-- src/components/ToolExplorer.tsx
-- src/components/ExplorerDetails.tsx
-- tests/explorer-ui.spec.ts
+- src/components/explorer/BrBvExplorer.tsx
+- tests/explorer-br-bv-ui.spec.ts

@@ P08
+- src/components/explorer/CassExplorer.tsx
+- tests/explorer-cass-ui.spec.ts

@@ P09
+- src/components/explorer/EeExplorer.tsx
+- tests/explorer-ee-ui.spec.ts

@@ P10
+- src/components/explorer/FmdUbsExplorer.tsx
+- tests/explorer-fmd-ubs-ui.spec.ts
```

P06 behält die gemeinsame Shell und bindet diese Views ein. Dadurch bleibt **P01 einzige Ready-Aufgabe** und P12 Abschlusskonsument, ohne künstliche Serialisierung.

---

## 2. **P0 – Requiredshape ist noch nicht widerspruchsfrei bzw. vollständig genug**

Hier gibt es bereits einen harten internen Widerspruch. Für cass verlangt J derzeit bei vorhandenen Argumentfeldern `default:string` und `enum_values:string[]`; gleichzeitig definiert das gemeinsame Modell `defaultValue: Presence<JsonValue>` und `enumValues: Presence<JsonValue[]>`, und P08 verlangt ausdrücklich den Testfall `enum true`. attachments-bundle attachments-bundle

Das würde einen tatsächlich vorgesehenen cass-Snapshot wegen eines Boolean-Enumwerts fälschlich auf GenericFallback setzen.

```diff
--- contracts.md
+++ contracts.md
@@ cass-capabilities Presence-/Zusatzshape
-Argument value_type/default:string, enum_values:string[];
+Argument value_type:string,
+default:JsonValue,
+enum_values:JsonValue[],
+repeatable:boolean,
+short:string,
+jeweils wenn vorhanden;
```

Größer ist das systematische Problem: `features/.../output/... als strukturierte Originalbereiche` nennt zwar Felder, definiert aber nicht deren Typen, obwohl die Fachseiten daraus Namen, Status, Kategorien, Filter, Copy-Aktionen oder semantische Labels erzeugen. J selbst sagt zugleich, dass **jeder fachlich ausgewertete optionale Wert typgeprüft werden muss**. attachments-bundle

Daher sollte J zusätzlich festlegen:

```diff
+ Regel: Jedes Feld, dessen Inhalt ein Spezialadapter semantisch
+ interpretiert, filtert, beschriftet oder in einen spezialisierten
+ EntryDetail-Typ überführt, besitzt hier einen expliziten erwarteten Typ.
+ "strukturierter Originalbereich" ist nur für opaque StructuredDetail/
+ RawJSON zulässig.
+
+ Bei falschem Typ eines semantisch ausgewerteten Felds:
+ ContractShapeMismatch -> generic-json.
```

Das betrifft besonders EE `subsystems`, `features`, `unimplemented`, `envOverrides` und die konkret interpretierten Outputfelder sowie die entsprechenden strukturierten Bereiche von br/bv/cass/fmd/ubs.

---

## 3. **P0 – Entry-/Bereichsmapping ist noch unvollständig; cass zeigt den Modellfehler**

Contracts E definiert die Section-IDs sauber, aber nicht vollständig **welcher Quellknoten welchen Entry erzeugt, welche ID er erhält und ob er Top-Level- oder Child-Entry ist**. attachments-bundle

Bei cass wird das bereits problematisch: P08 verlangt 314 Argumente als eigenständige fachliche Entries, gleichzeitig sollen sie innerhalb des jeweiligen Commanddetails gefiltert werden. `ExplorerEntry` besitzt aber kein Parent-Konzept; `ExplorerSection.entryIds` suggeriert nur eine flache Liste. attachments-bundle

Ich würde das explizit lösen, nicht mit einer neuen `arguments`-Produktsektion:

```diff
 type ExplorerEntry = {
   id: string;
   sectionId: string;
+  parentEntryId?: string;
   title: string;
   searchText: string;
   origin: Origin;
   detail: EntryDetail;
 };

+ ExplorerSection.entryIds enthält ausschließlich Top-Level-Einträge.
+ Child-Entries bleiben such-, adressier- und deep-linkbar.
+ CassArgumentDetail.parentEntryId verweist auf cmd:<commandName>.
+ Ein Argumenttreffer öffnet Parent-Command plus Argumentdetail.
```

Zusätzlich braucht J eine **Source→Section→Entry-Mappingtabelle** für alle acht Adapter, z. B. EE:

```diff
+ /data/commands/<i>       -> commands      -> cmd:<name>
+ /data/subsystems/<i>     -> subsystems    -> ptr:<pointer>
+ /data/features/<i>       -> features      -> feature:<name>
+ /data/unimplemented/<i>  -> unimplemented -> ptr:<pointer>
+ /data/envOverrides/<i>   -> env           -> env:<name>
+ /data/output             -> output        -> ptr:/data/output
+ envelope + binaries/index/summary
+                          -> snapshot      -> ptr:<source-pointer>
```

Dasselbe Prinzip reicht für die übrigen Adapter; damit werden P03 und die UI-Beads tatsächlich deterministisch.

Ein zweiter kleiner Widerspruch liegt direkt daneben: J behauptet, `StructuredDetail` besitze Originalpointer und `JsonValue`, der tatsächliche Typ enthält aber nur `rows` und `copyCommands`. attachments-bundle

```diff
 type StructuredDetail = {
   kind: 'structured';
+  sourceValue: JsonValue;
   rows: ...;
   copyCommands: string[];
 };
```

Der Pointer kann weiterhin aus `ExplorerEntry.origin` stammen; dann sollte J genau das statt „StructuredDetail besitzt den Originalpointer“ sagen.

---

## 4. **P0 – P09 enthält einen Presence-Widerspruch und ist als späterer isolierter Bead noch nicht eigenständig**

P09 sagt:

> `available` müsse `missing/null` von `false` unterscheiden.

Der verbindliche EE-Requiredshape verlangt jedoch für **jeden Command** `available:boolean`, und `EeCommandDetail.availableInSnapshot` ist ebenfalls ein zwingendes Boolean. Missing/null kann daher in der spezialisierten EE-Ansicht gar nicht vorkommen; es müsste vorher `ContractShapeMismatch → generic-json` auslösen. attachments-bundle attachments-bundle

```diff
--- tasks.md P09
-5. available-Filter muss missing/null vom echten false unterscheiden.
+5. available ist im ee-Spezialvertrag ein erforderliches Boolean.
+   false bleibt ein echter Snapshotwert; missing/null/falscher Typ
+   führt gemäß Adaptergate zu ContractShapeMismatch/generic-json.
```

### Was der spätere P09-Bead direkt enthalten muss

Der derzeitige Tasktext reicht **nicht**, wenn der Bead ohne Markdownplan umsetzbar sein soll. Neben Scope, Dateien und `P03,P06` als Blocker muss sein Body wörtlich die folgenden Vertragsinformationen übernehmen:

- Datasetidentität `ee/capabilities`, Filename, Adapter `ee-capabilities`, Identitygate `schema=ee.response.v2`; Requiredshape von Envelope, `data.version` und Commands.
- Die oben festgelegten Typen der tatsächlich interpretierten EE-Unterbereiche.
- **Exakte sieben Section-IDs:** `commands`, `subsystems`, `features`, `unimplemented`, `env`, `output`, `snapshot`.
- Source→Entry-Mapping einschließlich `/data/commands/<index>` und `/data/envOverrides/<index>`, ID-Regeln und der Regel „Gruppenknoten sind keine Entries“.
- Ableitung der 112 Gruppen ausschließlich aus vollständigen Commandnamen unter Erhalt des Originalindex; Suchmodus flach.
- `available=all|yes|no`, `envCategory=<Quellkategorie>`, UND-Verknüpfung mit `docQ`; `docCount=48`, +48.
- `success`, `degraded`, `error` und lokale Pfad/Index-/Env-Werte ausdrücklich als **Snapshot**, nicht Livezustand.
- Copy-Vertrag `ee <vollständiger name>`; keine Argumente erfinden.
- aktuelle Fixture-Orakel: 557 Commands, 112 Gruppen, 556 available, `mcp serve-stdio=false`, 130 Env-Einträge/14 Kategorien.
- Fokus-/Historyvertrag für Entry-push/close/pop sowie Mobile-/A11y-Abnahme.
- Verbote: keine Palette mit 557 Commands, keine Toolausführung, kein Builder, keine Liveprüfung.

Damit kann P09 ohne `contracts.md` oder `ee.md` implementiert werden.

---

## 5. **P1 – Drei ältere Seiten-/Tasktexte widersprechen den normativen Filter-/Sectionverträgen**

Diese sind keine neuen Produktentscheidungen; die älteren Texte sollten an Contracts angepasst werden.

**cass/P08:** „Quellen, Health und Outputverträge eigene Bereiche“ existieren nicht in der bindenden cass-Bereichsliste. attachments-bundle

```diff
-Konfiguration, Quellen, Recovery, Health und Outputverträge eigene Bereiche.
+Globale Optionen, Fähigkeiten, Connectoren, Konfiguration,
+Exitcodes, Recoveries und Limits in den normativ definierten Bereichen zeigen.
```

**fmd.md:** Der Entwurf fordert einen Feature-Statusfilter, aber Contracts E definiert keinen solchen fmd-Filter. attachments-bundle

```diff
-Filter zunächst nach exakt vorhandenem Statusstring, zusätzlich Name/Text.
+Statusstrings bleiben über die dateilokale Plaintext-Suche recherchierbar;
+es wird kein zusätzlicher Fachfilter eingeführt.
```

**br.md:** „Filter … dokumentierte Ausgabeformate“ liest sich ebenfalls wie ein zusätzlicher nicht definierter Filter. attachments-bundle

```diff
-Filter: Operation ..., Workspace ..., dokumentierte Ausgabeformate.
+Filter: Operation ... und Workspace ... .
+Dokumentierte Ausgabeformate bleiben als eigener Bereich erreichbar.
```

### A11y/Mobile

Der zentrale Vertrag ist grundsätzlich gut, aber für EE und cass sollte aus „bei 320/360 prüfen“ ein **ausführbarer Bedienweg** werden: Suche/Filter → Ergebnis öffnen → Detailüberschrift erhält Fokus → Close/Back restauriert Auslöser → „Mehr anzeigen“ bleibt fokussierbar → kein Page-Level-Horizontaloverflow. Für den EE-Baum sollte ausdrücklich eine native verschachtelte Liste mit Disclosure-Buttons verwendet werden; kein `role=tree` ohne vollständiges Treeview-Keyboardmodell.

Das ist eine Vertragspräzisierung, keine Produkterweiterung.

---

## CI / GitHub Pages

Hier sehe ich **keinen materiellen Planfehler**. Der Ist-Workflow lädt derzeit unmittelbar nach Build hoch und führt noch keine Produktions-UI-Prüfung aus; genau diese Lücke adressiert P12. attachments-bundle Der bestehende `test:production` prüft aktuell nur `workbench-ui.spec.ts`, während Playwright bereits korrekt auf `/CliToolRegistry.Web/` und Preview/4180 ausgelegt ist. attachments-bundle attachments-bundle

Ich würde in P12 lediglich die Abnahme explizit formulieren als: **Explorer- und Workbench-Production-Specs müssen beide vor `upload-pages-artifact` erfolgreich sein; Chromium wird vorher mit Hostdependencies installiert.** Das ist Präzisierung, kein zusätzlicher Blocker.

## Verbleibende materielle Blocker

**5:** parallele Dateiverantwortung, unvollständige/widersprüchliche Requiredshape, fehlendes vollständiges Entry-/Bereichsmapping inklusive cass-Childmodell, P09-Presence-/Selbstständigkeitsvertrag sowie drei normative Widersprüche in Task/Seitenentwürfen.

Nach Integration dieser Punkte sehe ich **keine weitere offene Produktentscheidung**: Scope, Klartextregel, Registry/Manifest-Modell, Loader/Epoch, History, Filtergrenzen und Pages-CI können unverändert bleiben. Die zwei tatsächlich noch zu fixierenden Vertragsentscheidungen sind lediglich **(a)** das Child-Entry-Modell für cass und **(b)** die explizite Typgrenze zwischen semantisch ausgewerteten Feldern und opaque `StructuredDetail`; oben ist für beide eine konkrete, scope-neutrale Fassung vorgeschlagen.
