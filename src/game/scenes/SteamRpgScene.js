import Phaser from 'phaser';
import {
  BATTLE,
  MAP_X,
  MAP_Y,
  SIDEBAR_X,
  TILE,
  WORLD,
  enemyTemplate,
  itemData,
  palette,
  partyTemplate,
  statusRules,
  valveSequence,
  worldTiles,
} from '../config/gameData.js';
import {
  applyStatus,
  cloneBattlers,
  damageMultiplier,
  hasStatus,
  statusLabel,
  tickStatuses,
} from '../systems/combat.js';
import { playSfx } from '../systems/audio.js';
import { drawBar, drawPanel, textStyle } from '../ui/drawing.js';

class SteamRpgScene extends Phaser.Scene {
  constructor() {
    super('SteamRpgScene');
  }

  create() {
    this.mode = WORLD;
    this.inventory = new Set();
    this.messageLog = [
      'Find the key, read the gauge, set the valve order, and power the lift.',
      'Press I for inventory. Space or Enter interacts.',
    ];
    this.party = cloneBattlers(partyTemplate);
    this.battleEnemies = [];
    this.selectedCommand = 0;
    this.activeUnitIndex = null;
    this.inMenu = false;
    this.inventoryOpen = false;
    this.valveInput = [];
    this.valveSolved = false;
    this.gateOpen = false;
    this.enemyCleared = false;
    this.gameComplete = false;
    this.lastBattleRender = 0;

    this.createTextures();
    this.createWorld();
    this.createInput();
    this.renderWorld();
  }

  createTextures() {
    this.makeGearTexture('gear', palette.brass);
    this.makeGearTexture('red-gear', palette.red);
    this.makeGearTexture('blue-gear', palette.blue);

    const hero = this.add.graphics();
    hero.fillStyle(palette.blue, 1);
    hero.fillRoundedRect(8, 7, 30, 31, 6);
    hero.fillStyle(palette.brass, 1);
    hero.fillCircle(23, 9, 7);
    hero.fillStyle(palette.coal, 1);
    hero.fillRect(18, 22, 11, 16);
    hero.generateTexture('hero', 46, 46);
    hero.destroy();

    const enemy = this.add.graphics();
    enemy.fillStyle(palette.copper, 1);
    enemy.fillTriangle(5, 40, 43, 40, 24, 5);
    enemy.fillStyle(palette.amber, 1);
    enemy.fillCircle(24, 24, 6);
    enemy.generateTexture('enemy', 48, 48);
    enemy.destroy();
  }

  makeGearTexture(key, color) {
    const gear = this.add.graphics();
    gear.fillStyle(color, 1);
    for (let i = 0; i < 12; i += 1) {
      const angle = (Math.PI * 2 * i) / 12;
      gear.fillRect(23 + Math.cos(angle) * 18, 23 + Math.sin(angle) * 18, 8, 8);
    }
    gear.fillCircle(27, 27, 19);
    gear.fillStyle(palette.coal, 1);
    gear.fillCircle(27, 27, 8);
    gear.generateTexture(key, 54, 54);
    gear.destroy();
  }

  createInput() {
    this.cursors = this.input.keyboard.createCursorKeys();
    this.keys = this.input.keyboard.addKeys('W,A,S,D,I,SPACE,ENTER,ESC,UP,DOWN');

    this.input.keyboard.on('keydown-SPACE', () => this.handleConfirm());
    this.input.keyboard.on('keydown-ENTER', () => this.handleConfirm());
    this.input.keyboard.on('keydown-I', () => this.toggleInventory());
    this.input.keyboard.on('keydown-UP', () => this.moveMenu(-1));
    this.input.keyboard.on('keydown-DOWN', () => this.moveMenu(1));
    this.input.keyboard.on('keydown-ESC', () => {
      if (this.inventoryOpen) {
        this.inventoryOpen = false;
        this.renderWorld();
        return;
      }

      if (this.mode === BATTLE && this.inMenu) {
        this.inMenu = false;
        this.activeUnitIndex = null;
        this.addLog('Command wheel released. ATB continues.');
        this.renderBattle();
      }
    });
  }

