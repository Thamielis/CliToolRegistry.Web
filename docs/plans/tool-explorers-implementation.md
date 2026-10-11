# Implementierungsplan: Tool-Erkundungsseiten

Stand: 2026-10-11. Revision: 6. Status: vollständiger Planungsworkflow abgeschlossen; Beads bereit. [Reviewnachweis](tool-explorers-review.md).

Der aktuelle Nutzerauftrag verlangt den vollständigen Planungsworkflow. Vier qualifizierte High-Reviews, lokale Quell-/Vertragsprüfungen und abschließende Zuständigkeitskorrekturen sind abgeschlossen. Anwendungsimplementierung gehört nicht zu diesem Auftrag. Verbindliche Bestandteile sind [Vertragskatalog](tool-explorers/contracts.md), [Arbeitspakete](tool-explorers/tasks.md), [Analyse](tool-explorers/analysis.md) und die sechs Seitenentwürfe. Bei Details gelten die präzisen Verträge; historische Reviewvorschläge ersetzen sie nicht.

## 1. Produktvertrag

Für jede aufgenommene gültige JSON-Datei existiert eine eigene verlinkbare Seite. Für jedes Tool existiert ein Einstieg, der seine aufgenommenen Datensätze sammelt. Aktuell: br und bv je 2 JSON-Seiten, cass/ee/ubs/fmd je 1 JSON-Seite. Insgesamt 8 Seiten für 6 Tools plus Erkundungsindex und Tool-Einstiege. `.json`-Dateien mit Klartext werden ignoriert und nicht aufgenommen.

Die Seiten zeigen ausschließlich gelieferte Dokumentation und Snapshot-Angaben. Alle Aufrufe bleiben kopierbare Texte. Tool-Ausführung, Datei-Upload, Live-Diagnostik, Markdown-Rendering durch fmd und frei kombinierbare Befehlsbuilder gehören nicht zum Umfang.

Suche umfasst die aktuelle Datei; Querverweise zwischen Dateien sind explizite Links. Eine toolweite Volltextsuche und ein semantischer Suchdienst sind zunächst nicht erforderlich. Gleichnamige Einträge aus mehreren Quellen werden nicht still überschrieben.

### Architektur-Invarianten

1. Die aktuelle Registry veröffentlicht acht JSON-Datensatzseiten für sechs Tools. Zusätzliche Seiten entstehen durch eine explizite Registrierung, nicht allein durch Dateidiscovery.
2. Es gibt keine Textausnahme, keinen Textadapter und keine Seite für `fmd.robot-docs.json`. Nicht parsebare `.json`-Dateien werden lokal als ignoriert gemeldet und fehlen im öffentlichen Manifest.
3. Jede Seite repräsentiert genau eine Quelle und ihren Digest. Ein Tool-Einstieg ist eine Navigations-/Inventarseite, kein zusammengeführter Versions-/Statusstand.
4. Snapshot-Version, Erstellungszeit, Verfügbarkeit, lokale Pfade und beobachtete Env-Werte bleiben datensatzlokal. Katalogdaten ergänzen nur Identität und Links.
5. Die Website bleibt statisch und führt weder beim Build noch zur Laufzeit Tools zur Generierung oder Auswertung der Dokumentation aus.
6. URL-Parsing bleibt synchron. Datenabhängige Identitätsauflösung gehört in den Explorer-Resolver.
7. Bestehende Workbench-Queryparameter und fremde URL-Parameter bleiben in ihrer Bedeutung erhalten.
8. Manifestbytes sind bei identischen Quellen und Registrierung reproduzierbar; Zeitstempel oder absolute Pfade des Builds gehören nicht hinein.

## 2. Verifizierte Ausgangslage

Repository: `/home/mario/GitHub/CliToolRegistry.Web`, React 19, TypeScript, Vite, statische GitHub-Pages-Basis `/CliToolRegistry.Web/`. Ausgangs-HEAD bei Analyse: `fd7f8d6`; sechs neue Datensätze bereits im Git-Index. Die [Datensatzanalyse](tool-explorers/analysis.md) enthält Mengen und SHA-256 der neun Quellen.

Die Anwendung besitzt Query-basierte Navigation mit `NavigationState`, `parseNavigation`, `navigationUrl` in `src/data/workbench.ts`. Bereiche: overview, catalog, dependencies, lab, guide. `App.tsx` besitzt push/replace-Navigation, popstate, document.title, Fokuswechsel und Katalogladezustand. Dependencies/Lab sind Lazy-Screens mit `ScreenBoundary`.

