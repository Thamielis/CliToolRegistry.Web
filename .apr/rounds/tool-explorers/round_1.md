# Oracle Browser Transcript

Conversation: https://chatgpt.com/c/6acb94ae-983c-83ed-a2e2-8c84a7743b64

## Prompt

Review round 1 for the attached German implementation plan. User authorized updating analysis and STARTING implementation planning only; do not write application code or create Beads. Workspace is React/Vite GitHub Pages under /CliToolRegistry.Web/. Use implementation plan as primary review target and analysis/current sources as evidence. Carefully review this entire plan and propose best revisions for architecture, reliability, usability, source fidelity, URL/history compatibility, deterministic inventory and explicit fmd text exception. For each proposed change give detailed rationale and git-diff style changes versus the original plan. Identify blockers, unresolved material decisions, misleading assumptions and contradictions with the provided actual code/JSON. Do not claim this is a live tool status, require a backend, or merge different snapshots. Target scope includes exactly nine dataset pages across six tools. Reply in German with prioritized changes and a concise round verdict. This is R1 of a planned minimum 4 rounds, not a request to approve a frozen plan. Prioritize useful depth over line-count padding.

## Answer

# Review R1 – Implementierungsplan Tool-Erkundungsseiten

## Rundenurteil

**R1 ist noch nicht konvergent und der Plan sollte noch nicht eingefroren werden.** Die Grundrichtung ist gut: statische React/Vite-Oberfläche, keine Tool-Ausführung, getrennte Datensatzherkunft, lazy Explorer-Screen, Digestprüfung und fachliche Adapter passen zum vorhandenen Projekt. Der Plan versteht auch korrekt, dass es um gelieferte Dokumentations-Snapshots geht und nicht um Tool-Ausführung oder Live-Diagnostik. attachments-bundle

Vor R2 sehe ich jedoch **vier materielle Blocker**:

| Priorität | Befund | Konsequenz |
|---|---|---|
| **P0** | Die geplante automatische Veröffentlichung unregistrierter JSON-Dateien widerspricht dem Scope von **exakt 9 Datensatzseiten / 6 Tools**. | Inventarvertrag ändern. |
| **P0** | URL-Validierung wird im Plan teilweise `parseNavigation` zugeschrieben, obwohl Manifest-/Adapterwissen erst asynchron vorliegt. | Syntaktisches Parsing und semantische Auflösung trennen. |
| **P0** | Der beschriebene Back/Forward-/Scroll-/Fokusvertrag widerspricht dem aktuellen `App.tsx`: `history.state` ist `null`, `popstate` liest nur Query und Abschnittswechsel scrollen immer nach oben. | History-Vertrag vor Implementierung konkretisieren. |
| **P0** | Tool-Einstiege riskieren, Metadaten mehrerer zeitlich verschiedener Quellen als gemeinsamen Stand erscheinen zu lassen, besonders bei `bv`. | Expliziter Snapshot-Isolationsvertrag erforderlich. |

Hinzu kommen mehrere P1-Punkte zu deterministischer Manifestbildung, statischem GitHub-Pages-Caching, fmd, Lazy-Fokus und der Unabhängigkeit vom Katalog.

---

# P0-A — Veröffentlichungsinventar auf exakt neun Datensätze schließen

Der Produktvertrag ist eindeutig: `br` und `bv` je zwei, `cass`, `ee`, `ubs` je eine JSON-Seite sowie `fmd` JSON + Text, also **9 Seiten für 6 Tools**. attachments-bundle

§4 bricht diesen Vertrag anschließend auf:

> unregistrierte valide JSON-Dateien → generischer Datensatz unter „Unzugeordnet“

Damit hängt die öffentliche Navigation plötzlich vom zufälligen Inhalt von `public/robot-docs/` ab. Eine zehnte Datei würde ohne Produktentscheidung zur zehnten Seite. Das ist weder scope-treu noch deterministisch und erschwert Abnahme, URLs und Tests.

`generic-json` ist trotzdem sinnvoll — aber **als Fallback-Renderer für einen der acht registrierten JSON-Datensätze, dessen valider Inhalt nicht mehr zum bekannten Vertrag passt**, nicht als automatische Discovery neuer Seiten.

### Vorgeschlagener Plan-Diff

