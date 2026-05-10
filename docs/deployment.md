# Deployment

## URLs

- GitHub repo: `https://github.com/Deltaxium/game-portfolio`
- GitHub Pages: `https://deltaxium.github.io/game-portfolio/`
- Firebase Hosting: `https://game-portfolio-deltaxium.web.app`

## Main Workflow

`.github/workflows/deploy.yml` deploys on pushes to `main`.

The workflow builds once and deploys the same `dist/` artifact to GitHub Pages and Firebase Hosting.

## Firebase

The Firebase project is `game-portfolio-deltaxium`.

The GitHub secret currently used by CI is:

```text
FIREBASE_SERVICE_ACCOUNT_GAME_PORTFOLIO_DELTAXIUM
```

Do not commit Firebase service account JSON or local credentials.
