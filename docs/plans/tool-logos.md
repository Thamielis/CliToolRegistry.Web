# Tool-Logos wieder anzeigen

Stand: 2026-10-08. **Planung, keine Implementierung.**

## Ziel und Befund

Kompakte Karten und Karten+ sollen das jeweilige Tool-Logo zeigen. Die Tabelle und der Detailkopf erhalten dieselbe visuelle Identität in passenden Größen. Dark/Glow, Layout und bestehende Bedienung bleiben erhalten.

Aktuell rendert `src/components/ToolCards.tsx` ausschließlich `>_`. Die frühere Komponente `AppIcon.tsx` wird noch von `AppCard.tsx` und `AppRow.tsx` genutzt. Sie verwendet eine explizite HTTP-Icon-Adresse oder den Google-Favicon-Dienst anhand der Website-Domain. Relative lokale Icon-Pfade werden dort bislang nicht als Bild behandelt; der Fehlerzustand wird bei einer Quellenänderung nicht zurückgesetzt.

Der aktuell geprüfte Export enthält **89 Tools, keine `icon`-/`logo`-Angaben**, 84 Websites und 69 Repository-Verweise. Bei **48 Tools** ist bereits die Website eine GitHub-Adresse. Ein Website-Favicon würde dort den Hosting-Anbieter abbilden, nicht das Projekt. Fünf Tools haben weder Website noch Repository: `apr`, `caam`, `casr`, `rch`, `source2prompt`.

## Entscheidung

**Lokal ausgelieferte, kuratierte Logos mit einer expliziten Zuordnung nach Tool-ID.** `AppIcon` wird als gemeinsamer Renderer wiederverwendet. Ein transparent dokumentierter Ersatz deckt Tools ohne belegbares eigenes Logo ab.

| Ansatz | Bewertung |
|---|---|
| Google-Favicons erneut aktivieren | Einfach, aber für GitHub-Projekte häufig die falsche Identität; externe Laufzeitabhängigkeit. |
| Logos bei jedem Seitenaufruf aus Websites/READMEs ermitteln | Zu unbeständig für einen statischen Katalog; erzeugt zusätzliche Zugriffe und Fehlerfälle. |
| Ausschließlich ein Icon-Paket verwenden | Geeignet für einige bekannte Marken, deckt spezialisierte Tools nicht verlässlich ab. |
| Lokale Assets + Tool-ID-Manifest | Gewählt: überprüfbare Identität, reproduzierbare Auslieferung und keine externen Logo-Anfragen im Browser. |

Die begrenzte Erweiterung nutzt den planning-workflow in seinem kleinen, lokalen Anwendungsfall. Es wird kein neues Projektframework eingeführt. Beads, Änderung des Registry-Repositories, Commit, Push und Veröffentlichung gehören nicht zu dieser Planung.

## Quellen und Auswahl

Reihenfolge bei der Beschaffung:

1. Eigenes Projektlogo aus offiziellen Branding-Seiten oder aus dem eindeutig zum Tool gehörenden Repository.
2. Passendes, verifiziertes Markenlogo aus Simple Icons, wenn kein geeigneter offizieller Download vorliegt.
3. Bewusst zugeordnetes Produktfamilienlogo, etwa für Docker CLI/Buildx/Desktop, mit dokumentierter Familienzuordnung.
4. Expliziter Text-/Initialen-Ersatz, wenn kein geeignetes Logo belegt werden kann.

Ein GitHub-Organisationsavatar oder ein Logo der zugrunde liegenden Technologie gilt nicht automatisch als Logo eines Tools. Beispielsweise bekommt ein Projekt namens `frankenjax` nicht allein aufgrund seines Namens das JAX-Logo. Ein wiederholtes GitHub-Logo ist kein akzeptabler Projektlogo-Ersatz.

