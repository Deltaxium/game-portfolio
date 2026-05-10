# Agent Guide

This repo is a React + Phaser steampunk RPG prototype deployed to GitHub Pages and Firebase Hosting.

Before editing, read:

1. `docs/INDEX.md`
2. `docs/architecture.md`
3. `docs/best-practices.md`
4. `docs/linting-and-checks.md`
5. `docs/content-authoring.md`
6. `docs/agents.md`

## Working Rules

- Keep gameplay code inside `src/game`.
- Keep static data in `src/game/config`.
- Keep pure gameplay/system helpers in `src/game/systems`.
- Keep reusable Phaser drawing helpers in `src/game/ui`.
- Scene files should coordinate state and flow, not store large static tables or reusable logic.
- Run `npm run check` before committing.
- Do not commit `dist/`, `node_modules/`, debug logs, or secrets.
- Preserve the split license: source code is MIT, creative game IP is All Rights Reserved.
- When delegating or splitting work, use the role definitions in `.agents/roles`.

## Deployment

Pushes to `main` deploy to both:

- GitHub Pages: `https://deltaxium.github.io/game-portfolio/`
- Firebase Hosting: `https://game-portfolio-deltaxium.web.app`

The main deploy workflow is `.github/workflows/deploy.yml`.
