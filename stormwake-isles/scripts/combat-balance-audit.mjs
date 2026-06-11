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
    timeout: 25000,
  });
  if (result.exceptionDetails) {
    const detail = result.exceptionDetails;
    throw new Error(detail.exception?.description || detail.exception?.value || detail.text || 'Browser evaluation failed');
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

const audit = await evaluate(send, `new Promise((resolve, reject) => {
  let attempts = 0;
  const waitForGame = () => {
    attempts += 1;
    const game = window.__STORMWAKE_GAME__;
    const items = window.__STORMWAKE_ITEMS__;
    if (!game || !items) {
      if (attempts > 80) reject(new Error('Stormwake globals did not initialize.'));
      else window.setTimeout(waitForGame, 100);
      return;
    }
    const title = game.scene.getScene('title');
    if (title?.scene?.isActive()) title.newGame();
    window.setTimeout(() => {
      const scene = game.scene.getScene('stormwake');
      if (!scene) {
        reject(new Error('Stormwake scene did not initialize.'));
        return;
      }

      scene.inventory = [];
      scene.activePowerups = [];
      scene.recalculateEffects();
      scene.loadBiome(0, { islandTier: 1, roomInChain: 1, countRoom: false });
      const tier1 = {
        count: scene.enemies.length,
        maxHp: Math.max(...scene.enemies.map((enemy) => enemy.getData('maxHp'))),
        maxDamage: Math.max(...scene.enemies.map((enemy) => enemy.getData('shotDamage'))),
        names: scene.enemies.map((enemy) => enemy.getData('name')),
      };

      scene.loadBiome(0, { islandTier: 5, roomInChain: 4, countRoom: false });
      const tier5 = {
        count: scene.enemies.length,
        maxHp: Math.max(...scene.enemies.map((enemy) => enemy.getData('maxHp'))),
        maxDamage: Math.max(...scene.enemies.map((enemy) => enemy.getData('shotDamage'))),
        names: scene.enemies.map((enemy) => enemy.getData('name')),
      };

      scene.projectiles.slice().forEach((shot) => scene.destroyProjectile(shot, scene.projectiles));
      scene.enemyProjectiles.slice().forEach((shot) => scene.destroyProjectile(shot, scene.enemyProjectiles));
      scene.inventory = [];
      scene.recalculateEffects();
      scene.fireCannon();
      const normalShot = scene.projectiles.at(-1);
      normalShot.body.setVelocity(0, 0);
      scene.updateProjectiles(scene.time.now + 6000);
      const normalPlayerShotSurvived = Boolean(normalShot.scene);
      scene.destroyProjectile(normalShot, scene.projectiles);

      const enemy = scene.enemies.find((entry) => entry.getData('alive'));
      scene.fireEnemyShot(enemy, scene.time.now);
      const enemyShot = scene.enemyProjectiles.at(-1);
      enemyShot.body.setVelocity(0, 0);
      scene.updateProjectiles(scene.time.now + 6000);
      const enemyShotSurvived = Boolean(enemyShot.scene);
      scene.destroyProjectile(enemyShot, scene.enemyProjectiles);

      scene.inventory = [{ id: 'ricochet-chamber', level: 1, xp: 0, equipped: true }];
      scene.recalculateEffects();
      scene.fireCannon();
      const ricochetShot = scene.projectiles.at(-1);
      ricochetShot.x = -36;
      ricochetShot.y = scene.player.y;
      ricochetShot.body.setVelocity(-100, 0);
      scene.updateProjectiles(scene.time.now);
      const ricochetBounced = Boolean(ricochetShot.scene && ricochetShot.ricochetExpiresAt);
      ricochetShot.body.setVelocity(0, 0);
      scene.updateProjectiles((ricochetShot.ricochetExpiresAt ?? scene.time.now) + 1);
      const ricochetExpiredAfterBounce = !ricochetShot.scene;

      scene.inventory = [{ id: 'ricochet-chamber', level: 2, xp: 1, equipped: true }];
      scene.activePowerups = [{ id: 'storm-core', rarity: 'rare', expiresAt: scene.time.now + 30000 }];
      scene.renderItemPanel();
      const badge = document.querySelector('.item-badge[data-item-id="ricochet-chamber"]');
      badge.dispatchEvent(new MouseEvent('mouseover', { bubbles: true, clientX: 210, clientY: 210 }));
      const tooltip = document.querySelector('.item-tooltip');
      const tooltipVisible = Boolean(tooltip && !tooltip.hidden);
      const tooltipText = tooltip?.textContent ?? '';

      resolve({
        tier1,
        tier5,
        normalPlayerShotSurvived,
        enemyShotSurvived,
        ricochetBounced,
        ricochetExpiredAfterBounce,
        tooltipVisible,
        tooltipText,
      });
    }, 550);
  };
  waitForGame();
})`);

const errors = events
  .filter((event) => ['Runtime.exceptionThrown', 'Log.entryAdded'].includes(event.method))
  .map((event) => event.params?.exceptionDetails?.text || event.params?.entry?.text || event.method)
  .filter((text) => !String(text).includes('GL Driver Message'))
  .filter((text) => !String(text).includes('Automatic fallback to software WebGL has been deprecated'));

const failures = [];
if (audit.tier5.count <= audit.tier1.count) failures.push('tier 5 did not spawn more enemies than tier 1');
if (audit.tier5.maxHp <= audit.tier1.maxHp) failures.push('tier 5 enemies did not gain HP');
if (audit.tier5.maxDamage <= audit.tier1.maxDamage) failures.push('tier 5 enemies did not gain damage');
if (!audit.tier5.names.some((name) => /Ancient|Trade-Wind|Veteran|Royal/.test(name))) failures.push('tier 5 did not include high-tier encounter names');
if (!audit.normalPlayerShotSurvived) failures.push('normal player shot expired before leaving world');
if (!audit.enemyShotSurvived) failures.push('enemy shot expired before leaving world');
if (!audit.ricochetBounced) failures.push('ricochet shot did not bounce or get an expiry');
if (!audit.ricochetExpiredAfterBounce) failures.push('ricochet shot did not expire after post-bounce timeout');
if (!audit.tooltipVisible || !audit.tooltipText.includes('Projectiles bounce')) failures.push('item tooltip did not appear with relic effect text');

console.log(JSON.stringify({ ...audit, failures, errors }, null, 2));
close();

if (failures.length || errors.length) {
  process.exitCode = 1;
}
