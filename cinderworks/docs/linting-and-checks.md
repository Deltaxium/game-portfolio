# Linting And Checks

Run this before committing:

```bash
npm run check
```

That runs:

```bash
npm run lint
npm run build
```

## Expectations

- `npm run lint` must pass with no errors.
- `npm run build` must pass.
- Vite may warn about the Phaser bundle size; that is acceptable for now.
- Do not commit generated `dist/` output.

## CI

Pushes to `main` run `../.github/workflows/deploy.yml`.

That workflow:

- installs dependencies
- builds the site
- uploads the GitHub Pages artifact
- deploys to GitHub Pages
- deploys the same build to Firebase Hosting
