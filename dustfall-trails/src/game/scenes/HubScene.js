import { bountyContracts, palette, scenes } from '../config/gameData.js';
import { desertTileset } from '../assets/tiles/free-desert/index.js';
import { createParty, restoreParty } from '../systems/party.js';
import {
  getSaveSlotInfo,
  getSaveSlotInfos,
  loadGameSlot,
  saveGameSlot,
  SAVE_SLOTS,
} from '../systems/save.js';
import { drawButton, drawPanel, labelStyle, textStyle, titleStyle } from '../ui/drawing.js';
import BaseScene from './BaseScene.js';

export default class HubScene extends BaseScene {
  constructor() {
    super(scenes.HUB);
  }

  create() {
    super.create();
    const state = this.getState();
    if (!state.party) state.party = createParty();
    state.items ||= { bandage: 0, canteen: 0, whiskey: 0 };
    state.storeStock ||= this.createStoreStock();
    state.tutorial ||= { battleComplete: true, townComplete: false, active: false };
    this.activeBuilding = 'town';
    this.uiObjects = [];
    this.pauseObjects = [];
    this.saveMessage = '';
    this.townTutorialStep = 0;
    this.draw();
    this.input.keyboard.on('keydown-ESC', () => this.handleEscape());
  }

  createStoreStock() {
    return {
      supplies: 10,
      bandage: 6,
      canteen: 6,
      whiskey: 4,
    };
  }

  draw() {
    this.children.removeAll(true);
    this.uiObjects = [];
    const state = this.getState();
    this.drawTown();
    this.drawTownUi(state);
  }

  clearTownUi() {
    this.uiObjects.forEach((object) => {
      if (object?.active) object.destroy();
    });
    this.uiObjects = [];
  }

  drawTownUi(state = this.getState()) {
    this.clearTownUi();
    const existing = new Set(this.children.list);
    this.drawFrame('Tumbleweed Crossing', 'Accept bounties, buy supplies, tune your crew, then ride out.');
    this.drawStats();
    if (this.activeBuilding === 'town') this.drawTownDirectory(state);
    else this.drawBuildingInterior(state);
    this.drawTownTutorial(state);
    this.uiObjects = this.children.list.filter((object) => !existing.has(object));
  }

  openBuilding(building) {
    this.activeBuilding = building;
    this.drawTownUi();
  }

  drawTown() {
    drawPanel(this, 38, 112, 548, 488, 0.9);
    this.createTownSpriteTextures();
    this.drawTownSandMap();
    this.drawRoads();
    this.drawTownTileDecor();
    this.drawFence(424, 246, 92, 58);
    this.drawBuilding(136, 178, 166, 96, 'Saloon', 0x7a4124, 'saloon', () => this.openBuilding('saloon'));
    this.drawBuilding(454, 186, 152, 88, 'Stable', 0x6f4a2d, 'stable', () => this.openBuilding('stable'));
    this.drawBuilding(142, 466, 138, 92, 'Sheriff', 0x5f3823, 'sheriff', () => this.openBuilding('sheriff'));
    this.drawBuilding(470, 468, 148, 82, 'General Store', 0x87522d, 'store', () => this.openBuilding('store'));
    this.drawBountyBoard(244, 474);
    this.drawWell(486, 286);
    this.drawHitchingPosts(92, 286);
    this.drawTownDetails();
    this.drawCrewMarker(244, 382);
  }

  drawTownSandMap() {
    const origin = { x: 56, y: 130 };
    const tileSize = 32;
    const width = 16;
    const height = 14;
    const roadCells = new Set();
    for (let x = 0; x < width; x += 1) {
      roadCells.add(`${x},6`);
      roadCells.add(`${x},7`);
    }
    for (let y = 0; y < height; y += 1) {
      roadCells.add(`7,${y}`);
      roadCells.add(`8,${y}`);
    }

    for (let y = 0; y < height; y += 1) {
      for (let x = 0; x < width; x += 1) {
        const isRoad = roadCells.has(`${x},${y}`);
        const frame = isRoad ? 2 : (x * 3 + y * 5) % 4 === 0 ? 1 : 0;
        const tile = this.add.image(origin.x + x * tileSize, origin.y + y * tileSize, desertTileset.key, frame).setOrigin(0).setDepth(1);
        tile.setDisplaySize(tileSize, tileSize);
        if (!isRoad && (x + y) % 5 === 0) tile.setAlpha(0.92);
      }
    }

    const roadAccent = [
      [4, 6], [5, 7], [9, 6], [11, 7], [7, 3], [8, 4], [7, 10], [8, 11],
    ];
    roadAccent.forEach(([x, y]) => {
      const accent = this.add.image(origin.x + x * tileSize, origin.y + y * tileSize, desertTileset.key, 1).setOrigin(0).setDepth(1.1);
      accent.setDisplaySize(tileSize, tileSize).setAlpha(0.5);
    });
  }

  createTownSpriteTextures() {
    this.createTownPathTexture();
    this.createBuildingTexture('saloon', 166, 96, 0x7a4124);
    this.createBuildingTexture('stable', 152, 88, 0x6f4a2d);
    this.createBuildingTexture('sheriff', 138, 92, 0x5f3823);
    this.createBuildingTexture('store', 148, 82, 0x87522d);
  }

