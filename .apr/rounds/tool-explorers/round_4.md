# Oracle Browser Transcript

Conversation: https://chatgpt.com/c/6acba366-f2bc-83ed-bb64-e5ba7321c5db

## Prompt

Vollständiger Planungsworkflow R4: sorgfältig das gesamte Planpaket implementation/contracts/tasks/6Seitenentwürfe gegen Analyse+Code prüfen. R3integriert: Abschnitt K liefert semantische Unterbereichsgates, Source→Section→Entry aller8Adapter, cassParentchild, StructuredDetail.sourceValue, exakte DatasetViewProps/NavigationAction, vier dateiseitig separate Fachmodule/-Tests. P06 legt deren funktionierende generische Basissichten an und besitzt zentrale Dispatchliste, P07–10 brauchen keine Shelländerungen. Lokale Quellenchecks: BVkey_fields/params optional, ee.degraded Array und fields String, cass default/enum JsonValue. R3 las teils davorliegende Fassung; diese Gates sind korrigiert. fmdFeaturestatus-/brAusgabeformatfilter bewusst erhalten und als featureStatus/machineOutput vollständignormiert; bitte nicht grundlosfeaturesstreichen. Zusatzfelder über universellen json-Quellenbereich raw:<pointer> recherchierbar, keine zweite Datasetseite. KlartextJSON immerignored/nichtaufgenommen, registriertpresentnonparse ebenfallsignored; fehlend/unregistriertvalid sind eigeneFehler. Schwerpunkt vollständig selbstständige spätereBeads, DAG+Dateigrenzen, widersprüchliche Typen/Mapping/filter/historyaktionen, konkrete Produkt-/CIabnahme. AlteTaskkurztexte stehen unter dem präzisenK-Vertrag; dennoch alle konkreten widersprüchlichen Stellen benennen. Bitte diffbare gezielte Korrekturen mitBegründung und abschließend Konvergenz-/Readyurteil; keineBackendToolausführung Builder. Keine neuenOptionalfeatures. Antwort<=2000Wörter. Falls keine materiellenBlocker explizit sagen. Beads werden erst nach Reviewkonvergenz erstellt und enthalten benötigte Vertragsdefinitionen direkt.

## Answer

# R4-Urteil: **REVISE – hohe Konvergenz, aber noch nicht Bead-ready**

R3 hat die fachliche Ebene wesentlich stabilisiert. Insbesondere sind die semantischen Unterbereichsgates, Cass Parent/Child, `StructuredDetail.sourceValue`, die vollständige Source→Section→Entry-Zuordnung, der universelle `raw:<pointer>`-Bereich und der gemeinsame `DatasetViewProps`-/`ExplorerNavigationAction`-Vertrag jetzt belastbar definiert. `machineOutput` und `featureStatus` sind fachlich sauber begründet und sollen **unverändert erhalten bleiben**. attachments-bundle attachments-bundle

Ich sehe noch **6 materielle, aber eng begrenzte Planblocker**. Keiner verlangt Architekturwechsel, Backend, Toolausführung, Builder oder neue Produktfeatures.

1. **P06-DAG und Dateigrenzen sind noch nicht konsistent mit K.** K verlangt, dass P06 alle vier Familienmodule zunächst funktionsfähig anlegt und die zentrale Dispatchliste besitzt; der Task reserviert diese vier Dateien aber nicht. Außerdem nennt der Hauptplan P03 als Zulieferer für P06, während der Task-DAG P06 nur von P04/P05 abhängig macht. Ohne P03 existieren die acht Spezialadapter noch nicht; damit kann P06 die aktuellen registrierten Adapter nicht zuverlässig in seine funktionsfähigen Basissichten dispatchen. attachments-bundle attachments-bundle

```diff
- P06 Blockiert durch: P04, P05.
+ P06 Blockiert durch: P03, P04, P05.

  P06 Dateiverantwortung:
+ src/components/explorer/BrBvExplorer.tsx
+ src/components/explorer/CassExplorer.tsx
+ src/components/explorer/EeExplorer.tsx
+ src/components/explorer/FmdUbsExplorer.tsx
+ <ein exakt benanntes gemeinsames Explorer-Stylesheet>
```

