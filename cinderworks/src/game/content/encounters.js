export const encounters = {
  factoryAmbush: {
    id: 'factoryAmbush',
    name: 'Factory Ambush',
    countRange: [1, 2],
    mobPool: ['rust-hound', 'valve-imp', 'soot-skitter', 'gear-spider'],
    positions: [
      { x: 250, y: 284 },
      { x: 380, y: 326 },
    ],
    mobs: [
      { mobId: 'rust-hound', x: 205, y: 260 },
      { mobId: 'valve-imp', x: 335, y: 330 },
    ],
  },
  fuseGuard: {
    id: 'fuseGuard',
    name: 'Fuse Guard',
    mobs: [
      { mobId: 'rust-hound', x: 230, y: 282 },
      { mobId: 'valve-imp', x: 365, y: 324 },
    ],
  },
  boilerWarden: {
    id: 'boilerWarden',
    name: 'Boiler Warden',
    mobs: [
      { mobId: 'boiler-warden', x: 300, y: 300 },
    ],
  },
};
