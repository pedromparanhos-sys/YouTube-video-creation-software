---
version: 1
slug: "src-app-tsx"
primary_target: "src/App.tsx"
related_targets: []
---

Scope: editor workspace (single-screen app). Mode: Operate.
Audience/job: technical creator lays out frames on an infinite canvas, writes scene code, scrubs/plays, exports.
Constraints: user pinned the world — Linear's app UI (dark, quiet, dense, Inter) and Palantir's technical isometric illustrations (charcoal grid, violet/blue accents). Direction pinned by user, so no concept-seed roll was run.

## Direction contract

THESIS: The editor is a camera over an infinite drafting board; frames are windows on it, and the timeline is the camera's route. Refuses the default slide-deck layout (thumbnails strip + big stage).
OWN-WORLD: Charcoal ground #0c0d10 with a faint dot grid, panels one step lighter, hairline borders. Inter for UI, JetBrains Mono only for code and timecodes. Violet #8b7cf6 is selection and the camera; blue #5ea3ff is data/playhead; mint #7ee2b8 marks live/render; red only for recording.
STORY: The creator sees all scenes at once, picks one, edits its code, sees it animate in place, then plays the whole route.
FIRST VIEWPORT: left rail (frames list in route order), center infinite canvas with 3 sample frames joined by a thin violet route line, right inspector (frame props + code editor), bottom timeline with clips per frame and a playhead. Primary action (Play) in the timeline header; Export at top right.
FORM: pinned direction (Linear shell + Palantir drafting grid); signature move: during playback the viewport flies along the route line from frame to frame. seed: none (unavailable)
FINISH: unreviewed and undocumented is unfinished; this build ends with the finish review, the verdict, DESIGN.md, and every shipping raster carrying its provenance