  createWorld() {
    this.worldTiles = [...worldTiles];
    this.player = { x: 5, y: 9 };
  }

  update(time, delta) {
    if (this.mode === WORLD) {
      this.updateWorldMovement();
      return;
    }

    this.updateBattle(time, delta);
  }

  renderWorld() {
    this.clearScene();
    this.add.rectangle(480, 270, 960, 540, 0x21140f);
    this.drawWorldFrame();
    this.drawMap();
    this.drawSidebar();
    this.drawMessagePanel();
    if (this.inventoryOpen) this.drawInventoryOverlay();
  }

  drawWorldFrame() {
    this.drawPanel(14, 14, 694, 392, 'Factory District');
    this.add.rectangle(365, 416, 690, 6, palette.brass).setAlpha(0.85);
    this.drawPanel(SIDEBAR_X, 14, 214, 392, 'Satchel');
    this.drawPanel(14, 424, 924, 96, 'Console');
  }

  drawMap() {
    for (let y = 0; y < this.worldTiles.length; y += 1) {
      for (let x = 0; x < this.worldTiles[y].length; x += 1) {
        this.drawTile(x, y);
      }
    }

    this.add.image(MAP_X + this.player.x * TILE + TILE / 2, MAP_Y + this.player.y * TILE + TILE / 2, 'hero');
  }

  drawTile(x, y) {
    const tile = this.worldTiles[y][x];
    const px = MAP_X + x * TILE;
    const py = MAP_Y + y * TILE;
    const isWall = tile === '#';
    const fill = isWall ? palette.smoke : (x + y) % 2 === 0 ? 0x382419 : 0x312017;
    this.add.rectangle(px + TILE / 2, py + TILE / 2, TILE - 2, TILE - 2, fill).setStrokeStyle(1, 0x5f3d24);

    if (tile === 'K' && !this.inventory.has('Brass Key')) {
      this.add.image(px + 17, py + 17, 'gear').setScale(0.34).setTint(palette.amber);
    }
    if (tile === 'S' && !this.inventory.has('Pressure Gauge')) {
      this.add.circle(px + 17, py + 17, 10, palette.cream).setStrokeStyle(3, palette.brass);
      this.add.line(px + 17, py + 17, 0, 0, 8, -6, palette.red).setLineWidth(2);
    }
    if (tile === 'V') {
      this.add.image(px + 17, py + 17, this.valveSolved ? 'gear' : 'red-gear').setScale(0.38);
    }
    if (tile === 'G' && !this.gateOpen) {
      this.add.rectangle(px + 17, py + 17, 26, 31, palette.red).setStrokeStyle(2, palette.amber);
    }
    if (tile === 'E' && !this.enemyCleared) {
      this.add.image(px + 17, py + 17, 'enemy').setScale(0.55).setTint(palette.copper);
    }
    if (tile === 'F') {
      this.add.rectangle(px + 17, py + 17, 24, 24, this.inventory.has('Aether Fuse') ? palette.green : palette.gray)
        .setStrokeStyle(2, palette.amber);
    }
    if (tile === 'P') {
      this.add.text(px + 9, py + 4, '?', this.textStyle(22, palette.amber)).setFontStyle('700');
    }
  }

  drawSidebar() {
    this.add.text(SIDEBAR_X + 18, 52, 'Inventory', this.textStyle(18, palette.amber)).setFontStyle('700');
    const items = Object.keys(itemData);
    items.forEach((item, index) => {
      const y = 84 + index * 54;
      const owned = this.inventory.has(item);
      this.add.rectangle(SIDEBAR_X + 106, y + 17, 176, 42, owned ? 0x392417 : 0x211713)
        .setStrokeStyle(1, owned ? palette.brass : palette.gray);
      this.add.text(SIDEBAR_X + 28, y + 4, item, this.textStyle(13, owned ? palette.cream : palette.gray)).setFontStyle('700');
      this.add.text(SIDEBAR_X + 28, y + 22, owned ? 'Acquired' : 'Missing', this.textStyle(12, owned ? palette.green : palette.copper));
    });

    this.add.text(SIDEBAR_X + 18, 258, 'Objectives', this.textStyle(18, palette.amber)).setFontStyle('700');
    const objectives = [
      ['Key', this.inventory.has('Brass Key')],
      ['Gauge', this.inventory.has('Pressure Gauge')],
      ['Valve', this.valveSolved],
      ['Fuse', this.inventory.has('Aether Fuse')],
      ['Lift', this.gameComplete],
    ];
    objectives.forEach(([label, done], index) => {
      this.add.text(
        SIDEBAR_X + 28,
        290 + index * 20,
        `${done ? '[x]' : '[ ]'} ${label}`,
        this.textStyle(13, done ? palette.green : palette.cream),
      );
    });
  }