Simple Icons stellt SVGs und Herkunftsinformationen bereit; einzelne Icons haben eigene Hinweise, die bei der Auswahl übernommen werden. Deshalb wird nicht pauschal die Paketlizenz als Freigabe aller enthaltenen Marken behandelt. Siehe [Simple Icons README](https://github.com/simple-icons/simple-icons#usage) und [Disclaimer](https://github.com/simple-icons/simple-icons/blob/develop/DISCLAIMER.md).

**Nicht behauptet:** Dass für alle 89 Tools bereits ein eigenes Logo gefunden wurde. Die Umsetzung muss die unten beschriebene Abdeckungsmatrix erstellen und die verbleibenden Ersatzfälle ausweisen.

## Geplante Architektur

### 1. Assets und Manifest

- `public/tool-logos/`: geprüfte SVG-/PNG-/WebP-Dateien. Bevorzugt quadratische Bildmarken ohne lange Wortmarke; Animationen werden nicht übernommen.
- `src/data/toolLogos.ts`: explizites Manifest nach stabiler `tool.id`. Ein Eintrag enthält den relativen Assetpfad und optional eine abweichende Dark-/Light-Datei oder eine benötigte neutrale Hintergrundfläche.
- `docs/tool-logo-sources.md`: vollständige Tabelle aller aktuellen Tool-IDs mit Status `project-logo`, `family-logo` oder `fallback`, Quellen-URL, konkreter Version/Commit soweit verfügbar, lokalem Assetpfad und relevanten Nutzungs-/Attributionshinweisen.
- Gemeinsame Produktfamilien teilen eine Assetdatei; jede Tool-ID bleibt explizit zugeordnet. Neue unbekannte IDs erhalten automatisch den Ersatz, bis ihr Manifest ergänzt wird.
- Assetpfade werden über `import.meta.env.BASE_URL` aufgelöst. Kein hart codiertes `/tool-logos/...`: Das Deployment erfolgt unter `/CliToolRegistry.Web/`.

Das Manifest liegt bewusst im Web-Repository: Es beschreibt Darstellung und Asset-Herkunft, während der Registry-Katalog die Werkzeugdaten weiterhin besitzt. `sync:catalog` darf die Zuordnung nicht überschreiben. Weder der Export noch das `CliTool`-Schema muss für diese erste Umsetzung verändert werden.

SVGs werden als geprüfte lokale Dateien über `<img>` eingebunden, nicht als ungeprüftes Inline-Markup. Bei der Aufnahme werden Skripte, externe Ressourcen, unnötige Metadaten und aktive Inhalte ausgeschlossen. Downloads werden während der Asset-Pflege vorgenommen; Build und Browser benötigen dafür keinen externen Logo-Dienst.

### 2. Gemeinsames AppIcon

`AppIcon` behält den Prop-Namen `app`, nimmt jedoch die strukturelle Identität `{ id, name, icon?: string }` an. Dadurch können sowohl `CliTool` als auch die bisherigen `AppEntry`-Aufrufer dieselbe Komponente verwenden, ohne künstliche lokalisierte Felder zu erzeugen. Der optionale Legacy-Wert erhält eine explizite Migrationsregel:

- Der aktuelle Export enthält keine Icon-Werte. Die Repository-Suche fand keine befüllten `icon:`-Werte in `src`, `public`, `tests` oder `scripts`; AppCard/AppRow sind die vorhandenen Legacy-Aufrufer, werden jedoch nicht von der aktuellen App eingebunden.
- Ein absichtlich gewählter einfacher Text-/Emoji-Wert bleibt als Ersatz erhalten, wenn kein Manifestlogo geladen werden kann. URL-/Pfadwerte werden niemals als sichtbarer Ersatztext ausgegeben.
- Früher explizit angegebene Remote- oder lokale Bildquellen werden während L1 inventarisiert und bei gewünschter Erhaltung als geprüftes lokales Manifestasset übernommen. Sie werden nicht unverändert zur Laufzeit geladen. Für nicht migrierte Bildadressen greift der normale Ersatz.
- Alte Google-Domain-Favicons werden bewusst durch die neue ID-Zuordnung ersetzt. Die beiden Legacy-Komponenten behalten ihre Links, Inhalte und Geometrie.

- Manifestauflösung nach ID, dann lokale Bildquelle, sonst deterministischer Text-/Initialen-Ersatz.
- Kein automatischer Domain-Favicon-Abruf und kein automatischer GitHub-Avatar.
- Fehlerzustand an die tatsächlich gerenderte Quelle binden: `failedSource` speichert die fehlgeschlagene aufgelöste Bildadresse; Ersatz wird nur bei `failedSource === currentSource` gezeigt. Eine neue Adresse kann sofort geladen werden. Kein generisches Reset-Effect, kein endloses Wiederholen derselben kaputten Quelle. Ein spät eintreffender Fehler einer alten Quelle darf ein inzwischen gültiges neues Bild nicht verdrängen.
- Bild mit expliziter Breite/Höhe, `object-fit: contain`, `loading="lazy"` und `decoding="async"`.
- Der Logo-Container reserviert den Platz vor dem Laden. Bildfehler und Ersatz verändern weder Karte noch Tabellenzeile.
- `aria-hidden="true"` am dekorativen Container und `alt=""` am Bild, da unmittelbar daneben bereits der Tool-Name steht.
- Lokale Bilder sind keine zusätzlichen Links oder Tastaturziele.

[MDN zu `<img>`](https://developer.mozilla.org/en-US/docs/Web/HTML/Reference/Elements/img) dokumentiert Größenangaben, dekorative Alternativtexte und Lazy Loading. Die tatsächliche Darstellung wird zusätzlich im Browser geprüft.

### 3. Integration und Theme

| Oberfläche | Geplante Anpassung |
|---|---|
| Karten und Karten+ | `tool-card-symbol` durch AppIcon im bestehenden 46px-Rahmen ersetzen; Bild maximal 30–32px. |
| Tabelle | Kleines Logo neben dem Tool-Namen, ungefähr 28px Rahmen; bestehender Detail-Button bleibt ein Button. |
| Detailkopf | Dasselbe Logo im Titelbereich, ungefähr 40px Rahmen. |
| Alte AppCard/AppRow | Weiterhin AppIcon verwenden; keine zweite Logo-Implementierung erzeugen. |

Logos werden nicht durch einen pauschalen CSS-Filter invertiert oder neu eingefärbt. Eine belegte Theme-Variante oder eine dezente, im Manifest benannte neutrale Fläche löst schlecht erkennbare schwarze/weiße Logos. Der Glow bleibt am äußeren Rahmen. Auswahl folgt dem **aufgelösten Anwendungstheme**, damit ein manuell gewähltes Theme Vorrang vor der OS-Einstellung hat.

Geprüft: `ThemeContext.tsx` setzt bereits `data-theme` und besitzt unter System einen `matchMedia`-Listener. Der Kontext veröffentlicht bisher allerdings nur die Auswahl `theme`, nicht deren aufgelösten Wert. L3 ergänzt daher im bestehenden Provider `resolvedTheme: 'dark' | 'light'`, aktualisiert ihn zusammen mit `data-theme` bei Auswahl/OS-Wechsel und bietet ihn über `useTheme` an. AppIcon konsumiert diesen reaktiven Wert; es erhält weder einen eigenen Media-Listener noch eine bloße, nicht reaktive DOM-Attributabfrage. Der HTML-Startpfad und die bestehende Theme-Persistenz bleiben konsistent mit dieser Auflösung.

`DESIGN.md` und `UX-CONTRACT.md` werden bei der Umsetzung um Logo-Identität, Rahmen, Quellenauflösung und Ersatzverhalten ergänzt.

## Umsetzungsschritte und Abhängigkeiten

| Schritt | Voraussetzung | Ergebnis und Begründung |
|---|---|---|
| L1: Quelleninventar | Aktueller Katalog und Legacy-Aufrufer | Alle 89 IDs klassifiziert; bestehende explizite Icon-Werte geprüft/migriert; verhindert falsche Anbieter-/Technologielogos. |
| L2: Lokale Assets + Manifest | L1 | Belegte Logos samt Herkunft und expliziten Ersatzfällen; reproduzierbare Quelle für alle Ansichten. |
| L3: AppIcon modernisieren | L2 | Gemeinsamer Renderer mit Legacy-Ersatz, BASE_URL, quellengebundenen Fehlern und reaktivem resolvedTheme aus dem bestehenden Provider. |
| L4: Ansichten anbinden | L3 | Logos in Karten, Karten+, Tabelle und Detailkopf; Anpassung der beiden bisherigen Aufrufer. |
| L5: Validierung und Dokumentation | L2–L4 | Nachweis für Zuordnung, Offline-Unabhängigkeit, Theme-Lesbarkeit und bestehende Bedienung. |

L1–L2 sind Asset-Recherche, L3–L4 eine begrenzte Komponentenänderung. Eine automatische Scraping-Pipeline, neue Abhängigkeit oder Hintergrund-Logo-Synchronisierung ist für das Ziel nicht erforderlich.

## Tests und Abnahme

1. Manifestprüfung: referenzierte lokale Dateien existieren, Tool-IDs sind eindeutig; sämtliche 89 Tools sind im Herkunftsinventar klassifiziert. Auch als Fallback erfasste IDs sind sichtbar dokumentiert. Jede eingecheckte Logodatei hat einen Herkunftseintrag samt überprüfter Nutzungs-/Attributionsdisposition; undokumentierte Assets sind kein abnahmefähiges Ergebnis.
2. Positivfälle: bekannte Tools zeigen das richtige geladene Bild, nicht nur einen Container oder eine gesetzte `src`-Adresse; Browserprüfung über `complete` und `naturalWidth > 0`.
3. Unterschiedliche GitHub-Projekte bekommen ihre belegten Projektlogos oder jeweils den ausgewiesenen Ersatz; keine Domain-Zuordnung auf das GitHub-Logo.
4. Fehlerfälle: fehlendes Manifest, unbekanntes Tool, fehlende/kaputte Datei und Quellenwechsel nach einem Fehler zeigen eine stabile Ersatzdarstellung beziehungsweise laden die neue Quelle korrekt. Explizit testen: kaputte Quelle → gültige neue Quelle; kaputtes Dark-Asset → gültiges Light-Asset; verspäteter Fehler der alten Quelle → neues Bild bleibt sichtbar.
5. Dark/Light/System: Logos bleiben in beiden Themes sichtbar; manuelle Theme-Wahl und OS-Wechsel unter System wählen die passende Quelle/Fläche. Kein pauschales Invertieren von Markenfarben.
6. Deployment: alle Logo-Adressen funktionieren unter `/CliToolRegistry.Web/`; Drittanbieteranfragen für Logos bleiben bei null. Nach geladenem Katalog funktionieren lokale Logos auch bei blockierten externen Domains. Vollständiger Erstbesuch offline ist ohne Service Worker kein zugesagtes Verhalten.
7. Reflow/Bedienung: Desktop sowie 320px/390px Mobilansicht, Karten, Karten+, Tabelle und geöffnete Details. Kopieren, Filter, Ansichtswechsel, Escape und Fokus-Rückgabe bestehen weiterhin. Kein Logo verursacht Überlauf oder Layoutsprung.
8. Ausführung: `npm run test:ui`, `npm run lint`, `npm run build`, strenger Premium-UI-Audit; im Anschluss erzeugten Katalog-Timestamp prüfen und unbeabsichtigte reine Zeitstempeländerung zurücknehmen.
9. Legacy-Komponenten: gezielte Renderer-Prüfung von AppCard/AppRow mit lokal zugeordnetem Logo, Text-/Emoji-Ersatz und nicht migrierter externer Adresse; Links und Inhalte bleiben erhalten, externe Logo-Anfragen bleiben bei null. Falls die bestehenden Browsertests diese unbenutzten Komponenten nicht direkt mounten können, einen kleinen Test-Harness nur für diese Tests ergänzen; keine Produktroute dafür schaffen.

**Erfolg:** Vorhandene, geprüfte Tool-Logos erscheinen wieder in allen aktiven Ansichten. Die Abdeckung wird als Anzahl Projektlogos/Familienlogos/Ersatzfälle berichtet. Ersatzfälle werden nicht als vollständige Logo-Abdeckung ausgegeben.

## Review-Status

Repositorybefund und Quellen wurden geprüft. Die erste inhaltliche Oracle-MCP-Review (`ctr-web-tool-logo-plan`, GPT-5.6 Sol, abgeschlossen) bestätigte die Architektur und verlangte Präzisierungen zu Legacy-Icons, quellengebundenen Fehlern, Theme-Reaktivität und Asset-Herkunft. Diese sind integriert und die Legacy-/Theme-Annahmen zusätzlich am aktuellen Quellcode geprüft.

**Abschließende Review: APPROVE**, Oracle-MCP-Session `ctr-web-tool-logo-plan-2`, GPT-5.6 Sol, abgeschlossen. Keine blockierenden Restpunkte. Die Antwort ist in [tool-logos-review.md](tool-logos-review.md) abgelegt. Modellwahl wurde vom MCP bestätigt; Extra High war im Browserkonto nicht verfügbar und ist deshalb nicht als verifiziertes Review-Effort ausgewiesen.

Der Plan ist für die anschließende Umsetzung vorbereitet. Es wurden ausschließlich Planungsdateien erstellt; die konkrete Logo-Beschaffung und Anwendungscodeänderung sind weiterhin ausstehend.
