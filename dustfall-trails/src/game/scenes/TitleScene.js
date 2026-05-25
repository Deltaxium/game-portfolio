import { horseSpriteKeys, partySpriteKeys } from '../assets/sprites/index.js';
import { desertTileset } from '../assets/tiles/free-desert/index.js';
import { palette, scenes } from '../config/gameData.js';
import {
  createInitialGameState,
  deleteAutoGame,
  deleteSaveSlot,
  getAutoSaveInfo,
  getSaveSlotInfos,
  hasAnyLoadableGame,
  loadGameSlot,
  loadAutoGame,
  SAVE_SLOTS,
} from '../systems/save.js';
import { drawPanel, labelStyle, textStyle, titleStyle } from '../ui/drawing.js';
import BaseScene from './BaseScene.js';

export default class TitleScene extends BaseScene {
  constructor() {
    super(scenes.TITLE);
  }

  create() {
    super.create();
    this.autoSaveInfo = getAutoSaveInfo();
    this.canContinue = Boolean(this.autoSaveInfo);
    this.canLoad = hasAnyLoadableGame();
    this.saveInfos = getSaveSlotInfos();
    this.promptObjects = [];
    this.promptBackAction = null;
    this.loadConfirmOpen = false;
    this.selectedLoadSlot = this.autoSaveInfo ? 'auto' : this.getFirstFilledSlot();
    this.startTitleTrailMusic();
    this.draw();
    this.input.keyboard.on('keydown-ENTER', () => { if (!this.audioOptionsState && !this.audioOptionsJustClosed) this.openTutorialPrompt(); });
    this.input.keyboard.on('keydown-SPACE', () => { if (!this.audioOptionsState && !this.audioOptionsJustClosed) this.openTutorialPrompt(); });
    this.input.keyboard.on('keydown-N', () => { if (!this.audioOptionsState && !this.audioOptionsJustClosed) this.openTutorialPrompt(); });
    this.input.keyboard.on('keydown-C', () => { if (!this.audioOptionsState && !this.audioOptionsJustClosed) this.continueAutoSave(); });
    this.input.keyboard.on('keydown-L', () => { if (!this.audioOptionsState && !this.audioOptionsJustClosed) this.handleLoadKey(); });
    this.input.keyboard.on('keydown-D', () => { if (!this.audioOptionsState && !this.audioOptionsJustClosed && this.loadConfirmOpen) this.openDeleteSaveConfirm(); });
    this.input.keyboard.on('keydown-ESC', () => { if (!this.audioOptionsState && !this.audioOptionsJustClosed) this.handlePromptBack(); });
    this.input.keyboard.on('keydown-O', () => { if (!this.audioOptionsState && !this.audioOptionsJustClosed) this.openAudioOptions(); });
    this.input.keyboard.on('keydown-ONE', () => { if (!this.audioOptionsState && !this.audioOptionsJustClosed) this.selectLoadSlot('auto'); });
    this.input.keyboard.on('keydown-TWO', () => { if (!this.audioOptionsState && !this.audioOptionsJustClosed) this.selectLoadSlot(1); });
    this.input.keyboard.on('keydown-THREE', () => { if (!this.audioOptionsState && !this.audioOptionsJustClosed) this.selectLoadSlot(2); });
    this.input.keyboard.on('keydown-FOUR', () => { if (!this.audioOptionsState && !this.audioOptionsJustClosed) this.selectLoadSlot(3); });
  }

  draw() {
    this.children.removeAll(true);
    this.cameras.main.setBackgroundColor(palette.dark);
    this.drawDesertBackdrop();
    this.drawTrailFrame();
    this.drawTownSilhouette();
    this.drawRiders();
    this.drawDust();
    this.drawTitleLockup();
    this.drawMenuPanel();
  }