  drawMessagePanel() {
    this.add.image(44, 466, 'gear').setScale(0.45).setAlpha(0.8);
    this.add.text(78, 444, this.messageLog.at(-2) || '', this.textStyle(15, palette.cream));
    this.add.text(78, 472, this.messageLog.at(-1) || '', this.textStyle(15, palette.amber));
    this.add.text(734, 488, 'Move WASD/Arrows  Interact Space  Inventory I', this.textStyle(13, palette.cream));
  }

  drawInventoryOverlay() {
    this.add.rectangle(480, 270, 960, 540, 0x000000, 0.45);
    this.drawPanel(206, 76, 548, 382, 'Inventory and Status');
    this.add.text(238, 122, 'Satchel', this.textStyle(22, palette.amber)).setFontStyle('700');

    Object.entries(itemData).forEach(([item, description], index) => {
      const y = 162 + index * 66;
      const owned = this.inventory.has(item);
      this.add.rectangle(478, y + 18, 470, 50, owned ? 0x3a2519 : 0x211713).setStrokeStyle(1, owned ? palette.brass : palette.gray);
      this.add.text(258, y, `${owned ? '[x]' : '[ ]'} ${item}`, this.textStyle(16, owned ? palette.cream : palette.gray)).setFontStyle('700');
      this.add.text(258, y + 24, description, this.textStyle(13, owned ? palette.amber : palette.gray));
    });

    this.add.text(238, 374, 'Party Status', this.textStyle(18, palette.amber)).setFontStyle('700');
    this.party.forEach((unit, index) => {
      this.add.text(258 + index * 228, 406, `${unit.name} HP ${unit.hp}/${unit.maxHp}`, this.textStyle(14, palette.cream));
      this.add.text(258 + index * 228, 428, statusLabel(unit), this.textStyle(12, palette.amber));
    });
  }

  updateWorldMovement() {
    if (this.inventoryOpen || this.worldMoveLocked) return;
    const direction = this.readDirection();
    if (!direction) return;

    const next = { x: this.player.x + direction.x, y: this.player.y + direction.y };
    if (!this.canWalk(next.x, next.y)) return;

    this.player = next;
    this.playSfx('step');
    this.worldMoveLocked = true;
    this.time.delayedCall(135, () => {
      this.worldMoveLocked = false;
    });
    this.handleTileStep();
    if (this.mode === WORLD) this.renderWorld();
  }

  readDirection() {
    if (this.cursors.left.isDown || this.keys.A.isDown) return { x: -1, y: 0 };
    if (this.cursors.right.isDown || this.keys.D.isDown) return { x: 1, y: 0 };
    if (this.cursors.up.isDown || this.keys.W.isDown) return { x: 0, y: -1 };
    if (this.cursors.down.isDown || this.keys.S.isDown) return { x: 0, y: 1 };
    return null;
  }

  canWalk(x, y) {
    const tile = this.worldTiles[y]?.[x];
    if (!tile || tile === '#') {
      this.playSfx('error');
      return false;
    }

    if (tile === 'G' && !this.gateOpen) {
      this.addLog(this.inventory.has('Brass Key') ? 'The gate needs valve pressure before it will open.' : 'The factory gate is locked by a brass keyway.');
      this.playSfx('error');
      this.renderWorld();
      return false;
    }

    return true;
  }

