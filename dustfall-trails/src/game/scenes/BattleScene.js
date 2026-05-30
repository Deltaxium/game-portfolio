import { enemySpriteKeys, horseSpriteKeys, partySpriteKeys } from '../assets/sprites/index.js';
import { musicKeys, stanceVoiceKeys } from '../assets/audio/index.js';
import { desertTileset } from '../assets/tiles/free-desert/index.js';
import { bountyContracts, itemCatalog, palette, riderStances, scenes } from '../config/gameData.js';
import { createElementTilemapData, createTilemapData, generateBattleMap, generateTutorialBattleMap } from '../maps/battleMaps.js';
import {
  createEncounter,
  createStatus,
  enemySpeed,
  getHorse,
  hasEquippedTrait,
  getWeapon,
  hasStatus,
  healingAmount,
  incomingDamage,
  isMounted,
  living,
  riderDamage,
  riderSpeed,
  skillPower,
  talentFollowUp,
  weaponFollowUp,
} from '../systems/combat.js';
import { getLane, getReachableTiles, gridDistance, gridToWorld, isInBounds, sortUnitsForDraw, terrainAt, worldToGrid } from '../systems/grid.js';
import { createParty } from '../systems/party.js';
import { getAudioSettings } from '../systems/settings.js';
import { getPartySynergy as computePartySynergy, hasPartySynergy, hasSynergySurge } from '../systems/synergy.js';
import { drawButton, drawPanel, labelStyle, textStyle, titleStyle } from '../ui/drawing.js';
import BaseScene from './BaseScene.js';

export default class BattleScene extends BaseScene {
  constructor() {
    super(scenes.BATTLE);
  }

  create() {
    super.create();
    const state = this.getState();
    if (!state.party) state.party = createParty();
    state.items ||= { bandage: 0, canteen: 0, whiskey: 0 };
    state.preparedSynergy ||= computePartySynergy(state.party);
    this.preparedSynergy = state.preparedSynergy;
    this.synergySurge = { id: this.preparedSynergy.id, momentum: 0, active: false };
    this.surgeEvents = [];
    const encounterId = state.nextEncounterId || 'redSashAmbush';
    this.mapDef = encounterId === 'tutorialDustup' ? generateTutorialBattleMap() : generateBattleMap();
    this.encounter = createEncounter(encounterId, state.wanted);
    this.objectiveUnit = this.createWagonObjective(this.encounter, state);
    if (this.objectiveUnit) this.prepareWagonObjectiveTile(this.objectiveUnit.grid);
    this.encounter.enemies = this.selectEncounterEnemies(this.encounter, this.objectiveUnit);
    this.coverState = this.createCoverState();
    state.nextEncounterId = null;
    this.enemies = this.encounter.enemies;
    this.prepPhase = true;
    this.paused = false;
    this.pauseObjects = [];
    this.tutorialObjects = [];
    this.tutorialStep = 0;
    this.tutorialKey = '';
    this.tutorialRenderKey = '';
    this.currentTutorialTip = null;
    this.dismissedTutorialKeys = new Set();
    this.battleTutorialClosed = false;
    this.activeIndex = 0;
    this.battleOver = false;
    this.moveMode = false;
    this.commandMode = 'root';
    this.targetMode = null;
    this.reachableTiles = [];
    this.selectedGrid = null;
    this.inspectItems = [];
    this.inspectIndex = 0;
    this.log = [`${this.encounter.name}: bandits ride in from the left. The crew holds the right flank.`];
    if (this.objectiveUnit) this.log.unshift('Protect the wagon. If it is destroyed, the crew loses the fight.');
    this.lastTick = this.time.now;
    this.heatClock = 0;
    this.statusClock = 0;
    this.battleSpeed = 1.35;
    this.unitViews = new Map();
    this.partyHud = [];
    this.logTexts = [];
    this.endButtons = [];
    this.moveCostTexts = [];
    if (this.isTutorialEncounter()) this.setupTutorialBattleState();

    this.buildStaticScene();
    this.startBattleMusic();
    this.updateDynamicViews();
    this.drawBattleTutorial();
  }

  startBattleMusic() {
    this.sound.stopByKey?.(musicKeys.battle);
    this.battleMusic = this.createManagedMusic('battleMusic', musicKeys.battle, 0.16);
    this.events.once('shutdown', () => this.stopBattleMusic());
    this.events.once('destroy', () => this.stopBattleMusic());
  }

  stopBattleMusic() {
    if (!this.battleMusic) {
      this.sound.stopByKey?.(musicKeys.battle);
      this.registry.remove('battleMusic');
      return;
    }
    this.battleMusic.stop();
    this.battleMusic.destroy();
    this.battleMusic = null;
    this.registry.remove('battleMusic');
  }

  update(time) {
    if (this.battleOver || this.paused) return;
    if (this.prepPhase) return;
    const tutorialStep = this.isTutorialBattle() ? this.getTutorialStepKey() : '';
    if (tutorialStep && !['intent', 'free'].includes(tutorialStep)) {
      this.lastTick = time;
      this.updateDynamicViews();
      return;
    }
    const delta = Math.min(0.08, ((time - this.lastTick) / 1000) * this.battleSpeed);
    this.lastTick = time;
    const state = this.getState();
    const reactionScale = this.activeIndex === null ? 1 : 0.32;
    const enemyDelta = delta * reactionScale;
    this.updateSurgeMomentum(delta * reactionScale);

    if (this.activeIndex === null) {
      state.party.forEach((rider, index) => {
        if (rider.hp <= 0) return;
        rider.atb = Math.min(100, rider.atb + riderSpeed(rider, this.getPartySynergy()) * delta);
        if (this.activeIndex === null && rider.atb >= 100) {
          this.activeIndex = index;
          this.buildCommandButtons();
        }
      });
    }

    this.enemies.forEach((enemy) => {
      if (enemy.hp <= 0) return;
      if (enemy.intent) {
        this.updateEnemyIntent(enemy, enemyDelta);
        return;
      }
      const enemyStatusDrag = hasSynergySurge(this.getPartySynergy(), 'ashen-trail') && enemy.statuses?.length ? 0.9 : 1;
      const panicDrag = hasSynergySurge(this.getPartySynergy(), 'gravewind-riders') && hasStatus(enemy, 'horse-panic') ? 0.86 : 1;
      enemy.atb = Math.min(100, enemy.atb + enemySpeed(enemy) * enemyStatusDrag * panicDrag * enemyDelta);
      if (enemy.atb >= 100) this.beginEnemyIntent(enemy);
    });

    this.updateStatusPressure(delta * reactionScale);
    this.checkEnd();
    this.updateDynamicViews();
  }

  buildStaticScene() {
    this.drawFrame('Cinder Mesa Road', 'Hold the road, use cover, and take the ridges before the Red Sash closes in.');
    this.statsText = this.add.text(912, 36, '', labelStyle(13, '#f5df9b')).setOrigin(1, 0);
    this.buildMapLayer();
    this.buildUnitLayer();
    this.buildHud();
    this.buildBattleLog();
  }

  buildMapLayer() {
    const tileData = createTilemapData(this.mapDef);
    const elementTileData = createElementTilemapData(this.mapDef);
    this.tilemap = this.make.tilemap({
      data: tileData,
      tileWidth: this.mapDef.tileWidth,
      tileHeight: this.mapDef.tileHeight,
    });
    this.elementTilemap = this.make.tilemap({
      data: elementTileData,
      tileWidth: this.mapDef.tileWidth,
      tileHeight: this.mapDef.tileHeight,
    });
    const tileset = this.tilemap.addTilesetImage(
      desertTileset.key,
      desertTileset.key,
      desertTileset.frameWidth,
      desertTileset.frameHeight,
      0,
      0,
      1,
    );
    const elementTileset = this.elementTilemap.addTilesetImage(
      desertTileset.key,
      desertTileset.key,
      desertTileset.frameWidth,
      desertTileset.frameHeight,
      0,
      0,
      1,
    );
    this.groundLayer = this.tilemap.createLayer(0, tileset, this.mapDef.origin.x, this.mapDef.origin.y);
    this.groundLayer.setScale(this.mapDef.renderTileSize / this.mapDef.tileWidth);
    this.groundLayer.setDepth(1);
    this.elementLayer = this.elementTilemap.createLayer(0, elementTileset, this.mapDef.origin.x, this.mapDef.origin.y);
    this.elementLayer.setScale(this.mapDef.renderTileSize / this.mapDef.tileWidth);
    this.elementLayer.setDepth(2);

    this.gridOverlay = this.add.graphics().setDepth(3);
    this.gridOverlay.lineStyle(1, palette.pale, 0.18);
    this.mapDef.elements.forEach((row, y) => {
      row.forEach((_, x) => {
        this.gridOverlay.strokeRect(
          this.mapDef.origin.x + x * this.mapDef.renderTileSize,
          this.mapDef.origin.y + y * this.mapDef.renderTileSize,
          this.mapDef.renderTileSize,
          this.mapDef.renderTileSize,
        );
      });
    });
    this.coverMarkers = new Map();
    this.coverDecor = new Map();
    this.drawTerrainMarkers();
    this.drawBattleTileDecor();

    this.tileHighlight = this.add
      .rectangle(0, 0, this.mapDef.renderTileSize, this.mapDef.renderTileSize)
      .setOrigin(0)
      .setStrokeStyle(2, palette.white, 0.55)
      .setVisible(false)
      .setDepth(4);
    this.priorityOverlay = this.add.graphics().setDepth(4.7);
    this.coverOverlay = this.add.graphics().setDepth(4.8);
    this.refreshCoverVisuals();

    this.input.on('pointerdown', (pointer) => this.handleMapClick(pointer.x, pointer.y));
    this.input.keyboard.on('keydown-LEFT', () => this.cycleInspection(-1));
    this.input.keyboard.on('keydown-RIGHT', () => this.cycleInspection(1));
    this.input.keyboard.on('keydown-ESC', () => this.handleEscape());
    this.input.keyboard.on('keydown-R', () => this.quickRetry());
    this.input.keyboard.on('keydown-S', () => this.setCommandMode('stances'));
  }

  createCoverState() {
    const maxByType = {
      brokenSign: 16,
      barrelCover: 20,
      cover: 26,
    };
    const coverState = new Map();
    this.mapDef.elements.forEach((row, y) => {
      row.forEach((terrainId, x) => {
        const terrain = terrainAt(this.mapDef, { x, y });
        if (!terrain.cover) return;
        const maxHp = maxByType[terrainId] || 22;
        coverState.set(this.gridKey({ x, y }), { hp: maxHp, maxHp, type: terrainId });
      });
    });
    return coverState;
  }

  gridKey(grid) {
    return `${grid.x},${grid.y}`;
  }

  getCoverState(grid) {
    const cover = this.coverState?.get(this.gridKey(grid));
    return cover?.hp > 0 ? cover : null;
  }

  getCoverProtection(grid) {
    const cover = this.getCoverState(grid);
    const surgeBonus = hasSynergySurge(this.getPartySynergy(), 'frontier-survivors') || hasSynergySurge(this.getPartySynergy(), 'trail-wardens') ? 0.15 : 0;
    return cover ? Math.min(1, Math.max(0.25, cover.hp / cover.maxHp) + surgeBonus) : 0;
  }

  buildUnitLayer() {
    const units = sortUnitsForDraw([...this.enemies, ...this.getState().party, ...(this.objectiveUnit ? [this.objectiveUnit] : [])]);
    units.forEach((unit) => {
      const isEnemy = this.enemies.includes(unit);
      const isObjective = unit.objective === 'wagon';
      const position = gridToWorld(this.mapDef, unit.grid);
      const horseSprite = isEnemy || isObjective ? null : this.createBattleHorseSprite(unit, position);
      const sprite = this.add.image(position.x, position.y, this.getUnitTextureKey(unit, isEnemy)).setDepth(10 + unit.grid.y);
      const surgeAura = isEnemy || isObjective
        ? null
        : this.add.ellipse(position.x, position.y + 18, 92, 38, palette.yellow, 0.1).setStrokeStyle(3, palette.yellow, 0.22).setVisible(false).setDepth(6 + unit.grid.y);
      const activeGlow = isEnemy || isObjective
        ? null
        : this.add.ellipse(position.x, position.y + 18, 62, 24, palette.yellow, 0.16).setStrokeStyle(2, palette.yellow, 0.36).setVisible(false).setDepth(7 + unit.grid.y);
      const activeMarker = isEnemy || isObjective
        ? null
        : this.add.triangle(position.x, position.y - 58, 0, 0, 22, 0, 11, 18, palette.yellow, 0.94).setStrokeStyle(2, palette.shadow, 0.9).setVisible(false).setDepth(23 + unit.grid.y);
      const readinessRing = this.add.circle(position.x, position.y, 34).setStrokeStyle(0, palette.yellow, 0).setVisible(false).setDepth(8 + unit.grid.y);
      const label = isEnemy || isObjective
        ? null
        : this.add
            .text(position.x, position.y + 34, unit.short || unit.name.split(' ')[0], labelStyle(10, '#fff8e7'))
            .setOrigin(0.5)
            .setDepth(20 + unit.grid.y);
      const nameplate = isEnemy
        ? this.createEnemyNameplate(position.x, position.y, unit)
        : isObjective
          ? this.createObjectiveNameplate(position.x, position.y, unit)
          : null;
      this.unitViews.set(unit, {
        horseSprite,
        sprite,
        surgeAura,
        activeGlow,
        activeMarker,
        readinessRing,
        label,
        nameplate,
        isEnemy,
        isObjective,
        anim: { x: 0, y: 0, scale: 1 },
      });
    });
  }

  createWagonObjective(encounter, state) {
    if (encounter.id === 'tutorialDustup' || encounter.bountyId || (state.supplies || 0) < 5 || Math.random() >= 0.2) return null;
    const maxHp = 180 + Math.max(0, state.wanted || 0) * 10;
    return {
      id: 'wagon',
      side: 'ally',
      objective: 'wagon',
      name: 'Supply Wagon',
      short: 'Wagon',
      description: 'Mission objective. It cannot move or act. If it falls, the crew loses.',
      maxHp,
      hp: maxHp,
      atb: 0,
      speed: 0,
      statuses: [],
      grid: { x: 6, y: 2 },
    };
  }

  selectEncounterEnemies(encounter, objectiveUnit = null) {
    if (encounter.id === 'tutorialDustup') return encounter.enemies;
    const maxEnemies = 3;
    const count = objectiveUnit ? maxEnemies : 1 + Math.floor(Math.random() * maxEnemies);
    const enemies = [...encounter.enemies];
    for (let index = enemies.length - 1; index > 0; index -= 1) {
      const swapIndex = Math.floor(Math.random() * (index + 1));
      [enemies[index], enemies[swapIndex]] = [enemies[swapIndex], enemies[index]];
    }
    return enemies.slice(0, Math.min(count, enemies.length));
  }

  prepareWagonObjectiveTile(grid) {
    const terrainId = this.mapDef.elements[grid.y]?.[grid.x];
    if (!terrainId) return;
    const destination = this.findTerrainRelocationTile(grid);
    if (destination) this.mapDef.elements[destination.y][destination.x] = terrainId;
    this.mapDef.elements[grid.y][grid.x] = null;
  }

  findTerrainRelocationTile(fromGrid) {
    for (let y = this.mapDef.elements.length - 1; y >= 0; y -= 1) {
      for (let x = this.mapDef.elements[y].length - 1; x >= 0; x -= 1) {
        if (x === fromGrid.x && y === fromGrid.y) continue;
        if (this.mapDef.elements[y][x]) continue;
        if (this.getState().party.some((rider) => rider.grid.x === x && rider.grid.y === y)) continue;
        if (this.encounter.enemies.some((enemy) => enemy.grid.x === x && enemy.grid.y === y)) continue;
        return { x, y };
      }
    }
    return null;
  }

  createBattleHorseSprite(unit, position) {
    const horseSprite = this.add.image(position.x + 14, position.y + 4, this.getHorseSpriteKey(unit)).setDepth(9 + unit.grid.y);
    this.fitBattleHorseSprite(horseSprite);
    horseSprite.setVisible(isMounted(unit));
    return horseSprite;
  }

  fitBattleHorseSprite(horseSprite) {
    this.fitImageToBox(horseSprite, 78, 58);
    return horseSprite;
  }

  drawTerrainMarkers() {
    this.mapDef.elements.forEach((row, y) => {
      row.forEach((terrainId, x) => {
        const terrain = terrainAt(this.mapDef, { x, y });
        const tileX = this.mapDef.origin.x + x * this.mapDef.renderTileSize;
        const tileY = this.mapDef.origin.y + y * this.mapDef.renderTileSize;
        const centerX = this.mapDef.origin.x + x * this.mapDef.renderTileSize + this.mapDef.renderTileSize - 14;
        const centerY = this.mapDef.origin.y + y * this.mapDef.renderTileSize + 14;
        const symbol = terrain.cover ? 'C' : terrain.hazardDamage ? '!' : terrain.mountedSlow ? 'M' : terrain.elevation > 0 ? `+${terrain.elevation}` : terrain.elevation < 0 ? '-1' : '';
        if (!symbol || !terrainId) return;
        const color = terrain.cover ? palette.pale : terrain.hazardDamage ? palette.red : terrain.mountedSlow ? palette.brown : palette.yellow;
        this.add.rectangle(tileX + 2, tileY + 2, this.mapDef.renderTileSize - 4, this.mapDef.renderTileSize - 4, color, terrain.cover ? 0.11 : 0.07).setOrigin(0).setDepth(3.5);
        const border = this.add.rectangle(tileX + 4, tileY + 4, this.mapDef.renderTileSize - 8, this.mapDef.renderTileSize - 8).setOrigin(0).setStrokeStyle(2, color, terrain.cover ? 0.42 : 0.26).setDepth(3.6);
        const badge = this.add.circle(centerX, centerY, 10, color, 0.78).setStrokeStyle(2, palette.shadow).setDepth(4);
        const label = this.add.text(centerX, centerY - 6, symbol, labelStyle(8, terrain.cover || terrain.elevation ? '#241914' : '#fff8e7')).setOrigin(0.5, 0).setDepth(5);
        if (terrain.cover) this.coverMarkers.set(this.gridKey({ x, y }), [border, badge, label]);
      });
    });
  }

  drawBattleTileDecor() {
    this.mapDef.elements.forEach((row, y) => {
      row.forEach((terrainId, x) => {
        const worldX = this.mapDef.origin.x + x * this.mapDef.renderTileSize + this.mapDef.renderTileSize / 2;
        const worldY = this.mapDef.origin.y + y * this.mapDef.renderTileSize + this.mapDef.renderTileSize / 2;
        const offset = ((x * 17 + y * 11) % 13) - 6;
        if (terrainId === 'cactusPatch') {
          this.add.image(worldX - 10, worldY + 4, desertTileset.key, 4).setScale(1.12).setDepth(4.2);
          this.add.image(worldX + 16, worldY + 14, desertTileset.key, 5).setScale(0.8).setDepth(4.1);
          return;
        }
        if (terrainId === 'cover' || terrainId === 'brokenSign' || terrainId === 'barrelCover') {
          const frame = terrainId === 'brokenSign' ? 6 : terrainId === 'barrelCover' ? 8 : 7;
          const sprite = this.add.image(worldX + offset, worldY + 10, desertTileset.key, frame).setScale(1.15).setDepth(4.1);
          this.coverDecor.set(this.gridKey({ x, y }), sprite);
          return;
        }
        if (terrainId === 'ridge' || terrainId === 'highRidge') {
          this.add.image(worldX + offset, worldY + 12, desertTileset.key, 9).setScale(0.85).setAlpha(0.7).setDepth(3.8);
          return;
        }
        if (!terrainId && (x + y) % 4 === 0) {
          this.add.image(worldX + offset, worldY + 12, desertTileset.key, (x + y) % 2).setScale(1.2).setAlpha(0.38).setDepth(3.4);
        }
      });
    });
  }

  refreshCoverVisuals() {
    if (!this.coverOverlay) return;
    this.coverOverlay.clear();
    this.coverState.forEach((cover, key) => {
      const [x, y] = key.split(',').map(Number);
      const grid = { x, y };
      const tileX = this.mapDef.origin.x + x * this.mapDef.renderTileSize;
      const tileY = this.mapDef.origin.y + y * this.mapDef.renderTileSize;
      const ratio = Math.max(0, cover.hp / cover.maxHp);
      const decor = this.coverDecor.get(key);
      const markers = this.coverMarkers.get(key) || [];
      decor?.setVisible(ratio > 0).setAlpha(ratio > 0.66 ? 1 : ratio > 0.33 ? 0.72 : 0.46);
      markers.forEach((object) => object.setVisible(ratio > 0).setAlpha(ratio > 0.66 ? 1 : 0.66));
      if (ratio <= 0) {
        this.coverOverlay.fillStyle(palette.shadow, 0.18);
        this.coverOverlay.fillRect(tileX + 8, tileY + 42, this.mapDef.renderTileSize - 16, 8);
        return;
      }
      if (ratio < 1) {
        const color = ratio > 0.5 ? palette.yellow : palette.red;
        this.coverOverlay.lineStyle(2, color, 0.75);
        this.coverOverlay.lineBetween(tileX + 14, tileY + 18, tileX + 30, tileY + 30);
        this.coverOverlay.lineBetween(tileX + 34, tileY + 14, tileX + 48, tileY + 32);
        this.coverOverlay.fillStyle(palette.shadow, 0.7);
        this.coverOverlay.fillRect(tileX + 10, tileY + 52, 44, 5);
        this.coverOverlay.fillStyle(color, 0.9);
        this.coverOverlay.fillRect(tileX + 10, tileY + 52, 44 * ratio, 5);
      }
    });
  }

  enemyPlateTextStyle(size = 8, color = '#fff8e7') {
    return {
      fontFamily: 'Verdana, Arial, Helvetica, sans-serif',
      fontSize: `${size}px`,
      fontStyle: 'bold',
      color,
      stroke: '#070302',
      strokeThickness: 1,
    };
  }

  createEnemyNameplate(x, y, unit) {
    const depth = 24 + unit.grid.y;
    const group = this.add.container(x, y + 42).setDepth(depth);
    const bg = this.add.rectangle(0, 0, 94, 42, palette.shadow, 0.82).setOrigin(0.5);
    bg.setStrokeStyle(1, palette.pale, 0.28);
    const intentBg = this.add.rectangle(0, -1, 82, 12, palette.leather, 0.86).setOrigin(0.5);
    intentBg.setStrokeStyle(1, palette.red, 0.32);
    const name = this.add.text(0, -17, unit.short || unit.name, this.enemyPlateTextStyle(8, '#fff8e7')).setOrigin(0.5);
    const intent = this.add.text(0, -6, '', this.enemyPlateTextStyle(7, '#f5df9b')).setOrigin(0.5, 0);
    const statuses = this.add.text(40, -18, '', this.enemyPlateTextStyle(7, '#f5df9b')).setOrigin(1, 0);
    const hpBack = this.add.rectangle(-34, 13, 68, 5, 0x1b0d08, 1).setOrigin(0);
    const hpFill = this.add.rectangle(-34, 13, 68, 5, palette.red, 1).setOrigin(0);
    const atbBack = this.add.rectangle(-34, 20, 68, 3, 0x1b0d08, 1).setOrigin(0);
    const atbFill = this.add.rectangle(-34, 20, 0, 3, palette.yellow, 1).setOrigin(0);
    group.add([bg, intentBg, name, intent, statuses, hpBack, hpFill, atbBack, atbFill]);
    return { group, hpFill, atbFill, intent, intentBg, statuses };
  }

  createObjectiveNameplate(x, y, unit) {
    const depth = 24 + unit.grid.y;
    const group = this.add.container(x, y + 42).setDepth(depth);
    const bg = this.add.rectangle(0, 0, 108, 32, palette.shadow, 0.82).setOrigin(0.5);
    bg.setStrokeStyle(1, palette.green, 0.44);
    const name = this.add.text(0, -12, unit.name, this.enemyPlateTextStyle(8, '#fff8e7')).setOrigin(0.5);
    const hpBack = this.add.rectangle(-42, 7, 84, 6, 0x1b0d08, 1).setOrigin(0);
    const hpFill = this.add.rectangle(-42, 7, 84, 6, palette.green, 1).setOrigin(0);
    const hpText = this.add.text(0, 14, '', this.enemyPlateTextStyle(7, '#bff0a7')).setOrigin(0.5, 0);
    group.add([bg, name, hpBack, hpFill, hpText]);
    return { group, hpFill, hpText };
  }