  drawDesertBackdrop() {
    this.add.rectangle(480, 360, 960, 720, 0x1b100b);
    this.add.rectangle(480, 204, 960, 300, 0x6f4a2d, 0.34);
    this.add.rectangle(480, 390, 960, 320, 0xad7536, 0.72);
    this.add.rectangle(480, 520, 960, 240, 0x57351f, 0.52);

    for (let x = 0; x < 960; x += 32) {
      for (let y = 336; y < 720; y += 32) {
        const frame = (x / 32 + y / 32) % 5 === 0 ? 1 : 0;
        const tile = this.add.image(x, y, desertTileset.key, frame).setOrigin(0).setDepth(0.2);
        tile.setDisplaySize(32, 32).setAlpha(y < 432 ? 0.18 : 0.28);
      }
    }

    const mesas = [
      [86, 280, 190, 82], [234, 252, 146, 118], [690, 250, 170, 124], [850, 286, 180, 78],
    ];
    mesas.forEach(([x, y, width, height]) => {
      this.add.rectangle(x, y, width, height, 0x3a2115, 0.9).setStrokeStyle(2, 0x8d5d30, 0.42);
      this.add.rectangle(x, y - height / 2 - 7, width + 28, 18, 0x4b3120, 0.96).setStrokeStyle(2, 0xc58b45, 0.42);
    });

    this.add.circle(748, 122, 54, palette.yellow, 0.82);
    this.add.circle(748, 122, 82, palette.yellow, 0.09);
  }

  drawTrailFrame() {
    this.add.rectangle(480, 360, 876, 610, 0x000000, 0).setStrokeStyle(4, palette.leather, 0.95);
    this.add.rectangle(480, 360, 842, 578, 0x000000, 0).setStrokeStyle(2, palette.pale, 0.36);
    this.add.rectangle(480, 72, 730, 8, palette.brown, 0.92);
    this.add.rectangle(480, 648, 730, 8, palette.brown, 0.92);
    for (const x of [68, 892]) {
      this.add.rectangle(x, 360, 18, 578, 0x2a1710, 0.92).setStrokeStyle(2, palette.brown, 0.9);
      for (let y = 104; y <= 616; y += 48) {
        this.add.circle(x, y, 5, palette.yellow, 0.74).setStrokeStyle(1, palette.shadow);
      }
    }
  }

  drawTownSilhouette() {
    const buildings = [
      [132, 402, 118, 84, 'SALOON'], [286, 420, 96, 64, 'STABLE'], [680, 414, 112, 78, 'JAIL'], [828, 426, 124, 58, 'STORE'],
    ];
    buildings.forEach(([x, y, width, height, label]) => {
      this.add.rectangle(x, y, width, height, 0x2a1710, 0.94).setStrokeStyle(2, 0x6f4a2d, 0.72);
      this.add.rectangle(x, y - height / 2 + 10, width + 14, 18, 0x4b3120, 0.96).setStrokeStyle(1, palette.yellow, 0.38);
      this.add.rectangle(x - width / 4, y + height / 2 - 20, 22, 38, palette.shadow, 0.86);
      this.add.text(x, y - height / 2 + 3, label, labelStyle(8, '#f5df9b')).setOrigin(0.5, 0);
    });

    for (let x = 110; x <= 850; x += 48) {
      this.add.line(x, 496, -26, 8, 26, -8, 0xc58b45, 0.26).setLineWidth(2);
    }
  }

  drawRiders() {
    this.add.rectangle(480, 548, 430, 4, palette.brown, 0.72).setDepth(3.5);
    this.drawTitleHorse(362, 582, horseSpriteKeys['brass-hoof'], 118, 88);
    this.animateCharacterSprite(this.add.image(334, 556, partySpriteKeys.marshal).setDisplaySize(56, 56).setDepth(6), { delay: 0, bob: 3, tilt: -2 });
    this.drawTitleHorse(496, 588, horseSpriteKeys['ghost-pepper'], 112, 84);
    this.animateCharacterSprite(this.add.image(468, 562, partySpriteKeys.quickdraw).setDisplaySize(54, 54).setDepth(6), { delay: 180, bob: 4, tilt: 2 });
    this.drawTitleHorse(628, 586, horseSpriteKeys.comet, 108, 82);
    this.animateCharacterSprite(this.add.image(602, 562, partySpriteKeys.sawbones).setDisplaySize(54, 54).setDepth(6), { delay: 320, bob: 3, tilt: 1.5 });
    this.add.rectangle(496, 620, 410, 14, palette.shadow, 0.32).setDepth(4);
  }

