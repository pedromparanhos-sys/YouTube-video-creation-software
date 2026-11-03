# Product

<!-- impeccable:product-schema 1 -->

## Platform

web

## Stack

delegated: React + TypeScript + Vite for the editor UI (web tech so it can later ship as a Tauri desktop app). A local Python service (FastAPI) is planned for Manim, Blender (`bpy`) and FFmpeg work; not part of the first MVP.

## Users

Primary: the founder, a technical YouTube creator who programs (Python, JS) and wants to make explainer videos in the style of 3Blue1Brown — animations, graphs, data visualizations, physics simulations and AI orchestration diagrams. Later: other technical/educational creators.

## Product Purpose

A presentation-and-video tool where every scene is programmable. The creator lays out scenes on an infinite canvas, marks rectangles of it as video frames, animates them with code as a function of time, records narration over them, and exports a video ready for YouTube.

## Positioning

Combines three things no single tool does together: code-driven animation (Manim / Motion Canvas territory), an infinite canvas where any region becomes a frame (Figma/Prezi territory), and recording + editing for YouTube (Descript/Screen Studio territory).

## Operating Context

Used at a desk for long editing sessions, often in a dim room while judging video color. Works alongside a code editor, Python, Manim, Blender. Output targets YouTube (16:9) and Shorts (9:16).

## Capabilities and Constraints

- MVP (confirmed): infinite canvas, frames drawn on the canvas, code scenes (JS) animated by time `t`, timeline with playhead, live preview, in-browser export.
- Next (confirmed, not in MVP): Manim/Python scenes, voice/webcam recording per scene, voxel modeling and physics, Blender bridge, Whisper captions.
- Undecided: product name (working name "Frame"), pricing, collaboration.

## Evidence on Hand

None yet. No users, testimonials, or benchmarks exist; do not invent them.

## Product Principles

1. Everything is code, everything is a function of time: render, don't record, except the human.
2. The canvas is the source of truth; frames are windows onto it.
3. Power user first: keyboard-driven, dense, fast. Ease of use for non-coders comes later.
4. Integrate the best tools (Manim, Blender, FFmpeg) instead of rebuilding them.
