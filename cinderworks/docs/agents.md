# Project Agents

Use these role definitions when delegating work to AI agents or splitting tasks for future development. Each agent should read `AGENTS.md` and `docs/INDEX.md` before starting, then read the role file listed here.

## Core Game Agents

| # | Name | Agent | Role file | Primary responsibility |
| --- | --- | --- | --- | --- |
| 1 | Forge | Phaser Performance Agent | `../.agents/roles/phaser-performance-agent.md` | Runtime performance, Phaser lifecycle, long-idle stability, render cost, memory cleanup. |
| 2 | Gauge | UI/UX Combat Agent | `../.agents/roles/ui-ux-combat-agent.md` | Battle HUD, menus, readability, spacing, command flow, status display. |
| 3 | Foundry | Game Systems Architect | `../.agents/roles/game-systems-architect.md` | Combat architecture, data separation, reusable systems, module boundaries. |
| 4 | Quill | Content Authoring Agent | `../.agents/roles/content-authoring-agent.md` | Mobs, encounters, skills, items, statuses, dialogue, progression content. |
| 5 | Caliper | Balance Agent | `../.agents/roles/balance-agent.md` | HP, damage, ATB speed, crits, status durations, rewards, boss resistances. |
| 6 | Anvil | QA/Test Agent | `../.agents/roles/qa-test-agent.md` | Regression checks, gameplay smoke tests, dev tool verification, deployment checks. |
| 7 | Resonance | Audio Agent | `../.agents/roles/audio-agent.md` | SFX, music, Web Audio cleanup, feedback timing, volume behavior. |
| 8 | Signal | Deployment/DevOps Agent | `../.agents/roles/deployment-devops-agent.md` | GitHub Actions, Firebase Hosting, GitHub Pages, release workflow, repo hygiene. |
| 9 | Archivist | Documentation Agent | `../.agents/roles/documentation-agent.md` | Docs, agent instructions, architecture notes, hotkeys, onboarding context. |
| 10 | Brasslight | Art Direction Agent | `../.agents/roles/art-direction-agent.md` | Steampunk visual consistency, palette, sprites, UI materials, effects. |
| 11 | Foreman | Lead Coordinator Agent | `../.agents/roles/lead-coordinator-agent.md` | Breaks work into agent-sized tasks, assigns ownership, resolves sequencing, and keeps priorities clear. |

## Delegation Rules

- Give each agent a narrow task and clear file ownership.
- Do not assign two editing agents to the same files at the same time.
- Ask QA/Test Agent to verify risky changes after implementation.
- Ask Documentation Agent to update docs when architecture, controls, deployment, or content authoring rules change.
- Ask Phaser Performance Agent to review changes that touch scene rendering, timers, audio, input, or texture creation.
