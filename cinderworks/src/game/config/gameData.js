export const WORLD = 'world';
export const BATTLE = 'battle';
export const TITLE = 'title';
export const PAUSED = 'paused';

export const TILE = 34;
export const MAP_X = 22;
export const MAP_Y = 26;
export const SIDEBAR_X = 724;

export const palette = {
  coal: 0x120d0a,
  iron: 0x241914,
  panel: 0x2d1c14,
  panelDark: 0x1b110d,
  brass: 0xd8912f,
  amber: 0xffc252,
  copper: 0xb95632,
  red: 0x9d2f25,
  cream: 0xf4d59b,
  smoke: 0x524038,
  green: 0x76b76a,
  blue: 0x78a8bd,
  gray: 0x75645c,
};

export const itemData = {
  'Brass Key': {
    type: 'key',
    description: 'Unlocks chained pressure machinery.',
  },
  'Pressure Gauge': {
    type: 'key',
    description: 'Reveals the safe valve order.',
  },
  'Pressure Coupler': {
    type: 'key',
    description: 'Links boilerhouse pressure to the valve manifold.',
  },
  'Factory Gate Key': {
    type: 'key',
    description: 'Opens the western factory door from the district yard.',
  },
  'Aether Fuse': {
    type: 'key',
    description: 'Powers the factory lift.',
  },
  'Steam Tonic': {
    type: 'consumable',
    description: 'Restores 34 HP to the weakest ally in combat.',
    heal: 34,
  },
  'Coolant Ampoule': {
    type: 'consumable',
    description: 'Clears statuses and restores 12 HP in combat.',
    heal: 12,
    cleanse: true,
  },
};

export const equipmentData = {
  'Riveted Saber': {
    owner: 'ada',
    slot: 'weapon',
    description: '+4 damage on attacks.',
    damageBonus: 4,
  },
  'Medic Boiler': {
    owner: 'brass',
    slot: 'tool',
    description: '+8 HP repaired by healing skills and items.',
    healBonus: 8,
  },
};

export const valveSequence = ['red', 'amber', 'blue'];
export const hotelPuzzleRooms = ['101', '207', '314', '402'];
export const hotelPuzzleAnswer = '314';
export const districtRelayOptions = ['Stack', 'Crane', 'Rail'];
export const districtRelayAnswer = [true, false, true];
export const districtRelayPaperHint = 'Signal stencil: Stack up, Crane down, Rail up.';
export const controlPasswordOptions = ['boiler', 'copper', 'gear', 'rivet'];
export const controlPanelPassword = 'GEAR';
export const controlRoomPaperHints = {
  '7,8': 'G',
  '10,8': 'E',
  '13,6': 'A',
  '15,5': 'R',
};

export const worldTiles = [
  '####################',
  '#...HHH..pp..HHH...#',
  '#...H....##....H...#',
  '#..pp..V.N.....pp..#',
  '#.HHH..HHHH..HHHH..#',
  'X..r....oo.........#',
  '#..r.HHH..HHH......#',
  '#..r....H....H.....#',
  '#..rrr..#.....~~...#',
  '#....D..#..........#',
  '####################',
];

export const factoryInteriorTiles = [
  '####################',
  '#K..=..#...~~...E..#',
  '#.HH=..#.#.HH.HHH..#',
  '#.pp=....H..S...H..#',
  '#.HH.HHHHHHH.HH.H..#',
  'X..#V..oo....HHG####',
  '#r.#.HHHHH.HHHH.####',
  '#r...H...H....#.####',
  '#rrr...#...HH##.F###',
  '#..PD..#....~~.##..#',
  '####################',
];

export const controlRoomTiles = [
  '####################',
  '#..HHH....~~....HH.#',
  '#..H......oo.....H.#',
  '#..H..HHHHHH..HH.H.#',
  '#.....H..R.H.......#',
  '#..oo.H.~Y.H.ooN...#',
  '#.....H....H.N.....#',
  '#..HH.HHH.HH.HH....#',
  '#..H...NooN...H....#',
  '#....U....~~.......#',
  '####################',
];

export const restRoomTiles = [
  '####################',
  '#..ppp....ooo...~~.#',
  '#..w.w....w.w......#',
  '#..w...oo.w...pp...#',
  '#..w....B.w..oo....#',
  '#..w......w........#',
  '#..wwww..wwww..pp..#',
  '#.......~~....oo...#',
  '#..pp.....Coo......#',
  '#....U....~~.......#',
  '####################',
];

export const hotelTiles = [
  '####################',
  '#..HHH....pp....HH.#',
  '#..H.H..........H..#',
  '#..H....Q...oo..H..#',
  '#..HHH......oo.HH..#',
  '#..................#',
  '#..wwww....wwww....#',
  '#..w..B....w..B....#',
  '#..w.......w.......#',
  '#....U.............#',
  '####################',
];

