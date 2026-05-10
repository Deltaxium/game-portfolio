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
- Inventory: I
- Status reference: H
- Battle menu: Up/Down, Space or Enter
- Cancel battle command/menu: Esc

## Current Progression

1. Collect `Brass Key`.
2. Collect `Pressure Gauge`.
3. Use the valve in sequence.
4. Unlock the gate.
5. Win the battle to recover `Aether Fuse`.
6. Power the factory lift.

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