  createTownPathTexture() {
    const key = 'town-paths-sprite';
    if (this.textures.exists(key)) return;
    const graphics = this.make.graphics({ x: 0, y: 0, add: false });
    graphics.fillStyle(0xdfb769, 0.48);
    graphics.fillRoundedRect(0, 174, 512, 58, 18);
    graphics.fillRoundedRect(226, 0, 64, 452, 20);
    graphics.fillStyle(0xc58b45, 0.28);
    graphics.fillRoundedRect(20, 188, 472, 18, 10);
    graphics.fillRoundedRect(246, 20, 18, 412, 10);
    graphics.lineStyle(2, 0x6f4a2d, 0.28);
    graphics.strokeRoundedRect(0, 174, 512, 58, 18);
    graphics.strokeRoundedRect(226, 0, 64, 452, 20);
    graphics.lineStyle(2, 0x4b3120, 0.24);
    for (let x = 22; x < 492; x += 42) {
      graphics.lineBetween(x, 186 + (x % 3) * 2, x + 22, 188 + (x % 4));
      graphics.lineBetween(x, 218 - (x % 4), x + 24, 216 - (x % 3));
    }
    for (let y = 20; y < 430; y += 38) {
      graphics.lineBetween(240, y, 242, y + 22);
      graphics.lineBetween(278, y + 4, 276, y + 24);
    }
    graphics.generateTexture(key, 512, 452);
    graphics.destroy();
  }

  createBuildingTexture(type, width, height, color) {
    const key = `town-building-${type}`;
    if (this.textures.exists(key)) return;
    const textureWidth = width + 108;
    const textureHeight = height + 96;
    const cx = textureWidth / 2;
    const cy = textureHeight / 2;
    const graphics = this.make.graphics({ x: 0, y: 0, add: false });
    graphics.fillStyle(0x070302, 0.34);
    graphics.fillRoundedRect(cx - width / 2 + 7, cy - height / 2 + 10, width, height, 4);
    graphics.fillStyle(color, 1);
    graphics.fillRoundedRect(cx - width / 2, cy - height / 2, width, height, 4);
    graphics.lineStyle(4, palette.shadow, 1);
    graphics.strokeRoundedRect(cx - width / 2, cy - height / 2, width, height, 4);
    graphics.fillStyle(palette.leather, 1);
    graphics.fillRect(cx - width / 2 - 8, cy - height / 2 + 2, width + 16, 20);
    graphics.lineStyle(2, palette.shadow, 1);
    graphics.strokeRect(cx - width / 2 - 8, cy - height / 2 + 2, width + 16, 20);
    graphics.fillStyle(palette.shadow, 0.74);
    graphics.fillRect(cx - width / 2 + 7, cy + height / 2 - 24, 22, 24);

    if (type === 'saloon') {
      graphics.fillStyle(0x4b3120, 1);
      graphics.fillRect(cx - width / 2 - 12, cy + height / 2 + 8, width + 24, 12);
      graphics.fillRect(cx - 47, cy + height / 2 + 20, 7, 26);
      graphics.fillRect(cx + 41, cy + height / 2 + 20, 7, 26);
      graphics.fillStyle(palette.yellow, 0.86);
      graphics.fillRect(cx - 35, cy - height / 2 - 28, 70, 18);
      graphics.lineStyle(2, palette.shadow, 1);
      graphics.strokeRect(cx - 35, cy - height / 2 - 28, 70, 18);
    } else if (type === 'stable') {
      graphics.fillStyle(palette.shadow, 0.48);
      graphics.fillRect(cx - width / 2 + 1, cy - height / 2 + 21, 34, height - 26);
      graphics.fillStyle(0x4b3120, 1);
      graphics.fillRect(cx - 9, cy + height / 2 + 11, 74, 10);
      graphics.fillStyle(palette.yellow, 0.76);
      graphics.fillRect(cx - width / 2 - 4, cy + height / 2 + 27, 36, 18);
      graphics.fillRect(cx + width / 2 - 28, cy + height / 2 + 25, 48, 14);
    } else if (type === 'sheriff') {
      graphics.fillStyle(0x3a2115, 1);
      graphics.fillRect(cx + width / 2 + 7, cy - height / 2 + 19, 42, height - 18);
      graphics.fillStyle(palette.pale, 0.42);
      for (let bar = 0; bar < 3; bar += 1) graphics.fillRect(cx + width / 2 + 16 + bar * 12, cy - height / 2 + 13, 4, height - 30);
      graphics.fillStyle(palette.yellow, 1);
      graphics.fillCircle(cx - 44, cy - 18, 12);
    } else if (type === 'store') {
      graphics.fillStyle(palette.pale, 0.82);
      graphics.fillRect(cx - width / 2 - 6, cy - height / 2 + 28, width + 12, 16);
      graphics.fillStyle(0x4b3120, 1);
      graphics.fillRect(cx - 59, cy + height / 2 + 10, 34, 20);
      graphics.fillStyle(0x6f4a2d, 1);
      graphics.fillRect(cx - 7, cy + height / 2 + 11, 38, 18);
    }

    graphics.generateTexture(key, textureWidth, textureHeight);
    graphics.destroy();
  }