  buildHud() {
    drawPanel(this, 552, 106, 370, 602);
    this.add.text(574, 126, 'Battle Desk', titleStyle(21));

    this.synergyBand = this.add.rectangle(568, 150, 338, 58, palette.leather, 0.78).setOrigin(0);
    this.synergyBand.setStrokeStyle(2, palette.yellow, 0.42);
    this.add.text(580, 157, 'POSSE', labelStyle(8, '#f5df9b'));
    this.synergyText = this.add.text(628, 154, '', { ...labelStyle(11, '#fff8e7'), fixedWidth: 266 });
    this.synergyText.setMaxLines(1);
    this.synergyMeterBack = this.add.rectangle(628, 174, 198, 8, palette.shadow, 0.78).setOrigin(0);
    this.synergyMeterFill = this.add.rectangle(628, 174, 0, 8, palette.yellow, 1).setOrigin(0);
    this.synergyMeterBack.setStrokeStyle(1, palette.pale, 0.34);
    this.synergyMeterText = this.add.text(834, 170, '', labelStyle(8, '#f5df9b'));
    this.synergyDetail = this.add.text(580, 188, '', { ...textStyle(8, '#d8c7a0'), fixedWidth: 308, lineSpacing: 0 });
    this.synergyDetail.setMaxLines(2);

    this.add.text(574, 220, 'Crew', labelStyle(10, '#f5df9b'));

    this.getState().party.forEach((_, index) => {
      const y = 240 + index * 64;
      const rowBg = this.add.rectangle(568, y - 8, 338, 58, palette.shadow, 0.18).setOrigin(0);
      rowBg.setStrokeStyle(1, palette.pale, 0.14);
      this.partyHud[index] = {
        rowBg,
        statusBadges: [],
        name: this.add.text(578, y - 2, '', labelStyle(13, '#fff8e7')),
        detail: this.add.text(578, y + 16, '', textStyle(8, '#d8c7a0')),
        mount: this.add.text(852, y - 2, '', labelStyle(9, '#241914')).setOrigin(1, 0),
        hpText: this.add.text(578, y + 34, '', labelStyle(8, '#bff0a7')),
        atbText: this.add.text(728, y + 34, '', labelStyle(8, '#f5df9b')),
        hpFill: this.createMeter(654, y + 36, 64, palette.green, 10),
        atbFill: this.createMeter(806, y + 36, 70, palette.yellow, 10),
      };
    });

    this.add.text(574, 428, 'Field Intel', labelStyle(10, '#f5df9b'));
    this.inspectTitle = this.add.text(588, 446, 'Inspector', labelStyle(14, '#fff8e7'));
    this.fieldIntelTexts = [];
    for (let index = 0; index < 6; index += 1) {
      this.fieldIntelTexts.push(
        this.add.text(588, 468 + index * 12, '', {
          ...textStyle(9, '#e2d9bd'),
          wordWrap: { width: 292 },
        }),
      );
    }

    this.actionBand = this.add.rectangle(574, 540, 326, 70, palette.shadow, 0.2).setOrigin(0);
    this.actionBand.setStrokeStyle(2, palette.green, 0.24);
    this.add.text(588, 548, 'Action', labelStyle(10, '#f5df9b'));
    this.activeText = this.add.text(588, 562, '', {
      ...labelStyle(11, '#fff8e7'),
      wordWrap: { width: 294 },
      lineSpacing: 2,
    });
    this.activeText.setMaxLines(1);
    this.actionPreviewText = this.add.text(588, 580, '', {
      ...textStyle(8, '#fff1bf'),
      wordWrap: { width: 294 },
      lineSpacing: 1,
    });
    this.actionPreviewText.setMaxLines(2);
    this.commandButtons = [];
    this.commandButtonSlots = [
      { x: 574, y: 620, width: 102 },
      { x: 686, y: 620, width: 102 },
      { x: 798, y: 620, width: 102 },
      { x: 574, y: 666, width: 102 },
      { x: 686, y: 666, width: 102 },
      { x: 798, y: 666, width: 102 },
    ];
    this.skillButtonSlots = [
      { x: 574, y: 620, width: 154 },
      { x: 738, y: 620, width: 154 },
      { x: 574, y: 666, width: 154 },
      { x: 738, y: 666, width: 154 },
    ];
    this.itemButtonSlots = this.skillButtonSlots;
    this.buildCommandButtons();

    this.enemyDangerOverlay = this.add.graphics().setDepth(4.5);
    this.moveOverlay = this.add.graphics().setDepth(5);
    this.targetOverlay = this.add.graphics().setDepth(6);
  }

  buildCommandButtons() {
    this.commandButtons.forEach((object) => object.destroy());
    this.commandButtons = [];
    const ready = this.getState().party[this.activeIndex];
    const state = this.getState();
    let entries = [
      { label: 'Attack', action: () => this.startTargetMode({ type: 'attack' }), primary: true, tone: 'attack' },
      { label: 'Skill', action: () => this.setCommandMode('skills'), primary: false, tone: 'support' },
      { label: 'Move', action: () => this.startMoveMode(), primary: false, tone: 'move' },
      { label: 'Item', action: () => this.setCommandMode('items'), primary: false, tone: 'support' },
      {
        label: ready && !isMounted(ready) ? 'Mount' : 'Horse',
        action: () => (ready && !isMounted(ready) ? this.toggleMount() : this.setCommandMode('horse')),
        primary: false,
        tone: 'move',
      },
      { label: 'Stance', action: () => this.setCommandMode('stances'), primary: false, tone: 'stance' },
    ];
    let slots = this.commandButtonSlots;

    if (this.prepPhase) {
      entries = [
        { label: 'Begin', action: () => this.beginBattle(), primary: true, tone: 'attack' },
        { label: 'Item', action: () => this.setCommandMode('items'), primary: false, tone: 'support' },
        { label: 'Stance', action: () => this.setCommandMode('stances'), primary: false, tone: 'stance' },
        { label: 'Prev', action: () => this.cyclePrepRider(-1), primary: false, tone: 'default' },
        { label: 'Next', action: () => this.cyclePrepRider(1), primary: false, tone: 'default' },
      ];
    }

    if (this.commandMode === 'skills' && ready) {
      entries = [
        ...ready.skills.map((skill) => ({
          label: skill.name,
          action: () => this.useSkill(skill),
          primary: false,
          tone: skill.power < 0 ? 'support' : 'attack',
        })),
        {
          label: 'Combo',
          action: () => this.startTargetMode({ type: 'combo' }),
          primary: false,
          tone: 'attack',
        },
      ];
      slots = this.skillButtonSlots;
    } else if (this.commandMode === 'items' && ready) {
      entries = [
        ...Object.values(itemCatalog).map((item) => ({
          label: `${item.name} x${state.items[item.id] || 0}`,
          action: () => this.useItem(item),
          primary: false,
          tone: 'support',
        })),
      ];
      slots = this.itemButtonSlots;
    } else if (this.commandMode === 'stances' && ready) {
      entries = [
        ...riderStances.map((stance) => ({
          label: stance,
          action: () => this.chooseStance(stance),
          primary: stance === ready.riderStance,
          tone: 'stance',
        })),
        {
          label: 'Back',
          action: () => this.setCommandMode('root'),
          primary: false,
          tone: 'default',
        },
      ];
      slots = this.commandButtonSlots;
    } else if (this.commandMode === 'horse' && ready) {
      entries = [
        {
          label: isMounted(ready) ? 'Dismount' : 'Mount Up',
          action: () => this.toggleMount(),
          primary: false,
          tone: 'move',
        },
        ...(isMounted(ready)
          ? [
              ...this.getHorseActions(ready).map((horseAction) => ({
                label: horseAction.name,
                action: () => this.startTargetMode({ type: 'horse-action', horseAction }),
                primary: false,
                tone: horseAction.tone || 'attack',
              })),
              {
                label: 'Combo',
                action: () => this.startTargetMode({ type: 'combo' }),
                primary: false,
                tone: 'attack',
              },
            ]
          : []),
        {
          label: 'Back',
          action: () => this.setCommandMode('root'),
          primary: false,
          tone: 'default',
        },
      ];
      slots = this.commandButtonSlots;
    }

    if (this.shouldFilterTutorialCommandButtons()) {
      entries = this.withTutorialDisabledCommands(entries);
    }

    entries.forEach((entry, index) => {
      const slot = slots[index];
      if (!slot) return;
      const buttonObjects = drawButton(this, slot.x, slot.y, slot.width, entry.label, entry.action, entry.primary, entry.tone, { disabled: entry.disabled });
      buttonObjects.forEach((object) => object.setDepth?.(120));
      this.commandButtons.push(...buttonObjects);
    });
  }

  withTutorialDisabledCommands(entries) {
    return entries.map((entry) => {
      const kind = entry.label === 'Begin' ? 'begin' : 'command';
      const allowed = this.isTutorialActionAllowed(kind, { label: entry.label });
      if (allowed) return entry;
      return {
        ...entry,
        primary: false,
        disabled: true,
        action: () => this.blockTutorialAction('Use the highlighted tutorial command.'),
      };
    });
  }

  beginBattle() {
    if (!this.isTutorialActionAllowed('begin')) {
      this.blockTutorialAction();
      return;
    }
    this.prepPhase = false;
    this.activeIndex = null;
    this.commandMode = 'root';
    this.lastTick = this.time.now;
    this.getState().party.forEach((rider) => {
      rider.atb = Math.min(rider.atb || 0, 60);
    });
    this.addLog('Preparation complete. ATB begins.');
    if (this.isTutorialBattle()) this.completeTutorialStep('prep');
    this.buildCommandButtons();
    this.updateDynamicViews();
  }

  cyclePrepRider(direction) {
    if (!this.prepPhase) return;
    const party = this.getState().party;
    this.activeIndex = (this.activeIndex + direction + party.length) % party.length;
    this.commandMode = 'root';
    this.addLog(`Preparing ${party[this.activeIndex].name}.`);
    this.buildCommandButtons();
    this.updateDynamicViews();
  }

  buildBattleLog() {
    drawPanel(this, 38, 520, 480, 172, 0.82);
    this.add.text(54, 532, 'Battle Log', labelStyle(10, '#f5df9b'));
    for (let index = 0; index < 6; index += 1) {
      this.logTexts.push(this.add.text(54, 552 + index * 22, '', {
        ...textStyle(9, '#e2d9bd'),
        fixedWidth: 444,
      }));
      this.logTexts[index].setMaxLines(1);
    }
  }

  createMeter(x, y, width, color, height = 8) {
    this.add.rectangle(x, y, width, height, palette.shadow, 0.72).setOrigin(0);
    return this.add.rectangle(x, y, 0, height, color, 1).setOrigin(0);
  }

  updateDynamicViews() {
    this.updateStatsText();
    this.drawPriorityOverlay();
    this.drawEnemyDangerOverlay();
    this.drawTargetOverlay();
    this.updateUnitViews();
    this.updateHud();
    this.drawBattleTutorial();
  }

  isTutorialBattle() {
    return this.encounter.id === 'tutorialDustup' && !this.battleTutorialClosed;
  }

  isTutorialEncounter() {
    return this.encounter.id === 'tutorialDustup';
  }

  setupTutorialBattleState() {
    const party = this.getState().party;
    const starts = [
      { x: 7, y: 2 },
      { x: 7, y: 3 },
      { x: 7, y: 4 },
    ];
    party.forEach((rider, index) => {
      rider.grid = { ...starts[index] };
      rider.hp = Math.max(rider.hp, Math.ceil(rider.maxHp * 0.72));
      rider.statuses = [];
      rider.atb = 0;
      rider.mounted = Boolean(rider.horseId);
    });
    this.tutorialScript = {
      inspectGrid: { x: 6, y: 1 },
      startGrids: [
        { x: 7, y: 2 },
        { x: 7, y: 3 },
        { x: 7, y: 4 },
      ],
      moveGrid: { x: 5, y: 4 },
      docGrid: { x: 7, y: 4 },
      raiderGrid: { x: 3, y: 2 },
      riflemanGrid: { x: 3, y: 3 },
      coverGrid: { x: 6, y: 1 },
      raiderId: 'raider',
      riflemanId: 'rifleman',
    };
    this.getState().items.bandage = Math.max(this.getState().items.bandage || 0, 1);
  }

  getTutorialStepKey() {
    const step = this.getScriptedBattleTutorialTip();
    return step?.key || '';
  }

  isTutorialActionAllowed(kind, detail = {}) {
    if (!this.isTutorialBattle()) return true;
    const step = this.getTutorialStepKey();
    if (['field-intel-lane', 'field-intel-elevation', 'field-intel-cost', 'field-intel-cover'].includes(step)) return false;
    if (step === 'field-intel') return kind === 'inspect';
    if (step === 'prep') return kind === 'begin';
    if (['synergy', 'atb'].includes(step)) return false;
    if (step === 'stance') return kind === 'command' && ['Stance', 'Sharpshooter'].includes(detail.label);
    if (step === 'move') return (kind === 'command' && detail.label === 'Move') || kind === 'move-tile';
    if (step === 'dismount') return kind === 'command' && ['Horse', 'Dismount'].includes(detail.label);
    if (step === 'mount') return kind === 'command' && detail.label === 'Mount';
    if (step === 'surge') return (kind === 'command' && ['Horse', 'Charge'].includes(detail.label)) || (kind === 'target' && detail.target?.id === this.tutorialScript.raiderId);
    if (step === 'cover') return (kind === 'command' && detail.label === 'Attack') || (kind === 'target-cover' && detail.grid?.x === this.tutorialScript.coverGrid.x && detail.grid?.y === this.tutorialScript.coverGrid.y);
    if (step === 'attack') return (kind === 'command' && detail.label === 'Attack') || (kind === 'target' && detail.target?.id === this.tutorialScript.raiderId);
    if (step === 'skill-status') return (kind === 'command' && ['Skill', 'Iron Shot'].includes(detail.label)) || (kind === 'target' && detail.target?.id === this.tutorialScript.raiderId);
    if (step === 'mark') return (kind === 'command' && ['Skill', 'Marshal Mark'].includes(detail.label)) || (kind === 'target' && detail.target?.id === this.tutorialScript.riflemanId);
    if (step === 'item') return kind === 'command' && (detail.label === 'Item' || detail.label.startsWith('Bandage'));
    if (step === 'intent') return kind === 'wait';
    if (step === 'charge') return (kind === 'command' && ['Horse', 'Charge'].includes(detail.label)) || (kind === 'target' && detail.target?.id === this.tutorialScript.raiderId);
    if (step === 'combo') return (kind === 'command' && ['Horse', 'Combo'].includes(detail.label)) || (kind === 'target' && detail.target?.id === this.tutorialScript.riflemanId);
    return true;
  }

  shouldFilterTutorialCommandButtons() {
    if (!this.isTutorialBattle()) return false;
    const step = this.getTutorialStepKey();
    return ['field-intel-lane', 'field-intel-elevation', 'field-intel-cost', 'field-intel-cover', 'field-intel', 'prep', 'stance', 'move', 'dismount', 'mount', 'surge', 'cover', 'attack', 'skill-status', 'mark', 'item', 'charge', 'combo'].includes(step);
  }

  blockTutorialAction(message = 'Follow the tutorial prompt first.') {
    this.addLog(message);
    this.updateDynamicViews();
  }

  advanceTutorialTo(key) {
    if (!this.isTutorialBattle()) return;
    const steps = this.getTutorialStepSequence();
    const index = steps.findIndex((step) => step.key === key);
    if (index >= 0 && index >= this.tutorialStep) {
      this.tutorialStep = index;
      this.currentTutorialTip = null;
      this.tutorialKey = '';
      this.tutorialRenderKey = '';
      this.tutorialObjects.forEach((object) => object.destroy());
      this.tutorialObjects = [];
      this.prepareTutorialStep();
      this.updateDynamicViews();
    }
  }

  completeTutorialStep(key) {
    if (!this.isTutorialBattle()) return;
    const steps = this.getTutorialStepSequence();
    const index = steps.findIndex((step) => step.key === key);
    if (index < 0 || index !== this.tutorialStep) return;
    this.tutorialStep += 1;
    this.currentTutorialTip = null;
    this.tutorialKey = '';
    this.tutorialRenderKey = '';
    this.tutorialObjects.forEach((object) => object.destroy());
    this.tutorialObjects = [];
    this.prepareTutorialStep();
    this.updateDynamicViews();
  }

  prepareTutorialStep() {
    if (!this.isTutorialBattle()) return;
    const party = this.getState().party;
    const step = this.getScriptedBattleTutorialTip();
    if (!step) return;
    if (step.key === 'free') {
      this.releaseTutorialBattle();
      return;
    }
    this.stabilizeTutorialStep(step.key);
    this.clearMoveMode();
    this.clearTargetOverlay();
    this.commandMode = 'root';
    if (step.key === 'stance') {
      this.activeIndex = 2;
      party[2].atb = 100;
    }
    if (step.key === 'move') {
      this.activeIndex = 1;
      party[1].atb = 100;
    }
    if (step.key === 'dismount') {
      this.activeIndex = 1;
      party[1].mounted = true;
      party[1].atb = 100;
    }
    if (step.key === 'mount') {
      this.activeIndex = 1;
      party[1].mounted = false;
      party[1].atb = 100;
    }
    if (step.key === 'surge') {
      this.activeIndex = 1;
      party[1].atb = 100;
      party[1].horseStance = 'Stampede';
      party[1].mounted = true;
      this.recordSurgeEvent('stance', party[1], null, { exposed: !terrainAt(this.mapDef, party[1].grid).cover });
    }
    if (step.key === 'cover') {
      this.activeIndex = 2;
      party[2].atb = 100;
    }
    if (step.key === 'attack') {
      this.activeIndex = 2;
      party[2].atb = 100;
    }
    if (step.key === 'skill-status') {
      this.activeIndex = 0;
      party[0].atb = 100;
    }
    if (step.key === 'mark') {
      this.activeIndex = 0;
      party[0].atb = 100;
    }
    if (step.key === 'item') {
      this.activeIndex = 0;
      party[0].hp = Math.min(party[0].hp, party[0].maxHp - 28);
      party[0].atb = 100;
    }
    if (step.key === 'intent') {
      this.activeIndex = null;
      const rifleman = this.enemies.find((enemy) => enemy.id === this.tutorialScript.riflemanId && enemy.hp > 0);
      if (rifleman && !rifleman.intent) this.beginEnemyIntent(rifleman);
    }
    if (step.key === 'charge') {
      this.activeIndex = 1;
      party[1].atb = 100;
    }
    if (step.key === 'combo') {
      this.activeIndex = 1;
      party[1].atb = 100;
      this.getState().showdown = Math.max(this.getState().showdown, 70);
    }
    this.buildCommandButtons();
  }

  stabilizeTutorialStep(stepKey) {
    const party = this.getState().party;
    const raider = this.enemies.find((enemy) => enemy.id === this.tutorialScript?.raiderId);
    const rifleman = this.enemies.find((enemy) => enemy.id === this.tutorialScript?.riflemanId);
    this.stabilizeTutorialPositions(stepKey, party, raider, rifleman);
    const needsRaider = ['surge', 'cover', 'attack', 'skill-status', 'item', 'intent', 'charge', 'combo'].includes(stepKey);
    if (needsRaider && raider && raider.hp <= 0) {
      raider.hp = Math.max(raider.hp, 42);
      raider.intent = null;
    }
    if (stepKey === 'mark' && rifleman && rifleman.hp <= 0) {
      rifleman.hp = Math.max(rifleman.hp, 36);
      rifleman.intent = null;
    }
    if (['surge', 'charge', 'combo'].includes(stepKey)) {
      const rider = party[1];
      if (rider) {
        rider.mounted = Boolean(rider.horseId);
        this.clearStatus(rider, 'horse-panic');
      }
    }
    if (stepKey === 'cover') {
      const cover = this.coverState.get(this.gridKey(this.tutorialScript.coverGrid));
      if (cover) {
        cover.hp = Math.min(cover.maxHp, 4);
        this.mapDef.elements[this.tutorialScript.coverGrid.y][this.tutorialScript.coverGrid.x] = cover.type;
        this.refreshCoverVisuals();
      }
    }
  }

  stabilizeTutorialPositions(stepKey, party, raider, rifleman) {
    const { startGrids, moveGrid, docGrid, raiderGrid, riflemanGrid } = this.tutorialScript || {};
    if (!startGrids || !moveGrid || !docGrid || !raiderGrid || !riflemanGrid) return;
    const place = (unit, grid) => {
      if (unit && grid) unit.grid = { ...grid };
    };

    if (['field-intel-lane', 'field-intel-elevation', 'field-intel-cost', 'field-intel-cover', 'field-intel', 'stance', 'move'].includes(stepKey)) {
      party.forEach((rider, index) => place(rider, startGrids[index]));
      place(raider, raiderGrid);
      place(rifleman, riflemanGrid);
      return;
    }

    if (['surge', 'cover', 'attack', 'skill-status', 'mark', 'item', 'intent', 'charge', 'combo'].includes(stepKey)) {
      place(party[0], startGrids[0]);
      place(party[1], moveGrid);
      place(party[2], docGrid);
      place(raider, raiderGrid);
      place(rifleman, riflemanGrid);
    }
  }

  getBattleTutorialTip() {
    if (this.currentTutorialTip && !this.dismissedTutorialKeys.has(this.currentTutorialTip.key)) return this.currentTutorialTip;
    return this.getScriptedBattleTutorialTip();
  }

  getScriptedBattleTutorialTip() {
    const steps = this.getTutorialStepSequence();
    const step = steps[this.tutorialStep];
    if (!step || !step.ready()) return null;
    return step;
  }