Zusätzlich sollte P05 von P02 abhängen, **wenn** die K-Typen wie vorgesehen in `src/types/explorer.ts` liegen. Dadurch sind `ExplorerFilters`, Actions und Props vorhanden, bevor P05 sie verwendet. Das ergibt den sauberen DAG `P01 → P02 → {P03,P04,P05} → P06 → {P07,P08,P09,P10,P11} → P12`. P01 bleibt die einzige initial Ready-Aufgabe.

2. **P01 und P11 besitzen nicht alle Dateien, die ihre eigene Acceptance zwingend verändert.** P01 verlangt `resolveJsonModule`, npm-Lifecycleänderungen, einen gemeinsam genutzten `.mjs`/`.d.mts`-Validator und das versionierte Manifest, reserviert aber nur vier andere Dateien. attachments-bundle Der aktuelle `package.json` besitzt diese Explorer-Skripte noch nicht. attachments-bundle

```diff
  P01 Dateiverantwortung:
+ package.json
+ tsconfig.app.json
+ public/robot-docs.manifest.json
+ src/data/explorerRegistryValidation.mjs
+ src/data/explorerRegistryValidation.d.mts
```

Der konkrete Name des Shared-Validators kann anders lauten, muss aber **vor Bead-Erzeugung feststehen**. Ebenso benötigt P11 für „Karten, Karten+ und Tabelle“ mindestens die tatsächlich zu ändernden `ToolCards.tsx`-/`ToolTable.tsx`-Dateien; `src/i18n` sollte als Verzeichnisreservierung durch konkrete Datei(en), mindestens `src/i18n/translations.ts`, ersetzt werden. P11 fordert diese Oberflächen ausdrücklich, seine jetzige Dateiliste umfasst sie aber nicht. attachments-bundle

3. **Presence-Regel und alte Registry-Link-Aussage widersprechen sich noch.** Der Hauptplan sagt einerseits korrekt, dass das Manifest die tatsächliche Aufnahme bestimmt, erlaubt unmittelbar danach aber Tool-Einstiegslinks aus der Registry. Bei einem künftig **registrierten, vorhandenen, aber nichtparsebaren** einzigen Dataset würde das einen Tool-Link auf etwas erzeugen, das bewusst nicht öffentlich aufgenommen wurde. attachments-bundle P11 besitzt bereits die richtige Fassung: Toolziele erst aus dem validierten Manifest. attachments-bundle

```diff
- Tool-Einstiegslinks dürfen aus der Registry entstehen.
+ Der allgemeine Explorer-Einstieg darf statisch existieren.
+ Tool-spezifische Explorer-Einstiege entstehen ausschließlich aus dem
+ validierten Manifest. Die Registry liefert dafür nur Fallbackidentität.
```

Damit ist die Nutzerregel vollständig geschlossen: nonparseable → ignored, auch registriert; missing registered → Fehler; valid unregistered → `UnexpectedInventoryFile`.

4. **K widerspricht noch zwei älteren Mappingstellen.** Erstens enthält Tabelle E bei allen Spezialadaptern **kein `json`**, während K verbindlich jedem Spezialadapter genau diesen Bereich hinzufügt. Das ist für `docSection=json` ein realer Resolverkonflikt. attachments-bundle attachments-bundle

```diff
- br-guide | guide, canonical-commands
+ br-guide | guide, canonical-commands, json
...
+ bei allen acht Spezialadaptern `json` ergänzen
```

Zweitens vermischt die BV-Zeile `/output_format` mit `guide.output_modes` in demselben `StructuredDetail`. Das verletzt K selbst: `origin.pointer` und `sourceValue` sollen den Originalknoten dieses Entries repräsentieren. attachments-bundle

```diff
- /output_format | formats | StructuredDetail; output_modes zusätzliche Originalrows
+ /output_format | formats | eigener StructuredDetail
+ /guide/output_modes | formats | eigener StructuredDetail
```

So bleiben Pointer, `sourceValue` und Rohherkunft eindeutig.

5. **Parsed URL-State und resolved Filter-State müssen typseitig getrennt werden.** K definiert `ExplorerFilters` bereits als vollständig gültigen resolved Zustand. Der URL-Vertrag verlangt gleichzeitig, unbekannte/dynamische Werte zunächst zu erhalten, zu diagnostizieren und erst nach Quellenauflösung einmalig zu canonicalisieren. Besonders `machineOutput`, `envCategory` und `featureStatus` können synchron noch nicht gegen ihre Domain validiert werden. attachments-bundle attachments-bundle

