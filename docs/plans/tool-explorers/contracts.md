# Verbindliche Detailverträge der Tool-Erkundung
+
Stand: 2026-10-11; gehört zum [Implementierungsplan](../tool-explorers-implementation.md).
Status: verbindlicher Vertrag nach vier High-Reviews R2–R5 und lokaler Schlusskorrektur; keine Anwendungsimplementierung.
Dieses Dokument beschreibt geplante Verträge, keine vorhandene Implementierung.

## A. Inventar und Aufnahme

Der Eingang ist `public/robot-docs/` im Git-Checkout.
Keine Tool-Ausführung gehört zur Inventarisierung.
Der Bestand wird vor jeder Manifest-Erzeugung vollständig geprüft.
Nur reguläre Dateien mit `.json`-Suffix sind Kandidaten.
Ein Symlink ist kein zulässiger Kandidat.
Unterverzeichnisse werden nicht rekursiv aufgenommen.
Die Registry enthält keine beliebigen URLs.
Ein Filename ist ein Basename mit maximal 160 Zeichen.
Er erfüllt `^[A-Za-z0-9][A-Za-z0-9._-]*\.json$`.
Zusätzlich ist jede `..`-Sequenz ausgeschlossen.
Tool- und Datensatz-IDs erfüllen `^[a-z0-9][a-z0-9-]{0,63}$`.
IDs sind case-sensitive und werden nicht normalisiert.
Das Paar Tool-/Datensatz-ID ist eindeutig.
Registrierte Dateinamen sind ebenfalls eindeutig.
Ein Tool kann mehrere Datensätze besitzen.
Der Loader konstruiert keine Filename-Heuristik aus Tool-IDs.
Eine Registrierung benötigt DE-/EN-Titel.
Tool-Fallbackidentität ist Teil derselben deklarativen Registry.
Kein Katalogexport ist zur Registrierung erforderlich.

### Aufnahmealgorithmus

1. Registry selbst validieren, bevor Kandidaten zugeordnet werden.
2. Verzeichniseinträge in Codepoint-Ordnung lesen.
3. Typ und Filename eines Kandidaten prüfen.
4. Rohbytes lesen; keinen Text vor Hashing verändern.
5. Strikt als UTF-8 dekodieren.
6. `JSON.parse` versuchen.
7. Decode-/Parsefehler lokal als `IgnoredNonJson` protokollieren.
8. Nichtparsebare Kandidaten vollständig aus dem Explorer ausschließen.
9. Gültige Kandidaten nach expliziter Registry zuordnen.
10. Nicht registriertes gültiges JSON als Inventarfehler melden.
11. Aufgenommene Quellen hashen und Snapshot-Metadaten extrahieren.
12. Manifest in fester Reihenfolge serialisieren.

Ein JSON-String wie `"hello"` ist gültiges JSON.
Er ist kein Klartextexport und kann generisch aufgenommen werden.
Leerer Klartext, HTML oder NDJSON ist kein einzelnes JSON-Dokument.
Diese Formate werden unter `.json` nicht aufgenommen.
Es wird kein zweiter Parser zur Rettung einer solchen Datei verwendet.
Bei JSON-Parsefehlern wird auch kein Markdown-/Textadapter gewählt.
Die Quellendatei bleibt auf der Platte unverändert.
Keine automatische Umbenennung, Neuerzeugung oder Löschung.
Die Ausschlussregel gilt auch für abgeschnittene JSON-Exporte.
Eine vorhandene Registrierung hebt das JSON-Gate nicht auf.
Fehlt eine registrierte Datei ganz, ist dies ein Registrierungsfehler.
Ist sie vorhanden, aber nichtparsebar, wird sie ignoriert.
Das Manifest enthält nur tatsächlich aufgenommene Quellen.
Es enthält keine ignored-Placeholder-Datensätze.
Ignorierte Namen erscheinen nicht in der öffentlichen Suche.
Ignorierte Namen erscheinen nicht in der Palette.
Ignorierte Dateien bekommen keine Explorer-Downloadaktion.
Ein Deep Link auf eine ignorierte Identität wird unknown-dataset.
Die betreffende Quelldatei wird für diesen Link nicht angefordert.
Ignorierte Kandidaten allein verursachen keinen Exitfehler.
Der lokale Bericht zeigt ihre Anzahl und Ursachen.
Der Nutzer hat damit keinen Textreader beauftragt.

### Initiale Registrierungen

| Tool | Dataset | Filename | Adapter |
| --- | --- | --- | --- |
| br | robot-docs | br.robot-docs.json | br-guide |
| br | capabilities | br.capabilities.json | br-capabilities |
| bv | robot-docs | bv.robot-docs.json | bv-docs |
| bv | capabilities | bv.capabilities.json | bv-capabilities |
| cass | capabilities | cass.capabilities.json | cass-capabilities |
| ee | capabilities | ee.capabilities.json | ee-capabilities |
| fmd | capabilities | fmd.capabilities.json | fmd-capabilities |
| ubs | robot-docs | ubs.robot-docs.json | ubs-docs |

`fmd.robot-docs.json` ist keine Registrierung.
Die acht Registrierungen ergeben sechs Tools.
br und bv zeigen je einen Zwei-Datensatz-Einstieg.
cass, ee, fmd und ubs öffnen ihren einzelnen Datensatz.
Manifestzahlen werden aus Einträgen berechnet, nicht hardcodiert.
Die Initialmengen sind Prüf-Orakel für genau diese Quell-Digests.
Baselineprüfungen verwenden digestgebundene Fixtures oder prüfen bekannte Quellen als Teilmenge.
Live-UIzahlen stammen aus dem aktuellen Manifest; ein neuer registrierter Datensatz braucht keine UIzählkonstante.
Negative UItests wie ignored-fmd-route verwenden den expliziten JSON-only-Baselinefixturebestand.
Ein später registrierter valider fmd-Leitfaden darf nicht an einem veralteten globalen Acht-Seiten-Assertion scheitern.
Spätere validierte Exporte dürfen andere fachliche Mengen besitzen.
Ein Versionsupdate erzwingt keine unnötige Quelltextänderung von Zahlen.
Ein neues Thema erhält eine neue Dataset-ID.
Bestehende IDs werden nicht aus Versionsnummern zusammengesetzt.
Die Version des Quelldatensatzes ist Metadatum, keine Routing-ID.

## B. Manifest und Diagnosen

Manifestziel: `public/robot-docs.manifest.json`.
Dieses Ziel liegt außerhalb des Kandidatenverzeichnisses.
Das Buildmanifest wird generiert und nicht als manuell editierbare Quelle geführt.
Das generierte Manifest wird versioniert, damit read-only Validierung vor dem Build möglich ist.
Die Prüfung vergleicht die erwarteten Bytes mit der vorhandenen Datei und scheitert bei fehlender oder veralteter Ausgabe.
`sync:explorers` schreibt es aus Registry und Quellen.
Generator und Browser nutzen dieselbe reine Registryvalidierung aus einem `.mjs`-Modul mit `.d.mts`-Typvertrag.
Pfad: src/data/explorerRegistryValidation.mjs und explorerRegistryValidation.d.mts.
P01 erstellt Registry-/Manifesttypen in src/types/explorer.ts; P02 ergänzt Entry-/View-/Actiontypen.
P05 hängt deshalb auch von P02 ab und implementiert Navigation erst nach den gemeinsamen Actiontypen.
Der Browser importiert Registry-JSON mit `resolveJsonModule`; Node-Tests lesen diese Quelle mit fs und JSON.parse.
`validate:explorers` prüft dieselben Eingänge ohne Tool-Ausführung.
Die Veröffentlichung verlangt einen fehlerfreien gültigen Bestand.
Validierungsfehler werden nicht allein durch ein altes Manifest geheilt.
Snapshot-Versionen werden aus der jeweils zugehörigen Quelle gelesen.
Ein fehlender Zeitwert bleibt state missing; explizites null bleibt state null.
Kein Dateimtime ersetzt einen nicht dokumentierten Exportzeitpunkt.
Kein Buildzeitpunkt ersetzt einen Quellzeitpunkt.
Ein Tool-Einstieg aggregiert keine Versionen verschiedener Dateien.
`bv` behält die unterschiedlichen Exportzeiten seiner zwei Quellen.
`unknown` als Commitwert ist eine Queldaussage, kein Zeitwert.
Ungültiger Datumstext bleibt Rohwert mit Diagnose, nicht ein Date-Objektfehler.

Geplanter Manifestvertrag:

```ts
type JsonValue =
  | null | boolean | number | string
  | JsonValue[]
  | { [key: string]: JsonValue };

type LocalizedLabel = { de: string; en: string };
type DatasetRef = { toolId: string; datasetId: string };
type SourcedPresence<T> =
  | { state: 'missing' }
  | { state: 'null'; pointer: string }
  | { state: 'value'; value: Exclude<T, null | undefined>; pointer: string };
type SnapshotMeta = {
  version: SourcedPresence<string>;
  contract: SourcedPresence<string>;
  generatedAt: SourcedPresence<string>;
};
type ManifestEntry = DatasetRef & {
  filename: string;
  format: 'json';
  adapter: AdapterId;
  title: LocalizedLabel;
  bytes: number;
  sha256: string;
  snapshot: SnapshotMeta;
};
type ExplorerManifest = {
  schema: 'cli-tool-explorer.manifest.v1';
  datasets: ManifestEntry[];
};
type AdapterId =
  | 'br-guide'
  | 'br-capabilities'
  | 'bv-docs'
  | 'bv-capabilities'
  | 'cass-capabilities'
  | 'ee-capabilities'
  | 'fmd-capabilities'
  | 'ubs-docs'
  | 'generic-json';
```

