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
      if (payload.method === 'Runtime.consoleAPICalled') {
        const text = payload.params?.args?.map((arg) => arg.value ?? arg.description ?? '').join(' ');
        if (text?.startsWith('RELIC_AUDIT ')) console.log(text);
      }
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
      }, params.timeout ?? 20000);
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
    timeout: 15000,
  });
  if (result.exceptionDetails) {
    const detail = result.exceptionDetails;
    throw new Error(detail.exception?.description || detail.exception?.value || detail.text);
  }
  return result.result.value;
}

const { send, events, close } = connect(await getPageWs());
await send('Page.enable');
await send('Runtime.enable');
await send('Log.enable');
await send('Page.navigate', { url: gameUrl });
await new Promise((resolve) => setTimeout(resolve, 1600));
events.length = 0;

const audit = await evaluate(send, `window.__STORMWAKE_RELIC_AUDIT__ = new Promise((resolve, reject) => {
  let attempts = 0;
  const progress = [];
  const mark = (label) => {
    progress.push(label);
    console.log('RELIC_AUDIT ' + label);
  };
  const waitForGame = () => {
    attempts += 1;
    const game = window.__STORMWAKE_GAME__;
    const items = window.__STORMWAKE_ITEMS__;
    const debug = window.__STORMWAKE_DEBUG__;
    if (!game || !items || !debug) {
      if (attempts > 80) reject(new Error('Stormwake globals did not initialize.'));
      else window.setTimeout(waitForGame, 100);
      return;
    }
    mark('globals-ready');
    const title = game.scene.getScene('title');
    if (title?.scene?.isActive()) title.newGame();
    window.setTimeout(() => {
    const scene = game.scene.getScene('stormwake');
    if (!scene) {
      reject(new Error('Stormwake scene did not initialize.'));
      return;
    }
    mark('scene-ready');
    const loadExitRoom = (index, islandTier, roomInChain) => {
      scene.loadBiome(index, { islandTier, roomInChain, countRoom: false });
      const graph = scene.roomGraph;
      scene.loadBiome(index, {
        islandTier,
        roomInChain,
        currentRoomId: graph.exitId,
        roomGraph: graph,
        keepRoomGraph: true,
        countRoom: false,
      });
    };
    const relics = Object.values(items).filter((item) => item.kind === 'relic');
    const legendaryIds = new Set(Object.values(debug.legendaryRelics));
    const mythicIds = new Set(Object.values(debug.mythicRelics));
    const enemyRelicDrops = debug.enemyRelicDrops;
    const expectedEnemyRelicIds = Object.fromEntries(
      Object.entries(enemyRelicDrops).map(([biomeId, ids]) => [biomeId, ids[0]])
    );
    const bossDrops = debug.biomes.map((biome, index) => {
      loadExitRoom(index, 1, 5);
      const boss = scene.enemies.find((enemy) => enemy.getData('boss'));
      const drop = scene.chooseLootItem(boss);
      return {
        biome: biome.id,
        boss: boss?.getData('name') ?? null,
        dropId: drop?.id ?? null,
        rarity: drop?.rarity ?? null,
        source: drop?.source ?? null,
        shrineOnly: legendaryIds.has(drop?.id) || mythicIds.has(drop?.id),
      };
    });
    mark('boss-drops');
    const forcedEnemyRelicDrops = debug.biomes.map((biome, index) => {
      scene.loadBiome(index, { islandTier: 2, roomInChain: 4, countRoom: false });
      const enemy = scene.enemies.find((entry) => !entry.getData('boss') && entry.getData('elite'))
        ?? scene.enemies.find((entry) => !entry.getData('boss'));
      const originalRandom = Math.random;
      Math.random = () => 0;
      const drop = scene.chooseLootItem(enemy);
      Math.random = originalRandom;
      return {
        biome: biome.id,
        enemy: enemy?.getData('name') ?? null,
        elite: Boolean(enemy?.getData('elite')),
        dropId: drop?.id ?? null,
        kind: drop?.kind ?? null,
        rarity: drop?.rarity ?? null,
        expectedDropId: expectedEnemyRelicIds[biome.id] ?? null,
        shrineOnly: legendaryIds.has(drop?.id) || mythicIds.has(drop?.id),
      };
    });
    mark('forced-enemy-drops');
    const nonBossDrops = debug.biomes.flatMap((biome, index) => {
      scene.loadBiome(index, { islandTier: 2, roomInChain: 4, countRoom: false });
      return scene.enemies
        .filter((enemy) => !enemy.getData('boss'))
        .map((enemy) => {
          const drop = scene.chooseLootItem(enemy);
          return {
            biome: biome.id,
            enemy: enemy.getData('name'),
            elite: Boolean(enemy.getData('elite')),
            dropId: drop?.id ?? null,
            kind: drop?.kind ?? null,
            rarity: drop?.rarity ?? null,
            expectedDropId: expectedEnemyRelicIds[biome.id] ?? null,
            shrineOnly: legendaryIds.has(drop?.id) || mythicIds.has(drop?.id),
          };
        });
    });
    mark('non-boss-drops');

    scene.inventory = relics.map((item) => ({ id: item.id, level: 5, xp: 0, equipped: true }));
    scene.activePowerups = [];
    scene.loadBiome(0, { islandTier: 2, roomInChain: 4, countRoom: false });
    scene.recalculateEffects();
    const powers = Object.fromEntries(relics.map((item) => [item.id, scene.getRelicPower(item.id)]));
    const effectChecks = {
      chainstorm: powers['chainstorm-coil'] > 0,
      ricochet: powers['ricochet-chamber'] > 0,
      gravity: powers['gravity-mine'] > 0,
      harpoon: scene.effectState.shotSpeed > 560 * 1.25,
      pulseDash: powers['pulse-dash-core'] > 0,
      quantum: powers['quantum-rudder'] > 0,
      crystal: scene.effectState.damageMultiplier > 1,
      skyVane: powers['sky-vane-rig'] > 0 && scene.effectState.turnMultiplier > 1,
      stormglass: powers['stormglass-battery'] > 0 && scene.player.maxEnergy > 100,
      cinderFuse: powers['cinder-fuse'] > 0 && scene.effectState.fireDelay < 160,
      prismLens: powers['prism-lens'] > 0 && scene.effectState.damageMultiplier > 1,
      rimeKeel: powers['rime-keel'] > 0 && scene.effectState.drag < 0.82,
      vineNet: powers['vinewrapped-cargo-net'] > 0 && scene.effectState.lootMultiplier > 1,
      rivetArmor: powers['rivet-armor-plate'] > 0 && scene.player.maxHp > 100,
      powderBreech: powers['powder-keg-breech'] > 0 && scene.effectState.shotSpeed > 560 * 1.25,
      templeChime: powers['temple-aether-chime'] > 0 && scene.effectState.repairRate > 0,
      umbralGyro: powers['umbral-gyroscope'] > 0 && scene.effectState.enemyDamageMultiplier < 1,
      cloudbreaker: powers['cloudbreaker-ram'] > 0,
      lightningRod: scene.getPassiveEnergyRegen() > 0,
      ember: scene.effectState.boostMultiplier > 1,
      leviathan: scene.player.maxHp > 100,
      blackHorizon: scene.effectState.fireDelay < 160,
      tempestHeart: powers['heart-of-the-tempest'] > 0,
      captainsWheel: scene.effectState.turnMultiplier > 1 && scene.effectState.drag < 0.82,
      corrupted: scene.effectState.enemyDamageMultiplier < 1,
      glassHull: scene.effectState.damageMultiplier > 1,
      voidSail: scene.getIncomingDamage(10) < 10,
      celestial: scene.effectState.lootMultiplier > 1,
      eclipse: powers['eclipse-cortex'] > 0,
    };
    mark('effects');

    const target = scene.enemies.find((enemy) => enemy.getData('alive'));
    const second = scene.enemies.find((enemy) => enemy !== target && enemy.getData('alive'));
    const secondHpBefore = second?.getData('hp') ?? 0;
    scene.resolvePlayerShotHit(target, { x: target.x, y: target.y });
    const shotInteraction = {
      primaryDamaged: target.getData('hp') < target.getData('maxHp'),
      chainOrSplashDamaged: second ? second.getData('hp') < secondHpBefore : true,
    };
    mark('shot-interaction');

    resolve({
      progress,
      bossDrops,
      forcedEnemyRelicDrops,
      nonBossDrops,
      relicPowerCount: Object.values(powers).filter((power) => power > 0).length,
      relicCount: relics.length,
      effectChecks,
      shotInteraction,
    });
    }, 550);
  };
  waitForGame();
}); window.__STORMWAKE_RELIC_AUDIT__`);

