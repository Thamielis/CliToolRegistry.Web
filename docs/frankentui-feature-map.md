# Reference feature mapping

Reference: [FrankenTUI Website](https://github.com/Dicklesworthstone/frankentui_website).
This project independently implements the relevant interaction patterns for a
CLI catalog. It does not vendor the reference repository or its assets.

| Reference pattern | CLI Tool Registry application | Data and boundary |
|---|---|---|
| Cinematic introduction | Terminal workbench overview | Real tool names and declared commands |
| Interactive terminal demonstration | Tool/platform command preview | Copy only; no command execution |
| Beads graph viewer | Dependency explorer | Required/recommended edges from the catalog |
| Spec evolution lab | Catalog snapshot comparison | Explicit baseline, current snapshot, real changes |
| Comparison tables | Existing tool comparison table | Shared filters, platform commands and details |
| Rich project navigation | Overview, Catalog, Dependencies, Lab, Guide | Static subpath-compatible URL navigation |
| Progressive interactive loading | Lazy graph and lab screens | Shared loading/error/retry handling |
| Motion polish | Intro/hover transitions and ambient grid | Reduced-motion and forced-colors alternatives |
| Guided discovery | Command palette and category launchers | Local search, keyboard and pointer access |
| Project documentation | Bilingual guide and source links | Existing source records, no invented claims |

FrankenTUI's Rust kernel, WASM/WebGPU terminal engine, author-specific social
content, screenshots and historical specification datasets belong to its own
product. They are not represented as CLI Tool Registry features or evidence.
The static Vite/GitHub Pages architecture is retained because the catalog and
all explorer computations work locally in the browser.

No upstream dependencies, source files, artwork or branded UI text are copied.
The reference link acknowledges the user's design and feature direction.
