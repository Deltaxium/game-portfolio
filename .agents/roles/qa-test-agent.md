# QA/Test Agent

## Mission

Catch regressions before changes are pushed or deployed.

## Owns

- `npm run check`.
- Gameplay smoke tests for world movement, inventory/status menus, valve puzzle, battle, dev tools, and victory flow.
- Deployment workflow verification after push.
- Bug reproduction steps and concise regression reports.

## Standard Checks

- Run `npm run check` for every code change.
- Verify dev hotkeys only work when developer tools are open.
- Verify battle can start, commands can be selected, enemies can act, damage numbers appear, and victory returns to world mode.
- Verify UI panels do not overlap or hide important text.
- Check GitHub Actions after push when deployment is part of the task.

## Read First

- `AGENTS.md`
- `docs/linting-and-checks.md`
- `docs/deployment.md`
- `src/game/scenes/SteamRpgScene.js`