  drawTownTileDecor() {
    const cactus = [
      [74, 244, 4, 1.05], [240, 156, 4, 0.95], [552, 144, 5, 0.9], [552, 372, 5, 1.05],
      [366, 556, 3, 0.9], [82, 386, 3, 0.95], [548, 558, 4, 0.85],
    ];
    cactus.forEach(([x, y, frame, scale]) => this.add.image(x, y, desertTileset.key, frame).setScale(scale).setDepth(3));

    const rocks = [
      [224, 238, 8, 1.0], [548, 258, 9, 0.85], [76, 526, 9, 0.8],
      [380, 238, 8, 0.75],
    ];
    rocks.forEach(([x, y, frame, scale]) => this.add.image(x, y, desertTileset.key, frame).setScale(scale).setDepth(3));
  }

  drawTownDirectory(state) {
    drawPanel(this, 620, 112, 300, 488);
    this.add.text(642, 134, 'Town Doors', titleStyle(25));
    this.add.text(642, 170, 'Choose a building. Details stay inside, so the street stays readable.', {
      ...textStyle(13, '#e2d9bd'),
      wordWrap: { width: 246 },
      lineSpacing: 4,
    });
    this.drawTownStatusCard(642, 238, state);
    drawButton(this, 642, 340, 238, 'Sheriff Station', () => this.openBuilding('sheriff'), true, 'stance');
    drawButton(this, 642, 388, 238, 'General Store', () => this.openBuilding('store'), false, 'support');
    drawButton(this, 642, 436, 238, 'Saloon', () => this.openBuilding('saloon'), false, 'support');
    drawButton(this, 642, 484, 238, 'Stable', () => this.openBuilding('stable'), false, 'move');
    this.drawSaveControls(state);
  }

  drawSaveControls(state) {
    const saveInfos = getSaveSlotInfos();
    const filled = saveInfos.filter(Boolean).length;
    drawButton(this, 642, 536, 238, 'Save Game', () => this.openSaveSlots(), true, 'support');
    this.add.text(642, 580, this.saveMessage || (filled ? `${filled}/3 save slots filled.` : 'No saved game yet.'), {
      ...textStyle(8, '#d8c7a0'),
      wordWrap: { width: 238 },
    });
  }

  handleEscape() {
    if (this.pauseObjects.length) {
      this.closePauseOverlay();
      return;
    }
    this.openPauseMenu();
  }

  clearPauseObjects() {
    this.pauseObjects.forEach((object) => {
      if (object?.active) object.destroy();
    });
    this.pauseObjects = [];
  }

  capturePauseObjects(existing) {
    this.pauseObjects = this.children.list.filter((object) => !existing.has(object));
    this.pauseObjects.forEach((object) => object.setDepth?.(240));
  }

  closePauseOverlay() {
    this.clearPauseObjects();
    this.tweens.resumeAll();
    this.drawTownUi();
  }

  openPauseMenu() {
    this.clearPauseObjects();
    this.tweens.pauseAll();
    const existing = new Set(this.children.list);
    this.add.rectangle(480, 360, 960, 720, palette.shadow, 0.5).setDepth(230).setInteractive();
    drawPanel(this, 304, 188, 352, 316, 0.97).setDepth(231);
    this.add.text(330, 214, 'Paused', titleStyle(28)).setDepth(232);
    this.add.text(330, 254, 'Town actions are stopped until you resume.', {
      ...textStyle(10, '#fff1bf'),
      wordWrap: { width: 292 },
    }).setDepth(232);
    this.drawPauseButton(330, 304, 292, 'Resume', () => this.closePauseOverlay(), true, 'support');
    this.drawPauseButton(330, 352, 292, 'Save Game', () => this.openSaveSlots(), false, 'support');
    this.drawPauseButton(330, 400, 292, 'Load Game', () => this.openLoadSlots(), false, 'stance');
    this.drawPauseButton(330, 448, 292, 'Main Menu', () => this.scene.start(scenes.TITLE), false, 'attack');
    this.capturePauseObjects(existing);
  }

  drawPauseButton(x, y, width, label, onClick, primary = false, tone = 'default') {
    drawButton(this, x, y, width, label, onClick, primary, tone).forEach((object) => object.setDepth?.(242));
  }

  openSaveSlots() {
    this.drawSlotMenu('Save Game', 'Choose a slot. Empty slots save immediately.', 'save');
  }

  openLoadSlots() {
    this.drawSlotMenu('Load Game', 'Choose an occupied slot to continue from that save.', 'load');
  }