Wiederverwenden: ThemeContext, LocaleContext, lokale AppIcon-Logos, CommandBlock, ScreenBoundary, bestehende responsive Tokens und native Navigation. Erweitern: Sections, Translations, Palette und Katalog-Verknüpfungen. Keine zusätzliche Router-, Markdown- oder Suchbibliothek ist für diese Fassung nötig; Browser-APIs und das vorhandene React-Modell reichen aus.

`App.tsx` zeigt derzeit ohne Katalog-Snapshot nur Laden/Fehler. Erkundung muss außerhalb dieses Gates renderbar werden, sonst wären valide Dokumentationsseiten bei Katalogproblemen unerreichbar. Globale Katalogwarnungen dürfen erhalten bleiben, müssen aber als Katalogstatus bezeichnet sein.

## 3. Dateiverantwortung und Modulgrenzen

Vorgesehene neue Funktionseinheiten, keine Version-2-Kopien vorhandener Dateien:

| Pfad | Verantwortung |
| --- | --- |
| `src/data/explorerRegistry.json` | Einzige deklarative Quelle für Datensätze und Tool-Fallbackidentität |
| `src/data/explorerRegistry.ts` | Typisierter und validierter Browserzugriff auf dieselbe JSON-Registry |
| `scripts/build-explorer-manifest.mjs` | Inventarisierung, deklarierte Formate prüfen, Manifest deterministisch erzeugen |
| `src/types/explorer.ts` | Gemeinsame Registry-/Manifest-/ViewModel-Verträge und diskriminierte Metadaten |
| `src/data/explorerAdapters.ts` | Reine Normalisierung, Herkunft und Suchfelder aller Fachadapter |
| `src/data/loadExplorer.ts` | Manifest/Datensatz laden, Fehlerklassen, Digestprüfung, In-Memory-Cache |
| `src/components/ToolExplorer.tsx` | Lazy-Screen, Index/Tool-Einstieg/Datensatzseite und gemeinsame Zustände |
| `src/components/ExplorerDetails.tsx` | Gemeinsame Detail-/JSON-Quelldarstellung mit Fachmetadaten |
| `src/components/explorer/{BrBv,Cass,Ee,FmdUbs}Explorer.tsx` | Fachlich getrennte Familienansichten mit gemeinsamem DatasetViewProps-Vertrag |
| `tests/explorer-model.test.ts` | Registry-/Manifest-/Generic-/Erweiterungsverträge |
| `tests/explorer-adapters.test.ts`, `tests/explorer-loader.test.ts` | Unabhängige Fachadapter-/Transportverträge |
| `tests/workbench-model.test.ts` (bestehend) | Zentraler URL-Vertrag inklusive Explorer, keine zweite URL-Implementierung |
| `tests/explorer-ui.spec.ts` plus vier Familien-Specs | Gemeinsame Zustände und dateiseitig unabhängige Fach-/A11ywege |

Die Aufteilung folgt Daten-/Netzwerk-/Ansichtsgrenzen. Adapter dürfen weder React noch Fetch importieren. Node liest dieselbe JSON-Registry wie der Browser-Wrapper; ein `.mjs`-Generator folgt den vorhandenen Buildskripten und benötigt kein TypeScript-Runtime-Importverhalten. Der Manifest-Generator führt keine Tool-Binaries und kein PowerShell-Skript aus.

Die vier Familienansichten entsprechen den vorhandenen Fachgrenzen und vermeiden Dateikonflikte zwischen P07–P10. P06 besitzt den gemeinsamen Rahmen und legt funktionierende gemeinsame JSON-/Listenansichten in diesen Modulen an; spätere Fachpakete ersetzen nur ihr eigenes Modul. Es gibt kein dynamisches Plugin-Framework.

## 4. Registry und Manifest

Registry-Eintrag:

```ts
type DatasetRegistration = {
  toolId: string;
  datasetId: string;
  filename: string;
  format: 'json';
  adapter: string;
  title: { de: string; en: string };
};
```

Identität ist das Paar `(toolId, datasetId)`. Aktuelle IDs: capabilities/robot-docs je Tool. Filename ist ein reiner Basename, kein URL-/Pfadparameter. Titel beschreibt die Inhaltsart, nicht den Dateityp. Tool-Fallbacknamen sind br Beads Rust, bv Beads Viewer, cass CASS, ee Eidetic Engine, fmd FrankenMarkdown und ubs Ultimate Bug Scanner.

Das öffentliche Manifest erhält einen eigenen Vertrag `cli-tool-explorer.manifest.v1`, Liste der aufgenommenen Datensätze, Dateigröße, SHA-256 und bekannte Snapshot-Version/Zeit mit Pointer und Presence. Inventardiagnosen bleiben lokal und gehören nicht in das öffentliche Manifest. Keine Build-Uhrzeit im deterministischen Manifest. Titel/Versionen sind Metadaten; fehlende Zeitpunkte bleiben als fehlend erkennbar. Eine Registry-Änderung braucht keinen Registry-Katalog-Neuexport.

