# Selbstständige Arbeitspakete: JSON-Erkundung

Stand: 2026-10-11. Verbindliche Ergänzung zum [Implementierungsplan](../tool-explorers-implementation.md) und [Vertragskatalog](contracts.md).

Dieses Dokument enthält die Umsetzungspakete. Umsetzung ist noch nicht gestartet. Nach abgeschlossener Planverfeinerung wurden zwölf Beads mit denselben Abhängigkeiten angelegt. Eigene verhaltensbezogene Tests gehören zu jeder Umsetzung. Die tatsächlichen IDs stehen in handoff.md.

## P01: Registry und deterministisches Manifest

Blockiert durch: Planabschluss.

Dateiverantwortung:

- `src/data/explorerRegistry.json`
- `src/data/explorerRegistry.ts`
- `scripts/build-explorer-manifest.mjs`
- `tests/explorer-model.test.ts`
- `src/types/explorer.ts`
- `src/data/explorerRegistryValidation.mjs`
- `src/data/explorerRegistryValidation.d.mts`
- `package.json`
- `tsconfig.app.json`
- `public/robot-docs.manifest.json`

Verbindlicher Umfang und Abnahme:

1. Registry mit acht Einträgen und sechs Toolidentitäten anlegen; br/bv capabilities und robot-docs, cass/ee/fmd capabilities, ubs robot-docs.
2. Registry und Manifest als separate Verträge behandeln: Registry deklariert Kandidaten, Manifest enthält nur tatsächlich aufgenommenes JSON.
3. Alle regulären .json-Kandidaten zuerst mit fatalem UTF-8-Decoder und JSON.parse prüfen; unparsebarer Klartext wird ignoriert.
4. fmd.robot-docs.json unverändert auf Platte belassen, aber keinen Registry-Eintrag und keinen öffentlichen Diagnose-/Downloadlink erzeugen.
5. Fehlende registrierte Dateien sind Fehler; vorhandene nichtparsebare registrierte Kandidaten werden ignoriert.
6. Unregistriertes parsebares JSON ist UnexpectedInventoryFile; weder zufällige Seiten noch stiller Publish entstehen.
7. Symlinks, unsichere Basenames, doppelte Dateinamen und doppelte Tool-/Dataset-Paare ablehnen.
8. SHA-256 und Byteanzahl aus Rohbytes bestimmen; feste Feldreihenfolge, Codepoint-Sortierung und genau ein LF verwenden.
9. Manifest außerhalb des Quellordners unter public/robot-docs.manifest.json erzeugen.
10. Node-Generator und Browserwrapper müssen dieselben Registry-Prüfregeln verwenden; als reine .mjs-Funktion plus .d.mts-Vertrag teilen.
11. Für Browser-JSONimport resolveJsonModule in tsconfig.app.json aktivieren; Node-Tests Registry über fs lesen statt inkompatible TS-JSONimporte zu erzwingen.
12. sync:explorers schreibt; validate:explorers prüft ohne Mutation. Veraltetes Manifest muss bei der Prüfung scheitern.
13. predev/prebuild erhalten sync:catalog und ergänzen Manifest-Erzeugung; build ergänzt die strikte Prüfung.
14. Zwei Generatorläufe müssen byteidentisch sein; eingefügte Klartextdatei muss Manifestbytes unverändert lassen.
15. Fixtures decken skalare JSON-Roots, null, ungültiges UTF-8, kaputte Syntax, fehlende Dateien und Traversal ab.

Begründung: Eine explizite Registry verhindert unbeabsichtigte Veröffentlichung; das JSON-Gate setzt die Nutzerentscheidung auch für spätere Dateien durch.

## P02: ViewModels, Herkunft und generischer Reader

Blockiert durch: P01.

Dateiverantwortung:

- `src/types/explorer.ts`
- `src/data/explorerAdapters.ts`
- `tests/explorer-model.test.ts`

