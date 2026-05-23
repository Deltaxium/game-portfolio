# Dustfall Trails

Playable Wild West 2D tactical ATB RPG prototype built with Phaser and Vite.

## Local Development

```bash
npm install
npm run dev
```

## Build

```bash
npm run build
```

## Core Direction

- Theme: Wild West frontier adventure.
- Out-of-battle view: top-down 2D with a static camera.
- In-battle view: flat 2D tactical plane.
- Battle layout: enemies start on the left flank, player party starts on the right flank.
- Battle terrain: tile type and tile description communicate elevation and tactical context.
- Combat style: Active Time Battle. Menus allow command selection, but time continues to pass.
- World movement: typical walking, no platforming.
- Progression: required items gate access to routes, buildings, mines, and puzzle spaces.
- Puzzle style: environmental puzzles, key-item locks, switch routes, track-routing, wanted-poster clues, and saloon or sheriff-office riddles.

## Visual Direction

The UI should feel like a focused frontier interface, using wood, parchment, brass, sheriff-star motifs, and restrained movement. Tumbleweed flourishes can appear in transitions, idle menu accents, or battle-ready indicators, but should not obscure commands or ATB information.

Primary palette:

- Brown: wood, leather, canyon shadows.
- Yellow: dust, brass, sunlit highlights.
- White: readable text, parchment contrast, UI separators.
- Green: cactus, money, recovery, interactable confirmations.

## Current Prototype Scope

- Phaser scene flow: hub, party prep, travel, and battle.
- Proper source split: config, systems, UI helpers, and scenes.
- Flat 2D battle map with terrain labels such as ridge, gully, cover, and high ridge.
- ATB combat with mount/dismount, rider stances, horse stances, Showdown combos, bounty rewards, wanted heat, supplies, and horse bond growth.
