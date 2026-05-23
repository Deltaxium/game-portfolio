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
  controlPanelPassword,
  controlRoomPaperHints,
  controlPasswordOptions,
  statusRules,
  districtRelayAnswer,
  districtRelayPaperHint,
  districtRelayOptions,
  hotelPuzzleAnswer,
  hotelPuzzleRooms,
  startingMapId,
  startingPlayer,
  devTools,
  valveSequence,
  worldMaps,
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
  tickStatuses,
} from '../systems/combat.js';
import { getFactoryObjective } from '../systems/objectives.js';
import { playSfx } from '../systems/audio.js';
import { drawBar, drawPanel, drawValveMarker, textStyle, wrappedTextStyle } from '../ui/drawing.js';
import { ensureMobBattleAnimations, ensureMobBattleTextures } from '../ui/mobSprites.js';
import { destroyBattleMoveEffectObjects, spawnBattleMoveEffect } from '../ui/battleMoveEffects.js';

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
      'Find a way into the factory.',
      'Press I for inventory. Space or Enter interacts.',
    ];
    this.party = cloneBattlers(partyTemplate);
    this.battleEnemies = [];
    this.selectedCommand = 0;
    this.selectedTargetIndex = 0;
    this.activeUnitIndex = null;
    this.battleCommandLayer = 'root';
    this.inMenu = false;
    this.inventoryOpen = false;
    this.objectiveOpen = false;
    this.infoOpen = false;
    this.sideMenuOpen = false;
    this.selectedSideMenuIndex = 1;
    this.selectedInfoIndex = 0;
    this.statusMenuOpen = false;
    this.activePuzzle = null;
    this.mapTransitioning = false;
    this.seenStatusPrompts = new Set();
    this.statusInfo = new Set();
    this.statusTutorial = null;
    this.valveInput = [];
    this.selectedValveIndex = 0;
    this.valveSolved = false;
    this.hotelPuzzleSolved = false;
    this.factoryInteriorUnlocked = false;
    this.selectedDistrictRelayIndex = 0;
    this.districtRelayState = districtRelayAnswer.map(() => false);
    this.selectedHotelRoomIndex = 0;
    this.selectedControlPasswordIndex = 0;
    this.controlPasswordInput = [];
    this.controlPasswordUnlocked = false;
    this.controlPanelActivated = false;
    this.controlPanelPromptOpen = false;
    this.selectedControlPanelChoice = 0;
    this.westernGateOpen = false;
    this.gateOpen = false;
    this.enemyCleared = false;
    this.gameComplete = false;
    this.battleResolved = false;
    this.enemyActing = false;
    this.currentEncounter = null;
    this.currentBattleRenderProfile = 'factoryDistrict';
    this.battleBackgroundObjects = null;
    this.battleBackgroundActive = false;
    this.stepsUntilEncounter = 0;
    this.startingPoint = null;
    this.latestRestPoint = null;
    this.damagePopups = [];
    this.hitEffects = [];
    this.enemyMoveEffectObjects = new Set();
    this.battleBarFills = { enemyAtb: new Map(), partyAtb: new Map() };
    this.worldMapBuilt = false;
    this.worldMapBuildKey = '';
    this.worldHudObjects = [];
    this.playerSprite = null;
    this.devToolsOpen = false;
    this.forceNextCritical = false;

    this.createTextures();
    this.createWorld();
    this.createInput();
    this.renderTitle();
  }

  createTextures() {
    if (!this.textures.exists('gear')) {
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

    ensureMobBattleTextures(this);
    ensureMobBattleAnimations(this);
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

      if (this.sideMenuOpen) {
        this.sideMenuOpen = false;
        this.renderWorld();
        return;
      }

      if (this.inventoryOpen || this.objectiveOpen || this.infoOpen) {
        this.selectedSideMenuIndex = this.getActiveSidePanelIndex();
        this.inventoryOpen = false;
        this.objectiveOpen = false;
        this.infoOpen = false;
        this.sideMenuOpen = true;
        this.renderWorld();
        return;
      }

      if (this.activePuzzle) {
        this.exitPuzzleFocus();
        return;
      }

      if (this.statusMenuOpen) {
        this.statusMenuOpen = false;
        this.renderCurrentMode();
        return;
      }

      if (this.mode === BATTLE && this.inMenu) {
        if (this.battleCommandLayer === 'skills' || this.battleCommandLayer === 'items') {
          this.battleCommandLayer = 'root';
          this.selectedCommand = 0;
          this.playSfx('menu');
          this.renderBattle();
          return;
        }
        this.battleCommandLayer = 'root';
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
    this.mapTilesById = Object.fromEntries(
      Object.entries(worldMaps).map(([mapId, map]) => [mapId, [...map.tiles]]),
    );
    this.currentMapId = startingMapId;
    this.currentMap = worldMaps[this.currentMapId];
    this.worldTiles = this.mapTilesById[this.currentMapId];
    this.player = { ...startingPlayer };
    this.startingPoint = { mapId: startingMapId, player: { ...startingPlayer } };
    this.latestRestPoint = null;
    this.stepsUntilEncounter = this.rollStepsUntilEncounter();
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
    this.drawTitleFactoryBackdrop();
    this.drawTitleMachineFrame();
    this.drawTitleGearwork();
    this.drawTitleSteam();
    this.drawTitleConsole();
  }

  drawTitleFactoryBackdrop() {
    this.add.rectangle(480, 424, 960, 232, 0x21140f);
    this.add.rectangle(480, 402, 960, 4, palette.copper, 0.75);

    const smokestacks = [
      { x: 92, w: 42, h: 236 },
      { x: 162, w: 34, h: 186 },
      { x: 772, w: 46, h: 224 },
      { x: 842, w: 32, h: 166 },
    ];
    smokestacks.forEach(({ x, w, h }) => {
      this.add.rectangle(x, 404 - h / 2, w, h, 0x271812).setStrokeStyle(2, 0x4b2a18);
      this.add.rectangle(x, 404 - h, w + 12, 12, palette.copper, 0.82).setStrokeStyle(1, palette.brass);
      this.add.rectangle(x, 402, w + 18, 12, 0x120d0a, 0.75);
    });

    for (let x = 230; x <= 690; x += 92) {
      this.add.rectangle(x, 316, 54, 178, 0x2a1912).setStrokeStyle(2, 0x53341f);
      this.add.rectangle(x, 244, 34, 26, 0x3b2419).setStrokeStyle(1, palette.copper);
      this.add.rectangle(x, 346, 32, 68, 0x130c09, 0.85).setStrokeStyle(1, palette.smoke);
      this.add.line(x, 346, -12, -24, 12, 24, palette.copper, 0.55).setLineWidth(2);
      this.add.line(x, 346, 12, -24, -12, 24, palette.copper, 0.55).setLineWidth(2);
    }

    for (let x = 30; x < 940; x += 48) {
      this.add.line(x, 410, -34, 92, 34, 92, 0x3b2419, 0.55).setLineWidth(2);
    }
  }

  drawTitleMachineFrame() {
    this.add.rectangle(480, 268, 830, 408, 0x0f0907, 0.24).setStrokeStyle(3, palette.brass);
    this.add.rectangle(480, 268, 806, 384, 0x000000, 0).setStrokeStyle(2, palette.copper);
    this.add.rectangle(480, 74, 778, 8, palette.brass, 0.9);
    this.add.rectangle(480, 460, 778, 8, palette.brass, 0.9);

    for (const x of [92, 868]) {
      this.add.rectangle(x, 268, 22, 384, 0x241914, 0.9).setStrokeStyle(2, palette.copper);
      for (let y = 98; y <= 438; y += 42) {
        this.add.circle(x, y, 5, palette.brass, 0.95).setStrokeStyle(1, palette.coal);
      }
    }

    this.add.line(480, 92, -350, 0, 350, 0, palette.copper, 0.55).setLineWidth(3);
    this.add.line(480, 444, -350, 0, 350, 0, palette.copper, 0.55).setLineWidth(3);
  }

  drawTitleGearwork() {
    const gears = [
      { x: 218, y: 148, scale: 1.48, duration: 12000, reverse: false },
      { x: 742, y: 142, scale: 1.28, duration: 9000, reverse: true },
      { x: 182, y: 366, scale: 0.92, duration: 8200, reverse: true },
      { x: 802, y: 366, scale: 0.98, duration: 7600, reverse: false },
    ];

    gears.forEach((gear) => {
      const image = this.add.image(gear.x, gear.y, 'gear').setScale(gear.scale).setAlpha(0.78);
      if (!this.settingsState.reducedMotion) {
        this.tweens.add({
          targets: image,
          angle: gear.reverse ? -360 : 360,
          duration: gear.duration,
          repeat: -1,
        });
      }
    });

    this.add.text(480, 120, 'CINDERWORKS', this.textStyle(58, palette.amber)).setOrigin(0.5).setFontStyle('700');
    this.add.text(480, 168, 'A STEAMPUNK ATB RPG PROTOTYPE', this.textStyle(15, palette.cream)).setOrigin(0.5).setFontStyle('700');
    this.add.rectangle(480, 199, 384, 5, palette.copper, 0.85);
    this.add.rectangle(480, 207, 256, 3, palette.brass, 0.85);
  }

  drawTitleSteam() {
    const vents = [
      { x: 128, y: 154 },
      { x: 812, y: 164 },
      { x: 318, y: 272 },
      { x: 650, y: 278 },
    ];
    vents.forEach(({ x, y }, index) => {
      for (let i = 0; i < 3; i += 1) {
        const puff = this.add.circle(x + i * 15, y - i * 12, 16 - i * 3, palette.cream, 0.12 + i * 0.03);
        if (!this.settingsState.reducedMotion) {
          this.tweens.add({
            targets: puff,
            y: puff.y - 26,
            alpha: 0.02,
            scale: 1.25,
            duration: 1800 + index * 180 + i * 120,
            yoyo: true,
            repeat: -1,
          });
        }
      }
    });
  }

  drawTitleConsole() {
    this.drawPanel(286, 238, 388, 188, 'Ignition Console');
    this.add.rectangle(480, 282, 324, 38, 0x160d0a, 0.92).setStrokeStyle(1, palette.brass);
    this.add.text(318, 270, 'Enter / Space', this.textStyle(18, palette.amber)).setFontStyle('700');
    this.add.text(520, 270, 'Start', this.textStyle(18, palette.cream)).setFontStyle('700');

    const options = [
      ['L', 'Load saved run'],
      ['M', `Sound ${this.settingsState.muted ? 'Off' : 'On'}`],
      ['N', `Motion ${this.settingsState.reducedMotion ? 'Reduced' : 'Full'}`],
    ];
    options.forEach(([key, label], index) => {
      const y = 322 + index * 30;
      this.add.circle(324, y + 7, 10, 0x1b110d).setStrokeStyle(2, palette.copper);
      this.add.text(320, y - 1, key, this.textStyle(11, palette.amber)).setFontStyle('700');
      this.add.text(348, y, label, this.textStyle(15, palette.cream));
    });

    this.drawTitleGauge(642, 292, 'PRESSURE', palette.red);
    this.drawTitleGauge(704, 360, 'AETHER', palette.blue);
    this.add.line(326, 432, -60, 0, 60, 0, palette.copper, 0.78).setLineWidth(4);
    this.add.line(634, 432, -60, 0, 60, 0, palette.copper, 0.78).setLineWidth(4);
    this.add.text(480, 476, 'Push to main deploys this build to GitHub Pages and Firebase.', this.textStyle(12, palette.gray)).setOrigin(0.5);
  }

  drawTitleGauge(x, y, label, needleColor) {
    this.add.circle(x, y, 28, 0x1b110d).setStrokeStyle(3, palette.brass);
    this.add.circle(x, y, 21, palette.cream, 0.9).setStrokeStyle(1, palette.copper);
    for (let i = 0; i < 5; i += 1) {
      const angle = Phaser.Math.DegToRad(205 + i * 32);
      this.add.line(
        x + Math.cos(angle) * 17,
        y + Math.sin(angle) * 17,
        0,
        0,
        Math.cos(angle) * 5,
        Math.sin(angle) * 5,
        palette.coal,
        0.75,
      ).setLineWidth(1);
    }
    this.add.line(x, y, 0, 0, 12, -9, needleColor).setLineWidth(3);
    this.add.circle(x, y, 4, palette.coal).setStrokeStyle(1, palette.brass);
    this.add.text(x, y + 38, label, this.textStyle(9, palette.amber)).setOrigin(0.5).setFontStyle('700');
  }

  renderWorld(options = {}) {
    const mapBuildKey = [
      this.currentMapId,
      this.enemyCleared ? 'enemy-cleared' : 'enemy-active',
      this.inventory.has('Brass Key') ? 'key-owned' : 'key-map',
      this.inventory.has('Pressure Gauge') ? 'gauge-owned' : 'gauge-map',
      this.inventory.has('Pressure Coupler') ? 'coupler-owned' : 'coupler-map',
      this.inventory.has('Factory Gate Key') ? 'factory-key-owned' : 'factory-key-missing',
      this.inventory.has('Aether Fuse') ? 'fuse-owned' : 'fuse-map',
      this.valveSolved ? 'valve-solved' : `valve-${this.selectedValveIndex}-${this.valveInput.length}`,
      this.hotelPuzzleSolved ? 'hotel-solved' : 'hotel-unsolved',
      this.factoryInteriorUnlocked ? 'interior-unlocked' : `signal-${this.selectedDistrictRelayIndex}-${this.districtRelayState.join('')}`,
      this.controlPasswordUnlocked ? 'control-password-unlocked' : `control-password-${this.selectedControlPasswordIndex}-${this.controlPasswordInput.join('')}`,
      this.controlPanelActivated ? 'control-panel-active' : `control-panel-${this.controlPanelPromptOpen}-${this.selectedControlPanelChoice}`,
      this.gateOpen ? 'gate-open' : 'gate-closed',
      this.westernGateOpen ? 'west-open' : 'west-closed',
      this.settingsState.reducedMotion ? 'reduced-motion' : 'full-motion',
    ].join('|');
    const rebuildMap = options.rebuildMap || !this.worldMapBuilt || this.worldMapBuildKey !== mapBuildKey;

    if (rebuildMap) {
      this.clearScene();
      this.add.rectangle(480, 270, 960, 540, 0x21140f);
      this.drawWorldFrame();
      this.drawMap();
      this.drawMapHeader();
      this.playerSprite = this.add.image(0, 0, 'hero');
      this.worldMapBuilt = true;
      this.worldMapBuildKey = mapBuildKey;
    } else if (!options.forceHud && this.worldHudSignature() === this._lastWorldHudSig) {
      this.updateWorldPlayerSprite();
      return;
    }

    this.updateWorldPlayerSprite();
    this.redrawWorldHud();
    this._lastWorldHudSig = this.worldHudSignature();
  }

  redrawWorldHud() {
    this.worldHudObjects.forEach((object) => object.destroy());
    this.worldHudObjects = this.captureNewObjects(() => {
      this.drawSidebar();
      this.drawMessagePanel();
      if (this.statusMenuOpen) this.drawStatusReferenceOverlay();
      if (this.devToolsOpen) this.drawDevTools();
    });
  }

  captureNewObjects(callback) {
    const before = new Set(this.children.getChildren());
    callback();
    return this.children.getChildren().filter((child) => !before.has(child));
  }

  updateWorldPlayerSprite() {
    if (!this.playerSprite) return;
    this.playerSprite.setPosition(
      MAP_X + this.player.x * TILE + TILE / 2,
      MAP_Y + this.player.y * TILE + TILE / 2,
    );
  }

  invalidateWorldMap() {
    this.worldMapBuilt = false;
    this.worldMapBuildKey = '';
  }

  refreshWorldHud() {
    if (this.mode === WORLD && this.worldMapBuilt) {
      this.redrawWorldHud();
      this._lastWorldHudSig = this.worldHudSignature();
    }
  }

  worldHudSignature() {
    return JSON.stringify({
      logs: this.messageLog,
      inventoryOpen: this.inventoryOpen,
      objectiveOpen: this.objectiveOpen,
      infoOpen: this.infoOpen,
      sideMenuOpen: this.sideMenuOpen,
      selectedSideMenuIndex: this.selectedSideMenuIndex,
      selectedInfoIndex: this.selectedInfoIndex,
      statusMenuOpen: this.statusMenuOpen,
      activePuzzle: this.activePuzzle,
      devToolsOpen: this.devToolsOpen,
      inventory: [...this.inventory].sort(),
      consumables: this.consumables,
      valveSolved: this.valveSolved,
      hotelPuzzleSolved: this.hotelPuzzleSolved,
      factoryInteriorUnlocked: this.factoryInteriorUnlocked,
      westernGateOpen: this.westernGateOpen,
      gameComplete: this.gameComplete,
      party: this.party.map((u) => ({
        id: u.id,
        hp: u.hp,
        maxHp: u.maxHp,
        statuses: (u.statuses || []).map((s) => [s.name, s.turns]),
      })),
      equipment: this.equipment,
      stepsUntilEncounter: this.stepsUntilEncounter,
    });
  }

  renderWorldAfterMovement() {
    this.renderWorld();
  }

  drawWorldFrame() {
    this.drawPanel(14, 14, 694, 392);
    this.add.rectangle(365, 416, 690, 6, palette.brass).setAlpha(0.85);
    this.drawPanel(SIDEBAR_X, 14, 214, 392, 'Menu');
    this.drawPanel(14, 424, 924, 96, 'Console');
  }

  drawMapHeader() {
    this.add.rectangle(164, 32, 198, 24, palette.panel, 0.96).setStrokeStyle(1, palette.copper);
    this.add.text(78, 23, this.currentMap.name, this.textStyle(14, palette.amber)).setFontStyle('700');
  }

  drawMap() {
    this.drawWorldDistrictBackdrop();

    for (let y = 0; y < this.worldTiles.length; y += 1) {
      for (let x = 0; x < this.worldTiles[y].length; x += 1) {
        this.drawTile(x, y);
      }
    }

    this.drawWorldDistrictOverlays();
  }

  drawTile(x, y) {
    const tile = this.worldTiles[y][x];
    const px = MAP_X + x * TILE;
    const py = MAP_Y + y * TILE;
    const isWall = tile === '#' || tile === 'H' || tile === 'w';
    this.drawFactoryBaseTile(px, py, x, y, tile, isWall);

    if (tile === 'K' && !this.inventory.has('Brass Key')) {
      this.drawKeyStation(px, py);
    }
    if (tile === 'S' && !this.inventory.has('Pressure Gauge')) {
      this.drawGaugeStation(px, py);
    }
    if (tile === 'C' && !this.inventory.has('Pressure Coupler')) {
      this.drawCouplerStation(px, py);
    }
    if (tile === 'V') {
      if (this.currentMap.renderProfile === 'factoryDistrict') this.drawDistrictRelayStation(px, py);
      else this.drawValveStation(px, py);
    }
    if (tile === 'G' && !this.gateOpen) {
      this.drawPressureGate(px, py);
    }
    if (tile === 'X') {
      this.drawAreaExit(px, py);
    }
    if (tile === 'E' && !this.enemyCleared) {
      this.drawEnemyStation(px, py);
    }
    if (tile === 'F') {
      this.drawLiftSocket(px, py);
    }
    if (tile === 'P') {
      this.drawBlueprintStation(px, py);
    }
    if (tile === 'D') {
      if (this.currentMap.renderProfile === 'factoryDistrict') this.drawHotelDoor(px, py);
      else this.drawRestRoomDoor(px, py);
    }
    if (tile === 'Q') {
      this.drawHotelPuzzleDesk(px, py);
    }
    if (tile === 'R') {
      this.drawControlCipherConsole(px, py);
    }
    if (tile === 'Y') {
      this.drawControlPanel(px, py);
    }
    if (tile === 'N') {
      this.drawPaperHint(px, py, x, y);
    }
    if (tile === 'U') {
      this.drawMapTransitionTile(px, py, tile);
    }
    if (tile === 'B') {
      this.drawBedStation(px, py);
    }
    if (tile === '=') {
      this.drawConveyorTile(px, py, x, y);
    }
    if (tile === '~') {
      this.drawSteamVentTile(px, py, x, y);
    }
    if (tile === 'p') {
      this.drawPipeRunTile(px, py, x, y);
    }
    if (tile === 'r') {
      this.drawRailTile(px, py, x, y);
    }
    if (tile === 'o') {
      this.drawBoilerTankTile(px, py, x, y);
    }
  }

  drawWorldDistrictBackdrop() {
    if (this.currentMap.renderProfile === 'factoryDistrict') {
      this.drawFactoryDistrictBackdrop();
      return;
    }

    if (this.currentMap.renderProfile === 'factoryInterior') {
      this.drawFactoryInteriorBackdrop();
      return;
    }

    if (this.currentMap.renderProfile === 'hotel') {
      this.drawHotelBackdrop();
      return;
    }

    const width = this.worldTiles[0].length * TILE;
    const height = this.worldTiles.length * TILE;
    const x = MAP_X;
    const y = MAP_Y;

    this.add.rectangle(x + width / 2, y + height / 2, width + 8, height + 8, 0x100907, 0.96)
      .setStrokeStyle(2, palette.copper);
    this.add.rectangle(x + width / 2, y + height / 2, width, height, 0x1d120e, 0.92);
    this.add.rectangle(x + width / 2, y + 20, width - 18, 18, palette.amber, 0.06);
    this.add.rectangle(x + width / 2, y + height - 20, width - 14, 28, 0x080403, 0.34);

    for (let col = 0; col < this.worldTiles[0].length; col += 4) {
      this.add.rectangle(x + col * TILE + TILE / 2, y + height / 2, 2, height - 16, 0x070403, 0.2);
    }

    const lampXs = this.currentMap.renderProfile === 'factoryInterior' ? [118, 330, 542] : [160, 520];
    lampXs.forEach((lampX, index) => {
      this.add.rectangle(lampX, y + 12, 20, 7, palette.iron, 0.9).setStrokeStyle(1, palette.copper);
      const glow = this.add.ellipse(lampX, y + 36, 74, 46, palette.amber, 0.08 + index * 0.01);
      this.addLoopTween(glow, {
        alpha: 0.16,
        scaleX: 1.12,
        duration: 1400 + index * 180,
        ease: 'Sine.easeInOut',
        yoyo: true,
      });
    });
  }

  drawFactoryDistrictBackdrop() {
    const width = this.worldTiles[0].length * TILE;
    const height = this.worldTiles.length * TILE;
    const x = MAP_X;
    const y = MAP_Y;

    this.add.rectangle(x + width / 2, y + height / 2, width + 8, height + 8, 0x080403, 0.96)
      .setStrokeStyle(2, palette.copper);
    this.add.rectangle(x + width / 2, y + height / 2, width, height, 0x1a1715, 0.96);
    this.add.rectangle(x + width / 2, y + 78, width, 156, 0x1f2a2d, 0.34);
    this.add.rectangle(x + width / 2, y + 220, width, 142, 0x17100d, 0.82);
    this.add.rectangle(x + width / 2, y + height - 46, width, 92, 0x100b09, 0.92);

    const stacks = [
      { sx: x + 92, h: 92, w: 18 },
      { sx: x + 184, h: 124, w: 22 },
      { sx: x + 428, h: 112, w: 20 },
      { sx: x + 568, h: 134, w: 24 },
    ];
    stacks.forEach(({ sx, h, w }, index) => {
      this.add.rectangle(sx, y + 118 - h / 2, w, h, 0x120c09, 0.9).setStrokeStyle(1, palette.copper, 0.42);
      this.add.rectangle(sx, y + 118 - h, w + 12, 6, palette.iron, 0.92).setStrokeStyle(1, palette.brass, 0.34);
      const smoke = this.add.ellipse(sx + 8, y + 108 - h, 34, 18, palette.smoke, 0.12);
      this.addLoopTween(smoke, {
        x: smoke.x + 14,
        y: smoke.y - 16,
        alpha: 0.03,
        scaleX: 1.35,
        duration: 1700 + index * 180,
        yoyo: true,
      });
    });

    for (let px = x + 48; px < x + width - 20; px += 92) {
      this.add.rectangle(px, y + 148, 74, 38, 0x120c09, 0.76).setStrokeStyle(1, palette.copper, 0.3);
      this.add.rectangle(px, y + 126, 64, 8, palette.iron, 0.82).setStrokeStyle(1, palette.brass, 0.28);
    }

    this.add.rectangle(x + width / 2, y + 255, width - 28, 7, palette.brass, 0.24);
    this.add.rectangle(x + width / 2, y + height - 12, width - 18, 18, 0x080403, 0.44);
  }

  drawFactoryInteriorBackdrop() {
    const width = this.worldTiles[0].length * TILE;
    const height = this.worldTiles.length * TILE;
    const x = MAP_X;
    const y = MAP_Y;

    this.add.rectangle(x + width / 2, y + height / 2, width + 8, height + 8, 0x100907, 0.96)
      .setStrokeStyle(2, palette.copper);
    this.add.rectangle(x + width / 2, y + height / 2, width, height, 0x1d120e, 0.92);
    this.add.rectangle(x + width / 2, y + 20, width - 18, 18, palette.amber, 0.06);
    this.add.rectangle(x + width / 2, y + height - 20, width - 14, 28, 0x080403, 0.34);

    for (let col = 0; col < this.worldTiles[0].length; col += 4) {
      this.add.rectangle(x + col * TILE + TILE / 2, y + height / 2, 2, height - 16, 0x070403, 0.2);
    }

    [118, 330, 542].forEach((lampX, index) => {
      this.add.rectangle(lampX, y + 12, 20, 7, palette.iron, 0.9).setStrokeStyle(1, palette.copper);
      const glow = this.add.ellipse(lampX, y + 36, 74, 46, palette.amber, 0.08 + index * 0.01);
      this.addLoopTween(glow, {
        alpha: 0.16,
        scaleX: 1.12,
        duration: 1400 + index * 180,
        ease: 'Sine.easeInOut',
        yoyo: true,
      });
    });
  }

  drawHotelBackdrop() {
    const width = this.worldTiles[0].length * TILE;
    const height = this.worldTiles.length * TILE;
    const x = MAP_X;
    const y = MAP_Y;

    this.add.rectangle(x + width / 2, y + height / 2, width + 8, height + 8, 0x0b0605, 0.96)
      .setStrokeStyle(2, palette.brass);
    this.add.rectangle(x + width / 2, y + height / 2, width, height, 0x241711, 0.94);
    this.add.rectangle(x + width / 2, y + 28, width - 28, 36, 0x3a2519, 0.82)
      .setStrokeStyle(1, palette.brass, 0.32);
    this.add.rectangle(x + width / 2, y + height - 28, width - 28, 48, 0x130c09, 0.62);
    for (let px = x + 74; px < x + width - 30; px += 102) {
      this.add.rectangle(px, y + 42, 24, 34, 0x21313a, 0.78).setStrokeStyle(1, palette.brass, 0.54);
      this.add.rectangle(px, y + 42, 7, 30, palette.amber, 0.16);
    }
  }

  drawWorldDistrictOverlays() {
    const width = this.worldTiles[0].length * TILE;
    const height = this.worldTiles.length * TILE;
    const x = MAP_X;
    const y = MAP_Y;

    this.add.rectangle(x + width / 2, y + 4, width - 18, 6, palette.brass, 0.28);
    this.add.rectangle(x + width / 2, y + height - 4, width - 14, 8, 0x080403, 0.42);

    if (this.currentMap.renderProfile === 'restRoom') {
      this.drawRestRoomOverlays(x, y);
      return;
    }

    if (this.currentMap.renderProfile === 'hotel') {
      this.drawHotelOverlays(x, y);
      return;
    }

    if (this.currentMap.renderProfile === 'factoryInterior') {
      this.drawWorldOverheadPipe(x + 62, y + 52, 184, false);
      this.drawWorldOverheadPipe(x + 438, y + 154, 184, true);
      this.drawWorldPressureDial(x + 304, y + 52, palette.red, -46);
      this.drawWorldPressureDial(x + 488, y + 238, palette.blue, -132);
      this.drawWorldSteamColumn(x + 390, y + 44, 0);
      this.drawWorldSteamColumn(x + 256, y + 280, 240);
      this.drawWorldLandmarkHighlights();
      this.drawWorldZoneSign(x + 90, y + 34, 'KEYWORKS');
      this.drawWorldZoneSign(x + 356, y + 136, 'PRESSURE WORKS');
      this.drawWorldZoneSign(x + 566, y + 306, 'LIFT PLATFORM');
      return;
    }

    this.drawDistrictSkyBridge(x + 124, y + 60, 184);
    this.drawDistrictSkyBridge(x + 424, y + 162, 176);
    this.drawDistrictCrane(x + 574, y + 72);
    this.drawWorldPressureDial(x + 286, y + 126, palette.red, -46);
    this.drawWorldPressureDial(x + 522, y + 264, palette.blue, -132);
    this.drawWorldSteamColumn(x + 162, y + 84, 0);
    this.drawWorldSteamColumn(x + 592, y + 242, 240);
    this.drawWorldLandmarkHighlights();
    this.drawWorldZoneSign(x + 90, y + 34, 'KEYWORKS');
    this.drawWorldZoneSign(x + 356, y + 136, 'LOADING RELAY');
    this.drawWorldZoneSign(x + 566, y + 306, 'LIFT PLATFORM');
    this.drawWorldZoneSign(x + 60, y + 194, 'LOADING DOOR');
  }

  drawDistrictSkyBridge(x, y, length) {
    this.add.rectangle(x + length / 2, y, length, 8, 0x090504, 0.72).setStrokeStyle(1, palette.copper, 0.48);
    for (let px = x + 12; px < x + length - 8; px += 18) {
      this.add.line(px, y, 0, -8, 10, 8, palette.brass, 0.28).setLineWidth(1);
    }
  }

  drawDistrictCrane(x, y) {
    this.add.line(x, y, -42, 0, 56, 0, palette.brass, 0.52).setLineWidth(3);
    this.add.line(x - 42, y, 0, 0, 26, 42, palette.copper, 0.42).setLineWidth(2);
    this.add.line(x + 56, y, 0, 0, -30, 44, palette.copper, 0.42).setLineWidth(2);
    this.add.line(x + 38, y, 0, 0, 0, 38, palette.smoke, 0.62).setLineWidth(1);
    this.add.rectangle(x + 38, y + 42, 13, 8, palette.iron, 0.88).setStrokeStyle(1, palette.brass, 0.42);
  }

  drawRestRoomOverlays(x, y) {
    this.drawWorldOverheadPipe(x + 82, y + 52, 122, false);
    this.drawWorldOverheadPipe(x + 438, y + 222, 156, false);
    this.drawWorldPressureDial(x + 548, y + 72, palette.green, -82);
    this.drawWorldSteamColumn(x + 608, y + 88, 120);
    this.drawWorldSteamColumn(x + 318, y + 286, 0);
    this.drawWorldLandmarkHighlights();
    this.drawWorldZoneSign(x + 146, y + 50, 'PIPE BUNKS');
    this.drawWorldZoneSign(x + 342, y + 150, 'REST COT');
    this.drawWorldZoneSign(x + 530, y + 286, 'BOILER SERVICE');
  }

  drawHotelOverlays(x, y) {
    this.drawWorldLandmarkHighlights();
    this.drawWorldZoneSign(x + 188, y + 50, 'RIVET & KETTLE');
    this.drawWorldZoneSign(x + 366, y + 144, 'CONCIERGE RELAY');
    this.drawWorldZoneSign(x + 300, y + 284, 'STEAM COTS');
    this.drawWorldOverheadPipe(x + 92, y + 80, 150, false);
    this.drawWorldPressureDial(x + 544, y + 84, palette.amber, -24);
  }

  drawWorldZoneSign(x, y, label) {
    this.add.rectangle(x, y, label.length * 7 + 18, 15, 0x080403, 0.62)
      .setStrokeStyle(1, palette.copper, 0.55);
    this.add.text(x, y - 5, label, this.textStyle(8, palette.amber))
      .setOrigin(0.5, 0)
      .setFontStyle('700');
  }

  drawWorldLandmarkHighlights() {
    const landmarkColors = {
      K: palette.brass,
      S: palette.blue,
      C: palette.copper,
      V: palette.amber,
      G: this.gateOpen ? palette.green : palette.red,
      X: this.westernGateOpen ? palette.green : palette.red,
      E: palette.copper,
      F: this.inventory.has('Aether Fuse') ? palette.green : palette.amber,
      D: palette.green,
      U: palette.green,
      B: palette.green,
      Q: this.hotelPuzzleSolved ? palette.green : palette.amber,
      R: this.controlPasswordUnlocked ? palette.green : palette.amber,
      Y: this.controlPanelActivated ? palette.green : palette.blue,
      N: palette.cream,
    };

    for (let y = 0; y < this.worldTiles.length; y += 1) {
      for (let x = 0; x < this.worldTiles[y].length; x += 1) {
        const tile = this.worldTiles[y][x];
        const color = landmarkColors[tile];
        if (!color) continue;
        const px = MAP_X + x * TILE;
        const py = MAP_Y + y * TILE;
        this.add.rectangle(px + 17, py + 17, TILE - 5, TILE - 5, color, 0.05)
          .setStrokeStyle(2, color, 0.68);
      }
    }
  }

  drawWorldOverheadPipe(x, y, length, vertical) {
    if (vertical) {
      this.add.line(x, y + length / 2, 0, -length / 2, 0, length / 2, palette.iron, 0.9).setLineWidth(7);
      this.add.line(x + 3, y + length / 2, 0, -length / 2, 0, length / 2, palette.copper, 0.46).setLineWidth(2);
      for (let py = y + 22; py < y + length; py += 48) {
        this.add.rectangle(x, py, 17, 8, palette.brass, 0.48).setStrokeStyle(1, palette.coal);
      }
      return;
    }

    this.add.line(x + length / 2, y, -length / 2, 0, length / 2, 0, palette.iron, 0.9).setLineWidth(7);
    this.add.line(x + length / 2, y + 3, -length / 2, 0, length / 2, 0, palette.copper, 0.46).setLineWidth(2);
    for (let px = x + 20; px < x + length; px += 48) {
      this.add.rectangle(px, y, 8, 17, palette.brass, 0.48).setStrokeStyle(1, palette.coal);
    }
  }

  drawWorldPressureDial(x, y, color, angle) {
    this.add.line(x, y - 22, 0, 0, 0, 20, palette.copper, 0.62).setLineWidth(2);
    this.add.circle(x, y, 13, palette.iron, 0.78).setStrokeStyle(2, palette.copper);
    this.add.circle(x, y, 8, palette.coal, 0.86).setStrokeStyle(1, palette.brass);
    this.add.line(x, y, 0, 0, 7, 0, color, 0.78).setAngle(angle).setLineWidth(2);
    this.add.circle(x, y, 3, palette.coal);
  }

  drawWorldSteamColumn(x, y, delay) {
    for (let i = 0; i < 3; i += 1) {
      const puff = this.add.circle(x + i * 8, y - i * 8, 9 - i, palette.cream, 0.11);
      this.addLoopTween(puff, {
        x: puff.x + 10,
        y: puff.y - 18,
        alpha: 0.02,
        scale: 1.35,
        duration: 1800 + i * 160,
        delay: delay + i * 120,
        ease: 'Sine.easeInOut',
        yoyo: true,
      });
    }
  }

  drawFactoryBaseTile(px, py, x, y, tile, isWall) {
    if (isWall) {
      if (tile === 'w') {
        this.drawRestRoomPartitionTile(px, py, x, y);
        return;
      }
      if (tile === 'H') {
        if (this.currentMap.renderProfile === 'factoryDistrict') {
          this.drawDistrictBuildingTile(px, py, x, y);
        } else if (this.currentMap.renderProfile === 'hotel') {
          this.drawHotelWallTile(px, py, x, y);
        } else {
          this.drawFactoryInteriorMachineTile(px, py, x, y);
        }
        return;
      }
      if (this.currentMap.renderProfile === 'factoryDistrict') {
        this.drawDistrictBoundaryTile(px, py, x, y);
        return;
      }
      if (this.currentMap.renderProfile === 'restRoom') {
        this.drawRestRoomBoundaryTile(px, py, x, y);
        return;
      }
      const face = y === 0 || y === this.worldTiles.length - 1 ? 0x3e302b : 0x4a3931;
      this.add.rectangle(px + 17, py + 19, TILE - 2, TILE - 2, 0x120c09, 0.34);
      this.add.rectangle(px + 17, py + 17, TILE - 2, TILE - 2, face).setStrokeStyle(1, 0x251711);
      this.add.rectangle(px + 17, py + 10, TILE - 5, 12, 0x5f4b40, 0.78);
      this.add.rectangle(px + 17, py + 26, TILE - 7, 8, 0x33231d, 0.58);
      this.add.line(px + 17, py + 17, -14, 0, 14, 0, 0x21140f, 0.72).setLineWidth(2);
      this.add.line(px + 17, py + 17, 0, -14, 0, 14, palette.copper, 0.34).setLineWidth(2);
      this.add.circle(px + 8, py + 8, 2.2, palette.brass, 0.74);
      this.add.circle(px + 26, py + 26, 2.2, palette.brass, 0.56);
      if ((x + y) % 3 === 0) {
        this.add.rectangle(px + 17, py + 6, 22, 4, palette.iron, 0.82).setStrokeStyle(1, palette.copper);
      }
      if (x === 0 || x === this.worldTiles[y].length - 1) {
        this.add.line(px + 17, py + 17, 0, -15, 0, 15, palette.brass, 0.25).setLineWidth(3);
      }
      return;
    }

    const isMachineTile = ['=', '~', 'p', 'r', 'o'].includes(tile);
    if (this.currentMap.renderProfile === 'factoryDistrict') {
      this.drawDistrictStreetTile(px, py, x, y, tile, isMachineTile);
      return;
    }

    const fill = (x + y) % 2 === 0 ? 0x2b201b : 0x241914;
    this.add.rectangle(px + 17, py + 18, TILE - 2, TILE - 2, 0x0b0604, 0.22);
    this.add.rectangle(px + 17, py + 17, TILE - 2, TILE - 2, fill).setStrokeStyle(1, 0x4a2d1b);
    this.add.rectangle(px + 17, py + 17, TILE - 7, TILE - 7, isMachineTile ? 0x2e211b : 0x35231a, isMachineTile ? 0.36 : 0.52)
      .setStrokeStyle(1, isMachineTile ? 0x624020 : 0x53341f);
    this.add.line(px + 17, py + 17, -12, -12, 12, 12, 0x130b08, 0.4).setLineWidth(1);
    this.add.line(px + 17, py + 17, -12, 12, 12, -12, palette.copper, 0.13).setLineWidth(1);
    this.add.circle(px + 8, py + 8, 1.6, palette.brass, 0.52);
    this.add.circle(px + 26, py + 26, 1.6, palette.brass, 0.38);
    if (!isMachineTile && (x + y) % 5 === 0) {
      this.add.rectangle(px + 17, py + 17, 18, 5, 0x1b110d, 0.78).setStrokeStyle(1, palette.smoke);
      for (let i = 0; i < 3; i += 1) {
        this.add.line(px + 10 + i * 6, py + 17, 0, -3, 0, 3, palette.copper, 0.55).setLineWidth(1);
      }
    }
  }

  drawDistrictStreetTile(px, py, x, y, tile, isMachineTile) {
    const base = (x + y) % 2 === 0 ? 0x221b18 : 0x1c1512;
    const paverA = isMachineTile ? 0x2a211c : 0x30241f;
    const paverB = isMachineTile ? 0x231b17 : 0x271d19;
    const mortar = 0x0f0907;
    const curb = palette.brass;
    const ironEdge = palette.iron;

    this.add.rectangle(px + 17, py + 18, TILE - 2, TILE - 2, 0x080403, 0.28);
    this.add.rectangle(px + 17, py + 17, TILE - 2, TILE - 2, base).setStrokeStyle(1, 0x3a2619, 0.78);

    for (let row = 0; row < 3; row += 1) {
      const y0 = py + 4 + row * 9;
      const offset = (row + x + y) % 2 === 0 ? 0 : 6;
      for (let col = -1; col < 3; col += 1) {
        const x0 = px + 2 + col * 13 + offset;
        if (x0 < px + 1 || x0 > px + 29) continue;
        const color = (row + col + x) % 2 === 0 ? paverA : paverB;
        this.add.rectangle(x0 + 6, y0 + 4, 11, 7, color, isMachineTile ? 0.42 : 0.68)
          .setStrokeStyle(1, mortar, isMachineTile ? 0.5 : 0.72);
      }
    }

    if (this.isDistrictEdgeTile(x, y, 0, -1)) {
      this.add.rectangle(px + 17, py + 3, TILE - 5, 4, ironEdge, 0.86).setStrokeStyle(1, curb, 0.48);
    }
    if (this.isDistrictEdgeTile(x, y, 0, 1)) {
      this.add.rectangle(px + 17, py + 31, TILE - 5, 4, 0x0b0604, 0.88).setStrokeStyle(1, curb, 0.42);
    }
    if (this.isDistrictEdgeTile(x, y, -1, 0)) {
      this.add.rectangle(px + 3, py + 17, 4, TILE - 5, ironEdge, 0.72).setStrokeStyle(1, curb, 0.36);
    }
    if (this.isDistrictEdgeTile(x, y, 1, 0)) {
      this.add.rectangle(px + 31, py + 17, 4, TILE - 5, 0x0b0604, 0.82).setStrokeStyle(1, curb, 0.34);
    }

    if (x % 5 === 2 && !isMachineTile) {
      this.add.rectangle(px + 17, py + 17, 5, TILE - 4, 0x090504, 0.72);
      this.add.line(px + 15, py + 17, 0, -14, 0, 14, palette.copper, 0.28).setLineWidth(1);
      this.add.line(px + 19, py + 17, 0, -14, 0, 14, palette.smoke, 0.22).setLineWidth(1);
    }

    if (y % 4 === 2 && !isMachineTile) {
      this.add.line(px + 17, py + 12, -14, 0, 14, 0, 0x0b0604, 0.54).setLineWidth(2);
      this.add.line(px + 17, py + 23, -14, 0, 14, 0, 0x0b0604, 0.44).setLineWidth(2);
      this.add.line(px + 17, py + 13, -13, 0, 13, 0, palette.brass, 0.16).setLineWidth(1);
    }

    if ((x * 3 + y) % 11 === 0) {
      this.drawStreetDrain(px, py, (x + y) % 2 === 0);
    } else if ((x + y * 2) % 7 === 0) {
      this.drawStreetUtilityPlate(px, py, x, y);
    }

    if ((x * 5 + y * 2) % 13 === 0 && !isMachineTile) {
      this.add.ellipse(px + 20, py + 21, 18, 9, 0x050302, 0.32);
      this.add.circle(px + 13, py + 17, 3, 0x050302, 0.24);
    }

    if ((x + y) % 6 === 0 && !isMachineTile) {
      this.add.circle(px + 8, py + 8, 1.5, palette.smoke, 0.26);
      this.add.circle(px + 26, py + 25, 1.3, palette.coal, 0.44);
    }
  }

  isDistrictEdgeTile(x, y, dx, dy) {
    const tile = this.worldTiles[y + dy]?.[x + dx];
    return tile === '#' || tile === 'H';
  }

  drawStreetDrain(px, py, vertical) {
    this.add.rectangle(px + 17, py + 17, vertical ? 10 : 22, vertical ? 23 : 10, 0x090504, 0.86)
      .setStrokeStyle(1, palette.copper, 0.54);
    const count = vertical ? 4 : 5;
    for (let i = 0; i < count; i += 1) {
      if (vertical) {
        this.add.line(px + 12 + i * 3, py + 17, 0, -9, 0, 9, palette.smoke, 0.5).setLineWidth(1);
      } else {
        this.add.line(px + 17, py + 12 + i * 3, -9, 0, 9, 0, palette.smoke, 0.5).setLineWidth(1);
      }
    }
  }

  drawStreetUtilityPlate(px, py, x, y) {
    const w = (x + y) % 2 === 0 ? 18 : 14;
    const h = (x + y) % 2 === 0 ? 12 : 16;
    this.add.rectangle(px + 17, py + 17, w, h, 0x15110f, 0.84).setStrokeStyle(1, palette.brass, 0.5);
    this.add.line(px + 17, py + 17, -w / 2 + 3, 0, w / 2 - 3, 0, palette.copper, 0.34).setLineWidth(1);
    this.add.circle(px + 17 - w / 2 + 4, py + 17 - h / 2 + 4, 1.3, palette.brass, 0.62);
    this.add.circle(px + 17 + w / 2 - 4, py + 17 + h / 2 - 4, 1.3, palette.brass, 0.48);
  }

  drawDistrictBuildingTile(px, py, x, y) {
    const above = this.worldTiles[y - 1]?.[x] === 'H';
    const below = this.worldTiles[y + 1]?.[x] === 'H';
    const left = this.worldTiles[y]?.[x - 1] === 'H';
    const right = this.worldTiles[y]?.[x + 1] === 'H';
    const facade = (x + y) % 2 === 0 ? 0x38251f : 0x2f211d;
    const trim = (x + y) % 3 === 0 ? palette.brass : palette.copper;

    this.add.rectangle(px + 17, py + 19, TILE - 2, TILE - 2, 0x080403, 0.42);
    this.add.rectangle(px + 17, py + 17, TILE - 2, TILE - 2, facade).setStrokeStyle(1, 0x1c100c);
    this.add.rectangle(px + 17, py + 8, TILE - 4, 8, 0x17100d, 0.9).setStrokeStyle(1, trim, 0.55);
    if (!above) {
      this.add.rectangle(px + 17, py + 3, TILE - 3, 5, palette.iron, 0.94).setStrokeStyle(1, trim, 0.72);
      if ((x + y) % 3 === 0) {
        this.add.rectangle(px + 8, py - 2, 7, 8, palette.copper, 0.88).setStrokeStyle(1, palette.coal);
      }
    }

    this.add.rectangle(px + 10, py + 18, 7, 8, 0x21313a, 0.9).setStrokeStyle(1, trim, 0.7);
    this.add.rectangle(px + 24, py + 18, 7, 8, 0x21313a, 0.86).setStrokeStyle(1, trim, 0.62);
    if ((x + y) % 2 === 0) {
      this.add.rectangle(px + 10, py + 18, 3, 8, palette.amber, 0.18);
    }
    if (!below) {
      this.add.rectangle(px + 17, py + 28, 12, 12, 0x140c09, 0.92).setStrokeStyle(1, trim, 0.65);
      this.add.circle(px + 21, py + 29, 1.3, palette.brass, 0.75);
    } else {
      this.add.rectangle(px + 17, py + 28, TILE - 8, 4, 0x140c09, 0.58);
    }

    if (!left) this.add.line(px + 3, py + 17, 0, -14, 0, 14, trim, 0.38).setLineWidth(2);
    if (!right) this.add.line(px + 31, py + 17, 0, -14, 0, 14, trim, 0.38).setLineWidth(2);
  }

  drawHotelWallTile(px, py, x, y) {
    const trim = (x + y) % 2 === 0 ? palette.brass : palette.copper;
    this.add.rectangle(px + 17, py + 19, TILE - 2, TILE - 2, 0x080403, 0.36);
    this.add.rectangle(px + 17, py + 17, TILE - 2, TILE - 2, palette.panel, 0.98).setStrokeStyle(1, 0x140c09);
    this.add.rectangle(px + 17, py + 5, TILE - 4, 7, 0x0e0907, 0.92).setStrokeStyle(1, trim, 0.62);
    this.add.rectangle(px + 11, py + 20, 6, 13, 0x21313a, 0.88).setStrokeStyle(1, palette.brass, 0.58);
    this.add.rectangle(px + 23, py + 20, 6, 13, 0x21313a, 0.84).setStrokeStyle(1, palette.brass, 0.5);
    this.add.rectangle(px + 11, py + 20, 2, 10, palette.amber, 0.18);
    this.add.rectangle(px + 23, py + 20, 2, 10, palette.amber, 0.14);
    if ((x + y) % 3 === 0) {
      this.add.rectangle(px + 17, py + 30, 22, 4, trim, 0.7).setStrokeStyle(1, palette.coal, 0.7);
    }
  }

  drawDistrictBoundaryTile(px, py, x, y) {
    const topOrBottom = y === 0 || y === this.worldTiles.length - 1;
    const side = x === 0 || x === this.worldTiles[y].length - 1;
    const trim = (x + y) % 2 === 0 ? palette.brass : palette.copper;

    this.add.rectangle(px + 17, py + 19, TILE - 2, TILE - 2, 0x080403, 0.34);
    this.add.rectangle(px + 17, py + 17, TILE - 2, TILE - 2, topOrBottom ? 0x1b1513 : 0x211713, 0.94)
      .setStrokeStyle(1, 0x3a2619, 0.62);

    if (topOrBottom) {
      this.add.rectangle(px + 17, py + (y === 0 ? 9 : 25), TILE - 5, 10, 0x0c0806, 0.84)
        .setStrokeStyle(1, trim, 0.34);
      this.add.line(px + 17, py + 17, -14, 0, 14, 0, palette.smoke, 0.26).setLineWidth(1);
      return;
    }

    this.add.rectangle(px + 17, py + 17, 12, TILE - 6, palette.iron, 0.78).setStrokeStyle(1, trim, 0.45);
    this.add.line(px + 17, py + 17, -13, -12, 13, 12, trim, 0.24).setLineWidth(1);
    this.add.line(px + 17, py + 17, -13, 12, 13, -12, palette.smoke, 0.2).setLineWidth(1);
    if (side) this.add.rectangle(px + 17, py + 17, 5, TILE - 3, trim, 0.18);
  }

  drawFactoryInteriorMachineTile(px, py, x, y) {
    const trim = (x + y) % 2 === 0 ? palette.copper : palette.brass;
    this.add.rectangle(px + 17, py + 19, TILE - 2, TILE - 2, 0x080403, 0.42);
    this.add.rectangle(px + 17, py + 17, TILE - 2, TILE - 2, 0x251914, 0.96).setStrokeStyle(1, 0x130b08);
    this.add.rectangle(px + 17, py + 8, TILE - 5, 8, palette.iron, 0.88).setStrokeStyle(1, trim, 0.5);
    this.add.rectangle(px + 17, py + 25, TILE - 8, 8, 0x120c09, 0.72).setStrokeStyle(1, palette.smoke, 0.28);
    this.add.line(px + 17, py + 17, -14, 0, 14, 0, trim, 0.28).setLineWidth(2);
    this.add.line(px + 17, py + 17, 0, -13, 0, 13, palette.smoke, 0.18).setLineWidth(2);
    if ((x + y) % 2 === 0) {
      this.add.circle(px + 17, py + 16, 6, palette.iron, 0.82).setStrokeStyle(1, palette.brass, 0.66);
      this.add.line(px + 17, py + 16, 0, 0, 5, -2, palette.red, 0.75).setLineWidth(1);
    } else {
      this.add.rectangle(px + 17, py + 16, 18, 7, 0x21313a, 0.72).setStrokeStyle(1, trim, 0.45);
    }
    this.add.circle(px + 8, py + 8, 2, trim, 0.64);
    this.add.circle(px + 26, py + 26, 2, trim, 0.48);
  }

  drawRestRoomBoundaryTile(px, py, x, y) {
    const trim = (x + y) % 2 === 0 ? palette.copper : palette.brass;
    this.add.rectangle(px + 17, py + 18, TILE - 2, TILE - 2, 0x0b0706, 0.42);
    this.add.rectangle(px + 17, py + 17, TILE - 2, TILE - 2, 0x2b2420).setStrokeStyle(1, 0x15100d);
    this.add.rectangle(px + 17, py + 10, TILE - 5, 11, 0x3f3731, 0.86);
    this.add.rectangle(px + 17, py + 25, TILE - 6, 8, 0x1b1411, 0.7);
    this.add.line(px + 17, py + 17, -14, 0, 14, 0, trim, 0.22).setLineWidth(2);
    this.add.line(px + 17, py + 17, 0, -14, 0, 14, palette.smoke, 0.2).setLineWidth(2);
    if ((x + y) % 3 === 0) {
      this.add.rectangle(px + 17, py + 6, 20, 4, palette.iron, 0.9).setStrokeStyle(1, trim, 0.55);
    }
    this.add.circle(px + 8, py + 8, 2, trim, 0.58);
    this.add.circle(px + 26, py + 26, 2, trim, 0.42);
  }

  drawRestRoomPartitionTile(px, py, x, y) {
    const trim = (x + y) % 2 === 0 ? palette.brass : palette.copper;
    this.add.rectangle(px + 17, py + 18, TILE - 2, TILE - 4, 0x0b0605, 0.32);
    this.add.rectangle(px + 17, py + 17, TILE - 5, TILE - 5, 0x241b17, 0.94).setStrokeStyle(1, trim, 0.62);
    this.add.rectangle(px + 17, py + 9, TILE - 8, 5, palette.iron, 0.82).setStrokeStyle(1, trim, 0.45);
    this.add.rectangle(px + 17, py + 24, TILE - 10, 7, 0x130c09, 0.7);
    this.add.line(px + 17, py + 17, -11, 0, 11, 0, palette.smoke, 0.45).setLineWidth(2);
    if ((x + y) % 2 === 0) {
      this.add.circle(px + 17, py + 16, 5, palette.iron, 0.72).setStrokeStyle(1, trim, 0.7);
      this.add.line(px + 17, py + 16, 0, 0, 5, -3, palette.red, 0.75).setLineWidth(1);
    }
  }

  drawConveyorTile(px, py, x, y) {
    this.add.rectangle(px + 17, py + 17, 30, 24, 0x120c09, 0.94).setStrokeStyle(1, palette.copper);
    this.add.rectangle(px + 17, py + 17, 24, 14, 0x231712, 0.96);
    this.add.line(px + 17, py + 9, -13, 0, 13, 0, palette.smoke, 0.9).setLineWidth(2);
    this.add.line(px + 17, py + 25, -13, 0, 13, 0, palette.smoke, 0.9).setLineWidth(2);
    for (let i = 0; i < 3; i += 1) {
      const offset = (i * 8 + (x + y) * 2) % 24;
      const slat = this.add.line(px + 8 + offset, py + 17, -3, -4, 3, 4, palette.brass, 0.8).setLineWidth(2);
      this.addLoopTween(slat, {
        x: slat.x + 8,
        alpha: 0.38,
        duration: 720,
        delay: i * 90,
        yoyo: true,
      });
    }
    this.add.circle(px + 7, py + 8, 2, palette.brass, 0.72);
    this.add.circle(px + 27, py + 26, 2, palette.brass, 0.62);
  }

  drawSteamVentTile(px, py, x, y) {
    this.add.rectangle(px + 17, py + 18, 28, 20, 0x0f0907, 0.92).setStrokeStyle(1, palette.copper);
    this.add.rectangle(px + 17, py + 17, 24, 16, 0x1b110d, 0.96).setStrokeStyle(1, palette.smoke);
    for (let i = 0; i < 4; i += 1) {
      this.add.line(px + 8 + i * 6, py + 18, 0, -6, 0, 6, palette.copper, 0.7).setLineWidth(1);
    }
    const steamAlpha = 0.25 + ((x + y) % 3) * 0.08;
    const puffs = [
      this.add.circle(px + 12, py + 9, 5, palette.cream, steamAlpha),
      this.add.circle(px + 21, py + 7, 4, palette.cream, steamAlpha * 0.8),
    ];
    puffs.forEach((puff, index) => {
      this.addLoopTween(puff, {
        y: puff.y - 8,
        alpha: 0.05,
        scale: 1.3,
        duration: 1200 + index * 180,
        delay: (x + y + index) * 70,
        yoyo: true,
      });
    });
  }

  drawPipeRunTile(px, py, x, y) {
    this.add.line(px + 17, py + 18, -15, 0, 15, 0, 0x0c0705, 0.45).setLineWidth(8);
    this.add.line(px + 17, py + 16, -15, 0, 15, 0, palette.copper, 0.95).setLineWidth(6);
    this.add.line(px + 17, py + 12, -13, 0, 13, 0, palette.brass, 0.22).setLineWidth(2);
    const pressureLine = this.add.line(px + 17, py + 20, -15, 0, 15, 0, palette.brass, 0.65).setLineWidth(2);
    this.addLoopTween(pressureLine, {
      alpha: 0.18,
      duration: 900 + ((x + y) % 3) * 120,
      yoyo: true,
    });
    if ((x + y) % 2 === 0) {
      this.add.circle(px + 17, py + 17, 5, palette.iron).setStrokeStyle(1, palette.brass);
    }
  }

  drawRailTile(px, py, x, y) {
    this.add.rectangle(px + 17, py + 17, 29, 25, 0x110b08, 0.42);
    this.add.line(px + 8, py + 17, 0, -15, 0, 15, palette.brass, 0.82).setLineWidth(2);
    this.add.line(px + 26, py + 17, 0, -15, 0, 15, palette.brass, 0.82).setLineWidth(2);
    if (y % 2 === 0) {
      this.add.line(px + 17, py + 17, -10, 0, 10, 0, palette.smoke, 0.9).setLineWidth(3);
    }
  }

  drawBoilerTankTile(px, py, x, y) {
    this.add.rectangle(px + 17, py + 21, 28, 8, 0x090504, 0.32);
    this.add.rectangle(px + 17, py + 17, 29, 24, 0x211713, 0.62).setStrokeStyle(1, palette.copper);
    this.add.line(px + 17, py + 8, -12, 0, 12, 0, palette.brass, 0.42).setLineWidth(2);
    this.add.circle(px + 17, py + 17, 7, palette.iron, 0.74).setStrokeStyle(1, palette.brass);
    const needle = this.add.line(px + 17, py + 17, 0, 0, x % 2 === y % 2 ? 6 : -6, -4, palette.red).setLineWidth(2);
    this.addLoopTween(needle, {
      angle: x % 2 === y % 2 ? 12 : -12,
      duration: 1150,
      delay: x * 60,
      yoyo: true,
    });
    this.add.circle(px + 7, py + 7, 2, palette.brass, 0.9);
    this.add.circle(px + 27, py + 27, 2, palette.brass, 0.75);
  }

  drawKeyStation(px, py) {
    this.add.rectangle(px + 17, py + 25, 26, 8, 0x080403, 0.44);
    this.add.rectangle(px + 17, py + 18, 26, 25, 0x1b110d, 0.94).setStrokeStyle(2, palette.brass);
    this.add.image(px + 17, py + 14, 'gear').setScale(0.3).setTint(palette.amber);
    this.add.rectangle(px + 17, py + 26, 13, 5, palette.brass);
    this.add.circle(px + 25, py + 11, 3, palette.amber, 0.18);
  }

  drawGaugeStation(px, py) {
    this.add.rectangle(px + 17, py + 25, 29, 8, 0x080403, 0.38);
    this.add.rectangle(px + 17, py + 18, 29, 23, 0x1b110d, 0.96).setStrokeStyle(2, palette.copper);
    this.add.circle(px + 17, py + 15, 10, palette.cream, 0.92).setStrokeStyle(3, palette.brass);
    this.add.line(px + 17, py + 15, 0, 0, 7, -5, palette.red).setLineWidth(2);
    this.add.rectangle(px + 17, py + 29, 18, 4, palette.iron);
  }

  drawCouplerStation(px, py) {
    this.add.rectangle(px + 17, py + 26, 30, 8, 0x080403, 0.44);
    this.add.rectangle(px + 17, py + 18, 28, 24, 0x1b110d, 0.96).setStrokeStyle(2, palette.copper);
    this.add.circle(px + 12, py + 17, 7, palette.iron, 0.95).setStrokeStyle(2, palette.brass);
    this.add.circle(px + 22, py + 17, 7, palette.iron, 0.95).setStrokeStyle(2, palette.brass);
    this.add.rectangle(px + 17, py + 17, 12, 6, palette.copper, 0.95).setStrokeStyle(1, palette.brass);
    this.add.line(px + 17, py + 7, 0, 0, 0, 20, palette.brass, 0.65).setLineWidth(2);
    const spark = this.add.circle(px + 17, py + 17, 3, palette.amber, 0.9);
    this.addLoopTween(spark, {
      alpha: 0.28,
      scale: 1.8,
      duration: 760,
      yoyo: true,
    });
  }

  drawHotelPuzzleDesk(px, py) {
    const solved = this.hotelPuzzleSolved;
    const room = hotelPuzzleRooms[this.selectedHotelRoomIndex];
    this.add.rectangle(px + 17, py + 26, 31, 8, 0x080403, 0.42);
    this.add.rectangle(px + 17, py + 18, 30, 24, 0x1b110d, 0.96).setStrokeStyle(2, solved ? palette.green : palette.brass);
    this.add.rectangle(px + 17, py + 12, 24, 8, palette.copper, 0.86).setStrokeStyle(1, palette.brass);
    this.add.circle(px + 9, py + 18, 4, palette.brass, 0.9);
    this.add.line(px + 9, py + 18, 0, -5, 0, 5, palette.coal, 0.8).setLineWidth(1);
    this.add.text(px + 14, py + 20, room, this.textStyle(8, solved ? palette.green : palette.amber)).setFontStyle('700');
    const bell = this.add.circle(px + 25, py + 10, 4, solved ? palette.green : palette.amber, 0.8)
      .setStrokeStyle(1, palette.brass);
    if (!solved) {
      this.addLoopTween(bell, {
        alpha: 0.32,
        scale: 1.35,
        duration: 780,
        yoyo: true,
      });
    }
  }

  drawControlCipherConsole(px, py) {
    const solved = this.controlPasswordUnlocked;
    const label = controlPasswordOptions[this.selectedControlPasswordIndex].slice(0, 2).toUpperCase();
    const hintLetters = controlPanelPassword.split('');
    this.add.rectangle(px + 17, py + 26, 31, 8, 0x080403, 0.42);
    this.add.rectangle(px + 17, py + 17, 31, 28, 0x1b110d, 0.96).setStrokeStyle(2, solved ? palette.green : palette.blue);
    this.add.rectangle(px + 17, py + 10, 23, 9, 0x21313a, 0.88).setStrokeStyle(1, palette.brass);
    this.add.text(px + 11, py + 6, solved ? 'OK' : label, this.textStyle(7, solved ? palette.green : palette.amber)).setFontStyle('700');
    hintLetters.forEach((letter, index) => {
      const filled = solved || this.controlPasswordInput[0]?.[index]?.toUpperCase() === letter;
      this.add.circle(px + 8 + index * 9, py + 24, 3, filled || solved ? palette.green : palette.iron, 0.92)
        .setStrokeStyle(1, filled ? palette.cream : palette.brass);
      this.add.text(px + 6 + index * 9, py + 27, letter, this.textStyle(5, filled ? palette.green : palette.amber)).setFontStyle('700');
    });
    if (!solved) {
      const cursor = this.add.circle(px + 25, py + 9, 3, palette.amber, 0.86);
      this.addLoopTween(cursor, {
        alpha: 0.28,
        scale: 1.55,
        duration: 680,
        yoyo: true,
      });
    }
  }

  drawControlPanel(px, py) {
    const active = this.controlPanelActivated;
    const unlocked = this.controlPasswordUnlocked;
    this.add.rectangle(px + 17, py + 26, 32, 9, 0x080403, 0.48);
    this.add.rectangle(px + 17, py + 17, 32, 30, 0x21313a, 0.94).setStrokeStyle(2, active ? palette.green : unlocked ? palette.amber : palette.red);
    this.add.rectangle(px + 17, py + 11, 24, 8, palette.panelDark, 0.95).setStrokeStyle(1, palette.copper);
    this.add.line(px + 17, py + 17, -12, 0, 12, 0, unlocked ? palette.green : palette.red).setLineWidth(2);
    this.add.line(px + 17, py + 17, 0, -8, 0, 8, unlocked ? palette.green : palette.red).setLineWidth(2);
    this.add.circle(px + 9, py + 24, 3, active ? palette.green : palette.iron, 0.92).setStrokeStyle(1, palette.brass);
    this.add.circle(px + 17, py + 24, 3, unlocked ? palette.amber : palette.iron, 0.92).setStrokeStyle(1, palette.brass);
    this.add.circle(px + 25, py + 24, 3, this.controlPanelPromptOpen ? palette.blue : palette.iron, 0.92).setStrokeStyle(1, palette.brass);
    if (this.controlPanelPromptOpen) {
      const yesSelected = this.selectedControlPanelChoice === 0;
      this.add.text(px - 2, py - 8, yesSelected ? 'YES' : 'NO', this.textStyle(7, palette.cream)).setFontStyle('700');
    }
  }

  drawPaperHint(px, py, x, y) {
    const letter = this.currentMap.renderProfile === 'factoryDistrict' ? '!' : controlRoomPaperHints[`${x},${y}`] || '?';
    const tilt = ((x + y) % 3 - 1) * 8;
    const paper = this.add.rectangle(px + 17, py + 18, 18, 14, palette.cream, 0.94)
      .setStrokeStyle(1, palette.brass);
    paper.setAngle(tilt);
    this.add.line(px + 17, py + 15, -6, 0, 5, 0, palette.copper, 0.72)
      .setLineWidth(1)
      .setAngle(tilt);
    this.add.line(px + 17, py + 19, -5, 0, 6, 0, palette.copper, 0.52)
      .setLineWidth(1)
      .setAngle(tilt);
    this.add.text(px + 14, py + 22, letter, this.textStyle(7, palette.coal)).setFontStyle('700');
  }

  drawDistrictRelayStation(px, py) {
    const solved = this.factoryInteriorUnlocked;
    const relay = districtRelayOptions[this.selectedDistrictRelayIndex];
    this.add.rectangle(px + 17, py + 25, 31, 9, 0x080403, 0.42);
    this.add.rectangle(px + 17, py + 17, 31, 31, 0x1b110d, 0.92).setStrokeStyle(2, solved ? palette.green : palette.brass);
    this.add.rectangle(px + 17, py + 7, 23, 7, palette.copper, 0.82).setStrokeStyle(1, palette.brass);
    this.add.text(px + 12, py + 3, relay[0], this.textStyle(7, solved ? palette.green : palette.amber)).setFontStyle('700');
    districtRelayOptions.forEach((option, index) => {
      const leverX = px + 8 + index * 9;
      const leverUp = this.districtRelayState[index];
      const selected = index === this.selectedDistrictRelayIndex && !solved;
      const leverColor = solved || leverUp ? palette.green : palette.copper;
      this.add.circle(leverX, py + 22, selected ? 4 : 3, selected ? palette.amber : palette.brass, 0.9)
        .setStrokeStyle(1, palette.coal);
      this.add.line(leverX, py + 21, 0, 0, leverUp ? 0 : 5, leverUp ? -8 : 6, leverColor, 0.95).setLineWidth(2);
      this.add.text(leverX - 3, py + 29, option[0], this.textStyle(6, selected ? palette.amber : palette.gray)).setFontStyle('700');
    });
    if (!solved) {
      const spark = this.add.circle(px + 24, py + 9, 3, palette.amber, 0.82);
      this.addLoopTween(spark, {
        alpha: 0.22,
        scale: 1.55,
        duration: 720,
        yoyo: true,
      });
    }
  }

  drawValveStation(px, py) {
    this.add.rectangle(px + 17, py + 25, 31, 9, 0x080403, 0.42);
    this.add.rectangle(px + 17, py + 17, 31, 31, 0x1b110d, 0.88).setStrokeStyle(2, palette.copper);
    this.add.line(px + 17, py + 17, -17, 0, 17, 0, palette.copper, 0.75).setLineWidth(4);
    this.add.line(px + 17, py + 17, 0, -17, 0, 17, palette.copper, 0.75).setLineWidth(4);
    const gaugeReadable = this.inventory.has('Pressure Gauge');
    const selectedColor = valveSequence[this.selectedValveIndex];
    const selectedValveColor = gaugeReadable ? this.getValveColorValue(selectedColor) : palette.gray;
    const selectedValveRotation = this.getValveRotation(selectedColor);
    drawValveMarker(this, px + 17, py + 17, this.valveSolved, {
      color: selectedValveColor,
      rotation: selectedValveRotation,
    });
    if (!this.valveSolved) {
      valveSequence.forEach((colorName) => {
        const angle = this.getValveRotation(colorName);
        const radians = Phaser.Math.DegToRad(angle);
        const dotX = px + 17 + Math.sin(radians) * 15;
        const dotY = py + 17 - Math.cos(radians) * 15;
        const isSelected = colorName === selectedColor;
        const optionColor = gaugeReadable ? this.getValveColorValue(colorName) : palette.gray;
        const optionAlpha = gaugeReadable ? (isSelected ? 1 : 0.62) : 0.36;
        const option = this.add.circle(dotX, dotY, isSelected ? 4 : 3, optionColor, optionAlpha)
          .setStrokeStyle(isSelected && gaugeReadable ? 2 : 1, isSelected && gaugeReadable ? palette.cream : palette.coal);
        if (isSelected && gaugeReadable) {
          this.addLoopTween(option, {
            scale: 1.45,
            alpha: 0.68,
            duration: 620,
            yoyo: true,
          });
        }
      });
      this.valveInput.forEach((colorName, index) => {
        this.add.circle(px + 8 + index * 9, py + 30, 2.5, this.getValveColorValue(colorName), 0.95)
          .setStrokeStyle(1, palette.cream);
      });
    }
  }

  drawPressureGate(px, py) {
    this.add.rectangle(px + 17, py + 24, 30, 9, 0x080403, 0.5);
    this.add.rectangle(px + 17, py + 17, 29, 32, palette.iron).setStrokeStyle(2, palette.amber);
    this.add.rectangle(px + 17, py + 6, 24, 5, palette.copper, 0.88).setStrokeStyle(1, palette.brass);
    for (let i = 0; i < 4; i += 1) {
      const color = i % 2 === 0 ? palette.amber : palette.red;
      this.add.rectangle(px + 8 + i * 6, py + 17, 5, 29, color, 0.86);
    }
    this.add.circle(px + 17, py + 17, 5, palette.coal).setStrokeStyle(2, palette.brass);
  }

  drawAreaExit(px, py) {
    const unlocked = this.westernGateOpen;
    this.add.rectangle(px + 18, py + 24, 31, 9, 0x080403, 0.52);
    this.add.rectangle(px + 17, py + 17, 31, 31, unlocked ? 0x21313a : palette.iron).setStrokeStyle(2, unlocked ? palette.green : palette.red);
    this.add.rectangle(px + 18, py + 5, 31, 8, 0x120d0a, 0.9).setStrokeStyle(1, unlocked ? palette.green : palette.brass);
    this.add.line(px + 5, py + 5, 0, 0, 5, 0, unlocked ? palette.green : palette.amber).setLineWidth(2);
    this.add.triangle(px + 12, py + 5, 0, -4, 0, 4, 6, 0, unlocked ? palette.green : palette.amber, 0.95);
    this.add.text(px + 13, py + 1, 'FACTORY', this.textStyle(5, unlocked ? palette.green : palette.amber)).setFontStyle('700');
    this.add.rectangle(px + 6, py + 17, 6, 25, palette.copper, 0.86);
    this.add.rectangle(px + 28, py + 17, 6, 25, palette.copper, 0.86);
    this.add.line(px + 17, py + 17, -8, -9, 8, 0, unlocked ? palette.green : palette.amber).setLineWidth(3);
    this.add.line(px + 17, py + 17, -8, 9, 8, 0, unlocked ? palette.green : palette.amber).setLineWidth(3);
    if (!unlocked) {
      this.add.circle(px + 17, py + 17, 5, palette.red).setStrokeStyle(2, palette.amber);
    } else {
      const glow = this.add.circle(px + 17, py + 17, 9, palette.green, 0.16);
      this.addLoopTween(glow, {
        scale: 1.65,
        alpha: 0.03,
        duration: 1200,
        yoyo: true,
      });
    }
  }

  drawEnemyStation(px, py) {
    this.add.rectangle(px + 17, py + 27, 30, 8, 0x080403, 0.46);
    const sentry = this.add.image(px + 17, py + 16, 'enemy').setScale(0.55).setTint(palette.copper);
    this.add.circle(px + 25, py + 10, 3, palette.red, 0.9);
    this.addLoopTween(sentry, {
      y: py + 14,
      duration: 920,
      ease: 'Sine.easeInOut',
      yoyo: true,
    });
  }

  drawLiftSocket(px, py) {
    const active = this.inventory.has('Aether Fuse');
    this.add.rectangle(px + 17, py + 25, 30, 9, 0x080403, 0.48);
    this.add.rectangle(px + 17, py + 17, 29, 29, active ? 0x284222 : palette.iron).setStrokeStyle(2, palette.amber);
    const core = this.add.rectangle(px + 17, py + 17, 16, 16, active ? palette.green : palette.gray);
    if (active) {
      this.add.circle(px + 17, py + 17, 14, palette.green, 0.12);
      this.addLoopTween(core, {
        alpha: 0.35,
        scale: 1.18,
        duration: 820,
        yoyo: true,
      });
    }
    this.add.line(px + 17, py + 17, -12, -12, 12, 12, palette.copper, 0.75).setLineWidth(2);
    this.add.line(px + 17, py + 17, -12, 12, 12, -12, palette.copper, 0.75).setLineWidth(2);
  }

  drawBlueprintStation(px, py) {
    this.add.rectangle(px + 17, py + 25, 25, 7, 0x080403, 0.4);
    this.add.rectangle(px + 17, py + 18, 23, 27, 0x21313a).setStrokeStyle(2, palette.brass);
    this.add.line(px + 17, py + 15, -7, -4, 7, -4, palette.cream, 0.8).setLineWidth(1);
    this.add.line(px + 17, py + 20, -7, 0, 7, 0, palette.cream, 0.8).setLineWidth(1);
    this.add.text(px + 13, py + 20, '?', this.textStyle(14, palette.amber)).setFontStyle('700');
  }

  drawMapTransitionTile(px, py, tile) {
    const direction = tile === 'D' ? 'S' : 'N';
    this.add.rectangle(px + 17, py + 25, 29, 8, 0x080403, 0.42);
    this.add.rectangle(px + 17, py + 17, 29, 29, 0x1b110d, 0.92).setStrokeStyle(2, palette.brass);
    this.add.rectangle(px + 17, py + 17, 18, 18, 0x21313a, 0.84).setStrokeStyle(1, palette.copper);
    this.add.text(px + 12, py + 8, direction, this.textStyle(15, palette.amber)).setFontStyle('700');
  }

  drawRestRoomDoor(px, py) {
    this.add.rectangle(px + 17, py + 17, 31, 31, 0x21313a).setStrokeStyle(2, palette.green);
    this.add.rectangle(px + 8, py + 17, 7, 25, palette.copper, 0.86);
    this.add.rectangle(px + 26, py + 17, 7, 25, palette.copper, 0.86);
    this.add.rectangle(px + 17, py + 17, 14, 25, 0x1b110d, 0.74).setStrokeStyle(1, palette.brass);
    const lamp = this.add.circle(px + 22, py + 18, 2, palette.amber, 0.95);
    this.addLoopTween(lamp, {
      alpha: 0.32,
      scale: 1.8,
      duration: 760,
      yoyo: true,
    });
  }

  drawHotelDoor(px, py) {
    this.add.rectangle(px + 17, py + 25, 31, 8, 0x080403, 0.42);
    this.add.rectangle(px + 17, py + 17, 31, 31, palette.panel).setStrokeStyle(2, palette.brass);
    this.add.rectangle(px + 17, py + 7, 27, 8, palette.copper, 0.92).setStrokeStyle(1, palette.brass);
    this.add.rectangle(px + 17, py + 20, 15, 20, 0x130c09, 0.86).setStrokeStyle(1, palette.brass);
    this.add.circle(px + 22, py + 20, 2, palette.amber, 0.95);
    this.add.circle(px + 10, py + 14, 3, palette.amber, 0.55);
    this.add.circle(px + 24, py + 14, 3, palette.amber, 0.45);
    this.add.text(px + 8, py + 3, 'H', this.textStyle(9, palette.amber)).setFontStyle('700');
  }

  drawBedStation(px, py) {
    this.add.rectangle(px + 17, py + 27, 31, 7, 0x080403, 0.42);
    this.add.rectangle(px + 18, py + 19, 29, 18, 0x1b110d, 0.96).setStrokeStyle(2, palette.brass);
    this.add.rectangle(px + 19, py + 21, 20, 11, 0x5b2f25, 0.95).setStrokeStyle(1, palette.copper);
    this.add.rectangle(px + 10, py + 17, 9, 10, palette.cream, 0.94).setStrokeStyle(1, palette.brass);
    this.add.rectangle(px + 27, py + 15, 5, 19, palette.copper, 0.92).setStrokeStyle(1, palette.brass, 0.55);
    this.add.circle(px + 8, py + 28, 2.2, palette.brass, 0.9);
    this.add.circle(px + 28, py + 28, 2.2, palette.brass, 0.9);
    const lamp = this.add.circle(px + 27, py + 11, 3, palette.amber, 0.55);
    this.addLoopTween(lamp, {
      alpha: 0.16,
      scale: 1.55,
      duration: 1100,
      yoyo: true,
    });
  }

  drawSidebar() {
    const menuOptions = ['Inventory', 'Objective', 'Info'];
    const activeIndex = this.sideMenuOpen ? this.selectedSideMenuIndex : this.getActiveSidePanelIndex();
    menuOptions.forEach((label, index) => {
      const y = 82 + index * 28;
      const selected = index === activeIndex;
      this.add.rectangle(SIDEBAR_X + 106, y + 10, 176, 24, selected ? 0x553018 : 0x211713)
        .setStrokeStyle(1, selected ? palette.amber : palette.gray);
      this.add.text(
        SIDEBAR_X + 28,
        y + 1,
        `${this.sideMenuOpen && selected ? '>' : ' '} ${label}`,
        this.textStyle(12, selected ? palette.amber : palette.cream),
      ).setFontStyle('700');
    });

    if (this.sideMenuOpen) {
      this.add.rectangle(SIDEBAR_X + 106, 232, 176, 122, 0x211713).setStrokeStyle(1, palette.brass);
      this.add.text(SIDEBAR_X + 28, 182, 'Choose a panel', this.textStyle(14, palette.amber)).setFontStyle('700');
      this.add.text(SIDEBAR_X + 28, 210, 'Up/Down moves', this.textStyle(11, palette.cream));
      this.add.text(SIDEBAR_X + 28, 230, 'Enter opens contents', this.textStyle(11, palette.cream));
      this.add.text(SIDEBAR_X + 28, 250, 'Esc exits menu', this.textStyle(11, palette.gray));
      return;
    }

    if (this.inventoryOpen) {
      this.drawInventoryMenu();
      return;
    }

    if (this.infoOpen) {
      this.drawInfoMenu();
      return;
    }

    if (this.objectiveOpen) {
      this.drawObjectiveMenu();
      return;
    }

    this.add.rectangle(SIDEBAR_X + 106, 210, 176, 64, 0x211713).setStrokeStyle(1, palette.gray);
    this.add.text(SIDEBAR_X + 28, 186, 'Press I', this.textStyle(14, palette.amber)).setFontStyle('700');
    this.add.text(SIDEBAR_X + 28, 210, 'Open menu', this.textStyle(11, palette.cream));
  }

  getActiveSidePanelIndex() {
    if (this.inventoryOpen) return 0;
    if (this.objectiveOpen) return 1;
    if (this.infoOpen) return 2;
    return this.selectedSideMenuIndex;
  }

  drawInventoryMenu() {
    const ownedItems = Object.entries(itemData)
      .filter(([name, data]) => (data.type === 'consumable' ? this.consumables[name] > 0 : this.inventory.has(name)))
      .map(([name, data]) => ({
        name,
        count: data.type === 'consumable' ? this.consumables[name] : null,
    }));
    if (!ownedItems.length) {
      this.add.rectangle(SIDEBAR_X + 106, 200, 176, 48, 0x211713).setStrokeStyle(1, palette.gray);
      this.add.text(SIDEBAR_X + 28, 182, 'Inventory empty', this.textStyle(13, palette.gray)).setFontStyle('700');
      this.add.text(SIDEBAR_X + 28, 202, 'Explore the district', this.textStyle(11, palette.copper));
    }
    ownedItems.slice(0, 5).forEach(({ name, count }, index) => {
      const y = 176 + index * 42;
      this.add.rectangle(SIDEBAR_X + 106, y + 15, 176, 36, 0x392417)
        .setStrokeStyle(1, palette.brass);
      this.add.text(SIDEBAR_X + 28, y + 4, count ? `${name} x${count}` : name, this.textStyle(13, palette.cream)).setFontStyle('700');
      this.add.text(SIDEBAR_X + 28, y + 21, 'Carried', this.textStyle(11, palette.green));
    });
  }

  drawObjectiveMenu() {
    const objective = this.getCurrentObjective();
    this.add.rectangle(SIDEBAR_X + 106, 210, 176, 64, 0x211713).setStrokeStyle(1, palette.brass);
    this.add.text(SIDEBAR_X + 28, 186, objective, this.wrappedTextStyle(15, palette.cream, 154)).setFontStyle('700');
    this.add.text(SIDEBAR_X + 28, 268, this.sideMenuOpen ? 'Enter selects  Esc exits' : 'I opens menu', this.textStyle(11, palette.gray));
  }

  drawInfoMenu() {
    const knownStatuses = [...this.statusInfo].filter((name) => statusRules[name]);
    this.add.rectangle(480, 270, 960, 540, 0x000000, 0.38);
    this.drawPanel(232, 86, 496, 360, 'Info');
    if (!knownStatuses.length) {
      this.add.text(276, 142, 'No status info', this.textStyle(18, palette.gray)).setFontStyle('700');
      this.add.text(276, 178, 'Discover effects in battle.', this.wrappedTextStyle(14, palette.copper, 390));
      this.add.text(276, 398, 'Esc closes info', this.textStyle(12, palette.gray));
      return;
    }

    this.selectedInfoIndex = Phaser.Math.Clamp(this.selectedInfoIndex, 0, knownStatuses.length - 1);
    const visibleStart = Phaser.Math.Clamp(this.selectedInfoIndex - 2, 0, Math.max(0, knownStatuses.length - 4));
    knownStatuses.slice(visibleStart, visibleStart + 5).forEach((name, index) => {
      const rule = statusRules[name];
      const realIndex = visibleStart + index;
      const selected = realIndex === this.selectedInfoIndex;
      const y = 138 + index * 36;
      this.add.rectangle(350, y + 11, 184, 30, selected ? 0x553018 : 0x211713)
        .setStrokeStyle(1, selected ? palette.amber : palette.gray);
      this.add.text(270, y, `${selected ? '>' : ' '} ${rule.label}`, this.textStyle(13, selected ? palette.amber : palette.cream))
        .setFontStyle('700');
    });
    const selectedRule = statusRules[knownStatuses[this.selectedInfoIndex]];
    this.add.rectangle(570, 260, 256, 212, 0x211713).setStrokeStyle(1, palette.brass);
    this.add.text(462, 170, selectedRule.label, this.textStyle(18, palette.amber)).setFontStyle('700');
    this.add.text(462, 206, selectedRule.summary, this.wrappedTextStyle(13, palette.cream, 218));
    this.add.text(462, 276, selectedRule.prompt, this.wrappedTextStyle(12, palette.amber, 218));
    this.add.text(276, 398, 'Up/Down scrolls  Esc closes info', this.textStyle(12, palette.gray));
  }

  getCurrentObjective() {
    return getFactoryObjective({
      currentMapId: this.currentMapId,
      factoryInteriorUnlocked: this.factoryInteriorUnlocked,
    });
  }

  drawMessagePanel() {
    this.add.image(54, 472, 'gear').setScale(0.45).setAlpha(0.8);
    this.add.rectangle(394, 471, 554, 72, 0x211713, 0.62).setStrokeStyle(1, palette.smoke);
    this.add.rectangle(821, 471, 198, 72, 0x211713, 0.62).setStrokeStyle(1, palette.smoke);

    const previousMessage = this.add.text(
      118,
      448,
      this.messageLog.at(-2) || '',
      this.wrappedTextStyle(12, palette.cream, 528),
    );
    previousMessage.setMaxLines(1);

    const currentMessage = this.add.text(
      118,
      472,
      this.messageLog.at(-1) || '',
      this.wrappedTextStyle(13, palette.amber, 528),
    );
    currentMessage.setMaxLines(2);

    this.add.text(724, 444, 'WASD / Arrows', this.textStyle(13, palette.cream)).setFontStyle('700');
    this.add.text(724, 468, 'Space / Enter', this.textStyle(13, palette.cream)).setFontStyle('700');
    const context = this.activePuzzle ? 'Esc leaves puzzle' : 'I Menu  P Pause';
    this.add.text(724, 492, context, this.textStyle(13, palette.cream)).setFontStyle('700');
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
      `Mode ${this.mode}  Crit ${this.forceNextCritical ? 'armed' : 'normal'}  Steps ${this.stepsUntilEncounter}`,
      this.textStyle(12, palette.green),
    );
  }

  updateWorldMovement() {
    if (
      this.mapTransitioning ||
      this.activePuzzle ||
      this.sideMenuOpen ||
      this.inventoryOpen ||
      this.objectiveOpen ||
      this.infoOpen ||
      this.statusMenuOpen ||
      this.worldMoveLocked
    ) {
      return;
    }
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
    this.checkRandomEncounterStep();
    if (this.mode === WORLD) this.renderWorldAfterMovement();
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
    if (!tile || tile === '#' || tile === 'H' || tile === 'w') {
      this.playSfx('error');
      return false;
    }

    if (tile === 'G' && !this.gateOpen) {
      this.addLog(this.inventory.has('Brass Key') ? 'The gate needs valve pressure before it will open.' : 'The factory gate is locked by a brass keyway.');
      this.playSfx('error');
      this.renderWorld();
      return false;
    }

    if (tile === 'F' && !this.inventory.has('Aether Fuse')) {
      this.addLog('The lift socket is empty. Aether Fuse required.');
      this.playSfx('error');
      this.renderWorld();
      return false;
    }

    const transition = this.currentMap.transitions?.[tile];
    if (tile === 'X' && transition?.mapId === 'factoryInterior' && !this.factoryInteriorUnlocked) {
      this.addLog('The western factory door needs the Factory Gate Key from the yard signal puzzle.');
      this.playSfx('error');
      this.renderWorld();
      return false;
    }

    return true;
  }

  handleTileStep() {
    const tile = this.worldTiles[this.player.y][this.player.x];
    if (tile === 'K' && !this.inventory.has('Brass Key')) {
      this.addLog('A Brass Key hangs on the lockworks rack. Press Space or Enter.');
    }
    if (tile === 'S' && !this.inventory.has('Pressure Gauge')) {
      this.addLog('A calibrated Pressure Gauge is bolted to the bench. Press Space or Enter.');
    }
    if (tile === 'C' && !this.inventory.has('Pressure Coupler')) {
      this.addLog('A Pressure Coupler is locked into the boilerhouse manifold. Press Space or Enter.');
    }
    if (tile === 'E' && !this.enemyCleared) {
      this.startBattle({
        encounterId: 'fuseGuard',
        type: 'scripted',
        rewardItem: 'Aether Fuse',
        clearTile: 'E',
        victoryLog: 'Victory. Aether Fuse recovered from the wreckage.',
        startLog: 'A guard patrol springs from the machinery. ATB continues while menus are open.',
      });
    }
    if (tile === 'F') {
      if (this.inventory.has('Aether Fuse')) {
        this.gameComplete = true;
        this.followMapTransition(tile);
        return;
      } else {
        this.addLog('The lift socket is empty. Aether Fuse required.');
      }
    }
    if (tile === 'P' && this.currentMap.renderProfile === 'factoryInterior') {
      this.addLog('Blueprint note: key, gauge, hotel prize, yard signal key, factory, coupler, valve, fuse, lift.');
    }
    if (tile === 'D' || tile === 'U' || (tile === 'X' && this.currentMap.transitions?.X) || (tile === 'F' && this.currentMap.transitions?.F)) {
      this.followMapTransition(tile);
      return;
    }
    if (tile === 'B') {
      this.addLog('A warm brass cot is ready. Press Space or Enter to rest.');
    }
    if (tile === 'Q' && !this.hotelPuzzleSolved) {
      const room = hotelPuzzleRooms[this.selectedHotelRoomIndex];
      this.addLog(`Concierge relay waits on room ${room}. Left/Right changes the room card; Enter submits for a prize.`);
    }
    if (tile === 'R' && !this.controlPasswordUnlocked) {
      const word = controlPasswordOptions[this.selectedControlPasswordIndex].toUpperCase();
      this.addLog(`Cipher console asks for the drive code. Left/Right selects ${word}; Enter submits.`);
    }
    if (tile === 'Y') {
      if (!this.controlPasswordUnlocked) {
        this.addLog('The control panel is locked. The scattered floor papers look deliberate.');
      } else if (!this.controlPanelActivated) {
        this.addLog('Control panel unlocked. Press Enter for the activation prompt.');
      }
    }
    if (tile === 'N') {
      if (this.currentMap.renderProfile === 'factoryDistrict') {
        this.addLog('A signal stencil sheet is pinned under a rivet. Press Space or Enter to read it.');
      } else {
        const letter = controlRoomPaperHints[`${this.player.x},${this.player.y}`] || '?';
        this.addLog(`A torn floor paper is marked with the letter ${letter}.`);
      }
    }
    if (tile === 'V' && this.currentMap.renderProfile === 'factoryDistrict' && !this.factoryInteriorUnlocked) {
      const relay = districtRelayOptions[this.selectedDistrictRelayIndex];
      this.addLog(`Factory signal lever: ${relay}. Left/Right selects; Enter flips. Pattern: Stack up, Crane down, Rail up.`);
    }
    const transition = this.currentMap.transitions?.[tile];
    if (tile === 'X' && transition?.mapId === 'factoryInterior' && this.factoryInteriorUnlocked) {
      this.addLog('The factory door opens onto the old factory interior.');
      this.playSfx('success');
    }
  }

  checkRandomEncounterStep() {
    if (this.mode !== WORLD || !this.randomEncountersEnabled()) return;
    if (this.isPuzzleSafeTile(this.player.x, this.player.y)) return;

    this.stepsUntilEncounter -= 1;
    if (this.stepsUntilEncounter > 0) return;

    const encounterId = this.pickRandomEncounterId();
    this.stepsUntilEncounter = this.rollStepsUntilEncounter();
    this.startBattle({
      encounterId,
      type: 'random',
      startLog: 'Factory patrol machines close in. ATB continues while menus are open.',
      victoryLog: 'Victory. The patrol collapses into smoking scrap.',
    });
  }

  randomEncountersEnabled() {
    return this.currentMap.randomEncounters?.enabled !== false;
  }

  isPuzzleSafeTile(x, y) {
    const protectedTiles = new Set(['K', 'S', 'C', 'V', 'G', 'X', 'F', 'D', 'U', 'B', 'P', 'Q', 'R', 'Y', 'N']);
    for (let yy = y - 1; yy <= y + 1; yy += 1) {
      for (let xx = x - 1; xx <= x + 1; xx += 1) {
        if (protectedTiles.has(this.worldTiles[yy]?.[xx])) return true;
      }
    }
    return false;
  }

  pickRandomEncounterId() {
    const encounterIds = this.currentMap.randomEncounters?.encounters?.length
      ? this.currentMap.randomEncounters.encounters
      : ['factoryAmbush'];
    return Phaser.Math.RND.pick(encounterIds);
  }

  rollStepsUntilEncounter() {
    const settings = this.currentMap?.randomEncounters || {};
    const min = settings.minSteps ?? 15;
    const max = settings.maxSteps ?? 30;
    return Phaser.Math.Between(min, Math.max(min, max));
  }

  transitionToMap(mapId, player, message) {
    const nextMap = worldMaps[mapId];
    if (!nextMap || this.mapTransitioning) return;

    this.mapTransitioning = true;
    this.activePuzzle = null;
    this.controlPanelPromptOpen = false;
    this.sideMenuOpen = false;
    this.inventoryOpen = false;
    this.objectiveOpen = false;
    this.infoOpen = false;
    this.statusMenuOpen = false;
    const camera = this.cameras?.main;
    const fadeMs = this.settingsState.reducedMotion ? 80 : 260;
    const finishTransition = () => {
      this.currentMapId = mapId;
      this.currentMap = nextMap;
      this.worldTiles = this.mapTilesById[mapId];
      this.player = player;
      this.stepsUntilEncounter = this.rollStepsUntilEncounter();
      this.addLog(message);
      this.playSfx('success');
      this.renderWorld({ rebuildMap: true });
      if (!camera) {
        this.mapTransitioning = false;
        return;
      }
      camera.once(Phaser.Cameras.Scene2D.Events.FADE_IN_COMPLETE, () => {
        this.mapTransitioning = false;
      });
      camera.fadeIn(fadeMs, 0, 0, 0);
    };

    if (!camera) {
      finishTransition();
      return;
    }

    camera.once(Phaser.Cameras.Scene2D.Events.FADE_OUT_COMPLETE, finishTransition);
    camera.fadeOut(fadeMs, 0, 0, 0);
  }

  followMapTransition(tile) {
    if (this.mapTransitioning) return;
    const transition = this.currentMap.transitions?.[tile];
    if (!transition) {
      this.addLog('The service route is sealed from this side.');
      this.playSfx('error');
      this.renderWorld();
      return;
    }
    if (tile === 'X' && transition.mapId === 'factoryInterior' && !this.factoryInteriorUnlocked) {
      this.addLog('The western factory door needs the Factory Gate Key from the yard signal puzzle.');
      this.playSfx('error');
      this.renderWorld();
      return;
    }
    if (tile === 'F' && !this.inventory.has('Aether Fuse')) {
      this.addLog('The lift socket is empty. Aether Fuse required.');
      this.playSfx('error');
      this.renderWorld();
      return;
    }

    this.transitionToMap(transition.mapId, { ...transition.player }, transition.message);
  }

  handleConfirm() {
    if (this.mapTransitioning) return;

    if (this.statusTutorial) {
      this.acknowledgeStatusTutorial();
      return;
    }

    if (this.mode === TITLE) {
      this.startNewRun();
      return;
    }

    if (this.mode === PAUSED) {
      this.togglePause();
      return;
    }

    if (this.mode === WORLD) {
      if (this.sideMenuOpen) {
        this.inventoryOpen = this.selectedSideMenuIndex === 0;
        this.objectiveOpen = this.selectedSideMenuIndex === 1;
        this.infoOpen = this.selectedSideMenuIndex === 2;
        this.sideMenuOpen = false;
        this.playSfx('menu');
        this.renderWorld();
        return;
      }

      if (this.inventoryOpen || this.objectiveOpen || this.infoOpen) {
        return;
      }

      if (this.statusMenuOpen) {
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
      const actor = this.party[this.activeUnitIndex];
      const command = this.getCommandOptions(actor)[this.selectedCommand];
      if (command.commandType === 'skill-menu' || command.commandType === 'item-menu') {
        this.battleCommandLayer = command.commandType === 'skill-menu' ? 'skills' : 'items';
        this.selectedCommand = 0;
        this.playSfx('menu');
        this.renderBattle();
        return;
      }
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
    if (this.mode === BATTLE) this.resetBattleBackground();
    this.addLog(`Motion ${this.settingsState.reducedMotion ? 'reduced' : 'restored'}.`);
    this.renderCurrentMode();
  }

  toggleInventory() {
    if (this.mode !== WORLD) return;
    if (this.sideMenuOpen || this.inventoryOpen || this.objectiveOpen || this.infoOpen || this.statusMenuOpen) {
      this.playSfx('error');
      return;
    }
    this.sideMenuOpen = true;
    this.selectedSideMenuIndex = this.getActiveSidePanelIndex();
    this.inventoryOpen = false;
    this.objectiveOpen = false;
    this.infoOpen = false;
    this.statusMenuOpen = false;
    this.activePuzzle = null;
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
    if (this.statusMenuOpen) {
      this.inventoryOpen = false;
      this.objectiveOpen = false;
      this.infoOpen = false;
      this.sideMenuOpen = false;
    }
    this.playSfx('menu');
    this.renderCurrentMode();
  }

  interactWorld() {
    const tile = this.worldTiles[this.player.y][this.player.x];
    if (tile === 'D' || tile === 'U' || (tile === 'X' && this.currentMap.transitions?.X) || (tile === 'F' && this.currentMap.transitions?.F)) {
      this.followMapTransition(tile);
      return;
    }

    if (tile === 'B') {
      this.restAtBed();
      return;
    }

    if (tile === 'Q') {
      this.enterPuzzleFocus('hotel');
      this.solveHotelPuzzle();
      return;
    }

    if (tile === 'R') {
      this.enterPuzzleFocus('controlPassword');
      this.solveControlPasswordPuzzle();
      return;
    }

    if (tile === 'Y') {
      this.interactControlPanel();
      return;
    }

    if (tile === 'N') {
      if (this.currentMap.renderProfile === 'factoryDistrict') {
        this.activePuzzle = null;
        this.addLog(districtRelayPaperHint);
        this.playSfx('menu');
        this.renderWorld();
        return;
      }
      const letter = controlRoomPaperHints[`${this.player.x},${this.player.y}`] || '?';
      this.activePuzzle = null;
      this.addLog(`Paper scrap: ${letter}.`);
      this.playSfx('menu');
      this.renderWorld();
      return;
    }

    if (tile === 'V' && this.currentMap.renderProfile === 'factoryDistrict') {
      this.enterPuzzleFocus('districtRelay');
      this.solveDistrictRelayPuzzle();
      return;
    }

    if (tile === 'K') {
      if (!this.inventory.has('Brass Key')) {
        this.addItem('Brass Key');
        this.addLog('Brass Key lifted from the lockworks rack.');
      } else {
        this.addLog('The key rack is empty.');
        this.playSfx('error');
      }
      this.renderWorld();
      return;
    }

    if (tile === 'S') {
      if (!this.inventory.has('Pressure Gauge')) {
        this.addItem('Pressure Gauge');
        this.addLog('Pressure Gauge acquired. Clue: red heat, amber pressure, blue coolant.');
      } else {
        this.addLog('The gauge bench has already been stripped.');
        this.playSfx('error');
      }
      this.renderWorld();
      return;
    }

    if (tile === 'C') {
      if (!this.inventory.has('Pressure Coupler')) {
        this.addItem('Pressure Coupler');
        this.addLog('Pressure Coupler removed from the boilerhouse manifold.');
      } else {
        this.addLog('The coupler socket is empty.');
        this.playSfx('error');
      }
      this.renderWorld();
      return;
    }

    if (tile !== 'V') {
      this.activePuzzle = null;
      this.addLog('Nothing mechanical responds here.');
      this.playSfx('error');
      this.renderWorld();
      return;
    }

    this.enterPuzzleFocus('valve');

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

    if (!this.inventory.has('Pressure Coupler')) {
      this.addLog('The valve manifold needs the boilerhouse Pressure Coupler.');
      this.playSfx('error');
      this.renderWorld();
      return;
    }

    const selectedColor = valveSequence[this.selectedValveIndex];
    const expectedColor = valveSequence[this.valveInput.length];

    if (selectedColor !== expectedColor) {
      this.valveInput = [];
      this.addLog(`Valve rejects ${selectedColor}. Sequence reset. Read the gauge clue.`);
      this.playSfx('error');
      this.renderWorld();
      return;
    }

    this.valveInput.push(selectedColor);
    this.playSfx('valve');

    if (this.valveInput.length < valveSequence.length) {
      this.addLog(`Valve set to ${selectedColor}. Choose the next dial color with Left/Right.`);
      this.renderWorld();
      return;
    }

    this.valveSolved = true;
    this.gateOpen = true;
    this.activePuzzle = null;
    this.addLog('Valve sequence complete. Pressure gate released.');
    this.playSfx('success');
    this.renderWorld();
  }

  enterPuzzleFocus(puzzle) {
    this.activePuzzle = puzzle;
    this.worldMoveLocked = false;
  }

  exitPuzzleFocus() {
    this.controlPanelPromptOpen = false;
    this.activePuzzle = null;
    this.addLog('Puzzle controls released.');
    this.playSfx('menu');
    this.renderWorld();
  }

  solveHotelPuzzle() {
    if (this.hotelPuzzleSolved) {
      this.activePuzzle = null;
      this.addLog('The concierge relay is settled. The prize drawer is empty.');
      this.playSfx('menu');
      this.renderWorld();
      return;
    }

    const room = hotelPuzzleRooms[this.selectedHotelRoomIndex];
    if (room !== hotelPuzzleAnswer) {
      this.addLog(`Room ${room} rings hollow. Hint: third floor, fourteen brass rivets.`);
      this.playSfx('error');
      this.renderWorld();
      return;
    }

    this.hotelPuzzleSolved = true;
    this.activePuzzle = null;
    this.addItem('Coolant Ampoule');
    this.addItem('Steam Tonic');
    this.addLog('Room 314 answers. The hotel prize drawer yields a Coolant Ampoule and Steam Tonic.');
    this.playSfx('success');
    this.renderWorld();
  }

  solveDistrictRelayPuzzle() {
    if (this.factoryInteriorUnlocked) {
      this.activePuzzle = null;
      this.addLog('The factory signal hums steadily. The western door is already open.');
      this.playSfx('menu');
      this.renderWorld();
      return;
    }

    this.districtRelayState[this.selectedDistrictRelayIndex] = !this.districtRelayState[this.selectedDistrictRelayIndex];
    const relay = districtRelayOptions[this.selectedDistrictRelayIndex];
    const leverState = this.districtRelayState[this.selectedDistrictRelayIndex] ? 'up' : 'down';
    const solved = districtRelayAnswer.every((expected, index) => this.districtRelayState[index] === expected);
    if (!solved) {
      this.addLog(`${relay} lever set ${leverState}. Match the stencil: Stack up, Crane down, Rail up.`);
      this.playSfx('menu');
      this.renderWorld();
      return;
    }

    this.factoryInteriorUnlocked = true;
    this.westernGateOpen = true;
    this.activePuzzle = null;
    this.addItem('Factory Gate Key');
    this.addLog('Factory signal pattern locked. Factory Gate Key drops from the relay box and the western door unlocks.');
    this.playSfx('success');
    this.renderWorld();
  }

  solveControlPasswordPuzzle() {
    if (this.controlPasswordUnlocked) {
      this.activePuzzle = null;
      this.addLog(`The cipher console repeats the panel password: ${controlPanelPassword}.`);
      this.playSfx('menu');
      this.renderWorld();
      return;
    }

    const selectedWord = controlPasswordOptions[this.selectedControlPasswordIndex];
    this.controlPasswordInput = [selectedWord];
    if (selectedWord.toUpperCase() !== controlPanelPassword) {
      this.addLog(`${selectedWord.toUpperCase()} rejected. Check the papers scattered on the control-room floor.`);
      this.playSfx('error');
      this.renderWorld();
      return;
    }

    this.controlPasswordUnlocked = true;
    this.activePuzzle = null;
    this.addLog(`Cipher solved. Password ${controlPanelPassword} unlocks the central control panel.`);
    this.playSfx('success');
    this.renderWorld();
  }

  interactControlPanel() {
    this.enterPuzzleFocus('controlPanel');
    if (!this.controlPasswordUnlocked) {
      this.controlPanelPromptOpen = false;
      this.addLog('The control panel rejects access. Password required.');
      this.playSfx('error');
      this.renderWorld();
      return;
    }

    if (this.controlPanelActivated) {
      this.controlPanelPromptOpen = false;
      this.activePuzzle = null;
      this.addLog('The control panel is already engaged.');
      this.playSfx('menu');
      this.renderWorld();
      return;
    }

    if (!this.controlPanelPromptOpen) {
      this.controlPanelPromptOpen = true;
      this.selectedControlPanelChoice = 0;
      this.addLog('Engage the factory control panel? Left/Right chooses Yes or No.');
      this.playSfx('menu');
      this.renderWorld();
      return;
    }

    if (this.selectedControlPanelChoice === 1) {
      this.controlPanelPromptOpen = false;
      this.activePuzzle = null;
      this.addLog('Control panel activation cancelled.');
      this.playSfx('menu');
      this.renderWorld();
      return;
    }

    this.controlPanelPromptOpen = false;
    this.activePuzzle = null;
    this.startBattle({
      encounterId: 'boilerWarden',
      type: 'scripted',
      activateControlPanel: true,
      renderProfile: 'factoryInterior',
      startLog: 'Terminal: Pressure covenant accepted. Boiler Warden: "No hand commands this furnace while I draw steam."',
      victoryLog: 'Boiler Warden falls silent. The control panel accepts your command and the factory route is complete.',
    });
  }

  restAtBed() {
    this.party.forEach((unit) => {
      unit.hp = unit.maxHp;
      unit.statuses = [];
      unit.atb = 0;
    });
    this.latestRestPoint = {
      mapId: this.currentMapId,
      player: { ...this.player },
    };
    this.addLog('The party rests. HP fully restored and this bed is now the latest rest point.');
    this.playSfx('heal');
    this.renderWorld();
  }

  respawnPartyAfterDefeat() {
    const respawnPoint = this.latestRestPoint || this.startingPoint;
    const nextMap = worldMaps[respawnPoint.mapId] || worldMaps[startingMapId];

    this.party.forEach((unit) => {
      unit.hp = unit.maxHp;
      unit.statuses = [];
      unit.atb = 0;
    });
    this.clearBattleStatuses();
    this.activePuzzle = null;
    this.currentEncounter = null;
    this.battleEnemies = [];
    this.enemyActing = false;
    this.currentMapId = nextMap.id;
    this.currentMap = nextMap;
    this.worldTiles = this.mapTilesById[this.currentMapId];
    this.player = { ...respawnPoint.player };
    this.stepsUntilEncounter = this.rollStepsUntilEncounter();
    this.mode = WORLD;
    this.previousMode = WORLD;
    this.addLog(this.latestRestPoint
      ? 'The party is recovered at the latest rest point.'
      : 'The party is recovered at the factory entrance.');
    this.playSfx('heal');
    this.renderWorld();
  }

  validateRestPoint(restPoint) {
    if (!restPoint || !worldMaps[restPoint.mapId]) return null;
    const { x, y } = restPoint.player || {};
    const tile = worldMaps[restPoint.mapId].tiles[y]?.[x];
    if (!Number.isInteger(x) || !Number.isInteger(y) || !tile || tile === '#' || tile === 'H' || tile === 'w') {
      return null;
    }
    return {
      mapId: restPoint.mapId,
      player: { x, y },
    };
  }

  adjustValveChoice(direction) {
    if (
      this.mode !== WORLD ||
      this.activePuzzle !== 'valve' ||
      this.worldTiles[this.player.y][this.player.x] !== 'V' ||
      this.valveSolved
    ) {
      return false;
    }
    if (this.currentMap.renderProfile === 'factoryDistrict') return false;
    if (!this.inventory.has('Brass Key')) {
      this.addLog('The valve wheel is chained. Find the Brass Key.');
      this.playSfx('error');
      this.renderWorld();
      return true;
    }
    if (!this.inventory.has('Pressure Gauge')) {
      this.addLog('The pressure dials are unreadable without a gauge.');
      this.playSfx('error');
      this.renderWorld();
      return true;
    }
    if (!this.inventory.has('Pressure Coupler')) {
      this.addLog('The valve manifold needs the boilerhouse Pressure Coupler.');
      this.playSfx('error');
      this.renderWorld();
      return true;
    }
    this.selectedValveIndex = Phaser.Math.Wrap(this.selectedValveIndex + direction, 0, valveSequence.length);
    this.addLog(`Valve dial selected: ${valveSequence[this.selectedValveIndex]}.`);
    this.playSfx('menu');
    this.renderWorld();
    return true;
  }

  adjustDistrictRelayChoice(direction) {
    if (
      this.mode !== WORLD ||
      this.activePuzzle !== 'districtRelay' ||
      this.worldTiles[this.player.y][this.player.x] !== 'V' ||
      this.currentMap.renderProfile !== 'factoryDistrict' ||
      this.factoryInteriorUnlocked
    ) {
      return false;
    }
    this.selectedDistrictRelayIndex = Phaser.Math.Wrap(
      this.selectedDistrictRelayIndex + direction,
      0,
      districtRelayOptions.length,
    );
    const leverState = this.districtRelayState[this.selectedDistrictRelayIndex] ? 'up' : 'down';
    this.addLog(`Factory signal lever selected: ${districtRelayOptions[this.selectedDistrictRelayIndex]} (${leverState}).`);
    this.playSfx('menu');
    this.renderWorld();
    return true;
  }

  adjustHotelPuzzleChoice(direction) {
    if (
      this.mode !== WORLD ||
      this.activePuzzle !== 'hotel' ||
      this.worldTiles[this.player.y][this.player.x] !== 'Q' ||
      this.hotelPuzzleSolved
    ) {
      return false;
    }
    this.selectedHotelRoomIndex = Phaser.Math.Wrap(this.selectedHotelRoomIndex + direction, 0, hotelPuzzleRooms.length);
    this.addLog(`Concierge room card: ${hotelPuzzleRooms[this.selectedHotelRoomIndex]}.`);
    this.playSfx('menu');
    this.renderWorld();
    return true;
  }

  adjustControlPasswordChoice(direction) {
    if (
      this.mode !== WORLD ||
      this.activePuzzle !== 'controlPassword' ||
      this.worldTiles[this.player.y][this.player.x] !== 'R' ||
      this.controlPasswordUnlocked
    ) {
      return false;
    }
    this.selectedControlPasswordIndex = Phaser.Math.Wrap(
      this.selectedControlPasswordIndex + direction,
      0,
      controlPasswordOptions.length,
    );
    this.addLog(`Cipher word selected: ${controlPasswordOptions[this.selectedControlPasswordIndex].toUpperCase()}.`);
    this.playSfx('menu');
    this.renderWorld();
    return true;
  }

  adjustControlPanelChoice(direction) {
    if (
      this.mode !== WORLD ||
      this.activePuzzle !== 'controlPanel' ||
      this.worldTiles[this.player.y][this.player.x] !== 'Y' ||
      !this.controlPanelPromptOpen
    ) {
      return false;
    }
    this.selectedControlPanelChoice = Phaser.Math.Wrap(this.selectedControlPanelChoice + direction, 0, 2);
    this.addLog(`Control panel response: ${this.selectedControlPanelChoice === 0 ? 'Yes' : 'No'}.`);
    this.playSfx('menu');
    this.renderWorld();
    return true;
  }

  getValveColorValue(color) {
    if (color === 'red') return palette.red;
    if (color === 'amber') return palette.amber;
    if (color === 'blue') return palette.blue;
    return palette.brass;
  }

  getValveRotation(color) {
    if (color === 'red') return -45;
    if (color === 'amber') return 0;
    if (color === 'blue') return 45;
    return 0;
  }

  startBattle(options = {}) {
    const encounterId = options.encounterId || 'factoryAmbush';
    const encounter = encounters[encounterId] || encounters.factoryAmbush;

    this.mode = BATTLE;
    this.inMenu = false;
    this.activePuzzle = null;
    this.controlPanelPromptOpen = false;
    this.sideMenuOpen = false;
    this.inventoryOpen = false;
    this.objectiveOpen = false;
    this.infoOpen = false;
    this.activeUnitIndex = null;
    this.battleCommandLayer = 'root';
    this.selectedTargetIndex = 0;
    this.battleResolved = false;
    this.enemyActing = false;
    this.currentEncounter = {
      id: encounter.id,
      type: options.type || 'random',
      rewardItem: options.rewardItem || null,
      clearTile: options.clearTile || null,
      activateControlPanel: Boolean(options.activateControlPanel),
      victoryLog: options.victoryLog || 'Victory. The machines fall silent.',
    };
    this.currentBattleRenderProfile = options.renderProfile || this.currentMap.renderProfile || 'factoryDistrict';
    this.inventoryOpen = false;
    this.statusMenuOpen = false;
    this.damagePopups = [];
    this.hitEffects = [];
    this.enemyMoveEffectObjects = new Set();
    this.battleBarFills = { enemyAtb: new Map(), partyAtb: new Map() };
    this.battleEnemies = createEncounterMobs(encounter, mobs);
    this.battleEnemies.forEach((enemy) => {
      enemy.intent = chooseAction(enemy);
    });
    this.addLog(options.startLog || `${encounter.name} begins. ATB continues while menus are open.`);
    this.playSfx('battle');
    this.renderBattle();
  }

  renderBattle() {
    if (!this.battleBackgroundActive) {
      this.clearScene();
      this.drawBattleBackground();
      this.battleBackgroundObjects = new Set(this.children.getChildren());
      this.battleBackgroundActive = true;
    } else {
      this.clearBattleForeground();
    }

    this.drawBattleActors();
    this.drawBattleHud();
    if (this.statusTutorial) this.drawStatusTutorialOverlay();
    if (this.devToolsOpen) this.drawDevTools();
    this.flushDamagePopups();
  }

  drawStatusTutorialOverlay() {
    const rule = statusRules[this.statusTutorial.name];
    if (!rule) return;
    this.add.rectangle(480, 164, 468, 132, 0x120d0a, 0.94).setStrokeStyle(2, palette.amber);
    this.add.text(278, 116, rule.label, this.textStyle(20, palette.amber)).setFontStyle('700');
    this.add.text(278, 150, rule.prompt, this.wrappedTextStyle(14, palette.cream, 404));
    this.add.text(278, 208, 'Enter: Added to info', this.textStyle(12, palette.green)).setFontStyle('700');
  }

  clearBattleForeground() {
    const backgroundObjects = this.battleBackgroundObjects || new Set();
    [...this.children.getChildren()].forEach((child) => {
      if (backgroundObjects.has(child)) return;
      this.tweens.killTweensOf(child);
      child.destroy();
    });
  }

  drawBattleBackground() {
    const profile = this.currentBattleRenderProfile === 'factoryInterior' ? 'factoryInterior' : 'factoryDistrict';
    const textureKey = profile === 'factoryInterior' ? 'battle-factory-interior-bg' : 'battle-factory-district-bg';
    this.createBattleBackgroundTexture(profile);
    this.add.image(480, 270, textureKey).setDepth(-2);
    this.drawBattleBackgroundMotion(profile);
  }

  createBattleBackgroundTexture(profile) {
    if (profile === 'factoryInterior') {
      this.createFactoryInteriorBattleBackgroundTexture();
      return;
    }

    this.createFactoryDistrictBattleBackgroundTexture();
  }

  createFactoryDistrictBattleBackgroundTexture() {
    if (this.textures.exists('battle-factory-district-bg')) return;

    const { coal, iron, panelDark, brass, amber, copper, cream, smoke, red, blue, green } = palette;
    const g = this.add.graphics();
    g.fillStyle(0x100b0a, 1);
    g.fillRect(0, 0, 960, 540);

    g.fillStyle(0x171313, 1);
    g.fillRect(0, 0, 960, 210);
    g.fillStyle(0x2a1812, 0.38);
    g.fillCircle(176, 116, 180);
    g.fillStyle(amber, 0.09);
    g.fillCircle(512, 128, 260);
    g.fillStyle(blue, 0.08);
    g.fillCircle(790, 114, 190);
    g.fillStyle(0x080504, 0.54);
    g.fillRect(0, 0, 960, 82);

    const drawExteriorBlock = (x, y, width, height, roof, tint, accent) => {
      g.fillStyle(0x050302, 0.42);
      g.fillRect(x + 8, y + 10, width, height);
      g.fillStyle(tint, 0.98);
      g.fillRect(x, y, width, height);
      g.fillStyle(0x0b0605, 0.95);
      g.fillRect(x - 6, y - roof, width + 12, roof);
      g.lineStyle(2, accent, 0.58);
      g.strokeRect(x, y, width, height);
      g.lineStyle(1, smoke, 0.26);
      for (let sx = x + 18; sx < x + width - 10; sx += 36) {
        g.beginPath();
        g.moveTo(sx, y + 4);
        g.lineTo(sx - 18, y + height - 6);
        g.strokePath();
      }
      for (let wx = x + 16; wx < x + width - 18; wx += 38) {
        for (let wy = y + 20; wy < y + height - 22; wy += 34) {
          g.fillStyle(panelDark, 0.96);
          g.fillRect(wx, wy, 18, 14);
          g.lineStyle(1, accent, 0.5);
          g.strokeRect(wx, wy, 18, 14);
          g.fillStyle(amber, 0.14);
          g.fillRect(wx + 3, wy + 3, 5, 8);
        }
      }
    };

    drawExteriorBlock(32, 104, 148, 132, 15, 0x1d120e, brass);
    drawExteriorBlock(224, 82, 212, 154, 19, 0x21140f, copper);
    drawExteriorBlock(518, 94, 166, 142, 17, 0x19110f, amber);
    drawExteriorBlock(754, 88, 174, 148, 18, 0x1c1210, blue);

    [
      [84, 26, 22, 120],
      [292, 0, 28, 142],
      [390, 26, 20, 104],
      [602, 10, 26, 126],
      [844, 2, 30, 140],
    ].forEach(([x, y, width, height]) => {
      g.fillStyle(iron, 0.98);
      g.fillRect(x, y, width, height);
      g.fillStyle(coal, 0.96);
      g.fillRect(x - 8, y, width + 16, 8);
      g.lineStyle(1, copper, 0.48);
      g.strokeRect(x, y, width, height);
    });

    g.lineStyle(4, copper, 0.58);
    g.beginPath();
    g.moveTo(0, 232);
    g.lineTo(960, 216);
    g.strokePath();
    g.lineStyle(1, brass, 0.32);
    for (let x = 24; x < 960; x += 54) {
      g.beginPath();
      g.moveTo(x, 231);
      g.lineTo(x + 28, 220);
      g.strokePath();
    }

    const drawStreetLamp = (x, y) => {
      g.lineStyle(4, iron, 0.94);
      g.beginPath();
      g.moveTo(x, y);
      g.lineTo(x, y - 86);
      g.strokePath();
      g.lineStyle(2, brass, 0.72);
      g.beginPath();
      g.moveTo(x, y - 78);
      g.lineTo(x + 34, y - 96);
      g.strokePath();
      g.fillStyle(panelDark, 0.98);
      g.fillRect(x + 28, y - 108, 22, 20);
      g.lineStyle(1, brass, 0.76);
      g.strokeRect(x + 28, y - 108, 22, 20);
      g.fillStyle(amber, 0.34);
      g.fillCircle(x + 39, y - 98, 8);
    };
    drawStreetLamp(134, 352);
    drawStreetLamp(818, 350);

    g.fillStyle(0x0f0907, 0.96);
    g.fillRect(0, 246, 960, 132);
    g.fillStyle(0x2b1a12, 0.96);
    g.beginPath();
    g.moveTo(54, 274);
    g.lineTo(906, 260);
    g.lineTo(932, 350);
    g.lineTo(22, 362);
    g.closePath();
    g.fillPath();
    g.lineStyle(1, smoke, 0.3);
    for (let x = 70; x < 910; x += 34) {
      g.beginPath();
      g.moveTo(x, 274);
      g.lineTo(x - 28, 360);
      g.strokePath();
    }
    g.fillStyle(copper, 0.34);
    for (let x = 86; x < 884; x += 58) {
      g.fillRect(x, 292, 28, 5);
      g.fillRect(x + 22, 330, 28, 5);
    }

    g.fillStyle(0x120b09, 1);
    g.beginPath();
    g.moveTo(0, 376);
    g.lineTo(960, 364);
    g.lineTo(960, 540);
    g.lineTo(0, 540);
    g.closePath();
    g.fillPath();
    g.fillStyle(0x241711, 0.96);
    g.beginPath();
    g.moveTo(88, 382);
    g.lineTo(874, 370);
    g.lineTo(944, 520);
    g.lineTo(16, 520);
    g.closePath();
    g.fillPath();
    g.lineStyle(3, iron, 0.92);
    g.beginPath();
    g.moveTo(306, 388);
    g.lineTo(226, 540);
    g.moveTo(654, 382);
    g.lineTo(746, 540);
    g.strokePath();
    g.lineStyle(2, brass, 0.48);
    g.beginPath();
    g.moveTo(326, 392);
    g.lineTo(262, 540);
    g.moveTo(634, 386);
    g.lineTo(710, 540);
    g.strokePath();
    g.lineStyle(2, copper, 0.42);
    for (let y = 400; y <= 512; y += 24) {
      g.beginPath();
      g.moveTo(42, y);
      g.lineTo(920, y - 10);
      g.strokePath();
    }

    g.fillStyle(0x0a0504, 0.86);
    g.fillRect(346, 184, 268, 48);
    g.lineStyle(2, brass, 0.72);
    g.strokeRect(346, 184, 268, 48);
    g.fillStyle(amber, 0.22);
    g.fillRect(374, 198, 58, 12);
    g.fillStyle(green, 0.2);
    g.fillRect(452, 198, 58, 12);
    g.fillStyle(red, 0.18);
    g.fillRect(530, 198, 58, 12);

    g.fillStyle(cream, 0.1);
    g.fillCircle(480, 170, 120);
    g.fillStyle(0x050302, 0.18);
    g.fillRect(0, 0, 960, 540);

    g.generateTexture('battle-factory-district-bg', 960, 540);
    g.destroy();
  }

  createFactoryInteriorBattleBackgroundTexture() {
    if (this.textures.exists('battle-factory-interior-bg')) return;

    const { coal, iron, panelDark, brass, amber, copper, cream, smoke, red, blue } = palette;
    const g = this.add.graphics();
    g.fillStyle(0x090504, 1);
    g.fillRect(0, 0, 960, 540);

    g.fillStyle(0x15100f, 1);
    g.fillRect(0, 0, 960, 170);
    g.fillStyle(0x24140e, 0.55);
    g.fillCircle(214, 128, 210);
    g.fillStyle(amber, 0.12);
    g.fillCircle(506, 154, 245);
    g.fillStyle(red, 0.08);
    g.fillCircle(810, 142, 190);
    g.fillStyle(0x070403, 0.62);
    g.fillRect(0, 0, 960, 88);

    const drawPipe = (x, y, width, height, color = iron, alpha = 0.96) => {
      g.fillStyle(color, alpha);
      g.fillRect(x, y, width, height);
      g.lineStyle(1, copper, 0.64);
      g.strokeRect(x, y, width, height);
      g.fillStyle(brass, 0.24);
      const horizontal = width > height;
      const step = horizontal ? 52 : 42;
      const end = horizontal ? x + width : y + height;
      for (let pos = (horizontal ? x : y) + step; pos < end; pos += step) {
        if (horizontal) g.fillRect(pos - 4, y - 3, 8, height + 6);
        else g.fillRect(x - 3, pos - 4, width + 6, 8);
      }
    };

    const drawFactoryBlock = (x, y, width, height, roofStep, tint = 0x170d0a) => {
      g.fillStyle(tint, 0.96);
      g.fillRect(x, y, width, height);
      g.fillStyle(0x080403, 0.9);
      g.fillRect(x - 5, y - roofStep, width + 10, roofStep);
      g.lineStyle(1, smoke, 0.38);
      g.strokeRect(x, y, width, height);
      g.fillStyle(amber, 0.18);
      for (let wx = x + 13; wx < x + width - 16; wx += 28) {
        for (let wy = y + 16; wy < y + height - 12; wy += 30) {
          if ((wx + wy) % 3 !== 0) g.fillRect(wx, wy, 12, 7);
        }
      }
    };

    const drawDistrictFront = (x, y, width, height, tint, accent) => {
      g.fillStyle(0x070403, 0.5);
      g.fillRect(x + 5, y + 7, width, height);
      g.fillStyle(tint, 0.98);
      g.fillRect(x, y, width, height);
      g.lineStyle(2, accent, 0.72);
      g.strokeRect(x, y, width, height);
      g.fillStyle(0x0b0605, 0.92);
      g.fillRect(x - 4, y - 10, width + 8, 10);
      g.lineStyle(1, brass, 0.58);
      g.strokeRect(x - 4, y - 10, width + 8, 10);
      g.fillStyle(0x21313a, 0.9);
      for (let wx = x + 16; wx < x + width - 18; wx += 34) {
        g.fillRect(wx, y + 18, 16, 12);
        g.fillStyle(amber, 0.16);
        g.fillRect(wx + 2, y + 20, 5, 8);
        g.fillStyle(0x21313a, 0.9);
      }
      g.fillStyle(panelDark, 0.98);
      g.fillRect(x + width / 2 - 15, y + height - 32, 30, 32);
      g.lineStyle(1, accent, 0.7);
      g.strokeRect(x + width / 2 - 15, y + height - 32, 30, 32);
      g.fillStyle(brass, 0.72);
      g.fillCircle(x + width / 2 + 8, y + height - 16, 2);
      g.fillStyle(accent, 0.72);
      g.fillRect(x + 10, y + height - 10, width - 20, 4);
    };

    drawFactoryBlock(14, 72, 118, 142, 14, 0x120b09);
    drawFactoryBlock(154, 56, 174, 174, 18, 0x19100d);
    drawFactoryBlock(364, 44, 170, 188, 22, 0x160e0c);
    drawFactoryBlock(574, 70, 132, 148, 16, 0x180f0c);
    drawFactoryBlock(744, 50, 188, 176, 20, 0x130c0a);

    drawDistrictFront(28, 214, 142, 100, 0x20130e, brass);
    drawDistrictFront(224, 202, 184, 112, 0x241711, copper);
    drawDistrictFront(548, 208, 154, 106, 0x1d120e, amber);
    drawDistrictFront(766, 210, 142, 104, 0x20130e, blue);

    [
      [48, 232, 104, 18, brass],
      [250, 222, 132, 18, copper],
      [570, 228, 110, 18, amber],
      [790, 230, 96, 18, blue],
    ].forEach(([x, y, width, height, tint]) => {
      g.fillStyle(0x080403, 0.86);
      g.fillRect(x, y, width, height);
      g.lineStyle(1, tint, 0.72);
      g.strokeRect(x, y, width, height);
    });

    g.fillStyle(iron, 0.96);
    [
      [78, 18, 20, 136],
      [248, 8, 26, 150],
      [462, 0, 30, 170],
      [676, 16, 22, 132],
      [854, 6, 28, 150],
    ].forEach(([x, y, width, height]) => {
      g.fillRect(x, y, width, height);
      g.fillStyle(coal, 0.96);
      g.fillRect(x - 7, y, width + 14, 8);
      g.fillStyle(iron, 0.96);
      g.lineStyle(1, copper, 0.45);
      g.strokeRect(x, y, width, height);
    });

    g.lineStyle(3, copper, 0.52);
    g.beginPath();
    g.moveTo(0, 220);
    g.lineTo(960, 202);
    g.strokePath();
    g.lineStyle(1, brass, 0.25);
    for (let x = 42; x <= 910; x += 58) {
      g.beginPath();
      g.moveTo(x, 219);
      g.lineTo(x + 26, 206);
      g.strokePath();
    }

    drawPipe(28, 236, 904, 18, 0x2a1b14);
    drawPipe(114, 132, 16, 180, 0x261811);
    drawPipe(816, 116, 18, 204, 0x261811);
    drawPipe(184, 104, 596, 12, 0x241711);

    g.fillStyle(0x090504, 0.34);
    g.fillRect(0, 96, 960, 268);
    g.fillStyle(0x120b09, 0.92);
    g.fillRect(0, 274, 960, 102);
    g.fillStyle(0x20130e, 0.95);
    g.fillRect(62, 284, 836, 68);
    g.lineStyle(2, brass, 0.64);
    g.strokeRect(62, 284, 836, 68);
    g.lineStyle(1, smoke, 0.3);
    for (let x = 82; x <= 876; x += 42) {
      g.beginPath();
      g.moveTo(x, 286);
      g.lineTo(x - 18, 352);
      g.strokePath();
    }
    g.fillStyle(copper, 0.36);
    for (let x = 92; x <= 862; x += 34) {
      g.fillRect(x, 296, 18, 4);
      g.fillRect(x + 10, 328, 18, 4);
    }

    g.fillStyle(0x1d120e, 0.98);
    g.fillRect(346, 102, 268, 42);
    g.lineStyle(2, copper, 0.78);
    g.strokeRect(346, 102, 268, 42);
    g.fillStyle(panelDark, 0.95);
    g.fillRect(364, 112, 232, 22);
    g.lineStyle(1, brass, 0.72);
    g.strokeRect(364, 112, 232, 22);
    g.fillStyle(amber, 0.32);
    g.fillRect(386, 118, 42, 8);
    g.fillStyle(red, 0.38);
    g.fillRect(462, 118, 42, 8);
    g.fillStyle(blue, 0.28);
    g.fillRect(538, 118, 42, 8);

    g.lineStyle(3, brass, 0.62);
    g.beginPath();
    g.moveTo(600, 84);
    g.lineTo(746, 32);
    g.lineTo(896, 72);
    g.strokePath();
    g.lineStyle(2, copper, 0.5);
    for (let x = 636; x <= 850; x += 38) {
      g.beginPath();
      g.moveTo(x, 72);
      g.lineTo(x + 42, 46);
      g.strokePath();
    }
    g.fillStyle(iron, 0.98);
    g.fillRect(740, 32, 34, 78);
    g.lineStyle(1, brass, 0.52);
    g.strokeRect(740, 32, 34, 78);
    g.fillStyle(copper, 0.88);
    g.fillRect(724, 104, 66, 18);
    g.lineStyle(2, brass, 0.64);
    g.strokeRect(724, 104, 66, 18);
    g.lineStyle(3, smoke, 0.72);
    g.beginPath();
    g.moveTo(757, 122);
    g.lineTo(757, 184);
    g.strokePath();
    g.fillStyle(brass, 0.62);
    g.fillTriangle(744, 184, 770, 184, 757, 212);

    g.fillStyle(0x180d09, 0.98);
    g.fillEllipse(480, 244, 206, 136);
    g.lineStyle(5, copper, 0.86);
    g.strokeEllipse(480, 244, 206, 136);
    g.lineStyle(2, brass, 0.6);
    g.strokeEllipse(480, 244, 166, 102);
    g.fillStyle(0x080403, 0.74);
    g.fillEllipse(480, 244, 112, 62);
    g.lineStyle(2, smoke, 0.44);
    g.beginPath();
    g.moveTo(378, 244);
    g.lineTo(582, 244);
    g.moveTo(480, 176);
    g.lineTo(480, 312);
    g.strokePath();
    g.fillStyle(amber, 0.12);
    g.fillEllipse(480, 244, 146, 84);

    [
      [202, 238, 54, red, -0.9],
      [724, 232, 50, blue, -2.25],
    ].forEach(([x, y, radius, tint, angle]) => {
      g.fillStyle(0x100907, 0.96);
      g.fillCircle(x, y, radius);
      g.lineStyle(4, brass, 0.72);
      g.strokeCircle(x, y, radius);
      g.fillStyle(cream, 0.82);
      g.fillCircle(x, y, radius - 16);
      g.lineStyle(2, tint, 0.86);
      g.beginPath();
      g.moveTo(x, y);
      g.lineTo(x + Math.cos(angle) * (radius - 22), y + Math.sin(angle) * (radius - 22));
      g.strokePath();
      g.fillStyle(panelDark, 1);
      g.fillCircle(x, y, 5);
    });

    g.fillStyle(coal, 0.55);
    g.fillEllipse(250, 324, 218, 38);
    g.fillEllipse(716, 326, 238, 42);
    g.fillEllipse(480, 334, 300, 46);

    g.fillStyle(0x100a08, 1);
    g.beginPath();
    g.moveTo(0, 376);
    g.lineTo(960, 364);
    g.lineTo(960, 540);
    g.lineTo(0, 540);
    g.closePath();
    g.fillPath();
    g.fillStyle(0x241711, 0.92);
    g.beginPath();
    g.moveTo(80, 378);
    g.lineTo(880, 368);
    g.lineTo(944, 520);
    g.lineTo(16, 520);
    g.closePath();
    g.fillPath();
    g.fillStyle(0x0a0504, 0.86);
    g.beginPath();
    g.moveTo(360, 382);
    g.lineTo(606, 378);
    g.lineTo(674, 540);
    g.lineTo(286, 540);
    g.closePath();
    g.fillPath();
    g.lineStyle(2, copper, 0.5);
    for (let y = 396; y <= 512; y += 24) {
      g.beginPath();
      g.moveTo(34, y);
      g.lineTo(926, y - 10);
      g.strokePath();
    }
    g.lineStyle(1, smoke, 0.34);
    for (let x = 112; x <= 852; x += 74) {
      g.beginPath();
      g.moveTo(x, 378);
      g.lineTo(x - 54, 520);
      g.strokePath();
    }
    g.lineStyle(4, iron, 0.9);
    g.beginPath();
    g.moveTo(336, 390);
    g.lineTo(274, 540);
    g.moveTo(620, 386);
    g.lineTo(690, 540);
    g.strokePath();
    g.lineStyle(2, brass, 0.5);
    g.beginPath();
    g.moveTo(352, 394);
    g.lineTo(300, 540);
    g.moveTo(604, 390);
    g.lineTo(662, 540);
    g.strokePath();

    g.fillStyle(0x050302, 0.22);
    g.fillRect(0, 0, 960, 540);

    g.generateTexture('battle-factory-interior-bg', 960, 540);
    g.destroy();
  }

  drawBattleBackgroundMotion(profile) {
    if (profile === 'factoryInterior') {
      this.drawFactoryInteriorBattleBackgroundMotion();
      return;
    }

    this.drawFactoryDistrictBattleBackgroundMotion();
  }

  drawFactoryDistrictBattleBackgroundMotion() {
    const { brass, amber, copper, cream, red, blue, smoke, green } = palette;
    const rm = this.settingsState.reducedMotion;

    this.add.text(480, 204, 'CINDERWORKS FACTORY', this.textStyle(11, palette.amber))
      .setOrigin(0.5)
      .setAlpha(0.72)
      .setDepth(-1)
      .setFontStyle('700');

    [
      [106, 146, 'KEYWORKS', brass],
      [330, 124, 'PRESSURE WORKS', copper],
      [602, 136, 'HOTEL ROW', amber],
      [842, 130, 'FACTORY GATE', blue],
    ].forEach(([x, y, label, color]) => {
      this.add.text(x, y, label, this.textStyle(8, color))
        .setOrigin(0.5, 0)
        .setAlpha(0.7)
        .setDepth(-1)
        .setFontStyle('700');
    });

    const lampGlows = [
      this.add.circle(173, 254, 32, amber, 0.1).setDepth(-1),
      this.add.circle(857, 252, 34, amber, 0.1).setDepth(-1),
    ];
    const signGlows = [
      this.add.rectangle(403, 204, 62, 14, amber, 0.12).setDepth(-1),
      this.add.rectangle(481, 204, 62, 14, green, 0.1).setDepth(-1),
      this.add.rectangle(559, 204, 62, 14, red, 0.1).setDepth(-1),
    ];
    if (!rm) {
      this.addLoopTween(lampGlows, {
        alpha: 0.24,
        scale: 1.12,
        duration: 940,
        ease: 'Sine.easeInOut',
        yoyo: true,
      });
      signGlows.forEach((glow, index) => {
        this.addLoopTween(glow, {
          alpha: 0.28,
          scaleX: 1.08,
          duration: 760,
          delay: index * 180,
          ease: 'Sine.easeInOut',
          yoyo: true,
        });
      });
    }

    const railSpark = this.add.circle(622, 426, 4, cream, 0.62).setDepth(-1);
    const railSpark2 = this.add.circle(314, 438, 3, amber, 0.5).setDepth(-1);
    if (!rm) {
      this.addLoopTween(railSpark, {
        x: 690,
        y: 504,
        alpha: 0.08,
        scale: 1.8,
        duration: 980,
        ease: 'Quad.easeInOut',
        yoyo: true,
      });
      this.addLoopTween(railSpark2, {
        x: 250,
        y: 512,
        alpha: 0.06,
        scale: 1.6,
        duration: 1140,
        delay: 240,
        ease: 'Quad.easeInOut',
        yoyo: true,
      });
    }

    const skyGears = [
      this.add.image(224, 206, 'gear').setScale(0.56).setTint(copper).setAlpha(0.12).setDepth(-1),
      this.add.image(734, 204, 'gear').setScale(-0.62, 0.62).setTint(brass).setAlpha(0.11).setDepth(-1),
    ];
    if (!rm) {
      this.addLoopTween(skyGears[0], { angle: 360, duration: 38000, ease: 'Linear' });
      this.addLoopTween(skyGears[1], { angle: -360, duration: 42000, ease: 'Linear' });
    }

    const steamPts = [
      [96, 48, 22],
      [306, 40, 28],
      [402, 68, 20],
      [616, 48, 26],
      [860, 42, 30],
      [166, 262, 18],
      [848, 260, 18],
    ];
    steamPts.forEach(([sx, sy, radius], index) => {
      const puff = this.add.circle(sx, sy, radius, index < 5 ? smoke : cream, index < 5 ? 0.13 : 0.08).setDepth(-1);
      if (!rm) {
        this.addLoopTween(puff, {
          x: sx + (index % 2 === 0 ? 18 : -14),
          y: sy - 28,
          alpha: 0.025,
          scale: 1.32,
          duration: 2200 + index * 150,
          ease: 'Sine.easeInOut',
          yoyo: true,
        });
      }
    });
  }

  drawFactoryInteriorBattleBackgroundMotion() {
    const { brass, amber, copper, cream, red, blue, smoke } = palette;
    const rm = this.settingsState.reducedMotion;

    this.add.text(480, 124, 'FACTORY INTERIOR MANIFOLD', this.textStyle(10, palette.amber))
      .setOrigin(0.5)
      .setAlpha(0.62)
      .setDepth(-1);
    [
      [100, 233, 'LOCKWORKS', brass],
      [316, 223, 'PIPEWORKS', copper],
      [625, 229, 'VALVE BANK', amber],
      [838, 231, 'LIFT DRIVE', blue],
    ].forEach(([x, y, label, color]) => {
      this.add.text(x, y, label, this.textStyle(8, color))
        .setOrigin(0.5, 0)
        .setAlpha(0.72)
        .setDepth(-1)
        .setFontStyle('700');
    });

    const furnaceGlow = this.add.ellipse(480, 244, 144, 84, amber, 0.08).setDepth(-1);
    if (!rm) {
      this.addLoopTween(furnaceGlow, {
        alpha: 0.2,
        scaleX: 1.08,
        scaleY: 1.14,
        duration: 1250,
        ease: 'Sine.easeInOut',
        yoyo: true,
      });
    }

    const signalGlows = [
      [407, 122, amber, 0],
      [483, 122, red, 180],
      [559, 122, blue, 360],
    ];
    signalGlows.forEach(([x, y, color, delay]) => {
      const glow = this.add.rectangle(x, y, 44, 12, color, 0.16).setDepth(-1);
      if (!rm) {
        this.addLoopTween(glow, {
          alpha: 0.34,
          scaleX: 1.12,
          duration: 820,
          delay,
          ease: 'Sine.easeInOut',
          yoyo: true,
        });
      }
    });

    const drawNeedle = (x, y, color, startAngle, swing) => {
      const needle = this.add.line(x, y, 0, 0, 28, 0, color, 0.86).setLineWidth(2).setDepth(-1);
      needle.angle = startAngle;
      this.add.circle(x, y, 5, palette.panelDark, 1).setDepth(-1);
      if (!rm) {
        this.addLoopTween(needle, {
          angle: startAngle + swing,
          duration: 1400 + Math.abs(swing) * 30,
          ease: 'Sine.easeInOut',
          yoyo: true,
        });
      }
    };
    drawNeedle(202, 238, red, -52, 18);
    drawNeedle(724, 232, blue, -128, -16);

    const railLights = [];
    for (let x = 124; x <= 846; x += 86) {
      railLights.push(this.add.circle(x, 302, 4, amber, 0.22).setDepth(-1));
    }
    if (!rm) {
      this.addLoopTween(railLights, {
        alpha: 0.48,
        duration: 980,
        ease: 'Sine.easeInOut',
        yoyo: true,
      });
    }

    const gearLeft = this.add.image(202, 238, 'gear').setScale(0.7).setTint(copper).setAlpha(0.2).setDepth(-1);
    const gearCenter = this.add.image(480, 244, 'gear').setScale(1.26).setTint(brass).setAlpha(0.13).setDepth(-1);
    const gearRight = this.add.image(724, 232, 'gear').setScale(-0.66, 0.66).setTint(copper).setAlpha(0.18).setDepth(-1);
    if (!rm) {
      this.addLoopTween(gearLeft, { angle: 360, duration: 30000, ease: 'Linear' });
      this.addLoopTween(gearCenter, { angle: -360, duration: 46000, ease: 'Linear' });
      this.addLoopTween(gearRight, { angle: -360, duration: 34000, ease: 'Linear' });
    }

    const hook = this.add.triangle(757, 203, 0, -10, 12, 12, -12, 12, brass, 0.2).setDepth(-1);
    if (!rm) {
      this.addLoopTween(hook, {
        y: 211,
        angle: 3,
        duration: 1800,
        ease: 'Sine.easeInOut',
        yoyo: true,
      });
    }

    const steamPts = [
      [126, 130, 20],
      [266, 96, 24],
      [492, 74, 26],
      [686, 116, 20],
      [868, 86, 24],
      [120, 322, 16],
      [826, 320, 16],
    ];
    steamPts.forEach(([sx, sy, radius], index) => {
      const color = index < 5 ? smoke : cream;
      const puff = this.add.circle(sx, sy, radius, color, index < 5 ? 0.12 : 0.08).setDepth(-1);
      if (!rm) {
        this.addLoopTween(puff, {
          x: sx + (index % 2 === 0 ? 14 : -12),
          y: sy - 24,
          alpha: 0.025,
          scale: 1.28,
          duration: 2300 + index * 170,
          ease: 'Sine.easeInOut',
          yoyo: true,
        });
      }
    });
  }

  drawBattleActors() {
    this.battleEnemies.forEach((enemy) => {
      if (enemy.hp <= 0) return;
      const effect = this.getHitEffect(enemy.id);
      const isTargeted = this.getSelectedEnemy() === enemy && this.inMenu;
      const scale = enemy.battleScale ?? 1.72;
      const mobKey = enemy.battleSpriteId;
      const firstFrame = mobKey ? `mob-${mobKey}-a` : null;
      const animKey = mobKey ? `mob-${mobKey}-idle` : null;
      const px = enemy.x + effect.x;
      const py = enemy.y + effect.y;

      if (
        mobKey &&
        firstFrame &&
        this.textures.exists(firstFrame) &&
        !this.settingsState.reducedMotion &&
        this.anims.exists(animKey)
      ) {
        const sprite = this.add.sprite(px, py, firstFrame);
        sprite.setScale(scale);
        sprite.play(animKey);
      } else if (mobKey && firstFrame && this.textures.exists(firstFrame)) {
        this.add.image(px, py, firstFrame).setScale(scale);
      } else {
        this.add.image(px, py, 'enemy').setScale(scale).setTint(enemy.tint);
      }

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
    const commandOpen = this.inMenu && this.activeUnitIndex !== null;
    const logWidth = commandOpen ? 246 : 520;
    const logText = this.add.text(
      42,
      418,
      this.messageLog.at(-1) || '',
      this.wrappedTextStyle(commandOpen ? 12 : 14, palette.cream, logWidth),
    );
    logText.setMaxLines(commandOpen ? 5 : 4);

    if (commandOpen) {
      this.add.rectangle(304, 454, 1, 112, palette.copper, 0.55);
      this.drawCommandMenu();
      this.drawCommandDescription();
    }
  }

  drawEnemyPlates() {
    this.battleBarFills.enemyAtb.clear();
    this.battleEnemies.forEach((enemy, index) => {
      const x = 24 + index * 222;
      const y = 22;
      this.add.rectangle(x + 104, y + 41, 208, 68, 0x211713, 0.95).setStrokeStyle(2, palette.brass);
      this.add.text(x + 14, y + 10, enemy.name, this.textStyle(13, palette.amber)).setFontStyle('700');
      this.add.text(x + 14, y + 28, `HP ${enemy.hp}/${enemy.maxHp}`, this.textStyle(12, palette.cream));
      this.drawBar(x + 78, y + 33, 112, 9, enemy.hp / enemy.maxHp, palette.red);
      this.add.text(x + 14, y + 46, 'ATB', this.textStyle(9, palette.gray));
      const atbFill = this.drawTrackedBar(x + 78, y + 47, 112, 9, enemy.atb / 100, palette.amber);
      this.battleBarFills.enemyAtb.set(enemy.id, atbFill);
      this.add.text(x + 14, y + 58, this.compactStatusLabel(enemy), this.wrappedTextStyle(10, palette.cream, 84));
      this.add.text(x + 102, y + 58, `Intent: ${enemy.intent?.name || 'Attack'}`, this.wrappedTextStyle(10, palette.amber, 90));
    });
  }

  drawPartyPlates() {
    this.battleBarFills.partyAtb.clear();
    this.party.forEach((unit, index) => {
      const x = 626 + index * 158;
      const y = 392;
      this.add.rectangle(x + 74, y + 58, 148, 112, 0x211713, 0.96).setStrokeStyle(2, palette.brass);
      this.add.text(x + 12, y + 10, unit.name, this.textStyle(14, palette.amber)).setFontStyle('700');
      this.add.text(x + 12, y + 30, unit.role, this.wrappedTextStyle(10, palette.gray, 122));
      this.add.text(x + 12, y + 50, `HP ${unit.hp}/${unit.maxHp}`, this.textStyle(12, palette.cream));
      this.drawBar(x + 12, y + 68, 120, 9, unit.hp / unit.maxHp, palette.green);
      const atbFill = this.drawTrackedBar(x + 12, y + 84, 120, 8, unit.atb / 100, palette.amber);
      this.battleBarFills.partyAtb.set(unit.id, atbFill);
      this.add.text(x + 12, y + 96, this.compactStatusLabel(unit), this.wrappedTextStyle(10, palette.cream, 120));
    });
  }

  drawCommandMenu() {
    const unit = this.party[this.activeUnitIndex];
    const commands = this.getCommandOptions(unit);
    if (this.selectedCommand >= commands.length) this.selectedCommand = 0;
    const panelTitles = {
      root: `${unit.name} · Orders`,
      skills: `${unit.name} · Skills`,
      items: `${unit.name} · Items`,
    };
    const panelTitle = panelTitles[this.battleCommandLayer] || panelTitles.root;
    this.add.text(326, 400, panelTitle, this.textStyle(14, palette.amber)).setFontStyle('700');
    this.add.rectangle(458, 459, 252, 1, palette.copper, 0.55);
    const rowH = 18;
    const startY = 422;
    commands.forEach((command, index) => {
      const y = startY + index * rowH;
      const selected = index === this.selectedCommand;
      this.add.rectangle(458, y + 7, 252, 17, selected ? 0x553018 : 0x000000, selected ? 0.92 : 0);
      const label = this.add.text(
        328,
        y - 1,
        `${selected ? '›' : ' '} ${command.name}`,
        this.wrappedTextStyle(13, selected ? palette.amber : palette.cream, 252),
      );
      label.setMaxLines(1);
    });
  }

  drawCommandDescription() {
    const unit = this.party[this.activeUnitIndex];
    const commands = this.getCommandOptions(unit);
    const active = commands[this.selectedCommand];
    const description = active?.description || 'No description available.';
    this.add.rectangle(164, 492, 248, 48, 0x211713, 0.72).setStrokeStyle(1, palette.copper);
    this.add.text(42, 466, 'Description', this.textStyle(11, palette.amber)).setFontStyle('700');
    const detail = this.add.text(42, 486, description, this.wrappedTextStyle(12, palette.cream, 238));
    detail.setMaxLines(2);
  }

  getCommandOptions(unit) {
    if (this.battleCommandLayer === 'skills') {
      return unit.skills.map((skill) => ({ ...skill, commandType: 'skill' }));
    }

    if (this.battleCommandLayer === 'items') {
      const items = Object.entries(this.consumables)
        .filter(([, count]) => count > 0)
        .map(([name, count]) => ({
          name: `${name} ×${count}`,
          itemName: name,
          target: 'ally',
          commandType: 'item',
          description: itemData[name].description,
        }));

      if (items.length) return items;

      return [
        {
          name: 'No consumables',
          commandType: 'empty',
          target: 'none',
          description: 'The inventory is empty.',
        },
      ];
    }

    const attack = {
      name: 'Attack',
      commandType: 'attack',
      power: unit.basicAttackPower ?? 10,
      target: 'enemy',
      description: 'Quick strike. Lower damage than skills.',
    };
    const skillsMenu = {
      name: 'Skills',
      commandType: 'skill-menu',
      target: 'none',
      description: 'Open this fighter\'s skill list.',
    };
    const hasItems = Object.values(this.consumables).some((count) => count > 0);
    const itemsMenu = {
      name: 'Items',
      commandType: 'item-menu',
      target: 'none',
      description: hasItems ? 'Open the combat inventory.' : 'The combat inventory is empty.',
    };
    const run = {
      name: 'Run',
      commandType: 'run',
      target: 'none',
      description: 'Escape from the encounter.',
    };
    return [attack, skillsMenu, itemsMenu, run];
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
    if (this.statusTutorial) {
      this.updateBattleAtbBars();
      return;
    }

    if (this.party.every((unit) => unit.hp <= 0)) {
      this.battleResolved = true;
      this.inMenu = false;
      this.activeUnitIndex = null;
      this.clearTransientBattleEffects();
      this.respawnPartyAfterDefeat();
      return;
    }

    if (this.battleEnemies.every((unit) => unit.hp <= 0)) {
      const completedEncounter = this.currentEncounter;
      this.battleResolved = true;
      this.inMenu = false;
      this.activeUnitIndex = null;
      this.clearTransientBattleEffects();
      this.clearBattleStatuses();
      if (completedEncounter?.rewardItem) this.addItem(completedEncounter.rewardItem);
      if (completedEncounter?.clearTile === 'E') {
        this.enemyCleared = true;
        this.replaceWorldTile('E', '.');
      }
      if (completedEncounter?.activateControlPanel) {
        this.controlPanelActivated = true;
        this.gameComplete = true;
      }
      this.currentEncounter = null;
      this.stepsUntilEncounter = this.rollStepsUntilEncounter();
      this.addLog(completedEncounter?.victoryLog || 'Victory. The machines fall silent.');
      this.playSfx('success');
      this.mode = WORLD;
      this.renderWorld();
      return;
    }

    const enemyAtbMenuMultiplier = this.inMenu && this.activeUnitIndex !== null ? 0.35 : 1;
    [...this.party, ...this.battleEnemies].forEach((unit) => {
      if (unit.hp <= 0 || (this.inMenu && this.party.includes(unit))) return;
      if (hasStatus(unit, 'stunned')) return;
      const atbMultiplier = this.battleEnemies.includes(unit) ? enemyAtbMenuMultiplier : 1;
      unit.atb = Math.min(100, unit.atb + (unit.speed * delta * atbMultiplier) / 1000);
    });
    this.updateBattleAtbBars();

    const readyHero = this.party.findIndex((unit) => unit.hp > 0 && unit.atb >= 100);
    if (!this.inMenu && readyHero >= 0) {
      this.inMenu = true;
      this.activeUnitIndex = readyHero;
      this.battleCommandLayer = 'root';
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

  }

  moveMenu(direction) {
    if (this.mode === WORLD && this.sideMenuOpen) {
      this.selectedSideMenuIndex = Phaser.Math.Wrap(this.selectedSideMenuIndex + direction, 0, 3);
      this.playSfx('menu');
      this.renderWorld();
      return;
    }

    if (this.mode === WORLD && this.infoOpen) {
      const knownStatuses = [...this.statusInfo].filter((name) => statusRules[name]);
      if (!knownStatuses.length) return;
      this.selectedInfoIndex = Phaser.Math.Wrap(this.selectedInfoIndex + direction, 0, knownStatuses.length);
      this.playSfx('menu');
      this.renderWorld();
      return;
    }

    if (this.statusTutorial) return;
    if (this.statusMenuOpen || !this.inMenu || this.activeUnitIndex === null) return;
    const commands = this.getCommandOptions(this.party[this.activeUnitIndex]);
    this.selectedCommand = Phaser.Math.Wrap(this.selectedCommand + direction, 0, commands.length);
    this.playSfx('menu');
    this.renderBattle();
  }

  moveTarget(direction) {
    if (this.statusTutorial) return;
    if (this.adjustDistrictRelayChoice(direction)) return;
    if (this.adjustValveChoice(direction)) return;
    if (this.adjustHotelPuzzleChoice(direction)) return;
    if (this.adjustControlPasswordChoice(direction)) return;
    if (this.adjustControlPanelChoice(direction)) return;
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
    if (!command || command.commandType === 'skill-menu' || command.commandType === 'item-menu' || command.commandType === 'empty') return;

    if (command.commandType === 'run') {
      this.runFromBattle(actor);
      return;
    }

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
      const promptLogs = [];
      if (command.status && Math.random() < (command.statusChance ?? 1)) {
        const statusPrompt = this.applyStatus(target, command.status);
        if (statusPrompt) promptLogs.push(statusPrompt);
      }
      if (command.selfStatus) {
        const statusPrompt = this.applyStatus(actor, command.selfStatus, 4);
        if (statusPrompt) promptLogs.push(statusPrompt);
      }
      this.spawnHitEffect(target.id);
      this.spawnDamageNumber(target.x, target.y - 54, damage, critical, 'damage');
      const actionLog = `${actor.name} uses ${command.name} on ${target.name} for ${damage} damage${
        critical ? ' - CRITICAL!' : '.'
      }`;
      this.addLog([actionLog, ...promptLogs].join(' '));
      this.playSfx('hit');
    }

    this.consumeTurn(actor);
  }

  runFromBattle(actor) {
    this.battleResolved = true;
    this.inMenu = false;
    this.activeUnitIndex = null;
    this.battleCommandLayer = 'root';
    this.enemyActing = false;
    this.clearTransientBattleEffects();
    this.currentEncounter = null;
    this.stepsUntilEncounter = this.rollStepsUntilEncounter();
    this.party.forEach((unit) => {
      unit.atb = 0;
    });
    this.battleEnemies = [];
    this.addLog(`${actor.name} signals retreat. The party escapes the encounter.`);
    this.playSfx('menu');
    this.mode = WORLD;
    this.renderWorld();
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
    if (hasStatus(enemy, 'jamming') && Math.random() < 0.35) {
      this.addLog(`${enemy.name}'s mechanism jams. Enemy action fails.`);
      this.playSfx('error');
      this.consumeEnemyTurn(enemy);
      return;
    }

    if (hasStatus(enemy, 'burned')) {
      enemy.hp = Math.max(0, enemy.hp - 8);
      this.spawnDamageNumber(enemy.x, enemy.y - 54, 8, false, 'damage');
      this.addLog(`${enemy.name} takes 8 burn damage.`);
      if (enemy.hp <= 0) {
        this.consumeEnemyTurn(enemy);
        return;
      }
    }

    const action = enemy.intent || chooseAction(enemy);
    const result = this.resolveEnemyAction(enemy, action, target);
    const delay = this.settingsState.reducedMotion ? 80 : 480;
    this.addLog(`${enemy.name} readies ${action.name}.`);
    this.playSfx('enemy');
    this.renderBattle();
    this.spawnEnemyMoveEffect(enemy, target, action, delay);
    this.time.delayedCall(delay, () => {
      if (this.mode !== BATTLE || this.battleResolved) {
        this.enemyActing = false;
        return;
      }
      if (enemy.hp <= 0 || !this.battleEnemies.includes(enemy)) {
        this.enemyActing = false;
        this.renderBattle();
        return;
      }
      if (target.hp <= 0) {
        this.enemyActing = false;
        this.renderBattle();
        return;
      }
      target.hp = Math.max(0, target.hp - result.damage);
      this.spawnHitEffect(target.id);
      this.spawnDamageNumber(this.getPartyActorX(target), this.getPartyActorY(target) - 58, result.damage, result.critical, 'damage');
      this.tickGlobalStatuses();
      const statusPrompt = result.status ? this.applyStatus(target, result.status.name, result.status.turns) : '';

      enemy.atb = 0;
      enemy.intent = chooseAction(enemy);
      this.tickStatuses(enemy);
      const actionLog = `${enemy.name} ${action.log || `uses ${action.name}`} on ${target.name} for ${result.damage}${
          result.critical ? ' - critical!' : '.'
        }`;
      this.addLog(statusPrompt ? `${actionLog} ${statusPrompt}` : actionLog);
      this.enemyActing = false;
      this.renderBattle();
    });
  }

  spawnEnemyMoveEffect(enemy, target, action, duration) {
    if (this.settingsState.reducedMotion) return;
    const objects = spawnBattleMoveEffect(this, {
      enemy,
      target,
      action,
      duration,
    });
    objects.forEach((object) => this.enemyMoveEffectObjects.add(object));
    this.time.delayedCall(duration + 180, () => {
      objects.forEach((object) => {
        this.enemyMoveEffectObjects.delete(object);
        if (object.active) object.destroy();
      });
    });
  }

  consumeEnemyTurn(enemy) {
    enemy.atb = 0;
    enemy.intent = chooseAction(enemy);
    this.tickStatuses(enemy, 'action');
    this.tickGlobalStatuses();
    this.enemyActing = false;
    this.renderBattle();
  }

  consumeTurn(unit) {
    unit.atb = 0;
    this.tickStatuses(unit, 'action');
    this.tickGlobalStatuses();
    this.battleCommandLayer = 'root';
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
      if (this.mode === BATTLE && statusRules[name]) {
        this.statusTutorial = { name };
        this.renderBattle();
      }
    }
    return '';
  }

  acknowledgeStatusTutorial() {
    if (!this.statusTutorial) return;
    this.statusInfo.add(this.statusTutorial.name);
    this.statusTutorial = null;
    this.addLog('Added to info.');
    this.playSfx('menu');
    this.renderCurrentMode();
  }

  tickStatuses(unit, durationType) {
    tickStatuses(unit, durationType);
  }

  tickGlobalStatuses() {
    [...this.party, ...this.battleEnemies].forEach((unit) => tickStatuses(unit, 'globalAction'));
  }

  replaceWorldTile(target, replacement) {
    this.replaceMapTile(this.currentMapId, target, replacement);
    this.worldTiles = this.mapTilesById[this.currentMapId];
  }

  replaceMapTile(mapId, target, replacement) {
    this.mapTilesById[mapId] = this.mapTilesById[mapId].map((row) => row.replace(target, replacement));
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
      currentMapId: this.currentMapId,
      player: this.player,
      latestRestPoint: this.latestRestPoint,
      valveInput: this.valveInput,
      valveSolved: this.valveSolved,
      hotelPuzzleSolved: this.hotelPuzzleSolved,
      districtRelayState: this.districtRelayState,
      controlPasswordInput: this.controlPasswordInput,
      controlPasswordUnlocked: this.controlPasswordUnlocked,
      controlPanelActivated: this.controlPanelActivated,
      factoryInteriorUnlocked: this.factoryInteriorUnlocked,
      westernGateOpen: this.westernGateOpen,
      gateOpen: this.gateOpen,
      enemyCleared: this.enemyCleared,
      stepsUntilEncounter: this.stepsUntilEncounter,
      gameComplete: this.gameComplete,
      settingsState: this.settingsState,
      statusInfo: [...this.statusInfo],
      seenStatusPrompts: [...this.seenStatusPrompts],
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
    this.currentMapId = worldMaps[state.currentMapId] ? state.currentMapId : startingMapId;
    this.currentMap = worldMaps[this.currentMapId];
    this.worldTiles = this.mapTilesById[this.currentMapId];
    this.player = state.player || this.player;
    this.latestRestPoint = this.validateRestPoint(state.latestRestPoint);
    this.valveInput = state.valveInput || [];
    this.valveSolved = Boolean(state.valveSolved);
    this.hotelPuzzleSolved = Boolean(state.hotelPuzzleSolved);
    this.controlPasswordInput = Array.isArray(state.controlPasswordInput)
      ? state.controlPasswordInput.filter((word) => controlPasswordOptions.includes(word))
      : [];
    this.controlPasswordUnlocked = Boolean(state.controlPasswordUnlocked);
    if (this.controlPasswordUnlocked) this.controlPasswordInput = [controlPanelPassword.toLowerCase()];
    this.controlPanelActivated = Boolean(state.controlPanelActivated);
    this.controlPanelPromptOpen = false;
    this.districtRelayState = Array.isArray(state.districtRelayState) && state.districtRelayState.length === districtRelayAnswer.length
      ? state.districtRelayState.map(Boolean)
      : districtRelayAnswer.map(() => false);
    this.factoryInteriorUnlocked = Boolean(
      state.factoryInteriorUnlocked ||
      state.westernGateOpen ||
      this.inventory.has('Factory Gate Key'),
    );
    if (this.factoryInteriorUnlocked) {
      this.inventory.add('Factory Gate Key');
      this.districtRelayState = [...districtRelayAnswer];
    }
    this.westernGateOpen = this.factoryInteriorUnlocked;
    this.gateOpen = Boolean(state.gateOpen || state.valveSolved);
    this.enemyCleared = Boolean(state.enemyCleared);
    const encounterMaxSteps = this.currentMap.randomEncounters?.maxSteps ?? 30;
    this.stepsUntilEncounter = Number.isInteger(state.stepsUntilEncounter)
      ? Phaser.Math.Clamp(state.stepsUntilEncounter, 1, encounterMaxSteps)
      : this.rollStepsUntilEncounter();
    this.gameComplete = Boolean(state.gameComplete);
    this.settingsState = { ...this.settingsState, ...(state.settingsState || {}) };
    this.statusInfo = new Set((state.statusInfo || []).filter((name) => statusRules[name]));
    this.seenStatusPrompts = new Set((state.seenStatusPrompts || [...this.statusInfo]).filter((name) => statusRules[name]));
    this.party.forEach((unit) => {
      const savedUnit = state.party?.find((entry) => entry.id === unit.id);
      if (savedUnit) unit.hp = Phaser.Math.Clamp(savedUnit.hp, 1, unit.maxHp);
    });
    if (this.enemyCleared) {
      Object.keys(worldMaps).forEach((mapId) => this.replaceMapTile(mapId, 'E', '.'));
      this.worldTiles = this.mapTilesById[this.currentMapId];
    }
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
    destroyBattleMoveEffectObjects(this, this.enemyMoveEffectObjects);
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
    this.addItem('Pressure Coupler');
    this.addLog('Dev: key, gauge, and coupler granted.');
    if (this.mode === WORLD) this.renderWorld();
  }

  devSolveValve() {
    if (!this.devToolsOpen) return;
    this.valveInput = [...valveSequence];
    this.valveSolved = true;
    this.factoryInteriorUnlocked = true;
    this.districtRelayState = [...districtRelayAnswer];
    this.addItem('Factory Gate Key');
    this.westernGateOpen = true;
    this.gateOpen = true;
    this.addLog('Dev: valve solved and factory door unlocked.');
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

  drawTrackedBar(x, y, width, height, ratio, color) {
    this.add.rectangle(x + width / 2, y + height / 2, width, height, palette.panelDark)
      .setStrokeStyle(1, palette.brass);
    const fill = this.add.rectangle(x, y + height / 2, 1, height, color).setOrigin(0, 0.5);
    fill._barWidth = width;
    this.setTrackedBarRatio(fill, ratio);
    return fill;
  }

  setTrackedBarRatio(fill, ratio) {
    const width = fill._barWidth * Phaser.Math.Clamp(ratio || 0, 0, 1);
    fill.displayWidth = Math.max(0.001, width);
    fill.visible = width > 0;
    fill.setFillStyle(width >= fill._barWidth ? palette.green : palette.amber);
  }

  updateBattleAtbBars() {
    if (!this.battleBarFills?.enemyAtb) return;
    this.battleEnemies.forEach((enemy) => {
      const fill = this.battleBarFills.enemyAtb.get(enemy.id);
      if (fill?.active) this.setTrackedBarRatio(fill, enemy.atb / 100);
    });
    this.party.forEach((unit) => {
      const fill = this.battleBarFills.partyAtb.get(unit.id);
      if (fill?.active) this.setTrackedBarRatio(fill, unit.atb / 100);
    });
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

  addLoopTween(targets, config) {
    if (this.settingsState.reducedMotion) return;
    return this.tweens.add({
      targets,
      repeat: -1,
      ...config,
    });
  }

  resetBattleBackground() {
    this.battleBackgroundObjects = null;
    this.battleBackgroundActive = false;
  }

  clearScene() {
    this.tweens.killAll();
    [...this.children.getChildren()].forEach((child) => child.destroy());
    this.resetBattleBackground();
    this.worldHudObjects = [];
    this.playerSprite = null;
    this.worldMapBuilt = false;
    this.worldMapBuildKey = '';
  }
}

export default SteamRpgScene;