Verbindlicher Umfang und Abnahme:

1. Gemeinsame diskriminierte Typen aus contracts.md übernehmen, nicht Fachwerte als Record<string, unknown> verstecken.
2. Presence missing/null/value erhalten; false, null, 0 und leere Strings dürfen nicht durch Truthiness verschwinden.
3. RFC-6901-Pointer mit ~0 und ~1 erzeugen und auf die Originalquelle zurückauflösen.
4. Jeder Eintrag braucht id, sectionId, title, searchText, origin und typisierte details.
5. Identitäten datensatzlokal behandeln; zwei Quellen mit gleichem Befehlsnamen dürfen nicht verschmelzen.
6. Doppelte natürliche Namen mit stabiler Pointer-Ergänzung eindeutig machen und diagnostizieren.
7. Generic JSON unterstützt Objekte, Arrays, Strings, Zahlen, Boolean und null als Root.
8. Scalar-Leaves iterativ indexieren; Rekursion darf tiefe gültige Quellen nicht unlesbar machen.
9. Suchtext enthält Pointer und originalen Scalar-Wert; Suche ist Plaintext ohne Benutzerregex.
10. Generic-Modell erhält stabile Quellreihenfolge und unterstützt begrenzte Ergebnis-/Unterbaumprojektionen ohne rekursiven JS-Stack.
11. Vollständige Rohdaten bleiben für P06 verfügbar; UI-Paginierung, DOMtiefe und Download sind P06-Abnahme.
12. Zusatzfelder bekannter Verträge bleiben über Rohansicht und generische Felder zugänglich.
13. Unknown-contract sowie inkompatible Pflichtfelder ergeben ready-generic und eine präzise Adapterdiagnose.
14. Tests prüfen Pointerauflösung, identische Namen, tiefe Struktur, Escaping und fehlend/null/false/0.

Begründung: Ein gemeinsames typisiertes Modell erlaubt dieselben Such-/Herkunfts-/Fehlerregeln, ohne fachliche Unterschiede aus den Snapshots zu löschen.

## P03: Acht reine Fachadapter

Blockiert durch: P02.

Dateiverantwortung:

- `src/data/explorerAdapters.ts`
- `tests/explorer-adapters.test.ts`

Verbindlicher Umfang und Abnahme:

1. Adapter müssen React-/Fetch-frei bleiben und JSONwerte in die Detailunion normalisieren.
2. Vertragskennung plus tatsächlich verwendete Feldtypen prüfen; Dateiname allein reicht nie.
3. br-guide: br.robot_docs.v1, guide und canonical_commands; acht kanonische Aufgaben erhalten.
4. br-capabilities: br.capabilities.v1, 46 commands; read/write/mixed, Workspace, Output und Beispiele erhalten.
5. bv-docs: commands-Objekt unter topic all; Pointer nutzen Objektschlüssel.
6. bv-capabilities: commands-Array, tool bv und Version 1.0.0; preferred/accepted/canonical-alias unterscheiden.
7. cass-capabilities: contract 1 und api_version 1; 47 Befehle und 314 Argumenteinträge vollständig abbilden.
8. cass Flags nicht aus Enumwert true interpretieren; null/0-Limits ohne ausdrücklich belegte Bedeutung anzeigen.
9. ee-capabilities: ee.response.v2-Envelope; success/degraded/error und data fachlich getrennt behandeln.
10. ee 557 Pfade und 112 Gruppen erhalten; Gruppenknoten sind keine zusätzlichen Befehle.
11. fmd-capabilities: tool fmd und Contract 0.1.0; Featurestrings und Theme-/PDFdaten unverändert.
12. ubs-docs: schema_version 1/topic all; Subcommandusage, Flags, Scan-/Output-/Exitverträge separat.
13. Bereichs- und Entry-IDs exakt nach contracts.md; Filterdomains aus demselben normierten Modell ableiten.
14. Suchindex umfasst die jeweiligen Fachfelder der Seitenentwürfe und Zusatzfelder, ohne Quelltexte umzuschreiben.
15. Tests gegen alle acht echten Snapshots plus beschädigte Vertragsfixtures und erwartete Mengensummen.