Der Generator dekodiert reguläre `.json`-Dateien strikt als UTF-8 und versucht JSON-Parsing. Nichtparsebare Dateien werden ignoriert: keine Seite, Suche, Zählung, Downloadverknüpfung oder öffentlicher Manifesteintrag. `fmd.robot-docs.json` fällt aktuell darunter. Die Originaldatei bleibt unverändert. Auch abgeschnittene/defekte Exporte werden konservativ ausgeschlossen, nicht als Text angezeigt. Ignorierte Quellen erzeugen allein keinen Buildfehler. Ein registrierter, auf der Platte vorhandener, aber nichtparsebarer Kandidat wird ebenfalls ausgelassen; die Registrierung ist keine Ausnahme vom JSON-Gate.

Nur parsebare Kandidaten werden mit der Registry abgeglichen. Fehlende registrierte Dateien, doppelte Identitäten/Dateinamen und unsichere Namen sind Validierungsfehler. Filename erlaubt nur ASCII-Buchstaben, Ziffern, Punkt, Unterstrich und Bindestrich; keine Separatoren, `..`-Sequenz oder URL-Steuerzeichen. Symlinks werden nicht aufgenommen. HTTP-MIME steuert niemals den Parser. JSON-Strings als gültige skalare Roots bleiben JSON, auch wenn ihr Wert Text enthält.

Unregistrierte gültige JSON-Dateien erzeugen `UnexpectedInventoryFile`, aber keine automatische Explorer-Seite. Ignorierter Klartext löst diesen Fehler nicht aus. Eine spätere valide Quelle wird durch einen neuen Registry-Eintrag integriert; unbekannte valide JSON-Verträge dürfen `generic-json` verwenden. Kein Umbau bestehender Seiten und keine zusätzliche Freigabe allein für eine routinemäßige Registrierung.

`validate:explorers` meldet lokale Diagnosen und liefert bei Registrierungs-/Inventarfehlern Exit ungleich 0. Ignorierte nichtparsebare Dateien allein lassen die Prüfung bestehen und erzeugen keine öffentlichen Fehlerkarten. Neue registrierte unbekannte valide Verträge sind kein Veröffentlichungsfehler: sie nutzen die generische JSON-Ansicht.

Determinismus: Quellen nach `(toolId, datasetId)` mit Codepoint-Ordnung; Diagnosecodes und Dateinamen ebenso stabil sortieren. Keine localeabhängige Sortierung, mtime oder absolute Checkoutpfade. Generator serialisiert Felder in fester Reihenfolge als UTF-8 mit zwei Leerzeichen Einrückung und genau einem abschließenden LF. Größe/Digest stammen aus unveränderten Rohbytes. Zwei Läufe auf demselben Checkout müssen byteidentische Ergebnisse liefern. Vorgeschlagenes Ziel: `public/robot-docs.manifest.json`, außerhalb des inventarisierten Quellordners.

Dev/Build-Lifecycle: `predev` und `prebuild` kombinieren den bisherigen Katalog-Sync mit Manifest-Erzeugung. `build` verlangt zusätzlich strikte Datensatzvalidierung. Direkte Vite-Ausführung benötigt ein zuvor erzeugtes Manifest oder zeigt den eigenen Manifest-Ladefehler. Keine Änderungen an Quell-Snapshots durch den Generator.

## 5. Ladevertrag und Herkunft

Das gemeinsame Manifest wird beim App-Mount unabhängig vom Katalog geladen und liefert ausschließlich validierte Toollinks/Zahlen; Datensatzbytes bleiben bei Auswahl lazy. Manifestfehler blockieren den Katalog nicht. URL ausschließlich aus validierter Registry/Manifest-Datei und `import.meta.env.BASE_URL`. URL-Parameter liefern niemals einen Dateipfad. Quellen werden als ArrayBuffer geladen. HTTP-Status, Byteanzahl und SHA-256 prüfen, dann strikt als UTF-8 dekodieren und abhängig vom registrierten Format parsen. Zeilenenden dürfen für die Anzeige modelliert, aber niemals vor Hashing oder Download normalisiert werden. Digestabweichung zeigt „Dokumentationsstand hat sich geändert – erneut laden“, keine still vermischten Versionen.

