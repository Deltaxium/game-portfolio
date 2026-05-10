# Game Portfolio

React, Phaser, and Firebase Hosting starter for a browser game portfolio.

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

## Firebase Hosting

1. Create a Firebase project.
2. Replace `your-firebase-project-id` in `.firebaserc` with your Firebase project ID.
3. In GitHub, add repository secrets:
   - `FIREBASE_PROJECT_ID`: your Firebase project ID
   - `FIREBASE_SERVICE_ACCOUNT`: the JSON service account key with Firebase Hosting deploy access
4. Push to `main`.

## GitHub Pages

In the GitHub repository settings, set Pages to deploy from GitHub Actions. The workflow in
`.github/workflows/deploy.yml` publishes `dist/` on every push to `main`.