  getTutorialStepSequence() {
    const party = this.getState().party;
    const raider = this.enemies.find((enemy) => enemy.id === this.tutorialScript?.raiderId) || living(this.enemies)[0];
    const rifleman = this.enemies.find((enemy) => enemy.id === this.tutorialScript?.riflemanId) || living(this.enemies)[1] || raider;
    const intelPoint = gridToWorld(this.mapDef, this.tutorialScript?.inspectGrid || { x: 6, y: 1 });
    const elevationPoint = gridToWorld(this.mapDef, { x: 6, y: 0 });
    const movePoint = gridToWorld(this.mapDef, this.tutorialScript?.moveGrid || { x: 5, y: 3 });
    const coverPoint = gridToWorld(this.mapDef, this.tutorialScript?.coverGrid || { x: 4, y: 2 });
    const raiderPoint = raider ? gridToWorld(this.mapDef, raider.grid) : { x: 220, y: 320 };
    const riflePoint = rifleman ? gridToWorld(this.mapDef, rifleman.grid) : { x: 160, y: 190 };
    return [
      {
        key: 'field-intel-lane',
        title: 'Field Intel',
        body: 'Before the fight starts, Field Intel lets you inspect a tile. The Lane line tells you where that tile sits for crew positioning and enemy pressure.',
        point: { x: 574, y: 428 },
        ready: () => this.prepPhase,
      },
      {
        key: 'field-intel-elevation',
        title: 'Elevation',
        body: 'Elevation changes lines and angles. Higher tiles can improve shots and block sight; lower tiles change the angle in the opposite direction.',
        point: elevationPoint,
        ready: () => this.prepPhase,
      },
      {
        key: 'field-intel',
        title: 'Inspect A Tile',
        body: 'Select the highlighted cover tile now. Field Intel will show its cover, elevation, lane, hazards, and Move Cost.',
        point: intelPoint,
        ready: () => this.prepPhase,
      },
      {
        key: 'field-intel-cost',
        title: 'Move Cost',
        body: 'Move Cost shows how expensive the inspected tile is to enter. Rough ground, mud, cover, and mounted penalties can spend more ATB.',
        point: intelPoint,
        ready: () => this.prepPhase,
      },
      {
        key: 'field-intel-cover',
        title: 'Cover Intel',
        body: 'Cover Intel shows the object protecting that tile, its remaining durability, and how much protection it gives until it is destroyed.',
        point: intelPoint,
        ready: () => this.prepPhase,
      },
      {
        key: 'prep',
        title: 'Begin Battle',
        body: 'Field Intel is set. Press Begin to start ATB and move from preparation into the fight.',
        point: { x: 625, y: 598 },
        ready: () => this.prepPhase,
      },
      {
        key: 'synergy',
        title: 'Posse Synergy',
        body: 'The Posse band shows the active crew identity. Its base effect stays on, even when riders briefly change stances.',
        point: { x: 740, y: 174 },
        ready: () => !this.prepPhase,
      },
      {
        key: 'atb',
        title: 'ATB Flow',
        body: 'ATB means Active Time Battle. It fills in real time; a rider acts at 100%, then spending a command lowers their ATB.',
        point: { x: 836, y: 260 },
        ready: () => !this.prepPhase,
      },
      {
        key: 'stance',
        title: 'Stances',
        body: `${party[2]?.short || 'Doc'} is ready. Open Stance and choose Sharpshooter. Stances change speed, range, defense, and weapon roles.`,
        point: { x: 735, y: 608 },
        ready: () => !this.prepPhase,
      },
      {
        key: 'move',
        title: 'Reposition',
        body: `${party[1]?.short || 'June'} is ready. Press Move, then take the highlighted ridge tile. Move Cost is the ATB spent to enter a tile; rough terrain and mounted penalties cost more.`,
        point: movePoint,
        ready: () => !this.prepPhase,
      },
      {
        key: 'dismount',
        title: 'Dismounting',
        body: `${party[1]?.short || 'June'} is mounted. Open Horse and choose Dismount. Dismounted riders fight on foot, use cover better, and lose mounted horse actions.`,
        point: { x: 735, y: 608 },
        ready: () => !this.prepPhase,
      },
      {
        key: 'mount',
        title: 'Mounting Up',
        body: 'The Horse button becomes Mount while a rider is on foot. Press Mount to get back in the saddle and restore mounted movement and horse actions.',
        point: { x: 810, y: 608 },
        ready: () => !this.prepPhase,
      },
      {
        key: 'surge',
        title: 'Synergy Surge',
        body: 'Surges need aligned play and then fade by momentum. Open Horse, choose Charge, then hit the Practice Raider on the center road.',
        point: raiderPoint,
        ready: () => !this.prepPhase,
      },
      {
        key: 'cover',
        title: 'Cover',
        body: `${party[2]?.short || 'Doc'} is ready. Press Attack, then shoot the highlighted cover. Destroyed cover leaves a clear tile and disappears from Field Intel.`,
        point: coverPoint,
        ready: () => !this.prepPhase,
      },
      {
        key: 'attack',
        title: 'Target Preview',
        body: `${party[2]?.short || 'Doc'} is ready. Press Attack, then shoot the Practice Raider on the center road. The preview shows damage, hit, crit, status, cover, and range.`,
        point: raiderPoint,
        ready: () => !this.prepPhase,
      },
      {
        key: 'skill-status',
        title: 'Skills And Status',
        body: `${party[0]?.short || 'Vale'} is ready. Open Skill, choose Iron Shot, then hit the Practice Raider on the center road to apply Bleeding Out.`,
        point: raiderPoint,
        ready: () => !this.prepPhase,
      },
      {
        key: 'mark',
        title: 'Marked Targets',
        body: 'Open Skill, choose Marshal Mark, then mark the Practice Rifleman on the lower open tile. Marked targets take stronger focused pressure.',
        point: riflePoint,
        ready: () => !this.prepPhase,
      },
      {
        key: 'item',
        title: 'Items And Healing',
        body: `${party[0]?.short || 'Vale'} is wounded. Open Item and use a Bandage to recover HP and learn item turn cost.`,
        point: { x: 735, y: 608 },
        ready: () => !this.prepPhase,
      },
      {
        key: 'intent',
        title: 'Enemy Intent',
        body: 'The rifleman is preparing a shot. Red intent shows the target and threat area before the enemy acts.',
        point: riflePoint,
        ready: () => !this.prepPhase,
      },
      {
        key: 'charge',
        title: 'Horse Pressure',
        body: `${party[1]?.short || 'June'} is ready again. Open Horse, choose Charge, then hit the Practice Raider on the center road to demonstrate mounted Panic and pushback.`,
        point: raiderPoint,
        ready: () => !this.prepPhase,
      },
      {
        key: 'combo',
        title: 'Showdown Combo',
        body: 'Showdown is charged. Open Horse, choose Combo, then strike the marked Rifleman. Combos spend Showdown for a mounted burst.',
        point: riflePoint,
        ready: () => !this.prepPhase,
      },
      {
        key: 'free',
        title: 'Finish The Dustup',
        body: 'The scripted gates are open. Finish the tutorial fight using ATB, stances, movement, cover, mount/dismount, skills, status, items, intent, horse actions, and combos.',
        point: { x: 735, y: 608 },
        ready: () => !this.prepPhase,
      },
    ];
  }

  findTutorialCoverPoint() {
    let coverGrid = null;
    this.coverState.forEach((cover, key) => {
      if (coverGrid || cover.hp <= 0) return;
      const [x, y] = key.split(',').map(Number);
      coverGrid = { x, y };
    });
    if (!coverGrid) return { x: 322, y: 284 };
    const point = gridToWorld(this.mapDef, coverGrid);
    return { x: point.x, y: point.y - 18 };
  }

  drawBattleTutorial() {
    if (!this.isTutorialBattle()) return;
    const tip = this.getBattleTutorialTip();
    if (!tip || this.dismissedTutorialKeys.has(tip.key)) {
      if (this.tutorialKey) {
        this.tutorialObjects.forEach((object) => object.destroy());
        this.tutorialObjects = [];
        this.tutorialKey = '';
        this.tutorialRenderKey = '';
      }
      return;
    }
    this.currentTutorialTip = tip;
    const tutorialPoint = this.getTutorialPoint(tip);
    const renderKey = [
      tip.key,
      this.commandMode,
      this.moveMode ? 'move' : '',
      this.targetMode?.label || '',
      Math.round(tutorialPoint.x),
      Math.round(tutorialPoint.y),
    ].join('|');
    if (this.tutorialRenderKey === renderKey) return;
    this.tutorialObjects.forEach((object) => object.destroy());
    this.tutorialObjects = [];
    this.tutorialKey = tip.key;
    this.tutorialRenderKey = renderKey;
    const existing = new Set(this.children.list);
    const panelW = 340;
    const panelH = 154;
    const { x: panelX, y: panelY } = this.getTutorialPanelPosition(tip, panelW, panelH);
    drawPanel(this, panelX, panelY, panelW, panelH, 0.94).setDepth(210);
    this.add.text(panelX + 20, panelY + 18, tip.title, titleStyle(18)).setDepth(211);
    this.add.text(panelX + 20, panelY + 50, tip.body, { ...textStyle(10, '#fff1bf'), wordWrap: { width: 292 }, lineSpacing: 2 }).setDepth(211);
    const arrow = this.add.graphics().setDepth(211);
    this.drawTutorialArrow(arrow, panelX + panelW - 28, panelY + panelH / 2, tutorialPoint.x, tutorialPoint.y);
    const actionStep = ['field-intel', 'stance', 'move', 'dismount', 'mount', 'surge', 'cover', 'attack', 'skill-status', 'mark', 'item', 'intent', 'charge', 'combo'].includes(tip.key);
    const canGoBack = this.getPreviousTutorialStepIndex() >= 0;
    const next = actionStep
      ? []
      : drawButton(this, panelX + 202, panelY + 102, 112, 'Got It', () => this.dismissBattleTutorialTip(), true, 'support');
    const back = canGoBack
      ? drawButton(this, panelX + 30, panelY + 102, 82, 'Back', () => this.goBackBattleTutorial(), false, 'default')
      : [];
    const skip = actionStep || canGoBack
      ? []
      : drawButton(this, panelX + 30, panelY + 102, 96, 'Skip', () => this.closeBattleTutorial(), false, 'default');
    [...next, ...back, ...skip].forEach((object) => object.setDepth?.(212));
    this.tutorialObjects = this.children.list.filter((object) => !existing.has(object));
  }

  getTutorialPoint(tip) {
    const step = tip?.key || '';
    const targetGrid = this.getTutorialTargetGridForStep(step);
    const targetPoint = targetGrid ? gridToWorld(this.mapDef, targetGrid) : null;
    const commandPoint = (label) => this.getTutorialCommandPoint(label);
    if (step === 'prep') return commandPoint('Begin') || tip.point;
    if (step === 'stance') return this.commandMode === 'stances' ? commandPoint('Sharpshooter') || tip.point : commandPoint('Stance') || tip.point;
    if (step === 'move') return this.moveMode && targetPoint ? targetPoint : commandPoint('Move') || tip.point;
    if (step === 'dismount') return this.commandMode === 'horse' ? commandPoint('Dismount') || tip.point : commandPoint('Horse') || tip.point;
    if (step === 'mount') return commandPoint('Mount') || commandPoint('Mount Up') || tip.point;
    if (['surge', 'charge'].includes(step)) return this.targetMode ? targetPoint || tip.point : this.commandMode === 'horse' ? commandPoint('Charge') || tip.point : commandPoint('Horse') || tip.point;
    if (step === 'cover') return this.targetMode ? targetPoint || tip.point : commandPoint('Attack') || tip.point;
    if (step === 'attack') return this.targetMode ? targetPoint || tip.point : commandPoint('Attack') || tip.point;
    if (step === 'skill-status') return this.targetMode ? targetPoint || tip.point : this.commandMode === 'skills' ? commandPoint('Iron Shot') || tip.point : commandPoint('Skill') || tip.point;
    if (step === 'mark') return this.targetMode ? targetPoint || tip.point : this.commandMode === 'skills' ? commandPoint('Marshal Mark') || tip.point : commandPoint('Skill') || tip.point;
    if (step === 'item') return this.commandMode === 'items' ? commandPoint('Bandage') || tip.point : commandPoint('Item') || tip.point;
    if (step === 'combo') return this.targetMode ? targetPoint || tip.point : this.commandMode === 'horse' ? commandPoint('Combo') || tip.point : commandPoint('Horse') || tip.point;
    return tip.point;
  }

  getTutorialCommandPoint(labelStart) {
    if (!labelStart) return null;
    const buttonText = this.commandButtons.find((object) => object?.type === 'Text' && object.text?.startsWith(labelStart));
    if (!buttonText) return null;
    const bounds = buttonText.getBounds();
    return { x: bounds.centerX, y: bounds.centerY };
  }

  getTutorialTargetGridForStep(stepKey = this.getTutorialStepKey()) {
    if (!this.tutorialScript) return null;
    if (['cover', 'field-intel'].includes(stepKey)) return this.tutorialScript.coverGrid;
    if (['surge', 'attack', 'skill-status', 'charge'].includes(stepKey)) return this.tutorialScript.raiderGrid;
    if (['mark', 'intent', 'combo'].includes(stepKey)) return this.tutorialScript.riflemanGrid;
    if (stepKey === 'move') return this.tutorialScript.moveGrid;
    return null;
  }

  drawTutorialArrow(arrow, startX, startY, endX, endY) {
    const angle = Math.atan2(endY - startY, endX - startX);
    const headLength = 14;
    const headWidth = 9;
    const lineEndX = endX - Math.cos(angle) * headLength;
    const lineEndY = endY - Math.sin(angle) * headLength;
    const leftX = endX - Math.cos(angle) * headLength + Math.cos(angle + Math.PI / 2) * headWidth;
    const leftY = endY - Math.sin(angle) * headLength + Math.sin(angle + Math.PI / 2) * headWidth;
    const rightX = endX - Math.cos(angle) * headLength + Math.cos(angle - Math.PI / 2) * headWidth;
    const rightY = endY - Math.sin(angle) * headLength + Math.sin(angle - Math.PI / 2) * headWidth;
    arrow.lineStyle(3, palette.yellow, 0.86);
    arrow.lineBetween(startX, startY, lineEndX, lineEndY);
    arrow.fillStyle(palette.yellow, 0.9);
    arrow.fillTriangle(endX, endY, leftX, leftY, rightX, rightY);
  }

  getTutorialPanelPosition(tip, panelW, panelH) {
    return { x: 42, y: 106 };
  }

  getPreviousTutorialStepIndex() {
    const steps = this.getTutorialStepSequence();
    for (let index = this.tutorialStep - 1; index >= 0; index -= 1) {
      if (steps[index]?.ready()) return index;
    }
    return -1;
  }

  goBackBattleTutorial() {
    const previous = this.getPreviousTutorialStepIndex();
    if (previous < 0) {
      this.blockTutorialAction('No previous tutorial step is available in this phase.');
      return;
    }
    const currentKey = this.getTutorialStepSequence()[this.tutorialStep]?.key;
    const previousKey = this.getTutorialStepSequence()[previous]?.key;
    if (currentKey) this.dismissedTutorialKeys.delete(currentKey);
    if (previousKey) this.dismissedTutorialKeys.delete(previousKey);
    this.tutorialStep = previous;
    this.currentTutorialTip = null;
    this.tutorialKey = '';
    this.tutorialRenderKey = '';
    this.tutorialObjects.forEach((object) => object.destroy());
    this.tutorialObjects = [];
    this.prepareTutorialStep();
    this.updateDynamicViews();
  }

  dismissBattleTutorialTip() {
    const dismissedKey = this.tutorialKey;
    if (['field-intel', 'stance', 'move', 'dismount', 'mount', 'surge', 'cover', 'attack', 'skill-status', 'mark', 'item', 'intent', 'charge', 'combo'].includes(dismissedKey)) {
      this.blockTutorialAction('Complete the tutorial action to continue.');
      return;
    }
    if (dismissedKey) this.dismissedTutorialKeys.add(dismissedKey);
    this.currentTutorialTip = null;
    this.tutorialObjects.forEach((object) => object.destroy());
    this.tutorialObjects = [];
    this.tutorialKey = '';
    this.tutorialRenderKey = '';
    this.advanceBattleTutorialScript(dismissedKey);
  }

  closeBattleTutorial() {
    this.battleTutorialClosed = true;
    const state = this.getState();
    state.tutorial ||= {};
    state.tutorial.skipped = true;
    state.tutorial.townComplete = true;
    state.tutorial.partyMenusComplete = true;
    state.tutorial.active = false;
    this.tutorialKey = '';
    this.tutorialRenderKey = '';
    this.currentTutorialTip = null;
    this.tutorialObjects.forEach((object) => object.destroy());
    this.tutorialObjects = [];
  }

  releaseTutorialBattle() {
    this.battleTutorialClosed = true;
    this.currentTutorialTip = null;
    this.tutorialKey = '';
    this.tutorialRenderKey = '';
    this.tutorialObjects.forEach((object) => object.destroy());
    this.tutorialObjects = [];
    this.clearMoveMode();
    this.clearTargetOverlay();
    this.commandMode = 'root';
    if (this.activeIndex === null) {
      const readyIndex = this.getState().party.findIndex((rider) => rider.hp > 0 && rider.atb >= 100);
      this.activeIndex = readyIndex >= 0 ? readyIndex : null;
    }
    this.addLog('Tutorial gates are open. Finish the dustup freely.');
    this.buildCommandButtons();
  }

  advanceBattleTutorialScript(dismissedKey) {
    if (!dismissedKey) return;
    this.tutorialStep += 1;
    this.prepareTutorialStep();
    this.updateDynamicViews();
  }

  forceTutorialReadyRider() {
    if (this.prepPhase || this.activeIndex !== null) return;
    const index = this.getState().party.findIndex((rider) => rider.hp > 0);
    if (index < 0) return;
    this.getState().party[index].atb = 100;
    this.activeIndex = index;
    this.buildCommandButtons();
  }

  forceTutorialTargeting() {
    if (this.prepPhase || this.targetMode) return;
    this.forceTutorialReadyRider();
    if (this.activeIndex === null) return;
    this.startTargetMode({ type: 'attack' });
  }

  forceTutorialStatus() {
    const target = living(this.enemies)[0];
    if (!target) return;
    this.applySkillStatus(target, 'snared');
    this.showDamagePopup(target, 'Snare');
    this.addLog(`${target.name} is Snared for the tutorial.`);
  }

  forceTutorialEnemyIntent() {
    this.targetMode = null;
    this.clearTargetOverlay();
    this.activeIndex = null;
    const enemy = living(this.enemies).find((candidate) => !candidate.intent) || living(this.enemies)[0];
    if (!enemy) return;
    enemy.atb = 100;
    this.beginEnemyIntent(enemy);
  }

  updateStatsText() {
    const state = this.getState();
    this.statsText.setText(
      [`Money $${state.money}`, `Wanted ${state.wanted}`, `Supplies ${state.supplies}`, `Showdown ${Math.round(state.showdown)}%`].join('   '),
    );
  }

  getPartySynergy() {
    const surge = this.getActiveSynergySurge();
    const surgeMomentum = this.getSynergySurgeMomentum();
    return {
      ...this.preparedSynergy,
      surge,
      surgeMomentum,
    };
  }

  getSynergySurgeMomentum() {
    if (!this.synergySurge || this.synergySurge.id !== this.preparedSynergy?.id) return 0;
    return Math.max(0, Math.min(100, this.synergySurge.momentum || 0));
  }

  getActiveSynergySurge() {
    if (!this.synergySurge || this.synergySurge.id !== this.preparedSynergy?.id) return null;
    const momentum = this.getSynergySurgeMomentum();
    if (momentum < 60) return null;
    return {
      ...this.synergySurge,
      active: true,
      momentum,
      remaining: momentum,
    };
  }

  recordSurgeEvent(type, rider = null, target = null, extra = {}) {
    if (this.prepPhase || this.battleOver || !this.preparedSynergy || this.preparedSynergy.id === 'none') return;
    const now = this.time.now;
    this.surgeEvents.push({
      type,
      time: now,
      riderId: rider?.id || null,
      targetId: target?.id || null,
      riderStance: rider?.riderStance || '',
      horseStance: rider?.horseStance || '',
      weapon: rider ? getWeapon(rider).id : '',
      mounted: rider ? isMounted(rider) : false,
      targetLane: target ? getLane(target) : '',
      targetHpRatio: target?.maxHp ? target.hp / target.maxHp : 1,
      targetStatuses: target?.statuses?.map((status) => status.name) || [],
      riderStatuses: rider?.statuses?.map((status) => status.name) || [],
      ...extra,
    });
    this.surgeEvents = this.surgeEvents.filter((event) => now - event.time <= 9000);
    this.evaluateSynergySurge();
  }

  evaluateSynergySurge() {
    const synergy = this.preparedSynergy;
    if (!synergy || synergy.id === 'none') return;
    const events = this.surgeEvents.filter((event) => this.time.now - event.time <= 8000);
    const unique = (items) => new Set(items.filter(Boolean)).size;
    const aggressive = (event) => ['Gunslinger', 'Outlaw', 'Wrangler'].includes(event.riderStance) || ['Stampede', 'Sprint', 'Wild Frenzy'].includes(event.horseStance);
    const defensive = (event) => ['Iron Rider', 'Wrangler'].includes(event.riderStance) || ['Defensive Guard', 'Calm Focus'].includes(event.horseStance);
    const vulnerable = (event) => event.targetHpRatio <= 0.5 || event.targetStatuses.some((status) => ['marked', 'showdown', 'bleeding-out'].includes(status));
    let triggered = false;

    if (synergy.id === 'stampede') {
      triggered = unique(events.filter((event) => event.mounted && aggressive(event) && ['stance', 'attack'].includes(event.type)).map((event) => event.riderId)) >= 2
        && events.some((event) => event.type === 'move' && event.advanced);
    }
    if (synergy.id === 'deadeye') {
      const precision = events.filter((event) => ['stance', 'attack'].includes(event.type) && (event.riderStance === 'Sharpshooter' || ['rifle', 'revolver'].includes(event.weapon)));
      triggered = this.hasFocusedTarget(precision, 2);
    }
    if (synergy.id === 'frontier-survivors') {
      triggered = unique(events.filter((event) => defensive(event) || ['guard', 'heal'].includes(event.type)).map((event) => event.riderId)) >= 2
        || this.hasGroupedPressure(events);
    }
    if (synergy.id === 'dust-devils') {
      triggered = (events.filter((event) => event.type === 'move').length >= 2 && unique(events.filter((event) => event.type === 'move').map((event) => event.riderId)) >= 2)
        || unique(events.filter((event) => event.type === 'attack' && event.flanking).map((event) => event.riderId)) >= 2;
    }
    if (synergy.id === 'iron-vultures') triggered = unique(events.filter((event) => event.type === 'status' && event.statusName === 'bleeding-out').map((event) => event.targetId)) >= 2;
    if (synergy.id === 'outlaw-rush') triggered = unique(events.filter((event) => event.type === 'attack' && event.exposed && aggressive(event)).map((event) => event.riderId)) >= 2;
    if (synergy.id === 'trail-wardens') triggered = unique(events.filter((event) => ['guard', 'heal'].includes(event.type) || defensive(event)).map((event) => event.riderId)) >= 2;
    if (synergy.id === 'gravewind-riders') triggered = unique(events.filter((event) => event.type === 'attack' && event.mounted).map((event) => event.targetLane)) >= 2;
    if (synergy.id === 'ashen-trail') triggered = this.countEnemyStatusTypes() >= 3 && living(this.enemies).filter((enemy) => enemy.statuses?.length).length >= 2;
    if (synergy.id === 'sundown-reapers') triggered = this.hasFocusedTarget(events.filter((event) => event.type === 'attack' && (vulnerable(event) || event.isolated)), 2);

    if (triggered) this.addSurgeMomentum(34);
  }

  updateSurgeMomentum(delta) {
    const synergy = this.preparedSynergy;
    if (!synergy || synergy.id === 'none' || !this.synergySurge) return;
    if (this.synergySurge.id !== synergy.id) this.synergySurge = { id: synergy.id, momentum: 0, active: false };
    const aligned = this.getSurgeAlignmentScore(synergy.id);
    const decay = aligned >= 2 ? 1.2 : aligned === 1 ? 3.2 : 7.5;
    const previousActive = this.synergySurge.active;
    this.synergySurge.momentum = Math.max(0, (this.synergySurge.momentum || 0) - decay * delta);
    this.synergySurge.active = this.synergySurge.momentum >= 60;
    if (previousActive && !this.synergySurge.active) this.addLog(`${synergy.surgeState} momentum fades.`);
  }

  addSurgeMomentum(amount) {
    const synergy = this.preparedSynergy;
    if (!synergy || synergy.id === 'none') return;
    if (!this.synergySurge || this.synergySurge.id !== synergy.id) this.synergySurge = { id: synergy.id, momentum: 0, active: false };
    const wasActive = this.synergySurge.momentum >= 60;
    this.synergySurge.momentum = Math.min(100, (this.synergySurge.momentum || 0) + amount);
    this.synergySurge.active = this.synergySurge.momentum >= 60;
    if (!wasActive && this.synergySurge.active) {
      this.addLog(`${synergy.name}: ${synergy.surgeState} surges.`);
      this.addLog(this.getSynergySurgeLog(synergy));
      this.showSynergySurgeBurst(synergy);
      this.applySurgeActivationEffects(synergy);
    }
  }