  drawSlotMenu(title, subtitle, mode) {
    this.clearPauseObjects();
    this.tweens.pauseAll();
    const existing = new Set(this.children.list);
    this.add.rectangle(480, 360, 960, 720, palette.shadow, 0.52).setDepth(230).setInteractive();
    drawPanel(this, 214, 154, 532, 422, 0.98).setDepth(231);
    this.add.text(246, 180, title, titleStyle(27)).setDepth(232);
    this.add.text(246, 218, subtitle, { ...textStyle(10, '#fff1bf'), wordWrap: { width: 460 } }).setDepth(232);
    SAVE_SLOTS.forEach((slot, index) => this.drawTownSlotRow(246, 262 + index * 74, slot, mode));
    this.drawPauseButton(246, 514, 150, 'Back', () => this.openPauseMenu(), false, 'support');
    this.drawPauseButton(428, 514, 150, 'Resume', () => this.closePauseOverlay(), true, 'support');
    this.capturePauseObjects(existing);
  }

  drawTownSlotRow(x, y, slot, mode) {
    const info = getSaveSlotInfo(slot);
    const enabled = mode === 'save' || Boolean(info);
    const row = this.add.rectangle(x, y, 468, 60, enabled ? palette.shadow : 0x2d2822, enabled ? 0.38 : 0.7)
      .setOrigin(0)
      .setStrokeStyle(2, enabled ? palette.pale : 0x5a5042, enabled ? 0.24 : 0.3)
      .setDepth(232);
    this.add.text(x + 14, y + 10, `Slot ${slot}`, labelStyle(12, enabled ? '#fff8e7' : '#8d7d67')).setDepth(233);
    const details = info
      ? `${info.label}   $${info.money}   W${info.wanted}   Route ${info.routeProgress}%\n${info.bountyActive ? 'Bounty active' : 'No bounty'}   ${info.crewHealth}`
      : 'Empty slot';
    this.add.text(x + 94, y + 9, details, {
      ...textStyle(8, enabled ? '#fff1bf' : '#8d7d67'),
      wordWrap: { width: 292 },
      lineSpacing: 1,
    }).setDepth(233);
    const buttonLabel = mode === 'save' ? (info ? 'Overwrite' : 'Save') : 'Load';
    this.drawSlotMiniButton(x + 378, y + 12, 72, buttonLabel, () => this.handleSlotAction(mode, slot, Boolean(info)), enabled);
    if (!enabled) return;
    row.setInteractive({ useHandCursor: true });
    row.on('pointerdown', () => this.handleSlotAction(mode, slot, Boolean(info)));
  }

  drawSlotMiniButton(x, y, width, label, onClick, enabled) {
    const base = enabled ? palette.brown : 0x2d2822;
    const bg = this.add.rectangle(x, y, width, 34, base, enabled ? 1 : 0.72).setOrigin(0).setDepth(234);
    bg.setStrokeStyle(2, enabled ? palette.pale : 0x5a5042, enabled ? 0.62 : 0.32);
    this.add.text(x + width / 2, y + 17, label, labelStyle(9, enabled ? '#fff8e7' : '#8d7d67')).setOrigin(0.5).setDepth(235);
    if (!enabled) return;
    bg.setInteractive({ useHandCursor: true });
    bg.on('pointerover', () => bg.setFillStyle(palette.yellow, 1));
    bg.on('pointerout', () => bg.setFillStyle(base, 1));
    bg.on('pointerdown', onClick);
  }

  handleSlotAction(mode, slot, occupied) {
    if (mode === 'load') {
      this.loadSlot(slot);
      return;
    }
    if (occupied) {
      this.confirmOverwrite(slot);
      return;
    }
    this.saveSlot(slot);
  }

  confirmOverwrite(slot) {
    this.clearPauseObjects();
    const existing = new Set(this.children.list);
    this.add.rectangle(480, 360, 960, 720, palette.shadow, 0.56).setDepth(230).setInteractive();
    drawPanel(this, 310, 238, 340, 196, 0.98).setDepth(231);
    this.add.text(336, 262, `Overwrite Slot ${slot}?`, titleStyle(23)).setDepth(232);
    this.add.text(336, 300, 'This will replace the existing save in that slot.', {
      ...textStyle(10, '#fff1bf'),
      wordWrap: { width: 280 },
    }).setDepth(232);
    this.drawPauseButton(336, 362, 124, 'Yes', () => this.saveSlot(slot), true, 'attack');
    this.drawPauseButton(486, 362, 124, 'No', () => this.openSaveSlots(), false, 'support');
    this.capturePauseObjects(existing);
  }

  saveSlot(slot) {
    const saved = saveGameSlot(slot, this.getState());
    this.saveMessage = saved ? `Saved slot ${slot} ${new Date(saved.savedAt).toLocaleString()}` : 'Save unavailable in this browser.';
    this.drawSlotMenu('Save Game', this.saveMessage, 'save');
  }

  loadSlot(slot) {
    const saved = loadGameSlot(slot);
    if (!saved) return;
    delete saved.savedAt;
    delete saved.slot;
    this.registry.set('gameState', saved);
    this.clearPauseObjects();
    this.tweens.resumeAll();
    this.draw();
  }

  getTownTutorialSteps() {
    return [
      {
        title: 'Town Tutorial',
        body: 'Tumbleweed Crossing is your hub between fights. The town stays active while the right panel changes.',
      },
      {
        title: 'Sheriff Station',
        body: 'Visit the Sheriff to inspect and accept bounties. Accepting work does not force you out of town; Ride to Bounty starts travel.',
      },
      {
        title: 'General Store',
        body: 'Buy individual supplies, bandages, canteens, and whiskey from limited stock. Choose only what the route needs.',
      },
      {
        title: 'Saloon And Stable',
        body: 'The Saloon restores crew HP. The Stable opens party setup for weapons, traits, horses, stances, and synergy.',
      },
      {
        title: 'Saving',
        body: 'Use Save Game in town or the pause menu to store progress in one of three browser save slots.',
      },
    ];
  }