Rohbytes/geprüftes JSON im RawCache nach `filename + sha256`; normalisierte ViewModels nach Tool/Dataset/Adapter/Filename/Digest. Manifestzyklen erhalten eine Epoch; sichtbare Datasetantworten binden zusätzlich Request-ID und Epoch. Keine zusätzliche persistente Browserkopie in Fassung 1, weil der vorhandene Katalogcache einen anderen Vertrag besitzt. Abbruch beim Seitenwechsel mittels AbortController; Request-ID prüft verspätete Antworten. Stricter React-Effect-Lebenszyklus darf eine verspätete Antwort nie auf die neue Auswahl anwenden. Retry entfernt nur den betroffenen Fehlerzustand und lädt zuerst Manifest mit Fetch-Cacheoption `no-cache`, dann Quelle mit `?v=<sha256>`. Ein weiter bestehender CDN-Konflikt bleibt ein sichtbarer Integritätsfehler mit Retry; keine Annahme einer atomaren Auslieferung aller Assets.

Ladezustände: idle/loading, transport-error, integrity-error, decode-error, parse-error, ready-generic, ready-specialized. Unbekannter Vertrag oder bekannte Contract-ID mit inkompatiblen Pflichtfeldern bleibt generisch lesbar, mit expliziter Adapterdiagnose. Keine erfundenen Fachdetails. UTF-8-/JSON-Syntaxfehler sind eigene Fehlerzustände. Originaltext/-bytes bleiben im geladenen Datensatz erhalten.

JSON-Herkunft ist ein RFC-6901-Pointer zum Rohobjekt; Schlüssel `/` und `~` werden korrekt escaped. Keine `eval`-/Path-Ausführung. Zeilenbereiche in einem guide-String ergänzen dessen JSON-Pointer, sind aber kein Textdatensatz. Einträge verwenden eindeutige fachliche Namen, sonst Pointer-IDs innerhalb des Snapshots. Doppelte Namen bleiben als separate Einträge mit Hinweis erhalten.

Download aufgenommener Quellen liefert Originalbytes, nicht JSON.stringify eines ViewModels; Blob-URLs werden nach Downloadstart freigegeben. Blob-MIME: `application/json;charset=utf-8`, unabhängig vom Fetch-MIME des Hosts. Rohansichten verwenden React-Textknoten, keine `dangerouslySetInnerHTML`-Darstellung. Ignorierte Dateien haben keine Explorer-Downloadaktion.

## 6. Adapter- und ViewModel-Vertrag

Ein normalisierter Datensatz enthält Metadaten, Bereiche, Einträge und Diagnosen. Jeder Eintrag besitzt ID, Bereichs-ID, Titel, Suchtext, Herkunft und einen diskriminierten fachlichen Detailtyp. Optionale Werte bleiben vorhanden/fehlend/null unterscheidbar. Ein generischer `Record<string, unknown>` ersetzt keinen fachlichen Vertrag.

| Adapter | Erkennung / Fachvertrag | Darstellung |
| --- | --- | --- |
| br-guide | `br.robot_docs.v1`, guide string, canonical_commands array | Textabschnitte und 8 Aufgaben/Aufrufe |
| br-capabilities | `br.capabilities.v1`, commands array | Operation/Workspace/Output, Beispiele und Vertragsbereiche |
| bv-docs | topic all, version string, commands object | Voraussetzungenmatrix, Guide, Beispiele, Aliase |
| bv-capabilities | `1.0.0`, tool bv, commands array | Voraussetzungen plus preferred/accepted-Aufrufe, Topics/Streams |
| cass-capabilities | contract string `1`, api_version 1 | Befehle/Argumente, Workflows, Konfiguration, Recovery |
| ee-capabilities | envelope `ee.response.v2`, data object | Pfadatlas, Verfügbarkeit, Subsysteme, lokale Beobachtungen |
| fmd-capabilities | tool fmd, contract `0.1.0` | Originalbeispiele, Feature-Statuswerte, Themes/PDF |
| ubs-docs | schema_version `1`, topic all | Subcommands/Flags, Scan-/Ausgabeverträge |
| generic-json | valides sonstiges JSON | Objekt-/Array-Baum mit Pfad-/Wertsuche |

Prüfung des bekannten Vertrags enthält Form/Typ der verwendeten Felder; Fachadapter dürfen nicht allein anhand des Dateinamens eine Struktur casten. Zusatzfelder werden nicht verworfen, sondern bleiben in Rohansicht/Suche generischer Felder erreichbar. Ein semantisch unpassender Schemawechsel erhält generische Ansicht mit verständlicher Diagnose.

