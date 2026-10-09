---
version: alpha
name: CLI Tool Registry
description: An interactive terminal workbench inspired by the FrankenTUI website feature repertoire, for discovering CLI tools, dependencies and catalog changes.
colors:
  primary: "#ff9b54"
  secondary: "#ffc18a"
  graph: "#7ed8dd"
  background: "#08090d"
  surface: "#111319"
  raised: "#191c24"
  text: "#f1f2f5"
  muted: "#b0b4c0"
  border: "#2b2f3a"
  success: "#77dda8"
  warning: "#f4c56b"
  danger: "#ffaaaa"
typography:
  sans:
    fontFamily: "Inter, ui-sans-serif, system-ui, -apple-system, BlinkMacSystemFont, Segoe UI, sans-serif"
  mono:
    fontFamily: "Cascadia Code, SFMono-Regular, Consolas, monospace"
rounded:
  DEFAULT: "8px"
  card: "14px"
spacing:
  card-gap: "18px"
  card-padding: "22px"
  page-max: "1480px"
components:
  card:
    rounded: "14px"
  control:
    rounded: "8px"
---

# CLI Tool Registry Design System

## Overview

A terminal workbench with independently implemented feature patterns from [FrankenTUI Website](https://github.com/Dicklesworthstone/frankentui_website): near-black surfaces, a faint background grid, a prominent terminal preview, warm orange actions and cyan dependency accents. The audience is developers and administrators choosing tools and copying installation commands. Product behavior is grounded in README.md, the published registry catalog, and the existing table/detail workflow. The interface supports German and English; upstream catalog descriptions remain in their source language.

The user's complete-overhaul request adds Overview, Catalog, Dependencies, Catalog lab and Guide to the existing catalog. The signature is a split hero pairing large display text with real tool/platform command previews. Keep expressive light in the background and restrained panel edges. Graphs represent declared relationships; comparisons represent actual snapshots. No invented health scores or history. The reference contributes feature direction, with no copied source code, artwork or branded datasets.

## Colors

Dark is the first-visit default. Light and system preferences are explicit, persistent choices. Color never substitutes for labels. Success indicates catalog capability or completed copying, not live tool health. Orange denotes actions and selection; warm pale orange denotes terminal content. Light mode uses a darker burnt orange on warm white surfaces for readable contrast. Tier labels use neutral tones. The established runtime token names `--registry-blue` and `--registry-cyan` now carry these orange action and highlight roles.

Runtime ownership is **model B**: `src/catalog-visuals.css` owns the theme tokens and maps the old generic variables to the registry system. This document mirrors accepted dark values. Light remaps semantic roles under `[data-theme='light']`; `ThemeContext` resolves system preferences and follows OS changes. The initial HTML script applies the saved theme before styles render.

| Document role | Runtime token | Consumers |
|---|---|---|
| primary / secondary | `--registry-blue` / `--registry-cyan` | actions, focus, card rail |
| background / surface / raised | `--registry-canvas` / `--registry-surface` / `--registry-raised` | shell, cards, panels |
| text / muted / border | `--registry-ink` / `--registry-muted` / `--registry-border` | all registry components |
| success / warning / danger | corresponding `--registry-*` variables | source state, automation, errors |
| mono | `--registry-mono` | terminal mark, command metadata |
| graph | `--registry-graph` (#7ed8dd dark / #196f77 light) | recommended edges, terminal caption |
| graph surface | `--registry-graph-soft` (#152d34 dark / #e5f2f3 light) | graph/terminal atmospheric background |
| control / card radius | `--registry-control-radius` / `--registry-card-radius` | controls and cards |

Verify exact color mirrors against runtime declarations and inspect both themes in the browser whenever tokens change.

## Typography

Use the established system sans stack for navigation, prose and large display headings; Cascadia Code and local monospace fallbacks for the brand, commands and terminal identity. No external font loading is required. The hero heading scales from 36px to 78px with viewport width; screen headings from 32px to 56px. Tool names use 19px, descriptions 13px with 1.65 line height. Full descriptions and tags wrap. Detail commands wrap and remain selectable; compact commands expose the full string through copying and the detail panel.

## Layout

The existing 1480px shell remains canonical. The hero uses two columns, becoming one below 900px. Category launchers use five/three/two columns; feature and relationship grids use four/two/one. Cards use three columns, two below 1050px, and one below 720px, with an 18px desktop gap. Mobile cards have 18px padding. Expanded cards span the grid and show details adjacent to their trigger. The table retains its responsive mobile transformation. Graph and lab have bounded internal content regions; complete lists and the document retain natural scrolling. Navigation wraps on phones. Avoid viewport-height locks and hidden page overflow.

## Elevation & Depth

Use tonal separation, a one-pixel border, and restrained static orange radial glow over a faint 64px grid. Cards have a subtle tonal gradient and brighten their border and shadow on hover or focus-within, without moving the pointer target. Keep command panels darker than cards. Reserve document scrollbar space and retain visible, tokenized scrollbars.

## Shapes

Controls use an 8px radius, cards 14px, terminal marks 10px, and the brand mark 12px. The catalog eyebrow uses a pill outline to echo the reference's introductory label. Small labels may use 5px. No decorative pill counters or oversized hero statistics.

## Components

`ToolCards` owns compact and enhanced representations; `ToolTable` owns the comparison view. Both use the same filters, catalog, detail panel, locale, and `CommandBlock` feedback. Cards+ adds platform-specific installation selection, tier, and supported automation capability. Unavailable installation commands have explicit text rather than a false action.

`WorkbenchOverview` owns the real command preview and category launchers, and shares platform command selection with the catalog. `DependencyExplorer` renders exact ID relationships with solid required and dashed recommended edges, explicit external nodes and complete button/list equivalents. Drawing is limited to the focus plus 48 neighbors. `CatalogLab` renders actual baseline/current dates and added/removed/modified records with readable before/after JSON. `WorkbenchGuide` uses the same panel and action family. `CommandPalette` is a native modal dialog with localized combobox/listbox navigation. All interactive colors and geometry come from this stylesheet's canonical tokens.

`ViewToggle` uses labeled native buttons with pressed state and visible focus. Header theme and language controls use icon-only native `details`/`summary` disclosures with accessible names and current-value tooltips. Their choices are labeled buttons with pressed state. Selection and Escape close the disclosure and return focus to its trigger; leaving with Tab closes it. Refresh is an icon-only button with a localized name, tooltip, and loading state. Native selects are intentional: platform-owned popup geometry is accepted for catalog filters and card installation platforms. Commands are never executed by the page. Copy feedback stays inside `CommandBlock` and announces success or failure.

The glyphs follow the existing inline SVG family; terminal marks use literal `>_`. Hover transitions last 160ms and do not shift layout. A single 650ms terminal entrance supplies restrained motion only when reduced motion is not requested. Forced colors defer scrollbar colors to the system, retain control borders and give SVG graph edges/nodes system colors. Required/recommended relationships remain distinguished by dashes and text.

## Do's and Don'ts

- Do keep the original compact-card hierarchy: tool identity, category, description, tags, and resource links.
- Do use semantic tokens for every registry surface and state.
- Do preserve selection context and restore focus when closing details.
- Don't infer tool health, version, or install support from a decorative badge.
- Don't require hover, hidden scrollbars, or animation to access an action.

## Tool Identity Marks

Cards, table rows, and the open detail heading use the same `AppIcon` manifest keyed by the stable tool ID. The 46px card frame, 28px table frame, and 40px detail frame reserve their dimensions before image load; the image uses `object-fit: contain` and keeps its source colors. Theme variants are selected from `ThemeContext.resolvedTheme`. `BASE_URL` prefixes relative local asset paths. A known image error falls back in that frame; unknown IDs use stable initials. Legacy plain text and emoji remain valid fallbacks, while URL and file-path strings are ignored. The source inventory in `docs/tool-logo-sources.md` is the authority for marks, attribution, legal terms, and fallback decisions. Logos identify catalog entries only and do not signal tool health or endorsement.
