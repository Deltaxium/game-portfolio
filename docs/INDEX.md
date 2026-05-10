# Documentation Index

Start here when changing the project.

## Project Docs

- `docs/architecture.md`: file layout, ownership boundaries, and where new code belongs.
- `docs/best-practices.md`: implementation standards for Phaser, React, UI, audio, and game systems.
- `docs/linting-and-checks.md`: local verification commands and CI expectations.
- `docs/game-design.md`: current game pillars, controls, RPG systems, and content rules.
- `docs/content-authoring.md`: how to add mobs, encounters, and skills without touching engine code.
- `docs/deployment.md`: GitHub Pages and Firebase Hosting workflow notes.

## Source Entry Points

- `src/App.jsx`: React page shell around the playable game.
- `src/game/PhaserGame.jsx`: Phaser bootstrapping inside React.
- `src/game/scenes/SteamRpgScene.js`: main scene orchestration.
- `src/game/config/gameData.js`: static world, item, status, palette, and layout data.
- `src/game/content/party.js`: playable party templates.
- `src/game/content/mobs/*.js`: one mob definition per file.
- `src/game/content/encounters.js`: encounter composition and enemy placement.
- `src/game/systems/combat.js`: pure combat/status helpers.
- `src/game/systems/audio.js`: generated WebAudio sound effects.
- `src/game/ui/drawing.js`: shared Phaser UI drawing helpers.