  getSurgeAlignmentScore(id) {
    const party = living(this.getState().party);
    const mounted = party.filter((rider) => isMounted(rider));
    const aggressive = (rider) => ['Gunslinger', 'Outlaw', 'Wrangler'].includes(rider.riderStance) || ['Stampede', 'Sprint', 'Wild Frenzy'].includes(rider.horseStance);
    const defensive = (rider) => ['Iron Rider', 'Wrangler'].includes(rider.riderStance) || ['Defensive Guard', 'Calm Focus'].includes(rider.horseStance);
    if (id === 'stampede') return mounted.filter(aggressive).length;
    if (id === 'deadeye') return party.filter((rider) => rider.riderStance === 'Sharpshooter' || ['rifle', 'revolver'].includes(getWeapon(rider).id)).length;
    if (id === 'frontier-survivors') return party.filter(defensive).length;
    if (id === 'dust-devils') return party.filter((rider) => ['Gunslinger', 'Wrangler'].includes(rider.riderStance) || rider.horseStance === 'Sprint').length;
    if (id === 'iron-vultures') return living(this.enemies).filter((enemy) => hasStatus(enemy, 'bleeding-out')).length;
    if (id === 'outlaw-rush') return party.filter((rider) => rider.riderStance === 'Outlaw' || hasStatus(rider, 'wanted') || !terrainAt(this.mapDef, rider.grid).cover).length;
    if (id === 'trail-wardens') return party.filter(defensive).length;
    if (id === 'gravewind-riders') return mounted.length;
    if (id === 'ashen-trail') return living(this.enemies).filter((enemy) => enemy.statuses?.length).length;
    if (id === 'sundown-reapers') return living(this.enemies).filter((enemy) => hasStatus(enemy, 'marked') || hasStatus(enemy, 'showdown') || enemy.hp / enemy.maxHp <= 0.5).length;
    return 0;
  }

  hasFocusedTarget(events, requiredRiders) {
    const targets = new Map();
    events.forEach((event) => {
      if (!event.targetId) return;
      if (!targets.has(event.targetId)) targets.set(event.targetId, new Set());
      targets.get(event.targetId).add(event.riderId);
    });
    return [...targets.values()].some((riders) => riders.size >= requiredRiders);
  }

  countEnemyStatusTypes() {
    return new Set(living(this.enemies).flatMap((enemy) => (enemy.statuses || []).map((status) => status.name))).size;
  }

  hasGroupedPressure(events) {
    const pressure = events.filter((event) => event.type === 'pressure');
    return pressure.length >= 2 && new Set(pressure.map((event) => event.riderId).filter(Boolean)).size >= 2;
  }

  isIsolatedEnemy(enemy) {
    if (!enemy?.grid) return false;
    return living(this.enemies).filter((other) => other !== enemy && gridDistance(other.grid, enemy.grid) <= 2).length === 0;
  }

  activateSynergySurge() {
    this.addSurgeMomentum(100);
  }

  getSynergySurgeColor(id) {
    const colors = {
      stampede: 0xe07b34,
      deadeye: 0xf0c24f,
      'frontier-survivors': 0x65a24f,
      'dust-devils': 0xd6b16d,
      'iron-vultures': 0xb44732,
      'outlaw-rush': 0xd95f43,
      'trail-wardens': 0x5f9bad,
      'gravewind-riders': 0x8f6bd9,
      'ashen-trail': 0x9b9384,
      'sundown-reapers': 0xd9513f,
    };
    return colors[id] || palette.yellow;
  }

  getSynergySurgeLog(synergy) {
    const lines = {
      stampede: 'The crew lowers their reins; mounted moves come cheaper and charges shove harder.',
      deadeye: 'The crew sights as one; marked targets lose cover and precision fire stays steady.',
      'frontier-survivors': 'The crew digs in; cover holds longer and wounded riders find grit.',
      'dust-devils': 'The crew rides loose and fast; repositioning and flanks keep tempo high.',
      'iron-vultures': 'The crew circles blood in the dust; bleeding targets are easier to interrupt.',
      'outlaw-rush': 'The crew commits to danger; exposed attacks feed ATB and Showdown pressure.',
      'trail-wardens': 'The crew tightens formation; guards recover faster and defensive moves ease up.',
      'gravewind-riders': 'The crew rides like a bad omen; Panic cuts enemy momentum.',
      'ashen-trail': 'The crew kicks up choking dust; statused enemies slow and ailments spread.',
      'sundown-reapers': 'The crew closes the duel; isolated targets are easier to finish cleanly.',
    };
    return lines[synergy.id] || `${synergy.surgeState || 'Surge'} strengthens the posse's rhythm.`;
  }

  showSynergySurgeBurst(synergy) {
    const color = this.getSynergySurgeColor(synergy.id);
    living(this.getState().party).forEach((rider) => {
      const position = gridToWorld(this.mapDef, rider.grid);
      const burst = this.add.circle(position.x, position.y + 12, isMounted(rider) ? 44 : 34)
        .setStrokeStyle(4, color, 0.78)
        .setFillStyle(color, 0.08)
        .setDepth(18 + rider.grid.y);
      this.tweens.add({
        targets: burst,
        radius: isMounted(rider) ? 72 : 56,
        alpha: 0,
        duration: 620,
        ease: 'Sine.easeOut',
        onComplete: () => burst.destroy(),
      });
    });
  }

  applySurgeActivationEffects(synergy) {
    if (synergy.id === 'frontier-survivors' || synergy.id === 'trail-wardens') {
      living(this.getState().party).forEach((rider) => this.applySkillStatus(rider, 'guarded'));
    }
    if (synergy.id === 'outlaw-rush') {
      living(this.getState().party).forEach((rider) => {
        if (rider.riderStance === 'Outlaw' || hasStatus(rider, 'wanted')) this.applySkillStatus(rider, 'quick');
      });
    }
  }

  drawPriorityOverlay() {
    this.priorityOverlay?.clear();
    const ready = this.getState().party[this.activeIndex];
    if (ready?.hp > 0) {
      const x = this.mapDef.origin.x + ready.grid.x * this.mapDef.renderTileSize;
      const y = this.mapDef.origin.y + ready.grid.y * this.mapDef.renderTileSize;
      this.priorityOverlay.fillStyle(palette.green, 0.16);
      this.priorityOverlay.fillRect(x, y, this.mapDef.renderTileSize, this.mapDef.renderTileSize);
      this.priorityOverlay.lineStyle(4, palette.green, 0.9);
      this.priorityOverlay.strokeRect(x + 2, y + 2, this.mapDef.renderTileSize - 4, this.mapDef.renderTileSize - 4);
      this.priorityOverlay.lineStyle(2, palette.white, 0.45);
      this.priorityOverlay.strokeRect(x + 9, y + 9, this.mapDef.renderTileSize - 18, this.mapDef.renderTileSize - 18);
    }
  }

  drawEnemyDangerOverlay() {
    this.enemyDangerOverlay?.clear();
    if (this.battleOver || this.targetMode) return;
    const dangerTiles = this.getEnemyDangerTiles();
    if (!dangerTiles.length) return;
    this.enemyDangerOverlay.fillStyle(palette.red, 0.3);
    this.enemyDangerOverlay.lineStyle(3, palette.red, 0.88);
    dangerTiles.forEach((grid) => {
      const x = this.mapDef.origin.x + grid.x * this.mapDef.renderTileSize;
      const y = this.mapDef.origin.y + grid.y * this.mapDef.renderTileSize;
      this.enemyDangerOverlay.fillRect(x, y, this.mapDef.renderTileSize, this.mapDef.renderTileSize);
      this.enemyDangerOverlay.strokeRect(x + 3, y + 3, this.mapDef.renderTileSize - 6, this.mapDef.renderTileSize - 6);
      this.enemyDangerOverlay.lineStyle(1, palette.white, 0.34);
      this.enemyDangerOverlay.strokeRect(x + 11, y + 11, this.mapDef.renderTileSize - 22, this.mapDef.renderTileSize - 22);
      this.enemyDangerOverlay.lineStyle(3, palette.red, 0.88);
    });
    living(this.enemies).forEach((enemy) => {
      const threat = enemy.intent?.target ? enemy.intent : null;
      if (!threat?.target) return;
      const from = gridToWorld(this.mapDef, enemy.grid);
      const to = gridToWorld(this.mapDef, threat.target.grid);
      this.enemyDangerOverlay.lineStyle(4, palette.red, 0.86);
      this.enemyDangerOverlay.lineBetween(from.x, from.y - 22, to.x, to.y - 22);
    });
  }

  getEnemyDangerTiles() {
    const seen = new Set();
    return living(this.enemies).flatMap((enemy) => {
      const threat = enemy.intent?.target ? enemy.intent : null;
      if (!threat?.target) return [];
      return this.getEnemyThreatArea(enemy, threat).filter((grid) => {
        const key = `${grid.x},${grid.y}`;
        if (seen.has(key)) return false;
        seen.add(key);
        return true;
      });
    });
  }

  getEnemyThreatArea(enemy, threat) {
    if (!threat?.target) return [];
    const targetGrid = threat.target.grid;
    if (enemy.id === 'rifleman') return [...this.getLineCells(enemy.grid, targetGrid), { ...targetGrid }];
    if (enemy.id === 'bruiser') return this.getAreaAround(targetGrid, 1);
    return this.getAreaAround(targetGrid, 1);
  }

  getAreaAround(center, radius) {
    const cells = [];
    this.mapDef.elements.forEach((row, y) => {
      row.forEach((_, x) => {
        const grid = { x, y };
        if (gridDistance(center, grid) <= radius) cells.push(grid);
      });
    });
    return cells;
  }

  updateUnitViews() {
    this.unitViews.forEach((view, unit) => {
      const alive = unit.hp > 0;
      view.sprite.setVisible(alive);
      view.label?.setVisible(alive);
      view.nameplate?.group.setVisible(alive);
      if (!alive) return;

      const position = gridToWorld(this.mapDef, unit.grid);
      const mounted = isMounted(unit);
      const anim = view.anim || { x: 0, y: 0, scale: 1 };
      const idle = view.isObjective ? 0 : Math.sin(this.time.now / 520 + unit.grid.x * 0.7 + unit.grid.y * 0.35) * (view.isEnemy ? 0.9 : 1.2);
      const pose = Math.sin(this.time.now / 340 + unit.grid.x * 0.45 + unit.grid.y * 0.6);
      const characterScale = view.isObjective ? 1 : anim.scale * (1 + pose * 0.025);
      const characterTilt = view.isObjective ? 0 : pose * (view.isEnemy ? 1.4 : 1.8) + anim.x * 0.12;
      const unitX = position.x + anim.x;
      const unitY = position.y + idle + anim.y;
      const activeAlly = !view.isEnemy && this.getState().party[this.activeIndex] === unit;
      const enemySoon = view.isEnemy && (unit.atb >= 78 || unit.intent);
      const enemyReady = view.isEnemy && (unit.atb >= 96 || unit.intent);
      const activePulse = 0.82 + Math.sin(this.time.now / 180) * 0.12;
      const surge = this.getActiveSynergySurge();
      const surgeColor = this.getSynergySurgeColor(surge?.id);
      const surgePulse = surge ? 0.14 + Math.sin(this.time.now / 260) * 0.05 : 0;
      view.readinessRing
        .setVisible(enemySoon)
        .setPosition(position.x, position.y)
        .setRadius(35)
        .setStrokeStyle(enemyReady ? 5 : 3, palette.red, enemyReady ? 0.9 : 0.58)
        .setDepth(8 + unit.grid.y);
      view.surgeAura
        ?.setVisible(Boolean(surge))
        .setPosition(unitX, unitY + (mounted ? 21 : 18))
        .setDisplaySize(mounted ? 104 : 78, mounted ? 42 : 34)
        .setFillStyle(surgeColor, surgePulse)
        .setStrokeStyle(3, surgeColor, surge ? 0.36 + surgePulse : 0)
        .setDepth(6 + unit.grid.y);
      view.activeGlow
        ?.setVisible(activeAlly)
        .setPosition(unitX, unitY + (mounted ? 20 : 18))
        .setDisplaySize(mounted ? 86 : 58, mounted ? 30 : 24)
        .setFillStyle(palette.yellow, activeAlly ? 0.12 + activePulse * 0.08 : 0)
        .setStrokeStyle(2, palette.yellow, activeAlly ? 0.28 + activePulse * 0.18 : 0)
        .setDepth(7 + unit.grid.y);
      view.activeMarker
        ?.setVisible(activeAlly)
        .setPosition(unitX, unitY - (mounted ? 66 : 58) + Math.sin(this.time.now / 220) * 3)
        .setAlpha(activeAlly ? activePulse : 0)
        .setDepth(23 + unit.grid.y);
      view.horseSprite
        ?.setVisible(mounted)
        .setTexture(this.getHorseSpriteKey(unit))
        .setPosition(position.x + 14, position.y + 4)
        .setDepth(9 + unit.grid.y);
      if (view.horseSprite) this.fitBattleHorseSprite(view.horseSprite);
      view.sprite
        .setTexture(this.getUnitTextureKey(unit, view.isEnemy))
        .setPosition(unitX + (mounted && !view.isEnemy ? -16 : 0), unitY + (mounted && !view.isEnemy ? -14 : view.isObjective ? -4 : 0))
        .setDisplaySize(
          (view.isObjective ? 82 : mounted && !view.isEnemy ? 48 : mounted ? 76 : 54) * characterScale,
          (view.isObjective ? 62 : mounted && !view.isEnemy ? 48 : mounted ? 60 : 54) * characterScale,
        )
        .setAngle(characterTilt)
        .setDepth(10 + unit.grid.y);
      view.label
        ?.setPosition(unitX, unitY + 34)
        .setDepth(20 + unit.grid.y)
        .setText(unit.short || unit.name.split(' ')[0]);
      if (view.nameplate) {
        view.nameplate.group.setPosition(unitX, unitY + (view.isObjective ? 46 : 42)).setDepth(24 + unit.grid.y);
        view.nameplate.hpFill.width = (view.isObjective ? 84 : 68) * Math.max(0, Math.min(1, unit.hp / unit.maxHp));
        view.nameplate.hpText?.setText(`HP ${unit.hp}/${unit.maxHp}`);
        if (view.isObjective) return;
        view.nameplate.atbFill.width = unit.intent
          ? 68 * Math.max(0, Math.min(1, unit.intent.timeLeft / unit.intent.total))
          : 68 * Math.max(0, Math.min(1, unit.atb / 100));
        view.nameplate.intent.setText(`[${this.getEnemyIntent(unit).short}]`);
        view.nameplate.intentBg.setStrokeStyle(1, unit.intent ? palette.red : palette.pale, unit.intent ? 0.75 : 0.28);
        view.nameplate.statuses.setText(this.getStatusBadges(unit));
      }
    });
  }

  updateHud() {
    const state = this.getState();
    const synergy = this.getPartySynergy();
    const surgeMomentum = Math.round(synergy.surge?.momentum || synergy.surgeMomentum || 0);
    const synergyName = synergy.surge?.active
      ? synergy.surge.name || synergy.surgeState || synergy.name
      : synergy.name;
    const surgeColor = this.getSynergySurgeColor(synergy.id);
    this.synergyText.setText(this.fitTextToWidth(synergyName || 'No Party Synergy', 28));
    this.synergyMeterFill.width = 198 * Math.max(0, Math.min(1, surgeMomentum / 100));
    this.synergyMeterFill.setFillStyle(synergy.surge?.active ? surgeColor : palette.yellow, 1);
    this.synergyMeterBack.setStrokeStyle(1, synergy.surge?.active ? surgeColor : palette.pale, synergy.surge?.active ? 0.72 : 0.34);
    this.synergyMeterText.setText(`${surgeMomentum}%`);
    this.synergyMeterText.setColor(synergy.surge?.active ? '#fff8e7' : '#f5df9b');
    this.synergyDetail.setText(this.getSurgeInstructionText(synergy, surgeMomentum));
    state.party.forEach((rider, index) => {
      const hud = this.partyHud[index];
      const terrain = terrainAt(this.mapDef, rider.grid);
      const lane = getLane(rider);
      const weapon = getWeapon(rider);
      const active = state.party[this.activeIndex] === rider;
      const wounded = rider.hp / rider.maxHp <= 0.35;
      hud.rowBg.setFillStyle(wounded ? palette.red : active ? palette.yellow : palette.shadow, wounded ? 0.22 : active ? 0.18 : 0.16);
      hud.rowBg.setStrokeStyle(active ? 3 : wounded ? 2 : 1, active ? palette.yellow : wounded ? palette.red : palette.pale, active ? 0.86 : wounded ? 0.72 : 0.12);
      hud.name.setText(this.truncateText(rider.name, 22));
      hud.detail.setText(this.truncateText(`${weapon.name} | ${rider.riderStance} | ${lane}`, 42));
      hud.mount.setText(isMounted(rider) ? 'MOUNTED' : 'ON FOOT');
      hud.mount.setColor(isMounted(rider) ? '#f5df9b' : '#d8c7a0');
      this.renderStatusBadges(rider, 812, hud.name.y + 19, hud.statusBadges, 2);
      hud.hpText.setText(`HP ${rider.hp}/${rider.maxHp}`);
      hud.atbText.setText(`ATB ${Math.round(rider.atb)}%`);
      hud.hpFill.setFillStyle(wounded ? palette.red : palette.green, 1);
      hud.atbFill.setFillStyle(rider.atb >= 100 ? palette.white : palette.yellow, 1);
      hud.hpFill.width = 64 * Math.max(0, Math.min(1, rider.hp / rider.maxHp));
      hud.atbFill.width = 70 * Math.max(0, Math.min(1, rider.atb / 100));
    });

    const ready = state.party[this.activeIndex];
    this.activeText.setText(
      this.prepPhase && ready
        ? `PREP: ${ready.name}`
        : this.moveMode && ready
        ? `MOVE: ${ready.name}`
        : this.targetMode && ready
          ? `${this.targetMode.label.toUpperCase()}: choose target`
        : this.commandMode === 'skills' && ready
          ? `SKILL: ${ready.name}`
        : this.commandMode === 'items' && ready
          ? `ITEM: ${ready.name}`
        : this.commandMode === 'stances' && ready
          ? `STANCE: ${ready.riderStance}`
        : this.commandMode === 'horse' && ready
          ? `HORSE: ${getHorse(ready)?.name || 'No horse'}`
          : ready
            ? `TIME SLOWED: ${ready.name} is ready.`
            : `Next: ${this.getNextUnitLabel()}`,
    );
    this.actionPreviewText.setText(this.getActionPreviewText(ready));
    this.refreshInspection();
    this.logTexts.forEach((text, index) => text.setText(this.formatBattleLogLine(this.log[index] || '')));
  }

  getSurgeInstructionText(synergy, surgeMomentum = 0) {
    if (!synergy || synergy.id === 'none') return 'No surge available.';
    const prefix = synergy.surge?.active
      ? `Active ${surgeMomentum}%: `
      : surgeMomentum > 0
        ? `${surgeMomentum}%: repeat trigger. `
        : '';
    const instructions = {
      stampede: 'Move, then use 2 mounted aggressive stances or attacks.',
      deadeye: 'Have 2 rifle, revolver, or Sharpshooter riders attack one target.',
      'frontier-survivors': 'Use 2 defensive riders, or endure grouped enemy pressure.',
      'dust-devils': 'Move 2 riders, or land flanking attacks with 2 riders.',
      'iron-vultures': 'Apply Bleeding Out to 2 enemies.',
      'outlaw-rush': 'Attack exposed targets with 2 aggressive riders.',
      'trail-wardens': 'Use guard, healing, or defensive actions with 2 riders.',
      'gravewind-riders': 'Mounted riders attack enemies in 2 different lanes.',
      'ashen-trail': 'Put 3 status types across at least 2 enemies.',
      'sundown-reapers': 'Have 2 riders focus a weak, marked, or isolated target.',
    };
    return `${prefix}${instructions[synergy.id] || 'Match this posse pattern to fill surge.'}`;
  }

  formatBattleLogLine(message) {
    return this.truncateText(message.replace(/\s+/g, ' ').trim(), 82);
  }

  fitTextToWidth(value, maxLength) {
    return value.length <= maxLength ? value : `${value.slice(0, maxLength - 1)}...`;
  }

  setCommandMode(mode) {
    if (this.prepPhase && !['root', 'items', 'stances'].includes(mode)) return;
    this.commandMode = mode;
    this.targetMode = null;
    this.clearTargetOverlay();
    this.clearMoveMode();
    this.buildCommandButtons();
    this.updateDynamicViews();
  }

  handleEscape() {
    if (this.audioOptionsState || this.audioOptionsJustClosed) return;
    if (this.paused) {
      this.resumeBattle();
      return;
    }
    if (this.targetMode || this.moveMode || this.commandMode !== 'root') {
      this.commandMode = 'root';
      this.clearMoveMode();
      this.clearTargetOverlay();
      this.buildCommandButtons();
      this.updateDynamicViews();
      return;
    }
    this.pauseBattle();
  }

  pauseBattle() {
    if (this.paused || this.battleOver) return;
    this.paused = true;
    this.tweens.pauseAll();
    this.time.paused = true;
    const blocker = this.add.rectangle(480, 360, 960, 720, palette.shadow, 0.58).setDepth(300).setInteractive();
    const panel = this.add.rectangle(480, 356, 312, 190, palette.leather, 0.96).setDepth(301).setStrokeStyle(3, palette.pale, 0.62);
    const title = this.add.text(480, 286, 'PAUSED', titleStyle(34, '#fff8e7')).setOrigin(0.5).setDepth(302);
    const hint = this.add.text(480, 326, 'Press Escape to resume', labelStyle(12, '#f5df9b')).setOrigin(0.5).setDepth(302);
    const resumeButton = drawButton(this, 374, 354, 212, 'Resume', () => this.resumeBattle(), true, 'support');
    const optionsButton = drawButton(this, 374, 402, 212, 'Options', () => this.openBattleAudioOptions(), false, 'stance');
    [...resumeButton, ...optionsButton].forEach((object) => object.setDepth?.(303));
    this.pauseObjects = [blocker, panel, title, hint, ...resumeButton, ...optionsButton];
  }

  openBattleAudioOptions() {
    this.pauseObjects.forEach((object) => object.destroy());
    this.pauseObjects = [];
    this.openAudioOptions(() => {
      if (!this.paused || this.battleOver) return;
      this.paused = false;
      this.time.paused = false;
      this.pauseBattle();
    });
  }

  resumeBattle() {
    if (!this.paused) return;
    this.paused = false;
    this.time.paused = false;
    this.tweens.resumeAll();
    this.pauseObjects.forEach((object) => object.destroy());
    this.pauseObjects = [];
    this.lastTick = this.time.now;
    this.updateDynamicViews();
  }

  getUnitAtGrid(grid) {
    return this.enemies.find((enemy) => enemy.hp > 0 && enemy.grid.x === grid.x && enemy.grid.y === grid.y);
  }

  getAllyAtGrid(grid) {
    return [...this.getState().party, ...(this.objectiveUnit ? [this.objectiveUnit] : [])].find((unit) => unit.hp > 0 && unit.grid.x === grid.x && unit.grid.y === grid.y);
  }

  selectTile(grid) {
    if (!isInBounds(this.mapDef, grid)) {
      this.selectedGrid = null;
      this.inspectItems = [];
      this.inspectIndex = 0;
      this.tileHighlight.setVisible(false);
      this.refreshInspection();
      return;
    }

    this.selectedGrid = grid;
    this.inspectItems = this.getInspectionItems(grid);
    this.inspectIndex = 0;
    this.tileHighlight
      .setPosition(
        this.mapDef.origin.x + grid.x * this.mapDef.renderTileSize,
        this.mapDef.origin.y + grid.y * this.mapDef.renderTileSize,
      )
      .setVisible(true);
    this.refreshInspection();
    if (
      this.isTutorialBattle()
      && this.getTutorialStepKey() === 'field-intel'
      && grid.x === this.tutorialScript.inspectGrid.x
      && grid.y === this.tutorialScript.inspectGrid.y
    ) {
      this.completeTutorialStep('field-intel');
    }
  }

  getInspectionItems(grid) {
    const terrain = terrainAt(this.mapDef, grid);
    const enemy = this.getUnitAtGrid(grid);
    const ally = this.getAllyAtGrid(grid);
    return [
      ...(enemy ? [{ type: 'enemy', enemy }] : []),
      ...(ally ? [{ type: 'ally', ally }] : []),
      { type: 'terrain', terrain, grid },
    ];
  }

  cycleInspection(direction) {
    if (!this.inspectItems.length) return;
    this.inspectIndex = (this.inspectIndex + direction + this.inspectItems.length) % this.inspectItems.length;
    this.refreshInspection();
  }

