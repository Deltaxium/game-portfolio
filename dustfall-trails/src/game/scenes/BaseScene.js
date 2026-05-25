import Phaser from 'phaser';
import { musicAssets, musicKeys, voiceAssets } from '../assets/audio/index.js';
import { horseSourceSpriteKeys, horseSpriteKeys, spriteAssets } from '../assets/sprites/index.js';
import { desertTileset } from '../assets/tiles/free-desert/index.js';
import { palette } from '../config/gameData.js';
import { playSfx, speakStance } from '../systems/audio.js';
import { saveAutoGame } from '../systems/save.js';
import { clearPreviewAudioSettings, getAudioSettings, saveAudioSettings, setPreviewAudioSettings } from '../systems/settings.js';
import { drawButton, drawPanel, labelStyle, textStyle, titleStyle } from '../ui/drawing.js';

export default class BaseScene extends Phaser.Scene {
  preload() {
    spriteAssets.forEach((asset) => {
      if (!this.textures.exists(asset.key)) {
        if (asset.type === 'image') this.load.image(asset.key, asset.url);
        else this.load.svg(asset.key, asset.url, { width: asset.width, height: asset.height });
      }
    });
    voiceAssets.forEach((asset) => {
      if (!this.cache.audio.exists(asset.key)) this.load.audio(asset.key, asset.url);
    });
    musicAssets.forEach((asset) => {
      if (!this.cache.audio.exists(asset.key)) this.load.audio(asset.key, asset.url);
    });
    if (!this.textures.exists(desertTileset.key)) {
      this.load.spritesheet(desertTileset.key, desertTileset.url, {
        frameWidth: desertTileset.frameWidth,
        frameHeight: desertTileset.frameHeight,
      });
    }
  }

  create() {
    this.textures.get(desertTileset.key)?.setFilter(Phaser.Textures.FilterMode.NEAREST);
    this.createHorseCutoutTextures();
    this.ensureMusicFocusHandling();
    this.ensureAudioOptionsInput();
    this.ensureAutoSaveHandling();
    this.applyAudioSettings(getAudioSettings());
  }

  getState() {
    return this.registry.get('gameState');
  }

  playSfx(name) {
    playSfx(name);
  }

  ensureAutoSaveHandling() {
    if (!this.registry.get('autoSaveHandlingReady')) {
      this.registry.set('autoSaveHandlingReady', true);
      window.addEventListener('beforeunload', () => this.saveCurrentProgress());
      document.addEventListener('visibilitychange', () => {
        if (document.visibilityState === 'hidden') this.saveCurrentProgress();
      });
    }
    this.events.once('shutdown', () => this.saveCurrentProgress());
  }

  saveCurrentProgress() {
    saveAutoGame(this.getState());
  }

  getInventorySnapshot(state = this.getState()) {
    return {
      money: state.money || 0,
      supplies: state.supplies || 0,
      items: { ...(state.items || {}) },
      capturedBounties: [...(state.capturedBounties || [])],
    };
  }

  beginTrailLedger() {
    const state = this.getState();
    state.trailLedger = this.getInventorySnapshot(state);
    state.lastTrailReport = null;
    this.saveCurrentProgress();
  }

  completeTrailLedger() {
    const state = this.getState();
    if (!state.trailLedger) return null;
    const before = state.trailLedger;
    const after = this.getInventorySnapshot(state);
    const itemIds = [...new Set([...Object.keys(before.items || {}), ...Object.keys(after.items || {})])];
    const itemChanges = itemIds
      .map((id) => ({ id, amount: (after.items[id] || 0) - (before.items[id] || 0) }))
      .filter((item) => item.amount !== 0);
    const captured = (after.capturedBounties || []).filter(
      (bounty) => !(before.capturedBounties || []).some((entry) => entry.id === bounty.id),
    );
    const report = {
      money: after.money - before.money,
      supplies: after.supplies - before.supplies,
      items: itemChanges,
      captured,
    };
    state.lastTrailReport = report;
    state.trailLedger = null;
    this.saveCurrentProgress();
    return report;
  }

