---
version: alpha
name: CLI Tool Registry
description: A luminous terminal workbench for discovering CLI tools and their installation commands.
colors:
  primary: "#82b9ff"
  secondary: "#71dfdb"
  background: "#080e1a"
  surface: "#101a2b"
  raised: "#162238"
  text: "#edf4ff"
  muted: "#adbed5"
  border: "#293b55"
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

A terminal workbench: navy surfaces, readable command panels, and a thin blue-to-cyan light rail on each tool card. The audience is developers and administrators choosing tools and copying installation commands. Product behavior is grounded in README.md, the published registry catalog, and the existing table/detail workflow. The interface supports German and English; upstream catalog descriptions remain in their source language.

This redesign follows the user's dark/glow brief. Keep expressive light at card edges and the page background; commands and actions retain familiar controls. Avoid decorative charts, fabricated health scores, or motion that competes with reading.

## Colors

Dark is the first-visit default. Light and system preferences are explicit, persistent choices. Color never substitutes for labels. Success indicates catalog capability or completed copying, not live tool health. Blue denotes actions and selection; cyan denotes terminal content.

Runtime ownership is **model B**: `src/catalog-visuals.css` owns the theme tokens and maps the old generic variables to the registry system. This document mirrors accepted dark values. Light remaps semantic roles under `[data-theme='light']`; `ThemeContext` resolves system preferences and follows OS changes. The initial HTML script applies the saved theme before styles render.

| Document role | Runtime token | Consumers |
|---|---|---|
| primary / secondary | `--registry-blue` / `--registry-cyan` | actions, focus, card rail |
| background / surface / raised | `--registry-canvas` / `--registry-surface` / `--registry-raised` | shell, cards, panels |
| text / muted / border | `--registry-ink` / `--registry-muted` / `--registry-border` | all registry components |
| success / warning / danger | corresponding `--registry-*` variables | source state, automation, errors |
| mono | `--registry-mono` | terminal mark, command metadata |
| control / card radius | `--registry-control-radius` / `--registry-card-radius` | controls and cards |

Verify exact color mirrors against runtime declarations and inspect both themes in the browser whenever tokens change.

## Typography

Use the established system sans stack for navigation and prose; Cascadia Code and local monospace fallbacks for terminal identity. No external font loading is required. Tool names use 19px, descriptions 13px with 1.65 line height, headings scale with viewport. Full descriptions and tags wrap. Detail commands wrap and remain selectable; compact commands expose the full string through copying and the detail panel.

## Layout

The existing 1480px shell remains canonical. Cards use three columns, two below 1050px, and one below 720px, with an 18px desktop gap. Mobile cards have 18px padding. Expanded cards span the grid and show details adjacent to their trigger. The table retains its responsive mobile transformation. Avoid viewport-height locks and hidden page overflow.

## Elevation & Depth

Use tonal separation, a one-pixel border, and restrained static radial glow. Cards brighten their border and shadow on hover or focus-within, without moving the pointer target. Keep command panels darker than cards. Reserve document scrollbar space and retain visible, tokenized scrollbars.

## Shapes

Controls use an 8px radius, cards 14px, terminal marks 10px. Small labels may use 5px. No decorative pill counters or oversized hero statistics.

## Components

`ToolCards` owns compact and enhanced representations; `ToolTable` owns the comparison view. Both use the same filters, catalog, detail panel, locale, and `CommandBlock` feedback. Cards+ adds platform-specific installation selection, tier, and supported automation capability. Unavailable installation commands have explicit text rather than a false action.

`ViewToggle`, `ThemeToggle`, and `LocaleSwitcher` use labeled native buttons with pressed state and visible focus. Native selects are intentional: platform-owned popup geometry is accepted for catalog filters and card installation platforms. Commands are never executed by the page. Copy feedback stays inside `CommandBlock` and announces success or failure.

The glyphs follow the existing inline SVG family; terminal marks use literal `>_`. Hover transitions last 160ms and do not shift layout. The global reduced-motion rule disables nonessential animation. Forced colors defer scrollbar colors to the system and retain control borders.

## Do's and Don'ts

- Do keep the original compact-card hierarchy: tool identity, category, description, tags, and resource links.
- Do use semantic tokens for every registry surface and state.
- Do preserve selection context and restore focus when closing details.
- Don't infer tool health, version, or install support from a decorative badge.
- Don't require hover, hidden scrollbars, or animation to access an action.

## Tool Identity Marks

Cards, table rows, and the open detail heading use the same `AppIcon` manifest keyed by the stable tool ID. The 46px card frame, 28px table frame, and 40px detail frame reserve their dimensions before image load; the image uses `object-fit: contain` and keeps its source colors. Theme variants are selected from `ThemeContext.resolvedTheme`. `BASE_URL` prefixes relative local asset paths. A known image error falls back in that frame; unknown IDs use stable initials. Legacy plain text and emoji remain valid fallbacks, while URL and file-path strings are ignored. The source inventory in `docs/tool-logo-sources.md` is the authority for marks, attribution, legal terms, and fallback decisions. Logos identify catalog entries only and do not signal tool health or endorsement.
