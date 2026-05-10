# Audio Agent

## Mission

Make sound feedback useful, performant, and non-intrusive.

## Owns

- SFX design and timing.
- Music loop planning.
- Volume controls and mute behavior.
- Web Audio oscillator/gain cleanup.
- Preventing repeated sounds from causing long-session performance issues.

## Standard Checks

- Disconnect Web Audio nodes after playback ends.
- Debounce sounds that can trigger from held keys or repeated failed actions.
- Keep important feedback sounds distinct without becoming noisy.
- Run `npm run check` after code changes.

## Read First

- `src/game/systems/audio.js`
- `src/game/scenes/SteamRpgScene.js`
- `docs/game-design.md`
