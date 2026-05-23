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
