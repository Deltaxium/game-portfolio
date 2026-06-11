import { writeFile } from 'node:fs/promises';

const endpoint = process.env.CDP_ENDPOINT ?? 'http://127.0.0.1:9228';
const gameUrl = process.env.GAME_URL ?? 'http://127.0.0.1:5179/';
let nextId = 1;

async function getPageWs() {
  for (let attempt = 0; attempt < 40; attempt += 1) {
    try {
      const pages = await fetch(`${endpoint}/json/list`).then((response) => response.json());
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
  });

  async function send(method, params = {}) {
    await ready;
    const id = nextId;
    nextId += 1;
    ws.send(JSON.stringify({ id, method, params }));
    const response = await new Promise((resolve) => pending.set(id, resolve));
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
    timeout: 5000,
  });
  if (result.exceptionDetails) {
    const detail = result.exceptionDetails;
    const description = detail.exception?.description || detail.exception?.value || detail.text || 'Browser evaluation failed';
    throw new Error(description);
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
await new Promise((resolve) => setTimeout(resolve, 1800));

await evaluate(send, `(() => {
  const title = window.__STORMWAKE_GAME__.scene.getScene('title');
  if (title?.scene?.isActive()) title.newGame();
})()`);
await new Promise((resolve) => setTimeout(resolve, 500));

const initial = await evaluate(send, `(() => {
  const scene = window.__STORMWAKE_GAME__.scene.getScene('stormwake');
  const relics = scene.inventory.filter((entry) => window.__STORMWAKE_ITEMS__[entry.id].kind === 'relic');
  const powerups = scene.inventory.filter((entry) => window.__STORMWAKE_ITEMS__[entry.id].kind === 'powerup');
  return {
    catalogCount: Object.keys(window.__STORMWAKE_ITEMS__).length,
    relicCount: relics.length,
    equippedRelics: relics.filter((entry) => entry.equipped).length,
    powerupCount: powerups.length,
    powerupXpTotal: powerups.reduce((sum, entry) => sum + entry.xp, 0),
    itemChips: document.querySelectorAll('.item-chip').length,
    relicRows: document.querySelectorAll('.item-row').length,
    thresholds: {
      uncommon: scene.getXpToNextLevelFor('storm-core'),
      rare: scene.getXpToNextLevelFor('chainstorm-coil'),
      epic: scene.getXpToNextLevelFor('quantum-rudder'),
      legendary: scene.getXpToNextLevelFor('leviathan-engine'),
    },
    initialEffects: scene.effectState,
    firstRelic: relics[0],
    firstPowerup: powerups[0],
  };
})()`);
await screenshot(send, 'item-xp-initial.png');

const afterKills = await evaluate(send, `new Promise((resolve) => {
  const scene = window.__STORMWAKE_GAME__.scene.getScene('stormwake');
  const timeout = window.setTimeout(() => resolve({ timedOut: 'afterKills' }), 2500);
  const enemies = scene.enemies.filter((enemy) => enemy.getData('alive')).slice(0, 4);
  enemies.forEach((enemy) => scene.damageEnemy(enemy, 999));
  window.setTimeout(() => {
    window.clearTimeout(timeout);
    const relics = scene.inventory.filter((entry) => window.__STORMWAKE_ITEMS__[entry.id].kind === 'relic');
    const powerups = scene.inventory.filter((entry) => window.__STORMWAKE_ITEMS__[entry.id].kind === 'powerup');
    resolve({
      threats: scene.enemies.filter((enemy) => enemy.getData('alive')).length,
      firstRelic: relics[0],
      maxRelicLevel: Math.max(...relics.map((entry) => entry.level)),
      relicXpTotal: relics.reduce((sum, entry) => sum + entry.xp, 0),
      powerupXpTotal: powerups.reduce((sum, entry) => sum + entry.xp, 0),
      powerupLevels: powerups.map((entry) => entry.level),
      hud: document.querySelector('#hud').innerText,
      generatedItemTextures: Object.keys(window.__STORMWAKE_ITEMS__).filter((id) => scene.textures.exists(\`item-\${id}\`)).length,
      activeLootSprites: scene.lootDrops.length,
      thresholdsAfter: {
        chainstorm: scene.getXpToNextLevelFor('chainstorm-coil'),
        leviathan: scene.getXpToNextLevelFor('leviathan-engine'),
      },
      effectsAfter: scene.effectState,
      lastRelicTrigger: scene.lastRelicTrigger,
    });
  });
})`);
await screenshot(send, 'item-xp-after-kills.png');

const effectCheck = await evaluate(send, `(() => {
  const scene = window.__STORMWAKE_GAME__.scene.getScene('stormwake');
  const setLevel = (id, level) => {
    let entry = scene.inventory.find((candidate) => candidate.id === id);
    if (!entry) {
      entry = { id, level: 1, xp: 0, equipped: true };
      scene.inventory.push(entry);
    }
    entry.level = level;
    entry.xp = 0;
    entry.equipped = true;
  };
  setLevel('chainstorm-coil', 5);
  setLevel('glass-hull', 5);
  setLevel('leviathan-engine', 5);
  setLevel('storm-core', 5);
  scene.recalculateEffects();
  scene.loadBiome(0);
  const target = scene.enemies[0];
  const beforeAlive = scene.enemies.filter((enemy) => enemy.getData('alive')).length;
  const secondaryBeforeHp = scene.enemies[1].getData('hp');
  scene.resolvePlayerShotHit(target, { x: target.x, y: target.y });
  const secondaryAfterHp = scene.enemies[1].getData('hp');
  const afterAlive = scene.enemies.filter((enemy) => enemy.getData('alive')).length;
  return {
    maxHp: scene.player.maxHp,
    maxEnergy: scene.player.maxEnergy,
    damageMultiplier: scene.effectState.damageMultiplier,
    enemyDamage: scene.getIncomingDamage(10),
    chainWorked: secondaryAfterHp < secondaryBeforeHp || afterAlive < beforeAlive,
    beforeAlive,
    afterAlive,
    secondaryBeforeHp,
    secondaryAfterHp,
  };
})()`);

const errors = events
  .filter((event) => ['Runtime.exceptionThrown', 'Log.entryAdded'].includes(event.method))
  .map((event) => event.params?.exceptionDetails?.text || event.params?.entry?.text || event.method)
  .filter((text) => !String(text).includes('GL Driver Message'));

console.log(JSON.stringify({ initial, afterKills, effectCheck, errors }, null, 2));
close();