Generischer Reader unterstützt Objekte, Arrays und skalare JSON-Roots. Ein Null-Root ist gültiges JSON und sichtbar. Suche besucht alle Scalar-Leaves iterativ und indexiert Pointer/Wert; kein Stackoverflow bei tiefem JSON. UI zeigt 48 Treffer pro Seite; Objektbaum öffnet Zweige nur auf Aktion, begrenzt DOM-Tiefe auf 20 Ebenen und bietet danach „Unterbaum öffnen“ als neue Reader-Wurzel. Damit bleibt tiefer Inhalt erreichbar. Kein unbeschränktes JSON.stringify großer Rohbäume im Standard-Detail; der vollständige Download bleibt vorhanden.

## 7. Navigation und URL-Vertrag

`Section` wird um `explore` ergänzt. Bestehende Katalogfelder und Bedeutung von `tool` bleiben unverändert. Erkundungsfelder: `exploreTool`, `dataset`, `docSection`, `entry`, `docQ`, `docCount`, fachliche Filter. Katalogsuche `q` und Dokumentationssuche `docQ` sind getrennt.

Fachfilter dieser Fassung: `operation`, `workspace`, `machineOutput`, `needs` (mehrere Voraussetzungen), `mutates`, `jsonOutput`, `available`, `envCategory`, `featureStatus`, `argType`, `argRequired`. Werte werden je Adapter/Bereich validiert; nicht passende Werte werden neutralisiert und nicht als falscher Filter angewendet. Keine Nutzung von `category` für Env-Kategorien. machineOutput und featureStatus erhalten die bereits in br/fmd entworfenen Quellformat-/Statusstringfilter.

Parse-/Serialize-Logik bleibt im bestehenden synchronen URL-Modell und wird in `tests/workbench-model.test.ts` geprüft. Parsing prüft nur Grundtypen/Längen/Enums, ohne Fetch oder Adapterwissen. `docCount` startet 48, steigt in 48er-Schritten, maximal 10000; `docQ` höchstens 500 Zeichen. Tool-/Dataset-/Bereichs-/Eintrags-IDs bleiben bis zur asynchronen Auflösung erhalten. Nach Manifest-Laden prüft der Explorer-Resolver Tool/Datensatz; nach Adapter-Laden Bereich/Eintrag/Fachfilter. Unknown-IDs ergeben passende Fehleransichten mit Rücklink; keine stillschweigende Auswahl des ersten Datensatzes.

Explorer-owned Parameter werden nur bei `section=explore` serialisiert. Beim Verlassen entfernt der Serializer sie aus der Ziel-URL, während der alte History-Eintrag vollständig erhalten bleibt. Fremde Queryparameter bleiben erhalten. Katalogfelder behalten ihre bisherige Bedeutung; Explorer-IDs werden nicht als `tool` in das Katalogdetail geschrieben.

Tool-Einstieg mit nur einer Datei canonicalisiert per replace auf die Dataset-Seite, ausgenommen pop: dort erfolgt Auflösung ohne Historywrite. Zwei Dateien zeigen eine Übersicht. Wechsel Datei/Tool setzt docSection, entry, docQ und Fachfilter zurück; Katalogsuche/-Filter/-View bleiben erhalten; `tool` folgt dem bisherigen Schließen bei regulärem Sectionwechsel. Ein Bereichswechsel erhält docQ, setzt Detailauswahl und nicht anwendbare Filter zurück. Eine Suche/Filteränderung setzt docCount und entry zurück. Eintragswechsel und explizite Seitenwechsel nutzen push; Suche/Filter replace.

Vor-/Zurück erhält einen neuen, expliziten History-Vertrag; im aktuellen Code existiert er noch nicht. `history.scrollRestoration='manual'` wird für die Lebensdauer der App gesetzt und beim Unmount auf den Vorwert zurückgesetzt. Navigation führt die Ursache `initial|push|replace|pop` und eine eindeutige History-Eintrags-ID. Eigene Daten liegen unter einem namespaceten Feld in history.state; vorhandene fremde Felder werden erhalten.

Vor push wird der aktuelle Eintrag per replace mit scrollY und einem stabilen focusKey aktualisiert; der neue Eintrag bekommt eine neue ID. Vor replace werden vorhandene eigene/fremde State-Felder erhalten. Fokuskeys bezeichnen stabile UI-Ziele, keine DOM-Referenzen. Ein leichtgewichtiges pro-Entry-Memory wird auch bei Scroll/Fokus-Wechsel aktualisiert, damit der verlassene Eintrag bei pop bekannt bleibt. Kein Storage-Write auf jedes Scrollereignis.

