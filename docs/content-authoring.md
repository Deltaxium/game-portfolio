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

## Combat Rules

Reusable combat behavior lives in `src/game/systems/combat.js`.

That system resolves generic action data. It should know about fields like `power`,
`criticalChance`, `status`, and `statusChance`, but it should not know about specific mobs.

## Party Skills

Party templates live in `src/game/content/party.js`.

Player skills should use the same generic action fields as mob actions where possible.
