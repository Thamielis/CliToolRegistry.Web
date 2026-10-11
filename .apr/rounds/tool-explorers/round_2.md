# Oracle Browser Transcript

Conversation: https://chatgpt.com/c/6acb9cba-5a1c-83eb-9566-2649cfd88c24

## Prompt

Vollständiger Planungsworkflow, Runde R2 nach bindender Nutzerkorrektur. .json-Dateien mit Klartext werden IGNORIERT und NICHT aufgenommen. Acht valide JSON-Datasetseiten für sechs Tools, KEINE fmd-Textseite, KEIN Textadapter. Ignorierte Quellen bleiben unverändert und erhalten keinen Explorer-Eintrag/Download/Suche. Implementierungsplan und contracts.md bilden die normative Fassung; letzte Nutzerkorrektur hat frühere Textausnahme aufgehoben. Prüfe den ganzen Plan gegen Quellen und aktuellen Workbench-Code. Schwerpunkt: präzise Schema-/Presence-/Herkunft-/Adapterverträge, Inventargate, Manifestkohärenz, Loader/Races, Filter-/URL-Domänen und ausführbarer Historyvertrag. Liefere priorisierte konkrete Änderungen mit Begründung und git-diff-Stil. Keine Appimplementierung, keine CLI-Fallbacks. Keine Erweiterung um Backend/Semantik/Commandbuilder. Bitte widersprüchliche Stellen und tatsächlich offene wesentliche Entscheidungen nennen. Unterscheide Fehler des Plans von optionalen Optimierungen. Zum Schluss Rundenurteil und Liste verbleibender materieller Blocker. Falls keine: explizit keine materiellen Blocker statt neue Features erfinden. Nach Integration folgen weitere Reviewrunden bis Konvergenz.

## Answer

# R2-Rundenurteil: **REVISE**