Nur benutzerinitiierte push-Navigation zum neuen Tool/Datensatz/Bereich erzeugt einen Auftrag „Überschrift fokussieren, Seitenanfang“. Lazy-Screens melden per Ready-Callback, wenn die passende Überschrift tatsächlich gemountet ist; ein Auftrag wird nur bei noch passender Navigations-ID ausgeführt. Initial, Retry und replace stehlen keinen Fokus. Ein Detail-push fokussiert die gemountete Detailüberschrift statt den Seitenanfang.

Pop-Navigation liest URL und gespeicherten Eintragszustand. Nach Mount der Zielansicht wird scrollY restauriert und focusKey mit preventScroll fokussiert. Fehlt das Ziel, bleibt ein sinnvoller Hauptinhalt-/Überschrift-Fallback ohne Scrollsprung. Bei reload fehlt ggf. In-Memory-State; der Direktaufruf bleibt gültig und erzwingt keinen Fokus. Der bisherige pauschale Section-Effect darf pop nicht wieder auf 0 setzen. Meta-/Ctrl-Klicks behalten native Linkfunktion. Document.title enthält Tool/Datensatz und folgt Sprache. Die Hash-Skip-Link-Nutzung bleibt möglich.

## 8. Integration in Workbench und Katalog

Neue Hauptnavigation „Erkunden“ und Palette-Section. Der allgemeine Bereich steht sofort bereit; sechs aufgenommene Toolziele werden nach Manifestladen ergänzt, nicht alle 557 ee-Befehle. Das Manifest bestimmt Aufnahme und Zahlen, weil eine Registrierung bei nichtparsebarem JSON keine öffentliche Seite garantiert. Ziele funktionieren ohne Katalog. Katalogname/-logo darf Identität ergänzen, überschreibt keine Snapshot-Metadaten. Ergebnislimit und Keyboard-/IME-Vertrag bleiben erhalten.

ToolDetails, Karten, Karten+ und Tabelle verwenden dieselbe Identitäts-/Linkfunktion. Tool-Einstiegslinks, Datensatzanzahlen und konkrete Datasetziele entstehen ausschließlich aus dem validierten Manifest; die Registry liefert Fallbackidentität. Keine Änderung der Registry-Katalog-Struktur nötig. Bei Manifestfehler zeigt das Ziel Retry.

Der Lazy-Screen wird über ScreenBoundary/Suspense geladen. Explorer-Routen rendern unabhängig vom Katalog-Snapshot; Katalogidentität ist optionaler Zusatz. Bestehende Bereiche behalten ihre Lade-/Cache-/Retry-Verträge. Der Screen erhält einen eigenen Manifest-/Datensatz-Retry; ein Chunkfehler nutzt den bisherigen kompletten Reload mit Query-Erhalt.

## 9. Suche, Filter und Fachseiten

Case-insensitive Plaintext-Suche, kein Regex vom Benutzer. Technische IDs verwenden stabile Unicode-Kleinschreibung unabhängig von UI-Sprache; DE/EN-Labels können ergänzend indexiert werden. Fachfilter wirken untereinander als UND und zusätzlich zur Suche. Suchtext umfasst die in den individuellen Seitenentwürfen beschriebenen Felder. Highlighting schneidet Originaltext in React-Text-/mark-Segmente und verändert keine kopierten Befehle.

Bereichsnavigation zeigt Trefferzahlen für die aktuelle Suche. Ein Leerzustand unterscheidet leere Quelle, leeren Bereich und keine Filtertreffer. „Filter zurücksetzen“ setzt Suche und Fachfilter zurück und fokussiert das Suchfeld. Kein „Keine Befehle“ bei einer Quelle, die überhaupt keine Befehlsreferenz verspricht.

Fachliche Details und Mengennachweise:

- br: zwei Seiten; Reader plus 46-Befehle-Operationsmatrix. `mixed` bleibt dritte Operation; leere Beispiele sind sichtbar fehlende Beispiele.
- bv: zwei Seiten; Array-/Objekt-Herkunft unterscheiden. Preferred, accepted und canonical-alias werden getrennt benannt. Kein pauschales Umformen von Pipelines.
- cass: 47 Befehle/314 Argumenteinträge; flags erhalten keinen `true`-Wert aus Enumlisten. `0`-Limits bleiben uninterpretierte Werte, wenn keine explizite Quellbedeutung vorliegt.
- ee: 557 Pfade, 112 Gruppen; 48 Listentreffer initial. Gruppierung erzeugt keine ausgedachten Befehlseinträge. Snapshot-Stati und lokale Werte haben eindeutige Labels. Bei aktiver Suche werden ganze Pfade flach gezeigt.
- fmd: eine capabilities-Seite; Featurewerte bleiben Strings und Tool-Theme wird als Daten dargestellt. Klartextleitfaden ausgeschlossen.
- ubs: Flags/Usage getrennt, null-Argument heißt kein Wertargument. Exit 3 und Partial bleiben keine bestandenen Scans.

