# Architecture

The app is intentionally small, but it should stay separated by responsibility.

## React Layer

`src/App.jsx` owns page copy and portfolio presentation. It should not contain Phaser game logic.

`src/game/PhaserGame.jsx` creates and destroys the Phaser instance. Keep scene registration here.

## Phaser Layer

`src/game/scenes/SteamRpgScene.js` coordinates the current vertical slice:

- world state
- input routing
- mode transitions
- rendering calls
- battle command flow

Avoid putting large static tables or reusable rules in the scene.

## Data And Config

`src/game/config/gameData.js` contains stable data:

- palette
- map layout
- party/enemy templates
- item descriptions
- status descriptions
- layout constants

Add new game content here unless it needs runtime behavior.

## Systems

`src/game/systems` is for reusable logic that can be tested or reasoned about without Phaser rendering.

Current systems:

- `combat.js`: status helpers, damage multiplier, battler cloning
- `audio.js`: generated sound effects through Phaser's WebAudio context

## UI Helpers

`src/game/ui/drawing.js` contains reusable Phaser drawing helpers. Shared UI primitives belong here; one-off scene composition can stay in the scene.