```diff
@@ §4 Registry und Manifest

- Gültige unregistrierte JSON-Dateien erhalten einen generischen Datensatz
- unter einer separaten, reservierten Unzugeordnet-Gruppe. Ihre ID basiert
- deterministisch auf dem vollständigen Dateinamen, nicht auf vermuteten
- Tool-Präfixen. Die Gruppe darf nie auf eine gleichnamige Katalog-ID
- verweisen. Explizite Registrierung ordnet spätere Dateien richtig zu.
+ Die veröffentlichte Explorer-Inventarliste besteht in dieser Fassung
+ ausschließlich aus den neun explizit registrierten Datensätzen der sechs
+ Tools br, bv, cass, ee, fmd und ubs. Das Vorhandensein weiterer Dateien
+ unter public/robot-docs/ erweitert den veröffentlichten Explorer nicht
+ automatisch.
+
+ Eine zusätzliche reguläre Datei unter public/robot-docs/ ist eine
+ Inventardiagnose und in validate:explorers ein Veröffentlichungsfehler,
+ bis sie durch eine spätere, ausdrücklich freigegebene Planänderung in
+ die Registry aufgenommen oder bewusst aus dem Explorer-Inventar
+ ausgeschlossen wird.
+
+ generic-json ist kein Discovery-Mechanismus. Der Reader dient nur als
+ sichere Fallback-Darstellung auf einer bereits registrierten JSON-Seite,
+ wenn deren Inhalt syntaktisch gültiges JSON ist, aber keinen bekannten
+ Fachvertrag erfüllt.

@@ §12 Testmatrix

- | Inventar | Unregistrierte valide neue Datei | Generische Seite unter
- | Unzugeordnet, keine Tool-Verwechslung |
+ | Inventar | Zusätzliche unregistrierte Datei | Keine neue Seite;
+ | eindeutige UnexpectedInventoryFile-Diagnose; Publishcheck schlägt fehl |

@@ P01

- | P01 | Registry, Manifest-Generator, Formatdiagnostik |
- | ... | 9 bekannte Quellen; Textausnahme; unbekannte JSON; deterministisch |
+ | P01 | Registry, Manifest-Generator, Formatdiagnostik |
+ | ... | exakt 9 registrierte Quellen; Textausnahme; keine automatische
+ | Seitendiscovery; deterministisches Manifest |
```

Das ist für mich der wichtigste R1-Fix.

---

# P0-B — Die fmd-Textausnahme als *einzige* explizite Ausnahme formulieren

Die Analyse ist hier sehr klar: `fmd.robot-docs.json` ist trotz `.json`-Endung **88 Zeilen lesbarer Klartext**, und gerade daraus darf **keine allgemeine „JSON kaputt → behandle als Text“-Heuristik** entstehen. attachments-bundle

Der Plan sagt dies bereits grundsätzlich richtig, aber „`fmd.robot-docs.json` ist exakt als Text freigegeben“ sollte zu einem maschinenprüfbaren Vertragsbestandteil verschärft werden.

Außerdem sollte der Plan Fetch-MIME und Datenformat nicht vermischen. GitHub Pages kann die Datei aufgrund der Endung als `application/json` ausliefern. Der Loader sollte das nicht als Wahrheitsquelle benutzen. Maßgeblich ist die Registry.

### Vorgeschlagener Plan-Diff

```diff
@@ §4 Registry und Manifest

- `fmd.robot-docs.json` ist exakt als Text freigegeben; keine
- Inhaltsheuristik unterdrückt andere Parsefehler.
+ Die einzige Textausnahme dieser Fassung ist exakt die Registry-Identität
+ `(toolId='fmd', datasetId='robot-docs',
+ filename='fmd.robot-docs.json', format='text')`.
+
+ validate:explorers prüft, dass genau diese Registrierung trotz
+ `.json`-Suffix als Text deklariert ist und dass keine zweite implizite
+ oder heuristische Textausnahme existiert.
+
+ Das deklarierte Registry-Format ist maßgeblich. Ein vom statischen Host
+ gelieferter HTTP Content-Type wird höchstens diagnostisch betrachtet und
+ darf insbesondere fmd.robot-docs.json nicht in einen JSON-Parser zwingen.
+ Alle anderen als JSON registrierten Quellen müssen syntaktisch valides
+ JSON sein.

@@ §5 Ladevertrag

- Fmd-Klartext verwendet `text/plain`, JSON `application/json`.
+ Für erzeugte Download-Blobs verwendet fmd-Klartext
+ `text/plain;charset=utf-8`, JSON `application/json;charset=utf-8`.
+ Diese MIME-Werte betreffen den Download; sie sind keine Voraussetzung
+ für den MIME-Typ der GitHub-Pages-Fetch-Antwort.
```

Die aktuelle Analyse bestätigt sowohl den Sonderfall als auch die Forderung, die Originalquelle unverändert zu lassen. attachments-bundle

---

# P0-C — Keine gemeinsamen „Tool-Snapshots“ aus mehreren Dateien erzeugen

