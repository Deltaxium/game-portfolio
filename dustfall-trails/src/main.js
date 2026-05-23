import Phaser from 'phaser';
import BattleScene from './game/scenes/BattleScene.js';
import HubScene from './game/scenes/HubScene.js';
import PrepScene from './game/scenes/PrepScene.js';
import TitleScene from './game/scenes/TitleScene.js';
import TravelScene from './game/scenes/TravelScene.js';
import { createInitialGameState } from './game/systems/save.js';

const gameState = createInitialGameState();

new Phaser.Game({
  type: Phaser.AUTO,
  parent: 'game-root',
  width: 960,
  height: 720,
  resolution: Math.min(window.devicePixelRatio || 1, 2),
  backgroundColor: '#241914',
  render: {
    antialias: true,
    pixelArt: false,
    roundPixels: true,
    powerPreference: 'high-performance',
  },
  scale: {
    mode: Phaser.Scale.FIT,
    autoCenter: Phaser.Scale.CENTER_BOTH,
  },
  scene: [TitleScene, HubScene, PrepScene, TravelScene, BattleScene],
  callbacks: {
    preBoot: (game) => {
      game.registry.set('gameState', gameState);
    },
  },
});
