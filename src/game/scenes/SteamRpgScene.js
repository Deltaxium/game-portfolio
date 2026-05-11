import Phaser from 'phaser';
import {
  BATTLE,
  MAP_X,
  MAP_Y,
  PAUSED,
  SIDEBAR_X,
  TILE,
  TITLE,
  WORLD,
  equipmentData,
  itemData,
  palette,
  bossResistancePlan,
  statusRules,
  devTools,
  valveSequence,
  worldTiles,
} from '../config/gameData.js';
import { encounters } from '../content/encounters.js';
import { mobs } from '../content/mobs/index.js';
import { partyTemplate } from '../content/party.js';
import {
  applyStatus,
  chooseAction,
  clearBattleStatuses,
  cloneBattlers,
  createEncounterMobs,
  hasStatus,
  rollAttackDamage,
  resolveAttackAction,
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
    this.mode = TITLE;
    this.previousMode = WORLD;
    this.inventory = new Set();
    this.consumables = {
      'Steam Tonic': 2,
      'Coolant Ampoule': 1,
    };
    this.equipment = {
      ada: 'Riveted Saber',
      brass: 'Medic Boiler',
    };
    this.settingsState = {
      muted: false,
      reducedMotion: false,
    };
    this.messageLog = [
      'Find the key, read the gauge, set the valve order, and power the lift.',
      'Press I for inventory. Space or Enter interacts.',
    ];
    this.party = cloneBattlers(partyTemplate);
    this.battleEnemies = [];
    this.selectedCommand = 0;
    this.selectedTargetIndex = 0;
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
    this.battleResolved = false;
    this.enemyActing = false;
    this.damagePopups = [];
    this.hitEffects = [];
    this.devToolsOpen = false;
    this.forceNextCritical = false;

    this.createTextures();
    this.createWorld();
    this.createInput();
    this.renderTitle();
  }

  createTextures() {
    if (this.textures.exists('gear')) return;

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
    this.keys = this.input.keyboard.addKeys('W,A,S,D,I,B,K,V,L,C,R,H,P,M,N,O,SPACE,ENTER,ESC,UP,DOWN,LEFT,RIGHT');
    this.keyboardHandlers = [];

    this.registerKey('keydown-SPACE', () => this.handleConfirm());
    this.registerKey('keydown-ENTER', () => this.handleConfirm());
    this.registerKey('keydown-I', () => this.toggleInventory());
    this.registerKey('keydown-H', () => this.toggleStatusMenu());
    this.registerKey('keydown-P', () => this.togglePause());
    this.registerKey('keydown-M', () => this.toggleMute());
    this.registerKey('keydown-N', () => this.toggleReducedMotion());
    this.registerKey('keydown-O', () => this.saveGame());
    this.registerKey('keydown-UP', () => this.moveMenu(-1));
    this.registerKey('keydown-DOWN', () => this.moveMenu(1));
    this.registerKey('keydown-LEFT', () => this.moveTarget(-1));
    this.registerKey('keydown-RIGHT', () => this.moveTarget(1));
    this.registerKey('keydown-BACKTICK', () => this.toggleDevTools());
    this.registerKey('keydown-B', () => this.devStartBattle());
    this.registerKey('keydown-K', () => this.devGrantTools());
    this.registerKey('keydown-V', () => this.devSolveValve());
    this.registerKey('keydown-L', () => {
      if (this.mode === TITLE) {
        this.loadGame();
        return;
      }
      this.devGrantFuse();
    });
    this.registerKey('keydown-C', () => this.devForceCritical());
    this.registerKey('keydown-R', () => this.devReset());
    this.registerKey('keydown-ESC', () => {
      if (this.mode === TITLE) return;

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
        return;
      }

      this.togglePause();
    });

    this.events.once(Phaser.Scenes.Events.SHUTDOWN, () => this.destroyInputHandlers());
  }

  registerKey(eventName, handler) {
    this.keyboardHandlers.push([eventName, handler]);
    this.input.keyboard.on(eventName, handler);
  }

  destroyInputHandlers() {
    this.keyboardHandlers?.forEach(([eventName, handler]) => {
      this.input.keyboard.off(eventName, handler);
    });
    this.keyboardHandlers = [];
  }

  createWorld() {
    this.worldTiles = [...worldTiles];
    this.player = { x: 5, y: 9 };
  }

  update(time, delta) {
    if (this.mode === TITLE || this.mode === PAUSED) return;

    if (this.mode === WORLD) {
      this.updateWorldMovement();
      return;
    }

    this.updateBattle(time, delta);
  }

  renderTitle() {
    this.clearScene();
    this.add.rectangle(480, 270, 960, 540, 0x160d0a);
    this.add.image(480, 150, 'gear').setScale(1.75).setAlpha(0.35);
    this.add.text(480, 132, 'Boilerbound', this.textStyle(56, palette.amber)).setOrigin(0.5).setFontStyle('700');
    this.add.text(480, 190, 'A steampunk ATB RPG prototype', this.textStyle(18, palette.cream)).setOrigin(0.5);
    this.drawPanel(300, 252, 360, 164, 'Main Console');
    this.add.text(340, 298, 'Enter / Space  Start', this.textStyle(18, palette.cream));
    this.add.text(340, 330, 'L  Load saved run', this.textStyle(18, palette.cream));
    this.add.text(340, 362, `M  Sound ${this.settingsState.muted ? 'Off' : 'On'}`, this.textStyle(18, palette.cream));
    this.add.text(340, 394, `N  Motion ${this.settingsState.reducedMotion ? 'Reduced' : 'Full'}`, this.textStyle(18, palette.cream));
    this.add.text(318, 442, 'Push to main deploys this build to GitHub Pages and Firebase.', this.textStyle(12, palette.gray));
  }

  renderWorld() {
    this.clearScene();
    this.add.rectangle(480, 270, 960, 540, 0x21140f);
    this.drawWorldFrame();
    this.drawMap();
    this.drawMapHeader();
    this.drawSidebar();
    this.drawMessagePanel();
    if (this.inventoryOpen) this.drawInventoryOverlay();
    if (this.statusMenuOpen) this.drawStatusReferenceOverlay();
    if (this.devToolsOpen) this.drawDevTools();
  }

  drawWorldFrame() {
    this.drawPanel(14, 14, 694, 392);
    this.add.rectangle(365, 416, 690, 6, palette.brass).setAlpha(0.85);
    this.drawPanel(SIDEBAR_X, 14, 214, 392, 'Satchel');
    this.drawPanel(14, 424, 924, 96, 'Console');
  }

  drawMapHeader() {
    this.add.rectangle(143, 32, 156, 24, palette.panel, 0.96).setStrokeStyle(1, palette.copper);
    this.add.text(78, 23, 'Factory District', this.textStyle(14, palette.amber)).setFontStyle('700');
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
    const items = Object.entries(itemData).filter(([, item]) => item.type === 'key');
    items.forEach((item, index) => {
      const [name] = item;
      const y = 84 + index * 54;
      const owned = this.inventory.has(name);
      this.add.rectangle(SIDEBAR_X + 106, y + 17, 176, 42, owned ? 0x392417 : 0x211713)
        .setStrokeStyle(1, owned ? palette.brass : palette.gray);
      this.add.text(SIDEBAR_X + 28, y + 4, name, this.textStyle(13, owned ? palette.cream : palette.gray)).setFontStyle('700');
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
    this.add.text(724, 492, 'I Inventory  P Pause', this.textStyle(13, palette.cream)).setFontStyle('700');
  }

  drawInventoryOverlay() {
    this.add.rectangle(480, 270, 960, 540, 0x000000, 0.45);
    this.drawPanel(118, 72, 724, 390, 'Inventory and Status');
    this.drawPanel(146, 120, 408, 294, 'Satchel');
    this.drawPanel(580, 120, 234, 294, 'Party');

    Object.entries(itemData).forEach(([item, data], index) => {
      const y = 150 + index * 48;
      const owned = data.type === 'consumable' ? this.consumables[item] > 0 : this.inventory.has(item);
      const count = data.type === 'consumable' ? ` x${this.consumables[item] || 0}` : '';
      this.add.rectangle(350, y + 22, 360, 56, owned ? 0x3a2519 : 0x211713)
        .setStrokeStyle(1, owned ? palette.brass : palette.gray);
      this.add.text(188, y, `${owned ? '[x]' : '[ ]'} ${item}${count}`, this.textStyle(15, owned ? palette.cream : palette.gray)).setFontStyle('700');
      this.add.text(188, y + 24, data.description, this.wrappedTextStyle(11, owned ? palette.amber : palette.gray, 322));
    });

    this.party.forEach((unit, index) => {
      const y = 164 + index * 112;
      const equipment = equipmentData[this.equipment[unit.id]];
      this.add.rectangle(697, y + 28, 176, 74, 0x211713).setStrokeStyle(1, palette.brass);
      this.add.text(620, y, unit.name, this.textStyle(17, palette.amber)).setFontStyle('700');
      this.add.text(620, y + 25, `HP ${unit.hp}/${unit.maxHp}`, this.textStyle(14, palette.cream));
      this.drawBar(620, y + 48, 154, 10, unit.hp / unit.maxHp, palette.green);
      this.add.text(620, y + 64, equipment?.description || statusLabel(unit), this.wrappedTextStyle(11, palette.amber, 154));
    });

    this.add.text(148, 430, 'Esc or I closes this menu. O saves outside combat.', this.textStyle(12, palette.gray));
  }

  drawStatusReferenceOverlay() {
    this.add.rectangle(480, 270, 960, 540, 0x000000, 0.48);
    this.drawPanel(154, 72, 652, 392, 'Status Reference');
    this.add.text(188, 116, 'Combat-only mechanical conditions', this.textStyle(18, palette.amber)).setFontStyle('700');

    Object.entries(statusRules).forEach(([name, rule], index) => {
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
    this.drawPanel(632, 72, 288, 260, 'Developer Tools');
    this.add.text(656, 126, 'Prototype hotkeys', this.textStyle(15, palette.amber)).setFontStyle('700');
    devTools.forEach((line, index) => {
      this.add.text(656, 154 + index * 18, line, this.textStyle(13, palette.cream));
    });
    this.add.text(
      656,
      314,
      `Mode ${this.mode}  Crit ${this.forceNextCritical ? 'armed' : 'normal'}`,
      this.textStyle(12, palette.green),
    );
  }

  updateWorldMovement() {
    if (this.inventoryOpen || this.statusMenuOpen || this.worldMoveLocked) return;
    const direction = this.readDirection();
    if (!direction) return;

    const next = { x: this.player.x + direction.x, y: this.player.y + direction.y };
    if (!this.canWalk(next.x, next.y)) {
      this.lockWorldMovement(180);
      return;
    }

    this.player = next;
    this.playSfx('step');
    this.lockWorldMovement(135);
    this.handleTileStep();
    if (this.mode === WORLD) this.renderWorld();
  }

  lockWorldMovement(duration) {
    this.worldMoveLocked = true;
    this.time.delayedCall(duration, () => {
      if (this.scene.isActive()) this.worldMoveLocked = false;
    });
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
    if (this.mode === TITLE) {
      this.startNewRun();
      return;
    }

    if (this.mode === PAUSED) {
      this.togglePause();
      return;
    }

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

  startNewRun() {
    this.mode = WORLD;
    this.previousMode = WORLD;
    this.addLog('Run started. Factory systems are online.');
    this.playSfx('success');
    this.renderWorld();
  }

  togglePause() {
    if (this.mode === TITLE) return;
    if (this.mode === PAUSED) {
      this.mode = this.previousMode;
      this.renderCurrentMode();
      return;
    }

    this.previousMode = this.mode;
    this.mode = PAUSED;
    this.renderPause();
  }

  renderPause() {
    this.clearScene();
    this.add.rectangle(480, 270, 960, 540, 0x160d0a);
    this.drawPanel(292, 128, 376, 284, 'Paused');
    this.add.text(336, 178, 'Enter / P  Resume', this.textStyle(18, palette.cream));
    this.add.text(336, 214, 'O  Save run', this.textStyle(18, palette.cream));
    this.add.text(336, 250, `M  Sound ${this.settingsState.muted ? 'Off' : 'On'}`, this.textStyle(18, palette.cream));
    this.add.text(336, 286, `N  Motion ${this.settingsState.reducedMotion ? 'Reduced' : 'Full'}`, this.textStyle(18, palette.cream));
    this.add.text(336, 322, 'R  Reset if dev tools are open', this.textStyle(18, palette.cream));
    this.add.text(336, 342, this.messageLog.at(-1) || '', this.wrappedTextStyle(13, palette.amber, 290));
  }

  toggleMute() {
    this.settingsState.muted = !this.settingsState.muted;
    this.addLog(`Sound ${this.settingsState.muted ? 'muted' : 'enabled'}.`);
    this.renderCurrentMode();
  }

  toggleReducedMotion() {
    this.settingsState.reducedMotion = !this.settingsState.reducedMotion;
    this.addLog(`Motion ${this.settingsState.reducedMotion ? 'reduced' : 'restored'}.`);
    this.renderCurrentMode();
  }

  toggleInventory() {
    if (this.mode !== WORLD) return;
    this.inventoryOpen = !this.inventoryOpen;
    this.statusMenuOpen = false;
    this.playSfx('menu');
    this.renderWorld();
  }

  toggleStatusMenu() {
    if (this.mode === BATTLE) {
      this.addLog('Status reference is available outside combat.');
      this.playSfx('error');
      this.renderBattle();
      return;
    }

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
    this.selectedTargetIndex = 0;
    this.battleResolved = false;
    this.enemyActing = false;
    this.inventoryOpen = false;
    this.statusMenuOpen = false;
    this.damagePopups = [];
    this.hitEffects = [];
    this.battleEnemies = createEncounterMobs(encounters.factoryAmbush, mobs);
    this.battleEnemies.forEach((enemy) => {
      enemy.intent = chooseAction(enemy);
    });
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
    if (this.devToolsOpen) this.drawDevTools();
    this.flushDamagePopups();
  }

  drawBattleActors() {
    this.battleEnemies.forEach((enemy) => {
      if (enemy.hp <= 0) return;
      const effect = this.getHitEffect(enemy.id);
      const isTargeted = this.getSelectedEnemy() === enemy && this.inMenu;
      this.add.image(enemy.x + effect.x, enemy.y + effect.y, 'enemy').setScale(1.72).setTint(enemy.tint);
      this.add.ellipse(enemy.x, enemy.y + 56, 104, 16, 0x0d0907, 0.36);
      if (isTargeted) {
        this.add.triangle(enemy.x, enemy.y - 54, 0, 0, 18, -22, 36, 0, palette.amber).setOrigin(0.5);
      }
    });

    this.party.forEach((hero, index) => {
      if (hero.hp <= 0) return;
      const x = 704 + index * 112;
      const y = 250 + index * 72;
      const effect = this.getHitEffect(hero.id);
      this.add.image(x + effect.x, y + effect.y, 'hero').setScale(1.65).setTint(index === 0 ? palette.blue : palette.green);
      this.add.ellipse(x, y + 56, 96, 14, 0x0d0907, 0.34);
    });
  }

  drawBattleHud() {
    this.drawEnemyPlates();
    this.drawPartyPlates();
    this.drawPanel(18, 382, 594, 142, 'Command Deck');
    this.add.text(42, 418, this.messageLog.at(-1) || '', this.wrappedTextStyle(14, palette.cream, 520));

    if (this.inMenu && this.activeUnitIndex !== null) {
      this.drawCommandMenu();
    }
  }

  drawEnemyPlates() {
    this.battleEnemies.forEach((enemy, index) => {
      const x = 24 + index * 222;
      const y = 22;
      this.add.rectangle(x + 104, y + 41, 208, 68, 0x211713, 0.95).setStrokeStyle(2, palette.brass);
      this.add.text(x + 14, y + 10, enemy.name, this.textStyle(13, palette.amber)).setFontStyle('700');
      this.add.text(x + 14, y + 28, `HP ${enemy.hp}/${enemy.maxHp}`, this.textStyle(12, palette.cream));
      this.drawBar(x + 78, y + 33, 112, 9, enemy.hp / enemy.maxHp, palette.red);
      this.add.text(x + 14, y + 46, 'ATB', this.textStyle(9, palette.gray));
      this.drawBar(x + 78, y + 47, 112, 7, enemy.atb / 100, palette.amber);
      this.add.text(x + 14, y + 58, this.compactStatusLabel(enemy), this.wrappedTextStyle(10, palette.cream, 84));
      this.add.text(x + 102, y + 58, `Intent: ${enemy.intent?.name || 'Attack'}`, this.wrappedTextStyle(10, palette.amber, 90));
    });
  }

  drawPartyPlates() {
    this.party.forEach((unit, index) => {
      const x = 626 + index * 158;
      const y = 392;
      this.add.rectangle(x + 74, y + 58, 148, 112, 0x211713, 0.96).setStrokeStyle(2, palette.brass);
      this.add.text(x + 12, y + 10, unit.name, this.textStyle(14, palette.amber)).setFontStyle('700');
      this.add.text(x + 12, y + 30, unit.role, this.wrappedTextStyle(10, palette.gray, 122));
      this.add.text(x + 12, y + 50, `HP ${unit.hp}/${unit.maxHp}`, this.textStyle(12, palette.cream));
      this.drawBar(x + 12, y + 68, 120, 9, unit.hp / unit.maxHp, palette.green);
      this.drawBar(x + 12, y + 84, 120, 8, unit.atb / 100, palette.amber);
      this.add.text(x + 12, y + 96, this.compactStatusLabel(unit), this.wrappedTextStyle(10, palette.cream, 120));
    });
  }

  drawCommandMenu() {
    const unit = this.party[this.activeUnitIndex];
    const commands = this.getCommandOptions(unit);
    if (this.selectedCommand >= commands.length) this.selectedCommand = 0;
    this.drawPanel(626, 382, 316, 142, `${unit.name} Orders`);
    commands.forEach((command, index) => {
      const y = 412 + index * 22;
      const selected = index === this.selectedCommand;
      this.add.rectangle(784, y + 9, 268, 20, selected ? 0x553018 : 0x000000, selected ? 0.9 : 0);
      this.add.text(650, y, `${selected ? '>' : ' '} ${command.name}`, this.textStyle(13, selected ? palette.amber : palette.cream));
    });
    this.add.text(650, 496, commands[this.selectedCommand].description, this.wrappedTextStyle(10, palette.cream, 260));
    if (commands[this.selectedCommand].target === 'enemy') {
      this.add.text(850, 496, '< > target', this.textStyle(10, palette.gray));
    }
  }

  getCommandOptions(unit) {
    const skills = unit.skills.map((skill) => ({ ...skill, commandType: 'skill' }));
    const items = Object.entries(this.consumables)
      .filter(([, count]) => count > 0)
      .map(([name, count]) => ({
        name: `${name} x${count}`,
        itemName: name,
        target: 'ally',
        commandType: 'item',
        description: itemData[name].description,
      }));
    return [...skills, ...items];
  }

  compactStatusLabel(unit) {
    if (!unit.statuses.length) return 'Normal';
    return unit.statuses
      .map((status) => {
        const label = statusRules[status.name]?.label || status.name;
        return status.turns ? `${label} ${status.turns}` : label;
      })
      .join(', ');
  }

  updateBattle(time, delta) {
    if (this.battleResolved) return;

    if (this.party.every((unit) => unit.hp <= 0)) {
      this.battleResolved = true;
      this.inMenu = false;
      this.activeUnitIndex = null;
      this.clearTransientBattleEffects();
      this.addLog('The boilers go cold. Refresh to retry.');
      this.renderBattle();
      return;
    }

    if (this.battleEnemies.every((unit) => unit.hp <= 0)) {
      this.battleResolved = true;
      this.inMenu = false;
      this.activeUnitIndex = null;
      this.clearTransientBattleEffects();
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

    this.lastBattleRender = time;
  }

  moveMenu(direction) {
    if (this.statusMenuOpen || !this.inMenu || this.activeUnitIndex === null) return;
    const commands = this.getCommandOptions(this.party[this.activeUnitIndex]);
    this.selectedCommand = Phaser.Math.Wrap(this.selectedCommand + direction, 0, commands.length);
    this.playSfx('menu');
    this.renderBattle();
  }

  moveTarget(direction) {
    if (!this.inMenu || this.activeUnitIndex === null) return;
    const command = this.getCommandOptions(this.party[this.activeUnitIndex])[this.selectedCommand];
    if (command.target !== 'enemy') return;
    const livingEnemies = this.battleEnemies.filter((unit) => unit.hp > 0);
    this.selectedTargetIndex = Phaser.Math.Wrap(this.selectedTargetIndex + direction, 0, livingEnemies.length);
    this.playSfx('menu');
    this.renderBattle();
  }

  executeCommand() {
    const actor = this.party[this.activeUnitIndex];
    const command = this.getCommandOptions(actor)[this.selectedCommand];

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

    if (command.commandType === 'item') {
      this.useCombatItem(actor, command.itemName);
    } else if (command.target === 'ally') {
      const target = this.party.reduce((lowest, unit) => (unit.hp < lowest.hp ? unit : lowest), this.party[0]);
      const healAmount = Math.abs(command.power) + this.getHealBonus(actor);
      target.hp = Math.min(target.maxHp, target.hp + healAmount);
      if (command.cleanse) target.statuses = [];
      this.spawnDamageNumber(this.getPartyActorX(target), this.getPartyActorY(target) - 58, healAmount, false, 'heal');
      this.addLog(`${actor.name} uses ${command.name} on ${target.name}.`);
      this.playSfx('heal');
    } else {
      const target = this.getSelectedEnemy();
      const { damage, critical } = this.rollDamage(command.power, actor, target);
      target.hp = Math.max(0, target.hp - damage);
      if (command.status && Math.random() < (command.statusChance ?? 1)) this.applyStatus(target, command.status);
      if (command.selfStatus) this.applyStatus(actor, command.selfStatus, 4);
      this.spawnHitEffect(target.id);
      this.spawnDamageNumber(target.x, target.y - 54, damage, critical, 'damage');
      this.addLog(`${actor.name} uses ${command.name} on ${target.name} for ${damage} damage${critical ? ' - CRITICAL!' : '.'}`);
      this.playSfx('hit');
    }

    this.consumeTurn(actor);
  }

  useCombatItem(actor, itemName) {
    const item = itemData[itemName];
    const target = this.party.reduce((lowest, unit) => (unit.hp < lowest.hp ? unit : lowest), this.party[0]);
    const healAmount = (item.heal || 0) + this.getHealBonus(actor);
    target.hp = Math.min(target.maxHp, target.hp + healAmount);
    if (item.cleanse) target.statuses = [];
    this.consumables[itemName] = Math.max(0, (this.consumables[itemName] || 0) - 1);
    this.spawnDamageNumber(this.getPartyActorX(target), this.getPartyActorY(target) - 58, healAmount, false, 'heal');
    this.addLog(`${actor.name} uses ${itemName} on ${target.name}.`);
    this.playSfx('heal');
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

    const action = enemy.intent || chooseAction(enemy);
    const result = this.resolveEnemyAction(enemy, action, target);
    target.hp = Math.max(0, target.hp - result.damage);
    this.spawnHitEffect(target.id);
    this.spawnDamageNumber(this.getPartyActorX(target), this.getPartyActorY(target) - 58, result.damage, result.critical, 'damage');
    this.tickGlobalStatuses();
    if (result.status) this.applyStatus(target, result.status.name, result.status.turns);

    enemy.atb = 0;
    enemy.intent = chooseAction(enemy);
    this.tickStatuses(enemy);
    this.addLog(
      `${enemy.name} ${action.log || `uses ${action.name}`} on ${target.name} for ${result.damage}${
        result.critical ? ' - critical!' : '.'
      }`,
    );
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
    this.time.delayedCall(160, () => {
      if (this.scene.isActive() && this.mode === BATTLE && !this.battleResolved) this.renderBattle();
    });
  }

  addItem(item) {
    if (itemData[item]?.type === 'consumable') {
      this.consumables[item] = (this.consumables[item] || 0) + 1;
      this.playSfx('item');
      return;
    }
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

  saveGame() {
    if (this.mode === TITLE || this.mode === BATTLE) {
      this.addLog('Save is available outside combat.');
      if (this.mode !== TITLE) this.renderCurrentMode();
      return;
    }

    const state = {
      inventory: [...this.inventory],
      consumables: this.consumables,
      equipment: this.equipment,
      party: this.party.map((unit) => ({ id: unit.id, hp: unit.hp })),
      player: this.player,
      valveInput: this.valveInput,
      valveSolved: this.valveSolved,
      gateOpen: this.gateOpen,
      enemyCleared: this.enemyCleared,
      gameComplete: this.gameComplete,
      settingsState: this.settingsState,
    };
    localStorage.setItem('boilerbound-save', JSON.stringify(state));
    this.addLog('Run saved locally.');
    this.playSfx('success');
    this.renderCurrentMode();
  }

  loadGame() {
    const rawSave = localStorage.getItem('boilerbound-save');
    if (!rawSave) {
      this.addLog('No local save found.');
      this.playSfx('error');
      this.renderTitle();
      return;
    }

    const state = JSON.parse(rawSave);
    this.inventory = new Set(state.inventory || []);
    this.consumables = { ...this.consumables, ...(state.consumables || {}) };
    this.equipment = { ...this.equipment, ...(state.equipment || {}) };
    this.player = state.player || this.player;
    this.valveInput = state.valveInput || [];
    this.valveSolved = Boolean(state.valveSolved);
    this.gateOpen = Boolean(state.gateOpen);
    this.enemyCleared = Boolean(state.enemyCleared);
    this.gameComplete = Boolean(state.gameComplete);
    this.settingsState = { ...this.settingsState, ...(state.settingsState || {}) };
    this.party.forEach((unit) => {
      const savedUnit = state.party?.find((entry) => entry.id === unit.id);
      if (savedUnit) unit.hp = Phaser.Math.Clamp(savedUnit.hp, 1, unit.maxHp);
    });
    if (this.enemyCleared) this.replaceWorldTile('E', '.');
    this.mode = WORLD;
    this.previousMode = WORLD;
    this.addLog('Local save loaded.');
    this.playSfx('success');
    this.renderWorld();
  }

  rollDamage(basePower, attacker, target, criticalChance = 0.15) {
    const equipment = equipmentData[this.equipment[attacker.id]];
    const adjustedPower = basePower + (equipment?.damageBonus || 0);
    if (this.forceNextCritical) {
      this.forceNextCritical = false;
      return rollAttackDamage(adjustedPower, attacker, target, 1);
    }
    return rollAttackDamage(adjustedPower, attacker, target, criticalChance);
  }

  getHealBonus(unit) {
    return equipmentData[this.equipment[unit.id]]?.healBonus || 0;
  }

  resolveEnemyAction(enemy, action, target) {
    const result = resolveAttackAction(action, enemy, target, this.forceNextCritical);
    if (this.forceNextCritical) this.forceNextCritical = false;
    return result;
  }

  spawnDamageNumber(x, y, amount, critical, type) {
    this.damagePopups.push({
      x,
      y,
      amount,
      critical,
      type,
    });
  }

  flushDamagePopups() {
    const popups = this.damagePopups;
    this.damagePopups = [];

    popups.forEach((popup) => {
      const text = popup.type === 'heal' ? `+${popup.amount}` : popup.critical ? `${popup.amount}!` : `${popup.amount}`;
      const color = popup.critical ? palette.amber : popup.type === 'heal' ? palette.green : palette.red;
      const damageText = this.add.text(
        popup.x,
        popup.y,
        text,
        this.textStyle(popup.critical ? 28 : 22, color),
      )
        .setOrigin(0.5)
        .setFontStyle('700');

      damageText.setStroke('#180c08', popup.critical ? 6 : 4);
      this.tweens.add({
        targets: damageText,
        alpha: 0,
        y: popup.y - 42,
        x: popup.critical ? popup.x + 10 : popup.x,
        duration: 780,
        ease: popup.critical ? 'Sine.easeInOut' : 'Quad.easeOut',
        yoyo: false,
        onUpdate: popup.critical
          ? () => {
              damageText.x = popup.x + Math.sin(this.time.now / 22) * 7;
            }
          : undefined,
        onComplete: () => damageText.destroy(),
      });
    });
  }

  spawnHitEffect(unitId) {
    if (this.settingsState.reducedMotion) return;
    this.hitEffects.push({ unitId, createdAt: this.time.now });
  }

  clearTransientBattleEffects() {
    this.damagePopups = [];
    this.hitEffects = [];
  }

  getHitEffect(unitId) {
    const now = this.time.now;
    this.hitEffects = this.hitEffects.filter((effect) => now - effect.createdAt < 260);
    const effect = this.hitEffects.find((entry) => entry.unitId === unitId);
    if (!effect) return { x: 0, y: 0 };
    const age = now - effect.createdAt;
    return {
      x: Math.sin(age / 18) * 7,
      y: Math.sin(age / 24) * 3,
    };
  }

  getSelectedEnemy() {
    const livingEnemies = this.battleEnemies.filter((unit) => unit.hp > 0);
    if (!livingEnemies.length) return null;
    this.selectedTargetIndex = Phaser.Math.Clamp(this.selectedTargetIndex, 0, livingEnemies.length - 1);
    return livingEnemies[this.selectedTargetIndex];
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
    this.renderCurrentMode();
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
    if (this.mode === TITLE) this.renderTitle();
    if (this.mode === WORLD) this.renderWorld();
    if (this.mode === BATTLE) this.renderBattle();
    if (this.mode === PAUSED) this.renderPause();
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
    [...this.children.getChildren()].forEach((child) => child.destroy());
  }
}

export default SteamRpgScene;
