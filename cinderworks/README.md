# Cinderworks

A steampunk-era turn-based RPG prototype built with React, Phaser, and Firebase Hosting.

The current vertical slice includes top-down exploration, gated item progression, a valve puzzle,
side-view Active Time Battle combat, and mechanical status effects that can reduce damage output or
inhibit actions.

## Local Development

```bash
npm install
npm run dev
```

## Build

```bash
npm run build
```

The production site is written to `dist/`.

## Project Docs

Agent and contributor docs start at `AGENTS.md` and `docs/INDEX.md`.

## Firebase Hosting

The Firebase project is configured in `.firebaserc` as `game-portfolio-deltaxium`.
Pushes to `main` deploy the production build to Firebase Hosting.

## GitHub Pages

In the GitHub repository settings, set Pages to deploy from GitHub Actions. The workflow in
`../.github/workflows/deploy.yml` publishes `dist/` on every push to `main`.

## License

Source code is licensed under the MIT License. The game title, story, characters, setting, dialogue,
art direction, visual assets, audio assets, logos, and other creative game content are All Rights
Reserved unless explicitly stated otherwise. See `LICENSE`.
