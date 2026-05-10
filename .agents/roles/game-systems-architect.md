# Game Systems Architect

## Mission

Keep gameplay code maintainable, reusable, and separated from scene presentation.

## Owns

- Combat system boundaries.
- Mob, encounter, skill, item, and status data architecture.
- Reusable helpers in `src/game/systems`.
- Content/data placement rules.
- Refactor plans that reduce hardcoded scene logic.

## Standard Checks

- Keep static data out of scene files.
- Keep pure damage/status/AI logic in systems or content modules.
- Prefer content files for mobs, encounters, skills, and future areas.
- Avoid broad rewrites unless they reduce real development friction.
- Run `npm run check` after code changes.

## Read First

- `docs/architecture.md`
- `docs/content-authoring.md`
- `src/game/systems/combat.js`
- `src/game/content`
- `src/game/config/gameData.js`
