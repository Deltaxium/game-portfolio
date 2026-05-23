import { enemySpriteKeys, horseSpriteKeys, partySpriteKeys } from '../assets/sprites/index.js';
import { desertTileset } from '../assets/tiles/free-desert/index.js';
import { bountyContracts, itemCatalog, palette, riderStances, scenes } from '../config/gameData.js';
import { createElementTilemapData, createTilemapData, generateBattleMap } from '../maps/battleMaps.js';
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
import { getPartySynergy as computePartySynergy } from '../systems/synergy.js';
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
    this.mapDef = generateBattleMap();
    this.coverState = this.createCoverState();
    const encounterId = state.nextEncounterId || 'redSashAmbush';
    this.encounter = createEncounter(encounterId, state.wanted);
    state.nextEncounterId = null;
    this.enemies = this.encounter.enemies;
    this.prepPhase = true;
    this.paused = false;
    this.pauseObjects = [];
    this.tutorialObjects = [];
    this.tutorialStep = 0;
    this.tutorialKey = '';
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
    this.lastTick = this.time.now;
    this.heatClock = 0;
    this.statusClock = 0;
    this.battleSpeed = 1.35;
    this.unitViews = new Map();
    this.partyHud = [];
    this.logTexts = [];
    this.endButtons = [];
    this.moveCostTexts = [];

    this.buildStaticScene();
    this.updateDynamicViews();
    this.drawBattleTutorial();
  }

  update(time) {
    if (this.battleOver || this.paused) return;
    if (this.prepPhase) return;
    const delta = Math.min(0.08, ((time - this.lastTick) / 1000) * this.battleSpeed);
    this.lastTick = time;
    const state = this.getState();
    const reactionScale = this.activeIndex === null ? 1 : 0.32;
    const enemyDelta = delta * reactionScale;

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
      enemy.atb = Math.min(100, enemy.atb + enemySpeed(enemy) * enemyDelta);
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
    return cover ? Math.max(0.25, cover.hp / cover.maxHp) : 0;
  }

  buildUnitLayer() {
    const units = sortUnitsForDraw([...this.enemies, ...this.getState().party]);
    units.forEach((unit) => {
      const isEnemy = this.enemies.includes(unit);
      const position = gridToWorld(this.mapDef, unit.grid);
      const horseSprite = isEnemy ? null : this.add.image(position.x + 10, position.y + 2, this.getHorseSpriteKey(unit)).setDepth(9 + unit.grid.y);
      const sprite = this.add.image(position.x, position.y, this.getUnitTextureKey(unit, isEnemy)).setDepth(10 + unit.grid.y);
      const activeGlow = isEnemy
        ? null
        : this.add.ellipse(position.x, position.y + 18, 62, 24, palette.yellow, 0.16).setStrokeStyle(2, palette.yellow, 0.36).setVisible(false).setDepth(7 + unit.grid.y);
      const activeMarker = isEnemy
        ? null
        : this.add.triangle(position.x, position.y - 58, 0, 0, 22, 0, 11, 18, palette.yellow, 0.94).setStrokeStyle(2, palette.shadow, 0.9).setVisible(false).setDepth(23 + unit.grid.y);
      const readinessRing = this.add.circle(position.x, position.y, 34).setStrokeStyle(0, palette.yellow, 0).setVisible(false).setDepth(8 + unit.grid.y);
      const label = isEnemy
        ? null
        : this.add
            .text(position.x, position.y + 34, unit.short || unit.name.split(' ')[0], labelStyle(10, '#fff8e7'))
            .setOrigin(0.5)
            .setDepth(20 + unit.grid.y);
      const nameplate = isEnemy ? this.createEnemyNameplate(position.x, position.y, unit) : null;
      this.unitViews.set(unit, { horseSprite, sprite, activeGlow, activeMarker, readinessRing, label, nameplate, isEnemy });
    });
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

  buildHud() {
    drawPanel(this, 552, 106, 370, 602);
    this.add.text(574, 126, 'Battle Desk', titleStyle(21));

    this.synergyBand = this.add.rectangle(574, 156, 326, 34, palette.leather, 0.78).setOrigin(0);
    this.synergyBand.setStrokeStyle(2, palette.yellow, 0.42);
    this.add.text(586, 162, 'POSSE', labelStyle(8, '#f5df9b'));
    this.synergyText = this.add.text(638, 158, '', labelStyle(14, '#fff8e7'));
    this.synergyDetail = this.add.text(638, 176, '', { ...textStyle(8, '#d8c7a0'), wordWrap: { width: 244 } });

    this.add.text(574, 204, 'Crew', labelStyle(10, '#f5df9b'));

    this.getState().party.forEach((_, index) => {
      const y = 224 + index * 64;
      const rowBg = this.add.rectangle(568, y - 8, 338, 58, palette.shadow, 0.18).setOrigin(0);
      rowBg.setStrokeStyle(1, palette.pale, 0.14);
      this.partyHud[index] = {
        rowBg,
        statusBadges: [],
        name: this.add.text(578, y - 2, '', labelStyle(13, '#fff8e7')),
        lane: this.add.text(578, y + 16, '', textStyle(8, '#d8c7a0')),
        mount: this.add.text(852, y - 2, '', labelStyle(9, '#241914')).setOrigin(1, 0),
        hpText: this.add.text(578, y + 34, '', labelStyle(9, '#bff0a7')),
        atbText: this.add.text(744, y + 34, '', labelStyle(9, '#f5df9b')),
        hpFill: this.createMeter(620, y + 36, 104, palette.green, 11),
        atbFill: this.createMeter(790, y + 36, 76, palette.yellow, 11),
      };
    });

    this.add.text(574, 416, 'Field Intel', labelStyle(10, '#f5df9b'));
    this.inspectTitle = this.add.text(588, 434, 'Inspector', labelStyle(14, '#fff8e7'));
    this.fieldIntelTexts = [];
    for (let index = 0; index < 6; index += 1) {
      this.fieldIntelTexts.push(
        this.add.text(588, 456 + index * 13, '', {
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
      { label: 'Horse', action: () => this.setCommandMode('horse'), primary: false, tone: 'move' },
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
        {
          label: 'Back',
          action: () => this.setCommandMode('root'),
          primary: false,
          tone: 'default',
        },
      ];
      slots = this.commandButtonSlots;
    }

    entries.forEach((entry, index) => {
      const slot = slots[index];
      if (!slot) return;
      this.commandButtons.push(...drawButton(this, slot.x, slot.y, slot.width, entry.label, entry.action, entry.primary, entry.tone));
    });
  }

  beginBattle() {
    this.prepPhase = false;
    this.activeIndex = null;
    this.commandMode = 'root';
    this.lastTick = this.time.now;
    this.getState().party.forEach((rider) => {
      rider.atb = Math.min(rider.atb || 0, 60);
    });
    this.addLog('Preparation complete. ATB begins.');
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
      this.logTexts.push(this.add.text(54, 552 + index * 20, '', {
        ...textStyle(9, '#e2d9bd'),
        wordWrap: { width: 440 },
      }));
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
    this.updateUnitViews();
    this.updateHud();
    this.drawBattleTutorial();
  }

  isTutorialBattle() {
    return this.encounter.id === 'tutorialDustup' && !this.battleTutorialClosed;
  }

  getBattleTutorialTip() {
    if (this.prepPhase) {
      return {
        key: 'prep',
        title: 'Preparation',
        body: 'Battle is paused. Use Items or Stance, cycle riders, then press Begin when ready.',
        point: { x: 625, y: 598 },
      };
    }
    const intentEnemy = this.enemies.find((enemy) => enemy.hp > 0 && enemy.intent);
    if (intentEnemy) {
      const point = gridToWorld(this.mapDef, intentEnemy.grid);
      return {
        key: 'intent',
        title: 'Enemy Intent',
        body: 'Enemies do not fire instantly. Red intent shows who is about to act and who is threatened.',
        point: { x: point.x, y: point.y - 48 },
      };
    }
    if (this.targetMode) {
      return {
        key: 'targeting',
        title: 'Target Preview',
        body: 'Choose a highlighted target. The preview shows damage, hit, crit, status, cover, and range.',
        point: { x: 322, y: 284 },
      };
    }
    if (this.activeIndex !== null) {
      return {
        key: 'ready',
        title: 'Ready Rider',
        body: 'A rider is ready. Pick an action from the Battle Desk while time is slowed.',
        point: { x: 735, y: 608 },
      };
    }
    return {
      key: 'atb',
      title: 'ATB Flow',
      body: 'Bars fill in real time. Allies wait for commands; enemies prepare visible intent.',
      point: { x: 835, y: 260 },
    };
  }

  drawBattleTutorial() {
    if (!this.isTutorialBattle()) return;
    const tip = this.getBattleTutorialTip();
    if (!tip || this.dismissedTutorialKeys.has(tip.key)) {
      if (this.tutorialKey) {
        this.tutorialObjects.forEach((object) => object.destroy());
        this.tutorialObjects = [];
        this.tutorialKey = '';
      }
      return;
    }
    if (this.tutorialKey === tip.key) return;
    this.tutorialObjects.forEach((object) => object.destroy());
    this.tutorialObjects = [];
    this.tutorialKey = tip.key;
    const existing = new Set(this.children.list);
    const panelX = 42;
    const panelY = 106;
    const panelW = 340;
    const panelH = 154;
    drawPanel(this, panelX, panelY, panelW, panelH, 0.94).setDepth(210);
    this.add.text(panelX + 20, panelY + 18, tip.title, titleStyle(18)).setDepth(211);
    this.add.text(panelX + 20, panelY + 50, tip.body, { ...textStyle(10, '#fff1bf'), wordWrap: { width: 292 }, lineSpacing: 2 }).setDepth(211);
    const arrow = this.add.graphics().setDepth(211);
    arrow.lineStyle(3, palette.yellow, 0.86);
    arrow.lineBetween(panelX + panelW - 28, panelY + panelH / 2, tip.point.x, tip.point.y);
    arrow.fillStyle(palette.yellow, 0.9);
    arrow.fillTriangle(tip.point.x, tip.point.y, tip.point.x - 8, tip.point.y - 5, tip.point.x - 5, tip.point.y + 8);
    const next = drawButton(this, panelX + 202, panelY + 102, 112, 'Got It', () => this.dismissBattleTutorialTip(), true, 'support');
    const skip = drawButton(this, panelX + 30, panelY + 102, 96, 'Skip', () => this.closeBattleTutorial(), false, 'default');
    [...next, ...skip].forEach((object) => object.setDepth?.(212));
    this.tutorialObjects = this.children.list.filter((object) => !existing.has(object));
  }

  dismissBattleTutorialTip() {
    if (this.tutorialKey) this.dismissedTutorialKeys.add(this.tutorialKey);
    this.tutorialObjects.forEach((object) => object.destroy());
    this.tutorialObjects = [];
    this.tutorialKey = '';
  }

  closeBattleTutorial() {
    this.battleTutorialClosed = true;
    this.tutorialKey = '';
    this.tutorialObjects.forEach((object) => object.destroy());
    this.tutorialObjects = [];
  }

  updateStatsText() {
    const state = this.getState();
    this.statsText.setText(
      [`Money $${state.money}`, `Wanted ${state.wanted}`, `Supplies ${state.supplies}`, `Showdown ${Math.round(state.showdown)}%`].join('   '),
    );
  }

  getPartySynergy() {
    return this.preparedSynergy;
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
      const activeAlly = !view.isEnemy && this.getState().party[this.activeIndex] === unit;
      const enemySoon = view.isEnemy && (unit.atb >= 78 || unit.intent);
      const enemyReady = view.isEnemy && (unit.atb >= 96 || unit.intent);
      const activePulse = 0.82 + Math.sin(this.time.now / 180) * 0.12;
      view.readinessRing
        .setVisible(enemySoon)
        .setPosition(position.x, position.y)
        .setRadius(35)
        .setStrokeStyle(enemyReady ? 5 : 3, palette.red, enemyReady ? 0.9 : 0.58)
        .setDepth(8 + unit.grid.y);
      view.activeGlow
        ?.setVisible(activeAlly)
        .setPosition(position.x, position.y + (mounted ? 20 : 18))
        .setDisplaySize(mounted ? 86 : 58, mounted ? 30 : 24)
        .setFillStyle(palette.yellow, activeAlly ? 0.12 + activePulse * 0.08 : 0)
        .setStrokeStyle(2, palette.yellow, activeAlly ? 0.28 + activePulse * 0.18 : 0)
        .setDepth(7 + unit.grid.y);
      view.activeMarker
        ?.setVisible(activeAlly)
        .setPosition(position.x, position.y - (mounted ? 66 : 58) + Math.sin(this.time.now / 220) * 3)
        .setAlpha(activeAlly ? activePulse : 0)
        .setDepth(23 + unit.grid.y);
      view.horseSprite
        ?.setVisible(mounted)
        .setTexture(this.getHorseSpriteKey(unit))
        .setPosition(position.x + 14, position.y + 4)
        .setDisplaySize(74, 50)
        .setDepth(9 + unit.grid.y);
      view.sprite
        .setTexture(this.getUnitTextureKey(unit, view.isEnemy))
        .setPosition(position.x + (mounted && !view.isEnemy ? -16 : 0), position.y + (mounted && !view.isEnemy ? -14 : 0))
        .setDisplaySize(mounted && !view.isEnemy ? 48 : mounted ? 76 : 54, mounted && !view.isEnemy ? 48 : mounted ? 60 : 54)
        .setDepth(10 + unit.grid.y);
      view.label
        ?.setPosition(position.x, position.y + 34)
        .setDepth(20 + unit.grid.y)
        .setText(unit.short || unit.name.split(' ')[0]);
      if (view.nameplate) {
        view.nameplate.group.setPosition(position.x, position.y + 42).setDepth(24 + unit.grid.y);
        view.nameplate.hpFill.width = 68 * Math.max(0, Math.min(1, unit.hp / unit.maxHp));
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
    this.synergyText.setText(synergy.name);
    this.synergyDetail.setText(this.truncateText(synergy.description, 54));
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
      hud.lane.setText(`${weapon.name} | ${lane}`);
      hud.mount.setText(isMounted(rider) ? 'MOUNTED' : 'ON FOOT');
      hud.mount.setColor(isMounted(rider) ? '#f5df9b' : '#d8c7a0');
      this.renderStatusBadges(rider, 812, hud.name.y + 19, hud.statusBadges, 2);
      hud.hpText.setText(`HP ${rider.hp}/${rider.maxHp}`);
      hud.atbText.setText(`ATB ${Math.round(rider.atb)}%`);
      hud.hpFill.setFillStyle(wounded ? palette.red : palette.green, 1);
      hud.atbFill.setFillStyle(rider.atb >= 100 ? palette.white : palette.yellow, 1);
      hud.hpFill.width = 104 * Math.max(0, Math.min(1, rider.hp / rider.maxHp));
      hud.atbFill.width = 76 * Math.max(0, Math.min(1, rider.atb / 100));
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
    this.logTexts.forEach((text, index) => text.setText(this.log[index] || ''));
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
    const panel = this.add.rectangle(480, 336, 312, 112, palette.leather, 0.96).setDepth(301).setStrokeStyle(3, palette.pale, 0.62);
    const title = this.add.text(480, 310, 'PAUSED', titleStyle(34, '#fff8e7')).setOrigin(0.5).setDepth(302);
    const hint = this.add.text(480, 356, 'Press Escape to resume', labelStyle(12, '#f5df9b')).setOrigin(0.5).setDepth(302);
    this.pauseObjects = [blocker, panel, title, hint];
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
    return this.getState().party.find((rider) => rider.hp > 0 && rider.grid.x === grid.x && rider.grid.y === grid.y);
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
      this.setFieldIntel(
        enemy.name,
        [
          `HP ${enemy.hp}/${enemy.maxHp}`,
          `ATB ${Math.round(enemy.atb)}%`,
          intent.short.includes('Hold') ? 'HOLDING FIRE' : `DANGER: ${intent.short.toUpperCase()}`,
          intent.target ? `TARGET: ${intent.target.name}` : '',
          `Status: ${statuses}`,
          ...preview.slice(0, 2),
        ],
      );
      return;
    }

    if (item.type === 'ally') {
      const ally = item.ally;
      const horse = getHorse(ally);
      const weapon = getWeapon(ally);
      const statuses = this.describeStatuses(ally);
      this.setFieldIntel(
        ally.name,
        [
          `HP ${ally.hp}/${ally.maxHp}`,
          `ATB ${Math.round(ally.atb)}%`,
          `${isMounted(ally) ? 'MOUNTED' : 'ON FOOT'} | ${weapon.name}`,
          `${getLane(ally)} lane`,
          statuses || 'Status: None',
        ],
      );
      return;
    }

    this.setFieldIntel(
      item.terrain.label,
      [
        `Lane: ${this.describeLaneAt(item.grid)}`,
        item.terrain.cover ? `Cover: ${this.getCoverState(item.grid)?.hp || 0}/${this.coverState.get(this.gridKey(item.grid))?.maxHp || 0}` : '',
        item.terrain.cover ? `Protection: ${Math.round(this.getCoverProtection(item.grid) * 100)}%` : '',
        item.terrain.elevation ? (item.terrain.elevation > 0 ? 'HIGH GROUND' : 'LOW GROUND') : '',
        `MOVE COST: ${item.terrain.movementCost}`,
        item.terrain.hazardDamage ? `HAZARD ${item.terrain.hazardDamage}` : '',
        item.terrain.mountedSlow ? 'MOUNTS SLOWED' : '',
      ],
    );
  }

  setFieldIntel(title, lines) {
    this.inspectTitle.setText(title);
    const compactLines = lines.filter(Boolean).flatMap((line) => line.toString().split('\n')).slice(0, this.fieldIntelTexts.length);
    this.fieldIntelTexts.forEach((text, index) => {
      const value = compactLines[index] || '';
      text.setText(value ? this.truncateText(value, 46) : '');
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
    const bounty = this.getActiveBounty();
    if (!bounty) return ['Select unit', 'Select tile', 'Red = danger'];
    const target = this.enemies.find((enemy) => enemy.id === bounty.targetEnemyId);
    const targetState = target?.hp > 0 ? `Target HP ${target.hp}/${target.maxHp}` : 'Target down';
    return [`Bounty: ${bounty.name}`, `Target: ${bounty.targetName}`, targetState, `Bonus: ${bounty.optional}`];
  }

  describeLaneAt(grid) {
    const allyLane = getLane({ side: 'ally', grid });
    const enemyLane = getLane({ side: 'enemy', grid });
    return allyLane === enemyLane ? allyLane : `Crew ${allyLane} / Enemy ${enemyLane}`;
  }

  getAllUnits() {
    return [...this.enemies, ...this.getState().party];
  }

  startMoveMode() {
    const rider = this.getState().party[this.activeIndex];
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
    this.moveOverlay.fillStyle(palette.green, 0.22);
    this.moveOverlay.lineStyle(2, palette.green, 0.72);
    this.reachableTiles.forEach((grid) => {
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
    this.targetOverlay.clear();
    if (!this.targetMode) return;
    const rider = this.getState().party[this.activeIndex];
    if (!rider) return;
    const origin = gridToWorld(this.mapDef, rider.grid);
    this.targetOverlay.fillStyle(palette.red, 0.09);
    this.targetOverlay.lineStyle(1, palette.red, 0.28);
    this.getActionRangeCells(rider, this.targetMode).forEach((grid) => {
      const x = this.mapDef.origin.x + grid.x * this.mapDef.renderTileSize;
      const y = this.mapDef.origin.y + grid.y * this.mapDef.renderTileSize;
      this.targetOverlay.fillRect(x, y, this.mapDef.renderTileSize, this.mapDef.renderTileSize);
      this.targetOverlay.strokeRect(x + 8, y + 8, this.mapDef.renderTileSize - 16, this.mapDef.renderTileSize - 16);
    });
    this.coverState.forEach((cover, key) => {
      if (cover.hp <= 0) return;
      const [coverX, coverY] = key.split(',').map(Number);
      const grid = { x: coverX, y: coverY };
      if (!this.canTargetCover(rider, grid, this.targetMode)) return;
      const x = this.mapDef.origin.x + coverX * this.mapDef.renderTileSize;
      const y = this.mapDef.origin.y + coverY * this.mapDef.renderTileSize;
      this.targetOverlay.fillStyle(palette.yellow, 0.13);
      this.targetOverlay.fillRect(x + 10, y + 10, this.mapDef.renderTileSize - 20, this.mapDef.renderTileSize - 20);
      this.targetOverlay.lineStyle(2, palette.yellow, 0.72);
      this.targetOverlay.strokeRect(x + 12, y + 12, this.mapDef.renderTileSize - 24, this.mapDef.renderTileSize - 24);
    });
    living(this.enemies).forEach((enemy) => {
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
        this.targetOverlay.fillStyle(palette.red, 0.16);
        this.targetOverlay.fillRect(areaX, areaY, this.mapDef.renderTileSize, this.mapDef.renderTileSize);
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
    const hit = action.type === 'combo'
      ? 100
      : Math.max(35, Math.min(100, 82 + highGroundBonus + stanceBonus + showdownBonus - Math.round(coverPenalty * coverProtection) - rangePenalty - elevationPenalty - dustPenalty - panicPenalty + (action.type === 'horse-action' ? 4 : 0)));
    const critBase = weapon.id === 'rifle' ? 14 : weapon.id === 'revolver' ? 12 : weapon.id === 'shotgun' && distance <= 2 ? 13 : 8;
    const crit = Math.max(0, Math.min(55, critBase + (hasStatus(rider, 'showdown') ? 18 : 0) + (targetTerrain.cover ? -4 : 0) - uphillShotgunPenalty * 3));
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
    const targets = living(this.getState().party);
    if (!targets.length) return { short: 'Done', detail: 'No living targets.' };
    if (enemy.id === 'rifleman') return { short: 'Hold Fire', detail: 'Hold ATB for a clear rifle line.' };
    const closest = this.getClosestTarget(enemy, targets);
    return { short: 'Advance', detail: `Advance toward ${closest.name}.` };
  }

  getEnemyAttackThreat(enemy) {
    const targets = living(this.getState().party);
    if (!targets.length) return null;
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
  }

  handleMapClick(worldX, worldY) {
    if (this.paused) return;
    const grid = worldToGrid(this.mapDef, worldX, worldY);
    if (!isInBounds(this.mapDef, grid)) return;
    if (this.targetMode && !this.battleOver) {
      const target = this.getUnitAtGrid(grid);
      const rider = this.getState().party[this.activeIndex];
      if (!target && this.canTargetCover(rider, grid, this.targetMode)) {
        this.executeCoverAttack(grid);
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
      this.selectTile(grid);
      return;
    }

    const rider = this.getState().party[this.activeIndex];
    if (!rider) return;
    const canMove = this.reachableTiles.some((tile) => tile.x === grid.x && tile.y === grid.y);
    if (!canMove) {
      this.addLog('That tile is out of movement range or occupied.');
      this.updateDynamicViews();
      return;
    }

    const atbCost = this.getRepositionAtbCost(rider, grid);
    rider.grid = grid;
    rider.atb = Math.max(0, rider.atb - atbCost);
    const terrain = terrainAt(this.mapDef, grid);
    if (terrain.hazardDamage) {
      this.applyDamage(rider, terrain.hazardDamage);
      this.showDamagePopup(rider, terrain.hazardDamage, 'Hazard');
    }
    this.activeIndex = null;
    this.clearMoveMode();
    this.clearTargetOverlay();
    this.commandMode = 'root';
    this.addLog(`${rider.name} moves to ${getLane(rider)} ${terrain.label} (-${atbCost} ATB).`);
    this.buildCommandButtons();
    this.updateDynamicViews();
  }

  getRepositionAtbCost(rider, grid) {
    const tile = this.reachableTiles.find((option) => option.x === grid.x && option.y === grid.y);
    const travelCost = tile?.cost || gridDistance(rider.grid, grid);
    let cost = isMounted(rider) ? 24 : 38;
    cost += travelCost * (isMounted(rider) ? 3 : 6);
    if (rider.riderStance === 'Wrangler') cost -= 8;
    if (rider.horseStance === 'Sprint' && isMounted(rider)) cost -= 6;
    if (hasStatus(rider, 'horse-panic') && isMounted(rider)) cost += 14;
    if (hasStatus(rider, 'snared')) cost += 10;
    return Math.max(14, Math.min(72, Math.round(cost)));
  }

  getUnitTextureKey(unit, isEnemy) {
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
      const recoveryChance = (hasEquippedTrait(rider, 'Trusted Mount') ? 0.16 : 0) + (rider.horseStance === 'Calm Focus' ? 0.14 : 0);
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
    const missed = Math.random() * 100 >= stats.hit;
    const critical = !missed && Math.random() * 100 < stats.crit;

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
      }
    }

    this.activeIndex = null;
    this.buildCommandButtons();
    this.updateDynamicViews();
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
    if (this.prepPhase) return;
    if (!rider || this.battleOver) return;
    this.clearMoveMode();
    if (isMounted(rider) && hasStatus(rider, 'horse-panic')) {
      this.addLog(`${getHorse(rider).name} is panicked. Mounted skills are disabled.`);
      this.setCommandMode('root');
      return;
    }

    if (skill.target === 'self') {
      this.applySkillStatus(rider, skill.status);
      this.showDamagePopup(rider, skill.status || 'Ready');
      rider.atb = 0;
      this.worsenBleed(rider);
      this.activeIndex = null;
      this.commandMode = 'root';
      this.addLog(`${rider.name} uses ${skill.name}.`);
      this.buildCommandButtons();
      this.updateDynamicViews();
      return;
    }

    if (skill.target === 'ally-weakest') {
      const ally = living(state.party).sort((a, b) => a.hp / a.maxHp - b.hp / b.maxHp)[0];
      if (!ally) return;
      const healing = healingAmount(ally, Math.abs(skill.power), rider, this.getPartySynergy());
      ally.hp = Math.min(ally.maxHp, ally.hp + healing);
      if (skill.cleanse) ally.statuses = [];
      this.showDamagePopup(ally, healing, 'Heal');
      rider.atb = 0;
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
    }
    item.clears?.forEach((status) => this.clearStatus(rider, status));
    item.applies?.forEach((status) => this.applySkillStatus(rider, status));
    if (this.prepPhase) {
      this.commandMode = 'root';
      this.showDamagePopup(rider, item.heal ? item.heal : item.name);
      this.addLog(`${rider.name} prepares with ${item.name}.`);
      this.buildCommandButtons();
      this.updateDynamicViews();
      return;
    }
    rider.atb = 0;
    this.worsenBleed(rider);
    this.activeIndex = null;
    this.commandMode = 'root';
    this.showDamagePopup(rider, item.heal ? item.heal : item.name);
    this.addLog(`${rider.name} uses ${item.name}.`);
    this.buildCommandButtons();
    this.updateDynamicViews();
  }

  applySkillStatus(unit, statusName) {
    if (!statusName) return;
    unit.statuses ||= [];
    const next = createStatus(statusName);
    const existing = unit.statuses.find((status) => status.name === next.name);
    if (existing) return;
    unit.statuses.push(next);
  }

  clearStatus(unit, statusName) {
    const next = createStatus(statusName);
    unit.statuses = (unit.statuses || []).filter((status) => status.name !== next.name);
  }

  applyDamage(unit, amount) {
    const nextHp = unit.hp - amount;
    if (nextHp <= 0 && hasStatus(unit, 'grit')) {
      unit.hp = 1;
      unit.atb = 100;
      unit.statuses = unit.statuses.filter((status) => status.name !== 'grit');
      this.applySkillStatus(unit, 'fatigue');
      this.showDamagePopup(unit, 'Grit');
      this.addLog(`${unit.name} refuses to fall.`);
      return;
    }
    unit.hp = Math.max(0, nextHp);
    if (unit.hp <= 0) unit.intent = null;
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
    cover.hp = Math.max(0, cover.hp - amount);
    this.refreshCoverVisuals();
    if (cover.hp > 0) {
      this.addLog(`${attacker?.name || 'Fire'} splinters cover (${cover.hp}/${cover.maxHp}).`);
      return false;
    }
    this.mapDef.elements[grid.y][grid.x] = null;
    this.elementLayer?.putTileAt?.(-1, grid.x, grid.y);
    this.refreshCoverVisuals();
    this.addLog(`${attacker?.name || 'Fire'} destroys cover.`);
    return true;
  }

  executeCoverAttack(grid) {
    const state = this.getState();
    const rider = state.party[this.activeIndex];
    if (!rider || this.battleOver || !this.targetMode || !this.canTargetCover(rider, grid, this.targetMode)) return;
    const action = this.targetMode;
    const damage = this.getCoverDamage(rider, action, false);
    this.clearMoveMode();
    this.clearTargetOverlay();
    this.commandMode = 'root';
    this.damageCoverAt(grid, damage, rider);
    rider.atb = action.type === 'horse-action' ? Math.min(100, action.horseAction.atbBonus || 0) : 0;
    this.worsenBleed(rider);
    this.addHorseBond(rider, action.type === 'horse-action' ? 2 : 0);
    this.activeIndex = null;
    this.buildCommandButtons();
    this.updateDynamicViews();
  }

  resolveEnemyDamage(target, baseAmount, enemy) {
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
    this.addLog(`${rider.name} ${rider.mounted ? 'mounts up' : 'dismounts for cover'}.`);
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
    if (this.prepPhase) {
      this.addLog(`${rider.name} prepares in ${rider.riderStance}.`);
      this.buildCommandButtons();
      this.updateDynamicViews();
      return;
    }
    rider.atb = 0;
    this.addLog(`${rider.name} shifts into ${rider.riderStance}.`);
    this.activeIndex = null;
    this.buildCommandButtons();
    this.updateDynamicViews();
  }

  cycleActiveStance() {
    const rider = this.getState().party[this.activeIndex];
    if (!rider || this.battleOver) return;
    const next = riderStances[(riderStances.indexOf(rider.riderStance) + 1) % riderStances.length];
    this.chooseStance(next);
  }

  enemyAct(enemy) {
    const targets = living(this.getState().party);
    if (!targets.length) return;
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
    this.showCombatImpact(enemy, target, { kind: 'dust' });
    this.showDamagePopup(target, damage, 'Dust');
    this.addLog(`${enemy.name} fans dust into ${target.name} for ${damage}.`);
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
    this.showCombatImpact(enemy, adjacent, { kind: 'slam', critical: true });
    this.showDamagePopup(adjacent, damage, 'Panic');
    this.addLog(`${enemy.name} slams ${adjacent.name} for ${damage}.`);
  }

  enemyAdvance(enemy, targets) {
    const target = this.getClosestTarget(enemy, targets);
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
        state.tutorial.townComplete = false;
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
      const bounty = this.getActiveBounty();
      const allStanding = living(state.party).length === state.party.length;
      const reward = bounty && state.bountyActive
        ? bounty.baseReward + (allStanding ? bounty.bonusReward : 0) + state.wanted * 10
        : 45 + state.wanted * 5;
      state.money += reward;
      state.wanted = Math.max(0, state.wanted - 1);
      state.bountyActive = false;
      state.activeBountyId = null;
      state.routeProgress = 0;
      state.party.forEach((rider) => {
        rider.atb = 0;
        this.addHorseBond(rider, 4);
      });
      this.addLog(`${bounty ? bounty.name : 'Bounty'} cleared. Earned $${reward}.`);
      this.updateDynamicViews();
      this.time.delayedCall(1300, () => this.scene.start(scenes.HUB));
    } else if (!living(state.party).length) {
      this.battleOver = true;
      this.addLog('The crew is routed. Press R to retry, or return to town.');
      this.updateDynamicViews();
      this.drawEndButtons('Defeat');
    }
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