Begründung: Quelltreue Normalisierung trennt Darstellung vom Format und vermeidet das Erfinden von CLIverhalten.

## P04: Transport, Integrität und Wiederholung

Blockiert durch: P01, P02.

Dateiverantwortung:

- `src/data/loadExplorer.ts`
- `tests/explorer-loader.test.ts`

Verbindlicher Umfang und Abnahme:

1. Eine katalogunabhängige gemeinsame Manifest-Lade-API bereitstellen; Datensatzbytes ausschließlich bei Auswahl laden.
2. Validierte Manifestbasenames und BASE_URL bestimmen URLs; Queryparameter liefern keine Pfade.
3. HTTPstatus, ArrayBufferlänge und SHA-256 zuerst prüfen, danach fatal UTF-8 und JSONparse.
4. RawCache nach Filename+Digest; ViewModelCache zusätzlich nach Tool/Dataset/Adapter; manifestEpoch und Request-ID binden jede sichtbare Antwort.
5. AbortController beim Auswahlwechsel abbrechen und zusätzlich monotone Request-ID prüfen.
6. StrictMode setup/cleanup/setup muss funktionieren; abgebrochener alter Fetch darf keinen neuen Fehler setzen.
7. Fehlerklassen transport/integrity/decode/parse erhalten; ready-generic ist ein erfolgreicher JSONzustand.
8. Retry beginnt mit Manifestfetch cache:no-cache und lädt danach Quelle mit Digestquery.
9. Bei Manifestwechsel alte Datasetidentität neu auflösen; fehlender Eintrag bleibt unbekannte Route.
10. Ein unverändertes CDNintegritätsproblem bleibt sichtbar, ohne Hashprüfung abzuschalten.
11. Originalbytes für Downloads erhalten und keine ViewModelserialisierung als Original ausgeben.
12. BlobURL nach Verwendung freigeben; MIME application/json;charset=utf-8 unabhängig von HTTPheader.
13. Quellen und Metadaten gemeinsam versionieren, keine alte Datenansicht mit neuer Provenienz anzeigen.
14. Kontrollierte Fetchfixtures prüfen 404, falschen Hash, falsche Länge, Decoder-/Syntaxfehler und Retrywechsel.
15. Deferred Promises prüfen A→B-Auswahl und verspätete A-Antwort ohne B-Überschreibung.

Begründung: Statische CDNassets können unterschiedliche Deploystände besitzen; Integritätsprüfung und Requestidentität verhindern vermischte oder verspätete Daten.

## P05: Zentrale URLnavigation und History

Blockiert durch: P01, P02.

Dateiverantwortung:

- `src/data/workbench.ts`
- `src/App.tsx`
- `tests/workbench-model.test.ts`
- `tests/workbench-ui.spec.ts`

Verbindlicher Umfang und Abnahme:

1. Section um explore erweitern; parseNavigation bleibt synchron und führt keinen Fetch aus.
2. exploreTool/dataset/docSection/entry/docQ/docCount sowie Fachfilter explizit modellieren.
3. q/tool/category bleiben Katalogzustand; envCategory und docQ dürfen sie nicht ersetzen.
4. IDs syntaktisch begrenzen und unbekannte IDs bis zum asynchronen Resolver erhalten.
5. Serializer entfernt ausschließlich Explorer-owned Parameter beim Verlassen von explore.
6. Fremde Parameter bleiben erhalten; Reset setzt docCount=48 und entry leer bei Such-/Filteränderung.
7. Tool-/Dateiwechsel setzt Detail/Bereich/Suche/Filter zurück; Bereichswechsel erhält Suche.
8. Tool mit einer aufgenommenen Datei canonicalisiert per replace zur Datasetseite.
9. Historyursache initial/push/replace/pop und eigene Entry-ID einführen.
10. Eigene Historydaten unter cliToolRegistryWorkbenchV1 speichern und fremde Statefelder erhalten.
11. Vor push aktuellen Scroll/Fokus per replace sichern; neue Auswahl erzeugt neue History-ID.
12. Scroll/Fokus pro Entry im Speicher aktualisieren, ohne Storagewrite bei jedem Scrollereignis.
13. history.scrollRestoration manual setzen und vorherigen Wert beim Unmount restaurieren.
14. LazyReady-Ticket verhindert Fokus auf einen inzwischen verlassenen Screen.
15. Pop stellt Scroll/Fokus nach Zielmount mit preventScroll wieder her; pauschalen Section-Scroll-Effekt entfernen.
16. Node-Roundtrips plus echte Browser-Back/Forward, langsamer Chunk, Skiplink und Ctrl-/Meta-Klick prüfen.

Begründung: URLzustand allein restauriert keinen Browserfokus; explizite Historyursachen erhalten die bestehenden Navigationserwartungen.

## P06: Erkundungsindex und gemeinsamer Screen

Blockiert durch: P03, P04, P05.

Dateiverantwortung:

- `src/components/ToolExplorer.tsx`
- `src/components/ExplorerDetails.tsx`
- `src/App.tsx`
- `tests/explorer-ui.spec.ts`
- `src/components/explorer/BrBvExplorer.tsx`
- `src/components/explorer/CassExplorer.tsx`
- `src/components/explorer/EeExplorer.tsx`
- `src/components/explorer/FmdUbsExplorer.tsx`
- `src/explorer.css`
- `src/i18n/explorerLabels.ts`

Verbindlicher Umfang und Abnahme:

1. Explorer als Lazy-Screen unter bestehender ScreenBoundary/Suspense integrieren.
2. Explorer darf bei fehlendem oder defektem Katalogsnapshot unabhängig laden.
3. Index zeigt nur manifestaufgenommene Quellen: initial sechs Tools und acht Datensätze.
4. Zwei Quellen eines Tools erhalten Toolübersicht; eine Quelle wird per replace canonicalisiert.
5. Manifest-/Datasetresolver getrennt von synchronem URLparser implementieren.
6. Unknown Tool/Dataset/Bereich/Entry zeigt passende Rücklinks und keine falsche Standardauswahl.
7. Lade-, Transport-, Integritäts-, Decoder-, Parse- und generische Erfolgszustände unterscheiden.
8. Retry für Manifest/Datensatz separat vom bestehenden Chunkreload anbieten.
9. Provenienzblock enthält filename, Digest, Bytes und ausschließlich quelllokale Version/Zeit.
10. Katalogidentität ergänzt optional Namen/Logo, ohne Snapshotfelder zu überschreiben.
11. Detailauswahl ist eine normale Ansicht, kein Modal; Desktopspalte und mobile Reihenfolge beachten.
12. Such-/Filterleerzustand von leerer Quelle und leerem Bereich unterscheiden.
13. Filterreset fokussiert Suche; jeder Tastendruck darf keinen Fokuswechsel auslösen.
14. Rohdarstellung als Reacttext und mark-Segmente; niemals HTML aus JSON interpretieren.
15. UItests: Explorer bei Katalog404, Manifest404, unbekannter Route, Generic JSON und Retry.
16. Familienmodule mit funktionierender gemeinsamer Reader-/Listenansicht und DatasetViewProps anlegen; zentrale Dispatchliste gehört allein zu P06.
17. Generic-Ansicht zeigt initial docCount=48 und erweitert gemäß URLzustand.
18. JSONbaum rendert höchstens 20 DOMebenen; tiefere Knoten öffnen einen Unterbaum als neue Readerwurzel.
19. Rohpreview auf 20000 Zeichen begrenzen; Originaldownload bleibt vollständig.
20. P04-Manifest-API beim App-Mount unabhängig vom Katalog starten, ohne Datensatzbytes zu laden.