  drawTownTutorial(state) {
    if (!state.tutorial?.battleComplete || state.tutorial?.townComplete) return;
    const steps = this.getTownTutorialSteps();
    const step = steps[Math.min(this.townTutorialStep, steps.length - 1)];
    drawPanel(this, 64, 600, 500, 98, 0.95);
    this.add.text(84, 614, step.title, labelStyle(14, '#fff8e7'));
    this.add.text(84, 638, step.body, { ...textStyle(10, '#fff1bf'), wordWrap: { width: 330 }, lineSpacing: 2 });
    drawButton(this, 446, 644, 94, this.townTutorialStep >= steps.length - 1 ? 'Done' : 'Next', () => this.advanceTownTutorial(), true, 'support');
  }

  advanceTownTutorial() {
    const steps = this.getTownTutorialSteps();
    if (this.townTutorialStep >= steps.length - 1) {
      const state = this.getState();
      state.tutorial.townComplete = true;
      this.drawTownUi(state);
      return;
    }
    this.townTutorialStep += 1;
    this.drawTownUi();
  }

  drawTownStatusCard(x, y, state) {
    const bounty = bountyContracts.redSashRifleman;
    this.add.rectangle(x, y, 238, 72, palette.shadow, 0.38).setOrigin(0).setStrokeStyle(1, palette.pale, 0.2);
    this.add.text(x + 12, y + 10, state.bountyActive ? 'BOUNTY ACTIVE' : 'NO ACTIVE BOUNTY', labelStyle(10, state.bountyActive ? '#f5df9b' : '#d8c7a0'));
    this.add.text(x + 12, y + 30, state.bountyActive ? bounty.name : 'Visit the Sheriff for work.', textStyle(10, '#fff1bf'));
    this.add.text(x + 12, y + 48, `Crew: ${this.getCrewStatus(state)}   Items: ${this.getItemSummary(state)}`, textStyle(9, '#d8c7a0'));
  }

  drawBuildingInterior(state) {
    const content = {
      sheriff: {
        title: 'Sheriff Station',
        subtitle: 'Bounty work and wanted heat.',
        tone: palette.blue,
        body: () => this.drawSheriffInterior(state),
      },
      store: {
        title: 'General Store',
        subtitle: 'Trail goods, medicine, and provisions.',
        tone: palette.yellow,
        body: () => this.drawStoreInterior(state),
      },
      saloon: {
        title: 'Saloon',
        subtitle: 'Rest the crew before the next ride.',
        tone: palette.red,
        body: () => this.drawSaloonInterior(state),
      },
      stable: {
        title: 'Stable',
        subtitle: 'Prepare riders, horses, stances, and traits.',
        tone: palette.green,
        body: () => this.drawStableInterior(state),
      },
    }[this.activeBuilding];

    drawPanel(this, 604, 100, 328, 522, 0.98);
    this.add.rectangle(624, 120, 288, 5, content.tone, 0.95).setOrigin(0);
    this.add.text(626, 138, content.title, titleStyle(24));
    this.add.text(626, 170, content.subtitle, { ...textStyle(12, '#e2d9bd'), wordWrap: { width: 268 }, lineSpacing: 3 });
    content.body();
    drawButton(this, 626, 562, 126, 'Street', () => this.openBuilding('town'));
  }

  drawSheriffInterior(state) {
    const bounty = bountyContracts.redSashRifleman;
    const active = state.bountyActive;
    this.drawInfoRows(626, 220, [
      ['POSTER', active ? 'Accepted' : 'Available'],
      ['TARGET', bounty.targetName],
      ['PAY', `$${bounty.baseReward} + bonus`],
      ['BONUS', bounty.optional],
      ['HEAT', `Wanted +1 on acceptance`],
    ]);
    this.add.text(626, 430, bounty.description, { ...textStyle(10, '#fff1bf'), wordWrap: { width: 268 }, lineSpacing: 3 });
    drawButton(this, 626, 506, 268, active ? 'Ride to Bounty' : 'Accept Bounty', () => {
      if (!active) {
        state.bountyActive = true;
        state.activeBountyId = bounty.id;
        state.wanted += 1;
        this.drawTownUi(state);
        return;
      }
      state.preparedSynergy = null;
      this.scene.start(scenes.TRAVEL);
    }, true, 'attack');
  }

  drawStoreInterior(state) {
    state.storeStock ||= this.createStoreStock();
    this.add.text(626, 218, `Money $${state.money}`, labelStyle(13, '#bff0a7'));
    this.add.text(762, 219, `Your pack: ${this.getItemSummary(state)}`, textStyle(9, '#d8c7a0'));
    this.getStoreCatalog().forEach((item, index) => this.drawStoreItemRow(626, 250 + index * 58, item, state));
    this.add.text(626, 492, 'Stock is limited in each town stop. Buy what the route needs.', { ...textStyle(10, '#fff1bf'), wordWrap: { width: 268 }, lineSpacing: 3 });
  }

