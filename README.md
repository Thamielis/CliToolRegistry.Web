# CLI Tool Registry Web

Eine deutsch- und englischsprachige Weboberfläche zum Erkunden der Werkzeuge
aus [In-Pro-Org/CliToolRegistry](https://github.com/In-Pro-Org/CliToolRegistry).
Der Registry-Katalog liefert Namen, Beschreibungen, Plattformen, Befehle,
Abhängigkeiten, Profile und verknüpfte Hilfe- und Referenzdaten.

## Was du hier tun kannst

- **Katalog:** Werkzeuge suchen, filtern und vergleichen. Eine Werkzeugansicht
  bündelt Beschreibung, Plattformen, Befehle, Abhängigkeiten und verfügbare
  Hilfe- oder Referenzdaten. Datenstände und technische Quellenangaben stehen
  in einer eingeklappten Quellinformation.
- **Arbeitsbereich:** Werkzeuge lokal ergänzen oder korrigieren, neue
  Definitionen erfassen, Sammlungen anlegen und JSON- oder YAML-Dateien
  importieren. Schemafehler und fehlende Referenzen werden an der Definition
  angezeigt. Gültige Ergänzungen erscheinen auch im Katalog.
- **Profile:** Mitgelieferte CliToolRegistry-Profile erkunden, kopieren oder
  eigene Profile aus vorhandenen und lokalen Werkzeugen zusammenstellen.
  Erforderliche und empfohlene Werkzeuge sowie Vererbung, Plattformen und
  Verwaltungsmodus lassen sich prüfen und als YAML exportieren.
- **Anleitung:** Bedienung, verfügbare Inhalte und Exportmöglichkeiten
  nachschlagen.

Sammlungen lassen sich als Registry-Profil exportieren. Der Arbeitsbereich kann
als Sicherung heruntergeladen und später wieder importiert werden. Lokale
Änderungen bleiben im Browserspeicher dieses Geräts, bis du sie exportierst;
die Website schreibt nicht zurück in das Registry-Repository. Die Seite führt
keine Befehle aus.

Die normale Ansicht zeigt Informationen, die beim Erkunden eines Werkzeugs
helfen. Quelldateinamen, Hashes, Zeitstempel, Dateigrößen und Quellpfade sind
nur in den erweiterten Quellinformationen sichtbar. Die WebApp ist eine
statische React/Vite-Anwendung.

## Katalogdaten aktualisieren

Die kanonischen YAML-Dateien liegen im CliToolRegistry-Repository unter
`src/CliToolRegistry/Data/Tools/`. `npm run sync:catalog` liest Kataloge,
Profile und Schemata ein und erzeugt die JSON-Dateien für die Website.
`npm run dev` und `npm run build` führen den Abgleich automatisch aus, wenn
das Registry-Repository unter `../CliToolRegistry` liegt. Ein anderer Pfad
kann über `CLI_TOOL_REGISTRY_PATH` gesetzt werden; die angezeigte Quell-Ref
lässt sich mit `CLI_TOOL_REGISTRY_REF` wählen. Der Quell-Commit wird aus dem
aktuellen HEAD des Registry-Repositories ermittelt.

Der GitHub-Pages-Workflow synchronisiert regelmäßig den `develop`-Stand der
CliToolRegistry. Dafür muss das Secret `CLI_TOOL_REGISTRY_READ_TOKEN` mit
lesendem Zugriff auf das private Registry-Repository gesetzt sein. Ohne das
Secret verwendet der Workflow die gespeicherten JSON-Dateien.

## Entwicklung

Node.js 24 wird für lokale Entwicklung und CI verwendet.

```sh
npm install
npm run dev
```

Zum Aktualisieren der lokalen Katalog-, Profil- und Schemadateien:

```sh
npm run sync:catalog
```

Der Produktionsbuild erstellt die statische Website unter dem GitHub-Pages-
Unterpfad:

```sh
npm run build
```

Weitere Interaktions- und Darstellungsregeln stehen in [DESIGN.md](DESIGN.md)
und [UX-CONTRACT.md](UX-CONTRACT.md). Der GitHub-Pages-Workflow veröffentlicht
den Build nach einem Push auf `main`.
