import { palette } from '../../config/gameData.js';

export const valveImp = {
  id: 'valve-imp',
  name: 'Valve Imp',
  maxHp: 78,
  hp: 78,
  speed: 47,
  atb: 0,
  statuses: [],
  tint: palette.red,
  actions: [
    {
      id: 'gear-spike',
      name: 'Gear Spike',
      power: 15,
      target: 'party-random',
      status: 'jamming',
      statusChance: 0.5,
      criticalChance: 0.1,
      log: 'throws a gear spike',
    },
    {
      id: 'pressure-pop',
      name: 'Pressure Pop',
      power: 13,
      target: 'party-random',
      status: 'stunned',
      statusChance: 0.18,
      criticalChance: 0.08,
      log: 'bursts a pressure valve',
    },
  ],
};