export const worldMap = {
  id: 'factoryDistrict',
  name: 'Factory District',
  renderProfile: 'factoryDistrict',
  transitions: {
    D: {
      mapId: 'rivetKettleHotel',
      player: { x: 5, y: 9 },
      message: 'You step into The Rivet & Kettle Hotel.',
    },
    X: {
      mapId: 'factoryInterior',
      player: { x: 1, y: 5 },
      message: 'The factory door opens into the old factory interior.',
    },
  },
  randomEncounters: {
    enabled: true,
    minSteps: 15,
    maxSteps: 30,
    encounters: ['factoryAmbush'],
  },
};

export const factoryInteriorMap = {
  id: 'factoryInterior',
  name: 'Factory Interior',
  renderProfile: 'factoryInterior',
  transitions: {
    D: {
      mapId: 'restRoom',
      player: { x: 5, y: 9 },
      message: 'You descend into a quiet boilerhouse rest room.',
    },
    X: {
      mapId: 'factoryDistrict',
      player: { x: 1, y: 5 },
      message: 'You step back through the western factory door.',
    },
    F: {
      mapId: 'factoryControlRoom',
      player: { x: 5, y: 9 },
      message: 'The lift groans upward into the factory control room.',
    },
  },
  randomEncounters: {
    enabled: true,
    minSteps: 15,
    maxSteps: 30,
    encounters: ['factoryAmbush'],
  },
};

export const controlRoomMap = {
  id: 'factoryControlRoom',
  name: 'Factory Control Room',
  renderProfile: 'factoryInterior',
  transitions: {
    U: {
      mapId: 'factoryInterior',
      player: { x: 15, y: 8 },
      message: 'The lift drops back to the old factory interior.',
    },
  },
  randomEncounters: {
    enabled: false,
  },
};

export const restRoomMap = {
  id: 'restRoom',
  name: 'Boilerhouse Bunkroom',
  renderProfile: 'restRoom',
  transitions: {
    U: {
      mapId: 'factoryInterior',
      player: { x: 4, y: 9 },
      message: 'You climb back into the factory interior.',
    },
  },
  randomEncounters: {
    enabled: false,
  },
};

export const hotelMap = {
  id: 'rivetKettleHotel',
  name: 'Rivet & Kettle Hotel',
  renderProfile: 'hotel',
  transitions: {
    U: {
      mapId: 'factoryDistrict',
      player: { x: 5, y: 9 },
      message: 'You step back into the factory district.',
    },
  },
  randomEncounters: {
    enabled: false,
  },
};

export const startingMapId = worldMap.id;
export const startingPlayer = { x: 5, y: 9 };

export const worldMaps = {
  [worldMap.id]: {
    ...worldMap,
    tiles: worldTiles,
  },
  [factoryInteriorMap.id]: {
    ...factoryInteriorMap,
    tiles: factoryInteriorTiles,
  },
  [controlRoomMap.id]: {
    ...controlRoomMap,
    tiles: controlRoomTiles,
  },
  [restRoomMap.id]: {
    ...restRoomMap,
    tiles: restRoomTiles,
  },
  [hotelMap.id]: {
    ...hotelMap,
    tiles: hotelTiles,
  },
};

export const statusRules = {
  jamming: {
    label: 'Jamming',
    summary: '35% action failure. Expires after 1 affected action.',
    prompt: 'Jamming can make a combatant lose their next command before it fires.',
    durationType: 'action',
    defaultTurns: 1,
  },
  burned: {
    label: 'Burned',
    summary: 'Takes 8 damage when acting. Lasts until cured or battle ends.',
    prompt: 'Burned deals damage when the affected combatant acts. It does not reduce attack power.',
    durationType: 'permanent',
    defaultTurns: null,
  },
  stunned: {
    label: 'Stunned',
    summary: 'ATB fill pauses briefly. Expires after 1 global action.',
    prompt: 'Stunned pauses ATB fill. It clears after the next combat action resolves.',
    durationType: 'globalAction',
    defaultTurns: 1,
  },
  overheated: {
    label: 'Overheated',
    summary: '+25% damage dealt, +35% damage taken. Lasts 3 affected actions.',
    prompt: 'Overheated is risky: more outgoing damage, but incoming hits hurt more.',
    durationType: 'action',
    defaultTurns: 3,
  },
};

export const bossResistancePlan = {
  'Boiler Warden': {
    resists: ['burned'],
    vulnerable: ['jamming'],
    reasoning: 'A furnace-based boss should not care much about fire, but its pressure valves can still jam.',
  },
  'Clockwork Magistrate': {
    resists: ['stunned', 'jamming'],
    vulnerable: ['burned'],
    reasoning: 'A precision automaton should resist control-disruption effects, while heat can warp its brass frame.',
  },
  'Aether Conductor': {
    resists: ['overheated'],
    vulnerable: ['stunned'],
    reasoning: 'It runs on volatile aether pressure, so overheat-like pressure is natural to it; interrupting its rhythm should matter.',
  },
};

export const devTools = [
  '` Toggle tools',
  'B Start battle',
  'K Grant valve tools',
  'V Solve valve',
  'L Grant fuse',
  'C Force crit',
  'H Status reference',
  'P Pause',
  'O Save',
  'M Mute',
  'N Motion',
  'R Reset slice',
];