Der Plan sagt zwar, gleichnamige Einträge würden nicht überschrieben, formuliert aber den Tool-Einstieg noch zu wenig streng. Das ist bei `bv` materiell: Robot-Dokumentation und Capabilities stammen laut Analyse von **2026-10-09T10:42:48Z** bzw. **2026-10-11T13:08:21Z**. Sie dokumentieren dasselbe Tool, aber eben nicht denselben Snapshot. attachments-bundle

Deshalb darf der Tool-Einstieg weder Version, Zeitpunkt, Status noch Mengen zu einem künstlichen Tool-Gesamtstand zusammenziehen. Dass `br` zufällig in beiden Dateien `0.7.4` trägt, ändert den Architekturvertrag nicht.

Dasselbe gilt besonders für `ee`: lokale Pfade, Env-Zustände, Subsystemstatus und `available` sind Beobachtungen der exportierenden Installation, nicht des Browsers und nicht der aktuell laufenden Tool-Version. attachments-bundle

### Vorgeschlagener Plan-Diff

```diff
@@ §1 Produktvertrag

+ Jede Datensatzseite repräsentiert genau eine gelieferte Quelldatei.
+ Tool-Einstiege sind ausschließlich Navigations-/Inventarseiten über
+ diese Quellen. Sie bilden keinen zusammengeführten Tool-Snapshot.

@@ §5 Ladevertrag und Herkunft

+ Snapshot-Metadaten bleiben datensatzlokal. Version, Exportzeit,
+ Verfügbarkeit, Statuswerte, lokale Pfade und andere Beobachtungen einer
+ Quelle dürfen weder auf Geschwisterdatensätze übertragen noch zu einem
+ vermeintlich gemeinsamen aktuellen Tool-Stand aggregiert werden.
+
+ Ein Tool-Einstieg darf beispielsweise anzeigen:
+   - Robot-Dokumentation — eigener Stand / eigener Digest
+   - Capabilities — eigener Stand / eigener Digest
+ Er darf daraus keinen gemeinsamen "Stand des Tools" berechnen.

@@ §8 Integration in Workbench und Katalog

- Katalogidentität ist optionaler Zusatz.
+ Katalogidentität ist optionaler Zusatz ausschließlich für Name, Logo und
+ Navigation. Katalogdaten überschreiben keine Snapshot-Metadaten eines
+ Explorer-Datensatzes und werden nicht als gemeinsame Versions- oder
+ Statusquelle verwendet.

@@ §9 ee

- Snapshot-Stati und lokale Werte haben eindeutige Labels.
+ Snapshot-Stati und lokale Werte tragen explizite Formulierungen wie
+ "im gelieferten Snapshot", "vom Export gemeldet" oder
+ "lokale Beobachtung der exportierenden Installation". Weder `available`,
+ Subsystemstatus noch Env-Werte werden als gegenwärtiger Zustand des
+ Besuchers, der Website oder einer aktuell installierten CLI bezeichnet.
```

Ich würde zusätzlich im Plan das Wort **„live“ für Explorer-Daten komplett verbieten**. Das vorhandene `sourceLive` in `App.tsx` bezeichnet den Katalog-Fetch und darf nicht auf Explorer-Inhalte übertragen werden.

---

# P0-D — URL-Vertrag in syntaktisches Parsing und semantische Auflösung trennen

Der aktuelle `workbench.ts` ist vollständig synchron: `parseNavigation()` liest Queryparameter und validiert nur Werte, deren Domäne statisch bekannt ist; `navigationUrl()` serialisiert sie anschließend wieder. attachments-bundle

Der Plan fordert dagegen:

> „übrige IDs müssen gegen Manifest/Bereichs-/Eintragslisten geprüft werden“

Das kann **nicht** sinnvoll Bestandteil von `parseNavigation()` sein, weil Manifest, Datensatz und Adapter zu diesem Zeitpunkt noch nicht geladen sind.

Damit würde das zentrale URL-Modell sonst von asynchronen Explorer-Daten abhängen oder zwei unterschiedliche Wahrheiten besitzen.

### Vorgeschlagener Plan-Diff