`bytes` ist eine positive sichere Ganzzahl.
`sha256` ist eine 64-stellige kleingeschriebene Hexfolge.
Manifest-ID-Paare und Filenames sind eindeutig.
Ein unbekannter Manifest-Schemaname blockiert den Loader mit Manifestfehler.
Ein unbekannter Quellvertrag blockiert nicht die generische JSON-Darstellung.
Diese beiden Ebenen sind ausdrücklich verschieden.
Manifestadapter müssen in der gebauten Adapterliste existieren.
Extern veränderter Manifestadapter wird nicht dynamisch importiert.
Der Browser interpretiert ihn nur als erlaubten enum-Wert.
Ein unknown adapter ist ein Manifestfehler, keine Codeausführung.
Manifestversion v1 wird erst durch eine bewusste Änderung erweitert.

### Diagnosetaxonomie

| Code | Ebene | Effekt |
| --- | --- | --- |
| InvalidRegistry | Build | Registrierung selbst ist ungültig; Exit 1 |
| DuplicateDataset | Build | Identität doppelt; Exit 1 |
| DuplicateFilename | Build | Quelle doppelt registriert; Exit 1 |
| UnsafeFilename | Build/Runtime | Kein Dateizugriff/Fetch; Exit 1 bzw. Manifestfehler |
| MissingRegisteredFile | Build | Erwartete Quelle fehlt; Exit 1 |
| UnexpectedInventoryFile | Build | Valides unregistriertes JSON; Exit 1 |
| IgnoredNonJson | Build | Lokaler Bericht; kein Manifesteintrag; allein Exit 0 |
| UnsupportedContract | Adapter | Ready-generic mit Herkunftshinweis |
| ContractShapeMismatch | Adapter | Ready-generic; keine falsch typisierten Fachdaten |
| DuplicateEntryName | Adapter | Getrennte Pointer-IDs, sichtbarer Detailhinweis |
| InvalidSnapshotDate | Adapter | Rohwert erhalten; formatierte Zeit fehlt |
| ManifestTransportError | Runtime | Manifest-Retry; keine Dataset-Fetches |
| ManifestShapeError | Runtime | Kein fremder Filename-/Adapterzugriff |
| SourceTransportError | Runtime | Dataset-Retry, andere Quellen nutzbar |
| SourceIntegrityError | Runtime | Keine Adapterausführung, Retry mit neuem Manifest |
| SourceDecodeError | Runtime | Keine Textansicht, Dataset-Retry |
| SourceParseError | Runtime | Keine Textansicht, Dataset-Retry |

Diagnosen enthalten Code, relative Quelle und verständliche Erklärung.
Sie enthalten keine absoluten Checkoutpfade im Manifest.
Builddiagnosen sind deterministisch nach Code/Quelle sortiert.
Ignorierte Kandidaten werden nur im lokalen Bericht geführt.
Es wird kein öffentlicher Diagnosedatensatz für sie erzeugt.
Bekannte Registrierung plus ignorierte Quelle ist keine öffentliche Fehlerkarte.
Das finale Manifest kennt nur gültige JSON-Datensätze.
Die Registry kann beim nächsten Datenupdate an diesen Bestand angepasst werden.
Aufwendige automatische File-Reparatur gehört nicht in diesen Generator.

### Byte-Determinismus

Datensätze sortieren nach toolId, dann datasetId.
Sortierung vergleicht Unicode-Codepoints, keine UI-Locale.
Feldreihenfolge entspricht den oben definierten Typfeldern.
JSON-Serialisierung verwendet zwei Leerzeichen.
Datei endet mit genau einem LF.
Keine absolute Pfadangabe gehört in Buildmetadaten.
Keine Build-Uhrzeit und kein mtime gehören hinein.
Dateigröße/Digest beziehen sich auf ursprüngliche Quellbytes.
Gleicher Registry-/Quellstand muss identische Bytes erzeugen.
Ein Test führt den Generator zweimal mit unterschiedlichen Verzeichnisreihenfolgen aus.
Die verglichenen Manifestbytes müssen identisch sein.
Ein Zeitstempel-only-Katalogsync beeinflusst das Explorer-Manifest nicht.

## C. Loader und Cache

Der gemeinsame Manifestrequest wird beim App-Mount unabhängig vom Katalog gestartet.
P04 liefert die Lade-API; P06 besitzt ihren App.tsx-Mountaufruf und den Browserzustand.
Er liefert das Aufnahmeinventar für Palette-/Kataloglinks und Explorer; sein Fehler blockiert den Katalog nicht.
Kein Quelldatensatz wird beim bloßen Katalogbesuch geladen.
Nach Manifestauflösung wird ausschließlich die gewählte Quelle geladen.
Ein unbekannter Dataset-Link löst keinen Filename-Fetch aus.
Der Quellenpfad wird mit BASE_URL gebaut.
`robot-docs/` ist ein fester Verzeichnisbestandteil.
Der validierte Filename kommt aus dem Manifest.
Digestkey in der Query: `v=<sha256>`.
Quelle bleibt ein statisches Asset.
Keine Proxy-/Backendroute ist erforderlich.
HTTP-Status wird vor Lesen eines Erfolgsobjekts geprüft.
Die Antwort wird zuerst als ArrayBuffer gelesen.
Bytezahl muss exakt zum Manifest passen.
SHA-256 muss exakt zum Manifest passen.
Erst danach erfolgt `TextDecoder('utf-8', { fatal: true })`.
Erst danach erfolgt `JSON.parse`.
Erst danach erfolgt Fachadapterprüfung.
Fetch-Content-Type ist kein Parservertrag.
Eine 200-Antwort mit HTML kann die Integritätsprüfung nicht umgehen.
Eine UTF-8-/JSON-falsche Antwort erhält keine Textdarstellung.
Ein fehlendes crypto.subtle ist ein erklärter Integritätsfehler.
GitHub Pages nutzt HTTPS; die lokale Preview nutzt Loopback.
Kein Fallback überspringt die Digestprüfung.

Loader ist eine reine asynchrone Funktion mit injizierbarem Fetch.
BASE_URL wird als baseUrl aus dem Browseraufrufer übergeben; der Loader liest import.meta.env nicht beim Node-Modulimport.
Tests erzeugen isolierte Loader-/Cacheinstanzen, damit parallele Testfälle keine Manifestepochs teilen.
Die React-Anbindung gehört in ToolExplorer, nicht in Fachadapter.
Adapter werden ohne DOM oder Netz getestet.
Quellen werden in einem In-Memory-Cache gespeichert.
Schlüssel: Filename und SHA-256.
Titel/Locale sind nicht Cacheidentität.
RawCache speichert Rohbytes und geprüftes geparstes JSON nach filename+sha256.
ViewModelCache verwendet toolId+datasetId+adapter+filename+sha256 als Schlüssel.
Nur der zweite Cache speichert normalisierte ExplorerDataset-Objekte.
Ein erfolgreicher gleicher Digest darf beim erneuten Öffnen sofort genutzt werden.
Localeabhängige Labels werden erst in der Ansicht gewählt.
Eine Fehlerantwort wird nicht als erfolgreicher Cacheeintrag gespeichert.
Ein Retry kann einen fehlerhaften Requestzustand verwerfen.
Kein weiterer localStorage-Dokumentationscache wird eingeführt.
Der vorhandene Katalogcache wird nicht als Dokumentationscache umfunktioniert.

### Request-Lebenszyklus

Jede Auswahl besitzt eine monotone Request-ID.
Jeder Manifestladezyklus besitzt eine monotone manifestEpoch.
Retry invalidiert den aktuellen Manifest-Promise und erhöht die Epoch.
Nur die aktuelle Epoch darf sichtbaren Manifestzustand veröffentlichen.
Datasetrequests binden requestId+manifestEpoch+toolId+datasetId+sha256.
Ein neuer Dataset-Request ersetzt die aktive ID.
Ein alter Request wird per AbortController abgebrochen.
Abort allein ist keine Race-Garantie.
Vor jeder Ergebnisübernahme wird die aktive Request-ID verglichen.
Ein verspätetes Ergebnis darf seinen eigenen Cache füllen.
Es darf niemals die Ansicht eines anderen Datensatzes überschreiben.
Cleanup verhindert Ergebnisübernahme nach Unmount.
StrictMode-Doppelmount darf keine fremde Auswahl aktivieren.
Ein gemeinsamer unkontrollierter AbortController wird nicht zwischen Consumer geteilt.
Abbruch wird nicht als nutzerseitiger Ladefehler angezeigt.
Ein echter Netzwerkfehler dagegen besitzt Retry.
Ein erfolgreich geladener anderer Datensatz bleibt nutzbar.

Retry lädt zuerst das Manifest mit `cache: 'no-cache'`.
Danach werden die Identität und der neue Digest erneut aufgelöst.
Danach wird die Quelle mit dem erwarteten Digestkey geladen.
Ein unveränderter CDN-Konflikt bleibt sichtbar.
Kein endloser automatischer Retry-Loop wird gestartet.
Ein manueller zweiter Retry ist möglich.
Wird die Quelle im neuen Manifest ignoriert/entfernt, wird unknown-dataset gezeigt.
Keine alte ready-Ansicht ersetzt diesen aktuellen Manifestbefund.
Snapshot-Metadaten werden aus einem zusammengehörigen Manifest-/Quellpaar gezeigt.

### Laden und Fehler anzeigen