Begründung: Dokumentation ist ein unabhängiges Asset und muss auch bei einem Katalogfehler erforschbar bleiben.

## P07: br- und bv-Fachansichten

Blockiert durch: P03, P06.

Dateiverantwortung:

- `src/components/explorer/BrBvExplorer.tsx`
- `tests/explorer-br-bv-ui.spec.ts`

Verbindlicher Umfang und Abnahme:

1. Je Tool zwei eigene Datasetseiten; Quellwechsel darf keine Guide-/Capabilitydaten mischen.
2. br-Guide in Originalabschnitte mit Pointer und Zeilenbereich zerlegen.
3. br-capabilities Operationsmatrix mit read/write/mixed und Workspaceabhängigkeit darstellen.
4. Fehlende Beispiele als solche zeigen; keinen Aufruf aus Kombinationen erfinden.
5. bv Voraussetzungen in needs-Filtern und sichtbaren Badges darstellen.
6. preferred, accepted und canonical-alias jeweils eigene Beschriftung und Herkunft.
7. Pipelinebeispiele unverändert kopieren, nicht pauschal zu jq- oder CLIvarianten umformen.
8. Mutation/JSONausgabe im Detail nur anzeigen, wenn im Snapshot vorhanden.
9. Bereichstrefferzahlen folgen derselben Suche und Filterlogik wie Ergebnisliste.
10. Mehrfach-needs bedeutet alle ausgewählten Voraussetzungen, nicht beliebiger Treffer.
11. CommandBlock inklusive zugänglichem Clipboardfehlerfeedback wiederverwenden.
12. Quelltext beim Highlighting nicht verändern; Kopie muss originalen Aufruf erhalten.
13. Links zwischen den beiden Dateien sind explizite URLs und erhalten kein altes entry.
14. Mobil ausgewählten Eintrag sichtbar fokussieren, ohne Suchfeldinteraktion zu unterbrechen.
15. UItests prüfen mixed, Gitvoraussetzung, leere Beispiele, beide Quellen und Clipboardablehnung.
16. machineOutput filtert exakt dokumentierte machine_output-Formate zusätzlich zu operation/workspace und Suche.

Begründung: br/bv liefern jeweils zwei fachlich verschiedene Snapshots; getrennte Seiten erhalten Versionen und Aufrufherkunft.

## P08: cass-Fachansicht

Blockiert durch: P03, P06.

Dateiverantwortung:

- `src/components/explorer/CassExplorer.tsx`
- `tests/explorer-cass-ui.spec.ts`

Verbindlicher Umfang und Abnahme:

1. 47 Befehle und 314 Argumenteinträge separat als fachliche Einträge anbieten.
2. Argumentidentität enthält Befehl plus Argument; gleiche Flags anderer Befehle nicht verschmelzen.
3. Argumenttyp/required mit argType/argRequired filtern und als Textbadge anzeigen.
4. Enumwerte, Default, Limits und Beschreibungen behalten ihren Presencezustand.
5. Flags erhalten keinen künstlichen Wertparameter aus enum true.
6. Globale Optionen, Fähigkeiten, Connectoren, Konfiguration, Exitcodes, Recoveries und Limits in den normativ definierten Bereichen zeigen.
7. Konfiguration, Quellen, Recovery, Health und Outputverträge eigene Bereiche.
8. Lokale Pfade bleiben Beispieldaten und werden nicht als aktuell verfügbare Dateien behauptet.
9. JSONausgabe nur mit Quellbeleg kennzeichnen.
10. Null-/Nullroot-/0-Grenzen ohne erfundene Bedeutung darstellen.
11. Quelle/pointer im Argumentdetail zeigt direkt den tatsächlichen Rawwert.
12. Suchindex findet vollständige Befehle, Argumentnamen und Recoverybeschreibungen.
13. Filterreset und Bereichswechsel folgen dem zentralen Navigationsvertrag.
14. DE/EN übersetzen UIlabels, erhalten aber technische Originaldokumentation.
15. Tests prüfen Argumentpointer, enum true, 0-Limit, Workflow und Recoverytreffer.

