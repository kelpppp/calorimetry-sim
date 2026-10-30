# Calorimetry simulation — file guide

Open `index.html` in a browser (Chrome/Edge recommended; needs internet for Chart.js and the font).

| File | What's in it | Edit this when you want to... |
|---|---|---|
| `index.html` | Page structure (cards, buttons, dialog) | add/remove a panel or label |
| `style.css` | All appearance + the metal/lid animation | change colours, layout, image positions |
| `engine.js` | Physics only (no page code) | change equations, constants, metal data |
| `content.js` | All the explanation text and the specific-heat walkthrough | write your physics explanations |
| `script.js` | Page logic: investigation modes, steps, animations, graphs, table | change behaviour |
| `assets/` | Placeholder PNGs | replace with your own drawings (same file names) |

Yellow-highlighted text on the page = `[PLACEHOLDER]` text in `content.js` waiting for you.

Settings at the top of `script.js`: `TARGET_RUNS`, `PLAYBACK_SECONDS`, `METAL_MOVE_MS`, `LID_MS`.
Physics constants at the top of `engine.js`.

Changes made to your earlier engine (for your AI-assistance record):
- `runSimulation(mass, c)` now takes its inputs as parameters and keeps its history arrays local.
- Added `computeDt` (time step from the time constant), `inferSpecificHeat`, `closestMetal` and the `METALS` table.
- Renamed `getmaxHeatTransferred` to `getMaxHeatTransferred`; removed `getMaxHeatCapacity`, the global state and `resetSimulation`.
- Tolerance 0.001 °C; max steps 50,000.