```diff
@@ §7 Navigation und URL-Vertrag

- Parse-/Serialize-Logik wird im bestehenden zentralen URL-Modell
- integriert ... übrige IDs müssen gegen Manifest/Bereichs-/Eintragslisten
- geprüft werden.
+ Der URL-Vertrag besteht aus zwei getrennten Phasen:
+
+ 1. `parseNavigation` / `navigationUrl` bleiben rein synchron und
+    datenunabhängig. Sie übernehmen Explorer-Parameter nur mit
+    syntaktischen Grenzen (Länge, zulässiger Grundtyp, docCount-Bereich).
+
+ 2. Nach Laden des Explorer-Manifests validiert ein separater
+    Explorer-Resolver `exploreTool` und `dataset`. Nach Laden und
+    Normalisierung des konkreten Datensatzes validiert er `docSection`,
+    `entry` und fachliche Filter gegen dessen ViewModel.
+
+ Semantisch unbekannte IDs bleiben Bestandteil des geparsten URL-Zustands,
+ bis der zuständige Resolver sie als unknown-tool, unknown-dataset,
+ unknown-section oder unknown-entry klassifiziert. Es erfolgt keine
+ stillschweigende Auswahl des ersten Datensatzes.

+ `navigationUrl` benötigt für seine Arbeit weder Manifest noch Adapter
+ und bleibt für bestehende fünf Bereiche rückwärtskompatibel.
```

Das bewahrt die bestehende Architektur statt `workbench.ts` indirekt zum Loader zu machen.

---

# P0-E — History-/Scroll-/Fokusvertrag mit dem tatsächlichen App-Code in Einklang bringen

Hier besteht die deutlichste direkte Code/Plan-Diskrepanz.

Aktuell schreibt `updateNavigation()` bei **jedem** Push/Replace ausdrücklich `history.state = null`:

```ts
window.history[push ? 'pushState' : 'replaceState'](
  null,
  '',
  navigationUrl(next, window.location.href),
)
```

und `popstate` parst lediglich die Query erneut. attachments-bundle

Zusätzlich scrollt der Section-Effect bei jedem erkannten Bereichswechsel auf `0` und fokussiert sofort `#screen-heading`. attachments-bundle

Der Plan verspricht dagegen:

> Scroll-/Fokusrestauration pro History-Eintrag.

Das existiert heute nicht und kann durch bloßes Hinzufügen des Explorer-Screens nicht entstehen. Außerdem kollidiert automatisches `scrollTo(0)` direkt mit Back/Forward-Restoration.

### Vorgeschlagener Plan-Diff

```diff
@@ §7 Navigation und URL-Vertrag

- Vor-/Zurück: popstate restauriert URL-Zustand. Scroll-/Fokusrestauration
- des Katalogs wird pro History-Eintrag im Sessionzustand gehalten ...
+ Vor-/Zurück verwendet einen expliziten History-Vertrag.
+
+ Vor einem `pushState` schreibt die Anwendung per `replaceState` in den
+ aktuellen Eintrag einen namespaceten UI-Zustand, mindestens:
+ `{ scrollY, focusKey }`.
+
+ Der neue Eintrag erhält anschließend seinen eigenen App-History-State.
+ Fremde vorhandene `history.state`-Felder werden nicht zerstört.
+
+ Navigation erhält intern eine Ursache:
+ `initial | push | replace | pop`.
+ Nur benutzerinitiierte Bereichsnavigation (`push`) setzt Scrollposition
+ auf den Seitenanfang und fokussiert die neue Überschrift.
+ `pop` restauriert nach Rendern den gespeicherten Scroll-/Fokuszustand
+ und darf nicht durch den bisherigen Section-Effect wieder auf 0 gesetzt
+ werden.
+
+ `replace` für Suche und Filter erzeugt keinen neuen History-Eintrag und
+ stiehlt keinen Fokus.
+
+ Die Implementierungsplanung muss vor P05 festlegen, ob
+ `history.scrollRestoration = 'manual'` verwendet wird; Browser-
+ automatische und eigene Wiederherstellung dürfen nicht gleichzeitig
+ konkurrieren.
```

Das sollte **vor** P05 entschieden werden. Sonst entstehen URL-Tests, die oberflächlich grün sind, obwohl tatsächliches Back/Forward-Verhalten kaputt bleibt.

---

# P1-A — Determinismus des Manifests vollständig definieren

„Keine Build-Uhrzeit“ reicht noch nicht für ein reproduzierbares Manifest.

Weitere nichtdeterministische Quellen wären Dateisystemreihenfolge, `localeCompare`, Dateimtime, absolute Pfade oder JSON-Objektaufbau aus unsortierten Maps.

Außerdem nennt der Plan `scripts/build-explorer-manifest.ts`. Das Repository benutzt für direkt durch Node ausgeführte Buildskripte derzeit `.mjs`, beispielsweise `sync-catalog.mjs` und `validate-tool-logos.mjs`. attachments-bundle

Eine `.ts`-Datei direkt mit `node` zu starten setzt Node-Type-Stripping-/Runtimeannahmen voraus, die der Plan bisher nicht festschreibt.

### Vorgeschlagener Plan-Diff

