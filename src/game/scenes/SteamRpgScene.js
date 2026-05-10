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
  bossResistancePlan,
  statusRules,
  devTools,
  valveSequence,
  worldTiles,
} from '../config/gameData.js';
import {
  applyStatus,
  clearBattleStatuses,
  cloneBattlers,
  hasStatus,
  rollAttackDamage,
  statusLabel,
  tickStatuses,
} from '../systems/combat.js';
import { playSfx } from '../systems/audio.js';
import { drawBar, drawPanel, drawValveMarker, textStyle, wrappedTextStyle } from '../ui/drawing.js';

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
    this.statusMenuOpen = false;
    this.seenStatusPrompts = new Set();
    this.valveInput = [];
    this.valveSolved = false;
    this.gateOpen = false;
    this.enemyCleared = false;
    this.gameComplete = false;
    this.lastBattleRender = 0;
    this.damagePopups = [];
    this.devToolsOpen = false;
    this.forceNextCritical = false;

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
    this.keys = this.input.keyboard.addKeys('W,A,S,D,I,B,K,V,L,C,R,H,SPACE,ENTER,ESC,UP,DOWN');

    this.input.keyboard.on('keydown-SPACE', () => this.handleConfirm());
    this.input.keyboard.on('keydown-ENTER', () => this.handleConfirm());
    this.input.keyboard.on('keydown-I', () => this.toggleInventory());
    this.input.keyboard.on('keydown-H', () => this.toggleStatusMenu());
    this.input.keyboard.on('keydown-UP', () => this.moveMenu(-1));
    this.input.keyboard.on('keydown-DOWN', () => this.moveMenu(1));
    this.input.keyboard.on('keydown-BACKTICK', () => this.toggleDevTools());
    this.input.keyboard.on('keydown-B', () => this.devStartBattle());
    this.input.keyboard.on('keydown-K', () => this.devGrantTools());
    this.input.keyboard.on('keydown-V', () => this.devSolveValve());
    this.input.keyboard.on('keydown-L', () => this.devGrantFuse());
    this.input.keyboard.on('keydown-C', () => this.devForceCritical());
    this.input.keyboard.on('keydown-R', () => this.devReset());
    this.input.keyboard.on('keydown-ESC', () => {
      if (this.inventoryOpen) {
        this.inventoryOpen = false;
        this.renderWorld();
        return;
      }

      if (this.statusMenuOpen) {
        this.statusMenuOpen = false;
        this.renderCurrentMode();
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
    if (this.statusMenuOpen) this.drawStatusReferenceOverlay();
    if (this.devToolsOpen) this.drawDevTools();
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
      drawValveMarker(this, px + 17, py + 17, this.valveSolved);
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
    this.add.text(78, 442, this.messageLog.at(-2) || '', this.wrappedTextStyle(15, palette.cream, 590));
    this.add.text(78, 470, this.messageLog.at(-1) || '', this.wrappedTextStyle(15, palette.amber, 590));
    this.add.text(724, 444, 'WASD / Arrows', this.textStyle(13, palette.cream)).setFontStyle('700');
    this.add.text(724, 468, 'Space / Enter', this.textStyle(13, palette.cream)).setFontStyle('700');
    this.add.text(724, 492, 'I Inventory  H Status', this.textStyle(13, palette.cream)).setFontStyle('700');
  }

  drawInventoryOverlay() {
    this.add.rectangle(480, 270, 960, 540, 0x000000, 0.45);
    this.drawPanel(118, 72, 724, 390, 'Inventory and Status');
    this.drawPanel(146, 120, 408, 294, 'Satchel');
    this.drawPanel(580, 120, 234, 294, 'Party');

    Object.entries(itemData).forEach(([item, description], index) => {
      const y = 166 + index * 74;
      const owned = this.inventory.has(item);
      this.add.rectangle(350, y + 22, 360, 56, owned ? 0x3a2519 : 0x211713)
        .setStrokeStyle(1, owned ? palette.brass : palette.gray);
      this.add.text(188, y, `${owned ? '[x]' : '[ ]'} ${item}`, this.textStyle(16, owned ? palette.cream : palette.gray)).setFontStyle('700');
      this.add.text(188, y + 26, description, this.wrappedTextStyle(13, owned ? palette.amber : palette.gray, 322));
    });

    this.party.forEach((unit, index) => {
      const y = 164 + index * 112;
      this.add.rectangle(697, y + 28, 176, 74, 0x211713).setStrokeStyle(1, palette.brass);
      this.add.text(620, y, unit.name, this.textStyle(17, palette.amber)).setFontStyle('700');
      this.add.text(620, y + 25, `HP ${unit.hp}/${unit.maxHp}`, this.textStyle(14, palette.cream));
      this.drawBar(620, y + 48, 154, 10, unit.hp / unit.maxHp, palette.green);
      this.add.text(620, y + 64, statusLabel(unit), this.wrappedTextStyle(12, palette.amber, 154));
    });

    this.add.text(148, 430, 'Esc or I closes this menu.', this.textStyle(12, palette.gray));
  }

  drawStatusReferenceOverlay() {
    this.add.rectangle(480, 270, 960, 540, 0x000000, 0.48);
    this.drawPanel(154, 72, 652, 392, 'Status Reference');
    this.add.text(188, 116, 'Combat-only mechanical conditions', this.textStyle(18, palette.amber)).setFontStyle('700');

    Object.values(statusRules).forEach((rule, index) => {
      const y = 150 + index * 56;
      this.add.rectangle(480, y + 20, 562, 50, 0x211713).setStrokeStyle(1, palette.brass);
      this.add.text(214, y, rule.label, this.textStyle(16, palette.cream)).setFontStyle('700');
      this.add.text(214, y + 24, rule.summary, this.wrappedTextStyle(13, palette.amber, 512));
      this.add.text(704, y, name, this.textStyle(11, palette.gray));
    });

    this.add.text(214, 386, 'Planned boss resistances', this.textStyle(15, palette.amber)).setFontStyle('700');
    Object.entries(bossResistancePlan).forEach(([boss, plan], index) => {
      const y = 410 + index * 16;
      this.add.text(214, y, `${boss}: resists ${plan.resists.join(', ')}`, this.textStyle(11, palette.cream));
    });

    this.add.text(188, 448, 'Esc or H closes this menu.', this.textStyle(12, palette.gray));
  }

  drawDevTools() {
    this.drawPanel(632, 88, 288, 210, 'Developer Tools');
    this.add.text(656, 126, 'Prototype hotkeys', this.textStyle(15, palette.amber)).setFontStyle('700');
    devTools.forEach((line, index) => {
      this.add.text(656, 154 + index * 18, line, this.textStyle(13, palette.cream));
    });
    this.add.text(
      656,
      282,
      `Mode ${this.mode}  Crit ${this.forceNextCritical ? 'armed' : 'normal'}`,
      this.textStyle(12, palette.green),
    );
  }

  updateWorldMovement() {
    if (this.inventoryOpen || this.statusMenuOpen || this.worldMoveLocked) return;
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
      if (this.inventoryOpen || this.statusMenuOpen) {
        this.inventoryOpen = false;
        this.statusMenuOpen = false;
        this.renderWorld();
        return;
      }
      this.interactWorld();
      return;
    }

    if (this.statusMenuOpen) {
      this.statusMenuOpen = false;
      this.renderCurrentMode();
      return;
    }

    if (this.inMenu && this.activeUnitIndex !== null) {
      this.executeCommand();
    }
  }

  toggleInventory() {
    if (this.mode !== WORLD) return;
    this.inventoryOpen = !this.inventoryOpen;
    this.statusMenuOpen = false;
    this.playSfx('menu');
    this.renderWorld();
  }

  toggleStatusMenu() {
    this.statusMenuOpen = !this.statusMenuOpen;
    if (this.statusMenuOpen) this.inventoryOpen = false;
    this.playSfx('menu');
    this.renderCurrentMode();
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
    this.drawDamagePopups();
    this.drawBattleHud();
    if (this.statusMenuOpen) this.drawStatusReferenceOverlay();
    if (this.devToolsOpen) this.drawDevTools();
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
    this.drawPanel(18, 386, 594, 136, 'Command Deck');
    this.drawPanel(626, 386, 316, 136, this.inMenu && this.activeUnitIndex !== null ? 'Orders' : 'Status');
    this.add.text(42, 420, this.messageLog.at(-1) || '', this.wrappedTextStyle(15, palette.cream, 530));

    this.party.forEach((unit, index) => {
      const x = 42 + index * 270;
      const y = 460;
      this.add.text(x, y, `${unit.name}  ${unit.role}`, this.textStyle(13, palette.amber)).setFontStyle('700');
      this.add.text(x, y + 22, `HP ${unit.hp}/${unit.maxHp}`, this.textStyle(13, palette.cream));
      this.drawBar(x + 82, y + 27, 138, 10, unit.atb / 100, palette.amber);
      this.add.text(x, y + 45, statusLabel(unit), this.textStyle(12, palette.cream));
    });

    if (this.inMenu && this.activeUnitIndex !== null) {
      this.drawCommandMenu();
    } else {
      this.drawStatusLegend();
    }
  }

  drawCommandMenu() {
    const unit = this.party[this.activeUnitIndex];
    this.add.text(650, 420, unit.name, this.textStyle(13, palette.amber)).setFontStyle('700');
    unit.skills.forEach((skill, index) => {
      const y = 444 + index * 22;
      const selected = index === this.selectedCommand;
      this.add.rectangle(784, y + 9, 270, 20, selected ? 0x553018 : 0x000000, selected ? 0.9 : 0);
      this.add.text(650, y, `${selected ? '>' : ' '} ${skill.name}`, this.textStyle(14, selected ? palette.amber : palette.cream));
    });
    this.add.text(650, 510, unit.skills[this.selectedCommand].description, this.wrappedTextStyle(11, palette.cream, 260));
  }

  drawStatusLegend() {
    Object.values(statusRules).forEach((rule, index) => {
      this.add.text(650, 420 + index * 24, `${rule.label}: ${rule.summary}`, this.wrappedTextStyle(10, palette.cream, 260));
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
      this.clearBattleStatuses();
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
      if (hasStatus(unit, 'stunned')) return;
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
    if (this.statusMenuOpen || !this.inMenu || this.activeUnitIndex === null) return;
    const skills = this.party[this.activeUnitIndex].skills;
    this.selectedCommand = Phaser.Math.Wrap(this.selectedCommand + direction, 0, skills.length);
    this.playSfx('menu');
    this.renderBattle();
  }

  executeCommand() {
    const actor = this.party[this.activeUnitIndex];
    const skill = actor.skills[this.selectedCommand];

    if (hasStatus(actor, 'stunned')) {
      this.addLog(`${actor.name} is stunned; ATB pressure is paused.`);
      this.playSfx('error');
      this.consumeTurn(actor);
      return;
    }

    if (hasStatus(actor, 'jamming') && Math.random() < 0.35) {
      this.addLog(`${actor.name}'s mechanism jams. Command fails.`);
      this.playSfx('error');
      this.consumeTurn(actor);
      return;
    }

    if (hasStatus(actor, 'burned')) {
      actor.hp = Math.max(0, actor.hp - 8);
      this.spawnDamageNumber(this.getPartyActorX(actor), this.getPartyActorY(actor) - 58, 8, false, 'damage');
      this.addLog(`${actor.name} takes 8 burn damage.`);
      if (actor.hp <= 0) {
        this.consumeTurn(actor);
        return;
      }
    }

    if (skill.target === 'ally') {
      const target = this.party.reduce((lowest, unit) => (unit.hp < lowest.hp ? unit : lowest), this.party[0]);
      target.hp = Math.min(target.maxHp, target.hp - skill.power);
      if (skill.cleanse) target.statuses = [];
      this.spawnDamageNumber(this.getPartyActorX(target), this.getPartyActorY(target) - 58, Math.abs(skill.power), false, 'heal');
      this.addLog(`${actor.name} uses ${skill.name} on ${target.name}.`);
      this.playSfx('heal');
    } else {
      const target = this.battleEnemies.find((unit) => unit.hp > 0);
      const { damage, critical } = this.rollDamage(skill.power, actor, target);
      target.hp = Math.max(0, target.hp - damage);
      if (skill.status && Math.random() < 0.75) this.applyStatus(target, skill.status);
      if (skill.selfStatus) this.applyStatus(actor, skill.selfStatus, 4);
      this.spawnDamageNumber(target.x, target.y - 54, damage, critical, 'damage');
      this.addLog(`${actor.name} uses ${skill.name} for ${damage} damage${critical ? ' - CRITICAL!' : '.'}`);
      this.playSfx('hit');
    }

    this.consumeTurn(actor);
  }

  enemyAction(enemy) {
    const target = Phaser.Utils.Array.GetRandom(this.party.filter((unit) => unit.hp > 0));
    if (hasStatus(enemy, 'burned')) {
      enemy.hp = Math.max(0, enemy.hp - 8);
      this.spawnDamageNumber(enemy.x, enemy.y - 54, 8, false, 'damage');
      this.addLog(`${enemy.name} takes 8 burn damage.`);
      if (enemy.hp <= 0) {
        enemy.atb = 0;
        this.tickStatuses(enemy, 'action');
        this.tickGlobalStatuses();
        this.enemyActing = false;
        this.renderBattle();
        return;
      }
    }

    const { damage, critical } = this.rollDamage(17, enemy, target, 0.1);
    target.hp = Math.max(0, target.hp - damage);
    this.spawnDamageNumber(this.getPartyActorX(target), this.getPartyActorY(target) - 58, damage, critical, 'damage');

    this.tickGlobalStatuses();
    if (enemy.name === 'Valve Imp' && Math.random() < 0.5) this.applyStatus(target, 'jamming');
    if (enemy.name === 'Rust Hound' && Math.random() < 0.35) this.applyStatus(target, 'burned');
    if (Math.random() < 0.12) this.applyStatus(target, 'stunned');

    enemy.atb = 0;
    this.tickStatuses(enemy);
    this.addLog(`${enemy.name} hits ${target.name} for ${damage}${critical ? ' - critical!' : '.'}`);
    this.playSfx('enemy');
    this.enemyActing = false;
    this.renderBattle();
  }

  consumeTurn(unit) {
    unit.atb = 0;
    this.tickStatuses(unit, 'action');
    this.tickGlobalStatuses();
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
    if (!this.seenStatusPrompts.has(name)) {
      this.seenStatusPrompts.add(name);
      this.addLog(`${statusRules[name].label}: ${statusRules[name].prompt}`);
    }
  }

  tickStatuses(unit, durationType) {
    tickStatuses(unit, durationType);
  }

  tickGlobalStatuses() {
    [...this.party, ...this.battleEnemies].forEach((unit) => tickStatuses(unit, 'globalAction'));
  }

  replaceWorldTile(target, replacement) {
    this.worldTiles = this.worldTiles.map((row) => row.replace(target, replacement));
  }

  addLog(message) {
    this.messageLog.push(message);
    this.messageLog = this.messageLog.slice(-6);
  }

  rollDamage(basePower, attacker, target, criticalChance = 0.15) {
    if (this.forceNextCritical) {
      this.forceNextCritical = false;
      return rollAttackDamage(basePower, attacker, target, 1);
    }
    return rollAttackDamage(basePower, attacker, target, criticalChance);
  }

  spawnDamageNumber(x, y, amount, critical, type) {
    this.damagePopups.push({
      id: `${Date.now()}-${Math.random()}`,
      x,
      y,
      amount,
      critical,
      type,
      createdAt: this.time.now,
    });
  }

  drawDamagePopups() {
    const now = this.time.now;
    this.damagePopups = this.damagePopups.filter((popup) => now - popup.createdAt < 900);
    this.damagePopups.forEach((popup) => {
      const age = now - popup.createdAt;
      const progress = age / 900;
      const shake = popup.critical ? Math.sin(age / 24) * 8 : 0;
      const text = popup.type === 'heal' ? `+${popup.amount}` : popup.critical ? `${popup.amount}!` : `${popup.amount}`;
      const color = popup.critical ? palette.amber : popup.type === 'heal' ? palette.green : palette.red;
      const damageText = this.add.text(
        popup.x + shake,
        popup.y - progress * 42,
        text,
        this.textStyle(popup.critical ? 28 : 22, color),
      )
        .setOrigin(0.5)
        .setFontStyle('700')
        .setAlpha(1 - progress);

      damageText.setStroke('#180c08', popup.critical ? 6 : 4);
    });
  }

  getPartyActorX(unit) {
    return 704 + this.party.indexOf(unit) * 112;
  }

  getPartyActorY(unit) {
    return 250 + this.party.indexOf(unit) * 72;
  }

  toggleDevTools() {
    this.devToolsOpen = !this.devToolsOpen;
    this.addLog(`Developer tools ${this.devToolsOpen ? 'shown' : 'hidden'}.`);
    this.playSfx('menu');
    if (this.mode === WORLD) this.renderWorld();
    if (this.mode === BATTLE) this.renderBattle();
  }

  devStartBattle() {
    if (!this.devToolsOpen || this.mode === BATTLE) return;
    this.addLog('Dev: starting battle.');
    this.startBattle();
  }

  devGrantTools() {
    if (!this.devToolsOpen) return;
    this.addItem('Brass Key');
    this.addItem('Pressure Gauge');
    this.addLog('Dev: key and gauge granted.');
    if (this.mode === WORLD) this.renderWorld();
  }

  devSolveValve() {
    if (!this.devToolsOpen) return;
    this.valveInput = [...valveSequence];
    this.valveSolved = true;
    this.gateOpen = true;
    this.addLog('Dev: valve solved and gate opened.');
    this.playSfx('success');
    if (this.mode === WORLD) this.renderWorld();
  }

  devGrantFuse() {
    if (!this.devToolsOpen) return;
    this.addItem('Aether Fuse');
    this.addLog('Dev: fuse granted.');
    if (this.mode === WORLD) this.renderWorld();
  }

  devForceCritical() {
    if (!this.devToolsOpen) return;
    this.forceNextCritical = true;
    this.addLog('Dev: next damage hit will be critical.');
    if (this.mode === WORLD) this.renderWorld();
    if (this.mode === BATTLE) this.renderBattle();
  }

  devReset() {
    if (!this.devToolsOpen) return;
    this.scene.restart();
  }

  renderCurrentMode() {
    if (this.mode === WORLD) this.renderWorld();
    if (this.mode === BATTLE) this.renderBattle();
  }

  clearBattleStatuses() {
    [...this.party, ...this.battleEnemies].forEach((unit) => clearBattleStatuses(unit));
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

  wrappedTextStyle(size, color, width) {
    return wrappedTextStyle(size, color, width);
  }

  playSfx(type) {
    playSfx(this, type);
  }

  clearScene() {
    this.children.removeAll();
  }
}

export default SteamRpgScene;
