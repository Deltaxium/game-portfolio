import { palette } from '../config/gameData.js';

export function textStyle(size = 16, color = '#fff8e7') {
  const fontSize = Math.max(10, size);
  return {
    fontFamily: 'Verdana, Arial, Helvetica, sans-serif',
    fontSize: `${fontSize}px`,
    fontStyle: 'normal',
    color,
    stroke: color === '#241914' || color === '#3a2115' || color === '#4b3120' ? undefined : '#070302',
    strokeThickness: color === '#241914' || color === '#3a2115' || color === '#4b3120' ? 0 : 2,
    shadow: color === '#241914' || color === '#3a2115' || color === '#4b3120'
      ? undefined
      : { offsetX: 1, offsetY: 1, color: '#070302', blur: 0, fill: true },
  };
}

export function titleStyle(size = 30, color = '#fff8e7') {
  const fontSize = Math.max(18, size);
  return {
    fontFamily: 'Verdana, Arial, Helvetica, sans-serif',
    fontSize: `${fontSize}px`,
    fontStyle: 'bold',
    color,
    stroke: color === '#241914' ? undefined : '#070302',
    strokeThickness: color === '#241914' ? 0 : 3,
  };
}

export function labelStyle(size = 10, color = '#f5df9b') {
  return {
    ...textStyle(Math.max(9, size), color),
    fontStyle: 'bold',
  };
}

export function drawPanel(scene, x, y, width, height, alpha = 0.94) {
  const graphics = scene.add.graphics();
  graphics.fillStyle(palette.shadow, 0.68);
  graphics.fillRoundedRect(x + 4, y + 5, width, height, 8);
  graphics.fillStyle(palette.panel, alpha);
  graphics.fillRoundedRect(x, y, width, height, 8);
  graphics.lineStyle(3, palette.shadow, 0.98);
  graphics.strokeRoundedRect(x, y, width, height, 8);
  graphics.lineStyle(2, palette.pale, 0.58);
  graphics.strokeRoundedRect(x + 3, y + 3, width - 6, height - 6, 5);
  graphics.lineStyle(1, palette.white, 0.26);
  graphics.lineBetween(x + 14, y + 11, x + width - 14, y + 11);
  return graphics;
}

export function drawButton(scene, x, y, width, label, onClick, primary = false, tone = 'default', options = {}) {
  const tones = {
    attack: { base: palette.red, hover: 0xd35a43 },
    move: { base: palette.green, hover: 0x7fba61 },
    stance: { base: palette.blue, hover: 0x72b0c4 },
    support: { base: palette.brown, hover: palette.leather },
    default: { base: palette.brown, hover: palette.leather },
  };
  const disabled = Boolean(options.disabled);
  const selectedTone = tones[tone] || tones.default;
  const baseColor = disabled ? 0x4f4639 : primary ? palette.pale : selectedTone.base;
  const hoverColor = disabled ? baseColor : primary ? palette.yellow : selectedTone.hover;
  const textColor = disabled ? '#b7ac94' : primary ? '#241914' : '#fff8e7';
  const shadow = scene.add.rectangle(x + 3, y + 4, width, 38, palette.shadow, disabled ? 0.34 : 0.58).setOrigin(0);
  const bg = scene.add.rectangle(x, y, width, 38, baseColor, disabled ? 0.72 : 1).setOrigin(0);
  bg.setStrokeStyle(2, disabled ? palette.shadow : primary ? palette.shadow : palette.pale, disabled ? 0.72 : primary ? 0.9 : 0.68);
  bg.setInteractive({ useHandCursor: !disabled });
  const highlight = scene.add.rectangle(x + 5, y + 5, width - 10, 2, palette.white, disabled ? 0.08 : primary ? 0.36 : 0.22).setOrigin(0);
  const text = scene.add
    .text(x + width / 2, y + 19, label, {
      ...labelStyle(13, textColor),
      align: 'center',
    })
    .setOrigin(0.5);
  text.setAlpha(disabled ? 0.72 : 1);
  bg.on('pointerover', () => bg.setFillStyle(hoverColor, disabled ? 0.72 : 1));
  bg.on('pointerout', () => bg.setFillStyle(baseColor, disabled ? 0.72 : 1));
  bg.on('pointerdown', () => {
    bg.setFillStyle(disabled ? baseColor : palette.shadow, disabled ? 0.72 : 1);
    const defaultClick = scene.scene?.key === 'BattleScene' ? 'button-battle' : 'button-town';
    scene.playSfx?.(options.sound || defaultClick);
    onClick();
  });
  return [shadow, bg, highlight, text];
}

export function drawBar(scene, x, y, width, value, max, color) {
  scene.add.rectangle(x, y, width, 8, palette.shadow, 0.62).setOrigin(0);
  scene.add.rectangle(x, y, width * Math.max(0, Math.min(1, value / max)), 8, color, 1).setOrigin(0);
}