  refreshInspection() {
    if (!this.inspectTitle || !this.fieldIntelTexts) return;
    if (this.selectedGrid) {
      this.inspectItems = this.getInspectionItems(this.selectedGrid);
      if (this.inspectIndex >= this.inspectItems.length) this.inspectIndex = 0;
    }

    const item = this.inspectItems[this.inspectIndex];
    if (!item) {
      this.setFieldIntel('Inspector', this.getObjectiveLines());
      return;
    }

    if (item.type === 'enemy') {
      const enemy = item.enemy;
      const statuses = this.getStatusBadges(enemy) || 'None';
      const ready = this.getState().party[this.activeIndex];
      const preview = ready && this.targetMode ? this.getActionPreviewLines(ready, enemy, this.targetMode) : [];
      const intent = this.getEnemyIntent(enemy);
      this.setFieldIntelColumns(
        enemy.name,
        [
          `HP: ${enemy.hp}/${enemy.maxHp}`,
          `ATB: ${Math.round(enemy.atb)}%`,
          `Status: ${statuses}`,
        ],
        [
          intent.short.includes('Hold') ? 'HOLDING FIRE' : `Danger: ${intent.short}`,
          intent.target ? `Target: ${intent.target.name}` : `Lane: ${getLane(enemy)}`,
          preview[0] || '',
        ],
      );
      return;
    }

    if (item.type === 'ally') {
      const ally = item.ally;
      const statuses = this.getStatusBadges(ally) || 'None';
      this.setFieldIntelColumns(
        ally.name,
        [
          `HP: ${ally.hp}/${ally.maxHp}`,
          `ATB: ${Math.round(ally.atb)}%`,
          `Status: ${statuses}`,
        ],
        [
          isMounted(ally) ? 'MOUNTED' : 'ON FOOT',
          `Lane: ${getLane(ally)}`,
          `Stance: ${ally.riderStance}`,
        ],
      );
      return;
    }

    this.setFieldIntelColumns(
      item.terrain.label,
      [
        `Lane: ${this.describeLaneAt(item.grid)}`,
        item.terrain.cover ? `Cover: ${this.getCoverState(item.grid)?.hp || 0}/${this.coverState.get(this.gridKey(item.grid))?.maxHp || 0}` : 'Cover: None',
        `Move: ${item.terrain.movementCost}`,
      ],
      [
        item.terrain.elevation ? (item.terrain.elevation > 0 ? 'HIGH GROUND' : 'LOW GROUND') : '',
        item.terrain.cover ? `Protection: ${Math.round(this.getCoverProtection(item.grid) * 100)}%` : '',
        [item.terrain.hazardDamage ? `Hazard: ${item.terrain.hazardDamage}` : '', item.terrain.mountedSlow ? 'Mounts slowed' : ''].filter(Boolean).join(' / '),
      ],
    );
  }

  setFieldIntel(title, lines) {
    this.inspectTitle.setText(title);
    this.fieldIntelTexts.forEach((text, index) => {
      text.setPosition(588, 468 + index * 12);
      text.setStyle({ ...textStyle(9, '#e2d9bd'), wordWrap: { width: 292 } });
      text.setOrigin(0);
    });
    const compactLines = lines.filter(Boolean).flatMap((line) => line.toString().split('\n')).slice(0, this.fieldIntelTexts.length);
    this.fieldIntelTexts.forEach((text, index) => {
      const value = compactLines[index] || '';
      text.setText(value ? this.truncateText(value, 46) : '');
    });
  }

  setFieldIntelColumns(title, leftLines, rightLines) {
    this.inspectTitle.setText(title);
    const rows = [
      [leftLines[0], rightLines[0]],
      [leftLines[1], rightLines[1]],
      [leftLines[2], rightLines[2]],
    ];
    this.fieldIntelTexts.forEach((text, index) => {
      const column = index % 2;
      const row = Math.floor(index / 2);
      const value = rows[row]?.[column] || '';
      text.setPosition(column === 0 ? 588 : 738, 472 + row * 23);
      text.setStyle({ ...labelStyle(9, '#e2d9bd'), wordWrap: { width: column === 0 ? 138 : 146 } });
      text.setOrigin(0);
      text.setText(value ? this.truncateText(value, column === 0 ? 24 : 26) : '');
    });
  }

  truncateText(value, maxLength) {
    if (value.length <= maxLength) return value;
    return `${value.slice(0, maxLength - 1)}...`;
  }

  getActiveBounty() {
    const state = this.getState();
    return bountyContracts[state.activeBountyId] || (state.bountyActive ? bountyContracts.redSashRifleman : null);
  }

  getObjectiveText() {
    return this.getObjectiveLines().join('\n');
  }

  getObjectiveLines() {
    if (this.objectiveUnit?.hp > 0) return ['Protect the wagon', `Wagon HP ${this.objectiveUnit.hp}/${this.objectiveUnit.maxHp}`, 'If it falls, defeat'];
    const bounty = this.getActiveBounty();
    if (!bounty) return ['Select unit', 'Select tile', 'Red = danger'];
    const target = this.enemies.find((enemy) => enemy.id === bounty.targetEnemyId);
    const targetState = target?.hp > 0 ? `Target HP ${target.hp}/${target.maxHp}` : 'Target down';
    return [`Bounty: ${bounty.name}`, `Target: ${bounty.targetName}`, targetState, `Bonus: ${bounty.optional}`];
  }

  describeLaneAt(grid) {
    return getLane({ side: 'ally', grid });
  }

  getAllUnits() {
    return [...this.enemies, ...this.getState().party, ...(this.objectiveUnit ? [this.objectiveUnit] : [])];
  }

  startMoveMode() {
    const rider = this.getState().party[this.activeIndex];
    if (!this.isTutorialActionAllowed('command', { label: 'Move' })) {
      this.blockTutorialAction();
      return;
    }
    if (this.prepPhase) return;
    if (!rider || this.battleOver) return;
    this.targetMode = null;
    this.clearTargetOverlay();
    this.moveMode = true;
    this.reachableTiles = getReachableTiles(this.mapDef, rider, this.getAllUnits());
    this.drawMoveOverlay();
    this.addLog(`${rider.name} can reposition; mounted movement spends less ATB.`);
    this.updateDynamicViews();
  }

  drawMoveOverlay() {
    this.moveOverlay.clear();
    this.moveCostTexts.forEach((text) => text.destroy());
    this.moveCostTexts = [];
    if (!this.moveMode) return;
    const rider = this.getState().party[this.activeIndex];
    const tutorialMoveGrid = this.isTutorialBattle() && this.getTutorialStepKey() === 'move'
      ? this.tutorialScript.moveGrid
      : null;
    this.moveOverlay.fillStyle(palette.green, 0.22);
    this.moveOverlay.lineStyle(2, palette.green, 0.72);
    this.reachableTiles.forEach((grid) => {
      if (tutorialMoveGrid && (grid.x !== tutorialMoveGrid.x || grid.y !== tutorialMoveGrid.y)) return;
      const x = this.mapDef.origin.x + grid.x * this.mapDef.renderTileSize;
      const y = this.mapDef.origin.y + grid.y * this.mapDef.renderTileSize;
      this.moveOverlay.fillRect(x, y, this.mapDef.renderTileSize, this.mapDef.renderTileSize);
      this.moveOverlay.strokeRect(x, y, this.mapDef.renderTileSize, this.mapDef.renderTileSize);
      if (!rider) return;
      const cost = this.getRepositionAtbCost(rider, grid);
      this.moveCostTexts.push(
        this.add
          .text(x + this.mapDef.renderTileSize / 2, y + this.mapDef.renderTileSize / 2 - 7, `-${cost}`, labelStyle(9, '#fff8e7'))
          .setOrigin(0.5)
          .setDepth(7),
      );
    });
  }

  clearMoveMode() {
    this.moveMode = false;
    this.reachableTiles = [];
    this.moveOverlay?.clear();
    this.moveCostTexts.forEach((text) => text.destroy());
    this.moveCostTexts = [];
  }

  startTargetMode(action) {
    const rider = this.getState().party[this.activeIndex];
    const label = action.horseAction?.name || action.skill?.name || (action.type === 'combo' ? 'Combo' : 'Attack');
    if (!this.isTutorialActionAllowed('command', { label })) {
      this.blockTutorialAction();
      return;
    }
    if (this.prepPhase) return;
    if (!rider || this.battleOver) return;
    if (action.type === 'combo' && (!isMounted(rider) || this.getState().showdown < 60)) {
      this.addLog('Combo needs a mounted rider and 60 Showdown.');
      this.updateDynamicViews();
      return;
    }

    this.clearMoveMode();
    this.commandMode = 'root';
    this.targetMode = {
      ...action,
      label: action.horseAction?.name || action.skill?.name || (action.type === 'combo' ? getHorse(rider)?.combo || 'Mounted Combo' : 'Attack'),
    };
    this.buildCommandButtons();
    this.drawTargetOverlay();
    this.addLog(`${this.targetMode.label}: ${this.getTargetingSummary(rider, this.targetMode)}.`);
    this.updateDynamicViews();
  }

  drawTargetOverlay() {
    this.targetOverlay?.clear();
    if (!this.targetMode) return;
    const rider = this.getState().party[this.activeIndex];
    if (!rider || !this.targetOverlay) return;
    const origin = gridToWorld(this.mapDef, rider.grid);
    const tutorialStep = this.isTutorialBattle() ? this.getTutorialStepKey() : '';
    const tutorialTargetGrid = this.getTutorialTargetGridForStep(tutorialStep);
    const shouldLimitTutorialTargets = Boolean(tutorialTargetGrid && ['cover', 'attack', 'skill-status', 'mark', 'surge', 'charge', 'combo'].includes(tutorialStep));
    const isTutorialTargetGrid = (grid) => !shouldLimitTutorialTargets || (grid.x === tutorialTargetGrid.x && grid.y === tutorialTargetGrid.y);
    this.targetOverlay.fillStyle(palette.red, 0.14);
    this.targetOverlay.lineStyle(2, palette.red, 0.46);
    this.getActionRangeCells(rider, this.targetMode).forEach((grid) => {
      if (shouldLimitTutorialTargets && !isTutorialTargetGrid(grid)) return;
      const x = this.mapDef.origin.x + grid.x * this.mapDef.renderTileSize;
      const y = this.mapDef.origin.y + grid.y * this.mapDef.renderTileSize;
      this.targetOverlay.fillRect(x, y, this.mapDef.renderTileSize, this.mapDef.renderTileSize);
      this.targetOverlay.strokeRect(x + 8, y + 8, this.mapDef.renderTileSize - 16, this.mapDef.renderTileSize - 16);
    });
    this.coverState.forEach((cover, key) => {
      if (cover.hp <= 0) return;
      const [coverX, coverY] = key.split(',').map(Number);
      const grid = { x: coverX, y: coverY };
      if (shouldLimitTutorialTargets && (tutorialStep !== 'cover' || !isTutorialTargetGrid(grid))) return;
      if (!this.canTargetCover(rider, grid, this.targetMode)) return;
      const x = this.mapDef.origin.x + coverX * this.mapDef.renderTileSize;
      const y = this.mapDef.origin.y + coverY * this.mapDef.renderTileSize;
      this.targetOverlay.fillStyle(palette.yellow, 0.13);
      this.targetOverlay.fillRect(x + 10, y + 10, this.mapDef.renderTileSize - 20, this.mapDef.renderTileSize - 20);
      this.targetOverlay.lineStyle(2, palette.yellow, 0.72);
      this.targetOverlay.strokeRect(x + 12, y + 12, this.mapDef.renderTileSize - 24, this.mapDef.renderTileSize - 24);
    });
    living(this.enemies).forEach((enemy) => {
      if (shouldLimitTutorialTargets && (tutorialStep === 'cover' || !isTutorialTargetGrid(enemy.grid))) return;
      const targetPosition = gridToWorld(this.mapDef, enemy.grid);
      const x = this.mapDef.origin.x + enemy.grid.x * this.mapDef.renderTileSize;
      const y = this.mapDef.origin.y + enemy.grid.y * this.mapDef.renderTileSize;
      const reason = this.getTargetBlockReason(rider, enemy, this.targetMode);
      if (reason) {
        this.targetOverlay.fillStyle(palette.shadow, 0.18);
        this.targetOverlay.lineStyle(2, palette.red, 0.72);
        this.targetOverlay.fillRect(x + 8, y + 8, this.mapDef.renderTileSize - 16, this.mapDef.renderTileSize - 16);
        this.targetOverlay.lineBetween(x + 13, y + 13, x + this.mapDef.renderTileSize - 13, y + this.mapDef.renderTileSize - 13);
        this.targetOverlay.lineBetween(x + this.mapDef.renderTileSize - 13, y + 13, x + 13, y + this.mapDef.renderTileSize - 13);
        return;
      }
      this.getPlayerThreatArea(rider, enemy, this.targetMode).forEach((grid) => {
        const areaX = this.mapDef.origin.x + grid.x * this.mapDef.renderTileSize;
        const areaY = this.mapDef.origin.y + grid.y * this.mapDef.renderTileSize;
        this.targetOverlay.fillStyle(palette.red, 0.24);
        this.targetOverlay.fillRect(areaX, areaY, this.mapDef.renderTileSize, this.mapDef.renderTileSize);
        this.targetOverlay.lineStyle(3, palette.red, 0.8);
        this.targetOverlay.strokeRect(areaX + 4, areaY + 4, this.mapDef.renderTileSize - 8, this.mapDef.renderTileSize - 8);
      });
      this.targetOverlay.lineStyle(3, palette.yellow, 0.86);
      this.targetOverlay.strokeCircle(targetPosition.x, targetPosition.y - 4, 23);
      this.targetOverlay.lineStyle(1, palette.white, 0.48);
      this.targetOverlay.strokeCircle(targetPosition.x, targetPosition.y - 4, 31);
      this.targetOverlay.lineStyle(2, palette.pale, 0.6);
      this.targetOverlay.lineBetween(origin.x, origin.y - 18, targetPosition.x, targetPosition.y - 18);
    });
  }

  getPlayerThreatArea(rider, target, action) {
    const weapon = getWeapon(rider);
    if (action.type === 'combo') return this.getAreaAround(target.grid, 1);
    if (action.type === 'horse-action' && action.horseAction?.area) return this.getAreaAround(target.grid, action.horseAction.area);
    if (action.skill?.id === 'fan-fire' || weapon.id === 'shotgun') return this.getAreaAround(target.grid, 1);
    if (weapon.id === 'throwable') return this.getAreaAround(target.grid, 1);
    if (weapon.id === 'rifle') return [...this.getLineCells(rider.grid, target.grid), { ...target.grid }];
    return [{ ...target.grid }];
  }

  getValidTargets() {
    const rider = this.getState().party[this.activeIndex];
    if (!rider || !this.targetMode) return [];
    return living(this.enemies).filter((enemy) => this.canTarget(rider, enemy, this.targetMode));
  }

  canTargetCover(attacker, grid, action) {
    if (!attacker || !action || !this.getCoverState(grid)) return false;
    const range = this.getActionRange(attacker, action);
    if (gridDistance(attacker.grid, grid) > range) return false;
    if (action.type === 'combo') return false;
    if (action.type === 'horse-action' && !isMounted(attacker)) return false;
    return !this.getLineBlockReason(attacker, { grid, hp: 1, name: 'cover' });
  }

  canTarget(attacker, target, action) {
    return !this.getTargetBlockReason(attacker, target, action);
  }

  getTargetBlockReason(attacker, target, action) {
    if (!attacker || !target || !action) return 'No action selected';
    if (target.hp <= 0) return 'Target is down';
    if (action.type === 'combo' && !isMounted(attacker)) return 'Mounted-only combo';
    if (action.type === 'horse-action' && !isMounted(attacker)) return 'Mounted-only action';
    if (action.type === 'horse-action' && hasStatus(attacker, 'horse-panic')) return 'Horse Panic blocks mounted actions';
    const range = this.getActionRange(attacker, action);
    const distance = gridDistance(attacker.grid, target.grid);
    const elevationWindow = this.getElevationReachWindow(attacker, target, action, range);
    if (!elevationWindow.valid) return elevationWindow.reason;
    if (distance > elevationWindow.range) return `Out of range (${distance}/${elevationWindow.range})`;
    if (hasStatus(attacker, 'showdown')) return '';
    if (action.type !== 'combo') {
      const lineBlock = this.getLineBlockReason(attacker, target);
      if (lineBlock) return lineBlock;
    }
    return '';
  }

  getActionRange(attacker, action) {
    if (action.type === 'combo') return 3;
    if (action.type === 'horse-action') return action.horseAction?.range || 1;
    const weapon = getWeapon(attacker);
    let range = action.type === 'skill' ? action.skill.range || weapon.range : weapon.range;
    if (isMounted(attacker)) range -= 1;
    if (attacker.riderStance === 'Sharpshooter') range += 2;
    if (attacker.riderStance === 'Gunslinger') range -= 1;
    if (attacker.riderStance === 'Sharpshooter' && getLane(attacker) === 'Back') range += 1;
    if (attacker.riderStance === 'Sharpshooter' && getLane(attacker) === 'Front') range -= 1;
    if (attacker.riderStance === 'Gunslinger' && getLane(attacker) === 'Mid') range += 1;
    if (attacker.riderStance === 'Wrangler' && action.skill?.id === 'lasso-snag') range += 1;
    if (isMounted(attacker) && attacker.horseStance === 'Stampede') range += 1;
    if (hasStatus(attacker, 'dust-choked')) range -= 1;
    return Math.max(1, range);
  }

  getElevationReachWindow(attacker, target, action, baseRange = this.getActionRange(attacker, action)) {
    const weapon = getWeapon(attacker);
    const attackerElevation = terrainAt(this.mapDef, attacker.grid).elevation;
    const targetElevation = terrainAt(this.mapDef, target.grid).elevation;
    const elevationDelta = targetElevation - attackerElevation;
    if (action.type === 'combo' || action.skill?.target === 'ally-weakest') return { valid: true, range: baseRange, elevationDelta };
    if (Math.abs(elevationDelta) >= 3) return { valid: false, reason: 'Elevation too extreme', range: baseRange, elevationDelta };
    if (weapon.id !== 'shotgun') return { valid: true, range: baseRange, elevationDelta };
    if (elevationDelta <= 0) return { valid: true, range: baseRange + Math.min(1, Math.abs(elevationDelta)), elevationDelta };
    if (elevationDelta === 1) return { valid: true, range: baseRange + 1, elevationDelta };
    return { valid: true, range: 2, elevationDelta };
  }

  getActionRangeCells(attacker, action) {
    const range = this.getActionRange(attacker, action);
    const cells = [];
    this.mapDef.elements.forEach((row, y) => {
      row.forEach((_, x) => {
        const grid = { x, y };
        if (gridDistance(attacker.grid, grid) <= range) cells.push(grid);
      });
    });
    return cells;
  }

  getTargetingSummary(rider, action) {
    const range = this.getActionRange(rider, action);
    const valid = this.getValidTargets().length;
    const weapon = getWeapon(rider);
    return weapon.id === 'shotgun'
      ? `range ${range}, elevation weakens spread, ${valid} valid target${valid === 1 ? '' : 's'}`
      : `range ${range}, ${valid} valid target${valid === 1 ? '' : 's'}, ${weapon.name}`;
  }

  getNextUnitLabel() {
    const units = [
      ...living(this.getState().party).map((unit) => ({ unit, side: 'Ally', speed: riderSpeed(unit, this.getPartySynergy()) })),
      ...living(this.enemies).map((unit) => ({ unit, side: 'Enemy', speed: enemySpeed(unit) })),
    ];
    const next = units
      .filter(({ unit, speed }) => unit.atb < 100 && speed > 0)
      .sort((a, b) => (100 - a.unit.atb) / a.speed - (100 - b.unit.atb) / b.speed)[0];
    return next ? `${next.side} ${next.unit.short || next.unit.name} (${Math.round(next.unit.atb)}%)` : 'ready soon';
  }

  getActionPreviewText(rider) {
    if (!rider) return 'Red = danger.';
    if (this.prepPhase) return 'Battle paused. Use items, change stances, or begin the fight.';
    if (this.moveMode) return 'Green = move.';
    if (!this.targetMode) return 'Choose a command.';
    const inspectedEnemy = this.selectedGrid ? this.getUnitAtGrid(this.selectedGrid) : null;
    const target = inspectedEnemy || this.getValidTargets()[0];
    if (!target) return 'No valid target.';
    return this.getActionPreviewLines(rider, target, this.targetMode).join('\n');
  }

  getActionPreviewLines(rider, target, action) {
    const blockReason = this.getTargetBlockReason(rider, target, action);
    if (blockReason) return [`${target.short || target.name}: ${blockReason}`];
    const stats = this.getActionStats(rider, target, action);
    return [
      `${target.short || target.name}: DMG ${stats.damage}  HIT ${stats.hit}%  CRIT ${stats.crit}%`,
      [stats.status ? `Inflicts ${stats.status}` : '', stats.modifiers.slice(0, 3).join(' | ')].filter(Boolean).join(' | '),
    ].filter(Boolean);
  }

  getActionStats(rider, target, action) {
    const weapon = getWeapon(rider);
    const riderTerrain = terrainAt(this.mapDef, rider.grid);
    const targetTerrain = terrainAt(this.mapDef, target.grid);
    const range = this.getActionRange(rider, action);
    const distance = gridDistance(rider.grid, target.grid);
    const lane = getLane(rider);
    const targetLane = getLane(target);
    const baseDamage = action.type === 'horse-action'
      ? this.getHorseActionDamage(rider, target, action.horseAction)
      : action.type === 'skill'
      ? skillPower(action.skill, rider, target, this.mapDef, this.getPartySynergy())
      : action.type === 'combo'
        ? riderDamage(rider, target, this.mapDef, this.getPartySynergy()) + 30 + Math.round(this.getHorseBond(rider) / 4)
        : riderDamage(rider, target, this.mapDef, this.getPartySynergy());
    const elevationWindow = this.getElevationReachWindow(rider, target, action, range);
    const uphillShotgunPenalty = weapon.id === 'shotgun' && elevationWindow.elevationDelta > 0 ? elevationWindow.elevationDelta : 0;
    const downhillShotgunBonus = weapon.id === 'shotgun' && elevationWindow.elevationDelta < 0 ? Math.min(1, Math.abs(elevationWindow.elevationDelta)) : 0;
    const damage = Math.max(1, baseDamage - uphillShotgunPenalty * 5 + downhillShotgunBonus * 2);
    const coverPenalty = targetTerrain.cover && !isMounted(rider) ? 12 : 0;
    const coverProtection = targetTerrain.cover ? this.getCoverProtection(target.grid) : 0;
    const rangePenalty = Math.max(0, distance - Math.ceil(range * 0.62)) * 5;
    const highGroundBonus = riderTerrain.elevation > targetTerrain.elevation ? 8 : 0;
    const elevationPenalty = uphillShotgunPenalty * 12;
    const stanceBonus = rider.riderStance === 'Sharpshooter' ? 8 : rider.riderStance === 'Gunslinger' && lane === 'Mid' ? 5 : 0;
    const dustPenalty = hasStatus(rider, 'dust-choked') ? 18 : 0;
    const panicPenalty = hasStatus(rider, 'horse-panic') && isMounted(rider) ? 14 : 0;
    const showdownBonus = hasStatus(rider, 'showdown') ? 100 : 0;
    const deadeyeCoverRelief = hasSynergySurge(this.getPartySynergy(), 'deadeye') && hasStatus(target, 'marked') ? Math.round(coverPenalty * coverProtection * 0.45) : 0;
    const flankingBonus = hasSynergySurge(this.getPartySynergy(), 'dust-devils') && lane !== targetLane ? 8 : 0;
    const markedFollowUpBonus = hasSynergySurge(this.getPartySynergy(), 'deadeye') && hasStatus(target, 'marked') ? 6 : 0;
    const sundownFocusBonus = hasSynergySurge(this.getPartySynergy(), 'sundown-reapers') && (hasStatus(target, 'marked') || this.isIsolatedEnemy(target)) ? 6 : 0;
    const hit = action.type === 'combo'
      ? 100
      : Math.max(35, Math.min(100, 82 + highGroundBonus + stanceBonus + showdownBonus + deadeyeCoverRelief + flankingBonus + markedFollowUpBonus + sundownFocusBonus - Math.round(coverPenalty * coverProtection) - rangePenalty - elevationPenalty - dustPenalty - panicPenalty + (action.type === 'horse-action' ? 4 : 0)));
    const critBase = weapon.id === 'rifle' ? 14 : weapon.id === 'revolver' ? 12 : weapon.id === 'shotgun' && distance <= 2 ? 13 : 8;
    const markedCrit = hasPartySynergy(this.getPartySynergy(), 'deadeye') && hasStatus(target, 'marked') ? 10 : 0;
    const surgeCrit = hasSynergySurge(this.getPartySynergy(), 'deadeye') && hasStatus(target, 'marked') ? 4 : 0;
    const crit = Math.max(0, Math.min(60, critBase + markedCrit + surgeCrit + (hasStatus(rider, 'showdown') ? 18 : 0) + (targetTerrain.cover ? -4 : 0) - uphillShotgunPenalty * 3));
    const statusName = action.horseAction?.status || action.skill?.status || (action.type === 'combo' ? 'showdown' : weapon.id === 'throwable' ? 'snared' : '');
    const status = statusName ? createStatus(statusName).label : '';
    const modifiers = [
      `${weapon.name} range ${distance}/${range}`,
      `${lane}->${targetLane}`,
      action.horseAction ? `${getHorse(rider)?.name || 'Horse'} assist` : '',
      targetTerrain.cover ? 'cover' : '',
      riderTerrain.elevation > targetTerrain.elevation ? 'high angle' : '',
      uphillShotgunPenalty ? 'uphill spread penalty' : '',
      downhillShotgunBonus ? 'downhill spread' : '',
      rider.riderStance,
      isMounted(rider) ? 'mounted' : 'on foot',
      hasStatus(rider, 'dust-choked') ? 'Dust-Choked' : '',
      hasStatus(rider, 'horse-panic') && isMounted(rider) ? 'Horse Panic' : '',
    ].filter(Boolean);
    return { damage, hit, crit, atbCost: action.skill?.atbBonus ? `sets ${action.skill.atbBonus}` : 'spends turn', status, modifiers };
  }