```diff
@@ §3 Dateiverantwortung

- | `scripts/build-explorer-manifest.ts` | Inventarisierung ... |
+ | `scripts/build-explorer-manifest.mjs` | Node-Buildschritt für
+ | Inventarisierung und deterministische Manifestbildung; keine
+ | TypeScript-Runtimeannahme |

+ | `src/data/explorerRegistry.json` | einzige deklarative Quelle der
+ | neun Registrierungen |
+ | `src/data/explorerRegistry.ts` | typisierter Browser-Wrapper über
+ | dieselbe Registry |

@@ §4 Registry und Manifest

+ Manifestdeterminismus ist bytegenau definiert:
+ - Eingangsreihenfolge kommt nicht vom Dateisystem.
+ - Datensätze werden nach einer festgelegten Registry-Reihenfolge oder
+   nach `(toolId, datasetId)` mit codepoint-basierter Ordnung geschrieben.
+ - Keine localeabhängige Sortierung.
+ - Keine mtimes, absoluten Checkout-Pfade oder Build-Zeitpunkte.
+ - Dateigröße und SHA-256 beziehen sich auf die unveränderten Rohbytes.
+ - Die JSON-Serialisierung verwendet eine festgelegte Key-Reihenfolge,
+   UTF-8 und einen definierten abschließenden LF.
+
+ Ein zweimaliger Generatorlauf auf demselben Checkout muss byteidentische
+ Manifestbytes erzeugen.
```

Die JSON-Registry ist hier nicht zwingend die einzige mögliche Lösung, aber sie ist sauberer als eine Browser-`.ts`-Registry, die ein Node-Skript direkt importieren soll.

---

# P1-B — Rohbytes zuerst, erst danach Decode/Parse

Der Digest soll die tatsächlich veröffentlichte Quelldatei identifizieren. Deshalb darf weder vor dem Hashing UTF-8 dekodiert noch ein Zeilenende normalisiert werden.

Das ist besonders für den fmd-Text wichtig: Anzeige kann Zeilen modellieren, Download und Digest müssen aber die Quelle unverändert erhalten.

### Vorgeschlagener Plan-Diff

```diff
@@ §5 Ladevertrag und Herkunft

- Prüfen: HTTP-Status, Dateigröße laut tatsächlichen Bytes, SHA-256 und
- deklariertes Format.
+ Der Loader liest jede Quelle zuerst als `ArrayBuffer`.
+ HTTP-Status, Byteanzahl und SHA-256 werden auf diesen unveränderten
+ Bytes geprüft.
+
+ Erst nach erfolgreicher Integritätsprüfung erfolgt die strikte
+ UTF-8-Dekodierung. Anschließend wird abhängig vom Registry-Format
+ entweder JSON geparst oder Text indexiert.
+
+ Zeilenenden dürfen für Anzeige/Zeilennavigation logisch erkannt werden,
+ aber weder Digest noch Downloadbytes werden normalisiert.
```

Das würde ich auch explizit testen.

---

# P1-C — GitHub-Pages-/Cache-Verhalten für Digestkonflikte definieren

Der Plan erwähnt Retry nach Hashabweichung, aber nicht die Browser-/CDN-Cache-Semantik. Gerade bei einer statischen Site können während eines Deployments neues Manifest und alte Quelldatei oder umgekehrt kurzzeitig an verschiedenen Cachekanten liegen.

Dafür braucht es **keinen Backenddienst**. Eine statische Strategie genügt.

### Vorgeschlagener Plan-Diff

```diff
@@ §5 Ladevertrag und Herkunft

- Retry entfernt nur den betroffenen Fehlerzustand und lädt Manifest plus
- Quelle neu.
+ Quellen bleiben reine statische GitHub-Pages-Assets; es gibt weder API
+ noch Runtime-Backend.
+
+ Eine Quell-URL wird aus `import.meta.env.BASE_URL`, dem festen
+ `robot-docs/`-Verzeichnis und dem validierten Dateinamen erzeugt.
+ Optional wird der Manifest-Digest als deterministischer Cache-Key
+ (`?v=<sha256>`) angehängt.
+
+ Nach einem Digestkonflikt lädt Retry zuerst das Manifest unter Umgehung
+ eines rein lokalen Browsercaches erneut und anschließend die Quelle mit
+ dem nun erwarteten Digest-Key. Erst wenn beide wieder zusammenpassen,
+ wird der Datensatz als `ready` übernommen.
+
+ Es werden niemals zwei unterschiedlich verifizierte Snapshotstände
+ miteinander kombiniert.
```

Gerade der letzte Satz sollte als Invariante auch in Tests vorkommen.

---

