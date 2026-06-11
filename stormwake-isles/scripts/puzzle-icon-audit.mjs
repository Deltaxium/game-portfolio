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
      }, params.timeout ?? 25000);
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
    timeout: 20000,
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
events.length = 0;

await evaluate(send, `new Promise((resolve, reject) => {
  let attempts = 0;
  const waitForGame = () => {
    attempts += 1;
    const game = window.__STORMWAKE_GAME__;
    if (!game || !window.__STORMWAKE_DEBUG__ || !window.__STORMWAKE_ITEMS__) {
      if (attempts > 80) reject(new Error('Stormwake globals did not initialize.'));
      else window.setTimeout(waitForGame, 100);
      return;
    }
    const title = game.scene.getScene('title');
    if (title?.scene?.isActive()) title.newGame();
    resolve();
  };
  waitForGame();
})`);
await new Promise((resolve) => setTimeout(resolve, 700));

const audit = await evaluate(send, `new Promise(async (resolve) => {
  const scene = window.__STORMWAKE_GAME__.scene.getScene('stormwake');
  const debug = window.__STORMWAKE_DEBUG__;
  const items = window.__STORMWAKE_ITEMS__;
  const wait = () => new Promise((done) => window.setTimeout(done, 70));
  const resetKeys = () => {
    Object.values(scene.keys).forEach((key) => { key.isDown = false; });
    scene.player.energy = scene.player.maxEnergy;
    scene.player.setVelocity(0, 0);
    if (scene.player.body) scene.player.body.speed = 0;
  };
  const setSpeed = (speed) => {
    scene.player.setVelocity(speed, 0);
    if (scene.player.body) scene.player.body.speed = speed;
  };
  const setRuleState = (rule, step) => {
    resetKeys();
    if (rule === 'momentum') setSpeed(140);
    if (rule === 'boost') {
      scene.keys.boost.isDown = true;
      setSpeed(150);
    }
    if (rule === 'forge') scene.keys.fire.isDown = true;
    if (rule === 'align') {
      const angle = Phaser.Math.Angle.Between(scene.player.x, scene.player.y, scene.hiddenPuzzle.shrineX, scene.hiddenPuzzle.shrineY);
      scene.player.rotation = angle + Math.PI / 2;
    }
    if (rule === 'pollinate') setSpeed(125);
    if (rule === 'rhythm') scene.keys.fire.isDown = true;
    if (rule === 'raid') {
      scene.keys.boost.isDown = true;
      setSpeed(145);
    }
    if (rule === 'harmony') {
      if (step === 0) scene.keys.boost.isDown = true;
      if (step === 1) scene.keys.fire.isDown = true;
      if (step === 2) setSpeed(0);
    }
    if (rule === 'silence') setSpeed(70);
  };
  const solveActivePuzzle = async (label, expectedRelicId) => {
    const puzzle = scene.hiddenPuzzle;
    const before = scene.inventory.some((entry) => entry.id === expectedRelicId);
    const runes = scene.puzzleObjects
      .filter((object) => Number.isInteger(object.getData?.('step')))
      .sort((a, b) => a.getData('step') - b.getData('step'));
    const failures = [];
    if (!puzzle) failures.push('missing puzzle');
    if (puzzle?.relicId !== expectedRelicId) failures.push(\`expected \${expectedRelicId}, spawned \${puzzle?.relicId}\`);
    if (runes.length !== puzzle?.positions?.length) failures.push(\`rune count \${runes.length} did not match position count \${puzzle?.positions?.length}\`);
    for (const rune of runes) {
      const step = rune.getData('step');
      scene.player.setPosition(rune.x, rune.y);
      setRuleState(puzzle.activationRule, step);
      scene.checkHiddenPuzzleOverlap();
      await wait();
      if (!scene.hiddenPuzzle.solved.includes(step)) {
        failures.push(\`step \${step} did not solve under rule \${puzzle.activationRule || 'none'}\`);
      }
    }
    if (scene.hiddenPuzzle?.type === 'return' && !scene.hiddenPuzzle.complete) {
      resetKeys();
      scene.player.setPosition(scene.hiddenPuzzle.shrineX, scene.hiddenPuzzle.shrineY);
      scene.checkHiddenPuzzleOverlap();
      await wait();
    }
    const entry = scene.inventory.find((candidate) => candidate.id === expectedRelicId);
    return {
      label,
      expectedRelicId,
      before,
      complete: Boolean(scene.hiddenPuzzle?.complete),
      received: Boolean(entry),
      level: entry?.level ?? 0,
      solved: scene.hiddenPuzzle?.solved?.length ?? 0,
      total: scene.hiddenPuzzle?.positions?.length ?? 0,
      failures,
    };
  };
  const loadExitPuzzleRoom = async (index, islandTier, roomInChain) => {
    scene.loadBiome(index, { islandTier, roomInChain, countRoom: false });
    await wait();
    const graph = scene.roomGraph;
    scene.loadBiome(index, {
      islandTier,
      roomInChain,
      currentRoomId: graph.exitId,
      roomGraph: graph,
      keepRoomGraph: true,
      countRoom: false,
    });
    await wait();
  };
  const results = [];
  for (const biome of debug.biomes) {
    const quest = debug.legendaryQuests[biome.id];
    if (!quest) continue;
    const index = debug.biomes.findIndex((entry) => entry.id === biome.id);
    const expectedRelicId = debug.legendaryRelics[biome.id];
    scene.inventory = [];
    scene.activePowerups = [];
    scene.legendaryQuestState = { [biome.id]: { pickup: true, charged: true } };
    await loadExitPuzzleRoom(index, 3, quest.puzzleRoom);
    results.push(await solveActivePuzzle(\`legendary:\${biome.id}\`, expectedRelicId));
  }
  for (const biome of debug.biomes) {
    const puzzle = debug.mythicPuzzles[biome.id];
    if (!puzzle) continue;
    const index = debug.biomes.findIndex((entry) => entry.id === biome.id);
    const expectedRelicId = debug.mythicRelics[biome.id];
    scene.inventory = [{ id: puzzle.requiredRelic, level: 1, xp: 0, equipped: true }];
    scene.activePowerups = [];
    scene.legendaryQuestState = {};
    await loadExitPuzzleRoom(index, 5, puzzle.puzzleRoom);
    results.push(await solveActivePuzzle(\`mythic:\${biome.id}\`, expectedRelicId));
  }
  scene.inventory = Object.values(items)
    .filter((item) => item.kind === 'relic')
    .map((item) => ({ id: item.id, level: 5, xp: 0, equipped: true }));
  scene.activePowerups = Object.values(items)
    .filter((item) => item.kind === 'powerup')
    .map((item) => ({ id: item.id, rarity: item.rarity, expiresAt: scene.time.now + 90000 }));
  scene.renderItemPanel();
  scene.clearLootDrops();
  Object.values(items).forEach((item, index) => {
    const col = index % 8;
    const row = Math.floor(index / 8);
    scene.spawnLootMarker(260 + col * 92, 150 + row * 92, item);
  });
  const badgeAudit = [...document.querySelectorAll('.item-badge')].map((badge) => {
    const rect = badge.getBoundingClientRect();
    const icon = badge.querySelector('svg');
    const iconRect = icon?.getBoundingClientRect();
    return {
      text: badge.textContent.trim(),
      className: badge.className,
      width: rect.width,
      height: rect.height,
      iconWidth: iconRect?.width ?? 0,
      iconHeight: iconRect?.height ?? 0,
      ok: rect.width <= 44 && rect.height <= 44 && (!icon || (iconRect.width <= 34 && iconRect.height <= 34)),
    };
  });
  const relicIds = Object.values(items).filter((item) => item.kind === 'relic').map((item) => item.id);
  const powerupSymbols = Object.values(items)
    .filter((item) => item.kind === 'powerup')
    .map((item) => ({ id: item.id, symbol: item.symbol, ok: Boolean(item.symbol) && item.symbol.length <= 2 }));
  resolve({
    puzzles: results,
    badgeAudit,
    relicIds,
    powerupSymbols,
    lootDropCount: scene.lootDrops.length,
    itemBadgeCount: badgeAudit.length,
  });
})`);