  drawTitleHorse(x, y, spriteKey, width, height) {
    this.add.ellipse(x + 2, y + 35, width * 0.92, 20, palette.shadow, 0.24).setDepth(4);
    const horse = this.add.image(x, y, spriteKey).setDepth(5);
    this.fitImageToBox(horse, width, height);
    return horse;
  }

  drawDust() {
    for (let index = 0; index < 10; index += 1) {
      const puff = this.add.circle(170 + index * 68, 582 + (index % 3) * 13, 16 + (index % 4) * 4, palette.pale, 0.08).setDepth(3);
      this.tweens.add({
        targets: puff,
        x: puff.x + 28,
        alpha: 0.02,
        scale: 1.25,
        duration: 2200 + index * 110,
        yoyo: true,
        repeat: -1,
        ease: 'Sine.inOut',
      });
    }
  }

  drawTitleLockup() {
    this.add.text(480, 122, 'DUSTFALL TRAILS', titleStyle(58, '#fff8e7')).setOrigin(0.5).setStroke('#070302', 6);
    this.add.text(480, 174, 'A WESTERN ATB TACTICS PROTOTYPE', labelStyle(15, '#f5df9b')).setOrigin(0.5);
    this.add.rectangle(480, 210, 410, 5, palette.brown, 0.9);
    this.add.rectangle(480, 220, 286, 3, palette.yellow, 0.88);
  }

  drawMenuPanel() {
    const buttons = [
      { label: 'New Game', action: () => this.openTutorialPrompt(), enabled: true, key: 'N' },
      ...(this.canContinue ? [{ label: 'Continue', action: () => this.continueAutoSave(), enabled: true, key: 'C' }] : []),
      { label: 'Load Save', action: () => this.openLoadConfirm(), enabled: this.canLoad, key: 'L' },
      { label: 'Options', action: () => this.openAudioOptions(), enabled: true, key: 'O' },
    ];
    const panelHeight = 72 + buttons.length * 46 + 14;
    drawPanel(this, 304, 244, 352, panelHeight, 0.9).setDepth(20);
    this.add.text(330, 264, 'Trail Ledger', titleStyle(22)).setDepth(21);
    buttons.forEach((button, index) => {
      this.drawTitleButton(330, 304 + index * 46, 292, button.label, button.action, button.enabled, button.key);
    });
  }

  drawTitleButton(x, y, width, label, onClick, enabled, keyLabel = '') {
    const base = enabled ? palette.brown : 0x2d2822;
    const textColor = enabled ? '#fff8e7' : '#8d7d67';
    this.add.rectangle(x + 4, y + 5, width, 36, palette.shadow, 0.54).setOrigin(0).setDepth(21);
    const bg = this.add.rectangle(x, y, width, 36, base, enabled ? 0.96 : 0.72).setOrigin(0).setDepth(22);
    bg.setStrokeStyle(2, enabled ? palette.pale : 0x5a5042, enabled ? 0.62 : 0.36);
    this.add.text(x + 18, y + 9, label, labelStyle(13, textColor)).setDepth(23);
    const keyText = keyLabel || (label === 'New Game' ? 'N' : 'L');
    this.add.text(x + width - 28, y + 9, `(${keyText})`, labelStyle(12, enabled ? '#f5df9b' : '#6f6658')).setOrigin(0.5, 0).setDepth(23);
    if (!enabled) return;
    bg.setInteractive({ useHandCursor: true });
    bg.on('pointerover', () => bg.setFillStyle(palette.yellow, 0.96));
    bg.on('pointerout', () => bg.setFillStyle(base, 0.96));
    bg.on('pointerdown', () => {
      this.playSfx('button-town');
      onClick();
    });
  }

