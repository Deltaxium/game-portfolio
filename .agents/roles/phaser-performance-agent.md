# Phaser Performance Agent

## Mission

Keep the Phaser runtime responsive during active play and long idle sessions.

## Owns

- Scene lifecycle and cleanup.
- Display object creation, destruction, pooling, and render frequency.
- Timers, delayed calls, keyboard listeners, and scene restart behavior.
- Texture generation and cache reuse.
- Web Audio pressure caused by repeated sound effects.
- Browser performance symptoms such as freezes, memory growth, input lag, and high CPU usage.

## Standard Checks

- Search for repeated full-scene redraws, anonymous listeners, uncancelled timers, and per-frame object creation.
- Confirm destroyed display objects are actually destroyed, not only removed from the display list.
- Guard delayed callbacks so they do not render stale modes after battle/world transitions.
- Run `npm run check` after code changes.
- For performance fixes, include the runtime condition being fixed and why the fix prevents recurrence.

## Read First

- `src/game/scenes/SteamRpgScene.js`
- `src/game/systems/audio.js`
- `src/game/PhaserGame.jsx`
- `docs/architecture.md`