  handleTileStep() {
    const tile = this.worldTiles[this.player.y][this.player.x];
    if (tile === 'K' && !this.inventory.has('Brass Key')) {
      this.addItem('Brass Key');
      this.addLog('Collected Brass Key.');
    }
    if (tile === 'S' && !this.inventory.has('Pressure Gauge')) {
      this.addItem('Pressure Gauge');
      this.addLog('Pressure Gauge acquired. Valve order: red, amber, blue.');
    }
    if (tile === 'E' && !this.enemyCleared) {
      this.startBattle();
    }
    if (tile === 'F') {
      if (this.inventory.has('Aether Fuse')) {
        this.gameComplete = true;
        this.addLog('Factory lift powered. Route complete.');
        this.playSfx('success');
      } else {
        this.addLog('The lift socket is empty. Aether Fuse required.');
      }
    }
    if (tile === 'P') {
      this.addLog('Blueprint note: recover key, read gauge, tune valve, win fuse.');
    }
  }

  handleConfirm() {
    if (this.mode === WORLD) {
      if (this.inventoryOpen) {
        this.toggleInventory();
        return;
      }
      this.interactWorld();
      return;
    }

    if (this.inMenu && this.activeUnitIndex !== null) {
      this.executeCommand();
    }
  }

  toggleInventory() {
    if (this.mode !== WORLD) return;
    this.inventoryOpen = !this.inventoryOpen;
    this.playSfx('menu');
    this.renderWorld();
  }

  interactWorld() {
    const tile = this.worldTiles[this.player.y][this.player.x];
    if (tile !== 'V') {
      this.addLog('Nothing mechanical responds here.');
      this.playSfx('error');
      this.renderWorld();
      return;
    }

    if (!this.inventory.has('Brass Key')) {
      this.addLog('The valve wheel is chained. Find the Brass Key.');
      this.playSfx('error');
      this.renderWorld();
      return;
    }

    if (!this.inventory.has('Pressure Gauge')) {
      this.addLog('The pressure dials are unreadable without a gauge.');
      this.playSfx('error');
      this.renderWorld();
      return;
    }

    const nextColor = valveSequence[this.valveInput.length];
    this.valveInput.push(nextColor);
    this.playSfx('valve');

    if (this.valveInput.length < valveSequence.length) {
      this.addLog(`Valve set to ${nextColor}. Continue the sequence.`);
      this.renderWorld();
      return;
    }

    this.valveSolved = true;
    this.gateOpen = true;
    this.addLog('Valve sequence complete. Eastern gate unlocked.');
    this.playSfx('success');
    this.renderWorld();
  }

  startBattle() {
    this.mode = BATTLE;
    this.inMenu = false;
    this.activeUnitIndex = null;
    this.battleEnemies = cloneBattlers(enemyTemplate);
    this.addLog('Ambushed by coal-smoke machines. ATB continues while menus are open.');
    this.playSfx('battle');
    this.renderBattle();
  }

  renderBattle() {
    this.clearScene();
    this.add.rectangle(480, 270, 960, 540, 0x1d100c);
    this.add.rectangle(480, 298, 930, 190, 0x352116).setStrokeStyle(2, palette.brass);
    this.add.rectangle(480, 366, 930, 8, palette.copper);

    this.drawBattleActors();
    this.drawBattleHud();
  }

  drawBattleActors() {
    this.battleEnemies.forEach((enemy) => {
      if (enemy.hp <= 0) return;
      this.add.image(enemy.x, enemy.y, 'enemy').setScale(1.72).setTint(enemy.tint);
      this.add.text(enemy.x - 58, enemy.y + 58, enemy.name, this.textStyle(14, palette.cream)).setFontStyle('700');
      this.drawBar(enemy.x - 55, enemy.y + 82, 110, 10, enemy.hp / enemy.maxHp, palette.red);
      this.drawBar(enemy.x - 55, enemy.y + 96, 110, 8, enemy.atb / 100, palette.amber);
      this.add.text(enemy.x - 55, enemy.y + 108, statusLabel(enemy), this.textStyle(11, palette.amber));
    });

    this.party.forEach((hero, index) => {
      if (hero.hp <= 0) return;
      const x = 704 + index * 112;
      const y = 250 + index * 72;
      this.add.image(x, y, 'hero').setScale(1.65).setTint(index === 0 ? palette.blue : palette.green);
      this.add.text(x - 50, y + 59, hero.name, this.textStyle(14, palette.cream)).setFontStyle('700');
      this.drawBar(x - 54, y + 82, 108, 10, hero.hp / hero.maxHp, palette.green);
      this.drawBar(x - 54, y + 96, 108, 8, hero.atb / 100, palette.amber);
    });
  }