Begründung: Argumente brauchen eigene Identität und Presencewerte, damit Null/Flag/Enumgrenzen keine falschen CLIaufrufe erzeugen.

## P09: ee-Pfadatlas und Snapshotdetails

Blockiert durch: P03, P06.

Dateiverantwortung:

- `src/components/explorer/EeExplorer.tsx`
- `tests/explorer-ee-ui.spec.ts`

Verbindlicher Umfang und Abnahme:

1. 557 vollständige Befehlspfade, 112 Gruppen und anfänglich 48 Listentreffer anzeigen.
2. Gruppenbildung darf Originalreihenfolge/-index nicht verlieren.
3. Bei aktiver Suche ganze Pfade flach darstellen statt nur Gruppennamen.
4. Verfügbarkeit beschreibt Snapshotbeobachtung und keinen aktuellen Maschinenstatus.
5. available ist ein erforderliches Boolean; false bleibt Snapshotwert, missing/null/falscher Typ erzeugt GenericFallback.
6. Envelopeerfolg, degraded und error sichtbar voneinander trennen.
7. mcp serve-stdio und andere mehrteilige Pfade als vollständige Identität darstellen.
8. Subsysteme/Config/Env/Output in ihren vorgesehenen Bereichen zeigen.
9. envCategory ist unabhängig von Katalogcategory.
10. Lokale Envwerte und Dateipfade als gelieferte Beobachtungen kennzeichnen.
11. Gruppenknoten sind Navigation, keine erfundenen Commandentries.
12. Nach Mehranzeigen docCount in URL behalten; Suchwechsel setzt wieder 48.
13. Detailpointer muss den Originaleintrag exakt auswählen, auch bei gleichen Segmentnamen.
14. P09 erzeugt oder registriert keine Paletteeinträge für 557 ee-Pfade; Tool-only-Paletteintegration und positive Abnahme gehören P11.
15. Tests prüfen letzte Pfade, Gruppensumme, Suche, available=false und degraded-Envelope.

Begründung: Ein großer Pfadatlas benötigt begrenzte DOMmenge und vollständige Pfadsuche, ohne Snapshotbeobachtung als Livezustand auszugeben.

## P10: fmd- und ubs-Fachansichten

Blockiert durch: P03, P06.

Dateiverantwortung:

- `src/components/explorer/FmdUbsExplorer.tsx`
- `tests/explorer-fmd-ubs-ui.spec.ts`

Verbindlicher Umfang und Abnahme:

1. fmd besitzt nur capabilities als Dataset; robot-docs ist unbekannt und wird nicht gefetcht.
2. Featurestatus bleiben originale Strings, keine Booleanampel aus beliebigem Text.
3. Themes im Snapshot sind Tooldaten und verändern die Website-Theme nicht.
4. PDF-/Exportbeispiele original kopieren; keine echte Rendering-/Exportfunktion bauen.
5. fmd Beispielsprache und Quelle unverändert erhalten.
6. ubs usage von Flagreferenz und Subcommands unterscheiden.
7. null als Flagargument bedeutet keinen Wertparameter und bleibt nullbelegt.
8. Scan-/Outputverträge und Exitcodes als Dokumentation kennzeichnen.
9. Exit3/partial niemals als erfolgreich bestandenen Scan darstellen.
10. Keine lokale Scanausführung und keine erfundenen Scanresultate.
11. Fachfilter nur dort anbieten, wo der Adapter eine valide Domain liefert.
12. Querverweise führen nur zu aufgenommenen JSONquellen.
13. Rawansicht/Originaldownload behalten Bytes und JSONsyntax.
14. Mobile Detailreihenfolge und Clipboardfeedback wie bei anderen Fachseiten.
15. Tests prüfen fmd eineSeite, ignoredroute ohneFetch, Featurestrings, ubs nullflag/partial/Exit3.
16. featureStatus filtert exakt den vorhandenen Statusstring im Bereich features; UND mit docQ, nicht als Boolean interpretieren.