# P1-D — Explorer-Unabhängigkeit vom Katalog bis zur Palette durchziehen

Der Plan erkennt korrekt, dass `App.tsx` derzeit **den gesamten Inhalt hinter `snapshot` sperrt**. Im aktuellen Code wird bei fehlendem Katalog bereits vor den eigentlichen Sections nur der Lade-/Fehlerzustand gerendert. attachments-bundle

Deshalb muss Explorer vor diesem Gate oder in einen getrennten Renderpfad.

Aber die Unabhängigkeit muss weiter gehen: Die aktuelle `CommandPalette` erhält ausschließlich `tools={tools}` aus dem Katalog. Ohne Katalog wäre eine Explorer-Palette, die „die sechs Tools mit Dokumentation“ anzeigen soll, ebenfalls leer. attachments-bundle

### Vorgeschlagener Plan-Diff

```diff
@@ §8 Integration in Workbench und Katalog

- Explorer-Routen rendern unabhängig vom Katalog-Snapshot;
- Katalogidentität ist optionaler Zusatz.
+ `section=explore` darf weder initialen Katalogerfolg noch Katalogcache
+ voraussetzen. Header, Hauptnavigation, Explorer-Registry, Manifest und
+ Explorer-Loader bilden einen vollständigen statischen Pfad ohne
+ Katalog-Snapshot.
+
+ Katalogfehler bleiben als ausdrücklich bezeichnete Katalogwarnung
+ sichtbar, blockieren aber keine Explorer-Seite.

@@ Palette

- Palette erweitert zunächst nur um Bereich und sechs Tools mit
- Dokumentation ...
+ Die sechs Explorer-Toolziele der Palette werden aus der statischen
+ Explorer-Registry erzeugt und funktionieren daher auch ohne geladenen
+ Katalog. Ein vorhandener Katalog darf Name/Logo ergänzen, ist aber nicht
+ Voraussetzung für die sechs Explorer-Ziele.
```

Das ist eine wichtige Architekturfolge aus dem bereits richtigen Satz „Explorer-Routen rendern unabhängig vom Katalog“.

---

# P1-E — Lazy-Screen-Fokus nicht mit dem heutigen Section-Effect voraussetzen

Der aktuelle App-Effect sucht bei Section-Wechsel sofort:

```ts
document.getElementById('screen-heading')?.focus(...)
```

Bei einem lazy geladenen Explorer kann die Überschrift zu diesem Zeitpunkt noch gar nicht im DOM sein. attachments-bundle

Der Plan fordert gleichzeitig korrekten Fokus bei Navigation und keinen Fokusdiebstahl beim Initialaufruf. Das braucht einen expliziten Übergabepunkt zwischen Navigation und lazy Screen.

### Vorgeschlagener Plan-Diff

```diff
@@ §7 / §8 Fokusvertrag

+ Lazy Screens melden App-seitig, sobald ihre primäre Überschrift
+ tatsächlich gemountet ist. Ein ausstehender Fokusauftrag wird nur bei
+ `navigationCause === 'push'` ausgeführt.
+
+ Initiales Rendern, Retry, Manifest-Nachladen, Datensatz-Nachladen,
+ Suche und Filteränderungen erzeugen keinen Heading-Fokus.
+
+ Bei `pop` gilt ausschließlich der History-Restaurationsvertrag.
```

Damit vermeidet der Plan eine Race Condition zwischen `Suspense` und globalem Navigationseffekt.

---

# P1-F — Loaderzustände präziser trennen

Momentan werden `unsupported-contract` und `invalid-source` nebeneinander genannt, anschließend heißt es aber:

> semantisch unpassender Schemawechsel → generische Ansicht.

Das sollte präzisiert werden, weil drei verschiedene Situationen existieren:

**Syntaxfehler**, **valide JSON-Struktur mit unbekanntem Vertrag** und **bekannter Vertrag mit falschen Feldtypen** dürfen nicht dasselbe Ergebnis erzeugen.

### Vorgeschlagener Plan-Diff

```diff
@@ §5 / §6

- Ladezustände: idle, loading, ready, unsupported-contract,
- invalid-source, transport-error.
+ Transport-/Integritätszustände und Adapterdiagnosen werden getrennt:
+
+ `transport-error`
+   statisches Asset nicht abrufbar.
+
+ `integrity-error`
+   Größe oder SHA-256 stimmt nicht zum Manifest.
+
+ `decode-error`
+   Quelle ist nicht als gültiges UTF-8 dekodierbar.
+
+ `parse-error`
+   als JSON registrierte Quelle ist syntaktisch kein JSON.
+
+ `ready-generic`
+   syntaktisch gültiges JSON, aber kein unterstützter Fachvertrag.
+
+ `ready-specialized`
+   bekannter Vertrag und verwendete Felder fachlich validiert.
+
+ Ein bekannter Contract-Identifier mit inkompatiblen Pflichtfeldern
+ wird nicht still als gültiger Fachdatensatz gecastet. Die Seite darf
+ den Rohinhalt generisch anzeigen und muss die Contract-Diagnose
+ ausdrücklich sichtbar machen.
```

