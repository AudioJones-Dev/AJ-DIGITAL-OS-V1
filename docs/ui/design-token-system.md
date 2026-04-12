# Design Token System

## Purpose

This document defines the reusable semantic design tokens for the AJ Digital OS local UI shell.

The intent is to support a dark, structured AI operating system aesthetic with consistent semantic roles instead of hardcoded one-off colors.

## Raw Palette

Approved source colors:

- AI identity gradient
  - `#00A4FF`
  - `#1C3F99`
- State accents
  - `#FF4500`
  - `#FFC857`
- Dark surfaces
  - `#0B1020`
  - `#121A33`
  - `#15213F`
  - `#1E2A3A`
- Text
  - `#E6EDF3`
  - `#9FB3C8`
  - `#6B7C93`
- Success
  - `#22C55E`

## Semantic Roles

Primary semantic token roles:

- `background`
- `panel`
- `card`
- `elevated`
- `border`
- `borderStrong`
- `textPrimary`
- `textSecondary`
- `textMuted`
- `interactivePrimary`
- `interactivePrimaryHover`
- `interactiveSecondary`
- `success`
- `warning`
- `error`
- `link`
- `aiGradientStart`
- `aiGradientEnd`

## Usage Rules

- `background` is reserved for the app canvas and deepest shell surface.
- `panel` is used for structural containers such as sidebar, right rail, and top-level workspace panels.
- `card` is used for nested modules such as metric tiles, chat bubbles, and list records.
- `elevated` is for overlays, selected states, and slightly lifted surfaces.
- `textPrimary` is for the main reading content.
- `textSecondary` is for metadata and secondary control labels.
- `textMuted` is for captions, timestamps, and subtle state text.
- `interactivePrimary` is the main action accent and should be used for send buttons, selected controls, and active links.
- `interactiveSecondary` is for less prominent but still emphasized control surfaces.

## State Colors

- `success` is reserved for healthy or completed states.
- `warning` is reserved for caution, pending review, and scaffold limitations.
- `error` is reserved for failures, blocked actions, or hard-stop issues.

These state colors should not replace the main brand gradient in primary navigation.

## Chat-Specific Guidance

- User messages should sit on a brighter primary-tinted surface.
- Assistant messages should use a neutral panel/card surface.
- System notices and scaffold limitations should use a warning-tinted neutral surface instead of pure red.
- Warnings and errors should also be visible in the metadata panel, not only inline in the thread.

## Dashboard And Panel Hierarchy

Recommended hierarchy:

1. app background
2. sidebar / right rail / top shell panels
3. main content panels
4. nested cards and metric tiles
5. interactive highlights

This keeps the command-center layout structured and avoids flattening every surface to the same value.

## Product-Specific Guidance

### Brand Selector

- should remain neutral until selected
- selected state should use a restrained primary gradient treatment
- do not overload with status colors

### Agent / Model Picker

- should read as a configuration control, not a primary action
- should use secondary surface roles
- selection state may use subtle primary emphasis

### Deliverable Panel

- status badges should use semantic state colors
- file/output paths should use mono styling and muted text
- draft versus published hierarchy should be visible at a glance

### Run Metadata Panel

- primary values should remain readable on deep surfaces
- warnings and errors should remain separated from neutral metadata

## Implementation Notes

Runtime token source:

- [src/ui/design-tokens.ts](/C:/dev/AJ-DIGITAL-OS/src/ui/design-tokens.ts)
- [src/ui/theme-types.ts](/C:/dev/AJ-DIGITAL-OS/src/ui/theme-types.ts)
- [src/ui/theme.ts](/C:/dev/AJ-DIGITAL-OS/src/ui/theme.ts)

The local web shell consumes these tokens directly to emit CSS variables and the base stylesheet.
