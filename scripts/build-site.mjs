import { cp, mkdir, rm } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const rootDir = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const outputDir = path.join(rootDir, 'site-dist');

const copyTargets = [
  {
    from: path.join(rootDir, 'website'),
    to: outputDir,
  },
  {
    from: path.join(rootDir, 'cinderworks', 'dist'),
    to: path.join(outputDir, 'cinderworks'),
  },
  {
    from: path.join(rootDir, 'dustfall-trails', 'dist'),
    to: path.join(outputDir, 'dustfall-trails'),
  },
  {
    from: path.join(rootDir, 'blackwake-tactics', 'dist'),
    to: path.join(outputDir, 'blackwake-tactics'),
  },
  {
    from: path.join(rootDir, 'stormwake-isles', 'dist'),
    to: path.join(outputDir, 'stormwake-isles'),
  },
  {
    from: path.join(rootDir, 'unnamed'),
    to: path.join(outputDir, 'unnamed'),
  },
];

await rm(outputDir, { recursive: true, force: true });
await mkdir(outputDir, { recursive: true });

for (const { from, to } of copyTargets) {
  await cp(from, to, { recursive: true });
}

console.log(`Built combined website at ${path.relative(rootDir, outputDir)}`);
