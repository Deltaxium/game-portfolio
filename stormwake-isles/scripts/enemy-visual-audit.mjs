import { writeFile } from 'node:fs/promises';

const endpoint = process.env.CDP_ENDPOINT ?? 'http://127.0.0.1:9228';
const gameUrl = process.env.GAME_URL ?? 'http://127.0.0.1:5179/';
let nextId = 1;

async function getPageWs() {
  for (let attempt = 0; attempt < 50; attempt += 1) {
    try {
      const controller = new AbortController();
      const timeout = setTimeout(() => controller.abort(), 1000);
      const pages = await fetch(`${endpoint}/json/list`, { signal: controller.signal }).then((response) => response.json());
      clearTimeout(timeout);
      const page = pages.find((entry) => entry.type === 'page') ?? pages[0];
      if (page?.webSocketDebuggerUrl) return page.webSocketDebuggerUrl;
    } catch {}
    await new Promise((resolve) => setTimeout(resolve, 200));
  }
  throw new Error('Unable to connect to Chromium DevTools.');
}

function connect(wsUrl) {
  const ws = new WebSocket(wsUrl);
  const pending = new Map();
  const events = [];
  ws.addEventListener('message', (message) => {
    const payload = JSON.parse(message.data);
    if (payload.id && pending.has(payload.id)) {
      pending.get(payload.id)(payload);
      pending.delete(payload.id);
    } else if (payload.method) {
      events.push(payload);
    }
  });
  const ready = new Promise((resolve, reject) => {
    ws.addEventListener('open', resolve, { once: true });
    ws.addEventListener('error', reject, { once: true });
    setTimeout(() => reject(new Error('Timed out opening Chromium DevTools websocket.')), 5000);
  });
  async function send(method, params = {}) {
    await ready;
    const id = nextId;
    nextId += 1;
    ws.send(JSON.stringify({ id, method, params }));
    const response = await new Promise((resolve, reject) => {
      const timeout = setTimeout(() => {
        pending.delete(id);
        reject(new Error(`${method}: timed out waiting for Chromium response.`));
      }, params.timeout ?? 60000);
      pending.set(id, (payload) => {
        clearTimeout(timeout);
        resolve(payload);
      });
    });
    if (response.error) throw new Error(`${method}: ${response.error.message}`);
    return response.result ?? {};
  }
  return { send, events, close: () => ws.close() };
}

async function evaluate(send, expression) {
  const result = await send('Runtime.evaluate', {
    expression,
    awaitPromise: true,
    returnByValue: true,
    timeout: 60000,
  });
  if (result.exceptionDetails) {
    const detail = result.exceptionDetails;
    throw new Error(detail.exception?.description || detail.exception?.value || detail.text || 'Browser evaluation failed');
  }
  return result.result.value;
}

async function screenshot(send, path) {
  const result = await send('Page.captureScreenshot', { format: 'png', fromSurface: true });
  await writeFile(path, Buffer.from(result.data, 'base64'));
}

const { send, events, close } = connect(await getPageWs());
await send('Page.enable');
await send('Runtime.enable');
await send('Log.enable');
await send('Emulation.setDeviceMetricsOverride', {
  width: 1280,
  height: 900,
  deviceScaleFactor: 1,
  mobile: false,
});
await send('Page.navigate', { url: gameUrl });
await new Promise((resolve) => setTimeout(resolve, 1600));
events.length = 0;