Detailansicht ist kein Modal. Mobil folgt sie der Trefferliste; Desktop nutzt eine dritte Spalte. Die Änderung muss die Auswahl lesbar fokussieren, ohne nach jedem Suchzeichen Fokus zu verschieben. Native selects/buttons, Textbadges und sichtbare Fokusmarkierungen verwenden vorhandene Tokens. Reduced Motion/Forced Colors, beide Themes, DE/EN und 320-/360-px-Breite sind Pflicht.

## 10. Validation und Veröffentlichung

Neue npm-Kommandos: `sync:explorers`, `validate:explorers`, `test:explorers` (Node-Modelltests). `test:model` führt vorhandene Workbench-URL-/Modelltests sowie Explorer-Fachtests aus. `test:production` muss zusätzlich Explorer-UI aus dem Produktionsbuild unter Pages-Subpath ausführen. Bestehende Skripte werden erweitert, nicht durch konkurrierende Versionen ersetzt.

Manifestprüfung muss Ausgabe-/Dateiidentität gegen Fixture prüfen. Die Buildquelle ist der Git-Checkout, keine lokale CLI-Installation. CI ergänzt `validate:explorers`, führt die erweiterten Modelltests aus und kopiert Manifest plus Originalquellen über Vite public in dist. Alle sechs Produktionsspecs laufen im bestehenden build-Job vor Upload; deploy bleibt needs:build. Die exakten npm-Listen stehen in contracts.md Abschnitt L.

`npm run build` synchronisiert derzeit den Katalog aus einem benachbarten Checkout und kann weitere Änderungen erzeugen. Beim späteren Umsetzen werden diese Effekte vorab getrennt geprüft. Der aktuelle Planauftrag benötigt keinen Build und ändert keine Datendatei.

## 11. Abhängige Arbeitspakete

| ID | Arbeit | Blockiert durch | Eigenständige Abnahme |
| --- | --- | --- | --- |
| P01 | Registry, Manifest-Generator, Formatdiagnostik | Planabschluss | 8 JSON-Quellen; Klartext ignoriert; deterministisch |
| P02 | ViewModel und JSON/Generic-Grundadapter | P01 | RFC-6901, null/false/0, Zusatzfelder, doppelte Namen |
| P03 | Fachadapter aller 8 JSON-Quellen | P02 | Quellmengen und alle beschriebenen Felder korrekt |
| P04 | Loader, Digest, Cache und Race-Vertrag | P01, P02 | Fehlendes Manifest/Quelle, HTTP/Parse/Hashfehler, Abbruch, Retry |
| P05 | Zentraler URL-Vertrag und History | P01, P02 | Roundtrip, ungültige IDs, Query-Trennung, Push/Replace |
| P06 | Index, Tool-Einstieg, gemeinsamer Lazy-Screen | P03, P04, P05 | Ohne Katalog nutzbar; 6 Tools/8 Seiten; ErrorBoundary |
| P07 | br und bv Fachansichten | P03, P06 | Zwei Seiten je Tool; Operations-/Prerequisite-Matrix; Aufrufquellen |
| P08 | cass Fachansicht | P03, P06 | Argumente/Workflows/Recovery und Null-/Enum-Grenzen |
| P09 | ee Fachansicht | P03, P06 | 557 Pfade/112 Gruppen, Snapshot-/Env-/Outputdetails |
| P10 | fmd und ubs Fachansichten | P03, P06 | Nur JSON; Featurestrings; Usage/Flags/Scanverträge |
| P11 | Katalog/Palette/DE-EN-/Theme-Integration | P06 | Link überall konsistent, native Fokus-/Modifier-Verträge |
| P12 | Produktionsregression und CI-Gate | P07–P11 | Bestehende Workbench bleibt korrekt; Erweiterungsprobe/Deployment |

Alle Pakete liefern eigene Tests mit, P12 ersetzt diese nicht durch späte Existenzprüfungen. Die Kanten bilden einen DAG. P12 konsumiert alle UI-Pakete; P03/P04/P05 liefern für P06/P07–P10; P01/P02 sind notwendige Grundlagen. Keine impliziten Kind→Epic-Abhängigkeiten.

## 12. Testmatrix