Die bindende Nutzerkorrektur ist in der normativen Fassung jetzt korrekt angekommen: **acht gültige JSON-Datensatzseiten für sechs Tools**, keine Seite und kein Adapter für `fmd.robot-docs.json`, keine Suche/Palette/Downloadaktion für die ignorierte Klartextquelle. Ich finde in Plan und `contracts.md` keine verbliebene normative Textausnahme. Die Datensatzanalyse bestätigt ebenfalls genau acht gültige JSON-Datensätze und den vollständigen Ausschluss des fmd-Klartextleitfadens. attachments-bundle(20261011-142… attachments-bundle(20261011-142…

R2 ist aber noch nicht konvergent. Es bleiben **sechs materielle Vertragsprobleme** und ein konkreter Quelltreuefehler. Keines davon erfordert Backend, CLI-Fallback, Live-Semantik oder Commandbuilder.

## Priorisierung

| ID | Einstufung | Befund |
|---|---|---|
| R2-01 | **Blocker · Planfehler** | Registrierte, aber nicht parsebare JSON-Datei darf derzeit still aus dem Manifest verschwinden |
| R2-02 | **Blocker · Planwiderspruch** | Registry, Manifest, Palette und Datensatzanzahlen besitzen widersprüchliche Wahrheitsquellen |
| R2-03 | **Blocker · Vertragsfehler** | `Presence<JsonValue>` unterscheidet `null` typseitig nicht eindeutig; Snapshot-Herkunft ist zu verlustbehaftet |
| R2-04 | **Blocker · Loaderfehler** | Normalisiertes ViewModel wird unter zu schwachem Cache-Key gespeichert; Manifest-Retry-Races sind nicht vollständig gebunden |
| R2-05 | **Blocker · URL-Vertragslücke** | Multi-Value-Filter, unbekannte Werte, Resolver-Normalisierung und Katalogzustand sind nicht vollständig serialisierbar definiert |
| R2-06 | **Blocker · History-Vertragslücke** | Initialisierung der History-ID, `entryId`-Mehrdeutigkeit und exakte Pop-Restauration fehlen |
| R2-07 | **P2 · Quelltreuefehler** | `bv.robot-docs.json.output_format` hat im spezialisierten Bereichsvertrag keinen Platz |

---

## R2-01 — Registriertes kaputtes JSON darf nicht als normales Ignore gelten

Das ist der gravierendste Inventarfehler. Der Plan sagt derzeit ausdrücklich, dass selbst eine **registrierte** vorhandene, aber nicht parsebare Datei einfach ausgelassen wird und nicht zwingend den Build fehlschlagen lässt. Gleichzeitig ist eine komplett fehlende registrierte Datei ein Fehler. attachments-bundle(20261011-142…

Damit kann eine zuvor veröffentlichte registrierte Datasetseite nach einer beschädigten Exportdatei still aus dem Manifest verschwinden, während die statische Registry weiterhin ihre Identität kennt. Das widerspricht Manifest-/Registry-Kohärenz und erschwert außerdem die Garantie „ignorierte Quellen erhalten keinen Explorer-Eintrag“.

Die Nutzerregel verlangt nur, dass **nicht als JSON verwertbare `.json`-Quellen nicht als Text gerettet werden**. Sie verlangt nicht, dass ein explizit registrierter Datensatz bei Korruption als erfolgreicher Bestand gilt.

```diff
--- a/docs/plans/tool-explorers/contracts.md
+++ b/docs/plans/tool-explorers/contracts.md
@@ Aufnahmealgorithmus
- Decode-/Parsefehler lokal als IgnoredNonJson protokollieren.
- Nichtparsebare Kandidaten vollständig aus dem Explorer ausschließen.
+ Decode-/Parsefehler eines unregistrierten Kandidaten als IgnoredNonJson
+ protokollieren; kein Manifesteintrag, allein Exit 0.
+
+ Ist derselbe Filename jedoch explizit registriert, wird
+ RegisteredSourceInvalidJson erzeugt; kein Manifesteintrag und Exit 1.
+ Es gibt weiterhin keinen Text-/Markdown-Fallback.

@@ Diagnosetaxonomie
+ | RegisteredSourceInvalidJson | Build | Registrierte Quelle ist kein gültiges UTF-8-JSON; Exit 1 |

@@ Invarianten
+ Ein fehlerfrei veröffentlichbarer Bestand enthält für jede DatasetRegistration
+ genau einen Manifesteintrag.
```

`fmd.robot-docs.json` bleibt davon unberührt, weil es gerade **nicht registriert** ist. Damit bleibt seine Behandlung `IgnoredNonJson`, Exit 0, unverändert.

---

## R2-02 — Registry/Manifest/Palette besitzen derzeit drei unterschiedliche Wahrheiten

Hier bestehen zwei direkte Dokumentwidersprüche.

Der Implementierungsplan sagt, die sechs Palette-Ziele kämen aus der statischen Registry; außerdem sollen Registry-Abfragen sowohl Link **als auch Datensatzanzahl** liefern. attachments-bundle(20261011-142…

`contracts.md` sagt dagegen zu Recht:

- Explorerindex enthält nur Tools des gültigen Manifests.
- Datensatzanzahl stammt aus dem Manifest und wird nicht aus der Registry geraten.
- Palette-Toolziele erscheinen nach Manifestverfügbarkeit. attachments-bundle(20261011-142…

Die Contract-Fassung ist die robustere und passt zur Nutzerregel.

Zusätzlich behauptet der Plan, `explorerRegistry.json` sei die Quelle für Datensätze **und Tool-Fallbackidentität**, aber der gezeigte `DatasetRegistration`-Typ enthält überhaupt keine Tool-Fallbackidentität. Das ist kein Implementierungsdetail, sondern eine fehlende Registry-Struktur.

Weiterer Widerspruch: Der Plan beschreibt im öffentlichen Manifest „Status und Diagnosen“, während der verbindliche `ExplorerManifest`-Typ nur Schema und Dataset-Einträge enthält; ignorierte Builddiagnosen sollen ausdrücklich **nicht** öffentlich werden. attachments-bundle(20261011-142… attachments-bundle(20261011-142…

Ich würde die Contracts-Linie normativ machen:

```diff
--- a/docs/plans/tool-explorers-implementation.md
+++ b/docs/plans/tool-explorers-implementation.md
@@ Registry und Manifest
- Das öffentliche Manifest erhält ... Snapshot-Version/Zeit, Status und Diagnosen.
+ Das öffentliche Manifest enthält ausschließlich validierte Datasetidentität,
+ Filename, Format, Adapter, Titel, Bytezahl, SHA-256 und SnapshotMeta.
+ Build-/Ignore-Diagnosen bleiben lokal; Quellstatus wie ee.success/degraded
+ bleibt Teil des jeweiligen Datensatzes.

@@ Workbench-Integration
- Diese sechs Ziele stammen aus der statischen Explorer-Registry ...
+ Der Explorer-Bereich ist statisch erreichbar. Toolziele der Palette werden
+ erst aus einem gültigen Explorer-Manifest gebildet; ihre Fallbacknamen stammen
+ aus der statischen Registry. Sie bleiben vollständig katalogunabhängig.

- ... Registry-Abfrage für Link und Datensatzanzahl.
+ Die Registry entscheidet, ob ein Tool grundsätzlich einen Explorerlink besitzt.
+ Die Anzahl tatsächlich aufgenommener Datensätze stammt ausschließlich aus dem
+ gültigen Manifest.
```

Und die Registry braucht endlich einen vollständigen Vertrag, beispielsweise:

```diff
+ type ExplorerRegistry = {
+   schema: 'cli-tool-explorer.registry.v1';
+   tools: ExplorerToolRegistration[];
+ };
+
+ type ExplorerToolRegistration = {
+   toolId: string;
+   fallbackName: string;
+   datasets: DatasetRegistration[];
+ };
+
  type DatasetRegistration = {
-   toolId: string;
    datasetId: string;
    filename: string;
    format: 'json';
-   adapter: string;
+   adapter: AdapterId;
    title: LocalizedLabel;
  };
```

Zur Laufzeit sollte ein Manifest außerdem gegen die mitgelieferte Registry geprüft werden: `(toolId,datasetId)`, Filename und Adapter müssen übereinstimmen. Ein Release-/CDN-Skew darf nicht dazu führen, dass eine Quelle unter einer anderen bekannten Adapteridentität interpretiert wird.

---

## R2-03 — Presence und Snapshot-Herkunft sind noch nicht präzise genug

Der Grundgedanke ist richtig, aber der Typ ist nicht tatsächlich exklusiv:

```ts
type JsonValue = null | ...
type Presence<T> =
  | { state: 'missing' }
  | { state: 'null' }
  | { state: 'value'; value: T };
```

Damit erlaubt `Presence<JsonValue>` sowohl

```ts
{ state: 'null' }
```

als auch

```ts
{ state: 'value', value: null }
```

obwohl unmittelbar danach behauptet wird, Presence unterscheide diese Zustände eindeutig. attachments-bundle(20261011-142…

Das ist relevant: UBS dokumentiert `args: null` ausdrücklich als „kein Wertargument“, nicht als fehlendes Feld. attachments-bundle(20261011-142…

```diff
- type Presence<T> =
+ type Presence<T> =
    | { state: 'missing' }
    | { state: 'null' }
-   | { state: 'value'; value: T };
+   | { state: 'value'; value: Exclude<T, null | undefined> };
```

Für Snapshotwerte würde ich gleichzeitig Herkunft verbindlich machen:

```diff
- type SnapshotMeta = {
-   version: string | null;
-   contract: string | null;
-   generatedAt: string | null;
- };
+ type SourcedPresence<T> =
+   | { state: 'missing' }
+   | { state: 'null'; pointer: string }
+   | { state: 'value'; value: Exclude<T, null | undefined>; pointer: string };
+
+ type SnapshotMeta = {
+   version: SourcedPresence<string>;
+   contract: SourcedPresence<string>;
+   generatedAt: SourcedPresence<string>;
+ };
```

Damit ist auch die derzeit fehlende **adaptergenaue Snapshot-Zuordnung** festzuschreiben:

| Adapter | Version | Vertrag | generatedAt |
|---|---|---|---|
| br-guide | `/version` | `/contract_version` | missing |
| br-capabilities | `/version` | `/contract_version` | missing |
| bv-docs | `/version` | missing | `/generated_at` |
| bv-capabilities | `/version` | `/contract_version` | `/generated_at` |
| cass-capabilities | `/version` | `/contract_version` | missing |
| ee-capabilities | `/data/version` | `/schema` | missing |
| fmd-capabilities | `/version` | `/contract_version` | missing |
| ubs-docs | `/ubs_version` | `/schema_version` | missing |

Das verhindert insbesondere, dass `cass.build_commit_date = "unknown"` versehentlich als Erstellungszeit interpretiert wird. Genau dieser Wert liegt in der Quelle vor. attachments-bundle(20261011-142…

Zusätzlich sollte `Origin.guideLines` präzisiert werden:

```diff
+ guideLines sind 1-basierte, inklusive Zeilen des dekodierten JSON-Stringwerts,
+ nicht physische Zeilen der .json-Datei. Der Origin.pointer bleibt z.B. /guide.
+ Heading-Erkennung darf Text zur Erkennung betrachten, verändert aber weder
+ String noch kopierbare Quelle.
```

### Adapter-Gate

Die bisherige Aussage „verwendete Felder werden typgeprüft“ ist noch zu offen. Für jeden der acht Spezialadapter sollte der Vertrag zwischen drei Dingen unterscheiden:

1. **Identity gate** — z. B. `tool`, `contract_version`, `schema`, `topic`.
2. **Required shape** — alle zwingend verwendeten Felder und ihre Typen.
3. **Presence shape** — Felder, die fehlen/null/value sein dürfen.

Ein falscher Identity- oder Required-Shape-Wert ergibt zur Laufzeit `ready-generic + ContractShapeMismatch`; zusätzliche unbekannte Felder bleiben zulässig. Für die acht initialen Spezialregistrierungen müssen die Modelltests gegen die **echten acht Quelldateien** beweisen, dass der Specialized-Path aktiv bleibt.

Damit bleibt Generic-Fallback Resilienz und wird nicht zur stillen Ausrede für eine fehlerhafte Erstveröffentlichung.

---

## R2-04 — Cache-Key kann ein fachlich falsches ViewModel liefern

Der aktuelle Contract speichert Rohbytes, Parsed JSON **und normalisiertes ViewModel** unter `filename + sha256`. attachments-bundle(20261011-142…

Das reicht für die Rohquelle, aber nicht für die Normalisierung. Bei identischen Bytes können sich Registryidentität oder Adapter ändern. Dann würde ein altes normalisiertes Objekt mit falschem `DatasetRef` bzw. falscher Adaptersemantik zurückkommen.

Ich würde zwei Cacheebenen festschreiben:

```diff
- Cache-Key: filename + sha256.
- Cache speichert Rohbytes, geparstes JSON und normalisiertes ViewModel.
+ RawCache-Key:
+   filename + sha256
+ RawCache:
+   Rohbytes + geprüftes Parsed JSON
+
+ ViewModelCache-Key:
+   toolId + datasetId + adapter + filename + sha256
+ ViewModelCache:
+   normalisiertes ExplorerDataset
```

Der Race-Vertrag braucht außerdem eine Manifestgeneration. Die jetzige monotone Request-ID deckt Datasetwechsel gut ab, aber nicht ausreichend den Fall „Retry startet neues Manifest, altes Manifestrequest kommt später zurück“.

```diff
+ Jeder Manifest-Ladezyklus besitzt eine monotone manifestEpoch.
+ Expliziter Retry invalidiert den aktuellen Manifest-Promise und erhöht die Epoch.
+ Nur die aktuelle Epoch darf Manifestzustand veröffentlichen.
+
+ Jeder Datasetrequest bindet:
+   requestId + manifestEpoch + toolId + datasetId + sha256.
+
+ Eine verspätete Antwort darf passende Cacheeinträge füllen,
+ aber nur exakt diese Bindung darf den sichtbaren Zustand ändern.
```

Damit sind AbortController, StrictMode und Request-ID nicht drei teilweise überlappende Sicherungen, sondern ein ausführbarer Race-Vertrag.

---

## R2-05 — Filter-/URL-Domänen sind noch nicht vollständig serialisierbar

Der Plan nennt die Parameter und die zwei Resolverphasen, aber mehrere Dinge bleiben implementierungsabhängig. Insbesondere ist für `needs` nicht festgelegt, **wie mehrere Werte in der URL kodiert werden**. „dedupliziert und feste Reihenfolge“ allein reicht nicht. attachments-bundle(20261011-142… attachments-bundle(20261011-142…

Ich empfehle wiederholte Queryparameter:

```text
needs=issues&needs=git
```

nicht CSV. Das passt zu `URLSearchParams`, benötigt keine zweite Escape-Syntax und bewahrt die bestehenden URL-Prinzipien.

```diff
+ Multi-Value-Vertrag:
+   needs wird als wiederholter Parameter serialisiert.
+   Zulässige Reihenfolge: issues, git, sprint, baseline.
+   Doppelte Werte werden dedupliziert.
+   Unbekannte Werte werden als invalid-filter markiert und in der
+   Resolver-Normalisierung entfernt.
+
+ Scalarfilter verwenden den ersten Wert eines mehrfach vorkommenden Parameters.
+
+ Phase 1:
+   syntaktische Domains/Limits prüfen.
+
+ Phase 2:
+   dataset-/sectionabhängige Anwendbarkeit prüfen.
+   Neutralisierte Filter werden einmalig per replace aus der kanonischen URL
+   entfernt; dabei entsteht kein neuer History-Eintrag.
```

`envCategory` ist bewusst anders: syntaktisch nur ein begrenzter String, fachlich erst gegen die Kategorien des geladenen ee-Datensatzes prüfbar.

Außerdem muss „Katalogzustand bleibt erhalten“ enger formuliert werden. Der aktuelle Workbench-Code löscht beim Sectionwechsel `tool`, behält aber Suche/Filter/View usw.; genau dieses Verhalten ist Teil des bestehenden Workbench-Vertrags. attachments-bundle(20261011-142… Der bestehende UX-Vertrag verlangt ebenfalls, dass die bekannten URL-Felder und ihre Push-/Replace-Semantik erhalten bleiben. attachments-bundle(20261011-142…

```diff
- Katalogzustand bleibt erhalten.
+ Explorerinterne Navigation verändert q/category/platform/sort/view/count nicht.
+ Der Katalogparameter tool folgt weiterhin der bestehenden Sectionnavigation:
+ ein regulärer Sectionwechsel schließt die Katalogdetailauswahl.
```

Damit wird `tool` nicht unabsichtlich zu einem zweiten Explorer-Identifier.

---

## R2-06 — Historymodell ist gut angelegt, aber noch nicht ausführbar genug

Der aktuelle Code schreibt bei jeder Navigation `history.state = null`; `popstate` liest nur die URL, und der Section-Effect fokussiert/scrollt bei jedem Sectionwechsel pauschal. attachments-bundle(20261011-142… attachments-bundle(20261011-142…

Dass der Plan dies ersetzen will, ist korrekt. Allerdings fehlen drei entscheidende Schritte:

**Erstens:** „Jeder Eintrag besitzt eine zufällige App-ID“, aber es gibt keinen Bootstrapping-Schritt für den bereits existierenden initialen Browser-History-Eintrag.
**Zweitens:** Das State-Feld heißt `entryId`, obwohl `entry` bereits die Explorer-Detail-ID bezeichnet.
**Drittens:** Es ist nicht festgelegt, ob bei Pop der persistierte oder der aktuellere In-Memory-Zustand Vorrang hat. Der Vertrag selbst erwähnt beide. attachments-bundle(20261011-142…

```diff
- Eigene Daten: entryId, scrollY, focusKey.
+ Eigene Daten: historyId, scrollY, focusKey.

+ Initialisierung:
+ Beim App-Mount wird der aktuelle History-Eintrag genau einmal per replace
+ mit einem historyId versehen, falls kein valider eigener State existiert.
+ Fremder Objekt-State wird gemergt; primitiver State unter foreignState erhalten.
+
+ Push:
+ 1. aktuellen Scroll-/Fokuszustand synchron erfassen;
+ 2. aktuellen Eintrag per replace sichern;
+ 3. neuen Eintrag mit neuer historyId pushen.
+
+ Replace:
+ vorhandene historyId beibehalten; keine neue ID.
+
+ Pop:
+ niemals pushState/replaceState auslösen;
+ event.state lesen und URL parsen;
+ Zielstate aus In-Memory[historyId] bevorzugen,
+ sonst persistierte scrollY/focusKey verwenden.
+
+ Nach passendem Lazy-Ready:
+ gespeichertes scrollY restaurieren;
+ anschließend focusKey mit preventScroll fokussieren.
```

Das respektiert weiterhin den bestehenden Grundsatz **„Popstate reads without writing“**. attachments-bundle(20261011-142…

Dazu gehören explizite Modell-/UI-Abnahmen für:

```diff
+ initial A -> push B -> Back A -> Forward B
+ replace auf B behält historyId
+ Katalog -> Explorer -> Katalog
+ Pop während Lazy-Screen noch lädt
+ veralteter Ready-Callback nach weiterer Navigation
+ fremder Objekt-history.state
+ initial primitiver history.state
+ Reload mit URL, aber ohne In-Memory-Restore
```

Damit ist der Historyvertrag implementierbar, ohne dass die Umsetzung eigene Semantik erfinden muss.

---

## R2-07 — `bv.robot-docs.output_format` fehlt im spezialisierten Seitenvertrag

`bv.robot-docs.json` besitzt explizit:

```json
"output_format": "json"
```

direkt neben `topic` und `version`. attachments-bundle(20261011-142…

Der geplante Bereichsvertrag für `bv-docs` enthält dagegen:

```text
commands, aliases, examples, guide, env, exit-codes
```

und keinen Formatbereich. attachments-bundle(20261011-142…

Da `bv-capabilities` bereits einen `formats`-Bereich kennt, ist die kleinste konsistente Korrektur:

```diff
- | bv-docs | commands, aliases, examples, guide, env, exit-codes |
+ | bv-docs | commands, aliases, examples, guide, formats, env, exit-codes |
```

`formats` auf dieser Seite darf nur den tatsächlich gelieferten `output_format`-Wert darstellen. Er darf nicht mit den umfangreicheren `output_formats` der anderen BV-Datei zusammengeführt werden.

Das ist genau die datensatzlokale Herkunftstrennung, die der Plan an anderer Stelle fordert.

---

# Optionale Optimierungen — **keine R2-Blocker**

### Entry-ID-Kollisionen härten

Die heutigen Daten kollidieren nicht, aber `arg:<command>:<argument>` ist formal nicht injektiv, wenn künftige Namen `:` enthalten. Eine günstige Regel wäre:

```diff
+ Enthält ein fachlicher Namensbestandteil den internen ':'-Separator,
+ wird für diesen Eintrag die ptr:-ID verwendet.
```

Keine neue URL-Syntax nötig.

### Manifest erst nach vollständiger Validierung ersetzen

Für bessere lokale Robustheit sollte `sync:explorers` das Zielmanifest nicht früh überschreiben:

```diff
+ Vollständiges Manifest im Speicher erzeugen und validieren.
+ Ziel erst nach fehlerfreier Inventarprüfung ersetzen.
+ Bei Exit != 0 bleibt ein bestehendes Manifest unangetastet.
```

Das ist Härtung, nicht Voraussetzung für die Produktsemantik.

---

# Tatsächlich offene wesentliche Punkte

Es gibt **keine offene Produktentscheidung mehr** zu Anzahl, fmd-Textbehandlung, Backend, Toolausführung oder Commandbuilder. Diese Punkte sind entschieden.

Nach R2 bleiben aber vor dem Plan-Freeze noch zwei echte Planungsevidenzpunkte:

1. Die acht Spezialadapter brauchen die vollständige, maschinennahe Required-/Presence-Matrix und ihre Section-/Entry-Mappings. Der Plan selbst kennzeichnet diese Typ-/Diagnoseverträge noch als nicht vollständig konkretisiert. attachments-bundle(20261011-142…
2. Die exakten verpflichtenden CI-/Pages-Checks sind aus dem angehängten Repositoryausschnitt noch nicht verifizierbar. `package.json` besitzt aktuell nur die bestehenden Katalog-/Workbench-Skripte; die geplanten Explorer-Kommandos sind erwartungsgemäß noch nicht implementiert. attachments-bundle(20261011-142… Das ist für R2 kein Anlass, Checknamen zu erfinden; es muss spätestens vor dem Freeze mit dem tatsächlichen Workflow abgeglichen werden.

## Verbleibende materielle Blocker für die R2-Integration

Nach aktueller Fassung sind noch zu beseitigen: **registriert-invalides JSON im Inventargate, Registry/Manifest-Wahrheitsquelle, Presence/Snapshot-Herkunft, ViewModel-Cache/Race-Bindung, vollständiger Filter-URL-Vertrag, ausführbarer History-Bootstrap und der fehlende BV-`output_format`-Bereich.**

**R2 bleibt daher `REVISE`.** Nach Integration dieser Punkte sehe ich aus dieser Runde keinen Anlass, neue Produktfeatures hinzuzufügen; R3 kann dann gezielt Fachansichten/A11y und R4 DAG/Selbstständigkeit/Konvergenz prüfen.
