import { horseSpriteKeys, partySpriteKeys } from '../assets/sprites/index.js';
import { desertTileset } from '../assets/tiles/free-desert/index.js';
import { palette, scenes } from '../config/gameData.js';
import {
  createInitialGameState,
  getSaveSlotInfos,
  hasAnySaveGame,
  loadGameSlot,
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
    this.canLoad = hasAnySaveGame();
    this.saveInfos = getSaveSlotInfos();
    this.promptObjects = [];
    this.loadConfirmOpen = false;
    this.selectedLoadSlot = this.getFirstFilledSlot();
    this.draw();
    this.input.keyboard.on('keydown-ENTER', () => this.openTutorialPrompt());
    this.input.keyboard.on('keydown-SPACE', () => this.openTutorialPrompt());
    this.input.keyboard.on('keydown-N', () => this.openTutorialPrompt());
    this.input.keyboard.on('keydown-L', () => this.handleLoadKey());
    this.input.keyboard.on('keydown-ONE', () => this.selectLoadSlot(1));
    this.input.keyboard.on('keydown-TWO', () => this.selectLoadSlot(2));
    this.input.keyboard.on('keydown-THREE', () => this.selectLoadSlot(3));
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
    this.add.image(380, 486, horseSpriteKeys['brass-hoof']).setDisplaySize(118, 78).setDepth(5);
    this.add.image(350, 458, partySpriteKeys.marshal).setDisplaySize(62, 62).setDepth(6);
    this.add.image(496, 494, horseSpriteKeys['ghost-pepper']).setDisplaySize(112, 74).setDepth(5);
    this.add.image(466, 468, partySpriteKeys.quickdraw).setDisplaySize(58, 58).setDepth(6);
    this.add.image(606, 496, horseSpriteKeys.comet).setDisplaySize(108, 72).setDepth(5);
    this.add.image(578, 472, partySpriteKeys.sawbones).setDisplaySize(58, 58).setDepth(6);
    this.add.rectangle(480, 532, 360, 16, palette.shadow, 0.34).setDepth(4);
  }

  drawDust() {
    for (let index = 0; index < 10; index += 1) {
      const puff = this.add.circle(190 + index * 66, 504 + (index % 3) * 16, 18 + (index % 4) * 4, palette.pale, 0.08).setDepth(3);
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
    drawPanel(this, 304, 248, 352, 168, 0.9);
    this.add.text(330, 268, 'Trail Ledger', titleStyle(22));
    this.drawTitleButton(330, 310, 292, 'New Game', () => this.openTutorialPrompt(), true);
    this.drawTitleButton(330, 358, 292, 'Load Save', () => this.openLoadConfirm(), this.canLoad);
    const filled = this.saveInfos.filter(Boolean).length;
    const saveText = filled
      ? `${filled}/3 save slots filled. Load Save shows slot details.`
      : 'No saved run found. Start a new trail.';
    this.add.text(330, 412, saveText, { ...textStyle(10, '#d8c7a0'), wordWrap: { width: 292 } });
  }

  drawTitleButton(x, y, width, label, onClick, enabled) {
    const base = enabled ? palette.brown : 0x2d2822;
    const textColor = enabled ? '#fff8e7' : '#8d7d67';
    this.add.rectangle(x + 4, y + 5, width, 36, palette.shadow, 0.54).setOrigin(0);
    const bg = this.add.rectangle(x, y, width, 36, base, enabled ? 0.96 : 0.72).setOrigin(0);
    bg.setStrokeStyle(2, enabled ? palette.pale : 0x5a5042, enabled ? 0.62 : 0.36);
    this.add.text(x + 18, y + 9, label, labelStyle(13, textColor));
    this.add.text(x + width - 28, y + 9, label === 'New Game' ? 'N' : 'L', labelStyle(12, enabled ? '#f5df9b' : '#6f6658')).setOrigin(0.5, 0);
    if (!enabled) return;
    bg.setInteractive({ useHandCursor: true });
    bg.on('pointerover', () => bg.setFillStyle(palette.yellow, 0.96));
    bg.on('pointerout', () => bg.setFillStyle(base, 0.96));
    bg.on('pointerdown', onClick);
  }

  clearPrompt() {
    this.promptObjects.forEach((object) => object.destroy());
    this.promptObjects = [];
    this.loadConfirmOpen = false;
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
    return this.saveInfos.find((info) => info)?.slot || 1;
  }

  selectLoadSlot(slot) {
    if (!this.loadConfirmOpen) return;
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
      ],
    );
  }

  openSkipConfirm() {
    this.drawPrompt(
      'Skip Tutorial?',
      'Are you sure? The tutorial explains ATB, targeting, enemy intent, horses, cover, and town flow.',
      [
        { label: 'Yes', action: () => this.openTutorialPrompt() },
        { label: 'No', action: () => this.skipTutorial() },
      ],
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
    drawPanel(this, 246, 178, 468, 364, 0.97).setDepth(201);
    this.add.text(278, 202, 'Load Save?', titleStyle(24)).setDepth(202);
    this.add.text(278, 236, 'Choose a slot, then press L again to continue.', {
      ...textStyle(10, '#fff1bf'),
      wordWrap: { width: 400 },
    }).setDepth(202);
    SAVE_SLOTS.forEach((slot, index) => this.drawLoadSlotRow(278, 276 + index * 68, slot));
    this.drawPromptButton(278, 482, 132, 'Load  L', () => this.loadSave(this.selectedLoadSlot))
      .forEach((object) => object.setDepth?.(203));
    this.drawPromptButton(436, 482, 132, 'No', () => this.clearPrompt())
      .forEach((object) => object.setDepth?.(203));
    this.promptObjects = this.children.list.filter((object) => !existing.has(object));
  }

  drawLoadSlotRow(x, y, slot) {
    const info = this.saveInfos[slot - 1];
    const selected = this.selectedLoadSlot === slot && info;
    const row = this.add.rectangle(x, y, 404, 54, selected ? palette.yellow : palette.shadow, selected ? 0.9 : 0.34)
      .setOrigin(0)
      .setStrokeStyle(2, selected ? palette.shadow : palette.pale, selected ? 0.86 : 0.2)
      .setDepth(202);
    const titleColor = selected ? '#241914' : info ? '#fff8e7' : '#8d7d67';
    this.add.text(x + 12, y + 8, `Slot ${slot}`, labelStyle(11, titleColor)).setDepth(203);
    const detail = info
      ? `${info.label}   $${info.money}   W${info.wanted}   Route ${info.routeProgress}%\n${info.bountyActive ? 'Bounty active' : 'No bounty'}   ${info.crewHealth}`
      : 'Empty slot';
    this.add.text(x + 84, y + 8, detail, {
      ...textStyle(8, selected ? '#241914' : info ? '#fff1bf' : '#8d7d67'),
      wordWrap: { width: 292 },
      lineSpacing: 1,
    }).setDepth(203);
    if (!info) return;
    row.setInteractive({ useHandCursor: true });
    row.on('pointerdown', () => {
      this.selectedLoadSlot = slot;
      this.openLoadConfirm();
    });
  }

  drawPrompt(title, body, options, height = 178) {
    this.clearPrompt();
    const existing = new Set(this.children.list);
    this.add.rectangle(480, 360, 960, 720, palette.shadow, 0.46).setDepth(200).setInteractive();
    drawPanel(this, 304, 248, 352, height, 0.97).setDepth(201);
    this.add.text(330, 270, title, titleStyle(22)).setDepth(202);
    this.add.text(330, 304, body, { ...textStyle(11, '#fff1bf'), wordWrap: { width: 292 }, lineSpacing: 3 }).setDepth(202);
    options.forEach((option, index) => {
      const button = this.drawPromptButton(330 + index * 152, 248 + height - 56, 132, option.label, option.action);
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
    bg.on('pointerdown', onClick);
    return [bg, text];
  }

  newGame() {
    this.clearPrompt();
    const state = createInitialGameState();
    state.tutorial.active = true;
    state.nextEncounterId = 'tutorialDustup';
    this.registry.set('gameState', state);
    this.scene.start(scenes.BATTLE);
  }

  skipTutorial() {
    this.clearPrompt();
    const state = createInitialGameState();
    state.tutorial.battleComplete = true;
    state.tutorial.townComplete = true;
    this.registry.set('gameState', state);
    this.scene.start(scenes.HUB);
  }

  loadSave(slot = 1) {
    if (!this.canLoad) return;
    const saved = loadGameSlot(slot);
    if (!saved) return;
    delete saved.savedAt;
    delete saved.slot;
    this.registry.set('gameState', saved);
    this.scene.start(scenes.HUB);
  }
}