Manifestfehler: Index/Tool-Seite zeigt Erklärung und „Erneut laden“.
Quellfehler: gewählte Dataset-Seite zeigt Erklärung und Retry.
Andere Datensätze bleiben über Tool-Navigation erreichbar.
Fachvertrag unbekannt: generische JSON-Seite mit Diagnosehinweis.
Fachvertrag falsch typisiert: generische JSON-Seite mit Diagnosehinweis.
Syntaxfehler: keine generische Textansicht.
Digestfehler: keine Rohobjektansicht des ungeprüften Inhalts.
Katalogfehler: gesonderte Katalogwarnung, Explorer bleibt nutzbar.
Lazy-Chunkfehler: ScreenBoundary bietet vollständigen Reload mit Queryerhalt.
Reset eines abgewiesenen React.lazy-Promises genügt dafür nicht.

## D. Normalisierte Einträge und Herkunft

Ein Adapter liefert diese Struktur:

```ts
type Presence<T> =
  | { state: 'missing' }
  | { state: 'null' }
  | { state: 'value'; value: Exclude<T, null | undefined> };
type Origin = {
  filename: string;
  pointer: string;
  guideLines?: { start: number; end: number };
};
type ExplorerDataset = {
  ref: DatasetRef;
  snapshot: SnapshotMeta;
  sections: ExplorerSection[];
  entries: ExplorerEntry[];
  diagnostics: AdapterDiagnostic[];
};
type ExplorerSection = {
  id: string;
  label: LocalizedLabel;
  entryIds: string[];
};
type ExplorerEntry = {
  id: string;
  sectionId: string;
  parentEntryId?: string;
  title: string;
  searchText: string;
  origin: Origin;
  detail: EntryDetail;
};
type AdapterDiagnostic = {
  code: string;
  pointer: string;
  explanation: LocalizedLabel;
};
```

Entry-ID-Konvention:
`cmd:<name>` für eindeutige Befehlseinträge.
`arg:<commandName>:<argumentName>` für eindeutig benannte Argumente.
`workflow:<name>` für Workflows.
`env:<name>` für Env-Einträge.
`feature:<name>` für Fähigkeiten.
`ptr:<RFC-6901-pointer>` für namenlose/mehrdeutige Einträge.
`guide:<sectionKey>` für stabile Guide-Abschnitte.
Die Rohpointer werden immer zusätzlich geführt.
Eindeutigkeit wird über den ganzen normalisierten Datensatz geprüft.
Ein Namensbestandteil mit internem Doppelpunktseparator verwendet ptr:-Identität.
Ein namensgleicher Eintrag erhält Pointer-ID, nicht eine geratene Nummer.
Der Resolver akzeptiert nur tatsächlich vorhandene IDs.
URLSearchParams übernimmt URL-Encoding.
Keine manuelle Ersetzung von Leerzeichen oder Schrägstrichen in IDs.
Überschreitet eine erzeugte Entry-ID 2048 Zeichen oder enthält unpaarige Surrogate, erhält sie node:<entryOrdinal>.
entryOrdinal ist der deterministische Index der Entryerzeugung in festgelegter Bereichs-/Quellreihenfolge, json zuletzt.
Die tatsächliche beliebig lange Herkunft bleibt in Origin.pointer erhalten; der Resolver verwendet die Entry-ID-Tabelle.
Diese IDs gelten innerhalb desselben Quellsnapshots; sie erfinden keine Pfadabkürzung.
Tiefe JSONfixtures prüfen erreichbare Inhalte, endliche DOMtiefe und gültige erzeugte Permalinks gemeinsam.
Eine ID ist in genau ihrem Dataset eindeutig.
Datasetwechsel löscht alte Entryauswahl.

### Fachdetails

```ts
type EntryDetail =
  | GuideDetail
  | BrCommandDetail
  | BvCommandDetail
  | CassCommandDetail
  | CassArgumentDetail
  | EeCommandDetail
  | ExampleDetail
  | StructuredDetail
  | GenericDetail;
type GuideDetail = {
  kind: 'guide';
  text: string;
  copyCommands: string[];
};
type BrCommandDetail = {
  kind: 'br-command';
  summary: string;
  operation: 'read' | 'write' | 'mixed';
  workspace: 'required' | 'optional' | 'none';
  machineOutput: string[];
  examples: string[];
};
type BvCommandDetail = {
  kind: 'bv-command';
  description: string;
  flag: string;
  needsIssues: boolean;
  needsGit: boolean;
  needsSprint: boolean;
  needsBaseline: boolean;
  mutatesState: boolean;
  params: Presence<string[]>;
  keyFields: Presence<string[]>;
  preferredInvocation: Presence<string>;
  acceptedInvocations: Presence<string[]>;
};
type CassCommandDetail = {
  kind: 'cass-command';
  description: string;
  hasJsonOutput: boolean;
  argumentEntryIds: string[];
};
type CassArgumentDetail = {
  kind: 'cass-argument';
  description: string;
  argType: 'option' | 'flag' | 'positional';
  required: boolean;
  valueType: Presence<string>;
  defaultValue: Presence<JsonValue>;
  enumValues: Presence<JsonValue[]>;
  repeatable: Presence<boolean>;
  short: Presence<string>;
};
type EeCommandDetail = {
  kind: 'ee-command';
  availableInSnapshot: boolean;
  pathParts: string[];
};
type ExampleDetail = {
  kind: 'example';
  description: Presence<string>;
  commands: string[];
};
type StructuredDetail = {
  kind: 'structured';
  sourceValue: JsonValue;
  rows: { label: string; value: Presence<JsonValue> }[];
  copyCommands: string[];
};
type GenericDetail = {
  kind: 'generic';
  rootPointer: string;
};
```

StructuredDetail bildet Vertragskarten ab, keine ungeprüften Fachdaten.
Rows werden aus validierten Quellfeldern aufgebaut.
Presence unterscheidet fehlend, null und false/0/leere Werte.
GenericDetail greift auf das geprüfte rohe JSON zu.
Ein Datenobjekt wird niemals via eval ausgewertet.
Ein JsonValue-Objekt wird nicht per Prototypepfad dereferenziert.
Pointerauflösung benutzt eigene Objektkeys.
RFC-6901-Escaping: zuerst `~` zu `~0`, dann `/` zu `~1`.
Leerer Pointer bezeichnet den JSON-Root.
Ein Arrayslot enthält eine dezimale Indexkomponente.
Das `-`-Append-Segment ist kein Lesepointer.
Guide-Zeilen gehören zu einem JSON-Stringpointer wie `/guide`.
Die Originalzeichenfolge bleibt vollständig erhalten.
Abschnitte werden nur bei konservativ erkannter Überschrift gebildet.
Unbekanntes Guideformat hat einen vollständigen Eintrag „Originalleitfaden“.
Headinggate für br: exakt unindented Purpose:, Machine-output defaults:, Start of session:, Finding work:, Claiming work:, Completing work:, Discovery:, Safety:.
Die acht Titel müssen einmalig und in dieser Reihenfolge vorkommen; sonst guide:original ohne Zerlegung.
Sectionkeys: purpose, machine-output-defaults, start-of-session, finding-work, claiming-work, completing-work, discovery, safety.
Text vor der ersten Überschrift gehört zum ersten Abschnitt, damit keine Zeile verschwindet.
Abschnitte enden inklusive vor der nächsten Überschrift; der letzte enthält alle Schlusszeilen.
Zeilen werden mit LF getrennt; CR vor LF bleibt für Kopie erhalten und wird nur zum Headingvergleich entfernt.
Keine Guide-Textdatei wird außerhalb einer gültigen JSON-Quelle geladen.

## E. Bereiche und Filterdomänen

| Adapter | Bereichs-IDs |
| --- | --- |
| br-guide | guide, canonical-commands, json |
| br-capabilities | commands, features, build, flags, formats, exit-codes, env, safety, entrypoints, json |
| bv-docs | commands, aliases, examples, guide, formats, env, exit-codes, json |
| bv-capabilities | commands, aliases, topics, entrypoints, formats, streams, env, exit-codes, json |
| cass-capabilities | workflows, commands, flags, features, connectors, env, exit-codes, recoveries, limits, json |
| ee-capabilities | commands, subsystems, features, unimplemented, env, output, snapshot, json |
| fmd-capabilities | commands, outputs, features, theme, pdf-running-content, exit-codes, json |
| ubs-docs | guide, commands, flags, examples, formats, exit-codes, env, json |
| generic-json | json |

Ein leerer optionaler Bereich wird nicht als vorhandener Inhalt gezählt.
Ein expliziter Link auf einen leeren nicht aufgebauten Bereich zeigt unknown-section.
Das UI erfindet keine Platzhalterbereiche für zukünftige Dateien.
Bereichslabels sind übersetzte UI-Texte.
Quellnamen/-werte bleiben in Originalsprache.
Kopierte Aufrufe sind immer Originalstrings oder klar bezeichnete Basisaufrufe.
Shell-Pipelines werden nicht syntaktisch umgebaut.

Fachfilter gelten nur in passenden Bereichen:

| Filter | Werte | Bereich |
| --- | --- | --- |
| operation | all, read, write, mixed | br capabilities commands |
| workspace | all, required, optional, none | br capabilities commands |
| machineOutput | all oder dokumentiertes Format aus machine_output | br capabilities commands |
| needs | issues, git, sprint, baseline | bv commands; als eindeutige sortierte Liste |
| mutates | all, yes, no | bv commands |
| jsonOutput | all, yes, no | cass commands |
| available | all, yes, no | ee commands |
| envCategory | all oder Quellkategorie | ee env |
| featureStatus | all oder exakter Quellstatusstring | fmd features |
| argType | all, option, flag, positional | cass Argumentdetail |
| argRequired | all, yes, no | cass Argumentdetail |