  getStoreCatalog() {
    return [
      { id: 'supplies', name: 'Trail Supplies', price: 6, detail: '+1 route supply', tone: 'support' },
      { id: 'bandage', name: 'Bandage', price: 8, detail: 'Heal and stop bleeding', tone: 'support' },
      { id: 'canteen', name: 'Canteen', price: 7, detail: 'Clear heat and dust', tone: 'support' },
      { id: 'whiskey', name: 'Whiskey', price: 10, detail: 'Risky grit and heat', tone: 'attack' },
    ];
  }

  drawStoreItemRow(x, y, item, state) {
    const stock = state.storeStock[item.id] || 0;
    const owned = item.id === 'supplies' ? state.supplies : state.items[item.id] || 0;
    const canBuy = stock > 0 && state.money >= item.price;
    this.add.rectangle(x, y, 268, 46, palette.shadow, 0.34).setOrigin(0).setStrokeStyle(1, canBuy ? palette.pale : palette.red, canBuy ? 0.18 : 0.38);
    this.add.text(x + 10, y + 6, item.name, labelStyle(11, '#fff8e7'));
    this.add.text(x + 10, y + 24, item.detail, textStyle(8, '#d8c7a0'));
    this.add.text(x + 132, y + 7, `$${item.price}`, labelStyle(10, '#bff0a7'));
    this.add.text(x + 132, y + 24, `Stock ${stock} / Own ${owned}`, textStyle(8, '#d8c7a0'));
    drawButton(this, x + 212, y + 7, 44, 'Buy', () => this.buyStoreItem(item), canBuy, item.tone);
  }

  buyStoreItem(item) {
    const state = this.getState();
    state.storeStock ||= this.createStoreStock();
    if ((state.storeStock[item.id] || 0) <= 0 || state.money < item.price) return;
    state.money -= item.price;
    state.storeStock[item.id] -= 1;
    if (item.id === 'supplies') state.supplies += 1;
    else state.items[item.id] = (state.items[item.id] || 0) + 1;
    this.drawTownUi(state);
  }

  drawSaloonInterior(state) {
    this.drawInfoRows(626, 220, [
      ['COST', '$20'],
      ['EFFECT', 'Restore party HP'],
      ['MONEY', `$${state.money}`],
    ]);
    this.add.text(626, 350, 'Crew Health', labelStyle(11, '#f5df9b'));
    state.party.forEach((rider, index) => {
      const y = 372 + index * 26;
      const wounded = rider.hp < rider.maxHp;
      this.add.rectangle(626, y, 268, 20, palette.shadow, 0.32).setOrigin(0).setStrokeStyle(1, wounded ? palette.red : palette.green, wounded ? 0.5 : 0.24);
      this.add.text(636, y + 4, rider.name, labelStyle(8, '#fff8e7'));
      this.add.text(800, y + 4, `${rider.hp}/${rider.maxHp}`, labelStyle(8, wounded ? '#f5a08a' : '#bff0a7'));
    });
    this.add.text(626, 456, 'A night upstairs clears injuries and gets the posse back on its feet.', { ...textStyle(10, '#fff1bf'), wordWrap: { width: 268 }, lineSpacing: 3 });
    drawButton(this, 626, 506, 268, 'Rest Crew ($20)', () => {
      if (state.money < 20) return;
      state.money -= 20;
      restoreParty(state.party);
      this.drawTownUi(state);
    }, true, 'support');
  }

  drawStableInterior(state) {
    const mounted = state.party.filter((rider) => rider.mounted && rider.horseId).length;
    this.drawInfoRows(626, 220, [
      ['RIDERS', `${state.party.length}`],
      ['MOUNTED', `${mounted}/${state.party.length}`],
      ['CREW', this.getCrewStatus(state)],
      ['SETUP', 'Weapons / horses / traits'],
    ]);
    this.add.text(626, 404, 'Use the stable to tune the party before riding out.', { ...textStyle(10, '#fff1bf'), wordWrap: { width: 268 }, lineSpacing: 3 });
    drawButton(this, 626, 506, 268, 'Prepare Party', () => this.scene.start(scenes.PREP), true, 'move');
  }

  drawInfoRows(x, y, rows) {
    rows.forEach(([label, value], index) => {
      const rowY = y + index * 42;
      this.add.rectangle(x, rowY, 268, 36, palette.shadow, 0.34).setOrigin(0).setStrokeStyle(1, palette.pale, 0.14);
      this.add.text(x + 10, rowY + 11, label, labelStyle(8, '#f5df9b'));
      this.add.text(x + 92, rowY + 7, value, { ...textStyle(9, '#fff8e7'), wordWrap: { width: 160 }, lineSpacing: 0 });
    });
  }

  drawRoads() {
    this.add.image(56, 130, 'town-paths-sprite').setOrigin(0).setDepth(2);
  }

