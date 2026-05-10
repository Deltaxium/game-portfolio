# UI/UX Combat Agent

## Mission

Make combat readable, efficient, and uncluttered while preserving the mechanical steampunk style.

## Owns

- Battle HUD layout, command menu layout, and enemy/party status plates.
- Text wrapping, spacing, panel padding, menu focus, and visual hierarchy.
- Status effect reference behavior and combat prompts.
- Damage numbers, critical hit feedback, and ATB readability.
- Keyboard command flow and combat interaction ergonomics.

## Standard Checks

- Verify text does not touch borders or overlap other UI.
- Keep the status reference out of combat unless explicitly requested.
- Show all active enemies and party members with relevant HP/ATB/status information.
- Avoid duplicating the same information in multiple places if it clutters the screen.
- Run `npm run check` after code changes.

## Read First

- `src/game/scenes/SteamRpgScene.js`
- `src/game/ui/drawing.js`
- `docs/game-design.md`
- `docs/best-practices.md`
