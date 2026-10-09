# CLI Tool Registry: interactive workbench overhaul

## Brief and evidence

The user requests a complete project overhaul using the feature repertoire of
https://github.com/Dicklesworthstone/frankentui_website.
The audience is developers and administrators discovering tools, checking
dependencies, and copying the right installation commands.

Reference patterns: cinematic project introduction, interactive terminal,
data-driven graph explorer, evolution laboratory, comparison surfaces,
progressive loading, responsive navigation, accessible motion.
Implementation is independent: no upstream code, datasets, art, branding,
WASM binaries or CSS are copied. The reference license has a restricted-party
rider. The website links to the inspiration as a reference, not as a dependency.

Current evidence: React 19, TypeScript, Vite 8, static GitHub Pages under
`/CliToolRegistry.Web/`, local catalog JSON, local logo manifest, DE/EN locale,
dark/light/system themes, clipboard commands and inline details.
Existing behavioral owners are retained and expanded rather than duplicated.

## Product structure

- Overview: distinctive split terminal hero with actual catalog commands,
  category launchers and concise feature introductions.
- Catalog: compact cards, command cards and comparison table, shared search,
  category and platform filters, sorting, bounded rendering and inline details.
- Dependencies: selected-tool graph with required and recommended relations,
  reverse dependents, explicit unresolved dependencies and equivalent lists.
- Catalog lab: compare an honest baseline snapshot with the current snapshot,
  browse added/removed/modified tools and inspect before/after data.
- Guide: bilingual instructions explaining platforms, commands, dependency
  semantics and automated mode, with copyable examples from catalog data.

Primary task remains tool discovery. Overview is the fresh-entry destination;
existing stored catalog representation is preserved when entering Catalog.
Each destination is addressable via the `section` URL parameter. URLs use the
existing Vite base and never assume a root deployment.

## Design direction

An instrument for exploring a command-line ecosystem. Deep slate surfaces,
warm orange primary actions, muted typography and a restrained cyan graph
accent. A terminal-backed hero is the signature, not unrelated stock imagery.
Large tightly spaced sans display text contrasts with monospace commands.
Navigation and prose stay quiet, tool identity uses existing local logos.
The existing runtime token owner remains `src/catalog-visuals.css`.
Document every changed token and corresponding consumer in `DESIGN.md`.

Desktop: wide shell, two-column hero, generous section introductions,
compact command panes and three-column catalog cards.
Phone: single-column hero and panels, wrapping navigation, no page-wide
horizontal overflow, controls remain discoverable and keyboard accessible.
Reduced motion disables ambient animation and smooth scrolling. Forced
colors preserve controls, graph distinctions and focus visibility.

## Architecture and canonical owners

- App owns loading, cache recovery, retry, baseline snapshots, navigation,
  catalog filters, representation, selected tool and source status.
- LocaleContext owns all authored labels and accessible names.
- ThemeContext owns theme preferences and resolved logo variants.
- CommandBlock owns selectable commands and clipboard success/failure.
- ToolDetails owns nonmodal details and its focus/close behavior.
- ToolCards and ToolTable consume the same filtered, sorted visible tools.
- CommandPalette owns a native modal dialog and focus restoration.
- DependencyExplorer owns the deterministic SVG and corresponding lists.
- CatalogLab owns baseline comparison rendering and JSON export controls.
- Catalog comparison/model helpers remain pure and shared.
- New heavy screens are imported lazily with a localized loading indicator
  and an accessible error boundary with retry.

Avoid Next.js migration: all desired workflows are local, and static Vite
deployment is already verified. Avoid SQLite/force-graph/WASM imports: the
catalog already contains structured edges and commands; a small SVG graph
and pure snapshot comparison serve the actual dataset without a new backend.

## Navigation and catalog state

Use URLSearchParams for section, q, category, platform and sort. Preserve
unrelated query parameters. Browser back/forward restores the owning state.
Search edits replace the current entry; section navigation pushes an entry.
Persist representation in the established storage key and share it in URL.
Validate incoming enums; unknown sections return to Overview.
Do not discard search or filters when moving between sections.

Render at most 48 tools initially, with explicit Load more in every catalog
representation. Changing query, category, platform or sort resets the limit.
Sorting uses locale-aware names/categories and stable ID tiebreakers.
The total result count remains honest even when only a page is rendered.
Filtering remains immediate, local and safe during IME composition.

