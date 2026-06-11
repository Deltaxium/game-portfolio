# Pirate Tactical RPG Prototype Spec

This project is a self-contained prototype for the pirate version of the former Dustfall Trails concept.

## Core Layers

- Haven Preparation: configure the three-person boarding crew, stances, supplies, and ship support before sailing.
- Navigation: steer a single pirate ship across a compact overworld and choose whether to engage visible events.
- Battle Preparation: pause before combat, inspect the battlefield with Field Intel, adjust opening stances, deploy crew, and begin.
- Tactical Combat: fully turn-based, objective-driven, positioning-focused crew combat.
- Walkable Haven: move through the pirate outpost, inspect construction lots, spend materials, and physically grow the settlement.

## Tactical Standards

- Resolution: 960 x 720 canvas, matching the Dustfall Trails Phaser frame.
- Safe area: primary UI stays inside 32 px margins.
- Combat grid: 9 x 6 tiles.
- Tile size: 72 px.
- Crew size: 3 combatants.
- Enemy count target: 3 to 5 readable threats.
- Primary UI layout: battlefield left, command board right.
- Haven movement: WASD, with E/Space for construction-site interaction.

## Combat Vocabulary

- Stances: Boarding, Brace, Marksman, Raider, Command.
- Statuses: Burning, Suppressed, Exposed, Panic, Smoke-Choked, Powder-Soaked, Hooked, Rallying.
- Momentum: coordinated play fills Crew Momentum; 100 momentum enables a surge.
- Stagger: enemies become vulnerable when rhythm breaks from flanks, explosions, collapse, or failed aggression.
- Cover: destructible and directional; crates, barrels, railings, barricades, and burning debris shape engagement.
- Character progression emphasizes named pirates, signature abilities, preferred stances, and light readable passives instead of stacked trait sheets.
- Haven progression begins from a damaged outpost with empty lots, then unlocks Forge, Tavern, Training Yard, Infirmary, and Watchtower through physical construction.

## Visual Direction

The UI should read as a tactical command board inside a dangerous pirate warship: storm navy, weathered wood, tarnished brass, parchment, charcoal, ember, crimson, seafoam, and smoke gray.