  drawBuilding(x, y, width, height, label, color, type, onClick) {
    const body = this.add.image(x, y, `town-building-${type}`).setDepth(4).setInteractive({ useHandCursor: true });
    body.on('pointerover', () => body.setTint(0xffe6a6));
    body.on('pointerout', () => body.clearTint());
    body.on('pointerdown', onClick);
    this.add.text(x, y - 8, label, {
      ...labelStyle(12, '#fff8e7'),
      wordWrap: { width: width - 18 },
      align: 'center',
    }).setOrigin(0.5).setDepth(5);
  }

  drawBuildingDetails(x, y, width, height, type) {
    if (type === 'saloon') {
      this.add.rectangle(x, y + height / 2 + 13, width + 24, 12, 0x4b3120).setStrokeStyle(2, palette.shadow);
      this.add.rectangle(x - 44, y + height / 2 + 26, 7, 26, palette.shadow);
      this.add.rectangle(x + 44, y + height / 2 + 26, 7, 26, palette.shadow);
      this.drawLantern(x - 70, y - 4);
      this.drawLantern(x + 70, y - 4);
      this.add.rectangle(x, y - height / 2 - 18, 70, 18, palette.yellow, 0.86).setStrokeStyle(2, palette.shadow);
      this.add.text(x, y - height / 2 - 22, 'Open', labelStyle(8, '#241914')).setOrigin(0.5, 0);
      this.drawBarrels(x + width / 2 + 22, y + 28);
      return;
    }
    if (type === 'stable') {
      this.add.rectangle(x - width / 2 + 18, y + 8, 34, height - 26, palette.shadow, 0.48).setStrokeStyle(2, palette.pale, 0.28);
      this.add.rectangle(x + 28, y + height / 2 + 16, 74, 10, 0x4b3120).setStrokeStyle(2, palette.shadow);
      this.drawHayBales(x - 76, y + 42);
      this.drawTrough(x + 82, y + 38);
      return;
    }
    if (type === 'sheriff') {
      this.add.rectangle(x + width / 2 + 28, y + 10, 42, height - 18, 0x3a2115).setStrokeStyle(3, palette.shadow);
      for (let bar = 0; bar < 3; bar += 1) this.add.rectangle(x + width / 2 + 16 + bar * 12, y + 4, 4, height - 30, palette.pale, 0.42);
      this.add.star(x - 44, y - 18, 5, 6, 12, palette.yellow).setStrokeStyle(2, palette.shadow);
      this.drawWantedPosters(x - 84, y + 50);
      return;
    }
    if (type === 'store') {
      this.add.rectangle(x, y - height / 2 + 36, width + 12, 16, palette.pale, 0.82).setStrokeStyle(2, palette.shadow);
      this.add.rectangle(x - 42, y + height / 2 + 20, 34, 20, 0x4b3120).setStrokeStyle(2, palette.shadow);
      this.add.rectangle(x + 12, y + height / 2 + 20, 38, 18, 0x6f4a2d).setStrokeStyle(2, palette.shadow);
      this.drawBrokenWheel(x + width / 2 + 34, y + 34);
    }
  }

  drawFence(x, y, width, height) {
    const fence = this.add.graphics().setDepth(4);
    fence.lineStyle(4, 0x4b3120, 1);
    fence.strokeRect(x, y, width, height);
    fence.lineStyle(2, 0xf5df9b, 0.28);
    for (let post = x + 12; post < x + width; post += 18) {
      fence.lineBetween(post, y, post, y + height);
    }
    this.add.text(x + 14, y + 34, 'Corral', labelStyle(10, '#3a2115')).setDepth(5);
  }

  drawBountyBoard(x, y) {
    this.add.rectangle(x, y, 66, 44, 0x4b3120).setStrokeStyle(3, palette.shadow).setDepth(4);
    this.add.rectangle(x, y - 4, 46, 26, 0xf5df9b, 0.82).setDepth(4);
    this.add.text(x, y - 8, 'Bounty', labelStyle(8, '#241914')).setOrigin(0.5).setDepth(5);
    this.add.text(x, y + 8, '$$', labelStyle(10, '#8d3f2b')).setOrigin(0.5).setDepth(5);
  }

  drawWell(x, y) {
    this.add.circle(x, y, 20, palette.shadow, 0.78).setStrokeStyle(3, palette.pale, 0.45).setDepth(4);
    this.add.circle(x, y, 10, palette.blue, 0.65).setDepth(5);
  }

  drawHitchingPosts(x, y) {
    for (let index = 0; index < 4; index += 1) {
      this.add.rectangle(x + index * 34, y, 22, 6, palette.shadow, 0.9).setDepth(4);
      this.add.rectangle(x + index * 34, y + 10, 5, 24, palette.shadow, 0.9).setDepth(4);
    }
  }

  drawTownDetails() {
    this.add.image(238, 246, desertTileset.key, 6).setScale(1.05).setAngle(-8).setDepth(3);
    this.add.image(548, 264, desertTileset.key, 8).setScale(1.1).setAngle(8).setDepth(3);
    this.add.rectangle(64, 544, 198, 24, 0xc58b45, 0.94).setOrigin(0).setStrokeStyle(2, 0x6f4a2d, 0.7).setDepth(4);
    this.add.text(76, 550, 'Tumbleweed Crossing', labelStyle(11, '#3a2115')).setAlpha(0.88).setDepth(5);
    const tumbleweed = this.add.image(520, 390, desertTileset.key, 5).setScale(0.66).setAlpha(0.72).setDepth(4);
    this.tweens.add({ targets: tumbleweed, x: 492, angle: 360, duration: 5200, yoyo: true, repeat: -1, ease: 'Sine.inOut' });
  }