```diff
+ ParsedExplorerFilters: begrenzte rohe URL-Strings/string[]
  ExplorerFilters: ausschließlich validierte/resolved Werte

+ ResolverResult führt invalid-filter/Neutralisierungsdiagnosen.
+ Erst ResolvedExplorerNavigation enthält ExplorerFilters.
```

Zusätzlich fehlt beim **Toolwechsel** der explizite Reset `docCount=48`; beim Datasetwechsel ist er bereits vorgesehen. Sonst kann ein Toolwechsel beispielsweise `docCount=10000` übernehmen.

```diff
- Toolwechsel: Dataset/Bereich/Eintrag/Suche/Filter zurücksetzen.
+ Toolwechsel: Dataset/Bereich/Eintrag/Suche/Filter zurücksetzen;
+ docCount = 48.
```

6. **CI-/Testabnahme ist noch nicht ausführbar genug formuliert.** P12 spricht von „beiden Modelltestdateien“, tatsächlich plant K `workbench-model`, `explorer-model`, `explorer-adapters` und `explorer-loader`; zusätzlich existieren fünf neue Explorer-Playwright-Specs. K verlangt ausdrücklich deren gemeinsamen Produktionslauf. attachments-bundle Der aktuelle `test:model` führt nur `workbench-model` und `test:production` nur `workbench-ui` aus. attachments-bundle

```diff
+ "test:explorers": "node --test tests/explorer-model.test.ts tests/explorer-adapters.test.ts tests/explorer-loader.test.ts"
- "test:model": "node --test tests/workbench-model.test.ts"
+ "test:model": "node --test tests/workbench-model.test.ts tests/explorer-model.test.ts tests/explorer-adapters.test.ts tests/explorer-loader.test.ts"

- test:production = workbench-ui allein
+ test:production = workbench-ui + explorer-ui +
+   explorer-br-bv-ui + explorer-cass-ui + explorer-ee-ui + explorer-fmd-ubs-ui
```

Der bestehende Workflow ist dafür passend erweiterbar: ein `build`-Job, Upload erst danach und `deploy.needs=build`; es braucht keinen zweiten Publishpfad. attachments-bundle

### Konkret zu den älteren Seiten-/Tasktexten

P08/Task Punkt 7 ist eindeutig veraltet: „Konfiguration, Quellen, Recovery, Health und Outputverträge eigene Bereiche“ widerspricht der verbindlichen Cass-Bereichsliste `workflows, commands, flags, features, connectors, env, exit-codes, recoveries, limits`. Er sollte ersatzlos durch diese exakte Liste ersetzt werden. attachments-bundle

Auch `cass.md` muss bei zukünftigen Dateien „vorhanden **und als valides JSON explizit registriert**“ sagen; bloße Dateipräsenz reicht nach dem Inventarvertrag nicht. Außerdem sollte die Formulierung `--name`/`--name <Wert>` nicht als quellenautoritatives Syntaxfragment erscheinen, sofern dieser konkrete String nicht geliefert wird. Der Entwurf schließt einen Builder selbst bereits korrekt aus. attachments-bundle

Für die späteren selbstständigen Beads würde ich außerdem P07 ausdrücklich `machineOutput` und P10 ausdrücklich den exakten `featureStatus`-Stringfilter hineinkopieren. Das sind **keine neuen Features**, sondern vorhandener normativer Scope. Die Filter sind im Vertrag bereits vollständig legitimiert. attachments-bundle

## Konvergenz

**Facharchitektur: konvergiert.**
**Ignore-/Presence-Modell: konvergiert, nach der einen Registry-Link-Korrektur widerspruchsfrei.**
**Adapter-/Requiredshape-Modell: konvergiert.**
**A11y/mobile Grundvertrag: ausreichend konkret.**
**Bead-Selbstständigkeit/DAG/Dateigrenzen und ausführbare CI-Abnahme: noch nicht konvergiert.**

Daher lautet R4 **REVISE**. Es verbleiben die oben genannten **6 materiellen Blocker**; sie sind sämtlich planinterne Präzisierungen. Nach deren Integration sehe ich derzeit **keinen Bedarf für eine neue Produktentscheidung oder Scope-Erweiterung**. R5 kann dann sinnvoll als reine Konsistenz-/Konvergenzprüfung dienen, bevor die Beads erzeugt werden.