  clearPrompt() {
    this.promptObjects.forEach((object) => object.destroy());
    this.promptObjects = [];
    this.promptBackAction = null;
    this.loadConfirmOpen = false;
  }

  handlePromptBack() {
    if (!this.promptObjects.length) return;
    const backAction = this.promptBackAction;
    if (backAction) backAction();
    else this.clearPrompt();
  }

  handleLoadKey() {
    if (!this.canLoad) return;
    if (this.loadConfirmOpen) {
      this.loadSave(this.selectedLoadSlot);
      return;
    }
    this.openLoadConfirm();
  }

  getFirstFilledSlot() {
    if (this.autoSaveInfo) return 'auto';
    return this.saveInfos.find((info) => info)?.slot || 1;
  }

  selectLoadSlot(slot) {
    if (!this.loadConfirmOpen) return;
    if (slot === 'auto') {
      if (!this.autoSaveInfo) return;
      this.selectedLoadSlot = 'auto';
      this.openLoadConfirm();
      return;
    }
    if (!loadGameSlot(slot)) return;
    this.selectedLoadSlot = slot;
    this.openLoadConfirm();
  }

  openTutorialPrompt() {
    this.drawPrompt(
      'Play Tutorial?',
      'Start with one guided battle, then learn the town before the full run begins.',
      [
        { label: 'Yes', action: () => this.newGame() },
        { label: 'No', action: () => this.openSkipConfirm() },
        { label: 'Back (Esc)', action: () => this.clearPrompt() },
      ],
      190,
      () => this.clearPrompt(),
    );
  }

  openSkipConfirm() {
    this.drawPrompt(
      'Skip Tutorial?',
      'Are you sure? The tutorial explains ATB, targeting, enemy intent, horses, cover, and town flow.',
      [
        { label: 'Yes', action: () => this.skipTutorial() },
        { label: 'No', action: () => this.openTutorialPrompt() },
      ],
      178,
      () => this.openTutorialPrompt(),
    );
  }

  openLoadConfirm() {
    if (!this.canLoad) return;
    this.drawLoadSlotPrompt();
    this.loadConfirmOpen = true;
  }

  drawLoadSlotPrompt() {
    this.clearPrompt();
    const existing = new Set(this.children.list);
    this.add.rectangle(480, 360, 960, 720, palette.shadow, 0.46).setDepth(200).setInteractive();
    drawPanel(this, 246, 112, 468, 488, 0.97).setDepth(201);
    this.add.text(278, 136, 'Load Save?', titleStyle(24)).setDepth(202);
    this.add.text(278, 170, 'Choose Autosave or a manual slot. Press (L) to load, (D) to delete, or (Esc) to go back.', {
      ...textStyle(10, '#fff1bf'),
      wordWrap: { width: 400 },
    }).setDepth(202);
    this.drawLoadSlotRow(278, 210, 'auto', this.autoSaveInfo, 1);
    SAVE_SLOTS.forEach((slot, index) => this.drawLoadSlotRow(278, 278 + index * 68, slot, this.saveInfos[slot - 1], index + 2));
    this.drawPromptButton(278, 544, 112, 'Load (L)', () => this.loadSave(this.selectedLoadSlot))
      .forEach((object) => object.setDepth?.(203));
    this.drawPromptButton(424, 544, 112, 'Back (Esc)', () => this.clearPrompt())
      .forEach((object) => object.setDepth?.(203));
    this.drawPromptButton(570, 544, 112, 'Delete (D)', () => this.openDeleteSaveConfirm())
      .forEach((object) => object.setDepth?.(203));
    this.promptObjects = this.children.list.filter((object) => !existing.has(object));
  }