Diese Filter werden zusätzlich zur Plaintext-Suche als UND ausgewertet.
Mehrere needs-Werte wirken als UND.
Keine aktive Checkbox heißt keine Voraussetzungseinschränkung.
`mutates=no` bedeutet dokumentiertes false, nicht fehlendes Feld.
Unpassende Filter werden mit sichtbarem Hinweis neutralisiert.
Fehlende Felder werden nicht automatisch false.
Ein br-mixed-Befehl ist weder read noch write.
Ein Snapshot-available-Badge ist kein Livecheck.
Die genaue Behandlung unbekannter Filterwerte steht im URL-Vertrag.

## F. URL- und History-Vertrag

Katalogparameter behalten ihre Bedeutung.
Explorerinterne Navigation verändert q/category/platform/sort/view/count nicht.
Regulärer Sectionwechsel schließt tool nach dem bestehenden Katalogvertrag.
`q` bleibt Katalogsuche.
`tool` bleibt Katalogdetail-ID.
`category` bleibt Katalogkategorie.
Explorer verwendet eigene Parameter.
`section=explore` aktiviert die neue Oberfläche.
`exploreTool` wählt Tool-Einstieg.
`dataset` wählt einen Datensatz dieses Tools.
`docSection` wählt den normalisierten Bereich.
`entry` wählt eine normalisierte Entry-ID.
`docQ` wählt die Datei-Suche.
`docCount` bestimmt sichtbare Treffer, Default 48.
`docCount` wird auf sichere positive Ganzzahl normalisiert.
Maximalwert 10000; UI-Schrittweite 48.
`docQ` ist maximal 500 Unicode-Codepoints lang.
Tool-/Dataset-/Sectionparameter maximal 64 Zeichen.
Entryparameter maximal 2048 Zeichen, um tiefere Pointer zu tragen.
Ein syntaktisch zu langer ID-Wert wird als invalid-route klassifiziert.
Er wird nicht zu einer anderen gültigen ID abgeschnitten.
Suchtext darf gekürzt werden, begleitet von einem Hinweis.
Wiederholte Scalarparameter verwenden den ersten Wert, auch bei unterschiedlichen Werten.
Needs wird als wiederholter Queryparameter kodiert: needs=issues&needs=git.
Needs wird dedupliziert, Reihenfolge issues, git, sprint, baseline.
Unbekannte Filterwerte erhalten invalid-filter; Resolver entfernt sie einmalig per replace.
Neutralisierung unpassender Filter canonicalisiert einmalig per replace ohne neuen Eintrag.
envCategory wird syntaktisch auf 64 Codepoints begrenzt und erst nach Laden gegen Quellkategorien validiert.
featureStatus wird auf 256 Codepoints begrenzt und gegen exakte Statusstrings der geladenen fmd.features geprüft.
machineOutput wird auf 64 Codepoints begrenzt und gegen vorhandene Command-machine_output-Werte validiert.
Das Filtermatch verlangt, dass die Commandliste dieses Format enthält; kein Output wird neu generiert.
Fremde Queryparameter werden unverändert übernommen.
Nur eigene bekannte Explorerparameter werden beim Verlassen entfernt.

### Zwei Auflösungsphasen

Parser und Serializer bleiben synchron und datenunabhängig.
Sie führen keine Manifestfetches durch.
Sie importieren keine Fachadapter.
Syntaktisch valide IDs werden unverändert erhalten.
Resolverphase 1 prüft Tool/Dataset gegen gültiges Manifest.
Resolverphase 2 prüft Bereiche/Einträge gegen geladenes ViewModel.
Unknown-tool hat Link zum Explorerindex.
Unknown-dataset hat Link zum passenden Tool-Einstieg.
Unknown-section hat Link zur Dataset-Übersicht.
Unknown-entry hat Link zum entsprechenden Bereich.
Es wird kein erstes Dataset gewählt, wenn explizit ein falsches angegeben ist.
Ein fehlender Datasetparameter bei einem Einzeltool wird canonicalisiert.
Canonicalisierung nutzt replace, nicht push.
Ausnahme pop: Daten werden aufgelöst, aber URL/History nicht geschrieben; explizite nächste Nutzeraktion serialisiert kanonisch.
Bei zwei Datensätzen bleibt der Tool-Einstieg sichtbar.
Ein Datasetparameter ohne Tool ist invalid-route.
Filterwerte aus falschen Domänen werden neutralisiert, nicht erraten.
Der Link bleibt nach Neutralisierung konsistent serialisierbar.

### Transitionen

Toolwechsel: Dataset-/Bereichs-/Eintrags-/Such-/Filterzustand zurücksetzen; docCount=48.
Datasetwechsel: Bereich/Eintrag/Suche/Filter/docCount zurücksetzen.
Bereichswechsel: Suche erhalten, Eintrag löschen, unpassende Filter löschen.
Suchänderung: Eintrag löschen, docCount auf 48.
Filteränderung: Eintrag löschen, docCount auf 48.
Eintragsauswahl: push, unveränderte Suche/Filter behalten.
Eintrag schließen: replace; Fokus zum verbundenen Auswahlbutton.
Mehr anzeigen: replace; Fokus am Mehr-anzeigen-Button erhalten.
Seiten-/Tool-/Dataset-/Bereichswechsel: push.
Eingabetext/Filter: replace.
Zurück/Vorwärts: ausschließlich pop, keine zusätzliche push-Kette.
Ein ausgewählter Eintrag, der nach Suche nicht mehr vorkommt, wird geschlossen.
Kein versteckter falscher Detailkontext bleibt im DOM stehen.

### Historymodell

App setzt manual scrollRestoration, merkt dessen Vorwert.
Unmount stellt den Vorwert wieder her.
Jeder Eintrag besitzt eine zufällige eindeutige App-ID.
History-State hat Namespace `cliToolRegistryWorkbenchV1`.
Eigene Daten: historyId, scrollY, focusKey; historyId ist keine Explorer-entry-ID.
App-Mount versieht den initialen Eintrag einmal per replace mit historyId, falls valider eigener State fehlt.
Ein StrictMode-Remount findet diese ID vor und legt keinen zweiten Eintrag an.
Bei fremdem Objekt-State werden seine Felder erhalten.
Fremder nichtobjektiger State wird gesondert unter foreignState bewahrt.
Keine beliebigen DOM-Elemente werden in history.state geschrieben.
Focuskey wird über app-eigene stabile IDs aufgelöst.
Scrollposition muss eine endliche nichtnegative Zahl sein.
In-Memory-State wird pro History-ID geführt.
Scroll-/Fokusänderung aktualisiert diesen Speicher gedrosselt.
Vor push wird der aktuelle Zustand per replace gesichert.
Push legt eine neue ID für das Ziel an.
Replace behält historyId und fremde Felder.
Pop sichert den verlassenen In-Memory-Eintrag und liest Zielstate.
Pop führt weder pushState noch replaceState aus.
In-Memory[historyId] hat Vorrang vor persistiertem Scroll-/Fokusstate.
URL ist die Quelle für Auswahl/Filter; History-State für Scroll/Fokus.
Back/Forward darf keinen künstlichen Tool-/Datasetwechsel nachschieben.

Navigation-Cause ist initial, push, replace oder pop.
Ein Heading-Fokusauftrag gehört zu genau einer Navigations-ID.
Lazy-Mount meldet Ready nur für die betreffende Ansicht.
Ein überholter Fokusauftrag wird verworfen.
Initialrender stiehlt keinen Fokus.
Replace für Suche stiehlt keinen Fokus.
Retry stiehlt keinen Fokus.
Push-Seitenwechsel fokussiert die neue Überschrift und scrollt oben.
Push-Eintrag fokussiert dessen Detailüberschrift, nicht den Seitenkopf.
Pop restauriert gespeicherten Fokus mit preventScroll.
Pop restauriert gespeichertes scrollY nach passendem Mount.
Ein fehlender focusKey nutzt Main-/Heading-Fallback ohne Scrollsprung.
Ein fehlender State auf Reload erzwingt keinen Fokus.
Der aktuelle pauschale Section-Scroll-Effect muss diese Ursachen beachten.

## G. Suche und Rohansicht

Die Suche bleibt auf die aktuelle Datei begrenzt.
Das Suchfeld nennt diesen Umfang sichtbar.
Textvergleich ist plain substring, kein Benutzerregex.
Technische Kleinschreibung ist localeunabhängig.
UI-Labels werden separat nach Locale angezeigt.
Highlighting verändert weder Quelltext noch Kopierstring.
Trefferzahlen werden aus normalisierten Einträgen berechnet.
Argumenttreffer öffnen ihren zugehörigen Befehls-/Argumentkontext.
Generische Suche indexiert Pfad und Scalarwert.
Objekt-/Arraykeys sind über den Pointer mit suchbar.
Generischer Baum wird iterativ besucht.
Tiefe Eingaben dürfen keinen rekursiven JS-Stack sprengen.
Die Standardansicht öffnet maximal 20 DOM-Ebenen.
Darunter führt „Unterbaum öffnen“ zu neuer Readerwurzel.
Vollständiger Download bleibt erreichbar.
Ein großer Teilbaum wird nicht unbeschränkt in jedem Listeneintrag serialisiert.
Standard-Rohpreview zeigt höchstens 20000 Zeichen mit „Mehr anzeigen“.
Einträge werden in 48er-Seiten sichtbar erweitert.
Es gibt keine behauptete Echtzeit-/Performancegarantie ohne Messung.

