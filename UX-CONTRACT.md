# Catalog interaction contract

Visual intent and token ownership are in [DESIGN.md](DESIGN.md). Product evidence is [README.md](README.md), `src/types/app.ts`, and `src/data/loadApps.ts`: a read-only catalog with copyable commands, resource links, and local browser preferences. There are no mutation, billing, account, or permission workflows.

## Canonical UI Map

| Capability | Canonical owner | Source of truth | Allowed variants | Verification |
|---|---|---|---|---|
| Select/Listbox | Native `select` in App and ToolCards | This contract | native OS popup | browser keyboard, platform filtering |
| Scrollbar | src/catalog-visuals.css | DESIGN.md | stable document gutter, command overflow | computed styles, mobile reflow |
| Disclosure | ToolDetails with App selection state | This contract | inline card / below table | focus, Escape, close restoration |
| Copy feedback | CommandBlock | This contract | compact / regular | clipboard success and rejection |
| View/theme | ViewToggle / ThemeToggle / ThemeContext | DESIGN.md and this contract | cards / cards+ / table, dark / light / system | reload, locale, OS change |

## Behavior

- First visit: dark theme and Cards+. Existing explicit theme and view choices win. Storage failure must not prevent choosing either preference.
- All three views consume the same locally filtered catalog. View switching preserves search and filters and closes detail selection. The chosen view survives reload.
- Search is immediate and local. Its clear button returns focus to search. Queries and filters are intentionally transient for this single-screen catalog; switching representation does not navigate away or commit a URL query.
- Detail selection is exclusive. Opening focuses the detail heading and brings it into view. Closing or Escape restores focus to the initiating button. Details are a nonmodal disclosure with normal document scrolling.
- Installation is labeled by platform. A global platform filter governs card commands; with all platforms selected, each enhanced card offers its supported platforms. No available command means explicit absence, never a command borrowed from another OS.
- Commands are copied, never executed. Success has a live status; clipboard failure has an inline alert. Long detail commands remain readable without hover.
- Loading, no results, empty catalog, initial failure/retry, and cached-data warnings reuse App's state handling. No-results offers filter reset. Background refresh keeps current catalog data usable.
- All owned labels and accessible names follow LocaleContext. Catalog text remains as published. Source timestamps follow the selected locale.
- Keyboard focus is visible. Native selects retain native keyboard behavior. Reduced motion and forced colors use the global stylesheet rules.

## Evidence

`tests/catalog-ui.spec.ts` verifies theme/view persistence, local filtering, platform commands, detail focus, clipboard feedback, retry/cache handling, localization, mobile reflow, reduced motion, and automated accessibility. `npm run test:ui`, `npm run lint`, and `npm run build` are the required project checks.
