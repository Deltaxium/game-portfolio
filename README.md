# Gamestudio

This workspace holds separate game projects as sibling folders. Each game should own its own source,
docs, assets, and build setup when it becomes playable.

## Games

- `cinderworks/`: steampunk RPG prototype with top-down exploration and side-view ATB combat.
- `dustfall-trails/`: Wild West RPG concept folder.

## Website Direction

The public website should present a homepage that lets players choose between available games. Each
game should have its own separated page, route, or build area rather than sharing internal gameplay
folders with another game.

The static homepage lives in `website/`. The combined deploy artifact is generated in `site-dist/`:

```bash
cd cinderworks
npm run build
cd ..
cd dustfall-trails
npm run build
cd ..
node scripts/build-site.mjs
```

Generated layout:

- `/`: game selection homepage.
- `/cinderworks/`: built Cinderworks game.
- `/dustfall-trails/`: Dustfall Trails concept page.

## Cinderworks

```bash
cd cinderworks
npm install
npm run dev
```

Project docs start at `cinderworks/AGENTS.md` and `cinderworks/docs/INDEX.md`.

## Browser Inspection

Use Playwright with the local game server to inspect rendered Phaser screens and capture screenshots.
Phaser renders most UI into a WebGL canvas, so DOM inspection only confirms the page shell and canvas;
visual bugs should be checked from screenshots.

Current WSL setup:

- Global Playwright CLI: `playwright --version`
- Browser executable: `/usr/bin/chromium-browser`
- Chromium is installed through Snap, so Playwright scripts may need to run outside strict sandboxing.

Recommended flow:

```bash
cd dustfall-trails
npm run dev -- --host 127.0.0.1
```

In another shell, run a temporary Playwright script from `/tmp` and launch Chromium with:

```js
const browser = await chromium.launch({
  headless: true,
  executablePath: '/usr/bin/chromium-browser',
  args: ['--no-sandbox', '--disable-dev-shm-usage'],
});
```

Write screenshots to `/tmp/dustfall-shot/` or another temp folder, not into the repo. Capture the
title screen first, then click through the game canvas with canvas-relative coordinates and save each
state. Console errors and warnings should be logged; WebGL `ReadPixels` performance warnings are
expected during screenshots.