const errors = events
  .filter((event) => ['Runtime.exceptionThrown', 'Log.entryAdded'].includes(event.method))
  .map((event) => event.params?.exceptionDetails?.text || event.params?.entry?.text || event.method)
  .filter((text) => !String(text).includes('GL Driver Message'))
  .filter((text) => !String(text).includes('Automatic fallback to software WebGL has been deprecated'));

const failedEffects = Object.entries(audit.effectChecks).filter(([, passed]) => !passed).map(([name]) => name);
const badBossDrops = audit.bossDrops.filter((entry) => entry.shrineOnly || entry.rarity === 'legendary' || entry.rarity === 'mythic');
const badForcedEnemyDrops = audit.forcedEnemyRelicDrops.filter((entry) => (
  entry.kind !== 'relic'
  || entry.dropId !== entry.expectedDropId
  || entry.shrineOnly
  || entry.rarity === 'legendary'
  || entry.rarity === 'mythic'
));
const badNonBossDrops = audit.nonBossDrops.filter((entry) => (
  entry.kind === 'relic'
  && (
    entry.dropId !== entry.expectedDropId
    || entry.shrineOnly
    || entry.rarity === 'legendary'
    || entry.rarity === 'mythic'
  )
));

console.log(JSON.stringify({ ...audit, failedEffects, badBossDrops, badForcedEnemyDrops, badNonBossDrops, errors }, null, 2));
close();

if (
  audit.relicPowerCount !== audit.relicCount
  || failedEffects.length
  || badBossDrops.length
  || badForcedEnemyDrops.length
  || badNonBossDrops.length
  || !audit.shotInteraction.primaryDamaged
  || !audit.shotInteraction.chainOrSplashDamaged
  || errors.length
) {
  process.exitCode = 1;
}
