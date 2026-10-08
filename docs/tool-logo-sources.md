# Tool-Logo-Quellen und Nutzungsentscheidung

Stand: 2026-10-08. Grundlage ist der aktuelle `public/registry-catalog.json`-Stand mit 89 IDs. Die Matrix enthält jede ID genau einmal. Für die Felder `website` und `repository` ist der jeweilige Katalogeintrag die kanonische Quelle. Ein Fallback bedeutet: Für die konkrete Identität ist keine ausreichend belegte, lokal verwendbare Bildmarke eingecheckt; es werden deterministische Initialen angezeigt.

## Geprüfte Assets

| Asset | Tool-ID(s) | Herkunft und Stand | Nutzungs-/Attributionsentscheidung |
|---|---|---|---|
| `public/tool-logos/dotnet.svg` | `dotnet` | Offizielles .NET-Brand-SVG, Quelle [dotnet/dotnet](https://github.com/dotnet/brand/blob/c7d0f51b8ec59531332d05fb27a5b758a7a3d689/logo/dotnet-logo.svg), Commit `c7d0f51b8ec59531332d05fb27a5b758a7a3d689`. | Quelle weist CC0-1.0 aus; unveränderte violette Bildmarke. [Brand Guidelines](https://github.com/dotnet/brand/blob/c7d0f51b8ec59531332d05fb27a5b758a7a3d689/logo/README.md). |
| `public/tool-logos/bun.svg` | `bun` | Offizielles Icon aus dem [Bun Press Kit](https://bun.sh/press-kit), abgerufen am 2026-10-08. | Originalfarbe und Form beibehalten. Bun untersagt Verziehen, Umfärben und Ergänzen ohne Anfrage; das Icon wird auf einer hellen Fläche dargestellt. |
| `public/tool-logos/git.svg` | `git` | Offizielles Git-Icon `Git-Icon-1788C.svg` von [git-scm.com](https://git-scm.com/community/logos), abgerufen am 2026-10-08. | CC BY 3.0, Urheber Jason Long. Orange Markierung unverändert auf heller Fläche; Namensnennung und Lizenz stehen in dieser Datei. |
| `public/tool-logos/pandoc.svg` | `pandoc` | Pandoc-Projektlogo aus [tarleb/pandoc-logo](https://github.com/tarleb/pandoc-logo/blob/1c547bbfaefa7e842c67e617775a44bc2342db8e/pandoc.svg), Commit `1c547bbfaefa7e842c67e617775a44bc2342db8e`. | CC BY-SA 4.0. Attributionshinweis und Lizenz stehen in dieser Datei; Originalfarben und quadratische Fläche bleiben erhalten. |
| `public/tool-logos/python.svg` | `python3` | Offizielles Python-Logo `python-logo-only.svg` von [python.org](https://www.python.org/community/logos/), abgerufen am 2026-10-08. | Nominative Verwendung zur Bezeichnung der Python-Programmiersprache; sichtbares ™ am Logo und Nichtzugehörigkeitshinweis im Footer gemäß [PSF Trademark FAQ](https://www.python.org/psf/trademarks-faq/). |
| `public/tool-logos/docker.svg` | `docker-buildx`, `docker-cli`, `docker-desktop` | Ocean Blue Docker-Mark aus dem offiziellen [Docker Media Resources](https://www.docker.com/company/newsroom/media-resources/) Paket, abgerufen am 2026-10-08. | Offizielles Produktfamilien-Mark; Originalfarbe `#2560ff`, keine Umfärbung. Markenrechte bleiben bei Docker; die Nutzung behauptet keine Partnerschaft oder Unterstützung. |
| `public/tool-logos/vercel-dark.svg`, `public/tool-logos/vercel-light.svg` | `vercel-cli` | Offizielle schwarze/weiße Symbolvarianten aus dem Vercel Brand-Asset-Paket, abgerufen am 2026-10-08; [Vercel Brand Guidelines](https://vercel.com/geist/brands). | Das Symbol wird nur in der Markenübersicht mit mehreren Marken verwendet. Originale Varianten werden passend zum aufgelösten Theme gewählt; keine Partnerschaft oder Unterstützung wird behauptet. |

Simple Icons wurde ebenfalls geprüft. Seine Paketlizenz ist kein pauschaler Nachweis für einzelne Markenlogos; einzelne Icons ohne konkrete Lizenz-/Nutzungsangabe wurden daher nicht übernommen. GitHub, Go und Node.js erhielten keine pauschalen Domain- oder Technologie-Logos: Die jeweilige offizielle Markenregel schränkt die hier nötige Darstellung ein ([GitHub](https://brand.github.com/foundations/logo), [Go](https://go.dev/brand), [Node.js/OpenJS](https://nodejs.org/static/documents/trademark-policy.pdf)).

## Vollständige Zuordnung

| Tool-ID | Status | Quelle | Asset / Entscheidung |
|---|---|---|---|
| `dotnet` | project-logo | .NET Brand, siehe oben | `dotnet.svg`; tatsächliches Projektlogo |
| `7zip` | fallback | `public/registry-catalog.json` → 7-Zip-Website | Offizieller Logo-Link lieferte 404; kein anderer Kandidat mit passenden Nutzungsangaben übernommen |
| `act` | fallback | `public/registry-catalog.json` → Website/Repository | Keine hinreichend belegte, lokal verwendbare Bildmarke übernommen; Initialen |
| `asb` | fallback | `public/registry-catalog.json` → Website/Repository | Keine hinreichend belegte, lokal verwendbare Bildmarke übernommen; Initialen |
| `acfs` | fallback | `public/registry-catalog.json` → Website/Repository | Keine hinreichend belegte, lokal verwendbare Bildmarke übernommen; Initialen |
| `apr` | fallback | [automated_plan_reviser_pro](https://github.com/Dicklesworthstone/automated_plan_reviser_pro) | Repository ohne belegte Bildmarke/Nutzungsangaben; Initialen |
| `bat` | fallback | `public/registry-catalog.json` → Website/Repository | Keine hinreichend belegte, lokal verwendbare Bildmarke übernommen; Initialen |
| `beads` | fallback | `public/registry-catalog.json` → Website/Repository | Keine hinreichend belegte, lokal verwendbare Bildmarke übernommen; Initialen |
| `br` | fallback | `public/registry-catalog.json` → Website/Repository | Keine hinreichend belegte, lokal verwendbare Bildmarke übernommen; Initialen |
| `bv` | fallback | `public/registry-catalog.json` → Website/Repository | Keine hinreichend belegte, lokal verwendbare Bildmarke übernommen; Initialen |
| `bun` | project-logo | Bun Press Kit, siehe oben | `bun.svg`; unverändertes Icon auf heller Fläche |
| `caam` | fallback | [coding_agent_account_manager](https://github.com/Dicklesworthstone/coding_agent_account_manager) | Repository ohne belegte Bildmarke/Nutzungsangaben; Initialen |
| `casr` | fallback | [cross_agent_session_resumer](https://github.com/Dicklesworthstone/cross_agent_session_resumer) | Illustration gefunden, aber keine Bildmarke; Initialen |
| `cass` | fallback | `public/registry-catalog.json` → Website/Repository | Keine hinreichend belegte, lokal verwendbare Bildmarke übernommen; Initialen |
| `cm` | fallback | `public/registry-catalog.json` → Website/Repository | Keine hinreichend belegte, lokal verwendbare Bildmarke übernommen; Initialen |
| `claude-code` | fallback | `public/registry-catalog.json` → Website/Repository | Kein Icon mit für diese Darstellung belegten Nutzungsangaben übernommen; Initialen |
| `codex-standalone` | fallback | `public/registry-catalog.json` → Website/Repository | Kein Icon mit für diese Darstellung belegten Nutzungsangaben übernommen; Initialen |
| `curl` | fallback | `public/registry-catalog.json` → Website/Repository | Keine hinreichend belegte, lokal verwendbare Bildmarke übernommen; Initialen |
| `delta` | fallback | `public/registry-catalog.json` → Website/Repository | Keine hinreichend belegte, lokal verwendbare Bildmarke übernommen; Initialen |
| `dcg` | fallback | `public/registry-catalog.json` → Website/Repository | Keine hinreichend belegte, lokal verwendbare Bildmarke übernommen; Initialen |
| `docker-buildx` | family-logo | Docker Media Resources, siehe oben | `docker.svg`; gemeinsame Produktfamilie |
| `docker-cli` | family-logo | Docker Media Resources, siehe oben | `docker.svg`; gemeinsame Produktfamilie |
| `docker-desktop` | family-logo | Docker Media Resources, siehe oben | `docker.svg`; gemeinsame Produktfamilie |
| `dolt` | fallback | `public/registry-catalog.json` → Website/Repository | Keine hinreichend belegte, lokal verwendbare Bildmarke übernommen; Initialen |
| `ee` | fallback | `public/registry-catalog.json` → Website/Repository | Keine hinreichend belegte, lokal verwendbare Bildmarke übernommen; Initialen |
| `fdgr` | fallback | `public/registry-catalog.json` → Website/Repository | Eigenes Projekt; keine belegte Bildmarke gefunden; Initialen |
| `fss` | fallback | `public/registry-catalog.json` → Website/Repository | Eigenes Projekt; keine belegte Bildmarke gefunden; Initialen |
| `franken-code-browser` | fallback | `public/registry-catalog.json` → Website/Repository | Eigenes Projekt; keine belegte Bildmarke gefunden; Initialen |
| `frankenctl` | fallback | `public/registry-catalog.json` → Website/Repository | Eigenes Projekt; keine belegte Bildmarke gefunden; Initialen |
| `frankenfs` | fallback | `public/registry-catalog.json` → Website/Repository | Eigenes Projekt; keine belegte Bildmarke gefunden; Initialen |
| `frankengit` | fallback | `public/registry-catalog.json` → Website/Repository | Eigenes Projekt; keine belegte Bildmarke gefunden; Initialen |
| `fgdb` | fallback | `public/registry-catalog.json` → Website/Repository | Eigenes Projekt; keine belegte Bildmarke gefunden; Initialen |
| `frankenjax` | fallback | `public/registry-catalog.json` → Website/Repository | Eigenes Projekt; keine belegte Bildmarke gefunden; Initialen |
| `fln` | fallback | `public/registry-catalog.json` → Website/Repository | Eigenes Projekt; keine belegte Bildmarke gefunden; Initialen |
| `frankenlibc` | fallback | `public/registry-catalog.json` → Website/Repository | Eigenes Projekt; keine belegte Bildmarke gefunden; Initialen |
| `fmn` | fallback | `public/registry-catalog.json` → Website/Repository | Eigenes Projekt; keine belegte Bildmarke gefunden; Initialen |
| `fmd` | fallback | `public/registry-catalog.json` → Website/Repository | Eigenes Projekt; keine belegte Bildmarke gefunden; Initialen |
| `frankenmermaid` | fallback | `public/registry-catalog.json` → Website/Repository | Eigenes Projekt; keine belegte Bildmarke gefunden; Initialen |
| `franken-networkx` | fallback | `public/registry-catalog.json` → Website/Repository | Eigenes Projekt; keine belegte Bildmarke gefunden; Initialen |
| `franken-node` | fallback | `public/registry-catalog.json` → Website/Repository | Eigenes Projekt; keine belegte Bildmarke gefunden; Initialen |
| `franken-numpy` | fallback | `public/registry-catalog.json` → Website/Repository | Eigenes Projekt; keine belegte Bildmarke gefunden; Initialen |
| `focr` | fallback | `public/registry-catalog.json` → Website/Repository | Eigenes Projekt; keine belegte Bildmarke gefunden; Initialen |
| `fo-search` | fallback | `public/registry-catalog.json` → Website/Repository | Eigenes Projekt; keine belegte Bildmarke gefunden; Initialen |
| `frankenpandas` | fallback | `public/registry-catalog.json` → Website/Repository | Eigenes Projekt; keine belegte Bildmarke gefunden; Initialen |
| `frankenredis` | fallback | `public/registry-catalog.json` → Website/Repository | Eigenes Projekt; keine belegte Bildmarke gefunden; Initialen |
| `frankenscipy` | fallback | `public/registry-catalog.json` → Website/Repository | Eigenes Projekt; keine belegte Bildmarke gefunden; Initialen |
| `fsfs` | fallback | `public/registry-catalog.json` → Website/Repository | Eigenes Projekt; keine belegte Bildmarke gefunden; Initialen |
| `frankensim` | fallback | `public/registry-catalog.json` → Website/Repository | Eigenes Projekt; keine belegte Bildmarke gefunden; Initialen |
| `franken-snowflake` | fallback | `public/registry-catalog.json` → Website/Repository | Eigenes Projekt; keine belegte Bildmarke gefunden; Initialen |
| `fsqlite` | fallback | `public/registry-catalog.json` → Website/Repository | Eigenes Projekt; keine belegte Bildmarke gefunden; Initialen |
| `frankensympy` | fallback | `public/registry-catalog.json` → Website/Repository | Eigenes Projekt; keine belegte Bildmarke gefunden; Initialen |
| `ft` | fallback | `public/registry-catalog.json` → Website/Repository | Eigenes Projekt; keine belegte Bildmarke gefunden; Initialen |
| `frankentorch` | fallback | `public/registry-catalog.json` → Website/Repository | Eigenes Projekt; keine belegte Bildmarke gefunden; Initialen |
| `ftts` | fallback | `public/registry-catalog.json` → Website/Repository | Eigenes Projekt; keine belegte Bildmarke gefunden; Initialen |
| `frankentui` | fallback | `public/registry-catalog.json` → Website/Repository | Eigenes Projekt; keine belegte Bildmarke gefunden; Initialen |
| `franken_whisper` | fallback | `public/registry-catalog.json` → Website/Repository | Eigenes Projekt; keine belegte Bildmarke gefunden; Initialen |
| `fzf` | fallback | `public/registry-catalog.json` → Website/Repository | Keine hinreichend belegte, lokal verwendbare Bildmarke übernommen; Initialen |
| `giil` | fallback | `public/registry-catalog.json` → Website/Repository | Eigenes Projekt; keine belegte Bildmarke gefunden; Initialen |
| `git` | project-logo | Git SCM, siehe oben | `git.svg`; Jason Long wird gemäß CC BY 3.0 genannt |
| `git-lfs` | fallback | `public/registry-catalog.json` → Website/Repository | Keine hinreichend belegte, lokal verwendbare Bildmarke übernommen; Initialen |
| `gh` | fallback | [GitHub CLI](https://cli.github.com/) und [GitHub Logo-Regeln](https://brand.github.com/foundations/logo) | Kein GitHub-Mark als stellvertretendes Projektsymbol; Initialen |
| `go` | fallback | [Go Brand Guidelines](https://go.dev/brand) | Offizielles Logo mit Nähe-Einschränkung; in dieser Markenübersicht nicht verwendet; Initialen |
| `gum` | fallback | `public/registry-catalog.json` → Website/Repository | Keine hinreichend belegte, lokal verwendbare Bildmarke übernommen; Initialen |
| `jq` | fallback | `public/registry-catalog.json` → Website/Repository | Keine hinreichend belegte, lokal verwendbare Bildmarke übernommen; Initialen |
| `less` | fallback | `public/registry-catalog.json` → Website/Repository | Keine hinreichend belegte, lokal verwendbare Bildmarke übernommen; Initialen |
| `mcp-agent-mail` | fallback | `public/registry-catalog.json` → Website/Repository | Keine hinreichend belegte, lokal verwendbare Bildmarke übernommen; Initialen |
| `ms` | fallback | `public/registry-catalog.json` → Website/Repository | Eigenes Projekt; keine belegte Bildmarke gefunden; Initialen |
| `mise` | fallback | `public/registry-catalog.json` → Website/Repository | Keine hinreichend belegte, lokal verwendbare Bildmarke übernommen; Initialen |
| `nodejs-lts` | fallback | [Node.js Trademark Policy](https://nodejs.org/static/documents/trademark-policy.pdf) | Policy erlaubt Logo-Nutzung hier nicht ohne Weiteres; Initialen |
| `ntm` | fallback | `public/registry-catalog.json` → Website/Repository | Eigenes Projekt; keine belegte Bildmarke gefunden; Initialen |
| `ollama` | fallback | `public/registry-catalog.json` → Website/Repository | Kein Icon mit für diese Darstellung belegten Nutzungsangaben übernommen; Initialen |
| `oracle` | fallback | `public/registry-catalog.json` → Website/Repository | Kein Icon mit für diese Darstellung belegten Nutzungsangaben übernommen; Initialen |
| `pandoc` | project-logo | Pandoc Logo, siehe oben | `pandoc.svg`; CC BY-SA 4.0, Quellenhinweis steht oben |
| `powershell7` | fallback | `public/registry-catalog.json` → Website/Repository | Kein Icon mit für diese Darstellung belegten Nutzungsangaben übernommen; Initialen |
| `python3` | project-logo | Python.org, siehe oben | `python.svg`; ™ und Nichtzugehörigkeitshinweis im Footer |
| `rch` | fallback | [remote_compilation_helper](https://github.com/Dicklesworthstone/remote_compilation_helper) | Repository ohne belegte Bildmarke/Nutzungsangaben; Initialen |
| `ru` | fallback | `public/registry-catalog.json` → Website/Repository | Eigenes Projekt; keine belegte Bildmarke gefunden; Initialen |
| `ripgrep` | fallback | `public/registry-catalog.json` → Website/Repository | Keine hinreichend belegte, lokal verwendbare Bildmarke übernommen; Initialen |
| `scoop` | fallback | `public/registry-catalog.json` → Website/Repository | Keine hinreichend belegte, lokal verwendbare Bildmarke übernommen; Initialen |
| `sed` | fallback | `public/registry-catalog.json` → Website/Repository | Keine hinreichend belegte, lokal verwendbare Bildmarke übernommen; Initialen |
| `slb` | fallback | `public/registry-catalog.json` → Website/Repository | Eigenes Projekt; keine belegte Bildmarke gefunden; Initialen |
| `source2prompt` | fallback | [PyPI source2prompt](https://pypi.org/project/source2prompt/) | Paketquelle geprüft, keine passende Bildmarke gefunden; anderes ähnlich benanntes Projekt nicht als Identität übernommen |
| `ubs` | fallback | `public/registry-catalog.json` → Website/Repository | Eigenes Projekt; keine belegte Bildmarke gefunden; Initialen |
| `uv` | fallback | `public/registry-catalog.json` → Website/Repository | Kein Icon mit für diese Darstellung belegten Nutzungsangaben übernommen; Initialen |
| `vercel-cli` | family-logo | Vercel Brand Guidelines, siehe oben | `vercel-dark.svg` und `vercel-light.svg`; themeabhängige offizielle Varianten |
| `vscode-cli` | fallback | `public/registry-catalog.json` → Website/Repository | Kein Icon mit für diese Darstellung belegten Nutzungsangaben übernommen; Initialen |
| `winget` | fallback | `public/registry-catalog.json` → Website/Repository | Keine hinreichend belegte, lokal verwendbare Bildmarke übernommen; Initialen |
| `wsl2` | fallback | `public/registry-catalog.json` → Website/Repository | Keine hinreichend belegte, lokal verwendbare Bildmarke übernommen; Initialen |
| `xf` | fallback | `public/registry-catalog.json` → Website/Repository | Eigenes Projekt; keine belegte Bildmarke gefunden; Initialen |

## Legacy-Icons

`AppEntry.icon?: string` ist der einzige Legacy-Wert. Im aktuellen Katalog wurden keine `icon`-Werte und keine früheren Icon-URLs gefunden. `AppCard` und `AppRow` waren die einzigen Aufrufer des alten Favicons und sind derzeit nicht in `App` eingebunden. Der gemeinsame Renderer behält einfache Legacy-Texte und Emojis als bewussten Ersatz, verwirft URL-/Dateipfadwerte und erzeugt für unbekannte IDs zwei deterministische Initialen. Damit wird weder ein früherer Google-Favicon-Dienst noch ein GitHub-Avatar aufgerufen.

## Zählung

- Projektlogos: 5 IDs (`dotnet`, `bun`, `git`, `pandoc`, `python3`)
- Familienlogos: 4 IDs (drei Docker-Produkte, `vercel-cli`)
- Fallbacks: 80 IDs
- Lokale Dateien: 8 SVGs