## Terminal preview and palette

The terminal preview selects an actual tool and a supported platform. It
shows the declared command, installation method and useful checks through
CommandBlock. No shell commands execute and no simulated output is presented
as live system evidence. Empty/loading states reserve the terminal footprint.

Ctrl/Cmd+K opens the palette from anywhere except an IME composition event.
Native dialog supplies modal background inertness. Focus search on open,
restore initiating focus on close, support Escape and keyboard result
navigation. A result either navigates to a section or opens a selected tool
in Catalog after revealing/resetting incompatible filters.
Clear returns focus to input; zero results supplies explicit guidance.
Selection uses stable IDs and never executes a command.

## Dependency explorer

Edge meaning is always `tool → dependency`.
Required and recommended edges have distinct labels and line treatments.
ID resolution is exact, with explicit aliases only if supported by catalog
evidence; do not guess a dependency from a name or invent missing links.
Unresolved IDs appear as external references, never as registered tools.
Cycles, self-edges, duplicate dependencies and disconnected tools remain
representable. A selected tool's one-hop neighborhood keeps the SVG bounded.
Show reverse dependents separately from dependencies.
Any visual limit is stated and equivalent complete lists remain available.
Graph nodes are native buttons positioned over the SVG or semantic controls
in the adjacent list. Selection works equally with keyboard and pointer.
Zoom/reset have buttons; no important interaction depends on dragging.
The canonical ToolDetails component provides the selected tool's commands.

## Catalog lab

At startup, the existing successful cached snapshot is an optional baseline.
On refresh, capture the current successful snapshot before replacement.
Failed refresh never becomes a baseline and never erases available data.
The user can explicitly set the current snapshot as the baseline.
First visit explains that comparison needs a baseline; it does not invent
commit history or claim historical changes.

Compare tools by stable ID. Canonicalize object keys recursively; retain
array order unless a specific field is explicitly documented as a set.
Exclude snapshot metadata such as loadedAt from tool modifications.
Added, removed and modified tools have before/after values and field names.
Each selection shows readable JSON and a concise field-change summary.
No-change and filtered-no-change states explain what can be done next.
Download snapshots and comparison reports as application/json through
temporary Blob URLs with revocation. Exports contain catalog data only.
Dates and counts follow locale and labels distinguish baseline/current.

## Dependency-aware delivery

1. Design/shell/URL state establishes the navigation and token contract.
2. Catalog/palette/terminal depends on 1 and reuses existing command owners.
3. Graph/lab depends on 1 and 2 for navigation and data ownership.
4. Guide/docs depends on 2 and 3 to document actual delivered behavior.
5. Validation depends on all implementation work and verifies each surface.

Convert this DAG into Beads after Oracle review reaches steady state. Do not
create child-to-epic blocking edges in addition to parent containment.
Preserve unrelated worktree/runtime data and active reservations.

## Acceptance and verification

- Build/typecheck, lint and local logo validation succeed.
- Existing catalog tests are updated for deliberate default/navigation
  changes, while retaining their behavioral success/failure assertions.
- Browser tests cover section URLs/back/forward, bounded catalog rendering,
  palette focus/Escape/keyboard/no-results and tool revelation.
- Graph tests cover real required/recommended edges, missing dependencies,
  reverse dependents, cycles and an isolated tool.
- Lab tests cover absent baseline, refresh differences, no changes, failed
  refresh, removed tools and export content.
- Both languages and themes render correctly; system theme still follows OS.
- Mobile reflow, long content, reduced motion and Axe cover every new screen.
- Premium strict audit and every configured project command succeed.
- Inspect desktop and narrow screenshots, and check production preview under
  the actual Pages base. A build alone does not prove browser behavior.
- Record concrete validation results and remaining limitations before
  committing/pushing the validated delivery and synchronizing tracker state.

## Implementation decisions from repository inspection

- Baseline verification on 2026-10-09: all 18 existing browser tests pass.
- The published catalog has 89 tools, 15 categories and 8 source files. The
  graph is grounded in actual dependency IDs such as `apr → oracle` and
  `bv → br`; values not present in the catalog remain external references.
- Browser test startup initially waited on a closed local port; launching
  the existing Vite test server recovered transport. Tests completed
  naturally. This is environment evidence, not a source-code failure.