| Ebene | Szenario | Erwartung |
| --- | --- | --- |
| Inventar | Die neun aktuellen Dateien | Acht JSON-Seiten; Klartext fehlt in Manifest, Links und Suche |
| Inventar | Unregistrierte neue Datei | Keine neue Seite; UnexpectedInventoryFile; Publishcheck verlangt Registrierung |
| Inventar | Neue Datei explizit generisch registriert | Eigene stabile Seite ohne Fachadapter und ohne Umbau bestehender Seiten |
| Inventar | Nichtparsebare Datei / fehlende registrierte Datei | Nichtparsebar ignoriert; fehlende Datei ist Registrierungsfehler |
| Adapter | Gleicher Befehl in mehreren Dateien | Unterschiedliche Dataset-ID/Herkunft; keine Zusammenführung |
| Adapter | bv-Array vs bv-Objekt | Gleiche Fachfelder, verschiedene korrekte Pointer |
| Adapter | ee-Envelope success=false/degraded | Herkunft/Fehler sichtbar, kein falscher Live-Status |
| Adapter | Unknown-contract / skalare Root | Generisch lesbar; keine Fachfelder erfunden |
| Adapter | Tiefe Struktur / /- und ~-Schlüssel | Reader erreichbar; escaped Pointer löst exakt |
| Navigation | Reload/Back/Forward, Katalog→Explorer→zurück | Auswahl/Filter getrennt, Scroll-/Fokus sinnvoll |
| Transport | Langsame Antwort der vorherigen Datei | Keine Überschreibung des aktuellen Datensatzes |
| Transport | Digest passt nicht / Retry | Sichtbarer Versionskonflikt, neues Manifest/Quelle geladen |
| UI | br write/mixed; bv Git/Mutation; cass JSON | Verifizierte Quellmengen und klare Badges |
| UI | ee Pfadsuche / nicht verfügbar | Voller Pfad und originaler Index; mcp serve-stdio korrekt |
| UI | fmd capabilities / ignorierter robot-docs-Link | Eine Seite; robot-docs unbekannt ohne Fetch; Statusstrings unverändert |
| UI | UBS partial / Exit 3 | Dokumentierter Vertrag, kein bestandenes Scanresultat |
| UI | Clipboard-Fehler, Modifikator-Klick, IME | Zugängliches Feedback und bestehende native Verhalten |
| A11y | DE/EN, Dark/Light, 360 px, Reduced Motion, Forced Colors | Keine unlesbaren/inaccessible Controls, Axe ohne relevante Befunde |
| Produktion | dist unter /CliToolRegistry.Web/ | Quellen/Manifest/Lazy-Chunks korrekt; Direktaufruf mit Query |

## 13. Reviewprotokoll und offene Konkretisierung

Reviewdurchführung ausschließlich über globalen Oracle-MCP, keine direkte Oracle-CLI/Browser-/API-Ausweichroute. APR-Verwaltung darf lokal erfolgen; Reviewprompts und Planinhalte werden über MCP übergeben. Eine Dry-Run-Auflösung belegt nur Konfiguration, keinen abgeschlossenen Review.

Durchgeführt: historische R1-Vorarbeit, R2 Loader/URL-/Erweiterungsgrenzen, R3 Fachansichten/Barrierefreiheit, R4 Selbstständigkeit/DAG/Abnahme, R5 Konsistenz/Konvergenz und isolierter P09-Beadcheck. Nach jeder Runde: Vorschläge gegen die neun Quellen und den aktuellen Code prüfen, begründete Änderungen integrieren, Delta und verworfene Vorschläge protokollieren.

Die Detailverträge sind jetzt einschließlich Registryform, Presence-/Snapshotpointer, Adaptergates, Cache-/Epochbindung, Filterencoding, Historybootstrap und CIanschluss konkretisiert. R2 brachte materielle Vertragskorrekturen; daher bleibt weitere Reviewkonvergenz erforderlich. R2-01 wird bewusst abweichend behandelt: vorhandenes nichtparsebares JSON bleibt ignoriert, auch bei Registrierung. Das Manifest darf nur die aufgenommenen Teilmengen abbilden. Diese Nutzerregel wird nicht durch eine neue Buildfehlerausnahme eingeschränkt.

R1 ist historisch und nicht qualifiziert. Vier Reviews mit bestätigtem High-Effort sind R2–R5. R5 bestätigt Architekturkonvergenz und keinen offenen materiellen Produkt-/Fachentscheid; Rohurteil REVISE mit konditionalem READY nach drei Ownership-/Acceptancekorrekturen. Diese Korrekturen wurden vollständig integriert und lokal geprüft. Zwölf Beads mit 23 Abhängigkeiten sind angelegt, sechs Politurprüfungen ohne Befund; alle open. Die Anwendung wurde nicht erweitert. [Reviewprotokoll](tool-explorers-review.md), [Beads-Übergabe](tool-explorers/handoff.md).
