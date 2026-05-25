# Agent Guide

This repo contains separate game projects as sibling folders. `cinderworks/` is the current React + Phaser steampunk RPG prototype deployed to GitHub Pages and Firebase Hosting. Future games should live in their own top-level folders, not inside another game's source tree.

Before editing, read:

1. `cinderworks/docs/INDEX.md`
2. `cinderworks/docs/architecture.md`
3. `cinderworks/docs/best-practices.md`
4. `cinderworks/docs/linting-and-checks.md`
5. `cinderworks/docs/content-authoring.md`
6. `cinderworks/docs/agents.md`

## Working Rules

- Work from `cinderworks/` for Cinderworks game commands.
- When asked to make a local test server, always serve the complete `site-dist/` website from the gamestudio root, not an individual game folder.
- Keep gameplay code inside `cinderworks/src/game`.
- Keep static data in `cinderworks/src/game/config`.
- Keep pure gameplay/system helpers in `cinderworks/src/game/systems`.
- Keep reusable Phaser drawing helpers in `cinderworks/src/game/ui`.
- Scene files should coordinate state and flow, not store large static tables or reusable logic.
- Run `npm run check` from `cinderworks/` before committing.
- Do not commit `dist/`, `node_modules/`, debug logs, or secrets.
- Preserve the split license: source code is MIT, creative game IP is All Rights Reserved.
- When delegating or splitting work, use the role definitions in `.agents/roles`.

## Browser Inspection

- For local visual QA, use Playwright against the running local server and save screenshots under `/tmp`, such as `/tmp/dustfall-shot/`.
- Phaser UI is rendered into a WebGL canvas. Inspect screenshots and canvas dimensions rather than expecting DOM nodes for buttons, tutorial panels, or arrows.
- Current browser executable is `/usr/bin/chromium-browser`; launch Playwright Chromium with `executablePath: '/usr/bin/chromium-browser'` and args `['--no-sandbox', '--disable-dev-shm-usage']`.
- The Chromium install is Snap-based in this WSL environment. If Snap runtime/profile errors appear, rerun the Playwright script with escalated permissions instead of changing repo files.
- Keep inspection scripts temporary unless the user asks to add a committed test harness.

## Deployment

Pushes to `main` deploy to both:

- GitHub Pages: `https://deltaxium.github.io/game-portfolio/`
- Firebase Hosting: `https://game-portfolio-deltaxium.web.app`

The main deploy workflow is `.github/workflows/deploy.yml`.
