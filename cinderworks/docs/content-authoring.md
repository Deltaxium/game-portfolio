# Content Authoring

Use this when adding party members, mobs, or encounters.

## Mobs

Each mob gets its own file in `src/game/content/mobs`.

Mob files own:

- identity: `id`, `name`
- stats: `maxHp`, `hp`, `speed`, `atb`
- visuals: `tint`
- behavior: `actions`

Example action fields:

```js
{
  id: 'gear-spike',
  name: 'Gear Spike',
  power: 15,
  target: 'party-random',
  status: 'jamming',
  statusChance: 0.5,
  criticalChance: 0.1,
  log: 'throws a gear spike',
}
```

Do not add mob-specific branches to `SteamRpgScene.js` or `combat.js`.

## Encounters

Encounters live in `src/game/content/encounters.js`.

Encounters choose which mobs appear and where they stand:

```js
factoryAmbush: {
  id: 'factoryAmbush',
  name: 'Factory Ambush',
  mobs: [
    { mobId: 'rust-hound', x: 205, y: 260 },
    { mobId: 'valve-imp', x: 335, y: 330 },
  ],
}
```

Use fixed `mobs` for scripted progression fights. Use `mobPool`, `countRange`,
and `positions` for variable random patrols.

## Maps And Transitions

Map layouts and metadata live in `src/game/config/gameData.js`.

Each map should define:

- a tile array with the existing 20 by 11 footprint
- an `id` and display `name`
- a `renderProfile` used by the scene to choose map art treatment
- `randomEncounters` settings
- optional `transitions` keyed by transition tiles such as `D`, `U`, or `X`

Special interaction tiles can also be handled by the scene. Current examples
include beds (`B`) and the hotel concierge relay (`Q`).

Current reserved route tiles:

- `C`: Pressure Coupler pickup.
- `V`: district factory signal or interior valve puzzle tile, depending on map profile.
- `G`: interior pressure gate blocked until the valve is solved.
- `E`: scripted fuse-guard battle tile.
- `F`: lift platform transition tile, gated by `Aether Fuse`.
- `R`: control-room cipher console that reveals the panel password.
- `Y`: central control-room panel, unlocked by the cipher password.
- `N`: floor paper hint. In the factory district this hints the yard signal pattern; in the control room it marks password letters.
- `B`: rest bed.
- `Q`: hotel room-card relay, which rewards consumables.

The district `X` transition to `factoryInterior` is gated by the factory signal
puzzle and `Factory Gate Key` state (`factoryInteriorUnlocked`), so an `X`
transition alone does not make that route available.

Transition entries are data-only:

```js
X: {
  mapId: 'factoryInterior',
  player: { x: 1, y: 5 },
  message: 'The factory door opens into the old factory interior.',
}
```

The scene consumes transition metadata when the player steps onto or interacts
with the transition tile. Keep destination coordinates on passable tiles.

## Combat Rules

Reusable combat behavior lives in `src/game/systems/combat.js`.

That system resolves generic action data. It should know about fields like `power`,
`criticalChance`, `status`, and `statusChance`, but it should not know about specific mobs.

## Party Skills

Party templates live in `src/game/content/party.js`.

Player skills should use the same generic action fields as mob actions where possible.