- All screens share the global source status and cache-warning/retry control.
  Screen changes do not initiate new catalog requests.
- URL writes happen at the interaction boundary, not as a synchronization
  effect that would overwrite incoming popstate state. Navigation targets
  remain native links with meaningful href values, including modified-click
  opening behavior. Focus moves to the new screen heading for normal in-app
  navigation; initial page rendering does not steal focus.
- Catalog lab timestamps identify snapshots' published data dates; they are
  not installation timestamps, tool versions or commit timestamps.
- A baseline from a different source repository/ref produces an explicit
  source-context warning. It remains a data comparison, not a release diff.
- Export object URLs are revoked after the browser has started the download.
  The export schema includes before/after source metadata and change kinds.
- Tool snapshot validation checks required fields, unique stable IDs, finite
  file counts, valid timestamps and platform values before caching. Invalid
  refresh data follows the same cache-preserving failure path as HTTP errors.
- Graph drawing is capped and announces the visual cap; dependency/dependent
  lists remain complete. This keeps a popular tool's neighborhood readable.
- Catalog details close when filtering removes the selected tool. A palette
  selection clears incompatible filters and reveals that tool before moving
  focus to its canonical detail heading.

## Review record

Oracle MCP session: `ctr-web-frankentui-overhaul-review`.
Requested four sequential browser review rounds. Review output and its actual
completion state must be inspected before this is described as approved.

All four rounds completed on 2026-10-09. Final result: APPROVE, no remaining
structural redesign. Reviewed with GPT-5.6 Sol at the account's selected effort;
Extra High was unavailable. Transcript retained in the Oracle session.

Accepted refinements: `tool` and bounded `count` join the URL state; details
open with push and close with replace rather than blind history.back. Graph
edge direction is tool to dependency, including incoming dependents; duplicate
triples are removed while dual required/recommended relations remain distinct.
The graph contains at most 49 nodes, with complete lists beside it. Palette
results are capped at 20 and use a combobox/listbox active-descendant model.
Compare sorted unique tags/platforms/dependency collections, preserving ordered
notes/commands and unknown fields. Failed refresh preserves baseline; successful
refresh captures previous-current. Lazy-load errors recover through full-page
reload, since resetting a rejected React.lazy promise is insufficient. Expose
cache-write failure separately. Add pure model/URL tests and production deep-link
checks under the real base path.

## Implementation validation

Verified locally on 2026-10-09 with Node 24:

- TypeScript checking and production build pass.
- Five model tests pass, including canonical comparison, URL validation,
  exact dependency edges and a 1,000-tool fixture.
- All 30 UI tests and all 12 production-preview checks pass. They cover
  keyboard focus, graph selection/pan, history and deep-link reload,
  snapshot refresh failures, cache failures, bounded rendering, downloads,
  dark/light English views, 320px layouts, reduced motion and forced colors.
- Axe checks pass for the tested screens. Visual inspection confirms the
  real-catalog desktop/mobile overview and dependency explorer.
- Logo validation passes for the existing manifest and documented inventory.
- ESLint reports only the two existing context Fast Refresh warnings.
- The strict premium audit has zero findings and the design token mirror
  matches the runtime colors.
- Individual UBS scans of every changed JS/TS source/test/script pass with
  zero critical findings. Reviewed warnings concern imported constants and
  browser globals in React hooks, static JSX siblings, intentional fail-fast
  JSON parsing in tests/validation and a hostile-URL test fixture.

The initial combined UBS run and original logo-test scan exceeded the scanner's
300-second limit. The bottleneck was isolated to the taint analyzer processing
a browser-object loop in the existing logo test. Replacing that loop with five
explicit helper calls preserves coverage; all six logo tests and its subsequent
UBS scan pass. No scanner rules or Git hooks were disabled.

The combined commit scan exposed the same taint fixpoint problem in the model
test's invalid-snapshot loop. A callback retains all eight invalid cases and
avoids that pathological analysis. All five model tests and the normal commit
hook subsequently pass.

Remote build/deploy succeeded for implementation commit `e30f580`. A live
browser check confirmed graph direction and deep-link reload, and exposed a
German heading overflow at 320px that the English screen checks did not cover.
The mobile heading now uses a smaller responsive size with a long-word fallback;
the real-catalog production test includes the German 320px assertion.

These are local validation results. Remote CI and publication are verified
separately after pushing the implementation.