  ensureMusicFocusHandling() {
    this.sound.pauseOnBlur = false;
    if (this.registry.get('musicFocusHandlingReady')) return;
    this.registry.set('musicFocusHandlingReady', true);
    const resume = () => this.resumeActiveMusicAfterFocus();
    document.addEventListener('visibilitychange', resume);
    window.addEventListener('focus', resume);
    window.addEventListener('pageshow', resume);
  }

  resumeActiveMusicAfterFocus() {
    this.sound.context?.resume?.();
    [
      { key: 'titleTrailMusic' },
      { key: 'townMusic', pausedFlag: 'townMusicPausedByMenu' },
      { key: 'battleMusic' },
    ].forEach(({ key, pausedFlag }) => {
      if (pausedFlag && this.registry.get(pausedFlag)) return;
      const music = this.registry.get(key);
      if (!music || music.pendingRemove) return;
      this.applyMusicVolume(music);
      if (music.isPaused) music.resume();
      else if (!music.isPlaying) music.play();
    });
  }

  ensureAudioOptionsInput() {
    if (this.audioOptionsInputReady || !this.input?.keyboard) return;
    this.audioOptionsInputReady = true;
    [
      ['keydown-UP', 'up'],
      ['keydown-W', 'up'],
      ['keydown-DOWN', 'down'],
      ['keydown-S', 'down'],
      ['keydown-LEFT', 'left'],
      ['keydown-A', 'left'],
      ['keydown-RIGHT', 'right'],
      ['keydown-D', 'right'],
      ['keydown-ENTER', 'save'],
      ['keydown-ESC', 'cancel'],
    ].forEach(([eventName, action]) => {
      this.input.keyboard.on(eventName, () => this.handleAudioOptionsInput(action));
    });
  }

  getCurrentAudioSettings() {
    return this.audioOptionsState?.values || getAudioSettings();
  }

  getMusicVolume(baseVolume = 0.18) {
    return baseVolume * this.getCurrentAudioSettings().music;
  }

  applyMusicVolume(music) {
    if (!music) return;
    const baseVolume = music.getData?.('baseVolume') ?? 0.18;
    music.setVolume?.(this.getMusicVolume(baseVolume));
  }

  applyAudioSettings(settings = getAudioSettings()) {
    ['titleTrailMusic', 'townMusic', 'battleMusic'].forEach((key) => {
      const music = this.registry.get(key);
      if (!music) return;
      const baseVolume = music.getData?.('baseVolume') ?? 0.18;
      music.setVolume?.(baseVolume * settings.music);
    });
    return settings;
  }

  createManagedMusic(registryKey, musicKey, baseVolume) {
    const music = this.sound.add(musicKey, { loop: true, volume: this.getMusicVolume(baseVolume) });
    music.setData?.('baseVolume', baseVolume);
    music.play();
    this.registry.set(registryKey, music);
    return music;
  }

  startTitleTrailMusic() {
    const existing = this.registry.get('titleTrailMusic');
    if (existing && !existing.pendingRemove) {
      this.applyMusicVolume(existing);
      if (!existing.isPlaying && !existing.isPaused) existing.play();
      return existing;
    }
    return this.createManagedMusic('titleTrailMusic', musicKeys.titleTrail, 0.18);
  }

  stopTitleTrailMusic() {
    const titleTrailMusic = this.registry.get('titleTrailMusic');
    if (titleTrailMusic) {
      titleTrailMusic.stop();
      titleTrailMusic.destroy();
      this.registry.remove('titleTrailMusic');
      return;
    }
    this.sound.stopByKey?.(musicKeys.titleTrail);
  }

  startTownMusic() {
    const existing = this.registry.get('townMusic');
    if (existing && !existing.pendingRemove) {
      this.applyMusicVolume(existing);
      if (!existing.isPlaying && !existing.isPaused) existing.play();
      return existing;
    }
    return this.createManagedMusic('townMusic', musicKeys.town, 0.18);
  }

  pauseTownMusic() {
    const townMusic = this.registry.get('townMusic');
    this.registry.set('townMusicPausedByMenu', true);
    if (townMusic?.isPlaying) townMusic.pause();
  }

  resumeTownMusic() {
    const townMusic = this.registry.get('townMusic');
    this.registry.set('townMusicPausedByMenu', false);
    if (townMusic?.isPaused) townMusic.resume();
  }

