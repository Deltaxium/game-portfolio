import { palette } from '../../config/gameData.js';

export const gearSpider = {
  id: 'gear-spider',
  battleSpriteId: 'gear-spider',
  battleScale: 1.24,
  name: 'Gear Spider',
  maxHp: 70,
  hp: 70,
  speed: 42,
  atb: 5,
  statuses: [],
  tint: palette.brass,
  actions: [
    {
      id: 'ratchet-lunge',
      name: 'Ratchet Lunge',
      power: 14,
      target: 'party-random',
      status: 'stunned',
      statusChance: 0.22,
      criticalChance: 0.12,
      log: 'clatters forward with ratchet legs',
    },
  ],
};
