import Phaser from 'phaser';
import { palette } from '../config/gameData.js';

export function textStyle(size, color) {
  return {
    color: Phaser.Display.Color.IntegerToColor(color).rgba,
    fontFamily: 'Georgia, "Times New Roman", serif',
    fontSize: `${size}px`,
    letterSpacing: 0,
  };
}

export function drawPanel(scene, x, y, width, height, title) {
  scene.add.rectangle(x + width / 2, y + height / 2, width, height, palette.panel)
    .setStrokeStyle(3, palette.brass);
  scene.add.rectangle(x + width / 2, y + 8, width - 14, 4, palette.copper);
  scene.add.image(x + width - 24, y + 24, 'gear').setScale(0.26).setAlpha(0.65);
  if (title) {
    scene.add.text(x + 18, y + 12, title, textStyle(14, palette.amber)).setFontStyle('700');
  }
}

export function drawBar(scene, x, y, width, height, ratio, color) {
  const safeRatio = Phaser.Math.Clamp(ratio || 0, 0, 1);
  scene.add.rectangle(x + width / 2, y + height / 2, width, height, palette.panelDark)
    .setStrokeStyle(1, palette.brass);
  scene.add.rectangle(x + (width * safeRatio) / 2, y + height / 2, width * safeRatio, height, color);
}
