# Game Design

## Pitch

`Cinderworks` is a steampunk-era turn-based RPG prototype.

## Current Pillars

- Top-down 2D exploration with a static camera.
- Side-view 2D ATB combat.
- Party on the right, enemies on the left.
- Gated progression through items and mechanical puzzles.
- Warm mechanical UI with brass, copper, red, orange, and yellow tones.

## Controls

- Move: arrow keys or WASD
- Interact: Space or Enter
- Puzzle controls: Space or Enter focuses/submits, Left/Right changes selections, Esc leaves the puzzle
- Menu focus: I opens the menu list, Up/Down chooses `Inventory`, `Objective`, or `Info`, Enter opens the contents
- Status reference: H
- Battle menu: Up/Down, Space or Enter
- Battle escape: choose `Run`
- Cancel battle command/menu: Esc

## Current Progression

The current slice starts in the exterior `Factory District`. The service door
leads to `The Rivet & Kettle Hotel`, whose concierge relay rewards useful
supplies. A separate factory signal puzzle in the district drops the
`Factory Gate Key` and unlocks the west factory door into the old
`Factory Interior`. The `Boilerhouse Bunkroom` rest point sits back inside the
factory interior.

1. Enter the hotel and solve the room-card relay: room `314`, for bonus supplies.
2. Set the district factory signal to `Stack` up, `Crane` down, and `Rail` up to obtain `Factory Gate Key`.
3. Enter the old factory interior through the west factory door.
4. Collect `Brass Key`.
5. Collect `Pressure Gauge`.
6. Descend to the boilerhouse bunkroom and recover the `Pressure Coupler`.
7. Use the interior valve in sequence.
8. Win the scripted battle to recover `Aether Fuse`.
9. Power the factory lift and ride it to the factory control room.
10. Solve the drive-code cipher in the control room.
11. Confirm the central control panel activation and defeat the Boiler Warden.

The hotel relay options are `101`, `207`, `314`, and `402`. Wrong answers hint:
`third floor, fourteen brass rivets`.

The district signal puzzle uses three levers: `Stack`, `Crane`, and `Rail`.
Its solution is up, down, up.

## Status Effects

- `jamming`: 35% action failure. Expires after 1 affected action.
- `burned`: takes damage when acting. Lasts until cured or battle ends.
- `stunned`: pauses ATB fill. Expires after 1 global combat action.
- `overheated`: increases damage dealt, but also increases damage taken. Lasts 3 affected actions, until cured, or until battle ends.

Healing is not affected by outgoing or incoming damage modifiers.

The UI shows a one-time tutorial prompt the first time each status is applied. Players can reopen the status reference with `H`.

## Proposed Boss Resistances

These are not final; review them before adding bosses.

- `Boiler Warden`: resists `burned`, vulnerable to `jamming`.
  Reasoning: a furnace-based boss should not care much about fire, but its pressure valves can still jam.
- `Clockwork Magistrate`: resists `stunned` and `jamming`, vulnerable to `burned`.
  Reasoning: a precision automaton should resist control-disruption effects, while heat can warp its brass frame.
- `Aether Conductor`: resists `overheated`, vulnerable to `stunned`.
  Reasoning: it runs on volatile aether pressure, so overheat-like pressure is natural to it; interrupting its rhythm should matter.