## H. UI und Abnahme

Erkundungsindex zeigt nur im Manifest vorhandene Tools.
Toolkarte zeigt Anzahl tatsächlich aufgenommener Datensätze.
Nicht geladene Manifestzahlen werden nicht aus Registry geraten.
Palette kann den Explorerbereich jederzeit anbieten.
Toolziele werden nach Manifestverfügbarkeit ergänzt.
Fallbackidentität stammt aus statischer Registry, nicht aus Katalogerfolg.
Karten/Tabelle/Details dürfen einen allgemeinen Explorerlink anbieten.
Die Anzahl erscheint erst mit gültiger Manifestinformation.
Keine Links auf ignorierte Identitäten.
Kein Textguide-Download für fmd.

Desktop nutzt Bereichs-, Treffer- und Detailspalte.
Br-Guide darf einen zweispaltigen Leserahmen verwenden.
Mobil folgt Detail auf die Trefferliste.
Controls sind native Links, Buttons und Selects.
Native Modifikatorklicks öffnen Links wie gewohnt.
Details sind kein Modal.
Die Palette behält ihren existierenden Dialog-/IME-Vertrag.
Überschriften sind per tabIndex=-1 fokussierbar.
Kopiererfolg nutzt eine Live-Statusmeldung.
Kopierfehler nutzt sichtbares Inlinefeedback.
Leere Suche, leere Quelle und keine Treffer sind verschieden beschriftet.
Dark/Light verwenden existierende Theme-Tokens.
Keine Tool-Theme-Farbe überschreibt Website-Tokens.
Reduced Motion und Forced Colors werden geerbt und geprüft.
Deutsch und Englisch besitzen alle app-eigenen Labels.
Quelldokumentation bleibt Originaltext.
360 px ist die minimale geplante Reflow-Prüfbreite.
Bestehende 320-px-Workbenchfälle bleiben regressionsfrei.

Veröffentlichung verlangt typecheck, lint, Modelltests und Logo-Validierung.
Zusätzlich verlangt sie validate:explorers und Produktions-Explorerprüfungen.
Playwright Preview nutzt die bestehende Vite-Preview auf Port 4180.
Tests laufen unter dem echten Pages-Subpath.
Projektabhängigkeiten werden aus package-lock über npm ci installiert.
Ein CI-Job installiert Chromium über Playwright vor UI-Prüfungen.
Das Artefakt wird erst nach erfolgreichen Prüfungen hochgeladen.
Keine neue CLI-Installation wird im CI vorausgesetzt.
Ignorierter fmd-Klartext darf diese Gates nicht rot machen.
Ein mutierter Manifest-/Quellstand muss dagegen erkannt werden.
Ein veröffentlichtes UI-Prüfresultat ist kein Live-Tool-Gesundheitsbeleg.

## J. Registryform, Snapshotherkunft und Adaptergates nach R2

Die Registry ist vollständig deklariert:

```ts
type ExplorerRegistry = {
  schema: 'cli-tool-explorer.registry.v1';
  tools: { toolId: string; fallbackName: string }[];
  datasets: DatasetRegistration[];
};
type DatasetRegistration = DatasetRef & {
  filename: string;
  format: 'json';
  adapter: AdapterId;
  title: LocalizedLabel;
};
```

tools-IDs sind eindeutig; jeder Datensatz referenziert genau eine bekannte Tool-ID.
Fallbacknamen: br Beads Rust, bv Beads Viewer, cass CASS, ee Eidetic Engine, fmd FrankenMarkdown, ubs Ultimate Bug Scanner.
Initiale Dataset-Titel DE/EN: br robot-docs Agentenleitfaden/Agent guide; br capabilities Fähigkeiten und Aufrufe/Capabilities and commands.
BV robot-docs Robot-Referenz/Robot reference; bv capabilities Aufruf- und Fähigkeitsvertrag/Command and capability contract.
Cass capabilities Fähigkeiten und Befehle/Capabilities and commands; ee capabilities Fähigkeits-Snapshot/Capability snapshot.
Fmd capabilities Rendering-Referenz/Rendering reference; ubs robot-docs Scan-Referenz/Scan reference.
Fallbacknamen sind nicht Snapshotversionen und werden nicht aus dem Katalog benötigt.
Ein Manifest wird gegen Registryidentität, filename und adapter geprüft.
Ein unbekannter oder anders gebundener Manifestdatensatz erhält ManifestRegistryMismatch.
Eine Registry darf Kandidaten enthalten, die am JSON-Gate ausscheiden.
Deshalb muss nicht jede Registrierung im Manifest stehen.
Die bindende Ignore-Regel gilt auch für registrierte vorhandene Klartextdateien.
R2-01 wird insoweit nicht übernommen: ein Ausschluss ist keine automatische Produktfehlerkarte.
Fehlende Datei bleibt MissingRegisteredFile; vorhandene nichtparsebare Datei bleibt IgnoredNonJson.
Eine valide Veröffentlichung darf ausschließlich aufgenommene Manifesteinträge zeigen.
Initiale Modelltests beweisen dennoch alle acht erwarteten Spezialadapter gegen die aktuellen Quellen.
So bleibt falsche Erstnormalisierung sichtbar, ohne die Nutzerregel zu verändern.
sync:explorers berechnet die ganze Ausgabe vor dem Ersetzen der Zieldatei.
Bei Inventar-/Registrierungsfehler bleibt das letzte Manifest unangetastet.
validate:explorers scheitert weiterhin bei fehlerhaften Eingängen; ein altes Manifest umgeht den Fehler nicht.

Snapshotwerte besitzen Sourcepointer und Presence.
Unbekannte Zeitwerte werden nicht zu Null umgedeutet; ein fehlendes Feld hat state missing.
Explizites null hat state null; ein vorhandener String state value.
Datumsinterpretation ergänzt allenfalls eine Diagnose; Originalstring und Pointer bleiben erhalten.

| Adapter | version-Pointer | contract-Pointer | generatedAt-Pointer |
| --- | --- | --- | --- |
| br-guide | /version | /contract_version | missing |
| br-capabilities | /version | /contract_version | missing |
| bv-docs | /version | missing | /generated_at |
| bv-capabilities | /version | /contract_version | /generated_at |
| cass-capabilities | /version | /contract_version | missing |
| ee-capabilities | /data/version | /schema | missing |
| fmd-capabilities | /version | /contract_version | missing |
| ubs-docs | /ubs_version | /schema_version | missing |

cass build_commit_date ist kein generatedAt.
ee index.last_full_rebuild_at ist eine Indexbeobachtung, kein Exportzeitpunkt.
bv output_format gehört in formats seiner robot-docs-Seite.
Es wird nicht mit output_formats des Capabilitydatensatzes vereinigt.
Guidezeilen sind 1-basiert und inklusive, innerhalb des dekodierten guide-Strings.
Sie sind keine physischen Zeilennummern der JSONdatei.

### Maschinennahe Shape-Regeln

Objekt bedeutet ein JSONobjekt ohne null oder Array.
string[] bedeutet Array, dessen sämtliche Elemente Strings sind, einschließlich gültigem leeren Array.
object[] bedeutet Array aus JSONobjekten; jeder Eintrag wird separat auf die verwendeten Pflichtfelder geprüft.
Record<string,string> benötigt ausschließlich Stringwerte; unbekannte Schlüssel sind zulässig.
Zusatzfelder sind grundsätzlich erlaubt und bleiben als RohJSON verfügbar.
Identitygate und Requiredshape gelten für den ganzen Spezialadapter.
Ein Identity-/Requiredfehler führt zu generic-json plus ContractShapeMismatch.
Vorhandene optionale Fachwerte werden gemäß ihrem erwarteten Typ geprüft.
Falscher optionaler Typ führt ebenfalls zu GenericFallback; missing/null bleibt Presence.
Nicht fachlich interpretierte strukturierte Bereiche werden als JsonValue unverändert geführt.
Die Registry wählt den gewünschten Adapter; es gibt kein heuristisches Durchprobieren anderer Tooladapter.

| Adapter | Identitygate | Requiredshape | Presence-/Zusatzshape |
| --- | --- | --- | --- |
| br-guide | Objekt; tool=br; contract_version=br.robot_docs.v1 | version/title/guide:string; canonical_commands:object[] mit task/command:string | line_count:number wenn vorhanden; Guideabschnitte aus Originalstring |
| br-capabilities | Objekt; tool=br; contract_version=br.capabilities.v1 | version:string; commands:object[]; name/summary:string; operation:read/write/mixed; workspace:required/optional/none; machine_output/examples:string[] | features/build_features/global_flags/output_formats/exit_codes/env_vars/safety/recommended_entrypoints als strukturierte Originalbereiche |
| bv-docs | Objekt; topic=all | version:string; commands:Objekt; jedes Commandobjekt mit flag/description:string, needs_issues/needs_git/needs_sprint/needs_baseline/mutates_state:boolean | key_fields/params:string[]; generated_at/output_format:string; guide/examples/environment_variables/exit_codes strukturierte Originalbereiche |
| bv-capabilities | Objekt; tool=bv; contract_version=1.0.0 | version:string; commands:object[] mit name/flag/description/preferred_invocation:string, accepted_invocations:string[], alle vier needs-Felder/mutates_state:boolean | key_fields/params:string[]; generated_at:string; agent_intent_aliases/docs_topics/default_robot_command/schema_command/output_formats/stream_contract/environment_variables/exit_codes als strukturierte Originalbereiche |
| cass-capabilities | Objekt; contract_version=1; api_version=1 als Zahl | version:string; commands:object[] mit name/description:string, arguments:object[], has_json_output:boolean; Argument name/description:string, arg_type:option/flag/positional, required:boolean | Argument value_type:string, default:JsonValue, enum_values:JsonValue[], repeatable:boolean, short:string; features/connectors/global_flags/exit_codes/env_vars/workflows/mistake_recoveries/limits als strukturierte Originalbereiche |
| ee-capabilities | Objekt; schema=ee.response.v2 | success:boolean; degraded:Array von JsonValue; fields:string; data:Objekt; data.version:string; commands:object[] mit name:string und available:boolean | envelope fields/error sowie data.subsystems/features/unimplemented/binaries/envOverrides/index/output/summary als strukturierte Originalbereiche |
| fmd-capabilities | Objekt; tool=fmd; contract_version=0.1.0 | version:string; commands:object[] mit name:string, examples:string[] | features:Record<string,string> wenn vorhanden; outputs:string[]; theme_model/exit_codes/pdf_running_content als strukturierte Originalbereiche |
| ubs-docs | Objekt; schema_version=1 als String; topic=all | ubs_version:string; commands:Objekt mit subcommands/flags:object[]; Subcommand name/usage/description:string; Flag name/description:string | Flag args:string oder null oder missing, example:string; guide/examples/exit_codes/formats/env als strukturierte Originalbereiche |