  drawLoadSlotRow(x, y, slot, info, keyIndex) {
    const selected = this.selectedLoadSlot === slot && info;
    const row = this.add.rectangle(x, y, 404, 54, selected ? palette.yellow : palette.shadow, selected ? 0.9 : 0.34)
      .setOrigin(0)
      .setStrokeStyle(2, selected ? palette.shadow : palette.pale, selected ? 0.86 : 0.2)
      .setDepth(202);
    const titleColor = selected ? '#241914' : info ? '#fff8e7' : '#8d7d67';
    const title = slot === 'auto' ? 'Autosave' : `Slot ${slot}`;
    this.add.text(x + 12, y + 8, `${title} (${keyIndex})`, {
      ...labelStyle(slot === 'auto' ? 10 : 11, titleColor),
      wordWrap: { width: 92 },
    }).setDepth(203);
    const detail = info
      ? `${info.label}   $${info.money}   W${info.wanted}   Route ${info.routeProgress}%\n${info.bountyActive ? 'Bounty active' : 'No bounty'}   ${info.crewHealth}`
      : 'Empty slot';
    this.add.text(x + 118, y + 8, detail, {
      ...textStyle(8, selected ? '#241914' : info ? '#fff1bf' : '#8d7d67'),
      wordWrap: { width: 256 },
      lineSpacing: 1,
    }).setDepth(203);
    if (!info) return;
    row.setInteractive({ useHandCursor: true });
    row.on('pointerdown', () => {
      this.selectedLoadSlot = slot;
      this.openLoadConfirm();
    });
  }

  openDeleteSaveConfirm() {
    const isAuto = this.selectedLoadSlot === 'auto';
    const info = isAuto ? this.autoSaveInfo : this.saveInfos[this.selectedLoadSlot - 1];
    if (!info) {
      this.openLoadConfirm();
      return;
    }
    const name = isAuto ? 'Autosave' : `Slot ${this.selectedLoadSlot}`;
    this.drawPrompt(
      'Delete Save?',
      `Delete ${name}? This removes the saved run from this slot.`,
      [
        { label: 'Yes', action: () => this.confirmDeleteSave(this.selectedLoadSlot) },
        { label: 'No', action: () => this.openLoadConfirm() },
      ],
      190,
    );
  }

  confirmDeleteSave(slot) {
    if (slot === 'auto') deleteAutoGame();
    else deleteSaveSlot(slot);
    this.autoSaveInfo = getAutoSaveInfo();
    this.saveInfos = getSaveSlotInfos();
    this.canLoad = hasAnyLoadableGame();
    this.canContinue = Boolean(this.autoSaveInfo);
    const state = this.getState();
    if (state && slot === 'auto') state.autoSaved = false;
    this.selectedLoadSlot = this.getFirstFilledSlot();
    if (this.canLoad) {
      this.openLoadConfirm();
      return;
    }
    this.clearPrompt();
    this.draw();
  }

  drawPrompt(title, body, options, height = 178, backAction = null) {
    this.clearPrompt();
    const existing = new Set(this.children.list);
    this.promptBackAction = backAction;
    this.add.rectangle(480, 360, 960, 720, palette.shadow, 0.46).setDepth(200).setInteractive();
    drawPanel(this, 304, 248, 352, height, 0.97).setDepth(201);
    this.add.text(330, 270, title, titleStyle(22)).setDepth(202);
    this.add.text(330, 304, body, { ...textStyle(11, '#fff1bf'), wordWrap: { width: 292 }, lineSpacing: 3 }).setDepth(202);
    const buttonWidth = options.length >= 3 ? 104 : 132;
    const gap = options.length >= 3 ? 10 : 20;
    const totalWidth = options.length * buttonWidth + (options.length - 1) * gap;
    const startX = 480 - totalWidth / 2;
    options.forEach((option, index) => {
      const button = this.drawPromptButton(startX + index * (buttonWidth + gap), 248 + height - 56, buttonWidth, option.label, option.action);
      button.forEach((object) => object.setDepth?.(203));
    });
    this.promptObjects = this.children.list.filter((object) => !existing.has(object));
  }

