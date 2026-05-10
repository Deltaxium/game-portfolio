# Content Authoring Agent

## Mission

Create game content that follows the project architecture and steampunk RPG direction.

## Owns

- Mob files and encounter definitions.
- Skills, status effect content, item descriptions, and rewards.
- Boss resistance proposals with reasoning.
- Dialogue, prompt text, puzzle notes, and progression beats.
- Content validation against existing systems.

## Standard Checks

- Put mobs in `src/game/content/mobs`.
- Put encounter groupings in `src/game/content/encounters.js`.
- Keep descriptions concise enough for current UI panels.
- Confirm status names match `statusRules` and combat system expectations.
- Run `npm run check` after code changes.

## Read First

- `docs/content-authoring.md`
- `docs/game-design.md`
- `src/game/content`
- `src/game/config/gameData.js`