Alle Tabellenwerte wurden gegen die acht Quelldateien geprüft; Gates sind geplante Validierung.
Gatewerte beschreiben Vertragskennungen, nicht ständig wechselnde Toolversionsnummern.
Zusatzbereiche werden nur bei vorhandenem Wert gebaut; fehlende Bereiche erfinden keine Inhalte.
StructuredDetail verwendet ExplorerEntry.origin.pointer und Presence<JsonValue>-Rows; zusätzliche Fachlabels bleiben im Seitenentwurf definiert.
Ein rein generischer Bereich erhält Pointerentrys, damit jeder originale Scalar recherchierbar bleibt.
Fmd Featurestrings erhalten feature:<name> und Pointer /features/<escapedName>.
Ee envOverrides erhalten env:<name>, category aus dem Originaleintrag und Pointer /data/envOverrides/<index>.
Cass Argumente gehören fachlich zu ihrem Command; Filter wirken auf die Argumentliste im Commanddetail.
Die ArgType-/Requiredfilter verändern keine anderen Befehlseinträge.
Bv aliases im robot-docs-Datensatz stammen aus /guide/agent_intent_aliases.
Bv Capabilityaliases stammen aus /agent_intent_aliases.
Br canonical_commands bilden canonical-commands seiner Guidequelle, nicht die Capabilityempfehlungen.
Ubs flags stammen aus /commands/flags, Subcommands aus /commands/subcommands.
Gleichartige Bereichenamen implizieren keine datasetübergreifende Vereinigung.

### R2-Verifikationsfälle

Manifest-Retry A startet Epoch2, während Epoch1 später antwortet: Epoch1 kann keinen sichtbaren Zustand ersetzen.
Gleiche Rohbytes unter geändertem Adapter/DatasetRef liefern kein altes ViewModel aus dem RawCache.
needs=git&needs=issues&needs=git wird zu needs=issues&needs=git.
Unknown-needs wird diagnostiziert, einmalig canonicalisiert und erzeugt keinen neuen Historyeintrag.
Sectionwechsel erhält q/category/platform/sort/view/count und schließt tool wie zuvor.
Initial A, push B, Back A, Forward B restauriert beide Scroll-/Fokuszustände.
Replace auf B behält historyId.
Ein Pop während Lazyloading wartet auf genau die passende Ready-ID.
Ein veralteter Readycallback kann keine neue Ansicht fokussieren.
Initialer fremder Objektstate wird gemergt; primitiver State wird unter foreignState erhalten.
Reload mit URL und ohne Memory benötigt keine erzwungene Fokusaktion.
Popstate schreibt niemals neue Historyeinträge.

### Verifizierter CI-Anschluss

Die vorhandene .github/workflows/deploy.yml besitzt build und deploy mit needs:build.
build nutzt npmci, Typecheck/Lint/Modelltests/Logoprüfung, dann Build und Upload.
Node24 ist bereits im Workflow festgelegt.
Die Umsetzung erweitert denselben build-Job um validate:explorers und Chromiuminstallation.
Nach npm run build folgt npm run test:production mit Preview4180.
upload-pages-artifact darf erst nach allen erfolgreichen Prüfschritten laufen.
deploy bleibt needs:build; kein paralleles ungeprüftes Artefakt.
Das sind verbindlich geplante Ergänzungen des vorhandenen Jobs, keine Behauptung aktueller CIchecks.
+
## K. Fachliche Schnittstellen und Quellmapping nach R3

Jedes semantisch ausgewertete Feld muss einen expliziten Typ besitzen.
Opaque StructuredDetail bleibt für unveränderte JSONdaten zulässig.
Dort wird weder ein Livezustand noch ein kopierbarer CLIaufruf aus unbekanntem JSON geraten.
Feldlabels stammen aus Originalschlüsseln oder den festgelegten Bereichslabels.
Falsche Typen semantischer Felder ergeben ContractShapeMismatch und GenericFallback.
Die folgenden Unterbereichsgates ergänzen J; missing/null bleiben bei optionalen Bereichen Presence.
Ein vorhandener Bereich mit value muss vollständig die jeweilige Shape erfüllen.
StructuredDetail.sourceValue ist JsonValue und enthält den Originalknoten.
ExplorerEntry.origin.pointer liefert dessen Pointer.
Rows dienen zur Darstellung; sie ersetzen sourceValue nicht.
copyCommands enthält ausschließlich typgeprüfte Quellstrings oder den bezeichneten ee-Basisaufruf.

| Fachlich ausgewerteter Bereich | Erwartete Shape bei value |
| --- | --- |
| br.features | object[] mit name/description:string |
| br.build_features | Objekt mit Booleanwerten |
| br.global_flags | object[] mit flag/description:string |
| br.output_formats/recommended_entrypoints | string[] |
| br.exit_codes | object[] mit code:number, category/description:string |
| br.env_vars | object[] mit name/description:string |
| br.safety | object[] mit name/guarantee:string |
| bv.agent_intent_aliases oder guide.agent_intent_aliases | object[] mit agent_instinct/canonical:string |
| bv.examples | object[] mit command/description:string |
| bv.guide.quickstart | string[]; nur als Originalstrings kopieren |
| bv.guide.output_modes | Record<string,string>; Größenangaben bleiben Snapshotaussagen |
| bv.environment_variables/exit_codes | Record<string,string> |
| bv.docs_topics/output_formats | string[] |
| bv.default_robot_command/schema_command | string |
| bv.stream_contract | Objekt mit stdout/stderr:string |
| cass.features/connectors | string[] |
| cass.global_flags | object[] mit name/description:string, arg_type:option/flag/positional, required:boolean; übrige Argumentfelder nach CassArgumentDetail |
| cass.env_vars | object[] mit name/description:string; default als Presence<JsonValue> |
| cass.exit_codes | object[] mit code/meaning/retryable/agent_action:string; retryable nicht als Boolean interpretieren |
| cass.workflows | object[] mit name/intent/first_command/parse_contract:string und follow_up_commands:string[]; note als Presence<string> |
| cass.mistake_recoveries | object[] mit wrong/canonical/behavior:string, accepted:boolean |
| cass.limits | Objekt mit Zahlwerten; 0 ohne zusätzliche Quellbedeutung anzeigen |
| ee.subsystems | object[] mit name/status:string; status ist Snapshotstring |
| ee.features | object[] mit name:string, enabled:boolean |
| ee.unimplemented | object[] mit code/featureFlag/shipTarget/trackingBead:string |
| ee.envOverrides | object[] mit name/category/controls/source:string, isSet:boolean; defaultValue/currentValue als Presence<JsonValue> |
| ee.output.formats | object[] mit name/description:string, available/machineReadable:boolean |
| ee.output.toon/governor | opaque JsonValue; verschachtelte Originalrows ohne erfundene Booleanbadges |
| ee.output.sizeDiagnostics | opaque JsonValue; kein Live-/Performancebefund |
| ee.binaries/index/summary | opaque JsonValue mit deutlichem Snapshotlabel |
| ee.degraded | JsonValue[]; leer bedeutet gelieferte leere Degradierungsliste, nicht ein false-Boolean |
| fmd.features | Record<string,string>; exakter Statusstringfilter |
| fmd.outputs | string[] |
| fmd.theme_model/pdf_running_content | opaque JsonValue; Farben als Text, keine semantisch erfundenen Werte/Swatches |
| fmd.exit_codes | Record<string,string> |
| ubs.examples | object[] mit goal/command:string |
| ubs.env | object[] mit name/value/description:string |
| ubs.exit_codes | object[] mit code:number, meaning:string |
| ubs.guide | Objekt mit summary/golden_rule/stdout_contract:string und workflow:string[] |
| ubs.formats | Record mit JSONobjektwerten; vorhandene description/schema:string, sonst opaque Zusatzfelder |

### Eltern-/Kindmodell

