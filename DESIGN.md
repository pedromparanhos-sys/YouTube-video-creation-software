# Design

The editor is a camera over an infinite drafting board. Frames are windows onto it; the timeline is the camera's route. Shell language follows Linear (dark, quiet, dense); the canvas borrows the drafting grid and violet/blue technical palette of Palantir's isometric illustrations.

## Scene

A technical creator editing for hours at a desk, often in a dim room, judging video color. Dark neutral ground so frames read true.

## Color

| Token | Value | Role |
|---|---|---|
| `--ground` | `#0c0d10` | canvas ground, inputs, code editor |
| `--surface` | `#111216` | panels (sidebar, inspector, timeline, topbar) |
| `--surface-2` / `-3` | `#16181d` / `#1c1f25` | hover, clips, menus |
| `--line` / `--line-strong` | `#22252c` / `#2e323a` | hairline borders |
| `--ink` / `-2` / `-3` | `#e6e8ec` / `#a3a8b3` / `#737985` | text tiers |
| `--violet` | `#8b7cf6` | selection, primary action, route line, caret |
| `--blue` | `#5ea3ff` | playhead, active-in-playback, travelled route |
| `--mint` | `#7ee2b8` | live/render state (export progress, "running") |
| `--red` | `#ff6b6b` | errors, (future) recording |

Scene palette (`lib.colors`) reuses the same violet/blue/mint/amber on `#0a0b0d`, so video content and editor share one world.

## Type

- UI: Inter Variable, 13px base, 500 for labels/headers, 600 for headings. No display sizes in the shell.
- Mono: JetBrains Mono Variable, only for code, timecodes, durations, coordinates and frame indices (tabular numerals).

## Shape and depth

Radius 6px (controls), 4px (small), 8–10px (menus, dialogs). Depth is borders first; shadows only on floating layers (menu, dialog) with offset + soft blur.

## Layout

Grid shell: topbar 44px · sidebar 240px · canvas (fluid) · inspector 400px · timeline 184px under sidebar+canvas. Panel headers 40px. Rows 32px.

## Signature move

During playback the viewport flies along the route line into each frame (eased center pan with a zoom-out arc, 0.9s). The route between frames is a dashed violet line with a midpoint arrow; travelled segments turn solid blue.

## Components

Segmented tool switcher, icon buttons (26px), buttons (28px: default, ghost, primary violet), inputs with mono unit prefixes, chips for aspect presets, scene list rows with mono index, timeline clips with duration grip, playhead (blue line + notch).
