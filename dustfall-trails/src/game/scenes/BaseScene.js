import Phaser from 'phaser';
import { spriteAssets } from '../assets/sprites/index.js';
import { desertTileset } from '../assets/tiles/free-desert/index.js';
import { palette } from '../config/gameData.js';
import { drawPanel, labelStyle, textStyle, titleStyle } from '../ui/drawing.js';

export default class BaseScene extends Phaser.Scene {
  preload() {
    spriteAssets.forEach((asset) => {
      if (!this.textures.exists(asset.key)) {
        if (asset.type === 'image') this.load.image(asset.key, asset.url);
        else this.load.svg(asset.key, asset.url, { width: asset.width, height: asset.height });
      }
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
  }

  getState() {
    return this.registry.get('gameState');
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