Begründung: Fmd und UBS benötigen ihre eigenen Datenbegriffe; dieselbe Shell erzwingt keine unpassenden Toolausführungsfunktionen.

## P11: Katalog, Palette, Sprache und Theme

Blockiert durch: P06.

Dateiverantwortung:

- `src/components/CommandPalette.tsx`
- `src/components/ToolDetails.tsx`
- `src/components/WorkbenchOverview.tsx`
- `src/i18n/translations.ts`
- `src/App.tsx`
- `tests/explorer-ui.spec.ts`
- `src/components/ToolCards.tsx`
- `src/components/ToolTable.tsx`
- `src/components/AppCard.tsx`
- `src/catalog-visuals.css`

Verbindlicher Umfang und Abnahme:

1. Hauptnavigation und Palette um Erkunden ergänzen.
2. Allgemeiner Palettebereich steht auch vor Manifestfetch bereit.
3. Toolziele und Datasetanzahlen erst aus dem erfolgreich validierten Manifest ableiten.
4. Statische Registry allein beweist keine Aufnahme, da registriertes KlartextJSON ignoriert werden kann.
5. Tool-Einstiegslinks und numerische Datasetanzahl ausschließlich aus dem validierten Manifest anbieten.
6. ToolDetails, Karten, Karten+ und Tabelle verwenden dieselbe Identitäts-/Linkfunktion.
7. Keine Katalogsnapshotstruktur ändern und keinen erneuten Katalogexport voraussetzen.
8. Fremde KatalogtoolIDs ohne Explorerregistrierung bekommen keine erfundene Dokumentationsquelle.
9. Palettenergebnislimit, Escape, Keyboardselection und IMEkomposition erhalten.
10. Native Linkmodifier müssen neueTabs erlauben und dürfen nicht blind preventDefault nutzen.
11. Alle UItexte DE/EN, technischen Snapshottext unverändert lassen.
12. Documenttitle folgt Tool/Dataset und aktivem Locale.
13. Bestehende Theme-/Fokustokens, ReducedMotion und ForcedColors verwenden.
14. DE zuerst bei320und360px prüfen, lange Wörter und Pfade dürfen keinen Horizontaloverflow erzeugen.
15. Tests prüfen alle Katalogdarstellungen, Katalog404, ignoredcount, Palettekeyboard und Localewechsel.

Begründung: Ein gemeinsamer Manifestvertrag verhindert Zählungs-/Linkabweichungen, und die vorhandenen UIverträge sichern vertraute Bedienung.

## P12: Produktionsprüfung und CI-Veröffentlichungsgate

Blockiert durch: P07, P08, P09, P10, P11.

Dateiverantwortung:

- `package.json`
- `.github/workflows/deploy.yml`
- `playwright.config.ts`
- `tests/explorer-ui.spec.ts`
- `tests/workbench-ui.spec.ts`

Verbindlicher Umfang und Abnahme:

1. test:model führt Workbenchmodell plus Explorer-Modell/Adapter/Loader aus; test:production alle sechs vorhandenen und neuen Specs.
2. Explorer-UI in test:production integrieren und gegen tatsächliches dist unter Pagesbasis testen.
3. CI nutzt npmci, Node24 und explizit installierten PlaywrightChromium mit Hostdependencies.
4. Typecheck, lint, beide Modelltests, validate:logos und validate:explorers als Pflichtchecks.
5. Productionbuild vor Playwrightpreview4180; Upload/Deploy erst nach erfolgreicher Produktions-UIprüfung.
6. Alle vorhandenen Workbenchbereiche einschließlich CatalogLab/Dependencies auf Regression prüfen.
7. Neue generische registrierte JSONfixture demonstriert Erweiterbarkeit ohne Adapterumbau.
8. Zusätzliche Klartextdatei muss öffentliche Anzahl/Manifest/Palette/Search unverändert lassen.
9. BASE_URL für Manifest, Quellen, Logos und Lazyassets unter /CliToolRegistry.Web/ verifizieren.
10. Directqueryreload, BackForward, langsamer Chunk und CDNdigestkonflikt im Browser prüfen.
11. Axeprüfung ergänzt sichtbaren Keyboard-/Fokus-/Contrastcheck statt diese zu ersetzen.
12. DE/EN, Dark/Light,320/360px, ReducedMotion und ForcedColors abdecken.
13. Playwright final allein ausführen, keine gemeinsamen test-results-Races erzeugen.
14. Prüfergebnis nennt höchste bewiesene Schicht: lokale Tests, Build, CI und Deployment getrennt.
15. Keine Versions-/CLIgenerierung im CI und keine Snapshotmutation als Testnebenwirkung.

Begründung: Ein erfolgreicher Devserver beweist weder Pagespfade noch den ausgelieferten Produktionsbuild; das CIgate prüft die tatsächlich veröffentlichten Artefakte.

## Übergabe- und Prüfregeln

Jeder Bead enthält den Produktvertrag, eigene Schritte, benötigte gemeinsame Typen und Quellregeln als vollständigen Text. Ein bloßer Verweis auf dieses Dokument genügt nicht.

Die Abhängigkeiten werden als gerichtete blockers eingetragen, nicht aus Tabellenreihenfolge oder Epiczugehörigkeit abgeleitet.

Alle Pakete bleiben bei Erstellung open. Die Planung schließt keine Implementierungsaufgabe und beansprucht kein in_progress.

P01 ist die einzige erste Readyaufgabe; P12 konsumiert die fachlichen Ansichten und Integration als finale Veröffentlichungsprüfung.

P03/P04/P05 enthalten eigene Modelltests; P07–P11 enthalten UItests. P12 ergänzt den Produktionsnachweis statt fehlende Tests nachzuholen.

Anwendungsimplementierung und Deployment sind spätere Arbeit; Planabschluss und Trackeranlage belegen keine fertigen Seiten.


## Eigene ausführbare Checks

Alle Implementierungspakete führen npm run typecheck und npm run lint aus, anschließend ihre eigene verhaltensbezogene Prüfung:

| Paket | Eigene Prüfung |
| --- | --- |
| P01/P02 | node --test tests/explorer-model.test.ts; P01 zusätzlich sync:explorers und validate:explorers |
| P03 | node --test tests/explorer-adapters.test.ts |
| P04 | node --test tests/explorer-loader.test.ts |
| P05 | node --test tests/workbench-model.test.ts; npx playwright test tests/workbench-ui.spec.ts |
| P06 | npx playwright test tests/explorer-ui.spec.ts |
| P07 | npx playwright test tests/explorer-br-bv-ui.spec.ts |
| P08 | npx playwright test tests/explorer-cass-ui.spec.ts |
| P09 | npx playwright test tests/explorer-ee-ui.spec.ts |
| P10 | npx playwright test tests/explorer-fmd-ubs-ui.spec.ts |
| P11 | npx playwright test tests/explorer-ui.spec.ts |
| P12 | alle exakten Modell-/Productionlisten aus contracts.md L nach Produktionsbuild |

P06 besitzt gemeinsame DE-/EN-Explorerlabels in src/i18n/explorerLabels.ts. Familienpakete verwenden diese Labels und können zusätzliche lokale LocalizedLabel-Literale in ihrem eigenen Modul ergänzen. Sie ändern keine globalen Übersetzungsdateien parallel. P11 besitzt nur die Workbench-/Palettenintegration in translations.ts.