  drawGroundTexture() {
    const graphics = this.add.graphics();
    const stones = [
      [88, 154], [166, 254], [238, 522], [404, 146], [536, 232], [548, 520],
      [92, 378], [228, 146], [438, 548], [510, 410], [188, 468], [356, 246],
    ];
    graphics.fillStyle(0x6f4a2d, 0.26);
    stones.forEach(([x, y], index) => graphics.fillEllipse(x, y, 10 + (index % 3) * 4, 5 + (index % 2) * 3));
    graphics.lineStyle(2, 0x57351f, 0.22);
    [[126, 228], [246, 180], [506, 344], [366, 526], [116, 486]].forEach(([x, y]) => {
      graphics.lineBetween(x, y, x + 28, y + 5);
      graphics.lineBetween(x + 8, y + 3, x + 18, y + 14);
    });
  }

  drawEdgeDetails() {
    const edge = this.add.graphics();
    edge.fillStyle(0x6f4a2d, 0.5);
    edge.fillTriangle(56, 130, 112, 130, 56, 192);
    edge.fillTriangle(568, 130, 510, 130, 568, 206);
    edge.fillTriangle(56, 582, 132, 582, 56, 520);
    edge.fillTriangle(568, 582, 492, 582, 568, 512);
    this.add.rectangle(532, 186, 5, 92, palette.shadow, 0.82);
    this.add.rectangle(516, 208, 36, 5, palette.shadow, 0.82);
    this.add.circle(532, 170, 9, palette.yellow, 0.72).setStrokeStyle(2, palette.shadow);
  }

  drawLantern(x, y) {
    const glow = this.add.circle(x, y + 8, 13, palette.yellow, 0.28);
    this.add.rectangle(x, y, 10, 18, palette.yellow, 0.8).setStrokeStyle(2, palette.shadow);
    this.tweens.add({ targets: glow, alpha: 0.12, duration: 700, yoyo: true, repeat: -1 });
  }

  drawBarrels(x, y) {
    for (let index = 0; index < 3; index += 1) {
      this.add.circle(x + index * 14, y + (index % 2) * 8, 8, 0x4b3120).setStrokeStyle(2, palette.shadow);
    }
  }

  drawHayBales(x, y) {
    this.add.rectangle(x, y, 36, 18, palette.yellow, 0.76).setStrokeStyle(2, palette.shadow);
    this.add.rectangle(x + 24, y + 12, 36, 18, palette.yellow, 0.68).setStrokeStyle(2, palette.shadow);
  }

  drawTrough(x, y) {
    this.add.rectangle(x, y, 48, 14, 0x4b3120).setStrokeStyle(2, palette.shadow);
    this.add.rectangle(x, y - 2, 38, 5, palette.blue, 0.62);
  }

  drawWantedPosters(x, y) {
    for (let index = 0; index < 2; index += 1) {
      this.add.rectangle(x + index * 24, y, 18, 24, palette.pale, 0.84).setStrokeStyle(1, palette.shadow);
      this.add.text(x + index * 24, y - 6, '$', labelStyle(9, '#8d3f2b')).setOrigin(0.5, 0);
    }
  }

  drawBrokenWheel(x, y) {
    this.add.circle(x, y, 17, palette.shadow, 0).setStrokeStyle(4, 0x4b3120);
    for (let index = 0; index < 4; index += 1) this.add.rectangle(x, y, 30, 3, 0x4b3120).setAngle(index * 0.8);
  }

  drawCactus(x, y) {
    this.add.rectangle(x, y, 12, 42, palette.cactus).setStrokeStyle(3, palette.shadow);
    this.add.circle(x + 13, y - 2, 8, palette.cactus).setStrokeStyle(2, palette.shadow);
    this.add.circle(x - 12, y + 8, 7, palette.cactus).setStrokeStyle(2, palette.shadow);
  }

  drawCrewMarker(x, y) {
    this.add.circle(x - 6, y + 13, 18, palette.shadow, 0.28).setDepth(5);
    this.add.circle(x, y, 10, palette.yellow).setStrokeStyle(3, palette.shadow).setDepth(5);
    this.add.rectangle(x, y + 12, 22, 10, palette.green).setStrokeStyle(2, palette.shadow).setDepth(5);
    this.add.rectangle(x, y - 13, 26, 5, palette.leather).setStrokeStyle(1, palette.shadow).setDepth(5);
  }

  getCrewStatus(state) {
    const wounded = state.party.filter((rider) => rider.hp < rider.maxHp).length;
    if (!wounded) return 'Ready';
    return `${wounded} wounded`;
  }

  getItemSummary(state) {
    return `${state.items.bandage}/${state.items.canteen}/${state.items.whiskey}`;
  }
}