  stopTownMusic() {
    const townMusic = this.registry.get('townMusic');
    if (townMusic) {
      townMusic.stop();
      townMusic.destroy();
      this.registry.remove('townMusic');
      this.registry.remove('townMusicPausedByMenu');
      return;
    }
    this.sound.stopByKey?.(musicKeys.town);
  }

  openAudioOptions(onClose = () => {}) {
    this.closeAudioOptions(false);
    this.audioOptionsOnClose = onClose;
    this.audioOptionsState = {
      values: { ...getAudioSettings() },
      selected: 0,
    };
    setPreviewAudioSettings(this.audioOptionsState.values);
    this.drawAudioOptions();
  }

  closeAudioOptions(callClose = true) {
    this.audioOptionsObjects?.forEach((object) => {
      if (object?.active) object.destroy();
    });
    this.audioOptionsObjects = [];
    this.audioOptionsState = null;
    this.audioOptionsJustClosed = true;
    window.setTimeout?.(() => {
      this.audioOptionsJustClosed = false;
    }, 0);
    const onClose = this.audioOptionsOnClose;
    this.audioOptionsOnClose = null;
    if (callClose) onClose?.();
  }

  saveAudioOptions() {
    if (!this.audioOptionsState) return;
    const saved = saveAudioSettings(this.audioOptionsState.values);
    clearPreviewAudioSettings();
    this.applyAudioSettings(saved);
    this.playSfx('button-town');
    this.closeAudioOptions();
  }

  cancelAudioOptions() {
    if (!this.audioOptionsState) return;
    clearPreviewAudioSettings();
    this.applyAudioSettings(getAudioSettings());
    this.playSfx('button-town');
    this.closeAudioOptions();
  }

  handleAudioOptionsInput(action) {
    if (!this.audioOptionsState) return;
    if (action === 'up' || action === 'down') {
      this.audioOptionsState.selected = action === 'up' ? 0 : 1;
      this.drawAudioOptions();
      return;
    }
    if (action === 'left' || action === 'right') {
      const key = this.audioOptionsState.selected === 0 ? 'music' : 'sfx';
      const delta = action === 'left' ? -0.05 : 0.05;
      this.audioOptionsState.values[key] = Math.max(0, Math.min(1, this.audioOptionsState.values[key] + delta));
      setPreviewAudioSettings(this.audioOptionsState.values);
      if (key === 'music') this.applyAudioSettings(this.audioOptionsState.values);
      this.drawAudioOptions();
      this.playSfx('button-town');
      return;
    }
    if (action === 'save') this.saveAudioOptions();
    if (action === 'cancel') this.cancelAudioOptions();
  }

  drawAudioOptions() {
    if (!this.audioOptionsState) return;
    this.audioOptionsObjects?.forEach((object) => {
      if (object?.active) object.destroy();
    });
    const existing = new Set(this.children.list);
    this.add.rectangle(480, 360, 960, 720, palette.shadow, 0.56).setDepth(270).setInteractive();
    drawPanel(this, 292, 184, 376, 326, 0.98).setDepth(271);
    this.add.text(326, 212, 'Options', titleStyle(27)).setDepth(272);
    this.add.text(326, 250, 'Adjust audio, then save or cancel.', { ...textStyle(10, '#fff1bf'), fixedWidth: 300 }).setDepth(272);
    this.drawAudioSlider(326, 300, 'Music Volume', 'music', this.audioOptionsState.values.music, this.audioOptionsState.selected === 0);
    this.drawAudioSlider(326, 372, 'SFX Volume', 'sfx', this.audioOptionsState.values.sfx, this.audioOptionsState.selected === 1);
    drawButton(this, 326, 448, 136, 'Save', () => this.saveAudioOptions(), true, 'support').forEach((object) => object.setDepth?.(273));
    drawButton(this, 500, 448, 136, 'Cancel', () => this.cancelAudioOptions(), false, 'default').forEach((object) => object.setDepth?.(273));
    this.audioOptionsObjects = this.children.list.filter((object) => !existing.has(object));
    this.audioOptionsObjects.forEach((object) => object.setDepth?.(object.depth || 273));
  }

