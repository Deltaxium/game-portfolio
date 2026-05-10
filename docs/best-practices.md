# Best Practices

## Gameplay

- Keep RPG rules data-driven where practical.
- Status effects must have both visible UI feedback and gameplay impact.
- Prefer small pure helpers for combat math instead of embedding formulas in render code.
- Avoid hidden progression requirements; reflect gates in inventory, objectives, or messages.

## Phaser

- Generate placeholder textures in code only for prototype assets.
- Keep the camera static unless a design change explicitly requires movement.
- Do not recreate long-lived external resources every frame.
- Use stable canvas dimensions and fixed UI regions so text and panels do not overlap.

## UI

- Use warm mechanical colors: brass, copper, amber, red, iron, coal.
- Keep inventory, objectives, controls, and message log visible or one keypress away.
- Text must fit inside its panel. Shorten copy before shrinking the UI.
- Use shared helpers from `src/game/ui/drawing.js` for panels, bars, and text style.

## Audio

- Keep generated SFX short and low gain.
- Trigger audio from game events, not render loops.
- If adding asset-based audio later, store it under `src/game/assets/audio` and document licenses.

## React

- React wraps the game; Phaser owns gameplay.
- Keep portfolio/page content in React and game content in Phaser modules.