ExplorerEntry besitzt optional parentEntryId:string.
ExplorerSection.entryIds enthält nur Top-Level-Einträge.
Kind-Einträge stehen ebenfalls in ExplorerDataset.entries und bleiben such-/adressierbar.
Cass arguments erhalten parentEntryId der zugehörigen Command-ID.
CassCommandDetail.argumentEntryIds enthält dieselben Kind-IDs in Quellreihenfolge.
Ein Argumenttreffer öffnet Commandkontext und fokussierbares Argumentdetail.
argType/argRequired filtern die Kindliste, nicht alle Commandeinträge.
Ein gefilterter Argumenteintrag wird geschlossen; Commandkontext kann erhalten bleiben.
Globalflags haben keinen Commandparent; sie gehören als Top-Level-Argumentdetail in flags.
Beim Root-Commandaufruf werden keine Argumentwerte ergänzt.
Ein Entry darf keinen nicht vorhandenen Parent referenzieren.
Ein Parentgraph darf keine Zyklen enthalten.
Ein Kind gehört zum selben Bereich wie sein Parent; seine Herkunft ist weiterhin der eigene Pointer.

### Vollständige Source→Section→Entry-Zuordnung

i bezeichnet Originalarrayindex, k einen originalen escaped Objektschlüssel.
Jede aufgeführte Array-/Objektzeile erzeugt Einträge nur aus tatsächlich vorhandenem Inhalt.
Die IDfallbackregel bei doppelten Namen oder Doppelpunkt gilt für alle namensbasierten IDs.

| Adapter | Quellpointer | Bereich | Entry-ID / Detail |
| --- | --- | --- | --- |
| br-guide | /guide | guide | guide:<sectionKey>, GuideDetail; konservative Headingzerlegung, sonst guide:original |
| br-guide | /canonical_commands/i | canonical-commands | ptr:<pointer>, ExampleDetail mit tasklabel und command |
| br-capabilities | /commands/i | commands | cmd:<name>, BrCommandDetail |
| br-capabilities | /features/i | features | feature:<name>, StructuredDetail |
| br-capabilities | /build_features | build | ptr:<pointer>, StructuredDetail |
| br-capabilities | /global_flags/i | flags | ptr:<pointer>, StructuredDetail |
| br-capabilities | /output_formats/i | formats | ptr:<pointer>, StructuredDetail |
| br-capabilities | /exit_codes/i | exit-codes | ptr:<pointer>, StructuredDetail |
| br-capabilities | /env_vars/i | env | env:<name>, StructuredDetail |
| br-capabilities | /safety/i | safety | ptr:<pointer>, StructuredDetail |
| br-capabilities | /recommended_entrypoints/i | entrypoints | ptr:<pointer>, ExampleDetail |
| bv-docs | /commands/k | commands | cmd:<k>, BvCommandDetail |
| bv-docs | /guide/agent_intent_aliases/i | aliases | ptr:<pointer>, StructuredDetail plus canonical copy |
| bv-docs | /examples/i | examples | ptr:<pointer>, ExampleDetail |
| bv-docs | /guide | guide | ptr:<pointer>, StructuredDetail inklusive typgeprüftem quickstart |
| bv-docs | /output_format | formats | ptr:<pointer>, eigener StructuredDetail |
| bv-docs | /guide/output_modes | formats | ptr:<pointer>, eigener StructuredDetail |
| bv-docs | /environment_variables/k | env | env:<k>, StructuredDetail |
| bv-docs | /exit_codes/k | exit-codes | ptr:<pointer>, StructuredDetail |
| bv-capabilities | /commands/i | commands | cmd:<name>, BvCommandDetail |
| bv-capabilities | /agent_intent_aliases/i | aliases | ptr:<pointer>, StructuredDetail plus canonical copy |
| bv-capabilities | /docs_topics/i | topics | ptr:<pointer>, StructuredDetail; kein nicht vorhandener Datasetlink |
| bv-capabilities | /default_robot_command, /schema_command | entrypoints | je ptr:<pointer>, ExampleDetail |
| bv-capabilities | /output_formats/i | formats | ptr:<pointer>, StructuredDetail |
| bv-capabilities | /stream_contract | streams | ptr:<pointer>, StructuredDetail |
| bv-capabilities | /environment_variables/k | env | env:<k>, StructuredDetail |
| bv-capabilities | /exit_codes/k | exit-codes | ptr:<pointer>, StructuredDetail |
| cass-capabilities | /workflows/i | workflows | workflow:<name>, StructuredDetail plus gelieferte Aufrufe |
| cass-capabilities | /commands/i | commands | cmd:<name>, CassCommandDetail |
| cass-capabilities | /commands/i/arguments/j | commands | arg:<commandName>:<name>, CassArgumentDetail als Kind |
| cass-capabilities | /global_flags/i | flags | ptr:<pointer>, CassArgumentDetail ohne Parent |
| cass-capabilities | /features/i | features | ptr:<pointer>, StructuredDetail |
| cass-capabilities | /connectors/i | connectors | ptr:<pointer>, StructuredDetail |
| cass-capabilities | /env_vars/i | env | env:<name>, StructuredDetail |
| cass-capabilities | /exit_codes/i | exit-codes | ptr:<pointer>, StructuredDetail |
| cass-capabilities | /mistake_recoveries/i | recoveries | ptr:<pointer>, StructuredDetail plus canonical copy |
| cass-capabilities | /limits/k | limits | ptr:<pointer>, StructuredDetail |
| ee-capabilities | /data/commands/i | commands | cmd:<name>, EeCommandDetail |
| ee-capabilities | /data/subsystems/i | subsystems | ptr:<pointer>, StructuredDetail |
| ee-capabilities | /data/features/i | features | feature:<name>, StructuredDetail |
| ee-capabilities | /data/unimplemented/i | unimplemented | ptr:<pointer>, StructuredDetail |
| ee-capabilities | /data/envOverrides/i | env | env:<name>, StructuredDetail plus validierte category |
| ee-capabilities | /data/output | output | ptr:<pointer>, StructuredDetail |
| ee-capabilities | /success, /degraded, /fields, /error, /data/binaries, /data/index, /data/summary | snapshot | je vorhandener Pointer, StructuredDetail |
| fmd-capabilities | /commands/i | commands | cmd:<name>, ExampleDetail mit Originalbeispielen |
| fmd-capabilities | /outputs/i | outputs | ptr:<pointer>, StructuredDetail |
| fmd-capabilities | /features/k | features | feature:<k>, StructuredDetail |
| fmd-capabilities | /theme_model | theme | ptr:<pointer>, StructuredDetail |
| fmd-capabilities | /pdf_running_content | pdf-running-content | ptr:<pointer>, StructuredDetail |
| fmd-capabilities | /exit_codes/k | exit-codes | ptr:<pointer>, StructuredDetail |
| ubs-docs | /guide | guide | ptr:<pointer>, StructuredDetail |
| ubs-docs | /commands/subcommands/i | commands | cmd:<name>, StructuredDetail plus usage |
| ubs-docs | /commands/flags/i | flags | ptr:<pointer>, StructuredDetail plus example |
| ubs-docs | /examples/i | examples | ptr:<pointer>, ExampleDetail |
| ubs-docs | /formats/k | formats | ptr:<pointer>, StructuredDetail plus vorhandener schema-Aufruf |
| ubs-docs | /exit_codes/i | exit-codes | ptr:<pointer>, StructuredDetail |
| ubs-docs | /env/i | env | env:<name>, StructuredDetail |
| generic-json | jedes Scalarleaf | json | ptr:<pointer>, GenericDetail |

### Universeller JSON-Quellenbereich

Alle Spezialadapter ergänzen einen Bereich json für vollständige Rohquellenrecherche.
Dort erzeugt jedes Scalarleaf einen GenericDetail-Eintrag mit ID raw:<pointer>.
Das vermeidet IDkollisionen mit fachlichen ptr:-Einträgen.
Der generische Adapter verwendet weiterhin ptr:<pointer>.
Die universellen Quelleinträge werden getrennt von fachlichen Befehls-/Argumentmengen gezählt.
Zusatzfelder bleiben damit vollständig suchbar, adressierbar und sichtbar.
Die Fachsuche und Quellensuche teilen docQ, Trefferzahlen bleiben bereichslokal.
Keine JSONsource wird als HTML ausgeführt.
RawJSON ist keine zweite Datasetseite und keine zweite Quelldatei.

### ee-Gruppierung und verbindlicher P09-Vertrag

Gruppen sind die 112 ersten durch Leerzeichen getrennten Pfadsegmente der aktuellen 557 Namen.
Eine hierarchische Unterliste kann weitere Segmente nutzen, behält aber Originalindex und vollständigen Namen.
Gruppenknoten erzeugen keine zusätzlichen Commandentries.
available ist ein erforderliches Boolean; false ist eine echte Snapshotbeobachtung.
missing/null/falscher Typ führt vor Fachansicht zu GenericFallback.
Die aktuelle Fixture enthält 556 true und mcp serve-stdio=false.
130 envOverrides liefern 14 Quellkategorien.
Copy gibt ausschließlich ee plus Leerzeichen plus vollständigen name aus.
Keine zusätzlichen Argumente erfinden.
success ist Boolean; degraded ist JsonValue[]; error ist optionaler originaler JsonValue.
Gefilterte Listen verbinden docQ und available/envCategory als UND im jeweils anwendbaren Bereich.
docCount startet 48, wächst um48 und bleibt in URL.
Ein zukünftiger P09-Bead muss diese Regeln, Gatematrix, exakte sieben Fachbereiche plus json und gemeinsame Typen direkt enthalten.
Ein bloßer Dokumentlink ersetzt diese Definitionen nicht.

### Gemeinsame UI-Schnittstelle und Dateiverantwortung

