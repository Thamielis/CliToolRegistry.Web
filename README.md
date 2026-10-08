# CLI Tool Registry Web

Eine deutschsprachige Weboberfläche für die Werkzeuge aus
[In-Pro-Org/CliToolRegistry](https://github.com/In-Pro-Org/CliToolRegistry).
Die Oberfläche ist mit Vite, React und TypeScript erstellt und wird über GitHub
Pages veröffentlicht.

## Datenquelle und Aktualisierung

Die kanonischen YAML-Dateien liegen im Registry-Repository unter
`src/CliToolRegistry/Data/Tools/`. `npm run sync:catalog` liest alle
Katalogdateien ein und erstellt `public/registry-catalog.json`. `npm run dev`
und `npm run build` führen diesen Abgleich automatisch aus, wenn das
CliToolRegistry-Repository unter `../CliToolRegistry` liegt. Ein anderer Pfad
kann über `CLI_TOOL_REGISTRY_PATH` gesetzt werden.

Die Website lädt den erzeugten Katalog beim Start und beim manuellen Neuladen
und hält den letzten erfolgreichen Stand im Browsercache. Der Export ist Teil
der veröffentlichten Website und damit für deren Besucher sichtbar.

Der GitHub-Pages-Workflow prüft alle sechs Stunden auf einen neuen Stand in
CliToolRegistry. Dafür muss im Web-Repository das Secret
`CLI_TOOL_REGISTRY_READ_TOKEN` mit lesendem Zugriff auf das private
CliToolRegistry-Repository hinterlegt sein. Ohne dieses Secret verwendet der
Workflow den zuletzt gespeicherten Export; lokal aktualisiert `npm run sync:catalog`
den Export aus dem benachbarten Repository.

Die Oberfläche ist standardmäßig Deutsch; Englisch kann über den Sprachschalter
gewählt werden. Beschreibungen und Befehle werden in der Originalsprache des
Registry-Katalogs angezeigt.

## Darstellung und Bedienung

Neue Besucher starten im dunklen Theme mit Glow-Akzenten und der erweiterten
Ansicht **Karten+**. Über die Schalter stehen auch die kompakte Kartenansicht,
die Tabelle sowie ein helles oder systemabhängiges Theme zur Verfügung.
Theme und Darstellung bleiben im Browser gespeichert; Suche und Filter bleiben
beim Wechsel der Darstellung erhalten.

Karten+ zeigt kopierbare Befehle und eine Installationsplattform pro Werkzeug.
Ein globaler Plattformfilter bestimmt auch die angezeigten Installationsbefehle.
Details öffnen direkt an der Karte; Escape oder „Details schließen“ führt den
Tastaturfokus zum auslösenden Schalter zurück. Die Seite führt keine Befehle aus.

Design und Interaktionsregeln sind in [DESIGN.md](DESIGN.md) und
[UX-CONTRACT.md](UX-CONTRACT.md) dokumentiert.

## Entwicklung

```sh
npm install
npm run dev
```

## Katalog manuell aktualisieren

```sh
npm run sync:catalog
```

## Build

```sh
npm run build
```

## Deployment

Ein Push auf `main` startet [.github/workflows/deploy.yml](.github/workflows/deploy.yml)
und veröffentlicht den Build auf GitHub Pages.

## UI-Prüfungen

```sh
npx playwright install chromium
npm run test:ui
npm run lint
```

Die Browserprüfungen verwenden reproduzierbare Katalogdaten für Interaktionen
und den vollständigen lokalen Katalog für Desktop- und Mobilaufnahmen.
Sie prüfen Themes, Ansichten, Filter, Plattformbefehle, Kopierfeedback,
Tastaturfokus, Fehlerbehandlung, Cache, responsive Darstellung und
automatische Barrierefreiheitsregeln in beiden Themes.
Screenshots und Fehler-Traces liegen im ignorierten Verzeichnis `test-results/`.