  drawPromptButton(x, y, width, label, onClick) {
    this.add.rectangle(x + 3, y + 4, width, 36, palette.shadow, 0.58).setOrigin(0).setDepth(203);
    const bg = this.add.rectangle(x, y, width, 36, palette.brown, 1).setOrigin(0).setDepth(203);
    bg.setStrokeStyle(2, palette.pale, 0.66);
    bg.setInteractive({ useHandCursor: true });
    const text = this.add.text(x + width / 2, y + 9, label, labelStyle(13, '#fff8e7')).setOrigin(0.5, 0).setDepth(203);
    bg.on('pointerover', () => bg.setFillStyle(palette.yellow, 0.96));
    bg.on('pointerout', () => bg.setFillStyle(palette.brown, 1));
    bg.on('pointerdown', () => {
      this.playSfx('button-town');
      onClick();
    });
    return [bg, text];
  }

  newGame() {
    this.clearPrompt();
    const state = createInitialGameState();
    state.tutorial.active = true;
    state.nextEncounterId = 'tutorialDustup';
    this.registry.set('gameState', state);
    this.stopTitleTrailMusic();
    this.scene.start(scenes.BATTLE);
  }

  skipTutorial() {
    this.clearPrompt();
    const state = createInitialGameState();
    state.tutorial.skipped = true;
    state.tutorial.battleComplete = true;
    state.tutorial.townComplete = true;
    state.tutorial.partyMenusComplete = true;
    state.tutorial.active = false;
    this.registry.set('gameState', state);
    this.stopTitleTrailMusic();
    this.scene.start(scenes.HUB);
  }

  loadSave(slot = 1) {
    if (!this.canLoad) return;
    const saved = slot === 'auto' ? loadAutoGame() : loadGameSlot(slot);
    if (!saved) return;
    delete saved.savedAt;
    delete saved.slot;
    this.registry.set('gameState', saved);
    this.routeLoadedState(saved);
  }

  continueAutoSave() {
    if (!this.canContinue) return;
    this.drawAutoSavePrompt();
  }

  drawAutoSavePrompt() {
    this.clearPrompt();
    const existing = new Set(this.children.list);
    this.add.rectangle(480, 360, 960, 720, palette.shadow, 0.46).setDepth(200).setInteractive();
    drawPanel(this, 246, 224, 468, 232, 0.97).setDepth(201);
    this.add.text(278, 248, 'Continue Autosave?', titleStyle(24)).setDepth(202);
    this.add.text(278, 282, 'Review the autosave data before continuing.', {
      ...textStyle(10, '#fff1bf'),
      wordWrap: { width: 400 },
    }).setDepth(202);
    this.drawLoadSlotRow(278, 318, 'auto', this.autoSaveInfo, 1);
    this.drawPromptButton(278, 394, 132, 'Continue', () => this.loadSave('auto'))
      .forEach((object) => object.setDepth?.(203));
    this.drawPromptButton(436, 394, 132, 'No', () => this.clearPrompt())
      .forEach((object) => object.setDepth?.(203));
    this.promptObjects = this.children.list.filter((object) => !existing.has(object));
  }

  routeLoadedState(state) {
    this.stopTitleTrailMusic();
    if (state.nextEncounterId || !state.tutorial?.battleComplete) {
      this.scene.start(scenes.BATTLE);
      return;
    }
    if (state.routeProgress > 0 || state.bountyActive) {
      this.scene.start(scenes.TRAVEL);
      return;
    }
    this.scene.start(scenes.HUB);
  }
}