  drawBattleHud() {
    this.drawPanel(18, 386, 924, 136, 'Command Deck');
    this.add.text(42, 422, this.messageLog.at(-1) || '', this.textStyle(15, palette.cream));

    this.party.forEach((unit, index) => {
      const x = 42 + index * 240;
      const y = 456;
      this.add.text(x, y, `${unit.name}  ${unit.role}`, this.textStyle(13, palette.amber)).setFontStyle('700');
      this.add.text(x, y + 22, `HP ${unit.hp}/${unit.maxHp}`, this.textStyle(13, palette.cream));
      this.drawBar(x + 82, y + 27, 132, 10, unit.atb / 100, palette.amber);
      this.add.text(x, y + 45, statusLabel(unit), this.textStyle(12, palette.cream));
    });

    this.drawStatusLegend();

    if (this.inMenu && this.activeUnitIndex !== null) {
      this.drawCommandMenu();
    }
  }

  drawCommandMenu() {
    const unit = this.party[this.activeUnitIndex];
    this.drawPanel(610, 404, 306, 102, `${unit.name} Orders`);
    unit.skills.forEach((skill, index) => {
      const y = 430 + index * 24;
      const selected = index === this.selectedCommand;
      this.add.rectangle(760, y + 9, 266, 22, selected ? 0x553018 : 0x000000, selected ? 0.9 : 0);
      this.add.text(636, y, `${selected ? '>' : ' '} ${skill.name}`, this.textStyle(15, selected ? palette.amber : palette.cream));
    });
    this.add.text(636, 498, unit.skills[this.selectedCommand].description, this.textStyle(11, palette.cream));
  }

  drawStatusLegend() {
    this.add.text(516, 454, 'Status', this.textStyle(13, palette.amber)).setFontStyle('700');
    Object.entries(statusRules).forEach(([name, rule], index) => {
      this.add.text(516, 474 + index * 12, `${name}: ${rule}`, this.textStyle(10, palette.cream));
    });
  }

  updateBattle(time, delta) {
    if (this.party.every((unit) => unit.hp <= 0)) {
      this.addLog('The boilers go cold. Refresh to retry.');
      this.renderBattle();
      return;
    }

    if (this.battleEnemies.every((unit) => unit.hp <= 0)) {
      this.enemyCleared = true;
      this.addItem('Aether Fuse');
      this.addLog('Victory. Aether Fuse recovered from the wreckage.');
      this.playSfx('success');
      this.mode = WORLD;
      this.replaceWorldTile('E', '.');
      this.renderWorld();
      return;
    }

    [...this.party, ...this.battleEnemies].forEach((unit) => {
      if (unit.hp <= 0 || (this.inMenu && this.party.includes(unit))) return;
      unit.atb = Math.min(100, unit.atb + (unit.speed * delta) / 1000);
    });

    const readyHero = this.party.findIndex((unit) => unit.hp > 0 && unit.atb >= 100);
    if (!this.inMenu && readyHero >= 0) {
      this.inMenu = true;
      this.activeUnitIndex = readyHero;
      this.selectedCommand = 0;
      this.addLog(`${this.party[readyHero].name} is ready. Choose a command.`);
      this.playSfx('ready');
      this.renderBattle();
      return;
    }

    const enemy = this.battleEnemies.find((unit) => unit.hp > 0 && unit.atb >= 100);
    if (enemy && !this.enemyActing) {
      this.enemyActing = true;
      this.enemyAction(enemy);
      return;
    }

    if (time - this.lastBattleRender > 180) {
      this.lastBattleRender = time;
      this.renderBattle();
    }
  }