So bleibt ein Schemawechsel lesbar, ohne dass die UI Fachinformationen erfindet.

---

# P1-G — URL-Serialisierung außerhalb `explore` explizit kompatibel halten

Die aktuelle Implementierung besitzt eine wichtige gute Eigenschaft: `navigationUrl()` beginnt mit der aktuellen URL und verändert nur bekannte Parameter. Dadurch bleiben fremde Queryparameter erhalten. Der UX-Vertrag verlangt dies ausdrücklich. attachments-bundle

Beim Hinzufügen der Explorerfelder muss festgelegt werden, welche davon „owned parameters“ sind und wann sie verschwinden.

Ich würde verhindern, dass ein Kataloglink dauerhaft etwa

`?section=catalog&exploreTool=bv&dataset=capabilities&docQ=...`

mit sich trägt.

### Vorgeschlagener Plan-Diff

```diff
@@ §7 Navigation

+ Die bestehenden Parameter `q`, `category`, `platform`, `sort`, `view`,
+ `tool` und `count` behalten exakt ihre bisherige Bedeutung.
+
+ Explorer-owned Parameter sind:
+ `exploreTool`, `dataset`, `docSection`, `entry`, `docQ`, `docCount`
+ sowie die ausdrücklich definierten Fachfilter.
+
+ Explorer-owned Parameter werden nur für `section=explore`
+ serialisiert. Beim Verlassen des Explorers entfernt der Serializer
+ diese owned Parameter aus der neuen Ziel-URL; der alte History-Eintrag
+ behält selbstverständlich seine vollständige Explorer-URL.
+
+ Nicht vom Workbench-Modell besessene Queryparameter bleiben weiterhin
+ unverändert erhalten.
```

Damit bleibt Back zum Explorer vollständig, ohne andere Bereiche mit Explorer-State zu verschmutzen.

---

# P1-H — Registry- und Dateinamenvertrag sicher und banal halten

Der Plan sagt bereits richtig, dass URL-Parameter keinen Dateipfad liefern dürfen. Ich würde daraus einen expliziten Sicherheits-/Robustheitsvertrag machen.

### Vorgeschlagener Plan-Diff

```diff
@@ §4 / §5

+ `filename` ist ausschließlich Registry-Daten und muss ein sicherer
+ Basename ohne `/`, `\`, `..`, NUL oder URL-Segmentsteuerzeichen sein.
+ Benutzerparameter werden niemals als Dateiname interpretiert.
+
+ Die URL wird ausschließlich nach erfolgreicher Registry-/Manifest-
+ Auflösung aus dem registrierten Basename konstruiert.
+
+ `toolId`, `datasetId` und `filename` müssen im Manifest eindeutig sein;
+ zwei Registrierungen dürfen weder dieselbe Identität noch dieselbe
+ physische Quelldatei unabsichtlich mehrfach veröffentlichen.
```

Damit ist die wichtige Aussage des Plans technisch überprüfbar und nicht nur konzeptionell.

---

# P2 — Test- und Dateiverantwortung leicht nachschärfen

Der Plan legt URL-Tests in `tests/explorer-model.test.ts`, obwohl die URL-Funktionen weiterhin dem bestehenden Workbench-Modell gehören sollen. Das fördert doppelte oder widersprüchliche Tests.

Außerdem führt `test:model` aktuell nur `tests/workbench-model.test.ts` aus. attachments-bundle

Ich würde die Verantwortlichkeiten folgendermaßen schärfen:

```diff
@@ §3 Dateiverantwortung

- | `tests/explorer-model.test.ts` | Struktur-/Adapter-/URL-/
- | Erweiterungsverträge |
+ | `tests/explorer-model.test.ts` | Registry, Manifest, Loader-nahe
+ | Verträge, Adapter, Herkunft und fachliche Fallbacks |
+ | `tests/workbench-model.test.ts` | bestehender zentraler URL-Vertrag
+ | einschließlich Explorer-Parameter und Rückwärtskompatibilität |

@@ §10

- `test:model` wird auf die vorhandenen und neuen Modelle erweitert.
+ `test:model` führt mindestens `workbench-model.test.ts` und
+ `explorer-model.test.ts` aus. URL-Roundtrips bleiben im bestehenden
+ Workbench-Test; Explorer-Fachmodelle erhalten keine konkurrierende
+ zweite URL-Implementierung.
```