  drawAudioSlider(x, y, label, key, value, selected) {
    const percent = Math.round(value * 100);
    const bg = this.add.rectangle(x, y, 308, 54, selected ? palette.yellow : palette.shadow, selected ? 0.16 : 0.28).setOrigin(0).setDepth(272)
      .setStrokeStyle(2, selected ? palette.yellow : palette.pale, selected ? 0.82 : 0.22);
    this.add.text(x + 12, y + 8, label, labelStyle(11, selected ? '#fff8e7' : '#f5df9b')).setDepth(273);
    this.add.text(x + 250, y + 8, `${percent}%`, labelStyle(10, '#fff8e7')).setOrigin(1, 0).setDepth(273);
    this.add.rectangle(x + 12, y + 34, 240, 8, palette.shadow, 0.86).setOrigin(0).setDepth(273);
    this.add.rectangle(x + 12, y + 34, 240 * value, 8, selected ? palette.yellow : palette.green, 1).setOrigin(0).setDepth(274);
    this.add.rectangle(x + 8 + 240 * value, y + 29, 8, 18, palette.white, 1).setOrigin(0).setDepth(275);
    bg.setInteractive({ useHandCursor: true });
    bg.on('pointerdown', (pointer) => {
      this.audioOptionsState.selected = key === 'music' ? 0 : 1;
      const next = Math.max(0, Math.min(1, (pointer.x - (x + 12)) / 240));
      this.audioOptionsState.values[key] = next;
      setPreviewAudioSettings(this.audioOptionsState.values);
      if (key === 'music') this.applyAudioSettings(this.audioOptionsState.values);
      this.drawAudioOptions();
      this.playSfx('button-town');
    });
  }

  fitImageToBox(image, maxWidth, maxHeight, scale = 1) {
    const source = image.texture?.getSourceImage?.();
    const sourceWidth = source?.width || image.width || maxWidth;
    const sourceHeight = source?.height || image.height || maxHeight;
    const fit = Math.min(maxWidth / sourceWidth, maxHeight / sourceHeight) * scale;
    image.setDisplaySize(sourceWidth * fit, sourceHeight * fit);
    return image;
  }

  createHorseCutoutTextures() {
    Object.entries(horseSpriteKeys).forEach(([horseId, cutoutKey]) => {
      if (this.textures.exists(cutoutKey)) this.textures.remove(cutoutKey);
      const sourceKey = horseSourceSpriteKeys[horseId];
      const sourceImage = this.textures.get(sourceKey)?.getSourceImage?.();
      if (!sourceImage) return;

      const canvas = document.createElement('canvas');
      canvas.width = sourceImage.width;
      canvas.height = sourceImage.height;
      const context = canvas.getContext('2d', { willReadFrequently: true });
      context.drawImage(sourceImage, 0, 0);
      const imageData = context.getImageData(0, 0, canvas.width, canvas.height);
      this.removeEdgeBackground(imageData, canvas.width, canvas.height);
      this.fillHorseSpriteMatte(imageData, canvas.width, canvas.height);
      context.putImageData(imageData, 0, 0);
      this.textures.addCanvas(cutoutKey, canvas);
    });
  }

  removeEdgeBackground(imageData, width, height) {
    const data = imageData.data;
    const background = [data[0], data[1], data[2]];
    const visited = new Uint8Array(width * height);
    const stack = [];
    const push = (x, y) => {
      if (x < 0 || y < 0 || x >= width || y >= height) return;
      const index = y * width + x;
      if (visited[index]) return;
      visited[index] = 1;
      stack.push(index);
    };
    for (let x = 0; x < width; x += 1) {
      push(x, 0);
      push(x, height - 1);
    }
    for (let y = 1; y < height - 1; y += 1) {
      push(0, y);
      push(width - 1, y);
    }

    while (stack.length) {
      const index = stack.pop();
      const offset = index * 4;
      if (!this.isHorseBackgroundPixel(data, offset, background)) continue;
      data[offset + 3] = 0;
      const x = index % width;
      const y = Math.floor(index / width);
      push(x + 1, y);
      push(x - 1, y);
      push(x, y + 1);
      push(x, y - 1);
    }
  }

  isHorseBackgroundPixel(data, offset, background) {
    if (data[offset + 3] < 8) return true;
    const red = data[offset] - background[0];
    const green = data[offset + 1] - background[1];
    const blue = data[offset + 2] - background[2];
    return red * red + green * green + blue * blue < 26 * 26;
  }