const audit = await evaluate(send, `window.__STORMWAKE_ENEMY_AUDIT__ = new Promise((resolve, reject) => {
  let attempts = 0;
  const waitForGame = () => {
    attempts += 1;
    const game = window.__STORMWAKE_GAME__;
    const debug = window.__STORMWAKE_DEBUG__;
    if (!game || !debug) {
      if (attempts > 80) reject(new Error('Stormwake globals did not initialize.'));
      else window.setTimeout(waitForGame, 100);
      return;
    }
    const title = game.scene.getScene('title');
    if (title?.scene?.isActive()) title.newGame();
    window.setTimeout(() => {
      try {
        const scene = game.scene.getScene('stormwake');
        if (!scene) {
          reject(new Error('Stormwake scene did not initialize.'));
          return;
        }
        scene.objectLayer.removeAll(true);
        scene.enemies = [];
        scene.lootDrops = [];
        scene.loadBiome(0, { islandTier: 3, roomInChain: 1, countRoom: false });
        scene.objectLayer.removeAll(true);
        scene.enemies = [];
        const all = [];
        Object.entries(debug.enemyVariants).forEach(([biomeId, variants]) => {
          variants.forEach(([name, color]) => all.push({ biomeId, name, color }));
        });
        debug.biomes.forEach((biome, index) => {
          scene.loadBiome(index, { islandTier: 3, roomInChain: 5, countRoom: false });
          const boss = scene.enemies.find((enemy) => enemy.getData('boss'));
          if (boss) all.push({
            biomeId: biome.id,
            name: boss.getData('name'),
            color: scene.biome.palette.accent,
            boss: true,
          });
        });
        scene.objectLayer.removeAll(true);
        scene.enemies = [];
        const unique = [...new Map(all.map((entry) => [entry.biomeId + ':' + entry.name, entry])).values()];
        const results = unique.map((entry, index) => {
          const col = index % 8;
          const row = Math.floor(index / 8);
          const x = 545 + col * 95;
          const y = 92 + row * 76;
          const elite = entry.boss || entry.name.toLowerCase().includes('elite') || index % 7 === 0;
          const enemy = scene.createEnemySprite(x, y, entry, elite, index);
          const label = scene.add.text(x, y + 31, entry.name.replace(/^Elite /, ''), {
            fontFamily: 'ui-monospace, SFMono-Regular, Menlo, Consolas, monospace',
            fontSize: '8px',
            color: '#f0e1bd',
            align: 'center',
          }).setOrigin(0.5, 0);
          scene.objectLayer.add([enemy, label]);
          scene.enemies.push(enemy);
          return {
            biomeId: entry.biomeId,
            name: entry.name,
            visualStyle: enemy.getData('visualStyle'),
            motion: enemy.getData('style'),
            animatedParts: enemy.animatedParts?.length ?? 0,
            childCount: enemy.length,
            hasHull: Boolean(enemy.hull),
            hasCore: Boolean(enemy.core),
          };
        });
        const styles = [...new Set(results.map((entry) => entry.visualStyle))];
        resolve({
          count: results.length,
          styles,
          missingAnimation: results.filter((entry) => entry.animatedParts <= 0),
          missingStructure: results.filter((entry) => !entry.hasHull || !entry.hasCore || entry.childCount < 5),
          serpentStyles: results.filter((entry) => entry.name.toLowerCase().includes('serpent')).map((entry) => entry.visualStyle),
          jellyfishStyles: results.filter((entry) => entry.name.toLowerCase().includes('jellyfish')).map((entry) => entry.visualStyle),
          birdStyles: results.filter((entry) => entry.name.toLowerCase().includes('bird')).map((entry) => entry.visualStyle),
          results,
        });
      } catch (error) {
        reject(error);
      }
    }, 550);
  };
  waitForGame();
}); window.__STORMWAKE_ENEMY_AUDIT__`);

await new Promise((resolve) => setTimeout(resolve, 900));
await screenshot(send, 'enemy-visual-audit.png');

const errors = events
  .filter((event) => ['Runtime.exceptionThrown', 'Log.entryAdded'].includes(event.method))
  .map((event) => event.params?.exceptionDetails?.text || event.params?.entry?.text || event.method)
  .filter((text) => !String(text).includes('GL Driver Message'))
  .filter((text) => !String(text).includes('Automatic fallback to software WebGL has been deprecated'));

const badNaturalNames = [
  ...audit.serpentStyles.filter((style) => style !== 'serpent').map((style) => `serpent rendered as ${style}`),
  ...audit.jellyfishStyles.filter((style) => style !== 'jellyfish').map((style) => `jellyfish rendered as ${style}`),
  ...audit.birdStyles.filter((style) => style !== 'bird').map((style) => `bird rendered as ${style}`),
];

const summary = {
  count: audit.count,
  styles: audit.styles,
  missingAnimation: audit.missingAnimation,
  missingStructure: audit.missingStructure,
  badNaturalNames,
  errors,
  screenshot: 'enemy-visual-audit.png',
};

console.log(JSON.stringify({ summary, results: audit.results }, null, 2));
close();

if (
  audit.count < 70
  || audit.styles.length < 6
  || audit.missingAnimation.length
  || audit.missingStructure.length
  || badNaturalNames.length
  || errors.length
) {
  process.exitCode = 1;
}
