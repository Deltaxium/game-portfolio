import { palette } from '../../config/gameData.js';

export const sootSkitter = {
  id: 'soot-skitter',
  battleSpriteId: 'soot-skitter',
  battleScale: 1.28,
  name: 'Soot Skitter',
  maxHp: 58,
  hp: 58,
  speed: 54,
  atb: 10,
  statuses: [],
  tint: palette.smoke,
  actions: [
    {
      id: 'soot-blind',
      name: 'Soot Blind',
      power: 11,
      target: 'party-random',
      status: 'jamming',
      statusChance: 0.3,
      criticalChance: 0.12,
      log: 'spits clogging soot',
    },
  ],
};