---

## Weitere widersprüchliche oder irreführende Stellen

Der Ausdruck **„bekannte Snapshot-Version/Zeit“** im Manifest sollte pro Datensatz optional und quellengebunden bleiben. Insbesondere darf aus der WASM-Historientabelle im fmd-Leitfaden keine Leitfaden- oder installierte Tool-Version abgeleitet werden; genau davor warnt die Analyse. attachments-bundle

`available` als Filtername für `ee` ist fachlich korrekt, sollte aber in der UI nicht bloß als „Verfügbar“ erscheinen. Die Quelle besitzt 556 `available=true` und einen nicht verfügbaren `mcp serve-stdio`, doch das ist eine Snapshotangabe. attachments-bundle Eine Beschriftung wie **„Im Snapshot verfügbar“** ist wesentlich source-treuer.

Für `fmd.features` ist die geplante Stringtreue richtig und sollte unbedingt erhalten bleiben. Die Quelle enthält Statuswerte wie `available_v0_embedded_subset_fonts` und `refused_usage_error`; daraus darf kein Boolean werden. Die Analyse weist ausdrücklich auf diesen Fehlerfall hin. attachments-bundle

Die Forderung „eine Registry-Änderung braucht keinen Registry-Katalog-Neuexport“ ist sinnvoll. Der Explorer muss eine **eigene statische Registry** besitzen; Verknüpfung zum bestehenden Toolkatalog erfolgt ausschließlich über die stabile Tool-ID. Damit bleibt die neunseitige Dokumentationsoberfläche auch bei Katalogfehlern erreichbar.

Die Planung eines separaten Backends wäre dagegen unnötig und falsch. Alle benötigten Informationen liegen als Vite-`public`-Assets plus Buildmanifest vor. Der Generator ist ein Build-/CI-Werkzeug, kein Runtime-Service.

---

# Empfohlene R1-Fassung der zentralen Architektur-Invarianten

Ich würde vor R2 im Plan einen kurzen verbindlichen Block ergänzen:

```diff
@@ nach §1 Produktvertrag

+ ### Architektur-Invarianten dieser Fassung
+
+ 1. Der veröffentlichte Explorer umfasst exakt neun Datensatzseiten aus
+    sechs explizit registrierten Tools.
+ 2. Keine Datei wird durch bloßes Auftauchen in `public/robot-docs/`
+    automatisch zu einer Explorer-Seite.
+ 3. `fmd.robot-docs.json` ist die einzige explizite Textausnahme trotz
+    `.json`-Suffix; es gibt keine Parsefehler-als-Text-Heuristik.
+ 4. Jede Seite repräsentiert genau eine Quelldatei und einen Digest.
+    Geschwisterdatensätze werden nicht zu einem gemeinsamen Snapshot
+    verschmolzen.
+ 5. Explorer-Inhalte beschreiben Dokumentations-/Capability-Snapshots,
+    niemals den gegenwärtigen Status des Browsers, der Website oder
+    einer lokal installierten CLI.
+ 6. Die Anwendung bleibt vollständig statisch unter
+    `/CliToolRegistry.Web/`; kein Backend und keine Tool-Ausführung sind
+    für Runtime oder Build erforderlich.
+ 7. URL-Parsing bleibt synchron; datenabhängige ID-Auflösung erfolgt erst
+    im Explorer-Resolver.
+ 8. Bestehende Workbench-Queryparameter behalten Bedeutung und
+    Back/Forward-Kompatibilität.
+ 9. Manifest und Inventar sind aus demselben Checkout reproduzierbar und
+    byte-deterministisch.
```

## R1-Fazit

**Keine Freigabe als eingefrorener oder implementierungsreifer Plan in Runde 1.** Der Plan hat bereits eine tragfähige Grundarchitektur, aber die vier P0-Punkte sollten vor der nächsten Detailrunde eingearbeitet werden. Besonders wichtig sind die Entfernung der automatischen „Unzugeordnet“-Seitendiscovery, der harte fmd-Sondervertrag, die Trennung von URL-Parsing und asynchroner Auflösung sowie ein real implementierbarer History-Restaurationsvertrag.

Danach wäre R2 sinnvoll auf **Loader-/Cache-Konsistenz, konkrete `NavigationState`-Erweiterung, Manifest-Schema/Diagnosecodes und die diskriminierten Adaptertypen** zu fokussieren. Ich habe dabei bewusst **weder Anwendungscode noch Beads erzeugt**.