  describeStatuses(unit) {
    if (!unit.statuses?.length) return '';
    return unit.statuses
      .map((status) => {
        const definition = createStatus(status.name);
        return `${this.getStatusPresentation(definition.name).label}: ${this.getStatusDescription(definition.name)}`;
      })
      .join('\n');
  }

  getStatusBadges(unit) {
    if (!unit.statuses?.length) return '';
    return unit.statuses
      .slice(0, 4)
      .map((status) => {
        const definition = createStatus(status.name);
        return this.getStatusPresentation(definition.name).label;
      })
      .join(' ');
  }

  renderStatusBadges(unit, x, y, badgeObjects, max = 3) {
    const signature = (unit.statuses || []).slice(0, max).map((status) => createStatus(status.name).name).join('|');
    if (badgeObjects.signature === signature) return;
    badgeObjects.signature = signature;
    badgeObjects.forEach((object) => object.destroy());
    badgeObjects.length = 0;
    if (!signature) return;
    let cursorX = x;
    unit.statuses.slice(0, max).forEach((status) => {
      const definition = createStatus(status.name);
      const badge = this.getStatusPresentation(definition.name);
      const width = Math.max(38, badge.label.length * 7 + 14);
      const bg = this.add.rectangle(cursorX, y, width, 16, badge.color, 0.95).setOrigin(0);
      bg.setStrokeStyle(1, palette.shadow, 0.88);
      const text = this.add.text(cursorX + width / 2, y + 2, badge.label, labelStyle(8, badge.textColor)).setOrigin(0.5, 0);
      badgeObjects.push(bg, text);
      cursorX += width + 5;
    });
  }

  getStatusPresentation(statusName) {
    const badges = {
      sunstroke: { label: 'HEAT', color: 0xe58a34, textColor: '#241914' },
      'bleeding-out': { label: 'BLEED', color: palette.red, textColor: '#fff8e7' },
      'whiskey-dazed': { label: 'DAZED', color: 0xb48642, textColor: '#241914' },
      wanted: { label: 'WANTED', color: 0xd9b84f, textColor: '#241914' },
      'horse-panic': { label: 'PANIC', color: 0xc75b46, textColor: '#fff8e7' },
      'dust-choked': { label: 'DUST', color: 0xc4a46b, textColor: '#241914' },
      showdown: { label: 'DUEL', color: palette.yellow, textColor: '#241914' },
      grit: { label: 'GRIT', color: palette.green, textColor: '#fff8e7' },
      fatigue: { label: 'TIRED', color: 0x6f6a5f, textColor: '#fff8e7' },
      guarded: { label: 'GUARD', color: palette.blue, textColor: '#241914' },
      marked: { label: 'MARK', color: 0xd9513f, textColor: '#fff8e7' },
      quick: { label: 'QUICK', color: 0x75b65a, textColor: '#241914' },
      snared: { label: 'SNARE', color: 0x8f6a3c, textColor: '#fff8e7' },
    };
    return badges[statusName] || { label: 'STATUS', color: palette.pale, textColor: '#241914' };
  }

  getStatusDescription(statusName) {
    const descriptions = {
      sunstroke: 'Slower ATB, weaker healing and aim.',
      'bleeding-out': 'Loses HP over time; acting worsens it.',
      'whiskey-dazed': 'Takes less damage, hits harder, but draws risk.',
      wanted: 'Enemies prefer this target; damage rises both ways.',
      'horse-panic': 'Mounted skills disabled and the horse may bolt.',
      'dust-choked': 'Ranged damage and ATB pressure are reduced.',
      showdown: 'Faster ATB, stronger hits, and clear lines.',
      grit: 'Survives one fatal blow, then gains Fatigue.',
      fatigue: 'ATB slows after a burst.',
      guarded: 'Incoming damage is reduced.',
      marked: 'Takes stronger focused damage.',
      quick: 'ATB builds faster.',
      snared: 'ATB builds slower.',
    };
    return descriptions[statusName] || 'Special combat state.';
  }

  hasLineOfSight(from, to) {
    return !this.getLineCells(from, to).some((grid) => {
      const terrain = terrainAt(this.mapDef, grid);
      const unitBlocker = this.getAllUnits().some((unit) => unit.hp > 0 && unit.grid.x === grid.x && unit.grid.y === grid.y);
      return (terrain.cover && this.getCoverState(grid)) || terrain.elevation >= 2 || unitBlocker;
    });
  }

  getLineBlockReason(attacker, target) {
    const blocker = this.getLineCells(attacker.grid, target.grid).find((grid) => {
      const terrain = terrainAt(this.mapDef, grid);
      const unit = this.getAllUnits().find((candidate) => candidate.hp > 0 && candidate.grid.x === grid.x && candidate.grid.y === grid.y);
      return (terrain.cover && this.getCoverState(grid)) || terrain.elevation >= 2 || unit;
    });
    if (!blocker) return '';
    const terrain = terrainAt(this.mapDef, blocker);
    const unit = this.getAllUnits().find((candidate) => candidate.hp > 0 && candidate.grid.x === blocker.x && candidate.grid.y === blocker.y);
    if (unit) return `${unit.short || unit.name} blocks line of fire`;
    if (terrain.cover) return 'Blocked by cover';
    return 'Blocked by high ground';
  }

  getLineCells(from, to) {
    const cells = [];
    const dx = Math.abs(to.x - from.x);
    const dy = Math.abs(to.y - from.y);
    const sx = from.x < to.x ? 1 : -1;
    const sy = from.y < to.y ? 1 : -1;
    let error = dx - dy;
    let x = from.x;
    let y = from.y;

    while (x !== to.x || y !== to.y) {
      const twiceError = error * 2;
      if (twiceError > -dy) {
        error -= dy;
        x += sx;
      }
      if (twiceError < dx) {
        error += dx;
        y += sy;
      }
      if (x !== to.x || y !== to.y) cells.push({ x, y });
    }
    return cells;
  }

  clearTargetOverlay() {
    this.targetMode = null;
    this.targetOverlay?.clear();
  }

  getEnemyIntent(enemy) {
    if (enemy.intent) {
      const seconds = Math.max(0, enemy.intent.timeLeft).toFixed(1);
      return {
        ...enemy.intent,
        short: `${enemy.intent.short} ${seconds}s`,
        detail: `${enemy.intent.detail} Fires in ${seconds}s unless interrupted, dodged, guarded, or blocked.`,
      };
    }
    return this.getEnemyPlannedIntent(enemy);
  }

  getEnemyPlannedIntent(enemy) {
    const threat = this.getEnemyAttackThreat(enemy);
    if (threat) return threat;
    const targets = this.getEnemyTargets();
    if (!targets.length) return { short: 'Done', detail: 'No living targets.' };
    if (enemy.id === 'rifleman') return { short: 'Hold Fire', detail: 'Hold ATB for a clear rifle line.' };
    const closest = this.getClosestTarget(enemy, targets);
    return { short: 'Advance', detail: `Advance toward ${closest.name}.` };
  }

  getEnemyAttackThreat(enemy) {
    const targets = this.getEnemyTargets();
    if (!targets.length) return null;
    if (enemy.id === 'sapper') {
      const target = this.objectiveUnit?.hp > 0 && gridDistance(enemy.grid, this.objectiveUnit.grid) <= 3
        ? this.objectiveUnit
        : this.pickEnemyTarget(targets, enemy, 4);
      return target
        ? { short: `Blast ${target.short || target.name.split(' ')[0]}`, detail: `Throw powder at ${target.name}.`, target }
        : null;
    }
    if (enemy.id === 'scout') {
      const target = this.pickEnemyTarget(targets, enemy, 4);
      return target
        ? { short: `Harass ${target.short || target.name.split(' ')[0]}`, detail: `Harass ${target.name} with fast pistol fire.`, target }
        : null;
    }
    if (enemy.id === 'bruiser') {
      const target = targets.find((candidate) => gridDistance(enemy.grid, candidate.grid) <= 1);
      return target
        ? { short: `Slam ${target.name.split(' ')[0]}`, detail: `Slam ${target.name} and trigger Horse Panic.`, target }
        : null;
    }
    if (enemy.id === 'rifleman') {
      const target = this.pickEnemyTarget(targets, enemy, 7, true);
      return target
        ? { short: `Bleed ${target.name.split(' ')[0]}`, detail: `Shoot ${target.name} and apply Bleeding Out.`, target }
        : null;
    }
    const target = this.pickEnemyTarget(targets, enemy, 5);
    return target
      ? { short: `Dust ${target.name.split(' ')[0]}`, detail: `Shoot ${target.name} and apply Dust-Choked.`, target }
      : null;
  }

  beginEnemyIntent(enemy) {
    const intent = this.getEnemyPlannedIntent(enemy);
    const total = this.getEnemyIntentWindup(enemy, intent);
    enemy.atb = 100;
    enemy.intent = {
      ...intent,
      total,
      timeLeft: total,
    };
    this.showIntentPulse(enemy, intent);
    this.addLog(`${enemy.name} prepares: ${intent.detail} Reaction window ${total.toFixed(1)}s.`);
  }

  getEnemyIntentWindup(enemy, intent) {
    let windup = enemy.id === 'rifleman' ? 2.4 : enemy.id === 'bruiser' ? 1.7 : 1.9;
    if (!intent?.target) windup = 1.2;
    if (hasStatus(enemy, 'dust-choked')) windup += 0.7;
    if (hasStatus(enemy, 'snared')) windup += 0.5;
    if (hasStatus(enemy, 'showdown')) windup -= 0.4;
    return Math.max(0.8, windup);
  }

  updateEnemyIntent(enemy, delta) {
    enemy.intent.timeLeft -= delta;
    if (enemy.intent.timeLeft > 0) return;
    enemy.intent = null;
    this.enemyAct(enemy);
    if (this.isTutorialBattle() && this.getTutorialStepKey() === 'intent') this.completeTutorialStep('intent');
  }

  handleMapClick(worldX, worldY) {
    if (this.paused) return;
    const grid = worldToGrid(this.mapDef, worldX, worldY);
    if (!isInBounds(this.mapDef, grid)) return;
    if (this.targetMode && !this.battleOver) {
      const target = this.getUnitAtGrid(grid);
      const rider = this.getState().party[this.activeIndex];
      if (!target && this.canTargetCover(rider, grid, this.targetMode)) {
        if (!this.isTutorialActionAllowed('target-cover', { target: null, grid })) {
          this.blockTutorialAction('Target the highlighted cover.');
          return;
        }
        this.executeCoverAttack(grid);
        return;
      }
      if (target && !this.isTutorialActionAllowed('target', { target, grid })) {
        this.selectTile(grid);
        this.blockTutorialAction('Target the highlighted tutorial enemy.');
        return;
      }
      const reason = target ? this.getTargetBlockReason(rider, target, this.targetMode) : 'No enemy on that tile';
      if (!target || reason) {
        this.selectTile(grid);
        this.addLog(`Invalid target: ${reason}.`);
        this.updateDynamicViews();
        return;
      }
      this.executeTargetedAction(target);
      return;
    }

    if (!this.moveMode || this.battleOver) {
      if (
        this.isTutorialBattle()
        && this.getTutorialStepKey() === 'field-intel'
        && (grid.x !== this.tutorialScript.inspectGrid.x || grid.y !== this.tutorialScript.inspectGrid.y)
      ) {
        this.selectTile(grid);
        this.blockTutorialAction('Select the highlighted cover tile for Field Intel.');
        return;
      }
      this.selectTile(grid);
      return;
    }

    const rider = this.getState().party[this.activeIndex];
    if (!rider) return;
    if (
      this.isTutorialBattle()
      && this.getTutorialStepKey() === 'move'
      && (grid.x !== this.tutorialScript.moveGrid.x || grid.y !== this.tutorialScript.moveGrid.y)
    ) {
      this.selectTile(grid);
      this.blockTutorialAction('Move to the highlighted ridge tile.');
      return;
    }
    if (this.isTutorialBattle() && this.getTutorialStepKey() !== 'move') {
      this.blockTutorialAction();
      return;
    }
    const canMove = this.reachableTiles.some((tile) => tile.x === grid.x && tile.y === grid.y);
    if (!canMove) {
      this.addLog('That tile is out of movement range or occupied.');
      this.updateDynamicViews();
      return;
    }

    const fromGrid = { ...rider.grid };
    const atbCost = this.getRepositionAtbCost(rider, grid);
    rider.grid = grid;
    rider.atb = Math.max(0, rider.atb - atbCost);
    if (hasPartySynergy(this.getPartySynergy(), 'dust-devils')) rider.atb = Math.min(100, rider.atb + 5);
    const terrain = terrainAt(this.mapDef, grid);
    if (terrain.hazardDamage) {
      this.applyDamage(rider, terrain.hazardDamage);
      this.showDamagePopup(rider, terrain.hazardDamage, 'Hazard');
    }
    this.activeIndex = null;
    this.clearMoveMode();
    this.clearTargetOverlay();
    this.commandMode = 'root';
    this.playSfx('move');
    this.addLog(`${rider.name} moves to ${getLane(rider)} ${terrain.label} (-${atbCost} ATB).`);
    this.recordSurgeEvent('move', rider, null, {
      advanced: grid.x < fromGrid.x,
      exposed: !terrain.cover,
    });
    if (this.isTutorialBattle() && this.getTutorialStepKey() === 'move') this.completeTutorialStep('move');
    this.buildCommandButtons();
    this.updateDynamicViews();
  }

  getRepositionAtbCost(rider, grid) {
    const tile = this.reachableTiles.find((option) => option.x === grid.x && option.y === grid.y);
    const travelCost = tile?.cost || gridDistance(rider.grid, grid);
    let cost = isMounted(rider) ? 24 : 38;
    cost += travelCost * (isMounted(rider) ? 3 : 6);
    const destination = terrainAt(this.mapDef, grid);
    if (hasPartySynergy(this.getPartySynergy(), 'stampede') && isMounted(rider)) cost -= 6;
    if (rider.riderStance === 'Wrangler') cost -= 8;
    if (rider.horseStance === 'Sprint' && isMounted(rider)) cost -= 6;
    if (hasSynergySurge(this.getPartySynergy(), 'stampede') && isMounted(rider) && !destination.cover && !destination.hazardDamage) cost -= 6;
    if (hasSynergySurge(this.getPartySynergy(), 'dust-devils')) cost -= 6;
    if ((hasSynergySurge(this.getPartySynergy(), 'frontier-survivors') || hasSynergySurge(this.getPartySynergy(), 'trail-wardens')) && ['Iron Rider', 'Wrangler'].includes(rider.riderStance)) cost -= 6;
    if (hasStatus(rider, 'horse-panic') && isMounted(rider)) cost += 14;
    if (hasStatus(rider, 'snared')) cost += 10;
    return Math.max(14, Math.min(72, Math.round(cost)));
  }

  getUnitTextureKey(unit, isEnemy) {
    if (unit.objective === 'wagon') return 'sprite-supply-wagon';
    if (isEnemy) return enemySpriteKeys[unit.id] || 'sprite-raider';
    return partySpriteKeys[unit.id] || 'sprite-marshal';
  }

  getHorseSpriteKey(unit) {
    return horseSpriteKeys[getHorse(unit)?.id] || horseSpriteKeys.comet;
  }

  addLog(message) {
    this.log.unshift(message);
    this.log = this.log.slice(0, 6);
  }

  playActionSound(rider, action = {}) {
    if (action.type === 'combo') {
      this.playSfx('combo');
      return;
    }
    if (action.type === 'horse-action') {
      this.playSfx(`horse-${action.horseAction?.id || 'charge'}`);
      return;
    }
    if (action.type === 'skill' && action.skill?.power < 0) {
      this.playSfx('item');
      return;
    }
    this.playSfx(getWeapon(rider).id);
  }

  getHorseBond(rider) {
    if (!rider.horseId) return 0;
    rider.horseBonds ||= {};
    if (rider.horseBonds[rider.horseId] === undefined) rider.horseBonds[rider.horseId] = 0;
    return rider.horseBonds[rider.horseId];
  }

  addHorseBond(rider, amount) {
    if (!amount || !rider.horseId) return;
    rider.horseBonds ||= {};
    rider.horseBonds[rider.horseId] = Math.min(100, this.getHorseBond(rider) + amount);
  }

  getHorseActions(rider) {
    if (!getHorse(rider)) return [];
    return [
      {
        id: 'charge',
        name: 'Charge',
        description: 'Hard mounted strike that can panic the target.',
        range: rider.horseStance === 'Sprint' ? 5 : 4,
        power: 24,
        status: 'horse-panic',
        tone: 'attack',
      },
      {
        id: 'ride-by',
        name: 'Ride-By',
        description: 'Fast mounted pass that keeps some ATB.',
        range: 4,
        power: 18,
        atbBonus: rider.horseStance === 'Sprint' ? 26 : 18,
        tone: 'move',
      },
      {
        id: 'trample',
        name: 'Trample',
        description: 'Close stomp that splashes nearby enemies.',
        range: 2,
        power: 16,
        area: 1,
        status: 'snared',
        tone: 'attack',
      },
    ];
  }

  getHorseActionDamage(rider, target, horseAction) {
    const bond = this.getHorseBond(rider);
    const targetTerrain = terrainAt(this.mapDef, target.grid);
    let damage = horseAction.power + Math.round(bond / 6);
    if (rider.horseStance === 'Stampede') damage += 8;
    if (rider.horseStance === 'Wild Frenzy') damage += 6;
    if (rider.horseStance === 'Sprint' && horseAction.id === 'ride-by') damage += 4;
    if (rider.horseStance === 'Defensive Guard' && horseAction.id === 'charge') damage += 3;
    if (targetTerrain.elevation < 0) damage += 5;
    if (targetTerrain.cover && horseAction.id === 'trample') damage += 3;
    if (hasEquippedTrait(rider, 'Iron Charge') && horseAction.id === 'charge') damage += 6;
    if (hasEquippedTrait(rider, 'Ghost Sprint') && horseAction.id === 'ride-by') damage += 4;
    return Math.max(5, damage);
  }

  quickRetry() {
    if (!this.battleOver) return;
    const state = this.getState();
    state.party.forEach((rider) => {
      rider.hp = rider.maxHp;
      rider.atb = 0;
      rider.statuses = [];
    });
    state.showdown = 0;
    this.scene.restart();
  }

  updateStatusPressure(delta) {
    this.heatClock += delta;
    this.statusClock += delta;

    if (this.heatClock >= 18) {
      this.heatClock = 0;
      const exposed = living(this.getState().party).find((rider) => !hasStatus(rider, 'sunstroke'));
      if (exposed) {
        this.applySkillStatus(exposed, 'sunstroke');
        this.addLog(`${exposed.name} is hit by Sunstroke.`);
      }
    }

    if (this.statusClock < 1) return;
    this.statusClock = 0;
    [...this.getState().party, ...this.enemies].forEach((unit) => {
      if (unit.hp <= 0 || !hasStatus(unit, 'bleeding-out')) return;
      unit.hp = Math.max(1, unit.hp - 2);
      this.showDamagePopup(unit, 2, 'Bleed');
    });

    living(this.getState().party).forEach((rider) => {
      if (!isMounted(rider) || !hasStatus(rider, 'horse-panic')) return;
      const synergyRecovery = hasPartySynergy(this.getPartySynergy(), 'frontier-survivors') ? 0.08 : hasPartySynergy(this.getPartySynergy(), 'trail-wardens') ? 0.06 : 0;
      const surgeRecovery = hasSynergySurge(this.getPartySynergy(), 'trail-wardens') ? 0.1 : 0;
      const recoveryChance = (hasEquippedTrait(rider, 'Trusted Mount') ? 0.16 : 0) + (rider.horseStance === 'Calm Focus' ? 0.14 : 0) + synergyRecovery + surgeRecovery;
      if (recoveryChance && Math.random() < recoveryChance) {
        this.clearStatus(rider, 'horse-panic');
        rider.atb = Math.min(100, rider.atb + 10);
        this.addLog(`${getHorse(rider).name} steadies ${rider.name} through Horse Panic.`);
        return;
      }
      if (Math.random() > 0.18) return;
      const pushed = this.getPanicMove(rider);
      if (!pushed) return;
      rider.grid = pushed;
      rider.atb = Math.max(0, rider.atb - 20);
      this.addLog(`${getHorse(rider).name} panics and bolts.`);
    });
  }

  getPanicMove(rider) {
    const options = [
      { x: rider.grid.x - 1, y: rider.grid.y },
      { x: rider.grid.x, y: rider.grid.y - 1 },
      { x: rider.grid.x, y: rider.grid.y + 1 },
      { x: rider.grid.x + 1, y: rider.grid.y },
    ].filter((grid) => {
      if (!isInBounds(this.mapDef, grid)) return false;
      return !this.getAllUnits().some((unit) => unit !== rider && unit.hp > 0 && unit.grid.x === grid.x && unit.grid.y === grid.y);
    });
    return options[Math.floor(Math.random() * options.length)];
  }

