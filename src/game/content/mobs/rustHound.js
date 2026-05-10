import { palette } from '../../config/gameData.js';

export const rustHound = {
  id: 'rust-hound',
  name: 'Rust Hound',
  maxHp: 92,
  hp: 92,
  speed: 33,
  atb: 15,
  statuses: [],
  tint: palette.copper,
  actions: [
    {
      id: 'clamp-bite',
      name: 'Clamp Bite',
      power: 17,
      target: 'party-random',
      status: 'burned',
      statusChance: 0.35,
      criticalChance: 0.1,
      log: 'snaps a furnace-hot jaw',
    },
  ],
};