  moveMenu(direction) {
    if (!this.inMenu || this.activeUnitIndex === null) return;
    const skills = this.party[this.activeUnitIndex].skills;
    this.selectedCommand = Phaser.Math.Wrap(this.selectedCommand + direction, 0, skills.length);
    this.playSfx('menu');
    this.renderBattle();
  }

  executeCommand() {
    const actor = this.party[this.activeUnitIndex];
    const skill = actor.skills[this.selectedCommand];

    if (hasStatus(actor, 'stunned')) {
      this.addLog(`${actor.name} is stunned and loses the action.`);
      this.playSfx('error');
      this.consumeTurn(actor);
      return;
    }

    if (hasStatus(actor, 'jammed') && Math.random() < 0.35) {
      this.addLog(`${actor.name}'s gear train jams. Command fails.`);
      this.playSfx('error');
      this.consumeTurn(actor);
      return;
    }

    if (hasStatus(actor, 'burned')) {
      actor.hp = Math.max(1, actor.hp - 6);
    }

    if (skill.target === 'ally') {
      const target = this.party.reduce((lowest, unit) => (unit.hp < lowest.hp ? unit : lowest), this.party[0]);
      target.hp = Math.min(target.maxHp, target.hp - skill.power);
      if (skill.cleanse) target.statuses = [];
      this.addLog(`${actor.name} uses ${skill.name} on ${target.name}.`);
      this.playSfx('heal');
    } else {
      const target = this.battleEnemies.find((unit) => unit.hp > 0);
      const damage = Math.round(skill.power * damageMultiplier(actor));
      target.hp = Math.max(0, target.hp - damage);
      if (skill.status && Math.random() < 0.75) this.applyStatus(target, skill.status, 2);
      if (skill.selfStatus) this.applyStatus(actor, skill.selfStatus, 2);
      this.addLog(`${actor.name} uses ${skill.name} for ${damage} damage.`);
      this.playSfx('hit');
    }

    this.consumeTurn(actor);
  }

  enemyAction(enemy) {
    const target = Phaser.Utils.Array.GetRandom(this.party.filter((unit) => unit.hp > 0));
    const damage = Math.round(17 * damageMultiplier(enemy));
    target.hp = Math.max(0, target.hp - damage);

    if (enemy.name === 'Valve Imp' && Math.random() < 0.5) this.applyStatus(target, 'jammed', 3);
    if (enemy.name === 'Rust Hound' && Math.random() < 0.35) this.applyStatus(target, 'burned', 3);
    if (Math.random() < 0.12) this.applyStatus(target, 'stunned', 1);

    enemy.atb = 0;
    this.tickStatuses(enemy);
    this.addLog(`${enemy.name} hits ${target.name} for ${damage}.`);
    this.playSfx('enemy');
    this.enemyActing = false;
    this.renderBattle();
  }

  consumeTurn(unit) {
    unit.atb = 0;
    this.tickStatuses(unit);
    this.inMenu = false;
    this.activeUnitIndex = null;
    this.time.delayedCall(160, () => this.renderBattle());
  }

  addItem(item) {
    this.inventory.add(item);
    this.playSfx('item');
  }

  applyStatus(unit, name, turns) {
    applyStatus(unit, name, turns);
  }

  tickStatuses(unit) {
    tickStatuses(unit);
  }

  replaceWorldTile(target, replacement) {
    this.worldTiles = this.worldTiles.map((row) => row.replace(target, replacement));
  }

  addLog(message) {
    this.messageLog.push(message);
    this.messageLog = this.messageLog.slice(-6);
  }

  drawPanel(x, y, width, height, title) {
    drawPanel(this, x, y, width, height, title);
  }

  drawBar(x, y, width, height, ratio, color) {
    drawBar(this, x, y, width, height, ratio, color);
  }

  textStyle(size, color) {
    return textStyle(size, color);
  }

  playSfx(type) {
    playSfx(this, type);
  }

  clearScene() {
    this.children.removeAll();
  }
}

export default SteamRpgScene;