  executeTargetedAction(target) {
    const state = this.getState();
    const rider = state.party[this.activeIndex];
    if (!rider || !target || this.battleOver || !this.targetMode) return;
    this.clearMoveMode();
    const action = this.targetMode;
    this.clearTargetOverlay();
    this.commandMode = 'root';
    const stats = this.getActionStats(rider, target, action);
    this.playActionSound(rider, action);
    const tutorialStepKey = this.isTutorialBattle() ? this.getTutorialStepKey() : '';
    const scriptedTutorialHit = this.isScriptedTutorialHit(tutorialStepKey, action, target);
    const missed = !scriptedTutorialHit && Math.random() * 100 >= stats.hit;
    const critical = !missed && !scriptedTutorialHit && Math.random() * 100 < stats.crit;

    if (action.type === 'horse-action') {
      if (missed) {
        rider.atb = 0;
        this.worsenBleed(rider);
        this.showDamagePopup(target, 'Miss');
        this.showCombatImpact(rider, target, { missed: true, kind: action.horseAction.id });
        this.damageCoverAt(target.grid, this.getCoverDamage(rider, action, true), rider);
        this.addLog(`${getHorse(rider).name}'s ${action.horseAction.name} misses ${target.name}. Hit chance ${stats.hit}%.`);
      } else {
        const damage = critical ? Math.round(stats.damage * 1.35) : stats.damage;
        const affected = action.horseAction.area
          ? living(this.enemies).filter((enemy) => this.getAreaAround(target.grid, action.horseAction.area).some((grid) => grid.x === enemy.grid.x && grid.y === enemy.grid.y))
          : [target];
        affected.forEach((enemy, index) => {
          const dealt = index === 0 ? damage : Math.max(4, Math.round(damage * 0.55));
          this.applyDamage(enemy, dealt);
          this.interruptEnemyIntent(enemy, rider);
          if (action.horseAction.status) this.applySkillStatus(enemy, action.horseAction.status);
          this.showDamagePopup(enemy, dealt, index === 0 ? action.horseAction.name : 'Splash');
        });
        rider.atb = Math.min(100, action.horseAction.atbBonus || 0);
        this.worsenBleed(rider);
        this.addHorseBond(rider, 4);
        state.showdown = Math.min(100, state.showdown + 12);
        this.showCombatImpact(rider, target, { critical, kind: action.horseAction.id });
        this.damageCoverAt(target.grid, this.getCoverDamage(rider, action, false), rider);
        this.addLog(`${rider.name} uses ${action.horseAction.name} with ${getHorse(rider).name} for ${damage}${critical ? ' critical' : ''}.`);
        this.applySynergyPostHit(rider, target, action, damage, critical, affected);
      }
    } else if (action.type === 'skill') {
      if (missed) {
        rider.atb = Math.min(100, action.skill.atbBonus ? action.skill.atbBonus : 0);
        this.worsenBleed(rider);
        this.showDamagePopup(target, 'Miss');
        this.showCombatImpact(rider, target, { missed: true, kind: action.skill.id });
        this.damageCoverAt(target.grid, this.getCoverDamage(rider, action, true), rider);
        this.addLog(`${rider.name}'s ${action.skill.name} misses ${target.name}. Hit chance ${stats.hit}%.`);
      } else {
        const damage = critical ? Math.round(stats.damage * 1.45) : stats.damage;
        this.applyDamage(target, damage);
        this.interruptEnemyIntent(target, rider);
        this.applySkillStatus(target, action.skill.status);
        this.applyShowdownLock(rider, target);
        this.applySkillStatus(rider, action.skill.selfStatus);
        action.skill.selfStatuses?.forEach((status) => this.applySkillStatus(rider, status));
        rider.atb = Math.min(100, action.skill.atbBonus ? action.skill.atbBonus : 0);
        this.applyTalentFollowUp(rider, target);
        this.worsenBleed(rider);
        this.addHorseBond(rider, 2);
        state.showdown = Math.min(100, state.showdown + 10);
        this.showCombatImpact(rider, target, { critical, kind: action.skill.id });
        this.showDamagePopup(target, damage, critical ? 'Crit' : action.skill.status);
        this.damageCoverAt(target.grid, this.getCoverDamage(rider, action, false), rider);
        this.addLog(`${rider.name} uses ${action.skill.name} on ${target.name} for ${damage}${critical ? ' critical' : ''}.`);
        this.applySynergyPostHit(rider, target, action, damage, critical, [target]);
      }
    } else if (action.type === 'combo') {
      const damage = critical ? Math.round(stats.damage * 1.45) : stats.damage;
      this.applyDamage(target, damage);
      this.interruptEnemyIntent(target, rider);
      this.applyShowdownLock(rider, target);
      rider.atb = 0;
      this.applyTalentFollowUp(rider, target);
      this.worsenBleed(rider);
      this.applyAfterBurstFatigue(rider);
      this.addHorseBond(rider, 7);
      state.showdown = Math.max(0, state.showdown - 60);
      this.showCombatImpact(rider, target, { critical, kind: 'combo' });
      this.showDamagePopup(target, damage, critical ? 'Crit' : 'Combo');
      this.addLog(`${getHorse(rider).combo} hits ${target.name} for ${damage}${critical ? ' critical' : ''}.`);
      this.applySynergyPostHit(rider, target, action, damage, critical, [target]);
    } else {
      if (missed) {
        rider.atb = 0;
        this.worsenBleed(rider);
        this.showDamagePopup(target, 'Miss');
        this.showCombatImpact(rider, target, { missed: true, kind: 'attack' });
        this.damageCoverAt(target.grid, this.getCoverDamage(rider, action, true), rider);
        this.addLog(`${rider.name} misses ${target.name}. Hit chance ${stats.hit}%.`);
      } else {
        const damage = critical ? Math.round(stats.damage * 1.45) : stats.damage;
        this.applyDamage(target, damage);
        this.interruptEnemyIntent(target, rider);
        this.applyShowdownLock(rider, target);
        rider.atb = 0;
        this.applyTalentFollowUp(rider, target);
        this.worsenBleed(rider);
        this.addHorseBond(rider, isMounted(rider) ? 3 : 0);
        state.showdown = Math.min(100, state.showdown + 14);
        this.showCombatImpact(rider, target, { critical, kind: getWeapon(rider).id });
        this.showDamagePopup(target, damage, critical ? 'Crit' : '');
        this.damageCoverAt(target.grid, this.getCoverDamage(rider, action, false), rider);
        this.addLog(`${rider.name} hits ${target.name} for ${damage}${critical ? ' critical' : ''}.`);
        this.applySynergyPostHit(rider, target, action, damage, critical, [target]);
      }
    }

    this.recordSurgeEvent('attack', rider, target, {
      actionType: action.type,
      critical,
      missed,
      flanking: getLane(rider) !== getLane(target),
      isolated: this.isIsolatedEnemy(target),
      exposed: !terrainAt(this.mapDef, rider.grid).cover,
    });
    let completedTutorialAction = '';
    if (this.isTutorialBattle()) {
      if (this.getTutorialStepKey() === 'attack' && action.type === 'attack') completedTutorialAction = 'attack';
      else if (this.getTutorialStepKey() === 'skill-status' && action.type === 'skill' && action.skill?.id === 'iron-shot') completedTutorialAction = 'skill-status';
      else if (this.getTutorialStepKey() === 'mark' && action.type === 'skill' && action.skill?.id === 'marshal-mark') completedTutorialAction = 'mark';
      else if (this.getTutorialStepKey() === 'surge' && action.type === 'horse-action' && action.horseAction?.id === 'charge') {
        if (!this.getActiveSynergySurge()) this.activateSynergySurge();
        completedTutorialAction = 'surge';
      }
      else if (this.getTutorialStepKey() === 'charge' && action.type === 'horse-action' && action.horseAction?.id === 'charge') completedTutorialAction = 'charge';
      else if (this.getTutorialStepKey() === 'combo' && action.type === 'combo') completedTutorialAction = 'combo';
    }
    this.activeIndex = null;
    if (completedTutorialAction) this.completeTutorialStep(completedTutorialAction);
    this.buildCommandButtons();
    this.updateDynamicViews();
  }

  isScriptedTutorialHit(stepKey, action, target) {
    if (!stepKey || !target) return false;
    const raiderTarget = target.id === this.tutorialScript?.raiderId;
    const riflemanTarget = target.id === this.tutorialScript?.riflemanId;
    if (stepKey === 'surge') return raiderTarget && action.type === 'horse-action' && action.horseAction?.id === 'charge';
    if (stepKey === 'attack') return raiderTarget && action.type === 'attack';
    if (stepKey === 'skill-status') return raiderTarget && action.type === 'skill' && action.skill?.id === 'iron-shot';
    if (stepKey === 'mark') return riflemanTarget && action.type === 'skill' && action.skill?.id === 'marshal-mark';
    if (stepKey === 'charge') return raiderTarget && action.type === 'horse-action' && action.horseAction?.id === 'charge';
    if (stepKey === 'combo') return riflemanTarget && action.type === 'combo';
    return false;
  }

  applyTalentFollowUp(rider, target) {
    const followUp = talentFollowUp(rider, target, this.mapDef);
    this.applyFollowUp(rider, target, followUp);
    this.applyFollowUp(rider, target, weaponFollowUp(rider, target));
  }

  applyFollowUp(rider, target, followUp) {
    if (!followUp) return;
    if (followUp.status && target.hp > 0) this.applySkillStatus(target, followUp.status);
    if (followUp.atb) rider.atb = Math.min(100, rider.atb + followUp.atb);
    this.addLog(followUp.log);
  }

  applySynergyPostHit(rider, target, action, damage, critical, affected = [target]) {
    const synergy = this.getPartySynergy();
    const state = this.getState();
    if (hasSynergySurge(synergy, 'stampede') && isMounted(rider)) {
      affected.filter((enemy) => enemy.hp > 0).forEach((enemy) => {
        if (action.horseAction?.id === 'charge') this.knockBackEnemy(enemy, rider);
        if (action.type === 'horse-action' && Math.random() < 0.35) this.applySkillStatus(enemy, 'horse-panic');
      });
    }
    if (hasSynergySurge(synergy, 'deadeye') && ['rifle', 'revolver'].includes(getWeapon(rider).id)) {
      if (target.hp > 0) this.applySkillStatus(target, 'marked');
      if (target.hp > 0 && hasStatus(target, 'marked')) target.atb = Math.max(0, target.atb - 8);
    }
    if (hasSynergySurge(synergy, 'iron-vultures') && hasStatus(target, 'bleeding-out')) {
      target.atb = Math.min(target.atb, 46);
      if (gridDistance(rider.grid, target.grid) <= 1) this.showDamagePopup(target, 'Bleed held');
    }
    if (hasSynergySurge(synergy, 'outlaw-rush') && (hasStatus(rider, 'wanted') || rider.riderStance === 'Outlaw')) {
      rider.atb = Math.min(100, rider.atb + 5);
      state.showdown = Math.min(100, state.showdown + 5);
    }
    if (hasPartySynergy(synergy, 'outlaw-rush') && !terrainAt(this.mapDef, rider.grid).cover && ['Gunslinger', 'Outlaw', 'Wrangler'].includes(rider.riderStance)) {
      rider.atb = Math.min(100, rider.atb + 4);
    }
    if (hasSynergySurge(synergy, 'gravewind-riders') && isMounted(rider)) {
      if (target.hp > 0) target.atb = Math.max(0, target.atb - (hasStatus(target, 'horse-panic') ? 12 : 6));
    }
    if (hasSynergySurge(synergy, 'ashen-trail')) {
      this.spreadStatusFrom(target, 'dust-choked', 1);
      affected.forEach((enemy) => {
        if (enemy.hp > 0 && enemy.statuses?.length) enemy.atb = Math.max(0, enemy.atb - 5);
      });
    }
    if (hasSynergySurge(synergy, 'sundown-reapers')) {
      if (target.hp <= 0) {
        living(state.party)
          .filter((ally) => gridDistance(ally.grid, target.grid) <= 3)
          .forEach((ally) => { ally.atb = Math.min(100, ally.atb + 10); });
      } else if (hasStatus(target, 'marked') || hasStatus(target, 'showdown')) {
        target.atb = Math.max(0, target.atb - 12);
      }
    }
    if (hasPartySynergy(synergy, 'sundown-reapers') && this.isIsolatedEnemy(target)) {
      state.showdown = Math.min(100, state.showdown + 4);
    }
    if (damage >= 18 && hasPartySynergy(synergy, 'gravewind-riders') && isMounted(rider) && target.hp > 0 && Math.random() < 0.28) this.applySkillStatus(target, 'horse-panic');
  }

  knockBackEnemy(enemy, rider) {
    const dx = Math.sign(enemy.grid.x - rider.grid.x);
    const dy = Math.sign(enemy.grid.y - rider.grid.y);
    const next = { x: enemy.grid.x + dx, y: enemy.grid.y + dy };
    if (!isInBounds(this.mapDef, next)) return;
    if (this.getAllUnits().some((unit) => unit !== enemy && unit.hp > 0 && unit.grid.x === next.x && unit.grid.y === next.y)) return;
    enemy.grid = next;
    enemy.atb = Math.max(0, enemy.atb - 10);
    this.addLog(`${enemy.name} is knocked back by the charge.`);
  }

  spreadStatusFrom(source, statusName, range) {
    if (!source?.grid) return;
    living(this.enemies)
      .filter((enemy) => enemy !== source && gridDistance(enemy.grid, source.grid) <= range && !hasStatus(enemy, statusName))
      .slice(0, 2)
      .forEach((enemy) => {
        this.applySkillStatus(enemy, statusName);
        this.showDamagePopup(enemy, createStatus(statusName).label);
      });
  }

  interruptEnemyIntent(enemy, rider) {
    if (!enemy.intent || enemy.hp <= 0) return;
    enemy.intent = null;
    enemy.atb = Math.min(enemy.atb, hasStatus(enemy, 'dust-choked') || hasStatus(enemy, 'snared') ? 42 : 58);
    this.addLog(`${rider.name} interrupts ${enemy.name}'s prepared action.`);
  }

  applyShowdownLock(rider, target) {
    if (!hasStatus(rider, 'showdown')) return;
    this.applySkillStatus(target, 'showdown');
    this.showShowdownFlash(rider, target);
    this.addLog(`${rider.name} locks ${target.name} into a Showdown.`);
  }

  useSkill(skill) {
    const state = this.getState();
    const rider = state.party[this.activeIndex];
    if (!this.isTutorialActionAllowed('command', { label: skill.name })) {
      this.blockTutorialAction('Use the highlighted tutorial skill.');
      return;
    }
    if (this.prepPhase) return;
    if (!rider || this.battleOver) return;
    this.clearMoveMode();
    if (isMounted(rider) && hasStatus(rider, 'horse-panic')) {
      this.addLog(`${getHorse(rider).name} is panicked. Mounted skills are disabled.`);
      this.setCommandMode('root');
      return;
    }

    if (skill.target === 'self') {
      this.playSfx('item');
      this.applySkillStatus(rider, skill.status);
      this.showDamagePopup(rider, skill.status || 'Ready');
      rider.atb = hasPartySynergy(this.getPartySynergy(), 'trail-wardens') && ['guarded', 'grit'].includes(createStatus(skill.status).name) ? 12 : 0;
      this.worsenBleed(rider);
      this.activeIndex = null;
      this.commandMode = 'root';
      this.addLog(`${rider.name} uses ${skill.name}.`);
      this.buildCommandButtons();
      this.updateDynamicViews();
      return;
    }

    if (skill.target === 'ally-weakest') {
      this.playSfx('item');
      const ally = living(state.party).sort((a, b) => a.hp / a.maxHp - b.hp / b.maxHp)[0];
      if (!ally) return;
      const healing = healingAmount(ally, Math.abs(skill.power), rider, this.getPartySynergy());
      ally.hp = Math.min(ally.maxHp, ally.hp + healing);
      if (skill.cleanse) ally.statuses = [];
      this.showDamagePopup(ally, healing, 'Heal');
      this.recordSurgeEvent('heal', rider, ally);
      rider.atb = hasPartySynergy(this.getPartySynergy(), 'trail-wardens') ? 12 : 0;
      this.worsenBleed(rider);
      this.activeIndex = null;
      this.commandMode = 'root';
      this.addLog(`${rider.name} uses ${skill.name}. ${ally.name} recovers ${healing}.`);
      this.buildCommandButtons();
      this.updateDynamicViews();
      return;
    }

    this.startTargetMode({ type: 'skill', skill });
  }

  useItem(item) {
    const state = this.getState();
    const rider = state.party[this.activeIndex];
    if (!this.isTutorialActionAllowed('command', { label: `${item.name} x${state.items[item.id] || 0}` })) {
      this.blockTutorialAction('Use the highlighted tutorial item.');
      return;
    }
    if (!rider || this.battleOver) return;
    const count = state.items[item.id] || 0;
    if (count <= 0) {
      this.addLog(`No ${item.name} left.`);
      this.setCommandMode('root');
      return;
    }

    state.items[item.id] = count - 1;
    if (item.heal) {
      rider.hp = Math.min(rider.maxHp, rider.hp + healingAmount(rider, item.heal, rider, this.getPartySynergy()));
      this.recordSurgeEvent('heal', rider, rider);
    }
    item.clears?.forEach((status) => this.clearStatus(rider, status));
    item.applies?.forEach((status) => this.applySkillStatus(rider, status));
    this.playSfx('item');
    if (this.prepPhase) {
      this.commandMode = 'root';
      this.showDamagePopup(rider, item.heal ? item.heal : item.name);
      this.addLog(`${rider.name} prepares with ${item.name}.`);
      this.buildCommandButtons();
      this.updateDynamicViews();
      return;
    }
    rider.atb = item.heal && hasPartySynergy(this.getPartySynergy(), 'trail-wardens') ? 10 : 0;
    this.worsenBleed(rider);
    this.activeIndex = null;
    this.commandMode = 'root';
    this.showDamagePopup(rider, item.heal ? item.heal : item.name);
    this.addLog(`${rider.name} uses ${item.name}.`);
    if (this.isTutorialBattle() && this.getTutorialStepKey() === 'item' && item.id === 'bandage') this.completeTutorialStep('item');
    this.buildCommandButtons();
    this.updateDynamicViews();
  }

  applySkillStatus(unit, statusName) {
    if (!statusName) return;
    if (statusName === 'horse-panic' && this.getState().party?.includes(unit) && (hasSynergySurge(this.getPartySynergy(), 'frontier-survivors') || hasSynergySurge(this.getPartySynergy(), 'trail-wardens'))) {
      if (Math.random() < 0.55) {
        this.addLog(`${unit.name} steadies through Panic pressure.`);
        return;
      }
    }
    unit.statuses ||= [];
    const next = createStatus(statusName);
    const existing = unit.statuses.find((status) => status.name === next.name);
    if (existing) return;
    unit.statuses.push(next);
    const isEnemy = this.enemies?.includes(unit);
    const isAlly = this.getState().party?.includes(unit);
    if (isEnemy) this.recordSurgeEvent('status', null, unit, { statusName: next.name });
    if (isAlly && ['guarded', 'grit'].includes(next.name)) this.recordSurgeEvent('guard', unit, null, { statusName: next.name });
  }

  clearStatus(unit, statusName) {
    const next = createStatus(statusName);
    unit.statuses = (unit.statuses || []).filter((status) => status.name !== next.name);
  }

  applyDamage(unit, amount) {
    const nextHp = unit.hp - amount;
    if (this.shouldPreserveTutorialEnemy(unit, nextHp)) {
      unit.hp = 28;
      unit.intent = null;
      this.showDamagePopup(unit, 'Holds');
      this.addLog(`${unit.name} stays standing for the tutorial sequence.`);
      return;
    }
    if (nextHp <= 0 && this.isTutorialEncounter() && this.getState().party.includes(unit)) {
      unit.hp = 1;
      unit.atb = Math.max(unit.atb || 0, 35);
      this.showDamagePopup(unit, '1 HP');
      this.addLog(`${unit.name} holds on for the tutorial.`);
      return;
    }
    if (nextHp <= 0 && hasStatus(unit, 'grit')) {
      unit.hp = 1;
      unit.atb = 100;
      unit.statuses = unit.statuses.filter((status) => status.name !== 'grit');
      this.applySkillStatus(unit, 'fatigue');
      this.showDamagePopup(unit, 'Grit');
      this.addLog(`${unit.name} refuses to fall.`);
      return;
    }
    if (nextHp <= 0 && this.getState().party.includes(unit) && hasSynergySurge(this.getPartySynergy(), 'frontier-survivors')) {
      unit.hp = 1;
      unit.atb = 100;
      this.applySkillStatus(unit, 'fatigue');
      this.showDamagePopup(unit, 'Last Stand');
      this.addLog(`${unit.name} finds Last Stand grit.`);
      return;
    }
    unit.hp = Math.max(0, nextHp);
    if (unit.hp <= 0) unit.intent = null;
  }

  shouldPreserveTutorialEnemy(unit, nextHp) {
    if (!this.isTutorialBattle() || unit?.id !== this.tutorialScript?.raiderId || nextHp > 0) return false;
    return ['surge', 'attack', 'skill-status', 'intent', 'charge'].includes(this.getTutorialStepKey());
  }

  getCoverDamage(attacker, action, missed = false) {
    const weapon = getWeapon(attacker);
    let damage = action.type === 'horse-action'
      ? action.horseAction.id === 'trample' ? 14 : 10
      : weapon.id === 'shotgun' ? 12
        : weapon.id === 'throwable' ? 14
          : weapon.id === 'rifle' ? 7
            : weapon.id === 'revolver' ? 5
              : 8;
    if (action.type === 'skill') damage += 3;
    if (attacker.riderStance === 'Sharpshooter' && weapon.id === 'rifle') damage += 2;
    if (hasEquippedTrait(attacker, 'Breacher') && weapon.id === 'shotgun') damage += 3;
    if (missed) damage = Math.max(2, Math.round(damage * 0.45));
    return damage;
  }

  damageCoverAt(grid, amount, attacker = null) {
    const cover = this.getCoverState(grid);
    if (!cover || amount <= 0) return false;
    const adjustedAmount = hasSynergySurge(this.getPartySynergy(), 'frontier-survivors') || hasSynergySurge(this.getPartySynergy(), 'trail-wardens')
      ? Math.max(1, Math.round(amount * 0.72))
      : amount;
    cover.hp = Math.max(0, cover.hp - adjustedAmount);
    this.refreshCoverVisuals();
    if (cover.hp > 0) {
      this.addLog(`${attacker?.name || 'Fire'} splinters cover (${cover.hp}/${cover.maxHp}).`);
      return false;
    }
    this.mapDef.elements[grid.y][grid.x] = null;
    this.elementLayer?.putTileAt?.(-1, grid.x, grid.y);
    this.clearCoverVisualsAt(grid);
    this.addLog(`${attacker?.name || 'Fire'} destroys cover.`);
    return true;
  }

  clearCoverVisualsAt(grid) {
    const key = this.gridKey(grid);
    this.coverDecor.get(key)?.destroy();
    this.coverDecor.delete(key);
    (this.coverMarkers.get(key) || []).forEach((object) => object.destroy?.());
    this.coverMarkers.delete(key);
    this.coverState.delete(key);
    this.refreshCoverVisuals();
  }

  executeCoverAttack(grid) {
    const state = this.getState();
    const rider = state.party[this.activeIndex];
    if (!rider || this.battleOver || !this.targetMode || !this.canTargetCover(rider, grid, this.targetMode)) return;
    const action = this.targetMode;
    const damage = this.getCoverDamage(rider, action, false);
    this.playActionSound(rider, action);
    this.clearMoveMode();
    this.clearTargetOverlay();
    this.commandMode = 'root';
    this.damageCoverAt(grid, damage, rider);
    rider.atb = action.type === 'horse-action' ? Math.min(100, action.horseAction.atbBonus || 0) : 0;
    this.worsenBleed(rider);
    this.addHorseBond(rider, action.type === 'horse-action' ? 2 : 0);
    this.activeIndex = null;
    if (this.isTutorialBattle() && this.getTutorialStepKey() === 'cover') this.completeTutorialStep('cover');
    this.buildCommandButtons();
    this.updateDynamicViews();
  }

  resolveEnemyDamage(target, baseAmount, enemy) {
    if (this.isTutorialEncounter()) baseAmount = Math.max(5, Math.round(baseAmount * 0.45));
    let damage = incomingDamage(target, baseAmount, this.mapDef, this.getPartySynergy());
    const terrain = terrainAt(this.mapDef, target.grid);
    const coverProtection = terrain.cover ? this.getCoverProtection(target.grid) : 0;
    if (terrain.cover && !isMounted(target) && coverProtection < 1) {
      damage = Math.max(1, Math.round(damage * (1 + (1 - coverProtection) * 0.35)));
    }
    if (isMounted(target) && target.horseStance === 'Defensive Guard' && Math.random() < 0.28) {
      damage = Math.max(1, Math.round(damage * 0.72));
      this.addLog(`${getHorse(target).name} shields ${target.name}.`);
    }
    this.applyDamage(target, damage);
    this.recordSurgeEvent('pressure', target, enemy, { exposed: !terrain.cover });
    if (terrain.cover) this.damageCoverAt(target.grid, enemy.id === 'rifleman' ? 7 : enemy.id === 'bruiser' ? 10 : 5, enemy);
    this.resolveHorseCounter(target, enemy);
    return damage;
  }