P06 besitzt ToolExplorer, ExplorerDetails und den gemeinsamen Datasetrahmen.
P07 besitzt src/components/explorer/BrBvExplorer.tsx.
P08 besitzt src/components/explorer/CassExplorer.tsx.
P09 besitzt src/components/explorer/EeExplorer.tsx.
P10 besitzt src/components/explorer/FmdUbsExplorer.tsx.
Jedes Familienmodul exportiert denselben DatasetViewProps-Vertrag.
Props: dataset, rawJson, resolvedNavigation, onNavigate, onReady, locale.
Der vollständige Props-/Action-Vertrag steht im nachfolgenden TypeScriptblock.
onNavigate erhält zentrale NavigationAction, niemals eine selbst gebaute URL.
onReady erhält das passende historyId/Navigationticket und wird erst nach Mount des Fokusziels gemeldet.
P06 legt die vier Familienmodule zunächst mit einer vollständig nutzbaren gemeinsamen JSON-/Listenansicht an.
Diese Basismodule liefern echten Inhalt und keinen vorgetäuschten Fachstatus.
P07–P10 ersetzen danach ausschließlich ihr eigenes Modul durch die detaillierte Fachansicht.
Die statische Dispatchliste steht schon in P06, daher braucht kein Familienpaket gemeinsame Shelländerungen.
P03 besitzt tests/explorer-adapters.test.ts; P04 tests/explorer-loader.test.ts.
P01/P02 besitzen sequenziell tests/explorer-model.test.ts.
P06 besitzt tests/explorer-ui.spec.ts mit gemeinsamen Zuständen.
P07–P10 besitzen je explorer-br-bv-ui, explorer-cass-ui, explorer-ee-ui, explorer-fmd-ubs-ui.spec.ts.
P12 führt alle diese Specs plus workbench-ui.spec.ts im Produktionsbuild aus.
Alle gemeinsamen Vertragsänderungen werden vor parallel bereiten Paketen abgeschlossen.

```ts
type ExplorerFilters = {
  operation: 'all' | 'read' | 'write' | 'mixed';
  workspace: 'all' | 'required' | 'optional' | 'none';
  machineOutput: string; // all oder Quellformat
  needs: ('issues' | 'git' | 'sprint' | 'baseline')[];
  mutates: 'all' | 'yes' | 'no';
  jsonOutput: 'all' | 'yes' | 'no';
  available: 'all' | 'yes' | 'no';
  envCategory: string; // all oder Quellkategorie
  featureStatus: string; // all oder exakter Quellstatus
  argType: 'all' | 'option' | 'flag' | 'positional';
  argRequired: 'all' | 'yes' | 'no';
};
type ResolvedExplorerNavigation = {
  ref: DatasetRef;
  sectionId: string | null;
  entryId: string | null;
  docQ: string;
  docCount: number;
  filters: ExplorerFilters;
  navigationTicket: string;
};
type ExplorerNavigationAction =
  | { type: 'tool'; toolId: string }
  | { type: 'dataset'; ref: DatasetRef }
  | { type: 'section'; sectionId: string }
  | { type: 'entry'; entryId: string }
  | { type: 'close-entry' }
  | { type: 'search'; value: string }
  | { type: 'filters'; value: ExplorerFilters }
  | { type: 'more'; docCount: number };
type DatasetViewProps = {
  dataset: ExplorerDataset;
  rawJson: JsonValue;
  resolvedNavigation: ResolvedExplorerNavigation;
  onNavigate: (action: ExplorerNavigationAction) => void;
  onReady: (navigationTicket: string) => void;
  locale: 'de' | 'en';
};
```

navigationTicket kombiniert historyId mit monotoner Navigationssequenz.
Ein replace behält historyId, erzeugt aber eine neue Sequenz für Ready-/Raceprüfung.
P05 besitzt Action→Navigationstate, Transitionreset und Push/Replaceentscheidung.
Familienansichten senden Actions, ändern History/URL jedoch niemals selbst.
P06 übernimmt Manifest-/Datasetauflösung und übergibt erst ready-Modelle an die Views.

### Ausführbarer mobiler Tastaturweg

Bei DE und EN,320und360px: Suche fokussieren, Text eingeben, Filter setzen, Treffer öffnen.
Detailüberschrift erhält Fokus mit preventScroll beziehungsweise gezieltem Sichtbarmachen.
Close restauriert den stabilen Auslöser; Back restauriert Historyfokus/Scroll.
Mehr anzeigen bleibt über Tastatur erreichbar und erhält nach Aktion Fokus.
Kein horizontaler Pageoverflow und keine verschachtelten Scrollkäfige.
ee-Gruppen verwenden native verschachtelte Listen mit Disclosurebuttons und aria-expanded.
Kein role=tree ohne vollständiges Treeviewkeyboardmodell.
Live-Region meldet Trefferzahl nach abgeschlossener Filterung; keine Ansage jeder Rohzeile.


## L. URL-Resolver und ausführbare npm-Verträge nach R4

ParsedExplorerFilters enthält syntaktisch begrenzte rohe Querystrings und string[] für needs.
Er enthält keine Behauptung einer bereits validierten dynamischen Filterdomain.
ExplorerFilters ist ausschließlich der resolved Zustand nach Registry-/Datasetprüfung.
Syntaktisch zu lange Filter werden als invalid-filter markiert und vor Anwendung neutralisiert, nicht zu einem anderen gültigen Filter abgeschnitten.
Ein Resolver liefert Diagnosen und needsReplace; Canonicalisierung erfolgt einmal pro normalisierter URL.
Canonicalisierung nach pop ist zu unterlassen: Pop liest ohne Historywrites; die neutralisierte Ansicht bleibt dort mit Hinweis, bis eine explizite Nutzeraktion die URL serialisiert.
Toolbezogene Links und Datasetzahlen entstehen nur aus einem validierten Manifest.
Die Registry liefert dafür Fallbacknamen und deklarierte Bindungen, keine Aufnahmewahrheit.
Deshalb lädt App das gemeinsame Manifest unabhängig vom Katalog; Datensatzbytes bleiben ausschließlich bei Auswahl lazy.

```ts
type ParsedExplorerFilters = {
  operation: string;
  workspace: string;
  machineOutput: string;
  needs: string[];
  mutates: string;
  jsonOutput: string;
  available: string;
  envCategory: string;
  featureStatus: string;
  argType: string;
  argRequired: string;
};
type FilterDiagnostic = {
  code: 'invalid-filter';
  parameter: keyof ParsedExplorerFilters;
  reason: 'syntax' | 'domain' | 'not-applicable';
};
type ExplorerResolution =
  | { kind: 'index' }
  | { kind: 'tool'; toolId: string; datasets: ManifestEntry[] }
  | { kind: 'dataset'; navigation: ResolvedExplorerNavigation;
      diagnostics: FilterDiagnostic[]; needsReplace: boolean }
  | { kind: 'error'; code: 'invalid-route' | 'unknown-tool' | 'unknown-dataset'
      | 'unknown-section' | 'unknown-entry' };
```

Die synchron geparste Navigation führt ParsedExplorerFilters.
Der asynchrone Resolver darf niemals rohe ungültige Werte in DatasetViewProps.filters durchreichen.
needs-Syntax ist wiederholter Parameter; feste Enumreihenfolge und UND bleiben unverändert.
Defaultfilter all werden aus kanonischen URLs weggelassen; leere needs wird vollständig entfernt.
P06 wartet auf P03/P04/P05, damit Fachadapter, Loader und Navigation beim Shellabschluss vorliegen.
P06 besitzt zusätzlich src/explorer.css als gemeinsames Stylesheet; Familienpakete ändern es nicht.
P06 besitzt gemeinsame DE-/EN-Explorerlabels in src/i18n/explorerLabels.ts; Familienansichten verwenden diese oder eigene lokale LocalizedLabel-Literale.
Familien-spezifische Darstellung nutzt dessen vorhandene gemeinsame Layout-/Tabellen-/Badge-/Disclosureklassen.
P11 darf vorhandene Theme-/Fokustokens in src/catalog-visuals.css ergänzen, erzeugt keine konkurrierenden Explorerregeln.

Vorgesehene package.json-Skripte, durch P01/P12 umzusetzen:

```json
{
  "sync:explorers": "node scripts/build-explorer-manifest.mjs",
  "validate:explorers": "node scripts/build-explorer-manifest.mjs --check",
  "test:explorers": "node --test tests/explorer-model.test.ts tests/explorer-adapters.test.ts tests/explorer-loader.test.ts",
  "test:model": "node --test tests/workbench-model.test.ts tests/explorer-model.test.ts tests/explorer-adapters.test.ts tests/explorer-loader.test.ts",
  "test:production": "PLAYWRIGHT_PREVIEW=1 playwright test tests/workbench-ui.spec.ts tests/explorer-ui.spec.ts tests/explorer-br-bv-ui.spec.ts tests/explorer-cass-ui.spec.ts tests/explorer-ee-ui.spec.ts tests/explorer-fmd-ubs-ui.spec.ts"
}
```

P01 legt sync/validate und Lifecycle fest; Testlisten dürfen vor Existenz der P03/P04-Dateien noch nicht ausgeführt werden.
P12 setzt die vollständigen test:model/test:explorers/test:production-Listen; Vorgänger führen ihre eigenen existierenden Tests gezielt aus.
predev/prebuild kombinieren sync:catalog && sync:explorers; build bleibt tsc -b && npm run validate:explorers && vite build.
Ein fehlendes Checkmanifest schlägt fehl; Sync ist eine explizite Erzeugungsaktion.
P12 installiert Chromium mit npx playwright install --with-deps chromium.
Alle sechs Produktionsspecs müssen vor upload-pages-artifact erfolgreich sein.