  fillHorseSpriteMatte(imageData, width, height) {
    const data = imageData.data;
    const horseMask = new Uint8Array(width * height);
    for (let index = 0; index < horseMask.length; index += 1) {
      horseMask[index] = data[index * 4 + 3] >= 8 ? 1 : 0;
    }
    const matteMask = this.createDilatedHorseMask(horseMask, width, height, 3);
    const matte = this.colorToRgb(palette.shadow);
    for (let y = 0; y < height; y += 1) {
      for (let x = 0; x < width; x += 1) {
        const index = y * width + x;
        if (horseMask[index] || !matteMask[index]) continue;
        const offset = index * 4;
        data[offset] = matte.r;
        data[offset + 1] = matte.g;
        data[offset + 2] = matte.b;
        data[offset + 3] = this.isInsideHorseSpan(horseMask, width, height, x, y) ? 220 : 150;
      }
    }
  }

  createDilatedHorseMask(sourceMask, width, height, radius) {
    const result = new Uint8Array(width * height);
    for (let y = 0; y < height; y += 1) {
      for (let x = 0; x < width; x += 1) {
        const sourceIndex = y * width + x;
        if (!sourceMask[sourceIndex]) continue;
        for (let yy = Math.max(0, y - radius); yy <= Math.min(height - 1, y + radius); yy += 1) {
          for (let xx = Math.max(0, x - radius); xx <= Math.min(width - 1, x + radius); xx += 1) {
            const distance = Math.abs(xx - x) + Math.abs(yy - y);
            if (distance <= radius) result[yy * width + xx] = 1;
          }
        }
      }
    }
    return result;
  }

  isInsideHorseSpan(mask, width, height, x, y) {
    const hasLeft = this.hasMaskPixelInDirection(mask, width, height, x, y, -1, 0);
    const hasRight = this.hasMaskPixelInDirection(mask, width, height, x, y, 1, 0);
    const hasUp = this.hasMaskPixelInDirection(mask, width, height, x, y, 0, -1);
    const hasDown = this.hasMaskPixelInDirection(mask, width, height, x, y, 0, 1);
    return (hasLeft && hasRight) || (hasUp && hasDown);
  }

  hasMaskPixelInDirection(mask, width, height, x, y, dx, dy) {
    for (let step = 1; step <= 14; step += 1) {
      const xx = x + dx * step;
      const yy = y + dy * step;
      if (xx < 0 || yy < 0 || xx >= width || yy >= height) return false;
      if (mask[yy * width + xx]) return true;
    }
    return false;
  }

  colorToRgb(color) {
    return {
      r: (color >> 16) & 255,
      g: (color >> 8) & 255,
      b: color & 255,
    };
  }

  animateCharacterSprite(image, { bob = 4, tilt = 2, duration = 900, delay = 0 } = {}) {
    this.tweens.add({
      targets: image,
      y: image.y - bob,
      angle: tilt,
      scaleY: image.scaleY * 1.04,
      duration,
      delay,
      yoyo: true,
      repeat: -1,
      ease: 'Sine.inOut',
    });
    this.tweens.add({
      targets: image,
      scaleX: image.scaleX * 0.97,
      duration: Math.round(duration * 0.72),
      delay: delay + Math.round(duration * 0.22),
      yoyo: true,
      repeat: -1,
      ease: 'Sine.inOut',
    });
    return image;
  }

  speakStance(stance) {
    speakStance(stance);
  }

  drawFrame(title, subtitle = '') {
    this.cameras.main.setBackgroundColor(palette.dark);
    drawPanel(this, 18, 16, 924, 72, 0.88);
    this.add.text(38, 28, title, titleStyle(30));
    if (subtitle) this.add.text(40, 60, subtitle, textStyle(14, '#e2d9bd'));
  }

  drawStats() {
    const state = this.getState();
    const stats = [`Money $${state.money}`, `Wanted ${state.wanted}`, `Supplies ${state.supplies}`, `Showdown ${Math.round(state.showdown)}%`];
    this.add.text(626, 38, stats.join('   '), labelStyle(13, '#f5df9b')).setOrigin(0.5, 0);
  }
}