  resolveHorseCounter(target, enemy) {
    if (!enemy || enemy.hp <= 0 || !isMounted(target)) return;
    if (gridDistance(target.grid, enemy.grid) > 1) return;
    const chance = target.horseStance === 'Wild Frenzy' ? 0.38 : target.horseStance === 'Defensive Guard' ? 0.3 : 0.22;
    if (Math.random() > chance) return;
    const damage = 5 + Math.round(this.getHorseBond(target) / 20);
    this.applyDamage(enemy, damage);
    if (target.horseStance === 'Wild Frenzy') this.applySkillStatus(enemy, 'horse-panic');
    this.showCombatImpact(target, enemy, { kind: 'slam' });
    this.showDamagePopup(enemy, damage, 'Kick');
    this.addLog(`${getHorse(target).name} kicks back at ${enemy.name}.`);
  }

  worsenBleed(unit) {
    if (!hasStatus(unit, 'bleeding-out')) return;
    unit.hp = Math.max(1, unit.hp - 4);
    this.showDamagePopup(unit, 4, 'Bleed');
  }

  applyAfterBurstFatigue(unit) {
    if (!hasStatus(unit, 'showdown') && !hasStatus(unit, 'grit')) return;
    unit.statuses = unit.statuses.filter((status) => status.name !== 'showdown' && status.name !== 'grit');
    this.applySkillStatus(unit, 'fatigue');
  }

  showIntentPulse(enemy, intent) {
    if (!intent?.target) return;
    const from = gridToWorld(this.mapDef, enemy.grid);
    const to = gridToWorld(this.mapDef, intent.target.grid);
    const warning = this.add.graphics().setDepth(68);
    warning.lineStyle(5, palette.red, 0.82);
    warning.lineBetween(from.x, from.y - 24, to.x, to.y - 24);
    warning.fillStyle(palette.red, 0.12);
    this.getEnemyThreatArea(enemy, intent).forEach((grid) => {
      warning.fillRect(
        this.mapDef.origin.x + grid.x * this.mapDef.renderTileSize,
        this.mapDef.origin.y + grid.y * this.mapDef.renderTileSize,
        this.mapDef.renderTileSize,
        this.mapDef.renderTileSize,
      );
    });
    this.tweens.add({
      targets: warning,
      alpha: 0,
      duration: 520,
      ease: 'Cubic.easeOut',
      onComplete: () => warning.destroy(),
    });
  }

  showCombatImpact(attacker, target, { critical = false, missed = false, kind = 'attack' } = {}) {
    this.animateUnitAction(attacker, target, { critical, missed, kind });
    const start = gridToWorld(this.mapDef, attacker.grid);
    const end = gridToWorld(this.mapDef, target.grid);
    const effect = this.add.graphics().setDepth(72);
    const color = missed ? palette.pale : critical || kind === 'combo' || kind === 'slam' ? palette.yellow : palette.red;
    const shakeDuration = critical || kind === 'combo' || kind === 'slam' ? 150 : 80;
    const shakeIntensity = critical || kind === 'combo' || kind === 'slam' ? 0.006 : 0.003;
    this.cameras.main.shake(shakeDuration, shakeIntensity);
    effect.lineStyle(missed ? 2 : critical ? 6 : 4, color, missed ? 0.42 : 0.86);
    effect.lineBetween(start.x, start.y - 18, end.x, end.y - 18);
    effect.fillStyle(color, missed ? 0.1 : 0.22);
    effect.fillCircle(end.x, end.y - 10, critical || kind === 'combo' || kind === 'slam' ? 34 : 24);
    effect.lineStyle(2, palette.white, missed ? 0.22 : 0.48);
    effect.strokeCircle(end.x, end.y - 10, critical || kind === 'combo' || kind === 'slam' ? 42 : 30);
    this.tweens.add({
      targets: effect,
      alpha: 0,
      duration: missed ? 360 : 460,
      ease: 'Cubic.easeOut',
      onComplete: () => effect.destroy(),
    });
  }

  animateUnitAction(attacker, target, { critical = false, missed = false, kind = 'attack' } = {}) {
    const attackerView = this.unitViews.get(attacker);
    const targetView = this.unitViews.get(target);
    if (!attackerView?.anim || !targetView?.anim) return;
    const start = gridToWorld(this.mapDef, attacker.grid);
    const end = gridToWorld(this.mapDef, target.grid);
    const angle = Math.atan2(end.y - start.y, end.x - start.x);
    const lungeDistance = kind === 'charge' || kind === 'trample' || kind === 'combo' || kind === 'slam' ? 20 : 10;
    const recoilDistance = missed ? 3 : critical || kind === 'combo' || kind === 'slam' ? 14 : 8;

    this.tweens.killTweensOf(attackerView.anim);
    this.tweens.killTweensOf(targetView.anim);
    attackerView.anim.x = 0;
    attackerView.anim.y = 0;
    attackerView.anim.scale = 1;
    targetView.anim.x = 0;
    targetView.anim.y = 0;
    targetView.anim.scale = 1;

    this.tweens.add({
      targets: attackerView.anim,
      x: Math.cos(angle) * lungeDistance,
      y: Math.sin(angle) * lungeDistance - 2,
      scale: kind === 'charge' || kind === 'combo' ? 1.08 : 1.04,
      duration: 90,
      yoyo: true,
      ease: 'Cubic.easeOut',
      onComplete: () => {
        attackerView.anim.x = 0;
        attackerView.anim.y = 0;
        attackerView.anim.scale = 1;
      },
    });

    this.tweens.add({
      targets: targetView.anim,
      x: Math.cos(angle) * recoilDistance,
      y: Math.sin(angle) * recoilDistance + (missed ? 0 : -3),
      scale: missed ? 0.98 : 1.07,
      delay: 80,
      duration: critical ? 130 : 95,
      yoyo: true,
      ease: 'Back.easeOut',
      onStart: () => {
        if (!missed) targetView.sprite?.setTintFill?.(critical ? palette.yellow : palette.red);
      },
      onComplete: () => {
        targetView.anim.x = 0;
        targetView.anim.y = 0;
        targetView.anim.scale = 1;
        targetView.sprite?.clearTint?.();
      },
    });

  }

  showDamagePopup(unit, amount, tag = '') {
    const position = gridToWorld(this.mapDef, unit.grid);
    const label = tag ? `${amount} ${tag}` : `${amount}`;
    const text = this.add
      .text(position.x, position.y - 54, label, textStyle(18, '#fff8e7'))
      .setOrigin(0.5)
      .setDepth(80);
    text.setStroke('#120a04', 4);
    this.tweens.add({
      targets: text,
      y: text.y - 32,
      alpha: 0,
      duration: 850,
      ease: 'Cubic.easeOut',
      onComplete: () => text.destroy(),
    });
  }

  showShowdownFlash(rider, target) {
    const riderPosition = gridToWorld(this.mapDef, rider.grid);
    const targetPosition = gridToWorld(this.mapDef, target.grid);
    const flash = this.add.graphics().setDepth(70);
    flash.lineStyle(5, palette.yellow, 0.86);
    flash.lineBetween(riderPosition.x, riderPosition.y - 20, targetPosition.x, targetPosition.y - 20);
    flash.fillStyle(palette.yellow, 0.14);
    flash.fillRect(this.mapDef.origin.x, this.mapDef.origin.y, this.mapDef.renderTileSize * 8, this.mapDef.renderTileSize * 6);
    this.addLog('SHOWDOWN: every eye on the road turns to the duel.');
    this.tweens.add({
      targets: flash,
      alpha: 0,
      duration: 520,
      ease: 'Cubic.easeOut',
      onComplete: () => flash.destroy(),
    });
  }

  toggleMount() {
    const rider = this.getState().party[this.activeIndex];
    if (this.prepPhase) return;
    if (!rider || this.battleOver) return;
    this.clearMoveMode();
    this.commandMode = 'root';
    if (isMounted(rider) && hasStatus(rider, 'horse-panic')) {
      this.addLog(`${getHorse(rider).name} panics and refuses the command.`);
      rider.atb = 0;
      this.activeIndex = null;
      this.buildCommandButtons();
      this.updateDynamicViews();
      return;
    }
    if (!getHorse(rider)) {
      this.addLog(`${rider.name} has no horse assigned.`);
      rider.atb = 0;
      this.activeIndex = null;
      this.buildCommandButtons();
      this.updateDynamicViews();
      return;
    }
    rider.mounted = !rider.mounted;
    rider.atb = 0;
    this.playSfx(rider.mounted ? 'mount' : 'dismount');
    this.addLog(`${rider.name} ${rider.mounted ? 'mounts up' : 'dismounts for cover'}.`);
    if (this.isTutorialBattle()) {
      if (!rider.mounted && this.getTutorialStepKey() === 'dismount') {
        this.completeTutorialStep('dismount');
        this.updateDynamicViews();
        return;
      }
      if (rider.mounted && this.getTutorialStepKey() === 'mount') {
        this.completeTutorialStep('mount');
        this.updateDynamicViews();
        return;
      }
    }
    this.activeIndex = null;
    this.buildCommandButtons();
    this.updateDynamicViews();
  }

  chooseStance(stance) {
    const rider = this.getState().party[this.activeIndex];
    if (!rider || this.battleOver) return;
    this.clearMoveMode();
    this.commandMode = 'root';
    rider.riderStance = stance;
    this.playStanceSound(stance);
    const completedTutorialStance = this.isTutorialBattle() && this.getTutorialStepKey() === 'stance' && stance === 'Sharpshooter';
    this.recordSurgeEvent('stance', rider, null, { exposed: !terrainAt(this.mapDef, rider.grid).cover });
    if (this.prepPhase) {
      this.addLog(`${rider.name} prepares in ${rider.riderStance}.`);
      this.buildCommandButtons();
      this.updateDynamicViews();
      return;
    }
    rider.atb = 0;
    this.addLog(`${rider.name} shifts into ${rider.riderStance}.`);
    this.activeIndex = null;
    if (completedTutorialStance) this.completeTutorialStep('stance');
    this.buildCommandButtons();
    this.updateDynamicViews();
  }

  playStanceSound(stance) {
    const tones = {
      Gunslinger: 'revolver',
      Sharpshooter: 'rifle',
      Wrangler: 'melee',
      Outlaw: 'shotgun',
      'Iron Rider': 'button-battle',
    };
    this.playSfx(tones[stance] || 'button-battle');
    const voiceKey = stanceVoiceKeys[stance];
    if (voiceKey && this.sound.get(voiceKey)) this.sound.play(voiceKey, { volume: 0.9 * getAudioSettings().sfx });
    else this.speakStance(stance);
  }

  cycleActiveStance() {
    const rider = this.getState().party[this.activeIndex];
    if (!rider || this.battleOver) return;
    const next = riderStances[(riderStances.indexOf(rider.riderStance) + 1) % riderStances.length];
    this.chooseStance(next);
  }

  enemyAct(enemy) {
    const targets = this.getEnemyTargets();
    if (!targets.length) return;
    if (enemy.id === 'sapper') {
      this.sapperAct(enemy, targets);
      return;
    }
    if (enemy.id === 'scout') {
      this.scoutAct(enemy, targets);
      return;
    }
    if (enemy.id === 'bruiser') {
      this.bruiserAct(enemy, targets);
      return;
    }
    if (enemy.id === 'rifleman') {
      this.riflemanAct(enemy, targets);
      return;
    }
    this.raiderAct(enemy, targets);
  }

  getEnemyTargets() {
    return this.objectiveUnit?.hp > 0
      ? [this.objectiveUnit, ...living(this.getState().party)]
      : living(this.getState().party);
  }

  raiderAct(enemy, targets) {
    const target = this.getEnemyAttackThreat(enemy)?.target;
    if (!target) {
      this.enemyAdvance(enemy, targets);
      enemy.atb = 20;
      return;
    }
    const damage = this.resolveEnemyDamage(target, 11 + this.getState().wanted * 2, enemy);
    this.applySkillStatus(target, 'dust-choked');
    enemy.atb = 0;
    this.getState().showdown = Math.min(100, this.getState().showdown + 5);
    this.playSfx('revolver');
    this.showCombatImpact(enemy, target, { kind: 'dust' });
    this.showDamagePopup(target, damage, 'Dust');
    this.addLog(`${enemy.name} fans dust into ${target.name} for ${damage}.`);
  }

  scoutAct(enemy, targets) {
    const target = this.getEnemyAttackThreat(enemy)?.target;
    if (!target) {
      this.enemyAdvance(enemy, targets);
      enemy.atb = 18;
      return;
    }
    const damage = this.resolveEnemyDamage(target, 9 + this.getState().wanted * 2, enemy);
    enemy.atb = 0;
    this.playSfx('revolver');
    this.showCombatImpact(enemy, target, { kind: 'dust' });
    this.showDamagePopup(target, damage, 'Hit');
    this.addLog(`${enemy.name} harasses ${target.name} for ${damage}.`);
  }

  sapperAct(enemy, targets) {
    const target = this.getEnemyAttackThreat(enemy)?.target;
    if (!target) {
      this.enemyAdvance(enemy, targets);
      enemy.atb = 18;
      return;
    }
    const damage = this.resolveEnemyDamage(target, target.objective === 'wagon' ? 20 + this.getState().wanted * 2 : 13 + this.getState().wanted * 2, enemy);
    enemy.atb = 0;
    this.playSfx('throwable');
    this.showCombatImpact(enemy, target, { kind: 'blast', critical: target.objective === 'wagon' });
    this.showDamagePopup(target, damage, 'Blast');
    this.addLog(`${enemy.name} blasts ${target.name} for ${damage}.`);
  }

  riflemanAct(enemy, targets) {
    const target = this.getEnemyAttackThreat(enemy)?.target;
    if (!target) {
      enemy.atb = 35;
      this.addLog(`${enemy.name} holds fire for a clear shot.`);
      return;
    }
    const terrain = terrainAt(this.mapDef, enemy.grid);
    const laneBonus = getLane(enemy) === 'Back' ? 4 : 0;
    const damage = this.resolveEnemyDamage(target, 14 + laneBonus + terrain.elevation * 3 + this.getState().wanted * 2, enemy);
    this.applySkillStatus(target, 'bleeding-out');
    enemy.atb = 0;
    this.getState().showdown = Math.min(100, this.getState().showdown + 5);
    this.playSfx('rifle');
    this.showCombatImpact(enemy, target, { kind: 'rifle' });
    this.showDamagePopup(target, damage, 'Bleed');
    this.addLog(`${enemy.name} lines up ${target.name} for ${damage}.`);
  }

  bruiserAct(enemy, targets) {
    const adjacent = this.getEnemyAttackThreat(enemy)?.target;
    if (!adjacent) {
      this.enemyAdvance(enemy, targets);
      enemy.atb = 20;
      return;
    }
    const damage = this.resolveEnemyDamage(adjacent, 18 + this.getState().wanted * 2, enemy);
    this.applySkillStatus(adjacent, 'horse-panic');
    enemy.atb = 0;
    this.playSfx('melee');
    this.showCombatImpact(enemy, adjacent, { kind: 'slam', critical: true });
    this.showDamagePopup(adjacent, damage, 'Panic');
    this.addLog(`${enemy.name} slams ${adjacent.name} for ${damage}.`);
  }

  enemyAdvance(enemy, targets) {
    const target = this.objectiveUnit?.hp > 0 ? this.objectiveUnit : this.getClosestTarget(enemy, targets);
    if (!target) return;
    const options = this.getEnemyAdvanceOptions(enemy, target);
    const next = options.sort((a, b) => gridDistance(a, target.grid) - gridDistance(b, target.grid))[0];
    if (!next) return;
    enemy.grid = next;
    this.addLog(`${enemy.name} advances through ${terrainAt(this.mapDef, next).label}.`);
  }

  getClosestTarget(enemy, targets = living(this.getState().party)) {
    return [...targets].sort((a, b) => gridDistance(enemy.grid, a.grid) - gridDistance(enemy.grid, b.grid))[0];
  }

  getEnemyAdvanceOptions(enemy, target) {
    const currentDistance = gridDistance(enemy.grid, target.grid);
    return [
      { x: enemy.grid.x + 1, y: enemy.grid.y },
      { x: enemy.grid.x - 1, y: enemy.grid.y },
      { x: enemy.grid.x, y: enemy.grid.y + 1 },
      { x: enemy.grid.x, y: enemy.grid.y - 1 },
    ].filter((grid) => {
      if (!isInBounds(this.mapDef, grid)) return false;
      if (gridDistance(grid, target.grid) >= currentDistance) return false;
      if (this.getAllUnits().some((unit) => unit !== enemy && unit.hp > 0 && unit.grid.x === grid.x && unit.grid.y === grid.y)) return false;
      const terrain = terrainAt(this.mapDef, grid);
      return terrain.movementCost <= 1 && !terrain.hazardDamage;
    });
  }

  pickEnemyTarget(targets, enemy, range = 6, requireLineOfSight = false) {
    const candidates = targets.filter((target) => {
      if (gridDistance(enemy.grid, target.grid) > range) return false;
      return !requireLineOfSight || this.hasLineOfSight(enemy.grid, target.grid);
    });
    return [...candidates].sort((a, b) => this.targetScore(b, enemy) - this.targetScore(a, enemy))[0];
  }

  targetScore(target, enemy) {
    const terrain = terrainAt(this.mapDef, target.grid);
    const lane = getLane(target);
    let score = 100 - Math.round((target.hp / target.maxHp) * 100);
    if (target.objective === 'wagon') score += 120;
    if (hasStatus(target, 'wanted')) score += 45;
    if (hasStatus(target, 'showdown')) score += 22;
    if (isMounted(target)) score += 8;
    if (lane === 'Front') score += 12;
    if (lane === 'Back') score -= 8;
    if (!isMounted(target) && terrain.cover) score -= 18;
    if (terrain.elevation < 0) score += 10;
    if (enemy.id === 'rifleman' && terrain.cover) score -= 16;
    if (enemy.id === 'bruiser' && isMounted(target)) score += 16;
    score -= gridDistance(target.grid, enemy.grid) * 2;
    return score;
  }

  checkEnd() {
    const state = this.getState();
    if (!living(this.enemies).length) {
      this.battleOver = true;
      if (this.encounter.id === 'tutorialDustup') {
        state.tutorial ||= {};
        state.tutorial.battleComplete = true;
        state.tutorial.townComplete = state.tutorial.skipped ? true : false;
        if (state.tutorial.skipped) state.tutorial.partyMenusComplete = true;
        state.tutorial.active = false;
        state.nextEncounterId = null;
        state.routeProgress = 0;
        state.party.forEach((rider) => {
          rider.atb = 0;
          this.addHorseBond(rider, 3);
        });
        this.addLog('Tutorial dustup cleared. The crew rides into town.');
        this.updateDynamicViews();
        this.time.delayedCall(1300, () => this.scene.start(scenes.HUB));
        return;
      }
      state.items ||= { bandage: 0, canteen: 0, whiskey: 0 };
      state.capturedBounties ||= [];
      const bounty = this.getActiveBounty();
      const completedBounty = Boolean(this.encounter.bountyId && bounty);
      const allStanding = living(state.party).length === state.party.length;
      const cash = this.getFightCashReward(completedBounty);
      const loot = this.getBattleLoot(completedBounty);
      state.money += cash;
      this.applyBattleLoot(state, loot);
      if (completedBounty) {
        const target = this.enemies.find((enemy) => enemy.bountyTarget) || this.enemies.find((enemy) => enemy.id === bounty.targetEnemyId);
        const reward = bounty.baseReward + (allStanding ? bounty.bonusReward : 0) + state.wanted * 10;
        if (!state.capturedBounties.some((entry) => entry.id === bounty.id)) {
          state.capturedBounties.push({
            id: bounty.id,
            name: bounty.targetName || target?.name || bounty.name,
            reward,
          });
        }
        state.bountyActive = false;
        state.activeBountyId = null;
      }
      state.wanted = Math.max(0, state.wanted - 1);
      state.routeProgress = 0;
      state.party.forEach((rider) => {
        rider.atb = 0;
        this.addHorseBond(rider, 4);
      });
      const lootText = this.describeBattleLoot(loot);
      if (completedBounty) this.addLog(`Captured ${bounty.targetName}. Turn them in at the Sheriff Station.`);
      this.addLog(`Fight spoils: $${cash}${lootText ? `, ${lootText}` : ''}.`);
      this.saveCurrentProgress();
      this.updateDynamicViews();
      this.time.delayedCall(1300, () => this.scene.start(scenes.HUB));
    } else if (!living(state.party).length || (this.objectiveUnit && this.objectiveUnit.hp <= 0)) {
      this.battleOver = true;
      this.addLog(this.objectiveUnit?.hp <= 0 ? 'The wagon is destroyed. Press R to retry, or return to town.' : 'The crew is routed. Press R to retry, or return to town.');
      this.updateDynamicViews();
      this.drawEndButtons('Defeat');
    }
  }

  getFightCashReward(completedBounty = false) {
    const state = this.getState();
    const wantedBonus = Math.max(0, state.wanted || 0) * 3;
    const base = completedBounty ? 24 : 34;
    const spread = completedBounty ? 16 : 22;
    return base + Math.floor(Math.random() * spread) + wantedBonus;
  }

  getBattleLoot(completedBounty = false) {
    const loot = { bandage: 0, canteen: 0, whiskey: 0 };
    const pool = completedBounty
      ? ['bandage', 'bandage', 'canteen', 'whiskey']
      : ['bandage', 'canteen', 'canteen', 'whiskey'];
    const rolls = 1 + (Math.random() < 0.45 ? 1 : 0) + (completedBounty && Math.random() < 0.35 ? 1 : 0);
    for (let roll = 0; roll < rolls; roll += 1) {
      const id = pool[Math.floor(Math.random() * pool.length)];
      loot[id] += 1;
    }
    return Object.fromEntries(Object.entries(loot).filter(([, amount]) => amount > 0));
  }

  applyBattleLoot(state, loot) {
    Object.entries(loot).forEach(([id, amount]) => {
      state.items[id] = (state.items[id] || 0) + amount;
    });
  }

  describeBattleLoot(loot) {
    return Object.entries(loot)
      .map(([id, amount]) => `${amount} ${itemCatalog[id]?.name || id}`)
      .join(', ');
  }

  drawEndButtons(title) {
    this.endButtons.forEach((object) => object.destroy());
    this.endButtons = [];
    const backdrop = this.add.rectangle(0, 0, 960, 720, palette.shadow, 0.5).setOrigin(0).setDepth(190);
    const panel = drawPanel(this, 300, 238, 360, 180, 0.98).setDepth(191);
    const titleText = this.add.text(480, 264, title, titleStyle(28)).setOrigin(0.5, 0).setDepth(192);
    const bodyText = this.add.text(480, 306, 'The crew is routed. Press R for an instant retry, or return to town to recover.', {
      ...textStyle(13, '#e2d9bd'),
      align: 'center',
      wordWrap: { width: 292 },
      lineSpacing: 4,
    }).setOrigin(0.5, 0).setDepth(192);
    const retry = drawButton(this, 342, 360, 126, 'Retry', () => this.quickRetry(), true);
    const town = drawButton(this, 492, 360, 126, 'Town', () => this.returnToTownAfterDefeat());
    [...retry, ...town].forEach((object) => object.setDepth?.(192));
    this.endButtons.push(backdrop, panel, titleText, bodyText, ...retry, ...town);
  }

  returnToTownAfterDefeat() {
    const state = this.getState();
    state.money = Math.max(0, state.money - 40);
    state.supplies = Math.max(0, state.supplies - 2);
    state.party.forEach((rider) => {
      rider.hp = Math.ceil(rider.maxHp * 0.45);
      rider.atb = 0;
      rider.statuses = [];
    });
    this.scene.start(scenes.HUB);
  }
}