await screenshot(send, 'puzzle-icon-audit.png');

const errors = events
  .filter((event) => ['Runtime.exceptionThrown', 'Log.entryAdded'].includes(event.method))
  .map((event) => event.params?.exceptionDetails?.text || event.params?.entry?.text || event.method)
  .filter((text) => !String(text).includes('GL Driver Message'))
  .filter((text) => !String(text).includes('Automatic fallback to software WebGL has been deprecated'));

const failedPuzzles = audit.puzzles.filter((result) => result.failures.length || !result.complete || !result.received);
const badBadges = audit.badgeAudit.filter((result) => !result.ok);
const badPowerups = audit.powerupSymbols.filter((result) => !result.ok);
const summary = {
  puzzleCount: audit.puzzles.length,
  failedPuzzles,
  relicIconCount: audit.relicIds.length,
  powerupSymbolCount: audit.powerupSymbols.length,
  lootDropCount: audit.lootDropCount,
  itemBadgeCount: audit.itemBadgeCount,
  badBadges,
  badPowerups,
  errors,
  screenshot: 'puzzle-icon-audit.png',
};

console.log(JSON.stringify({ summary, puzzles: audit.puzzles }, null, 2));
close();

if (failedPuzzles.length || badBadges.length || badPowerups.length || errors.length) {
  process.exitCode = 1;
}
